import { beforeEach, describe, expect, it, vi } from "vitest";
import { consumeRateLimit, assertRateLimit } from "./rateLimit";

const store = new Map<string, string>();
const kv = {
  get: vi.fn(async (key: string) => store.get(key) ?? null),
  put: vi.fn(async (key: string, value: string) => {
    store.set(key, value);
  }),
};

vi.mock("cloudflare:workers", () => ({
  env: {
    get KV() {
      return kv;
    },
  },
}));

const rule = { limit: 3, windowSeconds: 60 };

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
  kv.get.mockImplementation(async (key: string) => store.get(key) ?? null);
  kv.put.mockImplementation(async (key: string, value: string) => {
    store.set(key, value);
  });
});

describe("consumeRateLimit", () => {
  it("allows up to the limit then blocks", async () => {
    for (let i = 0; i < rule.limit; i++) {
      const result = await consumeRateLimit("paidData", "org_1", rule);
      expect(result.allowed).toBe(true);
    }

    const blocked = await consumeRateLimit("paidData", "org_1", rule);
    expect(blocked).toMatchObject({ allowed: false, remaining: 0 });
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("counts each identity separately", async () => {
    for (let i = 0; i < rule.limit; i++) {
      await consumeRateLimit("paidData", "org_1", rule);
    }

    // One tenant exhausting its quota must not throttle another.
    const other = await consumeRateLimit("paidData", "org_2", rule);
    expect(other.allowed).toBe(true);
  });

  it("counts each surface separately", async () => {
    for (let i = 0; i < rule.limit; i++) {
      await consumeRateLimit("paidData", "org_1", rule);
    }

    // Exhausting paid data must not lock the user out of signing in.
    const auth = await consumeRateLimit("auth", "org_1", rule);
    expect(auth.allowed).toBe(true);
  });

  it("starts a fresh window once the old one has elapsed", async () => {
    await consumeRateLimit("paidData", "org_1", rule);
    const stale = JSON.stringify({
      count: rule.limit,
      windowStart: Math.floor(Date.now() / 1000) - rule.windowSeconds - 1,
    });
    store.set("ratelimit:paidData:org_1", stale);

    const result = await consumeRateLimit("paidData", "org_1", rule);
    expect(result.allowed).toBe(true);
  });

  it("fails open when KV is unavailable", async () => {
    kv.get.mockRejectedValue(new Error("kv down"));

    // Rate limiting is abuse protection, not authorization — a cache outage
    // must not take the product down.
    const result = await consumeRateLimit("paidData", "org_1", rule);
    expect(result.allowed).toBe(true);
  });
});

describe("assertRateLimit", () => {
  it("throws RATE_LIMITED once over quota", async () => {
    store.set(
      "ratelimit:auth:user_1",
      JSON.stringify({
        count: 999,
        windowStart: Math.floor(Date.now() / 1000),
      }),
    );

    await expect(assertRateLimit("auth", "user_1")).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
  });
});
