-- Keep the objective and its initial key result in one RLS-checked transaction.
create function public.create_workspace_objective(
  target_workspace uuid,
  objective_title text,
  objective_description text,
  objective_due_at date,
  key_result_title text,
  key_result_target numeric
)
returns uuid language plpgsql set search_path = public
as $$
declare
  objective_id uuid;
begin
  insert into public.objectives (workspace_id, title, description, due_at, owner_id, created_by)
  values (target_workspace, objective_title, objective_description, objective_due_at, auth.uid(), auth.uid())
  returning id into objective_id;

  insert into public.key_results (workspace_id, objective_id, title, target_value, owner_id)
  values (target_workspace, objective_id, key_result_title, key_result_target, auth.uid());

  return objective_id;
end;
$$;

revoke execute on function public.create_workspace_objective(uuid, text, text, date, text, numeric) from public, anon;
grant execute on function public.create_workspace_objective(uuid, text, text, date, text, numeric) to authenticated;

alter policy "contributors create key results" on public.key_results
with check (
  public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[])
  and exists (
    select 1 from public.objectives o
    where o.id = key_results.objective_id and o.workspace_id = key_results.workspace_id
  )
);
alter policy "contributors update key results" on public.key_results
with check (
  public.has_workspace_role(workspace_id, array['owner','admin','member']::public.workspace_role[])
  and exists (
    select 1 from public.objectives o
    where o.id = key_results.objective_id and o.workspace_id = key_results.workspace_id
  )
);
