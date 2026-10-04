# Mutation safety review

Scope: every write the browser can make to Supabase, and every UPDATE/DELETE inside the database functions and triggers. Goal: no accidental broad mutation. RLS remains the authorization boundary; this is about not depending on it to rescue an unfiltered request.

## Why this matters (verified, not assumed)

On a local PostgREST (the same engine hosted Supabase uses) with an admin token and seeded data:

| Request | Result |
|---|---|
| `PATCH /rest/v1/leads` with no filter | **200: all 5 leads changed** |
| `DELETE /rest/v1/clients` with no filter | **200: the client was deleted** |

An unfiltered UPDATE/DELETE is **not** rejected, and for an admin RLS allows every row. So safety has to come from the code never sending one. (Hosted Supabase may add a `safeupdate` guard, but nothing here relies on it.)

## Result: no unsafe path found, no application code changed

### Direct table mutations from the frontend (7 UPDATE/DELETE, 1 INSERT)

| # | File | Operation | Scope | Who (RLS) | Used by |
|---|---|---|---|---|---|
| 1 | `features/leads/api.ts` `useUpdateLead` | `leads` UPDATE | `.eq('id', id)` `.select('id').single()` | admin all fields; outreach/BD outreach fields only (column-guard trigger) | status change, next step, admin edit, **archive / restore** |
| 2 | `features/deals/api.ts` `useUpdateDeal` | `deals` UPDATE | `.eq('id', id)` `.select('id').single()` | admin; BD own deals | deal form, stage, Won/Lost/Reopen |
| 3 | `features/clients/api.ts` `useUpdateClient` | `clients` UPDATE | `.eq('id', id)` `.select('id').single()` | admin only | client form, onboarding steps |
| 4 | `features/clients/api.ts` `useUpdateAccess` | `client_access` UPDATE | `.eq('id', id)` `.select('id').single()` | admin only | one checklist row (status or note) |
| 5 | `features/clients/api.ts` `useDeleteClient` | `clients` **DELETE** | `.eq('id', id)` `.select('id').single()` | admin only; confirm dialog | "Delete client" (only DELETE in the app) |
| 6 | `features/settings/api.ts` `useUpdateProfile` | `profiles` UPDATE | `.eq('id', id)` `.select().single()` | active admin only; patch type limited to `full_name`, `role`, `is_active` | one user row in Settings |
| 7 | `features/settings/api.ts` `useUpdateSettings` | `app_settings` UPDATE | `.eq('id', 1)` `.select().single()` | admin only; table has `CHECK (id = 1)` | Business settings form |
| 8 | `features/leads/api.ts` `useCreateLead` | `leads` INSERT | n/a (creates one row) | admin only | New lead |

Reads (`select`) are out of scope. There are no `upsert`, `truncate`, raw `fetch`, or `/rest/v1` calls in the frontend, and the shared helpers in `lib/supabase.ts` (`unwrap`, `fetchAll`, `errorMessage`) cannot mutate. **There is no generic update/delete helper**; every mutation is a purpose-specific hook whose `id` parameter is a required `string`.

### Multi-step mutations: already purpose-specific RPCs (kept as they are)

`create_lead_with_report`, `add_report_version`, `log_activity`, `hand_off_to_bd`, `convert_deal_to_client`. Each takes explicit record ids and its inner UPDATEs are all `where id = <that id>` (table below). No new RPC was needed.

### Storage

`upload(path, …, {upsert:false})` writes one new object; `remove([path])` / `remove([uploaded])` delete only the object the same call just uploaded when the follow-up database step fails (explicit single path, never a prefix or empty list). Storage policies still restrict writes to admins.

### Auth

`supabase.auth.updateUser({ password })` changes the signed-in user's own password only.

### Archive (reviewed specifically)

Archive/restore is `useUpdateLead({ id: lead.id, patch: { archived } })` = mutation #1, called from the lead list row and the lead page for one lead after a confirm dialog. It is never bulk. `archived` can only be changed by an admin (column guard) and archived leads are invisible to non-admins (RLS). No DELETE policy exists on leads, so archive is the only way to remove a lead from view.

### Settings / profile changes (reviewed specifically)

Admins can *see* every profile, but each control issues one request for one user: the role select, the Active checkbox and the name field each call `useUpdateProfile({ id: user.id, … })`. There is no "activate all"/bulk path. The admin's own row has role and Active disabled in the UI; the database also refuses to demote or deactivate the last active admin and refuses any API change to a profile's `id`/`email`. Business settings update the single `app_settings` row by `id = 1`.

### Inside the database (migrations)

| Statement | Filter |
|---|---|
| `sync_profile_email` → `update profiles` | `where id = new.id` |
| `refresh_client_access_status` → `update clients` | `where id = cid …` |
| `sync_lead_from_deal` → 3× `update leads` | `where id = new.lead_id …` |
| `add_report_version` → `update leads` | `where id = p_lead_id` |
| `log_activity` → `update deals` | `where id = p_deal_id and lead_id = p_lead_id` |
| `log_activity` → `update leads` | `where id = p_lead_id` |
| `hand_off_to_bd` → `update leads`, `update deals` | `where id = p_lead_id`, `where id = deal_id` |

The only intentionally broad statement in the repo is `supabase/seed_cleanup.sql` (`delete … where business_name like '%(Demo)'`), a manual SQL-editor script for removing demo data; it is never reachable from the app.

## Evidence

1. **Static audit, `src/lib/mutation-audit.test.ts` (16 tests, runs in `npm test`).** It scans all frontend source and fails if any `.update()`/`.delete()` lacks `.eq('id', …)`, `.select()` and `.single()`, uses another filter operator, targets an unreviewed table, appears in an unreviewed file, or if anything uses `upsert`, `truncate`, raw `fetch`, an unreviewed RPC, or a storage `remove` that isn't a single explicit path; it also asserts the shared helpers can't mutate. A second part scans the migrations and fails if any database UPDATE/DELETE lacks `WHERE id = …`. Any new mutation therefore fails the build until it is reviewed and added to the test's expected list. Checked by injecting four violations (a missing filter on leads, a `neq` delete on clients, an unfiltered profile update, and an unfiltered SQL UPDATE): all four fail the test.
2. **Network audit in the browser E2E.** Every PATCH/PUT/DELETE the real UI sent during the three E2E runs was captured and must be `id=eq.<uuid>` (or `id=eq.1` for settings), with no other filter and a single-row response requested. Observed: `leads` ×2, `deals` ×6, `clients` ×2 + DELETE ×1, `client_access` ×3, `profiles` ×2, `app_settings` ×1; **0 unsafe**.
3. **Bad ids fail closed.** For `leads`, `deals`, `clients`, `client_access`, `profiles`, a PATCH with `id=eq.undefined`, `id=eq.` (empty) or `id=eq.null` returns 400 (`22P02 invalid input syntax for type uuid`) and changes nothing. A DELETE with a bad id and `app_settings` with a bad id behave the same.
4. **`.single()` is a second safety net for UPDATE.** A multi-row PATCH sent the way supabase-js sends `.single()` returned 406 `PGRST116 … The result contains 5 rows` and **0 rows were changed** (the statement is rolled back). (For DELETE it applies only when more than one row matches.)
