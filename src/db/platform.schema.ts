/**
 * Platform tables: provider cost accounting, spend controls, and audit trail.
 *
 * These are GrowwithMH-owned, added in Phase 2. They are deliberately kept out
 * of the commercial tables that arrive in Phase 3 (plans, credits, payments):
 *
 *   provider cost (this file)  ≠  customer credits  ≠  customer payments
 *
 * `api_usage` records what GrowwithMH actually paid a provider, in that
 * provider's currency, forever. Nothing here is ever rewritten — corrections
 * are new rows, so the ledger can always be replayed.
 */
import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { organization, user } from "./better-auth-schema";
import { projects } from "./app.schema";

/**
 * Append-only record of every external provider call that could cost money.
 *
 * Organization and project are nullable on purpose: platform-level calls (a
 * credential verification, a scheduled sweep) have no tenant, and losing the
 * row would be worse than storing it unattributed. `costUsd` is the provider's
 * own reported cost — never a credit amount, never a customer price.
 */
export const apiUsage = sqliteTable(
  "api_usage",
  {
    id: text("id").primaryKey(),
    occurredAt: text("occurred_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    /** UTC calendar day (YYYY-MM-DD) the call belongs to, for daily ceilings. */
    usageDate: text("usage_date").notNull(),

    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),

    /** e.g. "dataforseo". Kept generic so a second provider needs no migration. */
    provider: text("provider").notNull(),
    /** Provider API family, e.g. "dataforseo_labs", "serp", "backlinks". */
    apiFamily: text("api_family"),
    /** Full provider endpoint path, e.g. "/v3/serp/google/organic/live/advanced". */
    endpoint: text("endpoint"),
    /** Product operation or MCP tool that caused the call. */
    operation: text("operation"),
    /** Where the call came from: "app" | "mcp" | "workflow" | "cron" | "system". */
    executionSource: text("execution_source").notNull().default("app"),
    /** Correlates every row produced by one inbound request or workflow run. */
    correlationId: text("correlation_id"),

    /**
     * Outcome, kept as an explicit column rather than derived:
     * "success" | "failed" | "charged_failed" | "cached".
     * "charged_failed" is the case that must never be lost — the provider
     * billed us for a call that returned nothing useful.
     */
    outcome: text("outcome").notNull(),
    /** Stable error code when the call failed. Never a raw provider payload. */
    errorCode: text("error_code"),

    /** Provider-reported cost in USD. 0 for cached and free calls. */
    costUsd: real("cost_usd").notNull().default(0),
    /** True when the result came from cache and cost nothing new. */
    fromCache: integer("from_cache", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (table) => [
    index("api_usage_occurred_idx").on(table.occurredAt),
    index("api_usage_org_date_idx").on(table.organizationId, table.usageDate),
    index("api_usage_project_date_idx").on(table.projectId, table.usageDate),
    index("api_usage_provider_date_idx").on(table.provider, table.usageDate),
  ],
);

/**
 * Spend ceilings and kill switches.
 *
 * One row per scope so a limit can be set, cleared and audited independently:
 *   scope "global"       — scopeId "global"
 *   scope "organization" — scopeId is the organization id
 *   scope "project"      — scopeId is the project id
 *
 * A null `dailyLimitUsd` means "no ceiling"; `enabled: false` is the kill
 * switch for that scope. Storing both on one row keeps the enforcement read to
 * a single lookup per scope.
 */
export const spendControls = sqliteTable(
  "spend_controls",
  {
    id: text("id").primaryKey(),
    scope: text("scope").notNull(),
    scopeId: text("scope_id").notNull(),
    /** Daily provider-spend ceiling in USD. Null = unlimited. */
    dailyLimitUsd: real("daily_limit_usd"),
    /** False disables all paid provider calls for this scope. */
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    note: text("note"),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    uniqueIndex("spend_controls_scope_idx").on(table.scope, table.scopeId),
  ],
);

/**
 * Append-only security and administration trail.
 *
 * Records who did what, never what the value was — a role change records the
 * old and new role, a credential change records only that it happened. Nothing
 * written here may contain a secret.
 */
export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    occurredAt: text("occurred_at")
      .notNull()
      .default(sql`(current_timestamp)`),

    /** Null for unauthenticated events such as a failed login. */
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    /** Preserved as text so the trail survives the user being deleted. */
    actorLabel: text("actor_label"),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),

    /** Dotted event name, e.g. "auth.login", "spend.limit_changed". */
    action: text("action").notNull(),
    /** Type of thing acted on, e.g. "project", "member", "spend_control". */
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    /** "success" | "failure" | "denied". */
    result: text("result").notNull(),

    correlationId: text("correlation_id"),
    /** JSON object of non-sensitive detail. Never credentials or payloads. */
    metadata: text("metadata"),
  },
  (table) => [
    index("audit_log_occurred_idx").on(table.occurredAt),
    index("audit_log_org_occurred_idx").on(
      table.organizationId,
      table.occurredAt,
    ),
    index("audit_log_actor_idx").on(table.actorUserId),
    index("audit_log_action_idx").on(table.action),
  ],
);
