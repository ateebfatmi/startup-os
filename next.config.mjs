import { fileURLToPath } from "node:url";
import { validatePrelaunch } from "./scripts/prelaunch-guard.mjs";

if (process.env.CREWVILLA_PRELAUNCH) validatePrelaunch(process.env);

const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const publicSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const e2eDemo = process.env.CREWVILLA_E2E_DEMO === "1";

if (e2eDemo && (process.env.VERCEL || publicSupabaseUrl || publicSupabaseKey ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY || process.env.CLERK_SECRET_KEY)) {
  throw new Error("The Playwright demo build requires a local environment without Supabase or Clerk credentials.");
}

if (Boolean(publicSupabaseUrl) !== Boolean(publicSupabaseKey)) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be configured together.",
  );
}

for (const [name, value] of [
  ["NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL],
  ["NEXT_PUBLIC_SUPABASE_URL", publicSupabaseUrl],
  ["TURN_CREDENTIALS_URL", process.env.TURN_CREDENTIALS_URL],
]) {
  if (!value) continue;
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${name} must use http or https.`);
  }
}

if (process.env.NEXT_PUBLIC_ICE_SERVERS) {
  const servers = JSON.parse(process.env.NEXT_PUBLIC_ICE_SERVERS);
  if (!Array.isArray(servers)) {
    throw new Error("NEXT_PUBLIC_ICE_SERVERS must be a JSON array.");
  }
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(), browsing-topics=()",
  },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  ...(e2eDemo && {
    // Keep the build with test fixtures separate from the normal production build.
    distDir: ".next/playwright",
    webpack(config) {
      config.resolve.alias["@clerk/nextjs$"] = fileURLToPath(new URL("./tests/fixtures/clerk-demo.tsx", import.meta.url));
      config.resolve.alias["@clerk/nextjs/server$"] = fileURLToPath(new URL("./tests/fixtures/clerk-demo-server.ts", import.meta.url));
      return config;
    },
  }),
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
