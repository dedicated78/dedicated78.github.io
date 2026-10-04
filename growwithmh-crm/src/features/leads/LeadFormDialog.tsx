import { useState, type FormEvent } from 'react';
import { Button, Field, Input, Select, Textarea } from '@/components/ui';
import { Modal, useToast } from '@/components/overlays';
import { useAuth } from '@/features/auth/AuthContext';
import { useProfiles } from '@/features/settings/api';
import {cleanWebsite, normalizeUrl} from '@/lib/url';

import { blankToNull } from '@/lib/utils';
import { errorMessage } from '@/lib/supabase';
import { useCreateLead, useUpdateLead, type LeadEditable } from './api';
import { LEAD_STATUSES, PRIORITIES, type Lead, type LeadStatus, type Priority } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** null → create a lead manually */
  lead: Lead | null;
  onSaved?: (id: string) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LeadFormDialog(props: Props) {
  return (
    <Modal open={props.open} onClose={props.onClose} size="lg" title={props.lead ? 'Edit lead' : 'New lead'} description={props.lead ? props.lead.business_name : 'For leads that have no research file yet.'}>
      {props.open && <Form {...props} />}
    </Modal>
  );
}

function Form({ onClose, lead, onSaved }: Props) {
  const toast = useToast();
  const { profile } = useAuth();
  const { withRole } = useProfiles();
  const update = useUpdateLead();
  const create = useCreateLead(profile?.id ?? '');
  const outreach = withRole('outreach');

  const [f, setF] = useState({
    business_name: lead?.business_name ?? '',
    contact_name: lead?.contact_name ?? '',
    phone: lead?.phone ?? '',
    email: lead?.email ?? '',
    website: lead?.website ?? '',
    location: lead?.location ?? '',
    niche: lead?.niche ?? '',
    priority: (lead?.priority ?? 'Medium') as Priority,
    recommended_service: lead?.recommended_service ?? '',
    main_opportunity: lead?.main_opportunity ?? '',
    assigned_to: lead?.assigned_to ?? outreach[0]?.id ?? '',
    outreach_status: (lead?.outreach_status ?? 'Ready to Call') as LeadStatus,
    next_action: lead?.next_action ?? '',
    follow_up_date: lead?.follow_up_date ?? '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof f>(k: K) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value as (typeof f)[K] }));
  const errs = {
    business_name: f.business_name.trim() ? null : 'Business name is required.',
    email: f.email.trim() && !EMAIL_RE.test(f.email.trim()) ? 'Enter a valid email address.' : null,
    website: f.website.trim() && !normalizeUrl(f.website) ? 'Enter a valid website address.' : null,
  };
  const show = (k: keyof typeof errs) => (submitted ? errs[k] : null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.values(errs).some(Boolean)) return;
    setError(null);
    const payload: LeadEditable = {
      business_name: f.business_name.trim(),
      contact_name: blankToNull(f.contact_name),
      phone: blankToNull(f.phone),
      email: blankToNull(f.email),
      website: blankToNull(cleanWebsite(f.website)),
      location: blankToNull(f.location),
      niche: blankToNull(f.niche),
      priority: f.priority,
      recommended_service: blankToNull(f.recommended_service),
      main_opportunity: blankToNull(f.main_opportunity),
      assigned_to: f.assigned_to || null,
      outreach_status: f.outreach_status,
      next_action: blankToNull(f.next_action),
      follow_up_date: f.follow_up_date || null,
    };
    try {
      if (lead) {
        await update.mutateAsync({ id: lead.id, patch: payload });
        toast.success('Lead updated');
        onSaved?.(lead.id);
      } else {
        const created = await create.mutateAsync(payload);
        toast.success('Lead created');
        onSaved?.(created.id);
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name" required error={show('business_name')} className="sm:col-span-2">
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!show('business_name')} autoFocus value={f.business_name} onChange={set('business_name')} />}
        </Field>
        <Field label="Contact name">{(id) => <Input id={id} value={f.contact_name} onChange={set('contact_name')} />}</Field>
        <Field label="Phone">{(id) => <Input id={id} type="tel" value={f.phone} onChange={set('phone')} />}</Field>
        <Field label="Email" error={show('email')}>
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!show('email')} type="email" value={f.email} onChange={set('email')} />}
        </Field>
        <Field label="Website" error={show('website')}>
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!show('website')} value={f.website} onChange={set('website')} />}
        </Field>
        <Field label="Location">{(id) => <Input id={id} value={f.location} onChange={set('location')} />}</Field>
        <Field label="Niche">{(id) => <Input id={id} value={f.niche} onChange={set('niche')} />}</Field>
        <Field label="Priority">
          {(id) => (
            <Select id={id} value={f.priority} onChange={set('priority')}>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Assigned to (outreach)">
          {(id) => (
            <Select id={id} value={f.assigned_to} onChange={set('assigned_to')}>
              <option value="">Unassigned</option>
              {outreach.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
              {lead?.assigned_to && !outreach.some((u) => u.id === lead.assigned_to) && <option value={lead.assigned_to}>Current owner (inactive)</option>}
            </Select>
          )}
        </Field>
        <Field label="Recommended service" className="sm:col-span-2">
          {(id) => <Input id={id} value={f.recommended_service} onChange={set('recommended_service')} />}
        </Field>
        <Field label="Main opportunity" className="sm:col-span-2">
          {(id) => <Textarea id={id} rows={3} value={f.main_opportunity} onChange={set('main_opportunity')} />}
        </Field>
        {lead && (
          <Field label="Status">
            {(id) => (
              <Select id={id} value={f.outreach_status} onChange={set('outreach_status')}>
                {LEAD_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
          </Field>
        )}
        <Field label="Next action">{(id) => <Input id={id} value={f.next_action} onChange={set('next_action')} />}</Field>
        <Field label="Follow-up date">{(id) => <Input id={id} type="date" value={f.follow_up_date} onChange={set('follow_up_date')} />}</Field>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="sticky bottom-0 -mx-5 -mb-4 flex justify-end gap-2 border-t border-line bg-surface px-5 py-3">
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" loading={update.isPending || create.isPending}>
          {lead ? 'Save changes' : 'Create lead'}
        </Button>
      </div>
    </form>
  );
}
