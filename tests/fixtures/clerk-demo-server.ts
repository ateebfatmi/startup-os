import { NextResponse } from "next/server";

export function clerkMiddleware() {
  return () => NextResponse.next();
}

export function createFrontendApiProxyHandlers() {
  const unavailable = () => new Response(null, { status: 404 });
  return { GET: unavailable, POST: unavailable, PUT: unavailable, DELETE: unavailable, PATCH: unavailable };
}
