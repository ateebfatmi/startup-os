-- Startup operating-system layer: objectives, measurable key results, and event notifications.

create table public.objectives (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  description text not null default '',
  status text not null default 'active' check (status in ('draft','active','completed','cancelled')),
  owner_id uuid references public.profiles(id) on delete set null,
  starts_at date not null default current_date,
  due_at date,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_at is null or due_at >= starts_at)
);

create table public.key_results (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  objective_id uuid not null references public.objectives(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 220),
  unit text not null default 'number' check (unit in ('number','percent','currency','boolean')),
  start_value numeric not null default 0,
  current_value numeric not null default 0,
  target_value numeric not null default 100,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (target_value != start_value)
);

create index objectives_workspace_status_idx on public.objectives(workspace_id, status, due_at);
create index key_results_objective_idx on public.key_results(objective_id);

alter table public.objectives enable row level security;
alter table public.key_results enable row level security;

create policy "members read objectives" on public.objectives for select
  using (public.is_workspace_member(workspace_id));
create policy "contributors create objectives" on public.objectives for insert
  with check (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[]) and created_by = auth.uid());
create policy "contributors update objectives" on public.objectives for update
  using (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[]));
create policy "contributors delete objectives" on public.objectives for delete
  using (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[]));

create policy "members read key results" on public.key_results for select
  using (public.is_workspace_member(workspace_id));
create policy "contributors create key results" on public.key_results for insert
  with check (
    public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[])
    and exists (select 1 from public.objectives o where o.id = objective_id and o.workspace_id = workspace_id)
  );
create policy "contributors update key results" on public.key_results for update
  using (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[]));
create policy "contributors delete key results" on public.key_results for delete
  using (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[]));

create trigger objectives_activity
after insert or update or delete on public.objectives
for each row execute function public.record_workspace_activity();

create trigger key_results_activity
after insert or update or delete on public.key_results
for each row execute function public.record_workspace_activity();

create trigger meetings_activity
after insert or update or delete on public.meetings
for each row execute function public.record_workspace_activity();

create or replace function public.notify_task_assignment()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.assignee_id is not null and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id) then
    insert into public.notifications(workspace_id, user_id, kind, title, body, resource_type, resource_id)
    values (new.workspace_id, new.assignee_id, 'task_assigned', 'Task assigned to you', new.title, 'task', new.id);
  end if;
  return new;
end;
$$;

create trigger task_assignment_notification
after insert or update of assignee_id on public.tasks
for each row execute function public.notify_task_assignment();

create or replace function public.notify_meeting_participant()
returns trigger language plpgsql security definer set search_path = public
as $$
declare target_meeting public.meetings%rowtype;
begin
  select * into target_meeting from public.meetings where id = new.meeting_id;
  if target_meeting.id is not null then
    insert into public.notifications(workspace_id, user_id, kind, title, body, resource_type, resource_id)
    values (target_meeting.workspace_id, new.user_id, 'meeting_invite', 'Meeting invitation', target_meeting.title, 'meeting', target_meeting.id);
  end if;
  return new;
end;
$$;

create trigger meeting_participant_notification
after insert on public.meeting_participants
for each row execute function public.notify_meeting_participant();
