import { z } from "zod";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { OFFICE_ASSET_KEYS, OFFICE_OBJECT_CATALOG, type OfficeObject } from "@/features/virtual-office/office-object-catalog";

const TransformSchema = z.object({
  x: z.number().min(-10.5).max(10.5),
  y: z.number().min(0).max(4).default(0),
  z: z.number().min(-6.5).max(10.5),
  rotationY: z.number().min(-Math.PI * 2).max(Math.PI * 2).default(0),
  scale: z.number().min(0.5).max(2).default(1),
});
const AssetSchema = z.enum(OFFICE_ASSET_KEYS as [typeof OFFICE_ASSET_KEYS[number], ...typeof OFFICE_ASSET_KEYS]);
const localKey = (workspaceId: string) => `orbit-office-objects:${workspaceId}`;

function localObjects(workspaceId: string): OfficeObject[] {
  try { return z.array(z.object({ id: z.string(), assetKey: AssetSchema, transform: TransformSchema })).parse(JSON.parse(window.localStorage.getItem(localKey(workspaceId)) || "[]")).map((object) => ({ ...object, interaction: OFFICE_OBJECT_CATALOG[object.assetKey].interaction || null })); }
  catch { return []; }
}

async function latestLayoutId(workspaceId: string) {
  const { data, error } = await createSupabaseBrowserClient().from("office_layouts").select("id").eq("workspace_id", workspaceId).order("version", { ascending: false }).limit(1).single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function loadOfficeObjects(workspaceId: string): Promise<OfficeObject[]> {
  if (!hasSupabaseConfig) return localObjects(workspaceId);
  const supabase = createSupabaseBrowserClient();
  const layoutId = await latestLayoutId(workspaceId);
  const { data, error } = await supabase.from("office_objects").select("id, asset_key, transform, interaction").eq("office_layout_id", layoutId).order("created_at");
  if (error) throw new Error(error.message);
  return (data || []).flatMap((row) => {
    const asset = AssetSchema.safeParse(row.asset_key); const transform = TransformSchema.safeParse(row.transform);
    if (!asset.success || !transform.success) return [];
    return [{ id: row.id, assetKey: asset.data, transform: transform.data, interaction: OFFICE_OBJECT_CATALOG[asset.data].interaction || null }];
  });
}

export async function createOfficeObject(workspaceId: string, assetKey: string, transform: z.input<typeof TransformSchema>): Promise<OfficeObject[]> {
  const asset = AssetSchema.parse(assetKey); const validated = TransformSchema.parse(transform);
  const current = await loadOfficeObjects(workspaceId);
  if (current.length >= 25) throw new Error("Office layouts support up to 25 custom objects");
  if (!hasSupabaseConfig) {
    const next = [...current, { id: crypto.randomUUID(), assetKey: asset, transform: validated, interaction: OFFICE_OBJECT_CATALOG[asset].interaction || null }];
    window.localStorage.setItem(localKey(workspaceId), JSON.stringify(next)); return next;
  }
  const layoutId = await latestLayoutId(workspaceId);
  const { error } = await createSupabaseBrowserClient().from("office_objects").insert({ office_layout_id: layoutId, asset_key: asset, transform: validated, interaction: OFFICE_OBJECT_CATALOG[asset].interaction || null });
  if (error) throw new Error(error.message);
  return loadOfficeObjects(workspaceId);
}

export async function deleteOfficeObject(workspaceId: string, objectId: string): Promise<OfficeObject[]> {
  if (!hasSupabaseConfig) {
    const next = localObjects(workspaceId).filter((object) => object.id !== objectId);
    window.localStorage.setItem(localKey(workspaceId), JSON.stringify(next)); return next;
  }
  const layoutId = await latestLayoutId(workspaceId);
  const { error } = await createSupabaseBrowserClient().from("office_objects").delete().eq("id", objectId).eq("office_layout_id", layoutId);
  if (error) throw new Error(error.message);
  return loadOfficeObjects(workspaceId);
}
