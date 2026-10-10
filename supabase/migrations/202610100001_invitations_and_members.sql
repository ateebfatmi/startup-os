-- Migration: 202610100001_invitations_and_members.sql
-- Workspace invitation acceptance, member management, and final owner protection

create or replace function public.is_sole_owner(target_workspace uuid, target_user uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_id = target_workspace
      and user_id = target_user
      and role = 'owner'
  ) and (
    select count(*)
    from public.workspace_members
    where workspace_id = target_workspace
      and role = 'owner'
  ) <= 1;
$$;

create or replace function public.get_invitation_by_token(token_text text)
returns table (
  id uuid,
  workspace_id uuid,
  workspace_name text,
  email text,
  role public.workspace_role,
  expires_at timestamptz,
  accepted_at timestamptz,
  inviter_name text
) language plpgsql stable security definer set search_path = public
as $$
declare
  computed_hash text;
begin
  computed_hash := encode(digest(token_text, 'sha256'), 'hex');

  return query
  select
    i.id,
    i.workspace_id,
    w.name as workspace_name,
    i.email,
    i.role,
    i.expires_at,
    i.accepted_at,
    coalesce(p.display_name, 'A teammate') as inviter_name
  from public.workspace_invitations i
  join public.workspaces w on w.id = i.workspace_id
  left join public.profiles p on p.id = i.invited_by
  where i.token_hash = computed_hash;
end;
$$;

create or replace function public.accept_workspace_invitation(token_text text)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  computed_hash text;
  v_invitation record;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  computed_hash := encode(digest(token_text, 'sha256'), 'hex');

  select i.id, i.workspace_id, i.role, i.expires_at, i.accepted_at
  into v_invitation
  from public.workspace_invitations i
  where i.token_hash = computed_hash;

  if v_invitation.id is null then
    raise exception 'Invitation not found or invalid token';
  end if;

  if v_invitation.accepted_at is not null then
    raise exception 'Invitation has already been accepted';
  end if;

  if v_invitation.expires_at < now() then
    raise exception 'Invitation has expired';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_invitation.workspace_id, auth.uid(), v_invitation.role)
  on conflict (workspace_id, user_id)
  do update set role = excluded.role;

  update public.workspace_invitations
  set accepted_at = now()
  where id = v_invitation.id;

  return v_invitation.workspace_id;
end;
$$;

create or replace function public.update_workspace_member_role(
  target_workspace uuid,
  target_user uuid,
  new_role public.workspace_role
)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  current_role public.workspace_role;
begin
  if not public.has_workspace_role(target_workspace, array['owner','admin']::public.workspace_role[]) then
    raise exception 'Unauthorized: Only owners and admins can update member roles';
  end if;

  select role into current_role
  from public.workspace_members
  where workspace_id = target_workspace and user_id = target_user;

  if current_role is null then
    raise exception 'Member not found in workspace';
  end if;

  if current_role = 'owner' and new_role != 'owner' then
    if public.is_sole_owner(target_workspace, target_user) then
      raise exception 'Cannot demote the final owner of the workspace';
    end if;
  end if;

  update public.workspace_members
  set role = new_role
  where workspace_id = target_workspace and user_id = target_user;

  return true;
end;
$$;

create or replace function public.remove_workspace_member(
  target_workspace uuid,
  target_user uuid
)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  target_role public.workspace_role;
begin
  if auth.uid() != target_user and not public.has_workspace_role(target_workspace, array['owner','admin']::public.workspace_role[]) then
    raise exception 'Unauthorized: Only owners and admins can remove members';
  end if;

  select role into target_role
  from public.workspace_members
  where workspace_id = target_workspace and user_id = target_user;

  if target_role is null then
    raise exception 'Member not found in workspace';
  end if;

  if target_role = 'owner' then
    if public.is_sole_owner(target_workspace, target_user) then
      raise exception 'Cannot remove the final owner of the workspace';
    end if;
  end if;

  delete from public.workspace_members
  where workspace_id = target_workspace and user_id = target_user;

  return true;
end;
$$;

grant execute on function public.get_invitation_by_token(text) to authenticated, anon;
grant execute on function public.accept_workspace_invitation(text) to authenticated;
grant execute on function public.update_workspace_member_role(uuid, uuid, public.workspace_role) to authenticated;
grant execute on function public.remove_workspace_member(uuid, uuid) to authenticated;
