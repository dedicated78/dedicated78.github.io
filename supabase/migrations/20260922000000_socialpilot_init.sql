-- SocialPilot AI — schema, owner-scoped RLS, immutable revision history.
-- Every table carries owner_id (defaults to auth.uid()) and is readable/writable only by its owner.

create extension if not exists pgcrypto;

-- users: app-level identity mirror of auth.users
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- workspaces
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- brand_profiles (one per workspace)
create table public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  brand_name text not null default '',
  industry text not null default '',
  voice text not null default '',
  audience text not null default '',
  goals text not null default '',
  offers text not null default '',
  vocabulary text not null default '',
  prohibited_topics text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- social_connections: display state only. Provider references live in social_connection_secrets.
create table public.social_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  platform text not null check (platform in ('instagram', 'linkedin', 'x')),
  account_label text not null default '',
  state text not null default 'pending' check (state in ('pending', 'connected', 'error', 'disconnected')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, platform)
);

-- Service-role only: RLS enabled with no policies, so browsers can never read it.
create table public.social_connection_secrets (
  connection_id uuid primary key references public.social_connections (id) on delete cascade,
  provider text not null default 'composio',
  composio_user_id text not null,
  composio_connected_account_id text,
  created_at timestamptz not null default now()
);

-- strategies
create table public.strategies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null default '',
  brief text not null default '',
  platforms text[] not null default '{}',
  start_date date not null,
  end_date date not null,
  status text not null default 'draft' check (status in ('draft', 'saved', 'archived')),
  content jsonb not null,
  source_recommendation_ids uuid[] not null default '{}',
  ai_provenance jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- campaigns
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  strategy_id uuid references public.strategies (id) on delete set null,
  name text not null,
  objective text not null default '',
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- calendar_items: internal planning records. planned_at never triggers anything external.
create table public.calendar_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  strategy_id uuid references public.strategies (id) on delete set null,
  planned_at timestamptz not null,
  platform text not null check (platform in ('instagram', 'linkedin', 'x')),
  title text not null default '',
  pillar text not null default '',
  format text not null default '',
  objective text not null default '',
  notes text not null default '',
  status text not null default 'idea' check (status in ('idea', 'draft', 'ready', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.calendar_items (workspace_id, planned_at);

-- drafts
create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  calendar_item_id uuid not null unique references public.calendar_items (id) on delete cascade,
  body text not null default '',
  cta text not null default '',
  hashtags text[] not null default '{}',
  variants jsonb not null default '{}',
  ai_provenance jsonb,
  current_version int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- draft_versions: immutable revision history (insert + select only; updates blocked by trigger)
create table public.draft_versions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  draft_id uuid not null references public.drafts (id) on delete cascade,
  version int not null,
  source text not null check (source in ('ai', 'user')),
  note text not null default '',
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (draft_id, version)
);

create or replace function public.block_version_update() returns trigger language plpgsql as $$
begin raise exception 'draft_versions are immutable'; end $$;
create trigger draft_versions_immutable before update on public.draft_versions
for each row execute function public.block_version_update();

-- analytics_snapshots: imported metrics with source + retrieval time. Written by the social function.
create table public.analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  platform text not null check (platform in ('instagram', 'linkedin', 'x')),
  account_label text not null default '',
  period_start timestamptz not null,
  period_end timestamptz not null,
  followers bigint,
  posts jsonb not null default '[]',
  source text not null,
  retrieved_at timestamptz not null default now(),
  notes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.analytics_snapshots (workspace_id, platform, retrieved_at desc);

-- recommendations
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  platform text not null check (platform in ('instagram', 'linkedin', 'x', 'all')),
  finding text not null,
  proposed_action text not null,
  evidence jsonb not null check (jsonb_typeof(evidence) = 'array' and jsonb_array_length(evidence) > 0),
  status text not null default 'new' check (status in ('new', 'selected', 'applied', 'dismissed')),
  ai_provenance jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['workspaces','brand_profiles','social_connections','strategies','campaigns','calendar_items','drafts','analytics_snapshots','recommendations']
  loop
    execute format('create trigger touch_%1$s before update on public.%1$I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- Workspace ownership guard: a child row's workspace must belong to the same owner.
create or replace function public.owns_workspace(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.workspaces w where w.id = ws and w.owner_id = auth.uid());
$$;

-- RLS
alter table public.users enable row level security;
alter table public.social_connection_secrets enable row level security; -- no policies = service role only

create policy users_self on public.users for select using (id = auth.uid());

alter table public.workspaces enable row level security;
create policy ws_owner on public.workspaces for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['brand_profiles','social_connections','strategies','campaigns','calendar_items','drafts','analytics_snapshots','recommendations']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy owner_all on public.%I for all using (owner_id = auth.uid()) with check (owner_id = auth.uid() and public.owns_workspace(workspace_id))', t);
  end loop;
end $$;

-- draft_versions: owner may read and append; no update/delete policy (history stays immutable
-- except via cascade when the parent draft/workspace/account is deleted).
alter table public.draft_versions enable row level security;
create policy dv_select on public.draft_versions for select using (owner_id = auth.uid());
create policy dv_insert on public.draft_versions for insert
  with check (owner_id = auth.uid() and public.owns_workspace(workspace_id));
