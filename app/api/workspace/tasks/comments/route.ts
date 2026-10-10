import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/client";
import { CreateCommentSchema } from "@/features/workspace/project-types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "Missing taskId" }, { status: 400 });

  if (!hasSupabaseConfig) {
    return NextResponse.json({ comments: [], isLocalDemo: true });
  }

  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("task_comments")
      .select("id, task_id, author_id, body, created_at, profiles:author_id(display_name)")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ comments: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = CreateCommentSchema.parse(body);

    if (!hasSupabaseConfig) {
      return NextResponse.json({
        comment: {
          id: `comment-local-${Date.now()}`,
          taskId: validated.taskId,
          authorId: "demo-user-1",
          authorName: "Ateeb Fatmi",
          body: validated.body,
          createdAt: new Date().toISOString(),
        },
        isLocalDemo: true,
      });
    }

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("task_comments")
      .insert({
        task_id: validated.taskId,
        author_id: user.id,
        body: validated.body,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ comment: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create comment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get("commentId");

    if (!commentId) {
      return NextResponse.json({ error: "Missing commentId" }, { status: 400 });
    }

    if (!hasSupabaseConfig) {
      return NextResponse.json({ success: true, isLocalDemo: true });
    }

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("task_comments")
      .delete()
      .eq("id", commentId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete comment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
