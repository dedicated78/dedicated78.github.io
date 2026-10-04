-- GrowwithMH CRM — authorization regression test (RLS, column guards, RPCs, grants, bootstrap model).
--
-- RUN ONLY ON AN EMPTY SCRATCH DATABASE / SCRATCH SUPABASE PROJECT (apply the 4 migrations first, no real users or data).
-- It creates fake users and data, then ABORTS ITSELF AT THE END so everything is rolled back.
--
--   psql "$SCRATCH_DB_URL" -f supabase/tests/rls_test.sql
--   (or paste the whole file into the Supabase SQL editor and run it)
--
-- The last statement deliberately raises an error whose first line is the verdict:
--   ERROR:  RLS TESTS PASSED: 128 passed, 0 failed
-- Any failure changes it to "RLS TESTS FAILED" and lists the failing checks.

begin;
create schema t;
create table t.results (id serial primary key, ok boolean not null, label text not null, detail text);
grant usage on schema t to public;
grant all on t.results to public;
grant usage, select on all sequences in schema t to public;

create function t.rec(p_ok boolean, p_label text, p_detail text default null) returns void language plpgsql as $$
begin
  insert into t.results (ok, label, detail) values (p_ok, p_label, p_detail);
  raise notice '%  %', case when p_ok then 'PASS' else 'FAIL' end, p_label || coalesce(' [' || p_detail || ']', '');
end $$;

-- act as a signed-in user (optionally with hostile JWT claims); reset role = what the SQL editor / migrations run as
create function t.as_user(u uuid, hostile boolean default false) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', u::text, true);
  perform set_config('request.jwt.claims',
    case when hostile
      then json_build_object('sub', u, 'role', 'authenticated',
             'app_metadata', json_build_object('role', 'admin', 'is_active', true),
             'user_metadata', json_build_object('role', 'admin', 'is_active', true, 'app_role', 'admin'))::text
      else json_build_object('sub', u, 'role', 'authenticated')::text end, true);
  set local role authenticated;
end $$;
create function t.as_anon() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
end $$;
create function t.as_db() returns void language plpgsql as $$ begin reset role; end $$;

create function t.fails(q text, label text) returns void language plpgsql as $$
begin
  begin execute q; perform t.rec(false, label, 'expected an error, got success');
  exception when others then perform t.rec(true, label, left(sqlerrm, 70)); end;
end $$;
create function t.ok(q text, label text) returns void language plpgsql as $$
begin
  begin execute q; perform t.rec(true, label);
  exception when others then perform t.rec(false, label, sqlerrm); end;
end $$;
create function t.count_is(q text, expected int, label text) returns void language plpgsql as $$
declare n int;
begin
  begin execute 'select count(*) from (' || q || ') x' into n;
    perform t.rec(n = expected, label, case when n = expected then n::text else 'got ' || n || ', expected ' || expected end);
  exception when others then perform t.rec(false, label, sqlerrm); end;
end $$;
create function t.affects(q text, expected int, label text) returns void language plpgsql as $$
declare n int;
begin
  begin execute q; get diagnostics n = row_count;
    perform t.rec(n = expected, label, case when n = expected then n || ' rows' else 'got ' || n || ', expected ' || expected end);
  exception when others then perform t.rec(false, label, sqlerrm); end;
end $$;
grant execute on all functions in schema t to public;

-- ===========================================================================
-- 1. SIGN-UP / BOOTSTRAP MODEL: nobody is admin or active automatically
-- ===========================================================================
-- The very first signup carries hostile metadata on purpose (user + app metadata both claim admin).
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data) values
 ('00000000-0000-0000-0000-0000000000a1','mehedi@rls-test.invalid','{"full_name":"Mehedi","role":"admin","is_active":true,"app_role":"admin"}','{"role":"admin","is_active":true}'),
 ('00000000-0000-0000-0000-0000000000b1','majeda@rls-test.invalid','{"role":"admin","is_active":true}','{}'),
 ('00000000-0000-0000-0000-0000000000c1','mostafa@rls-test.invalid','{}','{}'),
 ('00000000-0000-0000-0000-0000000000d1','rival@rls-test.invalid','{}','{}'),
 ('00000000-0000-0000-0000-0000000000e1','intruder@rls-test.invalid','{"role":"admin","is_active":true}','{"role":"admin"}');

