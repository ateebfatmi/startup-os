"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  Clock,
  Copy,
  Crown,
  KeyRound,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { initialsFor } from "@/features/auth/auth-utils";
import type { WorkspaceRole, InvitationStatus } from "./invitations";
import { useWorkspaceMembers } from "./use-workspace-members";

const ROLE_BADGES: Record<WorkspaceRole, { label: string; style: string; icon: typeof Crown }> = {
  owner: { label: "Owner", style: "bg-[#173f2b] text-[#c8f560] font-bold", icon: Crown },
  admin: { label: "Admin", style: "bg-[#e2eafc] text-[#1d3557] font-semibold", icon: Shield },
  member: { label: "Member", style: "bg-black/5 text-[#4a5568]", icon: Users },
  guest: { label: "Guest", style: "bg-[#fff3bf] text-[#8f6b00]", icon: UserCheck },
};

export function TeamView({ workspaceId }: { workspaceId: string }) {
  const {
    members,
    invitations,
    loading,
    error,
    actionSuccess,
    clearMessages,
    inviteMember,
    revokeInvite,
    updateRole,
    removeMember,
    reload,
    isLocalDemo,
  } = useWorkspaceMembers(workspaceId);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("member");
  const [inviting, setInviting] = useState(false);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "invitations">("members");
  const [invitationFilter, setInvitationFilter] = useState<InvitationStatus | "all">("all");

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    clearMessages();
    setCreatedInviteUrl(null);
    try {
      const res = await inviteMember(inviteEmail.trim(), inviteRole);
      setCreatedInviteUrl(res.inviteUrl);
      setInviteEmail("");
    } catch {
      // Error handled by hook state
    } finally {
      setInviting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!createdInviteUrl) return;
    await navigator.clipboard.writeText(createdInviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredInvitations = invitations.filter((inv) =>
    invitationFilter === "all" ? true : inv.status === invitationFilter,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-7">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge className="bg-[#e0edbe] text-[#39571c]">TEAM MANAGEMENT</Badge>
            {isLocalDemo && (
              <Badge className="bg-[#ffeedd] text-[#a84b17]">Local Demo Data</Badge>
            )}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-[#17211b]">Team & Roles</h2>
          <p className="mt-1 text-sm text-[#68736b]">
            Manage workspace members, assign roles, and handle team invitations.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void reload()} disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
          <Button onClick={() => setInviteModalOpen(true)}>
            <UserPlus size={17} /> Invite teammate
          </Button>
        </div>
      </div>

      {/* Local demo alert banner */}
      {isLocalDemo && (
        <div className="rounded-2xl border border-[#ffd8a8] bg-[#fff9db] p-4 text-sm text-[#8f6b00]">
          <div className="flex items-center gap-2 font-bold">
            <ShieldAlert size={18} /> Local Demo Active
          </div>
          <p className="mt-1 text-xs leading-5">
            You are operating in credential-free local demo mode. Member updates and invitation links are simulated locally on this device. Connect Supabase credentials to sync with persistent PostgreSQL auth & tables.
          </p>
        </div>
      )}

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={clearMessages} aria-label="Dismiss error">
              <X size={16} />
            </button>
          </motion.div>
        )}
        {actionSuccess && !createdInviteUrl && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between rounded-2xl border border-green-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <div className="flex items-center gap-2.5">
              <Check size={18} className="shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={clearMessages} aria-label="Dismiss message">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Tabs */}
      <div className="flex border-b border-black/10">
        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === "members"
              ? "border-[#173f2b] text-[#173f2b]"
              : "border-transparent text-[#68736b] hover:text-[#17211b]"
          }`}
        >
          <Users size={18} /> Active Members ({members.length})
        </button>
        <button
          onClick={() => setActiveTab("invitations")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
            activeTab === "invitations"
              ? "border-[#173f2b] text-[#173f2b]"
              : "border-transparent text-[#68736b] hover:text-[#17211b]"
          }`}
        >
          <Mail size={18} /> Workspace Invitations ({invitations.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#68736b]">
          <Loader2 className="animate-spin" size={24} />
          <span className="ml-2 text-sm font-medium">Loading workspace directory…</span>
        </div>
      ) : activeTab === "members" ? (
        /* Members List */
        <div className="space-y-3">
          {members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white/50 p-8 text-center text-sm text-[#68736b]">
              No workspace members found.
            </div>
          ) : (
            members.map((member) => {
              const RoleBadgeIcon = ROLE_BADGES[member.role].icon;
              return (
                <div
                  key={member.userId}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/[.07] bg-[#fffdf7] p-4 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#efad73] text-sm font-bold text-[#17211b]">
                      {initialsFor(member.displayName)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-bold text-[#17211b]">
                          {member.displayName}
                        </span>
                        <Badge className={`flex items-center gap-1 ${ROLE_BADGES[member.role].style}`}>
                          <RoleBadgeIcon size={12} />
                          {ROLE_BADGES[member.role].label}
                        </Badge>
                      </div>
                      <div className="text-xs text-[#68736b]">
                        {member.email ? member.email : "Member"} · Joined{" "}
                        {new Date(member.joinedAt).toLocaleDateString(undefined, {
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={member.role}
                      onChange={(e) => void updateRole(member.userId, e.target.value as WorkspaceRole)}
                      className="rounded-xl border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold outline-none focus:border-[#173f2b]"
                      aria-label={`Change role for ${member.displayName}`}
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="guest">Guest</option>
                    </select>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void removeMember(member.userId)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      aria-label={`Remove ${member.displayName} from workspace`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Invitations Tab */
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#68736b]">Filter:</span>
            {(["all", "pending", "accepted", "expired"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setInvitationFilter(filter)}
                className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition ${
                  invitationFilter === filter
                    ? "bg-[#173f2b] text-white"
                    : "bg-black/5 text-[#68736b] hover:bg-black/10"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {filteredInvitations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white/50 p-8 text-center text-sm text-[#68736b]">
              No invitations matching &quot;{invitationFilter}&quot;.
            </div>
          ) : (
            filteredInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/[.07] bg-[#fffdf7] p-4 shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#173f2b]/10 text-[#173f2b]">
                    <Mail size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-[#17211b]">{inv.email}</span>
                      <Badge className="bg-black/5 text-xs font-semibold capitalize">{inv.role}</Badge>
                      <Badge
                        className={
                          inv.status === "pending"
                            ? "bg-amber-100 text-amber-800 font-semibold"
                            : inv.status === "accepted"
                            ? "bg-emerald-100 text-emerald-800 font-semibold"
                            : "bg-red-100 text-red-800 font-semibold"
                        }
                      >
                        {inv.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-[#68736b]">
                      Invited by {inv.invitedByName || "Teammate"} · Expires{" "}
                      {new Date(inv.expiresAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </div>

                {inv.status === "pending" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void revokeInvite(inv.id)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Invite Modal */}
      {inviteModalOpen && (
        <Dialog open title="Invite a teammate" onClose={() => setInviteModalOpen(false)}>
          <form onSubmit={(e) => void handleCreateInvite(e)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#68736b]">
                Email Address
              </label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="mt-1.5 h-11 w-full rounded-xl border border-black/15 bg-white px-3.5 text-sm outline-none focus:border-[#173f2b]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#68736b]">
                Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                className="mt-1.5 h-11 w-full rounded-xl border border-black/15 bg-white px-3.5 text-sm outline-none focus:border-[#173f2b]"
              >
                <option value="member">Member — Standard access to office & projects</option>
                <option value="admin">Admin — Full workspace administrative access</option>
                <option value="owner">Owner — Billing and ownership authority</option>
                <option value="guest">Guest — Read-only / limited workspace access</option>
              </select>
            </div>

            {createdInviteUrl && (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <Check size={16} /> Invitation Link Generated!
                </div>
                <p className="text-xs text-emerald-800">
                  Raw token is securely generated on the server and never logged. Share this single-use link:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={createdInviteUrl}
                    className="h-9 flex-1 rounded-lg border border-emerald-200 bg-white px-2.5 text-xs text-[#17211b]"
                  />
                  <Button type="button" size="sm" onClick={() => void handleCopyLink()}>
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setInviteModalOpen(false)}>
                Close
              </Button>
              <Button type="submit" disabled={inviting} className="bg-[#173f2b] text-white">
                {inviting ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Create Invitation
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
