import { Check } from 'lucide-react';
import { Select } from '@/components/ui';
import { cn } from '@/lib/utils';
import { OPEN_DEAL_STAGES, type DealStage } from '@/types';

interface Props {
  stage: DealStage;
  disabled?: boolean;
  onChange: (stage: DealStage) => void;
}

/** Progress indicator that doubles as the stage control: click a step to move the deal there. */
export function StageProgress({ stage, disabled, onChange }: Props) {
  const closed = stage === 'Won' || stage === 'Lost';
  const idx = OPEN_DEAL_STAGES.indexOf(stage);

  return (
    <div>
      {/* phones: plain select */}
      <div className="md:hidden">
        <Select aria-label="Deal stage" value={stage} disabled={disabled} onChange={(e) => onChange(e.target.value as DealStage)}>
          {[...OPEN_DEAL_STAGES, 'Won', 'Lost'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </div>

      <ol className="hidden items-center md:flex" aria-label="Deal stage">
        {OPEN_DEAL_STAGES.map((s, i) => {
          const done = !closed && i < idx;
          const current = !closed && i === idx;
          return (
            <li key={s} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                disabled={disabled}
                aria-current={current ? 'step' : undefined}
                onClick={() => !current && onChange(s)}
                className={cn(
                  'group flex items-center gap-2 rounded-full py-1 pr-3 text-[13px] font-medium disabled:opacity-60',
                  current ? 'text-brand-700' : done ? 'text-ink-soft hover:text-ink' : 'text-mute hover:text-ink',
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                    current ? 'border-brand-600 bg-brand-600 text-white' : done ? 'border-pos-ink bg-pos-ink text-white' : closed ? 'border-line-strong bg-sunken text-mute' : 'border-line-strong bg-surface text-mute group-hover:border-brand-500',
                  )}
                >
                  {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
                </span>
                <span className="whitespace-nowrap">{s}</span>
              </button>
              {i < OPEN_DEAL_STAGES.length - 1 && <span className={cn('mr-2 h-px min-w-3 flex-1', done ? 'bg-pos-ink' : 'bg-line-strong')} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
