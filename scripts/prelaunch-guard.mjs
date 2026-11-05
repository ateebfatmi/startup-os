function httpsOrigin(value, label) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${label} must be an HTTPS origin`); }
  if (url.protocol !== "https:" || url.origin !== value || url.username || url.password) {
    throw new Error(`${label} must be an HTTPS origin without a path or credentials`);
  }
  return url.origin;
}

function checkLegacyKey(key, role, ref) {
  let claims;
  try { claims = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8")); }
  catch { throw new Error(`Invalid Supabase ${role} credential format`); }
  if (claims?.role !== role || claims?.ref !== ref) {
    throw new Error(`Supabase ${role} credential does not match the approved prelaunch project`);
  }
}

export function validatePrelaunch(env) {
  if (env.CREWVILLA_PRELAUNCH !== "1") throw new Error("Explicit prelaunch mode is required");
  if (env.VERCEL_ENV && env.VERCEL_ENV !== "preview") throw new Error("Prelaunch configuration requires Vercel Preview");

  const ref = env.CREWVILLA_PRELAUNCH_SUPABASE_REF;
  if (!/^[a-z0-9]{20}$/.test(ref ?? "")) throw new Error("A dedicated prelaunch Supabase project ref is required");
  const origin = httpsOrigin(env.CREWVILLA_PRELAUNCH_ORIGIN, "CREWVILLA_PRELAUNCH_ORIGIN");
  if (env.VERCEL_PROJECT_PRODUCTION_URL && origin === `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`) {
    throw new Error("Prelaunch origin cannot be the Vercel production domain");
  }
  if (httpsOrigin(env.NEXT_PUBLIC_SITE_URL, "NEXT_PUBLIC_SITE_URL") !== origin) {
    throw new Error("Application origin does not match the approved prelaunch origin");
  }
  if (env.NEXT_PUBLIC_SUPABASE_URL !== `https://${ref}.supabase.co`) {
    throw new Error("Supabase URL does not match the approved prelaunch project");
  }

  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!key.startsWith("sb_publishable_")) checkLegacyKey(key, "anon", ref);
  if (env.SUPABASE_SERVICE_ROLE_KEY) checkLegacyKey(env.SUPABASE_SERVICE_ROLE_KEY, "service_role", ref);

  if (env.STRIPE_SECRET_KEY && !/^(sk|rk)_test_\S+$/.test(env.STRIPE_SECRET_KEY)) {
    throw new Error("Prelaunch only accepts Stripe test credentials");
  }
  if (env.NEXT_PUBLIC_ICE_SERVERS && /"credential"\s*:/.test(env.NEXT_PUBLIC_ICE_SERVERS)) {
    throw new Error("Prelaunch TURN credentials must be issued server-side");
  }
  return { origin, ref };
}

export function validateMigrationTarget(value, ref) {
  let url;
  try { url = new URL(value); } catch { throw new Error("A prelaunch direct database URL is required"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol)
    || url.hostname !== `db.${ref}.supabase.co` || url.port !== "5432"
    || url.pathname !== "/postgres" || url.searchParams.get("sslmode") !== "verify-full"
    || url.searchParams.getAll("sslmode").length !== 1
    || [...url.searchParams.keys()].some((key) => !["sslmode", "sslrootcert"].includes(key))
    || url.hash) {
    throw new Error("Database URL must use the approved prelaunch direct host, port 5432, postgres database, and sslmode=verify-full");
  }
}
