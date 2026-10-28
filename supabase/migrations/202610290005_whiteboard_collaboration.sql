-- Whiteboard query performance and audit visibility for persistent collaboration.

create index whiteboards_workspace_updated_idx
  on public.whiteboards(workspace_id, updated_at desc);

create trigger whiteboards_activity
after insert or update or delete on public.whiteboards
for each row execute function public.record_workspace_activity();
