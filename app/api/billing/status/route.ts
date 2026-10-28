import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
  const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("workspace_billing").select("plan, status, seats, current_period_end, cancel_at_period_end").eq("workspace_id", workspaceId).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load billing" }, { status: 400 });
  return NextResponse.json({ billing: data || { plan: "free", status: "inactive", seats: 1, current_period_end: null, cancel_at_period_end: false } }, { headers: { "Cache-Control": "private, no-store" } });
}
