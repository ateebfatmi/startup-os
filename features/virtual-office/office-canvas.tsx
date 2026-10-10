"use client";

import { ContactShadows, Html, OrthographicCamera, RoundedBox } from "@react-three/drei";
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
      style={{ background: "#9da09a" }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl, scene }) => {
        scene.background = null;
        gl.setClearColor(0x000000, 0);
      }}
    >
      <OrthographicCamera makeDefault position={[13, 16, 13]} zoom={36} near={0.1} far={100} onUpdate={(camera) => camera.lookAt(0, 0, 0)} />
      <CameraRig />
      <hemisphereLight args={["#fff5dc", "#39463e", 1.35]} />
      <ambientLight intensity={.45} />
      <directionalLight castShadow position={[6, 14, 7]} color="#fff0d1" intensity={2.5} shadow-mapSize={[1024, 1024]} shadow-camera-far={35} />
      <pointLight position={[-6, 4.5, -3.7]} color="#ffc87f" intensity={17} distance={8} decay={2} />
      <pointLight position={[6, 4.5, 3.7]} color="#ffd59c" intensity={14} distance={8} decay={2} />
      <OfficeEnvironment />
      <ContactShadows position={[0, .05, 0]} opacity={.28} scale={28} blur={2.4} far={9} frames={1} />
      <LocalPlayer />
      <RemotePlayers />
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
  const lastStoreUpdate = useRef(0);
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
    const now = performance.now();
    if (now - lastStoreUpdate.current >= 1000 / 20) {
      lastStoreUpdate.current = now;
      setPlayerTransform(next.x, next.z, rotation.current);
    }
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
      <Html center position={[0, 1.76, 0]}>
        <div className="whitespace-nowrap rounded-full bg-[#17211b] px-2 py-1 text-[11px] font-bold text-white shadow-lg">You</div>
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

  return <group ref={group} position={[player.x, .06, player.z]} rotation-y={player.rotation}>
    <mesh castShadow position={[0, .56, 0]}><capsuleGeometry args={[.36, .62, 8, 16]} /><meshStandardMaterial color={player.color} roughness={.75} /></mesh>
    <mesh castShadow position={[0, 1.2, 0]}><sphereGeometry args={[.3, 20, 20]} /><meshStandardMaterial color="#5b443a" roughness={.8} /></mesh>
    <Html center position={[0, 1.76, 0]}><div className="whitespace-nowrap rounded-full bg-white px-2 py-1 text-[11px] font-bold text-[#17211b] shadow-lg">{player.name}</div></Html>
  </group>;
}

function OfficeEnvironment() {
  const deskPositions = useMemo(() => [[4.8, -4.7], [7, -4.7], [4.8, -2.2], [7, -2.2]] as const, []);
  return (
    <group>
      <Floor />
      <RoomRug position={[-5.8, .045, -3.7]} color="#263e35" trim="#b59056" size={[6.35, 4.75]} />
      <RoomRug position={[-5.8, .045, 3.45]} color="#b9aa91" trim="#6a4a30" size={[6.2, 4.55]} />
      <RoomRug position={[5.8, .045, 3.55]} color="#233831" trim="#c6a66c" size={[6.1, 4.65]} />
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
      {COLLIDERS.length > 0 && INTERACTION_ZONES.map((zone) => (
        <group key={zone.id} position={[zone.x, 0.05, zone.z]}>
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.5, 0.58, 48]} />
            <meshBasicMaterial color="#d7b873" transparent opacity={0.95} />
          </mesh>
          <Html center position={[0,.12,0]}><div className="pointer-events-none whitespace-nowrap rounded-full bg-[#f5ecdc]/90 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[#4a3423] shadow-sm">{zone.label}</div></Html>
        </group>
      ))}
    </group>
  );
}

