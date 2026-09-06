# Phase 2 — Hostinger verification and production architecture

Decisions for Phase 2.1–2.7 and 2.13, from the v1.1 discovery report run on
2026-09-06.

Facts are marked `VERIFIED` (present in the report), `INFERRED` (deduced from
verified facts, stated with the reasoning) or `UNVERIFIED` (needs a further
check before anyone relies on it).

---

## 2.1 Hostinger environment verification

### The decisive finding

**`VERIFIED` — the audited account is Hostinger _shared web hosting_, not a
VPS.** Four independent markers agree:

| Marker     | Value                                          | What it means                              |
| ---------- | ---------------------------------------------- | ------------------------------------------ |
| hostname   | `in-mum2-web2218.main-hosting.eu`              | Hostinger's shared web fleet               |
| home       | `/home/u563778500`                             | the `uNNNNNNNNN` shared-hosting convention |
| root       | `no`                                           | no package installation, no services       |
| web server | `/usr/local/lsws` (LiteSpeed), no nginx/apache | LiteSpeed + PHP is the shared stack        |

The account is real and healthy. It is simply a **PHP hosting product**, and the
platform is a **Node/TypeScript application**.

### What is present

`VERIFIED`: git 2.47.3, PHP 8.3.33, Composer 2.9.8, MariaDB client 11.8.8,
sqlite3 3.34.1, curl, wget, OpenSSL 3.5.1, `nohup`. Outbound HTTPS works
(github.com 200, npm 200, ghcr.io 301). Egress IP `145.79.58.153`.

Seven domains are configured, including `growwithmh.com`,
`agents.growwithmh.com`, `demo.growwithmh.com` and — already reserved —
**`geogrid.growwithmh.com`**.

### What is absent

`VERIFIED`, and each line is individually disqualifying for this application:

| Requirement                       | Status            |
| --------------------------------- | ----------------- |
| Node.js                           | **not installed** |
| npm / pnpm / yarn / corepack      | **not installed** |
| Docker / Compose / Podman         | **not installed** |
| systemd                           | **not available** |
| PM2 / supervisord / screen / tmux | **not installed** |
| `crontab` binary                  | **not installed** |
| PostgreSQL (client or server)     | **not installed** |
| python3, gcc, make                | **not installed** |
| root                              | **no**            |

`INFERRED`: without root there is no way to install any of these system-wide.
A Node runtime could be unpacked into `$HOME` from a prebuilt tarball (no
compiler needed), but that solves the smallest part of the problem.

### The RAM figure is not this account's RAM

The report shows `ram_total 514310 MB` and 64 cores on an AMD EPYC 9355P.

**`VERIFIED`: that is the whole physical machine, shared with every other tenant
on `web2218`.** `cgroup_memory_limit: not readable` means this account's actual
allowance is invisible from inside.

**The v1.1 script's `RAM suitability: GOOD` verdict was therefore wrong**, and
so was `External PostgreSQL viable: YES` — a `refused/unreachable` probe cannot
distinguish "nothing is listening" from "the network dropped it", because bash's
`/dev/tcp` does not surface the errno. Both heuristics have been corrected in
**v1.2**: RAM reports `UNKNOWN` whenever the per-account cap is unreadable, and
external Postgres reports `UNVERIFIED` unless a connection actually completes.

`INFERRED`: Hostinger shared plans allocate on the order of 1–3 GB with capped
entry processes and CPU. The container build peaks near 4 GB (`.npmrc` sets
`--max-old-space-size=4096`). Even with a Node binary in `$HOME`, the build
would likely be killed.

### Verdict

**`VERIFIED`: the current application cannot run on this Hostinger plan.** Not
because of the Cloudflare dependency — because there is no Node runtime, no way
to install one system-wide, no process supervisor, no cron, and no way to keep a
listener alive.

**This does not mean leaving Hostinger.** Hostinger sells KVM VPS plans that
give root, systemd, Docker and full port control. The target stays Hostinger;
the **plan** has to change.

---

## 2.2 Final Cloudflare dependency classification

Classified against a Hostinger VPS target.

