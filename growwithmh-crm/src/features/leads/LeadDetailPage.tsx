import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Archive, ArchiveRestore, ArrowLeft, Briefcase, CalendarClock, Globe, Handshake, MapPin, MessageSquarePlus, Pencil, Phone } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field, Input, LinkButton, Meta, PriorityBadge, Select, Skeleton, StatusBadge } from '@/components/ui';
import { Modal, useConfirm, useToast } from '@/components/overlays';
import { CopyButton } from '@/components/CopyButton';
import { FollowUp } from '@/components/FollowUp';
import { useAuth } from '@/features/auth/AuthContext';
import { useProfiles, useSettings } from '@/features/settings/api';
import { ActivityTimeline } from '@/features/activities/ActivityTimeline';
import { AddActivityDialog } from '@/features/activities/AddActivityDialog';
import { useActivities } from '@/features/activities/api';
import { OutreachBrief } from '@/features/reports/OutreachBrief';
import { useCurrentReport } from '@/features/reports/api';
import { useDeals } from '@/features/deals/api';
import { HandoffDialog } from './HandoffDialog';
import { LeadFormDialog } from './LeadFormDialog';
import { useLead, useUpdateLead } from './api';
import {normalizeUrl} from '@/lib/url';

import { errorMessage } from '@/lib/supabase';
import { blankToNull, mapsSearchUrl } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';
import { CLOSED_LEAD_STATUSES, HANDOFF_STATUSES, LEAD_STATUSES, OUTREACH_SETTABLE_STATUSES, type Lead, type LeadStatus } from '@/types';

// Pulls in the Markdown renderer + sanitiser, so only load it when someone opens the research.
const ResearchDrawer = lazy(() => import('@/features/reports/ResearchDrawer').then((m) => ({ default: m.ResearchDrawer })));

