"use client";

import { Html, OrthographicCamera, RoundedBox, Text } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { COLLIDERS, resolveMovement } from "./collision";
import { INTERACTION_ZONES } from "./office-data";
import { useOfficeStore } from "./store";

const keys = new Set<string>();

export function OfficeCanvas() {
  return (
    <Canvas
      dpr={[1, 1.65]}
      shadows
      style={{ background: "#d9e2d7" }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl, scene }) => {
        scene.background = null;
        gl.setClearColor(0x000000, 0);
      }}
    >
      <OrthographicCamera makeDefault position={[13, 16, 13]} zoom={48} near={0.1} far={100} onUpdate={(camera) => camera.lookAt(0, 0, 0)} />
      <CameraRig />
      <ambientLight intensity={1.4} />
      <directionalLight castShadow position={[7, 14, 4]} intensity={2.2} shadow-mapSize={[1024, 1024]} shadow-camera-far={35} />
      <OfficeEnvironment />
      <LocalPlayer />
    </Canvas>
  );
}

function CameraRig() {
  const player = useOfficeStore((state) => state.player);
  useFrame(({ camera }, delta) => {
    const desired = new THREE.Vector3(player.x + 13, 16, player.z + 13);
    camera.position.lerp(desired, 1 - Math.exp(-delta * 4));
    camera.lookAt(player.x, 0, player.z);
  });
  return null;
}

function LocalPlayer() {
  const group = useRef<THREE.Group>(null);
  const position = useRef(new THREE.Vector2(0, 1.6));
  const velocity = useRef(new THREE.Vector2());
  const rotation = useRef(Math.PI);
  const setPlayerTransform = useOfficeStore((state) => state.setPlayerTransform);
  const setNearbyAction = useOfficeStore((state) => state.setNearbyAction);
  const openPanel = useOfficeStore((state) => state.openPanel);
  const nearbyAction = useOfficeStore((state) => state.nearbyAction);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
      keys.add(event.key.toLowerCase());
      if ((event.key.toLowerCase() === "e" || event.key === "Enter") && nearbyAction) openPanel(nearbyAction.kind);
    };
    const up = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      keys.clear();
    };
  }, [nearbyAction, openPanel]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30);
    const input = new THREE.Vector2(
      Number(keys.has("d") || keys.has("arrowright")) - Number(keys.has("a") || keys.has("arrowleft")),
      Number(keys.has("s") || keys.has("arrowdown")) - Number(keys.has("w") || keys.has("arrowup")),
    );
    if (input.lengthSq() > 0) input.normalize();
    velocity.current.lerp(input.multiplyScalar(4.25), 1 - Math.exp(-delta * 12));
    if (velocity.current.lengthSq() < 0.005) velocity.current.set(0, 0);
    const next = resolveMovement(
      { x: position.current.x, z: position.current.y },
      { x: position.current.x + velocity.current.x * delta, z: position.current.y + velocity.current.y * delta },
    );
    position.current.set(next.x, next.z);
    if (velocity.current.lengthSq() > 0.08) rotation.current = Math.atan2(velocity.current.x, velocity.current.y);
    if (group.current) {
      group.current.position.set(next.x, 0.06 + Math.abs(Math.sin(performance.now() / 130)) * Math.min(velocity.current.length() / 100, 0.035), next.z);
      group.current.rotation.y = rotation.current;
    }
    const zone = INTERACTION_ZONES.find((item) => Math.hypot(item.x - next.x, item.z - next.z) <= item.radius);
    const action = zone ? { kind: zone.kind, label: zone.hint } : null;
    if (action?.kind !== useOfficeStore.getState().nearbyAction?.kind) setNearbyAction(action);
    setPlayerTransform(next.x, next.z, rotation.current);
  });

  return (
    <group ref={group}>
      <mesh castShadow position={[0, 0.56, 0]}>
        <capsuleGeometry args={[0.36, 0.62, 8, 16]} />
        <meshStandardMaterial color="#ff8a4c" roughness={0.75} />
      </mesh>
      <mesh castShadow position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.3, 20, 20]} />
        <meshStandardMaterial color="#6b3d2b" roughness={0.8} />
      </mesh>
      <Html center position={[0, 1.76, 0]} distanceFactor={13}>
        <div className="whitespace-nowrap rounded-full bg-[#17211b] px-2 py-1 text-[11px] font-bold text-white shadow-lg">You</div>
      </Html>
    </group>
  );
}

function OfficeEnvironment() {
  const deskPositions = useMemo(() => [[4.8, -4.7], [7, -4.7], [4.8, -2.2], [7, -2.2]] as const, []);
  return (
    <group>
      <mesh receiveShadow rotation-x={-Math.PI / 2}>
        <boxGeometry args={[24, 16, 0.3]} />
        <meshStandardMaterial color="#eef0e8" roughness={0.95} />
      </mesh>
      <RoomRug position={[-5.8, 0.02, -3.7]} color="#d7e7c4" size={[6, 4.6]} />
      <RoomRug position={[-5.8, 0.02, 3.4]} color="#f1d5b9" size={[6, 4.5]} />
      <RoomRug position={[5.8, 0.02, 3.5]} color="#c8dedb" size={[6, 4.6]} />
      <Walls />
      <MeetingTable />
      <ProjectTable />
      {deskPositions.map(([x, z]) => <Desk key={`${x}-${z}`} position={[x, 0, z]} />)}
      <Lounge />
      <Whiteboard />
      <Plants />
      {COLLIDERS.length > 0 && INTERACTION_ZONES.map((zone) => (
        <group key={zone.id} position={[zone.x, 0.05, zone.z]}>
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.55, 0.65, 40]} />
            <meshBasicMaterial color="#ff8a4c" transparent opacity={0.85} />
          </mesh>
          <Text position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.22} color="#71381f" anchorX="center">{zone.label}</Text>
        </group>
      ))}
    </group>
  );
}

