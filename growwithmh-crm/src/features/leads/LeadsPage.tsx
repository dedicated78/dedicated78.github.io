import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Archive, ArchiveRestore, Building2, Filter, Pencil, Plus, Search, UploadCloud, X } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorState, Input, LinkButton, PageHeader, PriorityBadge, Select, StatusBadge, TableSkeleton } from '@/components/ui';
import { useConfirm, useToast } from '@/components/overlays';
import { FollowUp } from '@/components/FollowUp';
import { useAuth } from '@/features/auth/AuthContext';
import { useProfiles } from '@/features/settings/api';
import { useToday } from '@/hooks/useToday';
import { useFilterState } from '@/hooks/useFilterState';
import { addDaysISO, followUpState } from '@/lib/format';
import { errorMessage } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { LeadFormDialog } from './LeadFormDialog';
import { useLeads, useUpdateLead } from './api';
import { CLOSED_LEAD_STATUSES, LEAD_STATUSES, PRIORITIES, type Lead } from '@/types';

const PAGE_SIZE = 50;
const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 } as const;

const SORTS = {
  followup: 'Follow-up (soonest)',
  newest: 'Newest first',
  oldest: 'Oldest first',
  priority: 'Priority',
  name: 'Business A–Z',
  status: 'Status',
} as const;
type SortKey = keyof typeof SORTS;

const FOLLOW_UP_FILTERS = { any: 'Any follow-up', overdue: 'Overdue', today: 'Due today', week: 'Next 7 days', none: 'None set' } as const;
const CREATED_FILTERS = { any: 'Any time', '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days' } as const;

