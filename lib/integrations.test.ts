import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decryptIntegrationToken, encryptIntegrationToken, signOAuthState, verifyOAuthState } from "./integrations";

describe("integration security", () => {
  beforeEach(() => {
    vi.stubEnv("INTEGRATION_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
    vi.stubEnv("INTEGRATION_STATE_SECRET", "state-secret-with-enough-entropy-for-tests");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("encrypts tokens with authenticated encryption", () => {
    const encrypted = encryptIntegrationToken("secret-access-token");
    expect(encrypted).not.toContain("secret-access-token");
    expect(decryptIntegrationToken(encrypted)).toBe("secret-access-token");
  });

  it("signs and validates short-lived OAuth state", () => {
    const value = signOAuthState({ provider: "github", workspaceId: "workspace", userId: "user", nonce: "nonce", expiresAt: Date.now() + 60_000 });
    expect(verifyOAuthState(value).provider).toBe("github");
    expect(() => verifyOAuthState(`${value}tampered`)).toThrow("Invalid OAuth state");
  });
});
