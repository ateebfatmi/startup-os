-- Authorize private Broadcast and Presence topics through workspace membership.
create policy "workspace members receive realtime messages"
on realtime.messages for select to authenticated
using (
  extension in ('broadcast', 'presence')
  and public.is_workspace_member(
    substring(realtime.topic() from '^(?:workspace|call|whiteboard):([0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12})(?::|$)')::uuid
  )
);

create policy "workspace members send realtime messages"
on realtime.messages for insert to authenticated
with check (
  extension in ('broadcast', 'presence')
  and public.is_workspace_member(
    substring(realtime.topic() from '^(?:workspace|call|whiteboard):([0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12})(?::|$)')::uuid
  )
);
