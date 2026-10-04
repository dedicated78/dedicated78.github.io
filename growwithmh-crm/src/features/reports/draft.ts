import { splitLines } from '@/lib/utils';
import type { Objection, ProspectReport } from '@/types';
import type { ParsedReportFields } from '@/lib/markdown/parser';

/** Form-friendly shape: list fields become one-item-per-line text. */
export interface ReportDraft {
  research_summary: string;
  why_this_prospect: string;
  key_findings: string;
  main_opportunity: string;
  recommended_service: string;
  outreach_angle: string;
  talking_points: string;
  suggested_opening: string;
  questions_to_ask: string;
  call_goal: string;
  research_notes: string;
}

const lines = (items: string[]) => items.join('\n');

export function toDraft(r: ParsedReportFields | ProspectReport): ReportDraft {
  return {
    research_summary: r.research_summary ?? '',
    why_this_prospect: r.why_this_prospect ?? '',
    key_findings: lines(r.key_findings ?? []),
    main_opportunity: r.main_opportunity ?? '',
    recommended_service: r.recommended_service ?? '',
    outreach_angle: r.outreach_angle ?? '',
    talking_points: lines(r.talking_points ?? []),
    suggested_opening: r.suggested_opening ?? '',
    questions_to_ask: lines(r.questions_to_ask ?? []),
    call_goal: r.call_goal ?? '',
    research_notes: r.research_notes ?? '',
  };
}

export function fromDraft(d: ReportDraft, objections: Objection[]): ParsedReportFields {
  return {
    research_summary: d.research_summary.trim(),
    why_this_prospect: d.why_this_prospect.trim(),
    key_findings: splitLines(d.key_findings),
    main_opportunity: d.main_opportunity.trim(),
    recommended_service: d.recommended_service.trim(),
    outreach_angle: d.outreach_angle.trim(),
    talking_points: splitLines(d.talking_points),
    suggested_opening: d.suggested_opening.trim(),
    questions_to_ask: splitLines(d.questions_to_ask),
    possible_objections: objections,
    call_goal: d.call_goal.trim(),
    research_notes: d.research_notes.trim(),
  };
}
