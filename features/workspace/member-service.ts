import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";
import {
  AcceptInvitationSchema,
  CreateInvitationSchema,
  computeInvitationStatus,
  generateRawToken,
  hashToken,
  RemoveMemberSchema,
  RevokeInvitationSchema,
  UpdateMemberRoleSchema,
  type InvitationStatus,
  type WorkspaceInvitation,
  type WorkspaceMember,
  type WorkspaceRole,
} from "./invitations";

export const INITIAL_DEMO_MEMBERS: WorkspaceMember[] = [
  {
    workspaceId: "northstar-demo",
    userId: "demo-user-1",
    displayName: "Ateeb Fatmi",
    email: "ateeb@northstar.io",
    role: "owner",
    joinedAt: "2026-01-15T09:00:00.000Z",
  },
  {
    workspaceId: "northstar-demo",
    userId: "demo-user-2",
    displayName: "Sarah Chen",
    email: "sarah@northstar.io",
    role: "admin",
    joinedAt: "2026-02-01T10:30:00.000Z",
  },
  {
    workspaceId: "northstar-demo",
    userId: "demo-user-3",
    displayName: "Marcus Johnson",
    email: "marcus@northstar.io",
    role: "member",
    joinedAt: "2026-02-20T14:15:00.000Z",
  },
  {
    workspaceId: "northstar-demo",
    userId: "demo-user-4",
    displayName: "Elena Rostova",
    email: "elena@contractor.com",
    role: "guest",
    joinedAt: "2026-03-05T16:00:00.000Z",
  },
];

export const INITIAL_DEMO_INVITATIONS: WorkspaceInvitation[] = [
  {
    id: "inv-demo-1",
    workspaceId: "northstar-demo",
    email: "dev@orbit.workspace",
    role: "member",
    tokenHash: hashToken("demo-token-pending-1234567890"),
    invitedBy: "demo-user-1",
    invitedByName: "Ateeb Fatmi",
    expiresAt: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    status: "pending",
  },
  {
    id: "inv-demo-2",
    workspaceId: "northstar-demo",
    email: "alex@northstar.io",
    role: "admin",
    tokenHash: hashToken("demo-token-accepted-1234567890"),
    invitedBy: "demo-user-1",
    invitedByName: "Ateeb Fatmi",
    expiresAt: new Date(Date.now() + 5 * 86400 * 1000).toISOString(),
    acceptedAt: new Date(Date.now() - 1 * 86400 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
    status: "accepted",
  },
  {
    id: "inv-demo-3",
    workspaceId: "northstar-demo",
    email: "old-invite@partner.com",
    role: "guest",
    tokenHash: hashToken("demo-token-expired-1234567890"),
    invitedBy: "demo-user-2",
    invitedByName: "Sarah Chen",
    expiresAt: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 10 * 86400 * 1000).toISOString(),
    status: "expired",
  },
];

const LOCAL_MEMBERS_KEY = "orbit-demo-members";
const LOCAL_INVITES_KEY = "orbit-demo-invitations";

let memoryMembers: WorkspaceMember[] | null = null;
let memoryInvitations: WorkspaceInvitation[] | null = null;

export function getStoredLocalMembers(): WorkspaceMember[] {
  if (typeof window === "undefined") {
    if (!memoryMembers) memoryMembers = [...INITIAL_DEMO_MEMBERS];
    return memoryMembers;
  }
  const data = window.localStorage.getItem(LOCAL_MEMBERS_KEY);
  if (!data) return INITIAL_DEMO_MEMBERS;
  try {
    return JSON.parse(data) as WorkspaceMember[];
  } catch {
    return INITIAL_DEMO_MEMBERS;
  }
}

export function saveStoredLocalMembers(members: WorkspaceMember[]) {
  memoryMembers = members;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify(members));
  }
}

export function getStoredLocalInvitations(): WorkspaceInvitation[] {
  if (typeof window === "undefined") {
    if (!memoryInvitations) memoryInvitations = [...INITIAL_DEMO_INVITATIONS];
    return memoryInvitations;
  }
  const data = window.localStorage.getItem(LOCAL_INVITES_KEY);
  if (!data) return INITIAL_DEMO_INVITATIONS;
  try {
    return JSON.parse(data) as WorkspaceInvitation[];
  } catch {
    return INITIAL_DEMO_INVITATIONS;
  }
}

