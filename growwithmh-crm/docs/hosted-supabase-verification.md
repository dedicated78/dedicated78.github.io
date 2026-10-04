# Hosted Supabase verification checklist

Acceptance test for a **real hosted Supabase project** before anyone uses the CRM for real work. Work top to bottom; every step has an **Expected** result. Stop at the first mismatch and fix it before continuing. Allow about 60–90 minutes.

Use a **fresh, empty Supabase project** for the first run (a throw-away "crm-staging" project is ideal). Nothing in this document touches the SocialPilot app or any production hosting.

## Before you start

You need:

- Supabase dashboard access (project owner).
- Node 20+ and this repo, `cd growwithmh-crm`.
- Three browser sessions that don't share cookies, one per person: a normal window (Mehedi), a private window (Majeda), a second browser or profile (Mostafa). Plus a phone for step 24.
- `curl` for the API probes. Throughout, set these in your shell once you have them (step 1):

  ```bash
  export URL="https://<project-ref>.supabase.co"
  export ANON="<anon public key>"      # Project Settings → API. Never use the service_role key in this document.
  ```

- To get a signed-in user's token for a probe: sign in as that user in the app → browser dev tools → Application → Local Storage → the key `sb-<project-ref>-auth-token` → copy `access_token` into `JWT_MAJEDA` / `JWT_MOSTAFA`. Tokens last 1 hour by default.

Use the sample file `docs/sample-prospect-report.md` (it is the exact production format) or one of your own real research files. Business names containing `(Demo)` are removed by `supabase/seed_cleanup.sql`; anything else you create here, delete in the final cleanup.

Conventions: **SQL** means the Supabase *SQL Editor* (runs as the database owner). **App** means the deployed/dev frontend.

---

## 1. Create the Supabase project

**Do:** supabase.com → New project. Pick a region near the team (Riyadh/Bahrain/Frankfurt are the closest), a strong database password (store it in your password manager). Wait until the project is "Healthy". Copy **Project URL** and **anon public** key from *Project Settings → API*.

**Expected:** Dashboard opens with no setup banners; *Table Editor* shows an empty `public` schema; *Authentication → Users* is empty. You have the URL and anon key. (If *Authentication → Users* already lists users, this is not a fresh project, so use another one.)

## 2. Apply the migrations

**Do:** apply the four files in `supabase/migrations/` in order, **once**.

- CLI: `supabase link --project-ref <ref>` then `supabase db push` and confirm.
- or SQL editor: run `20261004000001_schema.sql`, `…0002_rls.sql`, `…0003_storage.sql`, `…0004_functions.sql` one after another, each as its own run.

**Expected:** every run ends with *Success. No rows returned* (CLI: "Applying migration … done", no errors). Then in SQL:

```sql
select table_name from information_schema.tables
 where table_schema = 'public' and table_type = 'BASE TABLE' order by 1;
-- 8 rows: activities, app_settings, client_access, clients, deals, leads, profiles, prospect_reports

select count(*) from pg_policies where schemaname = 'public';           -- 26
select count(*) from pg_policies where schemaname = 'storage'
   and tablename = 'objects' and policyname like 'prospect reports:%';  -- 4
select count(*) from public.app_settings;                                -- 1  (GrowwithMH defaults)
select company_name, default_currency, timezone from public.app_settings; -- GrowwithMH | USD | Asia/Riyadh
select trigger_name from information_schema.triggers
 where event_object_schema = 'auth' and event_object_table = 'users' order by 1;
-- on_auth_user_created, on_auth_user_email_changed
```

**If it fails:** an error mentioning *must be owner of table objects* on the storage policies means your role can't create storage policies; run migration 3 from the SQL editor instead of the CLI. Do not re-run a partially applied migration; delete the project and start clean.

### 2b. Authorization regression test (empty project only)

**Do:** paste the whole of `supabase/tests/rls_test.sql` into the SQL editor and run it. Do this **now**, while the project has no users or data.

**Expected:** the run ends with an *error* (that is how the test rolls itself back), and its first line is exactly

```
RLS TESTS PASSED: 141 passed, 0 failed
```

Afterwards `select count(*) from auth.users;` returns `0` and `select count(*) from public.profiles;` returns `0` (nothing persisted). `FAILED` instead of `PASSED` lists each failing check, so stop and report it. If the insert into `auth.users` is rejected by your project's schema version, run the same file against a local Postgres instead and note it in the sign-off table.

## 3. Confirm the storage bucket

**Do:** Dashboard → Storage. Then in SQL: `select id, public, file_size_limit, allowed_mime_types from storage.buckets;`

**Expected:** one bucket `prospect-reports` labelled **Private** (no "Public" badge). SQL returns `prospect-reports | false | 2097152 | {text/markdown,text/plain}`. Storage → Policies lists the four *prospect reports:* policies on `objects` (read, admin insert, admin update, admin delete).

## 4. Create the Mehedi account

**Do:** Authentication → Users → **Add user → Create new user**: Mehedi's real email, a strong password, **Auto Confirm User** ticked. Then in SQL:

```sql
select email, role, is_active from public.profiles;
```

**Expected:** exactly one row for Mehedi's email with `role = outreach` and `is_active = false`: even though he is the first user. **Nobody is admin automatically.** In the app, signing in as Mehedi now (try it) shows "Your account is waiting for activation" and no data or navigation.

## 5. Explicitly assign Mehedi the admin role

**Do:** in SQL (replace the email):

```sql
update public.profiles
   set role = 'admin', is_active = true, full_name = 'Mehedi'
 where email = 'mehedi@your-domain.com';

select email, role, is_active from public.profiles;
```

**Expected:** `UPDATE 1`; the select shows Mehedi as `admin | true`. After a refresh (or "Check again") the app shows the admin dashboard with *Dashboard, Leads, Deals, Clients, Settings*, and **Settings → Users** lists Mehedi with his role dropdown and checkbox disabled ("You"). `UPDATE 0` means a typo in the email: fix it, don't proceed.

## 6. Create the Majeda account

**Do:** Authentication → Users → Add user: Majeda's email + password, Auto Confirm.

**Expected:** Settings → Users (as Mehedi, after a refresh) lists Majeda with an amber **Awaiting activation** badge, role *Outreach*, **Active** unticked.

## 7. Assign Majeda the outreach role and activate

**Do:** as Mehedi, Settings → Users → Majeda: leave role *Outreach*, tick **Active**.

**Expected:** toast "User activated"; badge disappears. SQL: `select email, role, is_active from public.profiles where email = '<majeda>';` → `outreach | true`. Majeda can now sign in (private window) and lands on **Today's queue** reading "You're caught up." Her navigation shows only *Dashboard* and *Leads*.

## 8. Create the Mostafa account

**Do:** Authentication → Users → Add user: Mostafa's email + password, Auto Confirm.

**Expected:** appears in Settings → Users as **Awaiting activation**. Signing in as Mostafa before step 9 shows only the "waiting for activation" screen.

## 9. Assign Mostafa the business_development role and activate

**Do:** as Mehedi, Settings → Users → Mostafa: set role **Business Development**, then tick **Active**. (Role changes toast "Role updated"; activation toasts "User activated".)

**Expected:** SQL shows `business_development | true`. Mostafa signs in (second browser) and lands on the Deals dashboard with *Dashboard, Leads, Deals, Clients* (no Settings); empty state "No qualified opportunities have been handed over yet."

## 10. Configure Auth URLs and sign-up policy

**Do:** Authentication → **URL Configuration**: **Site URL** = the URL where the app will live (e.g. `https://crm.example.com/`); **Redirect URLs** add the same URL and `http://localhost:5173`. Authentication → **Sign In / Providers**: turn **Allow new users to sign up** **OFF**. Keep *Email* provider on.

**Expected:** saved without warnings. Probe that self-registration is closed:

```bash
curl -s -X POST "$URL/auth/v1/signup" -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{"email":"probe@example.com","password":"Probe-Passw0rd-1"}'
```

returns an error with `error_code":"signup_disabled"` (sign-ups not allowed), and no new row appears in Authentication → Users. (If you ever leave sign-ups on, a self-registered user gets an inactive profile and no access, and can never promote themselves: step 22 and the regression test cover it.)

## 11. Configure the frontend environment

**Do:**

```bash
cd growwithmh-crm
cp .env.example .env        # set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (anon key only!)
npm ci
npm run typecheck && npm test && npm run build
npm run preview             # serves dist/ at http://localhost:4173  (or: npm run dev → :5173)
```

**Expected:** typecheck clean; 19 parser tests pass; build writes `dist/`. Opening the served URL shows the **Sign in** form (not the "Supabase isn't configured" card). `grep -r "service_role" dist/` finds nothing. In the browser Network tab, sign-in calls go to your `*.supabase.co` project and send only the anon key as `apikey`. Signing in as Mehedi lands on the admin dashboard. (To deploy later: upload the *contents* of `dist/` to hosting. Not part of this checklist.)

## 12. Upload a real-format Markdown prospect report

**Do:** as Mehedi: Leads → **Upload research** → choose `docs/sample-prospect-report.md` (or a real report). On the review screen, check the extracted values, change nothing (or fix one field), keep **Outreach owner = Majeda**, click **Create lead**.

**Expected:** review screen shows business, contact, phone, email, website, location, niche, priority *High*, recommended service, main opportunity and 4 talking points, with no amber "Check these" box for the sample file. After Create: "Lead created and ready for outreach" with **Open Lead**. Uploading a `.txt` file instead is rejected with a message; a file with missing sections still uploads and shows warnings.

## 13. Verify lead creation

**Do:** click **Open Lead**, then run in SQL:

```sql
select business_name, outreach_status, priority, assigned_to is not null as assigned, bd_assigned_to
  from public.leads;
select version, file_path, length(raw_markdown) > 0 as has_raw, jsonb_array_length(talking_points) as points
  from public.prospect_reports;
select name, bucket_id from storage.objects where bucket_id = 'prospect-reports';
```

**Expected:** lead page shows the outreach brief (why contacting, opportunity, service, angle, highlighted suggested opening, points, questions, collapsible objections, call goal) and *View full research*. SQL: one lead, `Ready to Call`, `High`, assigned true, `bd_assigned_to` null; one report `version 1` with `file_path = <lead_id>/1-sample-prospect-report.md`, `has_raw = true`, `points = 4`; one storage object with exactly that name in `prospect-reports`.

Also create a **second lead** for the visibility tests: Leads → **New lead** → "Unassigned Test Co", leave *Assigned to* **Unassigned**.

## 14. Verify Majeda's visibility restrictions

**Do:** sign in as Majeda (private window). Then:

