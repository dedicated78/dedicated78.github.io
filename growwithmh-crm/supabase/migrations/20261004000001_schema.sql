-- GrowwithMH CRM — 1/4 schema
-- Tables, constraints, indexes and housekeeping triggers.
-- Status vocabularies are `text` + CHECK (not enums) so they can be changed with a one-line migration.

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  email       text,
  role        text not null default 'outreach'
              check (role in ('admin', 'outreach', 'business_development')),
  is_active   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'App users. Every new auth user gets an INACTIVE outreach profile. Nobody becomes admin automatically: the first admin is assigned explicitly with SQL (see README), later roles are changed by an active admin in the app.';

-- ---------------------------------------------------------------------------
-- app_settings (single row)
-- ---------------------------------------------------------------------------
create table public.app_settings (
  id               smallint primary key default 1 check (id = 1),
  company_name     text not null default 'GrowwithMH',
  default_currency text not null default 'USD',
  timezone         text not null default 'Asia/Riyadh',
  updated_at       timestamptz not null default now()
);

insert into public.app_settings (id) values (1);

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
create table public.leads (
  id                  uuid primary key default gen_random_uuid(),
  business_name       text not null check (length(btrim(business_name)) > 0),
  contact_name        text,
  phone               text,
  email               text,
  website             text,
  location            text,
  niche               text,
  priority            text not null default 'Medium' check (priority in ('High', 'Medium', 'Low')),
  recommended_service text,
  main_opportunity    text,
  outreach_status     text not null default 'Ready to Call'
                      check (outreach_status in (
                        'Ready to Call', 'Attempted', 'Connected', 'Interested', 'Follow-up',
                        'Meeting Booked', 'Qualified', 'Won', 'Lost', 'Do Not Contact')),
  assigned_to         uuid references public.profiles (id) on delete set null,  -- outreach owner
  bd_assigned_to      uuid references public.profiles (id) on delete set null,  -- business developer after handoff
  created_by          uuid references public.profiles (id) on delete set null,
  next_action         text,
  follow_up_date      date,
  handoff_note        text,
  archived            boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index leads_assigned_to_idx    on public.leads (assigned_to)    where not archived;
create index leads_bd_assigned_to_idx on public.leads (bd_assigned_to) where not archived;
create index leads_status_idx         on public.leads (outreach_status);
create index leads_follow_up_idx      on public.leads (follow_up_date) where follow_up_date is not null;
create index leads_created_at_idx     on public.leads (created_at desc);
create index leads_business_name_idx  on public.leads (lower(business_name));

-- ---------------------------------------------------------------------------
-- prospect_reports (append-only versions; highest version is current)
-- ---------------------------------------------------------------------------
create table public.prospect_reports (
  id                  uuid primary key default gen_random_uuid(),
  lead_id             uuid not null references public.leads (id) on delete cascade,
  version             integer not null check (version > 0),
  file_path           text,
  raw_markdown        text not null,
  research_summary    text,
  why_this_prospect   text,
  key_findings        jsonb not null default '[]'::jsonb,      -- string[]
  main_opportunity    text,
  recommended_service text,
  outreach_angle      text,
  talking_points      jsonb not null default '[]'::jsonb,      -- string[]
  suggested_opening   text,
  questions_to_ask    jsonb not null default '[]'::jsonb,      -- string[]
  possible_objections jsonb not null default '[]'::jsonb,      -- {objection, response}[]
  call_goal           text,
  research_notes      text,
  uploaded_by         uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  unique (lead_id, version)
);

create index prospect_reports_lead_idx on public.prospect_reports (lead_id, version desc);

-- ---------------------------------------------------------------------------
-- activities (permanent contact log)
-- ---------------------------------------------------------------------------
create table public.activities (
  id             uuid primary key default gen_random_uuid(),
  lead_id        uuid not null references public.leads (id) on delete cascade,
  created_by     uuid references public.profiles (id) on delete set null,
  activity_type  text not null check (activity_type in ('Call', 'Email', 'SMS', 'WhatsApp', 'Meeting', 'Note')),
  outcome        text,
  notes          text,
  next_action    text,
  follow_up_date date,
  created_at     timestamptz not null default now()
);

create index activities_lead_idx    on public.activities (lead_id, created_at desc);
create index activities_created_idx on public.activities (created_at desc);
create index activities_author_idx  on public.activities (created_by);

-- ---------------------------------------------------------------------------
-- deals
-- ---------------------------------------------------------------------------
create table public.deals (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid not null references public.leads (id) on delete cascade,
  assigned_to       uuid references public.profiles (id) on delete set null,
  stage             text not null default 'New Qualified Lead'
                    check (stage in (
                      'New Qualified Lead', 'Discovery', 'Meeting Booked', 'Proposal Needed',
                      'Proposal Sent', 'Negotiation', 'Won', 'Lost')),
  estimated_value   numeric(12, 2) not null default 0 check (estimated_value >= 0),
  billing_type      text check (billing_type in ('Monthly', 'One-time', 'Quarterly', 'Annual')),
  discovery_notes   text,
  pain_points       text,
  services_discussed jsonb not null default '[]'::jsonb,       -- string[]
  decision_maker    text,
  objections        text,
  proposal_status   text not null default 'Not Started'
                    check (proposal_status in ('Not Started', 'In Progress', 'Sent', 'Accepted', 'Declined')),
  proposal_notes    text,
  next_action       text,
  follow_up_date    date,
  meeting_date      timestamptz,
  won_at            timestamptz,
  lost_reason       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index deals_assigned_idx  on public.deals (assigned_to);
create index deals_lead_idx      on public.deals (lead_id);
create index deals_stage_idx     on public.deals (stage);
create index deals_follow_up_idx on public.deals (follow_up_date) where follow_up_date is not null;
-- A lead can have only one open deal at a time (history of closed deals is kept).
create unique index deals_one_open_per_lead on public.deals (lead_id) where stage not in ('Won', 'Lost');

-- ---------------------------------------------------------------------------
-- clients + client_access
-- ---------------------------------------------------------------------------
create table public.clients (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid references public.leads (id) on delete set null,
  deal_id           uuid references public.deals (id) on delete set null,
  business_name     text not null check (length(btrim(business_name)) > 0),
  contact_name      text,
  phone             text,
  email             text,
  website           text,
  service           text,
  agreed_price      numeric(12, 2) not null default 0 check (agreed_price >= 0),
  billing_type      text check (billing_type in ('Monthly', 'One-time', 'Quarterly', 'Annual')),
  start_date        date,
  payment_status    text not null default 'Pending'
                    check (payment_status in ('Pending', 'Paid', 'Partial', 'Not Applicable')),
  access_status     text not null default 'Not Requested'
                    check (access_status in ('Not Requested', 'Requested', 'Partial', 'Complete')),
  onboarding_status text not null default 'New Client'
                    check (onboarding_status in ('New Client', 'Payment Pending', 'Access Pending', 'Setup', 'Active', 'Paused')),
  notes             text,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index clients_onboarding_idx on public.clients (onboarding_status);
create index clients_lead_idx       on public.clients (lead_id);
create unique index clients_one_per_deal on public.clients (deal_id) where deal_id is not null;

-- Tracks WHETHER access was granted. Never store passwords or credentials here.
create table public.client_access (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  access_type text not null check (access_type in (
                'Google Business Profile', 'Website / CMS', 'Google Search Console', 'Google Analytics',
                'Business Information', 'Branding / Logo', 'Business Photos', 'Social Profiles',
                'Previous SEO Reports', 'Other')),
  status      text not null default 'Not Requested'
              check (status in ('Not Requested', 'Requested', 'Received', 'Not Required')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (client_id, access_type)
);

create index client_access_client_idx on public.client_access (client_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch      before update on public.profiles      for each row execute function public.touch_updated_at();
create trigger app_settings_touch  before update on public.app_settings  for each row execute function public.touch_updated_at();
create trigger leads_touch         before update on public.leads         for each row execute function public.touch_updated_at();
create trigger deals_touch         before update on public.deals         for each row execute function public.touch_updated_at();
create trigger clients_touch       before update on public.clients       for each row execute function public.touch_updated_at();
create trigger client_access_touch before update on public.client_access for each row execute function public.touch_updated_at();

-- New auth user → profile. ALWAYS inactive, role 'outreach' (the least-privileged role).
-- Nothing is read from user/app metadata and signup order grants nothing: users can write their own
-- raw_user_meta_data, so it must never influence authorization. Admins are assigned explicitly via SQL;
-- everyone else is activated and given a role by an active admin in Settings.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(new.email, ''), '@', 1)),
    'outreach',
    false
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users created before this migration ran (e.g. added in the dashboard first) get the same inactive profile.
insert into public.profiles (id, email, full_name, role, is_active)
select u.id, u.email,
       coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(coalesce(u.email, ''), '@', 1)),
       'outreach', false
from auth.users u
on conflict (id) do nothing;

-- Keep profiles.email in sync if the auth email changes.
create or replace function public.sync_profile_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

-- Profile guard:
--  * API callers (role `authenticated`) can never change a profile's id, email or created_at
--    (email is mirrored from auth by a trigger); role/is_active/full_name changes are limited to admins by RLS.
--  * The system can never be left without an active admin.
create or replace function public.profiles_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and (
       new.id is distinct from old.id
    or new.email is distinct from old.email
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'id, email and created_at cannot be changed here' using errcode = 'insufficient_privilege';
  end if;

  if old.role = 'admin' and old.is_active and (new.role <> 'admin' or not new.is_active) then
    if not exists (
      select 1 from public.profiles where role = 'admin' and is_active and id <> old.id
    ) then
      raise exception 'At least one active admin is required' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;

create trigger profiles_guard_trg before update on public.profiles
  for each row execute function public.profiles_guard();

-- Client access status is derived from the checklist.
create or replace function public.refresh_client_access_status() returns trigger
language plpgsql set search_path = '' as $$
declare
  cid uuid := coalesce(new.client_id, old.client_id);
  total int;
  received int;
  not_required int;
  requested int;
  derived text;
begin
  select count(*),
         count(*) filter (where status = 'Received'),
         count(*) filter (where status = 'Not Required'),
         count(*) filter (where status = 'Requested')
    into total, received, not_required, requested
    from public.client_access where client_id = cid;

  derived := case
    when total = 0 then 'Not Requested'
    when received + not_required = total then 'Complete'
    when received > 0 then 'Partial'
    when requested > 0 then 'Requested'
    else 'Not Requested'
  end;

  update public.clients set access_status = derived where id = cid and access_status is distinct from derived;
  return null;
end $$;

create trigger client_access_status_trg
  after insert or update or delete on public.client_access
  for each row execute function public.refresh_client_access_status();

-- Trigger functions are never called directly: nobody (including the API roles) needs EXECUTE on them.
revoke all on function public.touch_updated_at()              from public, anon, authenticated;
revoke all on function public.handle_new_user()               from public, anon, authenticated;
revoke all on function public.sync_profile_email()            from public, anon, authenticated;
revoke all on function public.profiles_guard()                from public, anon, authenticated;
revoke all on function public.refresh_client_access_status()  from public, anon, authenticated;
