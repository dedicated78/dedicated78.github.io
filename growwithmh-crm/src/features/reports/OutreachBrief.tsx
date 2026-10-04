import { BookOpenText, ChevronDown, Quote, Target } from 'lucide-react';
import { Button, Card, CardHeader, Skeleton } from '@/components/ui';
import type { Lead, ProspectReport } from '@/types';

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-mute">{label}</h3>
      <div className="text-sm leading-relaxed text-ink">{children}</div>
    </section>
  );
}

const Text = ({ value }: { value: string | null | undefined }) =>
  value ? <p className="whitespace-pre-wrap">{value}</p> : <p className="text-mute">Not provided in the research.</p>;

const Bullets = ({ items }: { items: string[] }) =>
  items.length ? (
    <ul className="list-disc space-y-1 pl-5 marker:text-brand-500">
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  ) : (
    <p className="text-mute">Not provided in the research.</p>
  );

interface Props {
  lead: Lead;
  report: ProspectReport | null | undefined;
  loading?: boolean;
  onViewFull: () => void;
}

/** The call-ready version of the research: what to say, ask and aim for — nothing technical. */
export function OutreachBrief({ lead, report, loading, onViewFull }: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader title="Outreach brief" />
        <div className="space-y-4 p-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardHeader title="Outreach brief" />
        <div className="space-y-4 p-5">
          <p className="rounded-lg bg-sunken px-3 py-2 text-sm text-ink-soft">No research report is attached to this lead, so there is no call script yet.</p>
          <Block label="Main opportunity">
            <Text value={lead.main_opportunity} />
          </Block>
          <Block label="Recommended service">
            <Text value={lead.recommended_service} />
          </Block>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Outreach brief" subtitle={`From research v${report.version}`} />
      <div className="space-y-5 p-4 sm:p-5">
        <Block label="Why we’re contacting them">
          <Text value={report.why_this_prospect || report.research_summary} />
        </Block>

        <div className="grid gap-5 sm:grid-cols-2">
          <Block label="Main opportunity">
            <Text value={report.main_opportunity ?? lead.main_opportunity} />
          </Block>
          <Block label="Recommended service">
            <Text value={report.recommended_service ?? lead.recommended_service} />
          </Block>
        </div>

        <Block label="Conversation angle">
          <Text value={report.outreach_angle} />
        </Block>

        <section className="rounded-xl border border-brand-200 bg-brand-50 p-4">
          <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
            <Quote className="size-3.5" aria-hidden /> Suggested opening
          </h3>
          {report.suggested_opening ? <p className="whitespace-pre-wrap text-[15px] font-medium leading-relaxed text-brand-800">{report.suggested_opening}</p> : <p className="text-sm text-mute">Not provided in the research.</p>}
        </section>

        <div className="grid gap-5 sm:grid-cols-2">
          <Block label="Mention these points">
            <Bullets items={report.talking_points} />
          </Block>
          <Block label="Ask these questions">
            <Bullets items={report.questions_to_ask} />
          </Block>
        </div>

        <Block label="Possible objections">
          {report.possible_objections.length ? (
            <div className="divide-y divide-line rounded-lg border border-line">
              {report.possible_objections.map((o, i) => (
                <details key={i} className="group">
                  <summary className="flex min-h-11 list-none items-center justify-between gap-3 px-3 py-2 text-sm font-medium text-ink hover:bg-sunken/70 [&::-webkit-details-marker]:hidden">
                    {o.objection}
                    <ChevronDown className="size-4 shrink-0 text-mute transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="whitespace-pre-wrap px-3 pb-3 text-sm text-ink-soft">{o.response || 'No suggested response in the research.'}</p>
                </details>
              ))}
            </div>
          ) : (
            <p className="text-mute">None listed.</p>
          )}
        </Block>

        <section className="flex gap-3 rounded-xl bg-pos-soft p-4">
          <Target className="mt-0.5 size-5 shrink-0 text-pos-ink" aria-hidden />
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-pos-ink">Call goal</h3>
            <p className="mt-0.5 whitespace-pre-wrap text-sm font-medium text-ink">{report.call_goal || 'Not provided in the research.'}</p>
          </div>
        </section>

        <div className="border-t border-line pt-4">
          <Button onClick={onViewFull}>
            <BookOpenText className="size-4" aria-hidden /> View full research
          </Button>
        </div>
      </div>
    </Card>
  );
}
