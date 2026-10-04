import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileText, UploadCloud } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Field, Input, LinkButton, PageHeader, PriorityBadge, Select } from '@/components/ui';
import { useToast } from '@/components/overlays';
import { cn } from '@/lib/utils';
import { errorMessage } from '@/lib/supabase';
import {normalizeUrl, cleanWebsite} from '@/lib/url';
import {parseProspectMarkdown, type ParsedLeadFields, type ParsedProspect} from '@/lib/markdown/parser';
import { useProfiles } from '@/features/settings/api';
import { findSimilarLeads, useCreateLeadFromUpload } from '@/features/reports/api';
import { fromDraft, toDraft, type ReportDraft } from '@/features/reports/draft';
import { ReportFieldsEditor } from '@/features/reports/ReportFieldsEditor';
import { PRIORITIES, type Priority } from '@/types';

const MAX_BYTES = 1_000_000;
const STEPS = ['Upload', 'Review & correct', 'Assign & create'] as const;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Stepper({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="mb-5 flex items-center gap-2 text-xs sm:text-sm" aria-label="Progress">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2" aria-current={i === current ? 'step' : undefined}>
          <span
            className={cn(
              'flex size-6 items-center justify-center rounded-full text-xs font-semibold',
              i < current ? 'bg-pos-ink text-white' : i === current ? 'bg-brand-600 text-white' : 'bg-sunken text-mute',
            )}
          >
            {i < current ? '✓' : i + 1}
          </span>
          <span className={cn('font-medium', i === current ? 'text-ink' : 'text-mute', i !== current && 'hidden sm:inline')}>{label}</span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-5 bg-line-strong sm:w-8" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}

function Dropzone({ onFile, error }: { onFile: (file: File) => void; error: string | null }) {
  const [over, setOver] = useState(false);
  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };
  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-14 text-center transition-colors focus-within:ring-2 focus-within:ring-brand-500/40',
          over ? 'border-brand-500 bg-brand-50' : 'border-line-strong bg-surface hover:border-brand-500/60 hover:bg-brand-50/40',
        )}
      >
        <input
          type="file"
          accept=".md,.markdown,text/markdown"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
        <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <UploadCloud className="size-6" aria-hidden />
        </span>
        <span className="text-sm font-semibold text-ink">Drop a prospect research .md file here</span>
        <span className="mt-1 text-sm text-mute">or click to choose a file</span>
      </label>
      {error && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}

