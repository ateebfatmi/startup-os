import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";
import { integrationProviders, isProviderConfigured, providerConfig, signOAuthState, type IntegrationProvider } from "@/lib/integrations";

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider: rawProvider } = await context.params;
  if (!integrationProviders.includes(rawProvider as IntegrationProvider)) return NextResponse.json({ error: "Unknown integration" }, { status: 404 });
  const provider = rawProvider as IntegrationProvider;
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId || !isProviderConfigured(provider)) return NextResponse.json({ error: "Integration is not configured" }, { status: 503 });
  const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.redirect(new URL("/login", getSiteOrigin(request.url)));
  const { data: membership } = await supabase.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", user.id).single();
  if (!membership || !["owner", "admin"].includes(membership.role)) return NextResponse.json({ error: "Owner or admin access required" }, { status: 403 });
  const state = signOAuthState({ provider, workspaceId, userId: user.id, nonce: randomUUID(), expiresAt: Date.now() + 10 * 60_000 });
  const config = providerConfig(provider); const redirectUri = `${getSiteOrigin(request.url)}/api/integrations/${provider}/callback`;
  const authorization = new URL(config.authorizeUrl); authorization.searchParams.set("client_id", config.clientId!); authorization.searchParams.set("redirect_uri", redirectUri); authorization.searchParams.set("response_type", "code"); authorization.searchParams.set("scope", config.scopes.join(config.scopeSeparator)); authorization.searchParams.set("state", state); Object.entries(config.extraAuthorize || {}).forEach(([key, value]) => authorization.searchParams.set(key, value));
  const response = NextResponse.redirect(authorization); response.cookies.set(`orbit_oauth_state_${provider}`, state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: `/api/integrations/${provider}/callback`, maxAge: 600 }); return response;
}
