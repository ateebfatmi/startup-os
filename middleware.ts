import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = ["/office", "/onboarding", "/reset-password"];

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (values: Parameters<SetAllCookies>[0]) => {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const needsUser = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path));
  if (!user && needsUser) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }
  if (user && request.nextUrl.pathname.startsWith("/office")) {
    const { data: memberships } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1);
    if (!memberships?.length) {
      const onboarding = request.nextUrl.clone();
      onboarding.pathname = "/onboarding";
      onboarding.search = "";
      return NextResponse.redirect(onboarding);
    }
  }
  return response;
}

export const config = {
  matcher: ["/office/:path*", "/onboarding/:path*", "/reset-password/:path*"],
};
