import { z } from "zod";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";

export const MAX_WORKSPACE_FILE_BYTES = 25 * 1024 * 1024;
export const ALLOWED_WORKSPACE_FILE_TYPES = new Set([
  "application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain", "text/csv",
  "application/json", "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export type WorkspaceDocument = {
  id: string;
  workspaceId: string;
  title: string;
  fileName: string;
  mimeType: string;
  size: number;
  storagePath: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: string;
};

const DocumentMetadataSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
});

const LOCAL_DOCUMENTS_KEY = "orbit-demo-documents";

function localDocuments(): WorkspaceDocument[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(LOCAL_DOCUMENTS_KEY) || "[]") as WorkspaceDocument[]; }
  catch { return []; }
}

export function validateWorkspaceFile(file: Pick<File, "size" | "type" | "name">) {
  if (file.size > MAX_WORKSPACE_FILE_BYTES) throw new Error("Files must be 25 MB or smaller");
  if (!ALLOWED_WORKSPACE_FILE_TYPES.has(file.type)) throw new Error(`Unsupported file type for ${file.name}`);
}

export async function fetchWorkspaceDocuments(workspaceId: string): Promise<WorkspaceDocument[]> {
  if (!hasSupabaseConfig) return localDocuments().filter((item) => item.workspaceId === workspaceId);
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("shared_documents")
    .select("id, workspace_id, title, content, storage_path, created_by, created_at, profiles:created_by(display_name)")
    .eq("workspace_id", workspaceId)
    .eq("kind", "file")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).flatMap((row) => {
    const parsed = DocumentMetadataSchema.safeParse(row.content);
    if (!parsed.success) return [];
    const creator = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return [{ id: row.id, workspaceId: row.workspace_id, title: row.title, ...parsed.data, storagePath: row.storage_path, createdBy: row.created_by, createdByName: creator?.display_name || "Teammate", createdAt: row.created_at }];
  });
}

export async function uploadWorkspaceDocument(workspaceId: string, file: File): Promise<void> {
  validateWorkspaceFile(file);
  if (!hasSupabaseConfig) {
    const next: WorkspaceDocument = { id: crypto.randomUUID(), workspaceId, title: file.name, fileName: file.name, mimeType: file.type, size: file.size, storagePath: null, createdBy: "demo-user-1", createdByName: "Ateeb Fatmi", createdAt: new Date().toISOString() };
    window.localStorage.setItem(LOCAL_DOCUMENTS_KEY, JSON.stringify([next, ...localDocuments()]));
    return;
  }
  const supabase = createSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");
  const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "file";
  const storagePath = `${workspaceId}/${user.id}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from("workspace-files").upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);
  const { error: recordError } = await supabase.from("shared_documents").insert({ workspace_id: workspaceId, title: file.name, kind: "file", content: { fileName: file.name, mimeType: file.type, size: file.size }, storage_path: storagePath, created_by: user.id });
  if (recordError) {
    await supabase.storage.from("workspace-files").remove([storagePath]);
    throw new Error(recordError.message);
  }
}

export async function getWorkspaceDocumentUrl(document: WorkspaceDocument): Promise<string | null> {
  if (!document.storagePath || !hasSupabaseConfig) return null;
  const { data, error } = await createSupabaseBrowserClient().storage.from("workspace-files").createSignedUrl(document.storagePath, 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function deleteWorkspaceDocument(document: WorkspaceDocument): Promise<void> {
  if (!hasSupabaseConfig) {
    window.localStorage.setItem(LOCAL_DOCUMENTS_KEY, JSON.stringify(localDocuments().filter((item) => item.id !== document.id)));
    return;
  }
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("shared_documents").delete().eq("id", document.id).eq("workspace_id", document.workspaceId);
  if (error) throw new Error(error.message);
  if (document.storagePath) await supabase.storage.from("workspace-files").remove([document.storagePath]);
}
