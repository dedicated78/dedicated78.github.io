# Hostinger Web App — temporary test deployment

Temporary testing infrastructure for a compatibility and product smoke test.
**Not the commercial production architecture.** The VPS/background-runtime work
stays deferred (`PHASE2_ARCHITECTURE.md`).

Goal: find out how much of the application runs in a managed Node environment,
using real deployment evidence instead of speculation.

---

## 1. Repository inspection — what the code actually requires

Read from `package.json`, `vite.config.ts`, `wrangler.jsonc`, `.npmrc`,
`docker-entrypoint.sh`, `src/db/provider.ts` and `dist/server/wrangler.json`.

| Question         | Answer                                                             | Source                 |
| ---------------- | ------------------------------------------------------------------ | ---------------------- |
| Application root | `growwithmh-seo` (the repo root is a GitHub Pages site)            | repo layout            |
| Package manager  | pnpm 10.30.1                                                       | `packageManager`       |
| Node version     | `>=22.0.0 <23` — **added in this change**, was undeclared          | `engines`              |
| Install          | `pnpm install --frozen-lockfile` (dev deps **required**)           | see below              |
| Build            | `pnpm run build` (`vite build && tsc --noEmit`)                    | `scripts.build`        |
| Start            | `pnpm start` — **added in this change**, there was no start script | `scripts.start`        |
| Output directory | `dist/` exists but is **not** statically servable                  | below                  |
| Port             | `PORT` env, honoured by `vite.config.ts`; binds `0.0.0.0`          | `vite.config.ts:12-16` |

### The two findings that decide everything

**There is no plain-Node server.** `dist/server/index.js` is a **Cloudflare
Worker bundle** — `dist/server/wrangler.json` sits beside it declaring Durable
Object, Workflow, D1, KV and R2 bindings. `node dist/server/index.js` cannot run
it. The only production start path is `vite preview`, which loads
`@cloudflare/vite-plugin` and **spawns the native `workerd` binary** as a child
process.

Two consequences:

1. **devDependencies must be installed.** `vite`, `@cloudflare/vite-plugin`,
   `wrangler` and `workerd` are all dev dependencies and all needed at runtime.
   A `--prod` install will not boot.
2. **The platform must permit a native child process.** This is the single
   biggest unknown, and no configuration works around it.

**The build needs roughly 4 GB.** `.npmrc` sets
`node-options=--max-old-space-size=4096` because the ~7,400-module SSR build
OOMs under Node's ~2 GB default. Managed build containers are frequently
smaller. **If the deployment fails, look here first.**

### Storage and database

`.wrangler/state` holds the D1 SQLite database, KV and R2, written at runtime by
miniflare. `pnpm start` applies pending migrations before serving.

**If Hostinger's filesystem is ephemeral, all data resets on every deploy.**
Acceptable for a smoke test; state that plainly rather than discovering it later.

PostgreSQL is not usable here: `src/db/provider.ts` reaches it only through a
Cloudflare Hyperdrive binding, and the direct-connection adapter is deferred.
D1/SQLite is the only option for this test. **No MariaDB, no third dialect.**

---

## 2. Compatibility classification

Treating Hostinger Web App as a generic managed Node host until deployment
evidence says otherwise.

| Subsystem                 | Classification                        | Note                                                 |
| ------------------------- | ------------------------------------- | ---------------------------------------------------- |
| Frontend (React/TanStack) | `EXPECTED TO WORK`                    | static assets + SSR                                  |
| TanStack server functions | `EXPECTED TO WORK`                    | all 112, if workerd runs                             |
| Authentication            | `EXPECTED TO WORK WITH CONFIGURATION` | `local_noauth` **behind the access gate** — see §5   |
| SQLite / D1               | `EXPECTED TO WORK WITH CONFIGURATION` | migrations run at start; **persistence `UNKNOWN`**   |
| PostgreSQL                | `NOT AVAILABLE IN WEB APP TEST`       | needs the deferred Hyperdrive-free adapter           |
| MCP                       | `EXPECTED TO WORK WITH CONFIGURATION` | `MCP_AUTH_TOKEN` required                            |
| DataForSEO                | `EXPECTED TO WORK WITH CONFIGURATION` | **deliberately not configured** for the first deploy |
| R2 cache                  | `EXPECTED TO WORK WITH CONFIGURATION` | miniflare local R2; persistence `UNKNOWN`            |
| KV                        | `EXPECTED TO WORK WITH CONFIGURATION` | backs rate limiting and provider status              |
| Workflows                 | `UNKNOWN UNTIL DEPLOYED`              | miniflare emulation + long-lived process             |
| Durable Objects           | `UNKNOWN UNTIL DEPLOYED`              | same                                                 |
| Cron / scheduler          | `NOT AVAILABLE IN WEB APP TEST`       | `vite preview` never invokes `scheduled`             |
| SiteAuditWorkflow         | `UNKNOWN UNTIL DEPLOYED`              | manual start only                                    |
| RankCheckWorkflow         | `UNKNOWN UNTIL DEPLOYED`              | manual only; **scheduled runs unavailable**          |
| SAM agent                 | `NOT AVAILABLE IN WEB APP TEST`       | no `OPENROUTER_API_KEY`; self-hides                  |
| Onboarding agent          | `NOT AVAILABLE IN WEB APP TEST`       | hosted-auth only                                     |
| GSC / GA4                 | `NOT AVAILABLE IN WEB APP TEST`       | no Google OAuth configured                           |
| Usage ledger              | `EXPECTED TO WORK`                    | writes to D1                                         |
| Spend guard               | `EXPECTED TO WORK`                    | unchanged and un-weakened                            |
| Audit log                 | `EXPECTED TO WORK`                    | writes to D1                                         |
| Rate limiting             | `EXPECTED TO WORK WITH CONFIGURATION` | needs KV                                             |

