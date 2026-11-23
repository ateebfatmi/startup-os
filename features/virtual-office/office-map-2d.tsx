"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { INTERACTION_ZONES, OFFICE_ROOMS, getOfficeRoomAt } from "./office-data";
import { BLUEPRINT_BOUNDS, resolveMovement } from "./collision";
import { useOfficeStore } from "./store";
import { playChime, playCoffeeSound, playSlideClick } from "./audio";
import type { PlayerSnapshot } from "./types";

const VIEW_W = 1200;
const VIEW_H = 900;
const PAD = 28;
const MAP_W = VIEW_W - PAD * 2; // 1144
const MAP_H = VIEW_H - PAD * 2; // 844

function mapX(x: number) {
  return PAD + ((x - BLUEPRINT_BOUNDS.minX) / (BLUEPRINT_BOUNDS.maxX - BLUEPRINT_BOUNDS.minX)) * MAP_W;
}

function mapY(z: number) {
  return PAD + ((z - BLUEPRINT_BOUNDS.minZ) / (BLUEPRINT_BOUNDS.maxZ - BLUEPRINT_BOUNDS.minZ)) * MAP_H;
}

function worldX(x: number) {
  return BLUEPRINT_BOUNDS.minX + ((x - PAD) / MAP_W) * (BLUEPRINT_BOUNDS.maxX - BLUEPRINT_BOUNDS.minX);
}

function worldZ(y: number) {
  return BLUEPRINT_BOUNDS.minZ + ((y - PAD) / MAP_H) * (BLUEPRINT_BOUNDS.maxZ - BLUEPRINT_BOUNDS.minZ);
}

