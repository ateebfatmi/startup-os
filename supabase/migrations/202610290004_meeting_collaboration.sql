-- Persistent meeting notes and linked resources backed by shared documents.

alter table public.shared_documents
  add column meeting_id uuid references public.meetings(id) on delete cascade;

create index shared_documents_meeting_idx
  on public.shared_documents(meeting_id, created_at desc)
  where meeting_id is not null;

create unique index shared_documents_one_note_per_meeting_idx
  on public.shared_documents(meeting_id)
  where meeting_id is not null and kind = 'note';

create or replace function public.validate_document_meeting_workspace()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.meeting_id is not null and not exists (
    select 1 from public.meetings
    where id = new.meeting_id and workspace_id = new.workspace_id
  ) then
    raise exception 'Meeting and document must belong to the same workspace';
  end if;
  return new;
end;
$$;

create trigger validate_document_meeting_workspace
before insert or update of meeting_id, workspace_id on public.shared_documents
for each row execute function public.validate_document_meeting_workspace();

drop policy if exists "creators and admins update documents" on public.shared_documents;
create policy "creators admins and meeting members update documents"
on public.shared_documents for update
using (
  created_by = auth.uid()
  or public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])
  or (meeting_id is not null and public.is_workspace_member(workspace_id))
)
with check (
  public.is_workspace_member(workspace_id)
  and (
    created_by = auth.uid()
    or public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[])
    or meeting_id is not null
  )
);
