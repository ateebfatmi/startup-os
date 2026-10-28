import { NextResponse } from "next/server";
import { z } from "zod";
import { hasSupabaseConfig } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const IceServerSchema = z.object({
  urls: z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]),
  username: z.string().optional(),
  credential: z.string().optional(),
});
const IceServersSchema = z.array(IceServerSchema).min(1).max(10);

function response(iceServers: z.infer<typeof IceServersSchema>, source: string) {
  return NextResponse.json({ iceServers, source }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function GET() {
  if (hasSupabaseConfig) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const credentialUrl = process.env.TURN_CREDENTIALS_URL?.trim();
  if (credentialUrl) {
    try {
      const upstream = await fetch(credentialUrl, {
        headers: process.env.TURN_CREDENTIALS_TOKEN ? { Authorization: `Bearer ${process.env.TURN_CREDENTIALS_TOKEN}` } : {},
        cache: "no-store",
        signal: AbortSignal.timeout(4_000),
      });
      if (!upstream.ok) throw new Error(`TURN provider returned ${upstream.status}`);
      const payload = await upstream.json() as unknown;
      const candidate = Array.isArray(payload) ? payload : (payload as { iceServers?: unknown })?.iceServers;
      return response(IceServersSchema.parse(candidate), "ephemeral-turn");
    } catch (error) {
      console.error("TURN credential discovery failed", error);
    }
  }

  if (process.env.NEXT_PUBLIC_ICE_SERVERS) {
    try { return response(IceServersSchema.parse(JSON.parse(process.env.NEXT_PUBLIC_ICE_SERVERS)), "configured-static"); }
    catch { /* Build-time validation reports malformed static configuration. */ }
  }
  return response([{ urls: "stun:stun.l.google.com:19302" }], "stun-fallback");
}