select t.count_is($$select 1 from profiles where email like '%@rls-test.invalid'$$, 5, 'profile created for every auth user');
select t.count_is($$select 1 from profiles where email = 'mehedi@rls-test.invalid' and role = 'outreach' and not is_active$$, 1, 'FIRST signup is NOT admin and NOT active (even with admin metadata)');
select t.count_is($$select 1 from profiles where email like '%@rls-test.invalid' and (role <> 'outreach' or is_active)$$, 0, 'every new signup is inactive outreach; user/app metadata ignored');

-- metadata edited AFTER signup (users can do this themselves) changes nothing
update auth.users set raw_user_meta_data = '{"role":"admin","is_active":true}', raw_app_meta_data = '{"role":"admin"}' where email = 'majeda@rls-test.invalid';
select t.count_is($$select 1 from profiles where email = 'majeda@rls-test.invalid' and role = 'outreach' and not is_active$$, 1, 'editing auth metadata later does not touch the profile');

-- email changes are mirrored but never touch authorization
update auth.users set email = 'majeda.renamed@rls-test.invalid' where email = 'majeda@rls-test.invalid';
select t.count_is($$select 1 from profiles where email = 'majeda.renamed@rls-test.invalid' and role = 'outreach' and not is_active$$, 1, 'auth email change is mirrored, role/active untouched');
update auth.users set email = 'majeda@rls-test.invalid' where email = 'majeda.renamed@rls-test.invalid';

-- Nobody is admin, so nobody in the app can promote anyone. Inactive "admin-claiming" users have no power:
select t.as_user('00000000-0000-0000-0000-0000000000a1', true);
select t.affects($$update profiles set role = 'admin', is_active = true where id = auth.uid()$$, 0, 'inactive first user cannot self-promote (hostile JWT claims too)');
select t.affects($$update profiles set role = 'admin', is_active = true where email like '%@rls-test.invalid'$$, 0, 'inactive user cannot promote anyone');
select t.fails($$insert into profiles (id, role, is_active) values (gen_random_uuid(), 'admin', true)$$, 'users cannot insert profiles');
select t.affects($$delete from profiles$$, 0, 'users cannot delete profiles');
select t.count_is($$select 1 from profiles$$, 1, 'inactive user sees only their own profile');
select t.count_is($$select 1 from app_settings$$, 0, 'inactive user cannot read settings');
select t.as_user('00000000-0000-0000-0000-0000000000e1', true);
select t.affects($$update profiles set role = 'admin', is_active = true where id = auth.uid()$$, 0, 'intruder with admin metadata cannot self-promote');

-- The documented initial-admin step, exactly as the README runs it in the SQL editor (role: postgres, no JWT)
select t.as_db();
select t.affects($$update public.profiles set role = 'admin', is_active = true, full_name = 'Mehedi' where email = 'mehedi@rls-test.invalid'$$, 1, 'SQL editor explicitly assigns the initial admin (1 row)');
select t.count_is($$select 1 from profiles where email like '%@rls-test.invalid' and role = 'admin' and is_active$$, 1, 'exactly one admin exists, the one assigned explicitly');

-- ===========================================================================
-- 2. INACTIVE USERS CANNOT REACH CRM DATA (data exists, assigned to them)
-- ===========================================================================
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.ok($$select create_lead_with_report('99999999-9999-9999-9999-999999999999',
  '{"business_name":"Locked Co","assigned_to":"00000000-0000-0000-0000-0000000000b1"}'::jsonb,
  '{"raw_markdown":"# locked"}'::jsonb, '99999999-9999-9999-9999-999999999999/1-locked.md')$$, 'admin creates a lead assigned to a not-yet-active user');
