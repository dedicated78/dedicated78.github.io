-- GrowwithMH CRM — 2/4 Row Level Security
--
-- Visibility model
--   admin                 → everything
--   outreach              → leads where leads.assigned_to = me (and not archived)
--   business_development  → leads where leads.bd_assigned_to = me, and deals assigned to me
-- Inactive users resolve to no role, therefore see nothing.

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER so they can read profiles/leads without recursing into RLS)
-- ---------------------------------------------------------------------------
create or replace function public.app_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid() and is_active), false)
$$;

-- Row-level visibility rule for a lead, expressed on the row's own columns so it also works inside
-- INSERT ... RETURNING / UPDATE ... WITH CHECK (where a function that re-reads the table can't see the new row yet).
create or replace function public.lead_visible(p_assigned_to uuid, p_bd_assigned_to uuid, p_archived boolean) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select p.role = 'admin'
        or (not p_archived and p.role = 'outreach' and p_assigned_to = p.id)
        or (not p_archived and p.role = 'business_development' and p_bd_assigned_to = p.id)
    from public.profiles p
    where p.id = auth.uid() and p.is_active
  ), false)
$$;

-- Same rule for "does lead X exist and can I see it" (used by reports, activities and storage).
create or replace function public.can_access_lead(p_lead_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.leads l
    where l.id = p_lead_id and public.lead_visible(l.assigned_to, l.bd_assigned_to, l.archived)
  )
$$;

