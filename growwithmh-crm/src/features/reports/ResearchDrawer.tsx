import { useMemo, useState } from 'react';
import { Download, FilePenLine, FileUp } from 'lucide-react';
import { Badge, Button, Select, Skeleton } from '@/components/ui';
import { Modal, useToast } from '@/components/overlays';
import { useAuth } from '@/features/auth/AuthContext';
import { useProfiles, useSettings } from '@/features/settings/api';
import { formatDateTime } from '@/lib/format';
import { renderMarkdown } from '@/lib/render';
import { errorMessage } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { getReportDownloadUrl, useReports } from './api';
import { ReportVersionDialog, type VersionBase } from './ReportVersionDialog';
import {parseProspectMarkdown} from '@/lib/markdown/parser';
import type { ProspectReport } from '@/types';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="border-b border-line py-4 first:pt-0 last:border-0">
    <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-mute">{title}</h3>
    <div className="text-sm leading-relaxed text-ink">{children}</div>
  </section>
);
const P = ({ v }: { v: string | null }) => (v ? <p className="whitespace-pre-wrap">{v}</p> : <span className="text-mute">—</span>);
const L = ({ items, ordered }: { items: string[]; ordered?: boolean }) => {
  if (!items.length) return <span className="text-mute">—</span>;
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className={cn('space-y-1 pl-5', ordered ? 'list-decimal' : 'list-disc')}>
      {items.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </Tag>
  );
};

function Structured({ r }: { r: ProspectReport }) {
  return (
    <div>
      <Section title="Prospect summary"><P v={r.research_summary} /></Section>
      <Section title="Why this prospect"><P v={r.why_this_prospect} /></Section>
      <Section title="Key findings"><L items={r.key_findings} /></Section>
      <Section title="Main opportunity"><P v={r.main_opportunity} /></Section>
      <Section title="Recommended service"><P v={r.recommended_service} /></Section>
      <Section title="Outreach angle"><P v={r.outreach_angle} /></Section>
      <Section title="Talking points"><L items={r.talking_points} ordered /></Section>
      <Section title="Suggested opening"><P v={r.suggested_opening} /></Section>
      <Section title="Questions to ask"><L items={r.questions_to_ask} /></Section>
      <Section title="Possible objections">
        {r.possible_objections.length ? (
          <dl className="space-y-3">
            {r.possible_objections.map((o, i) => (
              <div key={i}>
                <dt className="font-medium">{o.objection}</dt>
                <dd className="whitespace-pre-wrap text-ink-soft">{o.response || '—'}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <span className="text-mute">—</span>
        )}
      </Section>
      <Section title="Call goal"><P v={r.call_goal} /></Section>
      <Section title="Research notes"><P v={r.research_notes} /></Section>
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  leadId: string;
  businessName: string;
}

export function ResearchDrawer({ open, onClose, leadId, businessName }: Props) {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const { nameOf } = useProfiles();
  const { settings } = useSettings();
  const { data: reports, isLoading } = useReports(open ? leadId : undefined);
  const [version, setVersion] = useState<number | null>(null);
  const [tab, setTab] = useState<'brief' | 'original'>('brief');
  const [editing, setEditing] = useState<VersionBase | null>(null);
  const [busy, setBusy] = useState(false);

  const current = reports?.find((r) => r.version === version) ?? reports?.[0] ?? null;
  const isLatest = current && reports ? current.version === reports[0].version : true;
  const html = useMemo(() => (current && tab === 'original' ? renderMarkdown(current.raw_markdown) : ''), [current, tab]);

  const download = async () => {
    if (!current?.file_path) return;
    setBusy(true);
    try {
      const url = await getReportDownloadUrl(current.file_path);
      window.location.assign(url);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const startEdit = () => {
    if (!current) return;
    setEditing({ mode: 'edit', report: current, rawMarkdown: current.raw_markdown, existingFilePath: current.file_path });
  };

  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(md|markdown)$/i.test(file.name)) return toast.error('Please choose a .md file.');
    if (file.size > 1_000_000) return toast.error('That file is larger than 1 MB.');
    const parsed = parseProspectMarkdown(await file.text());
    if (parsed.errors.length) return toast.error(parsed.errors.join(' '));
    setEditing({ mode: 'upload', report: parsed.report, rawMarkdown: parsed.rawMarkdown, fileName: file.name, warnings: parsed.warnings });
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        variant="drawer"
        title="Full research"
        description={businessName}
        footer={
          isAdmin && current ? (
            <>
              <label className={cn('inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:bg-sunken focus-within:ring-2 focus-within:ring-brand-500/40')}>
                <FileUp className="size-4" aria-hidden /> Upload new version
                <input
                  type="file"
                  accept=".md,.markdown,text/markdown"
                  className="sr-only"
                  onChange={(e) => {
                    void onPickFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </label>
              <Button onClick={startEdit} disabled={!isLatest} title={isLatest ? undefined : 'Switch to the latest version to edit'}>
                <FilePenLine className="size-4" aria-hidden /> Edit brief
              </Button>
            </>
          ) : undefined
        }
      >
        {isLoading ? (
          <div className="space-y-3" role="status" aria-label="Loading research">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !current ? (
          <p className="py-10 text-center text-sm text-mute">No research has been uploaded for this lead.</p>
        ) : (
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {reports && reports.length > 1 ? (
                <Select aria-label="Research version" className="h-9 w-auto! py-1" value={current.version} onChange={(e) => setVersion(Number(e.target.value))}>
                  {reports.map((r) => (
                    <option key={r.id} value={r.version}>
                      Version {r.version}
                      {r.version === reports[0].version ? ' (current)' : ''} · {formatDateTime(r.created_at, settings.timezone)}
                    </option>
                  ))}
                </Select>
              ) : (
                <Badge tone="teal">Version {current.version}</Badge>
              )}
              <span className="text-xs text-mute">
                Uploaded {formatDateTime(current.created_at, settings.timezone)} by {nameOf(current.uploaded_by)}
              </span>
              {current.file_path && (
                <Button size="sm" className="ml-auto" onClick={() => void download()} loading={busy}>
                  <Download className="size-3.5" aria-hidden /> Original .md
                </Button>
              )}
            </div>

            <div role="tablist" aria-label="Research view" className="mb-4 inline-flex rounded-full border border-line-strong bg-sunken p-0.5 text-sm">
              {(['brief', 'original'] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  type="button"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={cn('rounded-full px-3.5 py-1 font-medium', tab === t ? 'bg-surface text-ink shadow-sm' : 'text-mute hover:text-ink')}
                >
                  {t === 'brief' ? 'Structured' : 'Original file'}
                </button>
              ))}
            </div>

            {tab === 'brief' ? <Structured r={current} /> : <div className="md" dangerouslySetInnerHTML={{ __html: html }} />}
          </div>
        )}
      </Modal>
      <ReportVersionDialog leadId={leadId} base={editing} onClose={() => setEditing(null)} onSaved={() => setVersion(null)} />
    </>
  );
}
