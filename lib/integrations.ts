import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type IntegrationProvider = "google_calendar" | "slack" | "github" | "linear" | "spotify";
type ProviderConfig = { clientId?: string; clientSecret?: string; authorizeUrl: string; tokenUrl: string; scopes: string[]; scopeSeparator: string; extraAuthorize?: Record<string, string> };

export function providerConfig(provider: IntegrationProvider): ProviderConfig {
  const configs: Record<IntegrationProvider, ProviderConfig> = {
    google_calendar: { clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID, clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET, authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth", tokenUrl: "https://oauth2.googleapis.com/token", scopes: ["openid", "email", "https://www.googleapis.com/auth/calendar.events.readonly"], scopeSeparator: " ", extraAuthorize: { access_type: "offline", include_granted_scopes: "true", prompt: "consent" } },
    slack: { clientId: process.env.SLACK_CLIENT_ID, clientSecret: process.env.SLACK_CLIENT_SECRET, authorizeUrl: "https://slack.com/oauth/v2/authorize", tokenUrl: "https://slack.com/api/oauth.v2.access", scopes: ["channels:read", "chat:write"], scopeSeparator: "," },
    github: { clientId: process.env.GITHUB_OAUTH_CLIENT_ID, clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET, authorizeUrl: "https://github.com/login/oauth/authorize", tokenUrl: "https://github.com/login/oauth/access_token", scopes: ["read:user", "repo"], scopeSeparator: " " },
    linear: { clientId: process.env.LINEAR_CLIENT_ID, clientSecret: process.env.LINEAR_CLIENT_SECRET, authorizeUrl: "https://linear.app/oauth/authorize", tokenUrl: "https://api.linear.app/oauth/token", scopes: ["read", "write"], scopeSeparator: "," },
    spotify: { clientId: process.env.SPOTIFY_CLIENT_ID, clientSecret: process.env.SPOTIFY_CLIENT_SECRET, authorizeUrl: "https://accounts.spotify.com/authorize", tokenUrl: "https://accounts.spotify.com/api/token", scopes: ["user-read-playback-state", "user-modify-playback-state", "user-read-currently-playing", "playlist-read-private", "streaming"], scopeSeparator: " " },
  };
  return configs[provider];
}

export function isProviderConfigured(provider: IntegrationProvider) { const config = providerConfig(provider); return Boolean(config.clientId && config.clientSecret && process.env.INTEGRATION_ENCRYPTION_KEY && process.env.INTEGRATION_STATE_SECRET); }

function encryptionKey() {
  const encoded = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!encoded) throw new Error("Integration encryption is not configured");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("INTEGRATION_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  return key;
}

export function encryptIntegrationToken(value: string) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv); const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]); const tag = cipher.getAuthTag(); return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptIntegrationToken(value: string) {
  const [version, iv, tag, payload] = value.split("."); if (version !== "v1" || !iv || !tag || !payload) throw new Error("Invalid encrypted token"); const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url")); decipher.setAuthTag(Buffer.from(tag, "base64url")); return Buffer.concat([decipher.update(Buffer.from(payload, "base64url")), decipher.final()]).toString("utf8");
}

export type OAuthState = { provider: IntegrationProvider; workspaceId: string; userId: string; nonce: string; expiresAt: number };
export function signOAuthState(state: OAuthState) { const payload = Buffer.from(JSON.stringify(state)).toString("base64url"); const secret = process.env.INTEGRATION_STATE_SECRET; if (!secret) throw new Error("Integration state signing is not configured"); const signature = createHmac("sha256", secret).update(payload).digest("base64url"); return `${payload}.${signature}`; }
export function verifyOAuthState(value: string): OAuthState {
  const [payload, signature] = value.split("."); const secret = process.env.INTEGRATION_STATE_SECRET; if (!payload || !signature || !secret) throw new Error("Invalid OAuth state"); const expected = createHmac("sha256", secret).update(payload).digest(); const actual = Buffer.from(signature, "base64url"); if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new Error("Invalid OAuth state"); const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthState; if (state.expiresAt < Date.now()) throw new Error("OAuth state expired"); return state;
}

export const integrationProviders: IntegrationProvider[] = ["google_calendar", "slack", "github", "linear", "spotify"];
