import crypto from "crypto";
import { z } from "zod";

export type WorkspaceRole = "owner" | "admin" | "member" | "guest";

export type InvitationStatus = "pending" | "accepted" | "expired";

export type WorkspaceMember = {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  displayName: string;
  avatarUrl?: string | null;
  email?: string | null;
};

export type WorkspaceInvitation = {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  tokenHash: string;
  invitedBy: string;
  invitedByName?: string;
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
  status: InvitationStatus;
};

export const CreateInvitationSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["owner", "admin", "member", "guest"]),
});

export const UpdateMemberRoleSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["owner", "admin", "member", "guest"]),
});

export const RemoveMemberSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  userId: z.string().min(1, "User ID is required"),
});

export const RevokeInvitationSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  invitationId: z.string().min(1, "Invitation ID is required"),
});

export const AcceptInvitationSchema = z.object({
  token: z.string().min(10, "Invalid invitation token"),
});

export function generateRawToken(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function computeInvitationStatus(expiresAt: string, acceptedAt?: string | null): InvitationStatus {
  if (acceptedAt) return "accepted";
  if (new Date(expiresAt).getTime() < Date.now()) return "expired";
  return "pending";
}
