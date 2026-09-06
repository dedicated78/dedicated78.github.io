import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as d1Schema from "@/db/schema";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type * as ProjectRepositoryModule from "@/server/features/projects/repositories/ProjectRepository";
import type * as ApiUsageRepositoryModule from "@/server/features/platform/repositories/ApiUsageRepository";

/**
 * Tenant isolation, proven against real SQL rather than a mock.
 *
 * Frontend hiding is not isolation and neither is a passing service test with a
 * stubbed database: what matters is whether the query the repository actually
 * emits can return another organization's rows. These run the real repository
 * functions against a real in-memory SQLite database holding two organizations'
 * data side by side.
 */

vi.mock("cloudflare:workers", () => ({ env: { DATABASE_PROVIDER: "d1" } }));

let client: Client;
let ProjectRepository: typeof ProjectRepositoryModule.ProjectRepository;
let ApiUsage: typeof ApiUsageRepositoryModule;

const ORG_A = "org_alpha";
const ORG_B = "org_bravo";
const PROJECT_A = "proj_alpha";
const PROJECT_B = "proj_bravo";

beforeAll(async () => {
  client = createClient({ url: "file::memory:" });
  const testDb = drizzle(client, { schema: d1Schema });
  vi.doMock("@/db", () => ({ db: testDb }));

  await client.executeMultiple(`
    CREATE TABLE projects (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      name TEXT NOT NULL,
      domain TEXT,
      location_code INTEGER NOT NULL DEFAULT 2840,
      language_code TEXT NOT NULL DEFAULT 'en',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      archived_at TEXT
    );
    CREATE TABLE api_usage (
      id TEXT PRIMARY KEY,
      occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      usage_date TEXT NOT NULL,
      organization_id TEXT,
      project_id TEXT,
      user_id TEXT,
      provider TEXT NOT NULL,
      api_family TEXT,
      endpoint TEXT,
      operation TEXT,
      execution_source TEXT NOT NULL DEFAULT 'app',
      correlation_id TEXT,
      outcome TEXT NOT NULL,
      error_code TEXT,
      cost_usd REAL NOT NULL DEFAULT 0,
      from_cache INTEGER NOT NULL DEFAULT 0
    );
  `);

  ({ ProjectRepository } =
    await import("@/server/features/projects/repositories/ProjectRepository"));
  ApiUsage =
    await import("@/server/features/platform/repositories/ApiUsageRepository");
});

afterAll(() => {
  client.close();
});

beforeEach(async () => {
  await client.executeMultiple(`
    DELETE FROM projects;
    DELETE FROM api_usage;
    INSERT INTO projects (id, organization_id, name, domain)
      VALUES ('${PROJECT_A}', '${ORG_A}', 'Alpha site', 'alpha.example');
    INSERT INTO projects (id, organization_id, name, domain)
      VALUES ('${PROJECT_B}', '${ORG_B}', 'Bravo site', 'bravo.example');
  `);
});

describe("project access across organizations", () => {
  it("returns a project to its owning organization", async () => {
    const project = await ProjectRepository.getProjectForOrganization(
      PROJECT_A,
      ORG_A,
    );
    expect(project?.id).toBe(PROJECT_A);
  });

  it("refuses another organization's project even with a valid id", async () => {
    // The IDOR case: org B knows org A's project id and asks for it directly.
    const project = await ProjectRepository.getProjectForOrganization(
      PROJECT_A,
      ORG_B,
    );
    expect(project).toBeFalsy();
  });

  it("lists only the caller's own projects", async () => {
    const projects = await ProjectRepository.listProjects(ORG_A);
    expect(projects.map((p) => p.id)).toEqual([PROJECT_A]);
  });
});

describe("provider spend across organizations", () => {
  beforeEach(async () => {
    await client.executeMultiple(`
      INSERT INTO api_usage (id, usage_date, organization_id, project_id, provider, outcome, cost_usd, from_cache)
        VALUES ('u1', '2026-09-06', '${ORG_A}', '${PROJECT_A}', 'dataforseo', 'success', 1.50, 0);
      INSERT INTO api_usage (id, usage_date, organization_id, project_id, provider, outcome, cost_usd, from_cache)
        VALUES ('u2', '2026-09-06', '${ORG_B}', '${PROJECT_B}', 'dataforseo', 'success', 9.00, 0);
    `);
  });

  it("counts only the scoped organization's spend", async () => {
    // A leak here would let one tenant's usage consume another's daily budget.
    const spentA = await ApiUsage.spendForDate({
      usageDate: "2026-09-06",
      organizationId: ORG_A,
    });
    expect(spentA).toBeCloseTo(1.5);
  });

  it("counts only the scoped project's spend", async () => {
    const spentB = await ApiUsage.spendForDate({
      usageDate: "2026-09-06",
      projectId: PROJECT_B,
    });
    expect(spentB).toBeCloseTo(9);
  });

  it("excludes cached rows so a cache hit never consumes budget", async () => {
    await client.executeMultiple(`
      INSERT INTO api_usage (id, usage_date, organization_id, project_id, provider, outcome, cost_usd, from_cache)
        VALUES ('u3', '2026-09-06', '${ORG_A}', '${PROJECT_A}', 'dataforseo', 'cached', 1.00, 1);
    `);

    const spentA = await ApiUsage.spendForDate({
      usageDate: "2026-09-06",
      organizationId: ORG_A,
    });
    expect(spentA).toBeCloseTo(1.5);
  });
});
