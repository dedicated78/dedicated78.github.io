import { Link, type LinkProps } from 'react-router-dom';
import { forwardRef, useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AccessItemStatus, AccessStatus, DealStage, LeadStatus, OnboardingStatus, PaymentStatus, Priority } from '@/types';

/* ------------------------------------------------------------------ buttons */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'positive';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 border border-brand-600 shadow-sm',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-sunken',
  ghost: 'bg-transparent text-ink-soft border border-transparent hover:bg-sunken',
  danger: 'bg-surface text-danger border border-line-strong hover:bg-danger-soft hover:border-danger/30',
  positive: 'bg-pos-ink text-white border border-pos-ink hover:brightness-95 shadow-sm',
};

export const buttonClass = (variant: Variant = 'secondary', size: Size = 'md', extra?: string) =>
  cn(
    'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
    size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-sm sm:h-9',
    VARIANTS[variant],
    extra,
  );

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({ variant = 'secondary', size = 'md', loading, disabled, className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ variant = 'secondary', size = 'md', className, ...rest }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

/* ------------------------------------------------------------------- badges */

export type Tone = 'neutral' | 'teal' | 'green' | 'amber' | 'red' | 'dark' | 'solidGreen';

const TONES: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-soft ring-line-strong/60',
  teal: 'bg-brand-50 text-brand-700 ring-brand-200/70',
  green: 'bg-pos-soft text-pos-ink ring-pos/25',
  amber: 'bg-warn-soft text-warn-ink ring-amber-300/50',
  red: 'bg-danger-soft text-danger ring-danger/20',
  dark: 'bg-brand-700 text-white ring-brand-700',
  solidGreen: 'bg-pos-ink text-white ring-pos-ink',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', TONES[tone], className)}>
      {children}
    </span>
  );
}

const LEAD_TONE: Record<LeadStatus, Tone> = {
  'Ready to Call': 'teal',
  Attempted: 'neutral',
  Connected: 'teal',
  Interested: 'green',
  'Follow-up': 'amber',
  'Meeting Booked': 'green',
  Qualified: 'dark',
  Won: 'solidGreen',
  Lost: 'neutral',
  'Do Not Contact': 'red',
};
export const StatusBadge = ({ status }: { status: LeadStatus }) => <Badge tone={LEAD_TONE[status]}>{status}</Badge>;

const STAGE_TONE: Record<DealStage, Tone> = {
  'New Qualified Lead': 'teal',
  Discovery: 'teal',
  'Meeting Booked': 'green',
  'Proposal Needed': 'amber',
  'Proposal Sent': 'amber',
  Negotiation: 'amber',
  Won: 'solidGreen',
  Lost: 'neutral',
};
export const StageBadge = ({ stage }: { stage: DealStage }) => <Badge tone={STAGE_TONE[stage]}>{stage}</Badge>;

const PRIORITY_TONE: Record<Priority, Tone> = { High: 'red', Medium: 'amber', Low: 'neutral' };
export const PriorityBadge = ({ priority }: { priority: Priority }) => (
  <Badge tone={PRIORITY_TONE[priority]}>
    <span aria-hidden className={cn('size-1.5 rounded-full', priority === 'High' ? 'bg-danger' : priority === 'Medium' ? 'bg-amber-500' : 'bg-mute')} />
    {priority}
  </Badge>
);

const ONBOARDING_TONE: Record<OnboardingStatus, Tone> = {
  'New Client': 'teal',
  'Payment Pending': 'amber',
  'Access Pending': 'amber',
  Setup: 'teal',
  Active: 'solidGreen',
  Paused: 'neutral',
};
export const OnboardingBadge = ({ status }: { status: OnboardingStatus }) => <Badge tone={ONBOARDING_TONE[status]}>{status}</Badge>;

const PAYMENT_TONE: Record<PaymentStatus, Tone> = { Pending: 'amber', Paid: 'green', Partial: 'amber', 'Not Applicable': 'neutral' };
export const PaymentBadge = ({ status }: { status: PaymentStatus }) => <Badge tone={PAYMENT_TONE[status]}>{status}</Badge>;

const ACCESS_TONE: Record<AccessStatus, Tone> = { 'Not Requested': 'neutral', Requested: 'amber', Partial: 'amber', Complete: 'green' };
export const AccessBadge = ({ status }: { status: AccessStatus }) => <Badge tone={ACCESS_TONE[status]}>{status}</Badge>;

export const ACCESS_ITEM_TONE: Record<AccessItemStatus, Tone> = { 'Not Requested': 'neutral', Requested: 'amber', Received: 'green', 'Not Required': 'neutral' };

/* -------------------------------------------------------------- containers */

export function Card({ children, className, as: Tag = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  return <Tag className={cn('rounded-card border border-line bg-surface shadow-card', className)}>{children}</Tag>;
}

export function CardHeader({ title, action, subtitle }: { title: ReactNode; action?: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-mute">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, back }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; back?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {back && <div className="mb-1 text-xs">{back}</div>}
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-[22px]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-mute">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/* -------------------------------------------------------------------- forms */

export const inputClass =
  'block w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-mute/70 shadow-sm transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-sunken disabled:text-mute aria-[invalid=true]:border-danger';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}

/** Label + control + hint/error wiring in one place so every form stays accessible. */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-soft">
        {label}
        {required && <span className="text-danger" aria-hidden> *</span>}
      </label>
      {children(id, error || hint ? msgId : undefined)}
      {(error || hint) && (
        <p id={msgId} className={cn('mt-1 text-xs', error ? 'text-danger' : 'text-mute')} role={error ? 'alert' : undefined}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(inputClass, className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, rows = 3, ...rest }, ref) {
  return <textarea ref={ref} rows={rows} className={cn(inputClass, 'resize-y', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn(inputClass, 'pr-8', className)} {...rest}>
      {children}
    </select>
  );
});

/* ------------------------------------------------------------------- states */

export const Skeleton = ({ className }: { className?: string }) => <div aria-hidden className={cn('animate-pulse rounded-md bg-sunken', className)} />;

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-mute">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}…
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="divide-y divide-line">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="hidden h-4 w-24 sm:block" />
          <Skeleton className="ml-auto h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">{icon}</div>}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-mute">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Something went wrong while loading this.';
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-10 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="size-5" aria-hidden />
      </div>
      <p className="text-sm font-semibold text-ink">Couldn’t load this</p>
      <p className="mt-1 max-w-md text-sm text-mute">{message}</p>
      {onRetry && (
        <Button className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Small label/value pair used in detail headers. */
export function Meta({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-xs text-mute">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-ink">{children || <span className="text-mute">—</span>}</dd>
    </div>
  );
}