function Floor() {
  return <group>
    <mesh receiveShadow rotation-x={-Math.PI / 2}><boxGeometry args={[24, 16, .34]} /><meshStandardMaterial color="#d9d3c7" roughness={.58} metalness={.04} /></mesh>
    {[-8,-4,0,4,8].map((x) => <mesh key={`x-${x}`} position={[x,.03,0]} rotation-x={-Math.PI/2}><planeGeometry args={[.025,15.4]} /><meshBasicMaterial color="#b7aa94" /></mesh>)}
    {[-4,0,4].map((z) => <mesh key={`z-${z}`} position={[0,.031,z]} rotation-x={-Math.PI/2}><planeGeometry args={[23.4,.025]} /><meshBasicMaterial color="#b7aa94" /></mesh>)}
    <mesh receiveShadow position={[0,.04,.45]} rotation-x={-Math.PI/2}><planeGeometry args={[3.4,14.7]} /><meshStandardMaterial color="#c9c0b0" roughness={.72} /></mesh>
    <mesh position={[-1.71,.047,.45]} rotation-x={-Math.PI/2}><planeGeometry args={[.035,14.7]} /><meshBasicMaterial color="#aa8350" /></mesh>
    <mesh position={[1.71,.047,.45]} rotation-x={-Math.PI/2}><planeGeometry args={[.035,14.7]} /><meshBasicMaterial color="#aa8350" /></mesh>
  </group>;
}

function RoomRug({ position, color, trim, size }: { position: [number, number, number]; color: string; trim: string; size: [number, number] }) {
  return <group position={position} rotation-x={-Math.PI/2}><mesh receiveShadow><planeGeometry args={size} /><meshStandardMaterial color={color} roughness={.96} /></mesh><mesh position={[0,0,.01]}><ringGeometry args={[Math.min(...size)*.36, Math.min(...size)*.38, 4]} /><meshBasicMaterial color={trim} /></mesh></group>;
}

function Walls() {
  return <group>
    <Wall position={[0, 1.45, -7.8]} size={[24, 2.9, .3]} />
    <Wall position={[-11.8, 1.45, 0]} size={[.3, 2.9, 16]} />
    <Wall position={[11.8, 1.45, 0]} size={[.3, 2.9, 16]} />
    <Wall position={[0, 1.45, 7.8]} size={[24, 2.9, .3]} />
    <mesh position={[0,.36,-7.61]}><boxGeometry args={[23.4,.72,.08]} /><meshStandardMaterial color="#26352e" roughness={.7} /></mesh>
    <mesh position={[0,.78,-7.56]}><boxGeometry args={[23.4,.055,.09]} /><meshStandardMaterial color="#b18a54" metalness={.72} roughness={.25} /></mesh>
  </group>;
}

function Wall({ position, size }: { position: [number, number, number]; size: [number, number, number] }) {
  return <mesh castShadow receiveShadow position={position}><boxGeometry args={size} /><meshStandardMaterial color="#ece7dc" roughness={.78} /></mesh>;
}

function GlassPartitions() {
  return <group>
    {[-2.65,2.65].map((x) => <group key={x}><GlassPanel position={[x,1.35,-5.55]} depth={3.1} /><GlassPanel position={[x,1.35,-1.85]} depth={2.3} /><mesh position={[x,2.72,-3.95]}><boxGeometry args={[.085,.08,6.5]} /><meshStandardMaterial color="#a78555" metalness={.7} roughness={.25} /></mesh></group>)}
    <mesh position={[0,2.67,-.7]}><boxGeometry args={[5.4,.08,.08]} /><meshStandardMaterial color="#a78555" metalness={.75} roughness={.22} /></mesh>
  </group>;
}

function GlassPanel({ position, depth }: { position: [number,number,number]; depth: number }) {
  return <group position={position}><mesh castShadow><boxGeometry args={[.055,2.7,depth]} /><meshPhysicalMaterial color="#b9d0c8" transparent opacity={.22} roughness={.12} metalness={.05} transmission={.35} depthWrite={false} /></mesh>{[-depth/2,depth/2].map((z) => <mesh key={z} position={[0,0,z]}><boxGeometry args={[.085,2.8,.035]} /><meshStandardMaterial color="#a78555" metalness={.7} roughness={.25} /></mesh>)}</group>;
}

