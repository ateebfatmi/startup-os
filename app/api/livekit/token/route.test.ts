import { describe, it, expect } from "vitest";
import { POST } from "./route";

describe("POST /api/livekit/token", () => {
  it("rejects invalid request payloads with 400", async () => {
    const req = new Request("http://localhost:3000/api/livekit/token", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid request payload");
  });

  it("returns configured: false when credentials are unconfigured without throwing", async () => {
    const originalApiKey = process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_KEY;

    const req = new Request("http://localhost:3000/api/livekit/token", {
      method: "POST",
      body: JSON.stringify({
        roomName: "boardroom",
        identity: "user_123",
        name: "Alice",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.configured).toBe(false);

    if (originalApiKey) process.env.LIVEKIT_API_KEY = originalApiKey;
  });

  it("generates a signed JWT token when LiveKit credentials are present", async () => {
    process.env.LIVEKIT_API_KEY = "test_api_key";
    process.env.LIVEKIT_API_SECRET = "test_api_secret_must_be_long_enough_for_sha256";
    process.env.NEXT_PUBLIC_LIVEKIT_URL = "wss://test.livekit.cloud";

    const req = new Request("http://localhost:3000/api/livekit/token", {
      method: "POST",
      body: JSON.stringify({
        roomName: "engineering-lab",
        identity: "dev_bob",
        name: "Bob",
        isProximity: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.configured).toBe(true);
    expect(typeof json.token).toBe("string");
    expect(json.url).toBe("wss://test.livekit.cloud");
    expect(json.roomName).toBe("engineering-lab");
    expect(json.identity).toBe("dev_bob");
    expect(json.isProximity).toBe(true);

    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
    delete process.env.NEXT_PUBLIC_LIVEKIT_URL;
  });
});
