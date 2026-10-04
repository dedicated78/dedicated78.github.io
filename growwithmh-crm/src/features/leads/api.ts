import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAll, supabase, unwrap } from '@/lib/supabase';
import type { Lead, LeadStatus, Priority } from '@/types';

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: () => fetchAll<Lead>((from, to) => supabase.from('leads').select('*').order('created_at', { ascending: false }).range(from, to)),
  });
}

export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: ['lead', id],
    enabled: !!id,
    queryFn: async () => unwrap(await supabase.from('leads').select('*').eq('id', id!).maybeSingle()) as Lead | null,
  });
}

export type LeadEditable = {
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  location: string | null;
  niche: string | null;
  priority: Priority;
  recommended_service: string | null;
  main_opportunity: string | null;
  assigned_to: string | null;
  outreach_status: LeadStatus;
  next_action: string | null;
  follow_up_date: string | null;
};

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Lead> }) => {
      unwrap(await supabase.from('leads').update(patch).eq('id', id).select('id').single());
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useCreateLead(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: LeadEditable) => unwrap(await supabase.from('leads').insert({ ...lead, created_by: userId }).select().single()) as Lead,
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useHandOff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { leadId: string; bdUser: string | null; note: string; status: LeadStatus }) =>
      unwrap(
        await supabase.rpc('hand_off_to_bd', {
          p_lead_id: args.leadId,
          p_bd_user: args.bdUser,
          p_note: args.note,
          p_status: args.status,
        }),
      ) as string | null,
    onSuccess: () => qc.invalidateQueries(),
  });
}
