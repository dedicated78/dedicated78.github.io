import { lazy, Suspense, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpenText, MessageSquarePlus, PartyPopper, RotateCcw, ThumbsDown, Trophy, UserRoundCheck } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field, Input, LinkButton, Meta, PriorityBadge, Select, Skeleton, StageBadge, Textarea } from '@/components/ui';
import { Modal, useConfirm, useToast } from '@/components/overlays';
import { FollowUp } from '@/components/FollowUp';
import { useLead } from '@/features/leads/api';
import { useActivities } from '@/features/activities/api';
import { ActivityTimeline } from '@/features/activities/ActivityTimeline';
import { AddActivityDialog } from '@/features/activities/AddActivityDialog';
import { useCurrentReport } from '@/features/reports/api';
import { useClients } from '@/features/clients/api';
import { useProfiles, useSettings } from '@/features/settings/api';
import { formatDate, formatMoney, isoToZonedInput, zonedInputToISO } from '@/lib/format';
import { errorMessage } from '@/lib/supabase';
import { blankToNull, splitCommas } from '@/lib/utils';
import {normalizeUrl} from '@/lib/url';

import { useSyncedForm } from '@/hooks/useSyncedForm';
import { useDeal, useUpdateDeal } from './api';
import { ConvertDialog } from './ConvertDialog';
import { StageProgress } from './StageProgress';
import { BILLING_TYPES, PROPOSAL_STATUSES, type BillingType, type Deal, type DealStage, type ProposalStatus } from '@/types';

// Pulls in the Markdown renderer + sanitiser, so only load it when someone opens the research.
const ResearchDrawer = lazy(() => import('@/features/reports/ResearchDrawer').then((m) => ({ default: m.ResearchDrawer })));

interface FormState {
  discovery_notes: string;
  pain_points: string;
  services: string;
  estimated_value: string;
  billing_type: BillingType | '';
  decision_maker: string;
  objections: string;
  proposal_status: ProposalStatus;
  proposal_notes: string;
  next_action: string;
  follow_up_date: string;
  meeting_date: string;
}

const fromDeal = (d: Deal, tz: string): FormState => ({
  discovery_notes: d.discovery_notes ?? '',
  pain_points: d.pain_points ?? '',
  services: d.services_discussed.join(', '),
  estimated_value: d.estimated_value ? String(d.estimated_value) : '',
  billing_type: d.billing_type ?? '',
  decision_maker: d.decision_maker ?? '',
  objections: d.objections ?? '',
  proposal_status: d.proposal_status,
  proposal_notes: d.proposal_notes ?? '',
  next_action: d.next_action ?? '',
  follow_up_date: d.follow_up_date ?? '',
  meeting_date: isoToZonedInput(d.meeting_date, tz),
});

