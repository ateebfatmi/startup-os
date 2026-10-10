import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/client";
import {
  CreateProjectSchema,
  UpdateProjectSchema,
} from "@/features/workspace/project-types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });

  if (!hasSupabaseConfig) {
    return NextResponse.json({ projects: [], isLocalDemo: true });
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("projects")
      .select("id, workspace_id, name, description, status, priority, owner_id, due_at, created_by, created_at, updated_at, profiles:owner_id(display_name)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ projects: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = CreateProjectSchema.parse(body);

    if (!hasSupabaseConfig) {
      return NextResponse.json({
        project: {
          id: `proj-local-${Date.now()}`,
          workspaceId: validated.workspaceId,
          name: validated.name,
          description: validated.description,
          status: validated.status,
          priority: validated.priority,
          ownerId: "demo-user-1",
          dueAt: validated.dueAt,
          createdBy: "demo-user-1",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        isLocalDemo: true,
      });
    }

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("projects")
      .insert({
        workspace_id: validated.workspaceId,
        name: validated.name,
        description: validated.description,
        status: validated.status,
        priority: validated.priority,
        owner_id: user.id,
        due_at: validated.dueAt,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ project: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const validated = UpdateProjectSchema.parse(body);

    if (!hasSupabaseConfig) {
      return NextResponse.json({ success: true, isLocalDemo: true });
    }

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (validated.name !== undefined) updates.name = validated.name;
    if (validated.description !== undefined) updates.description = validated.description;
    if (validated.status !== undefined) updates.status = validated.status;
    if (validated.priority !== undefined) updates.priority = validated.priority;
    if (validated.dueAt !== undefined) updates.due_at = validated.dueAt;

    const { error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", validated.projectId)
      .eq("workspace_id", validated.workspaceId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update project";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const projectId = searchParams.get("projectId");

    if (!workspaceId || !projectId) {
      return NextResponse.json({ error: "Missing workspaceId or projectId" }, { status: 400 });
    }

    if (!hasSupabaseConfig) {
      return NextResponse.json({ success: true, isLocalDemo: true });
    }

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("workspace_id", workspaceId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete project";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
