import { NextResponse } from "next/server";
import { z } from "zod";
import { hasSupabaseConfig } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { integrationProviders, isProviderConfigured } from "@/lib/integrations";

export async function GET(request: Request) {
  const workspaceId = new URL(request.url).searchParams.get("workspaceId"); if (!workspaceId) return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
  if (!hasSupabaseConfig) return NextResponse.json({ providers: integrationProviders.map((provider) => ({ provider, configured: false, connection: null })) });
  const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: membership } = await supabase.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", user.id).single(); if (!membership || !["owner", "admin"].includes(membership.role)) return NextResponse.json({ error: "Owner or admin access required" }, { status: 403 });
  const { data, error } = await createSupabaseAdminClient().from("integration_connections").select("provider, external_account_id, external_account_name, scopes, expires_at, updated_at").eq("workspace_id", workspaceId); if (error) return NextResponse.json({ error: "Could not load integrations" }, { status: 400 });
  return NextResponse.json({ providers: integrationProviders.map((provider) => ({ provider, configured: isProviderConfigured(provider), connection: data?.find((item) => item.provider === provider) || null })) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: Request) {
  const input = z.object({ workspaceId: z.string().uuid(), provider: z.enum(["google_calendar", "slack", "github", "linear", "spotify"]) }).parse(await request.json());
  const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: membership } = await supabase.from("workspace_members").select("role").eq("workspace_id", input.workspaceId).eq("user_id", user.id).single(); if (!membership || !["owner", "admin"].includes(membership.role)) return NextResponse.json({ error: "Owner or admin access required" }, { status: 403 });
  const { error } = await createSupabaseAdminClient().from("integration_connections").delete().eq("workspace_id", input.workspaceId).eq("provider", input.provider); if (error) return NextResponse.json({ error: "Could not disconnect integration" }, { status: 400 });
  return NextResponse.json({ success: true });
}
