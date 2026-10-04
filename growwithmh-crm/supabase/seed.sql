-- GrowwithMH CRM — OPTIONAL DEMO DATA (fictional businesses only).
--
-- Prerequisite: create your users first (Supabase → Authentication → Users → Add user) and give them roles in
-- the app's Settings page (the admin itself is assigned with SQL, see README 7.1): one admin, one outreach, one business_development user.
-- The seed attaches the demo records to the first active user of each role (outreach / BD fall back to the admin).
--
-- Run in the Supabase SQL editor. Re-running is safe: it does nothing if demo data already exists.
-- Remove it again with supabase/seed_cleanup.sql.

do $$
declare
  admin_id uuid; outreach_id uuid; bd_id uuid;
  l1 uuid := gen_random_uuid(); l2 uuid := gen_random_uuid(); l3 uuid := gen_random_uuid();
  l4 uuid := gen_random_uuid(); l5 uuid := gen_random_uuid();
  d1 uuid; d2 uuid; c1 uuid; t text;
begin
  if exists (select 1 from public.leads where business_name like '%(Demo)') then
    raise notice 'Demo data already present — nothing to do.';
    return;
  end if;

  select id into admin_id from public.profiles where role = 'admin' and is_active order by created_at limit 1;
  if admin_id is null then raise exception 'Create the first admin first (README §7.1: promote the profile with SQL).'; end if;
  select coalesce((select id from public.profiles where role = 'outreach' and is_active order by created_at limit 1), admin_id) into outreach_id;
  select coalesce((select id from public.profiles where role = 'business_development' and is_active order by created_at limit 1), admin_id) into bd_id;

  insert into public.leads (id, business_name, contact_name, phone, email, website, location, niche, priority, recommended_service, main_opportunity, outreach_status, assigned_to, bd_assigned_to, created_by, next_action, follow_up_date, handoff_note) values
   (l1, 'Harbor Roofing Co (Demo)',   'Alex Demo',  '+1 555 010 0101', 'alex@harbor-roofing.example',  'https://harbor-roofing.example',  'Tampa, FL',   'Roofing Contractor', 'High',   'Local SEO', 'Outside the map pack for "roof repair Tampa" despite 90+ reviews.', 'Ready to Call', outreach_id, null, admin_id, null, null, null),
   (l2, 'Bright Spark Electric (Demo)', 'Sam Sample', '+1 555 010 0102', 'sam@brightspark.example',     'https://brightspark.example',     'Austin, TX',  'Electrician',        'Medium', 'Google Business Profile optimisation', 'GBP has one category and no service areas.', 'Follow-up', outreach_id, null, admin_id, 'Send the gap report', current_date - 2, null),
   (l3, 'Summit HVAC (Demo)',         'Pat Placeholder', '+1 555 010 0103', null,                      'https://summit-hvac.example',     'Denver, CO',  'HVAC',               'Low',    'Local SEO', 'Single generic services page; no city pages.', 'Attempted', outreach_id, null, admin_id, 'Call again', current_date, null),
   (l4, 'Keystone Concrete (Demo)',   'Jo Fictional', '+1 555 010 0104', 'jo@keystone.example',        'https://keystone-concrete.example','Orlando, FL', 'Concrete Contractor','High',   'Local SEO + website', 'Strong photos, weak site speed and no review requests.', 'Qualified', outreach_id, bd_id, admin_id, null, null, 'Owner wants more commercial jobs. Asked about pricing; free Thursday morning.'),
   (l5, 'Evergreen Landscaping (Demo)', 'Kim Mockup', '+1 555 010 0105', 'kim@evergreen.example',      'https://evergreen-landscaping.example','Portland, OR','Landscaper',     'Medium', 'Local SEO', 'Won the deal — onboarding in progress.', 'Won', outreach_id, bd_id, admin_id, null, null, 'Signed after the second call.');


  -- demo research (v1) for every lead
  insert into public.prospect_reports (lead_id, version, raw_markdown, research_summary, why_this_prospect, key_findings, main_opportunity, recommended_service, outreach_angle, talking_points, suggested_opening, questions_to_ask, possible_objections, call_goal, research_notes, uploaded_by)
  select l.id, 1,
    '---' || E'\n' || 'business_name: ' || l.business_name || E'\n' || '---' || E'\n\n# Main Opportunity\n\n' || l.main_opportunity || E'\n',
    'Demo research summary for ' || l.business_name || '.',
    'Fictional example: good reputation, weak map-pack visibility.',
    '["Few GBP categories", "No service-area pages", "Reviews do not mention city or service"]'::jsonb,
    l.main_opportunity, l.recommended_service,
    'Lead with the visibility gap versus better-ranked competitors.',
    '["Competitors with fewer reviews outrank you on Maps", "Your profile uses only one category", "Pages built now rank before peak season"]'::jsonb,
    '"Hi, it''s the GrowwithMH team — I noticed your reviews are stronger than the businesses showing up first on Google Maps. Do you have two minutes?"',
    '["How many jobs come from Google today?", "Have you worked with an SEO company before?"]'::jsonb,
    '[{"objection":"We already have someone doing SEO","response":"Ask what they have said about Maps rankings and offer a free comparison report."},{"objection":"We are not interested","response":"Acknowledge it, ask whether timing or the idea is the issue, offer to email a one-page report."}]'::jsonb,
    'Book a 15-minute call with Business Development, or get permission to send the gap report.',
    'DEMO DATA — fictional business.', admin_id
  from public.leads l where l.business_name like '%(Demo)';

  insert into public.activities (lead_id, created_by, activity_type, outcome, notes, next_action, follow_up_date, created_at) values
   (l2, outreach_id, 'Call',  'No Answer', 'Rang out, no voicemail.', 'Call again', current_date - 4, now() - interval '4 days'),
   (l2, outreach_id, 'Call',  'Send Information', 'Spoke with Sam. Asked us to email the gap report.', 'Send the gap report', current_date - 2, now() - interval '3 days'),
   (l3, outreach_id, 'Call',  'Voicemail', 'Left a short voicemail.', 'Call again', current_date, now() - interval '1 day'),
   (l4, outreach_id, 'Call',  'Decision Maker Reached', 'Spoke with Jo, owner. Interested in commercial work.', 'Book a meeting', current_date - 6, now() - interval '6 days'),
   (l4, outreach_id, 'Email', 'Sent', 'Sent the one-page report.', null, null, now() - interval '5 days'),
   (l4, outreach_id, 'Call',  'Meeting Booked', 'Booked Thursday 10:00 with Business Development.', null, null, now() - interval '4 days'),
   (l5, outreach_id, 'Call',  'Interested', 'Wants pricing.', null, null, now() - interval '20 days');

  -- open deal for Keystone, won deal + client for Evergreen
  insert into public.deals (lead_id, assigned_to, stage, estimated_value, billing_type, discovery_notes, pain_points, services_discussed, decision_maker, proposal_status, next_action, follow_up_date, meeting_date)
  values (l4, bd_id, 'Discovery', 1800, 'Monthly', 'Wants more commercial jobs in Orlando.', 'Site is slow; no review process.', '["Local SEO", "Website speed fixes"]'::jsonb, 'Jo Fictional', 'Not Started', 'Send proposal', current_date + 2, now() + interval '2 days')
  returning id into d1;

  insert into public.deals (lead_id, assigned_to, stage, estimated_value, billing_type, decision_maker, proposal_status, won_at)
  values (l5, bd_id, 'Won', 1200, 'Monthly', 'Kim Mockup', 'Accepted', now() - interval '10 days')
  returning id into d2;

  insert into public.clients (lead_id, deal_id, business_name, contact_name, phone, email, website, service, agreed_price, billing_type, start_date, payment_status, onboarding_status, notes, created_by)
  values (l5, d2, 'Evergreen Landscaping (Demo)', 'Kim Mockup', '+1 555 010 0105', 'kim@evergreen.example', 'https://evergreen-landscaping.example', 'Local SEO', 1200, 'Monthly', current_date + 5, 'Paid', 'Access Pending', 'DEMO DATA — waiting on GBP manager invite.', admin_id)
  returning id into c1;

  foreach t in array array['Google Business Profile','Website / CMS','Google Search Console','Google Analytics','Business Information','Branding / Logo','Business Photos','Social Profiles','Previous SEO Reports','Other'] loop
    insert into public.client_access (client_id, access_type, status, notes)
    values (c1, t, case t when 'Business Information' then 'Received' when 'Google Business Profile' then 'Requested' when 'Previous SEO Reports' then 'Not Required' else 'Not Requested' end,
            case t when 'Google Business Profile' then 'Invite sent to the shared mailbox' end);
  end loop;

  raise notice 'Demo data created (5 leads, 1 open deal, 1 client). Remove with supabase/seed_cleanup.sql';
end $$;
