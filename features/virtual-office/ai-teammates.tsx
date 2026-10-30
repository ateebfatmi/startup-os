"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { useOfficeStore } from "./store";
import { playChime } from "./audio";
import { AvatarModel } from "./avatar-model";

export type AITeammateId = "dev" | "design" | "finance";

export interface AITeammateConfig {
  id: AITeammateId;
  name: string;
  role: string;
  department: string;
  status: string;
  color: string;
  accent: string;
  position: [number, number, number];
  rotation: number;
  systemPrompt: string;
  suggestedQuestions: string[];
}

export const AI_TEAMMATES: Record<AITeammateId, AITeammateConfig> = {
  dev: {
    id: "dev",
    name: "Alex",
    role: "Lead Systems Architect",
    department: "Engineering Pod",
    status: "Reviewing pull requests",
    color: "#2a4365",
    accent: "#5cd0ff",
    position: [4.8, 0, -4.7],
    rotation: 0,
    systemPrompt: "You are Alex, Lead Systems Architect at Orbit (Startup OS). You are deeply technical, pragmatic, and specialize in distributed WebRTC, Next.js, Three.js, and high-performance TypeScript infrastructure. Keep responses concise, actionable, and formatted with code snippets when relevant.",
    suggestedQuestions: [
      "Review our real-time WebRTC mesh architecture",
      "Draft a secure Supabase RLS policy for team workspaces",
      "How can we optimize Three.js 60fps render draw calls?",
      "Write an API route for invitation tokens",
    ],
  },
  design: {
    id: "design",
    name: "Maya",
    role: "Principal Product Designer",
    department: "Strategy Wall",
    status: "Sketching UX wireframes",
    color: "#234e52",
    accent: "#c8f560",
    position: [-3.8, 0, 2.2],
    rotation: Math.PI / 4,
    systemPrompt: "You are Maya, Principal Product Designer at Orbit (Startup OS). You are obsessed with craftsmanship, Scandinavian minimalism, keyboard-first navigation, and delightful spatial UX. You provide constructive design critiques and user experience insights.",
    suggestedQuestions: [
      "Critique our virtual office onboarding experience",
      "Suggest micro-interactions for teammate proximity",
      "Draft 3 ICP user personas for early-stage B2B SaaS",
      "How to balance 3D spatial canvas with 2D dashboard density?",
    ],
  },
  finance: {
    id: "finance",
    name: "Marcus",
    role: "Head of Finance & Growth",
    department: "Executive Boardroom",
    status: "Analyzing runway & burn rate",
    color: "#3d2a1d",
    accent: "#ffaa55",
    position: [-4.2, 0, -2.8],
    rotation: -Math.PI / 3,
    systemPrompt: "You are Marcus, Head of Finance & Venture Growth at Orbit (Startup OS). You are sharp, analytical, and experienced with Y Combinator seed benchmarks, SaaS unit economics, cap table math, and investor updates. You communicate with crisp numbers and high clarity.",
    suggestedQuestions: [
      "Analyze our 18.4 month runway with $14.5k/mo burn",
      "Draft an exciting Seed round investor update email",
      "What SaaS metrics matter most for Series A diligence?",
      "Review our $1.5M target cap table allocation",
    ],
  },
};

export function AITeammateAvatars() {
  return (
    <group>
      {Object.values(AI_TEAMMATES).map((teammate) => (
        <AITeammateAvatar key={teammate.id} config={teammate} />
      ))}
    </group>
  );
}

function AITeammateAvatar({ config }: { config: AITeammateConfig }) {
  const openAITeammate = useOfficeStore((state) => state.openAITeammate);
  const activeTeammate = useOfficeStore((state) => state.activeAITeammate);
  const [hovered, setHovered] = useState(false);
  const auraRef = useRef<THREE.Mesh>(null);
  const motion = useRef(0);

  useFrame(() => {
    const time = performance.now();
    if (auraRef.current) {
      const scale = 1 + (hovered ? Math.sin(time / 200) * 0.12 : Math.sin(time / 500) * 0.04);
      auraRef.current.scale.set(scale, scale, 1);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    playChime();
    openAITeammate(config.id);
  };

  const isSelected = activeTeammate === config.id;

  return (
    <group
      position={config.position}
      rotation-y={config.rotation}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Ground Aura Marker */}
      <mesh ref={auraRef} position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.3, 0.52, 24]} />
        <meshBasicMaterial
          color={config.accent}
          transparent
          opacity={isSelected ? 0.9 : hovered ? 0.6 : 0.25}
        />
      </mesh>

      {/* High-Fidelity Humanoid Avatar */}
      <AvatarModel
        color={config.color}
        motion={motion}
        hairColor={config.id === "dev" ? "#1a202c" : config.id === "design" ? "#4a3022" : "#2d3748"}
        skinTone={config.id === "dev" ? "#e0b696" : config.id === "design" ? "#c89b7b" : "#b08560"}
      />

      {/* AI Bot Hologram Overhead Halo */}
      <mesh position={[0, 1.62, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.2, 0.015, 12, 24]} />
        <meshStandardMaterial
          color={config.accent}
          emissive={config.accent}
          emissiveIntensity={0.9}
        />
      </mesh>

      {/* Clean Interactive Overhead Tag */}
      <Html center position={[0, 1.88, 0]}>
        <div
          className={`pointer-events-none select-none flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-md transition-all whitespace-nowrap ${
            hovered || isSelected
              ? "bg-[#17211b] text-white ring-2 ring-[#c8f560] scale-105"
              : "bg-white/95 text-[#17211b] ring-1 ring-black/10"
          }`}
        >
          <span
            className="h-2 w-2 rounded-full animate-pulse"
            style={{ backgroundColor: config.accent }}
          />
          <span>{config.name} (AI {config.id === "dev" ? "Dev" : config.id === "design" ? "Design" : "Finance"})</span>
          {(hovered || isSelected) && (
            <span className="text-[9px] text-[#c8f560] font-black uppercase">Chat (X)</span>
          )}
        </div>
      </Html>
    </group>
  );
}
