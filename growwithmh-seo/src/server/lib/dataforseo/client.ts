import {
  type CreditFeature,
  mapDataforseoPathToCreditFeature,
} from "@/shared/billing-credit-features";
import {
  assertUsageCreditsAvailable,
  getOrCreateOrganizationCustomer,
  trackUsageCreditSpend,
} from "@/server/billing/subscription";
import type { BillingCustomerContext } from "@/server/billing/subscription";
// Type-only namespace import: erased at compile, so the section modules (and
// the SDK they pull in) still only load through loadDataforseoSections below.
import type * as sections from "@/server/lib/dataforseo/sections";
import {
  DataforseoChargedTaskError,
  type DataforseoApiCallCost,
  type DataforseoApiResponse,
} from "@/server/lib/dataforseo/envelope";
import { isHostedServerAuthMode } from "@/server/lib/runtime-env";
import { AppError, asAppError } from "@/server/lib/errors";
import {
  recordUsage,
  type ApiUsageOutcome,
} from "@/server/features/platform/repositories/ApiUsageRepository";
import {
  assertSpendAllowed,
  reserveSpend,
} from "@/server/features/platform/services/spendGuard";
import { currentExecutionSource } from "@/server/features/platform/services/executionSource";

export { mapDataforseoPathToCreditFeature };

/** The section-fetcher barrel (sections.ts), as a type for `meter` pickers. */
export type DataforseoSections = typeof sections;

let sectionsPromise: Promise<DataforseoSections> | undefined;

/** Single lazy boundary for the DataForSEO subtree: the section fetchers and
 * the ~3 MB dataforseo-client SDK they statically import stay out of the
 * eager isolate startup graph and load once, on the first API call. */
export function loadDataforseoSections(): Promise<DataforseoSections> {
  return (sectionsPromise ??= import("@/server/lib/dataforseo/sections"));
}

/**
 * Wraps a section fetcher with billing metering. Each entry on the client is
 * `meter(customer, (s) => s.fetchX, defaultFeature?)`, which returns a function
 * with the fetcher's own input type and resolves to its unwrapped `.data`. The
 * picker indirection (rather than the fetcher itself) keeps the section
 * modules behind loadDataforseoSections.
 *
 * `defaultFeature` is the fallback credit feature; a caller can override it per
 * call by passing `creditFeature` in the input (e.g. an MCP tool attributing
 * spend to its own feature). The extra field is ignored by the fetchers, which
 * read named fields rather than spreading the input.
 */
function meter<I, T>(
  customer: BillingCustomerContext,
  pick: (
    sections: DataforseoSections,
  ) => (input: I) => Promise<DataforseoApiResponse<T>>,
  defaultFeature?: CreditFeature,
): (input: I & { creditFeature?: CreditFeature }) => Promise<T> {
  return (input) =>
    meterDataforseoCall(
      customer,
      async () => pick(await loadDataforseoSections())(input),
      input.creditFeature ?? defaultFeature,
    );
}

