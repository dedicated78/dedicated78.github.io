import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, KeyRound, Trash2 } from 'lucide-react';
import { AccessBadge, Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field, Input, LinkButton, OnboardingBadge, PaymentBadge, Select, Skeleton, Textarea, ACCESS_ITEM_TONE } from '@/components/ui';
import { useConfirm, useToast } from '@/components/overlays';
import { useAuth } from '@/features/auth/AuthContext';
import { useSettings } from '@/features/settings/api';
import { errorMessage } from '@/lib/supabase';
import { blankToNull, cn } from '@/lib/utils';
import {cleanWebsite, normalizeUrl} from '@/lib/url';

import { formatDate } from '@/lib/format';
import { useSyncedForm } from '@/hooks/useSyncedForm';
import { useClient, useClientAccess, useDeleteClient, useUpdateAccess, useUpdateClient } from './api';
import {
  ACCESS_ITEM_STATUSES,
  ACCESS_TYPES,
  BILLING_TYPES,
  ONBOARDING_STATUSES,
  PAYMENT_STATUSES,
  type BillingType,
  type Client,
  type ClientAccess,
  type OnboardingStatus,
  type PaymentStatus,
} from '@/types';

const FLOW: OnboardingStatus[] = ['New Client', 'Payment Pending', 'Access Pending', 'Setup', 'Active'];

function OnboardingSteps({ status, readOnly, onChange }: { status: OnboardingStatus; readOnly: boolean; onChange: (s: OnboardingStatus) => void }) {
  const idx = FLOW.indexOf(status);
  const paused = status === 'Paused';
  return (
    <div>
      <div className="md:hidden">
        <Select aria-label="Onboarding status" value={status} disabled={readOnly} onChange={(e) => onChange(e.target.value as OnboardingStatus)}>
          {ONBOARDING_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </div>
      <div className="hidden items-center gap-3 md:flex">
        <ol className="flex flex-1 items-center" aria-label="Onboarding progress">
          {FLOW.map((s, i) => {
            const done = !paused && i < idx;
            const current = !paused && i === idx;
            return (
              <li key={s} className="flex flex-1 items-center last:flex-none">
                <button
                  type="button"
                  disabled={readOnly}
                  aria-current={current ? 'step' : undefined}
                  onClick={() => !current && onChange(s)}
                  className={cn('group flex items-center gap-2 rounded-full py-1 pr-3 text-[13px] font-medium disabled:cursor-default', current ? 'text-brand-700' : done ? 'text-ink-soft' : 'text-mute', !readOnly && 'hover:text-ink')}
                >
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                      current ? 'border-brand-600 bg-brand-600 text-white' : done ? 'border-pos-ink bg-pos-ink text-white' : 'border-line-strong bg-surface text-mute',
                    )}
                  >
                    {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
                  </span>
                  <span className="whitespace-nowrap">{s}</span>
                </button>
                {i < FLOW.length - 1 && <span className={cn('mr-2 h-px min-w-3 flex-1', done ? 'bg-pos-ink' : 'bg-line-strong')} aria-hidden />}
              </li>
            );
          })}
        </ol>
        {!readOnly && (
          <Button size="sm" variant={paused ? 'primary' : 'ghost'} onClick={() => onChange(paused ? 'Setup' : 'Paused')}>
            {paused ? 'Resume' : 'Pause'}
          </Button>
        )}
      </div>
      {paused && <p className="mt-2 text-sm text-mute">This client is paused.</p>}
    </div>
  );
}

function AccessRow({ item, readOnly }: { item: ClientAccess; readOnly: boolean }) {
  const toast = useToast();
  const update = useUpdateAccess();
  const [note, setNote] = useState(item.notes ?? '');

  const save = async (patch: Partial<Pick<ClientAccess, 'status' | 'notes'>>) => {
    try {
      await update.mutateAsync({ id: item.id, patch });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <li className="space-y-2 px-4 py-3 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded-full border',
              item.status === 'Received' ? 'border-pos-ink bg-pos-ink text-white' : item.status === 'Not Required' ? 'border-line-strong bg-sunken text-mute' : 'border-line-strong bg-surface',
            )}
            aria-hidden
          >
            {item.status === 'Received' && <Check className="size-3" />}
          </span>
          <span className={cn('text-sm font-medium', item.status === 'Not Required' ? 'text-mute line-through' : 'text-ink')}>{item.access_type}</span>
        </div>
        {readOnly ? (
          <Badge tone={ACCESS_ITEM_TONE[item.status]}>{item.status}</Badge>
        ) : (
          <Select aria-label={`${item.access_type} status`} value={item.status} className="h-9 w-36! shrink-0 py-1" onChange={(e) => void save({ status: e.target.value as ClientAccess['status'] })}>
            {ACCESS_ITEM_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        )}
      </div>
      {readOnly ? (
        item.notes && <p className="pl-[30px] text-sm text-ink-soft">{item.notes}</p>
      ) : (
        <Input
          aria-label={`${item.access_type} note`}
          className="h-9 py-1 text-[13px]"
          placeholder="Note (e.g. invited us as manager on Oct 6)"
          value={note}
          maxLength={300}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note.trim() !== (item.notes ?? '') && void save({ notes: blankToNull(note) })}
        />
      )}
    </li>
  );
}