-- storage object names look like "{lead_id}/{version}-{file}.md"
create or replace function public.can_access_report_path(p_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  folder text := split_part(p_name, '/', 1);
begin
  if folder !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return public.can_access_lead(folder::uuid);
end $$;

revoke all on function public.app_role()                    from public, anon;
revoke all on function public.is_admin()                    from public, anon;
revoke all on function public.lead_visible(uuid, uuid, boolean) from public, anon;
revoke all on function public.can_access_lead(uuid)         from public, anon;
revoke all on function public.can_access_report_path(text)  from public, anon;
grant execute on function public.app_role()                   to authenticated;
grant execute on function public.is_admin()                   to authenticated;
grant execute on function public.lead_visible(uuid, uuid, boolean) to authenticated;
grant execute on function public.can_access_lead(uuid)        to authenticated;
grant execute on function public.can_access_report_path(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Column guards: RLS decides which ROWS, these triggers decide which COLUMNS.
-- They only constrain the `authenticated` API role; SQL editor / definer RPCs are unaffected.
-- ---------------------------------------------------------------------------
create or replace function public.leads_guard() returns trigger
language plpgsql set search_path = '' as $$
declare
  r text;
  allowed text[];
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  r := public.app_role();
  if r = 'admin' then
    return new;
  elsif r = 'outreach' then
    allowed := array['outreach_status', 'next_action', 'follow_up_date', 'handoff_note', 'updated_at'];
  elsif r = 'business_development' then
    allowed := array['outreach_status', 'next_action', 'follow_up_date', 'updated_at'];
  else
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;

  if (to_jsonb(new) - allowed) is distinct from (to_jsonb(old) - allowed) then
    raise exception 'Your role can only change outreach fields on a lead (status, next action, follow-up, handoff note)'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;

revoke all on function public.leads_guard() from public, anon, authenticated;

create trigger leads_guard_trg before update on public.leads
  for each row execute function public.leads_guard();

create or replace function public.deals_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and not public.is_admin() then
    if new.lead_id is distinct from old.lead_id or new.assigned_to is distinct from old.assigned_to then
      raise exception 'Only an admin can move or reassign a deal' using errcode = 'insufficient_privilege';
    end if;
  end if;

  if new.stage = 'Won' and old.stage is distinct from 'Won' then
    new.won_at := coalesce(new.won_at, now());
    new.lost_reason := null;
  end if;
  if new.stage = 'Lost' and coalesce(btrim(new.lost_reason), '') = '' then
    raise exception 'A lost reason is required' using errcode = 'check_violation';
  end if;
  if new.stage <> 'Won' and old.stage = 'Won' then
    new.won_at := null;
  end if;
  return new;
end $$;

revoke all on function public.deals_guard() from public, anon, authenticated;

create trigger deals_guard_trg before update on public.deals
  for each row execute function public.deals_guard();

-- Closing a deal mirrors onto the lead; re-opening a closed deal puts the lead back to Qualified.
create or replace function public.sync_lead_from_deal() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.stage is distinct from old.stage then
    if new.stage = 'Won' then
      update public.leads set outreach_status = 'Won' where id = new.lead_id;
    elsif new.stage = 'Lost' then
      update public.leads set outreach_status = 'Lost' where id = new.lead_id;
    elsif old.stage in ('Won', 'Lost') then
      update public.leads set outreach_status = 'Qualified'
       where id = new.lead_id and outreach_status in ('Won', 'Lost');
    end if;
  end if;
  return null;
end $$;

revoke all on function public.sync_lead_from_deal() from public, anon, authenticated;

create trigger deals_sync_lead_trg after update on public.deals
  for each row execute function public.sync_lead_from_deal();

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.app_settings     enable row level security;
alter table public.leads            enable row level security;
alter table public.prospect_reports enable row level security;
alter table public.activities       enable row level security;
alter table public.deals            enable row level security;
alter table public.clients          enable row level security;
alter table public.client_access    enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.app_role() is not null);

create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- no insert/delete policies: rows are created by the auth trigger and removed by cascade.

-- ---------------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------------
create policy app_settings_select on public.app_settings for select to authenticated
  using (public.app_role() is not null);

create policy app_settings_admin_update on public.app_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- leads  (no delete policy: archive instead)
-- ---------------------------------------------------------------------------
create policy leads_select on public.leads for select to authenticated
  using (public.lead_visible(assigned_to, bd_assigned_to, archived));

create policy leads_admin_insert on public.leads for insert to authenticated
  with check (public.is_admin());

create policy leads_update on public.leads for update to authenticated
  using (public.lead_visible(assigned_to, bd_assigned_to, archived))
  with check (public.lead_visible(assigned_to, bd_assigned_to, archived));

-- ---------------------------------------------------------------------------
-- prospect_reports  (admin writes only; versions are never deleted)
-- ---------------------------------------------------------------------------
create policy reports_select on public.prospect_reports for select to authenticated
  using (public.can_access_lead(lead_id));

create policy reports_admin_insert on public.prospect_reports for insert to authenticated
  with check (public.is_admin() and uploaded_by = (select auth.uid()));

create policy reports_admin_update on public.prospect_reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- activities  (append-only for everyone except admin)
-- ---------------------------------------------------------------------------
create policy activities_select on public.activities for select to authenticated
  using (public.can_access_lead(lead_id));

create policy activities_insert on public.activities for insert to authenticated
  with check (created_by = (select auth.uid()) and public.can_access_lead(lead_id));

create policy activities_admin_update on public.activities for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy activities_admin_delete on public.activities for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- deals  (outreach has no access)
-- ---------------------------------------------------------------------------
create policy deals_select on public.deals for select to authenticated
  using (public.is_admin() or (public.app_role() = 'business_development' and assigned_to = auth.uid()));

create policy deals_insert on public.deals for insert to authenticated
  with check (
    public.is_admin()
    or (public.app_role() = 'business_development' and assigned_to = auth.uid() and public.can_access_lead(lead_id))
  );

create policy deals_update on public.deals for update to authenticated
  using (public.is_admin() or (public.app_role() = 'business_development' and assigned_to = auth.uid()))
  with check (public.is_admin() or (public.app_role() = 'business_development' and assigned_to = auth.uid()));

create policy deals_admin_delete on public.deals for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- clients / client_access  (admin manages; BD can read clients converted from their own deals)
-- ---------------------------------------------------------------------------
create policy clients_select on public.clients for select to authenticated
  using (
    public.is_admin()
    or (public.app_role() = 'business_development'
        and deal_id is not null
        and exists (select 1 from public.deals d where d.id = clients.deal_id))  -- deals RLS limits this to own deals
  );

create policy clients_admin_insert on public.clients for insert to authenticated
  with check (public.is_admin());

create policy clients_admin_update on public.clients for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy clients_admin_delete on public.clients for delete to authenticated
  using (public.is_admin());

create policy client_access_select on public.client_access for select to authenticated
  using (exists (select 1 from public.clients c where c.id = client_access.client_id));  -- inherits clients RLS

create policy client_access_admin_insert on public.client_access for insert to authenticated
  with check (public.is_admin());

create policy client_access_admin_update on public.client_access for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy client_access_admin_delete on public.client_access for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Table privileges: signed-out visitors get nothing; signed-in users are governed by the policies above.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Hosted Supabase grants new tables/functions to anon by default. Close that door for anything created later too
-- (these defaults apply to objects created by the role running the migration, i.e. `postgres`).
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;
