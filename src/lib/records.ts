import type { Db } from './backend';
import type { CalendarItem, Draft, DraftVersion, GeneratedItem, Platform, Provenance, Variant } from './types';

export function primaryFields(platform: Platform, variants: Partial<Record<Platform, Variant>>) {
  const v = variants[platform];
  return { body: v?.body ?? '', cta: v?.cta ?? '', hashtags: v?.hashtags ?? [] };
}

/** Persists generated calendar items with their first draft and immutable version 1. */
export async function saveGeneratedItems(
  db: Db,
  workspaceId: string,
  campaignId: string | null,
  strategyId: string | null,
  generated: GeneratedItem[],
  provenance: Provenance,
): Promise<CalendarItem[]> {
  const items = await db.insertMany<CalendarItem>(
    'calendar_items',
    generated.map((g) => ({
      workspace_id: workspaceId,
      campaign_id: campaignId,
      strategy_id: strategyId,
      planned_at: g.planned_at,
      platform: g.platform,
      title: g.title,
      pillar: g.pillar,
      format: g.format,
      objective: g.objective,
      notes: g.notes,
      status: g.variant.body.trim() ? 'draft' : 'idea',
    })),
  );
  const drafts = await db.insertMany<Draft>(
    'drafts',
    items.map((item, i) => {
      const variants = { [item.platform]: generated[i].variant };
      return { workspace_id: workspaceId, calendar_item_id: item.id, variants, ai_provenance: provenance, current_version: 1, ...primaryFields(item.platform, variants) };
    }),
  );
  await db.insertMany<DraftVersion>(
    'draft_versions',
    drafts.map((d) => ({ workspace_id: workspaceId, draft_id: d.id, version: 1, source: 'ai', note: 'Generated with calendar', snapshot: { body: d.body, cta: d.cta, hashtags: d.hashtags, variants: d.variants } })),
  );
  return items;
}

/** Saves a revision: updates the draft and appends an immutable draft_versions row. */
export async function saveRevision(db: Db, draft: Draft, primary: Platform, variants: Partial<Record<Platform, Variant>>, source: 'ai' | 'user', note: string): Promise<Draft> {
  const version = draft.current_version + 1;
  const provenance = draft.ai_provenance ? { ...draft.ai_provenance, edited_by_user: draft.ai_provenance.edited_by_user || source === 'user' } : null;
  const updated = await db.update<Draft>('drafts', draft.id, { variants, current_version: version, ai_provenance: provenance, ...primaryFields(primary, variants) });
  await db.insert<DraftVersion>('draft_versions', { workspace_id: draft.workspace_id, draft_id: draft.id, version, source, note, snapshot: { body: updated.body, cta: updated.cta, hashtags: updated.hashtags, variants } });
  return updated;
}

export function emptyVariant(): Variant {
  return { body: '', cta: '', hashtags: [], thread: [], visual_concept: '', ai_generated: false };
}

/** Plain text ready to paste into a publishing tool. */
export function copyableText(platform: Platform, v: Variant): string {
  const tags = v.hashtags.length ? v.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ') : '';
  if (platform === 'x' && v.thread.length > 1) return v.thread.map((t, i) => `${t}${i === v.thread.length - 1 && tags ? ` ${tags}` : ''}`).join('\n\n---\n\n');
  return [v.body, v.cta, tags].filter((s) => s.trim()).join('\n\n');
}
