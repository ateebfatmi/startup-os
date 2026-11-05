-- Serialize first-open creation without deleting or changing historical boards.
alter table public.whiteboards add column revision bigint not null default 0;

create function public.open_spatial_whiteboard(target_workspace uuid)
returns table (id uuid, document jsonb)
language plpgsql set search_path = public
as $$
begin
  if not public.is_workspace_member(target_workspace) then
    raise exception 'Workspace membership required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('whiteboard:' || target_workspace::text, 0));
  return query
    select w.id, w.document from public.whiteboards w
    where w.workspace_id = target_workspace and w.name = 'Spatial Whiteboard'
    order by w.created_at, w.id limit 1;
  if found then return; end if;

  return query
    insert into public.whiteboards as w (workspace_id, name, document, updated_by)
    values (target_workspace, 'Spatial Whiteboard', '{"version":2,"elements":[]}', auth.uid())
    returning w.id, w.document;
end;
$$;

revoke execute on function public.open_spatial_whiteboard(uuid) from public, anon;
grant execute on function public.open_spatial_whiteboard(uuid) to authenticated;
