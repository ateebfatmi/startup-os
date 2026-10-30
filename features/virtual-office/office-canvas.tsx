"use client";

import { ContactShadows, Html, OrthographicCamera, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Hand } from "lucide-react";
import * as THREE from "three";
import { COLLIDERS, resolveMovement } from "./collision";
import { INTERACTION_ZONES, OFFICE_ROOMS } from "./office-data";
import { useOfficeStore } from "./store";
import { playChime, playCoffeeSound, playLofiMusic, playSlideClick, stopLofiMusic } from "./audio";
import { AITeammateAvatars, AI_TEAMMATES } from "./ai-teammates";
import { OFFICE_THEME_PALETTES } from "./office-design";
import { OFFICE_OBJECT_CATALOG, officeObjectCollider, type OfficeObject } from "./office-object-catalog";
import { AvatarModel } from "./avatar-model";

const keys = new Set<string>();

export function OfficeCanvas() {
  const lightingMode = useOfficeStore((state) => state.lightingMode);
  const avatarAssetReady = useOfficeStore((state) => state.avatarAssetReady);
  const qualityMode = useOfficeStore((state) => state.qualityMode);
  const measuredFps = useOfficeStore((state) => state.measuredFps);
  const rendererClass = useOfficeStore((state) => state.rendererClass);

  // Dynamic Lighting Themes
  const lighting = useMemo(() => {
    switch (lightingMode) {
      case "sunset":
        return {
          hemiSky: "#ffd1a8",
          hemiGround: "#36221c",
          hemiIntensity: 1.25,
          ambient: 0.45,
          sunColor: "#ff923d",
          sunIntensity: 2.6,
          sunPos: [14, 18, 12] as [number, number, number],
          canvasBg: "#2d2024",
          roomLights: {
            boardroom: "#ffd2a6",
            lounge: "#ffb47a",
            aiPod: "#5cd0ff",
            phoneBooth: "#ffa552",
          },
          skyline: {
            towerColor: "#3d2b2c",
            windowColor: "#ffbe7d",
            windowOpacity: 0.75,
          },
        };
      case "night":
        return {
          hemiSky: "#223b5c",
          hemiGround: "#0b141e",
          hemiIntensity: 0.7,
          ambient: 0.32,
          sunColor: "#5ca8ff",
          sunIntensity: 1.15,
          sunPos: [6, 20, 8] as [number, number, number],
          canvasBg: "#111720",
          roomLights: {
            boardroom: "#ffe4b8",
            lounge: "#ffd094",
            aiPod: "#5ce0ff",
            phoneBooth: "#ff9a3c",
          },
          skyline: {
            towerColor: "#101924",
            windowColor: "#4ee3ff",
            windowOpacity: 0.85,
          },
        };
      case "day":
      default:
        return {
          hemiSky: "#ffffff",
          hemiGround: "#e5ded4",
          hemiIntensity: 1.35,
          ambient: 0.58,
          sunColor: "#fff7e8",
          sunIntensity: 2.2,
          sunPos: [8, 26, 12] as [number, number, number],
          canvasBg: "#ebe6dc",
          roomLights: {
            boardroom: "#fff3db",
            lounge: "#ffe8cc",
            aiPod: "#72e5ff",
            phoneBooth: "#ffc285",
          },
          skyline: {
            towerColor: "#d9d2c5",
            windowColor: "#ffffff",
            windowOpacity: 0.4,
          },
        };
    }
  }, [lightingMode]);

  return (
    <div className="relative h-full w-full">
      <span className="sr-only">You</span>
      {avatarAssetReady && <span className="sr-only">Animated GLTF avatar ready</span>}
      <output aria-label="3D frame rate" data-fps={measuredFps.toFixed(1)} data-renderer-class={rendererClass} className="sr-only">{measuredFps.toFixed(1)} FPS</output>
      <Canvas
      dpr={qualityMode === "reduced" ? 1 : [1, 2]}
      shadows={qualityMode === "high"}
      style={{ width: "100%", height: "100%" }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={[lighting.canvasBg]} />
      <OrthographicCamera
        makeDefault
        position={[0, 34, 1.5]}
        zoom={32}
        near={0.1}
        far={160}
        onUpdate={(camera) => {
          camera.up.set(0, 0, -1);
          camera.lookAt(0, 0, 1.5);
        }}
      />
      <CameraRig />
      <hemisphereLight args={[lighting.hemiSky, lighting.hemiGround, lighting.hemiIntensity]} />
      <ambientLight intensity={lighting.ambient} />
      <directionalLight
        castShadow
        position={lighting.sunPos}
        color={lighting.sunColor}
        intensity={lighting.sunIntensity}
        shadow-mapSize={qualityMode === "reduced" ? [1024, 1024] : [2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-bias={-0.0003}
      />

      {/* Atmospheric Zone Accent Lights */}
      <pointLight position={[-5.8, 3.2, -3.7]} color={lighting.roomLights.boardroom} intensity={lightingMode === "night" ? 18 : 10} distance={8} decay={2} />
      <pointLight position={[-5.8, 3.2, 3.4]} color="#ffecd1" intensity={lightingMode === "night" ? 14 : 8} distance={7} decay={2} />
      <pointLight position={[8.5, 2.2, -3.4]} color={lighting.roomLights.aiPod} intensity={lightingMode === "night" ? 24 : 16} distance={8} decay={2} />
      <pointLight position={[5.8, 3.2, 3.6]} color={lighting.roomLights.lounge} intensity={lightingMode === "night" ? 16 : 9} distance={7} decay={2} />
      <pointLight position={[0, 2.8, 5.9]} color="#ffe9be" intensity={lightingMode === "night" ? 12 : 7} distance={6} decay={2} />
      <pointLight position={[2.4, 2.2, -6.4]} color={lighting.roomLights.phoneBooth} intensity={lightingMode === "night" ? 8 : 4} distance={4} />

      {/* City Skyline Silhouette Backdrop */}
      <CitySkyline skylineConfig={lighting.skyline} />

      <OfficeEnvironment />
      <CustomOfficeObjects />
      {qualityMode === "high" && <ContactShadows position={[0, 0.05, 1.8]} opacity={lightingMode === "night" ? 0.48 : 0.35} scale={36} blur={2.0} far={8} frames={1} />}
      <FloorClickSurface />
      <ClickTargetMarker />
      <LocalPlayer />
      <RemotePlayers />
      <FrameMetrics />
      </Canvas>
      <TouchControls />
    </div>
  );
}

function FrameMetrics() {
  const frameCount = useRef(0); const startedAt = useRef(performance.now());
  const setMeasuredFps = useOfficeStore((state) => state.setMeasuredFps);
  const setRendererClass = useOfficeStore((state) => state.setRendererClass);
  const setQualityMode = useOfficeStore((state) => state.setQualityMode);
  const { gl } = useThree();
  useEffect(() => {
    const context = gl.getContext();
    const debug = context.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER));
    const software = /swiftshader|llvmpipe|software/i.test(renderer);
    setRendererClass(software ? "software" : "hardware");
    if (software) setQualityMode("reduced");
  }, [gl, setQualityMode, setRendererClass]);
  useFrame(() => {
    frameCount.current += 1; const now = performance.now(); const elapsed = now - startedAt.current;
    if (elapsed < 2_000) return;
    setMeasuredFps(frameCount.current / elapsed * 1_000); frameCount.current = 0; startedAt.current = now;
  });
  return null;
}

function TouchControls() {
  const setTouchInput = useOfficeStore((state) => state.setTouchInput);
  const nearbyAction = useOfficeStore((state) => state.nearbyAction);
  const openPanel = useOfficeStore((state) => state.openPanel);
  const player = useOfficeStore((state) => state.player);
  const bind = (x: number, z: number) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); setTouchInput({ x, z }); },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); setTouchInput({ x: 0, z: 0 }); },
    onPointerCancel: () => setTouchInput({ x: 0, z: 0 }),
  });
  return <div className="pointer-events-none absolute inset-x-0 bottom-20 z-20 flex items-end justify-between px-4 md:hidden">
    <div className="pointer-events-auto grid grid-cols-3 grid-rows-3 gap-1 rounded-[22px] border border-white/40 bg-[#fffdf7]/90 p-2 shadow-xl backdrop-blur touch-none">
      <span /><TouchButton label="Move up" icon={ArrowUp} {...bind(0, -1)} /><span />
      <TouchButton label="Move left" icon={ArrowLeft} {...bind(-1, 0)} /><div aria-label="Player position" data-x={player.x.toFixed(2)} data-z={player.z.toFixed(2)} className="grid h-11 w-11 place-items-center rounded-xl bg-[#173f2b] text-[9px] font-bold text-[#c8f560]">MOVE</div><TouchButton label="Move right" icon={ArrowRight} {...bind(1, 0)} />
      <span /><TouchButton label="Move down" icon={ArrowDown} {...bind(0, 1)} /><span />
    </div>
    <button aria-label="Interact" disabled={!nearbyAction} onClick={() => nearbyAction && openPanel(nearbyAction.kind)} className="pointer-events-auto grid h-14 w-14 place-items-center rounded-full border border-white/40 bg-[#c8f560]/95 text-[#173f2b] shadow-xl backdrop-blur disabled:opacity-40"><Hand size={21} /></button>
  </div>;
}

function TouchButton({ label, icon: Icon, ...events }: { label: string; icon: typeof ArrowUp; onPointerDown: React.PointerEventHandler<HTMLButtonElement>; onPointerUp: React.PointerEventHandler<HTMLButtonElement>; onPointerCancel: React.PointerEventHandler<HTMLButtonElement> }) {
  return <button aria-label={label} className="grid h-11 w-11 touch-none place-items-center rounded-xl bg-white text-[#173f2b] shadow-sm active:bg-[#c8f560]" {...events}><Icon size={19} /></button>;
}

