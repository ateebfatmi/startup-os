import { validateMigrationTarget, validatePrelaunch } from "./prelaunch-guard.mjs";

try {
  const mode = process.argv[2];
  if (mode !== undefined && mode !== "--migration" && mode !== "--smoke") {
    throw new Error("Expected --migration or --smoke");
  }
  const { origin, ref } = validatePrelaunch(process.env);
  if (mode === "--migration") validateMigrationTarget(process.env.CREWVILLA_PRELAUNCH_DATABASE_URL, ref);
  if (mode === "--smoke") {
    const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    if (!secret) throw new Error("An approved Vercel automation bypass secret is required for smoke checks");
    const url = new URL("/api/health", origin);
    const blocked = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
    if (![301, 302, 303, 307, 308, 401, 403].includes(blocked.status)) {
      throw new Error("Unauthenticated requests must be blocked by Deployment Protection");
    }
    const response = await fetch(url, {
      headers: { "x-vercel-protection-bypass": secret },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Prelaunch health returned HTTP ${response.status}`);
    const health = await response.json();
    if (health?.service !== "crewvilla" || health.status !== "ok" || health.database !== "configured"
      || health.prelaunchProject !== ref) throw new Error("Health response does not attest the approved prelaunch project");
  }
  console.log(`Prelaunch checks passed for ${mode ?? "configuration"}: ${origin} / ${ref}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Prelaunch preflight failed");
  process.exitCode = 1;
}
