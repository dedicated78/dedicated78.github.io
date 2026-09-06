/**
 * DataForSEO credential state, separating "a key is set" from "the key works".
 *
 * Verification uses GET /v3/appendix/user_data, which DataForSEO does not
 * bill. That matters: it is the only way to prove a credential without
 * spending the operator's balance, so status checks can never become a cost.
 * Nothing here goes through meterDataforseoCall for the same reason.
 *
 * The result is cached in KV so a live probe happens on operator request or
 * after the cache lapses, never on every page render.
 */
import { env } from "cloudflare:workers";
import { z } from "zod";
import { jsonCodec } from "@/shared/json";
import { asAppError } from "@/server/lib/errors";
import { looksLikeDataForSeoKey } from "@/shared/selfhost-checks";
import {
  PROVIDER_CREDENTIAL_STATUSES,
  type ProviderCredentialStatus,
} from "@/shared/provider-status";

const KV_KEY = "provider-status:dataforseo";

/**
 * A good result is trusted for an hour; a bad one for a minute. The asymmetry
 * is deliberate — an operator who has just fixed a wrong key should see the
 * status clear quickly, while a working install should not re-probe often.
 */
const VERIFIED_TTL_SECONDS = 60 * 60;
const FAILED_TTL_SECONDS = 60;

const cachedStatusSchema = z.object({
  status: z.enum(PROVIDER_CREDENTIAL_STATUSES),
  checkedAt: z.string(),
});

const cachedStatusCodec = jsonCodec(cachedStatusSchema);

export type DataforseoCredentialStatus = {
  status: ProviderCredentialStatus;
  /** ISO timestamp of the last live probe, null when never probed. */
  checkedAt: string | null;
  /**
   * True when the configured value does not decode to "login:password".
   * A local format check — it never proves the credential works.
   */
  malformed: boolean;
};

function configuredKey(): string | undefined {
  const value = env.DATAFORSEO_API_KEY?.trim();
  return value ? value : undefined;
}

async function readCache(): Promise<z.infer<typeof cachedStatusSchema> | null> {
  try {
    const raw = await env.KV.get(KV_KEY, "text");
    if (!raw) return null;
    const parsed = cachedStatusCodec.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    // A KV read failure must not break the status endpoint; the caller simply
    // falls back to the unverified state.
    return null;
  }
}

async function writeCache(status: ProviderCredentialStatus, checkedAt: string) {
  const ttl = status === "VERIFIED" ? VERIFIED_TTL_SECONDS : FAILED_TTL_SECONDS;
  try {
    await env.KV.put(KV_KEY, JSON.stringify({ status, checkedAt }), {
      expirationTtl: ttl,
    });
  } catch {
    // Caching is an optimisation, not a correctness requirement.
  }
}

/** Clears the cached verdict so the next probe hits the provider. */
export async function invalidateDataforseoCredentialStatus(): Promise<void> {
  try {
    await env.KV.delete(KV_KEY);
  } catch {
    // Best effort — the entry expires on its own.
  }
}

/**
 * Current status without contacting DataForSEO.
 *
 * Returns the cached verdict when one exists, otherwise CONFIGURED_UNVERIFIED
 * for a present key. It deliberately never reports VERIFIED off the strength
 * of the environment variable alone.
 */
export async function getDataforseoCredentialStatus(): Promise<DataforseoCredentialStatus> {
  const key = configuredKey();
  if (!key) {
    return { status: "NOT_CONFIGURED", checkedAt: null, malformed: false };
  }

  const malformed = !looksLikeDataForSeoKey(key);
  const cached = await readCache();
  return {
    status: cached?.status ?? "CONFIGURED_UNVERIFIED",
    checkedAt: cached?.checkedAt ?? null,
    malformed,
  };
}

/**
 * Probes DataForSEO with the free user_data call and records the verdict.
 *
 * `probe` is injected so tests can drive every branch without a network call;
 * production passes the real fetcher.
 */
export async function verifyDataforseoCredential(
  probe: () => Promise<unknown>,
): Promise<DataforseoCredentialStatus> {
  const key = configuredKey();
  if (!key) {
    return { status: "NOT_CONFIGURED", checkedAt: null, malformed: false };
  }

  const malformed = !looksLikeDataForSeoKey(key);
  const checkedAt = new Date().toISOString();

  let status: ProviderCredentialStatus;
  try {
    await probe();
    status = "VERIFIED";
  } catch (error) {
    const appError = asAppError(error);
    status =
      appError?.code === "DATAFORSEO_AUTH_FAILED"
        ? "AUTHENTICATION_FAILED"
        : // Anything else — a 5xx, a rate limit, a timeout — leaves the
          // credential unproven rather than condemned.
          "PROVIDER_UNAVAILABLE";
  }

  await writeCache(status, checkedAt);
  return { status, checkedAt, malformed };
}
