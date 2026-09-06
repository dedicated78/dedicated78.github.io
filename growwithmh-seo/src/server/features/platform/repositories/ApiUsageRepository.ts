import { and, desc, eq, gte, isNotNull, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import { apiUsage } from "@/db/schema";

export type ApiUsageOutcome =
  | "success"
  | "failed"
  | "charged_failed"
  | "cached";

export type ApiUsageExecutionSource =
  | "app"
  | "mcp"
  | "workflow"
  | "cron"
  | "system";

export type RecordApiUsageInput = {
  organizationId: string | null;
  projectId: string | null;
  userId: string | null;
  provider: string;
  apiFamily: string | null;
  endpoint: string | null;
  operation: string | null;
  executionSource: ApiUsageExecutionSource;
  correlationId: string | null;
  outcome: ApiUsageOutcome;
  errorCode: string | null;
  costUsd: number;
  fromCache: boolean;
};

/** UTC calendar day, the unit every daily ceiling is measured in. */
export function usageDateFor(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Appends one row. Never updates — a correction is a new row, which is what
 * makes the ledger replayable.
 */
export async function recordUsage(input: RecordApiUsageInput): Promise<void> {
  await db.insert(apiUsage).values({
    id: crypto.randomUUID(),
    usageDate: usageDateFor(),
    organizationId: input.organizationId,
    projectId: input.projectId,
    userId: input.userId,
    provider: input.provider,
    apiFamily: input.apiFamily,
    endpoint: input.endpoint,
    operation: input.operation,
    executionSource: input.executionSource,
    correlationId: input.correlationId,
    outcome: input.outcome,
    errorCode: input.errorCode,
    costUsd: input.costUsd,
    fromCache: input.fromCache,
  });
}

function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Provider spend already booked for a scope today.
 *
 * Cached rows are excluded because they cost nothing new — counting them would
 * make a cache hit consume a customer's ceiling.
 */
export async function spendForDate(args: {
  usageDate: string;
  organizationId?: string;
  projectId?: string;
}): Promise<number> {
  const filters = [
    eq(apiUsage.usageDate, args.usageDate),
    eq(apiUsage.fromCache, false),
  ];
  if (args.organizationId) {
    filters.push(eq(apiUsage.organizationId, args.organizationId));
  }
  if (args.projectId) {
    filters.push(eq(apiUsage.projectId, args.projectId));
  }

  const [row] = await db
    .select({ total: sum(apiUsage.costUsd) })
    .from(apiUsage)
    .where(and(...filters));

  return toNumber(row?.total);
}

export type UsageTotals = {
  costUsd: number;
  calls: number;
  chargedFailedUsd: number;
  cachedCalls: number;
};

/** Totals since a UTC day (inclusive). Pass null for lifetime. */
export async function totalsSince(
  sinceUsageDate: string | null,
): Promise<UsageTotals> {
  const where = sinceUsageDate
    ? gte(apiUsage.usageDate, sinceUsageDate)
    : undefined;

  const [row] = await db
    .select({
      costUsd: sum(apiUsage.costUsd),
      calls: sql<number>`count(*)`,
      chargedFailedUsd: sql<number>`sum(case when ${apiUsage.outcome} = 'charged_failed' then ${apiUsage.costUsd} else 0 end)`,
      cachedCalls: sql<number>`sum(case when ${apiUsage.fromCache} then 1 else 0 end)`,
    })
    .from(apiUsage)
    .where(where);

  return {
    costUsd: toNumber(row?.costUsd),
    calls: toNumber(row?.calls),
    chargedFailedUsd: toNumber(row?.chargedFailedUsd),
    cachedCalls: toNumber(row?.cachedCalls),
  };
}

export type UsageBreakdownRow = {
  key: string;
  costUsd: number;
  calls: number;
};

/** The nullable text columns the cost dashboard groups by. */
type BreakdownColumn =
  | typeof apiUsage.organizationId
  | typeof apiUsage.projectId
  | typeof apiUsage.apiFamily
  | typeof apiUsage.operation;

async function breakdown(
  column: BreakdownColumn,
  sinceUsageDate: string | null,
  limit: number,
): Promise<UsageBreakdownRow[]> {
  const filters = [isNotNull(column)];
  if (sinceUsageDate) filters.push(gte(apiUsage.usageDate, sinceUsageDate));

  const rows = await db
    .select({
      key: column,
      costUsd: sum(apiUsage.costUsd),
      calls: sql<number>`count(*)`,
    })
    .from(apiUsage)
    .where(and(...filters))
    .groupBy(column)
    .orderBy(desc(sum(apiUsage.costUsd)))
    .limit(limit);

  return rows.map((row) => ({
    key: String(row.key),
    costUsd: toNumber(row.costUsd),
    calls: toNumber(row.calls),
  }));
}

export function costByOrganization(since: string | null, limit = 20) {
  return breakdown(apiUsage.organizationId, since, limit);
}

export function costByProject(since: string | null, limit = 20) {
  return breakdown(apiUsage.projectId, since, limit);
}

export function costByApiFamily(since: string | null, limit = 20) {
  return breakdown(apiUsage.apiFamily, since, limit);
}

export function costByOperation(since: string | null, limit = 20) {
  return breakdown(apiUsage.operation, since, limit);
}

export type RecentUsageRow = {
  id: string;
  occurredAt: string;
  provider: string;
  apiFamily: string | null;
  operation: string | null;
  executionSource: string;
  outcome: string;
  costUsd: number;
  fromCache: boolean;
  organizationId: string | null;
  projectId: string | null;
};

export async function recentUsage(limit = 50): Promise<RecentUsageRow[]> {
  return db
    .select({
      id: apiUsage.id,
      occurredAt: apiUsage.occurredAt,
      provider: apiUsage.provider,
      apiFamily: apiUsage.apiFamily,
      operation: apiUsage.operation,
      executionSource: apiUsage.executionSource,
      outcome: apiUsage.outcome,
      costUsd: apiUsage.costUsd,
      fromCache: apiUsage.fromCache,
      organizationId: apiUsage.organizationId,
      projectId: apiUsage.projectId,
    })
    .from(apiUsage)
    .orderBy(desc(apiUsage.occurredAt))
    .limit(limit);
}
