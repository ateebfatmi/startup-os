"use client";

import { useEffect, useState, useCallback } from "react";
import {
  createWorkspaceInvitation,
  fetchWorkspaceInvitations,
  fetchWorkspaceMembers,
  removeWorkspaceMember,
  revokeWorkspaceInvitation,
  updateWorkspaceMemberRole,
} from "./member-service";
import type { WorkspaceInvitation, WorkspaceMember, WorkspaceRole } from "./invitations";
import { hasSupabaseConfig } from "@/lib/supabase/client";

export function useWorkspaceMembers(workspaceId: string) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedMembers, fetchedInvitations] = await Promise.all([
        fetchWorkspaceMembers(workspaceId),
        fetchWorkspaceInvitations(workspaceId),
      ]);
      setMembers(fetchedMembers);
      setInvitations(fetchedInvitations);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load team data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const inviteMember = async (email: string, role: WorkspaceRole) => {
    setError(null);
    setActionSuccess(null);
    try {
      const res = await createWorkspaceInvitation({ workspaceId, email, role });
      setActionSuccess(`Invitation created for ${email}`);
      await reload();
      return res;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create invitation";
      setError(message);
      throw err;
    }
  };

  const revokeInvite = async (invitationId: string) => {
    setError(null);
    setActionSuccess(null);
    try {
      await revokeWorkspaceInvitation({ workspaceId, invitationId });
      setActionSuccess("Invitation revoked");
      await reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to revoke invitation";
      setError(message);
    }
  };

  const updateRole = async (userId: string, role: WorkspaceRole) => {
    setError(null);
    setActionSuccess(null);
    try {
      await updateWorkspaceMemberRole({ workspaceId, userId, role });
      setActionSuccess("Member role updated");
      await reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update member role";
      setError(message);
    }
  };

  const removeMember = async (userId: string) => {
    setError(null);
    setActionSuccess(null);
    try {
      await removeWorkspaceMember({ workspaceId, userId });
      setActionSuccess("Member removed from workspace");
      await reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove member";
      setError(message);
    }
  };

  return {
    members,
    invitations,
    loading,
    error,
    actionSuccess,
    clearMessages: () => {
      setError(null);
      setActionSuccess(null);
    },
    inviteMember,
    revokeInvite,
    updateRole,
    removeMember,
    reload,
    isLocalDemo: !hasSupabaseConfig,
  };
}
