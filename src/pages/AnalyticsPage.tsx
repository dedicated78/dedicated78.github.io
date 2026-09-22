import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../state/AppContext';
import type { AnalyticsSnapshot, MetricKey, Platform, PostMetric, Recommendation, SocialConnection } from '../lib/types';
import { PLATFORMS } from '../lib/types';
import { PLATFORM_META } from '../lib/platforms';
import {
  buildEvidence,
  change,
  covers,
  engagementRate,
  groupBy,
  latestByPlatform,
  periodLabel,
  postsIn,
  previousRange,
  rangeForDays,
  sumMetric,
  topPosts,
  weeklySeries,
  type Range,
} from '../lib/analytics';
import { cx, fmtDate, fmtDateTime, fmtNum, fmtPct, parseDateInput } from '../lib/util';
import { AiLabel, ChipToggle, Empty, PageHeader, PlatformBadge, Segmented, Spinner } from '../components/ui';
import { BarChart, LineChart } from '../components/Charts';
import { IconSpark, IconSync, IconTable } from '../components/Icons';

type Preset = '7' | '30' | '90' | 'custom';

export function AnalyticsPage() {
  const app = useWorkspace();
  const nav = useNavigate();
  const [conns, setConns] = useState<SocialConnection[]>([]);
  const [snaps, setSnaps] = useState<AnalyticsSnapshot[]>([]);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([...PLATFORMS]);
  const [preset, setPreset] = useState<Preset>('30');
  const [cFrom, setCFrom] = useState('');
  const [cTo, setCTo] = useState('');
  const [dim, setDim] = useState<'pillar' | 'format'>('pillar');
  const [table, setTable] = useState(false);
  const [busy, setBusy] = useState<'sync' | 'findings' | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const ws = app.workspace.id;
    const [c, s, r] = await Promise.all([
      app.db.list<SocialConnection>('social_connections', { workspace_id: ws }),
      app.db.list<AnalyticsSnapshot>('analytics_snapshots', { workspace_id: ws }, { column: 'retrieved_at', ascending: false }),
      app.db.list<Recommendation>('recommendations', { workspace_id: ws }, { column: 'created_at', ascending: false }),
    ]);
    setConns(c);
    setSnaps(s);
    setRecs(r.filter((x) => x.status === 'new' || x.status === 'selected'));
    setLoaded(true);
  }, [app.db, app.workspace.id]);
  useEffect(() => {
    load();
  }, [load]);

  const range: Range = useMemo(() => {
    if (preset === 'custom' && cFrom && cTo) {
      const to = parseDateInput(cTo);
      to.setHours(23, 59, 59, 999);
      return { from: parseDateInput(cFrom), to };
    }
    return rangeForDays(preset === 'custom' ? 30 : Number(preset));
  }, [preset, cFrom, cTo]);
  const prev = previousRange(range);

  const latest = useMemo(() => {
    const l = latestByPlatform(snaps);
    return Object.fromEntries(Object.entries(l).filter(([p]) => platforms.includes(p as Platform))) as Partial<Record<Platform, AnalyticsSnapshot>>;
  }, [snaps, platforms]);
  const active = Object.values(latest).filter(Boolean) as AnalyticsSnapshot[];

  const sync = async () => {
    const targets = conns.filter((c) => c.state === 'connected' && platforms.includes(c.platform));
    if (!targets.length) {
      app.notify('No connected channels in this filter', 'error');
      return;
    }
    setBusy('sync');
    try {
      for (const c of targets) {
        try {
          await app.backend.social.sync(c.id, 120);
          app.notify(`${PLATFORM_META[c.platform].label} metrics synced`, 'success');
        } catch (e) {
          app.notify(`${PLATFORM_META[c.platform].label}: ${(e as Error).message}`, 'error');
        }
      }
      await load();
    } finally {
      setBusy(null);
    }
  };

  const findings = async () => {
    if (!app.brand) return;
    const { evidence, aggregates } = buildEvidence(latest, range);
    if (!evidence.length) {
      app.notify('No metrics in this period to analyze', 'error');
      return;
    }
    setBusy('findings');
    try {
      const res = await app.backend.copilot.findings({ brand: app.brand, evidence, aggregates });
      const byRef = new Map(evidence.map((e) => [e.ref, e]));
      // Governance: drop any finding that doesn't cite at least one real evidence row.
      const rows = res.data
        .map((f) => ({ ...f, ev: f.evidence_refs.map((r) => byRef.get(r)).filter(Boolean) }))
        .filter((f) => f.ev.length > 0)
        .map((f) => ({
          workspace_id: app.workspace.id,
          platform: f.platform,
          finding: f.finding,
          proposed_action: f.proposed_action,
          evidence: f.ev as Recommendation['evidence'],
          status: 'new' as const,
          ai_provenance: res.provenance,
        }));
      for (const old of recs.filter((r) => r.status === 'new')) await app.db.update<Recommendation>('recommendations', old.id, { status: 'dismissed' });
      await app.db.insertMany<Recommendation>('recommendations', rows);
      app.notify(`${rows.length} evidence-backed findings`, 'success');
      await load();
    } catch (e) {
      app.notify((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const setRec = async (r: Recommendation, status: Recommendation['status']) => {
    const u = await app.db.update<Recommendation>('recommendations', r.id, { status });
    setRecs((rs) => (status === 'dismissed' ? rs.filter((x) => x.id !== r.id) : rs.map((x) => (x.id === r.id ? u : x))));
  };

  if (!loaded) return <Spinner />;
  const connected = conns.filter((c) => c.state === 'connected');
  const selected = recs.filter((r) => r.status === 'selected');

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Imported platform metrics only. Anything a connection doesn't report is shown as “Not available”, never estimated."
        actions={
          <button className="btn btn-primary" onClick={sync} disabled={!!busy || !connected.length}>
            {busy === 'sync' ? <Spinner /> : <IconSync width={16} height={16} />} Sync metrics
          </button>
        }
      />
      <div className="toolbar filters">
        <div className="chips" role="group" aria-label="Filter by channel">
          {PLATFORMS.map((p) => (
            <ChipToggle key={p} on={platforms.includes(p)} onClick={() => setPlatforms((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]))}>
              <PlatformBadge platform={p} />
            </ChipToggle>
          ))}
        </div>
        <Segmented
          label="Date range"
          value={preset}
          onChange={setPreset}
          options={[
            { value: '7', label: '7 days' },
            { value: '30', label: '30 days' },
            { value: '90', label: '90 days' },
            { value: 'custom', label: 'Custom' },
          ]}
        />
        {preset === 'custom' && (
          <div className="date-pair">
            <label htmlFor="an-from">From</label>
            <input id="an-from" type="date" value={cFrom} onChange={(e) => setCFrom(e.target.value)} />
            <label htmlFor="an-to">to</label>
            <input id="an-to" type="date" value={cTo} min={cFrom} onChange={(e) => setCTo(e.target.value)} />
          </div>
        )}
        <button className={cx('btn btn-ghost btn-sm', table && 'btn-on')} aria-pressed={table} onClick={() => setTable((t) => !t)}>
          <IconTable width={16} height={16} /> Table view
        </button>
      </div>

      {conns.length === 0 ? (
        <Empty title="No channels connected" action={<Link className="btn btn-primary" to="/connections">Connect channels</Link>}>
          Connect Instagram, LinkedIn or X with read-only access to import content and performance data.
        </Empty>
      ) : active.length === 0 ? (
        <Empty title="No metrics imported yet" action={connected.length ? <button className="btn btn-primary" onClick={sync}>Sync metrics</button> : <Link className="btn btn-primary" to="/connections">Reconnect a channel</Link>}>
          Sync pulls recent posts and whatever engagement data each platform exposes.
        </Empty>
      ) : (
        <div className="an-grid">
          <div className="an-main">
            <p className="sources small muted">
              {periodLabel(range)} · compared with {periodLabel(prev)}.{' '}
              {active.map((s) => (
                <span key={s.id} className="source-chip">
                  {PLATFORM_META[s.platform].label}: {s.source}, retrieved {fmtDateTime(s.retrieved_at)}
                </span>
              ))}
            </p>
            <SummaryCards snaps={active} range={range} prev={prev} />
            <section className="card" aria-labelledby="trend-h">
              <h2 id="trend-h">Engagements {range.to.getTime() - range.from.getTime() < 13 * 86400000 ? 'per day' : 'per week (complete weeks)'}</h2>
              {table ? (
                <TrendTable snaps={active} range={range} />
              ) : (
                <LineChart
                  valueLabel="Engagements"
                  series={active.map((s) => ({ key: s.platform, label: PLATFORM_META[s.platform].label, color: PLATFORM_META[s.platform].color, points: weeklySeries(postsIn(s, range), range, 'engagements') }))}
                />
              )}
            </section>
            <section className="card" aria-labelledby="cmp-h">
              <div className="panel-head">
                <h2 id="cmp-h">Avg engagements per post by {dim}</h2>
                <Segmented
                  label="Compare by"
                  value={dim}
                  onChange={setDim}
                  options={[
                    { value: 'pillar', label: 'Content pillar' },
                    { value: 'format', label: 'Format' },
                  ]}
                />
              </div>
              <GroupCompare snaps={active} range={range} dim={dim} table={table} />
              {dim === 'pillar' && <p className="muted small">Pillars on imported posts come from the connection's classification or matching to your saved pillars; others show as “Unclassified”.</p>}
            </section>
            <section className="card" aria-labelledby="top-h">
              <h2 id="top-h">Top-performing content</h2>
              <TopContent snaps={active} range={range} />
            </section>
            <SyncHistory snaps={snaps.filter((s) => platforms.includes(s.platform))} />
          </div>

          <aside className="an-rail" aria-labelledby="find-h">
            <div className="card rail-card">
              <div className="panel-head">
                <h2 id="find-h">AI Findings</h2>
                <button className="btn btn-ghost btn-sm" onClick={findings} disabled={!!busy}>
                  {busy === 'findings' ? <Spinner /> : <IconSpark width={14} height={14} />} {recs.length ? 'Refresh' : 'Analyze'}
                </button>
              </div>
              <p className="muted small">Each finding cites the metric, channel, period and retrieval time it's based on.</p>
              {recs.length === 0 ? (
                <p className="muted small">Run an analysis for {periodLabel(range)}.</p>
              ) : (
                <ul className="findings">
                  {recs.map((r) => (
                    <li key={r.id} className={cx('finding', r.status === 'selected' && 'finding-on')}>
                      <div className="finding-top">
                        <PlatformBadge platform={r.platform} compact />
                        <AiLabel provenance={r.ai_provenance} />
                      </div>
                      <p className="finding-text">{r.finding}</p>
                      <p className="finding-action">
                        <strong>Try:</strong> {r.proposed_action}
                      </p>
                      <details className="evidence">
                        <summary>Evidence ({r.evidence.length})</summary>
                        <ul>
                          {r.evidence.map((e) => (
                            <li key={e.ref}>
                              <strong>
                                {PLATFORM_META[e.platform].label} · {e.metric}
                              </strong>
                              : {e.value}
                              {e.comparison && <span className="muted"> ({e.comparison})</span>}
                              <div className="muted small">
                                Period {fmtDate(e.period_start)} – {fmtDate(e.period_end)} · retrieved {fmtDateTime(e.retrieved_at)} · {e.source}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </details>
                      <div className="row gap">
                        <label className="check">
                          <input type="checkbox" checked={r.status === 'selected'} onChange={(e) => setRec(r, e.target.checked ? 'selected' : 'new')} /> Use in next strategy
                        </label>
                        <button className="link-btn small" onClick={() => setRec(r, 'dismissed')}>
                          Dismiss
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <button className="btn btn-primary btn-block" disabled={!selected.length} onClick={() => nav('/')}>
                <IconSpark width={16} height={16} /> Build strategy from {selected.length || ''} selected
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function SummaryCards({ snaps, range, prev }: { snaps: AnalyticsSnapshot[]; range: Range; prev: Range }) {
  const cards: { label: string; key: MetricKey | 'posts' | 'rate' }[] = [
    { label: 'Posts', key: 'posts' },
    { label: 'Engagements', key: 'engagements' },
    { label: 'Impressions', key: 'impressions' },
    { label: 'Engagement rate', key: 'rate' },
  ];
  const val = (posts: PostMetric[], k: MetricKey | 'posts' | 'rate') => (k === 'posts' ? posts.length : k === 'rate' ? engagementRate(posts) : sumMetric(posts, k));
  const show = (k: string, v: number | null) => (k === 'rate' ? fmtPct(v, 2) : fmtNum(v));
  return (
    <div className="stat-grid">
      {cards.map((c) => {
        const per = snaps.map((s) => {
          const cur = val(postsIn(s, range), c.key);
          const p = covers(s, prev) ? val(postsIn(s, prev), c.key) : null;
          return { s, cur, ch: c.key === 'rate' ? null : change(cur, p), pp: c.key === 'rate' && cur !== null && p !== null ? cur - p : null };
        });
        const reporting = per.filter((x) => x.cur !== null);
        const total = c.key === 'rate' ? null : reporting.length ? reporting.reduce((a, x) => a + (x.cur ?? 0), 0) : null;
        return (
          <div className="stat card" key={c.key}>
            <h3 className="stat-label">{c.label}</h3>
            {c.key !== 'rate' && (
              <p className="stat-value">
                {fmtNum(total)}
                {reporting.length < per.length && reporting.length > 0 && <span className="stat-foot"> {reporting.length} of {per.length} channels report this</span>}
              </p>
            )}
            <ul className="stat-per">
              {per.map((x) => (
                <li key={x.s.platform}>
                  <PlatformBadge platform={x.s.platform} compact />
                  <span className={cx(x.cur === null && 'na')}>{show(c.key, x.cur)}</span>
                  {x.ch !== null && (
                    <span className={cx('delta', x.ch >= 0 ? 'up' : 'down')}>
                      {x.ch >= 0 ? '▲' : '▼'} {fmtPct(Math.abs(x.ch))}
                    </span>
                  )}
                  {x.pp !== null && (
                    <span className={cx('delta', x.pp >= 0 ? 'up' : 'down')}>
                      {x.pp >= 0 ? '▲' : '▼'} {(Math.abs(x.pp) * 100).toFixed(2)} pts
                    </span>
                  )}
                  {x.cur !== null && x.ch === null && x.pp === null && <span className="delta na">change n/a</span>}
                </li>
              ))}
            </ul>
            {c.key === 'rate' && <p className="stat-foot">Calculated as engagements ÷ impressions where both are reported.</p>}
          </div>
        );
      })}
    </div>
  );
}

function TrendTable({ snaps, range }: { snaps: AnalyticsSnapshot[]; range: Range }) {
  const series = snaps.map((s) => ({ s, pts: weeklySeries(postsIn(s, range), range, 'engagements') }));
  const weeks = series[0]?.pts.map((p) => p.date) ?? [];
  return (
    <div className="table-wrap">
      <table>
        <caption className="sr-only">Engagements per week by channel</caption>
        <thead>
          <tr>
            <th scope="col">Period starting</th>
            {series.map((x) => (
              <th scope="col" key={x.s.platform}>
                {PLATFORM_META[x.s.platform].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((w, i) => (
            <tr key={i}>
              <th scope="row">{fmtDate(w.toISOString())}</th>
              {series.map((x) => (
                <td key={x.s.platform}>{fmtNum(x.pts[i]?.value ?? null)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupCompare({ snaps, range, dim, table }: { snaps: AnalyticsSnapshot[]; range: Range; dim: 'pillar' | 'format'; table: boolean }) {
  const per = snaps.map((s) => ({ s, rows: groupBy(postsIn(s, range), dim) }));
  const groups = [...new Set(per.flatMap((p) => p.rows.map((r) => r.group)))];
  if (!groups.length) return <p className="muted">No posts in this period.</p>;
  const rows = groups.map((g) => ({
    group: g,
    values: per.map((p) => {
      const r = p.rows.find((x) => x.group === g);
      return {
        key: p.s.platform,
        label: PLATFORM_META[p.s.platform].label,
        color: PLATFORM_META[p.s.platform].color,
        value: r ? r.avgEngagements : null,
        detail: r ? `${r.posts} posts · rate ${fmtPct(r.rate, 2)}` : 'No posts',
      };
    }),
  }));
  if (table)
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">{dim === 'pillar' ? 'Pillar' : 'Format'}</th>
              {per.map((p) => (
                <th scope="col" key={p.s.platform}>
                  {PLATFORM_META[p.s.platform].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.group}>
                <th scope="row">{r.group}</th>
                {r.values.map((v) => (
                  <td key={v.key}>
                    {v.value === null ? <span className="muted">{v.detail === 'No posts' ? '—' : 'Not available'}</span> : fmtNum(v.value)} <span className="muted small">{v.value !== null && v.detail}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return <BarChart rows={rows} valueLabel="Avg engagements per post" />;
}

function TopContent({ snaps, range }: { snaps: AnalyticsSnapshot[]; range: Range }) {
  const all = snaps.flatMap((s) => topPosts(postsIn(s, range), 5).map((p) => ({ p, s })));
  all.sort((a, b) => (b.p.metrics.engagements ?? -1) - (a.p.metrics.engagements ?? -1));
  if (!all.length) return <p className="muted">No posts in this period.</p>;
  return (
    <div className="table-wrap">
      <table className="top-table">
        <thead>
          <tr>
            <th scope="col">Post</th>
            <th scope="col">Engagements</th>
            <th scope="col">Impressions</th>
            <th scope="col">Rate</th>
          </tr>
        </thead>
        <tbody>
          {all.slice(0, 6).map(({ p, s }) => (
            <tr key={s.platform + p.id}>
              <td>
                <div className="row gap-sm">
                  <PlatformBadge platform={s.platform} compact />
                  <span className="muted small">
                    {fmtDate(p.published_at)} · {p.format} · {p.pillar}
                  </span>
                </div>
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer noopener">
                    {p.text || 'View post'}
                  </a>
                ) : (
                  <span>{p.text || 'Untitled post'}</span>
                )}
              </td>
              <td>{fmtNum(p.metrics.engagements)}</td>
              <td>{fmtNum(p.metrics.impressions)}</td>
              <td>{fmtPct(engagementRate([p]), 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SyncHistory({ snaps }: { snaps: AnalyticsSnapshot[] }) {
  if (!snaps.length) return null;
  return (
    <details className="card history-card">
      <summary>Analytics history ({snaps.length} syncs)</summary>
      <ul className="sync-list">
        {snaps.slice(0, 30).map((s) => (
          <li key={s.id}>
            <PlatformBadge platform={s.platform} compact /> {fmtDateTime(s.retrieved_at)} · {s.posts.length} posts · {fmtDate(s.period_start)} – {fmtDate(s.period_end)} · {s.source}
            {s.notes.length > 0 && <div className="muted small">{s.notes.join(' ')}</div>}
          </li>
        ))}
      </ul>
    </details>
  );
}
