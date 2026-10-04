import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LineChart } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Button, Field, Input } from '@/components/ui';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="flex size-8 items-center justify-center rounded-[10px] bg-brand-600 text-white">
        <LineChart className="size-4" aria-hidden />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-ink">
        GrowwithMH <span className="font-normal text-mute">CRM</span>
      </span>
    </div>
  );
}

export function LoginPage() {
  const { session, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== '/login' ? from : '/dashboard'} replace />;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Logo className="mb-6 justify-center" />
        <form onSubmit={submit} className="rounded-card border border-line bg-surface p-6 shadow-card" noValidate>
          <h1 className="text-lg font-semibold text-ink">Sign in</h1>
          <p className="mt-0.5 text-sm text-mute">Internal tool for the GrowwithMH team.</p>
          <div className="mt-5 space-y-4">
            <Field label="Email" required>
              {(id) => <Input id={id} type="email" autoComplete="username" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />}
            </Field>
            <Field label="Password" required error={error}>
              {(id, desc) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!error}
                  aria-describedby={desc}
                />
              )}
            </Field>
          </div>
          <Button type="submit" variant="primary" className="mt-5 w-full" loading={busy} disabled={!email || !password}>
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-mute">Accounts are created by an admin. Forgot your password? Ask Mehedi to reset it.</p>
      </div>
    </main>
  );
}
