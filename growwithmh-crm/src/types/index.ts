// Domain types + the value vocabularies used by the UI. They mirror the CHECK constraints in supabase/migrations.

export const ROLES = ['admin', 'outreach', 'business_development'] as const;
export type Role = (typeof ROLES)[number];
export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  outreach: 'Outreach',
  business_development: 'Business Development',
};

export const PRIORITIES = ['High', 'Medium', 'Low'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const LEAD_STATUSES = [
  'Ready to Call',
  'Attempted',
  'Connected',
  'Interested',
  'Follow-up',
  'Meeting Booked',
  'Qualified',
  'Won',
  'Lost',
  'Do Not Contact',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
/** Statuses outreach may set by hand (Won is decided by the deal). */
export const OUTREACH_SETTABLE_STATUSES: LeadStatus[] = LEAD_STATUSES.filter((s) => s !== 'Won');
/** Leads in these states are finished and never appear in work queues. */
export const CLOSED_LEAD_STATUSES: LeadStatus[] = ['Won', 'Lost', 'Do Not Contact'];
export const HANDOFF_STATUSES = ['Interested', 'Qualified', 'Meeting Booked'] as const;

export const ACTIVITY_TYPES = ['Call', 'Email', 'SMS', 'WhatsApp', 'Meeting', 'Note'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const DEAL_STAGES = [
  'New Qualified Lead',
  'Discovery',
  'Meeting Booked',
  'Proposal Needed',
  'Proposal Sent',
  'Negotiation',
  'Won',
  'Lost',
] as const;
export type DealStage = (typeof DEAL_STAGES)[number];
export const OPEN_DEAL_STAGES: DealStage[] = DEAL_STAGES.filter((s) => s !== 'Won' && s !== 'Lost');

export const BILLING_TYPES = ['Monthly', 'One-time', 'Quarterly', 'Annual'] as const;
export type BillingType = (typeof BILLING_TYPES)[number];

export const PROPOSAL_STATUSES = ['Not Started', 'In Progress', 'Sent', 'Accepted', 'Declined'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const PAYMENT_STATUSES = ['Pending', 'Paid', 'Partial', 'Not Applicable'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ACCESS_STATUSES = ['Not Requested', 'Requested', 'Partial', 'Complete'] as const;
export type AccessStatus = (typeof ACCESS_STATUSES)[number];

export const ONBOARDING_STATUSES = ['New Client', 'Payment Pending', 'Access Pending', 'Setup', 'Active', 'Paused'] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

export const ACCESS_TYPES = [
  'Google Business Profile',
  'Website / CMS',
  'Google Search Console',
  'Google Analytics',
  'Business Information',
  'Branding / Logo',
  'Business Photos',
  'Social Profiles',
  'Previous SEO Reports',
  'Other',
] as const;
export type AccessType = (typeof ACCESS_TYPES)[number];

export const ACCESS_ITEM_STATUSES = ['Not Requested', 'Requested', 'Received', 'Not Required'] as const;
export type AccessItemStatus = (typeof ACCESS_ITEM_STATUSES)[number];

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  id: number;
  company_name: string;
  default_currency: string;
  timezone: string;
  updated_at: string;
}

export interface Lead {
  id: string;
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
  outreach_status: LeadStatus;
  assigned_to: string | null;
  bd_assigned_to: string | null;
  created_by: string | null;
  next_action: string | null;
  follow_up_date: string | null; // YYYY-MM-DD
  handoff_note: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Objection {
  objection: string;
  response: string;
}

export interface ProspectReport {
  id: string;
  lead_id: string;
  version: number;
  file_path: string | null;
  raw_markdown: string;
  research_summary: string | null;
  why_this_prospect: string | null;
  key_findings: string[];
  main_opportunity: string | null;
  recommended_service: string | null;
  outreach_angle: string | null;
  talking_points: string[];
  suggested_opening: string | null;
  questions_to_ask: string[];
  possible_objections: Objection[];
  call_goal: string | null;
  research_notes: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  lead_id: string;
  created_by: string | null;
  activity_type: ActivityType;
  outcome: string | null;
  notes: string | null;
  next_action: string | null;
  follow_up_date: string | null;
  created_at: string;
}

export interface Deal {
  id: string;
  lead_id: string;
  assigned_to: string | null;
  stage: DealStage;
  estimated_value: number;
  billing_type: BillingType | null;
  discovery_notes: string | null;
  pain_points: string | null;
  services_discussed: string[];
  decision_maker: string | null;
  objections: string | null;
  proposal_status: ProposalStatus;
  proposal_notes: string | null;
  next_action: string | null;
  follow_up_date: string | null;
  meeting_date: string | null;
  won_at: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  lead_id: string | null;
  deal_id: string | null;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  service: string | null;
  agreed_price: number;
  billing_type: BillingType | null;
  start_date: string | null;
  payment_status: PaymentStatus;
  access_status: AccessStatus;
  onboarding_status: OnboardingStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientAccess {
  id: string;
  client_id: string;
  access_type: AccessType;
  status: AccessItemStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
