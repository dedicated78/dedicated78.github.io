/**
 * Postgres mirror of ../platform.schema.ts.
 *
 * Kept structurally identical to the SQLite definitions — schema-parity.test.ts
 * fails the build if the two drift. See the SQLite file for what each table is
 * for and why the boundaries are drawn where they are.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  real,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organization, user } from "./better-auth-schema";
import { projects } from "./app.schema";

// Same reasoning as pg/app.schema.ts: timestamps are text so lexicographic
// comparisons behave identically on both backends.
const isoNow = sql`to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
const timestampColumn = (name: string) => text(name);

export const apiUsage = pgTable(
  "api_usage",
  {
    id: text("id").primaryKey(),
    occurredAt: timestampColumn("occurred_at").notNull().default(isoNow),
    usageDate: text("usage_date").notNull(),

    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),

    provider: text("provider").notNull(),
    apiFamily: text("api_family"),
    endpoint: text("endpoint"),
    operation: text("operation"),
    executionSource: text("execution_source").notNull().default("app"),
    correlationId: text("correlation_id"),

    outcome: text("outcome").notNull(),
    errorCode: text("error_code"),

    costUsd: real("cost_usd").notNull().default(0),
    fromCache: boolean("from_cache").notNull().default(false),
  },
  (table) => [
    index("api_usage_occurred_idx").on(table.occurredAt),
    index("api_usage_org_date_idx").on(table.organizationId, table.usageDate),
    index("api_usage_project_date_idx").on(table.projectId, table.usageDate),
    index("api_usage_provider_date_idx").on(table.provider, table.usageDate),
  ],
);

export const spendControls = pgTable(
  "spend_controls",
  {
    id: text("id").primaryKey(),
    scope: text("scope").notNull(),
    scopeId: text("scope_id").notNull(),
    dailyLimitUsd: real("daily_limit_usd"),
    enabled: boolean("enabled").notNull().default(true),
    note: text("note"),
    updatedBy: text("updated_by").references(() => user.id, {
      onDelete: "set null",
    }),
    updatedAt: timestampColumn("updated_at").notNull().default(isoNow),
  },
  (table) => [
    uniqueIndex("spend_controls_scope_idx").on(table.scope, table.scopeId),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    occurredAt: timestampColumn("occurred_at").notNull().default(isoNow),

    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    actorLabel: text("actor_label"),
    organizationId: text("organization_id").references(() => organization.id, {
      onDelete: "set null",
    }),

    action: text("action").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    result: text("result").notNull(),

    correlationId: text("correlation_id"),
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

/** See ../platform.schema.ts for why platform standing is not membership. */
export const platformRoles = pgTable("platform_roles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  grantedBy: text("granted_by").references(() => user.id, {
    onDelete: "set null",
  }),
  grantedAt: timestampColumn("granted_at").notNull().default(isoNow),
  note: text("note"),
});

export const organizationProfiles = pgTable("organization_profiles", {
  organizationId: text("organization_id")
    .primaryKey()
    .references(() => organization.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("customer"),
  createdAt: timestampColumn("created_at").notNull().default(isoNow),
});