select t.as_db();
insert into storage.objects (bucket_id, name) values ('prospect-reports', '99999999-9999-9999-9999-999999999999/1-locked.md');
insert into activities (lead_id, activity_type, notes) values ('99999999-9999-9999-9999-999999999999', 'Note', 'locked note');

select t.as_user('00000000-0000-0000-0000-0000000000b1', true);  -- Majeda: inactive, hostile claims
select t.count_is($$select 1 from leads$$, 0, 'inactive user: no leads, even assigned to them (hostile claims)');
select t.count_is($$select 1 from prospect_reports$$, 0, 'inactive user: no reports');
select t.count_is($$select 1 from activities$$, 0, 'inactive user: no activities');
select t.count_is($$select 1 from deals$$, 0, 'inactive user: no deals');
select t.count_is($$select 1 from clients$$, 0, 'inactive user: no clients');
select t.count_is($$select 1 from storage.objects where bucket_id = 'prospect-reports'$$, 0, 'inactive user: no storage objects');
select t.fails($$select log_activity('99999999-9999-9999-9999-999999999999','Note',null,'sneaky',null,null)$$, 'inactive user cannot log activity');
select t.fails($$select hand_off_to_bd('99999999-9999-9999-9999-999999999999', null, 'x', 'Qualified')$$, 'inactive user cannot hand off');
select t.affects($$update leads set next_action = 'x'$$, 0, 'inactive user cannot update leads');
select t.as_db();
delete from storage.objects where name like '99999999-9999-9999-9999-999999999999/%';
delete from leads where id = '99999999-9999-9999-9999-999999999999';

-- ===========================================================================
-- 3. THE MANUALLY ASSIGNED ADMIN ACTIVATES USERS AND ASSIGNS ROLES IN THE APP
-- ===========================================================================
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.count_is($$select 1 from profiles where email like '%@rls-test.invalid'$$, 5, 'admin sees every profile');
select t.affects($$update profiles set role = 'outreach', is_active = true, full_name = 'Majeda' where id = '00000000-0000-0000-0000-0000000000b1'$$, 1, 'admin activates Majeda as outreach');
select t.affects($$update profiles set role = 'business_development', is_active = true, full_name = 'Mostafa' where id = '00000000-0000-0000-0000-0000000000c1'$$, 1, 'admin activates Mostafa as business_development');
select t.affects($$update profiles set role = 'outreach', is_active = true, full_name = 'Rival' where id = '00000000-0000-0000-0000-0000000000d1'$$, 1, 'admin activates Rival as outreach');
select t.fails($$update profiles set role = 'outreach' where id = '00000000-0000-0000-0000-0000000000a1'$$, 'cannot demote the last active admin');
select t.fails($$update profiles set is_active = false where id = '00000000-0000-0000-0000-0000000000a1'$$, 'cannot deactivate the last active admin');
select t.fails($$update profiles set email = 'hijack@rls-test.invalid' where id = '00000000-0000-0000-0000-0000000000b1'$$, 'even an admin cannot rewrite a profile email through the API');
select t.fails($$update profiles set id = gen_random_uuid() where id = '00000000-0000-0000-0000-0000000000b1'$$, 'even an admin cannot change a profile id');

