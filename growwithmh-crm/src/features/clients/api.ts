import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAll, supabase, unwrap } from '@/lib/supabase';
import type { Client, ClientAccess } from '@/types';

export function useClients(enabled = true) {
  return useQuery({
    enabled,
    queryKey: ['clients'],
    queryFn: () => fetchAll<Client>((from, to) => supabase.from('clients').select('*').order('created_at', { ascending: false }).range(from, to)),
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ['client', id],
    enabled: !!id,
    queryFn: async () => unwrap(await supabase.from('clients').select('*').eq('id', id!).maybeSingle()) as Client | null,
  });
}

export function useClientAccess(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-access', clientId],
    enabled: !!clientId,
    queryFn: async () => (unwrap(await supabase.from('client_access').select('*').eq('client_id', clientId!)) ?? []) as ClientAccess[],
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Client> }) => {
      unwrap(await supabase.from('clients').update(patch).eq('id', id).select('id').single());
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useUpdateAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<ClientAccess, 'status' | 'notes'>> }) => {
      unwrap(await supabase.from('client_access').update(patch).eq('id', id).select('id').single());
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from('clients').delete().eq('id', id).select('id').single());
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
