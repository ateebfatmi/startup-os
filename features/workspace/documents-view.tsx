"use client";

import { Download, FileText, Loader2, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteWorkspaceDocument, fetchWorkspaceDocuments, getWorkspaceDocumentUrl, uploadWorkspaceDocument, type WorkspaceDocument } from "./document-service";

function readableBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsView({ workspaceId }: { workspaceId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<WorkspaceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => { setLoading(true); setError(null); try { setDocuments(await fetchWorkspaceDocuments(workspaceId)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load files"); } finally { setLoading(false); } }, [workspaceId]);
  useEffect(() => { void reload(); }, [reload]);

  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true); setError(null);
    try { await uploadWorkspaceDocument(workspaceId, file); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Upload failed"); }
    finally { setUploading(false); if (input.current) input.current.value = ""; }
  };
  const open = async (document: WorkspaceDocument) => {
    try { const url = await getWorkspaceDocumentUrl(document); if (url) window.open(url, "_blank", "noopener,noreferrer"); else setError("Demo files store metadata only. Connect Supabase for private file downloads."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Download failed"); }
  };
  const remove = async (document: WorkspaceDocument) => {
    if (!confirm(`Delete “${document.fileName}”?`)) return;
    try { await deleteWorkspaceDocument(document); await reload(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Delete failed"); }
  };

  return <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-xs font-bold tracking-[.18em] text-[#4b7a5e]">PRIVATE FILES</div><h2 className="mt-2 text-3xl font-bold tracking-tight">Workspace library</h2><p className="mt-1 text-sm text-[#68736b]">Secure files shared only with members of this workspace.</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => void reload()} disabled={loading}><RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh</Button><input ref={input} type="file" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} /><Button onClick={() => input.current?.click()} disabled={uploading}>{uploading ? <Loader2 className="animate-spin" size={17} /> : <UploadCloud size={17} />} Upload file</Button></div></div>
    <div className="rounded-2xl border border-[#c9ddbc] bg-[#eef6e6] p-4 text-xs leading-5 text-[#315e45]">Files are private, limited to 25 MB, and delivered through one-minute signed URLs. PDF, Office, image, text, CSV, JSON, and ZIP files are accepted.</div>
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {loading ? <div className="flex justify-center p-16 text-[#68736b]"><Loader2 className="animate-spin" /></div> : documents.length === 0 ? <button onClick={() => input.current?.click()} className="w-full rounded-[24px] border-2 border-dashed border-black/10 bg-white/45 p-14 text-center hover:border-[#4b7a5e]"><UploadCloud className="mx-auto text-black/25" size={36} /><h3 className="mt-3 font-bold">Upload the first workspace file</h3><p className="mt-1 text-sm text-[#68736b]">Product briefs, research, decks, and supporting assets belong here.</p></button> : <div className="grid gap-3 md:grid-cols-2">{documents.map((document) => <article key={document.id} className="flex items-center gap-3 rounded-2xl border border-black/[.07] bg-[#fffdf7] p-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#173f2b] text-[#c8f560]"><FileText size={20} /></div><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold">{document.fileName}</h3><p className="mt-1 text-xs text-[#68736b]">{readableBytes(document.size)} · {document.createdByName} · {new Date(document.createdAt).toLocaleDateString()}</p></div><Button variant="ghost" size="icon" onClick={() => void open(document)} aria-label={`Download ${document.fileName}`}><Download size={16} /></Button><Button variant="ghost" size="icon" onClick={() => void remove(document)} aria-label={`Delete ${document.fileName}`} className="text-red-600"><Trash2 size={16} /></Button></article>)}</div>}
  </div>;
}
