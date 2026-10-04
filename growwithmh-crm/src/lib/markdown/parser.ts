// Deterministic parser for the GrowwithMH prospect research format (frontmatter + headings).
// No AI, no network: the same file always yields the same result.

import { parse as parseYaml } from 'yaml';
import type { Objection, Priority } from '@/types';
import { PRIORITIES } from '@/types';

export interface ParsedLeadFields {
  business_name: string;
  contact_name: string;
  phone: string;
  email: string;
  website: string;
  location: string;
  niche: string;
  priority: Priority;
}

export interface ParsedReportFields {
  research_summary: string;
  why_this_prospect: string;
  key_findings: string[];
  main_opportunity: string;
  recommended_service: string;
  outreach_angle: string;
  talking_points: string[];
  suggested_opening: string;
  questions_to_ask: string[];
  possible_objections: Objection[];
  call_goal: string;
  research_notes: string;
}

export interface ParsedProspect {
  lead: ParsedLeadFields;
  report: ParsedReportFields;
  rawMarkdown: string;
  /** Problems that make the file unusable (e.g. empty). */
  errors: string[];
  /** Things worth fixing but not blocking. */
  warnings: string[];
  /** Headings found in the file that the app does not recognise (kept in the raw file only). */
  ignoredSections: string[];
}

type SectionKey = keyof ParsedReportFields;

const SECTION_ALIASES: Record<SectionKey, string[]> = {
  research_summary: ['prospect summary', 'research summary', 'summary', 'overview'],
  why_this_prospect: ['why this prospect', 'why this business', 'why them', 'why we are contacting them'],
  key_findings: ['key findings', 'findings', 'key observations'],
  main_opportunity: ['main opportunity', 'primary opportunity', 'opportunity'],
  recommended_service: ['recommended service', 'recommended services', 'service recommendation'],
  outreach_angle: ['outreach angle', 'conversation angle', 'angle'],
  talking_points: ['talking points', 'points to mention', 'key talking points'],
  suggested_opening: ['suggested opening', 'opening', 'opening line', 'suggested opening line'],
  questions_to_ask: ['questions to ask', 'questions', 'discovery questions'],
  possible_objections: ['possible objections', 'objections', 'objection handling'],
  call_goal: ['call goal', 'goal', 'call objective', 'objective'],
  research_notes: ['research notes', 'notes', 'additional notes'],
};

const ALIAS_LOOKUP = new Map<string, SectionKey>();
for (const [key, aliases] of Object.entries(SECTION_ALIASES) as [SectionKey, string[]][]) {
  for (const a of aliases) ALIAS_LOOKUP.set(a, key);
}