function SpriteLabel({
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

  return (
    <sprite position={position} scale={[width, 0.5, 1]} renderOrder={1000}>
      <spriteMaterial map={texture} transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

function CameraRig() {
  const player = useOfficeStore((state) => state.player);
  const cameraMode = useOfficeStore((state) => state.cameraMode);
  const zoomLevel = useOfficeStore((state) => state.zoomLevel);
  const { size, gl } = useThree();

  // Mouse wheel scroll zoom support
  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.12 : 0.12;
      const current = useOfficeStore.getState().zoomLevel;
      useOfficeStore.getState().setZoomLevel(current + delta);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [gl]);

  useFrame(({ camera }, delta) => {
    const isTop = cameraMode === "top";
    if (isTop) {
      // True overhead floor-plan view that keeps the full office in frame.
      const desiredPos = new THREE.Vector3(0, 34, 1.5);
      const desiredLook = new THREE.Vector3(0, 0, 1.5);
      camera.position.lerp(desiredPos, 1 - Math.exp(-delta * 5));
      camera.up.set(0, 0, -1);
      camera.lookAt(desiredLook);

      // Comfortable margins keep the terrace and HUD from crowding the floor plan.
      const baseZoom = Math.min((size.width - 120) / 31, (size.height - 80) / 25);
      const targetZoom = baseZoom * zoomLevel;
      if ("zoom" in camera) {
        camera.zoom = THREE.MathUtils.lerp(camera.zoom, targetZoom, 1 - Math.exp(-delta * 5));
        camera.updateProjectionMatrix();
      }
    } else {
      // Follow mode: smoothly follow player from isometric 3rd person angle
      const desiredPos = new THREE.Vector3(player.x, 15, player.z + 14);
      camera.position.lerp(desiredPos, 1 - Math.exp(-delta * 4));
      camera.up.set(0, 1, 0);
      camera.lookAt(player.x, 0.6, player.z);

      const baseZoom = Math.min(size.width / 16, size.height / 11);
      const targetZoom = baseZoom * zoomLevel;
      if ("zoom" in camera) {
        camera.zoom = THREE.MathUtils.lerp(camera.zoom, targetZoom, 1 - Math.exp(-delta * 4));
        camera.updateProjectionMatrix();
      }
    }
  });

  return null;
}

function FloorClickSurface() {
  const setClickTarget = useOfficeStore((state) => state.setClickTarget);
  const setIsSitting = useOfficeStore((state) => state.setIsSitting);

  return (
    <mesh
      position={[0, 0.02, 2.0]}
      rotation-x={-Math.PI / 2}
      onPointerDown={(e) => {
        e.stopPropagation();
        setIsSitting(false);
        setClickTarget({ x: e.point.x, z: e.point.z });
      }}
      visible={false}
    >
      <planeGeometry args={[28, 24]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

function ClickTargetMarker() {
  const clickTarget = useOfficeStore((state) => state.clickTarget);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (ringRef.current && clickTarget) {
      const scale = 1 + Math.sin(performance.now() / 140) * 0.16;
      ringRef.current.scale.set(scale, scale, 1);
    }
  });

  if (!clickTarget) return null;

  return (
    <group position={[clickTarget.x, 0.06, clickTarget.z]}>
      <mesh ref={ringRef} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.24, 0.34, 32]} />
        <meshBasicMaterial color="#c8f560" transparent opacity={0.85} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.12, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function LocalPlayer() {
  const group = useRef<THREE.Group>(null);
  const position = useRef(new THREE.Vector2(0, 1.6));
  const velocity = useRef(new THREE.Vector2());
  const rotation = useRef(Math.PI);
  const walkPhase = useRef(0);
  const motion = useRef(0);
  const lastStoreUpdate = useRef(0);

  const setPlayerTransform = useOfficeStore((state) => state.setPlayerTransform);
  const setNearbyAction = useOfficeStore((state) => state.setNearbyAction);
  const openPanel = useOfficeStore((state) => state.openPanel);
  const openAITeammate = useOfficeStore((state) => state.openAITeammate);
  const toggleCameraMode = useOfficeStore((state) => state.toggleCameraMode);
  const nearbyAction = useOfficeStore((state) => state.nearbyAction);
  const clickTarget = useOfficeStore((state) => state.clickTarget);
  const setClickTarget = useOfficeStore((state) => state.setClickTarget);
  const isCaffeinated = useOfficeStore((state) => state.isCaffeinated);
  const setIsCaffeinated = useOfficeStore((state) => state.setIsCaffeinated);
  const toggleLofi = useOfficeStore((state) => state.toggleLofi);
  const isSitting = useOfficeStore((state) => state.isSitting);
  const setIsSitting = useOfficeStore((state) => state.setIsSitting);
  const setAvatarAssetReady = useOfficeStore((state) => state.setAvatarAssetReady);

  // Keyboard controls
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
      keys.add(event.key.toLowerCase());
      if ((event.key.toLowerCase() === "e" || event.key.toLowerCase() === "x" || event.key === "Enter") && nearbyAction) {
        if (nearbyAction.teammateId) {
          playChime();
          openAITeammate(nearbyAction.teammateId);
        } else if (nearbyAction.special === "espresso") {
          playCoffeeSound();
          setIsCaffeinated(true);
        } else if (nearbyAction.special === "vinyl") {
          playChime();
          toggleLofi();
        } else {
          playChime();
          openPanel(nearbyAction.kind);
        }
      }
      if (event.key.toLowerCase() === "v") toggleCameraMode();
      if (event.key.toLowerCase() === "f") setIsSitting(!isSitting);
    };
    const up = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      keys.clear();
    };
  }, [nearbyAction, openPanel, openAITeammate, toggleCameraMode, isSitting, setIsSitting, setIsCaffeinated, toggleLofi]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30);
    const wasd = new THREE.Vector2(
      Number(keys.has("d") || keys.has("arrowright")) - Number(keys.has("a") || keys.has("arrowleft")),
      Number(keys.has("s") || keys.has("arrowdown")) - Number(keys.has("w") || keys.has("arrowup")),
    );
    const touch = useOfficeStore.getState().touchInput;
    if (wasd.lengthSq() === 0 && (touch.x || touch.z)) wasd.set(touch.x, touch.z);

    // Stand up if movement key pressed
    if (wasd.lengthSq() > 0 && isSitting) {
      setIsSitting(false);
    }

    let input = wasd;
    if (wasd.lengthSq() > 0) {
      if (clickTarget) setClickTarget(null);
      input.normalize();
    } else if (clickTarget && !isSitting) {
      const toTarget = new THREE.Vector2(clickTarget.x - position.current.x, clickTarget.z - position.current.y);
      if (toTarget.length() < 0.28) {
        setClickTarget(null);
        input.set(0, 0);
      } else {
        input = toTarget.normalize();
      }
    }

    // Speed boost when caffeinated (+30%)
    const maxSpeed = isSitting ? 0 : isCaffeinated ? 5.8 : 4.5;
    velocity.current.lerp(input.multiplyScalar(maxSpeed), 1 - Math.exp(-delta * 12));
    if (velocity.current.lengthSq() < 0.005) velocity.current.set(0, 0);

    const speed = velocity.current.length();
    motion.current = speed;

    // Walking animation phase
    if (speed > 0.1) {
      walkPhase.current += delta * speed * 2.8;
    } else {
      walkPhase.current = THREE.MathUtils.lerp(walkPhase.current, 0, 0.15);
    }

    const customObjects = useOfficeStore.getState().officeObjects;
    const next = resolveMovement(
      { x: position.current.x, z: position.current.y },
      { x: position.current.x + velocity.current.x * delta, z: position.current.y + velocity.current.y * delta },
      [...COLLIDERS, ...customObjects.map(officeObjectCollider)],
    );

    // Cancel clickTarget if blocked
    if (clickTarget && Math.hypot(next.x - position.current.x, next.z - position.current.y) < 0.001 && speed > 0.1) {
      setClickTarget(null);
    }

    position.current.set(next.x, next.z);
    if (velocity.current.lengthSq() > 0.08) rotation.current = Math.atan2(velocity.current.x, velocity.current.y);

    if (group.current) {
      const bob = Math.abs(Math.sin(walkPhase.current * 2)) * Math.min(speed / 45, 0.05);
      const targetY = isSitting ? 0.32 : 0.06 + bob;
      group.current.position.set(next.x, targetY, next.z);
      group.current.rotation.y = rotation.current;

    }

    // Nearby interaction zone detection
    const zone = INTERACTION_ZONES.find((item) => Math.hypot(item.x - next.x, item.z - next.z) <= item.radius);
    const customAction = customObjects.find((item) => item.interaction && Math.hypot(item.transform.x - next.x, item.transform.z - next.z) <= 1.45);

    // AI Teammates proximity
    const nearTeammate = Object.values(AI_TEAMMATES).find((t) => Math.hypot(t.position[0] - next.x, t.position[2] - next.z) <= 1.8);
    // Smart Stations proximity
    const nearEspresso = Math.hypot(8.1 - next.x, 2.4 - next.z) <= 1.5;
    const nearVinyl = Math.hypot(6.8 - next.x, 5.2 - next.z) <= 1.5;
    const nearPhoneBooth = Math.hypot(2.4 - next.x, -6.4 - next.z) <= 1.4;

    const action = nearTeammate
      ? { kind: "ai_assistant" as const, label: `Talk to ${nearTeammate.name} (${nearTeammate.role})`, teammateId: nearTeammate.id }
      : nearEspresso
      ? { kind: "focus" as const, label: "Brew Italian espresso (+Speed boost)", special: "espresso" }
      : nearVinyl
      ? { kind: "focus" as const, label: useOfficeStore.getState().lofiPlaying ? "Pause Lo-Fi turntable" : "Play Lo-Fi chill beats", special: "vinyl" }
      : nearPhoneBooth
      ? { kind: "focus" as const, label: "Enter acoustic phone booth", special: "phone_booth" }
      : zone
      ? { kind: zone.kind, label: zone.hint }
      : customAction?.interaction || null;

    if (action?.label !== useOfficeStore.getState().nearbyAction?.label) setNearbyAction(action);

    const now = performance.now();
    if (now - lastStoreUpdate.current >= 1000 / 20) {
      lastStoreUpdate.current = now;
      setPlayerTransform(next.x, next.z, rotation.current);
    }
  });

  return (
    <group ref={group}>
      {/* Dynamic Ground Shadow */}
      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.22, 0.44, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} />
      </mesh>

      <AvatarModel
        color={isCaffeinated ? "#ff7030" : "#ff8a4c"}
        motion={motion}
        seated={isSitting}
        caffeinated={isCaffeinated}
        showProximityRing={true}
        onAssetReady={() => setAvatarAssetReady(true)}
      />

      <SpriteLabel
        text={`● You${isCaffeinated ? "  ☕" : ""}${isSitting ? "  Seated" : ""}`}
        position={[0, 1.78, 0]}
        color="#ffffff"
        width={isCaffeinated || isSitting ? 2.8 : 1.8}
      />
    </group>
  );
}

function RemotePlayers() {
  const players = useOfficeStore((state) => state.remotePlayers);
  return <>{Object.values(players).map((player) => <RemotePlayer key={player.id} player={player} />)}</>;
}

function RemotePlayer({ player }: { player: ReturnType<typeof useOfficeStore.getState>["player"] }) {
  const group = useRef<THREE.Group>(null);
  const targetPosition = useRef(new THREE.Vector3(player.x, 0.06, player.z));
  const targetRotation = useRef(player.rotation);
  const motion = useRef(0);

  useEffect(() => {
    targetPosition.current.set(player.x, 0.06, player.z);
    targetRotation.current = player.rotation;
  }, [player.x, player.z, player.rotation]);

  useFrame((_, delta) => {
    if (!group.current) return;
    const dist = group.current.position.distanceTo(targetPosition.current);
    motion.current = dist / Math.max(delta, 0.001);

    group.current.position.lerp(targetPosition.current, 1 - Math.exp(-delta * 10));
    const difference = Math.atan2(Math.sin(targetRotation.current - group.current.rotation.y), Math.cos(targetRotation.current - group.current.rotation.y));
    group.current.rotation.y += difference * (1 - Math.exp(-delta * 12));

  });

  return (
    <group ref={group} position={[player.x, 0.06, player.z]} rotation-y={player.rotation}>
      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.22, 0.44, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} />
      </mesh>
      <AvatarModel color={player.color} motion={motion} />
      <SpriteLabel text={player.name} position={[0, 1.78, 0]} background="rgba(255,255,255,0.96)" color="#17211b" width={2.2} />
    </group>
  );
}

