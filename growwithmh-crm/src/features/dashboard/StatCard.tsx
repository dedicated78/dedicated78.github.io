import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'danger' | 'warn' | 'good';

const VALUE_TONE: Record<Tone, string> = {
  default: 'text-ink',
  danger: 'text-danger',
  warn: 'text-warn-ink',
  good: 'text-pos-ink',
};

export function StatCard({ label, value, to, tone = 'default', hint, loading }: { label: string; value: number | string; to?: string; tone?: Tone; hint?: string; loading?: boolean }) {
  const body = (
    <>
      <p className="text-xs font-medium text-mute">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold tabular-nums tracking-tight', value === 0 && tone !== 'default' ? 'text-ink' : VALUE_TONE[tone], loading && 'opacity-30')}>{loading ? '–' : value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-mute">{hint}</p>}
    </>
  );
  const cls = 'block rounded-card border border-line bg-surface px-4 py-3.5 shadow-card';
  return to ? (
    <Link to={to} className={cn(cls, 'transition-colors hover:border-brand-200 hover:bg-brand-50/40')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function StatGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: 4 | 7 }) {
  return <div className={cn('mb-6 grid grid-cols-2 gap-3', cols === 4 ? 'lg:grid-cols-4' : 'sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7')}>{children}</div>;
}
