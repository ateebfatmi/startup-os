import { describe, expect, it } from "vitest";
import { validateMigrationTarget, validatePrelaunch } from "../../scripts/prelaunch-guard.mjs";

const ref = "abcdefghijklmnopqrst";
const origin = "https://crewvilla-prelaunch.example";
const prelaunch = {
  CREWVILLA_PRELAUNCH: "1",
  CREWVILLA_PRELAUNCH_SUPABASE_REF: ref,
  CREWVILLA_PRELAUNCH_ORIGIN: origin,
  NEXT_PUBLIC_SITE_URL: origin,
  NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_fixture",
  VERCEL_ENV: "preview",
};

describe("prelaunch targeting", () => {
  it("accepts a consistent explicit configuration", () => {
    expect(validatePrelaunch(prelaunch)).toEqual({ origin, ref });
  });

  it.each([
    ["CREWVILLA_PRELAUNCH", ""],
    ["VERCEL_ENV", "production"],
    ["VERCEL_PROJECT_PRODUCTION_URL", "crewvilla-prelaunch.example"],
    ["NEXT_PUBLIC_SITE_URL", "https://production.example"],
    ["NEXT_PUBLIC_SUPABASE_URL", "https://production.supabase.co"],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "sb_secret_fixture"],
    ["STRIPE_SECRET_KEY", "sk_live_fixture"],
    ["NEXT_PUBLIC_ICE_SERVERS", '[{"credential":"fixture"}]'],
  ])("rejects unsafe %s without disclosing its value", (name, value) => {
    expect(() => validatePrelaunch({ ...prelaunch, [name]: value })).toThrow();
  });

  it("checks the project and role claims of legacy Supabase keys", () => {
    const key = (claims) => `header.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`;
    expect(() => validatePrelaunch({ ...prelaunch, NEXT_PUBLIC_SUPABASE_ANON_KEY: key({ role: "anon", ref }) })).not.toThrow();
    expect(() => validatePrelaunch({ ...prelaunch, SUPABASE_SERVICE_ROLE_KEY: key({ role: "service_role", ref: "other" }) })).toThrow();
    expect(() => validatePrelaunch({ ...prelaunch, NEXT_PUBLIC_SUPABASE_ANON_KEY: key({ role: "service_role", ref }) })).toThrow();
  });

  it("requires the exact direct prelaunch database host and verified TLS", () => {
    const url = `postgresql://postgres:fixture@db.${ref}.supabase.co:5432/postgres?sslmode=verify-full`;
    expect(() => validateMigrationTarget(url, ref)).not.toThrow();
    for (const bad of [url.replace(ref, "other"), url.replace("verify-full", "require"), url + "&host=other"]) {
      expect(() => validateMigrationTarget(bad, ref)).toThrow();
    }
  });
});
