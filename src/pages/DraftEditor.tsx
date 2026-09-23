import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useWorkspace } from '../state/AppContext';
import type { Campaign, CalendarItem, Draft, DraftVersion, ItemStatus, Platform, Variant } from '../lib/types';
import { PLATFORMS, STATUSES } from '../lib/types';
import { PLATFORM_META, STATUS_META } from '../lib/platforms';
import { copyText, cx, fmtDateTime, toDateInput } from '../lib/util';
import { copyableText, emptyVariant, primaryFields, saveRevision } from '../lib/records';
import { AiLabel, Confirm, Empty, Field, InternalPlanNote, PlatformBadge, Spinner, StatusPill } from '../components/ui';
import { IconChevronLeft, IconCopy, IconHistory, IconInfo, IconLock, IconPlus, IconSpark, IconX } from '../components/Icons';

export function DraftEditor() {
  const { itemId } = useParams();
  const app = useWorkspace();
  const nav = useNavigate();
  const [item, setItem] = useState<CalendarItem | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [variants, setVariants] = useState<Partial<Record<Platform, Variant>>>({});
  const [versions, setVersions] = useState<DraftVersion[]>([]);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [tab, setTab] = useState<Platform>('instagram');
  const [dirty, setDirty] = useState(false);
  const [meta, setMeta] = useState<Partial<CalendarItem>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState<'delete' | 'leave' | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!itemId) return;
    const it = await app.db.get<CalendarItem>('calendar_items', itemId);
    setLoaded(true);
    if (!it || it.workspace_id !== app.workspace.id) return setItem(null);
    const d = (await app.db.list<Draft>('drafts', { calendar_item_id: it.id }))[0] ?? null;
    setItem(it);
    setDraft(d);
    setVariants(d?.variants ?? {});
    setTab(it.platform);
    setMeta({});
    setDirty(false);
    if (d) setVersions(await app.db.list<DraftVersion>('draft_versions', { draft_id: d.id }, { column: 'version', ascending: false }));
    setCampaign(it.campaign_id ? await app.db.get<Campaign>('campaigns', it.campaign_id) : null);
  }, [app.db, app.workspace.id, itemId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (!loaded) return <Spinner />;
  if (!item)
    return (
      <Empty title="Draft not found" action={<Link className="btn btn-primary" to="/drafts">Back to drafts</Link>}>
        It may have been deleted or belongs to another workspace.
      </Empty>
    );

  const v = variants[tab];
  const setV = (patch: Partial<Variant>) => {
    setVariants((vs) => ({ ...vs, [tab]: { ...(vs[tab] ?? emptyVariant()), ...patch } }));
    setDirty(true);
  };
  const merged = { ...item, ...meta };

  const save = async (note = 'Edited') => {
    setBusy('save');
    try {
      let d = draft;
      if (!d) d = await app.db.insert<Draft>('drafts', { workspace_id: app.workspace.id, calendar_item_id: item.id, variants: {}, ai_provenance: null, current_version: 0, ...primaryFields(item.platform, {}) });
      const saved = await saveRevision(app.db, d, item.platform, variants, 'user', note);
      let it = item;
      const hasBody = !!saved.body.trim();
      const nextStatus: ItemStatus = item.status === 'idea' && hasBody ? 'draft' : item.status;
      if (Object.keys(meta).length || nextStatus !== item.status) it = await app.db.update<CalendarItem>('calendar_items', item.id, { ...meta, status: nextStatus });
      setItem(it);
      setMeta({});
      setDraft(saved);
      setVersions(await app.db.list<DraftVersion>('draft_versions', { draft_id: saved.id }, { column: 'version', ascending: false }));
      setDirty(false);
      app.notify(`Saved revision v${saved.current_version}`, 'success');
      return { saved, it };
    } finally {
      setBusy(null);
    }
  };

  const setStatus = async (s: ItemStatus) => {
    let body = draft?.body ?? '';
    let base = item;
    if (dirty) {
      const r = await save('Saved before status change');
      body = r.saved.body;
      base = r.it;
    }
    if (s === 'ready' && !body.trim()) {
      app.notify(`Write the ${PLATFORM_META[item.platform].label} copy before marking Ready`, 'error');
      return;
    }
    const it = await app.db.update<CalendarItem>('calendar_items', base.id, { status: s });
    setItem(it);
    app.notify(s === 'ready' ? 'Marked Ready — copy it into your publishing tool when it\'s time' : `Moved to ${STATUS_META[s].label}`, 'success');
  };

  const genVariants = async (targets: Platform[]) => {
    const source = variants[item.platform];
    if (!app.brand || !source?.body.trim()) {
      app.notify(`Write the ${PLATFORM_META[item.platform].label} draft first; variants are adapted from it`, 'error');
      return;
    }
    setBusy('variants');
    try {
      const res = await app.backend.copilot.variants({ source_platform: item.platform, source, title: merged.title, pillar: merged.pillar, targets, brand: app.brand });
      const next = { ...variants, ...res.data };
      let d = draft!;
      if (dirty) d = (await save('Saved before generating variants')).saved;
      const saved = await saveRevision(app.db, { ...d, ai_provenance: d.ai_provenance ?? res.provenance }, item.platform, next, 'ai', `Generated ${targets.map((t) => PLATFORM_META[t].label).join(', ')} variant`);
      setDraft(saved);
      setVariants(saved.variants);
      setVersions(await app.db.list<DraftVersion>('draft_versions', { draft_id: saved.id }, { column: 'version', ascending: false }));
      setTab(targets[0]);
      app.notify('Channel variants drafted', 'success');
    } catch (e) {
      app.notify((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    if (!v) return;
    if (await copyText(copyableText(tab, v))) app.notify(`${PLATFORM_META[tab].label} draft copied — paste it into your publishing tool`, 'success');
  };

  const bodyLen = v?.body.length ?? 0;
  const limit = PLATFORM_META[tab].bodyLimit;
  const missing = PLATFORMS.filter((p) => !variants[p]?.body);
  const plannedLocal = new Date(merged.planned_at!);

  return (
    <div className="editor">
      <div className="editor-head">
        <button className="btn btn-ghost btn-sm" onClick={() => (dirty ? setAsk('leave') : nav(-1))}>
          <IconChevronLeft width={16} height={16} /> Back
        </button>
        <div className="editor-status" role="group" aria-label="Status">
          {STATUSES.map((s) => (
            <button key={s} className={cx('step', item.status === s && 'step-on')} aria-pressed={item.status === s} onClick={() => setStatus(s)} title={STATUS_META[s].hint}>
              {STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="editor-grid">
        <div className="editor-main card">
          <label htmlFor="ed-title" className="sr-only">
            Title
          </label>
          <input
            id="ed-title"
            className="title-input"
            value={merged.title}
            onChange={(e) => {
              setMeta({ ...meta, title: e.target.value });
              setDirty(true);
            }}
          />
          <div className="editor-sub">
            <PlatformBadge platform={item.platform} /> <StatusPill status={item.status} /> <AiLabel provenance={draft?.ai_provenance} />
            {dirty && <span className="unsaved">Unsaved changes</span>}
          </div>

          <div className="tabs" role="tablist" aria-label="Platform versions">
            {PLATFORMS.map((p) => (
              <button key={p} role="tab" id={`tab-${p}`} aria-selected={tab === p} aria-controls={`panel-${p}`} className={cx('tab', tab === p && 'tab-on')} onClick={() => setTab(p)}>
                <PlatformBadge platform={p} />
                {p === item.platform && <span className="tab-primary">Primary</span>}
                {!variants[p]?.body && p !== item.platform && <span className="tab-empty">Empty</span>}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="tabpanel">
            {!v && tab !== item.platform ? (
              <div className="variant-empty">
                <p>No {PLATFORM_META[tab].label} version yet. The {PLATFORM_META[tab].specialist} can adapt the primary draft into a native post.</p>
                <div className="row gap">
                  <button className="btn btn-primary" onClick={() => genVariants([tab])} disabled={!!busy}>
                    <IconSpark width={16} height={16} /> Generate {PLATFORM_META[tab].label} variant
                  </button>
                  <button className="btn btn-ghost" onClick={() => setV({})}>
                    Start blank
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="field">
                  <div className="label-row">
                    <label htmlFor="ed-body">{tab === 'x' ? 'Post' : tab === 'instagram' ? 'Caption' : 'Post'}</label>
                    <span className={cx('counter', bodyLen > limit && 'over')} aria-live="polite">
                      {bodyLen.toLocaleString()} / {limit.toLocaleString()}
                    </span>
                  </div>
                  <textarea id="ed-body" rows={tab === 'x' ? 4 : 11} value={v?.body ?? ''} onChange={(e) => setV({ body: e.target.value })} aria-describedby="ed-guide" />
                  <small className="hint" id="ed-guide">
                    <IconInfo width={13} height={13} /> {PLATFORM_META[tab].guidance}
                    {bodyLen > limit && <strong className="err"> Over the limit by {bodyLen - limit}.</strong>}
                  </small>
                </div>

                {tab === 'x' && <ThreadEditor thread={v?.thread ?? []} onChange={(thread) => setV({ thread })} />}

                <div className="grid-2">
                  <Field id="ed-cta" label="Call to action">
                    <input id="ed-cta" value={v?.cta ?? ''} onChange={(e) => setV({ cta: e.target.value })} />
                  </Field>
                  <Field id="ed-tags" label="Hashtags" hint="Space or comma separated">
                    <input id="ed-tags" value={(v?.hashtags ?? []).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')} onChange={(e) => setV({ hashtags: e.target.value.split(/[\s,]+/).map((h) => h.replace(/^#/, '')).filter(Boolean) })} />
                  </Field>
                </div>
                {tab === 'instagram' && (
                  <Field id="ed-visual" label="Visual concept" hint="Brief for the image, carousel or Reel. Create the asset in your design tool.">
                    <textarea id="ed-visual" rows={3} value={v?.visual_concept ?? ''} onChange={(e) => setV({ visual_concept: e.target.value })} />
                  </Field>
                )}
              </>
            )}
          </div>

          <div className="editor-actions">
            <p className="no-publish">
              <IconLock width={14} height={14} /> SocialPilot never publishes. Copy the draft and post it manually.
            </p>
            <div className="row gap">
              {missing.length > 0 && (
                <button className="btn btn-ghost" onClick={() => genVariants(missing.filter((p) => p !== item.platform))} disabled={!!busy || missing.every((p) => p === item.platform)}>
                  {busy === 'variants' ? <Spinner /> : <IconSpark width={16} height={16} />} Variants for other channels
                </button>
              )}
              <button className="btn btn-ghost" onClick={copy} disabled={!v?.body}>
                <IconCopy width={16} height={16} /> Copy Draft
              </button>
              <button className="btn btn-primary" onClick={() => save()} disabled={!dirty || !!busy}>
                {busy === 'save' ? 'Saving…' : 'Save revision'}
              </button>
            </div>
          </div>
        </div>

        <aside className="editor-side">
          <section className="card" aria-labelledby="plan-h">
            <h2 id="plan-h">Plan</h2>
            <p>
              <InternalPlanNote />
            </p>
            <div className="grid-2 tight">
              <Field id="ed-date" label="Planned date">
                <input
                  id="ed-date"
                  type="date"
                  value={toDateInput(plannedLocal)}
                  onChange={(e) => {
                    const [y, m, d] = e.target.value.split('-').map(Number);
                    const n = new Date(plannedLocal);
                    n.setFullYear(y, m - 1, d);
                    setMeta({ ...meta, planned_at: n.toISOString() });
                    setDirty(true);
                  }}
                />
              </Field>
              <Field id="ed-time" label="Planned time">
                <input
                  id="ed-time"
                  type="time"
                  value={`${String(plannedLocal.getHours()).padStart(2, '0')}:${String(plannedLocal.getMinutes()).padStart(2, '0')}`}
                  onChange={(e) => {
                    const [h, mi] = e.target.value.split(':').map(Number);
                    const n = new Date(plannedLocal);
                    n.setHours(h, mi);
                    setMeta({ ...meta, planned_at: n.toISOString() });
                    setDirty(true);
                  }}
                />
              </Field>
            </div>
            {(['pillar', 'format', 'objective'] as const).map((k) => (
              <Field key={k} id={`ed-${k}`} label={k === 'pillar' ? 'Content pillar' : k[0].toUpperCase() + k.slice(1)}>
                <input
                  id={`ed-${k}`}
                  value={merged[k] ?? ''}
                  onChange={(e) => {
                    setMeta({ ...meta, [k]: e.target.value });
                    setDirty(true);
                  }}
                />
              </Field>
            ))}
            <Field id="ed-notes" label="Notes">
              <textarea
                id="ed-notes"
                rows={3}
                value={merged.notes ?? ''}
                onChange={(e) => {
                  setMeta({ ...meta, notes: e.target.value });
                  setDirty(true);
                }}
              />
            </Field>
            {campaign && <p className="muted small">Campaign: {campaign.name}</p>}
          </section>

          <section className="card" aria-labelledby="hist-h">
            <h2 id="hist-h">
              <IconHistory width={18} height={18} /> Revision history
            </h2>
            {versions.length === 0 ? (
              <p className="muted small">No saved revisions yet.</p>
            ) : (
              <ol className="history">
                {versions.map((ver) => (
                  <li key={ver.id}>
                    <div>
                      <strong>v{ver.version}</strong> <span className={cx('src', `src-${ver.source}`)}>{ver.source === 'ai' ? 'AI' : 'You'}</span>
                      <div className="muted small">
                        {ver.note} · {fmtDateTime(ver.created_at)}
                      </div>
                    </div>
                    {ver.version !== draft?.current_version && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setVariants(ver.snapshot.variants);
                          setDirty(true);
                          app.notify(`Loaded v${ver.version} — save to keep it as a new revision`);
                        }}
                        aria-label={`Restore version ${ver.version}`}
                      >
                        Restore
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <button className="btn btn-danger-ghost btn-block" onClick={() => setAsk('delete')}>
            Delete item
          </button>
        </aside>
      </div>

      {ask === 'delete' && (
        <Confirm
          title="Delete this item?"
          body="The calendar item, all channel drafts and the full revision history will be permanently deleted. To keep it for reference, move it to Archived instead."
          confirmLabel="Delete permanently"
          onCancel={() => setAsk(null)}
          onConfirm={async () => {
            await app.db.remove('calendar_items', item.id);
            app.notify('Item deleted', 'success');
            nav('/drafts');
          }}
        />
      )}
      {ask === 'leave' && (
        <Confirm
          title="Discard unsaved changes?"
          body="Your edits since the last saved revision will be lost."
          confirmLabel="Discard"
          onCancel={() => setAsk(null)}
          onConfirm={() => nav(-1)}
        />
      )}
    </div>
  );
}

function ThreadEditor({ thread, onChange }: { thread: string[]; onChange: (t: string[]) => void }) {
  return (
    <fieldset className="thread">
      <legend>Thread {thread.length ? `(${thread.length} posts)` : '(optional)'}</legend>
      {thread.map((t, i) => (
        <div className="thread-post" key={i}>
          <div className="label-row">
            <label htmlFor={`th-${i}`}>Post {i + 1}</label>
            <span className={cx('counter', t.length > 280 && 'over')}>{t.length} / 280</span>
          </div>
          <div className="row gap">
            <textarea id={`th-${i}`} rows={3} value={t} onChange={(e) => onChange(thread.map((x, j) => (j === i ? e.target.value : x)))} />
            <button type="button" className="icon-btn" aria-label={`Remove post ${i + 1}`} onClick={() => onChange(thread.filter((_, j) => j !== i))}>
              <IconX width={16} height={16} />
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...thread, ''])}>
        <IconPlus width={14} height={14} /> Add thread post
      </button>
    </fieldset>
  );
}
