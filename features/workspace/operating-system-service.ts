import { z } from "zod";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";

export type Meeting = { id: string; workspaceId: string; title: string; agenda: string; startsAt: string; endsAt: string; timezone: string; status: "scheduled" | "active" | "completed" | "cancelled"; createdBy: string };
export type KeyResult = { id: string; objectiveId: string; title: string; unit: "number" | "percent" | "currency" | "boolean"; startValue: number; currentValue: number; targetValue: number };
export type Objective = { id: string; workspaceId: string; title: string; description: string; status: "draft" | "active" | "completed" | "cancelled"; ownerId: string | null; startsAt: string; dueAt: string | null; createdBy: string; keyResults: KeyResult[] };
export type WorkspaceNotification = { id: string; title: string; body: string; kind: string; readAt: string | null; createdAt: string };

const MeetingInput = z.object({ workspaceId: z.string().min(1), title: z.string().trim().min(1).max(180), agenda: z.string().trim().max(5000).default(""), startsAt: z.string().datetime(), endsAt: z.string().datetime(), timezone: z.string().min(1).max(80) }).refine((value) => new Date(value.endsAt) > new Date(value.startsAt), { message: "Meeting end must be after its start" });
const ObjectiveInput = z.object({ workspaceId: z.string().min(1), title: z.string().trim().min(1).max(180), description: z.string().trim().max(3000).default(""), dueAt: z.string().nullable(), keyResultTitle: z.string().trim().min(1).max(220), targetValue: z.number().positive() });

const meetingsKey = (workspaceId: string) => `orbit-meetings:${workspaceId}`;
const objectivesKey = (workspaceId: string) => `orbit-objectives:${workspaceId}`;
const readLocal = <T>(key: string, fallback: T): T => { if (typeof window === "undefined") return fallback; try { return JSON.parse(window.localStorage.getItem(key) || "") as T; } catch { return fallback; } };

const demoMeetings = (workspaceId: string): Meeting[] => [{ id: "meeting-weekly", workspaceId, title: "Weekly product pulse", agenda: "Review launch blockers and assign owners.", startsAt: new Date(Date.now() + 3_600_000).toISOString(), endsAt: new Date(Date.now() + 5_400_000).toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, status: "scheduled", createdBy: "demo-user-1" }];
const demoObjectives = (workspaceId: string): Objective[] => [{ id: "objective-launch", workspaceId, title: "Launch a lovable private beta", description: "Prove activation and weekly team engagement.", status: "active", ownerId: "demo-user-1", startsAt: new Date().toISOString().slice(0, 10), dueAt: new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10), createdBy: "demo-user-1", keyResults: [{ id: "kr-teams", objectiveId: "objective-launch", title: "Activate 20 startup teams", unit: "number", startValue: 0, currentValue: 8, targetValue: 20 }] }];

export async function fetchMeetings(workspaceId: string): Promise<Meeting[]> {
  if (!hasSupabaseConfig) return readLocal(meetingsKey(workspaceId), demoMeetings(workspaceId));
  const { data, error } = await createSupabaseBrowserClient().from("meetings").select("id, workspace_id, title, agenda, starts_at, ends_at, timezone, status, created_by").eq("workspace_id", workspaceId).order("starts_at");
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({ id: row.id, workspaceId: row.workspace_id, title: row.title, agenda: row.agenda, startsAt: row.starts_at, endsAt: row.ends_at, timezone: row.timezone, status: row.status, createdBy: row.created_by }));
}

export async function createMeeting(input: z.input<typeof MeetingInput>): Promise<void> {
  const value = MeetingInput.parse(input);
  if (!hasSupabaseConfig) { const current = readLocal(meetingsKey(value.workspaceId), demoMeetings(value.workspaceId)); window.localStorage.setItem(meetingsKey(value.workspaceId), JSON.stringify([...current, { id: crypto.randomUUID(), ...value, status: "scheduled", createdBy: "demo-user-1" }].sort((a, b) => a.startsAt.localeCompare(b.startsAt)))); return; }
  const supabase = createSupabaseBrowserClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Authentication required");
  const { error } = await supabase.from("meetings").insert({ workspace_id: value.workspaceId, title: value.title, agenda: value.agenda, starts_at: value.startsAt, ends_at: value.endsAt, timezone: value.timezone, created_by: user.id });
  if (error) throw new Error(error.message);
}

