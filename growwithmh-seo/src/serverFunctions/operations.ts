import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";
import {
  costByApiFamily,
  costByOperation,
  costByOrganization,
  costByProject,
  recentUsage,
  totalsSince,
  usageDateFor,
} from "@/server/features/platform/repositories/ApiUsageRepository";
import {
  listControls,
  setControl,
  GLOBAL_SCOPE_ID,
} from "@/server/features/platform/repositories/SpendControlRepository";
import { recordAuditEvent } from "@/server/features/platform/services/auditLog";
import { fetchUserData } from "@/server/lib/dataforseo/appendix";
import { getDataforseoCredentialStatus } from "@/server/lib/dataforseo/credential-status";
import { assertRateLimit } from "@/server/features/platform/services/rateLimit";

function daysAgoUsageDate(days: number): string {
  return usageDateFor(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

/**
 * Everything the Operations → API Usage page needs, in one round trip.
 *
 * Every figure here is GrowwithMH's *recorded provider cost* — what we paid
 * DataForSEO. It is not customer credits and not revenue; those arrive in
 * Phase 3 and are accounted separately on purpose.
 */
export const getApiUsageOverview = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(async () => {
    const today = usageDateFor();
    const [
      todayTotals,
      sevenDayTotals,
      thirtyDayTotals,
      lifetimeTotals,
      byOrganization,
      byProject,
      byApiFamily,
      byOperation,
      recent,
      credentialStatus,
    ] = await Promise.all([
      totalsSince(today),
      totalsSince(daysAgoUsageDate(6)),
      totalsSince(daysAgoUsageDate(29)),
      totalsSince(null),
      costByOrganization(daysAgoUsageDate(29)),
      costByProject(daysAgoUsageDate(29)),
      costByApiFamily(daysAgoUsageDate(29)),
      costByOperation(daysAgoUsageDate(29)),
      recentUsage(50),
      getDataforseoCredentialStatus(),
    ]);

    return {
      today: todayTotals,
      sevenDays: sevenDayTotals,
      thirtyDays: thirtyDayTotals,
      lifetime: lifetimeTotals,
      byOrganization,
      byProject,
      byApiFamily,
      byOperation,
      recent,
      credentialStatus,
    };
  });

/**
 * Live DataForSEO account balance, from the free user_data endpoint.
 *
 * Kept separate from the ledger read above for two reasons: it contacts the
 * provider, and it answers a different question. The provider balance is the
 * money left in the DataForSEO account; the ledger is what this application
 * recorded spending. They can legitimately differ — other tools, manual calls,
 * top-ups — and presenting them as one number would hide exactly the
 * discrepancy an operator needs to see.
 */
export const getProviderAccountBalance = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) => {
    await assertRateLimit("admin", context.organizationId);

    try {
      const data = await fetchUserData();
      return {
        available: true as const,
        balanceUsd: data?.money?.balance ?? null,
        lifetimeDepositedUsd: data?.money?.total ?? null,
        spentTodayUsd: data?.money?.statistics?.day?.total ?? null,
      };
    } catch {
      // A provider outage must not break the operations page.
      return {
        available: false as const,
        balanceUsd: null,
        lifetimeDepositedUsd: null,
        spentTodayUsd: null,
      };
    }
  });

export const listSpendControls = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(() => listControls());

const setSpendControlSchema = z.object({
  scope: z.enum(["global", "organization", "project"]),
  scopeId: z.string().min(1),
  dailyLimitUsd: z.number().nonnegative().nullable(),
  enabled: z.boolean(),
  note: z.string().max(500).nullable().optional(),
});

export const updateSpendControl = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(setSpendControlSchema)
  .handler(async ({ data, context }) => {
    await assertRateLimit("admin", context.organizationId);

    await setControl({
      scope: data.scope,
      scopeId: data.scope === "global" ? GLOBAL_SCOPE_ID : data.scopeId,
      dailyLimitUsd: data.dailyLimitUsd,
      enabled: data.enabled,
      note: data.note ?? null,
      updatedBy: context.userId,
    });

    await recordAuditEvent({
      action: data.enabled
        ? "spend.limit_changed"
        : "spend.kill_switch_changed",
      result: "success",
      actorUserId: context.userId,
      actorLabel: context.userEmail,
      organizationId: context.organizationId,
      resourceType: "spend_control",
      resourceId: `${data.scope}:${data.scopeId}`,
      metadata: {
        scope: data.scope,
        enabled: data.enabled,
        dailyLimitUsd: data.dailyLimitUsd,
      },
    });

    return { ok: true };
  });
