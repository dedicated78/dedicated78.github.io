-- GrowwithMH CRM — 4/4 RPC functions
-- Multi-step actions that must be atomic. Called from the frontend with supabase.rpc().
-- INVOKER functions run under the caller's RLS; DEFINER functions re-check permissions explicitly.

-- ---------------------------------------------------------------------------
-- create_lead_with_report: Markdown upload → lead + report v1 in one transaction (admin only via RLS)
-- ---------------------------------------------------------------------------
create or replace function public.create_lead_with_report(
  p_lead_id   uuid,
  p_lead      jsonb,
  p_report    jsonb,
  p_file_path text
) returns uuid
language plpgsql security invoker set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can create leads' using errcode = 'insufficient_privilege';
  end if;

  insert into public.leads (
    id, business_name, contact_name, phone, email, website, location, niche, priority,
    recommended_service, main_opportunity, outreach_status, assigned_to, created_by
  ) values (
    p_lead_id,
    btrim(p_lead ->> 'business_name'),
    nullif(btrim(p_lead ->> 'contact_name'), ''),
    nullif(btrim(p_lead ->> 'phone'), ''),
    nullif(btrim(p_lead ->> 'email'), ''),
    nullif(btrim(p_lead ->> 'website'), ''),
    nullif(btrim(p_lead ->> 'location'), ''),
    nullif(btrim(p_lead ->> 'niche'), ''),
    coalesce(nullif(p_lead ->> 'priority', ''), 'Medium'),
    nullif(btrim(p_lead ->> 'recommended_service'), ''),
    nullif(btrim(p_lead ->> 'main_opportunity'), ''),
    'Ready to Call',
    nullif(p_lead ->> 'assigned_to', '')::uuid,
    auth.uid()
  );

  insert into public.prospect_reports (
    lead_id, version, file_path, raw_markdown, research_summary, why_this_prospect, key_findings,
    main_opportunity, recommended_service, outreach_angle, talking_points, suggested_opening,
    questions_to_ask, possible_objections, call_goal, research_notes, uploaded_by
  ) values (
    p_lead_id, 1, p_file_path, p_report ->> 'raw_markdown',
    nullif(btrim(p_report ->> 'research_summary'), ''),
    nullif(btrim(p_report ->> 'why_this_prospect'), ''),
    coalesce(p_report -> 'key_findings', '[]'::jsonb),
    nullif(btrim(p_report ->> 'main_opportunity'), ''),
    nullif(btrim(p_report ->> 'recommended_service'), ''),
    nullif(btrim(p_report ->> 'outreach_angle'), ''),
    coalesce(p_report -> 'talking_points', '[]'::jsonb),
    nullif(btrim(p_report ->> 'suggested_opening'), ''),
    coalesce(p_report -> 'questions_to_ask', '[]'::jsonb),
    coalesce(p_report -> 'possible_objections', '[]'::jsonb),
    nullif(btrim(p_report ->> 'call_goal'), ''),
    nullif(btrim(p_report ->> 'research_notes'), ''),
    auth.uid()
  );

  return p_lead_id;
end $$;

-- ---------------------------------------------------------------------------
-- add_report_version: new research version for an existing lead; older versions stay untouched
-- ---------------------------------------------------------------------------
create or replace function public.add_report_version(
  p_lead_id         uuid,
  p_report          jsonb,
  p_file_path       text,
  p_sync_lead       boolean default true
) returns integer
language plpgsql security invoker set search_path = public as $$
declare
  next_version integer;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can edit research' using errcode = 'insufficient_privilege';
  end if;

  select coalesce(max(version), 0) + 1 into next_version
    from public.prospect_reports where lead_id = p_lead_id;

  insert into public.prospect_reports (
    lead_id, version, file_path, raw_markdown, research_summary, why_this_prospect, key_findings,
    main_opportunity, recommended_service, outreach_angle, talking_points, suggested_opening,
    questions_to_ask, possible_objections, call_goal, research_notes, uploaded_by
  ) values (
    p_lead_id, next_version, p_file_path, p_report ->> 'raw_markdown',
    nullif(btrim(p_report ->> 'research_summary'), ''),
    nullif(btrim(p_report ->> 'why_this_prospect'), ''),
    coalesce(p_report -> 'key_findings', '[]'::jsonb),
    nullif(btrim(p_report ->> 'main_opportunity'), ''),
    nullif(btrim(p_report ->> 'recommended_service'), ''),
    nullif(btrim(p_report ->> 'outreach_angle'), ''),
    coalesce(p_report -> 'talking_points', '[]'::jsonb),
    nullif(btrim(p_report ->> 'suggested_opening'), ''),
    coalesce(p_report -> 'questions_to_ask', '[]'::jsonb),
    coalesce(p_report -> 'possible_objections', '[]'::jsonb),
    nullif(btrim(p_report ->> 'call_goal'), ''),
    nullif(btrim(p_report ->> 'research_notes'), ''),
    auth.uid()
  );

  if p_sync_lead then
    update public.leads set
      main_opportunity    = coalesce(nullif(btrim(p_report ->> 'main_opportunity'), ''), main_opportunity),
      recommended_service = coalesce(nullif(btrim(p_report ->> 'recommended_service'), ''), recommended_service)
    where id = p_lead_id;
  end if;

  return next_version;
