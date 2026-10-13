"use client";

import { ContactShadows, Html, OrthographicCamera, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { COLLIDERS, resolveMovement } from "./collision";
import { INTERACTION_ZONES } from "./office-data";
import { useOfficeStore } from "./store";

const keys = new Set<string>();

export function OfficeCanvas() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      shadows
      style={{ background: "#7e8780" }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl, scene }) => {
        scene.background = null;
        gl.setClearColor(0x000000, 0);
      }}
    >
      <OrthographicCamera
        makeDefault
        position={[0, 32, 12]}
        zoom={34}
        near={0.1}
        far={120}
        onUpdate={(camera) => camera.lookAt(0, 0, -0.3)}
      />
      <CameraRig />
      <hemisphereLight args={["#fffbf0", "#2c3b33", 1.4]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        castShadow
        position={[8, 24, 10]}
        color="#fff5dc"
        intensity={2.3}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={45}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0004}
      />
      {/* Zone Accent Lights */}
      <pointLight position={[-5.8, 3.6, -3.7]} color="#ffd699" intensity={12} distance={8} decay={2} />
      <pointLight position={[-5.8, 3.5, 3.4]} color="#ffdfa4" intensity={10} distance={7} decay={2} />
      <pointLight position={[8.5, 2.2, -3.4]} color="#4ee3ff" intensity={16} distance={6} decay={2} />
      <pointLight position={[5.8, 3.4, 3.6]} color="#ffcc88" intensity={10} distance={7} decay={2} />
      <pointLight position={[0, 2.8, 5.9]} color="#ffe1a8" intensity={9} distance={6} decay={2} />
      <pointLight position={[0, 3.0, -6.6]} color="#fff3db" intensity={8} distance={6} decay={2} />

      <OfficeEnvironment />
      <ContactShadows position={[0, 0.05, 0]} opacity={0.32} scale={28} blur={2.2} far={8} frames={1} />
      <FloorClickSurface />
      <ClickTargetMarker />
      <LocalPlayer />
      <RemotePlayers />
    </Canvas>
  );
}

