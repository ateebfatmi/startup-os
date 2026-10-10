import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/client";
import {
  CreateInvitationSchema,
  RevokeInvitationSchema,
  generateRawToken,
  hashToken,
} from "@/features/workspace/invitations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });

  if (!hasSupabaseConfig) {
    return NextResponse.json({ invitations: [], isLocalDemo: true });
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("workspace_invitations")
      .select("id, workspace_id, email, role, token_hash, invited_by, expires_at, accepted_at, created_at, profiles:invited_by(display_name)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ invitations: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = CreateInvitationSchema.parse(body);

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 86400 * 1000).toISOString();

    if (!hasSupabaseConfig) {
      const origin = request.headers.get("origin") || "http://localhost:3000";
      return NextResponse.json({
        invitation: {
          id: `inv-local-${Date.now()}`,
          workspaceId: validated.workspaceId,
          email: validated.email,
          role: validated.role,
          tokenHash,
          invitedBy: "demo-user-1",
          expiresAt,
          createdAt: new Date().toISOString(),
          status: "pending",
        },
        rawToken,
        inviteUrl: `${origin}/invite/accept?token=${rawToken}`,
        isLocalDemo: true,
      });
    }

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", validated.workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Unauthorized: Only owners and admins can create invitations" }, { status: 403 });
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

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const origin = request.headers.get("origin") || "http://localhost:3000";
    return NextResponse.json({
      invitation: data,
      rawToken,
      inviteUrl: `${origin}/invite/accept?token=${rawToken}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create invitation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const invitationId = searchParams.get("invitationId");

    const validated = RevokeInvitationSchema.parse({ workspaceId, invitationId });

    if (!hasSupabaseConfig) {
      return NextResponse.json({ success: true, isLocalDemo: true });
    }

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", validated.workspaceId)
      .eq("user_id", user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Unauthorized: Only owners and admins can revoke invitations" }, { status: 403 });
    }

    const { error } = await supabase
      .from("workspace_invitations")
      .delete()
      .eq("id", validated.invitationId)
      .eq("workspace_id", validated.workspaceId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to revoke invitation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
