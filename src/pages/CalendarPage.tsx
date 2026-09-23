import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../state/AppContext';
import type { CalendarItem, Draft, ItemStatus, Platform } from '../lib/types';
import { PLATFORMS, STATUSES } from '../lib/types';
import { PLATFORM_META, STATUS_META } from '../lib/platforms';
import { addDays, cx, fmtTime, parseDateInput, sameDay, startOfWeek, toDateInput } from '../lib/util';
import { emptyVariant } from '../lib/records';
import { ChipToggle, Empty, Field, InternalPlanNote, Modal, PageHeader, PlatformBadge, Segmented, StatusPill } from '../components/ui';
import { IconChevronLeft, IconChevronRight, IconPlus } from '../components/Icons';

export function CalendarPage() {
  const app = useWorkspace();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<'month' | 'week'>((params.get('view') as 'week') || 'month');
  const anchor = params.get('date') ? parseDateInput(params.get('date')!) : new Date();
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([...PLATFORMS]);
  const [statuses, setStatuses] = useState<ItemStatus[]>(['idea', 'draft', 'ready']);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    app.db.list<CalendarItem>('calendar_items', { workspace_id: app.workspace.id }, { column: 'planned_at' }).then(setItems);
  }, [app.db, app.workspace.id]);

  const days = useMemo(() => {
    if (view === 'week') {
      const s = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, i) => addDays(s, i));
    }
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const s = startOfWeek(first);
    return Array.from({ length: 42 }, (_, i) => addDays(s, i));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, params.get('date')]);

  const shown = items.filter((i) => platforms.includes(i.platform) && statuses.includes(i.status));
  const move = (dir: number) => {
    const d = view === 'week' ? addDays(anchor, 7 * dir) : new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
    setParams({ date: toDateInput(d), view });
  };
  const title =
    view === 'month'
      ? anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : `Week of ${startOfWeek(anchor).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle={
          <>
            <InternalPlanNote /> Planned dates are internal. Copy Ready drafts into your publishing tool manually.
          </>
        }
        actions={
          <button className="btn btn-primary" onClick={() => setCreating(toDateInput(new Date()))}>
            <IconPlus width={16} height={16} /> New idea
          </button>
        }
      />
      <div className="toolbar">
        <div className="toolbar-group">
          <button className="icon-btn" onClick={() => move(-1)} aria-label={`Previous ${view}`}>
            <IconChevronLeft />
          </button>
          <h2 className="cal-title" aria-live="polite">
            {title}
          </h2>
          <button className="icon-btn" onClick={() => move(1)} aria-label={`Next ${view}`}>
            <IconChevronRight />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setParams({ view })}>
            Today
          </button>
        </div>
        <Segmented
          label="Calendar view"
          value={view}
          onChange={(v) => {
            setView(v);
            setParams({ date: toDateInput(anchor), view: v });
          }}
          options={[
            { value: 'month', label: 'Month' },
            { value: 'week', label: 'Week' },
          ]}
        />
      </div>
      <div className="toolbar filters">
        <div className="chips" role="group" aria-label="Filter by channel">
          {PLATFORMS.map((p) => (
            <ChipToggle key={p} on={platforms.includes(p)} onClick={() => setPlatforms((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]))}>
              <PlatformBadge platform={p} />
            </ChipToggle>
          ))}
        </div>
        <div className="chips" role="group" aria-label="Filter by status">
          {STATUSES.map((s) => (
            <ChipToggle key={s} on={statuses.includes(s)} onClick={() => setStatuses((ss) => (ss.includes(s) ? ss.filter((x) => x !== s) : [...ss, s]))}>
              {STATUS_META[s].label}
            </ChipToggle>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <Empty title="Your calendar is empty" action={<Link className="btn btn-primary" to="/">Open Command Center</Link>}>
          Generate a strategy, then a weekly or monthly calendar — or add a single idea with “New idea”.
        </Empty>
      ) : (
        <div className={cx('cal', `cal-${view}`)} role="grid" aria-label={title}>
          <div className="cal-dow" role="row">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} role="columnheader">
                {d}
              </div>
            ))}
          </div>
          <div className="cal-body">
            {days.map((d) => {
              const dayItems = shown.filter((i) => sameDay(new Date(i.planned_at), d));
              const out = view === 'month' && d.getMonth() !== anchor.getMonth();
              const today = sameDay(d, new Date());
              const max = view === 'month' ? 3 : 20;
              return (
                <div key={d.toISOString()} className={cx('cal-cell', out && 'out', today && 'today')} role="gridcell" aria-label={d.toDateString()}>
                  <div className="cal-date">
                    <span>{view === 'week' ? d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }) : d.getDate()}</span>
                    <button className="icon-btn icon-btn-xs add-here" aria-label={`Add idea on ${d.toDateString()}`} onClick={() => setCreating(toDateInput(d))}>
                      <IconPlus width={14} height={14} />
                    </button>
                  </div>
                  {dayItems.slice(0, max).map((i) => (
                    <button key={i.id} className={cx('cal-card', `cc-${i.platform}`, i.status === 'archived' && 'is-archived')} onClick={() => nav(`/drafts/${i.id}`)}>
                      <span className="cal-card-top">
                        <PlatformBadge platform={i.platform} compact />
                        <time>{fmtTime(i.planned_at)}</time>
                      </span>
                      <span className="cal-card-title">{i.title}</span>
                      <span className="cal-card-meta">
                        <span className="pillar">{i.pillar}</span>
                        <StatusPill status={i.status} />
                      </span>
                    </button>
                  ))}
                  {dayItems.length > max && (
                    <button className="link-btn small" onClick={() => {
                        setView('week');
                        setParams({ date: toDateInput(d), view: 'week' });
                      }}
                    >
                      +{dayItems.length - max} more
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {creating && <NewItemModal date={creating} onClose={() => setCreating(null)} onCreated={(id) => nav(`/drafts/${id}`)} />}
    </>
  );
}

export function NewItemModal({ date, onClose, onCreated }: { date: string; onClose: () => void; onCreated: (id: string) => void }) {
  const app = useWorkspace();
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [title, setTitle] = useState('');
  const [day, setDay] = useState(date);
  const [time, setTime] = useState('10:00');
  const [pillar, setPillar] = useState('');
  const [format, setFormat] = useState(PLATFORM_META.instagram.formats[0]);
  const create = async () => {
    const [h, m] = time.split(':').map(Number);
    const d = parseDateInput(day);
    d.setHours(h, m);
    const item = await app.db.insert<CalendarItem>('calendar_items', {
      workspace_id: app.workspace.id,
      campaign_id: null,
      strategy_id: null,
      planned_at: d.toISOString(),
      platform,
      title: title.trim(),
      pillar: pillar.trim() || 'Unassigned',
      format,
      objective: '',
      notes: '',
      status: 'idea',
    });
    await app.db.insert<Draft>('drafts', { workspace_id: app.workspace.id, calendar_item_id: item.id, body: '', cta: '', hashtags: [], variants: { [platform]: emptyVariant() }, ai_provenance: null, current_version: 0 });
    onCreated(item.id);
  };
  return (
    <Modal
      title="New idea"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={create} disabled={!title.trim()}>
            Create idea
          </button>
        </>
      }
    >
      <Field id="ni-title" label="Idea">
        <input id="ni-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Before/after of the Maple St. project" />
      </Field>
      <div className="grid-2">
        <Field id="ni-platform" label="Channel">
          <select
            id="ni-platform"
            value={platform}
            onChange={(e) => {
              const p = e.target.value as Platform;
              setPlatform(p);
              setFormat(PLATFORM_META[p].formats[0]);
            }}
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_META[p].label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="ni-format" label="Format">
          <select id="ni-format" value={format} onChange={(e) => setFormat(e.target.value)}>
            {PLATFORM_META[platform].formats.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </Field>
        <Field id="ni-day" label="Planned date (internal)">
          <input id="ni-day" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
        <Field id="ni-time" label="Planned time (internal)">
          <input id="ni-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <Field id="ni-pillar" label="Content pillar">
        <input id="ni-pillar" value={pillar} onChange={(e) => setPillar(e.target.value)} />
      </Field>
    </Modal>
  );
}