function Reception() {
  return <group position={[0,0,5.9]}>
    <RoundedBox castShadow position={[0,.64,0]} args={[3.2,1.08,.75]} radius={.12}><meshStandardMaterial color="#5a3b2b" roughness={.46} /></RoundedBox>
    <mesh position={[0,1.19,.23]}><boxGeometry args={[2.6,.055,.34]} /><meshStandardMaterial color="#d2c4a9" roughness={.35} /></mesh>
    <Html center position={[0,1.9,.02]}><div className="pointer-events-none text-sm font-black tracking-[.34em] text-[#26352e]">ORBIT</div></Html>
    <mesh castShadow position={[1.22,1.47,0]}><cylinderGeometry args={[.05,.16,.62,20]} /><meshStandardMaterial color="#b69055" metalness={.75} roughness={.22} /></mesh>
    <mesh position={[1.22,1.8,0]} rotation-x={-Math.PI/2}><cylinderGeometry args={[.3,.3,.04,32]} /><meshStandardMaterial color="#f4d49d" emissive="#d69a47" emissiveIntensity={.6} /></mesh>
  </group>;
}

function MeetingTable() {
  return <group position={[-6.2, 0, -3.7]}>
    <RoundedBox castShadow position={[0, .76, 0]} args={[4.35, .24, 2.12]} radius={.34} smoothness={5}><meshStandardMaterial color="#4a3025" roughness={.34} /></RoundedBox>
    <RoundedBox castShadow position={[0,.61,0]} args={[2.4,.75,.85]} radius={.16}><meshStandardMaterial color="#30251f" roughness={.48} /></RoundedBox>
    <mesh position={[0,.9,0]}><boxGeometry args={[1.35,.025,.38]} /><meshStandardMaterial color="#171d1a" metalness={.4} roughness={.32} /></mesh>
    {[[-1.55,-.75],[-.5,-.75],[.5,-.75],[1.55,-.75],[-1.55,.75],[-.5,.75],[.5,.75],[1.55,.75]].map(([x,z], i) => <Chair key={i} position={[x,0,z]} />)}
  </group>;
}

function ProjectTable() {
  return <group position={[-5.8, 0, 3.4]}>
    <RoundedBox castShadow position={[0, .68, 0]} args={[4.35, .18, 2.15]} radius={.1}><meshStandardMaterial color="#6a4933" roughness={.48} /></RoundedBox>
    {[-1.75,1.75].map((x) => <mesh key={x} castShadow position={[x,.35,0]}><boxGeometry args={[.09,.7,1.72]} /><meshStandardMaterial color="#b28a55" metalness={.62} roughness={.28} /></mesh>)}
    {[-1.4,0,1.4].map((x) => <group key={x} position={[x,.84,0]}><mesh castShadow rotation-x={-.12}><boxGeometry args={[.82,.045,.58]} /><meshStandardMaterial color={x === 0 ? "#d8b66f" : "#eee4cf"} /></mesh><mesh position={[0,.035,.02]} rotation-x={-Math.PI/2}><planeGeometry args={[.54,.035]} /><meshBasicMaterial color="#6c5540" /></mesh></group>)}
  </group>;
}

function Chair({ position }: { position: [number, number, number] }) {
  return <group position={position}><RoundedBox castShadow position={[0,.43,0]} args={[.5,.12,.52]} radius={.08}><meshStandardMaterial color="#27352f" roughness={.7} /></RoundedBox><RoundedBox castShadow position={[0,.74,position[2] < 0 ? -.22 : .22]} args={[.5,.62,.1]} radius={.07}><meshStandardMaterial color="#27352f" roughness={.68} /></RoundedBox>{[-.18,.18].map((x) => <mesh key={x} position={[x,.19,0]}><cylinderGeometry args={[.025,.025,.38,10]} /><meshStandardMaterial color="#ae8958" metalness={.7} /></mesh>)}</group>;
}

