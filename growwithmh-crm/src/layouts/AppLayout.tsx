import { NavLink, Outlet } from 'react-router-dom';
import { Briefcase, Building2, LayoutDashboard, Settings, UsersRound, type LucideIcon } from 'lucide-react';
import { Logo } from '@/features/auth/LoginPage';
import { AccountMenu } from '@/features/auth/AccountMenu';
import { useAuth } from '@/features/auth/AuthContext';
import { GlobalSearch } from './GlobalSearch';
import { NotificationsBell } from './NotificationsBell';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/format';
import { ROLE_LABELS, type Role } from '@/types';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'outreach', 'business_development'] },
  { to: '/leads', label: 'Leads', icon: Building2, roles: ['admin', 'outreach', 'business_development'] },
  { to: '/deals', label: 'Deals', icon: Briefcase, roles: ['admin', 'business_development'] },
  { to: '/clients', label: 'Clients', icon: UsersRound, roles: ['admin', 'business_development'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
];

export function AppLayout() {
  const { profile, role } = useAuth();
  const items = NAV.filter((n) => role && n.roles.includes(role));

  return (
    <div className="min-h-screen lg:pl-60">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:shadow-pop">
        Skip to content
      </a>

      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-canvas px-3 py-4 lg:flex">
        <Logo className="px-2 pb-5" />
        <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-soft hover:bg-sunken hover:text-ink',
                )
              }
            >
              <Icon className="size-[18px]" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        {profile && (
          <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">{initials(profile.full_name)}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{profile.full_name}</p>
              <p className="truncate text-xs text-mute">{ROLE_LABELS[profile.role]}</p>
            </div>
          </div>
        )}
      </aside>

      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-canvas px-4 py-2.5 sm:px-6">
        <Logo className="lg:hidden [&_span:last-child]:hidden sm:[&_span:last-child]:inline" />
        <GlobalSearch />
        <div className="ml-auto flex items-center gap-1.5">
          <NotificationsBell />
          <AccountMenu />
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:pb-10">
        <Outlet />
      </main>

      {/* mobile bottom navigation */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink to={to} className={({ isActive }) => cn('flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium', isActive ? 'text-brand-700' : 'text-mute')}>
                <Icon className="size-5" aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
