import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { backend } from '../lib/config';
import type { BrandProfile, Session, Workspace } from '../lib/types';
import { nowIso, uid } from '../lib/util';

export interface Notice {
  id: string;
  text: string;
  at: string;
  read: boolean;
  tone: 'info' | 'success' | 'error';
}

interface AppState {
  backend: typeof backend;
  session: Session | null;
  ready: boolean;
  workspaces: Workspace[];
  workspace: Workspace | null;
  brand: BrandProfile | null;
  selectWorkspace(id: string): void;
  reloadWorkspaces(): Promise<void>;
  setBrand(b: BrandProfile | null): void;
  notices: Notice[];
  notify(text: string, tone?: Notice['tone']): void;
  markNoticesRead(): void;
  toast: Notice | null;
  theme: 'light' | 'dark';
  toggleTheme(): void;
}

const Ctx = createContext<AppState | null>(null);

function initialTheme(): 'light' | 'dark' {
  try {
    const t = localStorage.getItem('sp:theme');
    if (t === 'light' || t === 'dark') return t;
  } catch {
    /* ignore */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [toast, setToast] = useState<Notice | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    let alive = true;
    backend.auth.getSession().then((s) => {
      if (!alive) return;
      setSession(s);
      if (!s) setReady(true);
    });
    const off = backend.auth.onChange((s) => {
      setSession((cur) => (cur?.userId === s?.userId ? cur : s));
      if (!s) {
        setWorkspaces([]);
        setWorkspaceId(null);
        setBrand(null);
        setReady(true);
      }
    });
    return () => {
      alive = false;
      off();
    };
  }, []);

  const reloadWorkspaces = useCallback(async () => {
    if (!session) return;
    const ws = await backend.db.list<Workspace>('workspaces', {}, { column: 'created_at' });
    setWorkspaces(ws);
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(`sp:ws:${session.userId}`);
    } catch {
      /* ignore */
    }
    setWorkspaceId((cur) => (cur && ws.some((w) => w.id === cur) ? cur : ws.find((w) => w.id === saved)?.id ?? ws[0]?.id ?? null));
  }, [session]);

  useEffect(() => {
    if (!session) return;
    setReady(false);
    reloadWorkspaces().finally(() => setReady(true));
  }, [session, reloadWorkspaces]);

  useEffect(() => {
    if (!workspaceId || !session) {
      setBrand(null);
      return;
    }
    try {
      localStorage.setItem(`sp:ws:${session.userId}`, workspaceId);
    } catch {
      /* ignore */
    }
    backend.db.list<BrandProfile>('brand_profiles', { workspace_id: workspaceId }).then((b) => setBrand(b[0] ?? null));
  }, [workspaceId, session]);

  const notify = useCallback((text: string, tone: Notice['tone'] = 'info') => {
    const n: Notice = { id: uid(), text, at: nowIso(), read: false, tone };
    setNotices((ns) => [n, ...ns].slice(0, 30));
    setToast(n);
    window.setTimeout(() => setToast((t) => (t?.id === n.id ? null : t)), 4000);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      backend,
      session,
      ready,
      workspaces,
      workspace: workspaces.find((w) => w.id === workspaceId) ?? null,
      brand,
      selectWorkspace: setWorkspaceId,
      reloadWorkspaces,
      setBrand,
      notices,
      notify,
      markNoticesRead: () => setNotices((ns) => ns.map((n) => ({ ...n, read: true }))),
      toast,
      theme,
      toggleTheme: () =>
        setTheme((t) => {
          const next = t === 'dark' ? 'light' : 'dark';
          try {
            localStorage.setItem('sp:theme', next);
          } catch {
            /* ignore */
          }
          return next;
        }),
    }),
    [session, ready, workspaces, workspaceId, brand, reloadWorkspaces, notices, notify, toast, theme],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside provider');
  return v;
}

/** Workspace-scoped helpers; pages render only when a workspace exists. */
export function useWorkspace() {
  const app = useApp();
  if (!app.workspace) throw new Error('No workspace');
  return { ...app, workspace: app.workspace, db: app.backend.db };
}
