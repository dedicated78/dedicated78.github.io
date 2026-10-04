import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFilterState } from '@/hooks/useFilterState';
import { Search, UsersRound } from 'lucide-react';
import { AccessBadge, Button, Card, EmptyState, ErrorState, Input, OnboardingBadge, PageHeader, PaymentBadge, Select, TableSkeleton } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { useClients } from './api';
import { ACCESS_STATUSES, ONBOARDING_STATUSES, PAYMENT_STATUSES } from '@/types';

export const IN_ONBOARDING = ['New Client', 'Payment Pending', 'Access Pending', 'Setup'];

export function ClientsPage() {
  const navigate = useNavigate();
  const clientsQ = useClients();
  const { state: fs, set, reset } = useFilterState({ q: '', onboarding: '', payment: '', access: '' });
  const { q, onboarding, payment, access } = fs;
  const setParam = set;

  const all = clientsQ.data ?? [];
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all.filter((c) => {
      if (onboarding === 'pending' ? !IN_ONBOARDING.includes(c.onboarding_status) : onboarding && c.onboarding_status !== onboarding) return false;
      if (payment && c.payment_status !== payment) return false;
      if (access && c.access_status !== access) return false;
      if (term && ![c.business_name, c.contact_name, c.email, c.phone, c.service].filter(Boolean).join(' ').toLowerCase().includes(term)) return false;
      return true;
    });
  }, [all, q, onboarding, payment, access]);
  const filtered = !!(q || onboarding || payment || access);

  return (
    <div>
      <PageHeader title="Clients" subtitle={clientsQ.isLoading ? undefined : `${rows.length} ${rows.length === 1 ? 'client' : 'clients'}`} />

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mute" aria-hidden />
          <Input aria-label="Filter clients" type="search" placeholder="Filter clients…" className="pl-9" value={q} onChange={(e) => setParam('q', e.target.value)} />
        </div>
        <Select aria-label="Onboarding" value={onboarding} onChange={(e) => setParam('onboarding', e.target.value)}>
          <option value="">All onboarding</option>
          <option value="pending">In onboarding (not active)</option>
          {ONBOARDING_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select aria-label="Payment" value={payment} onChange={(e) => setParam('payment', e.target.value)}>
          <option value="">All payment</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select aria-label="Access" value={access} onChange={(e) => setParam('access', e.target.value)}>
          <option value="">All access</option>
          {ACCESS_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </div>

      <Card>
        {clientsQ.isLoading ? (
          <TableSkeleton />
        ) : clientsQ.error ? (
          <ErrorState error={clientsQ.error} onRetry={() => void clientsQ.refetch()} />
        ) : rows.length === 0 ? (
          filtered ? (
            <EmptyState icon={<Search className="size-5" aria-hidden />} title="No clients match" action={<Button onClick={reset}>Clear filters</Button>} />
          ) : (
            <EmptyState icon={<UsersRound className="size-5" aria-hidden />} title="No clients yet.">
              Won deals will appear here after conversion.
            </EmptyState>
          )
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-xs text-mute">
                  <tr>
                    <th scope="col" className="px-5 py-2.5 font-medium">Business</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Service</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Contact</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Start</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Payment</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Access</th>
                    <th scope="col" className="px-5 py-2.5 font-medium">Onboarding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((c) => (
                    <tr key={c.id} className="cursor-pointer hover:bg-canvas" onClick={() => navigate(`/clients/${c.id}`)}>
                      <td className="max-w-[14rem] px-5 py-3">
                        <Link to={`/clients/${c.id}`} onClick={(e) => e.stopPropagation()} className="block truncate font-medium text-ink hover:text-brand-700">
                          {c.business_name}
                        </Link>
                      </td>
                      <td className="max-w-[14rem] truncate px-3 py-3 text-ink-soft">{c.service || '—'}</td>
                      <td className="max-w-[12rem] truncate px-3 py-3 text-ink-soft">{c.contact_name || c.email || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-ink-soft">{formatDate(c.start_date)}</td>
                      <td className="px-3 py-3"><PaymentBadge status={c.payment_status} /></td>
                      <td className="px-3 py-3"><AccessBadge status={c.access_status} /></td>
                      <td className="px-5 py-3"><OnboardingBadge status={c.onboarding_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-line md:hidden">
              {rows.map((c) => (
                <li key={c.id}>
                  <Link to={`/clients/${c.id}`} className="block px-4 py-3.5 active:bg-sunken">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{c.business_name}</p>
                        <p className="truncate text-xs text-mute">{c.service || '—'}</p>
                      </div>
                      <OnboardingBadge status={c.onboarding_status} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <PaymentBadge status={c.payment_status} />
                      <AccessBadge status={c.access_status} />
                      {c.start_date && <span className="text-xs text-mute">Starts {formatDate(c.start_date)}</span>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
