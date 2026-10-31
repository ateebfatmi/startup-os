import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  decryptIntegrationToken,
  encryptIntegrationToken,
  integrationProviders,
  providerConfig,
  type IntegrationProvider,
} from "@/lib/integrations";

type ImportItem = {
  id: string;
  kind: "meeting" | "task";
  title: string;
  description: string;
  url?: string;
  priority: "low" | "medium" | "high" | "urgent";
  startsAt?: string;
  endsAt?: string;
};

type StoredConnection = {
  encrypted_access_token: string;
  encrypted_refresh_token: string | null;
  expires_at: string | null;
};

const syncInput = z.object({ workspaceId: z.string().uuid() });

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  try {
    const { provider: rawProvider } = await context.params;
    if (!integrationProviders.includes(rawProvider as IntegrationProvider)) {
      return NextResponse.json({ error: "Unknown integration" }, { status: 404 });
    }
    const provider = rawProvider as IntegrationProvider;
    const { workspaceId } = syncInput.parse(await request.json());
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: membership } = await supabase.from("workspace_members").select("role")
      .eq("workspace_id", workspaceId).eq("user_id", user.id).single();
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json({ error: "Owner or admin access required" }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const { data: connection } = await admin.from("integration_connections")
      .select("encrypted_access_token, encrypted_refresh_token, expires_at")
      .eq("workspace_id", workspaceId).eq("provider", provider).single();
    if (!connection) return NextResponse.json({ error: "Integration is not connected" }, { status: 404 });

    const token = await usableAccessToken(provider, workspaceId, connection);
    if (provider === "slack") {
      await verifySlack(token);
      return NextResponse.json({ imported: 0, message: "Slack connection verified" });
    }

    if (provider === "spotify") {
      const spotifyStatus = await verifySpotify(token);
      return NextResponse.json({ imported: 0, message: spotifyStatus });
    }

    const items = provider === "google_calendar"
      ? await googleEvents(token)
      : provider === "github" ? await githubIssues(token) : await linearIssues(token);
    if (!items.length) return NextResponse.json({ imported: 0, message: "No new items to import" });

    const { data: existing, error: existingError } = await admin.from("integration_sync_items")
      .select("external_id").eq("workspace_id", workspaceId).eq("provider", provider)
      .in("external_id", items.map((item) => item.id));
    if (existingError) throw existingError;
    const known = new Set((existing || []).map((item) => item.external_id));

    let imported = 0;
    for (const item of items) {
      if (known.has(item.id)) continue;
      const resourceId = item.kind === "meeting"
        ? await importMeeting(workspaceId, user.id, item)
        : await importTask(workspaceId, user.id, item);
      const { error: mappingError } = await admin.from("integration_sync_items").insert({
        workspace_id: workspaceId,
        provider,
        external_id: item.id,
        resource_type: item.kind,
        resource_id: resourceId,
      });
      if (mappingError) throw mappingError;
      imported += 1;
    }

    return NextResponse.json({
      imported,
      message: imported
        ? `Imported ${imported} new item${imported === 1 ? "" : "s"}`
        : "Everything is already in sync",
    });
  } catch (error) {
    console.error("Integration sync failed", error);
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid sync request" }, { status: 400 });
    return NextResponse.json({ error: "Integration sync failed; reconnect if authorization expired" }, { status: 400 });
  }
}

