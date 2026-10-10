import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/client";
import {
  AcceptInvitationSchema,
  computeInvitationStatus,
} from "@/features/workspace/invitations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  try {
    const validated = AcceptInvitationSchema.parse({ token });

    if (!hasSupabaseConfig) {
      return NextResponse.json({
        id: "inv-preview-demo",
        workspaceId: "northstar-demo",
        workspaceName: "Northstar Labs",
        email: "invited@orbit.workspace",
        role: "member",
        expiresAt: new Date(Date.now() + 7 * 86400 * 1000).toISOString(),
        inviterName: "Ateeb Fatmi",
        status: "pending",
        isLocalDemo: true,
      });
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.rpc("get_invitation_by_token", {
      token_text: validated.token,
    });

    if (error || !data || data.length === 0) {
      return NextResponse.json({ error: "Invitation not found or invalid token" }, { status: 404 });
    }

    const row = data[0];
    const expiresAt = row.expires_at;
    const acceptedAt = row.accepted_at;

    return NextResponse.json({
      id: row.id,
      workspaceId: row.workspace_id,
      workspaceName: row.workspace_name,
      email: row.email,
      role: row.role,
      expiresAt,
      acceptedAt,
      inviterName: row.inviter_name,
      status: computeInvitationStatus(expiresAt, acceptedAt),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid invitation token";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = AcceptInvitationSchema.parse(body);

    if (!hasSupabaseConfig) {
      return NextResponse.json({ success: true, workspaceId: "northstar-demo", isLocalDemo: true });
    }

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required to accept invitation" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("accept_workspace_invitation", {
      token_text: validated.token,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true, workspaceId: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to accept invitation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