// Distant Minimalist City Skyline Silhouette Backdrop
function CitySkyline({ skylineConfig }: { skylineConfig: { towerColor: string; windowColor: string; windowOpacity: number } }) {
  const towers = useMemo(() => [
    { x: -16, z: -17, w: 3.4, d: 3.2, h: 10.5 },
    { x: -11.5, z: -20, w: 2.8, d: 2.6, h: 14.2 },
    { x: -7.5, z: -16, w: 3.2, d: 3.0, h: 8.8 },
    { x: -3.2, z: -22, w: 4.2, d: 3.8, h: 16.0 },
    { x: 1.5, z: -18, w: 3.0, d: 2.8, h: 11.4 },
    { x: 6.2, z: -21, w: 3.6, d: 3.2, h: 13.8 },
    { x: 11.0, z: -16, w: 2.8, d: 2.8, h: 9.6 },
    { x: 15.8, z: -19, w: 3.5, d: 3.2, h: 12.0 },
  ], []);

  return (
    <group>
      {towers.map((tower, i) => (
        <group key={i} position={[tower.x, tower.h / 2 - 0.4, tower.z]}>
          <mesh>
            <boxGeometry args={[tower.w, tower.h, tower.d]} />
            <meshStandardMaterial color={skylineConfig.towerColor} roughness={0.75} />
          </mesh>
          {/* Subtle Window Grid Strips */}
          {[-tower.h / 4, 0, tower.h / 4].map((yOff) => (
            <mesh key={yOff} position={[0, yOff, tower.d / 2 + 0.02]}>
              <planeGeometry args={[tower.w * 0.75, 0.4]} />
              <meshBasicMaterial color={skylineConfig.windowColor} transparent opacity={skylineConfig.windowOpacity} />
            </mesh>
          ))}
          {/* Rooftop Antenna Spire */}
          {i % 2 === 0 && (
            <mesh position={[0, tower.h / 2 + 0.8, 0]}>
              <cylinderGeometry args={[0.03, 0.05, 1.6, 8]} />
              <meshBasicMaterial color="#a0abb5" />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

function CustomOfficeObjects() {
  const objects = useOfficeStore((state) => state.officeObjects);
  return <group>{objects.map((object) => <CustomOfficeObject key={object.id} object={object} />)}</group>;
}

function CustomOfficeObject({ object }: { object: OfficeObject }) {
  const openPanel = useOfficeStore((state) => state.openPanel);
  const { x, y, z, rotationY, scale } = object.transform;
  const interactive = Boolean(object.interaction);
  return <group position={[x, y, z]} rotation-y={rotationY} scale={scale} onClick={interactive ? (event) => { event.stopPropagation(); openPanel(object.interaction!.kind); } : undefined}>
    {object.assetKey === "planter" && <><RoundedBox args={[0.75, 0.55, 0.75]} radius={0.1} position={[0, 0.28, 0]} castShadow><meshStandardMaterial color="#6a4b36" roughness={0.8} /></RoundedBox><mesh position={[0, 0.78, 0]} castShadow><sphereGeometry args={[0.46, 14, 10]} /><meshStandardMaterial color="#47705a" roughness={0.9} /></mesh></>}
    {object.assetKey === "floor_lamp" && <><mesh position={[0, 0.06, 0]} castShadow><cylinderGeometry args={[0.28, 0.34, 0.12, 20]} /><meshStandardMaterial color="#7b633d" metalness={0.75} roughness={0.3} /></mesh><mesh position={[0, 1.05, 0]} castShadow><cylinderGeometry args={[0.035, 0.045, 2, 12]} /><meshStandardMaterial color="#b69350" metalness={0.8} roughness={0.25} /></mesh><mesh position={[0, 2.03, 0]} castShadow><coneGeometry args={[0.38, 0.55, 20, 1, true]} /><meshStandardMaterial color="#f1dfb5" roughness={0.7} side={THREE.DoubleSide} /></mesh><pointLight position={[0, 1.9, 0]} intensity={3} distance={3.5} color="#ffdca0" /></>}
    {object.assetKey === "lounge_bench" && <><RoundedBox args={[2.4, 0.42, 0.85]} radius={0.15} position={[0, 0.38, 0]} castShadow><meshStandardMaterial color="#435a50" roughness={0.9} /></RoundedBox><RoundedBox args={[2.2, 0.55, 0.2]} radius={0.08} position={[0, 0.82, -0.34]} castShadow><meshStandardMaterial color="#365047" roughness={0.9} /></RoundedBox></>}
    {object.assetKey === "whiteboard" && <><RoundedBox args={[2.4, 1.55, 0.14]} radius={0.08} position={[0, 1.15, 0]} castShadow><meshStandardMaterial color="#715439" roughness={0.65} /></RoundedBox><mesh position={[0, 1.15, 0.081]}><planeGeometry args={[2.15, 1.3]} /><meshStandardMaterial color="#f7f3e8" roughness={0.45} /></mesh><mesh position={[-0.72, 1.34, 0.09]} rotation-z={-0.08}><boxGeometry args={[0.55, 0.045, 0.025]} /><meshBasicMaterial color="#c8f560" /></mesh></>}
    {object.assetKey === "focus_pod" && <><RoundedBox args={[1.5, 2.2, 1.5]} radius={0.25} position={[0, 1.1, 0]} castShadow><meshStandardMaterial color="#263d35" roughness={0.65} /></RoundedBox><mesh position={[0, 1.12, 0.756]}><planeGeometry args={[1.05, 1.55]} /><meshStandardMaterial color="#88a99a" transparent opacity={0.42} metalness={0.2} roughness={0.2} /></mesh><pointLight position={[0, 1.7, 0]} intensity={4} distance={2.5} color="#c8f560" /></>}
    {interactive && <SpriteLabel text={OFFICE_OBJECT_CATALOG[object.assetKey].label} position={[0, object.assetKey === "floor_lamp" ? 2.6 : 2.45, 0]} width={2.5} />}
  </group>;
}

function EmoteParticleManager() {
  const recentEmotes = useOfficeStore((state) => state.recentEmotes);
  const [now, setNow] = useState(Date.now());

  useFrame(() => {
    setNow(Date.now());
  });

  const activeEmotes = recentEmotes.filter((e) => now - e.createdAt < 2800);

  return (
    <group>
      {activeEmotes.map((e) => {
        const elapsed = (now - e.createdAt) / 1000;
        const yOffset = elapsed * 0.85;
        const opacity = Math.max(0, 1 - elapsed / 2.8);
        const scale = Math.min(1.3, 0.6 + elapsed * 0.7);

        return (
          <Html
            key={e.id}
            center
            position={[e.x, e.y + yOffset, e.z]}
            style={{
              opacity,
              transform: `scale(${scale})`,
              transition: "transform 0.05s linear",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            <div className="text-2xl filter drop-shadow-md animate-bounce">
              {e.emoji}
            </div>
          </Html>
        );
      })}
    </group>
  );
}

function ProximityAudioBeams() {
  const player = useOfficeStore((state) => state.player);
  const remotePlayers = useOfficeStore((state) => state.remotePlayers);

  // Find AI teammates within 3.2m
  const connectedAIs = Object.values(AI_TEAMMATES).filter((t) => {
    return Math.hypot(t.position[0] - player.x, t.position[2] - player.z) <= 3.2;
  });

  // Find remote players within 3.2m
  const connectedRemotes = Object.values(remotePlayers).filter((r) => {
    return Math.hypot(r.x - player.x, r.z - player.z) <= 3.2;
  });

  return (
    <group>
      {connectedAIs.map((t) => (
        <AudioConnectionBeam
          key={t.id}
          from={[player.x, player.z]}
          to={[t.position[0], t.position[2]]}
          color={t.accent}
          name={t.name}
        />
      ))}
      {connectedRemotes.map((r) => (
        <AudioConnectionBeam
          key={r.id}
          from={[player.x, player.z]}
          to={[r.x, r.z]}
          color="#c8f560"
          name={r.name}
        />
      ))}
    </group>
  );
}

function AudioConnectionBeam({
  from,
  to,
  color,
  name,
}: {
  from: [number, number];
  to: [number, number];
  color: string;
  name: string;
}) {
  const lineRef = useRef<THREE.Mesh>(null);
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  const angle = Math.atan2(dz, dx);
  const midX = (from[0] + to[0]) / 2;
  const midZ = (from[1] + to[1]) / 2;

  useFrame(() => {
    if (lineRef.current) {
      const mat = lineRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.4 + Math.sin(performance.now() / 240) * 0.25;
      }
    }
  });

  return (
    <group position={[midX, 0.038, midZ]} rotation-y={-angle}>
      {/* Glowing Audio Connection Mesh */}
      <mesh ref={lineRef} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[length, 0.08]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
      {/* Midpoint WebRTC Proximity Audio Node */}
      <mesh position={[0, 0.005, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.08, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function OfficeEnvironment() {
  const deskPositions = useMemo(() => [[4.8, -4.7], [7, -4.7], [4.8, -2.2], [7, -2.2]] as const, []);
  const activeNearby = useOfficeStore((state) => state.nearbyAction);
  const design = useOfficeStore((state) => state.officeDesign);
  const palette = OFFICE_THEME_PALETTES[design.theme];

  return (
    <group>
      <Floor />
      {design.terraceEnabled && <PenthouseTerrace />}
      <AITeammateAvatars />
      <ProximityAudioBeams />
      <EmoteParticleManager />

      {/* Zone Carpets & Inlays */}
      <RoomRug position={[-5.8, 0.045, -3.7]} color={palette.rug} trim={design.accentColor} size={[6.4, 4.8]} />
      <RoomRug position={[-5.8, 0.045, 3.45]} color={palette.rug} trim={design.accentColor} size={[6.4, 4.6]} />
      <RoomRug position={[5.8, 0.045, 3.55]} color={design.theme === "midnight" ? "#352735" : "#56382b"} trim={design.accentColor} size={[6.3, 4.7]} />
      <RoomRug position={[5.8, 0.045, -3.45]} color={design.theme === "biophilic" ? "#294b3b" : "#222b30"} trim={design.accentColor} size={[6.3, 4.8]} />

      <Walls />
      <GlassPartitions />
      <Reception />
      <MeetingTable />
      <BoardroomScreen />
      <ProjectTable />
      {deskPositions.map(([x, z], i) => <Desk key={`${x}-${z}`} position={[x, 0, z]} deskIndex={i} />)}
      <Lounge />
      <EspressoStation />
      <VinylLofiPlayer />
      <PhoneBooth />
      <WaterCooler />
      <Whiteboard />
      <LibraryWall />
      <AIPod />
      <LightingDetails />
      {design.plantsEnabled && <Plants />}
      <RoomWayfinding />

      {/* Clean, Subtle Interactive Zone Floor Rings */}
      {INTERACTION_ZONES.map((zone) => {
        const isNear = activeNearby?.kind === zone.kind;
        return (
          <group key={zone.id} position={[zone.x, 0.048, zone.z]}>
            <mesh rotation-x={-Math.PI / 2}>
              <ringGeometry args={[0.55, 0.65, 36]} />
              <meshBasicMaterial color={isNear ? design.accentColor : "#ffffff"} transparent opacity={isNear ? 0.9 : 0.28} />
            </mesh>
            <mesh rotation-x={-Math.PI / 2}>
              <circleGeometry args={[0.52, 32]} />
              <meshBasicMaterial color={isNear ? design.accentColor : "#ffffff"} transparent opacity={isNear ? 0.15 : 0.04} />
            </mesh>
            {isNear && <SpriteLabel text={zone.label.toUpperCase()} position={[0, 0.32, 0]} color="#c8f560" width={2.4} />}
          </group>
        );
      })}
    </group>
  );
}

function RoomWayfinding() {
  return <group>
    {OFFICE_ROOMS.map((room) => <group key={room.id} position={[room.labelPosition.x, 0.055, room.labelPosition.z]}>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[2.55, 0.5]} />
        <meshBasicMaterial color="#fffdf7" transparent opacity={0.82} />
      </mesh>
      <mesh position={[-1.08, 0.004, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.08, 0.3]} />
        <meshBasicMaterial color={room.color} />
      </mesh>
      <SpriteLabel text={room.shortName.toUpperCase()} position={[0.12, 0.18, 0]} background="rgba(255,253,247,.94)" color="#173f2b" width={2.25} />
    </group>)}
    <StandupNook />
  </group>;
}

function StandupNook() {
  return <group position={[0, 0, -1.7]}>
    <mesh castShadow position={[0, 0.56, 0]}>
      <cylinderGeometry args={[0.72, 0.58, 1.08, 24]} />
      <meshStandardMaterial color="#e7ddca" roughness={0.55} />
    </mesh>
    <mesh position={[0, 1.12, 0]}>
      <cylinderGeometry args={[0.78, 0.78, 0.08, 28]} />
      <meshStandardMaterial color="#315641" roughness={0.4} />
    </mesh>
    {[0, Math.PI * 2 / 3, Math.PI * 4 / 3].map((angle) => <group key={angle} position={[Math.sin(angle) * 1.25, 0, Math.cos(angle) * 1.25]}>
      <mesh castShadow position={[0, 0.42, 0]}><cylinderGeometry args={[0.25, 0.25, 0.08, 18]} /><meshStandardMaterial color="#d39a68" /></mesh>
      <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.035, 0.035, 0.4, 10]} /><meshStandardMaterial color="#28342e" metalness={0.55} /></mesh>
    </group>)}
  </group>;
}

function Floor() {
  const design = useOfficeStore((state) => state.officeDesign);
  const palette = OFFICE_THEME_PALETTES[design.theme];
  return (
    <group>
      {/* Foundation Grand Plinth Slab (Encompassing Interior + Terrace) */}
      <mesh receiveShadow position={[0, -0.22, 1.8]}>
        <boxGeometry args={[24.8, 0.4, 21.6]} />
        <meshStandardMaterial color={palette.foundation} roughness={0.7} />
      </mesh>

      {/* Primary Warm Scandinavian Hardwood Floor */}
      <mesh receiveShadow position={[0, 0.01, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[24, 16]} />
        <meshStandardMaterial color={palette.floor} roughness={0.55} metalness={0.04} />
      </mesh>

      {/* Central Polished Terrazzo Promenade Highway */}
      <mesh receiveShadow position={[0, 0.025, 0.35]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[3.8, 14.8]} />
        <meshStandardMaterial color={palette.promenade} roughness={0.42} />
      </mesh>
      {/* Central Brushed Brass Inlay Inset Lines */}
      <mesh position={[-1.9, 0.032, 0.35]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.04, 14.8]} />
        <meshBasicMaterial color={design.accentColor} />
      </mesh>
      <mesh position={[1.9, 0.032, 0.35]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.04, 14.8]} />
        <meshBasicMaterial color={design.accentColor} />
      </mesh>

      {/* Architectural Floor Grid Tile Seams */}
      {[-8, -4, 4, 8].map((x) => (
        <mesh key={`grid-x-${x}`} position={[x, 0.02, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.02, 15.6]} />
          <meshBasicMaterial color={palette.seam} />
        </mesh>
      ))}
      {[-4, 0, 4].map((z) => (
        <mesh key={`grid-z-${z}`} position={[0, 0.021, z]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[23.6, 0.02]} />
          <meshBasicMaterial color={palette.seam} />
        </mesh>
      ))}

      {/* North Wall Baseboard Ambient Warm Cove Light Strip */}
      <mesh position={[0, 0.035, -7.68]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[23.6, 0.06]} />
        <meshBasicMaterial color="#ffe8be" transparent opacity={0.65} />
      </mesh>
    </group>
  );
}

// Expansive Penthouse Sun Terrace with Teak Decking, Loungers, Parasol, and Balustrade
function PenthouseTerrace() {
  const setIsSitting = useOfficeStore((state) => state.setIsSitting);

  return (
    <group position={[0, 0, 9.9]}>
      {/* Warm Teak Deck Flooring */}
      <mesh receiveShadow position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[24, 4.4]} />
        <meshStandardMaterial color="#885e40" roughness={0.65} />
      </mesh>

      {/* Teak Deck Plank Inlay Seams */}
      {[-9, -6, -3, 0, 3, 6, 9].map((x) => (
        <mesh key={`deck-${x}`} position={[x, 0.025, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.02, 4.3]} />
          <meshBasicMaterial color="#6a4730" />
        </mesh>
      ))}

      {/* Frameless Glass Balustrade Perimeter Railings */}
      {/* South (Front) Glass Railing */}
      <mesh position={[0, 0.52, 2.15]}>
        <boxGeometry args={[24, 0.95, 0.04]} />
        <meshPhysicalMaterial color="#c5e2db" transparent opacity={0.35} roughness={0.1} transmission={0.75} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.0, 2.15]}>
        <boxGeometry args={[24.2, 0.04, 0.06]} />
        <meshStandardMaterial color="#dcd0be" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* West Glass Railing */}
      <mesh position={[-11.95, 0.52, 0]}>
        <boxGeometry args={[0.04, 0.95, 4.3]} />
        <meshPhysicalMaterial color="#c5e2db" transparent opacity={0.35} roughness={0.1} transmission={0.75} depthWrite={false} />
      </mesh>
      <mesh position={[-11.95, 1.0, 0]}>
        <boxGeometry args={[0.06, 0.04, 4.4]} />
        <meshStandardMaterial color="#dcd0be" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* East Glass Railing */}
      <mesh position={[11.95, 0.52, 0]}>
        <boxGeometry args={[0.04, 0.95, 4.3]} />
        <meshPhysicalMaterial color="#c5e2db" transparent opacity={0.35} roughness={0.1} transmission={0.75} depthWrite={false} />
      </mesh>
      <mesh position={[11.95, 1.0, 0]}>
        <boxGeometry args={[0.06, 0.04, 4.4]} />
        <meshStandardMaterial color="#dcd0be" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Outdoor Patio Chaise Loungers */}
      {[-6.2, -4.2].map((x) => (
        <group key={`lounger-${x}`} position={[x, 0, 0.2]} onClick={() => { setIsSitting(true); playChime(); }}>
          <mesh castShadow position={[0, 0.18, 0]}>
            <boxGeometry args={[0.72, 0.12, 1.7]} />
            <meshStandardMaterial color="#6e4d36" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.26, -0.05]}>
            <boxGeometry args={[0.66, 0.08, 1.55]} />
            <meshStandardMaterial color="#f0ece1" roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.42, -0.6]} rotation-x={0.45}>
            <boxGeometry args={[0.64, 0.08, 0.55]} />
            <meshStandardMaterial color="#f0ece1" roughness={0.75} />
          </mesh>
        </group>
      ))}

      {/* Large Modern Cantilever Sun Parasol Umbrella */}
      <group position={[-7.5, 0, 1.1]}>
        <mesh position={[0, 1.3, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 2.5, 12]} />
          <meshStandardMaterial color="#303833" metalness={0.6} />
        </mesh>
        <mesh position={[0, 2.5, 0]} rotation-x={0.25} rotation-z={-0.15}>
          <coneGeometry args={[1.15, 0.36, 24, 1, true]} />
          <meshStandardMaterial color="#f5eedc" side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
      </group>

      {/* Outdoor Bistro Marble Table & Chairs */}
      <group position={[5.4, 0, 0.2]}>
        <mesh castShadow position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.62, 0.62, 0.04, 28]} />
          <meshStandardMaterial color="#ece3d2" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.4, 12]} />
          <meshStandardMaterial color="#303833" metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.26, 0.26, 0.04, 20]} />
          <meshStandardMaterial color="#303833" metalness={0.7} />
        </mesh>
        {/* 2 Bistro Chairs */}
        {[-0.68, 0.68].map((cx) => (
          <group key={cx} position={[cx, 0, 0]} onClick={() => { setIsSitting(true); playChime(); }}>
            <mesh castShadow position={[0, 0.32, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.04, 16]} />
              <meshStandardMaterial color="#6a4a35" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.16, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
              <meshStandardMaterial color="#303833" metalness={0.7} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Panoramic Skyline Viewpoint Telescope */}
      <group position={[9.2, 0, 1.4]} rotation-y={-0.3}>
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 1.2, 10]} />
          <meshStandardMaterial color="#b28c55" metalness={0.85} roughness={0.2} />
        </mesh>
        <mesh position={[0, 1.24, 0]} rotation-x={-0.35}>
          <cylinderGeometry args={[0.06, 0.08, 0.55, 16]} />
          <meshStandardMaterial color="#b28c55" metalness={0.85} roughness={0.2} />
        </mesh>
      </group>

      {/* Modern Planters along Balustrade */}
      {[-10.2, -1.8, 1.8, 10.2].map((px) => (
        <group key={`planter-${px}`} position={[px, 0, 1.7]}>
          <RoundedBox castShadow position={[0, 0.28, 0]} args={[0.7, 0.52, 0.55]} radius={0.06}>
            <meshStandardMaterial color="#e5dfd2" roughness={0.4} />
          </RoundedBox>
          <mesh position={[0, 0.72, 0]}>
            <sphereGeometry args={[0.28, 12, 12]} />
            <meshStandardMaterial color="#3b5943" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function RoomRug({
  position,
  color,
  trim,
  size,
}: {
  position: [number, number, number];
  color: string;
  trim: string;
  size: [number, number];
}) {
  return (
    <group position={position} rotation-x={-Math.PI / 2}>
      {/* Base Acoustic Carpet Slab */}
      <mesh receiveShadow>
        <planeGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.92} metalness={0.02} />
      </mesh>
      {/* Perimeter Stitched Border Frame (Gather.town Room Boundary Highlight) */}
      <mesh position={[0, 0, 0.003]}>
        <planeGeometry args={[size[0] - 0.12, size[1] - 0.12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Elegant Architectural Threshold Brass/Graphite Trim Inlay along edges */}
      {[-size[0] / 2 + 0.03, size[0] / 2 - 0.03].map((x, i) => (
        <mesh key={`x-${i}`} position={[x, 0, 0.004]}>
          <planeGeometry args={[0.06, size[1]]} />
          <meshBasicMaterial color={trim} transparent opacity={0.7} />
        </mesh>
      ))}
      {[-size[1] / 2 + 0.03, size[1] / 2 - 0.03].map((y, i) => (
        <mesh key={`y-${i}`} position={[0, y, 0.004]}>
          <planeGeometry args={[size[0], 0.06]} />
          <meshBasicMaterial color={trim} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function Walls() {
  return (
    <group>
      {/* North Wall: Modern Floor-to-Ceiling Panoramic Glass Curtain Wall & Walnut Mullions */}
      <Wall position={[0, 1.25, -7.85]} size={[24, 2.5, 0.25]} />
      <mesh position={[0, 0.65, -7.68]}>
        <boxGeometry args={[23.6, 1.3, 0.06]} />
        <meshStandardMaterial color="#2d3f37" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.32, -7.64]}>
        <boxGeometry args={[23.6, 0.06, 0.07]} />
        <meshStandardMaterial color="#c9a562" metalness={0.75} roughness={0.25} />
      </mesh>

      {/* South Wall Interior Divider with Center Terrace Entrance Portal */}
      <Wall position={[-6.8, 0.28, 7.85]} size={[10.4, 0.56, 0.3]} />
      <Wall position={[6.8, 0.28, 7.85]} size={[10.4, 0.56, 0.3]} />
      {/* Center Open Threshold to Terrace */}
      <mesh position={[0, 0.015, 7.85]}>
        <boxGeometry args={[3.8, 0.03, 0.3]} />
        <meshBasicMaterial color="#c9a562" />
      </mesh>

      {/* West Wall (Left) */}
      <Wall position={[-11.85, 0.65, 0]} size={[0.3, 1.3, 16]} />
      <mesh position={[-11.68, 0.25, 0]}>
        <boxGeometry args={[0.06, 0.5, 15.6]} />
        <meshStandardMaterial color="#2d3f37" roughness={0.7} />
      </mesh>

      {/* East Wall (Right) */}
      <Wall position={[11.85, 0.65, 0]} size={[0.3, 1.3, 16]} />
      <mesh position={[11.68, 0.25, 0]}>
        <boxGeometry args={[0.06, 0.5, 15.6]} />
        <meshStandardMaterial color="#2d3f37" roughness={0.7} />
      </mesh>
    </group>
  );
}

function Wall({ position, size }: { position: [number, number, number]; size: [number, number, number] }) {
  return (
    <mesh castShadow receiveShadow position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#ede7dc" roughness={0.75} />
    </mesh>
  );
}

function GlassPartitions() {
  return (
    <group>
      {[-2.65, 2.65].map((x) => (
        <group key={x}>
          <GlassPanel position={[x, 0.75, -5.55]} depth={3.1} />
          <GlassPanel position={[x, 0.75, -1.85]} depth={2.3} />
          <mesh position={[x, 1.52, -3.95]}>
            <boxGeometry args={[0.08, 0.06, 6.5]} />
            <meshStandardMaterial color="#a78555" metalness={0.72} roughness={0.25} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.5, -0.7]}>
        <boxGeometry args={[5.4, 0.06, 0.06]} />
        <meshStandardMaterial color="#a78555" metalness={0.75} roughness={0.22} />
      </mesh>
    </group>
  );
}

function GlassPanel({ position, depth }: { position: [number, number, number]; depth: number }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.05, 1.5, depth]} />
        <meshPhysicalMaterial color="#c2dfd7" transparent opacity={0.28} roughness={0.12} transmission={0.65} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.66, 0]}>
        <boxGeometry args={[0.07, 0.18, depth]} />
        <meshStandardMaterial color="#35261d" roughness={0.5} />
      </mesh>
      {[-depth / 2, depth / 2].map((z) => (
        <mesh key={z} position={[0, 0, z]}>
          <boxGeometry args={[0.08, 1.52, 0.035]} />
          <meshStandardMaterial color="#a78555" metalness={0.7} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

function Reception() {
  return (
    <group position={[0, 0, 5.9]}>
      {/* Front Curved Reception Counter */}
      <RoundedBox castShadow position={[0, 0.62, 0]} args={[3.2, 1.05, 0.75]} radius={0.14}>
        <meshStandardMaterial color="#4a3225" roughness={0.45} />
      </RoundedBox>
      <mesh position={[0, 1.16, 0.22]}>
        <boxGeometry args={[2.7, 0.06, 0.36]} />
        <meshStandardMaterial color="#ece3d2" roughness={0.28} />
      </mesh>
      {/* Backlit 3D Metallic ORBIT Emblem */}
      <mesh position={[0, 0.65, 0.39]}>
        <boxGeometry args={[1.2, 0.28, 0.03]} />
        <meshStandardMaterial color="#173f2b" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.65, 0.41]}>
        <boxGeometry args={[0.9, 0.14, 0.02]} />
        <meshStandardMaterial color="#c8f560" emissive="#98d626" emissiveIntensity={0.6} />
      </mesh>
      {/* Brass Desk Lamp */}
      <mesh castShadow position={[1.22, 1.42, 0]}>
        <cylinderGeometry args={[0.04, 0.14, 0.58, 20]} />
        <meshStandardMaterial color="#b69055" metalness={0.78} roughness={0.2} />
      </mesh>
      <mesh position={[1.22, 1.72, 0]} rotation-x={-Math.PI / 2}>
        <cylinderGeometry args={[0.26, 0.26, 0.04, 32]} />
        <meshStandardMaterial color="#f4d49d" emissive="#d69a47" emissiveIntensity={0.65} />
      </mesh>
    </group>
  );
}

function MeetingTable() {
  const setIsSitting = useOfficeStore((state) => state.setIsSitting);

  return (
    <group position={[-6.2, 0, -3.7]}>
      {/* Solid Walnut Oval Conference Table */}
      <RoundedBox castShadow position={[0, 0.74, 0]} args={[4.4, 0.22, 2.15]} radius={0.32} smoothness={5}>
        <meshStandardMaterial color="#3d271e" roughness={0.32} />
      </RoundedBox>
      <RoundedBox castShadow position={[0, 0.58, 0]} args={[2.5, 0.72, 0.85]} radius={0.16}>
        <meshStandardMaterial color="#281e19" roughness={0.45} />
      </RoundedBox>
      {/* Leather Center Runner & Microphones */}
      <mesh position={[0, 0.87, 0]}>
        <boxGeometry args={[1.6, 0.02, 0.42]} />
        <meshStandardMaterial color="#1b2420" metalness={0.3} roughness={0.5} />
      </mesh>
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[x, 0.9, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.03, 16]} />
          <meshStandardMaterial color="#0c0e0d" metalness={0.8} />
        </mesh>
      ))}
      {/* 8 Ergonomic Conference Chairs */}
      {[
        [-1.55, -0.75], [-0.5, -0.75], [0.5, -0.75], [1.55, -0.75],
        [-1.55, 0.75], [-0.5, 0.75], [0.5, 0.75], [1.55, 0.75],
      ].map(([x, z], i) => (
        <group key={i} onClick={() => { setIsSitting(true); playChime(); }}>
          <Chair position={[x, 0, z]} />
        </group>
      ))}
    </group>
  );
}

// Native 3D High-Res Canvas Texture 85" Boardroom Display (Zero HTML Overlap/Bugs)
function BoardroomScreen() {
  const slide = useOfficeStore((state) => state.boardroomSlide);
  const nextSlide = useOfficeStore((state) => state.nextBoardroomSlide);
  const isScreenSharing = useOfficeStore((state) => state.isScreenSharing);
  const screenStream = useOfficeStore((state) => state.screenStream);
  const presenterName = useOfficeStore((state) => state.presenterName);
  const [hovered, setHovered] = useState(false);
  const [videoTexture, setVideoTexture] = useState<THREE.VideoTexture | null>(null);

  useEffect(() => {
    if (isScreenSharing && screenStream) {
      const video = document.createElement("video");
      video.srcObject = screenStream;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(console.warn);

      const texture = new THREE.VideoTexture(video);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.format = THREE.RGBAFormat;
      setVideoTexture(texture);

      return () => {
        texture.dispose();
        video.srcObject = null;
        setVideoTexture(null);
      };
    } else {
      setVideoTexture(null);
    }
  }, [isScreenSharing, screenStream]);

  const screenTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return { canvas, tex };
  }, []);

  useEffect(() => {
    if (!screenTexture) return;
    const { canvas, tex } = screenTexture;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Crisp high-tech dark background
    const bgGradient = ctx.createLinearGradient(0, 0, 1024, 512);
    bgGradient.addColorStop(0, "#0a1612");
    bgGradient.addColorStop(1, "#07100d");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 1024, 512);

    // Subtle grid lines
    ctx.strokeStyle = "rgba(200, 245, 96, 0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < 1024; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y < 512; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // Top Header Bar
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.fillRect(0, 0, 1024, 56);

    // Live status indicator dot
    ctx.fillStyle = "#c8f560";
    ctx.beginPath();
    ctx.arc(36, 28, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("ORBIT EXECUTIVE BOARDROOM", 56, 35);

    // Slide pill
    ctx.fillStyle = "rgba(200, 245, 96, 0.18)";
    ctx.beginPath();
    ctx.roundRect(870, 12, 124, 32, 8);
    ctx.fill();
    ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillStyle = "#c8f560";
    ctx.fillText(`SLIDE ${slide + 1} OF 3`, 890, 34);

    // Dynamic Slide Content
    if (slide === 0) {
      ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = "#c8f560";
      ctx.fillText("🚀 Q4 LAUNCH ROADMAP", 48, 115);

      ctx.font = "900 60px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("94.2% Velocity", 48, 185);

      // Progress bar background
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.roundRect(48, 220, 928, 24, 12);
      ctx.fill();

      // Progress bar fill
      const grad = ctx.createLinearGradient(48, 0, 48 + 928 * 0.942, 0);
      grad.addColorStop(0, "#489e67");
      grad.addColorStop(1, "#c8f560");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(48, 220, 928 * 0.942, 24, 12);
      ctx.fill();

      // 3 KPI metric cards
      const kpis = [
        { label: "BETA LAUNCH", val: "12 Days", sub: "Oct 29 Target" },
        { label: "BLOCKER ITEMS", val: "0 Critical", sub: "All systems green" },
        { label: "SPRINT GOAL", val: "Sprint #14", sub: "38 of 40 issues done" },
      ];
      kpis.forEach((kpi, i) => {
        const x = 48 + i * 320;
        ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, 275, 288, 140, 16);
        ctx.fill();
        ctx.stroke();

        ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "#9cb5a5";
        ctx.fillText(kpi.label, x + 24, 312);

        ctx.font = "900 32px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(kpi.val, x + 24, 358);

        ctx.font = "14px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "#c8f560";
        ctx.fillText(kpi.sub, x + 24, 392);
      });
    } else if (slide === 1) {
      ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = "#5cd0ff";
      ctx.fillText("📡 SPATIAL MESH NETWORK HEALTH", 48, 115);

      ctx.font = "900 60px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("18ms Peer Latency", 48, 185);

      const kpis = [
        { label: "PEER MESH", val: "WebRTC Live", sub: "DataChannel mesh active" },
        { label: "REALTIME ENGINE", val: "Supabase", sub: "Broadcast state sync" },
        { label: "NETWORK UPTIME", val: "99.98%", sub: "Zero packet loss" },
      ];
      kpis.forEach((kpi, i) => {
        const x = 48 + i * 320;
        ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
        ctx.strokeStyle = "rgba(92, 208, 255, 0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, 275, 288, 140, 16);
        ctx.fill();
        ctx.stroke();

        ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "#90b4ce";
        ctx.fillText(kpi.label, x + 24, 312);

        ctx.font = "900 32px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(kpi.val, x + 24, 358);

        ctx.font = "14px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "#5cd0ff";
        ctx.fillText(kpi.sub, x + 24, 392);
      });
    } else {
      ctx.font = "bold 22px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = "#ffaa55";
      ctx.fillText("📈 SEED ROUND TRACTION", 48, 115);

      ctx.font = "900 60px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("$1.5M Seed Target", 48, 185);

      const kpis = [
        { label: "COMMITTED", val: "$1.18M", sub: "78.6% allocation closed" },
        { label: "ACTIVE WORKSPACES", val: "1,420+", sub: "+44% MoM growth" },
        { label: "DAILY TIME / USER", val: "42 min", sub: "Top quartile retention" },
      ];
      kpis.forEach((kpi, i) => {
        const x = 48 + i * 320;
        ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
        ctx.strokeStyle = "rgba(255, 170, 85, 0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, 275, 288, 140, 16);
        ctx.fill();
        ctx.stroke();

        ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "#d8a57e";
        ctx.fillText(kpi.label, x + 24, 312);

        ctx.font = "900 32px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(kpi.val, x + 24, 358);

        ctx.font = "14px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillStyle = "#ffaa55";
        ctx.fillText(kpi.sub, x + 24, 392);
      });
    }

    // Bottom clean hint
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.font = "14px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("🖱️ Click display to cycle slide · Real-time 3D View", 48, 475);

    tex.needsUpdate = true;
  }, [slide, screenTexture]);

  return (
    <group
      position={[-6.2, 1.6, -7.6]}
      onClick={(e) => {
        e.stopPropagation();
        playSlideClick();
        nextSlide();
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* 85" TV Display Sleek Aluminum Frame */}
      <RoundedBox castShadow args={[3.3, 1.7, 0.08]} radius={0.04}>
        <meshStandardMaterial color="#0c100e" roughness={0.2} metalness={0.8} />
      </RoundedBox>
      {/* Display Screen with Native 3D Texture or Live Video Stream */}
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[3.15, 1.55]} />
        {videoTexture ? (
          <meshBasicMaterial map={videoTexture} />
        ) : screenTexture ? (
          <meshBasicMaterial map={screenTexture.tex} />
        ) : (
          <meshBasicMaterial color="#0c100e" />
        )}
      </mesh>
      {/* Live Presenter Pill when Screen Sharing */}
      {isScreenSharing && (
        <Html center position={[0, 1.05, 0.06]}>
          <div className="pointer-events-none select-none flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-0.5 text-[9px] font-bold text-white shadow-lg animate-pulse whitespace-nowrap">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
            <span>LIVE SCREEN SHARE · {presenterName || "Presenter"}</span>
          </div>
        </Html>
      )}
      {/* Power LED Indicator */}
      <mesh position={[1.5, -0.78, 0.045]}>
        <circleGeometry args={[0.015, 16]} />
        <meshBasicMaterial color={isScreenSharing ? "#ff4444" : "#c8f560"} />
      </mesh>
      {/* Subtle hover ring */}
      {hovered && (
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[3.2, 1.6]} />
          <meshBasicMaterial color="#c8f560" transparent opacity={0.08} />
        </mesh>
      )}
    </group>
  );
}

