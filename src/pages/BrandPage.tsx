import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, useWorkspace } from '../state/AppContext';
import type { BrandProfile, SocialConnection, Workspace } from '../lib/types';
import { Confirm, Field, PageHeader } from '../components/ui';
import { lines } from '../lib/util';

type BrandFields = Omit<BrandProfile, 'id' | 'created_at' | 'updated_at' | 'owner_id' | 'workspace_id' | 'prohibited_topics'> & { prohibited: string };

const EMPTY: BrandFields = { brand_name: '', industry: '', voice: '', audience: '', goals: '', offers: '', vocabulary: '', prohibited: '' };

function toFields(b: BrandProfile | null): BrandFields {
  if (!b) return EMPTY;
  return { brand_name: b.brand_name, industry: b.industry, voice: b.voice, audience: b.audience, goals: b.goals, offers: b.offers, vocabulary: b.vocabulary, prohibited: b.prohibited_topics.join('\n') };
}

export function BrandForm({ initial, onSave, saveLabel }: { initial: BrandProfile | null; onSave: (f: Omit<BrandProfile, 'id' | 'created_at' | 'workspace_id'>) => Promise<void>; saveLabel: string }) {
  const [f, setF] = useState<BrandFields>(toFields(initial));
  const [busy, setBusy] = useState(false);
  useEffect(() => setF(toFields(initial)), [initial]);
  const set = (k: keyof BrandFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { prohibited, ...rest } = f;
      await onSave({ ...rest, prohibited_topics: lines(prohibited) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card form-grid" onSubmit={submit}>
      <Field id="b-name" label="Brand name">
        <input id="b-name" value={f.brand_name} onChange={set('brand_name')} required />
      </Field>
      <Field id="b-ind" label="Industry / category">
        <input id="b-ind" value={f.industry} onChange={set('industry')} placeholder="e.g. Residential roofing" />
      </Field>
      <Field id="b-voice" label="Brand voice" hint="3–5 adjectives plus one sentence on how you sound.">
        <textarea id="b-voice" rows={3} value={f.voice} onChange={set('voice')} placeholder="Plainspoken, confident, helpful. We explain like a trusted foreman, never a salesperson." />
      </Field>
      <Field id="b-aud" label="Target audience">
        <textarea id="b-aud" rows={3} value={f.audience} onChange={set('audience')} placeholder="Homeowners 35–65 in the metro area planning a repair or replacement" />
      </Field>
      <Field id="b-goals" label="Goals">
        <textarea id="b-goals" rows={3} value={f.goals} onChange={set('goals')} placeholder="Book more inspections; build trust before the first call" />
      </Field>
      <Field id="b-offers" label="Offers" hint="One per line.">
        <textarea id="b-offers" rows={3} value={f.offers} onChange={set('offers')} placeholder={'Free roof inspection\nStorm damage assessment'} />
      </Field>
      <Field id="b-vocab" label="Vocabulary" hint="Words to use and words to avoid.">
        <textarea id="b-vocab" rows={3} value={f.vocabulary} onChange={set('vocabulary')} placeholder="Use: crew, inspection, warranty. Avoid: cheap, guaranteed lowest price" />
      </Field>
      <Field id="b-prohib" label="Prohibited topics" hint="One per line. Every agent is instructed to avoid these.">
        <textarea id="b-prohib" rows={3} value={f.prohibited} onChange={set('prohibited')} placeholder={'Politics\nCompetitor names\nPricing guarantees'} />
      </Field>
      <div className="form-actions span-2">
        <button className="btn btn-primary" disabled={busy || !f.brand_name.trim()}>
          {busy ? 'Saving…' : saveLabel}
        </button>
      </div>
    </form>
  );
}

export function BrandPage() {
  const app = useWorkspace();
  const nav = useNavigate();
  const [confirm, setConfirm] = useState<'workspace' | 'account' | null>(null);
  const [wsName, setWsName] = useState(app.workspace.name);
  useEffect(() => setWsName(app.workspace.name), [app.workspace]);

  const save = async (fields: Omit<BrandProfile, 'id' | 'created_at' | 'workspace_id'>) => {
    const saved = app.brand
      ? await app.db.update<BrandProfile>('brand_profiles', app.brand.id, fields)
      : await app.db.insert<BrandProfile>('brand_profiles', { ...fields, workspace_id: app.workspace.id });
    app.setBrand(saved);
    app.notify('Brand profile saved', 'success');
  };

  return (
    <>
      <PageHeader title="Brand" subtitle="Every agent receives this profile. Keep it specific — it's the difference between generic and on-brand drafts." />
      <BrandForm initial={app.brand} onSave={save} saveLabel="Save brand profile" />

      <section className="card danger-zone" aria-labelledby="ws-h">
        <h2 id="ws-h">Workspace & account</h2>
        <div className="row-form">
          <Field id="ws-rename" label="Workspace name">
            <input id="ws-rename" value={wsName} onChange={(e) => setWsName(e.target.value)} />
          </Field>
          <button
            className="btn btn-ghost"
            disabled={!wsName.trim() || wsName === app.workspace.name}
            onClick={async () => {
              await app.db.update<Workspace>('workspaces', app.workspace.id, { name: wsName.trim() });
              await app.reloadWorkspaces();
              app.notify('Workspace renamed', 'success');
            }}
          >
            Rename
          </button>
        </div>
        <div className="danger-actions">
          <button className="btn btn-danger-ghost" onClick={() => setConfirm('workspace')}>
            Delete workspace
          </button>
          <button className="btn btn-danger-ghost" onClick={() => setConfirm('account')}>
            Delete account
          </button>
        </div>
      </section>

      {confirm === 'workspace' && (
        <Confirm
          title={`Delete “${app.workspace.name}”?`}
          body="This permanently deletes the workspace's brand profile, strategies, calendar, drafts, revision history, analytics history and recommendations. Connected accounts in this workspace are disconnected. This cannot be undone."
          confirmLabel="Delete workspace"
          onCancel={() => setConfirm(null)}
          onConfirm={async () => {
            setConfirm(null);
            const conns = await app.db.list<SocialConnection>('social_connections', { workspace_id: app.workspace.id });
            for (const c of conns) if (c.state !== 'disconnected') await app.backend.social.disconnect(c.id).catch(() => undefined);
            await app.db.remove('workspaces', app.workspace.id);
            await app.reloadWorkspaces();
            app.notify('Workspace deleted', 'success');
            nav('/');
          }}
        />
      )}
      {confirm === 'account' && <DeleteAccount onCancel={() => setConfirm(null)} />}
    </>
  );
}

function DeleteAccount({ onCancel }: { onCancel: () => void }) {
  const app = useApp();
  const [typed, setTyped] = useState('');
  const [err, setErr] = useState<string | null>(null);
  return (
    <Confirm
      title="Delete your account?"
      body={
        <>
          <p>All workspaces and records you own are deleted and every social connection is revoked. Type DELETE to confirm.</p>
          <label className="sr-only" htmlFor="del-confirm">
            Type DELETE to confirm
          </label>
          <input id="del-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          {err && (
            <p className="form-error" role="alert">
              {err}
            </p>
          )}
        </>
      }
      confirmLabel="Delete account"
      onCancel={onCancel}
      onConfirm={async () => {
        if (typed !== 'DELETE') {
          setErr('Type DELETE in capitals to confirm.');
          return;
        }
        try {
          await app.backend.deleteAccount();
        } catch (e) {
          setErr((e as Error).message);
        }
      }}
    />
  );
}
