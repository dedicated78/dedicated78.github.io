/**
 * Demo-mode copilot. Deterministic templates that follow the same manager → specialist
 * contract as the live OpenAI agents, so the whole workflow is usable without API keys.
 * Output is clearly labeled as template-generated in the UI.
 */
import type { Copilot } from '../backend';
import type {
  BrandProfile,
  GeneratedFinding,
  GeneratedItem,
  Platform,
  Provenance,
  StrategyContent,
  Variant,
} from '../types';
import { PLATFORM_META } from '../platforms';
import { addDays, hashString, lines, nowIso, parseDateInput, seeded } from '../util';

const prov = (agents: string[]): Provenance => ({
  generated_by: 'Social Strategy Director',
  agents,
  model: 'demo-template',
  mode: 'demo',
  generated_at: nowIso(),
});

const specialists = (ps: Platform[]) => ps.map((p) => PLATFORM_META[p].specialist);

function firstSentence(s: string, fallback: string): string {
  const t = s.trim().split(/(?<=[.!?])\s|\n/)[0];
  return t ? t.replace(/[.!?]$/, '') : fallback;
}

function slug(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, '').slice(0, 24);
}

const CHANNEL_ROLE: Record<Platform, { role: string; formats: string; perWeek: number; times: string }> = {
  instagram: {
    role: 'Visual proof and community: show the work, the people and the results in scroll-stopping formats.',
    formats: 'Carousel, Reel, Single image',
    perWeek: 3,
    times: '11:00, 18:30',
  },
  linkedin: {
    role: 'Authority and trust: lessons learned, decision frameworks and client outcomes for buyers and partners.',
    formats: 'Text post, Document carousel, Poll',
    perWeek: 2,
    times: '08:30, 12:00',
  },
  x: {
    role: 'Conversation and reach: sharp takes, quick tips and threads that start discussions in the niche.',
    formats: 'Single post, Thread, Poll',
    perWeek: 4,
    times: '09:00, 13:00, 17:30',
  },
};

export function demoStrategy(req: Parameters<Copilot['strategy']>[0]) {
  const b = req.brand;
  const name = b.brand_name || 'the brand';
  const objective = firstSentence(req.brief, 'Grow qualified demand from social');
  const offers = lines(b.offers.replace(/,/g, '\n'));
  const pillars = [
    { name: 'Proof & results', description: `Before/after stories, client outcomes and numbers that show what ${name} delivers.` },
    { name: 'Expert education', description: `Practical how-tos and mistakes to avoid for ${b.audience || 'the target audience'}.` },
    { name: 'Behind the scenes', description: 'Process, team and standards — the reasons to trust the work.' },
    { name: 'Offer & next step', description: offers.length ? `Clear invitations to ${offers.slice(0, 2).join(' / ')}.` : 'Clear, low-friction invitations to take the next step.' },
  ];
  const content: StrategyContent = {
    objective,
    audience: b.audience || 'Define the primary audience in the Brand profile.',
    brandMessage: `${name} ${b.goals ? `helps ${b.audience || 'customers'} ${firstSentence(b.goals, '').toLowerCase()}` : 'makes the outcome feel simple and certain'} — ${b.voice ? `told in a ${b.voice.toLowerCase()} voice` : 'told plainly and specifically'}.`,
    pillars,
    channelRoles: req.platforms.map((p) => ({ platform: p, role: CHANNEL_ROLE[p].role, formats: CHANNEL_ROLE[p].formats })),
    cadence: req.platforms.map((p) => ({
      platform: p,
      postsPerWeek: CHANNEL_ROLE[p].perWeek,
      bestTimes: CHANNEL_ROLE[p].times,
      notes: req.channel_context[p] ? `Based on imported data: ${req.channel_context[p]!.summary}` : 'No imported data yet — validate timing after the first two weeks.',
    })),
    themes: [
      { title: `Why ${objective.toLowerCase()} matters now`, angles: 'The cost of waiting\nThe one question customers ask first\nWhat changed this season' },
      { title: 'Myths vs. reality', angles: 'The cheapest option myth\nWhat a good job actually looks like\nRed flags to watch for' },
      { title: 'Show the process', angles: 'Day-in-the-life\nQuality checklist walkthrough\nHow we quote and schedule' },
    ],
    successMetrics: [
      ...req.platforms.map((p) => ({
        platform: p as Platform | 'all',
        metric: p === 'linkedin' ? 'Comments per post' : p === 'instagram' ? 'Saves + shares per post' : 'Replies and reposts per post',
        target: 'Beat the trailing 30-day average by 20%',
      })),
      { platform: 'all', metric: 'Profile/link clicks to offer page', target: 'Track weekly; set baseline in week 1' },
    ],
    risks: [
      'Cross-posting identical copy reduces channel fit — keep variants native.',
      'Low early volume makes performance comparisons noisy; judge after 3+ posts per format.',
    ],
    assumptions: [
      'Posts are published manually from approved “Ready” drafts.',
      'Metrics are only compared where the platform connection reports them.',
    ],
    prohibitedTopics: b.prohibited_topics,
    experiments: [
      { platform: req.platforms[0] ?? 'all', hypothesis: 'Result-led hooks outperform question hooks', test: 'Alternate hook style on the same pillar for 2 weeks', metric: 'Engagements per post' },
      ...req.recommendations.slice(0, 3).map((r) => ({ platform: r.platform, hypothesis: r.finding, test: r.proposed_action, metric: 'Metric cited in the finding' })),
    ],
  };
  return { title: objective.slice(0, 80), content };
}