export function createDataforseoClient(customer: BillingCustomerContext) {
  return {
    business: {
      businessListings: meter(
        customer,
        (s) => s.fetchBusinessListingsSearch,
        "local_seo",
      ),
      questionsAnswers: meter(
        customer,
        (s) => s.fetchQuestionsAnswers,
        "local_seo",
      ),
      myBusinessInfo: meter(
        customer,
        (s) => s.fetchMyBusinessInfo,
        "local_seo",
      ),
      // task_post is where DataForSEO charges; collection runs unmetered
      // through fetchBusinessDataTaskResult (see index.ts).
      reviewsTaskPost: meter(
        customer,
        (s) => s.postGoogleReviewsTask,
        "local_seo",
      ),
      updatesTaskPost: meter(
        customer,
        (s) => s.postMyBusinessUpdatesTask,
        "local_seo",
      ),
    },
    backlinks: {
      summary: meter(customer, (s) => s.fetchBacklinksSummary),
      rows: meter(customer, (s) => s.fetchBacklinksRows),
      referringDomains: meter(customer, (s) => s.fetchReferringDomains),
      domainPages: meter(customer, (s) => s.fetchDomainPagesSummary),
      history: meter(customer, (s) => s.fetchBacklinksHistory),
    },
    keywords: {
      related: meter(customer, (s) => s.fetchRelatedKeywords),
      suggestions: meter(customer, (s) => s.fetchKeywordSuggestions),
      ideas: meter(customer, (s) => s.fetchKeywordIdeas),
      // Google Ads endpoints for countries Labs doesn't support.
      adsIdeas: meter(customer, (s) => s.fetchAdsKeywordIdeas),
      adsSearchVolume: meter(customer, (s) => s.fetchAdsSearchVolume),
    },
    domain: {
      rankOverview: meter(customer, (s) => s.fetchDomainRankOverview),
      rankedKeywords: meter(customer, (s) => s.fetchRankedKeywords),
      relevantPages: meter(customer, (s) => s.fetchRelevantPages),
    },
    serp: {
      live: meter(customer, (s) => s.fetchLiveSerp),
      rankCheck: meter(customer, (s) => s.fetchRankCheckSerp, "rank_tracking"),
      // Posts up to 100 queued rank check tasks; one metered charge covers the
      // whole batch (DataForSEO bills task_post at post time, collection is
      // free).
      rankCheckTaskPost: meter(
        customer,
        (s) => s.postRankCheckTasks,
        "rank_tracking",
      ),
      local: meter(customer, (s) => s.fetchLocalSerp, "local_seo"),
    },
    labs: {
      // Callers (e.g. the keyword-metrics MCP tool) can attribute the spend to
      // their own feature by passing `creditFeature` in the input; defaults to
      // rank_tracking when omitted.
      keywordOverview: meter(
        customer,
        (s) => s.fetchKeywordOverview,
        "rank_tracking",
      ),
      serpCompetitors: meter(customer, (s) => s.fetchSerpCompetitors),
    },
    lighthouse: {
      live: meter(customer, (s) => s.fetchLighthouseResult),
    },
    aiSearch: {
      mentionsSearch: meter(customer, (s) => s.fetchLlmMentionsSearch),
      aggregatedMetrics: meter(customer, (s) => s.fetchLlmAggregatedMetrics),
      topPages: meter(customer, (s) => s.fetchLlmTopPages),
      crossAggregatedMetrics: meter(
        customer,
        (s) => s.fetchLlmCrossAggregatedMetrics,
      ),
      llmResponse: meter(customer, (s) => s.fetchLlmResponse),
    },
  } as const;
}

async function meterDataforseoCall<T>(
  customer: BillingCustomerContext,
  execute: () => Promise<DataforseoApiResponse<T>>,
  creditFeature?: CreditFeature,
): Promise<T> {
  const isHostedMode = await isHostedServerAuthMode();

  // Spend controls and the usage ledger apply in EVERY mode. Phase 1 found the
  // non-hosted path returning here with no ceiling checked and no cost written,
  // so a self-hosted install could bill DataForSEO without limit or record.
  // Autumn credits below remain hosted-only — provider cost and customer
  // credits are different things and are accounted separately.
  const spendRef = {
    organizationId: customer.organizationId,
    projectId: customer.projectId ?? null,
  };
  await assertSpendAllowed(spendRef);

  if (!isHostedMode) {
    return runLedgered(spendRef, customer, execute, creditFeature);
  }

  const billingCustomer = await getOrCreateOrganizationCustomer(customer);

  const { monthlyRemaining } = await assertUsageCreditsAvailable(
    billingCustomer.id,
  );

  let result: DataforseoApiResponse<T>;
  try {
    result = await execute();
  } catch (error) {
    if (error instanceof DataforseoChargedTaskError) {
      // A malformed request (DataForSEO "Invalid Field: ...") that DataForSEO
      // did not bill returns no value to the customer, so don't charge — surface
      // it as a non-reportable VALIDATION_ERROR. If DataForSEO still billed us
      // (costUsd > 0), fall through to the normal charge + capture path so the
      // spend stays metered and visible instead of silently eaten.
      if (error.isInvalidField && error.billing.costUsd <= 0) {
        throw new AppError("VALIDATION_ERROR", error.message);
      }
      await trackDataforseoCost({
        customer,
        customerId: billingCustomer.id,
        billing: error.billing,
        monthlyRemaining,
        creditFeature,
      });
      await writeUsageRow(spendRef, customer, error.billing, {
        outcome: "charged_failed",
        creditFeature,
        errorCode: "INTERNAL_ERROR",
      });
    }
    throw error;
  }

  await trackDataforseoCost({
    customer,
    customerId: billingCustomer.id,
    billing: result.billing,
    monthlyRemaining,
    creditFeature,
  });
  await writeUsageRow(spendRef, customer, result.billing, {
    outcome: "success",
    creditFeature,
  });

  return result.data;
}

