import { useToday } from '@/hooks/useToday';
import { followUpState, formatDate, relativeDay } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Follow-up date with overdue / today highlighting. */
export function FollowUp({ date, className, closed }: { date: string | null | undefined; className?: string; closed?: boolean }) {
  const today = useToday();
  if (!date) return <span className={cn('text-mute', className)}>—</span>;
  const state = closed ? 'upcoming' : followUpState(date, today);
  return (
    <span
      className={cn(
        'whitespace-nowrap',
        state === 'overdue' && 'font-semibold text-danger',
        state === 'today' && 'font-semibold text-warn-ink',
        state === 'upcoming' && 'text-ink-soft',
        className,
      )}
    >
      {state === 'overdue' && <span className="sr-only">Overdue: </span>}
      {state === 'overdue' ? `Overdue · ${formatDate(date)}` : state === 'today' ? 'Today' : `${formatDate(date)}`}
      {state === 'upcoming' && <span className="ml-1 text-xs text-mute">{relativeDay(date, today)}</span>}
    </span>
  );
}