function ProjectTable() {
  return (
    <group position={[-5.8, 0, 3.4]}>
      {/* Oak Strategy & Product Table */}
      <RoundedBox castShadow position={[0, 0.68, 0]} args={[4.4, 0.18, 2.15]} radius={0.1}>
        <meshStandardMaterial color="#553a29" roughness={0.46} />
      </RoundedBox>
      {[-1.75, 1.75].map((x) => (
        <mesh key={x} castShadow position={[x, 0.35, 0]}>
          <boxGeometry args={[0.09, 0.7, 1.72]} />
          <meshStandardMaterial color="#b28a55" metalness={0.62} roughness={0.28} />
        </mesh>
      ))}
      {/* Architecture Blueprints & iPads on table */}
      {[-1.4, 0, 1.4].map((x) => (
        <group key={x} position={[x, 0.82, 0]}>
          <mesh castShadow rotation-x={-0.12}>
            <boxGeometry args={[0.85, 0.04, 0.6]} />
            <meshStandardMaterial color={x === 0 ? "#d8b66f" : "#eee4cf"} />
          </mesh>
          <mesh position={[0, 0.03, 0.02]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[0.56, 0.035]} />
            <meshBasicMaterial color="#6c5540" />
          </mesh>
        </group>
      ))}
      {[[-1.4, -0.7], [0, -0.7], [1.4, -0.7], [-1.4, 0.7], [0, 0.7], [1.4, 0.7]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh castShadow position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.08, 20]} />
            <meshStandardMaterial color="#2d3a33" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.4, 10]} />
            <meshStandardMaterial color="#b28a55" metalness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Chair({ position }: { position: [number, number, number] }) {
  const isSouthFacing = position[2] < 0;
  return (
    <group position={position}>
      {/* Herman Miller Aeron-Style 5-Star Spider Castor Base */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.08, 12]} />
        <meshStandardMaterial color="#1a1e22" roughness={0.4} metalness={0.6} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i * Math.PI * 2) / 5;
        const x = Math.sin(angle) * 0.22;
        const z = Math.cos(angle) * 0.22;
        return (
          <group key={i}>
            <mesh position={[x / 2, 0.04, z / 2]} rotation-y={angle}>
              <boxGeometry args={[0.035, 0.03, 0.22]} />
              <meshStandardMaterial color="#22282e" roughness={0.3} metalness={0.7} />
            </mesh>
            <mesh position={[x, 0.025, z]}>
              <sphereGeometry args={[0.025, 8, 8]} />
              <meshStandardMaterial color="#0d1114" roughness={0.2} />
            </mesh>
          </group>
        );
      })}

      {/* Chrome Pneumatic Gas-Lift Cylinder */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.26, 12]} />
        <meshStandardMaterial color="#d4d8dc" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Under-Seat Mechanism Control Cradle */}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.22, 0.06, 0.22]} />
        <meshStandardMaterial color="#14181c" roughness={0.5} />
      </mesh>

      {/* Ergonomic Contoured Breathable Mesh Seat Pan */}
      <RoundedBox castShadow position={[0, 0.42, 0]} args={[0.48, 0.06, 0.46]} radius={0.04}>
        <meshStandardMaterial color="#1e252b" roughness={0.7} metalness={0.15} />
      </RoundedBox>

      {/* Aerated Mesh Curved Backrest with Lumbar Support */}
      <group position={[0, 0.72, isSouthFacing ? -0.21 : 0.21]}>
        <RoundedBox castShadow args={[0.44, 0.52, 0.04]} radius={0.03}>
          <meshStandardMaterial color="#262f36" roughness={0.65} metalness={0.1} />
        </RoundedBox>
        {/* Lumbar Support Pad */}
        <mesh position={[0, -0.08, isSouthFacing ? 0.03 : -0.03]}>
          <boxGeometry args={[0.3, 0.08, 0.03]} />
          <meshStandardMaterial color="#101417" roughness={0.4} />
        </mesh>
      </group>

      {/* Adjustable Cantilever Armrests with Soft PU Pads */}
      {[-0.24, 0.24].map((armX) => (
        <group key={armX} position={[armX, 0.54, 0]}>
          {/* Arm Post */}
          <mesh position={[0, -0.06, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.16, 8]} />
            <meshStandardMaterial color="#2b333a" metalness={0.7} />
          </mesh>
          {/* Arm Cushion Pad */}
          <RoundedBox args={[0.06, 0.025, 0.2]} radius={0.01}>
            <meshStandardMaterial color="#121619" roughness={0.3} />
          </RoundedBox>
        </group>
      ))}
    </group>
  );
}