const FRONTMATTER_KEYS: Record<string, keyof ParsedLeadFields> = {
  business_name: 'business_name',
  business: 'business_name',
  company: 'business_name',
  company_name: 'business_name',
  name: 'business_name',
  contact_name: 'contact_name',
  contact: 'contact_name',
  owner: 'contact_name',
  phone: 'phone',
  phone_number: 'phone',
  telephone: 'phone',
  email: 'email',
  email_address: 'email',
  website: 'website',
  url: 'website',
  site: 'website',
  location: 'location',
  city: 'location',
  niche: 'niche',
  industry: 'niche',
  category: 'niche',
  priority: 'priority',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emptyLead = (): ParsedLeadFields => ({
  business_name: '',
  contact_name: '',
  phone: '',
  email: '',
  website: '',
  location: '',
  niche: '',
  priority: 'Medium',
});

export const emptyReport = (): ParsedReportFields => ({
  research_summary: '',
  why_this_prospect: '',
  key_findings: [],
  main_opportunity: '',
  recommended_service: '',
  outreach_angle: '',
  talking_points: [],
  suggested_opening: '',
  questions_to_ask: [],
  possible_objections: [],
  call_goal: '',
  research_notes: '',
});

const normalizeHeading = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeKey = (key: string): string => key.toLowerCase().trim().replace(/[\s-]+/g, '_');

/** Split a leading `---` YAML block from the body. */
export function splitFrontmatter(md: string): { data: Record<string, unknown>; body: string; error?: string } {
  const match = /^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(md);
  if (!match) return { data: {}, body: md };
  try {
    // failsafe schema: every scalar stays a string (an unquoted phone number must not become a number)
    const parsed: unknown = parseYaml(match[1], { schema: 'failsafe' });
    const data = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
    return { data, body: md.slice(match[0].length) };
  } catch {
    return { data: {}, body: md.slice(match[0].length), error: 'The frontmatter block could not be read as YAML.' };
  }
}

interface Heading {
  level: number;
  text: string;
  line: number;
}

/** Heading detection that ignores `#` lines inside fenced code blocks. */
function findHeadings(lines: string[]): Heading[] {
  const headings: Heading[] = [];
  let fence: string | null = null;
  lines.forEach((line, i) => {
    const f = /^\s*(```+|~~~+)/.exec(line);
    if (f) {
      if (!fence) fence = f[1][0];
      else if (f[1][0] === fence) fence = null;
      return;
    }
    if (fence) return;
    const h = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (h) headings.push({ level: h[1].length, text: h[2].trim(), line: i });
  });
  return headings;
}

const BULLET_RE = /^\s*(?:[-*+]|\d{1,3}[.)])\s+(.*)$/;

/** Bullets / numbered items (with indented continuation lines). Falls back to one item per paragraph line. */
export function parseList(block: string): string[] {
  const lines = block.split('\n');
  const items: string[] = [];
  let sawBullet = false;
  for (const line of lines) {
    if (!line.trim()) continue;
    const b = BULLET_RE.exec(line);
    if (b) {
      sawBullet = true;
      items.push(b[1].replace(/^\[[ xX]\]\s+/, '').trim());
    } else if (sawBullet && /^\s+\S/.test(line) && items.length) {
      items[items.length - 1] += ' ' + line.trim();
    } else {
      items.push(line.trim());
    }
  }
  return items.filter(Boolean);
}

function parseObjections(body: string, subHeadings: { text: string; start: number; end: number }[], lines: string[]): Objection[] {
  if (subHeadings.length) {
    return subHeadings
      .map((h) => ({
        objection: h.text.replace(/[`*_]/g, '').trim(),
        response: lines.slice(h.start, h.end).join('\n').trim(),
      }))
      .filter((o) => o.objection);
  }
  // No sub-headings: accept "- Objection — response" / "- Objection: response" bullets, else one general block.
  const out: Objection[] = [];
  for (const item of parseList(body)) {
    const m = /^(.+?)(?:\s+[—–-]\s+|:\s+)(.+)$/.exec(item);
    if (m) out.push({ objection: m[1].replace(/[*_`"]/g, '').trim(), response: m[2].trim() });
    else if (item) out.push({ objection: item.replace(/[*_`]/g, ''), response: '' });
  }
  return out;
}

const join = (lines: string[]) => lines.join('\n').trim();

