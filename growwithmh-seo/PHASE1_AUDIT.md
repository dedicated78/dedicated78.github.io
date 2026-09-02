# Phase 1 — Functional baseline & architecture audit

Audited 2026-09-02 against baseline commit `3b48fa6` on `claude/growwithmh-file-prep-fyhwej`.
**Zero source changes. Zero paid DataForSEO calls. Phase 2 not started.**

Full report (formatted): https://claude.ai/code/artifact/453c8dc7-9093-4f9c-904e-f2d3f50ce655

---

## 1. Executive summary

The baseline is healthy and more capable than the navigation suggests. It is not a SaaS,
and the reasons are one gap seen three ways: identity, spend, and isolation are all
delegated to a `hosted` mode this deployment does not run.

**Verified working.** Boots on the production runtime, applies 43 migrations, initialises
37 tables, serves 21/21 routes with no page errors or broken assets. GrowwithMH branding
renders in shell, title and manifest. Tests and production build pass before and after.

**What is underneath.** 46 MCP tools, 2 Cloudflare Workflows, 3 Durable Objects, cron
triggers, an R2 response cache, a parallel Postgres schema, and a complete cost-metering
seam. Local SEO and GeoGrid rank grids already work — they have no UI.

**The three findings that shape Phase 2.**

1. **`/mcp` is unauthenticated.** Verified live: an anonymous POST executed a tool as
   `admin@localhost`. Those tools spend real DataForSEO money.
2. **DataForSEO spend is not recorded.** Per-call USD cost is captured in a billing
   envelope, then discarded outside hosted mode.
3. **Multi-tenancy is scaffolded, not wired.** Every table carries `organization_id` or
   `project_id`; `member` is empty and self-host resolves one hardcoded admin.

## 2. Baseline protection

| Check                                | Before                      | After                       |
| ------------------------------------ | --------------------------- | --------------------------- |
| Commit                               | `3b48fa6`                   | `3b48fa6`                   |
| Working tree                         | clean                       | clean                       |
| `pnpm test`                          | 133 files / 1113 tests pass | 133 files / 1113 tests pass |
| `pnpm build` (vite + `tsc --noEmit`) | exit 0                      | exit 0                      |
| Source files changed                 | 0                           | 0                           |

Run as the container does: `selfhost-preflight` → `db:migrate:local` → `vite build` →
`vite preview`, with `AUTH_MODE=local_noauth` and `CLOUDFLARE_INCLUDE_PROCESS_ENV=true`.

`DATAFORSEO_API_KEY` was a deliberately non-authenticating placeholder. One request reached
DataForSEO and was rejected at auth (HTTP 403, unbilled), which usefully proved the error
path. The temporary `.env` was deleted.

Boot: preflight 4 ok / 3 info / 0 fail · 43/43 migrations · `/api/health` all green ·
8/8 static assets · 21/21 routes rendered under a real browser with console + network capture.

## 3. Architecture

One Cloudflare Worker serves SSR, API, MCP and background orchestration. No separate backend.

| Layer     | Technology                                                       | Notes                                                                                        |
| --------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Browser   | React 19, TanStack Router, Tailwind 4 + daisyUI 5                | Entry `src/router.tsx`, shell `src/routes/__root.tsx`                                        |
| State     | TanStack Query + TanStack DB                                     | No Redux/Zustand; server state is the source of truth                                        |
| API       | 112 TanStack Start server functions, 5 raw routes, MCP at `/mcp` | RPC over `POST /_serverFn/<hash>`, not REST                                                  |
| Services  | 16 server feature modules                                        | Service/repository split under `src/server/features/<name>/`                                 |
| Jobs      | 2 Workflows, 3 Durable Objects, 2 crons                          | `SiteAuditWorkflow`, `RankCheckWorkflow`; crons `*/5 * * * *`, `17 3 * * *`. No queue broker |
| Data      | D1/SQLite default, Postgres via Hyperdrive                       | Dual schema enforced by `schema-parity.test.ts`; selected by `DATABASE_PROVIDER`             |
| Cache     | R2 object cache, KV                                              | `src/server/lib/r2-cache.ts` — SHA-256 key, soft TTL in metadata                             |
| Providers | DataForSEO, GSC, GA4, OpenRouter, Autumn, PostHog, Loops         | Only DataForSEO required                                                                     |

