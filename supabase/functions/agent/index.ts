/**
 * Social Strategy Director (manager) + Instagram / LinkedIn / X specialists.
 * Tasks: strategy | calendar | variants | findings. Returns data for the app to store as drafts.
 * The brand profile is always reloaded from the database (RLS-scoped), never trusted from the client.
 */
import { handler, HttpError, json, userContext } from '../_shared/http.ts';
import { chatJSON } from '../_shared/openai.ts';
import { BOUNDARY, brandBlock, CHANNEL_CRAFT, DIRECTOR, SPECIALISTS, type Platform } from '../_shared/agents.ts';

const PLATFORMS: Platform[] = ['instagram', 'linkedin', 'x'];
const LABEL: Record<Platform, string> = { instagram: 'Instagram', linkedin: 'LinkedIn', x: 'X' };
const LIMIT: Record<Platform, number> = { instagram: 2200, linkedin: 3000, x: 280 };

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Variant = { body: string; cta: string; hashtags: string[]; thread: string[]; visual_concept: string; ai_generated: boolean };

const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const arr = <T = string>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const plats = (v: unknown): Platform[] => arr<string>(v).filter((p): p is Platform => PLATFORMS.includes(p as Platform));

function provenance(agents: string[]) {
  return { generated_by: DIRECTOR.name, agents, model: Deno.env.get('OPENAI_MODEL') ?? DIRECTOR.model, mode: 'live', generated_at: new Date().toISOString() };
}

