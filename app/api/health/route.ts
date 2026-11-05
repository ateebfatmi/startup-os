import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "crewvilla",
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || "local",
      database: hasSupabaseConfig ? "configured" : "demo-mode",
      ...(process.env.CREWVILLA_PRELAUNCH === "1" && hasSupabaseConfig
        ? { prelaunchProject: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0] }
        : {}),
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