The scheduler limitation is stated in the preflight output and at
`/api/health`: _"Scheduled execution unavailable in this deployment."_ The
application does not pretend those runs happen.

---

## 3. Compatibility shims added

Two, both small and isolated. **No subsystem was rewritten and nothing was
deleted.**

**`src/server/lib/test-access-gate.ts`** — one shared HTTP Basic password in
front of the whole app, so `local_noauth` is never anonymously reachable on a
public URL. Entirely inert when `TEST_ACCESS_PASSWORD` is unset, so normal
deployments are untouched. It grants nothing and makes nobody an administrator;
it only decides whether a request reaches the app. `/api/health` stays open for
the platform's probe. **Delete this module and its single call site when real
authentication lands.**

**`package.json`** — added `engines.node` and a `start` script. Both were
missing; neither changes application behaviour.

---

## 4. Exact Hostinger Web App settings

```
Repository:
dedicated78/dedicated78.github.io

Branch:
hostinger-webapp-test

Root directory:
growwithmh-seo

Node version:
22 (engines: >=22.0.0 <23)

Package manager:
pnpm

Install command:
pnpm install --frozen-lockfile

Build command:
pnpm run build

Start command:
pnpm start

Output directory:
NOT APPLICABLE — this is a server application, not a static site.
Do not point Hostinger at dist/; it contains a Cloudflare Worker
bundle that cannot be served as static files.

Port:
Automatic via the PORT environment variable.
vite.config.ts reads process.env.PORT; the app binds 0.0.0.0.
Do not hardcode a port.
```

If Hostinger insists on npm rather than pnpm, use
`npm install --legacy-peer-deps` and `npm start` — but pnpm is strongly
preferred because `pnpm-lock.yaml` is the committed lockfile and npm would
resolve a different dependency tree.

### Environment variables

Do not paste real secrets into this file. Placeholders below.

**REQUIRED TO BOOT**

```
AUTH_MODE=local_noauth
DEPLOYMENT_MODE=development
ALLOWED_HOST=<your-hostinger-app-domain>
OPENSEO_TELEMETRY_DISABLED=1
```

`ALLOWED_HOST` must exactly match the hostname Hostinger serves. Vite's preview
server rejects any unrecognised `Host` header, so **every request 403s without
it** — the most likely "it deployed but nothing loads" cause.

`DEPLOYMENT_MODE=development` is required for `local_noauth` to boot at all
(Phase 2 makes it fail closed otherwise). It is safe **only** because of the
access gate below.

**REQUIRED FOR AUTHENTICATION**

```
TEST_ACCESS_PASSWORD=<generate-a-strong-password>
MCP_AUTH_TOKEN=<generate-secure-token>
```

Both are mandatory for a public URL. `TEST_ACCESS_PASSWORD` gates the site;
`MCP_AUTH_TOKEN` keeps `/mcp` protected — a configured token is enforced even in
development mode. Generate with `openssl rand -hex 32`.

**REQUIRED FOR DATABASE**

None. D1/SQLite under `.wrangler/state` is the default; `pnpm start` migrates
before serving.

**OPTIONAL INTEGRATIONS — leave unset for the first deployment**

```
OPENROUTER_API_KEY      SAM agent
GOOGLE_CLIENT_ID        Search Console / Analytics
GOOGLE_CLIENT_SECRET
BETTER_AUTH_SECRET      encrypts stored OAuth tokens
```

**DO NOT CONFIGURE YET**

