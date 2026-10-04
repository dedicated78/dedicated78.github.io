import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Search, UserRound } from 'lucide-react';
import { supabase, unwrap } from '@/lib/supabase';
import { safeSearchTerm } from '@/lib/utils';
import { useDebounced } from '@/hooks/useDebounced';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useAuth } from '@/features/auth/AuthContext';
import { StatusBadge } from '@/components/ui';
import type { Client, Lead } from '@/types';

type LeadHit = Pick<Lead, 'id' | 'business_name' | 'contact_name' | 'location' | 'phone' | 'email' | 'outreach_status'>;
type ClientHit = Pick<Client, 'id' | 'business_name' | 'contact_name' | 'email' | 'phone' | 'onboarding_status'>;

/** Searches business, contact, email and phone across everything this user is allowed to see (RLS does the scoping). */
export function GlobalSearch() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebounced(term, 250);
  const clean = safeSearchTerm(debounced);
  const canSeeClients = role === 'admin' || role === 'business_development';

  useClickOutside(wrapRef, () => setOpen(false), open);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { data, isFetching } = useQuery({
    queryKey: ['search', clean, canSeeClients],
    enabled: clean.length >= 2,
    staleTime: 15_000,
    queryFn: async () => {
      const p = `%${clean}%`;
      const cols = (extra: string) => ['business_name', 'contact_name', 'email', 'phone', ...(extra ? [extra] : [])].map((c) => `${c}.ilike.${p}`).join(',');
      const [leads, clients] = await Promise.all([
        supabase.from('leads').select('id,business_name,contact_name,location,phone,email,outreach_status').eq('archived', false).or(cols('')).limit(6),
        canSeeClients
          ? supabase.from('clients').select('id,business_name,contact_name,email,phone,onboarding_status').or(cols('')).limit(4)
          : Promise.resolve({ data: [] as ClientHit[], error: null }),
      ]);
      return { leads: (unwrap(leads) ?? []) as LeadHit[], clients: (unwrap(clients) ?? []) as ClientHit[] };
    },
  });

  const go = (to: string) => {
    setOpen(false);
    setTerm('');
    inputRef.current?.blur();
    navigate(to);
  };

  const first = data?.leads[0] ? `/leads/${data.leads[0].id}` : data?.clients[0] ? `/clients/${data.clients[0].id}` : null;
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && first) go(first);
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const showPanel = open && clean.length >= 2;
  const empty = !!data && !data.leads.length && !data.clients.length;

  return (
    <div ref={wrapRef} className="relative min-w-0 flex-1 sm:max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mute" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search…"
        aria-label="Search leads and clients"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        className="h-9 w-full rounded-full border border-line-strong bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-mute/80 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
      />
      {showPanel && (
        <div id="global-search-results" role="listbox" className="absolute left-0 right-0 top-11 z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-pop">
          {isFetching && !data && <p className="px-3 py-2 text-sm text-mute">Searching…</p>}
          {empty && <p className="px-3 py-2 text-sm text-mute">No matches for “{debounced.trim()}”.</p>}
          {!!data?.leads.length && <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-mute">Leads</p>}
          {data?.leads.map((l) => (
            <button key={l.id} role="option" aria-selected={false} type="button" onClick={() => go(`/leads/${l.id}`)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-sunken">
              <Building2 className="size-4 shrink-0 text-mute" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{l.business_name}</span>
                <span className="block truncate text-xs text-mute">{[l.contact_name, l.location, l.phone].filter(Boolean).join(' · ')}</span>
              </span>
              <StatusBadge status={l.outreach_status} />
            </button>
          ))}
          {!!data?.clients.length && <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-mute">Clients</p>}
          {data?.clients.map((c) => (
            <button key={c.id} role="option" aria-selected={false} type="button" onClick={() => go(`/clients/${c.id}`)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-sunken">
              <UserRound className="size-4 shrink-0 text-mute" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{c.business_name}</span>
                <span className="block truncate text-xs text-mute">{[c.contact_name, c.email].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="text-xs text-mute">{c.onboarding_status}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