function CameraRig() {
  const player = useOfficeStore((state) => state.player);
  const cameraMode = useOfficeStore((state) => state.cameraMode);
  const { size } = useThree();

  useFrame(({ camera }, delta) => {
    const isTop = cameraMode === "top";
    if (isTop) {
      // Elevated architectural top-down angle (~69° elevation)
      // Centered on the office at [0, 0, -0.3]
      const desiredPos = new THREE.Vector3(0, 32, 12);
      const desiredLook = new THREE.Vector3(0, 0, -0.3);
      camera.position.lerp(desiredPos, 1 - Math.exp(-delta * 5));
      camera.lookAt(desiredLook);

      // Dynamically calculate target zoom so 100% of the entire office fits comfortably
      const targetZoom = Math.min(size.width / 27, size.height / 19.5);
      if ("zoom" in camera) {
        camera.zoom = THREE.MathUtils.lerp(camera.zoom, targetZoom, 1 - Math.exp(-delta * 5));
        camera.updateProjectionMatrix();
      }
    } else {
      // Follow mode: zoomed closer, tracking the player
      const desiredPos = new THREE.Vector3(player.x, 20, player.z + 9);
      camera.position.lerp(desiredPos, 1 - Math.exp(-delta * 4));
      camera.lookAt(player.x, 0, player.z);

      const targetZoom = Math.min(size.width / 15, size.height / 11);
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
  return (
    <mesh
      position={[0, 0.02, 0]}
      rotation-x={-Math.PI / 2}
      onPointerDown={(e) => {
        e.stopPropagation();
        setClickTarget({ x: e.point.x, z: e.point.z });
      }}
      visible={false}
    >
      <planeGeometry args={[24, 16]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

function ClickTargetMarker() {
  const clickTarget = useOfficeStore((state) => state.clickTarget);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (ringRef.current && clickTarget) {
      const scale = 1 + (Math.sin(performance.now() / 150) * 0.15);
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
  const lastStoreUpdate = useRef(0);
  const setPlayerTransform = useOfficeStore((state) => state.setPlayerTransform);
  const setNearbyAction = useOfficeStore((state) => state.setNearbyAction);
  const openPanel = useOfficeStore((state) => state.openPanel);
  const toggleCameraMode = useOfficeStore((state) => state.toggleCameraMode);
  const nearbyAction = useOfficeStore((state) => state.nearbyAction);
  const clickTarget = useOfficeStore((state) => state.clickTarget);
  const setClickTarget = useOfficeStore((state) => state.setClickTarget);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
      keys.add(event.key.toLowerCase());
      if ((event.key.toLowerCase() === "e" || event.key === "Enter") && nearbyAction) openPanel(nearbyAction.kind);
      if (event.key.toLowerCase() === "v") toggleCameraMode();
    };
    const up = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      keys.clear();
    };
  }, [nearbyAction, openPanel, toggleCameraMode]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30);
    const wasd = new THREE.Vector2(
      Number(keys.has("d") || keys.has("arrowright")) - Number(keys.has("a") || keys.has("arrowleft")),
      Number(keys.has("s") || keys.has("arrowdown")) - Number(keys.has("w") || keys.has("arrowup")),
    );

    let input = wasd;
    if (wasd.lengthSq() > 0) {
      if (clickTarget) setClickTarget(null);
      input.normalize();
    } else if (clickTarget) {
      const toTarget = new THREE.Vector2(clickTarget.x - position.current.x, clickTarget.z - position.current.y);
      if (toTarget.length() < 0.28) {
        setClickTarget(null);
        input.set(0, 0);
      } else {
        input = toTarget.normalize();
      }
    }

    velocity.current.lerp(input.multiplyScalar(4.5), 1 - Math.exp(-delta * 12));
    if (velocity.current.lengthSq() < 0.005) velocity.current.set(0, 0);

    const next = resolveMovement(
      { x: position.current.x, z: position.current.y },
      { x: position.current.x + velocity.current.x * delta, z: position.current.y + velocity.current.y * delta },
    );

    // If movement is blocked while walking toward clickTarget, stop
    if (clickTarget && Math.hypot(next.x - position.current.x, next.z - position.current.y) < 0.001 && velocity.current.lengthSq() > 0.1) {
      setClickTarget(null);
    }

    position.current.set(next.x, next.z);
    if (velocity.current.lengthSq() > 0.08) rotation.current = Math.atan2(velocity.current.x, velocity.current.y);
    if (group.current) {
      group.current.position.set(next.x, 0.06 + Math.abs(Math.sin(performance.now() / 130)) * Math.min(velocity.current.length() / 100, 0.035), next.z);
      group.current.rotation.y = rotation.current;
    }
    const zone = INTERACTION_ZONES.find((item) => Math.hypot(item.x - next.x, item.z - next.z) <= item.radius);
    const action = zone ? { kind: zone.kind, label: zone.hint } : null;
    if (action?.kind !== useOfficeStore.getState().nearbyAction?.kind) setNearbyAction(action);
    const now = performance.now();
    if (now - lastStoreUpdate.current >= 1000 / 20) {
      lastStoreUpdate.current = now;
      setPlayerTransform(next.x, next.z, rotation.current);
    }
  });

  return (
    <group ref={group}>
      {/* Soft Ground Shadow Ring */}
      <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.22, 0.44, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.25} />
      </mesh>
      {/* Avatar Torso */}
      <mesh castShadow position={[0, 0.56, 0]}>
        <capsuleGeometry args={[0.34, 0.62, 8, 16]} />
        <meshStandardMaterial color="#ff8a4c" roughness={0.65} metalness={0.1} />
      </mesh>
      {/* Avatar Head */}
      <mesh castShadow position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.28, 20, 20]} />
        <meshStandardMaterial color="#6b3d2b" roughness={0.75} />
      </mesh>
      {/* Facing Direction Marker (Visor) */}
      <mesh position={[0, 1.22, 0.22]} rotation-x={-0.1}>
        <boxGeometry args={[0.26, 0.08, 0.12]} />
        <meshStandardMaterial color="#2d1c15" roughness={0.3} metalness={0.4} />
      </mesh>
      {/* Name Tag Pill */}
      <Html center position={[0, 1.82, 0]}>
        <div className="whitespace-nowrap rounded-full bg-[#17211b] px-2.5 py-1 text-[11px] font-bold text-white shadow-xl ring-2 ring-white/20 select-none">
          You
        </div>
      </Html>
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

  useEffect(() => {
    targetPosition.current.set(player.x, 0.06, player.z);
    targetRotation.current = player.rotation;
  }, [player.x, player.z, player.rotation]);

  useFrame((_, delta) => {
    if (!group.current) return;
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
      <mesh castShadow position={[0, 0.56, 0]}>
        <capsuleGeometry args={[0.34, 0.62, 8, 16]} />
        <meshStandardMaterial color={player.color} roughness={0.65} />
      </mesh>
      <mesh castShadow position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.28, 20, 20]} />
        <meshStandardMaterial color="#5b443a" roughness={0.75} />
      </mesh>
      <Html center position={[0, 1.82, 0]}>
        <div className="whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#17211b] shadow-xl ring-2 ring-black/10 select-none">
          {player.name}
        </div>
      </Html>
    </group>
  );
}

