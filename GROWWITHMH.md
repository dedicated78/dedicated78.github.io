# GrowwithMH SEO — operator runbook

A GrowwithMH-branded self-host of [OpenSEO](https://github.com/every-app/open-seo)
(MIT). Keyword research, rank tracking, competitor insights, backlinks, site
audits, AI visibility — plus an MCP server so Claude Code can pull the same data
directly into client work.

You pay DataForSEO for data usage and nothing else. No OpenSEO subscription:
the hosted service's margin is a 28% markup on every DataForSEO call, which a
self-host skips entirely.

---

## What was changed from upstream

| Area                                                                  | Change                                                                                                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/shared/brand.ts`                                                 | New. Single source of truth for the product name.                                                                                                      |
| Sidebar, mobile top bar, page `<title>`, setup banners, auth logo alt | Read from `BRAND` instead of a hardcoded `"OpenSEO"`.                                                                                                  |
| `public/site.webmanifest`                                             | `name` / `short_name` set to GrowwithMH.                                                                                                               |
| `compose.yaml`                                                        | Builds from this checkout instead of pulling the upstream GHCR image, so the branding is actually in the running container. Telemetry defaults to off. |
| `.env.example`                                                        | Rewritten as a fill-in-the-blanks template for the Docker/VPS path.                                                                                    |

Deliberately **not** renamed: MCP tool names, Durable Object bindings, package
name, telemetry event names, and the ~190 internal `OpenSEO` string references.
None are user-visible, all of them break on rename, and every one becomes a
merge conflict the next time you pull upstream. Rebrand by editing
`src/shared/brand.ts`, not by find-and-replace.

To swap the logo, replace the files in `public/` (`transparent-logo.png`,
`favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`,
`android-chrome-192x192.png`, `android-chrome-512x512.png`) keeping the same
filenames. No code change needed.

---

## Step 1 — DataForSEO credentials

1. Sign up at [DataForSEO](https://app.dataforseo.com/api-access).
2. Click **Send by email** on the API Access page.
3. Copy the longer **Base64** credential — that is `email:password` base64-encoded.

Generating it yourself instead:

```sh
printf '%s' 'you@example.com:your-api-password' | base64
```

New accounts get $1 of free credit; the minimum top-up is $50. Budget it per
client, not per month — every call is metered.

---

## Phase 2 — security settings you must set

Two settings changed in Phase 2 and a production deployment will not work
without them.

**`DEPLOYMENT_MODE`** — `production` (default) or `development`.
`AUTH_MODE=local_noauth` gives every caller full admin access with no
credential. The app now refuses to start in that mode unless the deployment
declares itself `development`, so a forgotten setting fails closed instead of
booting wide open. `compose.yaml` sets `development` by default because Docker
self-hosting _is_ the no-auth mode; change it only alongside real auth.

**`MCP_AUTH_TOKEN`** — bearer token for `/mcp`.
Until Phase 2 that endpoint was completely unauthenticated while serving 46
tools that spend your DataForSEO balance. Now:

| Deployment  | Token set | `/mcp`                                   |
| ----------- | --------- | ---------------------------------------- |
| any         | yes       | requires `Authorization: Bearer <token>` |
| development | no        | open (private machine only)              |
| production  | no        | refused with 503                         |

```sh
openssl rand -hex 32   # put the result in MCP_AUTH_TOKEN
```

Then point your agent at it:

```sh
claude mcp add --transport http --scope user growwithmh https://your-host/mcp \
  --header "Authorization: Bearer $MCP_AUTH_TOKEN"
```

## Spend controls

Provider cost is now recorded for every call in the `api_usage` ledger and
visible at **Usage & Cost** in the sidebar. Daily ceilings and a kill switch
live in `spend_controls`, enforced centrally before any paid call:

- no row for a scope means no limit (a fresh install never refuses work);
- `enabled = 0` is the kill switch for that scope;
- cached results never consume budget;
- if the limit cannot be read, the call is refused — a cost control fails
  closed.

Scopes stack: global, then workspace, then project. The tightest one wins.

## Step 2 — Run it

```sh
cd growwithmh-seo
cp .env.example .env
# set DATAFORSEO_API_KEY= in .env
docker compose up -d --build
```

First start runs the preflight, applies migrations, then builds the app —
2-5 minutes. Watch it:

```sh
docker compose logs -f
```

Then open `http://localhost:3001`.

Subsequent starts skip the build unless the image or the build-relevant env
changed, so restarts are seconds.

---

## Step 3 — Put it on a VPS (Hostinger)

Docker mode runs with `AUTH_MODE=local_noauth`: **no login screen at all**,
every request is admin. `compose.yaml` binds the port to `127.0.0.1` for exactly
that reason. Never change that to `0.0.0.0` — put auth in front instead.

Two options, both free:

**A. Cloudflare Tunnel (recommended).** No open ports, no certificate to renew,
and Cloudflare Access gives you a real login in front of the app.

```sh
cloudflared tunnel create growwithmh-seo
cloudflared tunnel route dns growwithmh-seo seo.growwithmh.com
# ingress: seo.growwithmh.com -> http://localhost:3001
cloudflared tunnel run growwithmh-seo
```

Then add a Cloudflare Access application on `seo.growwithmh.com` restricted to
your email. Set `ALLOWED_HOST=seo.growwithmh.com` in `.env` and
`docker compose up -d` to apply.

**B. Nginx + Certbot.** Standard reverse proxy to `127.0.0.1:3001`. Add HTTP
basic auth (`auth_basic`) — without it the app is open to anyone who finds the
hostname. `ALLOWED_HOST` must match the domain or every proxied request 403s.

### Sizing

The container runs a Node build at start and needs ~4 GB during it (`.npmrc`
raises the V8 heap to 4096 MB). A 2 GB VPS will OOM mid-build. Either use a
4 GB plan, or add swap:

```sh
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Steady-state memory after boot is far lower; it is the build that spikes.

---

## Step 4 — Connect Claude Code over MCP

This is where the leverage is: the app holds the data, Claude Code runs the
workflow. Once connected you can drive keyword research, competitor gap
analysis, and audits from a prompt instead of the UI.

Setup: <https://openseo.so/docs/mcp>. The bundled agent skills under
`.agents/skills/` (`keyword-research`, `keyword-clustering`, `local-seo`,
`competitor-analysis`, `seo-audit`, `link-prospecting`) are the reusable
workflows — read them before writing your own.

---

## Optional add-ons

| Feature               | Env vars                                                         | Notes                                                                                                  |
| --------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| SAM (in-app AI agent) | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`                         | Hidden while unset. Optional — Claude Code over MCP covers the same ground without the per-token cost. |
| Google Search Console | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET` | Real click/impression/position data. Worth it. `docs/SELF_HOSTING_GOOGLE_SEARCH_CONSOLE.md`.           |
| Google Analytics 4    | see `docs/SELF_HOSTING_GOOGLE_ANALYTICS.md`                      |                                                                                                        |

`BETTER_AUTH_SECRET` encrypts stored OAuth tokens: `openssl rand -base64 48`.

---

## Operations

```sh
docker compose ps                          # health
docker compose logs -f open-seo            # logs
docker compose up -d --force-recreate      # apply .env changes
docker compose up -d --build               # rebuild after code changes
docker compose down                        # stop
curl localhost:3001/api/health             # config + database status
```

Data lives in the `open_seo_data` Docker volume (`/app/.wrangler`, SQLite). Back
it up before upgrades:

```sh
docker run --rm -v growwithmh-seo_open_seo_data:/data -v "$PWD:/backup" \
  alpine tar czf /backup/openseo-data-$(date +%F).tar.gz -C /data .
```

## Pulling upstream updates

```sh
git remote add upstream https://github.com/every-app/open-seo.git   # once
git fetch upstream
git merge upstream/main   # conflicts should be limited to the table above
docker compose up -d --build
```

Keeping the rebrand confined to `brand.ts` plus five call sites is what makes
this a clean merge instead of a fork you stop updating.

---

## Local development

```sh
pnpm install
cp .env.example .env.local   # set DATAFORSEO_API_KEY
pnpm dev                     # http://localhost:3001
pnpm build                   # vite build + tsc --noEmit
pnpm test                    # vitest
```

See `docs/LOCAL_DEVELOPMENT.md`.
