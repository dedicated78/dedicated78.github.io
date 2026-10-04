import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '@/lib/supabase';
import type { Activity, ActivityType, LeadStatus } from '@/types';

export function useActivities(leadId: string | undefined) {
  return useQuery({
    queryKey: ['activities', leadId],
    enabled: !!leadId,
    queryFn: async () =>
      (unwrap(await supabase.from('activities').select('*').eq('lead_id', leadId!).order('created_at', { ascending: false })) ?? []) as Activity[],
  });
}

export function useRecentActivities(limit = 12, enabled = true) {
  return useQuery({
    queryKey: ['recent-activities', limit],
    enabled,
    queryFn: async () =>
      (unwrap(await supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(limit)) ?? []) as Activity[],
  });
}

export interface LogActivityInput {
  leadId: string;
  type: ActivityType;
  outcome: string;
  notes: string;
  nextAction: string;
  followUpDate: string | null;
  newStatus: LeadStatus | null;
  /** When set, next action / follow-up are written to this deal rather than the lead. */
  dealId?: string | null;
}

export function useLogActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: LogActivityInput) =>
      unwrap(
        await supabase.rpc('log_activity', {
          p_lead_id: i.leadId,
          p_activity_type: i.type,
          p_outcome: i.outcome,
          p_notes: i.notes,
          p_next_action: i.nextAction,
          p_follow_up_date: i.followUpDate,
          p_new_status: i.newStatus,
          p_deal_id: i.dealId ?? null,
        }),
      ) as string,
    onSuccess: () => qc.invalidateQueries(),
  });
}
