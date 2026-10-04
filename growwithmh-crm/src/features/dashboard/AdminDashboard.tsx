import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Badge, Card, CardHeader, EmptyState, PageHeader, Skeleton } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { useLeads } from '@/features/leads/api';
import { useDeals } from '@/features/deals/api';
import { useClients } from '@/features/clients/api';
import { useRecentActivities } from '@/features/activities/api';
import { useProfiles, useSettings } from '@/features/settings/api';
import { useToday } from '@/hooks/useToday';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { OPEN_DEAL_STAGES } from '@/types';
import { buildNotices } from './attention';
import { StatCard, StatGrid } from './StatCard';

const DOT = { red: 'bg-danger', amber: 'bg-amber-500', teal: 'bg-brand-500' } as const;
const ONBOARDING = ['New Client', 'Payment Pending', 'Access Pending', 'Setup'];

export function AdminDashboard() {
  const { profile } = useAuth();
  const today = useToday();
  const { settings } = useSettings();
  const { nameOf } = useProfiles();
  const leadsQ = useLeads();
  const dealsQ = useDeals();
  const clientsQ = useClients();
  const recentQ = useRecentActivities(10);

  const leads = leadsQ.data;
  const stats = useMemo(() => {
    const live = (leads ?? []).filter((l) => !l.archived);
    const deals = dealsQ.data ?? [];
    const clients = clientsQ.data ?? [];
    return {
      ready: live.filter((l) => l.outreach_status === 'Ready to Call').length,
      interested: live.filter((l) => l.outreach_status === 'Interested').length,
      meetings: live.filter((l) => l.outreach_status === 'Meeting Booked').length,
      active: deals.filter((d) => OPEN_DEAL_STAGES.includes(d.stage)).length,
      won: deals.filter((d) => d.stage === 'Won').length,
      onboarding: clients.filter((c) => ONBOARDING.includes(c.onboarding_status)).length,
      activeClients: clients.filter((c) => c.onboarding_status === 'Active').length,
    };
  }, [leads, dealsQ.data, clientsQ.data]);

  const notices = useMemo(
    () => (profile ? buildNotices({ role: 'admin', userId: profile.id, leads: leads ?? [], deals: dealsQ.data ?? [], clients: clientsQ.data ?? [], today }) : []),
    [profile, leads, dealsQ.data, clientsQ.data, today],
  );

  const loading = leadsQ.isLoading || dealsQ.isLoading || clientsQ.isLoading;
  const leadName = (id: string) => leads?.find((l) => l.id === id)?.business_name ?? 'Lead';

  return (
    <div>
      <PageHeader title={`Hi ${profile?.full_name.split(' ')[0] ?? ''}`} subtitle={`${settings.company_name} at a glance`} />

      <StatGrid cols={7}>
        <StatCard label="Ready for outreach" value={stats.ready} to="/leads?status=Ready%20to%20Call" loading={loading} />
        <StatCard label="Interested leads" value={stats.interested} to="/leads?status=Interested" loading={loading} />
        <StatCard label="Meetings booked" value={stats.meetings} to="/leads?status=Meeting%20Booked" loading={loading} />
        <StatCard label="Active deals" value={stats.active} to="/deals" loading={loading} />
        <StatCard label="Won deals" value={stats.won} tone="good" to="/deals?view=won" loading={loading} />
        <StatCard label="Clients onboarding" value={stats.onboarding} tone="warn" to="/clients?onboarding=pending" loading={loading} />
        <StatCard label="Active clients" value={stats.activeClients} tone="good" to="/clients?onboarding=Active" loading={loading} />
      </StatGrid>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Needs attention" subtitle={loading ? undefined : notices.length ? `${notices.length} ${notices.length === 1 ? 'item' : 'items'}` : undefined} />
          {loading ? (
            <div className="space-y-3 p-5" role="status" aria-label="Loading">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : notices.length === 0 ? (
            <EmptyState icon={<CheckCircle2 className="size-5" aria-hidden />} title="Nothing needs attention">
              No overdue follow-ups, unconverted wins or clients waiting on access.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {notices.slice(0, 10).map((n) => (
                <li key={n.id}>
                  <Link to={n.to} className="flex gap-3 px-4 py-3 hover:bg-canvas sm:px-5">
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', DOT[n.tone])} aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">{n.title}</span>
                      <span className="block text-xs text-mute">{n.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
              {notices.length > 10 && <li className="px-5 py-2.5 text-xs text-mute">+ {notices.length - 10} more (see the bell in the top bar)</li>}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent activity" />
          {recentQ.isLoading ? (
            <div className="space-y-3 p-5" role="status" aria-label="Loading">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !recentQ.data?.length ? (
            <EmptyState title="No activity yet">Calls and notes logged by the team show up here.</EmptyState>
          ) : (
            <ul className="divide-y divide-line">
              {recentQ.data.map((a) => (
                <li key={a.id}>
                  <Link to={`/leads/${a.lead_id}`} className="block px-4 py-3 hover:bg-canvas sm:px-5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-medium text-ink">{leadName(a.lead_id)}</span>
                      <Badge>{a.activity_type}</Badge>
                      {a.outcome && <Badge tone="teal">{a.outcome}</Badge>}
                    </div>
                    {a.notes && <p className="mt-0.5 line-clamp-1 text-sm text-ink-soft">{a.notes}</p>}
                    <p className="mt-0.5 text-xs text-mute">
                      {nameOf(a.created_by)} · {formatDateTime(a.created_at, settings.timezone)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
