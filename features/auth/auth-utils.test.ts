import { describe, expect, it } from "vitest";
import { authCallbackUrl, buildWorkspaceSlug, initialsFor, safeNextPath } from "./auth-utils";

describe("auth utilities", () => {
  it("creates a safe, unique workspace slug", () => {
    expect(buildWorkspaceSlug("Déjà Vu Studio!", "ABCDEF12-3456", "n1")).toBe("deja-vu-studio-abcdef-n1");
  });

  it("only accepts local redirect paths", () => {
    expect(safeNextPath("/onboarding")).toBe("/onboarding");
    expect(safeNextPath("//evil.example")).toBe("/office");
    expect(safeNextPath("/\\evil.example")).toBe("/office");
    expect(safeNextPath("https://evil.example")).toBe("/office");
    expect(safeNextPath("/\n/evil.example")).toBe("/office");
    expect(safeNextPath("/\t/evil.example")).toBe("/office");
  });

  it("keeps the invitation path through an encoded Auth callback", () => {
    const invite = "/invite/accept?token=fixture%2Btoken";
    const callback = new URL(authCallbackUrl("https://stage.example", invite, "/onboarding"));
    expect(callback.origin).toBe("https://stage.example");
    expect(callback.pathname).toBe("/auth/callback");
    expect(callback.searchParams.get("next")).toBe(invite);
    expect(new URL(authCallbackUrl(callback.origin, "/\r/evil.example", "/onboarding")).searchParams.get("next")).toBe("/onboarding");
  });

  it("builds readable initials", () => {
    expect(initialsFor("Ateeb Fatmi")).toBe("AF");
    expect(initialsFor("CrewVilla")).toBe("C");
  });
});