| Primitive                                                                      | Used for                                                     | Guarantees relied on                                                                                                                           | Classification                                                                                                                  |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Workers runtime** (`workerd`)                                                | the whole server                                             | request isolation, `cloudflare:workers` env                                                                                                    | **RUN THROUGH COMPATIBILITY RUNTIME** — `workerd` runs under Docker on a VPS today; this is what the current image already does |
| **Workflows** (`SiteAuditWorkflow`, `RankCheckWorkflow`)                       | audits, rank checks                                          | durable step memoisation (`step.do`), `step.sleep`, per-step retry with exponential backoff, `NonRetryableError`, resumability across restarts | **REPLACE** (no local equivalent)                                                                                               |
| **Durable Objects** (`OnboardingChatAgent`, `SamChatAgent`, `AuditScratchpad`) | chat sessions, crawl scratchpad                              | single-threaded per-instance concurrency, embedded SQLite, `blockConcurrencyWhile`, alarms                                                     | **REPLACE** (no local equivalent)                                                                                               |
| **D1**                                                                         | primary database                                             | SQLite over the Workers binding                                                                                                                | **REPLACE** with Postgres (see 2.4)                                                                                             |
| **KV**                                                                         | audit progress, SERP locations, rate limits, provider status | TTL key/value                                                                                                                                  | **REPLACE** with Redis or Postgres                                                                                              |
| **R2**                                                                         | DataForSEO response cache, audit artefacts                   | object storage with TTL metadata                                                                                                               | **REPLACE** with filesystem or S3-compatible storage                                                                            |
| **Hyperdrive**                                                                 | Postgres access                                              | connection pooling from Workers                                                                                                                | **NOT REQUIRED** on a VPS — connect directly                                                                                    |
| **Cron triggers**                                                              | rank checks, audit reconcile, OAuth GC                       | scheduled invocation                                                                                                                           | **REPLACE** with system cron or a timer (see 2.5)                                                                               |

Workflows and Durable Objects are the hard part. `miniflare` emulates them well
enough for local development, but it is a development emulator and is not a
supported production runtime for durable execution.

---

## 2.3 Production architecture decision

### Options

**A. Current container/workerd stack on a Hostinger VPS.**
Runs the existing image essentially unchanged. Workflows and DOs run under
`miniflare` emulation with state in a Docker volume.
_For:_ smallest change; ships now; every Phase 2 control already works.
_Against:_ durable execution depends on a development emulator; a container
restart mid-audit has weaker guarantees than real Workflows.

**B. Native Node runtime.**
Strip the Workers runtime; rebuild jobs on BullMQ/pg-boss, DOs on Postgres rows
plus advisory locks, KV/R2 on Redis and the filesystem.
_For:_ ordinary, portable, well-understood operations.
_Against:_ **this is the major rewrite** — it touches every workflow, both chat
agents, the audit scratchpad and every `env.*` binding.

**C. Hybrid — Hostinger VPS plus selected managed services.**
The app on the VPS; Postgres either local or managed; object cache on disk.
_For:_ removes the pieces most painful to self-host.
_Against:_ more moving parts and another vendor.

### Recommendation

**Adopt A now on a Hostinger VPS; treat B as a separate, approved project.**

The reasoning is sequencing, not preference. Option A is the only path that puts
a working, secured, cost-accounted platform in front of beta customers in the
near term, and everything Phase 2 built — MCP authentication, the spend guard,
the usage ledger, the audit log, the role model — is runtime-independent and
carries over to B unchanged. Doing B first spends weeks rebuilding infrastructure
before a single Bangladeshi customer has logged in, and does it without the usage
data that should inform how the job system is designed.

The honest caveat: under A, audits and rank checks depend on emulated durable
execution. For single-operator and early-beta volume that is an acceptable risk,
provided audits are re-runnable — they are. It stops being acceptable at
commercial scale, which is when B gets scheduled.

**Required plan:** Hostinger **KVM VPS**, minimum **4 GB RAM** (`INFERRED` from
the 4 GB build ceiling; 8 GB gives headroom for Postgres alongside), root access,
Docker.

---

## 2.4 Database architecture

**Decision: PostgreSQL, direct connection, no Hyperdrive.**

`VERIFIED`: the shared host offers MariaDB only. **MariaDB is not adopted.** The
repository already carries a complete, parity-tested Postgres schema (22
migrations); MariaDB would mean a third dialect, a third migration set, and
rewriting the parity guarantee — for a database the application has never
targeted.

`VERIFIED`: `src/db/provider.ts` reaches Postgres **only** through a Hyperdrive
binding, with no direct-connection fallback. On a VPS Hyperdrive does not exist,
so a small adapter is required — the "smallest clean direct PostgreSQL
connection adapter" Phase 2.4 anticipated.

Scope, deliberately minimal:

1. `getPostgresConnectionString()` accepts a direct `DATABASE_URL` when no
   Hyperdrive binding is present.
2. `postgres-js` pool sized for the VPS.
3. `DATABASE_PROVIDER=postgres` in production.

The service and repository layers, all tenant scoping, and every migration are
untouched. This is a connection-string change, not a data-layer change.

`UNVERIFIED`: whether outbound 5432 is permitted — the probe was inconclusive.
Irrelevant if Postgres runs on the same VPS, which is the recommendation.

D1/SQLite remains the development default.

---

## 2.5 Scheduler and background execution

`VERIFIED`: no `crontab` binary and no systemd on shared hosting. On a VPS both
exist, so this resolves with the plan change.

**Under Architecture A:**

- **Cron** — a host `crontab` entry every 5 minutes calls an authenticated
  internal endpoint that dispatches the same work as the Workers `scheduled`
  handler. The handler already exists and is unchanged; only the trigger moves.
