import type { AnalyticsSnapshot, ChannelContext, Evidence, MetricKey, Platform, PostMetric } from './types';
import { PLATFORM_META, METRIC_LABELS } from './platforms';
import { addDays, fmtDate, fmtNum, fmtPct } from './util';

export interface Range {
  from: Date;
  to: Date; // inclusive end-of-day
}

export function rangeForDays(days: number, end = new Date()): Range {
  const to = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  const from = addDays(new Date(to.getFullYear(), to.getMonth(), to.getDate()), -(days - 1));
  return { from, to };
}

export function previousRange(r: Range): Range {
  const len = r.to.getTime() - r.from.getTime();
  const to = new Date(r.from.getTime() - 1);
  return { from: new Date(to.getTime() - len), to };
}

export function periodLabel(r: Range): string {
  return `${fmtDate(r.from.toISOString())} – ${fmtDate(r.to.toISOString(), { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

/** Latest snapshot per platform. */
export function latestByPlatform(snaps: AnalyticsSnapshot[]): Partial<Record<Platform, AnalyticsSnapshot>> {
  const out: Partial<Record<Platform, AnalyticsSnapshot>> = {};
  for (const s of snaps) {
    const cur = out[s.platform];
    if (!cur || cur.retrieved_at < s.retrieved_at) out[s.platform] = s;
  }
  return out;
}

/** True when the snapshot's imported window fully covers the range. Otherwise comparisons are "Not available". */
export function covers(s: AnalyticsSnapshot, r: Range): boolean {
  return new Date(s.period_start).getTime() <= r.from.getTime() + 86400000 && new Date(s.period_end).getTime() >= r.to.getTime() - 86400000;
}

export function postsIn(s: AnalyticsSnapshot, r: Range): PostMetric[] {
  return s.posts.filter((p) => {
    const t = new Date(p.published_at).getTime();
    return t >= r.from.getTime() && t <= r.to.getTime();
  });
}

/** Sum a metric. Returns null when no post exposes it — never estimated. */
export function sumMetric(posts: PostMetric[], key: MetricKey): number | null {
  let any = false;
  let total = 0;
  for (const p of posts) {
    const v = p.metrics[key];
    if (v !== null && v !== undefined) {
      any = true;
      total += v;
    }
  }
  return any ? total : null;
}

/** Engagement rate is calculated (engagements ÷ impressions) only when both are reported. */
export function engagementRate(posts: PostMetric[]): number | null {
  const e = sumMetric(posts, 'engagements');
  const i = sumMetric(posts, 'impressions');
  if (e === null || i === null || i === 0) return null;
  return e / i;
}

export function change(cur: number | null, prev: number | null): number | null {
  if (cur === null || prev === null || prev === 0) return null;
  return (cur - prev) / prev;
}

export interface GroupRow {
  group: string;
  posts: number;
  engagements: number | null;
  avgEngagements: number | null;
  rate: number | null;
}

export function groupBy(posts: PostMetric[], key: 'pillar' | 'format'): GroupRow[] {
  const map = new Map<string, PostMetric[]>();
  for (const p of posts) {
    const k = p[key] || 'Unclassified';
    map.set(k, [...(map.get(k) ?? []), p]);
  }
  return [...map.entries()]
    .map(([group, ps]) => {
      const engagements = sumMetric(ps, 'engagements');
      return {
        group,
        posts: ps.length,
        engagements,
        avgEngagements: engagements === null ? null : engagements / ps.length,
        rate: engagementRate(ps),
      };
    })
    .sort((a, b) => (b.avgEngagements ?? -1) - (a.avgEngagements ?? -1));
}

export function dailySeries(posts: PostMetric[], r: Range, key: MetricKey): { date: Date; value: number | null }[] {
  const out: { date: Date; value: number | null }[] = [];
  const available = sumMetric(posts, key) !== null;
  for (let d = new Date(r.from); d <= r.to; d = addDays(d, 1)) {
    const dayPosts = posts.filter((p) => {
      const t = new Date(p.published_at);
      return t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth() && t.getDate() === d.getDate();
    });
    out.push({ date: new Date(d), value: available ? (sumMetric(dayPosts, key) ?? 0) : null });
  }
  return out;
}

/**
 * Full 7-day buckets counted back from the range end, so a partial week never reads as a drop.
 * Ranges shorter than two weeks fall back to daily points.
 */
export function weeklySeries(posts: PostMetric[], r: Range, key: MetricKey) {
  const daily = dailySeries(posts, r, key);
  if (daily.length < 14) return daily;
  const out: { date: Date; value: number | null }[] = [];
  for (let end = daily.length; end - 7 >= 0; end -= 7) {
    const chunk = daily.slice(end - 7, end);
    const vals = chunk.map((c) => c.value);
    out.unshift({ date: chunk[0].date, value: vals.every((v) => v === null) ? null : vals.reduce<number>((a, v) => a + (v ?? 0), 0) });
  }
  return out;
}

export function topPosts(posts: PostMetric[], n = 5): PostMetric[] {
  return [...posts].sort((a, b) => (b.metrics.engagements ?? -1) - (a.metrics.engagements ?? -1)).slice(0, n);
}

/**
 * Builds the numbered evidence ledger the Findings agent must cite.
 * Findings that cite no valid ref are discarded, so every claim is traceable
 * to channel + metric + period + retrieval time.
 */
export function buildEvidence(snaps: Partial<Record<Platform, AnalyticsSnapshot>>, r: Range): { evidence: Evidence[]; aggregates: string } {
  const evidence: Evidence[] = [];
  const text: string[] = [];
  const prev = previousRange(r);
  let n = 1;
  const push = (s: AnalyticsSnapshot, metric: string, value: string, comparison: string, range: Range) => {
    const e: Evidence = {
      ref: `E${n++}`,
      platform: s.platform,
      metric,
      value,
      comparison,
      period_start: range.from.toISOString(),
      period_end: range.to.toISOString(),
      retrieved_at: s.retrieved_at,
      snapshot_id: s.id,
      source: s.source,
    };
    evidence.push(e);
    text.push(`[${e.ref}] ${PLATFORM_META[s.platform].label} · ${metric}: ${value}${comparison ? ` (${comparison})` : ''}`);
  };

  for (const s of Object.values(snaps)) {
    if (!s) continue;
    const posts = postsIn(s, r);
    const prevPosts = covers(s, prev) ? postsIn(s, prev) : null;
    text.push(`\n## ${PLATFORM_META[s.platform].label} — ${posts.length} posts in ${periodLabel(r)}`);
    if (!posts.length) continue;

    push(s, 'Posts published', String(posts.length), prevPosts ? `previous period: ${prevPosts.length}` : 'previous period not available', r);
    for (const key of ['engagements', 'impressions'] as MetricKey[]) {
      const cur = sumMetric(posts, key);
      if (cur === null) {
        text.push(`${METRIC_LABELS[key]}: Not available from this connection`);
        continue;
      }
      const p = prevPosts ? sumMetric(prevPosts, key) : null;
      const ch = change(cur, p);
      push(s, METRIC_LABELS[key], fmtNum(cur), ch === null ? 'change not available' : `${ch >= 0 ? '+' : ''}${fmtPct(ch)} vs previous period`, r);
    }
    const er = engagementRate(posts);
    if (er !== null) push(s, 'Engagement rate (calculated: engagements ÷ impressions)', fmtPct(er, 2), '', r);

    for (const dim of ['pillar', 'format'] as const) {
      const rows = groupBy(posts, dim).filter((g) => g.avgEngagements !== null);
      if (rows.length >= 2) {
        const best = rows[0];
        const worst = rows[rows.length - 1];
        push(
          s,
          `Avg engagements per post by ${dim}`,
          `${best.group}: ${fmtNum(best.avgEngagements)} (${best.posts} posts)`,
          `lowest: ${worst.group} ${fmtNum(worst.avgEngagements)} (${worst.posts} posts)`,
          r,
        );
      }
    }
    const top = topPosts(posts, 1)[0];
    if (top && top.metrics.engagements !== null) {
      push(s, 'Top post by engagements', `${fmtNum(top.metrics.engagements)} — “${top.text.slice(0, 90)}${top.text.length > 90 ? '…' : ''}”`, `${top.format}, ${top.pillar}, ${fmtDate(top.published_at)}`, r);
    }
  }
  return { evidence, aggregates: text.join('\n') };
}

