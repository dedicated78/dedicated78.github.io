-- Scenario 02 starts where outreach finished: a researched lead that Majeda has called and handed to Mostafa.
-- Built directly in SQL (as the database owner) so the scenario does not depend on any other scenario's data.
-- Ids: a1 = Mehedi (admin), b1 = Majeda (outreach), c1 = Mostafa (business_development).

insert into public.leads (id, business_name, contact_name, phone, email, website, location, niche, priority,
                          recommended_service, main_opportunity, outreach_status, assigned_to, created_by)
values ('11111111-2222-3333-4444-555555555555', 'Demo Roofing Co (Sample)', 'Jane Example', '+1 555 010 0199',
        'jane@demo-roofing.example', 'https://demo-roofing.example', 'Tampa, FL', 'Roofing Contractor', 'High',
        'Local SEO — Google Business Profile optimisation + service-area page build',
        'Win the map pack for "roof repair" and "roof replacement" in Tampa.',
        'Ready to Call', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1');

insert into public.prospect_reports (lead_id, version, raw_markdown, why_this_prospect, main_opportunity, recommended_service,
                                     outreach_angle, talking_points, suggested_opening, questions_to_ask, possible_objections,
                                     call_goal, uploaded_by)
values ('11111111-2222-3333-4444-555555555555', 1,
        E'---\nbusiness_name: Demo Roofing Co (Sample)\n---\n\n# Main Opportunity\n\nWin the map pack.\n',
        'They rank #1 for their own brand but sit outside the map pack for "roof repair Tampa".',
        'Win the map pack for "roof repair" and "roof replacement" in Tampa.',
        'Local SEO — Google Business Profile optimisation + service-area page build',
        'Lead with the visibility gap.',
        '["Competitor X ranks with 31 reviews; you have 86", "Your GBP uses only 2 categories"]'::jsonb,
        '"Hi Jane, it''s Majeda from GrowwithMH — do you have two minutes?"',
        '["How many jobs come from Google right now?"]'::jsonb,
        '[{"objection":"We already have someone doing SEO","response":"Offer a free comparison report."}]'::jsonb,
        'Book a 15-minute call with Mostafa.',
        '00000000-0000-0000-0000-0000000000a1');

insert into public.activities (lead_id, created_by, activity_type, outcome, notes, created_at)
values ('11111111-2222-3333-4444-555555555555', '00000000-0000-0000-0000-0000000000b1', 'Call', 'No Answer', 'Rang out.', now() - interval '2 days'),
       ('11111111-2222-3333-4444-555555555555', '00000000-0000-0000-0000-0000000000b1', 'Call', 'Interested',
        'Spoke with Jane. Wants pricing. Free Wednesday pm.', now() - interval '1 day');

-- The real hand-off RPC, called as Majeda (it reads auth.uid() from the session setting, like PostgREST sets it).
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
select public.hand_off_to_bd('11111111-2222-3333-4444-555555555555', '00000000-0000-0000-0000-0000000000c1',
                             'Owner is interested in Maps visibility. Asked about pricing. Available Wednesday afternoon.', 'Interested');
