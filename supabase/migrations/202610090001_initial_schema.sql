create extension if not exists pgcrypto;

create type public.workspace_role as enum ('owner', 'admin', 'member', 'guest');
create type public.task_status as enum ('todo', 'in_progress', 'in_review', 'done');
create type public.priority as enum ('low', 'medium', 'high', 'urgent');
create type public.meeting_status as enum ('scheduled', 'active', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url text,
  avatar_config jsonb not null default '{}'::jsonb,
  status text not null default 'online' check (status in ('online', 'away', 'focus', 'offline')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  created_by uuid not null references public.profiles(id) on delete restrict,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role public.workspace_role not null default 'member',
  token_hash text not null unique,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.office_layouts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  template_key text not null default 'remote-hq',
  version integer not null default 1 check (version > 0),
  layout jsonb not null default '{"spawn":{"x":0,"z":1.6}}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  office_layout_id uuid references public.office_layouts(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('open', 'meeting', 'focus', 'brainstorm', 'private_team', 'founder', 'social')),
  is_private boolean not null default false,
  allowed_roles public.workspace_role[] not null default array['owner','admin','member','guest']::public.workspace_role[],
  bounds jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.office_objects (
  id uuid primary key default gen_random_uuid(),
  office_layout_id uuid not null references public.office_layouts(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  asset_key text not null,
  transform jsonb not null,
  interaction jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 140),
  description text not null default '',
  status text not null default 'active' check (status in ('planned', 'active', 'paused', 'completed', 'archived')),
  priority public.priority not null default 'medium',
  owner_id uuid references public.profiles(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  due_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  parent_id uuid references public.tasks(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  description text not null default '',
  status public.task_status not null default 'todo',
  priority public.priority not null default 'medium',
  assignee_id uuid references public.profiles(id) on delete set null,
  due_at timestamptz,
  position integer not null default 0,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  title text not null,
  agenda text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  timezone text not null default 'UTC',
  status public.meeting_status not null default 'scheduled',
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meeting_participants (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  response text not null default 'pending' check (response in ('pending','accepted','declined','tentative')),
  primary key (meeting_id, user_id)
);

create table public.shared_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  title text not null,
  kind text not null check (kind in ('note','file','link')),
  content jsonb not null default '{}'::jsonb,
  storage_path text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.whiteboards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  name text not null,
  document jsonb not null default '{"version":1,"elements":[]}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  resource_type text,
  resource_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  verb text not null,
  object_type text not null,
  object_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  notification_preferences jsonb not null default '{}'::jsonb,
  accessibility jsonb not null default '{}'::jsonb,
  appearance jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index workspace_members_user_idx on public.workspace_members(user_id);
create index rooms_workspace_idx on public.rooms(workspace_id);
create index projects_workspace_idx on public.projects(workspace_id, status);
create index tasks_workspace_status_idx on public.tasks(workspace_id, status);
create index tasks_assignee_idx on public.tasks(assignee_id, due_at);
create index meetings_workspace_start_idx on public.meetings(workspace_id, starts_at);
create index notifications_user_unread_idx on public.notifications(user_id, read_at);
create index activity_workspace_created_idx on public.activity_events(workspace_id, created_at desc);

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.workspace_members where workspace_id = target_workspace and user_id = auth.uid()) $$;

create or replace function public.has_workspace_role(target_workspace uuid, accepted public.workspace_role[])
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.workspace_members where workspace_id = target_workspace and user_id = auth.uid() and role = any(accepted)) $$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.office_layouts enable row level security;
alter table public.rooms enable row level security;
alter table public.office_objects enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.shared_documents enable row level security;
alter table public.whiteboards enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_events enable row level security;
alter table public.user_preferences enable row level security;

create policy "profiles visible to shared workspace members" on public.profiles for select using (
  id = auth.uid() or exists (
    select 1 from public.workspace_members mine join public.workspace_members theirs using (workspace_id)
    where mine.user_id = auth.uid() and theirs.user_id = profiles.id
  )
);
create policy "users update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "users insert own profile" on public.profiles for insert with check (id = auth.uid());

create policy "members read workspaces" on public.workspaces for select using (public.is_workspace_member(id));
create policy "authenticated users create workspaces" on public.workspaces for insert with check (created_by = auth.uid());
create policy "admins update workspaces" on public.workspaces for update using (public.has_workspace_role(id, array['owner','admin']::public.workspace_role[]));
create policy "owners delete workspaces" on public.workspaces for delete using (public.has_workspace_role(id, array['owner']::public.workspace_role[]));

create policy "members read memberships" on public.workspace_members for select using (public.is_workspace_member(workspace_id));
create policy "admins manage memberships" on public.workspace_members for all using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])) with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create policy "members read layouts" on public.office_layouts for select using (public.is_workspace_member(workspace_id));
create policy "admins manage layouts" on public.office_layouts for all using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])) with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));
create policy "members read rooms" on public.rooms for select using (public.is_workspace_member(workspace_id) and (not is_private or public.has_workspace_role(workspace_id, allowed_roles)));
create policy "admins manage rooms" on public.rooms for all using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])) with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));
create policy "members read office objects" on public.office_objects for select using (exists(select 1 from public.office_layouts l where l.id = office_layout_id and public.is_workspace_member(l.workspace_id)));
create policy "admins manage office objects" on public.office_objects for all using (exists(select 1 from public.office_layouts l where l.id = office_layout_id and public.has_workspace_role(l.workspace_id, array['owner','admin']::public.workspace_role[])));

create policy "members manage projects" on public.projects for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "members manage tasks" on public.tasks for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "members manage meetings" on public.meetings for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "members manage documents" on public.shared_documents for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "members manage whiteboards" on public.whiteboards for all using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "members read activity" on public.activity_events for select using (public.is_workspace_member(workspace_id));
create policy "users read own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "users update own notifications" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users manage own preferences" on public.user_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Child records inherit access through their parent resource.
create policy "members manage project membership" on public.project_members for all using (exists(select 1 from public.projects p where p.id = project_id and public.is_workspace_member(p.workspace_id)));
create policy "members manage task comments" on public.task_comments for all using (exists(select 1 from public.tasks t where t.id = task_id and public.is_workspace_member(t.workspace_id)));
create policy "members manage meeting participants" on public.meeting_participants for all using (exists(select 1 from public.meetings m where m.id = meeting_id and public.is_workspace_member(m.workspace_id)));
create policy "admins manage invitations" on public.workspace_invitations for all using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1), 'New teammate'));
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.create_workspace(workspace_name text, workspace_slug text, template_key text default 'remote-hq')
returns uuid language plpgsql security definer set search_path = public
as $$
declare new_workspace_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.workspaces(name, slug, created_by)
  values (workspace_name, workspace_slug, auth.uid()) returning id into new_workspace_id;
  insert into public.workspace_members(workspace_id, user_id, role)
  values (new_workspace_id, auth.uid(), 'owner');
  insert into public.office_layouts(workspace_id, name, template_key)
  values (new_workspace_id, 'Main office', template_key);
  return new_workspace_id;
end;
$$;

grant execute on function public.create_workspace(text, text, text) to authenticated;
