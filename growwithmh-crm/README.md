# GrowwithMH CRM

A deliberately small internal operating system for one workflow:

> **Mehedi** researches a prospect → uploads a Markdown report → **Majeda** calls from a ready-made brief and logs the outcome → **Mostafa** runs discovery, proposal and close → Won deals become **clients** → Mehedi finishes onboarding.

Not a HubSpot clone. Four screens (Dashboard, Leads, Deals, Clients) plus admin Settings.

## 1. What it does

| Who | Lands on | Does |
|---|---|---|
| Admin (Mehedi) | Admin dashboard | Uploads `.md` research, assigns leads, sees everything that needs attention, manages clients/onboarding and users |
| Outreach (Majeda) | **Today's queue** | Opens a lead → reads the brief → logs calls/messages → schedules follow-ups → hands qualified leads to BD |
| Business Development (Mostafa) | Deals dashboard | Reads the handoff note + research + call history → discovery notes, proposal, value → Won/Lost → converts to client |

Calls, SMS, WhatsApp and email happen **outside** the CRM (Numero etc.). The CRM only tells people what to do and records what happened. No runtime AI, no paid APIs.

## 2. Architecture

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS 4. Compiles to a static `dist/` folder. Hash routing (`/#/leads/…`), so it works on any static host, in the web root or a sub-folder, with no rewrite rules.
- **Backend:** Supabase only — Postgres, Auth (email + password), Storage (private bucket), Row Level Security. No server of your own.
- **Security model:** the browser only holds the public *anon* key. Every permission is enforced in the database (RLS + column-guard triggers + `SECURITY DEFINER` RPCs that re-check roles), not in the UI.
- **Data fetching:** TanStack Query. Dashboards compute from the (small) visible lead/deal lists client-side.

```
src/
  components/    ui primitives, overlays (modal/confirm/toast), FollowUp, CopyButton
  layouts/       app shell, global search, notification bell
  features/      auth · dashboard · leads · reports (research) · activities · deals · clients · settings
  hooks/         today (company tz), filter state, synced forms…
  lib/           supabase client, dates/money, markdown/parser (deterministic), render (sanitised)
  types/         domain types + value vocabularies
supabase/
  migrations/    1 schema · 2 RLS · 3 storage · 4 RPC functions
  tests/         rls_test.sql  (policy/RPC regression test)
  e2e/           local browser E2E harness (isolated, DB rebuilt per scenario)
  seed.sql       optional fictional demo data  (+ seed_cleanup.sql)
docs/            prospect-report-template.md · sample-prospect-report.md · research-prompt.md
```

## 3. Prerequisites

- Node 20+ and npm
- A Supabase project (free tier is enough)
- Supabase CLI *(optional — you can also paste the migration files into the SQL editor)*

## 4. Supabase setup

1. Create a project at supabase.com.
2. **Run the migrations in order** (`supabase/migrations/`):
   - CLI: `supabase link --project-ref <ref>` then `supabase db push`
   - or SQL editor: paste and run `…0001_schema.sql`, `…0002_rls.sql`, `…0003_storage.sql`, `…0004_functions.sql`, in that order.
3. **Authentication → Providers → Email:** keep email/password on. **Turn "Allow new users to sign up" OFF** (Authentication → Sign In / Providers). Users are added by an admin, never self-registered. (Even if left on, a self-registered user is created *inactive* with no data access and cannot make themselves admin.)
4. **Authentication → URL Configuration:** set **Site URL** to where you host the app (e.g. `https://crm.growwithmh.com/`). Add the same URL (and `http://localhost:5173`) to **Redirect URLs**. The app uses password sign-in only, so no email links are involved, but Supabase requires a valid Site URL.
5. **Storage:** the `prospect-reports` bucket is created by migration 3 — private, 2 MB limit, Markdown/plain text only. Nothing to click. Access is governed by storage policies: admin writes, everyone else can read only the files of leads they can open.

## 5. Environment variables

```bash
cp .env.example .env
```

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Project Settings → API → `anon` `public` key |

**Never** put the `service_role` key anywhere in this project. Vite inlines `VITE_*` variables into the public bundle.

