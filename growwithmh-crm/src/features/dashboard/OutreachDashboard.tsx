import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PartyPopper } from 'lucide-react';
import { Card, CardHeader, EmptyState, ErrorState, LinkButton, PageHeader, PriorityBadge, StatusBadge, TableSkeleton } from '@/components/ui';
import { FollowUp } from '@/components/FollowUp';
import { useAuth } from '@/features/auth/AuthContext';
import { useLeads } from '@/features/leads/api';
import { useToday } from '@/hooks/useToday';
import { followUpState } from '@/lib/format';
import { CLOSED_LEAD_STATUSES, type Lead } from '@/types';
import { StatCard, StatGrid } from './StatCard';

const RANK = { High: 0, Medium: 1, Low: 2 } as const;
const byPriority = (a: Lead, b: Lead) => RANK[a.priority] - RANK[b.priority] || a.created_at.localeCompare(b.created_at);

interface Group {
  key: string;
  title: string;
  tone: string;
  leads: Lead[];
}

function QueueRow({ lead }: { lead: Lead }) {
  return (
    <>
      {/* desktop */}
      <tr className="hidden hover:bg-canvas md:table-row">
        <td className="max-w-[15rem] px-5 py-3">
          <Link to={`/leads/${lead.id}`} className="block truncate font-medium text-ink hover:text-brand-700">
            {lead.business_name}
          </Link>
          <span className="block truncate text-xs text-mute">{lead.contact_name || lead.niche || '—'}</span>
        </td>
        <td className="max-w-[12rem] truncate px-3 py-3 text-ink-soft">{lead.location || '—'}</td>
        <td className="px-3 py-3"><PriorityBadge priority={lead.priority} /></td>
        <td className="px-3 py-3"><StatusBadge status={lead.outreach_status} /></td>
        <td className="max-w-[14rem] truncate px-3 py-3 text-ink-soft">{lead.next_action || '—'}</td>
        <td className="px-3 py-3"><FollowUp date={lead.follow_up_date} /></td>
        <td className="px-5 py-3 text-right"><LinkButton to={`/leads/${lead.id}`} size="sm" variant="primary">Open lead</LinkButton></td>
      </tr>
    </>
  );
}

function QueueCard({ lead }: { lead: Lead }) {
  return (
    <li>
      <Link to={`/leads/${lead.id}`} className="block px-4 py-3.5 active:bg-sunken">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{lead.business_name}</p>
            <p className="truncate text-xs text-mute">{lead.location || '—'}</p>
          </div>
          <PriorityBadge priority={lead.priority} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <StatusBadge status={lead.outreach_status} />
          {lead.follow_up_date && <FollowUp date={lead.follow_up_date} className="text-xs" />}
        </div>
        {lead.next_action && <p className="mt-1.5 truncate text-xs text-ink-soft">Next: {lead.next_action}</p>}
      </Link>
    </li>
  );
}

export function OutreachDashboard() {
  const { profile } = useAuth();
  const today = useToday();
  const leadsQ = useLeads();

  const { mine, groups, counts } = useMemo(() => {
    const mine = (leadsQ.data ?? []).filter((l) => !l.archived && l.assigned_to === profile?.id);
    const open = mine.filter((l) => !CLOSED_LEAD_STATUSES.includes(l.outreach_status));
    const state = (l: Lead) => followUpState(l.follow_up_date, today);

    const overdue = open.filter((l) => state(l) === 'overdue').sort((a, b) => a.follow_up_date!.localeCompare(b.follow_up_date!) || byPriority(a, b));
    const dueToday = open.filter((l) => state(l) === 'today').sort(byPriority);
    const taken = new Set([...overdue, ...dueToday].map((l) => l.id));
    const ready = open.filter((l) => l.outreach_status === 'Ready to Call' && !taken.has(l.id)).sort(byPriority);
    ready.forEach((l) => taken.add(l.id));
    const stalled = open.filter((l) => !taken.has(l.id) && !l.follow_up_date && ['Attempted', 'Connected', 'Interested', 'Follow-up'].includes(l.outreach_status)).sort(byPriority);

    const groups: Group[] = [
      { key: 'overdue', title: 'Overdue follow-ups', tone: 'text-danger', leads: overdue },
      { key: 'today', title: 'Follow-ups due today', tone: 'text-warn-ink', leads: dueToday },
      { key: 'ready', title: 'Ready to call', tone: 'text-brand-700', leads: ready },
      { key: 'stalled', title: 'No follow-up set', tone: 'text-mute', leads: stalled },
    ].filter((g) => g.leads.length);

    return {
      mine,
      groups,
      counts: {
        ready: mine.filter((l) => l.outreach_status === 'Ready to Call').length,
        today: dueToday.length,
        overdue: overdue.length,
        interested: mine.filter((l) => l.outreach_status === 'Interested').length,
      },
    };
  }, [leadsQ.data, profile?.id, today]);

  const total = groups.reduce((n, g) => n + g.leads.length, 0);
  const loading = leadsQ.isLoading;

  return (
    <div>
      <PageHeader title={`Hi ${profile?.full_name.split(' ')[0] ?? ''}`} subtitle="Here’s what to do now." />

      <StatGrid>
        <StatCard label="Ready to call" value={counts.ready} to="/leads?status=Ready%20to%20Call" loading={loading} />
        <StatCard label="Follow-ups today" value={counts.today} tone="warn" to="/leads?followup=today" loading={loading} />
        <StatCard label="Overdue follow-ups" value={counts.overdue} tone="danger" to="/leads?followup=overdue" loading={loading} />
        <StatCard label="Interested" value={counts.interested} tone="good" to="/leads?status=Interested" loading={loading} />
      </StatGrid>

      <Card>
        <CardHeader title="Today’s queue" subtitle={loading ? undefined : `${total} ${total === 1 ? 'lead' : 'leads'} to work, in order`} />
        {loading ? (
          <TableSkeleton />
        ) : leadsQ.error ? (
          <ErrorState error={leadsQ.error} onRetry={() => void leadsQ.refetch()} />
        ) : total === 0 ? (
          <EmptyState icon={<PartyPopper className="size-5" aria-hidden />} title="You’re caught up.">
            {mine.length ? 'No calls or follow-ups are due.' : 'No calls or follow-ups are due. New leads show up here when Mehedi assigns them.'}
          </EmptyState>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-xs text-mute">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 font-medium">Business</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Location</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Priority</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Next action</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Follow-up</th>
                    <th scope="col" className="px-5 py-2.5"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                {groups.map((g) => (
                  <tbody key={g.key} className="divide-y divide-line border-t border-line first:border-t-0">
                    <tr className="bg-canvas">
                      <th colSpan={7} scope="colgroup" className={`px-5 py-2 text-xs font-semibold uppercase tracking-wide ${g.tone}`}>
                        {g.title} · {g.leads.length}
                      </th>
                    </tr>
                    {g.leads.map((l) => (
                      <QueueRow key={l.id} lead={l} />
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
            <div className="md:hidden">
              {groups.map((g) => (
                <section key={g.key}>
                  <h3 className={`border-y border-line bg-canvas px-4 py-2 text-xs font-semibold uppercase tracking-wide first:border-t-0 ${g.tone}`}>
                    {g.title} · {g.leads.length}
                  </h3>
                  <ul className="divide-y divide-line">
                    {g.leads.map((l) => (
                      <QueueCard key={l.id} lead={l} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
