# SocialPilot AI

A draft-only social media workspace for Instagram, LinkedIn and X. It covers strategy, a content calendar, platform-native drafts with revision history, and analytics whose recommendations each cite the metrics they're based on.

**It never publishes.** There is no publish, schedule, comment, reply, DM, follow or delete path anywhere: not in the UI, the agent prompts, the edge functions or the enabled integration actions. The "Ready" status and planned dates are internal records only. Users copy drafts into their own publishing tool.

## Architecture

| Layer | Implementation |
|---|---|
| Frontend | React + Vite static SPA (hash routing), deployed to GitHub Pages |
| Auth + DB | Supabase email/password auth + PostgreSQL. Every table is owner-scoped by RLS (`owner_id = auth.uid()`) |
| Agents | Supabase Edge Function `agent`: the **Social Strategy Director** (gpt-5-mini, t=0.4) coordinates the **Instagram** (t=0.6), **LinkedIn** (t=0.5) and **X** (t=0.6) specialists (all top_p 0.9). Agents get no tools, only JSON in and out |
| Social data | Edge Function `social` → Composio (`instagram`, `linkedin`, `twitter`). Read-only allowlist plus a write-verb denylist. Credentials stay server-side in a table that has no RLS policies |
| Account deletion | Edge Function `delete-account` revokes Composio connections, then deletes the auth user (all owned rows cascade) |

### Agent flow
- **Strategy:** specialists run in parallel on the brief, the brand profile and read-only imported context. The Director then reconciles their output into one strategy with 8 sections.
- **Calendar:** the Director slots the plan (capped by cadence and the date window). Each specialist then drafts its own channel's slots. Drafts that mention a prohibited topic are flagged `REVIEW:` in their notes.
- **Variants:** a specialist adapts the primary draft to its channel's native format.
- **Findings:** the app builds a numbered evidence ledger (`E1…En`: channel, metric, value, period, retrieval time). Specialists and the Director must cite refs, and any finding without a valid ref is discarded, both server-side and client-side.

### Governance built in
- Analytics show `Not available` for any metric a connection doesn't expose. The only derived number is engagement rate (engagements ÷ impressions, only when both are reported), and it is labeled as calculated.
- Period-over-period change shows only when the imported window fully covers the previous period.
- `draft_versions` is immutable: it has insert and select policies only, and a trigger blocks updates.
- AI output carries provenance (director, specialists, model, time) and a visible label. "· edited" is added after a human edits it.
- Destructive actions (delete item, delete workspace, delete account, disconnect) all require confirmation. Disconnecting keeps drafts and analytics history.

## Modes

- **Demo mode** is the default when no Supabase env vars are set. Data is stored in browser storage, analytics use a clearly labeled sample dataset, and the copilot uses deterministic templates. It needs no keys, so the whole workflow can be evaluated immediately.
- **Live mode** is on when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set.

## Local dev

```bash
npm install
npm run dev          # demo mode
cp .env.example .env # add Supabase URL + anon key for live mode
```

## Going live

1. **Supabase project** (the free tier works):
   ```bash
   supabase link --project-ref <ref>
   supabase db push                      # applies supabase/migrations
   supabase secrets set OPENAI_API_KEY=... COMPOSIO_API_KEY=... \
     COMPOSIO_AUTH_CONFIG_INSTAGRAM=ac_... COMPOSIO_AUTH_CONFIG_LINKEDIN=ac_... COMPOSIO_AUTH_CONFIG_X=ac_... \
     ALLOWED_ORIGIN=https://penpoint.me
   supabase functions deploy agent social delete-account
   ```
   In Auth settings, add your site URL (for example `https://penpoint.me`) to the redirect allowlist.
2. **Composio:** create one auth config per toolkit with **read scopes only**. Confirm the read tool slugs in your dashboard. The defaults are in `supabase/functions/_shared/composio.ts`, and you can override them with `COMPOSIO_IDENTITY_TOOL_<P>`, `COMPOSIO_CONTENT_TOOLS_<P>` and `COMPOSIO_INSIGHT_TOOLS_<P>`. A slug outside the allowlist, or one that looks like a write action, is refused.
3. **GitHub Pages:** under Settings → Pages → Source, choose **GitHub Actions**. Add the repo variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the anon key is public by design, and RLS protects the data). Every push to `main` deploys. `public/CNAME` keeps the custom domain.

Optional: set `OPENAI_MODEL` to override the model for all agents. If the model rejects `temperature`/`top_p`, the client retries once with default sampling.
