import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '@/lib/supabase';
import { sanitizeFileName } from '@/lib/utils';
import type { Lead, ProspectReport } from '@/types';
import type { ParsedLeadFields, ParsedReportFields } from '@/lib/markdown/parser';

export function useReports(leadId: string | undefined) {
  return useQuery({
    queryKey: ['reports', leadId],
    enabled: !!leadId,
    queryFn: async () =>
      (unwrap(await supabase.from('prospect_reports').select('*').eq('lead_id', leadId!).order('version', { ascending: false })) ?? []) as ProspectReport[],
  });
}

/** Newest version is the current one. */
export function useCurrentReport(leadId: string | undefined) {
  const q = useReports(leadId);
  return { ...q, report: q.data?.[0] ?? null };
}

const BUCKET = 'prospect-reports';

const reportPayload = (rawMarkdown: string, r: ParsedReportFields) => ({ raw_markdown: rawMarkdown, ...r });

async function uploadMarkdown(leadId: string, version: number, fileName: string, rawMarkdown: string): Promise<string> {
  const path = `${leadId}/${version}-${sanitizeFileName(fileName)}`;
  const blob = new Blob([rawMarkdown], { type: 'text/markdown' });
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'text/markdown', upsert: false });
  if (error) throw new Error(`Could not store the original file: ${error.message}`);
  return path;
}

export interface CreateFromUpload {
  fileName: string;
  rawMarkdown: string;
  lead: ParsedLeadFields & { recommended_service: string; main_opportunity: string };
  report: ParsedReportFields;
  assignedTo: string | null;
}

export function useCreateLeadFromUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: CreateFromUpload): Promise<string> => {
      const leadId = crypto.randomUUID();
      // 1) original .md first (it is the source of truth), 2) lead + report in one transaction.
      const path = await uploadMarkdown(leadId, 1, i.fileName, i.rawMarkdown);
      try {
        unwrap(
          await supabase.rpc('create_lead_with_report', {
            p_lead_id: leadId,
            p_lead: { ...i.lead, assigned_to: i.assignedTo },
            p_report: reportPayload(i.rawMarkdown, i.report),
            p_file_path: path,
          }),
        );
      } catch (e) {
        await supabase.storage.from(BUCKET).remove([path]); // don't leave an orphan file behind
        throw e;
      }
      return leadId;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export interface AddVersion {
  leadId: string;
  report: ParsedReportFields;
  rawMarkdown: string;
  /** New file → uploaded under the next version. Omitted for "edit brief": the original file is referenced. */
  file?: { name: string };
  existingFilePath?: string | null;
  syncLead?: boolean;
}

export function useAddReportVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: AddVersion): Promise<void> => {
      let path = i.existingFilePath ?? null;
      let uploaded: string | null = null;
      if (i.file) {
        const latest = unwrap(
          await supabase.from('prospect_reports').select('version').eq('lead_id', i.leadId).order('version', { ascending: false }).limit(1),
        ) as { version: number }[];
        uploaded = path = await uploadMarkdown(i.leadId, (latest[0]?.version ?? 0) + 1, i.file.name, i.rawMarkdown);
      }
      try {
        unwrap(
          await supabase.rpc('add_report_version', {
            p_lead_id: i.leadId,
            p_report: reportPayload(i.rawMarkdown, i.report),
            p_file_path: path,
            p_sync_lead: i.syncLead ?? true,
          }),
        );
      } catch (e) {
        if (uploaded) await supabase.storage.from(BUCKET).remove([uploaded]);
        throw e;
      }
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

/** Short-lived signed URL; the bucket is private. */
export async function getReportDownloadUrl(path: string): Promise<string> {
  const filename = path.split('/').pop() ?? 'report.md';
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60, { download: filename });
  if (error || !data) throw new Error(error?.message ?? 'Could not create a download link');
  return data.signedUrl;
}

/** Existing leads with a similar name — a gentle duplicate warning during upload. */
export async function findSimilarLeads(businessName: string): Promise<Pick<Lead, 'id' | 'business_name' | 'location' | 'archived'>[]> {
  const term = businessName.trim().replace(/[%_\\]/g, ' ');
  if (term.length < 3) return [];
  const rows = unwrap(await supabase.from('leads').select('id,business_name,location,archived').ilike('business_name', `%${term}%`).limit(5));
  return (rows ?? []) as Pick<Lead, 'id' | 'business_name' | 'location' | 'archived'>[];
}
