import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { spendControls } from "@/db/schema";

export type SpendScope = "global" | "organization" | "project";

/** The single row id for the platform-wide scope. */
export const GLOBAL_SCOPE_ID = "global";

export type SpendControl = {
  scope: SpendScope;
  scopeId: string;
  dailyLimitUsd: number | null;
  enabled: boolean;
  note: string | null;
  updatedAt: string;
};

const SPEND_SCOPES: readonly SpendScope[] = [
  "global",
  "organization",
  "project",
];

/** Narrows the stored text column; an unrecognised scope is treated as global. */
function toScope(value: string): SpendScope {
  return SPEND_SCOPES.find((scope) => scope === value) ?? "global";
}

function toControl(row: typeof spendControls.$inferSelect): SpendControl {
  return {
    scope: toScope(row.scope),
    scopeId: row.scopeId,
    dailyLimitUsd: row.dailyLimitUsd,
    enabled: row.enabled,
    note: row.note,
    updatedAt: row.updatedAt,
  };
}

/**
 * Loads the controls for every scope a call falls under, in one query.
 *
 * A missing row means "no limit, enabled" — the absence of configuration must
 * never be read as a block, or a fresh install would refuse all work.
 */
export async function loadControlsFor(args: {
  organizationId?: string | null;
  projectId?: string | null;
}): Promise<SpendControl[]> {
  const scopeIds = [GLOBAL_SCOPE_ID];
  if (args.organizationId) scopeIds.push(args.organizationId);
  if (args.projectId) scopeIds.push(args.projectId);

  const rows = await db
    .select()
    .from(spendControls)
    .where(inArray(spendControls.scopeId, scopeIds));

  // scopeId is unique only per scope, so an organization id equal to a project
  // id (never expected, but cheap to be exact about) cannot cross-match.
  return rows
    .filter((row) => {
      if (row.scope === "global") return row.scopeId === GLOBAL_SCOPE_ID;
      if (row.scope === "organization")
        return row.scopeId === args.organizationId;
      return row.scopeId === args.projectId;
    })
    .map(toControl);
}

export async function getControl(
  scope: SpendScope,
  scopeId: string,
): Promise<SpendControl | null> {
  const [row] = await db
    .select()
    .from(spendControls)
    .where(
      and(eq(spendControls.scope, scope), eq(spendControls.scopeId, scopeId)),
    )
    .limit(1);
  return row ? toControl(row) : null;
}

export async function listControls(): Promise<SpendControl[]> {
  const rows = await db.select().from(spendControls);
  return rows.map(toControl);
}

/** Upserts one scope's control row. */
export async function setControl(args: {
  scope: SpendScope;
  scopeId: string;
  dailyLimitUsd: number | null;
  enabled: boolean;
  note?: string | null;
  updatedBy: string | null;
}): Promise<void> {
  const updatedAt = new Date().toISOString();
  await db
    .insert(spendControls)
    .values({
      id: crypto.randomUUID(),
      scope: args.scope,
      scopeId: args.scopeId,
      dailyLimitUsd: args.dailyLimitUsd,
      enabled: args.enabled,
      note: args.note ?? null,
      updatedBy: args.updatedBy,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: [spendControls.scope, spendControls.scopeId],
      set: {
        dailyLimitUsd: args.dailyLimitUsd,
        enabled: args.enabled,
        note: args.note ?? null,
        updatedBy: args.updatedBy,
        updatedAt,
      },
    });
}
