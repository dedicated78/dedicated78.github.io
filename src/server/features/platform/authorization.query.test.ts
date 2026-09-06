import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as schema from "@/db/schema";
import type * as AuthorizationModule from "@/server/features/platform/services/authorization";

/**
 * Authorization against real SQL.
 *
 * The invariant these exist to protect: a GrowwithMH platform role must never
 * open a customer's workspace. That is a property of the queries, so it is
 * tested against real rows rather than a mocked repository.
 */

vi.mock("cloudflare:workers", () => ({ env: { DATABASE_PROVIDER: "d1" } }));

let client: Client;
let auth: typeof AuthorizationModule;

const CUSTOMER_ORG = "org_customer";
const PLATFORM_ORG = "org_growwithmh";
const OWNER = "user_owner";
const ADMIN = "user_admin";
const MEMBER = "user_member";
const VIEWER = "user_client_viewer";
const STAFF = "user_platform_admin";

beforeAll(async () => {
  client = createClient({ url: "file::memory:" });
  vi.doMock("@/db", () => ({ db: drizzle(client, { schema }) }));

  await client.executeMultiple(`
    CREATE TABLE member (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE platform_roles (
      user_id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      granted_by TEXT,
      granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      note TEXT
    );
    CREATE TABLE organization_profiles (
      organization_id TEXT PRIMARY KEY,
      kind TEXT NOT NULL DEFAULT 'customer',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  auth = await import("@/server/features/platform/services/authorization");
});

afterAll(() => client.close());

beforeEach(async () => {
  await client.executeMultiple(`
    DELETE FROM member;
    DELETE FROM platform_roles;
    DELETE FROM organization_profiles;
    INSERT INTO member (id, organization_id, user_id, role) VALUES
      ('m1', '${CUSTOMER_ORG}', '${OWNER}',  'owner'),
      ('m2', '${CUSTOMER_ORG}', '${ADMIN}',  'admin'),
      ('m3', '${CUSTOMER_ORG}', '${MEMBER}', 'member'),
      ('m4', '${CUSTOMER_ORG}', '${VIEWER}', 'client_viewer');
    INSERT INTO platform_roles (user_id, role) VALUES ('${STAFF}', 'platform_admin');
    INSERT INTO organization_profiles (organization_id, kind) VALUES
      ('${PLATFORM_ORG}', 'platform');
  `);
});

describe("the platform / customer boundary", () => {
  it("gives GrowwithMH staff no access to a customer workspace", async () => {
    // The whole point of the two-level model. Staff standing is real...
    const platform = await auth.resolvePlatformAccess(STAFF);
    expect(platform.role).toBe("platform_admin");

    // ...and buys nothing inside a customer's organization.
    const org = await auth.resolveOrganizationAccess(STAFF, CUSTOMER_ORG);
    expect(org).toBeNull();
    await expect(
      auth.assertOrganizationCapability(STAFF, CUSTOMER_ORG, "project:read"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("gives a customer owner no platform capabilities", async () => {
    const platform = await auth.resolvePlatformAccess(OWNER);
    expect(platform.role).toBeNull();
    expect(platform.capabilities).toEqual([]);
    await expect(
      auth.assertPlatformCapability(OWNER, "platform:view_costs"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("classifies GrowwithMH's own organization apart from customers", async () => {
    expect(await auth.getOrganizationKind(PLATFORM_ORG)).toBe("platform");
    expect(await auth.getOrganizationKind(CUSTOMER_ORG)).toBe("customer");
  });
});

describe("organization capabilities", () => {
  it("lets a member run paid research but not manage the workspace", async () => {
    const access = await auth.resolveOrganizationAccess(MEMBER, CUSTOMER_ORG);
    expect(access?.capabilities).toContain("research:run");
    expect(access?.capabilities).not.toContain("member:manage");
    expect(access?.capabilities).not.toContain("billing:manage");
  });

  it("keeps a client viewer read-only", async () => {
    // A client logging in to see their reports must not be able to spend money
    // or read API keys.
    const access = await auth.resolveOrganizationAccess(VIEWER, CUSTOMER_ORG);
    expect(access?.capabilities).toEqual(["project:read", "report:read"]);
    await expect(
      auth.assertOrganizationCapability(VIEWER, CUSTOMER_ORG, "research:run"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      auth.assertOrganizationCapability(VIEWER, CUSTOMER_ORG, "apikey:manage"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies a user with no membership row", async () => {
    expect(
      await auth.resolveOrganizationAccess("user_stranger", CUSTOMER_ORG),
    ).toBeNull();
  });

  it("treats an unrecognised stored role as the least privileged", async () => {
    // Fails toward less access, never toward the default.
    await client.execute(
      `INSERT INTO member (id, organization_id, user_id, role) VALUES ('m9', '${CUSTOMER_ORG}', 'user_odd', 'superuser')`,
    );
    const access = await auth.resolveOrganizationAccess(
      "user_odd",
      CUSTOMER_ORG,
    );
    expect(access?.role).toBe("client_viewer");
  });
});

describe("role assignment", () => {
  it("lets an owner promote a member to admin", async () => {
    await expect(
      auth.assertCanAssignRole({
        actorUserId: OWNER,
        organizationId: CUSTOMER_ORG,
        targetCurrentRole: "member",
        targetNewRole: "admin",
      }),
    ).resolves.toMatchObject({ role: "owner" });
  });

  it("stops an admin from demoting an owner", async () => {
    await expect(
      auth.assertCanAssignRole({
        actorUserId: ADMIN,
        organizationId: CUSTOMER_ORG,
        targetCurrentRole: "owner",
        targetNewRole: "member",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("stops an admin from minting an owner and inheriting billing", async () => {
    await expect(
      auth.assertCanAssignRole({
        actorUserId: ADMIN,
        organizationId: CUSTOMER_ORG,
        targetCurrentRole: "member",
        targetNewRole: "owner",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("stops a plain member from changing roles at all", async () => {
    await expect(
      auth.assertCanAssignRole({
        actorUserId: MEMBER,
        organizationId: CUSTOMER_ORG,
        targetCurrentRole: "client_viewer",
        targetNewRole: "member",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("last-owner protection", () => {
  it("refuses to strip the only owner", async () => {
    // A workspace with no owner has nobody who can manage billing and no way
    // back without manual intervention.
    await expect(
      auth.assertNotLastOwner(CUSTOMER_ORG, OWNER),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("allows it once a second owner exists", async () => {
    await client.execute(
      `UPDATE member SET role = 'owner' WHERE user_id = '${ADMIN}'`,
    );
    await expect(
      auth.assertNotLastOwner(CUSTOMER_ORG, OWNER),
    ).resolves.toBeUndefined();
  });
});
