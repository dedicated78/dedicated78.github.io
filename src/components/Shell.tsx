import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useWorkspace } from '../state/AppContext';
import type { CalendarItem, Draft, Strategy, Workspace } from '../lib/types';
import { cx, fmtDateTime } from '../lib/util';
import { PlatformBadge, Modal, Field } from './ui';
import {
  IconBell,
  IconBrand,
  IconCalendar,
  IconChart,
  IconCommand,
  IconDrafts,
  IconLink,
  IconLogout,
  IconMoon,
  IconPlus,
  IconSearch,
  IconSun,
} from './Icons';

const NAV = [
  { to: '/', label: 'Command Center', short: 'Command', icon: IconCommand, end: true },
  { to: '/calendar', label: 'Calendar', short: 'Calendar', icon: IconCalendar },
  { to: '/drafts', label: 'Drafts', short: 'Drafts', icon: IconDrafts },
  { to: '/analytics', label: 'Analytics', short: 'Analytics', icon: IconChart },
  { to: '/brand', label: 'Brand', short: 'Brand', icon: IconBrand },
  { to: '/connections', label: 'Connections', short: 'Connect', icon: IconLink },
];

export function Shell() {
  const app = useWorkspace();
  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <nav className="sidenav" aria-label="Primary">
        <div className="logo" aria-label="SocialPilot AI">
          <span className="logo-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="28" height="28">
              <rect width="32" height="32" rx="9" fill="var(--accent-strong)" />
              <path d="M9 20l7-11 7 11-7-3z" fill="#fff" />
            </svg>
          </span>
        </div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('nav-item', isActive && 'active')} title={n.label}>
            <n.icon width={22} height={22} />
            <span className="nav-label">{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="main-col">
        <TopBar />
        {app.backend.mode === 'demo' && (
          <div className="demo-banner" role="note">
            Demo mode: data stays in this browser, analytics are sample data and the copilot uses templates. Connect Supabase to go live.
          </div>
        )}
        <main id="main" className="content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <nav className="bottomnav" aria-label="Primary">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('bn-item', isActive && 'active')}>
            <n.icon width={22} height={22} />
            <span>{n.short}</span>
          </NavLink>
        ))}
      </nav>
      {app.toast && (
        <div className={cx('toast', `toast-${app.toast.tone}`)} role="status" aria-live="polite">
          {app.toast.text}
        </div>
      )}
    </div>
  );
}

function TopBar() {
  const app = useWorkspace();
  const [newWs, setNewWs] = useState(false);
  const [bell, setBell] = useState(false);
  const unread = app.notices.filter((n) => !n.read).length;
  return (
    <header className="topbar">
      <label className="sr-only" htmlFor="ws-select">
        Workspace
      </label>
      <select
        id="ws-select"
        className="ws-select"
        value={app.workspace.id}
        onChange={(e) => (e.target.value === '__new' ? setNewWs(true) : app.selectWorkspace(e.target.value))}
      >
        {app.workspaces.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
        <option value="__new">+ New workspace…</option>
      </select>
      <GlobalSearch />
      <div className="topbar-actions">
        <div className="popover-wrap">
          <button
            className="icon-btn"
            aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
            aria-expanded={bell}
            onClick={() => {
              setBell((b) => !b);
              app.markNoticesRead();
            }}
          >
            <IconBell />
            {unread > 0 && <span className="dot-count">{unread}</span>}
          </button>
          {bell && (
            <div className="popover" role="dialog" aria-label="Notifications">
              <h3>Notifications</h3>
              {app.notices.length === 0 ? (
                <p className="muted small">Nothing yet. Generation and sync results show up here.</p>
              ) : (
                <ul className="notice-list">
                  {app.notices.map((n) => (
                    <li key={n.id} className={`notice-${n.tone}`}>
                      <span>{n.text}</span>
                      <time className="muted small">{fmtDateTime(n.at)}</time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <button className="icon-btn" onClick={app.toggleTheme} aria-label={`Switch to ${app.theme === 'dark' ? 'light' : 'dark'} theme`}>
          {app.theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
        <button className="icon-btn" onClick={() => app.backend.auth.signOut()} aria-label={`Log out ${app.session?.email ?? ''}`} title={app.session?.email}>
          <IconLogout />
        </button>
      </div>
      {newWs && <NewWorkspaceModal onClose={() => setNewWs(false)} />}
    </header>
  );
}

export function NewWorkspaceModal({ onClose }: { onClose: () => void }) {
  const app = useWorkspace();
  const [name, setName] = useState('');
  const nav = useNavigate();
  const create = async () => {
    if (!name.trim()) return;
    const w = await app.backend.db.insert<Workspace>('workspaces', { name: name.trim() });
    await app.reloadWorkspaces();
    app.selectWorkspace(w.id);
    onClose();
    nav('/brand');
  };
  return (
    <Modal
      title="New workspace"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={create} disabled={!name.trim()}>
            <IconPlus width={16} height={16} /> Create
          </button>
        </>
      }
    >
      <Field id="ws-name" label="Workspace name" hint="One workspace per brand or client. Drafts, strategies and connections stay separate.">
        <input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
      </Field>
    </Modal>
  );
}

type Hit = { id: string; kind: 'Draft' | 'Strategy'; title: string; sub: string; to: string; platform?: CalendarItem['platform'] };

function GlobalSearch() {
  const app = useWorkspace();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState<Hit[] | null>(null);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setIndex(null), [app.workspace.id]);
  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const build = async () => {
    const ws = app.workspace.id;
    const [items, drafts, strategies] = await Promise.all([
      app.db.list<CalendarItem>('calendar_items', { workspace_id: ws }),
      app.db.list<Draft>('drafts', { workspace_id: ws }),
      app.db.list<Strategy>('strategies', { workspace_id: ws }),
    ]);
    const bodies = new Map(drafts.map((d) => [d.calendar_item_id, Object.values(d.variants).map((v) => v?.body).join(' ')]));
    setIndex([
      ...items.map((i) => ({ id: i.id, kind: 'Draft' as const, title: i.title, sub: `${i.pillar} · ${i.format} · ${bodies.get(i.id) ?? ''}`, to: `/drafts/${i.id}`, platform: i.platform })),
      ...strategies.map((s) => ({ id: s.id, kind: 'Strategy' as const, title: s.title, sub: s.brief, to: `/?strategy=${s.id}` })),
    ]);
  };

  const hits = q.trim() && index ? index.filter((h) => `${h.title} ${h.sub}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8) : [];
  const go = (h: Hit) => {
    nav(h.to);
    setOpen(false);
    setQ('');
  };

  return (
    <div className="search" ref={box}>
      <IconSearch className="search-icon" width={18} height={18} />
      <input
        type="search"
        placeholder="Search drafts and strategies"
        aria-label="Search drafts and strategies"
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls="search-results"
        value={q}
        onFocus={() => {
          build();
          setOpen(true);
        }}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, hits.length - 1));
          if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
          if (e.key === 'Enter' && hits[active]) go(hits[active]);
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {open && q.trim() && (
        <ul className="search-results" id="search-results" role="listbox">
          {hits.length === 0 && <li className="muted small search-empty">No matches in this workspace.</li>}
          {hits.map((h, i) => (
            <li key={h.kind + h.id} role="option" aria-selected={i === active}>
              <button className={cx('search-hit', i === active && 'active')} onClick={() => go(h)}>
                <span className="small muted">{h.kind}</span>
                {h.platform && <PlatformBadge platform={h.platform} compact />}
                <span className="search-title">{h.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
