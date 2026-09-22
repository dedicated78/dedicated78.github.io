import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { IconLock } from '../components/Icons';

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const app = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';

  const emailErr = email && !/^\S+@\S+\.\S+$/.test(email) ? 'Enter a valid email address.' : null;
  const pwErr = signup && password && password.length < 8 ? 'Use at least 8 characters.' : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (emailErr || pwErr || !email || !password) {
      setError('Check the highlighted fields.');
      return;
    }
    setBusy(true);
    try {
      if (signup) {
        const r = await app.backend.auth.signUp(email, password);
        if (r.needsConfirmation) setInfo('Check your inbox to confirm your email, then log in.');
      } else {
        await app.backend.auth.signIn(email, password);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit} noValidate>
        <div className="auth-brand">
          <svg viewBox="0 0 32 32" width="36" height="36" aria-hidden="true">
            <rect width="32" height="32" rx="9" fill="var(--accent-strong)" />
            <path d="M9 20l7-11 7 11-7-3z" fill="#fff" />
          </svg>
          <span>SocialPilot AI</span>
        </div>
        <h1>{signup ? 'Create your workspace' : 'Welcome back'}</h1>
        <p className="muted">Strategy, calendars and platform-native drafts for Instagram, LinkedIn and X.</p>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!emailErr} aria-describedby={emailErr ? 'email-err' : undefined} required />
          {emailErr && (
            <small className="err" id="email-err">
              {emailErr}
            </small>
          )}
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={signup ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!pwErr}
            aria-describedby={pwErr ? 'pw-err' : undefined}
            required
          />
          {pwErr && (
            <small className="err" id="pw-err">
              {pwErr}
            </small>
          )}
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="form-info" role="status">
            {info}
          </p>
        )}
        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Please wait…' : signup ? 'Sign up' : 'Log in'}
        </button>
        <p className="auth-switch">
          {signup ? (
            <>
              Already have an account? <Link to="/login">Log in</Link>
            </>
          ) : (
            <>
              New to SocialPilot? <Link to="/signup">Create an account</Link>
            </>
          )}
        </p>
        <p className="auth-note">
          <IconLock width={14} height={14} /> Social connections are optional and read-only. SocialPilot drafts content — it never publishes, comments or messages on your behalf.
        </p>
        {app.backend.mode === 'demo' && <p className="auth-note">Demo mode: accounts and data are stored only in this browser.</p>}
      </form>
    </div>
  );
}
