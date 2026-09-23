/**
 * Read-only social connections: connect (OAuth hand-off), status, sync (import content +
 * available metrics into analytics_snapshots), disconnect (revoke; drafts are untouched).
 * There is no publish/comment/message path in this function.
 */
import { adminClient, handler, HttpError, json, userContext } from '../_shared/http.ts';
import { connectionStatus, execRead, initiateConnection, readTools, revokeConnection } from '../_shared/composio.ts';
import type { Platform } from '../_shared/agents.ts';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const PLATFORMS: Platform[] = ['instagram', 'linkedin', 'x'];
const KEYS = ['impressions', 'reach', 'engagements', 'likes', 'comments', 'shares', 'saves', 'clicks'] as const;
type Metrics = Record<(typeof KEYS)[number], number | null>;

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null);

/** Finds the first array of objects in an arbitrary provider payload. */
function findList(v: unknown, depth = 0): Json[] {
  if (depth > 4 || !v || typeof v !== 'object') return [];
  if (Array.isArray(v)) return v.every((x) => x && typeof x === 'object') ? (v as Json[]) : [];
  for (const k of ['data', 'items', 'media', 'tweets', 'elements', 'response_data']) {
    const r = findList((v as Json)[k], depth + 1);
    if (r.length) return r;
  }
  for (const val of Object.values(v as Json)) {
    const r = findList(val, depth + 1);
    if (r.length) return r;
  }
  return [];
}
function findObj(v: unknown, keys: string[], depth = 0): Json | null {
  if (depth > 4 || !v || typeof v !== 'object' || Array.isArray(v)) return null;
  if (keys.some((k) => k in (v as Json))) return v as Json;
  for (const val of Object.values(v as Json)) {
    const r = findObj(val, keys, depth + 1);
    if (r) return r;
  }
  return null;
}

function engagements(m: Metrics): number | null {
  const parts = [m.likes, m.comments, m.shares, m.saves, m.clicks].filter((x): x is number => x !== null);
  return parts.length ? parts.reduce((a, b) => a + b, 0) : null;
}

/** Match an imported post to a saved strategy pillar by keyword overlap; otherwise "Unclassified". */
function classify(text: string, pillars: string[]): string {
  const t = text.toLowerCase();
  let best = 'Unclassified';
  let score = 0;
  for (const p of pillars) {
    const words = p.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
    const s = words.filter((w) => t.includes(w)).length;
    if (s > score) {
      score = s;
      best = p;
    }
  }
  return best;
}