-- ===========================================================================
-- 4. NON-ADMINS CANNOT ELEVATE THEMSELVES OR OTHERS
-- ===========================================================================
select t.as_user('00000000-0000-0000-0000-0000000000b1', true);  -- active outreach, hostile claims
select t.affects($$update profiles set role = 'admin' where id = auth.uid()$$, 0, 'outreach cannot make themself admin');
select t.affects($$update profiles set role = 'admin', is_active = true where id <> auth.uid()$$, 0, 'outreach cannot promote or activate anyone else');
select t.affects($$update profiles set role = 'business_development' where id = auth.uid()$$, 0, 'outreach cannot change their own role');
select t.affects($$update profiles set is_active = false where id <> auth.uid()$$, 0, 'outreach cannot deactivate others');
select t.fails($$insert into profiles (id, role, is_active) values (gen_random_uuid(), 'admin', true)$$, 'outreach cannot insert an admin profile');
select t.affects($$delete from profiles$$, 0, 'outreach cannot delete profiles');
select t.affects($$update app_settings set company_name = 'pwned'$$, 0, 'outreach cannot change settings');
select t.as_user('00000000-0000-0000-0000-0000000000c1', true);  -- active BD, hostile claims
select t.affects($$update profiles set role = 'admin' where id = auth.uid()$$, 0, 'business_development cannot make themself admin');
select t.affects($$update profiles set role = 'admin', is_active = true where id <> auth.uid()$$, 0, 'business_development cannot promote anyone else');
select t.affects($$update profiles set is_active = false where id <> auth.uid()$$, 0, 'business_development cannot deactivate others');
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.count_is($$select 1 from profiles where email like '%@rls-test.invalid' and role = 'admin' and is_active$$, 1, 'still exactly one admin after all elevation attempts');

-- admin creates leads through RPC
select t.ok($$select create_lead_with_report('11111111-1111-1111-1111-111111111111',
  '{"business_name":"ABC Roofing","phone":"+1 555","priority":"High","assigned_to":"00000000-0000-0000-0000-0000000000b1","recommended_service":"Local SEO"}'::jsonb,
  '{"raw_markdown":"# x","talking_points":["a","b"],"main_opportunity":"Maps"}'::jsonb, '11111111-1111-1111-1111-111111111111/1-abc.md')$$, 'admin create_lead_with_report');
select t.ok($$select create_lead_with_report('22222222-2222-2222-2222-222222222222',
  '{"business_name":"Rival Plumbing","assigned_to":"00000000-0000-0000-0000-0000000000d1"}'::jsonb,
  '{"raw_markdown":"# y"}'::jsonb, '22222222-2222-2222-2222-222222222222/1-r.md')$$, 'admin create 2nd lead');
select t.ok($$select add_report_version('11111111-1111-1111-1111-111111111111','{"raw_markdown":"# x2","main_opportunity":"New opp"}'::jsonb,'11111111-1111-1111-1111-111111111111/2-abc.md')$$, 'admin add report version 2');
select t.count_is($$select 1 from prospect_reports where lead_id='11111111-1111-1111-1111-111111111111'$$, 2, 'both report versions retained');
insert into storage.objects (bucket_id, name) values ('prospect-reports','11111111-1111-1111-1111-111111111111/1-abc.md'),('prospect-reports','22222222-2222-2222-2222-222222222222/1-r.md');
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.ok($$insert into storage.objects (bucket_id, name) values ('prospect-reports','33333333-3333-3333-3333-333333333333/1-z.md')$$, 'admin can upload to storage');