function Desk({ position }: { position: readonly [number, number, number] }) {
  return <group position={position as [number, number, number]}>
    <RoundedBox castShadow position={[0,.69,0]} args={[1.6,.12,.78]} radius={.06}><meshStandardMaterial color="#5d4030" roughness={.44} /></RoundedBox>
    {[-.64,.64].map((x) => <mesh key={x} castShadow position={[x,.35,0]}><boxGeometry args={[.045,.68,.62]} /><meshStandardMaterial color="#a68050" metalness={.66} roughness={.25} /></mesh>)}
    <mesh castShadow position={[0,1.02,-.1]}><boxGeometry args={[.78,.48,.055]} /><meshStandardMaterial color="#18221e" metalness={.25} roughness={.22} /></mesh>
    <mesh position={[0,.81,-.1]}><boxGeometry args={[.055,.32,.055]} /><meshStandardMaterial color="#9b794b" metalness={.7} /></mesh>
    <mesh position={[.48,.79,.08]}><cylinderGeometry args={[.12,.12,.02,24]} /><meshStandardMaterial color="#d4c7ae" /></mesh>
  </group>;
}

function Lounge() {
  return <group position={[5.8,0,3.7]}>
    <RoundedBox castShadow position={[0,.4,0]} args={[3.65,.68,1.16]} radius={.28} smoothness={5}><meshStandardMaterial color="#416354" roughness={.82} /></RoundedBox>
    <RoundedBox castShadow position={[0,.9,.46]} args={[3.65,.82,.24]} radius={.13}><meshStandardMaterial color="#355246" roughness={.78} /></RoundedBox>
    {[-1.15,0,1.15].map((x) => <RoundedBox key={x} castShadow position={[x,.76,-.08]} args={[.92,.18,.8]} radius={.14}><meshStandardMaterial color={x === 0 ? "#a67b4d" : "#547565"} roughness={.8} /></RoundedBox>)}
    <mesh castShadow position={[0,.31,-1.36]}><cylinderGeometry args={[.75,.82,.18,32]} /><meshStandardMaterial color="#3c2e26" roughness={.36} /></mesh>
    <mesh position={[0,.42,-1.36]}><cylinderGeometry args={[.62,.62,.04,32]} /><meshStandardMaterial color="#d6cbb7" roughness={.28} /></mesh>
    <mesh castShadow position={[2.35,.95,-.4]}><cylinderGeometry args={[.03,.03,1.8,12]} /><meshStandardMaterial color="#bd955d" metalness={.8} /></mesh>
    <mesh position={[2.35,1.85,-.4]}><coneGeometry args={[.42,.5,32,1,true]} /><meshStandardMaterial color="#ecd9b5" side={THREE.DoubleSide} emissive="#e4b56d" emissiveIntensity={.28} /></mesh>
  </group>;
}

function Whiteboard() {
  return <group position={[0,1.45,-7.55]}>
    <mesh castShadow><boxGeometry args={[4.2,1.72,.13]} /><meshStandardMaterial color="#e6e0d3" roughness={.38} /></mesh>
    <mesh position={[0,0,.075]}><ringGeometry args={[1.02,1.06,4]} /><meshBasicMaterial color="#b08a55" /></mesh>
    <Html center position={[0,.28,.08]}><div className="pointer-events-none whitespace-nowrap text-[10px] font-black tracking-[.24em] text-[#26352e]">MAKE IT MATTER</div></Html>
    <mesh position={[-.9,-.35,.08]}><planeGeometry args={[.52,.52]} /><meshBasicMaterial color="#d9b96d" /></mesh>
    <mesh position={[0,-.35,.08]}><planeGeometry args={[.52,.52]} /><meshBasicMaterial color="#9bb6a8" /></mesh>
    <mesh position={[.9,-.35,.08]}><planeGeometry args={[.52,.52]} /><meshBasicMaterial color="#c48363" /></mesh>
  </group>;
}