## 6. Run locally

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck
npm test             # Markdown parser tests + mutation-safety audit (35 tests)
npm run test:sql     # authorization regression test on a scratch local Postgres (needs a PostgreSQL install)
npm run e2e          # full browser E2E suite against the real migrations (see e2e/README.md)
```

## 7. Creating users and the first admin

**Authorization model:** every new auth user gets a profile that is **inactive** with the least-privileged role (`outreach`). Nobody becomes admin automatically: not the first user, not anyone who sets `admin` in their sign-up metadata. The initial admin is assigned explicitly with SQL, exactly once. After that, only an **active admin** can activate users and change roles, from **Settings → Users**.

### 7.1 Initial admin setup (one time, in this order)

1. Supabase → **Authentication → Users → Add user → Create new user**: Mehedi's email + a strong password, tick **Auto Confirm User**.
2. Supabase → **SQL Editor**, run (replace the email):

   ```sql
   update public.profiles
      set role = 'admin', is_active = true, full_name = 'Mehedi'
    where email = 'mehedi@your-domain.com';

   -- must show exactly one row: role admin, is_active true
   select id, email, role, is_active from public.profiles order by created_at;
   ```

   It must report `UPDATE 1`. If it reports `UPDATE 0`, the profile doesn't exist yet: the migrations were applied after the user was created and the backfill didn't run, or the email is mistyped. Check `select email from auth.users;`.
3. Sign in to the app as Mehedi. You land on the admin dashboard and see **Settings** in the navigation. Until step 2 is done, signing in shows "Your account is waiting for activation" — that is the correct locked state.

The SQL editor runs as the database owner, which is why it can do what the app's admin-only rules forbid for everyone else. Keep it for break-glass use: if the only admin is ever locked out, re-run step 2 for any user.

### 7.2 Majeda and Mostafa

Add each in **Authentication → Users → Add user** (Auto Confirm). They appear in the app under **Settings → Users** as *Awaiting activation*. Signed in as Mehedi: choose the role (**Outreach** for Majeda, **Business Development** for Mostafa) and tick **Active**. Until then they can sign in but see only the "waiting for activation" screen and no data.

Role and active flag are stored only in `public.profiles` and changeable only by an active admin. User metadata (which any signed-in user can edit about themselves), app metadata and JWT claims are never consulted for authorization. Deactivating a user takes effect on their next request. At least one active admin must always exist (the database refuses to demote or deactivate the last one). Forgot a password? Reset it in Supabase → Authentication → Users. Everyone can change their own password from the avatar menu.

### Demo data (optional)

After the three users exist and have roles: paste `supabase/seed.sql` into the SQL editor. It creates five fictional "(Demo)" leads with research, activities, one open deal and one onboarding client, attached to the first active user of each role. Remove it with `supabase/seed_cleanup.sql`.

## 8. Production build and shared-hosting deploy

```bash
npm run build        # type-checks, then writes dist/
npm run preview      # optional: serve dist/ locally
```

Upload the **contents of `dist/`** to your host's web root (or any sub-folder) with FTP / the file manager. That's it: no Node, no rewrite rules, no server config. The `VITE_*` values are baked in at build time, so rebuild if they change.

Because routing uses `#`, links look like `https://crm.example.com/#/leads`. The page is marked `noindex`; the app requires login and RLS protects the data.

## 9. How Markdown prospect reports work

Mehedi researches with Claude/ChatGPT and saves a `.md` file in this format (template: `docs/prospect-report-template.md`, example: `docs/sample-prospect-report.md`, ready-to-paste generation prompt: `docs/research-prompt.md`). Both templates are also downloadable from the upload screen.

```markdown
---
business_name: ABC Roofing
contact_name: John Smith
phone: "+1 555 123 4567"
email: john@example.com
website: https://example.com
location: Tampa, FL
niche: Roofing Contractor
priority: High            # High | Medium | Low
---

# Prospect Summary        # Why This Prospect · Key Findings (bullets) · Main Opportunity
# Recommended Service     # Outreach Angle · Talking Points (list) · Suggested Opening
# Questions To Ask        # Possible Objections (one "## heading" each) · Call Goal · Research Notes
```

**Leads → Upload research** →