function variant(v: Json, platform: Platform): Variant {
  const thread = arr<string>(v.thread).map((t) => str(t)).filter(Boolean);
  return {
    body: str(v.body).slice(0, LIMIT[platform] * 2),
    cta: str(v.cta),
    hashtags: arr<string>(v.hashtags).map((h) => str(h).replace(/^#/, '')).filter(Boolean).slice(0, 30),
    thread: platform === 'x' ? thread : [],
    visual_concept: platform === 'instagram' ? str(v.visual_concept) : '',
    ai_generated: true,
  };
}

/** Flags drafts that mention a prohibited topic so the human reviews them. */
function prohibitedHits(text: string, topics: string[]): string[] {
  const t = text.toLowerCase();
  return topics.filter((p) => p.trim() && t.includes(p.trim().toLowerCase()));
}

Deno.serve(
  handler(async (req) => {
    const { db } = await userContext(req);
    const { task, payload } = (await req.json()) as { task: string; payload: Json };
    const wsId = payload?.brand?.workspace_id;
    const { data: brand } = await db.from('brand_profiles').select('*').eq('workspace_id', wsId).maybeSingle();
    if (!brand) throw new HttpError(404, 'Brand profile not found for this workspace');
    const B = brandBlock(brand);
    const prohibited: string[] = brand.prohibited_topics ?? [];

    /* ---------------- strategy ---------------- */
    if (task === 'strategy') {
      const ps = plats(payload.platforms);
      if (!ps.length) throw new HttpError(400, 'Choose at least one channel');
      const recs = arr<Json>(payload.recommendations);
      const specialistOut = await Promise.all(
        ps.map(async (p) => {
          const ctx = payload.channel_context?.[p];
          const out = await chatJSON<Json>(
            SPECIALISTS[p],
            `${CHANNEL_CRAFT[p]}\n${BOUNDARY}`,
            `${B}\n\nCAMPAIGN BRIEF: ${str(payload.brief)}\nWINDOW: ${payload.start_date} to ${payload.end_date}\n\nIMPORTED ${LABEL[p].toUpperCase()} CONTEXT (read-only): ${ctx ? `${ctx.summary} Period ${ctx.period}, retrieved ${ctx.retrieved_at}.` : 'No imported data. Do not assume metrics.'}\n\nFINDINGS TO TEST: ${recs.filter((r) => r.platform === p || r.platform === 'all').map((r) => `${r.finding} → ${r.proposed_action}`).join(' | ') || 'none'}\n\nReturn JSON: {"channel_role": string, "formats": string[], "posts_per_week": number, "best_times": string[] (HH:MM 24h), "cadence_notes": string, "pillar_ideas": string[], "themes": [{"title": string, "angles": string[]}], "success_metrics": [{"metric": string, "target": string}], "risks": string[], "experiments": [{"hypothesis": string, "test": string, "metric": string}]}`,
          );
          return { platform: p, out };
        }),
      );
      const d = await chatJSON<Json>(
        DIRECTOR,
        `You are the Social Strategy Director. You reconcile channel specialists into one coherent strategy: shared pillars (3–5), distinct channel roles (no generic cross-posting), realistic cadence, and measurable metrics. Resolve overlaps and contradictions.\n${BOUNDARY}`,
        `${B}\n\nBRIEF: ${str(payload.brief)}\nWINDOW: ${payload.start_date} to ${payload.end_date}\nCHANNELS: ${ps.map((p) => LABEL[p]).join(', ')}\n\nSPECIALIST INPUT:\n${JSON.stringify(specialistOut)}\n\nReturn JSON: {"title": string (≤80 chars), "objective": string, "audience": string, "brandMessage": string, "pillars": [{"name": string, "description": string}], "channelRoles": [{"platform": "instagram"|"linkedin"|"x", "role": string, "formats": string (comma-separated)}], "cadence": [{"platform": ..., "postsPerWeek": number, "bestTimes": string (comma-separated HH:MM), "notes": string}], "themes": [{"title": string, "angles": string (newline-separated)}], "successMetrics": [{"platform": ...|"all", "metric": string, "target": string}], "risks": string[], "assumptions": string[], "prohibitedTopics": string[], "experiments": [{"platform": ...|"all", "hypothesis": string, "test": string, "metric": string}]}`,
      );
      const inPs = (p: unknown) => ps.includes(p as Platform);
      const content = {
        objective: str(d.objective, str(payload.brief)),
        audience: str(d.audience, brand.audience),
        brandMessage: str(d.brandMessage),
        pillars: arr<Json>(d.pillars).map((x) => ({ name: str(x.name), description: str(x.description) })).filter((x) => x.name),
        channelRoles: arr<Json>(d.channelRoles).filter((x) => inPs(x.platform)).map((x) => ({ platform: x.platform, role: str(x.role), formats: Array.isArray(x.formats) ? x.formats.join(', ') : str(x.formats) })),
        cadence: arr<Json>(d.cadence).filter((x) => inPs(x.platform)).map((x) => ({ platform: x.platform, postsPerWeek: Math.max(0, Math.min(21, Number(x.postsPerWeek) || 0)), bestTimes: Array.isArray(x.bestTimes) ? x.bestTimes.join(', ') : str(x.bestTimes), notes: str(x.notes) })),
        themes: arr<Json>(d.themes).map((x) => ({ title: str(x.title), angles: Array.isArray(x.angles) ? x.angles.join('\n') : str(x.angles) })),
        successMetrics: arr<Json>(d.successMetrics).map((x) => ({ platform: inPs(x.platform) ? x.platform : 'all', metric: str(x.metric), target: str(x.target) })),
        risks: arr<string>(d.risks).map((x) => str(x)).filter(Boolean),
        assumptions: arr<string>(d.assumptions).map((x) => str(x)).filter(Boolean),
        prohibitedTopics: [...new Set([...prohibited, ...arr<string>(d.prohibitedTopics).map((x) => str(x)).filter(Boolean)])],
        experiments: arr<Json>(d.experiments).map((x) => ({ platform: inPs(x.platform) ? x.platform : 'all', hypothesis: str(x.hypothesis), test: str(x.test), metric: str(x.metric) })),
      };
      return json({ data: { title: str(d.title, content.objective).slice(0, 80), content }, provenance: provenance([DIRECTOR.name, ...ps.map((p) => SPECIALISTS[p].name)]) });
    }

    /* ---------------- calendar ---------------- */
    if (task === 'calendar') {
      const ps = plats(payload.platforms);
      const strategy = payload.strategy as Json;
      const start = new Date(`${payload.start_date}T00:00:00Z`);
      const end = new Date(`${payload.end_date}T23:59:59Z`);
      const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
      if (!ps.length || days < 1 || days > 62) throw new HttpError(400, 'Calendar window must be 1–62 days with at least one channel');
      const caps = Object.fromEntries(
        ps.map((p) => {
          const c = arr<Json>(strategy.cadence).find((x) => x.platform === p);
          return [p, Math.max(1, Math.ceil((days / 7) * Math.max(1, Number(c?.postsPerWeek) || 3)))];
        }),
      ) as Record<Platform, number>;

      // 1) Director slots the plan across channels.
      const plan = await chatJSON<Json>(
        DIRECTOR,
        `You are the Social Strategy Director. Build an internal content plan from an approved strategy. Spread posts evenly, rotate pillars, avoid the same angle on two channels the same day, match each channel's role and formats.\n${BOUNDARY}`,
        `${B}\n\nSTRATEGY:\n${JSON.stringify(strategy)}\n\nWINDOW: ${payload.start_date} to ${payload.end_date} (${days} days)\nSLOTS PER CHANNEL (max): ${ps.map((p) => `${LABEL[p]} ${caps[p]}`).join(', ')}\n\nReturn JSON: {"slots": [{"platform": "instagram"|"linkedin"|"x", "date": "YYYY-MM-DD", "time": "HH:MM", "pillar": string, "format": string, "title": string, "angle": string, "objective": string}]}`,
      );
      const count: Record<string, number> = {};
      const slots = arr<Json>(plan.slots)
        .filter((s) => ps.includes(s.platform) && /^\d{4}-\d{2}-\d{2}$/.test(str(s.date)))
        .filter((s) => {
          const t = new Date(`${s.date}T12:00:00Z`).getTime();
          return t >= start.getTime() && t <= end.getTime();
        })
        .filter((s) => (count[s.platform] = (count[s.platform] ?? 0) + 1) <= caps[s.platform as Platform]);

      // 2) Each specialist drafts its own channel's slots (batched).
      const drafted = await Promise.all(
        ps.flatMap((p) => {
          const mine = slots.map((s, i): Json => ({ ...s, i })).filter((s) => s.platform === p);
          const batches: typeof mine[] = [];
          for (let i = 0; i < mine.length; i += 10) batches.push(mine.slice(i, i + 10));
          return batches.map(async (batch) => {
            const out = await chatJSON<Json>(
              SPECIALISTS[p],
              `${CHANNEL_CRAFT[p]}\n${BOUNDARY}`,
              `${B}\n\nSTRATEGY PILLARS: ${JSON.stringify(strategy.pillars)}\nCHANNEL ROLE: ${JSON.stringify(arr<Json>(strategy.channelRoles).find((r) => r.platform === p) ?? {})}\n\nDraft one native ${LABEL[p]} post per slot:\n${JSON.stringify(batch.map((s) => ({ slot: s.i, title: s.title, angle: s.angle, pillar: s.pillar, format: s.format, objective: s.objective })))}\n\nReturn JSON: {"drafts": [{"slot": number, "body": string, "cta": string, "hashtags": string[], "thread": string[] (X threads only, else []), "visual_concept": string (Instagram only, else ""), "notes": string}]}`,
            );
            return arr<Json>(out.drafts).map((d): Json => ({ ...d, platform: p }));
          });
        }),
      );
      const byslot = new Map(drafted.flat().map((d) => [Number(d.slot), d]));
      const items = slots.map((s, i) => {
        const d: Json = byslot.get(i) ?? {};
        const v = variant(d, s.platform);
        const hits = prohibitedHits(`${v.body} ${v.cta} ${v.thread.join(' ')}`, prohibited);
        const [hh, mm] = (/^\d{1,2}:\d{2}$/.test(str(s.time)) ? s.time : '10:00').split(':');
        return {
          platform: s.platform,
          planned_at: `${s.date}T${hh.padStart(2, '0')}:${mm}:00`,
          title: str(s.title).slice(0, 160),
          pillar: str(s.pillar),
          format: str(s.format),
          objective: str(s.objective, strategy.objective),
          notes: [str(d.notes), hits.length ? `REVIEW: mentions prohibited topic(s): ${hits.join(', ')}` : ''].filter(Boolean).join('\n'),
          variant: v,
        };
      });
      // planned_at is sent without a zone; convert to ISO in the client's timezone offset if given.
      const tz = Number(payload.tz_offset_minutes);
      for (const it of items) it.planned_at = new Date(new Date(`${it.planned_at}Z`).getTime() + (Number.isFinite(tz) ? tz : 0) * 60000).toISOString();
      return json({ data: items.sort((a, b) => a.planned_at.localeCompare(b.planned_at)), provenance: provenance([DIRECTOR.name, ...ps.map((p) => SPECIALISTS[p].name)]) });
    }

    /* ---------------- variants ---------------- */
    if (task === 'variants') {
      const targets = plats(payload.targets);
      const src = payload.source as Json;
      const out = await Promise.all(
        targets.map(async (p) => {
          const d = await chatJSON<Json>(
            SPECIALISTS[p],
            `${CHANNEL_CRAFT[p]}\n${BOUNDARY}`,
            `${B}\n\nAdapt this ${LABEL[payload.source_platform as Platform] ?? 'source'} draft into a native ${LABEL[p]} post. Keep the core idea; change structure, length, hook and CTA to fit ${LABEL[p]}. Do not cross-post verbatim.\nTITLE: ${str(payload.title)}\nPILLAR: ${str(payload.pillar)}\nSOURCE BODY: ${str(src?.body)}\nSOURCE CTA: ${str(src?.cta)}\n\nReturn JSON: {"body": string, "cta": string, "hashtags": string[], "thread": string[], "visual_concept": string}`,
          );
          return [p, variant(d, p)] as const;
        }),
      );
      return json({ data: Object.fromEntries(out), provenance: provenance([DIRECTOR.name, ...targets.map((p) => SPECIALISTS[p].name)]) });
    }

    /* ---------------- findings ---------------- */
    if (task === 'findings') {
      const evidence = arr<Json>(payload.evidence);
      const refs = new Set(evidence.map((e) => str(e.ref)));
      const ps = [...new Set(evidence.map((e) => e.platform))].filter((p): p is Platform => PLATFORMS.includes(p));
      const per = await Promise.all(
        ps.map(async (p) => {
          const mine = evidence.filter((e) => e.platform === p);
          const out = await chatJSON<Json>(
            SPECIALISTS[p],
            `${CHANNEL_CRAFT[p]}\nYou analyze imported ${LABEL[p]} performance. Every finding must cite evidence refs from the ledger (e.g. "E3"). No ref, no finding. Do not state numbers that are not in the ledger. Small samples (<3 posts) must be called out as directional.\n${BOUNDARY}`,
            `${B}\n\nEVIDENCE LEDGER:\n${mine.map((e) => `[${e.ref}] ${e.metric}: ${e.value}${e.comparison ? ` (${e.comparison})` : ''}`).join('\n')}\n\nReturn JSON: {"findings": [{"finding": string, "proposed_action": string (a concrete content experiment), "evidence_refs": string[]}]} (max 4)`,
          );
          return arr<Json>(out.findings).map((f) => ({ ...f, platform: p }));
        }),
      );
      const d = await chatJSON<Json>(
        DIRECTOR,
        `You are the Social Strategy Director. Consolidate specialist findings into a ranked list (max 8), merge duplicates, add at most 2 cross-channel findings (platform "all") only if the ledger supports them. Keep evidence refs exact.\n${BOUNDARY}`,
        `SPECIALIST FINDINGS:\n${JSON.stringify(per.flat())}\n\nEVIDENCE LEDGER:\n${str(payload.aggregates)}\n\nReturn JSON: {"findings": [{"platform": "instagram"|"linkedin"|"x"|"all", "finding": string, "proposed_action": string, "evidence_refs": string[]}]}`,
      );
      const findings = arr<Json>(d.findings)
        .map((f) => ({
          platform: [...PLATFORMS, 'all'].includes(f.platform) ? f.platform : 'all',
          finding: str(f.finding),
          proposed_action: str(f.proposed_action),
          evidence_refs: arr<string>(f.evidence_refs).filter((r) => refs.has(r)),
        }))
        .filter((f) => f.finding && f.evidence_refs.length > 0);
      return json({ data: findings, provenance: provenance([DIRECTOR.name, ...ps.map((p) => SPECIALISTS[p].name)]) });
    }

    throw new HttpError(400, 'Unknown task');
  }),
);
