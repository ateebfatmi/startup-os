"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";

export type AvatarModelProps = {
  color: string;
  motion: MutableRefObject<number>;
  seated?: boolean;
  caffeinated?: boolean;
  ghost?: boolean;
  dancing?: boolean;
  modelUrl?: string;
  onAssetReady?: () => void;
  hairColor?: string;
  skinTone?: string;
  showProximityRing?: boolean;
};

export function AvatarModel({
  color = "#ff8a4c",
  motion,
  seated = false,
  caffeinated = false,
  ghost = false,
  dancing = false,
  hairColor = "#2c221e",
  skinTone = "#cda077",
  showProximityRing = false,
  onAssetReady,
}: AvatarModelProps) {
  const root = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const headGroup = useRef<THREE.Group>(null);
  const torsoGroup = useRef<THREE.Group>(null);
  const walkPhase = useRef(0);
  const dancePhase = useRef(0);

  useEffect(() => {
    onAssetReady?.();
  }, [onAssetReady]);

  useFrame((_, delta) => {
    const speed = motion.current;
    if (dancing) {
      dancePhase.current += delta * 6;
      const dHop = Math.abs(Math.sin(dancePhase.current)) * 0.12;
      const dSway = Math.sin(dancePhase.current * 0.8) * 0.22;
      if (torsoGroup.current) {
        torsoGroup.current.position.y = dHop;
        torsoGroup.current.rotation.z = dSway;
        torsoGroup.current.rotation.y = Math.sin(dancePhase.current * 0.5) * 0.3;
      }
      if (leftArm.current) {
        leftArm.current.rotation.z = 1.2 + Math.sin(dancePhase.current) * 0.4;
        leftArm.current.rotation.x = -Math.sin(dancePhase.current) * 0.6;
      }
      if (rightArm.current) {
        rightArm.current.rotation.z = -1.2 - Math.sin(dancePhase.current) * 0.4;
        rightArm.current.rotation.x = Math.sin(dancePhase.current) * 0.6;
      }
      if (headGroup.current) {
        headGroup.current.rotation.y = Math.sin(dancePhase.current * 0.9) * 0.25;
      }
      return;
    }

    if (speed > 0.08 && !seated) {
      walkPhase.current += delta * Math.min(14, Math.max(6, speed * 2.8));
    } else {
      walkPhase.current = THREE.MathUtils.lerp(walkPhase.current, 0, 0.15);
    }

    const swing = Math.sin(walkPhase.current);
    const bob = Math.abs(Math.sin(walkPhase.current)) * Math.min(speed / 35, 0.04);

    if (torsoGroup.current) {
      torsoGroup.current.position.y = seated ? -0.22 : bob;
      torsoGroup.current.rotation.x = seated ? 0.08 : (speed > 0.5 ? 0.06 : 0);
      torsoGroup.current.rotation.z = 0;
      torsoGroup.current.rotation.y = 0;
    }

    if (seated) {
      // Seated pose: knees bent 90 degrees forward
      if (leftLeg.current) {
        leftLeg.current.rotation.x = -Math.PI / 2.1;
        leftLeg.current.position.set(-0.13, 0.38, 0.14);
      }
      if (rightLeg.current) {
        rightLeg.current.rotation.x = -Math.PI / 2.1;
        rightLeg.current.position.set(0.13, 0.38, 0.14);
      }
      if (leftArm.current) leftArm.current.rotation.x = -0.3;
      if (rightArm.current) rightArm.current.rotation.x = -0.3;
    } else {
      // Natural humanoid walking stride
      const legAngle = swing * Math.min(0.65, Math.max(0.1, speed / 3.8));
      const armAngle = -swing * Math.min(0.55, Math.max(0.08, speed / 4.2));

      if (leftLeg.current) {
        leftLeg.current.rotation.x = legAngle;
        leftLeg.current.position.set(-0.13, 0.52, 0);
      }
      if (rightLeg.current) {
        rightLeg.current.rotation.x = -legAngle;
        rightLeg.current.position.set(0.13, 0.52, 0);
      }
      if (leftArm.current) {
        leftArm.current.rotation.x = armAngle;
        leftArm.current.rotation.z = 0.08;
      }
      if (rightArm.current) {
        rightArm.current.rotation.x = -armAngle;
        rightArm.current.rotation.z = -0.08;
      }
    }
  });

  return (
    <group ref={root}>
      {/* Ghost Mode Glow Halo */}
      {ghost && (
        <group position={[0, 0.9, 0]}>
          <pointLight color="#a3e635" intensity={3} distance={2.5} />
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.35, 0.45, 32]} />
            <meshBasicMaterial color="#c8f560" transparent opacity={0.6} />
          </mesh>
        </group>
      )}

      {/* Gather.town Style Proximity Audio Radar Wave (Hearing range) */}
      {showProximityRing && !ghost && (
        <group position={[0, 0.012, 0]}>
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[2.94, 2.98, 64]} />
            <meshBasicMaterial color="#c8f560" transparent opacity={0.22} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2}>
            <circleGeometry args={[2.94, 48]} />
            <meshBasicMaterial color="#c8f560" transparent opacity={0.025} />
          </mesh>
        </group>
      )}

      {/* Realistic Soft Ambient Contact Shadow Disc */}
      <mesh position={[0, 0.018, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.26, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={ghost ? 0.08 : 0.24} />
      </mesh>

      {/* Main Human Body Group with Ghost transparency support */}
      <group ref={torsoGroup}>
        {/* Torso: Tailored Hoodie / Sweater */}
        <mesh castShadow={!ghost} position={[0, 0.88, 0]}>
          <capsuleGeometry args={[0.22, 0.36, 10, 16]} />
          <meshStandardMaterial
            color={ghost ? "#c8f560" : color}
            roughness={0.62}
            metalness={0.05}
            transparent={ghost}
            opacity={ghost ? 0.45 : 1}
          />
        </mesh>

        {/* Hoodie Collar / Neckline Detailing */}
        <mesh position={[0, 1.1, 0.04]} rotation-x={0.2}>
          <torusGeometry args={[0.13, 0.035, 8, 16]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 1.15, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.085, 0.12, 16]} />
          <meshStandardMaterial color={skinTone} roughness={0.75} />
        </mesh>

        {/* Head & Hair Group */}
        <group ref={headGroup} position={[0, 1.34, 0]}>
          {/* Head Base */}
          <mesh castShadow>
            <sphereGeometry args={[0.18, 20, 20]} />
            <meshStandardMaterial color={skinTone} roughness={0.72} />
          </mesh>

          {/* Styled Modern Hair Cut (Gather.town Clean Profile) */}
          <mesh position={[0, 0.05, -0.02]} castShadow>
            <sphereGeometry args={[0.19, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
            <meshStandardMaterial color={hairColor} roughness={0.88} />
          </mesh>
          {/* Front Hair Bangs */}
          <mesh position={[0, 0.12, 0.12]} rotation-x={-0.35}>
            <boxGeometry args={[0.24, 0.06, 0.1]} />
            <meshStandardMaterial color={hairColor} roughness={0.88} />
          </mesh>

          {/* Subtle Eyes / Brow Line */}
          <mesh position={[-0.055, -0.01, 0.165]}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <meshBasicMaterial color="#1a1412" />
          </mesh>
          <mesh position={[0.055, -0.01, 0.165]}>
            <sphereGeometry args={[0.022, 8, 8]} />
            <meshBasicMaterial color="#1a1412" />
          </mesh>

          {/* Glasses Frame (Clean Minimalist Acetate) */}
          <group position={[0, -0.005, 0.17]}>
            <mesh position={[-0.055, 0, 0]}>
              <ringGeometry args={[0.028, 0.038, 16]} />
              <meshBasicMaterial color="#2d2218" />
            </mesh>
            <mesh position={[0.055, 0, 0]}>
              <ringGeometry args={[0.028, 0.038, 16]} />
              <meshBasicMaterial color="#2d2218" />
            </mesh>
            <mesh position={[0, 0.01, 0]}>
              <boxGeometry args={[0.04, 0.01, 0.01]} />
              <meshBasicMaterial color="#2d2218" />
            </mesh>
          </group>
        </group>

        {/* Left Arm & Hand */}
        <group ref={leftArm} position={[-0.26, 1.0, 0]}>
          <mesh castShadow position={[0, -0.16, 0]}>
            <capsuleGeometry args={[0.065, 0.26, 8, 12]} />
            <meshStandardMaterial color={color} roughness={0.65} />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.34, 0]} castShadow>
            <sphereGeometry args={[0.048, 12, 12]} />
            <meshStandardMaterial color={skinTone} roughness={0.75} />
          </mesh>
        </group>

        {/* Right Arm & Hand */}
        <group ref={rightArm} position={[0.26, 1.0, 0]}>
          <mesh castShadow position={[0, -0.16, 0]}>
            <capsuleGeometry args={[0.065, 0.26, 8, 12]} />
            <meshStandardMaterial color={color} roughness={0.65} />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.34, 0]} castShadow>
            <sphereGeometry args={[0.048, 12, 12]} />
            <meshStandardMaterial color={skinTone} roughness={0.75} />
          </mesh>

          {/* Coffee Mug in Hand if Caffeinated */}
          {caffeinated && (
            <group position={[0, -0.38, 0.12]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.055, 0.04, 0.12, 14]} />
                <meshStandardMaterial color="#fffdf7" roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.07, 0]}>
                <cylinderGeometry args={[0.058, 0.058, 0.02, 14]} />
                <meshStandardMaterial color="#173f2b" roughness={0.5} />
              </mesh>
            </group>
          )}
        </group>

        {/* Left Leg & White Sneaker */}
        <group ref={leftLeg} position={[-0.13, 0.52, 0]}>
          {/* Trousers (Dark Charcoal/Navy Chinos) */}
          <mesh castShadow position={[0, -0.22, 0]}>
            <capsuleGeometry args={[0.07, 0.32, 8, 12]} />
            <meshStandardMaterial color="#212926" roughness={0.78} />
          </mesh>
          {/* White Sneaker with Gum Sole */}
          <mesh position={[0, -0.45, 0.03]} castShadow>
            <boxGeometry args={[0.11, 0.08, 0.2]} />
            <meshStandardMaterial color="#f5f5f5" roughness={0.35} />
          </mesh>
          <mesh position={[0, -0.485, 0.03]}>
            <boxGeometry args={[0.115, 0.015, 0.205]} />
            <meshStandardMaterial color="#c29668" roughness={0.8} />
          </mesh>
        </group>

        {/* Right Leg & White Sneaker */}
        <group ref={rightLeg} position={[0.13, 0.52, 0]}>
          <mesh castShadow position={[0, -0.22, 0]}>
            <capsuleGeometry args={[0.07, 0.32, 8, 12]} />
            <meshStandardMaterial color="#212926" roughness={0.78} />
          </mesh>
          <mesh position={[0, -0.45, 0.03]} castShadow>
            <boxGeometry args={[0.11, 0.08, 0.2]} />
            <meshStandardMaterial color="#f5f5f5" roughness={0.35} />
          </mesh>
          <mesh position={[0, -0.485, 0.03]}>
            <boxGeometry args={[0.115, 0.015, 0.205]} />
            <meshStandardMaterial color="#c29668" roughness={0.8} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