1. Leads page; 2. open the URL of "Unassigned Test Co" (copy it from Mehedi's browser: `…/#/leads/<id>`); 3. visit `/#/deals`, `/#/clients`, `/#/settings`, `/#/leads/upload`; 4. API probes with her token (`export JWT_MAJEDA=…`):

```bash
H=(-H "apikey: $ANON" -H "Authorization: Bearer $JWT_MAJEDA" -H "Content-Type: application/json" -H "Prefer: return=representation")
curl -s "$URL/rest/v1/leads?select=business_name" "${H[@]}"
curl -s "$URL/rest/v1/deals?select=id"   "${H[@]}"
curl -s "$URL/rest/v1/clients?select=id" "${H[@]}"
curl -s "$URL/rest/v1/prospect_reports?select=lead_id,version" "${H[@]}"
curl -s -X PATCH "$URL/rest/v1/profiles?email=eq.<majeda-email>" "${H[@]}" -d '{"role":"admin"}'
curl -s -X PATCH "$URL/rest/v1/leads?business_name=eq.Demo%20Roofing%20Co%20(Sample)" "${H[@]}" -d '{"business_name":"Hacked"}'
curl -s -X POST  "$URL/rest/v1/leads" "${H[@]}" -d '{"business_name":"Sneaky"}'
```

**Expected:** Leads page lists only the sample lead; the unassigned lead's URL shows **"Lead not found"**; `/deals`, `/clients`, `/settings`, `/leads/upload` bounce back to the dashboard. Probes: leads → only the sample lead; deals → `[]`; clients → `[]`; reports → the 1 row for her lead; role PATCH → `[]` (0 rows) and SQL confirms she is still `outreach`; business_name PATCH → HTTP 403 with *"Your role can only change outreach fields on a lead"*; POST leads → HTTP 403 / `42501` row-level-security violation.

## 15. Log activity

**Do:** as Majeda: open the lead → **Add activity** → Call → Outcome *No Answer* (note the suggested follow-up date and status *Attempted*) → **Save activity**. Then again: Call → *Interested*, notes "Spoke with Jane. Wants pricing. Free Wednesday pm." → Save.

**Expected:** first save: toast "Activity logged", timeline shows *Call · No Answer · Majeda*, status badge becomes **Attempted**, next action "Call again", follow-up tomorrow, and the lead stays in her queue. Second save: status suggestion **Interested**, saved, and the **Hand off to Business Development** dialog opens automatically. SQL: `select activity_type, outcome, created_by is not null as has_author from public.activities order by created_at;` → two rows (Call/No Answer, Call/Interested), `has_author = true`. In the app her past entries have no edit or delete controls; probe `curl -s -X PATCH "$URL/rest/v1/activities?id=not.is.null" "${H[@]}" -d '{"notes":"x"}'` and the same with `-X DELETE` return `[]` (0 rows) and the rows are unchanged in SQL.

## 16. Hand the lead to Mostafa

**Do:** in the handoff dialog: status *Interested* (or *Qualified* / *Meeting Booked*), note "Owner is interested in Maps visibility. Asked about pricing. Available Wednesday afternoon.", business developer **Mostafa** → **Hand off**. (Saving with an empty note must be refused.)

**Expected:** toast "Handed to Mostafa"; lead shows the handoff note, "Business development: Mostafa", and a *Deal* card. SQL:

```sql
select outreach_status, bd_assigned_to is not null as handed, handoff_note is not null as has_note from public.leads where business_name like 'Demo Roofing%';
select stage, assigned_to is not null as has_owner from public.deals;               -- New Qualified Lead | true  (or Meeting Booked if you chose that status)
select activity_type, outcome from public.activities order by created_at desc limit 1; -- Note | Handed to Business Development
```

Majeda's earlier activities are all still present (3 rows total).

## 17. Verify Mostafa's visibility restrictions

**Do:** sign in as Mostafa. Check dashboard, Leads, the deal, the lead URL for "Unassigned Test Co", `/#/settings`. Probes with his token (`export JWT_MOSTAFA=…`, same header array as step 14 but with his token):

```bash
curl -s "$URL/rest/v1/leads?select=business_name" "${H[@]}"
curl -s "$URL/rest/v1/deals?select=stage" "${H[@]}"
curl -s "$URL/rest/v1/clients?select=id" "${H[@]}"
curl -s -X PATCH  "$URL/rest/v1/leads?id=not.is.null" "${H[@]}" -d '{"business_name":"Hacked"}'
curl -s -X DELETE "$URL/rest/v1/activities?id=not.is.null" "${H[@]}"
curl -s -X PATCH  "$URL/rest/v1/profiles?email=eq.<mostafa-email>" "${H[@]}" -d '{"role":"admin"}'
```

**Expected:** dashboard card **New qualified leads = 1** and the handoff note under "New from outreach"; the deal page shows the handoff note, Majeda's full call history and the research brief. Leads lists only the handed-off lead; "Unassigned Test Co" → "Lead not found"; Settings bounces to the dashboard. Probes: leads → 1 row; deals → 1 row; clients → `[]`; business_name PATCH → HTTP 403 (outreach-fields-only message); DELETE → `[]` and the activities still exist in SQL; role PATCH → `[]` and he is still `business_development`.

## 18. Mark the deal Won

**Do:** as Mostafa on the deal: fill *Discovery notes*, *Estimated value* `1500`, *Billing* Monthly, *Services discussed* "Local SEO, GBP optimisation" → **Save changes**; click the stage steps *Discovery → Proposal Sent*; log a Meeting activity (it updates the deal's next action); then **Mark won → Mark as won**.

**Expected:** "Deal saved" and values survive a reload; each stage click toasts "Stage: …"; after Mark won the green "Deal won" banner appears and the **Convert to client** dialog opens by itself. SQL: `select stage, won_at is not null from public.deals;` → `Won | true`; `select outreach_status from public.leads where business_name like 'Demo Roofing%';` → `Won`. (Also try *Mark lost* on a scratch deal: it requires a reason; *Reopen* returns the lead to *Qualified*.)

## 19. Convert to client

**Do:** in the dialog check the prefilled business, contact, phone, email, website, service ("Local SEO, GBP optimisation") and agreed price `1500`; set a start date → **Create client**.

**Expected:** toast "Client created — onboarding can start" and you land on the client page (read-only for Mostafa). SQL:

```sql
select business_name, agreed_price, onboarding_status, payment_status, access_status, lead_id is not null as has_lead, deal_id is not null as has_deal from public.clients;
select count(*) from public.client_access;                       -- 10
select count(*) from public.leads; select count(*) from public.deals;  -- unchanged: lead and deal are preserved
```

Client row: `1500 | New Client | Pending | Not Requested | true | true`. The deal page now shows **Open client** instead of Convert. Converting twice is impossible: `curl -s -X POST "$URL/rest/v1/rpc/convert_deal_to_client" …` for the same deal returns an error "This deal has already been converted".

## 20. Verify onboarding

**Do:** as Mehedi: Clients → open the client. Click the onboarding steps *Payment Pending → Access Pending → Setup → Active*; set *Payment status* Paid and save; in the access checklist set *Google Business Profile* → Requested, then Received, add a note; set the rest to Received or Not Required. Check the dashboard in between.

**Expected:** each onboarding click toasts "Onboarding: …". The **Access** badge is derived automatically: Requested → **Partial** once one item is Received → **Complete** when everything is Received/Not Required. The admin dashboard "Needs attention" shows *Waiting on access* while onboarding isn't Active and access isn't Complete, and the *Clients onboarding / Active clients* counts move accordingly. Notes and statuses persist after reload. As Mostafa the same page is read-only (inputs disabled). The page states passwords are never stored; no field accepts credentials.

## 21. Verify file access and storage permissions

**Do:**

1. As Majeda (assigned) and then Mostafa (handed off): lead → **View full research → Original .md**.
2. As Mehedi: the same, and upload a new version (*Upload new version*) from the drawer.
3. API probes (`<path>` = `<lead_id>/1-sample-prospect-report.md`; `<other>` = a path under the *Unassigned Test Co* lead id; use `JWT_MAJEDA`):

```bash
H=(-H "apikey: $ANON" -H "Authorization: Bearer $JWT_MAJEDA")
curl -s -X POST "$URL/storage/v1/object/sign/prospect-reports/<path>"  "${H[@]}" -H "Content-Type: application/json" -d '{"expiresIn":60}'
curl -s -X POST "$URL/storage/v1/object/sign/prospect-reports/<other>" "${H[@]}" -H "Content-Type: application/json" -d '{"expiresIn":60}'
curl -s -i "$URL/storage/v1/object/public/prospect-reports/<path>"
curl -s -i -X POST "$URL/storage/v1/object/prospect-reports/<lead_id>/9-evil.md" "${H[@]}" -H "Content-Type: text/markdown" --data-binary '# evil'
curl -s -i -X DELETE "$URL/storage/v1/object/prospect-reports/<path>" "${H[@]}"
```

**Expected:** the drawer's *Original .md* downloads the file for Majeda, Mostafa and Mehedi; the content equals the uploaded file byte for byte. A new version creates `…/2-….md` and the drawer's version selector lists v1 and v2 (v1 still downloadable). Probes: first sign call returns a `signedURL`; the second returns *Object not found* (no URL); the public URL returns an error and no file content (bucket is private); the upload is refused (HTTP 403 "new row violates row-level security policy"); the delete leaves the object in place (`select count(*) from storage.objects where bucket_id='prospect-reports';` unchanged). An unauthenticated sign request (`apikey` only, no Bearer user token) is refused too.

## 22. Verify inactive-user lockout

**Do:** as Mehedi: Settings → Users → untick **Active** for Majeda. In Majeda's open window, reload; run the step 14 `leads` / `activities` probes with her *old* token. Then: SQL `update public.profiles set is_active = false where email = '<mehedi-email>';`. Finally re-tick Majeda **Active**.

**Expected:** toast "User deactivated". Majeda's reload shows "Your account is waiting for activation"; her old token (still cryptographically valid) now returns `[]` for leads, activities, reports, deals, clients and `0` storage objects: access dies immediately, not at token expiry. Mehedi's own checkbox and role selector are disabled in Settings, and the SQL statement fails with **`At least one active admin is required`** (the last active admin can't be deactivated or demoted even from the SQL editor). After re-activating Majeda her next load works again. (If you want to see self-registration locked down regardless of the dashboard setting: temporarily enable sign-ups, register a throw-away user through the app's REST signup, confirm their profile is `outreach | false`, and that the user sees only the activation screen; then turn sign-ups off again and delete the user.)

## 23. Verify logout and session handling

**Do:** (a) Sign out via avatar menu → *Sign out*. (b) Press the browser Back button. (c) Reload. (d) Sign in again, reload the page. (e) Open the app in two tabs, sign out in one, then click around in the other. (f) Change password via avatar menu → *Change password* (short password first, then a valid one), sign out and back in with the new one. (g) Optional: leave a tab open for more than an hour, then click around.

**Expected:** (a) lands on the login page and the `sb-…-auth-token` Local Storage entry is gone. (b)/(c) any app URL redirects to login; no CRM data flashes. (d) the session survives a reload, with no login prompt. (e) the second tab returns to the login page on its next navigation or action. (f) a password under 8 characters is refused with a message; a valid one shows "Password updated", and the old password stops working. (g) the session silently refreshes and you are still signed in. A user deactivated in step 22 gets the activation screen, not data, even with a live session.

## 24. Verify mobile behavior

**Do:** on a real phone (or dev tools at 390 × 844) open the app URL and sign in as Majeda, then Mostafa, then Mehedi. Walk: dashboard → a lead → log an activity (use the on-screen keyboard) → hand-off dialog → Leads list with filters → deal page → client page → Settings. As Mehedi upload a `.md` from the phone's file picker.

**Expected:** a bottom tab bar replaces the sidebar; tables become cards (queue, leads, deals, clients); the lead page shows a floating **Log activity** button, and the activity form opens as a bottom sheet with large tap targets (≥ 40 px), no zoom-on-focus and a visible Save button; dialogs scroll internally; sticky save bars sit above the tab bar; there is **no horizontal page scroll** anywhere; the suggested opening and call goal stay readable; copy-phone works and the phone number is a tappable `tel:` link; the file picker upload completes and creates the lead.

---

## Final cleanup (staging only)

Delete the test leads/clients (Mehedi: archive leads; Clients → *Delete* for the test client), remove any scratch users in *Authentication → Users*, and remove the files from the bucket. For a project that will go live, simply delete the whole staging project and repeat steps 1–11 for production; **do not reuse test accounts or passwords**.

## Sign-off

| # | Step | Result (pass / fail / note) | Date · by |
|---|---|---|---|
| 1–3 | Project, migrations (+2b regression test), bucket | | |
| 4–5 | Mehedi account + explicit admin | | |
| 6–9 | Majeda & Mostafa created, roles, activation | | |
| 10–11 | Auth URLs, sign-ups off, frontend env | | |
| 12–13 | Upload and lead creation | | |
| 14–17 | Visibility (Majeda, Mostafa), activity, handoff | | |
| 18–20 | Won, convert, onboarding | | |
| 21 | Storage permissions | | |
| 22–23 | Lockout, logout/session | | |
| 24 | Mobile | | |

Anything that fails: capture the exact response/error text and the SQL result and stop. Do not "fix" it by loosening a policy in the dashboard.
