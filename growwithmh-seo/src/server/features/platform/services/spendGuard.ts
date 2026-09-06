/**
 * Central enforcement for provider spend.
 *
 * Every paid provider call passes through {@link assertSpendAllowed} before it
 * is made, and {@link reserveSpend} while it is in flight. Phase 1 found the
 * app had no ceiling of any kind outside hosted mode: a runaway agent loop
 * could bill DataForSEO until the balance was gone, with nothing recorded.
 *
 * Two things are deliberately separate here:
 *   - the kill switch (`enabled: false`) stops a scope immediately;
 *   - the daily ceiling stops a scope once today's booked spend reaches it.
 *
 * Concurrency: booked spend alone cannot bound concurrent calls, because a
 * hundred simultaneous requests all read the same "spent so far" before any of
 * them writes a row. An in-flight reservation closes that window — see
 * {@link reserveSpend}.
 */
import { AppError } from "@/server/lib/errors";
import {
  loadControlsFor,
  type SpendControl,
  type SpendScope,
} from "@/server/features/platform/repositories/SpendControlRepository";
import {
  spendForDate,
  usageDateFor,
} from "@/server/features/platform/repositories/ApiUsageRepository";

export type SpendScopeRef = {
  organizationId?: string | null;
  projectId?: string | null;
};

export type SpendDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: "killed" | "ceiling";
      scope: SpendScope;
      scopeId: string;
      limitUsd: number | null;
      spentUsd: number;
    };

/**
 * Spend committed to calls that have started but not yet written their ledger
 * row, keyed by "scope:scopeId". Isolate-local, which is the right lifetime:
 * it exists to stop one burst of concurrent requests inside one isolate from
 * each reading a stale total. Across isolates the booked ledger is the bound,
 * and the ceiling is a cost guardrail rather than a hard transactional limit.
 */
const inFlightUsd = new Map<string, number>();

function scopeKey(scope: SpendScope, scopeId: string): string {
  return `${scope}:${scopeId}`;
}

function reservedFor(scope: SpendScope, scopeId: string): number {
  return inFlightUsd.get(scopeKey(scope, scopeId)) ?? 0;
}

function addReservation(scope: SpendScope, scopeId: string, usd: number): void {
  const key = scopeKey(scope, scopeId);
  const next = (inFlightUsd.get(key) ?? 0) + usd;
  if (next <= 0) inFlightUsd.delete(key);
  else inFlightUsd.set(key, next);
}

function scopeIdFor(control: SpendControl): string {
  return control.scopeId;
}

/**
 * Checks the kill switches and daily ceilings covering a call.
 *
 * `estimatedUsd` is what the caller expects to spend. Callers that cannot
 * estimate pass 0, which still enforces the kill switch and a ceiling already
 * reached, just not a ceiling this call would cross.
 */
export async function evaluateSpend(
  ref: SpendScopeRef,
  estimatedUsd = 0,
): Promise<SpendDecision> {
  // Fail CLOSED. If the ceiling cannot be read, we cannot know whether this
  // call is within budget, and the safe direction for a cost control is to
  // refuse rather than spend. This is the opposite of the rate limiter, which
  // fails open — that one protects against abuse, this one protects money.
  const controls = await loadControlsFor(ref);
  if (controls.length === 0) return { allowed: true };

  // Kill switches first: an explicit disable outranks any arithmetic.
  const killed = controls.find((control) => !control.enabled);
  if (killed) {
    return {
      allowed: false,
      reason: "killed",
      scope: killed.scope,
      scopeId: scopeIdFor(killed),
      limitUsd: killed.dailyLimitUsd,
      spentUsd: 0,
    };
  }

  const limited = controls.filter((control) => control.dailyLimitUsd !== null);
  if (limited.length === 0) return { allowed: true };

  const usageDate = usageDateFor();
  for (const control of limited) {
    const spent = await spendForDate({
      usageDate,
      organizationId:
        control.scope === "organization" ? control.scopeId : undefined,
      projectId: control.scope === "project" ? control.scopeId : undefined,
    });
    const projected =
      spent + reservedFor(control.scope, control.scopeId) + estimatedUsd;

    if (projected > (control.dailyLimitUsd ?? Infinity)) {
      return {
        allowed: false,
        reason: "ceiling",
        scope: control.scope,
        scopeId: scopeIdFor(control),
        limitUsd: control.dailyLimitUsd,
        spentUsd: spent,
      };
    }
  }

  return { allowed: true };
}

export function spendDenialMessage(decision: SpendDecision): string {
  if (decision.allowed) return "";
  const where =
    decision.scope === "global"
      ? "the platform"
      : `this ${decision.scope === "organization" ? "workspace" : "project"}`;

  return decision.reason === "killed"
    ? `Paid SEO data is switched off for ${where}. An administrator can re-enable it in Operations.`
    : `${where[0].toUpperCase()}${where.slice(1)} has reached its daily data budget of $${(decision.limitUsd ?? 0).toFixed(2)} (spent $${decision.spentUsd.toFixed(2)}). It resets at 00:00 UTC.`;
}

/** Throws SPEND_LIMIT_REACHED when a call is not permitted. */
export async function assertSpendAllowed(
  ref: SpendScopeRef,
  estimatedUsd = 0,
): Promise<void> {
  const decision = await evaluateSpend(ref, estimatedUsd);
  if (decision.allowed) return;

  throw new AppError("SPEND_LIMIT_REACHED", spendDenialMessage(decision), {
    scope: decision.scope,
    reason: decision.reason,
  });
}

/**
 * Holds `estimatedUsd` against every scope for the duration of `run`.
 *
 * Without this, N concurrent calls each see the same booked total and all pass
 * a ceiling that only one of them should have. The reservation is released in
 * `finally`, so a thrown call never leaves budget stranded.
 */
export async function reserveSpend<T>(
  ref: SpendScopeRef,
  estimatedUsd: number,
  run: () => Promise<T>,
): Promise<T> {
  const scopes: Array<[SpendScope, string]> = [["global", "global"]];
  if (ref.organizationId) scopes.push(["organization", ref.organizationId]);
  if (ref.projectId) scopes.push(["project", ref.projectId]);

  if (estimatedUsd > 0) {
    for (const [scope, scopeId] of scopes) {
      addReservation(scope, scopeId, estimatedUsd);
    }
  }

  try {
    return await run();
  } finally {
    if (estimatedUsd > 0) {
      for (const [scope, scopeId] of scopes) {
        addReservation(scope, scopeId, -estimatedUsd);
      }
    }
  }
}

/** Test seam — clears isolate-local reservations between cases. */
export function __resetSpendReservations(): void {
  inFlightUsd.clear();
}