function hashtags(b: BrandProfile, pillar: string, p: Platform, rnd: () => number): string[] {
  const base = [slug(b.brand_name), slug(b.industry), slug(pillar)].filter(Boolean);
  const extra = ['LocalBusiness', 'SmallBusiness', 'Tips', 'HowTo', 'BehindTheScenes'].sort(() => rnd() - 0.5);
  const max = p === 'instagram' ? 6 : p === 'linkedin' ? 3 : 1;
  return [...base, ...extra].slice(0, max);
}

function write(p: Platform, b: BrandProfile, title: string, angle: string, pillar: string, rnd: () => number): Variant {
  const name = b.brand_name || 'We';
  const aud = b.audience || 'our customers';
  const offer = lines(b.offers.replace(/,/g, '\n'))[0] || 'a free consultation';
  const cta =
    p === 'instagram' ? `Save this for later and DM “${slug(pillar).toUpperCase().slice(0, 8)}” for ${offer.toLowerCase()}.` : p === 'linkedin' ? `What would you add? If this is on your list, ${offer.toLowerCase()} is open.` : 'Agree or disagree?';
  const tags = hashtags(b, pillar, p, rnd);
  if (p === 'x') {
    const head = `${angle}. Most ${aud.toLowerCase()} learn this the expensive way.`;
    return {
      body: head.slice(0, 270),
      cta,
      hashtags: tags,
      thread: [head.slice(0, 270), `1/ ${title}: start with the outcome you want, not the product.`, `2/ Ask for proof — photos, references, a written scope.`, `3/ ${name} does this on every job. ${cta}`],
      visual_concept: '',
      ai_generated: true,
    };
  }
  if (p === 'linkedin') {
    return {
      body: `${angle}.\n\nHere's what we see working with ${aud.toLowerCase()}:\n\n→ Start with the outcome, not the spec sheet\n→ Make the process visible before the first invoice\n→ Put the standards in writing\n\n${title} isn't about doing more. It's about removing doubt at every step.`,
      cta,
      hashtags: tags,
      thread: [],
      visual_concept: '',
      ai_generated: true,
    };
  }
  return {
    body: `${angle} 👇\n\n${title} — swipe for the 3 things we check on every project.\n\n1. The outcome you actually want\n2. The standard it's built to\n3. How you'll know it's done right`,
    cta,
    hashtags: tags,
    thread: [],
    visual_concept: `Carousel: slide 1 bold hook “${angle}”, slides 2–4 one checklist point each with real project photo, last slide CTA.`,
    ai_generated: true,
  };
}

