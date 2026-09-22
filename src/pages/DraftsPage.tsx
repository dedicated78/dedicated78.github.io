import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../state/AppContext';
import type { CalendarItem, Draft, ItemStatus, Platform } from '../lib/types';
import { PLATFORMS, STATUSES } from '../lib/types';
import { STATUS_META } from '../lib/platforms';
import { copyText, fmtDateTime } from '../lib/util';
import { copyableText } from '../lib/records';
import { AiLabel, ChipToggle, Empty, InternalPlanNote, PageHeader, PlatformBadge, StatusPill } from '../components/ui';
import { IconCopy } from '../components/Icons';

export function DraftsPage() {
  const app = useWorkspace();
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [drafts, setDrafts] = useState<Map<string, Draft>>(new Map());
  const [platforms, setPlatforms] = useState<Platform[]>([...PLATFORMS]);
  const [status, setStatus] = useState<ItemStatus | 'active'>('active');
  const [q, setQ] = useState('');

  useEffect(() => {
    Promise.all([
      app.db.list<CalendarItem>('calendar_items', { workspace_id: app.workspace.id }, { column: 'planned_at' }),
      app.db.list<Draft>('drafts', { workspace_id: app.workspace.id }),
    ]).then(([i, d]) => {
      setItems(i);
      setDrafts(new Map(d.map((x) => [x.calendar_item_id, x])));
    });
  }, [app.db, app.workspace.id]);

  const shown = useMemo(
    () =>
      items.filter(
        (i) =>
          platforms.includes(i.platform) &&
          (status === 'active' ? i.status !== 'archived' : i.status === status) &&
          (!q.trim() || `${i.title} ${i.pillar} ${drafts.get(i.id)?.body ?? ''}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [items, platforms, status, q, drafts],
  );
  const counts = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s, items.filter((i) => i.status === s).length])), [items]);

  const setItemStatus = async (item: CalendarItem, s: ItemStatus) => {
    if (s === 'ready' && !drafts.get(item.id)?.body.trim()) {
      app.notify('Add draft copy before marking Ready', 'error');
      return;
    }
    const u = await app.db.update<CalendarItem>('calendar_items', item.id, { status: s });
    setItems((is) => is.map((i) => (i.id === u.id ? u : i)));
  };

  return (
    <>
      <PageHeader title="Drafts" subtitle="Every draft moves Idea → Draft → Ready → Archived. Ready means approved for manual publishing — nothing is sent anywhere." />
      <div className="toolbar filters">
        <div className="chips" role="group" aria-label="Filter by status">
          <ChipToggle on={status === 'active'} onClick={() => setStatus('active')}>
            All active
          </ChipToggle>
          {STATUSES.map((s) => (
            <ChipToggle key={s} on={status === s} onClick={() => setStatus(s)}>
              {STATUS_META[s].label} <span className="count">{counts[s]}</span>
            </ChipToggle>
          ))}
        </div>
        <div className="chips" role="group" aria-label="Filter by channel">
          {PLATFORMS.map((p) => (
            <ChipToggle key={p} on={platforms.includes(p)} onClick={() => setPlatforms((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]))}>
              <PlatformBadge platform={p} />
            </ChipToggle>
          ))}
        </div>
        <input type="search" className="filter-search" placeholder="Filter drafts" aria-label="Filter drafts" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {items.length === 0 ? (
        <Empty title="No drafts yet" action={<Link className="btn btn-primary" to="/">Open Command Center</Link>}>
          Generate a calendar to get platform-native drafts, or add an idea from the Calendar.
        </Empty>
      ) : shown.length === 0 ? (
        <Empty title="Nothing matches these filters">Try another status or channel.</Empty>
      ) : (
        <ul className="draft-list">
          {shown.map((i) => {
            const d = drafts.get(i.id);
            return (
              <li key={i.id} className="draft-row card">
                <div className="draft-row-main">
                  <div className="draft-row-top">
                    <PlatformBadge platform={i.platform} />
                    <span className="muted small">
                      {fmtDateTime(i.planned_at)} · <InternalPlanNote />
                    </span>
                    <AiLabel provenance={d?.ai_provenance} />
                  </div>
                  <Link to={`/drafts/${i.id}`} className="draft-title">
                    {i.title}
                  </Link>
                  <p className="draft-excerpt">{d?.body ? d.body.slice(0, 180) + (d.body.length > 180 ? '…' : '') : <span className="muted">No copy yet</span>}</p>
                  <p className="muted small">
                    {i.pillar} · {i.format}
                  </p>
                </div>
                <div className="draft-row-side">
                  <StatusPill status={i.status} />
                  <label className="sr-only" htmlFor={`st-${i.id}`}>
                    Status for {i.title}
                  </label>
                  <select id={`st-${i.id}`} value={i.status} onChange={(e) => setItemStatus(i, e.target.value as ItemStatus)}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_META[s].label}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={!d?.body}
                    onClick={async () => {
                      const v = d?.variants[i.platform];
                      if (v && (await copyText(copyableText(i.platform, v)))) app.notify('Draft copied — paste it into your publishing tool', 'success');
                    }}
                  >
                    <IconCopy width={16} height={16} /> Copy Draft
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