**Config & secrets.** Environment variables typed in `src/env.d.ts`; read lazily per request
inside the Worker (`lib/dataforseo/core.ts:73`), never module scope, never the database.
No secrets manager, no rotation path.

**Auth.** Three modes behind `src/middleware/ensure-user/resolve.ts`: `local_noauth` (yours —
every request becomes `local-admin`), `cloudflare_access`, `hosted` (Better Auth: password,
Google OAuth, orgs, API keys, Turnstile, email verification — all present, none active here).

**Export/reporting.** Client-side CSV (`papaparse`) plus a Google Sheets clipboard handoff.
No PDF, no scheduled report, no branded client report, no server-side export.

## 4. Module inventory

25 modules, 7 with no navigation entry. No mock or demo data exists anywhere — empty screens
were empty because the database is fresh.

| Module                       | Route                            | Backend                                          | Tables                                                                                 | Jobs                             | Provider              | State               |
| ---------------------------- | -------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------- | -------------------------------- | --------------------- | ------------------- |
| Dashboard                    | `/p/:id`                         | `dashboard/services/DashboardService`            | projects, audits, rank_snapshots                                                       | —                                | indirect              | works               |
| Keyword Research             | `/p/:id/keywords`                | `keywords/services/KeywordResearchService`       | keyword_metrics, saved_keywords                                                        | —                                | DFS Labs + Google Ads | works               |
| Domain Overview              | `/p/:id/domain`                  | `domain/services/DomainService`                  | R2 cached                                                                              | —                                | DFS Labs              | works               |
| Backlinks                    | `/p/:id/backlinks`               | `backlinks/services/BacklinksService`            | backlink_snapshots                                                                     | —                                | DFS Backlinks         | works               |
| Site Audit                   | `/p/:id/audit`                   | `audit/services/AuditService`, `auditReconciler` | audits, audit_pages, audit_issues, audit_lighthouse_results                            | Workflow + DO + KV               | DFS OnPage            | works               |
| Rank Tracking                | `/p/:id/rank-tracking`           | `rank-tracking/services/RankTrackingService`     | rank_tracking_configs/keywords, rank_check_runs, rank_snapshots                        | Workflow, **cron off in Docker** | DFS SERP              | partial             |
| Saved Keywords               | `/p/:id/saved`                   | `keywords/services/research/saved-keywords`      | saved_keywords, saved_keyword_tags(+assignments)                                       | —                                | none                  | works               |
| Brand Lookup (AI visibility) | `/p/:id/brand-lookup`            | `ai-search/services/brandLookup`                 | —                                                                                      | —                                | DFS AI Optimization   | works               |
| Prompt Explorer              | `/p/:id/prompt-explorer`         | `ai-search/services/promptExplorer`              | R2 cached                                                                              | —                                | DFS LLM responses     | works               |
| GSC Insights                 | `/p/:id/search-performance`      | `gsc/services/GscService`                        | gsc_connections                                                                        | —                                | Search Console        | not configured      |
| Google Analytics 4           | MCP + settings                   | `ga4/services/` (9 files)                        | ga4_connections                                                                        | —                                | GA4 Data API          | not configured      |
| **Local SEO**                | **no UI — MCP only**             | `mcp/tools/local-seo-tools`                      | —                                                                                      | —                                | DFS Business Data     | partial             |
| **GeoGrid**                  | **no UI — MCP only**             | `get_local_rank_grid`                            | not persisted                                                                          | —                                | DFS Maps SERP         | partial             |
| Project Context              | `/p/:id/settings/context`        | `project-context/services/ProjectContextService` | project_context_sections, project_competitors, project_key_pages, project_research_log | —                                | none                  | works               |
| Projects / Workspace         | `/projects`                      | `projects/services/ProjectService`               | projects, organization                                                                 | —                                | none                  | works               |
| SAM agent                    | `/p/:id/sam`                     | `sam/SamChatAgent` (DO)                          | sam_sessions                                                                           | DO                               | OpenRouter            | key unset           |
| Onboarding chat              | `/onboarding/chat`               | `onboarding/OnboardingChatAgent` (DO)            | user_onboarding_answers                                                                | DO                               | OpenRouter            | hosted-only         |
| **MCP server (46 tools)**    | `/mcp`                           | `src/server/mcp/`                                | apikey                                                                                 | —                                | all                   | **unauthenticated** |
| Billing                      | `/billing` (404 self-host)       | `server/billing/`                                | billing_customer_status                                                                | —                                | Autumn                | hosted-only         |
| **Cost metering**            | internal                         | `lib/dataforseo/client`, `envelope`              | **no ledger**                                                                          | —                                | Autumn                | **bypassed**        |
| Activation tracking          | internal                         | `features/activation`                            | organization/project_activation_state                                                  | —                                | PostHog               | works               |
| Self-host telemetry          | internal                         | `lib/self-host-telemetry`                        | telemetry_state                                                                        | —                                | PostHog               | disabled            |
| GDPR erasure                 | HMAC endpoint                    | `server/gdpr/storage-erasure`                    | all                                                                                    | —                                | —                     | works               |
| Settings & Integrations      | `/settings`, `/p/:id/settings/*` | `serverFunctions/config,gsc,ga4`                 | gsc_connections, ga4_connections, apikey                                               | —                                | Google                | works               |
| Help & Support               | `/help/*`, `/support`            | —                                                | —                                                                                      | —                                | —                     | upstream branding   |

