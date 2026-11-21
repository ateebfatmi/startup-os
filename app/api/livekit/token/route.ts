import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";
import { z } from "zod";

const TokenRequestSchema = z.object({
  roomName: z.string().min(1).max(128),
  identity: z.string().min(1).max(128),
  name: z.string().optional(),
  isProximity: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = TokenRequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload", details: parsed.error.format() }, { status: 400 });
    }

    const { roomName, identity, name, isProximity } = parsed.data;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    // Graceful fallback for local evaluation / unconfigured credentials
    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json({
        configured: false,
        message: "LiveKit credentials not configured. Running in mesh WebRTC fallback mode.",
      }, { status: 200 });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: name || identity,
      ttl: "2h",
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      configured: true,
      token,
      url: livekitUrl,
      roomName,
      identity,
      isProximity: Boolean(isProximity),
    });
  } catch (error) {
    console.error("[LiveKit Token API Error]", error);
    return NextResponse.json({ error: "Failed to create LiveKit token" }, { status: 500 });
  }
}
