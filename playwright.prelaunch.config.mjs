import { defineConfig, devices } from "@playwright/test";
import { validatePrelaunch } from "./scripts/prelaunch-guard.mjs";

const { origin } = validatePrelaunch(process.env);
if (process.env.CREWVILLA_PRELAUNCH_APPROVED_SIGNIN !== "1") {
  throw new Error("Explicit approval for prelaunch test account sign-in is required");
}

export default defineConfig({
  testDir: "./tests/prelaunch",
  workers: 1,
  retries: 0,
  reporter: "list",
  use: { ...devices["Desktop Chrome"], baseURL: origin, trace: "off", screenshot: "off", video: "off" },
});