function OfficeEnvironment() {
  const deskPositions = useMemo(() => [[4.8, -4.7], [7, -4.7], [4.8, -2.2], [7, -2.2]] as const, []);
  return (
    <group>
      <Floor />
      {/* Zone Carpets & Inlays */}
      <RoomRug position={[-5.8, 0.045, -3.7]} color="#1b3327" trim="#c9a562" size={[6.4, 4.8]} name="BOARDROOM" />
      <RoomRug position={[-5.8, 0.045, 3.45]} color="#563b27" trim="#a87f4c" size={[6.4, 4.6]} name="STRATEGY HUB" />
      <RoomRug position={[5.8, 0.045, 3.55]} color="#82523d" trim="#e2b992" size={[6.3, 4.7]} name="LOUNGE & CAFE" />
      <RoomRug position={[5.8, 0.045, -3.45]} color="#243836" trim="#789994" size={[6.3, 4.8]} name="FOCUS PODS" />

      <Walls />
      <GlassPartitions />
      <Reception />
      <MeetingTable />
      <ProjectTable />
      {deskPositions.map(([x, z]) => <Desk key={`${x}-${z}`} position={[x, 0, z]} />)}
      <Lounge />
      <Whiteboard />
      <LibraryWall />
      <AIPod />
      <LightingDetails />
      <Plants />

      {/* Interactive Zones Indicators */}
      {INTERACTION_ZONES.map((zone) => (
        <group key={zone.id} position={[zone.x, 0.052, zone.z]}>
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.55, 0.68, 48]} />
            <meshBasicMaterial color="#c8f560" transparent opacity={0.88} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.42, 0.46, 32]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
          </mesh>
          <Html center position={[0, 0.16, 0]}>
            <div className="pointer-events-none whitespace-nowrap rounded-full bg-[#17211b]/95 border border-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#c8f560] shadow-md">
              {zone.label}
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

function Floor() {
  return (
    <group>
      {/* Foundation Base Slab */}
      <mesh receiveShadow position={[0, -0.22, 0]}>
        <boxGeometry args={[24.4, 0.4, 16.4]} />
        <meshStandardMaterial color="#222b26" roughness={0.7} />
      </mesh>

      {/* Primary Terrazzo/Stone Floor */}
      <mesh receiveShadow position={[0, 0.01, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[24, 16]} />
        <meshStandardMaterial color="#e5e0d4" roughness={0.62} metalness={0.03} />
      </mesh>

      {/* Central Promenade Highway */}
      <mesh receiveShadow position={[0, 0.03, 0.35]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[3.8, 14.8]} />
        <meshStandardMaterial color="#ded7c7" roughness={0.52} />
      </mesh>
      {/* Central Brass Inlay Striping */}
      <mesh position={[-1.9, 0.035, 0.35]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.04, 14.8]} />
        <meshBasicMaterial color="#b38f54" />
      </mesh>
      <mesh position={[1.9, 0.035, 0.35]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.04, 14.8]} />
        <meshBasicMaterial color="#b38f54" />
      </mesh>

      {/* Architectural Floor Grid Lines */}
      {[-8, -4, 0, 4, 8].map((x) => (
        <mesh key={`grid-x-${x}`} position={[x, 0.02, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.02, 15.6]} />
          <meshBasicMaterial color="#c7bea9" />
        </mesh>
      ))}
      {[-4, 0, 4].map((z) => (
        <mesh key={`grid-z-${z}`} position={[0, 0.021, z]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[23.6, 0.02]} />
          <meshBasicMaterial color="#c7bea9" />
        </mesh>
      ))}
    </group>
  );
}

function RoomRug({
  position,
  color,
  trim,
  size,
  name,
}: {
  position: [number, number, number];
  color: string;
  trim: string;
  size: [number, number];
  name?: string;
}) {
  return (
    <group position={position} rotation-x={-Math.PI / 2}>
      <mesh receiveShadow>
        <planeGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.92} />
      </mesh>
      {/* Outer Border Inlay */}
      <mesh position={[0, 0, 0.005]}>
        <ringGeometry args={[Math.min(...size) * 0.38, Math.min(...size) * 0.4, 4]} />
        <meshBasicMaterial color={trim} />
      </mesh>
      {/* Inner Inlay */}
      <mesh position={[0, 0, 0.006]}>
        <ringGeometry args={[Math.min(...size) * 0.44, Math.min(...size) * 0.45, 4]} />
        <meshBasicMaterial color={trim} transparent opacity={0.65} />
      </mesh>
    </group>
  );
}