// Engineering Dual-Monitor Workstation with Realistic Code & Telemetry Displays
function Desk({ position, deskIndex }: { position: readonly [number, number, number]; deskIndex: number }) {
  const setIsSitting = useOfficeStore((state) => state.setIsSitting);

  const codeTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#11171f";
      ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = "#1a222c";
      ctx.fillRect(0, 0, 512, 30);
      ctx.fillStyle = "#273444";
      ctx.fillRect(30, 4, 120, 26);
      ctx.fillStyle = "#c8f560";
      ctx.font = "bold 13px monospace";
      ctx.fillText(deskIndex % 2 === 0 ? "orbit-engine.ts" : "routes.tsx", 45, 22);

      // Syntax highlighted lines
      const colors = ["#5cd0ff", "#ff7b72", "#c8f560", "#d2a8ff", "#79c0ff", "#ffa657"];
      for (let i = 0; i < 9; i++) {
        const y = 55 + i * 21;
        ctx.fillStyle = "#4a5668";
        ctx.font = "11px monospace";
        ctx.fillText(`${i + 1}`, 16, y);

        const color = colors[i % colors.length];
        ctx.fillStyle = color;
        ctx.fillRect(40 + (i % 3) * 16, y - 8, 80 + ((i * 27) % 240), 9);
        if (i % 2 === 0) {
          ctx.fillStyle = colors[(i + 2) % colors.length];
          ctx.fillRect(170 + ((i * 18) % 180), y - 8, 55, 9);
        }
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, [deskIndex]);

  const telemetryTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#0c1219";
      ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = "#151d27";
      ctx.fillRect(0, 0, 512, 30);
      ctx.fillStyle = "#5cd0ff";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("INFRASTRUCTURE TELEMETRY", 20, 20);

      // Status pill
      ctx.fillStyle = "rgba(200, 245, 96, 0.2)";
      ctx.fillRect(380, 5, 110, 20);
      ctx.fillStyle = "#c8f560";
      ctx.font = "bold 10px monospace";
      ctx.fillText("● 99.99% UP", 395, 19);

      // Grid lines
      ctx.strokeStyle = "rgba(92, 208, 255, 0.12)";
      ctx.lineWidth = 1;
      for (let y = 60; y < 240; y += 32) {
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(492, y);
        ctx.stroke();
      }

      // Sparkline graph
      ctx.strokeStyle = "#5cd0ff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const points = [190, 165, 175, 140, 155, 110, 125, 85, 100, 75, 80, 55];
      points.forEach((val, idx) => {
        const px = 24 + idx * 42;
        if (idx === 0) ctx.moveTo(px, val);
        else ctx.lineTo(px, val);
      });
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  return (
    <group position={position as [number, number, number]}>
      {/* Matte Chamfered Tech Desktop */}
      <RoundedBox castShadow position={[0, 0.68, 0]} args={[1.85, 0.08, 0.9]} radius={0.04}>
        <meshStandardMaterial color="#2d3732" roughness={0.38} metalness={0.12} />
      </RoundedBox>

      {/* Dual Heavy-Duty Anodized Steel Legs with Crossbeam */}
      {[-0.78, 0.78].map((x) => (
        <mesh key={x} castShadow position={[x, 0.34, 0]}>
          <boxGeometry args={[0.05, 0.68, 0.72]} />
          <meshStandardMaterial color="#232b26" metalness={0.7} roughness={0.25} />
        </mesh>
      ))}
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[1.5, 0.04, 0.04]} />
        <meshStandardMaterial color="#232b26" metalness={0.7} />
      </mesh>

      {/* Articulated Dual-Monitor Mount Pole & Arms */}
      <mesh position={[0, 0.85, -0.22]}>
        <cylinderGeometry args={[0.02, 0.02, 0.34, 12]} />
        <meshStandardMaterial color="#1a201c" metalness={0.8} />
      </mesh>

      {/* Left Monitor: Primary Code Editor */}
      <group position={[-0.42, 1.05, -0.16]} rotation-y={0.08}>
        <mesh castShadow>
          <boxGeometry args={[0.74, 0.44, 0.03]} />
          <meshStandardMaterial color="#0e1310" metalness={0.5} roughness={0.2} />
        </mesh>
        {codeTexture && (
          <mesh position={[0, 0, 0.018]}>
            <planeGeometry args={[0.71, 0.41]} />
            <meshBasicMaterial map={codeTexture} />
          </mesh>
        )}
      </group>

      {/* Right Monitor: Secondary Telemetry & Dashboards */}
      <group position={[0.42, 1.05, -0.16]} rotation-y={-0.08}>
        <mesh castShadow>
          <boxGeometry args={[0.74, 0.44, 0.03]} />
          <meshStandardMaterial color="#0e1310" metalness={0.5} roughness={0.2} />
        </mesh>
        {telemetryTexture && (
          <mesh position={[0, 0, 0.018]}>
            <planeGeometry args={[0.71, 0.41]} />
            <meshBasicMaterial map={telemetryTexture} />
          </mesh>
        )}
      </group>

      {/* Premium Aluminum Laptop Stand with MacBook Pro */}
      <group position={[0.68, 0.76, 0.16]} rotation-y={-0.22}>
        {/* Stand Base & Arm */}
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[0.22, 0.01, 0.18]} />
          <meshStandardMaterial color="#c0c4c8" metalness={0.85} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.06, -0.06]} rotation-x={0.25}>
          <boxGeometry args={[0.04, 0.1, 0.02]} />
          <meshStandardMaterial color="#c0c4c8" metalness={0.85} roughness={0.2} />
        </mesh>
        {/* Open MacBook Silver Laptop */}
        <mesh position={[0, 0.09, 0]} rotation-x={-0.15}>
          <boxGeometry args={[0.26, 0.008, 0.18]} />
          <meshStandardMaterial color="#d4d8dc" metalness={0.9} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0.18, -0.08]} rotation-x={0.25}>
          <boxGeometry args={[0.26, 0.17, 0.006]} />
          <meshStandardMaterial color="#1a1e22" roughness={0.2} />
        </mesh>
      </group>

      {/* Full-Desk Felt Acoustic Desk Mat */}
      <mesh position={[-0.15, 0.725, 0.08]}>
        <boxGeometry args={[0.88, 0.01, 0.42]} />
        <meshStandardMaterial color="#18201c" roughness={0.85} />
      </mesh>

      {/* Tenkeyless Mechanical Keyboard with Backlit Keycaps */}
      <mesh position={[-0.22, 0.74, 0.1]}>
        <boxGeometry args={[0.34, 0.016, 0.14]} />
        <meshStandardMaterial color="#0b0e0c" roughness={0.4} />
      </mesh>

      {/* Precision Wireless Mouse & Charging Dock */}
      <mesh position={[0.12, 0.738, 0.1]}>
        <boxGeometry args={[0.065, 0.022, 0.1]} />
        <meshStandardMaterial color="#0f1411" roughness={0.3} />
      </mesh>

      {/* Ceramic Coffee Mug */}
      <mesh position={[0.36, 0.78, 0.12]}>
        <cylinderGeometry args={[0.048, 0.042, 0.1, 16]} />
        <meshStandardMaterial color="#f0ede6" roughness={0.3} />
      </mesh>

      {/* Mini Desk Succulent in Terracotta Pot */}
      <mesh position={[-0.72, 0.76, -0.2]}>
        <cylinderGeometry args={[0.048, 0.038, 0.08, 14]} />
        <meshStandardMaterial color="#b8744b" roughness={0.7} />
      </mesh>
      <mesh position={[-0.72, 0.82, -0.2]}>
        <sphereGeometry args={[0.042, 10, 10]} />
        <meshStandardMaterial color="#2d6a4f" roughness={0.6} />
      </mesh>

      {/* Matching Ergonomic Task Chair */}
      <group position={[0, 0, 0.6]} onClick={() => { setIsSitting(true); playChime(); }}>
        <Chair position={[0, 0, 0]} />
      </group>
    </group>
  );
}