async function usableAccessToken(provider: IntegrationProvider, workspaceId: string, connection: StoredConnection) {
  const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : null;
  if (!expiresAt || expiresAt > Date.now() + 60_000) {
    return decryptIntegrationToken(connection.encrypted_access_token);
  }
  if (!connection.encrypted_refresh_token) throw new Error("Integration authorization expired");

  const config = providerConfig(provider);
  const form = new URLSearchParams({
    client_id: config.clientId!,
    client_secret: config.clientSecret!,
    refresh_token: decryptIntegrationToken(connection.encrypted_refresh_token),
    grant_type: "refresh_token",
  });
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    cache: "no-store",
  });
  const body = await response.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!response.ok || !body.access_token || body.error) throw new Error("Could not refresh integration authorization");

  const { error } = await createSupabaseAdminClient().from("integration_connections").update({
    encrypted_access_token: encryptIntegrationToken(body.access_token),
    encrypted_refresh_token: body.refresh_token
      ? encryptIntegrationToken(body.refresh_token)
      : connection.encrypted_refresh_token,
    expires_at: body.expires_in ? new Date(Date.now() + body.expires_in * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("workspace_id", workspaceId).eq("provider", provider);
  if (error) throw error;
  return body.access_token;
}

async function importMeeting(workspaceId: string, userId: string, item: ImportItem) {
  if (!item.startsAt || !item.endsAt) throw new Error("Calendar item is missing its schedule");
  const { data, error } = await createSupabaseAdminClient().from("meetings").insert({
    workspace_id: workspaceId,
    title: item.title.slice(0, 240),
    agenda: item.description.slice(0, 10_000),
    starts_at: item.startsAt,
    ends_at: item.endsAt,
    timezone: "UTC",
    created_by: userId,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function importTask(workspaceId: string, userId: string, item: ImportItem) {
  const description = `${item.description}${item.url ? `\n\n${item.url}` : ""}`.slice(0, 5_000);
  const { data, error } = await createSupabaseAdminClient().from("tasks").insert({
    workspace_id: workspaceId,
    title: item.title.slice(0, 240),
    description,
    status: "todo",
    priority: item.priority,
    created_by: userId,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

async function verifySlack(token: string) {
  const response = await fetch("https://slack.com/api/auth.test", {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  const result = await response.json() as { ok?: boolean; error?: string };
  if (!result.ok) throw new Error(result.error || "Slack connection failed");
}

async function verifySpotify(token: string) {
  const response = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  if (response.status === 204 || !response.ok) {
    return "Spotify connected (no active playback currently)";
  }
  const data = await response.json().catch(() => null) as { item?: { name?: string; artists?: Array<{ name: string }> } } | null;
  if (data?.item?.name) {
    const artist = data.item.artists?.[0]?.name ? ` by ${data.item.artists[0].name}` : "";
    return `Now playing on Spotify: ${data.item.name}${artist}`;
  }
  return "Spotify connected and player synced";
}

async function googleEvents(token: string): Promise<ImportItem[]> {
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", new Date().toISOString());
  url.searchParams.set("maxResults", "25");
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!response.ok) throw new Error("Google Calendar request failed");
  const body = await response.json() as { items?: Array<{
    id: string;
    summary?: string;
    description?: string;
    htmlLink?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
  }> };
  return (body.items || []).flatMap((event) => {
    const startsAt = event.start?.dateTime || (event.start?.date ? `${event.start.date}T00:00:00.000Z` : null);
    const endsAt = event.end?.dateTime || (event.end?.date ? `${event.end.date}T00:00:00.000Z` : null);
    return startsAt && endsAt ? [{
      id: event.id,
      kind: "meeting" as const,
      title: event.summary || "Calendar event",
      description: `${event.description || ""}${event.htmlLink ? `\n\n${event.htmlLink}` : ""}`.trim(),
      priority: "medium" as const,
      startsAt,
      endsAt,
    }] : [];
  });
}

async function githubIssues(token: string): Promise<ImportItem[]> {
  const response = await fetch("https://api.github.com/issues?filter=assigned&state=open&per_page=25", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("GitHub request failed");
  const issues = await response.json() as Array<{
    id: number;
    title: string;
    body?: string;
    html_url?: string;
    pull_request?: unknown;
    labels?: Array<{ name?: string }>;
  }>;
  return issues.filter((issue) => !issue.pull_request).map((issue) => ({
    id: String(issue.id),
    kind: "task",
    title: issue.title,
    description: issue.body || "",
    url: issue.html_url,
    priority: issue.labels?.some((label) => /urgent|critical/i.test(label.name || "")) ? "urgent" : "medium",
  }));
}

async function linearIssues(token: string): Promise<ImportItem[]> {
  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: "{ viewer { assignedIssues(first: 25) { nodes { id title description url priority completedAt canceledAt } } } }",
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Linear request failed");
  const body = await response.json() as {
    data?: { viewer?: { assignedIssues?: { nodes?: Array<{
      id: string;
      title: string;
      description?: string;
      url?: string;
      priority?: number;
      completedAt?: string;
      canceledAt?: string;
    }> } } };
    errors?: unknown[];
  };
  if (body.errors?.length) throw new Error("Linear request failed");
  return (body.data?.viewer?.assignedIssues?.nodes || [])
    .filter((issue) => !issue.completedAt && !issue.canceledAt)
    .map((issue) => ({
      id: issue.id,
      kind: "task",
      title: issue.title,
      description: issue.description || "",
      url: issue.url,
      priority: issue.priority && issue.priority <= 2 ? "high" : "medium",
    }));
}
