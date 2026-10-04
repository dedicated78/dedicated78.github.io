import { useRef, useState, type FormEvent } from 'react';
import { KeyRound, LogOut } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Button, Field, Input } from '@/components/ui';
import { Modal, useToast } from '@/components/overlays';
import { useClickOutside } from '@/hooks/useClickOutside';
import { supabase, errorMessage } from '@/lib/supabase';
import { initials } from '@/lib/format';
import { ROLE_LABELS } from '@/types';

function ChangePassword({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setError('Use at least 8 characters.');
    if (pw !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) return setError(err.message);
    toast.success('Password updated');
    setPw('');
    setConfirm('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change password"
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" form="change-password" loading={busy}>
            Update password
          </Button>
        </>
      }
    >
      <form id="change-password" onSubmit={submit} className="space-y-4">
        <Field label="New password" required hint="At least 8 characters">
          {(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />}
        </Field>
        <Field label="Confirm new password" required error={error}>
          {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!error} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
        </Field>
      </form>
    </Modal>
  );
}

export function AccountMenu() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);
  const toast = useToast();

  if (!profile) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${profile.full_name}`}
        className="flex size-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 hover:bg-brand-200"
      >
        {initials(profile.full_name)}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-11 z-50 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-pop">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-ink">{profile.full_name}</p>
            <p className="truncate text-xs text-mute">{profile.email}</p>
            <p className="mt-0.5 text-xs text-brand-700">{ROLE_LABELS[profile.role]}</p>
          </div>
          <div className="my-1 border-t border-line" />
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              setPwOpen(true);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-soft hover:bg-sunken"
          >
            <KeyRound className="size-4" aria-hidden /> Change password
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              void signOut().catch((e) => toast.error(errorMessage(e)));
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink-soft hover:bg-sunken"
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </div>
      )}
      <ChangePassword open={pwOpen} onClose={() => setPwOpen(false)} />
    </div>
  );
}
