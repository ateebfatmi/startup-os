-- Run against an isolated database with all migrations applied. Fixtures roll back.
begin;

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-000000000001', 'owner@example.com', now()),
  ('00000000-0000-0000-0000-000000000002', 'admin@example.com', now()),
  ('00000000-0000-0000-0000-000000000003', 'invitee@example.com', now()),
  ('00000000-0000-0000-0000-000000000004', 'outsider@example.com', now()),
  ('00000000-0000-0000-0000-000000000005', 'guest@example.com', now());

insert into public.workspaces (id, name, slug, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Audit A', 'audit-a', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'Audit B', 'audit-b', '00000000-0000-0000-0000-000000000004');
insert into public.workspace_members (workspace_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'admin'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'guest');
insert into public.projects (id, workspace_id, name, created_by) values
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Private project', '00000000-0000-0000-0000-000000000004');

set local search_path = public, extensions;
insert into public.workspace_invitations (workspace_id, email, role, token_hash, invited_by, expires_at) values
  ('10000000-0000-0000-0000-000000000001', 'INVITEE@example.com', 'member', encode(digest('audit-token', 'sha256'), 'hex'), '00000000-0000-0000-0000-000000000001', now() + interval '1 day'),
  ('10000000-0000-0000-0000-000000000001', 'owner@example.com', 'member', encode(digest('audit-existing', 'sha256'), 'hex'), '00000000-0000-0000-0000-000000000001', now() + interval '1 day');

do $$
<<workspace_membership_test>>
declare
  workspace_a constant uuid := '10000000-0000-0000-0000-000000000001';
  workspace_b constant uuid := '10000000-0000-0000-0000-000000000002';
  owner_id constant uuid := '00000000-0000-0000-0000-000000000001';
  admin_id constant uuid := '00000000-0000-0000-0000-000000000002';
  invitee_id constant uuid := '00000000-0000-0000-0000-000000000003';
  board_id uuid;
  objective_id uuid;
  meeting_id uuid;
begin
  if has_function_privilege('anon', 'public.remove_workspace_member(uuid,uuid)', 'execute') then
    raise exception 'Anonymous role can execute member removal';
  end if;

  set local role authenticated;
  perform set_config('request.jwt.claim.sub', admin_id::text, true);

  if exists (select 1 from public.workspaces where id = workspace_b) then
    raise exception 'Admin can see another workspace';
  end if;

  perform set_config('realtime.topic', 'workspace:' || workspace_a::text, true);
  insert into realtime.messages (topic, extension) values (realtime.topic(), 'presence');
  if not exists (select 1 from realtime.messages where topic = realtime.topic()) then
    raise exception 'Workspace member cannot receive presence';
  end if;

  perform set_config('realtime.topic', 'call:' || workspace_b::text || ':test-room', true);
  begin
    insert into realtime.messages (topic, extension) values (realtime.topic(), 'broadcast');
    raise exception 'Outsider can publish call signaling';
  exception when insufficient_privilege then null;
  end;
  if exists (select 1 from realtime.messages) then
    raise exception 'Outsider can receive workspace messages';
  end if;

  delete from public.workspace_members where workspace_id = workspace_a and user_id = owner_id;
  if found then raise exception 'Admin bypassed member management RPC'; end if;

  begin
    perform public.update_workspace_member_role(workspace_a, admin_id, 'owner');
    raise exception 'Admin promoted themselves to owner';
  exception when raise_exception then
    if sqlerrm <> 'Only owners can change owner roles' then raise; end if;
  end;

  begin
    perform public.accept_workspace_invitation('audit-token');
    raise exception 'Mismatched email accepted invitation';
  exception when raise_exception then
    if sqlerrm <> 'Sign in with the verified email address on this invitation' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', invitee_id::text, true);
  if public.accept_workspace_invitation('audit-token') is distinct from workspace_a then
    raise exception 'Invitee did not join intended workspace';
  end if;
  if not exists (select 1 from public.workspace_members where workspace_id = workspace_a and user_id = invitee_id and role = 'member') then
    raise exception 'Invitee received the wrong role';
  end if;

  begin
    perform public.accept_workspace_invitation('audit-token');
    raise exception 'Used invitation accepted again';
  exception when raise_exception then
    if sqlerrm <> 'Invitation has already been accepted' then raise; end if;
  end;

  objective_id := public.create_workspace_objective(workspace_a, 'Audit objective', '', null, 'Audit key result', 2);
  if not exists (select 1 from public.key_results k where k.objective_id = workspace_membership_test.objective_id) then
    raise exception 'Objective is missing its initial key result';
  end if;
  begin
    perform public.create_workspace_objective(workspace_a, 'Invalid audit objective', '', null, 'Invalid key result', 0);
    raise exception 'Invalid key result accepted';
  exception when check_violation then null;
  end;
  if exists (select 1 from public.objectives where title = 'Invalid audit objective') then
    raise exception 'Failed key result left a partial objective';
  end if;

  select id into strict board_id from public.open_spatial_whiteboard(workspace_a);
  if (select id from public.open_spatial_whiteboard(workspace_a)) is distinct from board_id then
    raise exception 'Reopening returned a different whiteboard';
  end if;
  begin
    perform public.open_spatial_whiteboard(workspace_b);
    raise exception 'Outsider opened a private whiteboard';
  exception when insufficient_privilege then null;
  end;

  insert into public.tasks (workspace_id, title, created_by, assignee_id)
    values (workspace_a, 'Workspace task', invitee_id, admin_id);

  begin
    insert into public.tasks (workspace_id, title, created_by, assignee_id)
      values (workspace_a, 'Private assignment', invitee_id, '00000000-0000-0000-0000-000000000004');
    raise exception 'Task assignment targeted an outsider';
  exception when check_violation then
    if sqlerrm <> 'Task assignee must be a workspace member' then raise; end if;
  end;

  begin
    insert into public.tasks (workspace_id, title, created_by, project_id)
      values (workspace_a, 'Cross-workspace task', invitee_id, '20000000-0000-0000-0000-000000000002');
    raise exception 'Task referenced another workspace project';
  exception when check_violation then
    if sqlerrm <> 'Task project must belong to the same workspace' then raise; end if;
  end;

  insert into public.meetings (workspace_id, title, starts_at, ends_at, created_by)
    values (workspace_a, 'Private audit meeting', now(), now() + interval '1 hour', invitee_id)
    returning id into meeting_id;
  begin
    insert into public.meeting_participants (meeting_id, user_id)
      values (meeting_id, '00000000-0000-0000-0000-000000000004');
    raise exception 'Meeting invitation targeted an outsider';
  exception when check_violation then
    if sqlerrm <> 'Meeting participant must be a workspace member' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  if not exists (select 1 from public.notifications where body = 'Workspace task') then
    raise exception 'Assignee did not receive the task notification';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', true);
  if not exists (select 1 from public.tasks where title = 'Workspace task') then
    raise exception 'Guest cannot read workspace tasks';
  end if;
  update public.tasks set title = 'Guest edit' where workspace_id = workspace_a;
  if found then raise exception 'Guest edited workspace tasks'; end if;

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform public.create_workspace('New audit workspace', 'audit-new', 'remote-hq', 'Startup');
  if not exists (select 1 from public.workspaces where slug = 'audit-new' and settings->>'type' = 'Startup') then
    raise exception 'Workspace settings were not saved';
  end if;

  perform public.accept_workspace_invitation('audit-existing');
  perform public.remove_workspace_member(workspace_a, admin_id);
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  if exists (select 1 from public.notifications where body = 'Workspace task') then
    raise exception 'Former member can read private task notifications';
  end if;
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  begin
    perform public.remove_workspace_member(workspace_a, owner_id);
    raise exception 'Final owner was removed';
  exception when raise_exception then
    if sqlerrm <> 'Cannot remove the final owner of the workspace' then raise; end if;
  end;
end;
$$;

rollback;
