import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";

export type ActivityEvent = {
  id: string;
  workspaceId: string;
  actorId: string | null;
  actorName: string;
  verb: "insert" | "update" | "delete" | string;
  objectType: string;
  objectId: string | null;
  name: string | null;
  createdAt: string;
};

const DEMO_ACTIVITY: ActivityEvent[] = [
  { id: "activity-1", workspaceId: "northstar-demo", actorId: "demo-user-1", actorName: "Ateeb Fatmi", verb: "update", objectType: "tasks", objectId: "task-1", name: "Confirm launch narrative", createdAt: new Date(Date.now() - 18 * 60_000).toISOString() },
  { id: "activity-2", workspaceId: "northstar-demo", actorId: "demo-user-2", actorName: "Sarah Chen", verb: "insert", objectType: "task_comments", objectId: "task-2", name: null, createdAt: new Date(Date.now() - 70 * 60_000).toISOString() },
  { id: "activity-3", workspaceId: "northstar-demo", actorId: "demo-user-1", actorName: "Ateeb Fatmi", verb: "insert", objectType: "projects", objectId: "proj-1", name: "Launch", createdAt: new Date(Date.now() - 26 * 3_600_000).toISOString() },
];

export async function fetchWorkspaceActivity(workspaceId: string, limit = 50): Promise<ActivityEvent[]> {
  if (!hasSupabaseConfig) return DEMO_ACTIVITY;

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("activity_events")
    .select("id, workspace_id, actor_id, verb, object_type, object_id, metadata, created_at, profiles:actor_id(display_name)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));

  if (error) throw new Error(error.message);

  return (data || []).map((row) => {
    const actor = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const metadata = (row.metadata || {}) as Record<string, unknown>;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      actorId: row.actor_id,
      actorName: actor?.display_name || "Orbit teammate",
      verb: row.verb,
      objectType: row.object_type,
      objectId: row.object_id,
      name: typeof metadata.name === "string" ? metadata.name : null,
      createdAt: row.created_at,
    };
  });
}

export function describeActivity(event: ActivityEvent): string {
  const action = event.verb === "insert" ? "created" : event.verb === "delete" ? "deleted" : "updated";
  const object = ({
    projects: "project",
    tasks: "task",
    task_comments: "comment",
    shared_documents: "file",
    workspace_members: "membership",
    objectives: "objective",
    key_results: "key result",
    meetings: "meeting",
  } as Record<string, string>)[event.objectType] || event.objectType.replaceAll("_", " ");
  return `${action} ${object}${event.name ? ` “${event.name}”` : ""}`;
}
