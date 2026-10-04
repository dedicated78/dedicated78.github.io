import { useState, type FormEvent } from 'react';
import { Button, Field, Select, Textarea } from '@/components/ui';
import { Modal, useToast } from '@/components/overlays';
import { errorMessage } from '@/lib/supabase';
import { useProfiles } from '@/features/settings/api';
import { useHandOff } from './api';
import { HANDOFF_STATUSES, type Lead, type LeadStatus } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  lead: Lead;
}

export function HandoffDialog(props: Props) {
  return (
    <Modal open={props.open} onClose={props.onClose} title={props.lead.bd_assigned_to ? 'Update handoff' : 'Hand off to Business Development'} description={props.lead.business_name}>
      {props.open && <Form {...props} />}
    </Modal>
  );
}

function Form({ onClose, lead }: Props) {
  const toast = useToast();
  const { withRole, nameOf } = useProfiles();
  const handOff = useHandOff();
  const bdUsers = withRole('business_development');

  const initialStatus = (HANDOFF_STATUSES as readonly string[]).includes(lead.outreach_status) ? lead.outreach_status : 'Qualified';
  const [status, setStatus] = useState<LeadStatus>(initialStatus as LeadStatus);
  const [note, setNote] = useState(lead.handoff_note ?? '');
  const [bd, setBd] = useState(lead.bd_assigned_to ?? bdUsers[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return setError('Write a short note for the business developer.');
    setError(null);
    try {
      await handOff.mutateAsync({ leadId: lead.id, bdUser: bd || null, note, status });
      toast.success(bd ? `Handed to ${nameOf(bd)}` : 'Handoff note saved');
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Lead status">
        {(id) => (
          <Select id={id} value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)}>
            {HANDOFF_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        )}
      </Field>
      <Field
        label="Handoff note"
        required
        error={error}
        hint="What the owner said, what they care about, availability, objections — the first thing the business developer will read."
      >
        {(id, d) => (
          <Textarea
            id={id}
            aria-describedby={d}
            aria-invalid={!!error}
            rows={5}
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Owner is interested in improving Google Maps visibility. Asked about pricing. Available Wednesday afternoon."
          />
        )}
      </Field>
      <Field label="Business developer" hint={bdUsers.length ? 'The deal is opened for them automatically.' : 'No active business developer yet — save the note now and assign later.'}>
        {(id, d) => (
          <Select id={id} aria-describedby={d} value={bd} onChange={(e) => setBd(e.target.value)}>
            <option value="">Don’t assign yet (save note only)</option>
            {bdUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="sticky bottom-0 -mx-5 -mb-4 flex justify-end gap-2 border-t border-line bg-surface px-5 py-3">
        <Button onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" loading={handOff.isPending}>
          {bd ? 'Hand off' : 'Save note'}
        </Button>
      </div>
    </form>
  );
}