## 5. DataForSEO integration map

| Question                   | Answer                                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Credentials read where     | Lazily per request inside the Worker — `lib/dataforseo/core.ts:73`. Never module scope, never the DB                                                                  |
| Direct or queued           | **Direct and synchronous** for almost everything; only rank checks and site audits use Workflows                                                                      |
| Caching                    | R2 JSON cache, SHA-256 over sorted params, soft TTL. 12h domain/SERP, 24h keyword research. Backlinks and Labs keyword calls uncached                                 |
| Duplicate calls            | Partial — cache prevents repeats over time; **no in-flight coalescing**, so concurrent identical requests both bill                                                   |
| Cost recorded              | **No.** Per-call USD cost arrives in the envelope and is discarded outside hosted mode (`client.ts:159-164`)                                                          |
| Request/response persisted | Normalised results only (`keyword_metrics`, `rank_snapshots`, `backlink_snapshots`, `audit_*`). Raw payloads live in the R2 cache under TTL. No permanent request log |
| Retries                    | 2 retries, linear backoff, 5xx only, sharing one 60s budget. **Disabled** for billed non-idempotent POSTs (Lighthouse, task_post) so a 5xx cannot double-charge       |
| Errors                     | Typed `AppError` codes, payloads truncated to 1600 chars, no credential echoed. Confirmed live                                                                        |
| Charged-but-failed         | Handled — `DataforseoChargedTaskError` carries cost; malformed unbilled requests become validation errors                                                             |

### Endpoints in use (28 across 7 families)

- **Labs** — `keyword_overview`, `keyword_ideas`, `keyword_suggestions`, `related_keywords`, `ranked_keywords`, `relevant_pages`, `domain_rank_overview`, `serp_competitors`
- **Keywords Data** — `google_ads/search_volume`, `google_ads/keywords_for_keywords`
- **SERP** — `google/organic/live/advanced`, `google/organic/task_post`, `task_get/advanced`, `google/maps/live/advanced`, `google/local_finder/live/advanced`, `google/locations/country`
- **Backlinks** — `summary`, `backlinks`, `referring_domains`, `domain_pages_summary`, `history`
- **Business Data** — `google/my_business_info`, `google/reviews/task_post`, `google/extended_reviews/task_post`, `google/my_business_updates/task_post`, `google/questions_and_answers`, `business_listings/search`, `business_listings/categories`
- **AI Optimization** — `llm_mentions/search`, `aggregated_metrics`, `cross_aggregated_metrics`, `top_pages`, `chat_gpt|claude|gemini|perplexity llm_responses`
- **OnPage** — `lighthouse/live/json`
- **Appendix** — `user_data` (**free** — returns live balance and spend)

