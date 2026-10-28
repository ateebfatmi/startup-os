import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "orbit-hq",
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || "local",
      database: hasSupabaseConfig ? "configured" : "demo-mode",
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
