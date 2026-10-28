import { z } from "zod";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { DEFAULT_OFFICE_DESIGN, type OfficeDesignSettings } from "@/features/virtual-office/office-design";

const DesignSchema = z.object({
  theme: z.enum(["atelier", "biophilic", "midnight"]),
  accentColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  terraceEnabled: z.boolean(),
  plantsEnabled: z.boolean(),
});

const localKey = (workspaceId: string) => `orbit-office-design:${workspaceId}`;

export async function loadOfficeDesign(workspaceId: string): Promise<OfficeDesignSettings> {
  if (!hasSupabaseConfig) {
    try { return DesignSchema.parse(JSON.parse(window.localStorage.getItem(localKey(workspaceId)) || "null")); }
    catch { return DEFAULT_OFFICE_DESIGN; }
  }
  const { data, error } = await createSupabaseBrowserClient().from("office_layouts").select("layout").eq("workspace_id", workspaceId).order("version", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  const layout = (data?.layout || {}) as Record<string, unknown>;
  const parsed = DesignSchema.safeParse(layout.design);
  return parsed.success ? parsed.data : DEFAULT_OFFICE_DESIGN;
}

export async function saveOfficeDesign(workspaceId: string, design: OfficeDesignSettings): Promise<void> {
  const validated = DesignSchema.parse(design);
  if (!hasSupabaseConfig) {
    window.localStorage.setItem(localKey(workspaceId), JSON.stringify(validated));
    return;
  }
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.from("office_layouts").select("id, layout, version").eq("workspace_id", workspaceId).order("version", { ascending: false }).limit(1).single();
  if (error) throw new Error(error.message);
  const layout = (data.layout || {}) as Record<string, unknown>;
  const { error: updateError } = await supabase.from("office_layouts").update({ layout: { ...layout, design: validated }, version: data.version + 1, updated_at: new Date().toISOString() }).eq("id", data.id);
  if (updateError) throw new Error(updateError.message);
}
