"use client";

import { motion } from "framer-motion";
import { Command, AlertCircle, Loader2, UserPlus, ArrowRight, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { safeNextPath } from "@/features/auth/auth-utils";
import { acceptInvitationByToken, getInvitationPreview } from "@/features/workspace/member-service";
import type { WorkspaceRole } from "@/features/workspace/invitations";
import { createSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";

type PreviewData = {
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: string;
  inviterName: string;
  status: "pending" | "accepted" | "expired";
};

export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f4f1e8] p-4 text-[#17211b]">
          <div className="flex flex-col items-center justify-center text-[#68736b]">
            <Loader2 className="mb-3 animate-spin" size={28} />
            <p className="text-sm font-medium">Loading invitation details…</p>
          </div>
        </div>
      }
    >
      <InviteAcceptContent />
    </Suspense>
  );
}

function InviteAcceptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawToken = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!rawToken) {
        if (active) {
          setError("No invitation token provided. Please check your invitation link.");
          setLoading(false);
        }
        return;
      }

      try {
        if (hasSupabaseConfig) {
          const supabase = createSupabaseBrowserClient();
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (active) setUser(currentUser ? { email: currentUser.email, id: currentUser.id } : null);
        } else {
          if (active) setUser({ email: "demo@orbit.workspace", id: "demo-user-1" });
        }

        const data = await getInvitationPreview(rawToken);
        if (!active) return;

        if (data.status === "accepted") {
          setError("This invitation has already been accepted.");
        } else if (data.status === "expired") {
          setError("This invitation link has expired.");
        } else {
          setPreview(data);
        }
      } catch (err: unknown) {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "Invalid invitation token.";
        setError(msg);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [rawToken]);

  const handleAccept = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await acceptInvitationByToken(rawToken);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("orbit-workspace-id", res.workspaceId);
        if (preview?.workspaceName) {
          window.localStorage.setItem("orbit-workspace-name", preview.workspaceName);
        }
      }
      router.push("/office");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to accept invitation.";
      setError(msg);
      setSubmitting(false);
    }
  };

  const nextPath = safeNextPath(`/invite/accept?token=${encodeURIComponent(rawToken)}`);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f1e8] p-4 text-[#17211b]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-[28px] border border-black/10 bg-[#fffdf7] p-6 shadow-panel md:p-8"
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#173f2b] text-[#c8f560]">
              <Command size={22} strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold tracking-tight">orbit</span>
          </div>
          {!hasSupabaseConfig && (
            <Badge className="bg-[#ffeedd] text-[#a84b17]">Local Demo Mode</Badge>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-[#68736b]">
            <Loader2 className="mb-3 animate-spin" size={28} />
            <p className="text-sm font-medium">Validating workspace invitation…</p>
          </div>
        ) : error && !preview ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-700">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Invitation unavailable</h2>
            <p className="mt-2 text-sm leading-6 text-[#68736b]">{error}</p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/login"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#173f2b] px-4 text-sm font-semibold text-white transition hover:bg-[#20543a]"
              >
                Go to Login
              </Link>
            </div>
          </div>
        ) : preview ? (
          <div>
            <div className="rounded-2xl bg-[#173f2b] p-5 text-white">
              <Badge className="bg-[#c8f560] text-[#173f2b] uppercase tracking-wider font-semibold">
                Workspace Invitation
              </Badge>
              <h2 className="mt-3 text-2xl font-bold tracking-tight">{preview.workspaceName}</h2>
              <p className="mt-2 text-xs leading-5 text-white/70">
                Invited by <strong className="text-white">{preview.inviterName}</strong> to join as{" "}
                <strong className="capitalize text-[#c8f560]">{preview.role}</strong>.
              </p>
            </div>

            <div className="mt-5 space-y-3 rounded-2xl border border-black/[.08] bg-white p-4 text-sm">
              <div className="flex items-center justify-between text-xs text-[#68736b]">
                <span>Target Email</span>
                <span className="font-semibold text-[#17211b]">{preview.email}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#68736b]">
                <span>Role Granted</span>
                <span className="font-semibold capitalize text-[#17211b]">{preview.role}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#68736b]">
                <span>Expires</span>
                <span className="font-semibold text-[#17211b]">
                  {new Date(preview.expiresAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200">
                {error}
              </div>
            )}

            {hasSupabaseConfig && !user ? (
              <div className="mt-6 space-y-3">
                <div className="rounded-xl bg-[#f4f1e8] p-3 text-xs leading-5 text-[#68736b]">
                  You need to sign in or create an account to accept this invitation for{" "}
                  <strong>{preview.email}</strong>.
                </div>
                <Link
                  href={`/login?next=${encodeURIComponent(nextPath)}`}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#173f2b] px-4 text-sm font-semibold text-white transition hover:bg-[#20543a]"
                >
                  <LogIn size={16} /> Sign in to accept
                </Link>
                <Link
                  href={`/login?mode=signup&next=${encodeURIComponent(nextPath)}`}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-black/15 bg-white px-4 text-sm font-semibold text-[#17211b] transition hover:bg-black/5"
                >
                  <UserPlus size={16} /> Create account to accept
                </Link>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <Button
                  onClick={() => void handleAccept()}
                  disabled={submitting}
                  className="w-full bg-[#c8f560] text-[#173f2b] font-bold hover:bg-[#d4ff6b] h-12 text-base"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} /> Joining workspace…
                    </>
                  ) : (
                    <>
                      Accept invitation & join <ArrowRight size={18} />
                    </>
                  )}
                </Button>
                {!hasSupabaseConfig && (
                  <p className="text-center text-xs text-[#68736b]">
                    Local demo mode — accepting will join demo workspace on this device.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
