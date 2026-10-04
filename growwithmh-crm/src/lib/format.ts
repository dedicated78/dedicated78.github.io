// Date helpers. "Dates" (follow-ups) are plain YYYY-MM-DD strings; "today" is evaluated in the company timezone.

export const DEFAULT_TZ = 'Asia/Riyadh';

const safeTz = (tz: string): string => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
};

export function todayISO(tz: string = DEFAULT_TZ, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: safeTz(tz), year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type FollowUpState = 'overdue' | 'today' | 'upcoming' | 'none';

export function followUpState(date: string | null | undefined, today: string): FollowUpState {
  if (!date) return 'none';
  if (date < today) return 'overdue';
  if (date === today) return 'today';
  return 'upcoming';
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((Date.parse(`${toISO}T00:00:00Z`) - Date.parse(`${fromISO}T00:00:00Z`)) / 86_400_000);
}

export function formatDate(iso: string | null | undefined, opts?: { year?: boolean }): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: opts?.year === false ? undefined : opts?.year ? 'numeric' : d.getUTCFullYear() === new Date().getUTCFullYear() ? undefined : 'numeric',
    timeZone: iso.length === 10 ? 'UTC' : undefined,
  }).format(d);
}

export function formatDateTime(ts: string | null | undefined, tz: string = DEFAULT_TZ): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: safeTz(tz),
  }).format(d);
}

/** "Today", "Tomorrow", "Yesterday", "in 3 days", "5 days ago" for a YYYY-MM-DD relative to today. */
export function relativeDay(iso: string | null | undefined, today: string): string {
  if (!iso) return '';
  const n = daysBetween(today, iso);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
}

export function formatMoney(value: number | string | null | undefined, currency = 'USD'): string {
  const n = Number(value ?? 0);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
  } catch {
    return `${currency} ${n}`;
  }
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

// ---- datetime-local <-> timestamptz, interpreted in the company timezone --------------------

function tzOffsetMs(utcMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTz(tz),
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** "2026-10-08T14:30" (wall time in tz) → ISO timestamp. */
export function zonedInputToISO(value: string, tz: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let utc = wall - tzOffsetMs(wall, tz);
  utc = wall - tzOffsetMs(utc, tz); // second pass handles DST edges
  return new Date(utc).toISOString();
}

/** ISO timestamp → "YYYY-MM-DDTHH:mm" wall time in tz, for <input type="datetime-local">. */
export function isoToZonedInput(iso: string | null | undefined, tz: string): string {
  if (!iso) return '';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  return new Date(ms + tzOffsetMs(ms, tz)).toISOString().slice(0, 16);
}
