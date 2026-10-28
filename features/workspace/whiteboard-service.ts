import { z } from "zod";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";

const PointSchema = z.object({ x: z.number().finite(), y: z.number().finite() });
const BaseElementSchema = z.object({
  id: z.string().min(1),
  color: z.string().max(40),
  clock: z.number().int().nonnegative(),
  clientId: z.string().min(1),
  deleted: z.boolean().default(false),
});
const StrokeSchema = BaseElementSchema.extend({ type: z.literal("stroke"), points: z.array(PointSchema).min(1).max(4_000), size: z.number().min(1).max(40) });
const NoteSchema = BaseElementSchema.extend({ type: z.literal("note"), x: z.number(), y: z.number(), width: z.number().min(80).max(500), height: z.number().min(60).max(400), text: z.string().max(2_000) });
const TextSchema = BaseElementSchema.extend({ type: z.literal("text"), x: z.number(), y: z.number(), width: z.number().min(80).max(700), height: z.number().min(30).max(400), text: z.string().max(4_000), size: z.number().min(10).max(72) });
const ShapeSchema = BaseElementSchema.extend({ type: z.literal("shape"), x: z.number(), y: z.number(), width: z.number().min(20).max(1_000), height: z.number().min(20).max(700), shape: z.enum(["rectangle", "ellipse"]) });
const ElementSchema = z.discriminatedUnion("type", [StrokeSchema, NoteSchema, TextSchema, ShapeSchema]);
const DocumentSchema = z.object({ version: z.literal(2), elements: z.array(ElementSchema).max(10_000) });
const OperationSchema = z.object({ id: z.string().min(1), boardId: z.string().min(1), element: ElementSchema });

export type WhiteboardElement = z.infer<typeof ElementSchema>;
export type WhiteboardDocument = z.infer<typeof DocumentSchema>;
export type WhiteboardOperation = z.infer<typeof OperationSchema>;
export type WhiteboardRecord = { id: string; document: WhiteboardDocument };

const emptyDocument = (): WhiteboardDocument => ({ version: 2, elements: [] });
const localKey = (workspaceId: string) => `orbit-whiteboard:${workspaceId}:main`;

export function compareElementVersion(left: Pick<WhiteboardElement, "clock" | "clientId">, right: Pick<WhiteboardElement, "clock" | "clientId">) {
  if (left.clock !== right.clock) return left.clock - right.clock;
  return left.clientId.localeCompare(right.clientId);
}

export function mergeWhiteboardElement(elements: WhiteboardElement[], incoming: WhiteboardElement): WhiteboardElement[] {
  const current = elements.find((element) => element.id === incoming.id);
  if (current && compareElementVersion(current, incoming) >= 0) return elements;
  return current
    ? elements.map((element) => element.id === incoming.id ? incoming : element)
    : [...elements, incoming];
}

export function parseWhiteboardDocument(value: unknown): WhiteboardDocument {
  const parsed = DocumentSchema.safeParse(value);
  return parsed.success ? parsed.data : emptyDocument();
}

export async function loadWhiteboard(workspaceId: string): Promise<WhiteboardRecord> {
  if (!hasSupabaseConfig) {
    try {
      return { id: `${workspaceId}:main`, document: parseWhiteboardDocument(JSON.parse(window.localStorage.getItem(localKey(workspaceId)) || "")) };
    } catch {
      return { id: `${workspaceId}:main`, document: emptyDocument() };
    }
  }

  const supabase = createSupabaseBrowserClient();
  const { data: existing, error: lookupError } = await supabase.from("whiteboards")
    .select("id, document").eq("workspace_id", workspaceId).eq("name", "Spatial Whiteboard")
    .order("created_at").limit(1).maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (existing) return { id: existing.id, document: parseWhiteboardDocument(existing.document) };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");
  const { data, error } = await supabase.from("whiteboards").insert({
    workspace_id: workspaceId,
    name: "Spatial Whiteboard",
    document: emptyDocument(),
    updated_by: user.id,
  }).select("id, document").single();
  if (error) throw new Error(error.message);
  return { id: data.id, document: parseWhiteboardDocument(data.document) };
}

export async function saveWhiteboard(workspaceId: string, board: WhiteboardRecord): Promise<void> {
  const document = DocumentSchema.parse(board.document);
  if (!hasSupabaseConfig) {
    window.localStorage.setItem(localKey(workspaceId), JSON.stringify(document));
    return;
  }
  const supabase = createSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");
  const { error } = await supabase.from("whiteboards").update({ document, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq("id", board.id).eq("workspace_id", workspaceId);
  if (error) throw new Error(error.message);
}

export function connectWhiteboardChannel(workspaceId: string, boardId: string, receive: (operation: WhiteboardOperation) => void) {
  const channelName = `whiteboard:${workspaceId}:${boardId}`;
  if (!hasSupabaseConfig) {
    const channel = new BroadcastChannel(channelName);
    channel.onmessage = (event) => {
      const parsed = OperationSchema.safeParse(event.data);
      if (parsed.success) receive(parsed.data);
    };
    return { publish: (operation: WhiteboardOperation) => channel.postMessage(OperationSchema.parse(operation)), close: () => channel.close() };
  }

  const supabase = createSupabaseBrowserClient();
  const pending: WhiteboardOperation[] = [];
  let ready = false;
  const channel = supabase.channel(channelName, { config: { broadcast: { self: false, ack: false } } })
    .on("broadcast", { event: "operation" }, ({ payload }) => {
      const parsed = OperationSchema.safeParse(payload);
      if (parsed.success) receive(parsed.data);
    })
    .subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      ready = true;
      pending.splice(0).forEach((operation) => void channel.send({ type: "broadcast", event: "operation", payload: operation }));
    });
  return {
    publish: (operation: WhiteboardOperation) => {
      const parsed = OperationSchema.parse(operation);
      if (!ready) pending.push(parsed);
      else void channel.send({ type: "broadcast", event: "operation", payload: parsed });
    },
    close: () => { void supabase.removeChannel(channel); },
  };
}
