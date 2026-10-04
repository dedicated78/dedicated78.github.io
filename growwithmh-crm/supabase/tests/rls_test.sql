-- RLS / RPC regression test. Run ONLY against a scratch database (it rolls back, but creates auth users while it runs):
--   psql "$SCRATCH_DB_URL" -f supabase/tests/rls_test.sql 2>&1 | grep -E "PASS|FAIL"
-- Every line must say PASS. Needs the four migrations applied first.
\set QUIET on
begin;
create schema t; grant usage on schema t to authenticated;
create function t.as_user(u uuid) returns void language plpgsql as $$
begin reset role; perform set_config('request.jwt.claim.sub', coalesce(u::text,''), true); set local role authenticated; end $$;
create function t.as_db() returns void language plpgsql as $$ begin reset role; end $$;
create function t.fails(q text, label text) returns void language plpgsql as $$
begin
  begin execute q; raise notice 'FAIL  % (expected error, got success)', label;
  exception when others then
    if sqlstate = 'P0001' and sqlerrm like 'FAIL%' then raise; end if;
    raise notice 'PASS  % [%]', label, left(sqlerrm, 70);
  end;
end $$;
create function t.ok(q text, label text) returns void language plpgsql as $$
begin
  begin execute q; raise notice 'PASS  %', label;
  exception when others then raise notice 'FAIL  % (%)', label, sqlerrm; end;
end $$;
create function t.count_is(q text, expected int, label text) returns void language plpgsql as $$
declare n int;
begin
  begin execute 'select count(*) from (' || q || ') x' into n;
    if n = expected then raise notice 'PASS  % (%)', label, n; else raise notice 'FAIL  % (got %, expected %)', label, n, expected; end if;
  exception when others then raise notice 'FAIL  % (%)', label, sqlerrm; end;
end $$;
create function t.affects(q text, expected int, label text) returns void language plpgsql as $$
declare n int;
begin
  begin execute q; get diagnostics n = row_count;
    if n = expected then raise notice 'PASS  % (% rows)', label, n; else raise notice 'FAIL  % (got %, expected %)', label, n, expected; end if;
  exception when others then raise notice 'FAIL  % (%)', label, sqlerrm; end;
end $$;
grant usage on schema t to anon;
grant execute on all functions in schema t to authenticated, anon;

-- users: first = admin
insert into auth.users (id, email, raw_user_meta_data) values
 ('00000000-0000-0000-0000-0000000000a1','mehedi@x.com','{"full_name":"Mehedi","role":"admin"}'),
 ('00000000-0000-0000-0000-0000000000b1','majeda@x.com','{"role":"admin"}'),
 ('00000000-0000-0000-0000-0000000000c1','mostafa@x.com','{}'),
 ('00000000-0000-0000-0000-0000000000d1','rival@x.com','{}');
select t.count_is($$select 1 from profiles where role='admin' and is_active$$, 1, 'only first user is active admin (metadata role ignored)');
select t.count_is($$select 1 from profiles where is_active$$, 1, 'other sign-ups start inactive');

select t.as_user('00000000-0000-0000-0000-0000000000b1');
select t.count_is($$select 1 from leads$$, 0, 'inactive user sees no leads');
select t.count_is($$select 1 from profiles$$, 1, 'inactive user sees only own profile');
select t.affects($$update profiles set role='admin', is_active=true where id=auth.uid()$$, 0, 'self-promotion updates 0 rows');

select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.ok($$update profiles set role='outreach', is_active=true, full_name='Majeda' where id='00000000-0000-0000-0000-0000000000b1'$$, 'admin activates majeda');
select t.ok($$update profiles set role='business_development', is_active=true, full_name='Mostafa' where id='00000000-0000-0000-0000-0000000000c1'$$, 'admin activates mostafa');
select t.ok($$update profiles set role='outreach', is_active=true, full_name='Rival' where id='00000000-0000-0000-0000-0000000000d1'$$, 'admin activates rival outreach');
select t.fails($$update profiles set role='outreach' where id='00000000-0000-0000-0000-0000000000a1'$$, 'cannot demote last admin');

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
select t.count_is($$select 1 from leads$$, 2, 'majeda sees only her leads (incl. manual one)');
select t.count_is($$select 1 from prospect_reports$$, 2, 'majeda sees reports of her lead only');
select t.count_is($$select 1 from profiles$$, 4, 'active user sees team profiles');
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
select t.count_is($$select 1 from leads$$, 1, 'mostafa sees handed-off lead only');
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
select t.count_is($$select 1 from leads$$, 1, 'rival sees only own lead');
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
select t.count_is($$select 1 from leads$$, 3, 'admin sees all leads');
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
select t.count_is($$select 1 from leads$$, 0, 'archived lead hidden from outreach');
select t.count_is($$select 1 from storage.objects where bucket_id='prospect-reports'$$, 0, 'archived lead file hidden');
select t.as_user('00000000-0000-0000-0000-0000000000a1');
select t.ok($$delete from clients$$, 'admin can delete a mistaken client');
select t.count_is($$select 1 from leads where outreach_status='Won'$$, 1, 'lead survives client deletion');
select t.ok($$update deals set stage='Negotiation'$$, 'admin can re-open deal');
select t.count_is($$select 1 from leads where id='11111111-1111-1111-1111-111111111111' and outreach_status='Qualified'$$, 1, 'reopened deal sets lead Qualified');
rollback;