export function parseProspectMarkdown(input: string): ParsedProspect {
  const rawMarkdown = input.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const result: ParsedProspect = {
    lead: emptyLead(),
    report: emptyReport(),
    rawMarkdown,
    errors: [],
    warnings: [],
    ignoredSections: [],
  };

  if (!rawMarkdown.trim()) {
    result.errors.push('The file is empty.');
    return result;
  }

  // ---- frontmatter --------------------------------------------------------
  const { data, body, error } = splitFrontmatter(rawMarkdown);
  if (error) result.warnings.push(error);
  if (!Object.keys(data).length && !error) {
    result.warnings.push('No frontmatter block found (--- … ---). Lead details must be filled in manually.');
  }

  for (const [rawKey, rawValue] of Object.entries(data)) {
    const target = FRONTMATTER_KEYS[normalizeKey(rawKey)];
    if (!target || rawValue == null || typeof rawValue === 'object') continue;
    const value = String(rawValue).trim();
    if (!value) continue;
    if (target === 'priority') {
      const p = PRIORITIES.find((x) => x.toLowerCase() === value.toLowerCase());
      if (p) result.lead.priority = p;
      else result.warnings.push(`Priority "${value}" is not High, Medium or Low — defaulted to Medium.`);
    } else if (!result.lead[target]) {
      result.lead[target] = value;
    }
  }

  // ---- sections -----------------------------------------------------------
  const lines = body.split('\n');
  const headings = findHeadings(lines);
  const known = headings.filter((h) => ALIAS_LOOKUP.has(normalizeHeading(h.text)));

  if (!known.length) {
    result.warnings.push('No recognised research sections found (e.g. "# Main Opportunity", "# Talking Points").');
  } else {
    const level = Math.min(...known.map((h) => h.level));
    const topLevel = headings.filter((h) => h.level <= level);

    // Title heading such as "# ABC Roofing — Prospect Report" can supply the business name.
    if (!result.lead.business_name) {
      const title = headings.find((h) => h.level === 1 && !ALIAS_LOOKUP.has(normalizeHeading(h.text)));
      if (title) {
        const guess = title.text.split(/\s+[—–|:-]\s+/)[0].trim();
        if (guess && guess.length <= 80) {
          result.lead.business_name = guess;
          result.warnings.push(`Business name was missing from the frontmatter; guessed "${guess}" from the title.`);
        }
      }
    }

    const seen = new Set<SectionKey>();
    topLevel.forEach((h, idx) => {
      const key = ALIAS_LOOKUP.get(normalizeHeading(h.text));
      const end = idx + 1 < topLevel.length ? topLevel[idx + 1].line : lines.length;
      if (h.level !== level || !key) {
        if (h.level === level && !key) result.ignoredSections.push(h.text);
        return;
      }
      if (seen.has(key)) {
        result.warnings.push(`Section "${h.text}" appears more than once — only the first was used.`);
        return;
      }
      seen.add(key);
      const content = lines.slice(h.line + 1, end);
      const text = join(content);

      switch (key) {
        case 'key_findings':
        case 'talking_points':
        case 'questions_to_ask':
          result.report[key] = parseList(text);
          break;
        case 'possible_objections': {
          const subs = headings
            .filter((s) => s.line > h.line && s.line < end && s.level === level + 1)
            .map((s, i, arr) => ({
              text: s.text,
              start: s.line + 1,
              end: i + 1 < arr.length ? arr[i + 1].line : end,
            }));
          result.report.possible_objections = parseObjections(text, subs, lines);
          break;
        }
        default:
          result.report[key] = text;
      }
    });
  }

  // ---- validation ---------------------------------------------------------
  const { lead, report } = result;
  if (!lead.business_name) result.warnings.push('Business name is missing — enter it before creating the lead.');
  if (!lead.phone && !lead.email) {
    result.warnings.push('No phone or email found. Outreach needs at least one contact method.');
  }
  if (lead.email && !EMAIL_RE.test(lead.email)) result.warnings.push(`Email "${lead.email}" does not look valid.`);
  if (!lead.location) result.warnings.push('Location is missing.');
  if (!lead.niche) result.warnings.push('Niche is missing.');

  const needed: [SectionKey, string][] = [
    ['main_opportunity', 'Main Opportunity'],
    ['talking_points', 'Talking Points'],
    ['suggested_opening', 'Suggested Opening'],
    ['call_goal', 'Call Goal'],
  ];
  for (const [key, label] of needed) {
    const v = report[key];
    if (Array.isArray(v) ? !v.length : !v) result.warnings.push(`"${label}" section is missing or empty — the outreach brief will have a gap.`);
  }
  if (!report.why_this_prospect && !report.research_summary) {
    result.warnings.push('Neither "Why This Prospect" nor "Prospect Summary" was found.');
  }

  return result;
}

export { normalizeUrl, cleanWebsite } from '../url';
