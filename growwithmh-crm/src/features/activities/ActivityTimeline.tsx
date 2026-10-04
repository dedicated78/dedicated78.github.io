import { useState } from 'react';
import { ArrowDownUp, CalendarClock, Mail, MessageCircle, MessageSquare, Phone, StickyNote, Users, type LucideIcon } from 'lucide-react';
import { Badge, Skeleton, type Tone } from '@/components/ui';
import { formatDate, formatDateTime } from '@/lib/format';
import type { Activity, ActivityType } from '@/types';

const ICONS: Record<ActivityType, LucideIcon> = {
  Call: Phone,
  Email: Mail,
  SMS: MessageSquare,
  WhatsApp: MessageCircle,
  Meeting: Users,
  Note: StickyNote,
};

const outcomeTone = (o: string): Tone => {
  if (['Interested', 'Meeting Booked', 'Decision Maker Reached', 'Replied', 'Meeting Held'].includes(o)) return 'green';
  if (['Not Interested', 'Do Not Contact', 'Wrong Number', 'No Show'].includes(o)) return 'red';
  if (['Follow Up', 'Send Information', 'Rescheduled'].includes(o)) return 'amber';
  return 'neutral';
};

interface Props {
  activities: Activity[] | undefined;
  loading?: boolean;
  nameOf: (id: string | null) => string;
  timezone: string;
}

/** Read-only, append-only history. Newest first by default; one click flips it to oldest first. */
export function ActivityTimeline({ activities, loading, nameOf, timezone }: Props) {
  const [oldestFirst, setOldestFirst] = useState(false);

  if (loading) {
    return (
      <div className="space-y-4 p-5" role="status" aria-label="Loading activity">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities?.length) {
    return <p className="px-5 py-8 text-center text-sm text-mute">No activity yet. Log the first call or note to start the history.</p>;
  }

  const rows = oldestFirst ? [...activities].reverse() : activities;

  return (
    <div>
      <div className="flex items-center justify-between px-4 pt-3 sm:px-5">
        <p className="text-xs text-mute">
          {activities.length} {activities.length === 1 ? 'entry' : 'entries'}
        </p>
        <button type="button" onClick={() => setOldestFirst((v) => !v)} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50">
          <ArrowDownUp className="size-3" aria-hidden /> {oldestFirst ? 'Oldest first' : 'Newest first'}
        </button>
      </div>
      <ol className="px-4 py-3 sm:px-5">
        {rows.map((a, i) => {
          const Icon = ICONS[a.activity_type] ?? StickyNote;
          const last = i === rows.length - 1;
          return (
            <li key={a.id} className="relative flex gap-3 pb-5 last:pb-1">
              {!last && <span className="absolute left-4 top-8 -ml-px h-[calc(100%-1.75rem)] w-px bg-line" aria-hidden />}
              <span className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-brand-600">
                <Icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-medium text-ink">{a.activity_type}</span>
                  {a.outcome && <Badge tone={outcomeTone(a.outcome)}>{a.outcome}</Badge>}
                </div>
                <p className="text-xs text-mute">
                  {formatDateTime(a.created_at, timezone)} · {nameOf(a.created_by)}
                </p>
                {a.notes && <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-ink-soft">{a.notes}</p>}
                {(a.next_action || a.follow_up_date) && (
                  <p className="mt-1.5 inline-flex flex-wrap items-center gap-1.5 text-xs text-mute">
                    <CalendarClock className="size-3.5" aria-hidden />
                    {a.next_action && <span>Next: {a.next_action}</span>}
                    {a.follow_up_date && <span>· {formatDate(a.follow_up_date)}</span>}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
