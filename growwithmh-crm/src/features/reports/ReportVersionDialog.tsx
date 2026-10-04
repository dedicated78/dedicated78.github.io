import { useState } from 'react';
import { Button } from '@/components/ui';
import { Modal, useToast } from '@/components/overlays';
import { errorMessage } from '@/lib/supabase';
import type { ParsedReportFields } from '@/lib/markdown/parser';
import type { ProspectReport } from '@/types';
import { useAddReportVersion } from './api';
import { fromDraft, toDraft } from './draft';
import { ReportFieldsEditor } from './ReportFieldsEditor';

export interface VersionBase {
  mode: 'edit' | 'upload';
  report: ParsedReportFields | ProspectReport;
  rawMarkdown: string;
  fileName?: string;
  existingFilePath?: string | null;
  warnings?: string[];
}

interface Props {
  leadId: string;
  base: VersionBase | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Admin-only. Always saves a NEW version; earlier versions and files are never modified. */
export function ReportVersionDialog({ leadId, base, onClose, onSaved }: Props) {
  return (
    <Modal
      open={!!base}
      onClose={onClose}
      size="lg"
      title={base?.mode === 'upload' ? 'Save new research version' : 'Edit research brief'}
      description="This creates a new version. Previous versions stay available."
    >
      {base && <Form key={base.rawMarkdown.length + (base.fileName ?? '')} leadId={leadId} base={base} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

function Form({ leadId, base, onClose, onSaved }: Omit<Props, 'base'> & { base: VersionBase }) {
  const toast = useToast();
  const add = useAddReportVersion();
  const [draft, setDraft] = useState(() => toDraft(base.report));
  const [syncLead, setSyncLead] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    try {
      await add.mutateAsync({
        leadId,
        report: fromDraft(draft, base.report.possible_objections),
        rawMarkdown: base.rawMarkdown,
        file: base.fileName ? { name: base.fileName } : undefined,
        existingFilePath: base.existingFilePath,
        syncLead,
      });
      toast.success('New research version saved');
      onSaved();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div className="space-y-4">
      {base.warnings && base.warnings.length > 0 && (
        <ul className="list-disc space-y-0.5 rounded-lg bg-warn-soft py-2 pl-7 pr-3 text-xs text-warn-ink">
          {base.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      <ReportFieldsEditor value={draft} onChange={setDraft} objections={base.report.possible_objections} />
      <label className="flex items-start gap-2 text-sm text-ink-soft">
        <input type="checkbox" className="mt-0.5 size-4 accent-brand-600" checked={syncLead} onChange={(e) => setSyncLead(e.target.checked)} />
        Also update the lead’s main opportunity and recommended service
      </label>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="sticky bottom-0 -mx-5 -mb-4 flex justify-end gap-2 border-t border-line bg-surface px-5 py-3">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={() => void save()} loading={add.isPending}>
          Save as new version
        </Button>
      </div>
    </div>
  );
}
