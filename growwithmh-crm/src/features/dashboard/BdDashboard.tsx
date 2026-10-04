import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import { Card, CardHeader, EmptyState, ErrorState, LinkButton, PageHeader, TableSkeleton } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { useLeads } from '@/features/leads/api';
import { useDeals } from '@/features/deals/api';
import { useClients } from '@/features/clients/api';
import { DealsTable } from '@/features/deals/DealsTable';
import { useProfiles, useSettings } from '@/features/settings/api';
import { useToday } from '@/hooks/useToday';
import { formatMoney } from '@/lib/format';
import { OPEN_DEAL_STAGES, type Deal } from '@/types';
import { StatCard, StatGrid } from './StatCard';

export function BdDashboard() {
  const { profile } = useAuth();
  const today = useToday();
  const { settings } = useSettings();
  const { nameOf } = useProfiles();
  const dealsQ = useDeals();
  const leadsQ = useLeads();
  const clientsQ = useClients();

  const data = useMemo(() => {
    const mine = (dealsQ.data ?? []).filter((d) => d.assigned_to === profile?.id);
    const open = mine.filter((d) => OPEN_DEAL_STAGES.includes(d.stage));
    const leads = new Map((leadsQ.data ?? []).map((l) => [l.id, l]));
    const converted = new Set((clientsQ.data ?? []).map((c) => c.deal_id));
    const due = (d: Deal) => !!d.follow_up_date && d.follow_up_date <= today;
    const sorted = [...open].sort((a, b) => Number(due(b)) - Number(due(a)) || (a.follow_up_date ?? '9999').localeCompare(b.follow_up_date ?? '9999') || b.updated_at.localeCompare(a.updated_at));
    return {
      leads,
      open: sorted,
      fresh: open.filter((d) => d.stage === 'New Qualified Lead'),
      meetings: open.filter((d) => d.stage === 'Meeting Booked'),
      proposals: open.filter((d) => d.stage === 'Proposal Needed' || d.stage === 'Proposal Sent'),
      dueCount: open.filter(due).length,
      toConvert: mine.filter((d) => d.stage === 'Won' && !converted.has(d.id)),
      pipeline: open.reduce((n, d) => n + Number(d.estimated_value), 0),
    };
  }, [dealsQ.data, leadsQ.data, clientsQ.data, profile?.id, today]);

  const loading = dealsQ.isLoading || leadsQ.isLoading;

  return (
    <div>
      <PageHeader title={`Hi ${profile?.full_name.split(' ')[0] ?? ''}`} subtitle={loading ? 'Your deals' : `${data.open.length} active ${data.open.length === 1 ? 'deal' : 'deals'} · ${formatMoney(data.pipeline, settings.default_currency)} open pipeline`} />

      <StatGrid>
        <StatCard label="New qualified leads" value={data.fresh.length} tone="good" to="/deals?stage=New%20Qualified%20Lead" loading={loading} />
        <StatCard label="Meetings" value={data.meetings.length} to="/deals?stage=Meeting%20Booked" loading={loading} />
        <StatCard label="Proposals pending" value={data.proposals.length} tone="warn" to="/deals?view=proposals" loading={loading} />
        <StatCard label="Follow-ups due" value={data.dueCount} tone="danger" to="/deals?view=due" loading={loading} />
      </StatGrid>

      {data.toConvert.length > 0 && (
        <Card className="mb-5 border-pos/30 bg-pos-soft/50">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <p className="text-sm text-ink">
              <span className="font-semibold">{data.toConvert.length === 1 ? '1 won deal is' : `${data.toConvert.length} won deals are`} waiting to be converted to a client:</span>{' '}
              {data.toConvert.map((d, i) => (
                <span key={d.id}>
                  {i > 0 && ', '}
                  <Link to={`/deals/${d.id}`} className="font-medium text-brand-700 underline">
                    {data.leads.get(d.lead_id)?.business_name ?? 'Deal'}
                  </Link>
                </span>
              ))}
            </p>
          </div>
        </Card>
      )}

      {data.fresh.length > 0 && (
        <Card className="mb-5">
          <CardHeader title="New from outreach" subtitle="Read the handoff note, then reach out" />
          <ul className="divide-y divide-line">
            {data.fresh.slice(0, 5).map((d) => {
              const l = data.leads.get(d.lead_id);
              return (
                <li key={d.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0 flex-1 basis-64">
                    <p className="font-medium text-ink">{l?.business_name ?? 'Deal'}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">{l?.handoff_note || 'No handoff note was left.'}</p>
                    <p className="mt-1 text-xs text-mute">From {nameOf(l?.assigned_to ?? null)}</p>
                  </div>
                  <LinkButton to={`/deals/${d.id}`} size="sm" variant="primary">
                    Open deal
                  </LinkButton>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card>
        <CardHeader title="Active deals" action={<LinkButton to="/deals" size="sm" variant="ghost">All deals</LinkButton>} />
        {loading ? (
          <TableSkeleton />
        ) : dealsQ.error ? (
          <ErrorState error={dealsQ.error} onRetry={() => void dealsQ.refetch()} />
        ) : data.open.length === 0 ? (
          <EmptyState icon={<Inbox className="size-5" aria-hidden />} title="No qualified opportunities have been handed over yet.">
            Deals appear here as soon as outreach hands a lead to you.
          </EmptyState>
        ) : (
          <DealsTable deals={data.open} leads={data.leads} currency={settings.default_currency} />
        )}
      </Card>
    </div>
  );
}
