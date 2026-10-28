import { NextResponse } from "next/server";
import { CopilotRequestSchema, generateCopilotResult } from "@/lib/ai-copilot";
import { hasSupabaseConfig } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_BODY_BYTES = 64 * 1024;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1_000;
const RATE_LIMIT_REQUESTS = 20;
const requestWindows = new Map<string, { count: number; resetAt: number }>();

function json(data: unknown, status = 200, extraHeaders?: HeadersInit) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", ...extraHeaders },
  });
}

function rateLimit(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = forwarded || request.headers.get("x-real-ip") || "local";
  const now = Date.now();
  const current = requestWindows.get(key);
  if (!current || current.resetAt <= now) {
    requestWindows.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_REQUESTS - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }
  current.count += 1;
  return { allowed: current.count <= RATE_LIMIT_REQUESTS, remaining: Math.max(0, RATE_LIMIT_REQUESTS - current.count), resetAt: current.resetAt };
}

export async function POST(request: Request) {
  const limit = rateLimit(request);
  const rateHeaders = {
    "X-RateLimit-Limit": String(RATE_LIMIT_REQUESTS),
    "X-RateLimit-Remaining": String(limit.remaining),
    "X-RateLimit-Reset": String(Math.ceil(limit.resetAt / 1_000)),
  };
  if (!limit.allowed) return json({ success: false, error: "Too many Copilot requests. Please try again in a few minutes." }, 429, rateHeaders);

  try {
    const declaredSize = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(declaredSize) && declaredSize > MAX_BODY_BYTES) {
      return json({ success: false, error: "Request body is too large" }, 413, rateHeaders);
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json({ success: false, error: "Request body is too large" }, 413, rateHeaders);
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return json({ success: false, error: "Malformed JSON request" }, 400, rateHeaders);
    }

    const parsed = CopilotRequestSchema.safeParse(body);
    if (!parsed.success) {
      return json({
        success: false,
        error: "Invalid request",
        issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      }, 400, rateHeaders);
    }

    if (hasSupabaseConfig) {
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return json({ success: false, error: "Authentication required" }, 401, rateHeaders);
    }

    const result = await generateCopilotResult(parsed.data);
    return json({ success: true, ...result }, 200, rateHeaders);
  } catch (error: unknown) {
    console.error("AI assistant request failed", error);
    return json({ success: false, error: "Copilot could not process this request" }, 500, rateHeaders);
  }
}
