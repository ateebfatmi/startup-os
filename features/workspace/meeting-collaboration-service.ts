import { z } from "zod";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";

export type MeetingResource = {
  id: string;
  title: string;
  url: string;
  description: string;
  createdBy: string;
  createdAt: string;
};

export type MeetingCollaboration = {
  noteId: string | null;
  notes: string;
  resources: MeetingResource[];
};

const NotesInput = z.object({
  workspaceId: z.string().min(1),
  meetingId: z.string().min(1),
  notes: z.string().max(20_000),
});

const ResourceInput = z.object({
  workspaceId: z.string().min(1),
  meetingId: z.string().min(1),
  title: z.string().trim().min(1).max(180),
  url: z.string().trim().url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "Use an HTTP or HTTPS link"),
  description: z.string().trim().max(1_000).default(""),
});

const NoteContent = z.object({ body: z.string().default("") });
const LinkContent = z.object({ url: z.string().url(), description: z.string().default("") });
const localKey = (workspaceId: string, meetingId: string) => `orbit-meeting-collaboration:${workspaceId}:${meetingId}`;

function readLocal(workspaceId: string, meetingId: string): MeetingCollaboration {
  if (typeof window === "undefined") return { noteId: null, notes: "", resources: [] };
  try {
    return JSON.parse(window.localStorage.getItem(localKey(workspaceId, meetingId)) || "") as MeetingCollaboration;
  } catch {
    return { noteId: null, notes: "", resources: [] };
  }
}

function writeLocal(workspaceId: string, meetingId: string, value: MeetingCollaboration) {
  window.localStorage.setItem(localKey(workspaceId, meetingId), JSON.stringify(value));
}

export async function fetchMeetingCollaboration(workspaceId: string, meetingId: string): Promise<MeetingCollaboration> {
  if (!hasSupabaseConfig) return readLocal(workspaceId, meetingId);
  const { data, error } = await createSupabaseBrowserClient().from("shared_documents")
    .select("id, title, kind, content, created_by, created_at")
    .eq("workspace_id", workspaceId)
    .eq("meeting_id", meetingId)
    .in("kind", ["note", "link"])
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const note = (data || []).find((row) => row.kind === "note");
  const parsedNote = note ? NoteContent.safeParse(note.content) : null;
  const resources = (data || []).flatMap((row) => {
    if (row.kind !== "link") return [];
    const content = LinkContent.safeParse(row.content);
    return content.success ? [{
      id: row.id,
      title: row.title,
      url: content.data.url,
      description: content.data.description,
      createdBy: row.created_by,
      createdAt: row.created_at,
    }] : [];
  });
  return { noteId: note?.id || null, notes: parsedNote?.success ? parsedNote.data.body : "", resources };
}

export async function saveMeetingNotes(input: z.input<typeof NotesInput>): Promise<void> {
  const value = NotesInput.parse(input);
  if (!hasSupabaseConfig) {
    const current = readLocal(value.workspaceId, value.meetingId);
    writeLocal(value.workspaceId, value.meetingId, { ...current, noteId: current.noteId || crypto.randomUUID(), notes: value.notes });
    return;
  }

  const supabase = createSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");
  const { data: existing, error: lookupError } = await supabase.from("shared_documents")
    .select("id").eq("workspace_id", value.workspaceId).eq("meeting_id", value.meetingId).eq("kind", "note").maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  const mutation = existing
    ? supabase.from("shared_documents").update({ content: { body: value.notes }, updated_at: new Date().toISOString() }).eq("id", existing.id).eq("workspace_id", value.workspaceId)
    : supabase.from("shared_documents").insert({ workspace_id: value.workspaceId, meeting_id: value.meetingId, title: "Meeting notes", kind: "note", content: { body: value.notes }, created_by: user.id });
  const { error } = await mutation;
  if (error) throw new Error(error.message);
}

export async function addMeetingResource(input: z.input<typeof ResourceInput>): Promise<void> {
  const value = ResourceInput.parse(input);
  if (!hasSupabaseConfig) {
    const current = readLocal(value.workspaceId, value.meetingId);
    const resource: MeetingResource = { id: crypto.randomUUID(), title: value.title, url: value.url, description: value.description, createdBy: "demo-user-1", createdAt: new Date().toISOString() };
    writeLocal(value.workspaceId, value.meetingId, { ...current, resources: [resource, ...current.resources] });
    return;
  }

  const supabase = createSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");
  const { error } = await supabase.from("shared_documents").insert({
    workspace_id: value.workspaceId,
    meeting_id: value.meetingId,
    title: value.title,
    kind: "link",
    content: { url: value.url, description: value.description },
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
}

export async function deleteMeetingResource(workspaceId: string, meetingId: string, resourceId: string): Promise<void> {
  if (!hasSupabaseConfig) {
    const current = readLocal(workspaceId, meetingId);
    writeLocal(workspaceId, meetingId, { ...current, resources: current.resources.filter((item) => item.id !== resourceId) });
    return;
  }
  const { error } = await createSupabaseBrowserClient().from("shared_documents").delete()
    .eq("id", resourceId).eq("workspace_id", workspaceId).eq("meeting_id", meetingId).eq("kind", "link");
  if (error) throw new Error(error.message);
}