```
DATAFORSEO_API_KEY      ← leave completely unset for deployment #1
DATABASE_PROVIDER       ← Postgres has no adapter yet
TEAM_DOMAIN / POLICY_AUD
AUTUMN_SECRET_KEY / AUTUMN_WEBHOOK_SECRET
```

Leaving `DATAFORSEO_API_KEY` unset makes billable usage **structurally
impossible**: with no credential there is nothing to authenticate with, and the
UI reports the provider as `NOT CONFIGURED` rather than pretending it works.
Phase 2 spend controls remain fully in place and unweakened.

---

## 5. Authentication for this test — the honest position

None of the three auth modes is a clean fit for a temporary public test:

- **`hosted`** needs Better Auth **plus** Google OAuth, Turnstile, an email
  sender and Autumn (`hasHostedAuthConfig()` checks all of them). That is a lot
  of infrastructure to stand up for a smoke test, and it drags in the billing
  vendor Phase 3 replaces.
- **`cloudflare_access`** needs the deployment to sit behind Cloudflare Access.
- **`local_noauth`** boots immediately but makes every anonymous caller an
  administrator.

So: `local_noauth` **plus a site-wide password gate**. Nobody anonymous reaches
the application, nobody is silently made an administrator, and no auth
infrastructure has to be built for throwaway infrastructure. `/mcp` keeps its own
separate token.

**If `TEST_ACCESS_PASSWORD` is not set, do not deploy this to a public URL.**

---

## 6. First deployment checklist

1. Connect GitHub in hPanel → **Web App**.
2. Select repository `dedicated78/dedicated78.github.io`.
3. Select branch `hostinger-webapp-test`.
4. Set root directory `growwithmh-seo`.
5. Enter the build settings from §4 exactly.
6. Add the REQUIRED TO BOOT and REQUIRED FOR AUTHENTICATION variables. **Add
   nothing from DO NOT CONFIGURE YET.**
7. Deploy.
8. **Read the build log.** Expect `vite build` then `tsc --noEmit`. A kill
   without an error message is an OOM — capture the tail either way.
9. **Read the runtime log.** Expect the migration table, then
   `➜  Local:  http://localhost:<PORT>/`. A `workerd` spawn error here is the
   decisive result: the runtime is unsupported.
10. Open `https://<domain>/api/health` — should return JSON **without** asking
    for a password. Expect `dataforseo: warn / Not set`.
11. Open `https://<domain>/` — must prompt for the access password. Wrong
    password must be refused.
12. Signed in, walk: Dashboard, Projects, Keyword Research, Domain Overview,
    Backlinks, Site Audit, Rank Tracking, Saved Keywords, Brand Lookup, Prompt
    Explorer, Settings, **Usage & Cost**.
13. Confirm the database works: create a project, reload, confirm it persists.
    Then redeploy and check whether it survives — that answers the persistence
    question.
14. Verify anonymous MCP rejection:
    ```sh
    curl -i -X POST https://<domain>/mcp \
      -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'
    ```
    Expect **401**. A 200 is a stop-everything result.
15. Verify zero paid calls: **Usage & Cost** must show `$0.00` and no rows.
    Cross-check your DataForSEO dashboard shows no new spend.

### Verified locally before handover

`pnpm start` was run exactly as Hostinger will: migrations applied (`0044`),
server came up, and with **no** DataForSEO credential —

| Check                                                     | Result                              |
| --------------------------------------------------------- | ----------------------------------- |
| `/api/health` unauthenticated                             | `200`, `dataforseo: warn / Not set` |
| `/` anonymous                                             | `401`                               |
| `/` with the password                                     | `200`                               |
| `/mcp` anonymous                                          | `401`                               |
| Dashboard, Projects, Operations, Settings behind the gate | render, no page errors, no 5xx      |

This does **not** prove Hostinger will run workerd. That is what deployment
answers.

---

## 7. Most likely failure modes

| Symptom                            | Cause                                   | Next step                                                     |
| ---------------------------------- | --------------------------------------- | ------------------------------------------------------------- |
| Build killed, no error             | OOM — the build needs ~4 GB             | Send the build log; a prebuilt-artifact route is the fallback |
| `workerd: not found` / spawn error | Platform forbids native child processes | Decisive: Web App cannot host this runtime                    |
| Every page 403                     | `ALLOWED_HOST` wrong or unset           | Set it to the exact domain                                    |
| `Cannot find package 'vite'`       | Install skipped devDependencies         | Force a full install                                          |
| Boots, data resets each deploy     | Ephemeral filesystem                    | Expected; note it and move on                                 |
| Preflight fails on AUTH_MODE       | `DEPLOYMENT_MODE` not set               | Set `development`                                             |

Send build logs, runtime logs, screenshots and the URL. Fixes will be based on
that evidence, not on speculation.