export function UploadResearchPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { withRole } = useProfiles();
  const create = useCreateLeadFromUpload();

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedProspect | null>(null);
  const [lead, setLead] = useState<ParsedLeadFields | null>(null);
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [assignee, setAssignee] = useState<string | null>(null); // null = untouched → default
  const [touched, setTouched] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const outreachUsers = withRole('outreach');
  const assignedTo = assignee ?? outreachUsers[0]?.id ?? '';

  const handleFile = async (file: File) => {
    setFileError(null);
    if (!/\.(md|markdown)$/i.test(file.name)) return setFileError('Please choose a Markdown file (.md).');
    if (file.size > MAX_BYTES) return setFileError('That file is larger than 1 MB — research reports should be far smaller.');
    let text: string;
    try {
      text = await file.text();
    } catch {
      return setFileError('The file could not be read.');
    }
    const result = parseProspectMarkdown(text);
    if (result.errors.length) return setFileError(result.errors.join(' '));
    setFileName(file.name);
    setParsed(result);
    setLead(result.lead);
    setDraft(toDraft(result.report));
    setAssignee(null);
    setTouched(false);
    setStep(1);
  };

  const reset = () => {
    setStep(0);
    setParsed(null);
    setLead(null);
    setDraft(null);
    setCreatedId(null);
    setTouched(false);
    create.reset();
  };

  const duplicates = useQuery({
    queryKey: ['similar-leads', lead?.business_name ?? ''],
    enabled: step >= 1 && (lead?.business_name.trim().length ?? 0) >= 3,
    queryFn: () => findSimilarLeads(lead!.business_name),
  });

  const errors = useMemo(() => {
    const e: Partial<Record<'business_name' | 'email' | 'website', string>> = {};
    if (!lead) return e;
    if (!lead.business_name.trim()) e.business_name = 'Business name is required.';
    if (lead.email.trim() && !EMAIL_RE.test(lead.email.trim())) e.email = 'Enter a valid email address.';
    if (lead.website.trim() && !normalizeUrl(lead.website)) e.website = 'Enter a valid website address.';
    return e;
  }, [lead]);

  // leave a "you have unsaved work" guard while reviewing
  const reviewing = step > 0 && !createdId;
  useEffect(() => {
    if (!reviewing) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [reviewing]);

  const submitRef = useRef(false);
  const submit = async () => {
    setTouched(true);
    if (!parsed || !lead || !draft || Object.keys(errors).length || submitRef.current) return;
    submitRef.current = true;
    try {
      const report = fromDraft(draft, parsed.report.possible_objections);
      const id = await create.mutateAsync({
        fileName,
        rawMarkdown: parsed.rawMarkdown,
        lead: {
          ...lead,
          business_name: lead.business_name.trim(),
          website: cleanWebsite(lead.website),
          recommended_service: report.recommended_service,
          main_opportunity: report.main_opportunity,
        },
        report,
        assignedTo: assignedTo || null,
      });
      setCreatedId(id);
      setStep(2);
      toast.success('Lead created');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      submitRef.current = false;
    }
  };

  const setLeadField = (key: keyof ParsedLeadFields) => (e: { target: { value: string } }) => setLead((l) => (l ? { ...l, [key]: e.target.value } : l));
  const backLink = (
    <Link to="/leads" className="inline-flex items-center gap-1 text-mute hover:text-ink">
      <ArrowLeft className="size-3.5" aria-hidden /> Leads
    </Link>
  );

  // ------------------------------------------------------------------ done
  if (step === 2 && createdId) {
    return (
      <div className="mx-auto max-w-xl">
        <Stepper current={2} />
        <Card className="px-6 py-10 text-center">
          <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-pos-soft text-pos">
            <CheckCircle2 className="size-6" aria-hidden />
          </span>
          <h1 className="text-lg font-semibold text-ink">Lead created and ready for outreach</h1>
          <p className="mx-auto mt-1 max-w-sm text-sm text-mute">
            {lead?.business_name} {assignedTo ? `is in ${outreachUsers.find((u) => u.id === assignedTo)?.full_name ?? 'the assignee'}’s queue.` : 'is saved. Assign it to someone to put it in a queue.'} The original file is stored with version 1 of the research.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={() => navigate(`/leads/${createdId}`)}>
              Open Lead
            </Button>
            <Button onClick={reset}>Upload another</Button>
          </div>
        </Card>
      </div>
    );
  }

  // ------------------------------------------------------------------ upload
  if (step === 0 || !parsed || !lead || !draft) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Upload research" subtitle="Drop the .md prospect report. It is read in your browser; nothing is saved until you confirm." back={backLink} />
        <Stepper current={0} />
        <Dropzone onFile={(f) => void handleFile(f)} error={fileError} />
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-mute">
          <span>Need the format?</span>
          <a href="./prospect-report-template.md" download className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline">
            <Download className="size-3.5" aria-hidden /> Blank template
          </a>
          <a href="./sample-prospect-report.md" download className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline">
            <FileText className="size-3.5" aria-hidden /> Filled example
          </a>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ review
  const showErr = (k: keyof typeof errors) => (touched ? errors[k] : undefined);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Review before creating"
        subtitle={
          <span className="inline-flex items-center gap-1.5">
            <FileText className="size-3.5" aria-hidden /> {fileName}
          </span>
        }
        back={backLink}
      />
      <Stepper current={1} />

      {(parsed.warnings.length > 0 || parsed.ignoredSections.length > 0 || (duplicates.data?.length ?? 0) > 0) && (
        <div role="status" className="mb-4 rounded-card border border-amber-300/60 bg-warn-soft px-4 py-3 text-sm text-warn-ink">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="size-4" aria-hidden /> Check these before saving
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
            {duplicates.data?.map((d) => (
              <li key={d.id}>
                A lead named “{d.business_name}”{d.location ? ` (${d.location})` : ''}{d.archived ? ' (archived)' : ''} already exists.{' '}
                <Link to={`/leads/${d.id}`} target="_blank" className="font-medium underline">
                  Open it
                </Link>
              </li>
            ))}
            {parsed.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
            {parsed.ignoredSections.length > 0 && <li>Sections not used by the CRM (kept only in the original file): {parsed.ignoredSections.join(', ')}.</li>}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        <Card>
          <CardHeader title="Lead details" subtitle="Extracted from the frontmatter. Correct anything that’s off." action={<PriorityBadge priority={lead.priority} />} />
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <Field label="Business name" required error={showErr('business_name')} className="sm:col-span-2">
              {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!showErr('business_name')} value={lead.business_name} onChange={setLeadField('business_name')} />}
            </Field>
            <Field label="Contact name">{(id) => <Input id={id} value={lead.contact_name} onChange={setLeadField('contact_name')} />}</Field>
            <Field label="Phone">{(id) => <Input id={id} type="tel" value={lead.phone} onChange={setLeadField('phone')} />}</Field>
            <Field label="Email" error={showErr('email')}>
              {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!showErr('email')} type="email" value={lead.email} onChange={setLeadField('email')} />}
            </Field>
            <Field label="Website" error={showErr('website')}>
              {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!showErr('website')} value={lead.website} onChange={setLeadField('website')} />}
            </Field>
            <Field label="Location">{(id) => <Input id={id} value={lead.location} onChange={setLeadField('location')} />}</Field>
            <Field label="Niche">{(id) => <Input id={id} value={lead.niche} onChange={setLeadField('niche')} />}</Field>
            <Field label="Priority">
              {(id) => (
                <Select id={id} value={lead.priority} onChange={(e) => setLead({ ...lead, priority: e.target.value as Priority })}>
                  {PRIORITIES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </Select>
              )}
            </Field>
          </div>
          {!lead.phone.trim() && !lead.email.trim() && (
            <p className="mx-4 mb-4 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn-ink sm:mx-5">No phone or email yet — you can still create the lead, but outreach will need a contact method.</p>
          )}
        </Card>

        <Card>
          <CardHeader title="Research brief" subtitle="This becomes Majeda’s outreach brief. The original file is stored untouched." />
          <div className="p-4 sm:p-5">
            <ReportFieldsEditor value={draft} onChange={setDraft} objections={parsed.report.possible_objections} compact />
          </div>
        </Card>

        <Card>
          <CardHeader title="Assign" />
          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <Field label="Outreach owner" hint={outreachUsers.length ? undefined : 'No active outreach user yet — activate one in Settings, or assign later.'}>
              {(id, d) => (
                <Select id={id} aria-describedby={d} value={assignedTo} onChange={(e) => setAssignee(e.target.value)}>
                  <option value="">Unassigned</option>
                  {outreachUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <div className="flex items-end">
              <p className="text-sm text-mute">
                Status will be <Badge tone="teal">Ready to Call</Badge>
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="sticky bottom-16 z-10 mt-5 flex items-center justify-between gap-2 rounded-card border border-line bg-surface p-3 shadow-pop lg:bottom-4">
        <Button variant="ghost" onClick={reset} disabled={create.isPending}>
          Choose another file
        </Button>
        <div className="flex items-center gap-2">
          <LinkButton to="/leads" variant="ghost" className="hidden sm:inline-flex">
            Cancel
          </LinkButton>
          <Button variant="primary" onClick={() => void submit()} loading={create.isPending}>
            Create lead
          </Button>
        </div>
      </div>
    </div>
  );
}