1. drop/choose the `.md` (parsed instantly in the browser, deterministic, no AI);
2. review the extracted lead + brief, with warnings for anything missing (no phone/email, no talking points…) and a duplicate-name check;
3. correct anything, pick the outreach owner (defaults to the outreach user);
4. **Create lead** → the original file goes to Storage (`{lead_id}/1-name.md`), the raw Markdown and parsed sections are saved as report **v1**, and the lead is created as *Ready to Call*.

Missing optional fields never block an upload; only the business name is required. Headings are matched case-insensitively with a few aliases; unknown headings are ignored (and listed) but stay in the stored original.

**Versions:** research is never overwritten. Admins can *Upload new version* or *Edit brief* from "View full research"; each creates version N+1. Majeda's brief always shows the newest version; older versions and the original file stay available.

## 10. Role permissions (enforced by RLS)

| | Admin | Outreach | Business Dev |
|---|---|---|---|
| Leads visible | all (incl. archived) | assigned to them | handed to them |
| Create / edit lead details, assign, archive | ✅ | ❌ | ❌ |
| Change lead status, next action, follow-up | ✅ | ✅ | ✅ |
| Handoff note + hand off to BD | ✅ | ✅ (own leads) | ❌ |
| Upload / edit research | ✅ | ❌ (read only) | ❌ (read only) |
| Log activities | ✅ | ✅ | ✅ |
| Edit / delete past activities | ✅ | ❌ immutable | ❌ immutable |
| Deals | all | ❌ | their own: edit, stage, Won/Lost, convert |
| Clients & onboarding | all (edit, delete) | ❌ | read-only for clients from their deals |
| Settings, users | ✅ | ❌ | ❌ |

Every browser UPDATE/DELETE is scoped to one record by primary key and a test fails if that ever changes (`docs/mutation-safety-review.md`). Column-level rules are enforced by triggers (e.g. outreach cannot rename a lead or reassign it, BD cannot reassign a deal). Leads, reports, activities have no delete policy at all: archive instead. `supabase/tests/rls_test.sql` asserts all of this (141 checks, see §13) — run it against a scratch database after changing policies.

## 11. Security notes

- Only the anon key is used in the browser. RLS is enabled on every table; signed-out visitors get nothing.
- New sign-ups are always inactive; no admin is created automatically; the initial admin is assigned explicitly with SQL (§7.1). Roles come only from `profiles`, editable only by an active admin; user/app metadata and JWT claims never influence authorization. A profile's id/email can't be changed through the API. At least one active admin always exists (trigger).
- Every function in `public` pins `search_path`; SECURITY DEFINER functions use an empty one. `anon` has no table privileges and can execute no function; trigger functions are executable by no API role.
- Markdown is untrusted: rendered with `marked` then sanitised with DOMPurify (no scripts, forms, images, iframes, inline styles; links forced to `noopener`).
- The `prospect-reports` bucket is private. Downloads use 60-second signed URLs, authorised by storage policy.
- **Do not store passwords or credentials.** The client access checklist only records *whether* access was granted, and says so on screen.
- Multi-step actions (log activity, hand-off, convert to client, create lead + report) are single database transactions via RPC; the SECURITY DEFINER ones re-check the caller's role.
- Phone/email/notes are business contact data: keep Supabase project access limited to the owners, and use a strong admin password.

## 12. Limits worth knowing

- Notifications are in-app only (bell + dashboard), derived from live data; there is no email/SMS/push.
- Dashboards load all *visible* leads/deals/clients (paged 1,000 at a time). That's ideal for thousands of records; revisit with server-side counts if you reach tens of thousands.
- "Today" and follow-up dates use the company timezone from Settings (default `Asia/Riyadh`).

## 13. Verifying a real hosted project

`docs/hosted-supabase-verification.md` is the step-by-step acceptance checklist (24 steps, each with its expected outcome): project creation, migrations, bucket, the three accounts, a full prospect-to-client run, storage permissions, lockout, sessions and mobile.

Authorization regression test (`supabase/tests/rls_test.sql`, 141 checks): run it **once on an empty scratch project** right after the migrations, before any real user or data exists. It creates fake users, exercises sign-up, bootstrap, lockout, elevation attempts, column guards, RPCs, storage policies and grants, then aborts itself so nothing persists. Paste the file into the SQL editor (or `psql -f`); the expected result is an *error* whose first line reads `RLS TESTS PASSED: 141 passed, 0 failed`.
