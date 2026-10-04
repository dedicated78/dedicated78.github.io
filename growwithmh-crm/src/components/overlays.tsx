import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import { Button } from './ui';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------- modal */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** `center` = dialog (bottom sheet on phones). `drawer` = right-hand panel. */
  variant?: 'center' | 'drawer';
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

/** Native <dialog>: focus trapping, Escape and aria-modal come from the platform. */
export function Modal({ open, onClose, title, description, children, footer, variant = 'center', size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const drawer = variant === 'drawer';

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cn('sheet fixed inset-0 m-0 h-full w-full open:flex', drawer ? 'items-stretch justify-end' : 'items-end justify-center sm:items-center sm:p-4')}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onMouseDown={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <div
          className={cn(
            'sheet-panel flex w-full flex-col bg-surface shadow-pop',
            drawer ? 'h-full sm:max-w-xl sm:rounded-l-2xl' : cn('max-h-[92vh] rounded-t-2xl sm:rounded-2xl', SIZES[size]),
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold text-ink">
                {title}
              </h2>
              {description && <p className="mt-0.5 text-sm text-mute">{description}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="-mr-1.5 -mt-1 rounded-full p-2 text-mute hover:bg-sunken hover:text-ink">
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-canvas/60 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

/* ------------------------------------------------------------------ confirm */

interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (opts) =>
      new Promise<boolean>((resolve) => {
        setState({ ...opts, resolve });
      }),
    [],
  );

  const close = (value: boolean) => {
    state?.resolve(value);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        title={state?.title ?? ''}
        size="sm"
        footer={
          <>
            <Button onClick={() => close(false)}>Cancel</Button>
            <Button variant={state?.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
              {state?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        {state?.message && <div className="text-sm text-ink-soft">{state.message}</div>}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}

/* -------------------------------------------------------------------- toast */

interface ToastItem {
  id: number;
  kind: 'success' | 'error';
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const push = useCallback((kind: ToastItem['kind'], message: string) => {
    const id = nextId.current++;
    setItems((cur) => [...cur.slice(-3), { id, kind, message }]);
    window.setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), kind === 'error' ? 7000 : 3500);
  }, []);

  const api = useMemo<ToastApi>(() => ({ success: (m) => push('success', m), error: (m) => push('error', m) }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-3 bottom-20 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:items-end">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex max-w-sm items-start gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink shadow-pop"
          >
            {t.kind === 'success' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-pos" aria-hidden /> : <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
