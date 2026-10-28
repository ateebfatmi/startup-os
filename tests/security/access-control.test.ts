import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
const migrations = readdirSync(join(root, "supabase/migrations")).sort().map((name) => read(`supabase/migrations/${name}`)).join("\n");

function sourceFiles(directory: string): string[] {
  return readdirSync(join(root, directory)).flatMap((name) => {
    const relative = join(directory, name); const info = statSync(join(root, relative));
    return info.isDirectory() ? sourceFiles(relative) : /\.(ts|tsx|js|mjs)$/.test(name) ? [relative] : [];
  });
}

describe("access-control audit", () => {
  it("enables RLS on every public application table", () => {
    const tables = [...migrations.matchAll(/create table(?: if not exists)? public\.([a-z_]+)/gi)].map((match) => match[1]);
    expect(tables.length).toBeGreaterThan(20);
    for (const table of tables) expect(migrations, `${table} must enable RLS`).toMatch(new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  });

  it("keeps encrypted integration records outside direct client policies", () => {
    expect(migrations).not.toMatch(/create policy[^;]+on public\.integration_(connections|sync_items)/is);
  });

  it("requires an authenticated owner or admin before privileged billing and integration actions", () => {
    const protectedRoutes = [
      "app/api/billing/checkout/route.ts",
      "app/api/billing/portal/route.ts",
      "app/api/integrations/route.ts",
      "app/api/integrations/[provider]/connect/route.ts",
      "app/api/integrations/[provider]/callback/route.ts",
      "app/api/integrations/[provider]/sync/route.ts",
    ];
    for (const route of protectedRoutes) {
      const source = read(route);
      expect(source, `${route} must authenticate`).toContain("auth.getUser");
      expect(source, `${route} must check membership`).toContain("workspace_members");
      expect(source, `${route} must enforce elevated roles`).toMatch(/owner.+admin|admin.+owner/s);
    }
    const webhook = read("app/api/billing/webhook/route.ts");
    expect(webhook).toContain("stripe-signature");
    expect(webhook).toContain("constructEvent");
  });

  it("never references the service-role secret through a public environment variable", () => {
    const source = [...sourceFiles("app"), ...sourceFiles("features"), ...sourceFiles("lib")].map(read).join("\n");
    expect(source).not.toContain("NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY");
  });
});