export function saveStoredLocalInvitations(invites: WorkspaceInvitation[]) {
  memoryInvitations = invites;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCAL_INVITES_KEY, JSON.stringify(invites));
  }
}

export async function fetchWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  if (!hasSupabaseConfig) {
    return getStoredLocalMembers();
  }

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, user_id, role, joined_at, profiles(display_name, avatar_url)")
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(error.message);

  return (data || []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      workspaceId: row.workspace_id,
      userId: row.user_id,
      role: row.role as WorkspaceRole,
      joinedAt: row.joined_at,
      displayName: profile?.display_name || "Workspace Teammate",
      avatarUrl: profile?.avatar_url || null,
    };
  });
}

export async function fetchWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
  if (!hasSupabaseConfig) {
    const invites = getStoredLocalInvitations();
    return invites.map((inv) => ({
      ...inv,
      status: computeInvitationStatus(inv.expiresAt, inv.acceptedAt),
    }));
  }

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("workspace_invitations")
    .select("id, workspace_id, email, role, token_hash, invited_by, expires_at, accepted_at, created_at, profiles:invited_by(display_name)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map((row) => {
    const inviter = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const expiresAt = row.expires_at;
    const acceptedAt = row.accepted_at;
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      email: row.email,
      role: row.role as WorkspaceRole,
      tokenHash: row.token_hash,
      invitedBy: row.invited_by,
      invitedByName: inviter?.display_name || "Teammate",
      expiresAt,
      acceptedAt,
      createdAt: row.created_at,
      status: computeInvitationStatus(expiresAt, acceptedAt),
    };
  });
}

export async function createWorkspaceInvitation(input: {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
}): Promise<{ invitation: WorkspaceInvitation; rawToken: string; inviteUrl: string }> {
  const validated = CreateInvitationSchema.parse(input);
  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();

  if (!hasSupabaseConfig) {
    const localInvites = getStoredLocalInvitations();
    const newInvitation: WorkspaceInvitation = {
      id: `inv-local-${Date.now()}`,
      workspaceId: validated.workspaceId,
      email: validated.email,
      role: validated.role,
      tokenHash,
      invitedBy: "demo-user-1",
      invitedByName: "Ateeb Fatmi",
      expiresAt,
      createdAt: new Date().toISOString(),
      status: "pending",
    };
    saveStoredLocalInvitations([newInvitation, ...localInvites]);
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    return {
      invitation: newInvitation,
      rawToken,
      inviteUrl: `${origin}/invite/accept?token=${rawToken}`,
    };
  }

  const supabase = createSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Verify caller role in workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", validated.workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    throw new Error("Unauthorized: Only owners and admins can create workspace invitations");
  }

  const { data, error } = await supabase
    .from("workspace_invitations")
    .insert({
      workspace_id: validated.workspaceId,
      email: validated.email,
      role: validated.role,
      token_hash: tokenHash,
      invited_by: user.id,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const created: WorkspaceInvitation = {
    id: data.id,
    workspaceId: data.workspace_id,
    email: data.email,
    role: data.role as WorkspaceRole,
    tokenHash: data.token_hash,
    invitedBy: data.invited_by,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
    status: "pending",
  };

  return {
    invitation: created,
    rawToken,
    inviteUrl: `${origin}/invite/accept?token=${rawToken}`,
  };
}

export async function revokeWorkspaceInvitation(input: {
  workspaceId: string;
  invitationId: string;
}): Promise<void> {
  const validated = RevokeInvitationSchema.parse(input);

  if (!hasSupabaseConfig) {
    const localInvites = getStoredLocalInvitations().filter((inv) => inv.id !== validated.invitationId);
    saveStoredLocalInvitations(localInvites);
    return;
  }

  const supabase = createSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", validated.workspaceId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    throw new Error("Unauthorized: Only owners and admins can revoke invitations");
  }

  const { error } = await supabase
    .from("workspace_invitations")
    .delete()
    .eq("id", validated.invitationId)
    .eq("workspace_id", validated.workspaceId);

  if (error) throw new Error(error.message);
}

