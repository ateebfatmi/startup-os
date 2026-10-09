import { describe, expect, it } from "vitest";
import { buildWorkspaceSlug, initialsFor, safeNextPath } from "./auth-utils";

describe("auth utilities", () => {
  it("creates a safe, unique workspace slug", () => {
    expect(buildWorkspaceSlug("Déjà Vu Studio!", "ABCDEF12-3456", "n1")).toBe("deja-vu-studio-abcdef-n1");
  });

  it("only accepts local redirect paths", () => {
    expect(safeNextPath("/onboarding")).toBe("/onboarding");
    expect(safeNextPath("//evil.example")).toBe("/office");
    expect(safeNextPath("/\\evil.example")).toBe("/office");
    expect(safeNextPath("https://evil.example")).toBe("/office");
  });

  it("builds readable initials", () => {
    expect(initialsFor("Ateeb Fatmi")).toBe("AF");
    expect(initialsFor("Orbit")).toBe("O");
  });
});
