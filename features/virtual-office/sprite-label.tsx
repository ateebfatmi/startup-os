"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

export function SpriteLabel({
  text,
  position = [0, 0, 0],
  background = "rgba(23, 33, 27, 0.94)",
  color = "#ffffff",
  width = 2.1,
}: {
  text: string;
  position?: [number, number, number];
  background?: string;
  color?: string;
  width?: number;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = background;
    context.beginPath();
    context.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 54);
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.2)";
    context.lineWidth = 4;
    context.stroke();
    context.fillStyle = color;
    context.font = "700 46px ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 1, canvas.width - 48);
    const nextTexture = new THREE.CanvasTexture(canvas);
    nextTexture.colorSpace = THREE.SRGBColorSpace;
    nextTexture.minFilter = THREE.LinearFilter;
    nextTexture.magFilter = THREE.LinearFilter;
    nextTexture.needsUpdate = true;
    return nextTexture;
  }, [background, color, text]);

  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;
  return <sprite position={position} scale={[width, 0.5, 1]} renderOrder={1000}><spriteMaterial map={texture} transparent depthTest={false} depthWrite={false} toneMapped={false} /></sprite>;
}
