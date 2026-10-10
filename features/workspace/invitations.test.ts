import { describe, expect, it, beforeEach } from "vitest";
import {
  computeInvitationStatus,
  CreateInvitationSchema,
  generateRawToken,
  hashToken,
  RemoveMemberSchema,
  UpdateMemberRoleSchema,
} from "./invitations";
import {
  acceptInvitationByToken,
  createWorkspaceInvitation,
  fetchWorkspaceInvitations,
  fetchWorkspaceMembers,
  getInvitationPreview,
  getStoredLocalInvitations,
  getStoredLocalMembers,
  INITIAL_DEMO_INVITATIONS,
  INITIAL_DEMO_MEMBERS,
  removeWorkspaceMember,
  saveStoredLocalInvitations,
  saveStoredLocalMembers,
  updateWorkspaceMemberRole,
} from "./member-service";

describe("Workspace Invitations & Member Administration", () => {
  beforeEach(() => {
    // Reset local demo storage state before each test
    saveStoredLocalMembers([...INITIAL_DEMO_MEMBERS]);
    saveStoredLocalInvitations([...INITIAL_DEMO_INVITATIONS]);
  });

  describe("Token hashing and expiration", () => {
    it("generates 64-character raw tokens and computes SHA-256 hashes", () => {
      const rawToken = generateRawToken();
      expect(rawToken).toHaveLength(64);

      const hashed = hashToken(rawToken);
      expect(hashed).toHaveLength(64);
      expect(hashed).not.toBe(rawToken);
      expect(hashToken(rawToken)).toBe(hashed); // Deterministic
    });

    it("correctly computes invitation status based on expiration and acceptance", () => {
      const future = new Date(Date.now() + 86400000).toISOString();
      const past = new Date(Date.now() - 86400000).toISOString();

      expect(computeInvitationStatus(future, null)).toBe("pending");
      expect(computeInvitationStatus(past, null)).toBe("expired");
      expect(computeInvitationStatus(future, past)).toBe("accepted");
    });
  });

  describe("Input validation with Zod", () => {
    it("validates email formatting and roles on invitation creation", () => {
      expect(() =>
        CreateInvitationSchema.parse({
          workspaceId: "ws-1",
          email: "invalid-email",
          role: "member",
        }),
      ).toThrow();

      expect(() =>
        CreateInvitationSchema.parse({
          workspaceId: "ws-1",
          email: "valid@company.com",
          role: "invalid-role" as any,
        }),
      ).toThrow();

      const valid = CreateInvitationSchema.parse({
        workspaceId: "ws-1",
        email: "valid@company.com",
        role: "admin",
      });
      expect(valid.email).toBe("valid@company.com");
      expect(valid.role).toBe("admin");
    });

    it("validates role update and member removal schemas", () => {
      expect(() =>
        UpdateMemberRoleSchema.parse({
          workspaceId: "ws-1",
          userId: "u-1",
          role: "god" as any,
        }),
      ).toThrow();

      const validRoleUpdate = UpdateMemberRoleSchema.parse({
        workspaceId: "ws-1",
        userId: "u-1",
        role: "owner",
      });
      expect(validRoleUpdate.role).toBe("owner");

      const validRemove = RemoveMemberSchema.parse({
        workspaceId: "ws-1",
        userId: "u-1",
      });
      expect(validRemove.userId).toBe("u-1");
    });
  });

  describe("Authorized invitation creation and preview", () => {
    it("creates invitations with raw token output and hashes stored token", async () => {
      const result = await createWorkspaceInvitation({
        workspaceId: "northstar-demo",
        email: "newteammate@company.com",
        role: "member",
      });

      expect(result.rawToken).toHaveLength(64);
      expect(result.inviteUrl).toContain(`/invite/accept?token=${result.rawToken}`);

      // Verify token in local storage is hashed, not raw
      const invites = getStoredLocalInvitations();
      const stored = invites.find((inv) => inv.email === "newteammate@company.com");
      expect(stored).toBeDefined();
      expect(stored?.tokenHash).toBe(hashToken(result.rawToken));
      expect(stored?.tokenHash).not.toBe(result.rawToken);
    });

    it("previews invitation details when valid token is provided", async () => {
      const created = await createWorkspaceInvitation({
        workspaceId: "northstar-demo",
        email: "preview@company.com",
        role: "admin",
      });

      const preview = await getInvitationPreview(created.rawToken);
      expect(preview.email).toBe("preview@company.com");
      expect(preview.role).toBe("admin");
      expect(preview.status).toBe("pending");
    });
  });

  describe("Single-use acceptance & expiration", () => {
    it("accepts a pending invitation and enforces single-use policy", async () => {
      const created = await createWorkspaceInvitation({
        workspaceId: "northstar-demo",
        email: "singleuse@company.com",
        role: "member",
      });

      const acceptRes = await acceptInvitationByToken(created.rawToken);
      expect(acceptRes.workspaceId).toBe("northstar-demo");

      // Verify member added
      const members = await fetchWorkspaceMembers("northstar-demo");
      expect(members.some((m) => m.email === "singleuse@company.com")).toBe(true);

      // Attempting second acceptance must throw
      await expect(acceptInvitationByToken(created.rawToken)).rejects.toThrow(
        /already been accepted/i,
      );
    });

    it("rejects acceptance of expired invitations", async () => {
      const rawToken = "demo-expired-token-1234567890";
      const expiredInv = {
        id: "inv-exp-test",
        workspaceId: "northstar-demo",
        email: "expired@company.com",
        role: "member" as const,
        tokenHash: hashToken(rawToken),
        invitedBy: "demo-user-1",
        expiresAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        status: "expired" as const,
      };

      saveStoredLocalInvitations([expiredInv, ...getStoredLocalInvitations()]);

      await expect(acceptInvitationByToken(rawToken)).rejects.toThrow(/expired/i);
    });
  });

  describe("Final-owner protection & role enforcement", () => {
    it("prevents demoting the sole owner of a workspace", async () => {
      // Demo dataset has 1 owner: demo-user-1
      const members = getStoredLocalMembers();
      const owners = members.filter((m) => m.role === "owner");
      expect(owners).toHaveLength(1);

      const soleOwner = owners[0];

      await expect(
        updateWorkspaceMemberRole({
          workspaceId: "northstar-demo",
          userId: soleOwner.userId,
          role: "admin",
        }),
      ).rejects.toThrow(/final owner/i);
    });

    it("prevents removing the sole owner of a workspace", async () => {
      const members = getStoredLocalMembers();
      const soleOwner = members.find((m) => m.role === "owner")!;

      await expect(
        removeWorkspaceMember({
          workspaceId: "northstar-demo",
          userId: soleOwner.userId,
        }),
      ).rejects.toThrow(/final owner/i);
    });

    it("allows role updates and member removal when multiple owners exist", async () => {
      // Add a second owner
      const members = getStoredLocalMembers();
      members.push({
        workspaceId: "northstar-demo",
        userId: "demo-user-owner2",
        displayName: "Second Owner",
        email: "owner2@company.com",
        role: "owner",
        joinedAt: new Date().toISOString(),
      });
      saveStoredLocalMembers(members);

      // Now demoting first owner should succeed
      await updateWorkspaceMemberRole({
        workspaceId: "northstar-demo",
        userId: "demo-user-1",
        role: "admin",
      });

      const updatedMembers = getStoredLocalMembers();
      expect(updatedMembers.find((m) => m.userId === "demo-user-1")?.role).toBe("admin");

      // Removing Second Owner should also succeed since demo-user-1 was demoted? Wait, now Second Owner is sole owner!
      // Attempting to remove Second Owner must fail because he is now sole owner:
      await expect(
        removeWorkspaceMember({
          workspaceId: "northstar-demo",
          userId: "demo-user-owner2",
        }),
      ).rejects.toThrow(/final owner/i);
    });

    it("allows non-owner member removal", async () => {
      // Remove demo-user-4 (guest)
      await removeWorkspaceMember({
        workspaceId: "northstar-demo",
        userId: "demo-user-4",
      });

      const updatedMembers = getStoredLocalMembers();
      expect(updatedMembers.some((m) => m.userId === "demo-user-4")).toBe(false);
    });
  });
});
