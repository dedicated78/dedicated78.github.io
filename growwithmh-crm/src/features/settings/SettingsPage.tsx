import { useState, type FormEvent } from 'react';
import { Info } from 'lucide-react';
import { Badge, Button, Card, CardHeader, ErrorState, Field, Input, PageHeader, Select, TableSkeleton } from '@/components/ui';
import { useToast } from '@/components/overlays';
import { useAuth } from '@/features/auth/AuthContext';
import { errorMessage } from '@/lib/supabase';
import { useProfiles, useSettings, useUpdateProfile, useUpdateSettings } from './api';
import { ROLES, ROLE_LABELS, type Profile, type Role } from '@/types';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'AED', 'SAR', 'QAR', 'KWD', 'BDT', 'INR', 'PKR'];
const TIMEZONES: string[] = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['Asia/Riyadh', 'UTC'];

function validTz(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function BusinessSettings() {
  const toast = useToast();
  const { settings, isLoading } = useSettings();
  const update = useUpdateSettings();
  const [form, setForm] = useState<{ company_name: string; default_currency: string; timezone: string } | null>(null);
  const f = form ?? { company_name: settings.company_name, default_currency: settings.default_currency, timezone: settings.timezone };
  const dirty = !!form && (f.company_name !== settings.company_name || f.default_currency !== settings.default_currency || f.timezone !== settings.timezone);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.company_name.trim()) return setError('Company name is required.');
    if (!validTz(f.timezone)) return setError('That timezone isn’t recognised. Pick one from the list, e.g. Asia/Riyadh.');
    setError(null);
    try {
      await update.mutateAsync({ company_name: f.company_name.trim(), default_currency: f.default_currency, timezone: f.timezone });
      setForm(null);
      toast.success('Settings saved');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader title="Business" subtitle="Used for dates (“today”), money formatting and labels" />
      <form onSubmit={submit} className="space-y-4 p-4 sm:p-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Company name">{(id) => <Input id={id} disabled={isLoading} value={f.company_name} onChange={(e) => setForm({ ...f, company_name: e.target.value })} />}</Field>
          <Field label="Default currency">
            {(id) => (
              <Select id={id} disabled={isLoading} value={f.default_currency} onChange={(e) => setForm({ ...f, default_currency: e.target.value })}>
                {[...new Set([f.default_currency, ...CURRENCIES])].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Timezone" error={error}>
            {(id, d) => (
              <>
                <Input id={id} aria-describedby={d} aria-invalid={!!error} list="tz-list" disabled={isLoading} value={f.timezone} onChange={(e) => setForm({ ...f, timezone: e.target.value })} />
                <datalist id="tz-list">
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={!dirty} loading={update.isPending}>
            Save settings
          </Button>
        </div>
      </form>
    </Card>
  );
}

function UserRow({ user, isSelf }: { user: Profile; isSelf: boolean }) {
  const toast = useToast();
  const update = useUpdateProfile();
  const [name, setName] = useState(user.full_name);

  const patch = async (p: Partial<Pick<Profile, 'full_name' | 'role' | 'is_active'>>, okMessage: string) => {
    try {
      await update.mutateAsync({ id: user.id, ...p });
      toast.success(okMessage);
    } catch (e) {
      toast.error(errorMessage(e));
      setName(user.full_name);
    }
  };

  return (
    <li className="grid gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_11rem_7rem] sm:items-center sm:px-5">
      <div className="min-w-0">
        <Input
          aria-label={`Name for ${user.email ?? user.full_name}`}
          className="h-9 py-1 font-medium"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name.trim() !== user.full_name && void patch({ full_name: name.trim() }, 'Name updated')}
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-ink-soft">{user.email}</p>
        {isSelf && <Badge tone="teal">You</Badge>}
        {!user.is_active && !isSelf && <Badge tone="amber">Awaiting activation</Badge>}
      </div>
      <Select
        aria-label={`Role for ${user.full_name}`}
        className="h-9 py-1"
        value={user.role}
        disabled={isSelf || update.isPending}
        onChange={(e) => void patch({ role: e.target.value as Role }, 'Role updated')}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </Select>
      <label className="flex items-center gap-2 text-sm text-ink-soft">
        <input
          type="checkbox"
          className="size-4 accent-brand-600"
          checked={user.is_active}
          disabled={isSelf || update.isPending}
          onChange={(e) => void patch({ is_active: e.target.checked }, e.target.checked ? 'User activated' : 'User deactivated')}
        />
        Active
      </label>
    </li>
  );
}

export function SettingsPage() {
  const { profile } = useAuth();
  const { profiles, isLoading, error, refetch } = useProfiles();

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Admin only" />
      <BusinessSettings />

      <Card>
        <CardHeader title="Users" subtitle={`${profiles.filter((p) => p.is_active).length} active`} />
        <p className="flex items-start gap-2 border-b border-line bg-brand-50/60 px-4 py-2.5 text-xs text-ink-soft sm:px-5">
          <Info className="mt-0.5 size-3.5 shrink-0 text-brand-600" aria-hidden />
          New users are created in the Supabase dashboard (Authentication → Users → Add user). They appear here as “Awaiting activation” — set a role and tick Active. Deactivated users keep their history but lose all access.
        </p>
        {isLoading ? (
          <TableSkeleton rows={3} />
        ) : error ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : (
          <ul className="divide-y divide-line">
            {profiles.map((u) => (
              <UserRow key={`${u.id}-${u.updated_at}`} user={u} isSelf={u.id === profile?.id} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
