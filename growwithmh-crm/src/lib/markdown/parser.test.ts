import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeUrl, parseList, parseProspectMarkdown } from './parser';

const sample = readFileSync(new URL('../../../docs/sample-prospect-report.md', import.meta.url), 'utf8');

describe('parseProspectMarkdown — standard format', () => {
  const r = parseProspectMarkdown(sample);

  it('extracts frontmatter', () => {
    expect(r.lead).toEqual({
      business_name: 'Demo Roofing Co (Sample)',
      contact_name: 'Jane Example',
      phone: '+1 555 010 0199',
      email: 'jane@demo-roofing.example',
      website: 'https://demo-roofing.example',
      location: 'Tampa, FL',
      niche: 'Roofing Contractor',
      priority: 'High',
    });
  });

  it('extracts every known section', () => {
    expect(r.report.research_summary).toMatch(/Family-owned roofing/);
    expect(r.report.why_this_prospect).toMatch(/outside the map pack/);
    expect(r.report.key_findings).toHaveLength(4);
    expect(r.report.main_opportunity).toMatch(/map pack/);
    expect(r.report.recommended_service).toMatch(/^Local SEO/);
    expect(r.report.outreach_angle).toMatch(/visibility gap/);
    expect(r.report.talking_points).toHaveLength(4);
    expect(r.report.talking_points[0]).toMatch(/^Competitor X/);
    expect(r.report.suggested_opening).toMatch(/^"Hi Jane/);
    expect(r.report.questions_to_ask).toHaveLength(3);
    expect(r.report.call_goal).toMatch(/15-minute call/);
    expect(r.report.research_notes).toMatch(/Facebook page/);
  });

  it('splits objections by sub-heading', () => {
    expect(r.report.possible_objections).toHaveLength(2);
    expect(r.report.possible_objections[0].objection).toBe('We already have someone doing SEO');
    expect(r.report.possible_objections[1].response).toMatch(/gap report/);
  });

  it('is clean: no errors, no warnings, nothing ignored', () => {
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.ignoredSections).toEqual([]);
  });

  it('preserves the raw markdown untouched', () => {
    expect(r.rawMarkdown).toBe(sample);
  });

  it('is deterministic', () => {
    expect(parseProspectMarkdown(sample)).toEqual(r);
  });
});

describe('parseProspectMarkdown — tolerance', () => {
  it('rejects an empty file', () => {
    expect(parseProspectMarkdown('  \n').errors).toContain('The file is empty.');
  });

  it('does not fail when optional parts are missing, but warns', () => {
    const r = parseProspectMarkdown('---\nbusiness_name: Tiny Co\n---\n\n# Main Opportunity\n\nFix maps.\n');
    expect(r.errors).toEqual([]);
    expect(r.lead.business_name).toBe('Tiny Co');
    expect(r.lead.priority).toBe('Medium');
    expect(r.warnings.join('\n')).toMatch(/No phone or email/);
    expect(r.warnings.join('\n')).toMatch(/Talking Points/);
    expect(r.report.main_opportunity).toBe('Fix maps.');
  });

  it('keeps unquoted phone numbers as strings', () => {
    const r = parseProspectMarkdown('---\nbusiness_name: A\nphone: 5551234567\n---\n# Call Goal\nx');
    expect(r.lead.phone).toBe('5551234567');
  });

  it('handles CRLF, BOM and case/alias differences', () => {
    const md = '﻿---\r\nBusiness Name: CRLF Co\r\nPriority: low\r\n---\r\n\r\n## talking points\r\n\r\n* one\r\n* two\r\n';
    const r = parseProspectMarkdown(md);
    expect(r.lead.business_name).toBe('CRLF Co');
    expect(r.lead.priority).toBe('Low');
    expect(r.report.talking_points).toEqual(['one', 'two']);
  });

  it('warns on invalid priority and falls back to Medium', () => {
    const r = parseProspectMarkdown('---\nbusiness_name: A\npriority: urgent\n---\n');
    expect(r.lead.priority).toBe('Medium');
    expect(r.warnings.join('\n')).toMatch(/Priority "urgent"/);
  });

  it('works without frontmatter and guesses the name from the title', () => {
    const r = parseProspectMarkdown('# Acme Plumbing — Prospect Report\n\n# Main Opportunity\n\nMaps.\n');
    expect(r.lead.business_name).toBe('Acme Plumbing');
    expect(r.warnings.join('\n')).toMatch(/No frontmatter/);
    expect(r.warnings.join('\n')).toMatch(/guessed "Acme Plumbing"/);
  });

  it('survives malformed frontmatter', () => {
    const r = parseProspectMarkdown('---\nbusiness_name: [unclosed\n---\n# Call Goal\nBook it');
    expect(r.errors).toEqual([]);
    expect(r.warnings.join('\n')).toMatch(/YAML/);
    expect(r.report.call_goal).toBe('Book it');
  });

  it('ignores # lines inside code fences and reports unknown sections', () => {
    const md = '---\nbusiness_name: A\n---\n# Main Opportunity\n\n```\n# Talking Points\n```\n\n# Pricing Ideas\n\nsecret\n\n# Call Goal\n\nBook\n';
    const r = parseProspectMarkdown(md);
    expect(r.report.talking_points).toEqual([]);
    expect(r.report.main_opportunity).toContain('# Talking Points');
    expect(r.ignoredSections).toEqual(['Pricing Ideas']);
    expect(r.report.call_goal).toBe('Book');
  });

  it('supports H2 as the section level, with H3 objections', () => {
    const md = '---\nbusiness_name: A\n---\n# Report\n\n## Possible Objections\n\n### Too expensive\n\nShow ROI.\n\n## Call Goal\n\nBook\n';
    const r = parseProspectMarkdown(md);
    expect(r.report.possible_objections).toEqual([{ objection: 'Too expensive', response: 'Show ROI.' }]);
    expect(r.report.call_goal).toBe('Book');
  });

  it('parses bulleted objections without sub-headings', () => {
    const md = '---\nbusiness_name: A\n---\n# Possible Objections\n\n- "Send me an email" — Offer the gap report\n- No budget: Ask about cost of lost jobs\n';
    const r = parseProspectMarkdown(md);
    expect(r.report.possible_objections).toEqual([
      { objection: 'Send me an email', response: 'Offer the gap report' },
      { objection: 'No budget', response: 'Ask about cost of lost jobs' },
    ]);
  });

  it('warns about invalid emails and duplicate sections', () => {
    const r = parseProspectMarkdown('---\nbusiness_name: A\nemail: nope\n---\n# Call Goal\na\n# Call Goal\nb\n');
    expect(r.report.call_goal).toBe('a');
    expect(r.warnings.join('\n')).toMatch(/does not look valid/);
    expect(r.warnings.join('\n')).toMatch(/more than once/);
  });
});

describe('helpers', () => {
  it('parseList handles continuation lines, checkboxes and plain paragraphs', () => {
    expect(parseList('- a\n  more\n- [ ] b\n1) c')).toEqual(['a more', 'b', 'c']);
    expect(parseList('line one\nline two')).toEqual(['line one', 'line two']);
  });

  it('normalizeUrl only allows http(s)', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com/');
    expect(normalizeUrl('http://a.co/x')).toBe('http://a.co/x');
    expect(normalizeUrl('javascript:alert(1)')).toBe('');
    expect(normalizeUrl('')).toBe('');
  });
});
