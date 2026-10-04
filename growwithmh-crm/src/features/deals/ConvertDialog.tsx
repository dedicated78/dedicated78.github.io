import { useState, type FormEvent } from 'react';
import { Button, Field, Input, Select } from '@/components/ui';
import { Modal, useToast } from '@/components/overlays';
import { errorMessage } from '@/lib/supabase';
import { useConvertDeal } from './api';
import { BILLING_TYPES, type BillingType, type Deal, type Lead } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  deal: Deal;
  lead: Lead | null | undefined;
  onConverted: (clientId: string) => void;
}

export function ConvertDialog(props: Props) {
  return (
    <Modal open={props.open} onClose={props.onClose} size="lg" title="Convert to client" description="Pre-filled from the lead and deal. The lead and deal stay linked and untouched.">
      {props.open && <Form {...props} />}
    </Modal>
  );
}

function Form({ onClose, deal, lead, onConverted }: Props) {
  const toast = useToast();
  const convert = useConvertDeal();
  const [f, setF] = useState({
    business_name: lead?.business_name ?? '',
    contact_name: deal.decision_maker || lead?.contact_name || '',
    phone: lead?.phone ?? '',
    email: lead?.email ?? '',
    website: lead?.website ?? '',
    service: deal.services_discussed.join(', ') || lead?.recommended_service || '',
    agreed_price: String(deal.estimated_value ?? 0),
    billing_type: (deal.billing_type ?? '') as BillingType | '',
    start_date: '',
  });
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const price = Number(f.agreed_price);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.business_name.trim()) return setError('Business name is required.');
    if (!Number.isFinite(price) || price < 0) return setError('Agreed price must be a number, 0 or more.');
    setError(null);
    try {
      const id = await convert.mutateAsync({
        dealId: deal.id,
        businessName: f.business_name,
        contactName: f.contact_name,
        phone: f.phone,
        email: f.email,
        website: f.website,
        service: f.service,
        agreedPrice: price,
        billingType: f.billing_type || null,
        startDate: f.start_date || null,
      });
      toast.success('Client created — onboarding can start');
      onClose();
      onConverted(id);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name" required className="sm:col-span-2">{(id) => <Input id={id} value={f.business_name} onChange={set('business_name')} autoFocus />}</Field>
        <Field label="Contact name">{(id) => <Input id={id} value={f.contact_name} onChange={set('contact_name')} />}</Field>
        <Field label="Phone">{(id) => <Input id={id} type="tel" value={f.phone} onChange={set('phone')} />}</Field>
        <Field label="Email">{(id) => <Input id={id} type="email" value={f.email} onChange={set('email')} />}</Field>
        <Field label="Website">{(id) => <Input id={id} value={f.website} onChange={set('website')} />}</Field>
        <Field label="Service" className="sm:col-span-2">{(id) => <Input id={id} value={f.service} onChange={set('service')} />}</Field>
        <Field label="Agreed price">{(id) => <Input id={id} type="number" min="0" step="0.01" inputMode="decimal" value={f.agreed_price} onChange={set('agreed_price')} />}</Field>
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
        <Field label="Start date">{(id) => <Input id={id} type="date" value={f.start_date} onChange={set('start_date')} />}</Field>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="sticky bottom-0 -mx-5 -mb-4 flex justify-end gap-2 border-t border-line bg-surface px-5 py-3">
        <Button onClick={onClose}>Not now</Button>
        <Button type="submit" variant="positive" loading={convert.isPending}>
          Create client
        </Button>
      </div>
    </form>
  );
}