function Walls() {
  return (
    <group>
      {/* North Wall (Back Feature Wall) - Full Height with Acoustic Walnut Slats & Brass Trim */}
      <Wall position={[0, 1.25, -7.85]} size={[24, 2.5, 0.3]} />
      {/* Walnut Acoustic Baseboard & Wainscoting */}
      <mesh position={[0, 0.5, -7.68]}>
        <boxGeometry args={[23.6, 1.0, 0.06]} />
        <meshStandardMaterial color="#26352e" roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.02, -7.64]}>
        <boxGeometry args={[23.6, 0.05, 0.07]} />
        <meshStandardMaterial color="#b38f54" metalness={0.75} roughness={0.25} />
      </mesh>

      {/* South Wall (Front Cutaway Curb Wall) - Low Height so everything inside is 100% visible from top view! */}
      <Wall position={[0, 0.28, 7.85]} size={[24, 0.56, 0.3]} />
      {/* South Architectural Glass Railing on top of curb */}
      <mesh position={[0, 0.72, 7.85]}>
        <boxGeometry args={[23.6, 0.36, 0.04]} />
        <meshPhysicalMaterial color="#c2dfd8" transparent opacity={0.35} roughness={0.1} transmission={0.7} />
      </mesh>
      <mesh position={[0, 0.92, 7.85]}>
        <boxGeometry args={[23.8, 0.05, 0.07]} />
        <meshStandardMaterial color="#b38f54" metalness={0.75} roughness={0.25} />
      </mesh>

      {/* West Wall (Left) - Mid Cutaway Height */}
      <Wall position={[-11.85, 0.65, 0]} size={[0.3, 1.3, 16]} />
      <mesh position={[-11.68, 0.22, 0]}>
        <boxGeometry args={[0.06, 0.44, 15.6]} />
        <meshStandardMaterial color="#26352e" roughness={0.7} />
      </mesh>

      {/* East Wall (Right) - Mid Cutaway Height */}
      <Wall position={[11.85, 0.65, 0]} size={[0.3, 1.3, 16]} />
      <mesh position={[11.68, 0.22, 0]}>
        <boxGeometry args={[0.06, 0.44, 15.6]} />
        <meshStandardMaterial color="#26352e" roughness={0.7} />
      </mesh>
    </group>
  );
}

function Wall({ position, size }: { position: [number, number, number]; size: [number, number, number] }) {
  return (
    <mesh castShadow receiveShadow position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#ece6da" roughness={0.75} />
    </mesh>
  );
}

