-- Persistent workspace audit trail and private file storage.

create index if not exists shared_documents_workspace_created_idx
  on public.shared_documents(workspace_id, created_at desc);

create index if not exists task_comments_task_created_idx
  on public.task_comments(task_id, created_at);

drop policy if exists "members manage documents" on public.shared_documents;
create policy "members read documents" on public.shared_documents for select
  using (public.is_workspace_member(workspace_id));
create policy "members create documents" on public.shared_documents for insert
  with check (public.is_workspace_member(workspace_id) and created_by = auth.uid());
create policy "creators and admins update documents" on public.shared_documents for update
  using (created_by = auth.uid() or public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]))
  with check (
    public.is_workspace_member(workspace_id)
    and (created_by = auth.uid() or public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]))
  );
create policy "creators and admins delete documents" on public.shared_documents for delete
  using (created_by = auth.uid() or public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

create or replace function public.record_workspace_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  source_data jsonb;
  target_workspace uuid;
  target_object uuid;
  activity_verb text;
begin
  source_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  activity_verb := lower(tg_op);

  if tg_table_name = 'task_comments' then
    select workspace_id into target_workspace from public.tasks where id = (source_data->>'task_id')::uuid;
    target_object := (source_data->>'task_id')::uuid;
  elsif tg_table_name = 'workspace_members' then
    target_workspace := (source_data->>'workspace_id')::uuid;
    target_object := (source_data->>'user_id')::uuid;
  else
    target_workspace := (source_data->>'workspace_id')::uuid;
    target_object := (source_data->>'id')::uuid;
  end if;

  if target_workspace is not null then
    insert into public.activity_events (
      workspace_id,
      actor_id,
      verb,
      object_type,
      object_id,
      metadata
    ) values (
      target_workspace,
      auth.uid(),
      activity_verb,
      tg_table_name,
      target_object,
      jsonb_build_object(
        'name', coalesce(source_data->>'name', source_data->>'title'),
        'role', source_data->>'role',
        'operation', tg_op
      )
    );
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger projects_activity
after insert or update or delete on public.projects
for each row execute function public.record_workspace_activity();

create trigger tasks_activity
after insert or update or delete on public.tasks
for each row execute function public.record_workspace_activity();

create trigger task_comments_activity
after insert or update or delete on public.task_comments
for each row execute function public.record_workspace_activity();

create trigger documents_activity
after insert or update or delete on public.shared_documents
for each row execute function public.record_workspace_activity();

create trigger workspace_members_activity
after insert or update or delete on public.workspace_members
for each row execute function public.record_workspace_activity();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workspace-files',
  'workspace-files',
  false,
  26214400,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/json',
    'application/zip',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "workspace members read files"
on storage.objects for select
using (
  bucket_id = 'workspace-files'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);

create policy "workspace members upload files"
on storage.objects for insert
with check (
  bucket_id = 'workspace-files'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
  and owner_id = auth.uid()::text
);

create policy "file owners and admins update files"
on storage.objects for update
using (
  bucket_id = 'workspace-files'
  and (
    owner_id = auth.uid()::text
    or public.has_workspace_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner','admin']::public.workspace_role[]
    )
  )
);

create policy "file owners and admins delete files"
on storage.objects for delete
using (
  bucket_id = 'workspace-files'
  and (
    owner_id = auth.uid()::text
    or public.has_workspace_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner','admin']::public.workspace_role[]
    )
  )
);
