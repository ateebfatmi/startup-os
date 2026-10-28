-- Encrypted OAuth connections. Tokens are written only by trusted server routes.

create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('google_calendar','slack','github','linear')),
  external_account_id text,
  external_account_name text,
  encrypted_access_token text not null,
  encrypted_refresh_token text,
  scopes text[] not null default '{}',
  expires_at timestamptz,
  connected_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, provider)
);

alter table public.integration_connections enable row level security;
-- No direct client policies: metadata is projected by authenticated server routes,
-- and encrypted token columns never leave the trusted service-role boundary.

create index integration_connections_workspace_idx on public.integration_connections(workspace_id, provider);

create table public.integration_sync_items (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('google_calendar','slack','github','linear')),
  external_id text not null,
  resource_type text not null check (resource_type in ('meeting','task')),
  resource_id uuid not null,
  synced_at timestamptz not null default now(),
  primary key (workspace_id, provider, external_id)
);

alter table public.integration_sync_items enable row level security;
