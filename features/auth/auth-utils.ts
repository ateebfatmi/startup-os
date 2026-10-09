export function buildWorkspaceSlug(name: string, userId: string, nonce = Date.now().toString(36)) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42) || "workspace";
  const owner = userId.replace(/[^a-z0-9]/gi, "").slice(0, 6).toLowerCase() || "team";
  return `${base}-${owner}-${nonce}`;
}

export function safeNextPath(value: string | null, fallback = "/office") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

export function initialsFor(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "OR";
}