export function demoCalendar(req: Parameters<Copilot['calendar']>[0]): GeneratedItem[] {
  const start = parseDateInput(req.start_date);
  const end = parseDateInput(req.end_date);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const rnd = seeded(hashString(req.start_date + req.strategy.objective));
  const items: GeneratedItem[] = [];
  const angles = req.strategy.themes.flatMap((t) => lines(t.angles).map((a) => ({ theme: t.title, angle: a })));
  const pillars = req.strategy.pillars.length ? req.strategy.pillars : [{ name: 'General', description: '' }];
  for (const p of req.platforms) {
    const cad = req.strategy.cadence.find((c) => c.platform === p);
    const perWeek = Math.max(1, Math.min(14, cad?.postsPerWeek ?? CHANNEL_ROLE[p].perWeek));
    const times = (cad?.bestTimes || CHANNEL_ROLE[p].times).split(',').map((t) => t.trim()).filter((t) => /^\d{1,2}:\d{2}$/.test(t));
    const total = Math.max(1, Math.round((days / 7) * perWeek));
    const step = days / total;
    const formats = (req.strategy.channelRoles.find((c) => c.platform === p)?.formats || CHANNEL_ROLE[p].formats).split(',').map((f) => f.trim()).filter(Boolean);
    for (let i = 0; i < total; i++) {
      const d = addDays(start, Math.floor(i * step + (PLATFORMS_OFFSET[p] % Math.max(1, Math.floor(step)))));
      const [hh, mm] = (times[i % Math.max(1, times.length)] || '10:00').split(':').map(Number);
      d.setHours(hh, mm, 0, 0);
      const pillar = pillars[(i + PLATFORMS_OFFSET[p]) % pillars.length].name;
      const a = angles.length ? angles[(i * 2 + PLATFORMS_OFFSET[p]) % angles.length] : { theme: req.strategy.objective, angle: req.strategy.objective };
      const format = formats[i % formats.length] || PLATFORM_META[p].formats[0];
      items.push({
        platform: p,
        planned_at: d.toISOString(),
        title: `${a.theme}: ${a.angle}`.slice(0, 120),
        pillar,
        format,
        objective: req.strategy.objective,
        notes: `Angle from theme “${a.theme}”. Format chosen by ${PLATFORM_META[p].specialist}.`,
        variant: write(p, req.brand, a.theme, a.angle, pillar, rnd),
      });
    }
  }
  return items.sort((a, b) => a.planned_at.localeCompare(b.planned_at));
}

const PLATFORMS_OFFSET: Record<Platform, number> = { instagram: 0, linkedin: 1, x: 2 };

export function demoVariants(req: Parameters<Copilot['variants']>[0]): Partial<Record<Platform, Variant>> {
  const rnd = seeded(hashString(req.source.body));
  const angle = firstSentence(req.source.body, req.title);
  const out: Partial<Record<Platform, Variant>> = {};
  for (const t of req.targets) out[t] = write(t, req.brand, req.title, angle, req.pillar, rnd);
  return out;
}

export function demoFindings(req: Parameters<Copilot['findings']>[0]): GeneratedFinding[] {
  const out: GeneratedFinding[] = [];
  for (const e of req.evidence) {
    if (e.metric.startsWith('Avg engagements per post by')) {
      const dim = e.metric.endsWith('pillar') ? 'pillar' : 'format';
      const best = e.value.split(':')[0];
      const worst = e.comparison.replace('lowest: ', '').split(' ')[0];
      out.push({
        platform: e.platform,
        finding: `On ${PLATFORM_META[e.platform].label}, the “${best}” ${dim} earns the most engagements per post; “${worst}” earns the least.`,
        proposed_action: `Shift one weekly ${PLATFORM_META[e.platform].label} slot from “${worst}” to “${best}” for the next two weeks and compare avg engagements per post.`,
        evidence_refs: [e.ref],
      });
    }
    if ((e.metric === 'Engagements' || e.metric === 'Impressions') && /vs previous period/.test(e.comparison)) {
      const down = e.comparison.startsWith('-');
      out.push({
        platform: e.platform,
        finding: `${PLATFORM_META[e.platform].label} ${e.metric.toLowerCase()} ${down ? 'fell' : 'rose'} ${e.comparison.split(' ')[0].replace(/^[+-]/, '')} versus the previous period.`,
        proposed_action: down
          ? `Audit the last 5 ${PLATFORM_META[e.platform].label} posts for hook strength and posting consistency before adding new formats.`
          : `Keep the current ${PLATFORM_META[e.platform].label} cadence and reuse the top post's structure in one new draft.`,
        evidence_refs: [e.ref, ...req.evidence.filter((x) => x.platform === e.platform && x.metric === 'Posts published').map((x) => x.ref)],
      });
    }
  }
  return out.slice(0, 8);
}

export const demoCopilot: Copilot = {
  async strategy(req) {
    await wait();
    return { data: demoStrategy(req), provenance: prov(specialists(req.platforms)) };
  },
  async calendar(req) {
    await wait();
    return { data: demoCalendar(req), provenance: prov(specialists(req.platforms)) };
  },
  async variants(req) {
    await wait(400);
    return { data: demoVariants(req), provenance: prov(specialists(req.targets)) };
  },
  async findings(req) {
    await wait();
    const ps = [...new Set(req.evidence.map((e) => e.platform))];
    return { data: demoFindings(req), provenance: prov(specialists(ps)) };
  },
};

function wait(ms = 700) {
  return new Promise((r) => setTimeout(r, ms));
}
