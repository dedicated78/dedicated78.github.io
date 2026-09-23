import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../state/AppContext';
import type { AnalyticsSnapshot, Campaign, Platform, Recommendation, Strategy, StrategyContent } from '../lib/types';
import { PLATFORMS } from '../lib/types';
import { PLATFORM_META } from '../lib/platforms';
import { addDays, fmtDate, parseDateInput, startOfWeek, toDateInput } from '../lib/util';
import { channelContexts, latestByPlatform } from '../lib/analytics';
import { saveGeneratedItems } from '../lib/records';
import { AiLabel, ChipToggle, Confirm, Empty, InternalPlanNote, Modal, PageHeader, PlatformBadge, Segmented, Spinner } from '../components/ui';
import { StrategyEditor } from '../components/StrategyEditor';
import { IconCalendar, IconSpark } from '../components/Icons';

const QUICK_PROMPTS = [
  'Launch a spring promotion for our main offer and drive booked consultations',
  'Build authority with educational content that answers the top 5 customer questions',
  'Turn recent client results into a proof-driven campaign',
  'Grow LinkedIn visibility with founder-led thought leadership',
];

export function CommandCenter() {
  const app = useWorkspace();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [brief, setBrief] = useState('');
  const [platforms, setPlatforms] = useState<Platform[]>([...PLATFORMS]);
  const nextMonday = addDays(startOfWeek(new Date()), 7);
  const [start, setStart] = useState(toDateInput(nextMonday));
  const [end, setEnd] = useState(toDateInput(addDays(nextMonday, 27)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [current, setCurrent] = useState<Strategy | null>(null);
  const [draft, setDraft] = useState<StrategyContent | null>(null);
  const [dirty, setDirty] = useState(false);
  const [selectedRecs, setSelectedRecs] = useState<Recommendation[]>([]);
  const [calOpen, setCalOpen] = useState(false);
  const [archiveAsk, setArchiveAsk] = useState(false);

  const load = useCallback(async () => {
    const [ss, recs] = await Promise.all([
      app.db.list<Strategy>('strategies', { workspace_id: app.workspace.id }, { column: 'created_at', ascending: false }),
      app.db.list<Recommendation>('recommendations', { workspace_id: app.workspace.id, status: 'selected' }),
    ]);
    const active = ss.filter((s) => s.status !== 'archived');
    setStrategies(active);
    setSelectedRecs(recs);
    const want = params.get('strategy');
    const pick = active.find((s) => s.id === want) ?? active[0] ?? null;
    setCurrent(pick);
    setDraft(pick?.content ?? null);
    setDirty(false);
  }, [app.db, app.workspace.id, params]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selectedRecs.length) setBrief((b) => b || `Next campaign built on analytics findings: ${selectedRecs.map((r) => r.proposed_action).join(' ')}`);
  }, [selectedRecs]);

  const generate = async () => {
    if (!app.brand) return;
    setBusy(true);
    setError(null);
    try {
      const snaps = await app.db.list<AnalyticsSnapshot>('analytics_snapshots', { workspace_id: app.workspace.id });
      const res = await app.backend.copilot.strategy({
        brief,
        platforms,
        start_date: start,
        end_date: end,
        brand: app.brand,
        channel_context: channelContexts(latestByPlatform(snaps.filter((s) => platforms.includes(s.platform)))),
        recommendations: selectedRecs.map((r) => ({ finding: r.finding, proposed_action: r.proposed_action, platform: r.platform })),
      });
      const s = await app.db.insert<Strategy>('strategies', {
        workspace_id: app.workspace.id,
        title: res.data.title,
        brief,
        platforms,
        start_date: start,
        end_date: end,
        status: 'draft',
        content: res.data.content,
        source_recommendation_ids: selectedRecs.map((r) => r.id),
        ai_provenance: res.provenance,
      });
      for (const r of selectedRecs) await app.db.update<Recommendation>('recommendations', r.id, { status: 'applied' });
      app.notify('Strategy ready — review and edit before generating a calendar', 'success');
      setParams({ strategy: s.id });
    } catch (e) {
      setError((e as Error).message);
      app.notify('Strategy generation failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveStrategy = async () => {
    if (!current || !draft) return;
    const s = await app.db.update<Strategy>('strategies', current.id, {
      content: draft,
      status: 'saved',
      ai_provenance: current.ai_provenance ? { ...current.ai_provenance, edited_by_user: true } : null,
    });
    setCurrent(s);
    setStrategies((ss) => ss.map((x) => (x.id === s.id ? s : x)));
    setDirty(false);
    app.notify('Strategy saved', 'success');
  };

  if (!app.brand) {
    return (
      <>
        <PageHeader title="Command Center" />
        <Empty title="Finish your brand profile first" action={<Link className="btn btn-primary" to="/brand">Complete brand profile</Link>}>
          Agents write from your brand voice, audience, offers and prohibited topics.
        </Empty>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Command Center" subtitle="Brief the Social Strategy Director. It delegates to the Instagram, LinkedIn and X specialists and returns one editable strategy." />
      <div className="cc-grid">
        <section className="card composer" aria-labelledby="brief-h">
          <h2 id="brief-h">Campaign brief</h2>
          <label htmlFor="brief" className="sr-only">
            Campaign objective and brief
          </label>
          <textarea id="brief" rows={5} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="What should this campaign achieve? Include the offer, timing, audience nuance and any must-say points." />
          <div className="quick-prompts" aria-label="Quick prompts">
            {QUICK_PROMPTS.map((q) => (
              <button key={q} className="chip" onClick={() => setBrief(q)}>
                {q}
              </button>
            ))}
          </div>
          {selectedRecs.length > 0 && (
            <div className="rec-carry" role="note">
              <IconSpark width={16} height={16} /> Using {selectedRecs.length} selected analytics finding{selectedRecs.length > 1 ? 's' : ''} as experiments.{' '}
              <button
                className="link-btn"
                onClick={async () => {
                  for (const r of selectedRecs) await app.db.update<Recommendation>('recommendations', r.id, { status: 'new' });
                  setSelectedRecs([]);
                }}
              >
                Clear
              </button>
            </div>
          )}
          <div className="composer-row">
            <div role="group" aria-label="Channels" className="chips">
              {PLATFORMS.map((p) => (
                <ChipToggle key={p} on={platforms.includes(p)} onClick={() => setPlatforms((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]))}>
                  {PLATFORM_META[p].label}
                </ChipToggle>
              ))}
            </div>
            <div className="date-pair">
              <label htmlFor="cc-start">From</label>
              <input id="cc-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              <label htmlFor="cc-end">to</label>
              <input id="cc-end" type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="composer-foot">
            {busy ? (
              <p className="agent-progress" role="status">
                <Spinner /> Social Strategy Director is coordinating {platforms.map((p) => PLATFORM_META[p].specialist).join(', ')}…
              </p>
            ) : (
              <span className="muted small">Draft-only: nothing is posted or scheduled externally.</span>
            )}
            <button className="btn btn-primary" onClick={generate} disabled={busy || !brief.trim() || !platforms.length || end < start}>
              <IconSpark width={16} height={16} /> Generate strategy
            </button>
          </div>
        </section>

        <aside className="card brand-panel" aria-labelledby="bp-h">
          <div className="panel-head">
            <h2 id="bp-h">Brand context</h2>
            <Link to="/brand" className="small">
              Edit
            </Link>
          </div>
          <dl>
            <dt>Audience</dt>
            <dd>{app.brand.audience || <span className="muted">Not set</span>}</dd>
            <dt>Voice</dt>
            <dd>{app.brand.voice || <span className="muted">Not set</span>}</dd>
            <dt>Goals</dt>
            <dd>{app.brand.goals || <span className="muted">Not set</span>}</dd>
            <dt>Prohibited topics</dt>
            <dd>{app.brand.prohibited_topics.length ? app.brand.prohibited_topics.map((t) => <span key={t} className="tag">{t}</span>) : <span className="muted">None listed</span>}</dd>
          </dl>
        </aside>
      </div>

      <section className="card strategy-card" aria-labelledby="strat-h">
        <div className="panel-head wrap">
          <div>
            <h2 id="strat-h">{current ? current.title : 'Strategy'}</h2>
            {current && (
              <p className="muted small">
                {current.platforms.map((p) => (
                  <PlatformBadge key={p} platform={p} compact />
                ))}{' '}
                {fmtDate(current.start_date)} – {fmtDate(current.end_date)} · {current.status === 'saved' ? 'Saved' : 'Unsaved AI draft'} <AiLabel provenance={current.ai_provenance} />
              </p>
            )}
          </div>
          {strategies.length > 1 && (
            <div className="field inline">
              <label htmlFor="strat-pick">Strategy</label>
              <select id="strat-pick" value={current?.id} onChange={(e) => setParams({ strategy: e.target.value })}>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({fmtDate(s.created_at)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        {!current || !draft ? (
          <Empty title="No strategy yet">Write a brief above or pick a quick prompt. The strategy appears here as editable sections.</Empty>
        ) : (
          <>
            <StrategyEditor
              value={draft}
              onChange={(v) => {
                setDraft(v);
                setDirty(true);
              }}
            />
            <div className="sticky-actions">
              <button className="btn btn-ghost" onClick={() => setArchiveAsk(true)}>
                Archive
              </button>
              <button className="btn btn-ghost" onClick={saveStrategy} disabled={!dirty && current.status === 'saved'}>
                {dirty ? 'Save changes' : current.status === 'saved' ? 'Saved' : 'Save strategy'}
              </button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (dirty || current.status !== 'saved') await saveStrategy();
                  setCalOpen(true);
                }}
              >
                <IconCalendar width={16} height={16} /> Generate calendar
              </button>
            </div>
          </>
        )}
      </section>

      {calOpen && current && draft && (
        <GenerateCalendarModal
          strategy={{ ...current, content: draft }}
          onClose={() => setCalOpen(false)}
          onDone={(from) => {
            setCalOpen(false);
            nav(`/calendar?date=${from}`);
          }}
        />
      )}
      {archiveAsk && current && (
        <Confirm
          title="Archive this strategy?"
          body="It will be hidden from the Command Center. Calendar items and drafts created from it are kept."
          confirmLabel="Archive"
          onCancel={() => setArchiveAsk(false)}
          onConfirm={async () => {
            setArchiveAsk(false);
            await app.db.update<Strategy>('strategies', current.id, { status: 'archived' });
            setParams({});
            load();
          }}
        />
      )}
    </>
  );
}

function GenerateCalendarModal({ strategy, onClose, onDone }: { strategy: Strategy; onClose: () => void; onDone: (from: string) => void }) {
  const app = useWorkspace();
  const [span, setSpan] = useState<'week' | 'month'>('week');
  const [from, setFrom] = useState(strategy.start_date);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const to = toDateInput(span === 'week' ? addDays(parseDateInput(from), 6) : addDays(parseDateInput(from), 29));

  const run = async () => {
    if (!app.brand) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await app.backend.copilot.calendar({ strategy: strategy.content, platforms: strategy.platforms, start_date: from, end_date: to, brand: app.brand });
      const campaign = await app.db.insert<Campaign>('campaigns', {
        workspace_id: app.workspace.id,
        strategy_id: strategy.id,
        name: `${strategy.title} · ${fmtDate(from)}–${fmtDate(to)}`,
        objective: strategy.content.objective,
        start_date: from,
        end_date: to,
      });
      const items = await saveGeneratedItems(app.db, app.workspace.id, campaign.id, strategy.id, res.data, res.provenance);
      app.notify(`${items.length} calendar items drafted (internal plan only)`, 'success');
      onDone(from);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Generate calendar"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={run} disabled={busy}>
            {busy ? 'Drafting…' : 'Generate'}
          </button>
        </>
      }
    >
      <Segmented
        label="Calendar span"
        value={span}
        onChange={setSpan}
        options={[
          { value: 'week', label: 'Weekly' },
          { value: 'month', label: 'Monthly (30 days)' },
        ]}
      />
      <div className="field">
        <label htmlFor="gc-from">Starting</label>
        <input id="gc-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <p className="muted small">
        {fmtDate(from)} – {fmtDate(to)} · {strategy.content.cadence.filter((c) => strategy.platforms.includes(c.platform)).map((c) => `${PLATFORM_META[c.platform].label} ${c.postsPerWeek}/wk`).join(' · ')}
      </p>
      <p>
        <InternalPlanNote /> Dates are planning records. Nothing is scheduled on Instagram, LinkedIn or X.
      </p>
      {busy && (
        <p className="agent-progress" role="status">
          <Spinner /> Director is slotting the plan; specialists are drafting channel-native copy…
        </p>
      )}
      {err && (
        <p className="form-error" role="alert">
          {err}
        </p>
      )}
    </Modal>
  );
}
