function normalizeOrigin(value: string): string {
  const url = new URL(value.includes("://") ? value : `https://${value}`);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error("Site URL must use http or https.");
  }
  return url.origin;
}

export function getSiteOrigin(requestUrl?: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return normalizeOrigin(configured);

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercelHost) return normalizeOrigin(vercelHost);

  if (requestUrl) return new URL(requestUrl).origin;
  return "http://localhost:3000";
}