- **Overlap protection** — the endpoint takes a Postgres advisory lock before
  dispatching. Scheduled runs must never execute twice concurrently, and cron
  gives no such guarantee on its own.
- **Workflows** — unchanged under `workerd`, with state on a persistent volume.
- **Durable Objects** — unchanged, same volume.

This closes Phase 1 risk **R3** (Docker mode never fires scheduled rank checks
or the stale-audit watchdog), which has been open since Phase 1.

**Under Architecture B** this becomes a real job queue (BullMQ on Redis, or
pg-boss on Postgres) with retries, backoff and idempotency keys reimplemented —
part of the rewrite scope, not this phase.

---

## 2.7 Deployment architecture

Build once, ship an immutable artefact, run a thin runtime — replacing the
current boot-time build, which is the 4 GB spike.

```
git push
  → CI builds the image (pnpm install → vite build → tsc)
  → image pushed to a registry
  → VPS pulls the tag and restarts
  → container starts already built
```

On the VPS:

| Concern             | Choice                                                   |
| ------------------- | -------------------------------------------------------- |
| Runtime             | Docker Compose                                           |
| Reverse proxy       | Nginx or Caddy, TLS via Let's Encrypt                    |
| App binding         | `127.0.0.1:3001`, never `0.0.0.0`                        |
| Database            | PostgreSQL on the same host                              |
| Persistence         | Docker volumes for Postgres and app state                |
| Process supervision | Docker `restart: unless-stopped`                         |
| Scheduler           | host cron → internal endpoint (2.5)                      |
| Health              | `/api/health`, already implemented                       |
| Rollback            | re-pull the previous image tag                           |
| Backups             | nightly `pg_dump` plus volume archive, retained off-host |

`geogrid.growwithmh.com` is already configured and is the natural hostname for
the beta.

**Not yet decided:** whether the VPS also serves the existing WordPress/PHP
sites. Keeping them on shared hosting is simpler and isolates blast radius.

---

## 2.13 Role and authorization model — IMPLEMENTED

Two levels, deliberately not merged.

**Platform** (`platform_roles`, one row per user, independent of any workspace):

| Role           | Capabilities                                                                            |
| -------------- | --------------------------------------------------------------------------------------- |
| Platform Admin | view organizations, view costs, manage spend controls, verify payments                  |
| Platform Owner | all of the above, plus manage plans, grant credits, suspend organizations, manage staff |

**Organization** (`member.role`, cumulative up the ranks):

| Role          | Capabilities                                                               |
| ------------- | -------------------------------------------------------------------------- |
| Client Viewer | `project:read`, `report:read` — nothing else                               |
| Member        | + `report:create`, `research:run`, `keyword:write`, `member:read`          |
| Admin         | + `project:manage`, `integration:manage`, `member:manage`, `apikey:manage` |
| Owner         | + `organization:manage`, `billing:manage`                                  |

### The rule that gives this its shape

**A platform role grants no access to a customer's project data.**

A Platform Admin can see that a workspace spent $18 yesterday and can suspend
it. They cannot open its keyword lists, audits or reports unless they are also a
member. Support impersonation, if it is ever built, must be an explicit,
consented, audited flow — never something that falls out of a role check.
`assertOrganizationCapability` has no platform escape hatch, and a test asserts
its absence.

### Separation of GrowwithMH's own organization

`organization_profiles.kind` is `platform` or `customer` (default `customer`).
It is a classification, never a permission: it keeps internal usage out of
customer revenue and cost figures, and grants nothing on its own.

### Failure direction

Every unknown denies. No membership row, an unrecognised role, an absent
profile: all resolve to the least privilege. `parseOrganizationRole` maps an
unrecognised value to `client_viewer`, **not** to the default `member` — a typo
or a removed role must lose access, not gain it.

### Guards

- Nobody may act on a member at or above their own rank.
- Nobody may grant a role they do not themselves hold — an admin cannot mint an
  owner and inherit billing.
- The last owner cannot be demoted or removed; an ownerless workspace has no
  route back without manual intervention.

Enforcement lives in `src/server/features/platform/services/authorization.ts`;
the shared matrix in `src/shared/roles.ts` lets the UI hide what the server will
refuse. Hiding is never the enforcement.

**Deferred to Phase 3:** wiring these checks into every existing server function.
The model, storage, enforcement primitives and tests are in place; retrofitting
~112 server functions is mechanical work that belongs with the commercial
features that need it.

---

## Open decisions

1. **VPS plan** — 4 GB minimum, 8 GB recommended. Nothing else proceeds without it.
2. **Architecture A now, B later** — needs explicit approval; B is the major rewrite.
3. **Existing PHP sites** — migrate to the VPS or leave on shared hosting.
4. **Beta hostname** — `geogrid.growwithmh.com` is configured and available.