export async function fetchObjectives(workspaceId: string): Promise<Objective[]> {
  if (!hasSupabaseConfig) return readLocal(objectivesKey(workspaceId), demoObjectives(workspaceId));
  const { data, error } = await createSupabaseBrowserClient().from("objectives").select("id, workspace_id, title, description, status, owner_id, starts_at, due_at, created_by, key_results(id, objective_id, title, unit, start_value, current_value, target_value)").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({ id: row.id, workspaceId: row.workspace_id, title: row.title, description: row.description, status: row.status, ownerId: row.owner_id, startsAt: row.starts_at, dueAt: row.due_at, createdBy: row.created_by, keyResults: (row.key_results || []).map((kr) => ({ id: kr.id, objectiveId: kr.objective_id, title: kr.title, unit: kr.unit, startValue: Number(kr.start_value), currentValue: Number(kr.current_value), targetValue: Number(kr.target_value) })) }));
}

export async function createObjective(input: z.input<typeof ObjectiveInput>): Promise<void> {
  const value = ObjectiveInput.parse(input);
  if (!hasSupabaseConfig) { const current = readLocal(objectivesKey(value.workspaceId), demoObjectives(value.workspaceId)); const id = crypto.randomUUID(); const objective: Objective = { id, workspaceId: value.workspaceId, title: value.title, description: value.description, status: "active", ownerId: "demo-user-1", startsAt: new Date().toISOString().slice(0, 10), dueAt: value.dueAt, createdBy: "demo-user-1", keyResults: [{ id: crypto.randomUUID(), objectiveId: id, title: value.keyResultTitle, unit: "number", startValue: 0, currentValue: 0, targetValue: value.targetValue }] }; window.localStorage.setItem(objectivesKey(value.workspaceId), JSON.stringify([objective, ...current])); return; }
  const supabase = createSupabaseBrowserClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Authentication required");
  const { data: objective, error } = await supabase.from("objectives").insert({ workspace_id: value.workspaceId, title: value.title, description: value.description, due_at: value.dueAt, owner_id: user.id, created_by: user.id }).select("id").single();
  if (error) throw new Error(error.message);
  const { error: krError } = await supabase.from("key_results").insert({ workspace_id: value.workspaceId, objective_id: objective.id, title: value.keyResultTitle, target_value: value.targetValue, owner_id: user.id });
  if (krError) { await supabase.from("objectives").delete().eq("id", objective.id); throw new Error(krError.message); }
}

export async function updateKeyResult(workspaceId: string, objectiveId: string, keyResultId: string, currentValue: number): Promise<void> {
  if (!Number.isFinite(currentValue)) throw new Error("Progress must be a number");
  if (!hasSupabaseConfig) { const current = readLocal(objectivesKey(workspaceId), demoObjectives(workspaceId)).map((objective) => objective.id === objectiveId ? { ...objective, keyResults: objective.keyResults.map((kr) => kr.id === keyResultId ? { ...kr, currentValue } : kr) } : objective); window.localStorage.setItem(objectivesKey(workspaceId), JSON.stringify(current)); return; }
  const { error } = await createSupabaseBrowserClient().from("key_results").update({ current_value: currentValue, updated_at: new Date().toISOString() }).eq("id", keyResultId).eq("workspace_id", workspaceId).eq("objective_id", objectiveId);
  if (error) throw new Error(error.message);
}

export async function fetchNotifications(): Promise<WorkspaceNotification[]> {
  if (!hasSupabaseConfig) return [{ id: "notification-demo", title: "Welcome to Orbit", body: "Your workspace operating system is ready.", kind: "welcome", readAt: null, createdAt: new Date().toISOString() }];
  const { data, error } = await createSupabaseBrowserClient().from("notifications").select("id, title, body, kind, read_at, created_at").order("created_at", { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({ id: row.id, title: row.title, body: row.body, kind: row.kind, readAt: row.read_at, createdAt: row.created_at }));
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!hasSupabaseConfig) return;
  const { error } = await createSupabaseBrowserClient().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
}