function Lounge() {
  const setIsSitting = useOfficeStore((state) => state.setIsSitting);

  return (
    <group position={[5.8, 0, 3.6]}>
      {/* Curved Moss Green Sectional Sofa */}
      <group onClick={() => { setIsSitting(true); playChime(); }}>
        <RoundedBox castShadow position={[0, 0.38, 0]} args={[3.7, 0.66, 1.18]} radius={0.28} smoothness={5}>
          <meshStandardMaterial color="#355244" roughness={0.82} />
        </RoundedBox>
        <RoundedBox castShadow position={[0, 0.88, 0.46]} args={[3.7, 0.8, 0.24]} radius={0.13}>
          <meshStandardMaterial color="#284236" roughness={0.78} />
        </RoundedBox>
        {[-1.15, 0, 1.15].map((x) => (
          <RoundedBox key={x} castShadow position={[x, 0.74, -0.08]} args={[0.94, 0.18, 0.82]} radius={0.14}>
            <meshStandardMaterial color={x === 0 ? "#9e7446" : "#436554"} roughness={0.8} />
          </RoundedBox>
        ))}
      </group>
      {/* Low Marble Cocktail Coffee Table */}
      <mesh castShadow position={[0, 0.3, -1.36]}>
        <cylinderGeometry args={[0.76, 0.82, 0.18, 32]} />
        <meshStandardMaterial color="#352820" roughness={0.36} />
      </mesh>
      <mesh position={[0, 0.41, -1.36]}>
        <cylinderGeometry args={[0.64, 0.64, 0.04, 32]} />
        <meshStandardMaterial color="#dbd0be" roughness={0.26} />
      </mesh>
      {/* Designer Arched Brass Floor Lamp */}
      <mesh castShadow position={[2.2, 0.95, 0.4]}>
        <cylinderGeometry args={[0.03, 0.03, 1.8, 12]} />
        <meshStandardMaterial color="#bd955d" metalness={0.8} />
      </mesh>
      <mesh position={[2.2, 1.82, 0.4]}>
        <coneGeometry args={[0.38, 0.45, 32, 1, true]} />
        <meshStandardMaterial color="#f0debe" side={THREE.DoubleSide} emissive="#e4b56d" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function EspressoStation() {
  const isCaffeinated = useOfficeStore((state) => state.isCaffeinated);
  const setIsCaffeinated = useOfficeStore((state) => state.setIsCaffeinated);
  const steamRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (steamRef.current) {
      steamRef.current.position.y = 1.35 + Math.sin(performance.now() / 250) * 0.05;
    }
  });

  const handleBrew = (e: any) => {
    e.stopPropagation();
    playCoffeeSound();
    setIsCaffeinated(true);
  };

  return (
    <group
      position={[8.1, 0, 2.4]}
      onClick={handleBrew}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Barista Counter Cabinet */}
      <RoundedBox castShadow position={[0, 0.5, 0]} args={[0.9, 1.0, 1.2]} radius={0.08}>
        <meshStandardMaterial color="#3d2c20" roughness={0.4} />
      </RoundedBox>
      {/* Marble Countertop */}
      <mesh position={[0, 1.02, 0]}>
        <boxGeometry args={[0.94, 0.05, 1.24]} />
        <meshStandardMaterial color="#e5ded0" roughness={0.25} />
      </mesh>
      {/* Italian Chrome Espresso Machine */}
      <mesh castShadow position={[0, 1.18, 0]}>
        <boxGeometry args={[0.48, 0.32, 0.4]} />
        <meshStandardMaterial color="#dedede" metalness={0.92} roughness={0.12} />
      </mesh>
      {/* Espresso Portafilters & Knobs */}
      <mesh position={[-0.1, 1.1, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.12, 12]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.1, 1.1, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.12, 12]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      {/* Steam indicator */}
      <group ref={steamRef} position={[0, 1.38, 0]}>
        <mesh>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.45} />
        </mesh>
      </group>
      {/* Subtle hover indicator */}
      {hovered && <SpriteLabel text="Brew Espresso (+Speed)" position={[0, 1.58, 0]} width={3.4} />}
    </group>
  );
}