function LostDialog({ open, onClose, onConfirm, busy }: { open: boolean; onClose: () => void; onConfirm: (reason: string) => void; busy: boolean }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return setError('A short reason helps us learn from lost deals.');
    onConfirm(reason.trim());
  };
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Mark deal as lost">
      {open && (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Why was it lost?" required error={error}>
            {(id, d) => <Textarea id={id} aria-describedby={d} aria-invalid={!!error} autoFocus rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Went with a cheaper provider, no budget, timing…" />}
          </Field>
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="danger" loading={busy}>
              Mark as lost
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function DealDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { settings } = useSettings();
  const { nameOf } = useProfiles();
  const dealQ = useDeal(id);
  const deal = dealQ.data;
  const leadQ = useLead(deal?.lead_id);
  const reportQ = useCurrentReport(deal?.lead_id);
  const activitiesQ = useActivities(deal?.lead_id);
  const clientsQ = useClients();
  const update = useUpdateDeal();

  const [activityOpen, setActivityOpen] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [lostOpen, setLostOpen] = useState(false);

  const back = (
    <Link to="/deals" className="inline-flex items-center gap-1 text-mute hover:text-ink">
      <ArrowLeft className="size-3.5" aria-hidden /> Deals
    </Link>
  );

  if (dealQ.isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading deal">
        <Skeleton className="h-32 w-full rounded-card" />
        <Skeleton className="h-80 w-full rounded-card" />
      </div>
    );
  }
  if (dealQ.error) return <ErrorState error={dealQ.error} onRetry={() => void dealQ.refetch()} />;
  if (!deal) {
    return (
      <Card>
        <EmptyState title="Deal not found" action={<LinkButton to="/deals">Back to deals</LinkButton>}>
          It may belong to another business developer.
        </EmptyState>
      </Card>
    );
  }

  const lead = leadQ.data;
  const report = reportQ.report;
  const client = clientsQ.data?.find((c) => c.deal_id === deal.id);
  const isWon = deal.stage === 'Won';
  const isLost = deal.stage === 'Lost';
  const closed = isWon || isLost;

  const saveStage = async (stage: DealStage, extra: Partial<Deal> = {}) => {
    try {
      await update.mutateAsync({ id: deal.id, patch: { stage, ...extra } });
      toast.success(`Stage: ${stage}`);
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    }
  };

  const changeStage = async (stage: DealStage) => {
    if (stage === deal.stage) return;
    if (stage === 'Won') return markWon();
    if (stage === 'Lost') return setLostOpen(true);
    await saveStage(stage);
  };

  const markWon = async () => {
    const ok = await confirm({
      title: 'Mark this deal as won?',
      message: `The lead will be marked Won and you can convert ${lead?.business_name ?? 'it'} into a client right away.`,
      confirmLabel: 'Mark as won',
    });
    if (ok && (await saveStage('Won'))) setConvertOpen(true);
  };

  const reopen = async () => {
    const ok = await confirm({ title: 'Reopen this deal?', message: `It goes back to ${isWon ? 'Negotiation' : 'Discovery'}.`, confirmLabel: 'Reopen' });
    if (ok) await saveStage(isWon ? 'Negotiation' : 'Discovery');
  };

  return (
    <div className="space-y-5">
      <div className="text-xs">{back}</div>

      {/* ----------------------------------------------------- header */}
      <Card>
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="break-words text-xl font-semibold tracking-tight text-ink sm:text-2xl">{lead?.business_name ?? 'Deal'}</h1>
              <p className="mt-0.5 text-sm text-mute">
                {[lead?.location, lead?.niche].filter(Boolean).join(' · ')}
                {lead && ' · '}
                Owner: {nameOf(deal.assigned_to)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {lead && <PriorityBadge priority={lead.priority} />}
              <StageBadge stage={deal.stage} />
              {deal.estimated_value > 0 && <Badge tone="teal">{formatMoney(deal.estimated_value, settings.default_currency)}{deal.billing_type === 'Monthly' ? '/mo' : ''}</Badge>}
            </div>
          </div>

          <div className="mt-5">
            <StageProgress stage={deal.stage} disabled={update.isPending} onChange={(s) => void changeStage(s)} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            {!closed && (
              <>
                <Button variant="positive" size="sm" onClick={() => void markWon()}>
                  <Trophy className="size-3.5" aria-hidden /> Mark won
                </Button>
                <Button variant="danger" size="sm" onClick={() => setLostOpen(true)}>
                  <ThumbsDown className="size-3.5" aria-hidden /> Mark lost
                </Button>
              </>
            )}
            {closed && !client && (
              <Button size="sm" onClick={() => void reopen()}>
                <RotateCcw className="size-3.5" aria-hidden /> Reopen
              </Button>
            )}
            {lead && (
              <LinkButton to={`/leads/${lead.id}`} size="sm" variant="ghost" className="sm:ml-auto">
                <UserRoundCheck className="size-3.5" aria-hidden /> Open lead
              </LinkButton>
            )}
          </div>
        </div>
      </Card>

      {isWon && (
        <Card className="border-pos/30 bg-pos-soft/60">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
            <div className="flex items-center gap-3">
              <PartyPopper className="size-5 text-pos-ink" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-ink">Deal won{deal.won_at ? ` · ${formatDate(deal.won_at)}` : ''}</p>
                <p className="text-sm text-ink-soft">{client ? 'This deal has been converted to a client.' : 'Convert it to a client so onboarding can start.'}</p>
              </div>
            </div>
            {client ? (
              <LinkButton to={`/clients/${client.id}`} variant="primary" size="sm">
                Open client
              </LinkButton>
            ) : (
              <Button variant="positive" onClick={() => setConvertOpen(true)}>
                Convert to client
              </Button>
            )}
          </div>
        </Card>
      )}

      {isLost && (
        <Card className="bg-sunken">
          <p className="px-4 py-3 text-sm text-ink-soft sm:px-5">
            <span className="font-semibold text-ink">Lost</span> — {deal.lost_reason || 'no reason recorded'}
          </p>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-5">
        {/* --------------------------------------- business development */}
        <div className="lg:col-span-3">
          <BdForm key={deal.id} deal={deal} tz={settings.timezone} onLog={() => setActivityOpen(true)} />
        </div>

        {/* ------------------------------------------- prospect context */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader title="Prospect context" />
            <div className="space-y-4 p-4 sm:p-5">
              {lead?.handoff_note && (
                <div className="rounded-xl border border-brand-200 bg-brand-50 p-3.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">Handoff note · {nameOf(lead.assigned_to)}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">{lead.handoff_note}</p>
                </div>
              )}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Meta label="Decision maker">{deal.decision_maker || lead?.contact_name}</Meta>
                <Meta label="Phone">{lead?.phone && <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className="font-medium text-brand-700 hover:underline">{lead.phone}</a>}</Meta>
                <Meta label="Email" className="col-span-2">{lead?.email && <a href={`mailto:${lead.email}`} className="break-words font-medium text-brand-700 hover:underline">{lead.email}</a>}</Meta>
                <Meta label="Website" className="col-span-2">
                  {lead?.website && normalizeUrl(lead.website) && (
                    <a href={normalizeUrl(lead.website)} target="_blank" rel="noopener noreferrer" className="break-words font-medium text-brand-700 hover:underline">
                      {lead.website}
                    </a>
                  )}
                </Meta>
              </dl>
              <dl className="space-y-3 border-t border-line pt-4">
                <Meta label="Original opportunity">
                  <span className="whitespace-pre-wrap">{report?.main_opportunity ?? lead?.main_opportunity}</span>
                </Meta>
                <Meta label="Recommended service">{report?.recommended_service ?? lead?.recommended_service}</Meta>
                {report?.why_this_prospect && (
                  <Meta label="Why they were contacted">
                    <span className="whitespace-pre-wrap">{report.why_this_prospect}</span>
                  </Meta>
                )}
              </dl>
              {lead && (
                <Button onClick={() => setResearchOpen(true)} disabled={!report && !reportQ.isLoading}>
                  <BookOpenText className="size-4" aria-hidden /> View research brief
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Outreach history"
              action={
                <Button size="sm" onClick={() => setActivityOpen(true)}>
                  <MessageSquarePlus className="size-3.5" aria-hidden /> Log
                </Button>
              }
            />
            <ActivityTimeline activities={activitiesQ.data} loading={activitiesQ.isLoading} nameOf={(uid) => (uid ? nameOf(uid) : 'System')} timezone={settings.timezone} />
          </Card>
        </div>
      </div>

      {lead && <AddActivityDialog open={activityOpen} onClose={() => setActivityOpen(false)} lead={lead} deal={deal} />}
      {lead && researchOpen && (
        <Suspense fallback={null}>
          <ResearchDrawer open onClose={() => setResearchOpen(false)} leadId={lead.id} businessName={lead.business_name} />
        </Suspense>
      )}
      <ConvertDialog open={convertOpen} onClose={() => setConvertOpen(false)} deal={deal} lead={lead} onConverted={(cid) => navigate(`/clients/${cid}`)} />
      <LostDialog
        open={lostOpen}
        onClose={() => setLostOpen(false)}
        busy={update.isPending}
        onConfirm={async (reason) => {
          if (await saveStage('Lost', { lost_reason: reason })) setLostOpen(false);
        }}
      />
    </div>
  );
}

function BdForm({ deal, tz, onLog }: { deal: Deal; tz: string; onLog: () => void }) {
  const toast = useToast();
  const update = useUpdateDeal();
  const baseline = useMemo(() => fromDeal(deal, tz), [deal, tz]);
  const { form: f, setForm: setF, dirty, reset } = useSyncedForm<FormState>(baseline);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(k: K) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value as FormState[K] }));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const value = f.estimated_value.trim() === '' ? 0 : Number(f.estimated_value);
    if (!Number.isFinite(value) || value < 0) return setError('Estimated value must be a number, 0 or more.');
    setError(null);
    try {
      await update.mutateAsync({
        id: deal.id,
        patch: {
          discovery_notes: blankToNull(f.discovery_notes),
          pain_points: blankToNull(f.pain_points),
          services_discussed: splitCommas(f.services),
          estimated_value: value,
          billing_type: f.billing_type || null,
          decision_maker: blankToNull(f.decision_maker),
          objections: blankToNull(f.objections),
          proposal_status: f.proposal_status,
          proposal_notes: blankToNull(f.proposal_notes),
          next_action: blankToNull(f.next_action),
          follow_up_date: f.follow_up_date || null,
          meeting_date: f.meeting_date ? zonedInputToISO(f.meeting_date, tz) : null,
        },
      });
      toast.success('Deal saved');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <form onSubmit={save} noValidate>
      <Card>
        <CardHeader
          title="Business development"
          subtitle="Discovery, requirements and proposal"
          action={
            <Button size="sm" onClick={onLog}>
              <MessageSquarePlus className="size-3.5" aria-hidden /> Log activity
            </Button>
          }
        />
        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Next action">{(id) => <Input id={id} value={f.next_action} onChange={set('next_action')} placeholder="Send proposal, confirm meeting…" />}</Field>
            <Field label="Follow-up date">
              {(id) => (
                <div className="flex items-center gap-2">
                  <Input id={id} type="date" value={f.follow_up_date} onChange={set('follow_up_date')} />
                  {deal.follow_up_date && f.follow_up_date === deal.follow_up_date && <FollowUp date={deal.follow_up_date} closed={deal.stage === 'Won' || deal.stage === 'Lost'} className="text-xs" />}
                </div>
              )}
            </Field>
            <Field label="Meeting">{(id) => <Input id={id} type="datetime-local" value={f.meeting_date} onChange={set('meeting_date')} />}</Field>
            <Field label="Decision maker">{(id) => <Input id={id} value={f.decision_maker} onChange={set('decision_maker')} />}</Field>
          </div>

          <Field label="Discovery notes">{(id) => <Textarea id={id} rows={4} value={f.discovery_notes} onChange={set('discovery_notes')} placeholder="What they do today, goals, budget, timeline…" />}</Field>
          <Field label="Pain points">{(id) => <Textarea id={id} rows={3} value={f.pain_points} onChange={set('pain_points')} />}</Field>
          <Field label="Objections">{(id) => <Textarea id={id} rows={2} value={f.objections} onChange={set('objections')} />}</Field>

          <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
            <Field label="Services discussed" hint="Comma-separated" className="sm:col-span-2">
              {(id, d) => <Input id={id} aria-describedby={d} value={f.services} onChange={set('services')} placeholder="Local SEO, GBP optimisation" />}
            </Field>
            <Field label="Estimated value">{(id) => <Input id={id} type="number" min="0" step="0.01" inputMode="decimal" value={f.estimated_value} onChange={set('estimated_value')} />}</Field>
            <Field label="Billing">
              {(id) => (
                <Select id={id} value={f.billing_type} onChange={set('billing_type')}>
                  <option value="">Not set</option>
                  {BILLING_TYPES.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Proposal status">
              {(id) => (
                <Select id={id} value={f.proposal_status} onChange={set('proposal_status')}>
                  {PROPOSAL_STATUSES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Proposal notes" className="sm:col-span-2">{(id) => <Textarea id={id} rows={3} value={f.proposal_notes} onChange={set('proposal_notes')} />}</Field>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
        <div className="sticky bottom-16 flex items-center justify-between gap-3 rounded-b-card border-t border-line bg-surface px-4 py-3 sm:px-5 lg:bottom-0">
          <p className="text-xs text-mute">{dirty ? 'You have unsaved changes' : 'All changes saved'}</p>
          <div className="flex gap-2">
            {dirty && (
              <Button onClick={reset} disabled={update.isPending}>
                Discard
              </Button>
            )}
            <Button type="submit" variant="primary" disabled={!dirty} loading={update.isPending}>
              Save changes
            </Button>
          </div>
        </div>
      </Card>
    </form>
  );
}