function GlassPartitions() {
  return (
    <group>
      {/* Boardroom & Focus Pod Partition Glass with Brass Trim */}
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
      {/* Central Corridor Glass Header */}
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
        <meshPhysicalMaterial color="#bed8d0" transparent opacity={0.28} roughness={0.12} transmission={0.65} depthWrite={false} />
      </mesh>
      {/* Lower Walnut Baseboard */}
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
      {/* Curved Fluted Walnut Desk */}
      <RoundedBox castShadow position={[0, 0.62, 0]} args={[3.2, 1.05, 0.75]} radius={0.14}>
        <meshStandardMaterial color="#533728" roughness={0.45} />
      </RoundedBox>
      {/* Calacatta Marble Top */}
      <mesh position={[0, 1.16, 0.22]}>
        <boxGeometry args={[2.7, 0.06, 0.36]} />
        <meshStandardMaterial color="#dcd0b8" roughness={0.28} />
      </mesh>
      {/* Floating Illuminated Sign */}
      <Html center position={[0, 1.82, 0.02]}>
        <div className="pointer-events-none text-xs font-black tracking-[0.4em] text-[#173f2b] bg-[#fffdf5]/90 px-3 py-1 rounded-full shadow-sm border border-black/10 select-none">
          ORBIT
        </div>
      </Html>
      {/* Reception Desk Task Lamp */}
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
  return (
    <group position={[-6.2, 0, -3.7]}>
      {/* Conference Table Top */}
      <RoundedBox castShadow position={[0, 0.74, 0]} args={[4.4, 0.22, 2.15]} radius={0.32} smoothness={5}>
        <meshStandardMaterial color="#422b21" roughness={0.32} />
      </RoundedBox>
      {/* Conference Base Pedestal */}
      <RoundedBox castShadow position={[0, 0.58, 0]} args={[2.5, 0.72, 0.85]} radius={0.16}>
        <meshStandardMaterial color="#281e19" roughness={0.45} />
      </RoundedBox>
      {/* Center Cable Inset & Microphones */}
      <mesh position={[0, 0.87, 0]}>
        <boxGeometry args={[1.4, 0.02, 0.38]} />
        <meshStandardMaterial color="#171d1a" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Microphones */}
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[x, 0.9, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 0.03, 16]} />
          <meshStandardMaterial color="#0c0e0d" metalness={0.8} />
        </mesh>
      ))}
      {/* 8 Chairs */}
      {[
        [-1.55, -0.75], [-0.5, -0.75], [0.5, -0.75], [1.55, -0.75],
        [-1.55, 0.75], [-0.5, 0.75], [0.5, 0.75], [1.55, 0.75],
      ].map(([x, z], i) => (
        <Chair key={i} position={[x, 0, z]} />
      ))}
      {/* Presentation Screen on Wall */}
      <group position={[0, 1.5, -3.95]}>
        <RoundedBox castShadow args={[2.8, 1.4, 0.08]} radius={0.04}>
          <meshStandardMaterial color="#121815" roughness={0.3} />
        </RoundedBox>
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[2.64, 1.24]} />
          <meshBasicMaterial color="#1e342b" />
        </mesh>
        <Html center position={[0, 0, 0.07]}>
          <div className="pointer-events-none select-none text-[8px] font-bold tracking-widest text-[#c8f560] bg-black/60 px-2 py-0.5 rounded">
            BOARDROOM SCREEN
          </div>
        </Html>
      </group>
    </group>
  );
}