function useOfficeMovement() {
  const keys = useRef(new Set<string>());

  useEffect(() => {
    const editable = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

    const down = (event: KeyboardEvent) => {
      if (editable(event.target)) return;
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        event.preventDefault();
        keys.current.add(key);
        useOfficeStore.getState().setClickTarget(null);
        if (useOfficeStore.getState().isSitting) useOfficeStore.getState().setIsSitting(false);
      }
      if (key === "e") {
        const action = useOfficeStore.getState().nearbyAction;
        if (action) {
          playChime();
          useOfficeStore.getState().openPanel(action.kind);
        }
      }
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const state = useOfficeStore.getState();
      const delta = Math.min((now - last) / 1000, 0.05);
      last = now;
      let dx = 0;
      let dz = 0;
      if (keys.current.has("a") || keys.current.has("arrowleft")) dx -= 1;
      if (keys.current.has("d") || keys.current.has("arrowright")) dx += 1;
      if (keys.current.has("w") || keys.current.has("arrowup")) dz -= 1;
      if (keys.current.has("s") || keys.current.has("arrowdown")) dz += 1;

      const target = state.clickTarget;
      if (!dx && !dz && target) {
        const tx = target.x - state.player.x;
        const tz = target.z - state.player.z;
        const distance = Math.hypot(tx, tz);
        if (distance < 0.12) state.setClickTarget(null);
        else {
          dx = tx / distance;
          dz = tz / distance;
        }
      }

      if (dx || dz) {
        const length = Math.hypot(dx, dz) || 1;
        const speed = state.isCaffeinated ? 5.2 : 4.0;
        const next = resolveMovement(state.player, {
          x: state.player.x + (dx / length) * speed * delta,
          z: state.player.z + (dz / length) * speed * delta,
        });
        if (next.x === state.player.x && next.z === state.player.z && target) state.setClickTarget(null);
        state.setPlayerTransform(next.x, next.z, Math.atan2(dx, -dz));
      }

      const current = useOfficeStore.getState();
      const nearest = INTERACTION_ZONES
        .map((zone) => ({ zone, distance: Math.hypot(zone.x - current.player.x, zone.z - current.player.z) }))
        .filter(({ zone, distance }) => distance <= zone.radius)
        .sort((a, b) => a.distance - b.distance)[0]?.zone;
      const action = nearest ? { kind: nearest.kind, label: nearest.hint || nearest.label } : null;
      if (current.nearbyAction?.label !== action?.label) current.setNearbyAction(action);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
}

// Sophisticated architectural office chair with caster base, padded seat, and contoured backrest
function OfficeChair({ x, y, rotate = 0, color = "#23282c" }: { x: number | string; y: number | string; rotate?: number; color?: string }) {
  const numX = Number(x);
  const numY = Number(y);
  return (
    <g transform={`translate(${numX} ${numY}) rotate(${rotate})`} filter="url(#furnShadow)">
      {/* 5-Star Swivel Base with Casters */}
      <circle r="14" fill="none" stroke="#60666d" strokeWidth="1.2" opacity=".4" />
      <line x1="-12" y1="0" x2="12" y2="0" stroke="#4a5056" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="0" y1="-12" x2="0" y2="12" stroke="#4a5056" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="-9" y1="-9" x2="9" y2="9" stroke="#4a5056" strokeWidth="2" strokeLinecap="round" />
      {/* Contoured Foam Seat Cushion */}
      <rect x="-13" y="-12" width="26" height="24" rx="8" fill={color} stroke="#14181a" strokeWidth="1.8" />
      <rect x="-10" y="-9" width="20" height="18" rx="6" fill="#32383e" opacity=".7" />
      {/* Ergonomic Curved Lumbar Backrest */}
      <path d="M -13 5 C -7 9 7 9 13 5 L 12 11 C 6 14 -6 14 -12 11 Z" fill="#1c2024" stroke="#0e1114" strokeWidth="1.5" />
      {/* Left and Right Armrests */}
      <rect x="-15" y="-5" width="3.5" height="14" rx="1.7" fill="#181c20" />
      <rect x="11.5" y="-5" width="3.5" height="14" rx="1.7" fill="#181c20" />
    </g>
  );
}

// Deep, comfortable upholstered lounge armchair with plush cushions
function LoungeArmchair({ x, y, rotate = 0, color = "#47525d" }: { x: number | string; y: number | string; rotate?: number; color?: string }) {
  const numX = Number(x);
  const numY = Number(y);
  return (
    <g transform={`translate(${numX} ${numY}) rotate(${rotate})`} filter="url(#sofaShadow)">
      {/* Armchair Base Body */}
      <rect x="-20" y="-19" width="40" height="38" rx="10" fill={color} stroke="#1b2126" strokeWidth="2" />
      {/* Deep Cushion with Inset Piping */}
      <rect x="-14" y="-12" width="28" height="26" rx="7" fill="#586673" stroke="#2a333c" strokeWidth="1.2" />
      {/* Backrest Cushion */}
      <rect x="-18" y="-16" width="36" height="9" rx="4.5" fill="#363f47" />
      {/* Padded Left and Right Armrests */}
      <rect x="-21" y="-8" width="6" height="25" rx="3" fill="#363f47" />
      <rect x="15" y="-8" width="6" height="25" rx="3" fill="#363f47" />
    </g>
  );
}

// Lush architectural indoor plant with realistic ceramic planter, dark soil, and layered green foliage
function ArchitecturalPlant({ x, y, scale = 1 }: { x: number | string; y: number | string; scale?: number }) {
  const numX = Number(x);
  const numY = Number(y);
  return (
    <g transform={`translate(${numX} ${numY}) scale(${scale})`} filter="url(#furnShadow)">
      {/* Terracotta / Ceramic Planter Pot */}
      <circle r="16" fill="url(#planterPot)" stroke="#744a2c" strokeWidth="2" />
      {/* Rich Potting Soil */}
      <circle r="12.5" fill="#321e12" />
      {/* Layer 1: Dark Outer Leaves */}
      <path d="M0 0 C-12 -22 -26 -16 -20 -3 C-17 6 -6 3 0 0 Z" fill="#2d583b" opacity=".95" />
      <path d="M0 0 C12 -22 26 -16 20 -3 C17 6 6 3 0 0 Z" fill="#316242" opacity=".95" />
      <path d="M0 0 C-22 -8 -26 12 -12 18 C-4 15 0 5 0 0 Z" fill="#285035" opacity=".95" />
      <path d="M0 0 C22 -8 26 12 12 18 C4 15 0 5 0 0 Z" fill="#2f5c3e" opacity=".95" />
      {/* Layer 2: Medium Leaves */}
      <path d="M0 0 C-6 -24 6 -24 0 0 Z" fill="#447e56" />
      <path d="M0 0 C-18 -15 -15 -2 0 0 Z" fill="#4c8d60" />
      <path d="M0 0 C18 -15 15 -2 0 0 Z" fill="#4c8d60" />
      <path d="M0 0 C-14 12 0 20 0 0 Z" fill="#3a704c" />
      <path d="M0 0 C14 12 0 20 0 0 Z" fill="#3a704c" />
      {/* Layer 3: Fresh Bright Center Highlights */}
      <circle cx="-1" cy="-2" r="5" fill="#6db884" />
      <circle cx="2" cy="1" r="3.5" fill="#88cb9c" />
    </g>
  );
}

// Crisp double-glazed exterior window with aluminum mullions and glass shine
function ExteriorWindow({ x, y, w, h, vertical = false }: { x: number | string; y: number | string; w: number | string; h: number | string; vertical?: boolean }) {
  const numX = Number(x);
  const numY = Number(y);
  const numW = Number(w);
  const numH = Number(h);
  return (
    <g className="pointer-events-none">
      <rect x={numX} y={numY} width={numW} height={numH} fill="url(#windowGlass)" stroke="#6ba8c7" strokeWidth="2" />
      {vertical ? (
        <>
          <line x1={numX + numW / 2} y1={numY} x2={numX + numW / 2} y2={numY + numH} stroke="#3b88b0" strokeWidth="1.8" />
          <line x1={numX} y1={numY + numH / 2} x2={numX + numW} y2={numY + numH / 2} stroke="#3b88b0" strokeWidth="1.8" />
          <line x1={numX + 3} y1={numY + 4} x2={numX + numW - 3} y2={numY + numH - 4} stroke="#ffffff" strokeWidth="1" opacity=".5" />
        </>
      ) : (
        <>
          <line x1={numX} y1={numY + numH / 2} x2={numX + numW} y2={numY + numH / 2} stroke="#3b88b0" strokeWidth="1.8" />
          <line x1={numX + numW / 2} y1={numY} x2={numX + numW / 2} y2={numY + numH} stroke="#3b88b0" strokeWidth="1.8" />
          <line x1={numX + 4} y1={numY + 3} x2={numX + numW - 4} y2={numY + numH - 3} stroke="#ffffff" strokeWidth="1" opacity=".5" />
        </>
      )}
    </g>
  );
}

// Delicate architectural door swing arc and door leaf
function CadDoorSwing({ x, y, radius = 42, startAngle = 0, sweepAngle = 90 }: { x: number | string; y: number | string; radius?: number; startAngle?: number; sweepAngle?: number }) {
  const numX = Number(x);
  const numY = Number(y);
  const rad1 = (startAngle * Math.PI) / 180;
  const rad2 = ((startAngle + sweepAngle) * Math.PI) / 180;
  const x1 = numX + Math.cos(rad1) * radius;
  const y1 = numY + Math.sin(rad1) * radius;
  const x2 = numX + Math.cos(rad2) * radius;
  const y2 = numY + Math.sin(rad2) * radius;
  return (
    <g className="pointer-events-none opacity-50">
      <line x1={numX} y1={numY} x2={x1} y2={y1} stroke="#524335" strokeWidth="2.5" strokeLinecap="round" />
      <path d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`} fill="none" stroke="#6b5947" strokeWidth="1.5" strokeDasharray="4 3" />
    </g>
  );
}

// Clean room badge label
function RoomBadge({ x, y, title, subtitle }: { x: number | string; y: number | string; title: string; subtitle: string }) {
  const numX = Number(x);
  const numY = Number(y);
  return (
    <g className="pointer-events-none">
      <rect
        x={numX - 90}
        y={numY - 17}
        width="180"
        height="34"
        rx="10"
        fill="#fffdf9"
        opacity=".95"
        stroke="#222b27"
        strokeWidth="1.5"
        filter="url(#badgeShadow)"
      />
      <text x={numX} y={numY - 2} textAnchor="middle" className="fill-[#13221b] text-[11px] font-black tracking-[.06em]">
        {title}
      </text>
      <text x={numX} y={numY + 11} textAnchor="middle" className="fill-[#53655c] text-[8.5px] font-semibold">
        {subtitle}
      </text>
    </g>
  );
}

// Sophisticated Gather.town style avatar with directional posture and voice huddle proximity circle
function GatherAvatar({ player, local = false, isCaffeinated = false }: { player: PlayerSnapshot; local?: boolean; isCaffeinated?: boolean }) {
  const x = mapX(player.x);
  const y = mapY(player.z);
  const rotDeg = ((player.rotation || 0) * 180) / Math.PI;
  const initials = player.name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "YOU";

  return (
    <g transform={`translate(${x} ${y})`} className="pointer-events-none" filter="url(#avatarShadow)">
      {/* Voice Huddle Audio Proximity Zone (Gather.town 3m boundary) */}
      {local && (
        <g>
          <circle r="96" fill="#c8f560" fillOpacity=".08" stroke="#c8f560" strokeWidth="2" strokeDasharray="6 6" />
          <circle r="94" fill="none" stroke="#1d402b" strokeWidth="1" opacity=".4" />
        </g>
      )}

      {/* Realistic Avatar Ground Shadow */}
      <ellipse cy="20" rx="19" ry="8.5" fill="#0c1811" opacity=".38" />

      {/* Rotating Avatar Body: Facing direction arrow, shoulders, head, hair */}
      <g transform={`rotate(${rotDeg})`}>
        {/* Directional Indicator Pointer Arrow */}
        <polygon points="0,-30 -6.5,-20 6.5,-20" fill={local ? "#c8f560" : "#ffffff"} stroke="#142c1e" strokeWidth="1.6" />

        {/* Outer Glow Halo Ring */}
        <circle r={local ? 23.5 : 21} fill="#ffffff" stroke={local ? "#c8f560" : "#173f2b"} strokeWidth={local ? 5.5 : 3.5} />

        {/* Avatar Clothing / Color */}
        <circle r={local ? 19 : 17.5} fill={player.color} />

        {/* Top-down Humanoid Silhouette (Shoulders & Torso) */}
        <ellipse cy="2" rx="13" ry="7.5" fill="#1b2420" opacity=".65" />
        
        {/* Head Base */}
        <circle cy="-1" r="8.5" fill="#f5cfb5" />

        {/* Hair styling facing forward */}
        <path d="M -8.5 2 C -8.5 -9 8.5 -9 8.5 2 C 6 -3 -6 -3 -8.5 2 Z" fill="#2d1c13" />

        {/* Facial Profile Details (Nose / eyes directed towards facing angle) */}
        <ellipse cx="0" cy="-6" rx="2.2" ry="1.4" fill="#dfaa87" opacity=".7" />
      </g>

      {/* Online Status Dot (Stationary relative to badge) */}
      <circle cx="15.5" cy="14.5" r="5.5" fill="#22c55e" stroke="#ffffff" strokeWidth="2" />

      {/* Floating Name Badge */}
      <g transform="translate(0 -40)">
        <rect
          x="-44"
          y="-13"
          width="88"
          height="25"
          rx="10"
          fill={local ? "#122a1d" : "#ffffff"}
          stroke={local ? "#c8f560" : "#163424"}
          strokeWidth="1.6"
        />
        <text y="4" textAnchor="middle" className={`${local ? "fill-[#c8f560]" : "fill-[#122a1d]"} text-[10px] font-black`}>
          {local ? (isCaffeinated ? "You ☕" : "You") : player.name.slice(0, 14)}
        </text>
      </g>
    </g>
  );
}

// Master component containing all 12 rooms rendered with rich architectural finishes matching media_1795281102875_7cf75968.jpg
function ArchitecturalFurnishings() {
  return (
    <>
      {/* ========================================================
          1. MEETING / CONFERENCE ROOM (14' x 10') - TOP LEFT
          ======================================================== */}
      <g id="room-conference" aria-label="Meeting / Conference Room">
        {/* Soft Olive Green Inlay Rug with Tailored Border */}
        <rect x="36" y="36" width="382" height="258" rx="8" fill="url(#confCarpet)" stroke="#9fb8a5" strokeWidth="2.5" />

        {/* Solid Natural Oak Conference Table with Soft Rounded Corners */}
        <g filter="url(#furnShadow)">
          <rect x="108" y="96" width="242" height="120" rx="18" fill="url(#oakWood)" stroke="#5c3b24" strokeWidth="4" />
          {/* Beveled Top Inset Surface */}
          <rect x="120" y="108" width="218" height="96" rx="12" fill="#ba8054" stroke="#dcb48e" strokeWidth="1.5" />
          {/* Recessed Cable Management & Speakerphone Hub */}
          <rect x="180" y="146" width="98" height="20" rx="6" fill="#232b30" stroke="#48535b" strokeWidth="1.5" />
          <circle cx="229" cy="156" r="6" fill="#38bdf8" />
        </g>

        {/* 10 Conference Chairs (4 Top, 4 Bottom, 1 Left, 1 Right) */}
        {[136, 198, 260, 322].map((x) => (
          <OfficeChair key={`conf-top-${x}`} x={x} y={72} rotate={0} />
        ))}
        {[136, 198, 260, 322].map((x) => (
          <OfficeChair key={`conf-bot-${x}`} x={x} y={240} rotate={180} />
        ))}
        <OfficeChair x={80} y={156} rotate={-90} />
        <OfficeChair x={378} y={156} rotate={90} />

        {/* Ultra-Slim Wall-Mounted 85" Presentation Display on West Wall */}
        <rect x="30" y="102" width="14" height="108" rx="3.5" fill="#13191c" stroke="#080c0e" strokeWidth="2" filter="url(#furnShadow)" />
        <rect x="34" y="110" width="6" height="92" rx="1.5" fill="url(#screenGradient)" />

        {/* Potted Indoor Monstera in Top-Left Corner */}
        <ArchitecturalPlant x={65} y={65} scale={1.2} />
      </g>

      {/* ========================================================
          2. DIRECTOR / FOUNDER CABIN (10' x 12') - TOP CENTER-LEFT
          ======================================================== */}
      <g id="room-founder-cabin" aria-label="Director / Founder Cabin">
        {/* Warm Walnut Parquet Floor Inlay */}
        <rect x="424" y="36" width="194" height="258" rx="8" fill="url(#walnutWood)" stroke="#c4a58b" strokeWidth="2" />

        {/* Executive Director Desk */}
        <g filter="url(#furnShadow)">
          <rect x="460" y="120" width="132" height="60" rx="8" fill="url(#darkWalnut)" stroke="#422515" strokeWidth="3.5" />
          {/* Full-grain Dark Leather Writing Pad */}
          <rect x="496" y="130" width="60" height="40" rx="4" fill="#181d1f" stroke="#2c3438" strokeWidth="1.2" />
          {/* Aluminum Laptop with Backlit Screen */}
          <rect x="510" y="136" width="32" height="22" rx="2.5" fill="#c4cad0" stroke="#757e85" strokeWidth="1" />
          <rect x="513" y="139" width="26" height="14" rx="1" fill="#10b981" opacity=".9" />
          {/* Executive Coffee Mug */}
          <circle cx="566" cy="142" r="4.5" fill="#ffffff" stroke="#c48a58" strokeWidth="1.5" />
        </g>

        {/* High-Back Executive Swivel Chair */}
        <OfficeChair x={526} y={84} rotate={0} color="#152f23" />
        {/* 2 Visitor Armchairs in Front of Desk */}
        <OfficeChair x={492} y={214} rotate={180} color="#35483f" />
        <OfficeChair x={560} y={214} rotate={180} color="#35483f" />

        {/* North Wall Credenza & Trophy Display */}
        <rect x="456" y="42" width="140" height="24" rx="4" fill="#4d2c18" stroke="#2c170b" strokeWidth="2" filter="url(#furnShadow)" />
        <circle cx="568" cy="54" r="6" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
        <rect x="472" y="46" width="46" height="15" rx="2" fill="#7c2d12" />

        {/* Corner Plant */}
        <ArchitecturalPlant x={450} y={60} scale={1.0} />
      </g>

      {/* ========================================================
          3. MANAGER CABIN (10' x 12') - TOP CENTER-RIGHT
          ======================================================== */}
      <g id="room-manager-cabin" aria-label="Manager Cabin">
        {/* Slate Blue-Grey Management Rug */}
        <rect x="624" y="36" width="194" height="258" rx="8" fill="#e5edf2" stroke="#b0c4d4" strokeWidth="2" />

        {/* Modern Honey Oak Manager Desk */}
        <g filter="url(#furnShadow)">
          <rect x="660" y="120" width="128" height="58" rx="8" fill="url(#oakWood)" stroke="#54351f" strokeWidth="3.5" />
          {/* Dual Widescreen Curved Monitors */}
          <rect x="692" y="123" width="64" height="8" rx="2.5" fill="#172228" stroke="#35444e" strokeWidth="1" />
          <line x1="724" y1="123" x2="724" y2="132" stroke="#9ba4ab" strokeWidth="3" strokeLinecap="round" />
          <rect x="696" y="124" width="56" height="4" rx="1" fill="#38bdf8" opacity=".85" />
          {/* Keyboard & Mouse */}
          <rect x="702" y="142" width="44" height="17" rx="2" fill="#1b2126" />
        </g>

        {/* Manager Task Chair */}
        <OfficeChair x={724} y={84} rotate={0} color="#1c3b2e" />
        {/* 2 Visitor Chairs in Front of Desk */}
        <OfficeChair x={692} y={212} rotate={180} color="#35483f" />
        <OfficeChair x={756} y={212} rotate={180} color="#35483f" />

        {/* North Wall Credenza */}
        <rect x="656" y="42" width="136" height="24" rx="4" fill="#4d2c18" stroke="#2c170b" strokeWidth="2" filter="url(#furnShadow)" />

        {/* Corner Plant */}
        <ArchitecturalPlant x={796} y={60} scale={1.0} />
      </g>

      {/* ========================================================
          4. PANTRY / BREAK AREA (8' x 10') - TOP RIGHT-MIDDLE
          ======================================================== */}
      <g id="room-pantry" aria-label="Pantry / Break Area">
        {/* Elegant Bistro Checkered Tile Floor */}
        <rect x="824" y="36" width="194" height="258" rx="8" fill="url(#pantryTile)" stroke="#cfc0ad" strokeWidth="2" />

        {/* Quartz Countertop Kitchen Island along North Wall */}
        <g filter="url(#furnShadow)">
          <rect x="834" y="38" width="174" height="46" rx="5" fill="url(#counterQuartz)" stroke="#523924" strokeWidth="3" />
          {/* Undermount Double Stainless Steel Sink with Mixer Tap */}
          <rect x="856" y="46" width="38" height="28" rx="4" fill="#b4c4c1" stroke="#5a6e6a" strokeWidth="1.8" />
          <circle cx="875" cy="60" r="5" fill="#40534f" />
          <line x1="875" y1="42" x2="875" y2="53" stroke="#8da39f" strokeWidth="3.5" strokeLinecap="round" />
          {/* Induction Hotplate / Coffee Espresso Station */}
          <rect x="940" y="46" width="46" height="30" rx="3.5" fill="#1b252a" stroke="#3b4c54" strokeWidth="1.5" />
          <circle cx="953" cy="61" r="5.5" fill="#ef4444" />
          <circle cx="973" cy="61" r="5.5" fill="#ef4444" />
        </g>

        {/* Round Natural Hardwood Cafe Dining Table in Center */}
        <g filter="url(#furnShadow)">
          <circle cx="920" cy="188" r="46" fill="url(#oakWood)" stroke="#54331c" strokeWidth="4" />
          <circle cx="920" cy="188" r="40" fill="#ba8054" />
          <circle cx="920" cy="188" r="16" fill="#a46b41" stroke="#dfb692" strokeWidth="1.5" />
        </g>

        {/* 4 Cafe Dining Chairs around Table */}
        <OfficeChair x={920} y={126} rotate={0} color="#2c5341" />
        <OfficeChair x={920} y={250} rotate={180} color="#2c5341" />
        <OfficeChair x={858} y={188} rotate={-90} color="#2c5341" />
        <OfficeChair x={982} y={188} rotate={90} color="#2c5341" />
      </g>

      {/* ========================================================
          5. 2 WASHROOMS (6' x 7' each) - TOP RIGHT
          ======================================================== */}
      <g id="room-washrooms" aria-label="Washroom Facilities">
        {/* Washroom 1 (Top) */}
        <rect x="1024" y="36" width="144" height="124" rx="6" fill="url(#washroomTile)" stroke="#8da1a4" strokeWidth="2" />
        {/* Toilet Commode 1 (Tank + Oval Bowl) */}
        <g filter="url(#furnShadow)">
          <rect x="1118" y="52" width="26" height="13" rx="3.5" fill="#ffffff" stroke="#688083" strokeWidth="2" />
          <ellipse cx="1131" cy="76" rx="11.5" ry="16" fill="#ffffff" stroke="#688083" strokeWidth="2" />
          <ellipse cx="1131" cy="76" rx="7.5" ry="11" fill="#e2edf0" />
        </g>
        {/* Vanity Sink 1 */}
        <g filter="url(#furnShadow)">
          <rect x="1116" y="112" width="30" height="26" rx="6" fill="#ffffff" stroke="#688083" strokeWidth="2" />
          <ellipse cx="1131" cy="125" rx="8" ry="7" fill="#8cb1b5" />
          <circle cx="1131" cy="116" r="2.5" fill="#3b4d50" />
        </g>
        <CadDoorSwing x={1024} y={130} radius={32} startAngle={-90} sweepAngle={90} />

        {/* Washroom 2 (Bottom) */}
        <rect x="1024" y="164" width="144" height="134" rx="6" fill="url(#washroomTile)" stroke="#8da1a4" strokeWidth="2" />
        {/* Toilet Commode 2 */}
        <g filter="url(#furnShadow)">
          <rect x="1118" y="180" width="26" height="13" rx="3.5" fill="#ffffff" stroke="#688083" strokeWidth="2" />
          <ellipse cx="1131" cy="204" rx="11.5" ry="16" fill="#ffffff" stroke="#688083" strokeWidth="2" />
          <ellipse cx="1131" cy="204" rx="7.5" ry="11" fill="#e2edf0" />
        </g>
        {/* Vanity Sink 2 */}
        <g filter="url(#furnShadow)">
          <rect x="1116" y="244" width="30" height="26" rx="6" fill="#ffffff" stroke="#688083" strokeWidth="2" />
          <ellipse cx="1131" cy="257" rx="8" ry="7" fill="#8cb1b5" />
          <circle cx="1131" cy="248" r="2.5" fill="#3b4d50" />
        </g>
        <CadDoorSwing x={1024} y={265} radius={32} startAngle={-90} sweepAngle={90} />
      </g>

      {/* ========================================================
          6. COLLABORATION / DISCUSSION AREA (12' x 10') - MIDDLE LEFT
          ======================================================== */}
      <g id="room-collaboration" aria-label="Collaboration / Discussion Area">
        {/* Circular Ivory Conversation Rug */}
        <ellipse cx="195" cy="450" rx="120" ry="120" fill="url(#carpetPattern)" stroke="#cbb9a1" strokeWidth="2.5" />

        {/* Solid Oak Circular Coffee Table */}
        <g filter="url(#furnShadow)">
          <circle cx="195" cy="450" r="42" fill="url(#oakWood)" stroke="#54351f" strokeWidth="4" />
          <circle cx="195" cy="450" r="36" fill="#ba8054" />
          {/* Magazine & Coffee Cups */}
          <rect x="180" y="438" width="18" height="24" rx="2" fill="#ffffff" stroke="#63452c" strokeWidth="1" />
          <circle cx="214" cy="445" r="4" fill="#ffffff" stroke="#355c48" strokeWidth="1.5" />
          <circle cx="210" cy="460" r="4" fill="#ffffff" stroke="#355c48" strokeWidth="1.5" />
        </g>

        {/* 4 Deep Upholstered Lounge Armchairs Angled at 45° around Table */}
        <LoungeArmchair x={132} y={388} rotate={-45} color="#3d6350" />
        <LoungeArmchair x={258} y={388} rotate={45} color="#3d6350" />
        <LoungeArmchair x={132} y={512} rotate={-135} color="#3d6350" />
        <LoungeArmchair x={258} y={512} rotate={135} color="#3d6350" />

        {/* Glass Partition Divider on Right Side with Stainless Steel Posts */}
        <rect x="372" y="340" width="8" height="194" rx="4" fill="url(#glassPanel)" stroke="#30584e" strokeWidth="2" filter="url(#furnShadow)" />
        {[355, 405, 455, 505].map((y) => (
          <circle key={`glass-post-${y}`} cx={376} cy={y} r="3.5" fill="#19372e" />
        ))}

        {/* Lush Corner Plants */}
        <ArchitecturalPlant x={65} y={340} scale={1.1} />
        <ArchitecturalPlant x={65} y={560} scale={1.1} />
        <ArchitecturalPlant x={350} y={560} scale={1.0} />
      </g>

      {/* ========================================================
          7. WORKSTATIONS (20' x 14') - CENTER (8 DESKS)
          ======================================================== */}
      <g id="room-workstations" aria-label="Workstations Area">
        {/* Central Workspace Inlay Carpet */}
        <rect x="396" y="322" width="414" height="268" rx="10" fill="#f0ebe2" stroke="#c9bba8" strokeWidth="2.5" />

        {/* Central Acoustic Felt Privacy Partition between Desk Rows */}
        <rect x="412" y="446" width="382" height="9" rx="4.5" fill="#2d5241" stroke="#173125" strokeWidth="2" filter="url(#furnShadow)" />

        {/* NORTH WORKSTATION ROW (4 Desks facing South) */}
        {[426, 520, 614, 708].map((x, idx) => (
          <g key={`north-workstation-${idx}`}>
            {/* Desktop with Natural Wood Grain */}
            <g filter="url(#furnShadow)">
              <rect x={x} y="394" width="86" height="50" rx="6" fill="url(#oakWood)" stroke="#523521" strokeWidth="3" />
              <rect x={x + 6} y="400" width="74" height="38" rx="4" fill="#ba8054" />
              {/* Ultra-Thin Widescreen Monitor */}
              <rect x={x + 18} y="433" width="50" height="8" rx="2" fill="#141d22" stroke="#2e3b43" strokeWidth="1" />
              <rect x={x + 22} y="434" width="42" height="4" rx="1" fill="#38bdf8" opacity=".85" />
              {/* Backlit Keyboard & Precision Mousepad */}
              <rect x={x + 24} y="408" width="38" height="15" rx="2" fill="#1b2226" />
              <rect x={x + 67} y="410" width="11" height="12" rx="2" fill="#283238" />
            </g>
            {/* Ergonomic Office Task Chair (Facing South) */}
            <OfficeChair x={x + 43} y={356} rotate={0} color="#214234" />
          </g>
        ))}

        {/* SOUTH WORKSTATION ROW (4 Desks facing North) */}
        {[426, 520, 614, 708].map((x, idx) => (
          <g key={`south-workstation-${idx}`}>
            {/* Desktop */}
            <g filter="url(#furnShadow)">
              <rect x={x} y="458" width="86" height="50" rx="6" fill="url(#oakWood)" stroke="#523521" strokeWidth="3" />
              <rect x={x + 6} y="464" width="74" height="38" rx="4" fill="#ba8054" />
              {/* Ultra-Thin Widescreen Monitor */}
              <rect x={x + 18} y="461" width="50" height="8" rx="2" fill="#141d22" stroke="#2e3b43" strokeWidth="1" />
              <rect x={x + 22} y="463" width="42" height="4" rx="1" fill="#38bdf8" opacity=".85" />
              {/* Backlit Keyboard & Mousepad */}
              <rect x={x + 24} y="480" width="38" height="15" rx="2" fill="#1b2226" />
              <rect x={x + 67} y="482" width="11" height="12" rx="2" fill="#283238" />
            </g>
            {/* Ergonomic Office Task Chair (Facing North) */}
            <OfficeChair x={x + 43} y={548} rotate={180} color="#214234" />
          </g>
        ))}
      </g>

      {/* ========================================================
          8. PRODUCT / PROJECT ROOM (10' x 12') - MIDDLE RIGHT
          ======================================================== */}
      <g id="room-product" aria-label="Product / Project Room">
        {/* Soft Sage Green Project Carpet */}
        <rect x="824" y="324" width="344" height="268" rx="8" fill="url(#confCarpet)" stroke="#a8c2b0" strokeWidth="2.5" />

        {/* Project Conference Table */}
        <g filter="url(#furnShadow)">
          <rect x="895" y="420" width="202" height="76" rx="14" fill="url(#oakWood)" stroke="#523521" strokeWidth="4" />
          <rect x="906" y="430" width="180" height="56" rx="9" fill="#ba8054" stroke="#e0ba96" strokeWidth="1.5" />
        </g>

        {/* 6 Project Team Chairs (3 Top, 3 Bottom) */}
        {[925, 995, 1065].map((x) => (
          <OfficeChair key={`proj-top-${x}`} x={x} y={386} rotate={0} color="#294a3c" />
        ))}
        {[925, 995, 1065].map((x) => (
          <OfficeChair key={`proj-bot-${x}`} x={x} y={530} rotate={180} color="#294a3c" />
        ))}

        {/* Interactive Sprint Whiteboard on East Wall */}
        <rect x="1156" y="388" width="12" height="140" rx="3.5" fill="#ffffff" stroke="#1f2d27" strokeWidth="2" filter="url(#furnShadow)" />
        {/* Sprint Sticky Notes */}
        <rect x="1158" y="408" width="7" height="11" rx="1" fill="#facc15" />
        <rect x="1158" y="428" width="7" height="11" rx="1" fill="#38bdf8" />
        <rect x="1158" y="448" width="7" height="11" rx="1" fill="#4ade80" />
        <rect x="1158" y="468" width="7" height="11" rx="1" fill="#f472b6" />

        {/* Corner Plants */}
        <ArchitecturalPlant x={1140} y={348} scale={1.05} />
        <ArchitecturalPlant x={1140} y={565} scale={1.05} />

        {/* Door Opening & Swing Arc */}
        <CadDoorSwing x={824} y={545} radius={38} startAngle={-90} sweepAngle={90} />
      </g>

      {/* ========================================================
          9. SERVER / IT ROOM (8' x 8') - BOTTOM LEFT
          ======================================================== */}
      <g id="room-server" aria-label="Server / IT Room">
        {/* Raised Computer Room Tile Floor */}
        <rect x="36" y="608" width="242" height="258" rx="8" fill="url(#serverFloor)" stroke="#8da2b0" strokeWidth="2.5" />

        {/* 3 Heavy Data Center Server Cabinets along West Wall */}
        <g filter="url(#furnShadow)">
          <rect x="42" y="628" width="56" height="216" rx="6" fill="#11181d" stroke="#060a0c" strokeWidth="4" />
          {[644, 700, 756, 812].map((y) => (
            <g key={`server-blade-${y}`}>
              <rect x="47" y={y} width="46" height="42" rx="3.5" fill="#1e2930" stroke="#0a1014" strokeWidth="1.5" />
              <line x1="51" y1={y + 11} x2="89" y2={y + 11} stroke="#334652" strokeWidth="2" />
              <line x1="51" y1={y + 21} x2="89" y2={y + 21} stroke="#334652" strokeWidth="2" />
              <line x1="51" y1={y + 31} x2="89" y2={y + 31} stroke="#334652" strokeWidth="2" />
              {/* Blinking Data Center LED Lights */}
              <circle cx="83" cy={y + 9} r="2.5" fill="#22c55e" filter="url(#glow)" />
              <circle cx="83" cy={y + 19} r="2.5" fill="#06b6d4" filter="url(#glow)" />
              <circle cx="83" cy={y + 29} r="2.5" fill="#f59e0b" filter="url(#glow)" />
            </g>
          ))}
        </g>

        {/* Door Opening & Swing Arc */}
        <CadDoorSwing x={232} y={608} radius={38} startAngle={90} sweepAngle={90} />
      </g>

      {/* ========================================================
          10. STORAGE / UTILITY (8' x 8') - BOTTOM CENTER-LEFT
          ======================================================== */}
      <g id="room-storage" aria-label="Storage / Utility Room">
        {/* Utility Hardwood Flooring */}
        <rect x="282" y="608" width="144" height="258" rx="8" fill="url(#woodPlankPattern)" stroke="#bda38f" strokeWidth="2.5" />

        {/* Heavy-Duty Modular Shelving Units along West Wall */}
        <g filter="url(#furnShadow)">
          <rect x="288" y="628" width="34" height="216" rx="4" fill="#5c3822" stroke="#331e11" strokeWidth="3" />
          {[640, 680, 720, 760, 800].map((y) => (
            <g key={`archive-box-${y}`}>
              <rect x="292" y={y} width="26" height="32" rx="2.5" fill="#d4ad88" stroke="#7e532b" strokeWidth="1.5" />
              <line x1="294" y1={y + 16} x2="316" y2={y + 16} stroke="#5c381e" strokeWidth="1.2" />
            </g>
          ))}
          {/* North Shelving */}
          <rect x="330" y="612" width="70" height="24" rx="3.5" fill="#5c3822" stroke="#331e11" strokeWidth="2" />
        </g>

        {/* Door Opening & Swing Arc */}
        <CadDoorSwing x={380} y={608} radius={36} startAngle={90} sweepAngle={90} />
      </g>

      {/* ========================================================
          11. RECEPTION (12' x 8') - BOTTOM CENTER
          ======================================================== */}
      <g id="room-reception" aria-label="Reception Desk & Lobby">
        {/* Polished Travertine Lobby Flooring */}
        <rect x="430" y="608" width="340" height="258" rx="8" fill="#fcf9f2" stroke="#d5cbb8" strokeWidth="2" />

        {/* Sculptural Modern Curved Reception Counter */}
        <g filter="url(#sofaShadow)">
          {/* White Composite Counter Front */}
          <path d="M 470 706 Q 600 678 730 706 L 730 742 Q 600 714 470 742 Z" fill="#ffffff" stroke="#25352e" strokeWidth="3.5" />
          {/* Solid Honey Oak Top Cap Countertop */}
          <path d="M 480 702 Q 600 674 720 702 L 720 724 Q 600 696 480 724 Z" fill="url(#oakWood)" stroke="#523521" strokeWidth="2.5" />
          {/* Receptionist Computer & Visitor Check-In Terminal */}
          <rect x="585" y="698" width="30" height="12" rx="2.5" fill="#141d22" stroke="#2e3b43" strokeWidth="1" />
          <rect x="588" y="699" width="24" height="6" rx="1" fill="#38bdf8" opacity=".85" />
        </g>

        {/* Receptionist Ergonomic Chair (Facing South) */}
        <OfficeChair x={600} y={658} rotate={0} color="#1c3b2e" />

        {/* 2 Statement Ficus Lyrata Trees Flanking the Reception Counter */}
        <ArchitecturalPlant x={450} y={725} scale={1.25} />
        <ArchitecturalPlant x={750} y={725} scale={1.25} />

        {/* Custom Logo Welcome Doormat at Entrance */}
        <rect x="548" y="842" width="104" height="25" rx="5" fill="#1b241e" stroke="#0e1410" strokeWidth="2" filter="url(#furnShadow)" />
        <text x="600" y="858" textAnchor="middle" className="fill-[#c8f560] text-[9.5px] font-black tracking-[.14em]">
          CREWVILLA
        </text>

        {/* Exterior Concrete Threshold Entrance Steps */}
        <rect x="530" y="872" width="140" height="24" rx="4" fill="#c9c4b7" stroke="#48443b" strokeWidth="2" />
        <rect x="544" y="878" width="112" height="12" rx="2" fill="#2d2b27" />
      </g>

      {/* ========================================================
          12. WAITING AREA (12' x 10') - BOTTOM RIGHT
          ======================================================== */}
      <g id="room-waiting" aria-label="Waiting Area Lounge">
        {/* Warm Taupe Wool Lounge Carpet */}
        <rect x="774" y="608" width="394" height="258" rx="8" fill="url(#carpetPattern)" stroke="#c7b6a4" strokeWidth="2.5" />

        {/* 3-Seater Mid-Century Modern Guest Sofa along North Wall */}
        <g id="sofa-north" filter="url(#sofaShadow)">
          <rect x="838" y="650" width="194" height="48" rx="12" fill="#35463f" stroke="#1b2621" strokeWidth="3.5" />
          {/* Backrest Cushion */}
          <rect x="844" y="654" width="182" height="13" rx="6" fill="#222f2a" />
          {/* 3 Tailored Seat Cushions */}
          {[848, 908, 968].map((x) => (
            <rect key={`seat-cushion-${x}`} x={x} y={670} width="56" height="24" rx="6" fill="#495f56" stroke="#222f2a" strokeWidth="1.5" />
          ))}
          {/* Armrests */}
          <rect x="834" y="656" width="12" height="38" rx="5" fill="#222f2a" />
          <rect x="1024" y="656" width="12" height="38" rx="5" fill="#222f2a" />
        </g>

        {/* 2-Seater Modern Sofa along South Wall */}
        <g id="sofa-south" filter="url(#sofaShadow)">
          <rect x="858" y="812" width="154" height="44" rx="10" fill="#35463f" stroke="#1b2621" strokeWidth="3.5" />
          <rect x="864" y="838" width="142" height="12" rx="5" fill="#222f2a" />
          {[868, 938].map((x) => (
            <rect key={`seat-cushion-s-${x}`} x={x} y="816" width="64" height="20" rx="5" fill="#495f56" stroke="#222f2a" strokeWidth="1.5" />
          ))}
          <rect x="854" y="816" width="10" height="34" rx="4" fill="#222f2a" />
          <rect x="1006" y="816" width="10" height="34" rx="4" fill="#222f2a" />
        </g>

        {/* Solid Oak Round Coffee Table in Center */}
        <g filter="url(#furnShadow)">
          <circle cx="935" cy="750" r="38" fill="url(#oakWood)" stroke="#54351f" strokeWidth="4" />
          <circle cx="935" cy="750" r="32" fill="#ba8054" />
          {/* Architectural Design Books on Coffee Table */}
          <rect x="920" y="740" width="28" height="18" rx="2" fill="#ffffff" stroke="#6b4629" strokeWidth="1" />
        </g>

        {/* 2 Upholstered Lounge Armchairs on Left and Right of Coffee Table */}
        <LoungeArmchair x={845} y={750} rotate={-90} color="#35463f" />
        <LoungeArmchair x={1025} y={750} rotate={90} color="#35463f" />

        {/* Glass Partition Divider on Left */}
        <rect x="772" y="650" width="7" height="190" rx="3.5" fill="url(#glassPanel)" stroke="#2d4f45" strokeWidth="2" filter="url(#furnShadow)" />

        {/* Potted Indoor Plants */}
        <ArchitecturalPlant x={1140} y={650} scale={1.1} />
        <ArchitecturalPlant x={1140} y={825} scale={1.1} />
        <ArchitecturalPlant x={745} y={825} scale={1.1} />
      </g>
    </>
  );
}

export function OfficeMap2D() {
  useOfficeMovement();
  const player = useOfficeStore((state) => state.player);
  const remotePlayers = useOfficeStore((state) => state.remotePlayers);
  const clickTarget = useOfficeStore((state) => state.clickTarget);
  const zoomLevel = useOfficeStore((state) => state.zoomLevel);
  const lighting = useOfficeStore((state) => state.lightingMode);
  const isCaffeinated = useOfficeStore((state) => state.isCaffeinated);
  const nearbyAction = useOfficeStore((state) => state.nearbyAction);
  const mapRef = useRef<SVGSVGElement>(null);
  const room = getOfficeRoomAt(player.x, player.z);

  const rooms = useMemo(
    () =>
      OFFICE_ROOMS.map((item) => ({
        ...item,
        x: mapX(item.bounds.minX),
        y: mapY(item.bounds.minZ),
        w: mapX(item.bounds.maxX) - mapX(item.bounds.minX),
        h: mapY(item.bounds.maxZ) - mapY(item.bounds.minZ),
      })),
    []
  );

  const walkToPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!mapRef.current) return;
    const point = mapRef.current.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = mapRef.current.getScreenCTM()?.inverse();
    if (!matrix) return;
    const mapped = point.matrixTransform(matrix);
    useOfficeStore.getState().setClickTarget({ x: worldX(mapped.x), z: worldZ(mapped.y) });
  };

  return (
    <section className={`office-map-shell office-map-${lighting}`} aria-label="Interactive 2D office">
      <output className="sr-only" aria-label="Player position" data-x={player.x} data-z={player.z}>
        {`Player position ${player.x.toFixed(2)}, ${player.z.toFixed(2)}`}
      </output>

      {/* Modern Context pill at top-left */}
      <div className="office-map-context" aria-live="polite">
        <span className="office-map-context__dot" />
        <span className="font-bold">{room?.name ?? "Office Corridor"}</span>
        <span aria-hidden="true">·</span>
        <span>WASD or click to walk</span>
        {nearbyAction && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-[#c8f560] font-black animate-pulse">[E] {nearbyAction.label}</span>
          </>
        )}
      </div>

      <div className="office-map-stage" style={{ transform: `scale(${zoomLevel})` }}>
        <svg
          ref={mapRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="application"
          aria-label="CrewVilla office floor plan. Use arrow keys or W A S D to move, or click a destination."
          onPointerDown={walkToPointer}
        >
          <defs>
            {/* Natural Gaussian Drop Shadows */}
            <filter id="blueprintShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="16" stdDeviation="20" floodColor="#08100c" floodOpacity=".45" />
            </filter>
            <filter id="furnShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="4" stdDeviation="4.5" floodColor="#0c1812" floodOpacity=".24" />
            </filter>
            <filter id="sofaShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="6" stdDeviation="6.5" floodColor="#0c1812" floodOpacity=".28" />
            </filter>
            <filter id="avatarShadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="6" stdDeviation="5.5" floodColor="#07120a" floodOpacity=".42" />
            </filter>
            <filter id="badgeShadow" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="3.5" stdDeviation="4" floodColor="#08120c" floodOpacity=".22" />
            </filter>
            <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Architectural Material Gradients */}
            <linearGradient id="oakWood" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#9a623a" />
              <stop offset="50%" stopColor="#b47b4e" />
              <stop offset="100%" stopColor="#8a532c" />
            </linearGradient>

            <linearGradient id="darkWalnut" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5a351d" />
              <stop offset="50%" stopColor="#6e4226" />
              <stop offset="100%" stopColor="#482713" />
            </linearGradient>

            <linearGradient id="counterQuartz" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#e4ded5" />
            </linearGradient>

            <linearGradient id="planterPot" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c88b5b" />
              <stop offset="100%" stopColor="#8a532d" />
            </linearGradient>

            <linearGradient id="windowGlass" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#eaf5fb" />
              <stop offset="50%" stopColor="#c5e4f3" />
              <stop offset="100%" stopColor="#a3d2ea" />
            </linearGradient>

            <linearGradient id="glassPanel" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#cdebe5" stopOpacity=".8" />
              <stop offset="50%" stopColor="#eaf8f5" stopOpacity=".95" />
              <stop offset="100%" stopColor="#cdebe5" stopOpacity=".8" />
            </linearGradient>

            <linearGradient id="screenGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            {/* Architectural Flooring Patterns */}
            <pattern id="archGrid" width="48" height="48" patternUnits="userSpaceOnUse">
              <rect width="48" height="48" fill="#faf8f2" />
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#e8e2d4" strokeWidth="1" />
            </pattern>

            <pattern id="confCarpet" width="24" height="24" patternUnits="userSpaceOnUse">
              <rect width="24" height="24" fill="#e5ece7" />
              <path d="M 0 0 L 24 24 M 24 0 L 0 24" fill="none" stroke="#d3ded6" strokeWidth="0.8" />
            </pattern>

            <pattern id="walnutWood" width="40" height="20" patternUnits="userSpaceOnUse">
              <rect width="40" height="20" fill="#eddcd0" />
              <path d="M 0 10 L 40 10 M 20 0 L 20 10 M 0 20 L 40 20 M 40 10 L 40 20" fill="none" stroke="#d5bea9" strokeWidth="1" />
            </pattern>

            <pattern id="pantryTile" width="32" height="32" patternUnits="userSpaceOnUse">
              <rect width="32" height="32" fill="#f4ece2" />
              <rect x="0" y="0" width="16" height="16" fill="#e8ddd0" />
              <rect x="16" y="16" width="16" height="16" fill="#e8ddd0" />
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#ded2c3" strokeWidth="1" />
            </pattern>

            <pattern id="washroomTile" width="24" height="24" patternUnits="userSpaceOnUse">
              <rect width="24" height="24" fill="#e0e8ea" />
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#c0d0d4" strokeWidth="1" />
            </pattern>

            <pattern id="carpetPattern" width="28" height="28" patternUnits="userSpaceOnUse">
              <rect width="28" height="28" fill="#f5ede3" />
              <circle cx="14" cy="14" r="1.2" fill="#d9cbba" />
            </pattern>

            <pattern id="serverFloor" width="36" height="36" patternUnits="userSpaceOnUse">
              <rect width="36" height="36" fill="#d6e0e6" />
              <rect x="2" y="2" width="32" height="32" fill="#c9d6dc" />
              <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#9fb3be" strokeWidth="1.2" />
            </pattern>

            <pattern id="woodPlankPattern" width="48" height="16" patternUnits="userSpaceOnUse">
              <rect width="48" height="16" fill="#ead8ca" />
              <path d="M 0 16 L 48 16 M 24 0 L 24 16" fill="none" stroke="#cfb6a3" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Exterior Architectural Drafting Canvas Backdrop */}
          <rect width={VIEW_W} height={VIEW_H} rx="24" fill="#131c17" />

          {/* Foundation Concrete Boundary Slab (40ft x 30ft Architectural Blueprint) */}
          <rect
            x={PAD - 8}
            y={PAD - 8}
            width={MAP_W + 16}
            height={MAP_H + 16}
            rx="12"
            fill="#cfc9bc"
            stroke="#0a120e"
            strokeWidth="3.5"
            filter="url(#blueprintShadow)"
          />

          {/* Main Floor Surface with Large-Format Architectural Porcelain Tiles */}
          <rect x={PAD} y={PAD} width={MAP_W} height={MAP_H} rx="8" fill="url(#archGrid)" />

          {/* Room Rug Floors */}
          {rooms.map((item) => (
            <rect
              key={item.id}
              x={item.x}
              y={item.y}
              width={item.w}
              height={item.h}
              fill={item.color}
              opacity=".08"
              stroke="#1b2420"
              strokeWidth="4"
            />
          ))}

          {/* Architectural Doorway Swing Arcs */}
          <CadDoorSwing x={424} y={245} radius={44} startAngle={90} sweepAngle={90} />
          <CadDoorSwing x={426} y={245} radius={40} startAngle={0} sweepAngle={90} />
          <CadDoorSwing x={824} y={245} radius={40} startAngle={90} sweepAngle={90} />

          {/* 12 Photorealistic Architectural Furnishings */}
          <ArchitecturalFurnishings />

          {/* Exterior Inset Double-Glazed Windows (Matching Blueprint) */}
          {/* North Windows */}
          <ExteriorWindow x={128} y={PAD - 6} w={196} h={12} />
          <ExteriorWindow x={470} y={PAD - 6} w={105} h={12} />
          <ExteriorWindow x={670} y={PAD - 6} w={105} h={12} />
          <ExteriorWindow x={870} y={PAD - 6} w={105} h={12} />
          {/* West Windows */}
          <ExteriorWindow x={PAD - 6} y={108} w={12} h={116} vertical />
          <ExteriorWindow x={PAD - 6} y={390} w={12} h={116} vertical />
          <ExteriorWindow x={PAD - 6} y={670} w={12} h={116} vertical />
          {/* East Windows */}
          <ExteriorWindow x={PAD + MAP_W - 6} y={60} w={12} h={72} vertical />
          <ExteriorWindow x={PAD + MAP_W - 6} y={190} w={12} h={72} vertical />
          <ExteriorWindow x={PAD + MAP_W - 6} y={400} w={12} h={116} vertical />
          {/* South Windows */}
          <ExteriorWindow x={90} y={PAD + MAP_H - 6} w={130} h={12} />
          <ExteriorWindow x={850} y={PAD + MAP_H - 6} w={170} h={12} />

          {/* Exterior Architectural Perimeter Walls */}
          <rect
            x={PAD}
            y={PAD}
            width={MAP_W}
            height={MAP_H}
            rx="6"
            fill="none"
            stroke="#151b1e"
            strokeWidth="14"
            className="pointer-events-none"
          />

          {/* North Row Interior Partition Walls */}
          <line x1={PAD} y1={294} x2={424} y2={294} stroke="#182126" strokeWidth="8" />
          <line x1={424} y1={294} x2={624} y2={294} stroke="#182126" strokeWidth="8" />
          <line x1={624} y1={294} x2={824} y2={294} stroke="#182126" strokeWidth="8" />
          <line x1={824} y1={294} x2={PAD + MAP_W} y2={294} stroke="#182126" strokeWidth="8" />

          {/* Vertical Interior Walls in North Row */}
          <line x1={424} y1={PAD} x2={424} y2={294} stroke="#182126" strokeWidth="8" />
          <line x1={624} y1={PAD} x2={624} y2={294} stroke="#182126" strokeWidth="8" />
          <line x1={824} y1={PAD} x2={824} y2={294} stroke="#182126" strokeWidth="8" />
          <line x1={1024} y1={PAD} x2={1024} y2={294} stroke="#182126" strokeWidth="8" />
          <line x1={1024} y1={160} x2={PAD + MAP_W} y2={160} stroke="#182126" strokeWidth="8" />

          {/* Middle Row Dividers */}
          <line x1={824} y1={316} x2={PAD + MAP_W} y2={316} stroke="#182126" strokeWidth="8" />
          <line x1={824} y1={316} x2={824} y2={592} stroke="#182126" strokeWidth="8" />
          <line x1={824} y1={592} x2={PAD + MAP_W} y2={592} stroke="#182126" strokeWidth="8" />

          {/* South Row Dividers */}
          <line x1={PAD} y1={592} x2={426} y2={592} stroke="#182126" strokeWidth="8" />
          <line x1={278} y1={592} x2={278} y2={PAD + MAP_H} stroke="#182126" strokeWidth="8" />
          <line x1={426} y1={592} x2={426} y2={PAD + MAP_H} stroke="#182126" strokeWidth="8" />

          {/* Entrance Door Opening Gap at South Center */}
          <line x1={545} y1={PAD + MAP_H} x2={655} y2={PAD + MAP_H} stroke="#faf8f2" strokeWidth="18" />

          {/* Elegant Architectural Room Badges */}
          <RoomBadge x={227} y={270} title="CONFERENCE" subtitle="Client & Team Meetings (14' x 10')" />
          <RoomBadge x={524} y={270} title="FOUNDER CABIN" subtitle="Private Office (10' x 12')" />
          <RoomBadge x={724} y={270} title="MANAGER CABIN" subtitle="Workspace (10' x 12')" />
          <RoomBadge x={920} y={270} title="PANTRY" subtitle="Coffee & Breaks (8' x 10')" />
          <RoomBadge x={1094} y={275} title="WASHROOMS" subtitle="Separate Facilities (6' x 7')" />

          <RoomBadge x={195} y={560} title="COLLABORATION" subtitle="Brainstorming (12' x 10')" />
          <RoomBadge x={603} y={568} title="WORKSTATIONS" subtitle="8 Focus Desks (20' x 14')" />
          <RoomBadge x={996} y={566} title="PROJECT ROOM" subtitle="Plan & Launch (10' x 12')" />

          <RoomBadge x={157} y={845} title="SERVER / IT" subtitle="Infrastructure (8' x 8')" />
          <RoomBadge x={354} y={845} title="STORAGE" subtitle="Supplies & Utility (8' x 8')" />
          <RoomBadge x={600} y={830} title="RECEPTION" subtitle="Visitor Check-In (12' x 8')" />
          <RoomBadge x={970} y={845} title="WAITING AREA" subtitle="Guest Seating (12' x 10')" />

          {/* Interactive Zone Pulsing Rings */}
          {INTERACTION_ZONES.map((zone) => {
            const isNear = Math.hypot(zone.x - player.x, zone.z - player.z) <= zone.radius;
            return (
              <g key={zone.id}>
                <circle
                  cx={mapX(zone.x)}
                  cy={mapY(zone.z)}
                  r={zone.radius * 34}
                  fill="none"
                  stroke={isNear ? "#c8f560" : "#a8d46a"}
                  strokeWidth={isNear ? 3.5 : 2}
                  strokeDasharray="6 6"
                  opacity={isNear ? 0.95 : 0.28}
                />
                {isNear && (
                  <circle
                    cx={mapX(zone.x)}
                    cy={mapY(zone.z)}
                    r={zone.radius * 34}
                    fill="#c8f560"
                    fillOpacity=".08"
                  />
                )}
              </g>
            );
          })}

          {/* Click-to-Move Target Indicator */}
          {clickTarget && (
            <g transform={`translate(${mapX(clickTarget.x)} ${mapY(clickTarget.z)})`} className="office-map-target">
              <circle r="18" fill="none" stroke="#c8f560" strokeWidth="4.5" />
              <circle r="5" fill="#143625" />
            </g>
          )}

          {/* Remote Players */}
          {Object.values(remotePlayers).map((remote) => (
            <GatherAvatar key={remote.id} player={remote} />
          ))}

          {/* Local Player */}
          <GatherAvatar player={player} local isCaffeinated={isCaffeinated} />
        </svg>
      </div>

      {/* Bottom Room Jump Destinations Bar */}
      <nav className="office-room-jump" aria-label="Office destinations">
        {OFFICE_ROOMS.filter((item) => !["washrooms", "storage-utility"].includes(item.id)).map((item) => (
          <button
            key={item.id}
            onClick={() => {
              playSlideClick();
              useOfficeStore.getState().setClickTarget(item.destination);
            }}
            aria-current={room?.id === item.id ? "location" : undefined}
          >
            {item.shortName}
          </button>
        ))}
      </nav>
    </section>
  );
}
