import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export default clerkMiddleware(
  async (auth, request) => {
    const pathname = request.nextUrl.pathname;
    const isProtected =
      pathname.startsWith("/office") ||
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/reset-password");

    if (isProtected) {
      const authObj = await auth();
      if (!authObj.userId) {
        const hasSession = Boolean(
          request.cookies.get("__session") ||
          request.cookies.get("__client_uat") ||
          request.cookies.get("sb-bwvbplkmjbrrllpsnhwh-auth-token")
        );
        if (!hasSession) {
          const login = request.nextUrl.clone();
          login.pathname = "/login";
          login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
          return NextResponse.redirect(login);
        }
      }
    }
    return NextResponse.next();
  },
  {
    frontendApiProxy: {
      enabled: true,
      path: "/__clerk",
    },
  }
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
