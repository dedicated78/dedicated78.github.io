import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2, LockKeyhole } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Button, EmptyState } from '@/components/ui';
import { Logo } from './LoginPage';
import type { Role } from '@/types';

export function FullScreen({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <Logo />
      {children}
    </main>
  );
}

export function FullScreenSpinner() {
  return (
    <FullScreen>
      <div role="status" className="flex items-center gap-2 text-sm text-mute">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Loading…
      </div>
    </FullScreen>
  );
}

/** Signed in AND active, otherwise explain why not. */
export function RequireAuth() {
  const { loading, session, profile, profileError, signOut, refreshProfile } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenSpinner />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;

  if (profileError) {
    return (
      <FullScreen>
        <div className="max-w-sm rounded-card border border-line bg-surface p-6 shadow-card">
          <p className="text-sm font-semibold">We couldn’t load your profile</p>
          <p className="mt-1 text-sm text-mute">{profileError}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={() => void refreshProfile()}>Retry</Button>
            <Button variant="ghost" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </FullScreen>
    );
  }

  if (!profile || !profile.is_active) {
    return (
      <FullScreen>
        <div className="max-w-sm rounded-card border border-line bg-surface p-6 shadow-card">
          <EmptyState icon={<LockKeyhole className="size-5" aria-hidden />} title="Your account is waiting for activation">
            An admin needs to activate your account and assign a role. Ask Mehedi, then refresh.
          </EmptyState>
          <div className="mt-2 flex justify-center gap-2">
            <Button onClick={() => void refreshProfile()}>Check again</Button>
            <Button variant="ghost" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </FullScreen>
    );
  }

  return <Outlet />;
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { role } = useAuth();
  if (!role || !roles.includes(role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
