import { useMemo } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useLeads } from '@/features/leads/api';
import { useDeals } from '@/features/deals/api';
import { useClients } from '@/features/clients/api';
import { useToday } from '@/hooks/useToday';
import { buildNotices, type Notice } from './attention';

export function useNotices(): { notices: Notice[]; loading: boolean } {
  const { profile, role } = useAuth();
  const today = useToday();
  const leads = useLeads();
  const deals = useDeals(role === 'admin' || role === 'business_development');
  const clients = useClients(role === 'admin');

  const notices = useMemo(() => {
    if (!profile || !role) return [];
    return buildNotices({ role, userId: profile.id, leads: leads.data ?? [], deals: deals.data ?? [], clients: clients.data ?? [], today });
  }, [profile, role, leads.data, deals.data, clients.data, today]);

  return { notices, loading: leads.isLoading || deals.isLoading || clients.isLoading };
}
