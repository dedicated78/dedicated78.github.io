import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import {
  getApiUsageOverview,
  getProviderAccountBalance,
} from "@/serverFunctions/operations";
import { providerCredentialLabel } from "@/shared/provider-status";

export const Route = createFileRoute("/_app/operations")({
  component: OperationsPage,
});

function usd(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  // Provider costs are frequently fractions of a cent; four places keeps a
  // single call from rounding to $0.00 and looking free.
  return value >= 1 ? `$${value.toFixed(2)}` : `$${value.toFixed(4)}`;
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="border-l-2 border-base-300 pl-3">
      <p className="text-xs font-medium uppercase tracking-wide text-base-content/40">
        {label}
      </p>
      <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
        {value}
      </p>
      {sub ? <p className="text-xs text-base-content/50">{sub}</p> : null}
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: Array<{ key: string; costUsd: number; calls: number }>;
  emptyLabel: string;
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-base-content/40">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-base-content/50">{emptyLabel}</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th className="text-right">Calls</th>
                <th className="text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="font-mono text-xs">{row.key}</td>
                  <td className="text-right tabular-nums">{row.calls}</td>
                  <td className="text-right font-mono tabular-nums">
                    {usd(row.costUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OperationsPage() {
  const overview = useQuery({
    queryKey: ["operations", "apiUsage"],
    queryFn: () => getApiUsageOverview(),
  });

  // Separate query: this one contacts DataForSEO, so a provider outage degrades
  // one card instead of the whole page.
  const balance = useQuery({
    queryKey: ["operations", "providerBalance"],
    queryFn: () => getProviderAccountBalance(),
    retry: false,
  });

  const data = overview.data;

  return (
    <div className="h-full overflow-auto bg-base-100 px-4 py-8 pb-24 md:px-6 md:py-12 md:pb-8">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-medium text-base-content/40">Operations</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          API usage &amp; cost history
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-base-content/60">
          What GrowwithMH has paid data providers, recorded per call. These are
          provider costs — not customer credits and not revenue.
        </p>

        {overview.isLoading ? (
          <p className="mt-8 text-sm text-base-content/50">Loading usage…</p>
        ) : overview.isError ? (
          <div className="mt-8 alert alert-warning">
            <AlertTriangle className="size-4 shrink-0" />
            <span className="text-sm">
              Could not load usage history. Check the server logs.
            </span>
          </div>
        ) : data ? (
          <>
            <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-4">
              <StatTile
                label="Today"
                value={usd(data.today.costUsd)}
                sub={`${data.today.calls} calls`}
              />
              <StatTile
                label="7 days"
                value={usd(data.sevenDays.costUsd)}
                sub={`${data.sevenDays.calls} calls`}
              />
              <StatTile
                label="30 days"
                value={usd(data.thirtyDays.costUsd)}
                sub={`${data.thirtyDays.calls} calls`}
              />
              <StatTile
                label="Lifetime"
                value={usd(data.lifetime.costUsd)}
                sub={`${data.lifetime.calls} calls`}
              />
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <StatTile
                label="Charged but failed"
                value={usd(data.lifetime.chargedFailedUsd)}
                sub="Billed by the provider, returned nothing usable"
              />
              <StatTile
                label="Served from cache"
                value={String(data.lifetime.cachedCalls)}
                sub="Cost nothing new"
              />
              <StatTile
                label="DataForSEO credential"
                value={providerCredentialLabel(data.credentialStatus.status)}
                sub={
                  data.credentialStatus.checkedAt
                    ? `Checked ${new Date(data.credentialStatus.checkedAt).toLocaleString()}`
                    : "Never verified against the provider"
                }
              />
            </div>

            <div className="mt-8 rounded-lg border border-base-300 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">
                    DataForSEO account balance
                  </p>
                  <p className="mt-1 text-sm text-base-content/60">
                    Read live from the provider. This is the money left in the
                    account, which is not the same as the recorded spend above —
                    top-ups and calls made outside this app move one and not the
                    other.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => void balance.refetch()}
                  disabled={balance.isFetching}
                >
                  <RefreshCw
                    className={`size-4 ${balance.isFetching ? "animate-spin" : ""}`}
                  />
                  Refresh
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-5 md:grid-cols-3">
                <StatTile
                  label="Balance"
                  value={
                    balance.data?.available
                      ? usd(balance.data.balanceUsd)
                      : "Unavailable"
                  }
                />
                <StatTile
                  label="Provider spend today"
                  value={
                    balance.data?.available
                      ? usd(balance.data.spentTodayUsd)
                      : "—"
                  }
                />
                <StatTile
                  label="Recorded spend today"
                  value={usd(data.today.costUsd)}
                />
              </div>
            </div>

            <div className="mt-10 grid gap-8 md:grid-cols-2">
              <BreakdownTable
                title="Cost by feature (30 days)"
                rows={data.byOperation}
                emptyLabel="No provider calls recorded yet."
              />
              <BreakdownTable
                title="Cost by API family (30 days)"
                rows={data.byApiFamily}
                emptyLabel="No provider calls recorded yet."
              />
              <BreakdownTable
                title="Cost by project (30 days)"
                rows={data.byProject}
                emptyLabel="No project-attributed spend yet."
              />
              <BreakdownTable
                title="Cost by workspace (30 days)"
                rows={data.byOrganization}
                emptyLabel="No workspace-attributed spend yet."
              />
            </div>

            <div className="mt-10">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-base-content/40">
                Recent calls
              </h2>
              {data.recent.length === 0 ? (
                <p className="mt-2 text-sm text-base-content/50">
                  Nothing recorded yet. Rows appear here as soon as a feature
                  calls a data provider.
                </p>
              ) : (
                <div className="mt-2 overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Feature</th>
                        <th>API</th>
                        <th>Source</th>
                        <th>Outcome</th>
                        <th className="text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent.map((row) => (
                        <tr key={row.id}>
                          <td className="whitespace-nowrap font-mono text-xs">
                            {row.occurredAt}
                          </td>
                          <td className="text-xs">{row.operation ?? "—"}</td>
                          <td className="font-mono text-xs">
                            {row.apiFamily ?? "—"}
                          </td>
                          <td className="text-xs">{row.executionSource}</td>
                          <td className="text-xs">
                            <span
                              className={
                                row.outcome === "charged_failed"
                                  ? "badge badge-error badge-sm"
                                  : row.outcome === "failed"
                                    ? "badge badge-warning badge-sm"
                                    : "badge badge-ghost badge-sm"
                              }
                            >
                              {row.outcome}
                            </span>
                          </td>
                          <td className="text-right font-mono text-xs tabular-nums">
                            {usd(row.costUsd)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
