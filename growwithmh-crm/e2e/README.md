# Local end-to-end harness

Drives the **production build** in headless Chromium against the **real migrations** running on a throw-away local Postgres, with PostgREST in front (the same engine as hosted Supabase) and a small shim for the parts of Supabase that aren't plain Postgres (password sign-in and file storage). It exists to prove the app works as each role under real RLS; it is not a replacement for the hosted verification in `docs/hosted-supabase-verification.md`.

```bash
npm run e2e                  # whole suite, one command, no manual steps
E2E_ONLY=02 npm run e2e      # one scenario
E2E_REVERSE=1 npm run e2e    # last-to-first (proves scenarios are order-independent)
npm run test:sql             # authorization regression test (supabase/tests/rls_test.sql) on a scratch database
```

## Isolation rule

**Every scenario starts from a freshly rebuilt database.** Before each scenario `db/reset.sh` drops the database and recreates it from `db/stub.sql` (Supabase stand-ins) → every file in `supabase/migrations/` → `db/users.sql` (Mehedi admin, Majeda outreach, Mostafa business_development; the admin is promoted explicitly) → an optional `fixtures/<scenario-name>.sql`. PostgREST is restarted against the new database and uploaded files are wiped. A scenario that needs earlier work (e.g. a lead already handed to Mostafa) gets it from its own fixture, never from another scenario, so results don't depend on run order or on previous runs.

| Scenario | Starts from | Covers |
|---|---|---|
| `01-research-to-handoff` | empty CRM | admin Markdown upload (corrections, duplicate and bad-file warnings), Majeda's queue, brief, copy, activity logging, handoff |
| `02-deal-to-client` | `fixtures/02-…sql`: a researched lead already handed to Mostafa | deal workflow, stages, Won, convert to client, onboarding and access checklist, global search, archive, client delete |
| `03-admin-settings-and-mobile` | empty CRM | user activation and metadata handling, inactive lockout, settings, manual lead, sparse Markdown, admin handoff, Lost/Reopen, password dialog, mobile layouts |

## What every scenario also asserts

* no unexpected console errors, page errors or failed requests (Google Fonts noise is ignored: sandboxes can't reach it);
* **network mutation audit** — every PATCH/PUT/DELETE the real UI sends must be `id=eq.<one uuid>` (or `id=eq.1` for settings), carry no other filter and request a single-row response; unsafe requests fail the scenario. See `docs/mutation-safety-review.md`.

## Requirements

Linux or macOS with: `node` 20+, `curl`, `psql` plus a PostgreSQL server install (binaries are found automatically, or set `E2E_PG_BIN`), and a Chromium (`E2E_CHROMIUM=/path/to/chrome`; a Playwright chromium under `/opt/pw-browsers` or `~/.cache/ms-playwright` is found automatically). The PostgREST binary (Linux x86-64) is downloaded once into `e2e/.cache`; set `E2E_POSTGREST` to use your own. If nothing answers on `E2E_PG_PORT` (default 54329) a private cluster is created in `E2E_PG_DATA` and stopped again on exit; as root it is run as the `postgres` OS user. Ports 54321 (gateway), 54330 (PostgREST), 4173 (app) must be free (`E2E_GATEWAY_PORT`, `E2E_REST_PORT`, `E2E_APP_PORT`).

Artifacts (screenshots, logs, the built app) go to `e2e/.tmp/` (git-ignored). Screenshots of the last scenario are in `e2e/.tmp/shots/`.
