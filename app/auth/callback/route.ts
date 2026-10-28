import { NextResponse } from "next/server";
import { safeNextPath } from "@/features/auth/auth-utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteOrigin } from "@/lib/site-url";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getSiteOrigin(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"), "/office");
  if (!code) return NextResponse.redirect(new URL("/login?error=missing_code", origin));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=auth_callback_failed", origin));
  return NextResponse.redirect(new URL(next, origin));
}
