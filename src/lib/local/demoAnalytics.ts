import type { MetricValues, Platform, PostMetric } from '../types';
import { PLATFORM_META } from '../platforms';
import { addDays, hashString, seeded } from '../util';

const PILLARS = ['Proof & results', 'Expert education', 'Behind the scenes', 'Offer & next step'];
const SNIPPETS = [
  'Before and after: what a week of careful work looks like',
  '3 mistakes we see on almost every quote',
  'Meet the crew behind this project',
  'Spring slots are open — here is how booking works',
  'Why the cheapest bid usually costs more',
  'Checklist: questions to ask before you hire',
  'A small detail most people never notice',
  'Client story: finished two days early',
];

/**
 * Sample dataset for Demo mode only. Unavailable metrics are null per platform so the
 * “Not available” states are exercised exactly as they would be with a real connection.
 */
export function demoPosts(platform: Platform, workspaceId: string, days: number): PostMetric[] {
  const rnd = seeded(hashString(workspaceId + platform));
  const perWeek = platform === 'x' ? 5 : platform === 'instagram' ? 3 : 2;
  const base = platform === 'x' ? 900 : platform === 'instagram' ? 1400 : 1100;
  const formats = PLATFORM_META[platform].formats.slice(0, 3);
  const out: PostMetric[] = [];
  const end = new Date();
  const count = Math.round((days / 7) * perWeek);
  for (let i = 0; i < count; i++) {
    const d = addDays(end, -Math.floor((i * days) / count) - 1);
    d.setHours(8 + Math.floor(rnd() * 10), Math.floor(rnd() * 60), 0, 0);
    const pillar = PILLARS[Math.floor(rnd() * PILLARS.length)];
    const format = formats[Math.floor(rnd() * formats.length)];
    const pillarBoost = pillar === 'Proof & results' ? 1.6 : pillar === 'Offer & next step' ? 0.7 : 1;
    const formatBoost = format === formats[0] ? 1.35 : 1;
    const trend = 1 + (days - i * (days / count)) / days / 3; // recent posts trend up
    const impressions = Math.round(base * pillarBoost * formatBoost * trend * (0.6 + rnd() * 0.8));
    const likes = Math.round(impressions * (0.025 + rnd() * 0.03));
    const comments = Math.round(likes * (0.05 + rnd() * 0.12));
    const shares = Math.round(likes * (0.03 + rnd() * 0.1));
    const saves = platform === 'instagram' ? Math.round(likes * (0.08 + rnd() * 0.2)) : null;
    const clicks = platform === 'instagram' ? null : Math.round(impressions * (0.004 + rnd() * 0.01));
    const metrics: MetricValues = {
      impressions,
      reach: platform === 'instagram' ? Math.round(impressions * (0.7 + rnd() * 0.2)) : null,
      likes,
      comments,
      shares,
      saves,
      clicks,
      engagements: likes + comments + shares + (saves ?? 0) + (clicks ?? 0),
    };
    out.push({
      id: `demo-${platform}-${i}`,
      published_at: d.toISOString(),
      format,
      pillar,
      text: SNIPPETS[Math.floor(rnd() * SNIPPETS.length)],
      url: null,
      metrics,
    });
  }
  return out;
}
