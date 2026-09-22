/**
 * Read-only Composio gateway.
 *
 * Only tool slugs in READ_TOOLS can be executed, and every slug is additionally checked
 * against a verb denylist — so even a misconfigured allowlist cannot post, comment,
 * message, follow, delete or modify an account.
 *
 * Slugs vary by Composio toolkit version. Verify them in your Composio dashboard and
 * override per platform with env vars: COMPOSIO_IDENTITY_TOOL_<P>, COMPOSIO_CONTENT_TOOLS_<P>,
 * COMPOSIO_INSIGHT_TOOLS_<P> (comma-separated; <P> = INSTAGRAM, LINKEDIN or X).
 */
import type { Platform } from './agents.ts';

const BASE = Deno.env.get('COMPOSIO_BASE_URL') ?? 'https://backend.composio.dev/api/v3';

export const TOOLKIT: Record<Platform, string> = { instagram: 'instagram', linkedin: 'linkedin', x: 'twitter' };

const DEFAULT_READ_TOOLS: Record<Platform, { identity: string; content: string[]; insights: string[] }> = {
  instagram: { identity: 'INSTAGRAM_GET_USER_INFO', content: ['INSTAGRAM_GET_USER_MEDIA'], insights: ['INSTAGRAM_GET_POST_INSIGHTS'] },
  linkedin: { identity: 'LINKEDIN_GET_MY_INFO', content: [], insights: [] },
  x: { identity: 'TWITTER_USER_LOOKUP_ME', content: ['TWITTER_USER_TWEETS'], insights: [] },
};

export function readTools(p: Platform) {
  const d = DEFAULT_READ_TOOLS[p];
  const env = (k: string) => Deno.env.get(`COMPOSIO_${k}_${p.toUpperCase()}`)?.split(',').map((s) => s.trim()).filter(Boolean);
  return {
    identity: env('IDENTITY_TOOL')?.[0] ?? d.identity,
    content: env('CONTENT_TOOLS') ?? d.content,
    insights: env('INSIGHT_TOOLS') ?? d.insights,
  };
}

const READ_VERB = /_(GET|LOOKUP|LIST|SEARCH|FETCH|RETRIEVE|ME)(_|$)/;
const WRITE_VERB = /_(CREATE|POST|PUBLISH|SCHEDULE|DELETE|REMOVE|UPDATE|EDIT|REPLY|COMMENT|SEND|MESSAGE|DM|FOLLOW|UNFOLLOW|LIKE|UNLIKE|RETWEET|REPOST|UPLOAD|SHARE|BLOCK|MUTE|PIN|INVITE|REACT|ADD|SET)(_|$)/;

/** Allowlist first; then the slug must lead with a read verb or contain no write verb at all. */
export function assertReadOnly(slug: string, p: Platform) {
  const t = readTools(p);
  if (![t.identity, ...t.content, ...t.insights].includes(slug)) throw new Error(`Blocked: ${slug} is not an allowlisted read tool`);
  const body = slug.replace(/^[A-Z]+/, ''); // drop toolkit prefix
  const firstVerb = body.match(/^_([A-Z]+)/)?.[1] ?? '';
  const readFirst = READ_VERB.test(`_${firstVerb}_`);
  if (!readFirst && WRITE_VERB.test(body)) throw new Error(`Blocked: ${slug} looks like a write action`);
}

function key() {
  const k = Deno.env.get('COMPOSIO_API_KEY');
  if (!k) throw new Error('COMPOSIO_API_KEY is not configured on the server');
  return k;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { 'x-api-key': key(), 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`Composio ${res.status}: ${text.slice(0, 200)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

/** Starts OAuth for a read-only auth config. Configure auth configs with read scopes only. */
export async function initiateConnection(p: Platform, userId: string, callbackUrl: string) {
  const authConfig = Deno.env.get(`COMPOSIO_AUTH_CONFIG_${p.toUpperCase()}`);
  if (!authConfig) throw new Error(`COMPOSIO_AUTH_CONFIG_${p.toUpperCase()} is not configured`);
  const r = await api<{ id: string; redirect_url?: string; redirectUrl?: string; status?: string }>('/connected_accounts', {
    method: 'POST',
    body: JSON.stringify({ auth_config: { id: authConfig }, connection: { user_id: userId, callback_url: callbackUrl } }),
  });
  return { id: r.id, redirectUrl: r.redirect_url ?? r.redirectUrl ?? null, status: r.status ?? 'INITIATED' };
}

export async function connectionStatus(id: string): Promise<string> {
  const r = await api<{ status?: string }>(`/connected_accounts/${id}`);
  return (r.status ?? 'UNKNOWN').toUpperCase();
}

export async function revokeConnection(id: string) {
  await api(`/connected_accounts/${id}`, { method: 'DELETE' });
}

export async function execRead(p: Platform, slug: string, connectedAccountId: string, userId: string, args: Record<string, unknown>) {
  assertReadOnly(slug, p);
  const r = await api<{ data?: unknown; successful?: boolean; error?: string | null }>(`/tools/execute/${slug}`, {
    method: 'POST',
    body: JSON.stringify({ connected_account_id: connectedAccountId, user_id: userId, arguments: args }),
  });
  if (r.successful === false) throw new Error(r.error ?? `${slug} failed`);
  return r.data;
}