function PlanDialog({ open, onClose, lead }: { open: boolean; onClose: () => void; lead: Lead }) {
  const toast = useToast();
  const update = useUpdateLead();
  const [next, setNext] = useState(lead.next_action ?? '');
  const [date, setDate] = useState(lead.follow_up_date ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await update.mutateAsync({ id: lead.id, patch: { next_action: blankToNull(next), follow_up_date: date || null } });
      toast.success('Next step updated');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="sm" title="Next step" description={lead.business_name}>
      {open && (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Next action">{(id) => <Input id={id} autoFocus value={next} onChange={(e) => setNext(e.target.value)} placeholder="Call again, send report…" />}</Field>
          <Field label="Follow-up date" error={error}>
            {(id, d) => <Input id={id} aria-describedby={d} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" loading={update.isPending}>
              Save
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function LeadDetailPage() {
  const { id } = useParams();
  const { role, isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { settings } = useSettings();
  const { nameOf } = useProfiles();
  const leadQ = useLead(id);
  const reportQ = useCurrentReport(id);
  const activitiesQ = useActivities(id);
  const dealsQ = useDeals(role === 'admin' || role === 'business_development');
  const update = useUpdateLead();

  const [activityOpen, setActivityOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);

  const lead = leadQ.data;
  const back = (
    <Link to="/leads" className="inline-flex items-center gap-1 text-mute hover:text-ink">
      <ArrowLeft className="size-3.5" aria-hidden /> Leads
    </Link>
  );

  if (leadQ.isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading lead">
        <Skeleton className="h-36 w-full rounded-card" />
        <Skeleton className="h-72 w-full rounded-card" />
      </div>
    );
  }
  if (leadQ.error) return <ErrorState error={leadQ.error} onRetry={() => void leadQ.refetch()} />;
  if (!lead) {
    return (
      <Card>
        <EmptyState title="Lead not found" action={<LinkButton to="/leads">Back to leads</LinkButton>}>
          It may have been archived, or it isn’t assigned to you.
        </EmptyState>
      </Card>
    );
  }

  const closed = CLOSED_LEAD_STATUSES.includes(lead.outreach_status);
  const openDeal = dealsQ.data?.find((d) => d.lead_id === lead.id && d.stage !== 'Won' && d.stage !== 'Lost');
  const anyDeal = openDeal ?? dealsQ.data?.find((d) => d.lead_id === lead.id);
  const canHandOff = (role === 'outreach' || isAdmin) && !lead.archived && (HANDOFF_STATUSES as readonly string[]).includes(lead.outreach_status);
  const statuses = role === 'outreach' ? OUTREACH_SETTABLE_STATUSES : LEAD_STATUSES;
  const site = normalizeUrl(lead.website);
  const mapsUrl = mapsSearchUrl([lead.business_name, lead.location]);
  const canAct = !lead.archived;

  const changeStatus = async (status: LeadStatus) => {
    if (status === lead.outreach_status) return;
    try {
      await update.mutateAsync({ id: lead.id, patch: { outreach_status: status } });
      toast.success(`Status: ${status}`);
      if ((role === 'outreach' || isAdmin) && !lead.bd_assigned_to && (HANDOFF_STATUSES as readonly string[]).includes(status)) setHandoffOpen(true);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const toggleArchive = async () => {
    const archiving = !lead.archived;
    const ok = await confirm({
      title: archiving ? `Archive ${lead.business_name}?` : `Restore ${lead.business_name}?`,
      message: archiving ? 'It will disappear from queues and from everyone but admins. Its history is kept and you can restore it any time.' : 'It will reappear in the lead lists and queues.',
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

  return (
    <div className="space-y-5">
      <div className="text-xs">{back}</div>

      {lead.archived && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-card border border-line-strong bg-sunken px-4 py-2.5 text-sm text-ink-soft">
          <span>This lead is archived.</span>
          {isAdmin && (
            <Button size="sm" onClick={() => void toggleArchive()}>
              <ArchiveRestore className="size-3.5" aria-hidden /> Restore
            </Button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------- header */}
      <Card>
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="break-words text-xl font-semibold tracking-tight text-ink sm:text-2xl">{lead.business_name}</h1>
              <p className="mt-0.5 text-sm text-mute">{[lead.location, lead.niche].filter(Boolean).join(' · ') || 'No location or niche'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge priority={lead.priority} />
              <StatusBadge status={lead.outreach_status} />
              {isAdmin && (
                <>
                  <Button size="sm" onClick={() => setEditOpen(true)}>
                    <Pencil className="size-3.5" aria-hidden /> Edit
                  </Button>
                  {!lead.archived && (
                    <Button size="sm" variant="danger" onClick={() => void toggleArchive()}>
                      <Archive className="size-3.5" aria-hidden /> Archive
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 lg:grid-cols-4">
            <Meta label="Contact">{lead.contact_name}</Meta>
            <Meta label="Phone">
              {lead.phone && (
                <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className="font-medium text-brand-700 hover:underline">
                  {lead.phone}
                </a>
              )}
            </Meta>
            <Meta label="Email">
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="break-all font-medium text-brand-700 hover:underline">
                  {lead.email}
                </a>
              )}
            </Meta>
            <Meta label="Website">
              {site && (
                <a href={site} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-brand-700 hover:underline">
                  {lead.website}
                </a>
              )}
            </Meta>
          </dl>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <CopyButton value={lead.phone} label="Copy phone" />
            <CopyButton value={lead.email} label="Copy email" />
            {site ? (
              <a href={site} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink hover:bg-sunken">
                <Globe className="size-3.5" aria-hidden /> Open website
              </a>
            ) : (
              <Button size="sm" disabled>
                <Globe className="size-3.5" aria-hidden /> Open website
              </Button>
            )}
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink hover:bg-sunken">
              <MapPin className="size-3.5" aria-hidden /> Google Maps
            </a>
            {canAct && (
              <Button variant="primary" size="sm" className="sm:ml-auto" onClick={() => setActivityOpen(true)}>
                <MessageSquarePlus className="size-3.5" aria-hidden /> Add activity
              </Button>
            )}
          </div>
          {lead.phone && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-mute">
              <Phone className="size-3" aria-hidden /> Calls and messages happen outside the CRM — copy the number, then log the outcome here.
            </p>
          )}
        </div>
      </Card>

      {/* -------------------------------------------------------- body */}
      <div className="grid gap-5 lg:grid-cols-5 lg:grid-rows-[auto_1fr]">
        {/* right column, top: what to do next */}
        <div className="space-y-5 lg:col-span-2 lg:col-start-4 lg:row-start-1">
          {role === 'business_development' && lead.handoff_note && (
            <Card className="border-brand-200 bg-brand-50/60">
              <CardHeader title="Handoff note from outreach" subtitle={`${nameOf(lead.assigned_to)} · ${lead.outreach_status}`} />
              <p className="whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed text-ink sm:px-5">{lead.handoff_note}</p>
            </Card>
          )}

          <Card>
            <CardHeader
              title="Next step"
              action={
                canAct && (
                  <Button size="sm" variant="ghost" onClick={() => setPlanOpen(true)}>
                    <Pencil className="size-3.5" aria-hidden /> Edit
                  </Button>
                )
              }
            />
            <div className="space-y-4 p-4 sm:p-5">
              <dl className="grid grid-cols-2 gap-4">
                <Meta label="Next action">{lead.next_action}</Meta>
                <Meta label="Follow-up">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="size-3.5 text-mute" aria-hidden />
                    <FollowUp date={lead.follow_up_date} closed={closed} />
                  </span>
                </Meta>
              </dl>
              <Field label="Status">
                {(sid) => (
                  <Select id={sid} value={lead.outreach_status} disabled={lead.archived || update.isPending} onChange={(e) => void changeStatus(e.target.value as LeadStatus)}>
                    {statuses.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                    {!statuses.includes(lead.outreach_status) && <option>{lead.outreach_status}</option>}
                  </Select>
                )}
              </Field>
              <dl className="grid grid-cols-2 gap-4 border-t border-line pt-4 text-sm">
                <Meta label="Outreach">{nameOf(lead.assigned_to)}</Meta>
                <Meta label="Business development">{lead.bd_assigned_to ? nameOf(lead.bd_assigned_to) : 'Not handed off'}</Meta>
              </dl>
            </div>
          </Card>

          {(canHandOff || (role !== 'business_development' && lead.handoff_note)) && (
            <Card>
              <CardHeader title="Handoff to Business Development" />
              <div className="space-y-3 p-4 sm:p-5">
                {lead.handoff_note ? <p className="whitespace-pre-wrap rounded-lg bg-sunken px-3 py-2.5 text-sm leading-relaxed text-ink">{lead.handoff_note}</p> : <p className="text-sm text-mute">Interested or qualified? Leave a short note so the business developer can pick up without re-asking.</p>}
                {canHandOff && (
                  <Button variant={lead.bd_assigned_to ? 'secondary' : 'primary'} onClick={() => setHandoffOpen(true)}>
                    <Handshake className="size-4" aria-hidden /> {lead.bd_assigned_to ? 'Update handoff' : 'Hand off to Business Development'}
                  </Button>
                )}
              </div>
            </Card>
          )}

          {anyDeal && (
            <Card>
              <div className="flex items-center justify-between gap-3 p-4 sm:px-5">
                <div className="min-w-0">
                  <p className="text-xs text-mute">Deal</p>
                  <p className="mt-0.5">
                    <Badge tone={anyDeal.stage === 'Won' ? 'solidGreen' : anyDeal.stage === 'Lost' ? 'neutral' : 'teal'}>{anyDeal.stage}</Badge>
                  </p>
                </div>
                <LinkButton to={`/deals/${anyDeal.id}`} size="sm">
                  <Briefcase className="size-3.5" aria-hidden /> Open deal
                </LinkButton>
              </div>
            </Card>
          )}
        </div>

        {/* left column: the brief */}
        <div className="lg:col-span-3 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <OutreachBrief lead={lead} report={reportQ.report} loading={reportQ.isLoading} onViewFull={() => setResearchOpen(true)} />
        </div>

        {/* right column, bottom: history */}
        <div className="lg:col-span-2 lg:col-start-4 lg:row-start-2">
          <Card>
            <CardHeader
              title="Activity"
              action={
                canAct && (
                  <Button size="sm" onClick={() => setActivityOpen(true)}>
                    <MessageSquarePlus className="size-3.5" aria-hidden /> Log
                  </Button>
                )
              }
              subtitle={lead.updated_at ? `Last update ${formatDateTime(lead.updated_at, settings.timezone)}` : undefined}
            />
            <ActivityTimeline activities={activitiesQ.data} loading={activitiesQ.isLoading} nameOf={(uid) => (uid ? nameOf(uid) : 'System')} timezone={settings.timezone} />
          </Card>
        </div>
      </div>

      {canAct && (
        <Button variant="primary" className="fixed bottom-[4.75rem] right-4 z-30 h-12 px-5 shadow-pop lg:hidden" onClick={() => setActivityOpen(true)}>
          <MessageSquarePlus className="size-4" aria-hidden /> Log activity
        </Button>
      )}

      <AddActivityDialog
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        lead={lead}
        onSaved={(status) => {
          if ((role === 'outreach' || isAdmin) && !lead.bd_assigned_to && (HANDOFF_STATUSES as readonly string[]).includes(status) && status !== lead.outreach_status) setHandoffOpen(true);
        }}
      />
      <HandoffDialog open={handoffOpen} onClose={() => setHandoffOpen(false)} lead={lead} />
      {researchOpen && (
        <Suspense fallback={null}>
          <ResearchDrawer open onClose={() => setResearchOpen(false)} leadId={lead.id} businessName={lead.business_name} />
        </Suspense>
      )}
      <PlanDialog open={planOpen} onClose={() => setPlanOpen(false)} lead={lead} />
      {isAdmin && <LeadFormDialog open={editOpen} onClose={() => setEditOpen(false)} lead={lead} />}
    </div>
  );
}
