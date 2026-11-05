-- Validate tenant relationships before assignment triggers disclose titles.
create function public.validate_task_workspace_references()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.project_id is not null and not exists (
    select 1 from public.projects p
    where p.id = new.project_id and p.workspace_id = new.workspace_id
  ) then
    raise exception 'Task project must belong to the same workspace' using errcode = '23514';
  end if;
  if new.parent_id is not null and not exists (
    select 1 from public.tasks parent
    where parent.id = new.parent_id and parent.workspace_id = new.workspace_id
  ) then
    raise exception 'Parent task must belong to the same workspace' using errcode = '23514';
  end if;
  if new.assignee_id is not null and not exists (
    select 1 from public.workspace_members m
    where m.user_id = new.assignee_id and m.workspace_id = new.workspace_id
  ) then
    raise exception 'Task assignee must be a workspace member' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger tasks_validate_workspace_references
before insert or update of workspace_id, project_id, parent_id, assignee_id on public.tasks
for each row execute function public.validate_task_workspace_references();

create function public.validate_meeting_participant_workspace()
returns trigger language plpgsql set search_path = public
as $$
begin
  if not exists (
    select 1 from public.meetings meeting
    join public.workspace_members member on member.workspace_id = meeting.workspace_id
    where meeting.id = new.meeting_id and member.user_id = new.user_id
  ) then
    raise exception 'Meeting participant must be a workspace member' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger meeting_participants_validate_workspace
before insert or update of meeting_id, user_id on public.meeting_participants
for each row execute function public.validate_meeting_participant_workspace();

-- Guests can read the task board but cannot write its underlying records.
drop policy "members manage projects" on public.projects;
create policy "members read projects" on public.projects for select
  using (public.is_workspace_member(workspace_id));
create policy "contributors manage projects" on public.projects for all
  using (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[]));

drop policy "members manage tasks" on public.tasks;
create policy "members read tasks" on public.tasks for select
  using (public.is_workspace_member(workspace_id));
create policy "contributors manage tasks" on public.tasks for all
  using (public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[]));

drop policy "members manage task comments" on public.task_comments;
create policy "members read task comments" on public.task_comments for select
  using (exists (select 1 from public.tasks t where t.id = task_id));
create policy "contributors manage task comments" on public.task_comments for all
  using (exists (
    select 1 from public.tasks t where t.id = task_id
    and public.has_workspace_role(t.workspace_id, array['owner','admin','member']::public.workspace_role[])
  ));

-- A former member must not continue receiving the workspace's private titles.
create policy "current members access workspace notifications"
on public.notifications as restrictive for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));
