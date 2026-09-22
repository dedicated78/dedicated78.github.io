/**
 * Live backend: Supabase Postgres (RLS scopes every row to auth.uid()),
 * email/password auth, and Edge Functions for the agents and read-only social sync.
 * No OpenAI or Composio secret ever reaches the browser.
 */
import { createClient, type Session as SbSession } from '@supabase/supabase-js';
import type { Backend, Db } from '../backend';
import type { AnalyticsSnapshot, Session, SocialConnection } from '../types';

export function createRemoteBackend(url: string, anonKey: string): Backend {
  const sb = createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
  const toSession = (s: SbSession | null): Session | null => (s ? { userId: s.user.id, email: s.user.email ?? '' } : null);

  async function fn<T>(name: string, body: object): Promise<T> {
    const { data, error } = await sb.functions.invoke(name, { body: body as Record<string, unknown> });
    if (error) {
      let msg = error.message;
      try {
        const ctx = (error as { context?: Response }).context;
        if (ctx) msg = (await ctx.json()).error ?? msg;
      } catch {
        /* keep generic message */
      }
      throw new Error(msg);
    }
    return data as T;
  }

  const fail = (e: { message: string } | null) => {
    if (e) throw new Error(e.message);
  };

  const db: Db = {
    async list(table, filters, order) {
      let q = sb.from(table).select('*');
      for (const [k, v] of Object.entries(filters ?? {})) q = v === null ? q.is(k, null) : q.eq(k, v);
      if (order) q = q.order(order.column, { ascending: order.ascending !== false });
      const { data, error } = await q;
      fail(error);
      return (data ?? []) as never;
    },
    async get(table, id) {
      const { data, error } = await sb.from(table).select('*').eq('id', id).maybeSingle();
      fail(error);
      return data as never;
    },
    async insert(table, row) {
      const { data, error } = await sb.from(table).insert(row as never).select('*').single();
      fail(error);
      return data as never;
    },
    async insertMany(table, rows) {
      if (!rows.length) return [];
      const { data, error } = await sb.from(table).insert(rows as never).select('*');
      fail(error);
      return (data ?? []) as never;
    },
    async update(table, id, patch) {
      const { data, error } = await sb.from(table).update(patch as never).eq('id', id).select('*').single();
      fail(error);
      return data as never;
    },
    async remove(table, id) {
      const { error } = await sb.from(table).delete().eq('id', id);
      fail(error);
    },
  };

  return {
    mode: 'live',
    db,
    auth: {
      async getSession() {
        return toSession((await sb.auth.getSession()).data.session);
      },
      async signUp(email, password) {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
        fail(error);
        return { session: toSession(data.session), needsConfirmation: !data.session };
      },
      async signIn(email, password) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        fail(error);
        return toSession(data.session)!;
      },
      async signOut() {
        await sb.auth.signOut();
      },
      onChange(cb) {
        const { data } = sb.auth.onAuthStateChange((_e, s) => cb(toSession(s)));
        return () => data.subscription.unsubscribe();
      },
    },
    copilot: {
      strategy: (req) => fn('agent', { task: 'strategy', payload: req }),
      calendar: (req) => fn('agent', { task: 'calendar', payload: { ...req, tz_offset_minutes: new Date().getTimezoneOffset() } }),
      variants: (req) => fn('agent', { task: 'variants', payload: req }),
      findings: (req) => fn('agent', { task: 'findings', payload: req }),
    },
    social: {
      connect: (workspace_id, platform) =>
        fn<{ connection: SocialConnection; redirectUrl: string | null }>('social', {
          action: 'connect',
          workspace_id,
          platform,
          return_url: window.location.href.split('#')[0] + '#/connections',
        }),
      refreshStatus: (connection_id) => fn<SocialConnection>('social', { action: 'status', connection_id }),
      sync: (connection_id, days) => fn<AnalyticsSnapshot>('social', { action: 'sync', connection_id, days }),
      disconnect: (connection_id) => fn<SocialConnection>('social', { action: 'disconnect', connection_id }),
    },
    async deleteAccount() {
      await fn('delete-account', {});
      await sb.auth.signOut();
    },
  };
}
