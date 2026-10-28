const FALLBACK_ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

function publicIceServers(): RTCIceServer[] {
  const configured = process.env.NEXT_PUBLIC_ICE_SERVERS;
  if (!configured) return FALLBACK_ICE_SERVERS;
  try {
    const parsed = JSON.parse(configured) as unknown;
    return Array.isArray(parsed) ? parsed as RTCIceServer[] : FALLBACK_ICE_SERVERS;
  } catch {
    return FALLBACK_ICE_SERVERS;
  }
}

export async function loadIceServers(): Promise<RTCIceServer[]> {
  try {
    const response = await fetch("/api/realtime/ice", { cache: "no-store", signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return publicIceServers();
    const body = await response.json() as { iceServers?: RTCIceServer[] };
    return Array.isArray(body.iceServers) && body.iceServers.length ? body.iceServers : publicIceServers();
  } catch {
    return publicIceServers();
  }
}
