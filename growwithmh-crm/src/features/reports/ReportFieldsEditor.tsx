import { Field, Input, Textarea } from '@/components/ui';
import type { Objection } from '@/types';
import type { ReportDraft } from './draft';

interface Props {
  value: ReportDraft;
  onChange: (next: ReportDraft) => void;
  objections: Objection[];
  /** Show only the fields most worth correcting; the rest sit behind a disclosure. */
  compact?: boolean;
}

export function ReportFieldsEditor({ value, onChange, objections, compact }: Props) {
  const set = <K extends keyof ReportDraft>(key: K) => (e: { target: { value: string } }) => onChange({ ...value, [key]: e.target.value });

  const primary = (
    <div className="space-y-4">
      <Field label="Recommended service">{(id) => <Input id={id} value={value.recommended_service} onChange={set('recommended_service')} />}</Field>
      <Field label="Main opportunity">{(id) => <Textarea id={id} rows={3} value={value.main_opportunity} onChange={set('main_opportunity')} />}</Field>
      <Field label="Talking points" hint="One per line">
        {(id, d) => <Textarea id={id} aria-describedby={d} rows={5} value={value.talking_points} onChange={set('talking_points')} />}
      </Field>
    </div>
  );

  const more = (
    <div className="space-y-4">
      <Field label="Prospect summary">{(id) => <Textarea id={id} rows={3} value={value.research_summary} onChange={set('research_summary')} />}</Field>
      <Field label="Why this prospect">{(id) => <Textarea id={id} rows={3} value={value.why_this_prospect} onChange={set('why_this_prospect')} />}</Field>
      <Field label="Key findings" hint="One per line">
        {(id, d) => <Textarea id={id} aria-describedby={d} rows={4} value={value.key_findings} onChange={set('key_findings')} />}
      </Field>
      <Field label="Outreach angle">{(id) => <Textarea id={id} rows={3} value={value.outreach_angle} onChange={set('outreach_angle')} />}</Field>
      <Field label="Suggested opening">{(id) => <Textarea id={id} rows={3} value={value.suggested_opening} onChange={set('suggested_opening')} />}</Field>
      <Field label="Questions to ask" hint="One per line">
        {(id, d) => <Textarea id={id} aria-describedby={d} rows={4} value={value.questions_to_ask} onChange={set('questions_to_ask')} />}
      </Field>
      <Field label="Call goal">{(id) => <Textarea id={id} rows={2} value={value.call_goal} onChange={set('call_goal')} />}</Field>
      <Field label="Research notes">{(id) => <Textarea id={id} rows={3} value={value.research_notes} onChange={set('research_notes')} />}</Field>
      <div>
        <p className="mb-1 text-xs font-medium text-ink-soft">Possible objections</p>
        {objections.length ? (
          <ul className="space-y-1.5 rounded-lg border border-line bg-sunken/60 p-3 text-sm">
            {objections.map((o, i) => (
              <li key={i}>
                <span className="font-medium text-ink">{o.objection}</span>
                {o.response && <span className="text-ink-soft"> — {o.response.length > 140 ? `${o.response.slice(0, 140)}…` : o.response}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-mute">None found in the file.</p>
        )}
        <p className="mt-1 text-xs text-mute">Objections are kept exactly as written in the Markdown file.</p>
      </div>
    </div>
  );

  if (!compact) {
    return (
      <div className="space-y-4">
        {primary}
        {more}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {primary}
      <details className="group rounded-lg border border-line">
        <summary className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-ink-soft">
          All other research fields
          <span className="text-xs text-mute group-open:hidden">Show</span>
          <span className="hidden text-xs text-mute group-open:inline">Hide</span>
        </summary>
        <div className="border-t border-line p-3">{more}</div>
      </details>
    </div>
  );
}
