import { useMemo, useState } from 'react';
import { Inbox, Search } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, Input, PageHeader, Select, TableSkeleton } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { useLeads } from '@/features/leads/api';
import { useProfiles, useSettings } from '@/features/settings/api';
import { useToday } from '@/hooks/useToday';
import { useFilterState } from '@/hooks/useFilterState';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useDeals } from './api';
import { DealsTable } from './DealsTable';
import { DEAL_STAGES, OPEN_DEAL_STAGES, type Deal } from '@/types';

const VIEWS = { active: 'Active', won: 'Won', lost: 'Lost', all: 'All' } as const;
type View = keyof typeof VIEWS | 'proposals' | 'due';

export function DealsPage() {
  const { isAdmin } = useAuth();
  const today = useToday();
  const { settings } = useSettings();
  const { nameOf } = useProfiles();
  const dealsQ = useDeals();
  const leadsQ = useLeads();
  const { state: fs, set, reset } = useFilterState({ view: 'active', stage: '' });
  const [q, setQ] = useState('');
  const view = fs.view as View;
  const stage = fs.stage;
  const setParam = (k: 'view' | 'stage', v: string) => {
    set(k, v);
    if (k === 'view') set('stage', '');
  };

  const leads = useMemo(() => new Map((leadsQ.data ?? []).map((l) => [l.id, l])), [leadsQ.data]);
  const all = dealsQ.data ?? [];

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const open = (d: Deal) => OPEN_DEAL_STAGES.includes(d.stage);
    const list = all.filter((d) => {
      if (view === 'active' && !open(d)) return false;
      if (view === 'won' && d.stage !== 'Won') return false;
      if (view === 'lost' && d.stage !== 'Lost') return false;
      if (view === 'proposals' && !(d.stage === 'Proposal Needed' || d.stage === 'Proposal Sent')) return false;
      if (view === 'due' && !(open(d) && d.follow_up_date && d.follow_up_date <= today)) return false;
      if (stage && d.stage !== stage) return false;
      if (term) {
        const l = leads.get(d.lead_id);
        const hay = [l?.business_name, l?.contact_name, d.decision_maker, l?.email, l?.phone].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    const due = (d: Deal) => open(d) && !!d.follow_up_date && d.follow_up_date <= today;
    return list.sort((a, b) => Number(due(b)) - Number(due(a)) || (a.follow_up_date ?? '9999').localeCompare(b.follow_up_date ?? '9999') || b.updated_at.localeCompare(a.updated_at));
  }, [all, view, stage, q, leads, today]);

  const total = rows.reduce((n, d) => n + Number(d.estimated_value), 0);
  const counts = useMemo(
    () => ({
      active: all.filter((d) => OPEN_DEAL_STAGES.includes(d.stage)).length,
      won: all.filter((d) => d.stage === 'Won').length,
      lost: all.filter((d) => d.stage === 'Lost').length,
      all: all.length,
    }),
    [all],
  );

  const tabs: [View, string, number | undefined][] = [
    ...(Object.entries(VIEWS) as [keyof typeof VIEWS, string][]).map(([k, label]): [View, string, number | undefined] => [k, label, counts[k]]),
    ...(view === 'proposals' ? [['proposals', 'Proposals pending', rows.length] as [View, string, number]] : []),
    ...(view === 'due' ? [['due', 'Follow-ups due', rows.length] as [View, string, number]] : []),
  ];

  return (
    <div>
      <PageHeader title="Deals" subtitle={dealsQ.isLoading ? undefined : `${rows.length} ${rows.length === 1 ? 'deal' : 'deals'}${total > 0 ? ` · ${formatMoney(total, settings.default_currency)}` : ''}`} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Deal view" className="inline-flex max-w-full overflow-x-auto rounded-full border border-line-strong bg-sunken p-0.5 text-sm">
          {tabs.map(([key, label, n]) => (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={view === key}
              onClick={() => setParam('view', key)}
              className={cn('whitespace-nowrap rounded-full px-3.5 py-1 font-medium', view === key ? 'bg-surface text-ink shadow-sm' : 'text-mute hover:text-ink')}
            >
              {label}
              {n !== undefined && <span className="ml-1.5 text-xs text-mute">{n}</span>}
            </button>
          ))}
        </div>
        <div className="relative min-w-0 flex-1 basis-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mute" aria-hidden />
          <Input aria-label="Filter deals" type="search" placeholder="Filter by business or contact…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select aria-label="Stage" className="w-auto!" value={stage} onChange={(e) => setParam('stage', e.target.value)}>
          <option value="">All stages</option>
          {DEAL_STAGES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </div>

      <Card>
        {dealsQ.isLoading ? (
          <TableSkeleton />
        ) : dealsQ.error ? (
          <ErrorState error={dealsQ.error} onRetry={() => void dealsQ.refetch()} />
        ) : rows.length === 0 ? (
          all.length === 0 ? (
            <EmptyState icon={<Inbox className="size-5" aria-hidden />} title="No qualified opportunities have been handed over yet.">
              {isAdmin ? 'Deals are opened when outreach (or you) hands a lead to Business Development.' : 'Deals appear here as soon as outreach hands a lead to you.'}
            </EmptyState>
          ) : (
            <EmptyState icon={<Search className="size-5" aria-hidden />} title="No deals match" action={<Button onClick={() => (reset(), setQ(''))}>Clear filters</Button>} />
          )
        ) : (
          <DealsTable deals={rows} leads={leads} currency={settings.default_currency} nameOf={nameOf} showOwner={isAdmin} />
        )}
      </Card>
    </div>
  );
}
