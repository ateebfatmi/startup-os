import { z } from "zod";

export const MovementUpdateSchema = z.object({
  x: z.number().min(-50).max(50),
  z: z.number().min(-50).max(50),
  rotation: z.number(),
  animation: z.enum(["idle", "walking", "sitting", "talking", "away"]).default("idle"),
  roomId: z.string().optional(),
  status: z.enum(["available", "busy", "away", "in-meeting"]).default("available"),
});

export type MovementUpdate = z.infer<typeof MovementUpdateSchema>;

export interface ServerPlayer {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  color: string;
  x: number;
  z: number;
  rotation: number;
  animation: "idle" | "walking" | "sitting" | "talking" | "away";
  status: "available" | "busy" | "away" | "in-meeting";
  roomId?: string;
  socketId: string;
  updatedAt: number;
}
