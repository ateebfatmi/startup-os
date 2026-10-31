import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSiteOrigin } from "@/lib/site-url";
import { encryptIntegrationToken, integrationProviders, providerConfig, verifyOAuthState, type IntegrationProvider } from "@/lib/integrations";

type TokenResult = { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; authed_user?: { access_token?: string; scope?: string }; team?: { id?: string; name?: string }; error?: string; ok?: boolean };

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  const origin = getSiteOrigin(request.url); const fail = (reason: string) => NextResponse.redirect(new URL(`/office?integration_error=${encodeURIComponent(reason)}`, origin));
  try {
    const { provider: rawProvider } = await context.params; if (!integrationProviders.includes(rawProvider as IntegrationProvider)) return fail("unknown_provider"); const provider = rawProvider as IntegrationProvider;
    const url = new URL(request.url); const code = url.searchParams.get("code"); const returnedState = url.searchParams.get("state"); const storedState = (await cookies()).get(`orbit_oauth_state_${provider}`)?.value;
    if (!code || !returnedState || !storedState || returnedState !== storedState) return fail("invalid_state");
    const state = verifyOAuthState(returnedState); if (state.provider !== provider) return fail("invalid_state");
    const supabase = await createSupabaseServerClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user || user.id !== state.userId) return fail("session_expired");
    const { data: membership } = await supabase.from("workspace_members").select("role").eq("workspace_id", state.workspaceId).eq("user_id", user.id).single();
    if (!membership || !["owner", "admin"].includes(membership.role)) return fail("access_revoked");
    const config = providerConfig(provider); const redirectUri = `${origin}/api/integrations/${provider}/callback`; const form = new URLSearchParams({ code, redirect_uri: redirectUri, grant_type: "authorization_code" });
    const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" };
    if (provider === "slack" || provider === "spotify") headers.Authorization = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`;
    else { form.set("client_id", config.clientId!); form.set("client_secret", config.clientSecret!); }
    const tokenResponse = await fetch(config.tokenUrl, { method: "POST", headers, body: form, cache: "no-store" }); const token = await tokenResponse.json() as TokenResult; const accessToken = provider === "slack" ? token.access_token || token.authed_user?.access_token : token.access_token;
    if (!tokenResponse.ok || !accessToken || token.error || token.ok === false) return fail("token_exchange_failed");
    const identity = await fetchIdentity(provider, accessToken, token);
    const scopes = (token.scope || token.authed_user?.scope || config.scopes.join(config.scopeSeparator)).split(/[ ,]+/).filter(Boolean);
    const { error } = await createSupabaseAdminClient().from("integration_connections").upsert({ workspace_id: state.workspaceId, provider, external_account_id: identity.id, external_account_name: identity.name, encrypted_access_token: encryptIntegrationToken(accessToken), encrypted_refresh_token: token.refresh_token ? encryptIntegrationToken(token.refresh_token) : null, scopes, expires_at: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null, connected_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "workspace_id,provider" });
    if (error) return fail("storage_failed");
    const response = NextResponse.redirect(new URL(`/office?integration=${provider}`, origin)); response.cookies.set(`orbit_oauth_state_${provider}`, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: `/api/integrations/${provider}/callback`, maxAge: 0 }); return response;
  } catch (error) { console.error("Integration callback failed", error); return fail("callback_failed"); }
}

async function fetchIdentity(provider: IntegrationProvider, accessToken: string, token: TokenResult) {
  if (provider === "slack") return { id: token.team?.id || "slack-workspace", name: token.team?.name || "Slack workspace" };
  if (provider === "github") { const response = await fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } }); if (!response.ok) throw new Error("GitHub identity request failed"); const data = await response.json() as { id?: number; login?: string; name?: string }; return { id: String(data.id || data.login || "github"), name: data.name || data.login || "GitHub account" }; }
  if (provider === "linear") { const response = await fetch("https://api.linear.app/graphql", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: "{ viewer { id name } }" }) }); const data = await response.json() as { data?: { viewer?: { id?: string; name?: string } }; errors?: unknown[] }; if (!response.ok || data.errors?.length) throw new Error("Linear identity request failed"); return { id: data.data?.viewer?.id || "linear", name: data.data?.viewer?.name || "Linear workspace" }; }
  if (provider === "spotify") { const response = await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${accessToken}` } }); if (!response.ok) throw new Error("Spotify identity request failed"); const data = await response.json() as { id?: string; display_name?: string }; return { id: data.id || "spotify", name: data.display_name || data.id || "Spotify account" }; }
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } }); if (!response.ok) throw new Error("Google identity request failed"); const data = await response.json() as { sub?: string; email?: string; name?: string }; return { id: data.sub || data.email || "google", name: data.name || data.email || "Google Calendar" };
}
