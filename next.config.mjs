const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const publicSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

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
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
