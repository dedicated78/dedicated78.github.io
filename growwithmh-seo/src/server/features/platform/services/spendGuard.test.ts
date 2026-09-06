import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertSpendAllowed,
  evaluateSpend,
  reserveSpend,
  __resetSpendReservations,
} from "./spendGuard";

const mocks = vi.hoisted(() => ({
  loadControlsFor: vi.fn(),
  spendForDate: vi.fn(),
}));

vi.mock(
  "@/server/features/platform/repositories/SpendControlRepository",
  () => ({
    loadControlsFor: mocks.loadControlsFor,
  }),
);

vi.mock("@/server/features/platform/repositories/ApiUsageRepository", () => ({
  spendForDate: mocks.spendForDate,
  usageDateFor: () => "2026-09-06",
}));

const control = (over: Record<string, unknown> = {}) => ({
  scope: "organization" as const,
  scopeId: "org_1",
  dailyLimitUsd: null,
  enabled: true,
  note: null,
  updatedAt: "2026-09-06T00:00:00.000Z",
  ...over,
});

const ref = { organizationId: "org_1", projectId: "proj_1" };

beforeEach(() => {
  vi.clearAllMocks();
  __resetSpendReservations();
  mocks.spendForDate.mockResolvedValue(0);
});

describe("evaluateSpend", () => {
  it("allows a call when no controls are configured", async () => {
    mocks.loadControlsFor.mockResolvedValue([]);
    await expect(evaluateSpend(ref)).resolves.toEqual({ allowed: true });
    // A fresh install must never refuse work for lack of configuration.
    expect(mocks.spendForDate).not.toHaveBeenCalled();
  });

  it("blocks on the kill switch before doing any arithmetic", async () => {
    mocks.loadControlsFor.mockResolvedValue([
      control({ enabled: false, dailyLimitUsd: 1000 }),
    ]);
    const decision = await evaluateSpend(ref, 0.01);
    expect(decision).toMatchObject({ allowed: false, reason: "killed" });
    expect(mocks.spendForDate).not.toHaveBeenCalled();
  });

  it("blocks when this call would cross the daily ceiling", async () => {
    mocks.loadControlsFor.mockResolvedValue([control({ dailyLimitUsd: 5 })]);
    mocks.spendForDate.mockResolvedValue(4.995);
    const decision = await evaluateSpend(ref, 0.02);
    expect(decision).toMatchObject({
      allowed: false,
      reason: "ceiling",
      scope: "organization",
      limitUsd: 5,
    });
  });

  it("allows a call that stays inside the ceiling", async () => {
    mocks.loadControlsFor.mockResolvedValue([control({ dailyLimitUsd: 5 })]);
    mocks.spendForDate.mockResolvedValue(1);
    await expect(evaluateSpend(ref, 0.02)).resolves.toEqual({ allowed: true });
  });

  it("enforces the tightest scope, not just the first", async () => {
    mocks.loadControlsFor.mockResolvedValue([
      control({ scope: "global", scopeId: "global", dailyLimitUsd: 1000 }),
      control({ scope: "project", scopeId: "proj_1", dailyLimitUsd: 1 }),
    ]);
    mocks.spendForDate.mockImplementation(
      async (args: { projectId?: string }) => (args.projectId ? 0.99 : 10),
    );
    const decision = await evaluateSpend(ref, 0.02);
    expect(decision).toMatchObject({ allowed: false, scope: "project" });
  });

  it("throws SPEND_LIMIT_REACHED from assertSpendAllowed", async () => {
    mocks.loadControlsFor.mockResolvedValue([control({ enabled: false })]);
    await expect(assertSpendAllowed(ref)).rejects.toMatchObject({
      code: "SPEND_LIMIT_REACHED",
    });
  });
});

describe("reserveSpend", () => {
  it("counts in-flight spend so concurrent calls cannot all pass one ceiling", async () => {
    mocks.loadControlsFor.mockResolvedValue([control({ dailyLimitUsd: 0.05 })]);
    // Nothing is booked yet — without reservations every concurrent call would
    // read 0 spent and be allowed through.
    mocks.spendForDate.mockResolvedValue(0);

    let inner: Awaited<ReturnType<typeof evaluateSpend>> | undefined;
    await reserveSpend(ref, 0.04, async () => {
      inner = await evaluateSpend(ref, 0.04);
    });

    expect(inner).toMatchObject({ allowed: false, reason: "ceiling" });
  });

  it("releases the reservation even when the call throws", async () => {
    mocks.loadControlsFor.mockResolvedValue([control({ dailyLimitUsd: 0.05 })]);
    mocks.spendForDate.mockResolvedValue(0);

    await expect(
      reserveSpend(ref, 0.04, async () => {
        throw new Error("provider exploded");
      }),
    ).rejects.toThrow("provider exploded");

    // Budget must not stay stranded after a failure.
    await expect(evaluateSpend(ref, 0.04)).resolves.toEqual({ allowed: true });
  });
});