> **Build first:** `appendix/user_data` is free and already wired. Surfacing it, plus writing
> the envelope's `costUsd` to a local ledger, gives full spend visibility without touching
> the metering architecture.

## 6. Data model

37 tables · 43 D1 migrations · 21 parallel Postgres migrations (parity-tested).

| Group                  | Tables                                                                                 | Scoped by            |
| ---------------------- | -------------------------------------------------------------------------------------- | -------------------- |
| Identity (Better Auth) | user, session, account, verification, apikey, organization, member, invitation         | —                    |
| Projects               | projects, project_activation_state, organization_activation_state                      | organization_id      |
| Keywords               | keyword_metrics, saved_keywords, saved_keyword_tags, saved_keyword_tag_assignments     | project_id           |
| Rank tracking          | rank_tracking_configs, rank_tracking_keywords, rank_check_runs, rank_snapshots         | project_id           |
| Site audit             | audits, audit_pages, audit_issues, audit_lighthouse_results                            | project_id           |
| Backlinks              | backlink_snapshots                                                                     | project_id           |
| Project context        | project_context_sections, project_competitors, project_key_pages, project_research_log | project_id           |
| Integrations           | gsc_connections, ga4_connections                                                       | project_id           |
| Agents                 | sam_sessions, user_onboarding_answers                                                  | user_id / project_id |
| Billing & ops          | billing_customer_status, telemetry_state, d1_migrations                                | organization_id      |

**Migrations** are Drizzle Kit, forward-only, applied at container start. No down path —
rollback means restoring the volume, so the backup command in `GROWWITHMH.md` is load-bearing.

**Missing for a platform:** cost ledger, credit ledger, subscriptions/plans, audit log,
reports, persisted geogrid runs. Identity tables exist but sit empty (`member` has 0 rows —
`local_noauth` bypasses membership).

## 7. Branding separation

11 files diverge from upstream: 2 added, 9 modified. Everything else is untouched OpenSEO.

**GrowwithMH-owned:** `src/shared/brand.ts`, `GROWWITHMH.md`.
**Modified upstream:** `compose.yaml`, `.env.example`, `README.md`, `public/site.webmanifest`,
`src/routes/__root.tsx`, `Sidebar.tsx`, `AppShell.tsx`, `AppShellParts.tsx`, `AuthPage.tsx`.
**Generated (never hand-edit):** `routeTree.gen.ts`, `worker-configuration.d.ts`, `drizzle/*.sql`.

### Leaks in the running app (9 of 23 routes, measured in-browser)

