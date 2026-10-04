import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAll, supabase, unwrap } from '@/lib/supabase';
import type { BillingType, Deal } from '@/types';

export function useDeals(enabled = true) {
  return useQuery({
    enabled,
    queryKey: ['deals'],
    queryFn: () => fetchAll<Deal>((from, to) => supabase.from('deals').select('*').order('updated_at', { ascending: false }).range(from, to)),
  });
}

export function useDeal(id: string | undefined) {
  return useQuery({
    queryKey: ['deal', id],
    enabled: !!id,
    queryFn: async () => unwrap(await supabase.from('deals').select('*').eq('id', id!).maybeSingle()) as Deal | null,
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Deal> }) => {
      unwrap(await supabase.from('deals').update(patch).eq('id', id).select('id').single());
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export interface ConvertInput {
  dealId: string;
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  service: string;
  agreedPrice: number;
  billingType: BillingType | null;
  startDate: string | null;
}

export function useConvertDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: ConvertInput) =>
      unwrap(
        await supabase.rpc('convert_deal_to_client', {
          p_deal_id: i.dealId,
          p_business_name: i.businessName,
          p_contact_name: i.contactName,
          p_phone: i.phone,
          p_email: i.email,
          p_website: i.website,
          p_service: i.service,
          p_agreed_price: i.agreedPrice,
          p_billing_type: i.billingType,
          p_start_date: i.startDate,
        }),
      ) as string,
    onSuccess: () => qc.invalidateQueries(),
  });
}
