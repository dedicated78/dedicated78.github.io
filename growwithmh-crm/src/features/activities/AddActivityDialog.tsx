import { useState, type FormEvent } from 'react';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';
import { Modal, useToast } from '@/components/overlays';
import { useAuth } from '@/features/auth/AuthContext';
import { useToday } from '@/hooks/useToday';
import { addDaysISO } from '@/lib/format';
import { cn } from '@/lib/utils';
import { errorMessage } from '@/lib/supabase';
import { useLogActivity } from './api';
import { OUTCOMES_BY_TYPE, suggestFollowUp, suggestNextAction, suggestStatus } from './outcomes';
import { ACTIVITY_TYPES, LEAD_STATUSES, OUTREACH_SETTABLE_STATUSES, type ActivityType, type Deal, type Lead, type LeadStatus } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  lead: Lead;
  /** When given, the plan (next action / follow-up) belongs to this deal and lead status is left alone. */
  deal?: Deal | null;
  /** Called after a successful save with the lead status that was applied. */
  onSaved?: (status: LeadStatus) => void;
}

export function AddActivityDialog(props: Props) {
  // remount on open so every log starts from the lead's current state
  return <Modal open={props.open} onClose={props.onClose} title="Log activity" description={props.lead.business_name}>{props.open && <Form {...props} />}</Modal>;
}

function Form({ onClose, lead, deal, onSaved }: Props) {
  const toast = useToast();
  const { role } = useAuth();
  const today = useToday();
  const log = useLogActivity();

  const dealMode = !!deal;
  const currentNext = (dealMode ? deal?.next_action : lead.next_action) ?? '';
  const currentFollow = (dealMode ? deal?.follow_up_date : lead.follow_up_date) ?? '';

  const [type, setType] = useState<ActivityType>('Call');
  const [outcome, setOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [nextAction, setNextAction] = useState(currentNext);
  const [followUp, setFollowUp] = useState(currentFollow);
  const [status, setStatus] = useState<LeadStatus>(lead.outreach_status);
  const [touched, setTouched] = useState({ next: false, follow: false, status: false });
  const [error, setError] = useState<string | null>(null);

  const statuses = role === 'outreach' ? OUTREACH_SETTABLE_STATUSES : LEAD_STATUSES;
  const outcomes = OUTCOMES_BY_TYPE[type];

  const changeType = (next: ActivityType) => {
    setType(next);
    if (!OUTCOMES_BY_TYPE[next].includes(outcome)) applyOutcome('');
  };

  /** Outcome drives suggestions for status, next action and follow-up — but only for fields the user hasn't edited. */
  const applyOutcome = (value: string) => {
    setOutcome(value);
    if (!dealMode && !touched.status) setStatus(suggestStatus(lead.outreach_status, value));
    if (!touched.next) {
      const s = suggestNextAction(value);
      setNextAction(value && s ? s : currentNext);
    }
    if (!touched.follow) {
      if (value === 'Not Interested' || value === 'Do Not Contact' || value === 'Wrong Number') setFollowUp('');
      else setFollowUp(suggestFollowUp(value, today) ?? currentFollow);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (type === 'Note' ? !notes.trim() : !outcome && !notes.trim()) {
      setError(type === 'Note' ? 'Write the note first.' : 'Choose an outcome or add a short note.');
      return;
    }
    setError(null);
    try {
      await log.mutateAsync({
        leadId: lead.id,
        type,
        outcome,
        notes,
        nextAction,
        followUpDate: followUp || null,
        newStatus: dealMode || status === lead.outreach_status ? null : status,
        dealId: deal?.id,
      });
      toast.success('Activity logged');
      onSaved?.(dealMode ? lead.outreach_status : status);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const quick = (days: number | null) => {
    setTouched((t) => ({ ...t, follow: true }));
    setFollowUp(days === null ? '' : addDaysISO(today, days));
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-ink-soft">Type</legend>
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
          {ACTIVITY_TYPES.map((t) => (
            <label
              key={t}
              className={cn(
                'flex min-h-10 cursor-pointer items-center justify-center rounded-lg border px-2 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500/40',
                type === t ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-line-strong bg-surface text-ink-soft hover:bg-sunken',
              )}
            >
              <input type="radio" name="activity-type" value={t} checked={type === t} onChange={() => changeType(t)} className="sr-only" />
              {t}
            </label>
          ))}
        </div>
      </fieldset>

      {outcomes.length > 0 && (
        <Field label="Outcome">
          {(id) => (
            <Select id={id} value={outcome} onChange={(e) => applyOutcome(e.target.value)} autoFocus>
              <option value="">Select outcome…</option>
              {outcomes.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </Select>
          )}
        </Field>
      )}

      <Field label={type === 'Note' ? 'Note' : 'Short notes'} required={type === 'Note'} error={error}>
        {(id, d) => (
          <Textarea
            id={id}
            aria-describedby={d}
            aria-invalid={!!error}
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={type === 'Call' ? 'Spoke with the owner, asked for the report…' : undefined}
            autoFocus={outcomes.length === 0}
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Next action">
          {(id) => (
            <Input
              id={id}
              value={nextAction}
              onChange={(e) => {
                setNextAction(e.target.value);
                setTouched((t) => ({ ...t, next: true }));
              }}
              placeholder="Call again, send report…"
            />
          )}
        </Field>
        <Field label="Follow-up date">
          {(id) => (
            <Input
              id={id}
              type="date"
              value={followUp}
              onChange={(e) => {
                setFollowUp(e.target.value);
                setTouched((t) => ({ ...t, follow: true }));
              }}
            />
          )}
        </Field>
      </div>
      <div className="-mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Quick follow-up dates">
        {[
          ['Tomorrow', 1],
          ['In 3 days', 3],
          ['Next week', 7],
        ].map(([label, days]) => (
          <button key={label} type="button" onClick={() => quick(days as number)} className="rounded-full border border-line-strong px-2.5 py-1 text-xs font-medium text-ink-soft hover:bg-sunken">
            {label}
          </button>
        ))}
        <button type="button" onClick={() => quick(null)} className="rounded-full px-2.5 py-1 text-xs font-medium text-mute hover:bg-sunken">
          No follow-up
        </button>
      </div>

      {!dealMode && (
        <Field label="Lead status" hint={status !== lead.outreach_status ? `Will change from ${lead.outreach_status}` : 'Updated automatically from the outcome — change it if needed'}>
          {(id, d) => (
            <Select
              id={id}
              aria-describedby={d}
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as LeadStatus);
                setTouched((t) => ({ ...t, status: true }));
              }}
            >
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
              {!statuses.includes(status) && <option>{status}</option>}
            </Select>
          )}
        </Field>
      )}

      <div className="sticky bottom-0 -mx-5 -mb-4 flex justify-end gap-2 border-t border-line bg-surface px-5 py-3">
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" loading={log.isPending}>
          Save activity
        </Button>
      </div>
    </form>
  );
}
