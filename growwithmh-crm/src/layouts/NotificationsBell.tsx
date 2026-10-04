import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useNotices } from '@/features/dashboard/useNotices';
import { useClickOutside } from '@/hooks/useClickOutside';
import { cn } from '@/lib/utils';

const DOT = { red: 'bg-danger', amber: 'bg-amber-500', teal: 'bg-brand-500' } as const;

/** In-app indicators only (no email/SMS/push in V1). Derived from live data, nothing to dismiss or sync. */
export function NotificationsBell() {
  const { notices } = useNotices();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);
  const urgent = notices.filter((n) => n.tone === 'red').length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={notices.length ? `${notices.length} items need attention` : 'No notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative flex size-9 items-center justify-center rounded-full text-ink-soft hover:bg-sunken"
      >
        <Bell className="size-[18px]" aria-hidden />
        {notices.length > 0 && (
          <span className={cn('absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white', urgent ? 'bg-danger' : 'bg-brand-600')}>
            {notices.length > 99 ? '99+' : notices.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-1.5rem))] rounded-xl border border-line bg-surface shadow-pop">
          <p className="border-b border-line px-4 py-2.5 text-sm font-semibold text-ink">Needs attention</p>
          {notices.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-mute">You’re caught up.</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
              {notices.slice(0, 30).map((n) => (
                <li key={n.id}>
                  <Link to={n.to} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-2.5 hover:bg-sunken">
                    <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', DOT[n.tone])} aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">{n.title}</span>
                      <span className="block text-xs text-mute">{n.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
