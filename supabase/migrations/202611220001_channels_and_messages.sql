-- Migration: Add Workspace Channels & Team Messaging
-- Supports Module F: Messaging and Collaboration

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  description text,
  is_private boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.channel_members (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  attachments jsonb not null default '[]'::jsonb,
  reactions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_target_check check (
    (channel_id is not null and recipient_id is null) or
    (channel_id is null and recipient_id is not null)
  )
);

create index if not exists idx_messages_channel on public.messages(channel_id, created_at desc);
create index if not exists idx_messages_direct on public.messages(workspace_id, sender_id, recipient_id, created_at desc);
create index if not exists idx_channels_workspace on public.channels(workspace_id);

-- RLS Policies
alter table public.channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.messages enable row level security;

create policy "Workspace members can view channels"
  on public.channels for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = channels.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "Workspace members can create channels"
  on public.channels for insert
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = channels.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "Workspace members can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = messages.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "Workspace members can post messages"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = messages.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );
