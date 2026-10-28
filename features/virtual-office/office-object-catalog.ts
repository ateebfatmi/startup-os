import type { Collider, InteractionKind } from "./types";

export type OfficeAssetKey = "planter" | "floor_lamp" | "lounge_bench" | "whiteboard" | "focus_pod";
export type OfficeObjectTransform = { x: number; y: number; z: number; rotationY: number; scale: number };
export type OfficeObject = { id: string; assetKey: OfficeAssetKey; transform: OfficeObjectTransform; interaction: { kind: InteractionKind; label: string } | null };

export const OFFICE_OBJECT_CATALOG: Record<OfficeAssetKey, { label: string; width: number; depth: number; interaction?: { kind: InteractionKind; label: string } }> = {
  planter: { label: "Architectural planter", width: 0.9, depth: 0.9 },
  floor_lamp: { label: "Brass floor lamp", width: 0.65, depth: 0.65 },
  lounge_bench: { label: "Tailored lounge bench", width: 2.4, depth: 0.9 },
  whiteboard: { label: "Collaboration whiteboard", width: 2.4, depth: 0.45, interaction: { kind: "whiteboard", label: "Open collaborative whiteboard" } },
  focus_pod: { label: "Acoustic focus pod", width: 1.5, depth: 1.5, interaction: { kind: "focus", label: "Start a focus session" } },
};

export const OFFICE_ASSET_KEYS = Object.keys(OFFICE_OBJECT_CATALOG) as OfficeAssetKey[];

export function officeObjectCollider(object: OfficeObject): Collider {
  const asset = OFFICE_OBJECT_CATALOG[object.assetKey];
  const quarterTurn = Math.abs(Math.sin(object.transform.rotationY)) > Math.SQRT1_2;
  return {
    id: `custom-${object.id}`,
    x: object.transform.x,
    z: object.transform.z,
    width: (quarterTurn ? asset.depth : asset.width) * object.transform.scale,
    depth: (quarterTurn ? asset.width : asset.depth) * object.transform.scale,
  };
}
