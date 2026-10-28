"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Component, Suspense, useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from "react";
import * as THREE from "three";

type AvatarModelProps = {
  color: string;
  motion: MutableRefObject<number>;
  seated?: boolean;
  caffeinated?: boolean;
  modelUrl?: string;
  onAssetReady?: () => void;
};

export function AvatarModel(props: AvatarModelProps) {
  const fallback = <ProceduralAvatar {...props} />;
  return <AvatarErrorBoundary fallback={fallback}><Suspense fallback={fallback}><LoadedAvatar {...props} /></Suspense></AvatarErrorBoundary>;
}

function LoadedAvatar({ color, motion, seated = false, caffeinated = false, modelUrl = "/models/orbit-avatar.gltf", onAssetReady }: AvatarModelProps) {
  const root = useRef<THREE.Group>(null);
  const gltf = useGLTF(modelUrl);
  const model = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true; object.receiveShadow = true;
      object.material = (object.material as THREE.Material).clone();
      if (["Torso", "LeftArm", "RightArm"].includes(object.name) && object.material instanceof THREE.MeshStandardMaterial) object.material.color.set(color);
    });
    return clone;
  }, [color, gltf.scene]);
  const { actions } = useAnimations(gltf.animations, root);
  const active = useRef<"Idle" | "Walk" | null>(null);

  useEffect(() => { onAssetReady?.(); }, [onAssetReady]);
  useEffect(() => () => { model.traverse((object) => { if (object instanceof THREE.Mesh) (object.material as THREE.Material).dispose(); }); }, [model]);
  useFrame(() => {
    const next = motion.current > 0.12 && !seated ? "Walk" : "Idle";
    if (active.current === next) return;
    if (active.current) actions[active.current]?.fadeOut(0.16);
    actions[next]?.reset().fadeIn(0.16).play(); active.current = next;
  });

  return <group ref={root} position-y={seated ? -0.18 : 0} scale-y={seated ? 0.82 : 1}>
    <primitive object={model} />
    {caffeinated && <CoffeeCup />}
  </group>;
}

function ProceduralAvatar({ color, motion, seated = false, caffeinated = false }: AvatarModelProps) {
  const leftLeg = useRef<THREE.Mesh>(null); const rightLeg = useRef<THREE.Mesh>(null); const phase = useRef(0);
  useFrame((_, delta) => {
    phase.current += delta * Math.max(2, motion.current * 2.5);
    const swing = seated ? -Math.PI / 2.3 : Math.sin(phase.current) * Math.min(0.55, motion.current / 6);
    if (leftLeg.current) leftLeg.current.rotation.x = swing;
    if (rightLeg.current) rightLeg.current.rotation.x = seated ? swing : -swing;
  });
  return <group scale-y={seated ? 0.86 : 1}>
    <mesh castShadow position={[0, 0.85, 0]}><boxGeometry args={[0.58, 0.76, 0.38]} /><meshStandardMaterial color={color} roughness={0.68} /></mesh>
    <mesh castShadow position={[0, 1.5, 0]}><dodecahedronGeometry args={[0.31, 0]} /><meshStandardMaterial color="#6b3d2b" roughness={0.78} /></mesh>
    <mesh position={[0, 1.52, 0.29]}><boxGeometry args={[0.24, 0.08, 0.11]} /><meshStandardMaterial color="#221510" metalness={0.4} roughness={0.3} /></mesh>
    <mesh ref={leftLeg} castShadow position={[-0.17, 0.27, 0]}><boxGeometry args={[0.17, 0.55, 0.2]} /><meshStandardMaterial color="#1f2d26" roughness={0.75} /></mesh>
    <mesh ref={rightLeg} castShadow position={[0.17, 0.27, 0]}><boxGeometry args={[0.17, 0.55, 0.2]} /><meshStandardMaterial color="#1f2d26" roughness={0.75} /></mesh>
    {caffeinated && <CoffeeCup />}
  </group>;
}

function CoffeeCup() {
  return <group position={[0.43, 0.86, 0.22]}><mesh castShadow><cylinderGeometry args={[0.075, 0.055, 0.17, 16]} /><meshStandardMaterial color="#fffdf7" roughness={0.25} /></mesh><mesh position={[0, 0.1, 0]}><cylinderGeometry args={[0.077, 0.077, 0.025, 16]} /><meshStandardMaterial color="#173f2b" /></mesh></group>;
}

class AvatarErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

useGLTF.preload("/models/orbit-avatar.gltf");