-- regression: direct insert with RETURNING (what the app's "New lead" form does) must work for admin
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.ok($$insert into leads (business_name, created_by) values ('Manual Co', auth.uid()) returning id$$, 'admin direct insert ... returning works');
select t.ok($$update leads set assigned_to='00000000-0000-0000-0000-0000000000b1' where business_name='Manual Co' returning id$$, 'admin reassign ... returning works');
select t.as_user('00000000-0000-0000-0000-0000000000b1');
select t.count_is($$select 1 from leads where business_name='Manual Co'$$, 1, 'newly assigned lead visible to outreach');
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.ok($$delete from storage.objects where false$$, 'noop');

-- Majeda (outreach)
select t.as_user('00000000-0000-0000-0000-0000000000b1');
select t.count_is($$select 1 from leads where business_name <> '__none__'$$, 2, 'majeda sees only her leads (incl. manual one)');
select t.count_is($$select 1 from prospect_reports$$, 2, 'majeda sees reports of her lead only');
select t.count_is($$select 1 from profiles where email like '%@rls-test.invalid'$$, 5, 'active user sees team profiles');
select t.count_is($$select 1 from deals$$, 0, 'majeda has no deal access');
select t.fails($$insert into leads (business_name) values ('Sneaky')$$, 'majeda cannot create leads');
select t.fails($$update leads set business_name='Hack' where id='11111111-1111-1111-1111-111111111111'$$, 'majeda cannot edit business name');
select t.fails($$update leads set assigned_to='00000000-0000-0000-0000-0000000000d1' where id='11111111-1111-1111-1111-111111111111'$$, 'majeda cannot reassign');
select t.fails($$update leads set archived=true where id='11111111-1111-1111-1111-111111111111'$$, 'majeda cannot archive');
select t.fails($$update leads set bd_assigned_to='00000000-0000-0000-0000-0000000000c1' where id='11111111-1111-1111-1111-111111111111'$$, 'majeda cannot set BD directly (must use handoff)');
select t.ok($$update leads set outreach_status='Attempted', next_action='call again' where id='11111111-1111-1111-1111-111111111111'$$, 'majeda can update status/next action');
select t.affects($$update leads set outreach_status='Won' where id='22222222-2222-2222-2222-222222222222'$$, 0, 'majeda cannot touch rival lead');
select t.fails($$insert into prospect_reports (lead_id, version, raw_markdown, uploaded_by) values ('11111111-1111-1111-1111-111111111111', 9, 'x', auth.uid())$$, 'majeda cannot insert reports');
select t.affects($$update prospect_reports set call_goal='x' where lead_id='11111111-1111-1111-1111-111111111111'$$, 0, 'majeda cannot edit reports');
select t.affects($$delete from prospect_reports where lead_id='11111111-1111-1111-1111-111111111111'$$, 0, 'majeda cannot delete reports');
select t.count_is($$select 1 from storage.objects where bucket_id='prospect-reports'$$, 1, 'majeda can read only her lead report file');
select t.fails($$insert into storage.objects (bucket_id, name) values ('prospect-reports','11111111-1111-1111-1111-111111111111/9-evil.md')$$, 'majeda cannot upload to storage');
select t.ok($$select log_activity('11111111-1111-1111-1111-111111111111','Call','No Answer','rang out','call tomorrow','2026-10-05','Attempted')$$, 'log_activity (call)');
select t.count_is($$select 1 from leads where outreach_status='Attempted' and follow_up_date='2026-10-05' and next_action='call tomorrow'$$, 1, 'log_activity moved lead status + follow-up');
select t.fails($$select log_activity('22222222-2222-2222-2222-222222222222','Call','No Answer',null,null,null)$$, 'majeda cannot log on rival lead');
select t.fails($$insert into activities (lead_id, created_by, activity_type) values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000a1','Note')$$, 'cannot forge activity author');
select t.affects($$update activities set notes='edited'$$, 0, 'activities immutable (update)');
select t.affects($$delete from activities$$, 0, 'activities immutable (delete)');
select t.fails($$select hand_off_to_bd('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-0000000000c1','n','Qualified')$$, 'majeda cannot hand off rival lead');
select t.fails($$select hand_off_to_bd('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000c1','','Qualified')$$, 'handoff requires a note');
select t.fails($$select hand_off_to_bd('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000d1','n','Qualified')$$, 'handoff target must be BD');
select t.fails($$select hand_off_to_bd('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000c1','n','Lost')$$, 'handoff status restricted');
select t.ok($$select hand_off_to_bd('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000c1','Owner wants pricing, free Wed pm','Meeting Booked')$$, 'majeda hands off to mostafa');
select t.count_is($$select 1 from leads where outreach_status='Meeting Booked' and handoff_note like 'Owner%' and bd_assigned_to is not null$$, 1, 'handoff saved note+status+bd');
select t.count_is($$select 1 from activities$$, 2, 'majeda history kept + handoff note activity');
select t.count_is($$select 1 from deals$$, 0, 'majeda still cannot read deals');

-- Mostafa (BD)
select t.as_user('00000000-0000-0000-0000-0000000000c1');
select t.count_is($$select 1 from leads where business_name <> '__none__'$$, 1, 'mostafa sees handed-off lead only');
select t.count_is($$select 1 from prospect_reports$$, 2, 'mostafa reads research of handed-off lead');
select t.count_is($$select 1 from activities$$, 2, 'mostafa reads outreach history');
select t.count_is($$select 1 from deals where stage='Meeting Booked'$$, 1, 'deal auto-created at Meeting Booked');
select t.fails($$update leads set business_name='x' where id='11111111-1111-1111-1111-111111111111'$$, 'mostafa cannot edit lead identity');
select t.affects($$update activities set notes='x'$$, 0, 'mostafa cannot edit majeda activities');
select t.affects($$delete from activities$$, 0, 'mostafa cannot delete activities');
select t.ok($$update deals set stage='Discovery', estimated_value=1500, billing_type='Monthly', discovery_notes='n'$$, 'mostafa updates deal');
select t.fails($$update deals set assigned_to='00000000-0000-0000-0000-0000000000a1'$$, 'mostafa cannot reassign deal');
select t.fails($$update deals set stage='Lost'$$, 'Lost requires a reason');
select t.fails($$select convert_deal_to_client((select id from deals limit 1),'ABC','x',null,null,null,'SEO',1500,'Monthly',null)$$, 'cannot convert before Won');
select t.ok($$update deals set stage='Won'$$, 'mostafa marks Won');
select t.count_is($$select 1 from deals where won_at is not null$$, 1, 'won_at stamped');
select t.count_is($$select 1 from leads where outreach_status='Won'$$, 1, 'lead mirrors Won');
select t.ok($$select log_activity('11111111-1111-1111-1111-111111111111','Meeting','Meeting Held','kickoff','send proposal','2026-10-09',null,(select id from deals limit 1))$$, 'BD logs activity against deal');
select t.count_is($$select 1 from deals where follow_up_date='2026-10-09' and next_action='send proposal'$$, 1, 'deal plan updated by log_activity');
select t.ok($$select convert_deal_to_client((select id from deals limit 1),'ABC Roofing','John','+1 555',null,null,'Local SEO',1500,'Monthly','2026-10-15')$$, 'mostafa converts to client');
select t.fails($$select convert_deal_to_client((select id from deals limit 1),'ABC Roofing',null,null,null,null,null,1,null,null)$$, 'cannot convert twice');
select t.count_is($$select 1 from clients$$, 1, 'mostafa reads converted client');
select t.count_is($$select 1 from client_access$$, 10, 'default access checklist created and readable');
select t.affects($$update clients set notes='x'$$, 0, 'mostafa cannot edit client');
select t.affects($$update client_access set status='Received'$$, 0, 'mostafa cannot edit access');
select t.fails($$insert into clients (business_name) values ('x')$$, 'mostafa cannot insert clients directly');
select t.count_is($$select 1 from app_settings$$, 1, 'settings readable');
select t.affects($$update app_settings set company_name='x'$$, 0, 'settings admin-only');

-- Rival outreach + anon
select t.as_user('00000000-0000-0000-0000-0000000000d1');
select t.count_is($$select 1 from leads where business_name <> '__none__'$$, 1, 'rival sees only own lead');
select t.count_is($$select 1 from clients$$, 0, 'outreach sees no clients');
select t.count_is($$select 1 from storage.objects where bucket_id='prospect-reports'$$, 1, 'rival reads only own file');
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select t.fails($$select 1 from leads$$, 'anon cannot read leads');
select t.fails($$select app_role()$$, 'anon cannot call helpers');
select t.fails($$select log_activity('11111111-1111-1111-1111-111111111111','Note',null,null,null,null)$$, 'anon cannot call RPCs');
reset role;

-- Admin: access checklist, archive, delete client
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.count_is($$select 1 from leads where business_name <> '__none__'$$, 3, 'admin sees all leads');
select t.count_is($$select 1 from clients where access_status='Not Requested'$$, 1, 'access starts Not Requested');
select t.ok($$update client_access set status='Requested' where access_type='Google Business Profile'$$, 'admin edits checklist');
select t.count_is($$select 1 from clients where access_status='Requested'$$, 1, 'access derived: Requested');
select t.ok($$update client_access set status='Received' where access_type='Google Business Profile'$$, 'received');
select t.count_is($$select 1 from clients where access_status='Partial'$$, 1, 'access derived: Partial');
select t.ok($$update client_access set status='Received' where access_type<>'Social Profiles'$$, 'received most');
select t.ok($$update client_access set status='Not Required' where access_type='Social Profiles'$$, 'one not required');
select t.count_is($$select 1 from clients where access_status='Complete'$$, 1, 'access derived: Complete');
select t.ok($$update leads set archived=true where id='22222222-2222-2222-2222-222222222222'$$, 'admin archives lead');
select t.as_user('00000000-0000-0000-0000-0000000000d1');
select t.count_is($$select 1 from leads where business_name <> '__none__'$$, 0, 'archived lead hidden from outreach');
select t.count_is($$select 1 from storage.objects where bucket_id='prospect-reports'$$, 0, 'archived lead file hidden');
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.ok($$delete from clients$$, 'admin can delete a mistaken client');
select t.count_is($$select 1 from leads where outreach_status='Won'$$, 1, 'lead survives client deletion');
select t.ok($$update deals set stage='Negotiation'$$, 'admin can re-open deal');
select t.count_is($$select 1 from leads where id='11111111-1111-1111-1111-111111111111' and outreach_status='Qualified'$$, 1, 'reopened deal sets lead Qualified');

-- ===========================================================================
-- 5. DEACTIVATION TAKES ACCESS AWAY IMMEDIATELY
-- ===========================================================================
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.affects($$update profiles set is_active = false where id = '00000000-0000-0000-0000-0000000000d1'$$, 1, 'admin deactivates Rival');
select t.as_user('00000000-0000-0000-0000-0000000000d1');
select t.count_is($$select 1 from leads$$, 0, 'deactivated user instantly loses all data access');
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.affects($$update profiles set is_active = true where id = '00000000-0000-0000-0000-0000000000d1'$$, 1, 'admin reactivates Rival');

-- ===========================================================================
-- 6. GRANT / HARDENING AUDIT (what a hosted Supabase project must also satisfy)
-- ===========================================================================
select t.as_db();
select t.count_is($$select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind in ('r','v','m','p') and has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE')$$, 0, 'anon has no privileges on any public table');
select t.count_is($$select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE')$$, 0, 'anon can execute no public function');
select t.count_is($$select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prorettype = 'trigger'::regtype and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'))$$, 0, 'no API role can execute trigger functions');
select t.count_is($$select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%')$$, 0, 'every public function pins search_path');
select t.count_is($$select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prosecdef and not exists (select 1 from unnest(p.proconfig) c where c = 'search_path=""')$$, 0, 'every SECURITY DEFINER function uses an empty search_path');
select t.count_is($$select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity$$, 0, 'RLS is enabled on every public table');
select t.count_is($$select 1 from storage.buckets where id = 'prospect-reports' and not public$$, 1, 'prospect-reports bucket exists and is private');
select t.count_is($$select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'prospect reports:%'$$, 4, 'four storage policies installed');
select t.count_is($$select 1 from information_schema.triggers where event_object_schema = 'auth' and event_object_table = 'users' and trigger_name in ('on_auth_user_created','on_auth_user_email_changed')$$, 2, 'auth.users profile triggers installed');

-- ===========================================================================
-- verdict. Raising an error rolls back EVERYTHING above, in psql and in the Supabase SQL editor alike.
-- ===========================================================================
do $verdict$
declare
  passed int; failed int; failures text;
begin
  select count(*) filter (where ok), count(*) filter (where not ok),
         coalesce(string_agg('  FAIL ' || label || coalesce(' [' || detail || ']', ''), E'\n' order by id) filter (where not ok), '')
    into passed, failed, failures
    from t.results;
  raise exception E'RLS TESTS %: % passed, % failed\n%', case when failed = 0 then 'PASSED' else 'FAILED' end, passed, failed, failures;
end
$verdict$;
