import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/client";
import {
  RemoveMemberSchema,
  UpdateMemberRoleSchema,
} from "@/features/workspace/invitations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });

  if (!hasSupabaseConfig) {
    return NextResponse.json({ members: [], isLocalDemo: true });
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("workspace_members")
      .select("workspace_id, user_id, role, joined_at, profiles(display_name, avatar_url)")
      .eq("workspace_id", workspaceId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const members = (data || []).map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return {
        workspaceId: row.workspace_id,
        userId: row.user_id,
        role: row.role,
        joinedAt: row.joined_at,
        displayName: profile?.display_name || "Teammate",
        avatarUrl: profile?.avatar_url || null,
      };
    });

    return NextResponse.json({ members });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const validated = UpdateMemberRoleSchema.parse(body);

    if (!hasSupabaseConfig) {
      return NextResponse.json({ success: true, isLocalDemo: true });
    }

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase.rpc("update_workspace_member_role", {
      target_workspace: validated.workspaceId,
      target_user: validated.userId,
      new_role: validated.role,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update member role";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const userId = searchParams.get("userId");

    const validated = RemoveMemberSchema.parse({ workspaceId, userId });

    if (!hasSupabaseConfig) {
      return NextResponse.json({ success: true, isLocalDemo: true });
    }

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase.rpc("remove_workspace_member", {
      target_workspace: validated.workspaceId,
      target_user: validated.userId,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to remove member";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