end $$;

-- ---------------------------------------------------------------------------
-- log_activity: write the permanent activity row and move the lead (or deal) forward, atomically.
-- Runs as the caller, so RLS + column guards apply (outreach/BD may only touch outreach fields).
-- p_deal_id given  → the plan (next action / follow-up) is applied to that deal instead of the lead.
-- ---------------------------------------------------------------------------
create or replace function public.log_activity(
  p_lead_id        uuid,
  p_activity_type  text,
  p_outcome        text,
  p_notes          text,
  p_next_action    text,
  p_follow_up_date date,
  p_new_status     text default null,
  p_deal_id        uuid default null
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  new_id uuid;
begin
  insert into public.activities (lead_id, created_by, activity_type, outcome, notes, next_action, follow_up_date)
  values (
    p_lead_id, auth.uid(), p_activity_type,
    nullif(btrim(p_outcome), ''), nullif(btrim(p_notes), ''),
    nullif(btrim(p_next_action), ''), p_follow_up_date
  )
  returning id into new_id;

  if p_deal_id is not null then
    update public.deals
       set next_action = nullif(btrim(p_next_action), ''), follow_up_date = p_follow_up_date
     where id = p_deal_id and lead_id = p_lead_id;
  else
    update public.leads
       set outreach_status = coalesce(p_new_status, outreach_status),
           next_action     = nullif(btrim(p_next_action), ''),
           follow_up_date  = p_follow_up_date
     where id = p_lead_id;
  end if;

  return new_id;
end $$;

-- ---------------------------------------------------------------------------
-- hand_off_to_bd: outreach/admin passes a lead to Business Development.
-- Saves the handoff note + status, assigns the BD user (optional) and opens the deal.
-- ---------------------------------------------------------------------------
create or replace function public.hand_off_to_bd(
  p_lead_id uuid,
  p_bd_user uuid,
  p_note    text,
  p_status  text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  caller_role text := public.app_role();
  l public.leads%rowtype;
  new_status text;
  deal_id uuid;
begin
  if caller_role is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;

  select * into l from public.leads where id = p_lead_id;
  if not found then
    raise exception 'Lead not found';
  end if;
  if caller_role = 'outreach' and l.assigned_to is distinct from auth.uid() then
    raise exception 'This lead is not assigned to you' using errcode = 'insufficient_privilege';
  elsif caller_role = 'business_development' then
    raise exception 'Business development cannot hand leads off' using errcode = 'insufficient_privilege';
  end if;
  if l.archived then
    raise exception 'Archived leads cannot be handed off';
  end if;

  new_status := coalesce(p_status, l.outreach_status);
  if new_status not in ('Interested', 'Qualified', 'Meeting Booked') then
    raise exception 'Handoff status must be Interested, Qualified or Meeting Booked';
  end if;
  if coalesce(btrim(p_note), '') = '' then
    raise exception 'A handoff note is required';
  end if;
  if p_bd_user is not null and not exists (
    select 1 from public.profiles where id = p_bd_user and is_active and role = 'business_development'
  ) then
    raise exception 'Selected user is not an active business developer';
  end if;

  update public.leads
     set outreach_status = new_status,
         handoff_note    = btrim(p_note),
         bd_assigned_to  = coalesce(p_bd_user, bd_assigned_to)
   where id = p_lead_id;

  if p_bd_user is not null then
    select id into deal_id from public.deals
     where lead_id = p_lead_id and stage not in ('Won', 'Lost');

    if deal_id is null then
      insert into public.deals (lead_id, assigned_to, stage, next_action)
      values (
        p_lead_id, p_bd_user,
        case when new_status = 'Meeting Booked' then 'Meeting Booked' else 'New Qualified Lead' end,
        'Review handoff note and contact the prospect'
      )
      returning id into deal_id;
    else
      update public.deals set assigned_to = p_bd_user where id = deal_id;
    end if;

    insert into public.activities (lead_id, created_by, activity_type, outcome, notes)
    values (
      p_lead_id, auth.uid(), 'Note', 'Handed to Business Development',
      'Status: ' || new_status || E'\n' || btrim(p_note)
    );
  end if;

  return deal_id;
end $$;

-- ---------------------------------------------------------------------------
-- convert_deal_to_client: Won deal → client (+ default access checklist). Lead and deal are kept.
-- ---------------------------------------------------------------------------
create or replace function public.convert_deal_to_client(
  p_deal_id       uuid,
  p_business_name text,
  p_contact_name  text,
  p_phone         text,
  p_email         text,
  p_website       text,
  p_service       text,
  p_agreed_price  numeric,
  p_billing_type  text,
  p_start_date    date
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  d public.deals%rowtype;
  new_client uuid;
  t text;
begin
  select * into d from public.deals where id = p_deal_id;
  if not found then
    raise exception 'Deal not found';
  end if;
  if not (public.is_admin() or (public.app_role() = 'business_development' and d.assigned_to = auth.uid())) then
    raise exception 'Not allowed to convert this deal' using errcode = 'insufficient_privilege';
  end if;
  if d.stage <> 'Won' then
    raise exception 'Only Won deals can be converted to clients';
  end if;
  if exists (select 1 from public.clients where deal_id = p_deal_id) then
    raise exception 'This deal has already been converted';
  end if;
  if coalesce(btrim(p_business_name), '') = '' then
    raise exception 'Business name is required';
  end if;

  insert into public.clients (
    lead_id, deal_id, business_name, contact_name, phone, email, website, service,
    agreed_price, billing_type, start_date, created_by
  ) values (
    d.lead_id, d.id, btrim(p_business_name),
    nullif(btrim(p_contact_name), ''), nullif(btrim(p_phone), ''), nullif(btrim(p_email), ''),
    nullif(btrim(p_website), ''), nullif(btrim(p_service), ''),
    coalesce(p_agreed_price, 0), p_billing_type, p_start_date, auth.uid()
  )
  returning id into new_client;

  foreach t in array array[
    'Google Business Profile', 'Website / CMS', 'Google Search Console', 'Google Analytics',
    'Business Information', 'Branding / Logo', 'Business Photos', 'Social Profiles',
    'Previous SEO Reports', 'Other'
  ] loop
    insert into public.client_access (client_id, access_type) values (new_client, t);
  end loop;

  return new_client;
end $$;

-- ---------------------------------------------------------------------------
-- Execution rights: signed-in users only (each function enforces its own role checks)
-- ---------------------------------------------------------------------------
revoke all on function public.create_lead_with_report(uuid, jsonb, jsonb, text) from public, anon;
revoke all on function public.add_report_version(uuid, jsonb, text, boolean) from public, anon;
revoke all on function public.log_activity(uuid, text, text, text, text, date, text, uuid) from public, anon;
revoke all on function public.hand_off_to_bd(uuid, uuid, text, text) from public, anon;
revoke all on function public.convert_deal_to_client(uuid, text, text, text, text, text, text, numeric, text, date) from public, anon;

grant execute on function public.create_lead_with_report(uuid, jsonb, jsonb, text) to authenticated;
grant execute on function public.add_report_version(uuid, jsonb, text, boolean) to authenticated;
grant execute on function public.log_activity(uuid, text, text, text, text, date, text, uuid) to authenticated;
grant execute on function public.hand_off_to_bd(uuid, uuid, text, text) to authenticated;
grant execute on function public.convert_deal_to_client(uuid, text, text, text, text, text, text, numeric, text, date) to authenticated;
