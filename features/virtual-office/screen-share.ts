"use client";

import { useOfficeStore } from "./store";
import { playChime } from "./audio";

export async function startScreenShare(presenterName = "You") {
  if (typeof window === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
    alert("Screen sharing is not supported in this browser environment.");
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: "monitor",
      },
      audio: false,
    });

    useOfficeStore.getState().setScreenSharing(true, stream, presenterName);
    playChime();

    // Listen for user stopping share via browser UI
    const track = stream.getVideoTracks()[0];
    if (track) {
      track.onended = () => {
        stopScreenShare();
      };
    }

    return true;
  } catch (err: unknown) {
    if ((err as Error)?.name !== "NotAllowedError") {
      console.warn("Screen share request failed:", err);
    }
    return false;
  }
}

export function stopScreenShare() {
  const stream = useOfficeStore.getState().screenStream;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  useOfficeStore.getState().setScreenSharing(false, null, null);
  playChime();
}