/**
 * The non-hosted path: no Autumn customer, no credits — just the provider-cost
 * ledger and the spend reservation that keeps concurrent calls honest.
 *
 * DataForSEO reports a call's real cost only in its response, so the amount
 * reserved up front is an estimate. It is released the moment the true cost is
 * booked, so the reservation only has to bound a burst, not be exact.
 */
async function runLedgered<T>(
  spendRef: { organizationId: string; projectId: string | null },
  customer: BillingCustomerContext,
  execute: () => Promise<DataforseoApiResponse<T>>,
  creditFeature?: CreditFeature,
): Promise<T> {
  return reserveSpend(spendRef, ESTIMATED_CALL_USD, async () => {
    let result: DataforseoApiResponse<T>;
    try {
      result = await execute();
    } catch (error) {
      if (error instanceof DataforseoChargedTaskError) {
        if (error.isInvalidField && error.billing.costUsd <= 0) {
          await writeUsageRow(spendRef, customer, error.billing, {
            outcome: "failed",
            creditFeature,
            errorCode: "VALIDATION_ERROR",
          });
          throw new AppError("VALIDATION_ERROR", error.message);
        }
        await writeUsageRow(spendRef, customer, error.billing, {
          outcome: "charged_failed",
          creditFeature,
          errorCode: "INTERNAL_ERROR",
        });
      } else {
        // No billing envelope means DataForSEO never charged; the row still
        // matters so failures show up in the cost history.
        await writeUsageRow(spendRef, customer, null, {
          outcome: "failed",
          creditFeature,
          errorCode: asAppError(error)?.code ?? "INTERNAL_ERROR",
        });
      }
      throw error;
    }

    await writeUsageRow(spendRef, customer, result.billing, {
      outcome: "success",
      creditFeature,
    });
    return result.data;
  });
}

/**
 * Reservation size for a call whose cost is not yet known. DataForSEO's live
 * endpoints sit well under this, so it over-reserves slightly — the safe
 * direction for a ceiling.
 */
const ESTIMATED_CALL_USD = 0.02;

async function writeUsageRow(
  spendRef: { organizationId: string; projectId: string | null },
  customer: BillingCustomerContext,
  billing: DataforseoApiCallCost | null,
  options: {
    outcome: ApiUsageOutcome;
    creditFeature?: CreditFeature;
    errorCode?: string;
  },
): Promise<void> {
  try {
    await recordUsage({
      organizationId: spendRef.organizationId,
      projectId: spendRef.projectId,
      userId: customer.userId ?? null,
      provider: "dataforseo",
      apiFamily: billing?.path?.[1] ?? null,
      endpoint: billing ? `/${billing.path.join("/")}` : null,
      operation:
        options.creditFeature ??
        (billing ? mapDataforseoPathToCreditFeature(billing.path) : null),
      executionSource: currentExecutionSource(),
      correlationId: null,
      outcome: options.outcome,
      errorCode: options.errorCode ?? null,
      costUsd: billing?.costUsd ?? 0,
      fromCache: false,
    });
  } catch (error) {
    // A ledger write must never break the call it describes; the spend guard
    // degrades to the ceiling it can still read.
    console.error("[api-usage] failed to record dataforseo call", error);
  }
}

async function trackDataforseoCost(args: {
  customer: BillingCustomerContext;
  customerId: string;
  billing: DataforseoApiCallCost;
  monthlyRemaining: number;
  creditFeature?: CreditFeature;
}) {
  await trackUsageCreditSpend({
    customer: args.customer,
    customerId: args.customerId,
    creditFeature:
      args.creditFeature ?? mapDataforseoPathToCreditFeature(args.billing.path),
    costUsd: args.billing.costUsd,
    monthlyRemaining: args.monthlyRemaining,
    properties: {
      provider: "dataforseo",
      paths: [args.billing.path.join("/")],
      fromCache: false,
    },
  });
}
