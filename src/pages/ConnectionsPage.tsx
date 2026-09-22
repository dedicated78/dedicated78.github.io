import { useCallback, useEffect, useState } from 'react';
import { useWorkspace } from '../state/AppContext';
import type { Platform, SocialConnection } from '../lib/types';
import { PLATFORMS } from '../lib/types';
import { PLATFORM_META } from '../lib/platforms';
import { cx, fmtDateTime } from '../lib/util';
import { Confirm, PageHeader, PlatformBadge, Spinner } from '../components/ui';
import { IconCheck, IconLock, IconSync, IconX } from '../components/Icons';

const READS: Record<Platform, string[]> = {
  instagram: ['Account identity', 'Recent posts and Reels', 'Available post and account insights'],
  linkedin: ['Profile identity', 'Recent posts where the API exposes them', 'Available engagement counts'],
  x: ['Account identity', 'Recent posts', 'Available public engagement counts'],
};
const NEVER = ['Publish or schedule posts', 'Comment or reply', 'Send direct messages', 'Follow, like or repost', 'Delete or edit anything', 'Change account settings'];

export function ConnectionsPage() {
  const app = useWorkspace();
  const [conns, setConns] = useState<SocialConnection[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState<SocialConnection | null>(null);

  const load = useCallback(async () => {
    const cs = await app.db.list<SocialConnection>('social_connections', { workspace_id: app.workspace.id });
    setConns(cs);
    return cs;
  }, [app.db, app.workspace.id]);

  useEffect(() => {
    // Returning from an OAuth hand-off: confirm any pending connections.
    load().then(async (cs) => {
      const pending = cs.filter((c) => c.state === 'pending');
      if (!pending.length) return;
      for (const c of pending) await app.backend.social.refreshStatus(c.id).catch(() => undefined);
      load();
    });
  }, [load, app.backend.social]);

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try {
      await fn();
      if (ok) app.notify(ok, 'success');
    } catch (e) {
      app.notify((e as Error).message, 'error');
    } finally {
      setBusy(null);
      load();
    }
  };

  return (
    <>
      <PageHeader
        title="Connections"
        subtitle={
          <>
            <IconLock width={14} height={14} /> Optional and read-only. Connections feed analytics and give specialists context — SocialPilot cannot post anything.
          </>
        }
      />
      <div className="conn-grid">
        {PLATFORMS.map((p) => {
          const c = conns.find((x) => x.platform === p);
          const state = c?.state ?? 'disconnected';
          return (
            <section key={p} className="card conn-card" aria-labelledby={`conn-${p}`}>
              <div className="panel-head">
                <h2 id={`conn-${p}`}>
                  <PlatformBadge platform={p} />
                </h2>
                <span className={cx('conn-state', `cs-${state}`)}>
                  {state === 'connected' ? 'Connected' : state === 'pending' ? 'Awaiting authorization' : state === 'error' ? 'Needs attention' : 'Not connected'}
                </span>
              </div>
              {c && state !== 'disconnected' && (
                <p className="small">
                  {c.account_label || 'Account'} · last sync {c.last_synced_at ? fmtDateTime(c.last_synced_at) : 'never'}
                </p>
              )}
              {c?.last_error && state === 'error' && <p className="form-error small">{c.last_error}</p>}
              <div className="perm">
                <h3>Reads</h3>
                <ul>
                  {READS[p].map((r) => (
                    <li key={r}>
                      <IconCheck width={14} height={14} /> {r}
                    </li>
                  ))}
                </ul>
                <h3>Never</h3>
                <ul className="never">
                  {NEVER.map((r) => (
                    <li key={r}>
                      <IconX width={14} height={14} /> {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="row gap conn-actions">
                {state === 'connected' ? (
                  <>
                    <button className="btn btn-ghost" disabled={!!busy} onClick={() => run(p + 'sync', () => app.backend.social.sync(c!.id, 120), `${PLATFORM_META[p].label} metrics synced`)}>
                      {busy === p + 'sync' ? <Spinner /> : <IconSync width={16} height={16} />} Sync now
                    </button>
                    <button className="btn btn-danger-ghost" disabled={!!busy} onClick={() => setAsk(c!)}>
                      Disconnect
                    </button>
                  </>
                ) : state === 'pending' ? (
                  <>
                    <button className="btn btn-ghost" disabled={!!busy} onClick={() => run(p + 'st', () => app.backend.social.refreshStatus(c!.id))}>
                      Check status
                    </button>
                    <button className="btn btn-ghost" disabled={!!busy} onClick={() => run(p + 'dc', () => app.backend.social.disconnect(c!.id))}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn-primary"
                    disabled={!!busy}
                    onClick={() =>
                      run(p + 'c', async () => {
                        const r = await app.backend.social.connect(app.workspace.id, p);
                        if (r.redirectUrl) window.location.assign(r.redirectUrl);
                        else app.notify(`${PLATFORM_META[p].label} connected (read-only)`, 'success');
                      })
                    }
                  >
                    {busy === p + 'c' ? <Spinner /> : null} Connect read-only
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
      {ask && (
        <Confirm
          title={`Disconnect ${PLATFORM_META[ask.platform].label}?`}
          body="Access is revoked and syncing stops. Your drafts, calendar, strategies and previously imported analytics history are kept."
          confirmLabel="Disconnect"
          onCancel={() => setAsk(null)}
          onConfirm={() => {
            const c = ask;
            setAsk(null);
            run(c.id, () => app.backend.social.disconnect(c.id), `${PLATFORM_META[c.platform].label} disconnected — drafts kept`);
          }}
        />
      )}
    </>
  );
}