function VinylLofiPlayer() {
  const lofiPlaying = useOfficeStore((state) => state.lofiPlaying);
  const toggleLofi = useOfficeStore((state) => state.toggleLofi);
  const recordRef = useRef<THREE.Mesh>(null);
  const noteRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (lofiPlaying) {
      playLofiMusic();
    } else {
      stopLofiMusic();
    }
    return () => {
      stopLofiMusic();
    };
  }, [lofiPlaying]);

  useFrame((_, delta) => {
    if (recordRef.current && lofiPlaying) {
      recordRef.current.rotation.z -= delta * 3;
    }
    if (noteRef.current && lofiPlaying) {
      noteRef.current.position.y = 1.35 + Math.sin(performance.now() / 300) * 0.08;
    }
  });

  return (
    <group
      position={[6.8, 0, 5.2]}
      onClick={(e) => {
        e.stopPropagation();
        toggleLofi();
        playChime();
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Mid-century Credenza Table */}
      <RoundedBox castShadow position={[0, 0.38, 0]} args={[1.2, 0.74, 0.55]} radius={0.06}>
        <meshStandardMaterial color="#4a3423" roughness={0.45} />
      </RoundedBox>
      {/* Turntable Plinth */}
      <mesh position={[0, 0.78, 0]}>
        <boxGeometry args={[0.54, 0.04, 0.44]} />
        <meshStandardMaterial color="#1e1814" roughness={0.3} />
      </mesh>
      {/* Vinyl Record */}
      <mesh ref={recordRef} position={[-0.06, 0.81, 0]} rotation-x={-Math.PI / 2}>
        <cylinderGeometry args={[0.18, 0.18, 0.015, 32]} />
        <meshStandardMaterial color="#111111" roughness={0.2} metalness={0.6} />
      </mesh>
      {/* Gold Center Label */}
      <mesh position={[-0.06, 0.82, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.06, 24]} />
        <meshBasicMaterial color="#d4af37" />
      </mesh>
      {/* Tonearm */}
      <mesh position={[0.16, 0.83, -0.05]} rotation-z={-0.3}>
        <cylinderGeometry args={[0.01, 0.01, 0.22, 8]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.9} />
      </mesh>
      {/* Floating Animated Music Notes */}
      {lofiPlaying && (
        <group ref={noteRef} position={[0, 1.25, 0]}>
          <SpriteLabel text="♫  ♪" color="#c8f560" background="rgba(23,63,43,0.88)" width={1.3} />
        </group>
      )}
      {hovered && (
        <SpriteLabel
          text={lofiPlaying ? "Lofi playing — click to pause" : "Click for lofi beats"}
          position={[0, 1.2, 0]}
          width={3.4}
        />
      )}
    </group>
  );
}

function PhoneBooth() {
  return (
    <group position={[2.4, 0, -6.4]}>
      {/* Glass Phone Booth Floor Base */}
      <RoundedBox position={[0, 0.05, 0]} args={[1.3, 0.1, 1.3]} radius={0.06}>
        <meshStandardMaterial color="#262f2b" roughness={0.6} />
      </RoundedBox>
      {/* Acoustic Felt Interior Back Wall */}
      <mesh position={[0, 1.1, -0.6]}>
        <boxGeometry args={[1.2, 2.1, 0.06]} />
        <meshStandardMaterial color="#2e3d36" roughness={0.9} />
      </mesh>
      {/* Glass Enclosure Walls */}
      <mesh position={[-0.6, 1.1, 0]}>
        <boxGeometry args={[0.04, 2.1, 1.2]} />
        <meshPhysicalMaterial color="#c5e0d8" transparent opacity={0.35} transmission={0.7} />
      </mesh>
      <mesh position={[0.6, 1.1, 0]}>
        <boxGeometry args={[0.04, 2.1, 1.2]} />
        <meshPhysicalMaterial color="#c5e0d8" transparent opacity={0.35} transmission={0.7} />
      </mesh>
      {/* Ceiling Cap */}
      <RoundedBox position={[0, 2.18, 0]} args={[1.35, 0.1, 1.35]} radius={0.04}>
        <meshStandardMaterial color="#1a2420" roughness={0.5} />
      </RoundedBox>
      {/* Interior Stool */}
      <mesh castShadow position={[0, 0.35, -0.15]}>
        <cylinderGeometry args={[0.22, 0.22, 0.08, 16]} />
        <meshStandardMaterial color="#ff8a4c" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.18, -0.15]}>
        <cylinderGeometry args={[0.03, 0.03, 0.35, 8]} />
        <meshStandardMaterial color="#a98454" metalness={0.7} />
      </mesh>
    </group>
  );
}

function WaterCooler() {
  return (
    <group position={[-2.1, 0, 0.5]}>
      {/* Base cabinet */}
      <RoundedBox castShadow position={[0, 0.44, 0]} args={[0.42, 0.88, 0.42]} radius={0.05}>
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </RoundedBox>
      {/* Inverted Blue Water Bottle */}
      <mesh position={[0, 1.16, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.42, 20]} />
        <meshPhysicalMaterial color="#88ccff" transparent opacity={0.65} transmission={0.7} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.92, 0]}>
        <cylinderGeometry args={[0.07, 0.12, 0.08, 16]} />
        <meshStandardMaterial color="#1a6cb0" />
      </mesh>
    </group>
  );
}