function ProjectTable() {
  return (
    <group position={[-5.8, 0, 3.4]}>
      {/* Architect Blueprint Drafting Table */}
      <RoundedBox castShadow position={[0, 0.68, 0]} args={[4.4, 0.18, 2.15]} radius={0.1}>
        <meshStandardMaterial color="#5d402d" roughness={0.46} />
      </RoundedBox>
      {[-1.75, 1.75].map((x) => (
        <mesh key={x} castShadow position={[x, 0.35, 0]}>
          <boxGeometry args={[0.09, 0.7, 1.72]} />
          <meshStandardMaterial color="#b28a55" metalness={0.62} roughness={0.28} />
        </mesh>
      ))}
      {/* Strategy Blueprint Sheets & Tablets on Table */}
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
      {/* Workbench Stools */}
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
  return (
    <group position={position}>
      <RoundedBox castShadow position={[0, 0.42, 0]} args={[0.5, 0.1, 0.52]} radius={0.08}>
        <meshStandardMaterial color="#22302a" roughness={0.7} />
      </RoundedBox>
      <RoundedBox castShadow position={[0, 0.72, position[2] < 0 ? -0.22 : 0.22]} args={[0.5, 0.6, 0.08]} radius={0.07}>
        <meshStandardMaterial color="#22302a" roughness={0.68} />
      </RoundedBox>
      {[-0.18, 0.18].map((x) => (
        <mesh key={x} position={[x, 0.18, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.36, 10]} />
          <meshStandardMaterial color="#ae8958" metalness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function Desk({ position }: { position: readonly [number, number, number] }) {
  return (
    <group position={position as [number, number, number]}>
      {/* Desk Surface */}
      <RoundedBox castShadow position={[0, 0.68, 0]} args={[1.65, 0.1, 0.8]} radius={0.06}>
        <meshStandardMaterial color="#553a2b" roughness={0.42} />
      </RoundedBox>
      {/* Metal Legs */}
      {[-0.66, 0.66].map((x) => (
        <mesh key={x} castShadow position={[x, 0.34, 0]}>
          <boxGeometry args={[0.045, 0.68, 0.64]} />
          <meshStandardMaterial color="#a68050" metalness={0.68} roughness={0.25} />
        </mesh>
      ))}
      {/* Curved Ultrawide Display */}
      <mesh castShadow position={[0, 1.02, -0.1]}>
        <boxGeometry args={[0.82, 0.46, 0.05]} />
        <meshStandardMaterial color="#151d19" metalness={0.3} roughness={0.2} />
      </mesh>
      {/* Glowing Screen Content */}
      <mesh position={[0, 1.02, -0.07]}>
        <planeGeometry args={[0.78, 0.42]} />
        <meshBasicMaterial color="#264234" />
      </mesh>
      {/* Display Stand */}
      <mesh position={[0, 0.8, -0.1]}>
        <boxGeometry args={[0.05, 0.3, 0.05]} />
        <meshStandardMaterial color="#9b794b" metalness={0.7} />
      </mesh>
      {/* Coffee Mug */}
      <mesh position={[0.48, 0.77, 0.1]}>
        <cylinderGeometry args={[0.06, 0.05, 0.12, 16]} />
        <meshStandardMaterial color="#eae4d6" />
      </mesh>
      {/* Ergonomic Chair */}
      <group position={[0, 0, 0.55]}>
        <RoundedBox castShadow position={[0, 0.42, 0]} args={[0.48, 0.08, 0.48]} radius={0.06}>
          <meshStandardMaterial color="#25352e" roughness={0.6} />
        </RoundedBox>
        <RoundedBox castShadow position={[0, 0.72, 0.2]} args={[0.48, 0.55, 0.08]} radius={0.06}>
          <meshStandardMaterial color="#25352e" roughness={0.6} />
        </RoundedBox>
      </group>
    </group>
  );
}

function Lounge() {
  return (
    <group position={[5.8, 0, 3.6]}>
      {/* Curved Moss Green Sectional Sofa */}
      <RoundedBox castShadow position={[0, 0.38, 0]} args={[3.7, 0.66, 1.18]} radius={0.28} smoothness={5}>
        <meshStandardMaterial color="#3b594b" roughness={0.82} />
      </RoundedBox>
      <RoundedBox castShadow position={[0, 0.88, 0.46]} args={[3.7, 0.8, 0.24]} radius={0.13}>
        <meshStandardMaterial color="#2e483c" roughness={0.78} />
      </RoundedBox>
      {/* Plush Cushion Blocks */}
      {[-1.15, 0, 1.15].map((x) => (
        <RoundedBox key={x} castShadow position={[x, 0.74, -0.08]} args={[0.94, 0.18, 0.82]} radius={0.14}>
          <meshStandardMaterial color={x === 0 ? "#9e7446" : "#4c6e5d"} roughness={0.8} />
        </RoundedBox>
      ))}
      {/* Low Marble Cocktail Coffee Table */}
      <mesh castShadow position={[0, 0.3, -1.36]}>
        <cylinderGeometry args={[0.76, 0.82, 0.18, 32]} />
        <meshStandardMaterial color="#352820" roughness={0.36} />
      </mesh>
      <mesh position={[0, 0.41, -1.36]}>
        <cylinderGeometry args={[0.64, 0.64, 0.04, 32]} />
        <meshStandardMaterial color="#dbd0be" roughness={0.26} />
      </mesh>
      {/* Espresso Coffee Station Side Counter */}
      <group position={[2.3, 0, -1.2]}>
        <RoundedBox castShadow position={[0, 0.5, 0]} args={[0.8, 1.0, 1.1]} radius={0.08}>
          <meshStandardMaterial color="#422f23" roughness={0.4} />
        </RoundedBox>
        {/* Chrome Espresso Machine */}
        <mesh castShadow position={[0, 1.12, 0]}>
          <boxGeometry args={[0.42, 0.28, 0.36]} />
          <meshStandardMaterial color="#d4d4d4" metalness={0.9} roughness={0.15} />
        </mesh>
      </group>
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

function Whiteboard() {
  return (
    <group position={[0, 1.45, -7.6]}>
      {/* Large Magnetic Glass Board */}
      <mesh castShadow>
        <boxGeometry args={[4.4, 1.76, 0.12]} />
        <meshStandardMaterial color="#e9e4d8" roughness={0.35} />
      </mesh>
      {/* Outer Brass Reveal Frame */}
      <mesh position={[0, 0, 0.065]}>
        <ringGeometry args={[1.05, 1.09, 4]} />
        <meshBasicMaterial color="#b08a55" />
      </mesh>
      {/* Typography Header */}
      <Html center position={[0, 0.38, 0.08]}>
        <div className="pointer-events-none select-none whitespace-nowrap text-[10px] font-black tracking-[0.28em] text-[#1c2e25]">
          MAKE IT MATTER
        </div>
      </Html>
      {/* Colored Idea Sticky Notes */}
      <mesh position={[-1.1, -0.25, 0.08]}>
        <planeGeometry args={[0.55, 0.55]} />
        <meshBasicMaterial color="#d9b96d" />
      </mesh>
      <mesh position={[-0.35, -0.25, 0.08]}>
        <planeGeometry args={[0.55, 0.55]} />
        <meshBasicMaterial color="#9bb6a8" />
      </mesh>
      <mesh position={[0.4, -0.25, 0.08]}>
        <planeGeometry args={[0.55, 0.55]} />
        <meshBasicMaterial color="#c48363" />
      </mesh>
      <mesh position={[1.15, -0.25, 0.08]}>
        <planeGeometry args={[0.55, 0.55]} />
        <meshBasicMaterial color="#a0c4de" />
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
            <meshStandardMaterial color="#304038" roughness={0.62} />
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
      {/* Cybernetic Pedestal Base */}
      <RoundedBox castShadow position={[0, 0.52, 0]} args={[1.6, 0.95, 1.1]} radius={0.16} smoothness={4}>
        <meshStandardMaterial color="#162620" roughness={0.35} metalness={0.65} />
      </RoundedBox>
      {/* Glowing Levitating Holographic Orb */}
      <mesh ref={orbRef} position={[0, 1.22, 0]}>
        <sphereGeometry args={[0.24, 24, 24]} />
        <meshStandardMaterial color="#7ee0ff" emissive="#3bb2e6" emissiveIntensity={2.2} transparent opacity={0.88} />
      </mesh>
      {/* Orbiting Energy Ring */}
      <mesh ref={ringRef} position={[0, 1.22, 0]}>
        <torusGeometry args={[0.38, 0.022, 16, 32]} />
        <meshStandardMaterial color="#c8f560" emissive="#96d425" emissiveIntensity={1.5} />
      </mesh>
      {/* Glowing Ground Base Ring */}
      <mesh position={[0, 0.04, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.9, 1.1, 32]} />
        <meshBasicMaterial color="#3bb2e6" transparent opacity={0.5} />
      </mesh>
      {/* Glowing Circuit Lines */}
      <pointLight position={[0, 1.25, 0]} color="#5cd0ff" intensity={4} distance={4} />
    </group>
  );
}

function LightingDetails() {
  return (
    <group>
      {/* Boardroom Chandelier Pendants */}
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
      {/* Desk Workstation Downlights */}
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
  return (
    <>
      {[
        [-10, -6.4],
        [9.8, -6.35],
        [-9.9, 6.35],
        [9.75, 6.15],
        [-2.1, 6.3],
        [2.1, 6.3],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh castShadow position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.28, 0.38, 0.64, 20]} />
            <meshStandardMaterial color={i % 2 ? "#9b7650" : "#31463b"} roughness={0.58} />
          </mesh>
          {[-0.26, 0, 0.26].map((offset) => (
            <mesh
              key={offset}
              castShadow
              position={[offset * 0.55, 0.98 + Math.abs(offset), offset]}
              rotation-z={offset * 1.5}
            >
              <sphereGeometry args={[0.38, 14, 14]} />
              <meshStandardMaterial color={i % 2 ? "#56745f" : "#456554"} roughness={0.86} />
            </mesh>
          ))}
        </group>
      ))}
    </>
  );
}
