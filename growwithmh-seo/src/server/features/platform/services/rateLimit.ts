/**
 * First-party rate limiting.
 *
 * Deliberately independent of credits and spend ceilings: those bound *cost*,
 * this bounds *request rate*. A customer with unlimited credits still must not
 * be able to hammer the provider or the login endpoint, and a customer who has
 * run out of credits should get a credit error, not a rate-limit one.
 *
 * Storage is KV with a fixed window. A fixed window admits a burst across a
 * boundary (up to 2x the limit over two adjacent windows); that is an accepted
 * trade for an implementation with one KV read and one write per request and
 * no coordination. The spend guard, not this, is what bounds money.
 */
import { env } from "cloudflare:workers";
import { z } from "zod";
import { jsonCodec } from "@/shared/json";
import { AppError } from "@/server/lib/errors";

export type RateLimitRule = {
  /** Requests permitted per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

/**
 * Default rules per protected surface.
 *
 * `paidData` is the tight one: every request behind it can cost money, so it
 * is bounded well below what a human could click but far above normal use.
 */
export const RATE_LIMIT_RULES = {
  /** Any operation that can reach a paid provider endpoint. */
  paidData: { limit: 120, windowSeconds: 60 },
  /** MCP tool invocations — agents loop far faster than people click. */
  mcp: { limit: 240, windowSeconds: 60 },
  /** Authentication attempts, to blunt credential stuffing. */
  auth: { limit: 10, windowSeconds: 300 },
  /** Privileged administration endpoints. */
  admin: { limit: 60, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitRule>;

export type RateLimitSurface = keyof typeof RATE_LIMIT_RULES;

const windowStateSchema = z.object({
  count: z.number(),
  /** Unix seconds at which the current window began. */
  windowStart: z.number(),
});

const windowStateCodec = jsonCodec(windowStateSchema);

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the current window resets. */
  retryAfterSeconds: number;
};

function key(surface: RateLimitSurface, identity: string): string {
  return `ratelimit:${surface}:${identity}`;
}

/**
 * Consumes one unit of quota.
 *
 * A KV failure is treated as *allowed*. Rate limiting protects against abuse;
 * it is not an authorization control, and taking the whole product down
 * because a cache is unavailable would be a worse outcome than briefly
 * unbounded request rates. Authorization checks never depend on this.
 */
export async function consumeRateLimit(
  surface: RateLimitSurface,
  identity: string,
  rule: RateLimitRule = RATE_LIMIT_RULES[surface],
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const storageKey = key(surface, identity);

  let state = { count: 0, windowStart: now };
  try {
    const raw = await env.KV.get(storageKey, "text");
    const parsed = raw ? windowStateCodec.safeParse(raw) : null;
    if (parsed?.success && now - parsed.data.windowStart < rule.windowSeconds) {
      state = parsed.data;
    }
  } catch {
    return {
      allowed: true,
      limit: rule.limit,
      remaining: rule.limit,
      retryAfterSeconds: 0,
    };
  }

  const elapsed = now - state.windowStart;
  const retryAfterSeconds = Math.max(1, rule.windowSeconds - elapsed);

  if (state.count >= rule.limit) {
    return {
      allowed: false,
      limit: rule.limit,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  const next = { count: state.count + 1, windowStart: state.windowStart };
  try {
    await env.KV.put(storageKey, JSON.stringify(next), {
      // Outlive the window so a slow write cannot resurrect a stale count.
      expirationTtl: rule.windowSeconds * 2,
    });
  } catch {
    // Counted in memory only for this request; see the fail-open note above.
  }

  return {
    allowed: true,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - next.count),
    retryAfterSeconds,
  };
}

/** Throws RATE_LIMITED when the caller is over quota. */
export async function assertRateLimit(
  surface: RateLimitSurface,
  identity: string,
): Promise<void> {
  const result = await consumeRateLimit(surface, identity);
  if (result.allowed) return;

  throw new AppError(
    "RATE_LIMITED",
    `Too many requests. Try again in ${result.retryAfterSeconds}s.`,
    { surface, retryAfter: String(result.retryAfterSeconds) },
  );
}

export function rateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(result.retryAfterSeconds),
    ...(result.allowed
      ? {}
      : { "Retry-After": String(result.retryAfterSeconds) }),
  };
}
