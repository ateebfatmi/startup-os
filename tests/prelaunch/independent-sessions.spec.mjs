import { expect, test } from "@playwright/test";
import { validatePrelaunch } from "../../scripts/prelaunch-guard.mjs";

const { origin, ref } = validatePrelaunch(process.env);
const fixture = {
  workspace: process.env.CREWVILLA_PRELAUNCH_FIXTURE_WORKSPACE_ID,
  project: process.env.CREWVILLA_PRELAUNCH_FIXTURE_PROJECT_ID,
};
const identities = ["OWNER", "MEMBER", "OUTSIDER"].map((role) => ({
  role,
  email: process.env[`CREWVILLA_PRELAUNCH_${role}_EMAIL`],
  password: process.env[`CREWVILLA_PRELAUNCH_${role}_PASSWORD`],
}));

test("independent prelaunch accounts enforce the private project read boundary", async ({ browser, request }) => {
  if (!Object.values(fixture).every((value) => /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value ?? ""))) {
    throw new Error("Dedicated synthetic prelaunch workspace and project fixture IDs are required");
  }
  if (identities.some(({ email, password }) => !email || !password)
    || new Set(identities.map(({ email }) => email.toLowerCase())).size !== identities.length) {
    throw new Error("Three distinct synthetic prelaunch identities are required");
  }

  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!secret) throw new Error("An approved Vercel automation bypass secret is required");
  const blocked = await request.get("/api/health", { maxRedirects: 0 });
  expect([301, 302, 303, 307, 308, 401, 403]).toContain(blocked.status());
  const bypass = { "x-vercel-protection-bypass": secret };
  const health = await request.get("/api/health", { maxRedirects: 0, headers: bypass });
  expect(health.ok()).toBe(true);
  expect(await health.json()).toMatchObject({ service: "crewvilla", status: "ok", database: "configured", prelaunchProject: ref });

  const path = `/api/workspace/projects?workspaceId=${fixture.workspace}`;
  expect((await request.get(path, { maxRedirects: 0, headers: bypass })).status()).toBe(401);

  const contexts = [];
  try {
    for (const identity of identities) {
      const context = await browser.newContext({ baseURL: origin, serviceWorkers: "block" });
      contexts.push(context);
      await context.request.get("/api/health", {
        maxRedirects: 0,
        headers: { ...bypass, "x-vercel-set-bypass-cookie": "true" },
      });
      expect((await context.request.get("/api/health", { maxRedirects: 0 })).ok()).toBe(true);
      await context.route("**/*", (route) => {
        const target = new URL(route.request().url()).origin;
        return [origin, `https://${ref}.supabase.co`].includes(target) ? route.continue() : route.abort();
      });
      const page = await context.newPage();
      await page.goto("/login?next=/office");
      expect(new URL(page.url()).origin).toBe(origin);
      try {
        await page.getByLabel("Work email").fill(identity.email);
        await page.locator('input[autocomplete="current-password"]').fill(identity.password);
      } catch {
        throw new Error(`Could not fill the prelaunch sign-in form for ${identity.role}`);
      }
      await page.locator('button[type="submit"]').click();
      await page.waitForURL((url) => url.origin === origin && ["/office", "/onboarding"].includes(url.pathname));

      const response = await context.request.get(path, { maxRedirects: 0 });
      expect(response.ok(), `${identity.role} should have an authenticated session`).toBe(true);
      const { projects } = await response.json();
      if (identity.role === "OUTSIDER") {
        expect(projects.length, "outsider must see no private project rows").toBe(0);
      } else {
        expect(projects.some(({ id }) => id === fixture.project), `${identity.role} should see the synthetic shared project`).toBe(true);
      }
    }
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