export async function updateWorkspaceMemberRole(input: {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
}): Promise<void> {
  const validated = UpdateMemberRoleSchema.parse(input);

  if (!hasSupabaseConfig) {
    const members = getStoredLocalMembers();
    const target = members.find((m) => m.userId === validated.userId);
    if (!target) throw new Error("Member not found");

    if (target.role === "owner" && validated.role !== "owner") {
      const ownerCount = members.filter((m) => m.role === "owner").length;
      if (ownerCount <= 1) {
        throw new Error("Cannot demote the final owner of the workspace");
      }
    }

    const updated = members.map((m) => (m.userId === validated.userId ? { ...m, role: validated.role } : m));
    saveStoredLocalMembers(updated);
    return;
  }

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("update_workspace_member_role", {
    target_workspace: validated.workspaceId,
    target_user: validated.userId,
    new_role: validated.role,
  });

  if (error) throw new Error(error.message);
}

export async function removeWorkspaceMember(input: {
  workspaceId: string;
  userId: string;
}): Promise<void> {
  const validated = RemoveMemberSchema.parse(input);

  if (!hasSupabaseConfig) {
    const members = getStoredLocalMembers();
    const target = members.find((m) => m.userId === validated.userId);
    if (!target) throw new Error("Member not found");

    if (target.role === "owner") {
      const ownerCount = members.filter((m) => m.role === "owner").length;
      if (ownerCount <= 1) {
        throw new Error("Cannot remove the final owner of the workspace");
      }
    }

    const updated = members.filter((m) => m.userId !== validated.userId);
    saveStoredLocalMembers(updated);
    return;
  }

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("remove_workspace_member", {
    target_workspace: validated.workspaceId,
    target_user: validated.userId,
  });

  if (error) throw new Error(error.message);
}

export async function getInvitationPreview(rawToken: string): Promise<{
  id?: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: string;
  acceptedAt?: string | null;
  inviterName: string;
  status: InvitationStatus;
}> {
  const validated = AcceptInvitationSchema.parse({ token: rawToken });
  const tokenHash = hashToken(validated.token);

  if (!hasSupabaseConfig) {
    const localInvites = getStoredLocalInvitations();
    const matched = localInvites.find((inv) => inv.tokenHash === tokenHash);
    if (!matched) {
      throw new Error("Invitation not found or invalid token");
    }
    return {
      id: matched.id,
      workspaceId: matched.workspaceId,
      workspaceName: "Northstar Labs",
      email: matched.email,
      role: matched.role,
      expiresAt: matched.expiresAt,
      acceptedAt: matched.acceptedAt,
      inviterName: matched.invitedByName || "Ateeb Fatmi",
      status: computeInvitationStatus(matched.expiresAt, matched.acceptedAt),
    };
  }

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("get_invitation_by_token", {
    token_text: validated.token,
  });

  if (error || !data || data.length === 0) {
    throw new Error("Invitation not found or invalid token");
  }

  const row = data[0];
  const expiresAt = row.expires_at;
  const acceptedAt = row.accepted_at;

  return {
    id: row.id,
    workspaceId: row.workspace_id,
    workspaceName: row.workspace_name,
    email: row.email,
    role: row.role as WorkspaceRole,
    expiresAt,
    acceptedAt,
    inviterName: row.inviter_name,
    status: computeInvitationStatus(expiresAt, acceptedAt),
  };
}

export async function acceptInvitationByToken(rawToken: string): Promise<{ workspaceId: string }> {
  const validated = AcceptInvitationSchema.parse({ token: rawToken });

  if (!hasSupabaseConfig) {
    const localInvites = getStoredLocalInvitations();
    const tokenHash = hashToken(validated.token);
    const matched = localInvites.find((inv) => inv.tokenHash === tokenHash);

    if (!matched) {
      throw new Error("Invitation not found or invalid token");
    }

    if (matched.acceptedAt) throw new Error("Invitation has already been accepted");
    if (new Date(matched.expiresAt).getTime() < Date.now()) throw new Error("Invitation has expired");

    matched.acceptedAt = new Date().toISOString();
    saveStoredLocalInvitations(localInvites);

    const localMembers = getStoredLocalMembers();
    if (!localMembers.some((m) => m.email === matched.email)) {
      localMembers.push({
        workspaceId: matched.workspaceId,
        userId: `user-local-${Date.now()}`,
        displayName: matched.email.split("@")[0] || "New Teammate",
        email: matched.email,
        role: matched.role,
        joinedAt: new Date().toISOString(),
      });
      saveStoredLocalMembers(localMembers);
    }
    return { workspaceId: matched.workspaceId };
  }

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("accept_workspace_invitation", {
    token_text: validated.token,
  });

  if (error) throw new Error(error.message);

  return { workspaceId: data as string };
}