Deno.serve(
  handler(async (req) => {
    const { db, userId } = await userContext(req);
    const admin = adminClient();
    const body = (await req.json()) as Json;

    const loadConn = async () => {
      const { data: c } = await db.from('social_connections').select('*').eq('id', body.connection_id).maybeSingle();
      if (!c) throw new HttpError(404, 'Connection not found');
      const { data: s } = await admin.from('social_connection_secrets').select('*').eq('connection_id', c.id).maybeSingle();
      return { c, s };
    };

    if (body.action === 'connect') {
      const p = body.platform as Platform;
      if (!PLATFORMS.includes(p)) throw new HttpError(400, 'Unknown platform');
      const { data: ws } = await db.from('workspaces').select('id').eq('id', body.workspace_id).maybeSingle();
      if (!ws) throw new HttpError(404, 'Workspace not found');
      const composioUser = `${userId}:${ws.id}`;
      const init = await initiateConnection(p, composioUser, String(body.return_url ?? ''));
      const { data: conn, error } = await db
        .from('social_connections')
        .upsert({ workspace_id: ws.id, platform: p, state: 'pending', last_error: null, account_label: '' }, { onConflict: 'workspace_id,platform' })
        .select('*')
        .single();
      if (error) throw new HttpError(400, error.message);
      await admin.from('social_connection_secrets').upsert({ connection_id: conn.id, composio_user_id: composioUser, composio_connected_account_id: init.id });
      return json({ connection: conn, redirectUrl: init.redirectUrl });
    }

    if (body.action === 'status') {
      const { c, s } = await loadConn();
      if (!s?.composio_connected_account_id) return json(c);
      const st = await connectionStatus(s.composio_connected_account_id);
      let patch: Json = st === 'ACTIVE' ? { state: 'connected', last_error: null } : st === 'FAILED' || st === 'EXPIRED' ? { state: 'error', last_error: `Authorization ${st.toLowerCase()}` } : {};
      if (st === 'ACTIVE' && !c.account_label) {
        try {
          const who = await execRead(c.platform, readTools(c.platform).identity, s.composio_connected_account_id, s.composio_user_id, {});
          const o = findObj(who, ['username', 'name', 'localizedFirstName', 'screen_name']) ?? {};
          patch = { ...patch, account_label: o.username ? `@${o.username}` : o.name ?? [o.localizedFirstName, o.localizedLastName].filter(Boolean).join(' ') ?? '' };
        } catch {
          /* label is cosmetic */
        }
      }
      const { data } = await db.from('social_connections').update(patch).eq('id', c.id).select('*').single();
      return json(data ?? c);
    }

    if (body.action === 'sync') {
      const { c, s } = await loadConn();
      if (c.state !== 'connected' || !s?.composio_connected_account_id) throw new HttpError(400, 'Connect this channel before syncing');
      const p = c.platform as Platform;
      const days = Math.min(365, Math.max(7, Number(body.days) || 90));
      const since = new Date(Date.now() - days * 86400000);
      const tools = readTools(p);
      const notes: string[] = [];
      const acct = s.composio_connected_account_id;
      const run = (slug: string, args: Json) => execRead(p, slug, acct, s.composio_user_id, args);

      const { data: strategies } = await db.from('strategies').select('content').eq('workspace_id', c.workspace_id).neq('status', 'archived');
      const pillars = [...new Set((strategies ?? []).flatMap((x: Json) => (x.content?.pillars ?? []).map((pp: Json) => pp.name)).filter(Boolean))] as string[];

      let followers: number | null = null;
      let selfId: string | null = null;
      try {
        const who = await run(tools.identity, {});
        const o = findObj(who, ['followers_count', 'id', 'username']) ?? {};
        followers = num(o.followers_count ?? o.public_metrics?.followers_count);
        selfId = o.id ? String(o.id) : null;
      } catch (e) {
        notes.push(`Identity lookup failed: ${(e as Error).message}`);
      }

      const posts: Json[] = [];
      if (!tools.content.length) notes.push(`This ${p === 'linkedin' ? 'LinkedIn' : p} connection does not expose post-level content or metrics; values show as Not available.`);
      for (const slug of tools.content) {
        try {
          const args: Json =
            p === 'x'
              ? { id: selfId, max_results: 100, start_time: since.toISOString(), tweet_fields: ['created_at', 'public_metrics', 'non_public_metrics'] }
              : { limit: 100, fields: 'id,caption,media_type,timestamp,permalink,like_count,comments_count' };
          const list = findList(await run(slug, args));
          for (const it of list) {
            const created = it.created_at ?? it.timestamp ?? it.createdAt;
            if (!created || new Date(created) < since) continue;
            const pm = it.public_metrics ?? {};
            const npm = it.non_public_metrics ?? {};
            const m: Metrics = {
              impressions: num(pm.impression_count ?? npm.impression_count ?? it.impressions),
              reach: num(it.reach),
              likes: num(pm.like_count ?? it.like_count),
              comments: num(pm.reply_count ?? it.comments_count),
              shares: p === 'x' ? (num(pm.retweet_count) ?? 0) + (num(pm.quote_count) ?? 0) : num(it.shares),
              saves: num(pm.bookmark_count ?? it.saved),
              clicks: num(npm.url_link_clicks ?? it.clicks),
              engagements: null,
            };
            const text = String(it.text ?? it.caption ?? '');
            posts.push({
              id: String(it.id),
              published_at: new Date(created).toISOString(),
              format: p === 'x' ? (it.referenced_tweets ? 'Reply/Quote' : 'Single post') : ({ CAROUSEL_ALBUM: 'Carousel', VIDEO: 'Reel', IMAGE: 'Single image' } as Json)[it.media_type] ?? String(it.media_type ?? 'Post'),
              pillar: classify(text, pillars),
              text: text.slice(0, 280),
              url: it.permalink ?? (p === 'x' ? `https://x.com/i/web/status/${it.id}` : null),
              metrics: m,
            });
          }
        } catch (e) {
          notes.push(`${slug} unavailable: ${(e as Error).message}`);
        }
      }

      // Per-post insights (e.g. Instagram impressions/reach/saves). Best effort; missing stays null.
      for (const slug of tools.insights) {
        for (const post of posts.slice(0, 30)) {
          try {
            const res = await run(slug, { media_id: post.id, ig_media_id: post.id, metric: ['impressions', 'reach', 'saved', 'shares'] });
            for (const row of findList(res)) {
              const val = num(row.values?.[0]?.value ?? row.value);
              if (row.name === 'impressions' || row.name === 'views') post.metrics.impressions = val;
              if (row.name === 'reach') post.metrics.reach = val;
              if (row.name === 'saved') post.metrics.saves = val;
              if (row.name === 'shares') post.metrics.shares = val;
            }
          } catch (e) {
            notes.push(`${slug}: ${(e as Error).message}`);
            break;
          }
        }
      }
      for (const post of posts) post.metrics.engagements = engagements(post.metrics);

      const retrieved = new Date().toISOString();
      const { data: snap, error } = await db
        .from('analytics_snapshots')
        .insert({
          workspace_id: c.workspace_id,
          platform: p,
          account_label: c.account_label,
          period_start: since.toISOString(),
          period_end: retrieved,
          followers,
          posts,
          source: `${p === 'x' ? 'X/Twitter' : p === 'instagram' ? 'Instagram' : 'LinkedIn'} via Composio (read-only)`,
          retrieved_at: retrieved,
          notes: [...new Set(notes)].slice(0, 10),
        })
        .select('*')
        .single();
      if (error) throw new HttpError(400, error.message);
      await db.from('social_connections').update({ last_synced_at: retrieved, last_error: null }).eq('id', c.id);
      return json(snap);
    }

    if (body.action === 'disconnect') {
      const { c, s } = await loadConn();
      if (s?.composio_connected_account_id) {
        try {
          await revokeConnection(s.composio_connected_account_id);
        } catch (e) {
          console.error('revoke failed', e);
        }
        await admin.from('social_connection_secrets').delete().eq('connection_id', c.id);
      }
      // Only the connection changes; drafts, calendar and analytics history are kept.
      const { data } = await db.from('social_connections').update({ state: 'disconnected', last_error: null }).eq('id', c.id).select('*').single();
      return json(data);
    }

    throw new HttpError(400, 'Unknown action');
  }),
);
