-- Persist the onboarding choice in the workspace creation transaction.
create function public.create_workspace(
  workspace_name text,
  workspace_slug text,
  template_key text,
  workspace_type text
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  new_workspace_id uuid;
begin
  if workspace_type is null or length(btrim(workspace_type)) not between 1 and 80 then
    raise exception 'Invalid workspace type';
  end if;

  new_workspace_id := public.create_workspace(workspace_name, workspace_slug, template_key);
  update public.workspaces set settings = jsonb_build_object('type', workspace_type)
  where id = new_workspace_id;
  return new_workspace_id;
end;
$$;

revoke execute on function public.create_workspace(text, text, text, text) from public, anon;
grant execute on function public.create_workspace(text, text, text, text) to authenticated;
