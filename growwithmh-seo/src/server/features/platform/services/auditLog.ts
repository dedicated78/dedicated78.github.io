/**
 * Append-only security and administration trail.
 *
 * Two rules govern everything written here:
 *   1. Never a secret. Not a key, not a password, not a token, not a provider
 *      payload — a credential change records *that* it changed, never to what.
 *   2. Never a blocker. An audit write that fails must not fail the action it
 *      describes, so every write is best-effort and swallows its own errors.
 *
 * Rule 2 is a deliberate trade: a missing audit row is bad, but a login that
 * fails because the audit table is unavailable is worse.
 */
import { db } from "@/db";
import { auditLog } from "@/db/schema";

export const AUDIT_ACTIONS = [
  "auth.login",
  "auth.login_failed",
  "auth.logout",
  "member.invited",
  "member.removed",
  "member.role_changed",
  "project.access_changed",
  "spend.limit_changed",
  "spend.kill_switch_changed",
  "provider.credential_verified",
  "provider.credential_changed",
  "admin.action",
  "mcp.privileged_tool",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditResult = "success" | "failure" | "denied";

export type AuditEntry = {
  action: AuditAction;
  result: AuditResult;
  actorUserId?: string | null;
  /** Stored as text so the trail survives the actor being deleted. */
  actorLabel?: string | null;
  organizationId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  correlationId?: string | null;
  /** Non-sensitive detail only. Serialised to JSON. */
  metadata?: Record<string, unknown> | null;
};

/**
 * Keys that must never reach the trail, whatever a caller passes.
 *
 * This is a backstop, not the primary defence — callers are expected not to
 * pass secrets at all — but it means one careless call site cannot write a
 * credential into a table designed to be read by auditors.
 */
const REDACTED_KEY_PATTERN =
  /(password|secret|token|credential|api[_-]?key|authorization|cookie)/i;

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if (!metadata) return null;

  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (REDACTED_KEY_PATTERN.test(key)) {
      safe[key] = "[redacted]";
      continue;
    }
    // Only primitives and short arrays survive; nested objects could smuggle a
    // secret under a key this pattern never sees.
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      safe[key] = value;
    } else if (Array.isArray(value)) {
      safe[key] = value.slice(0, 20).map((item) => String(item));
    } else {
      safe[key] = "[omitted]";
    }
  }

  try {
    return JSON.stringify(safe);
  } catch {
    return null;
  }
}

export async function recordAuditEvent(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      actorUserId: entry.actorUserId ?? null,
      actorLabel: entry.actorLabel ?? null,
      organizationId: entry.organizationId ?? null,
      action: entry.action,
      resourceType: entry.resourceType ?? null,
      resourceId: entry.resourceId ?? null,
      result: entry.result,
      correlationId: entry.correlationId ?? null,
      metadata: sanitizeAuditMetadata(entry.metadata),
    });
  } catch (error) {
    // See rule 2 above: the audited action must still succeed.
    console.error("[audit-log] failed to record", entry.action, error);
  }
}