export function LeadsPage() {
  const { role, isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const today = useToday();
  const { nameOf, withRole } = useProfiles();
  const leadsQ = useLeads();
  const update = useUpdateLead();
  const { state: fs, set, reset } = useFilterState({
    q: '',
    status: '',
    priority: '',
    assigned: '',
    location: '',
    niche: '',
    followup: 'any',
    created: 'any',
    archived: '',
    sort: isAdmin ? 'newest' : 'followup',
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [creating, setCreating] = useState(false);

  const { q, status, priority, assigned, location, niche } = fs;
  const followup = fs.followup as keyof typeof FOLLOW_UP_FILTERS;
  const created = fs.created as keyof typeof CREATED_FILTERS;
  const showArchived = fs.archived === '1';
  const sort = fs.sort as SortKey;

  const setParam = (k: keyof typeof fs, v: string) => {
    set(k, v);
    setLimit(PAGE_SIZE);
  };

  const all = leadsQ.data ?? [];
  const activeFilters = [status, priority, assigned, location, niche, followup !== 'any' ? followup : '', created !== 'any' ? created : '', showArchived ? '1' : '', q].filter(Boolean).length;

  const options = useMemo(() => {
    const uniq = (f: (l: Lead) => string | null) => [...new Set(all.map(f).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));
    return { locations: uniq((l) => l.location), niches: uniq((l) => l.niche) };
  }, [all]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const createdCutoff = created !== 'any' ? Date.now() - Number(created) * 86_400_000 : 0;
    const weekEnd = addDaysISO(today, 7);
    const list = all.filter((l) => {
      if (l.archived !== showArchived) return false;
      if (status && l.outreach_status !== status) return false;
      if (priority && l.priority !== priority) return false;
      if (assigned && (assigned === 'none' ? l.assigned_to : l.assigned_to !== assigned)) return false;
      if (location && l.location !== location) return false;
      if (niche && l.niche !== niche) return false;
      if (createdCutoff && Date.parse(l.created_at) < createdCutoff) return false;
      if (followup === 'overdue' && followUpState(l.follow_up_date, today) !== 'overdue') return false;
      if (followup === 'today' && l.follow_up_date !== today) return false;
      if (followup === 'week' && !(l.follow_up_date && l.follow_up_date >= today && l.follow_up_date <= weekEnd)) return false;
      if (followup === 'none' && l.follow_up_date) return false;
      if (term) {
        const hay = [l.business_name, l.contact_name, l.email, l.phone, l.location, l.niche].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    const cmp: Record<SortKey, (a: Lead, b: Lead) => number> = {
      followup: (a, b) => (a.follow_up_date ?? '9999').localeCompare(b.follow_up_date ?? '9999') || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
      newest: (a, b) => b.created_at.localeCompare(a.created_at),
      oldest: (a, b) => a.created_at.localeCompare(b.created_at),
      priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || b.created_at.localeCompare(a.created_at),
      name: (a, b) => a.business_name.localeCompare(b.business_name),
      status: (a, b) => LEAD_STATUSES.indexOf(a.outreach_status) - LEAD_STATUSES.indexOf(b.outreach_status),
    };
    return list.sort(cmp[sort] ?? cmp.newest);
  }, [all, q, status, priority, assigned, location, niche, followup, created, showArchived, sort, today]);

  const toggleArchive = async (lead: Lead) => {
    const archiving = !lead.archived;
    const ok = await confirm({
      title: archiving ? `Archive ${lead.business_name}?` : `Restore ${lead.business_name}?`,
      message: archiving ? 'It will be hidden from queues and from everyone but admins. History is kept.' : 'It will reappear in the lead lists and queues.',
      confirmLabel: archiving ? 'Archive' : 'Restore',
      danger: archiving,
    });
    if (!ok) return;
    try {
      await update.mutateAsync({ id: lead.id, patch: { archived: archiving } });
      toast.success(archiving ? 'Lead archived' : 'Lead restored');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const clearAll = () => {
    reset();
    setLimit(PAGE_SIZE);
  };

  const shown = rows.slice(0, limit);
  const subtitle = role === 'outreach' ? 'Leads assigned to you' : role === 'business_development' ? 'Leads handed to Business Development' : 'All leads';

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={leadsQ.isLoading ? subtitle : `${rows.length} ${showArchived ? 'archived ' : ''}${rows.length === 1 ? 'lead' : 'leads'} · ${subtitle.toLowerCase()}`}
        actions={
          isAdmin && (
            <>
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" aria-hidden /> New lead
              </Button>
              <LinkButton to="/leads/upload" variant="primary">
                <UploadCloud className="size-4" aria-hidden /> Upload research
              </LinkButton>
            </>
          )
        }
      />

      {/* ------------------------------------------------ search + filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mute" aria-hidden />
          <Input aria-label="Filter leads" type="search" placeholder="Filter by business, contact, phone, email…" className="pl-9" value={q} onChange={(e) => setParam('q', e.target.value)} />
        </div>
        <Select aria-label="Sort" className="w-auto!" value={sort} onChange={(e) => setParam('sort', e.target.value)}>
          {Object.entries(SORTS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </Select>
        <Button className="md:hidden" onClick={() => setFiltersOpen((o) => !o)} aria-expanded={filtersOpen}>
          <Filter className="size-4" aria-hidden /> Filters{activeFilters ? ` (${activeFilters})` : ''}
        </Button>
      </div>

      <div className={cn('mb-4 grid-cols-2 gap-2 md:grid md:grid-cols-4', filtersOpen ? 'grid' : 'hidden')}>
        <Select aria-label="Status" value={status} onChange={(e) => setParam('status', e.target.value)}>
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select aria-label="Priority" value={priority} onChange={(e) => setParam('priority', e.target.value)}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </Select>
        {isAdmin && (
          <Select aria-label="Assigned user" value={assigned} onChange={(e) => setParam('assigned', e.target.value)}>
            <option value="">Anyone</option>
            <option value="none">Unassigned</option>
            {withRole('outreach').map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </Select>
        )}
        <Select aria-label="Location" value={location} onChange={(e) => setParam('location', e.target.value)}>
          <option value="">All locations</option>
          {options.locations.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </Select>
        <Select aria-label="Niche" value={niche} onChange={(e) => setParam('niche', e.target.value)}>
          <option value="">All niches</option>
          {options.niches.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </Select>
        <Select aria-label="Follow-up" value={followup} onChange={(e) => setParam('followup', e.target.value)}>
          {Object.entries(FOLLOW_UP_FILTERS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </Select>
        <Select aria-label="Created" value={created} onChange={(e) => setParam('created', e.target.value)}>
          {Object.entries(CREATED_FILTERS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </Select>
        {isAdmin && (
          <label className="flex h-10 items-center gap-2 rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink-soft sm:h-[38px]">
            <input type="checkbox" className="size-4 accent-brand-600" checked={showArchived} onChange={(e) => setParam('archived', e.target.checked ? '1' : '')} />
            Archived
          </label>
        )}
      </div>

      {activeFilters > 0 && (
        <p className="mb-3 text-sm">
          <button type="button" onClick={clearAll} className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
            <X className="size-3.5" aria-hidden /> Clear all filters
          </button>
        </p>
      )}

      {/* --------------------------------------------------------- results */}
      <Card>
        {leadsQ.isLoading ? (
          <TableSkeleton />
        ) : leadsQ.error ? (
          <ErrorState error={leadsQ.error} onRetry={() => void leadsQ.refetch()} />
        ) : rows.length === 0 ? (
          activeFilters > 0 ? (
            <EmptyState icon={<Search className="size-5" aria-hidden />} title="No leads match these filters" action={<Button onClick={clearAll}>Clear filters</Button>} />
          ) : (
            <EmptyState
              icon={<Building2 className="size-5" aria-hidden />}
              title={isAdmin ? 'No leads yet' : role === 'outreach' ? 'Nothing assigned to you yet' : 'No qualified opportunities have been handed over yet'}
              action={isAdmin ? <LinkButton to="/leads/upload" variant="primary">Upload research</LinkButton> : undefined}
            >
              {isAdmin ? 'Upload a prospect research .md file to create the first lead.' : role === 'outreach' ? 'New leads appear here as soon as Mehedi assigns them to you.' : 'Leads show up here once outreach hands them to you.'}
            </EmptyState>
          )
        ) : (
          <>
            {/* desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-xs text-mute">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 font-medium">Business</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Location · Niche</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Priority</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                    {isAdmin && <th scope="col" className="px-3 py-2.5 font-medium">Owner</th>}
                    <th scope="col" className="px-3 py-2.5 font-medium">Follow-up</th>
                    <th scope="col" className="px-3 py-2.5 text-right font-medium"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shown.map((l) => (
                    <tr key={l.id} className="group cursor-pointer hover:bg-canvas" onClick={() => navigate(`/leads/${l.id}`)}>
                      <td className="max-w-[14rem] px-5 py-3">
                        <Link to={`/leads/${l.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-ink hover:text-brand-700">
                          {l.business_name}
                        </Link>
                        <span className="block truncate text-xs text-mute">{l.contact_name || l.phone || l.email || '—'}</span>
                      </td>
                      <td className="max-w-[10rem] truncate px-3 py-3 text-ink-soft">{[l.location, l.niche].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="px-3 py-3"><PriorityBadge priority={l.priority} /></td>
                      <td className="px-3 py-3"><StatusBadge status={l.outreach_status} /></td>
                      {isAdmin && <td className="px-3 py-3 text-ink-soft">{nameOf(l.assigned_to)}</td>}
                      <td className="px-3 py-3"><FollowUp date={l.follow_up_date} closed={CLOSED_LEAD_STATUSES.includes(l.outreach_status)} /></td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <LinkButton to={`/leads/${l.id}`} size="sm">Open</LinkButton>
                          {isAdmin && (
                            <>
                              <Button size="sm" variant="ghost" aria-label={`Edit ${l.business_name}`} onClick={() => setEditing(l)}>
                                <Pencil className="size-3.5" aria-hidden />
                              </Button>
                              <Button size="sm" variant="ghost" aria-label={`${l.archived ? 'Restore' : 'Archive'} ${l.business_name}`} onClick={() => void toggleArchive(l)}>
                                {l.archived ? <ArchiveRestore className="size-3.5" aria-hidden /> : <Archive className="size-3.5" aria-hidden />}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* mobile cards */}
            <ul className="divide-y divide-line md:hidden">
              {shown.map((l) => (
                <li key={l.id}>
                  <Link to={`/leads/${l.id}`} className="block px-4 py-3.5 active:bg-sunken">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{l.business_name}</p>
                        <p className="truncate text-xs text-mute">{[l.location, l.niche].filter(Boolean).join(' · ') || '—'}</p>
                      </div>
                      <PriorityBadge priority={l.priority} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <StatusBadge status={l.outreach_status} />
                      {l.follow_up_date && <FollowUp date={l.follow_up_date} closed={CLOSED_LEAD_STATUSES.includes(l.outreach_status)} className="text-xs" />}
                      {isAdmin && <Badge>{nameOf(l.assigned_to)}</Badge>}
                    </div>
                    {l.next_action && <p className="mt-1.5 truncate text-xs text-ink-soft">Next: {l.next_action}</p>}
                  </Link>
                  {isAdmin && (
                    <div className="flex gap-2 px-4 pb-3">
                      <Button size="sm" onClick={() => setEditing(l)}>
                        <Pencil className="size-3.5" aria-hidden /> Edit
                      </Button>
                      <Button size="sm" variant={l.archived ? 'secondary' : 'danger'} onClick={() => void toggleArchive(l)}>
                        {l.archived ? 'Restore' : 'Archive'}
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {rows.length > shown.length && (
              <div className="border-t border-line p-3 text-center">
                <Button onClick={() => setLimit((n) => n + PAGE_SIZE)}>Show more ({rows.length - shown.length} left)</Button>
              </div>
            )}
          </>
        )}
      </Card>

      {isAdmin && <LeadFormDialog open={creating || !!editing} onClose={() => (setCreating(false), setEditing(null))} lead={editing} onSaved={(id) => creating && navigate(`/leads/${id}`)} />}
    </div>
  );
}
