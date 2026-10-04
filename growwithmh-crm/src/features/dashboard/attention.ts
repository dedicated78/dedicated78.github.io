import { daysBetween } from '@/lib/format';
import type { Client, Deal, Lead, Role } from '@/types';
import { CLOSED_LEAD_STATUSES } from '@/types';

export interface Notice {
  id: string;
  tone: 'red' | 'amber' | 'teal';
  title: string;
  detail: string;
  to: string;
}

interface Input {
  role: Role;
  userId: string;
  leads: Lead[];
  deals: Deal[];
  clients: Client[];
  today: string;
}

const isOpenLead = (l: Lead) => !l.archived && !CLOSED_LEAD_STATUSES.includes(l.outreach_status);
const ageText = (n: number) => (n === 1 ? '1 day overdue' : `${n} days overdue`);

/** One place that decides "what needs a human's attention", used by the bell and the admin dashboard. */
export function buildNotices({ role, userId, leads, deals, clients, today }: Input): Notice[] {
  const out: Notice[] = [];
  const clientDeals = new Set(clients.map((c) => c.deal_id).filter(Boolean));

  if (role === 'outreach') {
    const mine = leads.filter((l) => isOpenLead(l) && l.assigned_to === userId);
    for (const l of mine) {
      if (l.follow_up_date && l.follow_up_date < today) {
        out.push({ id: `fo-${l.id}`, tone: 'red', title: `Follow-up overdue · ${l.business_name}`, detail: ageText(daysBetween(l.follow_up_date, today)), to: `/leads/${l.id}` });
      } else if (l.follow_up_date === today) {
        out.push({ id: `ft-${l.id}`, tone: 'amber', title: `Follow-up today · ${l.business_name}`, detail: l.next_action || 'Due today', to: `/leads/${l.id}` });
      }
    }
    const cutoff = Date.now() - 48 * 3_600_000;
    for (const l of mine) {
      if (l.outreach_status === 'Ready to Call' && Date.parse(l.updated_at) > cutoff && !l.follow_up_date) {
        out.push({ id: `new-${l.id}`, tone: 'teal', title: `New lead assigned · ${l.business_name}`, detail: [l.location, l.niche].filter(Boolean).join(' · ') || 'Ready to call', to: `/leads/${l.id}` });
      }
    }
  }

  if (role === 'business_development') {
    for (const d of deals.filter((x) => x.assigned_to === userId && x.stage !== 'Won' && x.stage !== 'Lost')) {
      const name = leads.find((l) => l.id === d.lead_id)?.business_name ?? 'Deal';
      if (d.stage === 'New Qualified Lead') {
        out.push({ id: `nq-${d.id}`, tone: 'teal', title: `New qualified lead · ${name}`, detail: 'Review the handoff note', to: `/deals/${d.id}` });
      }
      if (d.follow_up_date && d.follow_up_date < today) {
        out.push({ id: `df-${d.id}`, tone: 'red', title: `Follow-up overdue · ${name}`, detail: ageText(daysBetween(d.follow_up_date, today)), to: `/deals/${d.id}` });
      } else if (d.follow_up_date === today) {
        out.push({ id: `dt-${d.id}`, tone: 'amber', title: `Follow-up today · ${name}`, detail: d.next_action || 'Due today', to: `/deals/${d.id}` });
      }
    }
  }

  if (role === 'admin') {
    for (const l of leads.filter(isOpenLead)) {
      if (l.follow_up_date && l.follow_up_date < today) {
        out.push({ id: `fo-${l.id}`, tone: 'red', title: `Follow-up overdue · ${l.business_name}`, detail: ageText(daysBetween(l.follow_up_date, today)), to: `/leads/${l.id}` });
      }
      if (['Interested', 'Qualified', 'Meeting Booked'].includes(l.outreach_status) && !l.bd_assigned_to) {
        out.push({ id: `nobd-${l.id}`, tone: 'amber', title: `${l.outreach_status} lead has no business developer · ${l.business_name}`, detail: 'Assign it to Business Development', to: `/leads/${l.id}` });
      }
      if (l.outreach_status === 'Ready to Call' && !l.assigned_to) {
        out.push({ id: `un-${l.id}`, tone: 'amber', title: `Lead not assigned · ${l.business_name}`, detail: 'Assign it to outreach', to: `/leads/${l.id}` });
      }
    }
    for (const d of deals.filter((x) => x.stage === 'Won' && !clientDeals.has(x.id))) {
      const name = leads.find((l) => l.id === d.lead_id)?.business_name ?? 'Deal';
      out.push({ id: `won-${d.id}`, tone: 'red', title: `Won deal not converted · ${name}`, detail: 'Convert it to a client', to: `/deals/${d.id}` });
    }
    for (const c of clients.filter((x) => !['Active', 'Paused'].includes(x.onboarding_status) && x.access_status !== 'Complete')) {
      out.push({ id: `acc-${c.id}`, tone: 'amber', title: `Waiting on access · ${c.business_name}`, detail: `Access: ${c.access_status} · ${c.onboarding_status}`, to: `/clients/${c.id}` });
    }
    // deals with overdue follow-ups on the BD side
    for (const d of deals.filter((x) => x.stage !== 'Won' && x.stage !== 'Lost' && x.follow_up_date && x.follow_up_date < today)) {
      const name = leads.find((l) => l.id === d.lead_id)?.business_name ?? 'Deal';
      out.push({ id: `df-${d.id}`, tone: 'red', title: `Deal follow-up overdue · ${name}`, detail: ageText(daysBetween(d.follow_up_date!, today)), to: `/deals/${d.id}` });
    }
  }

  const rank = { red: 0, amber: 1, teal: 2 } as const;
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}
