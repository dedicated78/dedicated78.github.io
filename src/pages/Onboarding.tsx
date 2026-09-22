import { useState } from 'react';
import { useApp } from '../state/AppContext';
import type { BrandProfile, Workspace } from '../lib/types';
import { BrandForm } from './BrandPage';
import { Field } from '../components/ui';

/** Step 1: workspace. Step 2: brand profile. Shown until the user has a workspace. */
export function Onboarding() {
  const app = useApp();
  const [name, setName] = useState('');
  const [ws, setWs] = useState<Workspace | null>(null);

  return (
    <div className="onboard">
      <div className="onboard-inner">
        <p className="eyebrow">Step {ws ? 2 : 1} of 2</p>
        {!ws ? (
          <form
            className="card"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim()) return;
              setWs(await app.backend.db.insert<Workspace>('workspaces', { name: name.trim() }));
            }}
          >
            <h1>Create a workspace</h1>
            <p className="muted">One workspace per brand or client. You can add more later.</p>
            <Field id="ob-ws" label="Workspace name">
              <input id="ob-ws" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summit Roofing Co." autoFocus />
            </Field>
            <button className="btn btn-primary" disabled={!name.trim()}>
              Continue
            </button>
          </form>
        ) : (
          <>
            <h1>Brand profile</h1>
            <p className="muted">The Social Strategy Director and all three channel specialists work from this profile.</p>
            <BrandForm
              initial={null}
              saveLabel="Finish setup"
              onSave={async (fields) => {
                await app.backend.db.insert<BrandProfile>('brand_profiles', { ...fields, workspace_id: ws.id });
                await app.reloadWorkspaces();
                app.selectWorkspace(ws.id);
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