function RoomRug({ position, color, size }: { position: [number, number, number]; color: string; size: [number, number] }) {
  return <mesh receiveShadow position={position} rotation-x={-Math.PI / 2}><planeGeometry args={size} /><meshStandardMaterial color={color} roughness={1} /></mesh>;
}

function Walls() {
  return <group>
    <Wall position={[0, 1.25, -7.8]} size={[24, 2.5, .3]} />
    <Wall position={[-11.8, 1.25, 0]} size={[.3, 2.5, 16]} />
    <Wall position={[11.8, 1.25, 0]} size={[.3, 2.5, 16]} />
    <Wall position={[0, 1.25, 7.8]} size={[24, 2.5, .3]} />
  </group>;
}

function Wall({ position, size }: { position: [number, number, number]; size: [number, number, number] }) {
  return <mesh castShadow receiveShadow position={position}><boxGeometry args={size} /><meshStandardMaterial color="#f9f5e9" roughness={.86} /></mesh>;
}

function MeetingTable() {
  return <group position={[-6.2, 0, -3.7]}>
    <RoundedBox castShadow position={[0, .72, 0]} args={[4.2, .28, 2.2]} radius={.18}><meshStandardMaterial color="#8b5b3e" /></RoundedBox>
    {[[-1.55,-.75],[-.5,-.75],[.5,-.75],[1.55,-.75],[-1.55,.75],[-.5,.75],[.5,.75],[1.55,.75]].map(([x,z], i) => <Chair key={i} position={[x,0,z]} />)}
  </group>;
}

function ProjectTable() {
  return <group position={[-5.8, 0, 3.4]}>
    <RoundedBox castShadow position={[0, .62, 0]} args={[4.3, .25, 2.2]} radius={.14}><meshStandardMaterial color="#d8955c" /></RoundedBox>
    {[-1.4,0,1.4].map((x) => <mesh key={x} castShadow position={[x,.84,0]} rotation-x={-.15}><boxGeometry args={[.82,.05,.58]} /><meshStandardMaterial color={x === 0 ? "#c8f560" : "#fff6dd"} /></mesh>)}
  </group>;
}

function Chair({ position }: { position: [number, number, number] }) {
  return <group position={position}><mesh castShadow position={[0,.42,0]}><boxGeometry args={[.5,.12,.52]} /><meshStandardMaterial color="#31594a" /></mesh><mesh castShadow position={[0,.72,position[2] < 0 ? -.22 : .22]}><boxGeometry args={[.5,.62,.1]} /><meshStandardMaterial color="#31594a" /></mesh></group>;
}

function Desk({ position }: { position: readonly [number, number, number] }) {
  return <group position={position as [number, number, number]}>
    <RoundedBox castShadow position={[0,.66,0]} args={[1.55,.18,.75]} radius={.08}><meshStandardMaterial color="#cfb08b" /></RoundedBox>
    <mesh castShadow position={[0,.98,-.08]}><boxGeometry args={[.72,.48,.08]} /><meshStandardMaterial color="#263c33" /></mesh>
    <mesh position={[0,.75,-.08]}><boxGeometry args={[.08,.35,.08]} /><meshStandardMaterial color="#263c33" /></mesh>
  </group>;
}

function Lounge() {
  return <group position={[5.8,0,3.7]}>
    <RoundedBox castShadow position={[0,.45,0]} args={[3.7,.8,1.2]} radius={.22}><meshStandardMaterial color="#48836f" /></RoundedBox>
    <RoundedBox castShadow position={[0,.95,.48]} args={[3.7,.9,.25]} radius={.12}><meshStandardMaterial color="#3a6d5d" /></RoundedBox>
    <mesh castShadow position={[0,.36,-1.35]}><cylinderGeometry args={[.7,.7,.3,24]} /><meshStandardMaterial color="#f3bd72" /></mesh>
  </group>;
}

function Whiteboard() {
  return <group position={[0,1.45,-7.55]}>
    <mesh castShadow><boxGeometry args={[3.6,1.6,.12]} /><meshStandardMaterial color="#fffef7" /></mesh>
    <Text position={[0,.25,.08]} fontSize={.23} color="#31594a">Build → learn → ship</Text>
    <mesh position={[-.85,-.3,.08]}><planeGeometry args={[.48,.48]} /><meshBasicMaterial color="#c8f560" /></mesh>
    <mesh position={[0,-.3,.08]}><planeGeometry args={[.48,.48]} /><meshBasicMaterial color="#ffb36d" /></mesh>
  </group>;
}

function Plants() {
  return <>{[[-9.8,-6.5],[9.7,-6.3],[-9.8,6.4],[9.8,6.2]].map(([x,z], i) => <group key={i} position={[x,0,z]}><mesh castShadow position={[0,.35,0]}><cylinderGeometry args={[.32,.42,.7,12]} /><meshStandardMaterial color="#b36e49" /></mesh><mesh castShadow position={[0,.95,0]}><sphereGeometry args={[.62,14,14]} /><meshStandardMaterial color="#4c8b5f" /></mesh></group>)}</>;
}