| Surface                                                | What a user sees                                                                                                                                                                    |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/ai`                                                  | 8× "OpenSEO", `openseo.so`, `mailto:ben@openseo.so`, upstream Discord + GitHub                                                                                                      |
| `/support`                                             | Upstream support email, Discord, GitHub issues — a client would email the wrong company                                                                                             |
| `/mcp`                                                 | Server identity `name: "OpenSEO MCP"`, `title: "OpenSEO"`, `websiteUrl: openseo.so`, icon from openseo.so — **shown in every connected AI client** (`server/mcp/server.ts:131-140`) |
| `/help/dataforseo-api-key`, `/help/openrouter-api-key` | "OpenSEO needs the … secret"                                                                                                                                                        |
| `/` and `/p/:id`                                       | Dashboard MCP card copy + 2 upstream GitHub doc links                                                                                                                               |
| `/p/:id/sam`                                           | "use the OpenSEO MCP with your own agent" (`SamSidebarPanel.tsx:40`)                                                                                                                |
| `/p/:id/search-performance`, `/settings/integrations`  | "…to this OpenSEO deployment"                                                                                                                                                       |
| All favicons + logo                                    | OpenSEO artwork; `transparent-logo.png` is 1.4 MB unoptimised                                                                                                                       |
| Startup console                                        | `--- OpenSEO self-host preflight ---`                                                                                                                                               |

**Must not be removed:** the MIT `LICENSE` (© 2026 Ben Senescu) and its copyright notice are
a legal condition of use. Keep the file, the notice, and a source credit in `README.md` and
`GROWWITHMH.md`. That is _source attribution_ — separate from product branding.

**Safe to rebrand:** UI copy, titles, MCP `serverInfo` and instructions, favicons/logo, help
and support pages, console banners, manifest.

**Do not rename:** the 46 MCP tool names, Durable Object class names and `open-seo-*` storage
paths, D1 database name and ids in `wrangler.jsonc`, package name, telemetry event names.
Renaming breaks installations or orphans the database, and none is user-visible.

## 8. Security findings

| Sev          | Finding                                                                                                                                                                                                                                                                                                                                                                                      | Location                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **CRITICAL** | **`/mcp` requires no authentication.** `local_noauth` resolves every caller to `admin@localhost` with no token, no session, `Access-Control-Allow-Origin: *`. Verified: anonymous request executed `whoami` and returned the admin account. 46 tools behind it, most spending DataForSEO money. Mitigated today only by the loopback binding and your reverse proxy — **never bind 0.0.0.0** | `mcp/transport.ts:179-202`, `server.ts:170-175` |
| **CRITICAL** | **No spend limit, no spend record.** `meterDataforseoCall` skips the credit gate and cost write outside hosted mode. No per-user, per-project or global ceiling. A runaway loop bills until the balance is gone, with no record of what consumed it                                                                                                                                          | `lib/dataforseo/client.ts:159-164`              |
| HIGH         | **No application rate limiting.** Better Auth's 120/min API-key limit is hosted-only. Every expensive endpoint is unbounded                                                                                                                                                                                                                                                                  | —                                               |
| HIGH         | **No audit log.** No table, no code path records who did what                                                                                                                                                                                                                                                                                                                                | —                                               |
| MEDIUM       | **Bad credentials produce an unhelpful error.** Only HTTP 401 maps to `DATAFORSEO_AUTH_FAILED`; DataForSEO answers **403** for a bad Authorization header (confirmed live), so a mistyped key shows "DataForSEO HTTP 403" instead of "check the key is base64 of login:password". You will hit this the first time you paste real credentials. One-line fix                                  | `lib/dataforseo/core.ts:103`                    |
| LOW          | **Secrets handling is sound.** No hardcoded credentials, lazy per-request reads, never stored or logged, payloads truncated with no echo. GSC/GA4 tokens encrypted with `BETTER_AUTH_SECRET`. No rotation path, no secrets manager                                                                                                                                                           | —                                               |

## 9. SaaS-readiness (nothing implemented)

| Capability                          | Verdict | Today                                                                                       | Needed                                                                    |
| ----------------------------------- | ------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Multiple users                      | EXTEND  | Better Auth present, hosted-only                                                            | Self-hostable auth without Autumn coupling                                |
| Organizations / workspaces          | KEEP    | Tables exist; every query org-scoped                                                        | Populate `member`, enforce in resolver                                    |
| Projects                            | KEEP    | Complete, archive/restore                                                                   | Client → project hierarchy                                                |
| Per-tenant isolation                | EXTEND  | Enforced in repository layer                                                                | Tests proving cross-tenant reads fail                                     |
| GrowwithMH-owned DFS credentials    | KEEP    | Already one server-side key — the SaaS shape                                                | Per-tenant attribution                                                    |
| Subscription plans                  | REPLACE | Autumn SaaS, 404s in your mode                                                              | Self-hosted plans or your own provider                                    |
| Token/credit allocation             | REPLACE | Balances live in Autumn, not your DB                                                        | Local balance in your schema                                              |
| Append-only credit ledger           | NEW     | Does not exist in any mode                                                                  | New `credit_transactions` table                                           |
| Cost accounting                     | EXTEND  | Cost captured then discarded                                                                | **Persist it — highest-leverage change in the codebase**                  |
| Usage limits                        | EXTEND  | Gate function exists, bypassed                                                              | Point it at your ledger                                                   |
| Admin controls                      | NEW     | None                                                                                        | Operator console: tenants, balances, spend, kill switch                   |
| Authentication                      | EXTEND  | Full stack present, hosted-gated                                                            | Ungate from Autumn                                                        |
| Authorization                       | EXTEND  | Org-scoped queries; roles unenforced                                                        | Real role checks                                                          |
| Password reset / email verification | KEEP    | Complete via Better Auth + Loops                                                            | Swap Loops for your own sender                                            |
| Secure sessions                     | KEEP    | Better Auth sessions                                                                        | Nothing                                                                   |
| Rate limiting                       | NEW     | None                                                                                        | Per-tenant limits                                                         |
| Audit logging                       | NEW     | None                                                                                        | New `audit_log` table                                                     |
| Postgres instead of SQLite          | KEEP    | **Already built** — parallel schema, 21 migrations, parity-tested, `DATABASE_PROVIDER` flag | Only a Hyperdrive binding, or a small direct-connection adapter for a VPS |

> Postgres is a config flag with a tested schema behind it, not a migration project. The one
> constraint: the Worker reaches Postgres **only** via a Cloudflare Hyperdrive binding, with
> no direct-connection fallback. On a Hostinger VPS: keep D1/SQLite, or add a direct path in
> `src/db/provider.ts`. MariaDB is unsupported and not worth adding — Postgres is done.

## 10. GrowwithMH target gap matrix

| Target area                 | Status     | Reality                                                                                                               |
| --------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| Keyword Overview            | EXISTS     | Labs `keyword_overview`, live in Keyword Research                                                                     |
| Keyword Explorer / Research | EXISTS     | Ideas, suggestions, related, volume, CPC, difficulty, intent                                                          |
| Keyword lists               | EXISTS     | Saved keywords with tags and bulk actions                                                                             |
| Projects                    | EXISTS     | Full lifecycle, org-scoped                                                                                            |
| SERP intelligence           | EXISTS     | Organic, Maps, local finder; live and task modes                                                                      |
| Competitor research         | PARTIAL    | SERP competitors + ranked keywords + stored list. No side-by-side gap report                                          |
| Content strategy            | MISSING    | No clustering, briefs or topical-authority mapping in-product. Bundled agent skills do this via MCP, outside the app  |
| On-page SEO                 | PARTIAL    | Audit checks on-page issues; no per-page optimisation workspace                                                       |
| Technical SEO               | EXISTS     | Own crawler, robots parsing, link graph, Lighthouse                                                                   |
| Site auditing               | EXISTS     | Workflow-driven, resumable, stale-run watchdog                                                                        |
| Local SEO                   | PARTIAL    | **Engine complete, zero UI** — GBP info, reviews, extended reviews, posts, Q&A, categories, listing search (MCP only) |
| GeoGrid                     | PARTIAL    | **Works, MCP only, not persisted.** 3×3 / 5×5, configurable spacing, latitude-aware zoom. No map, no history          |
| AI Search / AEO / GEO       | EXISTS     | Brand Lookup + Prompt Explorer across ChatGPT, Claude, Gemini, Perplexity — ahead of most tools                       |
| Reporting                   | MISSING    | No report builder, PDF, scheduling or white-label client report                                                       |
| Exports                     | PARTIAL    | Client-side CSV + Sheets handoff. No server-side or scheduled export                                                  |
| Usage / cost history        | MISSING    | Not recorded in your mode                                                                                             |
| Subscription / token system | UNSUITABLE | Exists but Autumn-hosted — not usable as your own billing                                                             |

## 11. Risk register

| #   | Risk                                        | Severity | Note                                                                                                                                                        |
| --- | ------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Unauthenticated `/mcp` spending money       | CRITICAL | Mitigated only by loopback binding + your proxy                                                                                                             |
| R2  | No spend ceiling or record                  | CRITICAL | One bug or leak drains the balance silently                                                                                                                 |
| R3  | Cron does not run in Docker                 | HIGH     | Scheduled rank checks and stale-audit watchdog never fire — rank tracking is manual-only                                                                    |
| R4  | Cloudflare-primitive lock-in                | HIGH     | Workflows, DOs, D1, R2, KV, Hyperdrive have no non-Cloudflare equivalents. Leaving Cloudflare means rewriting the job system                                |
| R5  | Boot-time build needs ~4 GB                 | HIGH     | Container builds at start; a 2 GB VPS OOMs                                                                                                                  |
| R6  | Forward-only migrations                     | MEDIUM   | No rollback; volume backup is the only recovery                                                                                                             |
| R7  | Synchronous provider calls                  | MEDIUM   | Most DFS calls block the user request with a 60s ceiling                                                                                                    |
| R8  | No in-flight deduplication                  | MEDIUM   | Concurrent identical requests bill twice                                                                                                                    |
| R9  | Upstream branding in client-facing surfaces | MEDIUM   | A client emailing `ben@openseo.so` from your support page                                                                                                   |
| R10 | `/api/auth/get-session` 404s on every page  | LOW      | Client calls Better Auth unconditionally; route 404s outside hosted mode. One console error per page load — cosmetic, but masks real errors while debugging |
| R11 | 403 misclassified                           | LOW      | Unhelpful credential error; one-line fix                                                                                                                    |
| R12 | 1.4 MB logo, 1.2 MB client chunk            | LOW      | Unoptimised assets                                                                                                                                          |
| R13 | Merge divergence                            | LOW      | 11 files today; every Phase 2 edit widens it — keep changes additive                                                                                        |

On the credit side: zero `TODO`/`FIXME`/`HACK` markers in `src/`, 133 test files covering
1,113 cases, strict TypeScript with no type errors, dense comments on non-obvious decisions.

## 12. Recommended Phase 2 (not started)

| Step | Work                                                                                                                                               | Why this order                                                             |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 2.0  | **Safety & quick fixes** — classify 403 as auth failure, silence the `get-session` 404 outside hosted mode, document the exposure rule prominently | Hours. You are about to paste real credentials                             |
| 2.1  | **Cost ledger** — append-only `api_usage` written from the existing envelope, free `appendix/user_data` balance widget, spend page                 | The seam exists. Until spend is visible, every later decision is guesswork |
| 2.2  | **Spend guardrails** — per-project and global daily ceilings at `meterDataforseoCall`, plus a kill switch                                          | Closes R2 once the ledger can measure it                                   |
| 2.3  | **Authentication** — ungate Better Auth from Autumn, enforce membership, require auth on `/mcp`                                                    | Closes R1. Prerequisite for any second user                                |
| 2.4  | **Scheduler** — external trigger for the cron work Docker never runs                                                                               | Closes R3; makes rank tracking a product not a button                      |
| 2.5  | **Full rebrand** — 9 leaking routes, MCP `serverInfo`, favicons/logo, help + support, preflight banner. Keep the MIT notice                        | Do it once, after structure settles                                        |
| 2.6  | **Local SEO & GeoGrid UI** — surface the existing engine; persist GeoGrid with a map and run history                                               | Your core service line and the largest capability-per-effort win here      |
| 2.7  | **Client reporting** — branded report builder with scheduled delivery                                                                              | The retainer deliverable; build after the data layer is trustworthy        |

**Recommended scope for Phase 2 proper: 2.0 → 2.3.** That turns a single-operator tool into
something you can safely expose and safely spend from, without committing to a billing model.

**Two decisions before Phase 2 starts:**

1. Cloudflare or Hostinger VPS — R4 means the answer changes how jobs, database and cache are
   built. Cheaper to decide now than to unpick later.
2. Internal tool clients receive reports from, or a product clients log into — decides whether
   2.3 needs client-viewer roles.