interface FormState {
  contact_name: string;
  phone: string;
  email: string;
  website: string;
  service: string;
  agreed_price: string;
  billing_type: BillingType | '';
  start_date: string;
  payment_status: PaymentStatus;
  notes: string;
}

const fromClient = (c: Client): FormState => ({
  contact_name: c.contact_name ?? '',
  phone: c.phone ?? '',
  email: c.email ?? '',
  website: c.website ?? '',
  service: c.service ?? '',
  agreed_price: String(c.agreed_price ?? 0),
  billing_type: c.billing_type ?? '',
  start_date: c.start_date ?? '',
  payment_status: c.payment_status,
  notes: c.notes ?? '',
});

function ClientForm({ client, readOnly, currency }: { client: Client; readOnly: boolean; currency: string }) {
  const toast = useToast();
  const update = useUpdateClient();
  const baseline = useMemo(() => fromClient(client), [client]);
  const { form: f, setForm: setF, dirty, reset } = useSyncedForm<FormState>(baseline);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(k: K) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value as FormState[K] }));
  const dis = readOnly;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const price = f.agreed_price.trim() === '' ? 0 : Number(f.agreed_price);
    if (!Number.isFinite(price) || price < 0) return setError('Agreed price must be a number, 0 or more.');
    if (f.website.trim() && !normalizeUrl(f.website)) return setError('Enter a valid website address.');
    setError(null);
    try {
      await update.mutateAsync({
        id: client.id,
        patch: {
          contact_name: blankToNull(f.contact_name),
          phone: blankToNull(f.phone),
          email: blankToNull(f.email),
          website: blankToNull(cleanWebsite(f.website)),
          service: blankToNull(f.service),
          agreed_price: price,
          billing_type: f.billing_type || null,
          start_date: f.start_date || null,
          payment_status: f.payment_status,
          notes: blankToNull(f.notes),
        },
      });
      toast.success('Client saved');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <form onSubmit={save} noValidate className="space-y-5">
      <Card>
        <CardHeader title="Overview" subtitle={readOnly ? 'Read-only — onboarding is managed by Mehedi' : undefined} />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <Field label="Contact name">{(id) => <Input id={id} disabled={dis} value={f.contact_name} onChange={set('contact_name')} />}</Field>
          <Field label="Phone">{(id) => <Input id={id} type="tel" disabled={dis} value={f.phone} onChange={set('phone')} />}</Field>
          <Field label="Email">{(id) => <Input id={id} type="email" disabled={dis} value={f.email} onChange={set('email')} />}</Field>
          <Field label="Website">{(id) => <Input id={id} disabled={dis} value={f.website} onChange={set('website')} />}</Field>
          <Field label="Service" className="sm:col-span-2">{(id) => <Input id={id} disabled={dis} value={f.service} onChange={set('service')} />}</Field>
          <Field label={`Agreed price (${currency})`}>{(id) => <Input id={id} type="number" min="0" step="0.01" inputMode="decimal" disabled={dis} value={f.agreed_price} onChange={set('agreed_price')} />}</Field>
          <Field label="Billing">
            {(id) => (
              <Select id={id} disabled={dis} value={f.billing_type} onChange={set('billing_type')}>
                <option value="">Not set</option>
                {BILLING_TYPES.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Start date">{(id) => <Input id={id} type="date" disabled={dis} value={f.start_date} onChange={set('start_date')} />}</Field>
          <Field label="Payment status">
            {(id) => (
              <Select id={id} disabled={dis} value={f.payment_status} onChange={set('payment_status')}>
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Onboarding notes" />
        <div className="p-4 sm:p-5">
          <Field label="Notes">{(id) => <Textarea id={id} rows={4} disabled={dis} value={f.notes} onChange={set('notes')} placeholder="Kick-off call booked, waiting on GBP invite, anything the next person needs to know…" />}</Field>
        </div>
      </Card>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {!readOnly && (
        <div className="sticky bottom-16 z-10 flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-pop lg:bottom-4">
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
      )}
    </form>
  );
}

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const clientQ = useClient(id);
  const accessQ = useClientAccess(id);
  const update = useUpdateClient();
  const del = useDeleteClient();
  const client = clientQ.data;
  const readOnly = !isAdmin;

  const back = (
    <Link to="/clients" className="inline-flex items-center gap-1 text-mute hover:text-ink">
      <ArrowLeft className="size-3.5" aria-hidden /> Clients
    </Link>
  );

  const items = useMemo(() => [...(accessQ.data ?? [])].sort((a, b) => ACCESS_TYPES.indexOf(a.access_type) - ACCESS_TYPES.indexOf(b.access_type)), [accessQ.data]);

  if (clientQ.isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading client">
        <Skeleton className="h-32 w-full rounded-card" />
        <Skeleton className="h-72 w-full rounded-card" />
      </div>
    );
  }
  if (clientQ.error) return <ErrorState error={clientQ.error} onRetry={() => void clientQ.refetch()} />;
  if (!client) {
    return (
      <Card>
        <EmptyState title="Client not found" action={<LinkButton to="/clients">Back to clients</LinkButton>} />
      </Card>
    );
  }

  const changeOnboarding = async (status: OnboardingStatus) => {
    try {
      await update.mutateAsync({ id: client.id, patch: { onboarding_status: status } });
      toast.success(`Onboarding: ${status}`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${client.business_name}?`,
      message: 'This removes the client record and its access checklist. The original lead and deal are kept, so the deal can be converted again. This cannot be undone.',
      confirmLabel: 'Delete client',
      danger: true,
    });
    if (!ok) return;
    try {
      await del.mutateAsync(client.id);
      toast.success('Client deleted');
      navigate('/clients', { replace: true });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const received = items.filter((i) => i.status === 'Received').length;
  const needed = items.filter((i) => i.status !== 'Not Required').length;

  return (
    <div className="space-y-5">
      <div className="text-xs">{back}</div>

      <Card>
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="break-words text-xl font-semibold tracking-tight text-ink sm:text-2xl">{client.business_name}</h1>
              <p className="mt-0.5 text-sm text-mute">
                {client.service || 'No service set'}
                {client.start_date && ` · starts ${formatDate(client.start_date)}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <OnboardingBadge status={client.onboarding_status} />
              <PaymentBadge status={client.payment_status} />
              <AccessBadge status={client.access_status} />
            </div>
          </div>

          <div className="mt-5">
            <OnboardingSteps status={client.onboarding_status} readOnly={readOnly || update.isPending} onChange={(s) => void changeOnboarding(s)} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-sm">
            {client.deal_id && isAdmin && <LinkButton to={`/deals/${client.deal_id}`} size="sm">Open deal</LinkButton>}
            {client.lead_id && <LinkButton to={`/leads/${client.lead_id}`} size="sm">Open lead</LinkButton>}
            {isAdmin && (
              <Button size="sm" variant="danger" className="sm:ml-auto" onClick={() => void remove()} loading={del.isPending}>
                <Trash2 className="size-3.5" aria-hidden /> Delete
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div>
          <ClientForm key={client.id} client={client} readOnly={readOnly} currency={settings.default_currency} />
        </div>

        <div>
          <Card>
            <CardHeader title="Access checklist" subtitle={needed ? `${received} of ${needed} received` : undefined} action={<AccessBadge status={client.access_status} />} />
            <p className="flex items-start gap-2 border-b border-line bg-warn-soft/60 px-4 py-2.5 text-xs text-warn-ink sm:px-5">
              <KeyRound className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Track only whether access was granted. Never ask for or store passwords here — use manager invites or each platform’s sharing flow.
            </p>
            {accessQ.isLoading ? (
              <div className="space-y-3 p-5" role="status" aria-label="Loading checklist">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : accessQ.error ? (
              <ErrorState error={accessQ.error} onRetry={() => void accessQ.refetch()} />
            ) : items.length === 0 ? (
              <EmptyState title="No checklist items" />
            ) : (
              <ul className="divide-y divide-line">
                {items.map((item) => (
                  <AccessRow key={item.id} item={item} readOnly={readOnly} />
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
