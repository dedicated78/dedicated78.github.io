/**
 * Demo backend: browser-only storage scoped per signed-in demo user.
 * Mirrors the Supabase schema and owner scoping so the UI is identical in both modes.
 */
import type { Backend, Db, Filters } from '../backend';
import type { AnalyticsSnapshot, Session, SocialConnection, TableName } from '../types';
import { PLATFORM_META } from '../platforms';
import { addDays, nowIso, uid } from '../util';
import { demoCopilot } from './demoCopilot';
import { demoPosts } from './demoAnalytics';

type Store = Record<string, Record<string, unknown>[]>;
type UserRec = { id: string; email: string; salt: string; hash: string };

const USERS = 'sp:demo:users';
const SESSION = 'sp:demo:session';

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable (private mode) — data lives for this tab only */
  }
}

async function hash(pw: string, salt: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pw}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function createLocalBackend(): Backend {
  let session: Session | null = read<Session | null>(SESSION, null);
  const listeners = new Set<(s: Session | null) => void>();
  const memory: Record<string, Store> = {};

  const dbKey = () => {
    if (!session) throw new Error('Not signed in');
    return `sp:demo:db:${session.userId}`;
  };
  const load = (): Store => {
    const k = dbKey();
    return (memory[k] ??= read<Store>(k, {}));
  };
  const save = () => write(dbKey(), load());
  const setSession = (s: Session | null) => {
    session = s;
    write(SESSION, s);
    listeners.forEach((l) => l(s));
  };

  const matches = (row: Record<string, unknown>, f?: Filters) => !f || Object.entries(f).every(([k, v]) => row[k] === v);

  const db: Db = {
    async list<T>(table: TableName, filters?: Filters, order?: { column: string; ascending?: boolean }) {
      const rows = (load()[table] ?? []).filter((r) => matches(r, filters));
      if (order) {
        const dir = order.ascending === false ? -1 : 1;
        rows.sort((a, b) => String(a[order.column] ?? '').localeCompare(String(b[order.column] ?? '')) * dir);
      }
      return structuredClone(rows) as T[];
    },
    async get<T>(table: TableName, id: string) {
      const r = (load()[table] ?? []).find((x) => x.id === id);
      return r ? (structuredClone(r) as T) : null;
    },
    async insert<T>(table: TableName, row: Partial<T>) {
      const [r] = await db.insertMany<T>(table, [row]);
      return r;
    },
    async insertMany<T>(table: TableName, rows: Partial<T>[]) {
      const s = load();
      const t = (s[table] ??= []);
      const out = rows.map((row) => ({ id: uid(), created_at: nowIso(), updated_at: nowIso(), owner_id: session!.userId, ...row }) as Record<string, unknown>);
      t.push(...out);
      save();
      return structuredClone(out) as T[];
    },
    async update<T>(table: TableName, id: string, patch: Partial<T>) {
      if (table === 'draft_versions') throw new Error('Revision history is immutable');
      const t = load()[table] ?? [];
      const i = t.findIndex((x) => x.id === id);
      if (i < 0) throw new Error('Record not found');
      t[i] = { ...t[i], ...patch, id, updated_at: nowIso() };
      save();
      return structuredClone(t[i]) as T;
    },
    async remove(table: TableName, id: string) {
      const s = load();
      s[table] = (s[table] ?? []).filter((x) => x.id !== id);
      // Mirror ON DELETE CASCADE from the SQL schema.
      if (table === 'calendar_items') {
        const drafts = (s.drafts ?? []).filter((d) => d.calendar_item_id === id).map((d) => d.id);
        s.drafts = (s.drafts ?? []).filter((d) => d.calendar_item_id !== id);
        s.draft_versions = (s.draft_versions ?? []).filter((v) => !drafts.includes(v.draft_id));
      }
      if (table === 'workspaces') {
        for (const k of Object.keys(s)) if (k !== 'workspaces') s[k] = s[k].filter((r) => r.workspace_id !== id);
      }
      save();
    },
  };

  return {
    mode: 'demo',
    db,
    copilot: demoCopilot,
    auth: {
      async getSession() {
        return session;
      },
      async signUp(email, password) {
        const users = read<Record<string, UserRec>>(USERS, {});
        const key = email.trim().toLowerCase();
        if (users[key]) throw new Error('An account with this email already exists. Log in instead.');
        const salt = uid();
        const rec: UserRec = { id: uid(), email: key, salt, hash: await hash(password, salt) };
        users[key] = rec;
        write(USERS, users);
        const s = { userId: rec.id, email: rec.email };
        setSession(s);
        return { session: s, needsConfirmation: false };
      },
      async signIn(email, password) {
        const users = read<Record<string, UserRec>>(USERS, {});
        const rec = users[email.trim().toLowerCase()];
        if (!rec || rec.hash !== (await hash(password, rec.salt))) throw new Error('Email or password is incorrect.');
        const s = { userId: rec.id, email: rec.email };
        setSession(s);
        return s;
      },
      async signOut() {
        setSession(null);
      },
      onChange(cb) {
        listeners.add(cb);
        return () => listeners.delete(cb);
      },
    },
    social: {
      async connect(workspaceId, platform) {
        const existing = (await db.list<SocialConnection>('social_connections', { workspace_id: workspaceId, platform }))[0];
        const patch = { state: 'connected' as const, account_label: `Demo ${PLATFORM_META[platform].label} account`, last_error: null };
        const connection = existing
          ? await db.update<SocialConnection>('social_connections', existing.id, patch)
          : await db.insert<SocialConnection>('social_connections', { workspace_id: workspaceId, platform, last_synced_at: null, ...patch });
        return { connection, redirectUrl: null };
      },
      async refreshStatus(id) {
        return (await db.get<SocialConnection>('social_connections', id))!;
      },
      async sync(id, days) {
        const c = await db.get<SocialConnection>('social_connections', id);
        if (!c || c.state !== 'connected') throw new Error('Connect this channel before syncing.');
        await new Promise((r) => setTimeout(r, 600));
        const retrieved = nowIso();
        const snap = await db.insert<AnalyticsSnapshot>('analytics_snapshots', {
          workspace_id: c.workspace_id,
          platform: c.platform,
          account_label: c.account_label,
          period_start: addDays(new Date(), -days).toISOString(),
          period_end: retrieved,
          followers: null,
          posts: demoPosts(c.platform, c.workspace_id, days),
          source: 'Demo dataset — sample data, not from a real account',
          retrieved_at: retrieved,
          notes: ['Demo mode generates sample metrics so the analytics workflow can be evaluated.'],
        });
        await db.update<SocialConnection>('social_connections', id, { last_synced_at: retrieved });
        return snap;
      },
      async disconnect(id) {
        return db.update<SocialConnection>('social_connections', id, { state: 'disconnected' });
      },
    },
    async deleteAccount() {
      if (!session) return;
      const users = read<Record<string, UserRec>>(USERS, {});
      delete users[session.email];
      write(USERS, users);
      try {
        localStorage.removeItem(dbKey());
      } catch {
        /* ignore */
      }
      delete memory[dbKey()];
      setSession(null);
    },
  };
}