/** Compact, read-only context handed to specialists for strategy work. */
export function channelContexts(snaps: Partial<Record<Platform, AnalyticsSnapshot>>, days = 30): Partial<Record<Platform, ChannelContext>> {
  const r = rangeForDays(days);
  const out: Partial<Record<Platform, ChannelContext>> = {};
  for (const s of Object.values(snaps)) {
    if (!s) continue;
    const posts = postsIn(s, r);
    const pill = groupBy(posts, 'pillar').slice(0, 3).map((g) => `${g.group} (${fmtNum(g.avgEngagements)} avg eng.)`);
    const form = groupBy(posts, 'format').slice(0, 3).map((g) => `${g.group} (${fmtNum(g.avgEngagements)} avg eng.)`);
    out[s.platform] = {
      platform: s.platform,
      period: periodLabel(r),
      retrieved_at: s.retrieved_at,
      summary: [
        `${posts.length} posts; engagements ${fmtNum(sumMetric(posts, 'engagements'))}; impressions ${fmtNum(sumMetric(posts, 'impressions'))}; engagement rate ${fmtPct(engagementRate(posts), 2)}.`,
        pill.length ? `Pillars by avg engagement: ${pill.join(', ')}.` : '',
        form.length ? `Formats by avg engagement: ${form.join(', ')}.` : '',
      ]
        .filter(Boolean)
        .join(' '),
    };
  }
  return out;
}