function Whiteboard() {
  const whiteboardTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Enamel white surface with ultra subtle warm tone
    ctx.fillStyle = "#faf8f2";
    ctx.fillRect(0, 0, 1024, 512);

    // Subtle faint dot grid
    ctx.fillStyle = "rgba(0, 0, 0, 0.04)";
    for (let x = 32; x < 1024; x += 32) {
      for (let y = 32; y < 512; y += 32) {
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Top Title
    ctx.fillStyle = "#1e3a2b";
    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("🚀 ORBIT SPRINT #14 · SYSTEM ARCHITECTURE & ROADMAP", 36, 42);

    // Subtitle
    ctx.fillStyle = "#68736b";
    ctx.font = "13px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("Live Sync: 38/40 Done · YC Seed Cohort · Latency: 18ms", 36, 68);

    // Divider line
    ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(36, 85);
    ctx.lineTo(988, 85);
    ctx.stroke();

    // Architecture diagram (Left half)
    ctx.strokeStyle = "#2d5a3f";
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 110, 150, 70);
    ctx.fillStyle = "#2d5a3f";
    ctx.font = "bold 13px monospace";
    ctx.fillText("Next.js 15 App", 52, 140);
    ctx.font = "11px monospace";
    ctx.fillStyle = "#68736b";
    ctx.fillText("3D R3F Canvas", 52, 160);

    // Arrow 1
    ctx.beginPath();
    ctx.moveTo(186, 145);
    ctx.lineTo(240, 145);
    ctx.stroke();
    ctx.fillText("WebRTC", 192, 138);

    // Box 2
    ctx.strokeStyle = "#385765";
    ctx.strokeRect(240, 110, 160, 70);
    ctx.fillStyle = "#385765";
    ctx.font = "bold 13px monospace";
    ctx.fillText("Spatial Audio Mesh", 252, 140);
    ctx.font = "11px monospace";
    ctx.fillStyle = "#68736b";
    ctx.fillText("Log-dist radius 3m", 252, 160);

    // Arrow 2
    ctx.beginPath();
    ctx.moveTo(400, 145);
    ctx.lineTo(454, 145);
    ctx.stroke();

    // Box 3
    ctx.strokeStyle = "#7b4d39";
    ctx.strokeRect(454, 110, 140, 70);
    ctx.fillStyle = "#7b4d39";
    ctx.font = "bold 13px monospace";
    ctx.fillText("Supabase Realtime", 462, 140);
    ctx.font = "11px monospace";
    ctx.fillStyle = "#68736b";
    ctx.fillText("Presence Sync", 462, 160);

    // Vertical Divider
    ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
    ctx.beginPath();
    ctx.moveTo(630, 95);
    ctx.lineTo(630, 480);
    ctx.stroke();

    // Sprint Kanban Columns (Right half)
    const columns = [
      { label: "BACKLOG", x: 650, color: "#8b949e" },
      { label: "IN PROGRESS", x: 770, color: "#d97706" },
      { label: "SHIPPED", x: 890, color: "#16a34a" },
    ];
    columns.forEach((col) => {
      ctx.fillStyle = col.color;
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(col.label, col.x, 115);
    });

    // Sticky Notes
    const notes = [
      { title: "Metronome billing", col: 0, y: 135, bg: "#fee2e2", border: "#fca5a5", author: "Marcus" },
      { title: "Herman Miller Chairs", col: 2, y: 135, bg: "#dcfce7", border: "#86efac", author: "Maya" },
      { title: "Gather Private Spaces", col: 2, y: 220, bg: "#dcfce7", border: "#86efac", author: "Alex" },
      { title: "Proximity Audio Radar", col: 2, y: 305, bg: "#dcfce7", border: "#86efac", author: "Ateeb" },
      { title: "YC Demo Pitch v3", col: 1, y: 135, bg: "#fef3c7", border: "#fde047", author: "Marcus" },
      { title: "Audio Connection Beam", col: 1, y: 220, bg: "#fef3c7", border: "#fde047", author: "Alex" },
    ];

    notes.forEach((note) => {
      const nx = columns[note.col].x - 5;
      ctx.fillStyle = note.bg;
      ctx.strokeStyle = note.border;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(nx, note.y, 105, 68, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(note.title, nx + 6, note.y + 24, 94);

      ctx.fillStyle = "#64748b";
      ctx.font = "9px sans-serif";
      ctx.fillText(`@${note.author}`, nx + 6, note.y + 54);
    });

    // Marker doodle at bottom left
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(120, 310, 40, 0, Math.PI * 1.6);
    ctx.stroke();
    ctx.fillStyle = "#2563eb";
    ctx.font = "12px sans-serif";
    ctx.fillText("🔥 Target: Oct 30 Beta", 180, 315);

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  return (
    <group position={[0, 1.45, -7.6]}>
      {/* Sleek Aluminum Frame */}
      <mesh castShadow>
        <boxGeometry args={[4.45, 1.8, 0.08]} />
        <meshStandardMaterial color="#2d3732" roughness={0.3} metalness={0.7} />
      </mesh>
      {/* Porcelain Whiteboard with Dynamic High-Res Texture */}
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[4.35, 1.7]} />
        {whiteboardTexture ? (
          <meshBasicMaterial map={whiteboardTexture} />
        ) : (
          <meshStandardMaterial color="#faf8f2" roughness={0.2} />
        )}
      </mesh>

      {/* Extruded Aluminum Marker Tray */}
      <mesh position={[0, -0.88, 0.08]}>
        <boxGeometry args={[3.8, 0.04, 0.12]} />
        <meshStandardMaterial color="#889096" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* 4 Dry Erase Markers & Eraser on Tray */}
      {[-0.8, -0.5, -0.2, 0.1].map((mx, idx) => {
        const markerColors = ["#111111", "#2563eb", "#16a34a", "#dc2626"];
        return (
          <mesh key={mx} position={[mx, -0.85, 0.08]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.012, 0.012, 0.16, 10]} />
            <meshStandardMaterial color={markerColors[idx]} roughness={0.3} />
          </mesh>
        );
      })}
      {/* Blue Felt Eraser */}
      <mesh position={[0.6, -0.85, 0.08]}>
        <boxGeometry args={[0.22, 0.03, 0.06]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.9} />
      </mesh>
    </group>
  );
}

function LibraryWall() {
  return (
    <group position={[10.95, 1.15, -3.4]}>
      {[-2.4, -1.2, 0, 1.2, 2.4].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh castShadow>
            <boxGeometry args={[0.38, 2.3, 1.02]} />
            <meshStandardMaterial color="#2d3c34" roughness={0.62} />
          </mesh>
          {[-0.65, 0, 0.65].map((y) => (
            <mesh key={y} position={[-0.22, y, 0]}>
              <boxGeometry args={[0.08, 0.06, 0.92]} />
              <meshStandardMaterial color="#b28a56" metalness={0.55} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function AIPod() {
  const orbRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (orbRef.current) {
      orbRef.current.position.y = 1.22 + Math.sin(performance.now() / 350) * 0.04;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 1.2;
      ringRef.current.rotation.x += delta * 0.6;
    }
  });

  return (
    <group position={[8.5, 0, -3.4]}>
      <RoundedBox castShadow position={[0, 0.52, 0]} args={[1.6, 0.95, 1.1]} radius={0.16} smoothness={4}>
        <meshStandardMaterial color="#162620" roughness={0.35} metalness={0.65} />
      </RoundedBox>
      <mesh ref={orbRef} position={[0, 1.22, 0]}>
        <sphereGeometry args={[0.24, 24, 24]} />
        <meshStandardMaterial color="#7ee0ff" emissive="#3bb2e6" emissiveIntensity={2.2} transparent opacity={0.88} />
      </mesh>
      <mesh ref={ringRef} position={[0, 1.22, 0]}>
        <torusGeometry args={[0.38, 0.022, 16, 32]} />
        <meshStandardMaterial color="#c8f560" emissive="#96d425" emissiveIntensity={1.5} />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.9, 1.1, 32]} />
        <meshBasicMaterial color="#3bb2e6" transparent opacity={0.5} />
      </mesh>
      <pointLight position={[0, 1.25, 0]} color="#5cd0ff" intensity={4} distance={4} />
    </group>
  );
}

function LightingDetails() {
  return (
    <group>
      {[-7.4, -5, -2.6].map((x) => (
        <group key={`board-${x}`} position={[x, 2.6, -3.7]}>
          <mesh>
            <cylinderGeometry args={[0.02, 0.02, 0.8, 10]} />
            <meshStandardMaterial color="#a98454" metalness={0.8} />
          </mesh>
          <mesh position={[0, -0.42, 0]} rotation-x={Math.PI}>
            <coneGeometry args={[0.3, 0.22, 28, 1, true]} />
            <meshStandardMaterial color="#b18a55" metalness={0.55} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      {[4.8, 7].map((x) =>
        [-4.7, -2.2].map((z) => (
          <group key={`${x}-${z}`} position={[x, 2.5, z]}>
            <mesh>
              <cylinderGeometry args={[0.018, 0.018, 0.6, 8]} />
              <meshStandardMaterial color="#a98454" />
            </mesh>
            <mesh position={[0, -0.32, 0]}>
              <sphereGeometry args={[0.12, 16, 16]} />
              <meshStandardMaterial color="#ffe2a6" emissive="#f1b75d" emissiveIntensity={1.2} />
            </mesh>
          </group>
        ))
      )}
    </group>
  );
}

function Plants() {
  const plantSpots = useMemo(
    () => [
      [-10, -6.4],
      [9.8, -6.35],
      [-9.9, 6.35],
      [9.75, 6.15],
      [-2.1, 6.3],
      [2.1, 6.3],
    ] as const,
    []
  );

  return (
    <>
      {plantSpots.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {/* Fluted Ceramic Architectural Planter Pot */}
          <mesh castShadow position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.3, 0.25, 0.64, 24]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#ded8cf" : "#28342e"} roughness={0.4} />
          </mesh>
          {/* Pot Rim Detailing */}
          <mesh position={[0, 0.64, 0]}>
            <cylinderGeometry args={[0.32, 0.3, 0.04, 24]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#c5beb3" : "#1f2a24"} roughness={0.5} />
          </mesh>
          {/* Dark Organic Potting Soil */}
          <mesh position={[0, 0.63, 0]}>
            <cylinderGeometry args={[0.28, 0.28, 0.02, 20]} />
            <meshStandardMaterial color="#1c1612" roughness={0.95} />
          </mesh>

          {/* Woody Plant Stalks */}
          <mesh position={[0, 0.95, 0]}>
            <cylinderGeometry args={[0.018, 0.024, 0.65, 8]} />
            <meshStandardMaterial color="#554132" roughness={0.8} />
          </mesh>
          <mesh position={[0.08, 0.9, -0.05]} rotation-z={-0.2} rotation-x={0.15}>
            <cylinderGeometry args={[0.015, 0.02, 0.55, 8]} />
            <meshStandardMaterial color="#554132" roughness={0.8} />
          </mesh>
          <mesh position={[-0.07, 0.92, 0.06]} rotation-z={0.25} rotation-x={-0.12}>
            <cylinderGeometry args={[0.015, 0.02, 0.58, 8]} />
            <meshStandardMaterial color="#554132" roughness={0.8} />
          </mesh>

          {/* Broad Botanical Monstera / Fiddle-Leaf Fig Leaves */}
          {[
            { pos: [0, 1.25, 0.12], rot: [0.35, 0, 0], scale: [1, 1, 1] },
            { pos: [0.15, 1.15, -0.1], rot: [-0.4, 0.8, -0.3], scale: [0.9, 0.9, 0.9] },
            { pos: [-0.16, 1.18, 0.05], rot: [0.2, -0.7, 0.4], scale: [0.95, 0.95, 0.95] },
            { pos: [0.12, 1.38, 0.08], rot: [0.2, 0.4, -0.2], scale: [0.85, 0.85, 0.85] },
            { pos: [-0.1, 1.42, -0.09], rot: [-0.3, -0.5, 0.3], scale: [0.8, 0.8, 0.8] },
            { pos: [0, 1.55, 0], rot: [0.1, 0, 0], scale: [0.75, 0.75, 0.75] },
          ].map((leaf, lidx) => (
            <group key={lidx} position={leaf.pos as [number, number, number]} rotation={leaf.rot as [number, number, number]} scale={leaf.scale as [number, number, number]}>
              <RoundedBox args={[0.3, 0.46, 0.016]} radius={0.08} castShadow>
                <meshStandardMaterial color={lidx % 2 === 0 ? "#285437" : "#326344"} roughness={0.38} metalness={0.08} />
              </RoundedBox>
            </group>
          ))}
        </group>
      ))}
    </>
  );
}
