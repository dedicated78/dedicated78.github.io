import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, unwrap } from '@/lib/supabase';
import { DEFAULT_TZ } from '@/lib/format';
import type { AppSettings, Profile, Role } from '@/types';

export const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  company_name: 'GrowwithMH',
  default_currency: 'USD',
  timezone: DEFAULT_TZ,
  updated_at: '',
};

export function useSettings() {
  const q = useQuery({
    queryKey: ['settings'],
    queryFn: async () => unwrap(await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle()) as AppSettings | null,
    staleTime: 5 * 60_000,
  });
  return { ...q, settings: q.data ?? DEFAULT_SETTINGS };
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Pick<AppSettings, 'company_name' | 'default_currency' | 'timezone'>) => {
      unwrap(await supabase.from('app_settings').update(patch).eq('id', 1).select().single());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}

export function useProfiles() {
  const q = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => (unwrap(await supabase.from('profiles').select('*').order('full_name')) ?? []) as Profile[],
    staleTime: 5 * 60_000,
  });
  const profiles = q.data ?? [];
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return {
    ...q,
    profiles,
    byId,
    nameOf: (id: string | null | undefined) => (id ? byId.get(id)?.full_name || 'Unknown user' : 'Unassigned'),
    withRole: (role: Role) => profiles.filter((p) => p.role === role && p.is_active),
  };
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Pick<Profile, 'full_name' | 'role' | 'is_active'>>) => {
      unwrap(await supabase.from('profiles').update(patch).eq('id', id).select().single());
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
}
