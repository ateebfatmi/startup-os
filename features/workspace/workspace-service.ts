import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member" | "guest";
};

export const DEMO_WORKSPACE: WorkspaceSummary = {
  id: "northstar-demo",
  name: "Northstar Labs",
  slug: "northstar-labs",
  role: "owner",
};

export async function fetchMyWorkspaces(): Promise<WorkspaceSummary[]> {
  if (!hasSupabaseConfig) return [DEMO_WORKSPACE];

  const supabase = createSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(name, slug)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data || []).flatMap((row) => {
    const workspace = Array.isArray(row.workspaces) ? row.workspaces[0] : row.workspaces;
    if (!workspace) return [];
    return [{
      id: row.workspace_id,
      name: workspace.name,
      slug: workspace.slug,
      role: row.role as WorkspaceSummary["role"],
    }];
  });
}