function LibraryWall() {
  return <group position={[10.95,1.18,-3.4]}>{[-2.4,-1.2,0,1.2,2.4].map((z) => <group key={z} position={[0,0,z]}><mesh castShadow><boxGeometry args={[.38,2.35,1.02]} /><meshStandardMaterial color="#35463e" roughness={.62} /></mesh>{[-.65,0,.65].map((y) => <mesh key={y} position={[-.22,y,0]}><boxGeometry args={[.08,.07,.9]} /><meshStandardMaterial color="#b28a56" metalness={.55} /></mesh>)}</group>)}</group>;
}

function LightingDetails() {
  return <group>
    {[-7.4,-5,-2.6].map((x) => <group key={`board-${x}`} position={[x,3.05,-3.7]}><mesh><cylinderGeometry args={[.025,.025,1.05,10]} /><meshStandardMaterial color="#a98454" metalness={.8} /></mesh><mesh position={[0,-.56,0]} rotation-x={Math.PI}><coneGeometry args={[.34,.24,28,1,true]} /><meshStandardMaterial color="#b18a55" metalness={.55} side={THREE.DoubleSide} /></mesh><pointLight position={[0,-.68,0]} color="#ffd18d" intensity={3.2} distance={3.4} /></group>)}
    {[4.8,7].map((x) => [-4.7,-2.2].map((z) => <group key={`${x}-${z}`} position={[x,2.85,z]}><mesh><cylinderGeometry args={[.018,.018,.7,8]} /><meshStandardMaterial color="#a98454" /></mesh><mesh position={[0,-.38,0]}><sphereGeometry args={[.14,16,16]} /><meshStandardMaterial color="#ffe2a6" emissive="#f1b75d" emissiveIntensity={1.4} /></mesh></group>))}
  </group>;
}

function Plants() {
  return <>{[[-10,-6.4],[9.8,-6.35],[-9.9,6.35],[9.75,6.15],[-2.1,6.3],[2.1,6.3]].map(([x,z], i) => <group key={i} position={[x,0,z]}><mesh castShadow position={[0,.32,0]}><cylinderGeometry args={[.28,.38,.64,20]} /><meshStandardMaterial color={i % 2 ? "#9b7650" : "#31463b"} roughness={.58} /></mesh>{[-.26,0,.26].map((offset) => <mesh key={offset} castShadow position={[offset*.55,.98+Math.abs(offset),offset]} rotation-z={offset*1.5}><sphereGeometry args={[.38,14,14]} /><meshStandardMaterial color={i % 2 ? "#56745f" : "#456554"} roughness={.86} /></mesh>)}</group>)}</>;
}

function AIPod() {
  return (
    <group position={[8.5, 0, -3.4]}>
      <RoundedBox castShadow position={[0, .52, 0]} args={[1.6, .95, 1.1]} radius={.16} smoothness={4}>
        <meshStandardMaterial color="#1a2e26" roughness={.35} metalness={.65} />
      </RoundedBox>
      <mesh position={[0, 1.22, 0]}>
        <sphereGeometry args={[.22, 24, 24]} />
        <meshStandardMaterial color="#7ee0ff" emissive="#3bb2e6" emissiveIntensity={1.8} transparent opacity={0.88} />
      </mesh>
      <mesh position={[0, 1.22, 0]} rotation-x={Math.PI / 3} rotation-y={Math.PI / 6}>
        <torusGeometry args={[.36, .02, 16, 32]} />
        <meshStandardMaterial color="#c8f560" emissive="#96d425" emissiveIntensity={1.2} />
      </mesh>
      <pointLight position={[0, 1.25, 0]} color="#5cd0ff" intensity={3.5} distance={4} />
    </group>
  );
}

