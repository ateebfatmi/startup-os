import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/client";
import {
  CreateTaskSchema,
  UpdateTaskSchema,
} from "@/features/workspace/project-types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  const projectId = searchParams.get("projectId");
  const assigneeId = searchParams.get("assigneeId");
  const status = searchParams.get("status");

  if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });

  if (!hasSupabaseConfig) {
    return NextResponse.json({ tasks: [], isLocalDemo: true });
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let query = supabase
      .from("tasks")
      .select("id, workspace_id, project_id, title, description, status, priority, assignee_id, due_at, position, created_by, created_at, updated_at, projects(name), profiles:assignee_id(display_name)")
      .eq("workspace_id", workspaceId)
      .order("position", { ascending: true });

    if (projectId) query = query.eq("project_id", projectId);
    if (assigneeId) query = query.eq("assignee_id", assigneeId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ tasks: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = CreateTaskSchema.parse(body);

    if (!hasSupabaseConfig) {
      return NextResponse.json({
        task: {
          id: `task-local-${Date.now()}`,
          workspaceId: validated.workspaceId,
          projectId: validated.projectId || null,
          title: validated.title,
          description: validated.description,
          status: validated.status,
          priority: validated.priority,
          assigneeId: validated.assigneeId || "demo-user-1",
          dueAt: validated.dueAt,
          position: Date.now(),
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
      .from("tasks")
      .insert({
        workspace_id: validated.workspaceId,
        project_id: validated.projectId || null,
        title: validated.title,
        description: validated.description,
        status: validated.status,
        priority: validated.priority,
        assignee_id: validated.assigneeId || null,
        due_at: validated.dueAt || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ task: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create task";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const validated = UpdateTaskSchema.parse(body);

    if (!hasSupabaseConfig) {
      return NextResponse.json({ success: true, isLocalDemo: true });
    }

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (validated.title !== undefined) updates.title = validated.title;
    if (validated.description !== undefined) updates.description = validated.description;
    if (validated.status !== undefined) updates.status = validated.status;
    if (validated.priority !== undefined) updates.priority = validated.priority;
    if (validated.assigneeId !== undefined) updates.assignee_id = validated.assigneeId;
    if (validated.projectId !== undefined) updates.project_id = validated.projectId;
    if (validated.dueAt !== undefined) updates.due_at = validated.dueAt;
    if (validated.position !== undefined) updates.position = validated.position;

    const { error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", validated.taskId)
      .eq("workspace_id", validated.workspaceId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update task";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const taskId = searchParams.get("taskId");

    if (!workspaceId || !taskId) {
      return NextResponse.json({ error: "Missing workspaceId or taskId" }, { status: 400 });
    }

    if (!hasSupabaseConfig) {
      return NextResponse.json({ success: true, isLocalDemo: true });
    }

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("workspace_id", workspaceId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete task";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
