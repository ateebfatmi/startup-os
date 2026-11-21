"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { INTERACTION_ZONES, OFFICE_ROOMS, getOfficeRoomAt } from "./office-data";
import { OFFICE_BOUNDS, resolveMovement } from "./collision";
import { useOfficeStore } from "./store";
import { AI_TEAMMATES } from "./ai-teammates";
import { hasSupabaseConfig } from "@/lib/supabase/client";
import { playChime, playCoffeeSound, playSlideClick } from "./audio";
import type { PlayerSnapshot } from "./types";

const VIEW_W = 1200;
const VIEW_H = 900;
const PAD = 28;
const MAP_W = VIEW_W - PAD * 2; // 1144
const MAP_H = VIEW_H - PAD * 2; // 844

function mapX(x: number) {
  return PAD + ((x - OFFICE_BOUNDS.minX) / (OFFICE_BOUNDS.maxX - OFFICE_BOUNDS.minX)) * MAP_W;
}

function mapY(z: number) {
  return PAD + ((z - OFFICE_BOUNDS.minZ) / (OFFICE_BOUNDS.maxZ - OFFICE_BOUNDS.minZ)) * MAP_H;
}

function worldX(x: number) {
  return OFFICE_BOUNDS.minX + ((x - PAD) / MAP_W) * (OFFICE_BOUNDS.maxX - OFFICE_BOUNDS.minX);
}

function worldZ(y: number) {
  return OFFICE_BOUNDS.minZ + ((y - PAD) / MAP_H) * (OFFICE_BOUNDS.maxZ - OFFICE_BOUNDS.minZ);
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
        state.setPlayerTransform(next.x, next.z, Math.atan2(dx, dz));
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

function Chair({ x, y, rotate = 0, color = "#26483b" }: { x: number | string; y: number | string; rotate?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <ellipse cy="2" rx="14" ry="12" fill="#131e19" opacity=".18" />
      <rect x="-13" y="-12" width="26" height="24" rx="8" fill={color} stroke="#17241e" strokeWidth="2.5" />
      <path d="M-11 3h22v9h-22z" rx="4.5" fill="#182d24" />
      <path d="M-12 -6q12 -4 24 0" stroke="#487561" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".8" />
      <rect x="-14" y="-3" width="3" height="12" rx="1.5" fill="#16221c" />
      <rect x="11" y="-3" width="3" height="12" rx="1.5" fill="#16221c" />
    </g>
  );
}

function Armchair({ x, y, rotate = 0, color = "#3d6451" }: { x: number | string; y: number | string; rotate?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
      <ellipse cy="4" rx="20" ry="16" fill="#131e19" opacity=".2" />
      <rect x="-18" y="-18" width="36" height="36" rx="10" fill={color} stroke="#192a22" strokeWidth="3" />
      <rect x="-13" y="-10" width="26" height="24" rx="7" fill="#4d7c65" stroke="#1d3529" strokeWidth="1.5" />
      <rect x="-17" y="-15" width="34" height="9" rx="4.5" fill="#2d4a3c" />
      <rect x="-19" y="-8" width="5.5" height="24" rx="2.5" fill="#2d4a3c" />
      <rect x="13.5" y="-8" width="5.5" height="24" rx="2.5" fill="#2d4a3c" />
    </g>
  );
}

function Plant({ x, y, scale = 1 }: { x: number | string; y: number | string; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cy="14" rx="16" ry="9" fill="#131e19" opacity=".25" />
      <circle r="15" fill="#c48a58" stroke="#7a4f2c" strokeWidth="3" />
      <circle r="12" fill="#5c381e" />
      {/* Lush Gather.town leafy foliage */}
      <path d="M0 -3 C-7 -18 -24 -16 -20 -3 C-18 6 -6 4 0 -3 Z" fill="#3f7547" stroke="#234a2a" strokeWidth="1.5" />
      <path d="M0 -3 C7 -18 24 -16 20 -3 C18 6 6 4 0 -3 Z" fill="#4e8c58" stroke="#234a2a" strokeWidth="1.5" />
      <path d="M0 -3 C-16 -7 -25 10 -12 18 C-4 16 0 5 0 -3 Z" fill="#396b3f" stroke="#234a2a" strokeWidth="1.5" />
      <path d="M0 -3 C16 -7 25 10 12 18 C4 16 0 5 0 -3 Z" fill="#46804f" stroke="#234a2a" strokeWidth="1.5" />
      <path d="M0 -3 C-4 -25 4 -25 0 -3 Z" fill="#589e64" stroke="#2a5832" strokeWidth="1.5" />
      <circle r="4" fill="#6cb87a" />
    </g>
  );
}

function Window({ x, y, w, h, vertical = false }: { x: number | string; y: number | string; w: number | string; h: number | string; vertical?: boolean }) {
  const numX = Number(x);
  const numY = Number(y);
  const numW = Number(w);
  const numH = Number(h);
  return (
    <g className="pointer-events-none">
      <rect x={numX} y={numY} width={numW} height={numH} fill="#edf7fc" stroke="#68a9cc" strokeWidth="2.5" />
      {vertical ? (
        <>
          <line x1={numX + numW / 2} y1={numY} x2={numX + numW / 2} y2={numY + numH} stroke="#388ebd" strokeWidth="2" />
          <line x1={numX} y1={numY + numH / 2} x2={numX + numW} y2={numY + numH / 2} stroke="#388ebd" strokeWidth="2" />
        </>
      ) : (
        <>
          <line x1={numX} y1={numY + numH / 2} x2={numX + numW} y2={numY + numH / 2} stroke="#388ebd" strokeWidth="2" />
          <line x1={numX + numW / 2} y1={numY} x2={numX + numW / 2} y2={numY + numH} stroke="#388ebd" strokeWidth="2" />
        </>
      )}
    </g>
  );
}

function DoorSwing({ x, y, radius = 42, startAngle = 0, sweepAngle = 90 }: { x: number | string; y: number | string; radius?: number; startAngle?: number; sweepAngle?: number }) {
  const numX = Number(x);
  const numY = Number(y);
  const rad1 = (startAngle * Math.PI) / 180;
  const rad2 = ((startAngle + sweepAngle) * Math.PI) / 180;
  const x1 = numX + Math.cos(rad1) * radius;
  const y1 = numY + Math.sin(rad1) * radius;
  const x2 = numX + Math.cos(rad2) * radius;
  const y2 = numY + Math.sin(rad2) * radius;
  return (
    <g className="pointer-events-none opacity-45">
      <line x1={numX} y1={numY} x2={x1} y2={y1} stroke="#3e5a4d" strokeWidth="2.5" />
      <path d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`} fill="none" stroke="#3e5a4d" strokeWidth="1.5" strokeDasharray="4 3" />
    </g>
  );
}

function RoomLabel({ x, y, title, detail }: { x: number | string; y: number | string; title: string; detail: string }) {
  const numX = Number(x);
  const numY = Number(y);
  return (
    <g className="pointer-events-none">
      <rect x={numX - 84} y={numY - 17} width="168" height="34" rx="10" fill="#fffdf7" opacity=".92" stroke="#162b23" strokeWidth="1.5" filter="url(#badgeShadow)" />
      <text x={numX} y={numY - 2} textAnchor="middle" className="fill-[#142d22] text-[12px] font-black tracking-[.04em]">{title}</text>
      <text x={numX} y={numY + 11} textAnchor="middle" className="fill-[#536b5f] text-[8.5px] font-bold">{detail}</text>
    </g>
  );
}

function Avatar({ player, local = false, isCaffeinated = false }: { player: PlayerSnapshot; local?: boolean; isCaffeinated?: boolean }) {
  const x = mapX(player.x);
  const y = mapY(player.z);
  const initials = player.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "YOU";
  const rotDeg = ((player.rotation || 0) * 180) / Math.PI;

  return (
    <g transform={`translate(${x} ${y})`} className="pointer-events-none" filter="url(#avatarShadow)">
      {/* Audio Proximity Range Ring (Gather.town 3m voice huddle radius) */}
      {local && (
        <g>
          <circle r="92" fill="#c8f560" fillOpacity=".07" stroke="#c8f560" strokeWidth="1.8" strokeDasharray="6 6" />
          <circle r="90" fill="none" stroke="#234a36" strokeWidth="0.8" opacity=".35" />
        </g>
      )}

      {/* Avatar shadow */}
      <ellipse cy="19" rx="19" ry="8.5" fill="#12241b" opacity=".35" />

      {/* Heading Pointer Arrow */}
      <g transform={`rotate(${rotDeg})`}>
        <polygon points="0,-29 -6,-20 6,-20" fill={local ? "#c8f560" : "#ffffff"} stroke="#173f2b" strokeWidth="1.5" />
      </g>

      {/* Outer base badge circle */}
      <circle r={local ? 23 : 21} fill="#fffdf7" stroke={local ? "#c8f560" : "#ffffff"} strokeWidth={local ? 5.5 : 3.5} />
      {/* Avatar body color fill */}
      <circle r="17.5" fill={player.color} />

      {/* Top-down humanoid avatar head & shoulders */}
      <ellipse cy="-1" rx="8" ry="7" fill="#f7d3ba" />
      {/* Hair */}
      <path d="M-8 -3 Q0 -10 8 -3 Q6 -8 -6 -8 Z" fill="#2d1f18" />

      {/* Availability Status Indicator Dot */}
      <circle cx="16" cy="15" r="6" fill="#3bb76f" stroke="#fffdf7" strokeWidth="2.5" />

      {/* Floating Name Badge */}
      <g transform="translate(0 -38)">
        <rect x="-42" y="-12" width="84" height="24" rx="9" fill={local ? "#163826" : "#ffffff"} stroke={local ? "#c8f560" : "#163826"} strokeWidth="1.5" />
        <text y="4" textAnchor="middle" className={`${local ? "fill-[#c8f560]" : "fill-[#142d22]"} text-[9.5px] font-black`}>
          {local ? (isCaffeinated ? "You ☕" : "You") : player.name.slice(0, 14)}
        </text>
      </g>
    </g>
  );
}

function ArchitecturalFloorPlanFurnishings() {
  return (
    <>
      {/* ========================================================
          1. MEETING / CONFERENCE ROOM (14' x 10') - TOP LEFT
          ======================================================== */}
      <g id="conference-room-furniture" aria-label="Meeting and conference room furniture">
        {/* Conference Room Rug Inlay */}
        <rect x="36" y="36" width="382" height="258" rx="8" fill="#e7eee9" stroke="#b4cab9" strokeWidth="2.5" />
        {/* Large Wooden Conference Table */}
        <rect x="110" y="98" width="235" height="116" rx="16" fill="#8f5739" stroke="#482b1c" strokeWidth="4.5" />
        <rect x="122" y="110" width="211" height="92" rx="10" fill="#a86a46" />
        {/* Table Bevel & Center Speakerphone Puck */}
        <rect x="135" y="122" width="185" height="68" rx="6" fill="#995f3e" stroke="#cfa17b" strokeWidth="1.5" />
        <circle cx="227" cy="156" r="14" fill="#203038" stroke="#0f191d" strokeWidth="2" />
        <circle cx="227" cy="156" r="5" fill="#48b0a9" />
        {/* 10 Conference Chairs (4 Top, 4 Bottom, 1 Left, 1 Right) */}
        {[135, 195, 255, 315].map((x) => (
          <Chair key={`top-${x}`} x={x} y={74} rotate={0} />
        ))}
        {[135, 195, 255, 315].map((x) => (
          <Chair key={`bot-${x}`} x={x} y={238} rotate={180} />
        ))}
        <Chair x={84} y={156} rotate={-90} />
        <Chair x={370} y={156} rotate={90} />
        {/* Presentation TV Display on Left (West) Wall */}
        <rect x="30" y="105" width="14" height="102" rx="3.5" fill="#132025" stroke="#0a1215" strokeWidth="2" />
        <rect x="34" y="112" width="6" height="88" rx="1.5" fill="#3bb4d8" />
        {/* Corner Plant */}
        <Plant x="65" y="65" scale={1.15} />
      </g>

      {/* ========================================================
          2. DIRECTOR / FOUNDER CABIN (10' x 12') - TOP CENTER-LEFT
          ======================================================== */}
      <g id="founder-cabin-furniture" aria-label="Director and founder cabin furniture">
        {/* Executive Hardwood Inlay */}
        <rect x="424" y="36" width="194" height="258" rx="8" fill="#f2e8dc" stroke="#d5beaa" strokeWidth="2" />
        {/* Executive Director Desk */}
        <rect x="462" y="120" width="128" height="58" rx="7" fill="#694027" stroke="#3d2315" strokeWidth="4" />
        <rect x="472" y="128" width="108" height="42" rx="4" fill="#7d4f33" />
        {/* Leather Writing Blotter & Laptop */}
        <rect x="498" y="132" width="56" height="34" rx="3" fill="#1d2224" />
        <rect x="510" y="137" width="32" height="22" rx="2" fill="#c3c8cc" stroke="#757c80" strokeWidth="1" />
        <rect x="514" y="140" width="24" height="14" rx="1" fill="#3ea88b" />
        {/* High-back Executive Chair */}
        <Chair x="526" y="86" rotate={0} color="#1b3d30" />
        {/* 2 Visitor Chairs in front of desk */}
        <Chair x="492" y="212" rotate={180} color="#355848" />
        <Chair x="560" y="212" rotate={180} color="#355848" />
        {/* Executive Credenza / Shelf along North Wall */}
        <rect x="460" y="42" width="132" height="22" rx="4" fill="#52311d" stroke="#2d1a0e" strokeWidth="2" />
        <circle cx="565" cy="53" r="6" fill="#f59e0b" />
        <rect x="475" y="46" width="40" height="14" rx="2" fill="#8c3826" />
        {/* Corner Plant */}
        <Plant x="450" y="60" scale={0.95} />
      </g>

      {/* ========================================================
          3. MANAGER CABIN (10' x 12') - TOP CENTER-RIGHT
          ======================================================== */}
      <g id="manager-cabin-furniture" aria-label="Manager cabin furniture">
        {/* Modern Slate Rug */}
        <rect x="624" y="36" width="194" height="258" rx="8" fill="#e7edf2" stroke="#b9c9d6" strokeWidth="2" />
        {/* Manager Desk */}
        <rect x="662" y="120" width="124" height="56" rx="7" fill="#754b32" stroke="#432919" strokeWidth="4" />
        <rect x="672" y="128" width="104" height="40" rx="4" fill="#8d5d40" />
        {/* Dual Workstation Monitors */}
        <rect x="696" y="124" width="56" height="8" rx="2" fill="#18252a" />
        <line x1="724" y1="124" x2="724" y2="132" stroke="#c0c6c8" strokeWidth="3" />
        <rect x="702" y="140" width="44" height="16" rx="2" fill="#1d2224" />
        {/* Manager Task Chair */}
        <Chair x="724" y="86" rotate={0} color="#214235" />
        {/* 2 Visitor Chairs in front of desk */}
        <Chair x="692" y="210" rotate={180} color="#3a5d4c" />
        <Chair x="756" y="210" rotate={180} color="#3a5d4c" />
        {/* North Wall Credenza */}
        <rect x="660" y="42" width="128" height="22" rx="4" fill="#4d2f1d" stroke="#2a180d" strokeWidth="2" />
        {/* Corner Plant */}
        <Plant x="795" y="60" scale={0.95} />
      </g>

      {/* ========================================================
          4. PANTRY / BREAK AREA (8' x 10') - TOP RIGHT-MIDDLE
          ======================================================== */}
      <g id="pantry-furniture" aria-label="Pantry and break area furniture">
        {/* Checkered Dining Tile Floor */}
        <rect x="824" y="36" width="194" height="258" rx="8" fill="#f5ede3" stroke="#d5c6b4" strokeWidth="2" />
        {/* Kitchen Counter along North Wall */}
        <rect x="834" y="38" width="174" height="44" rx="5" fill="#f0ebe1" stroke="#5f432f" strokeWidth="3.5" />
        {/* Stainless Steel Sink with Faucet */}
        <rect x="856" y="46" width="36" height="26" rx="4" fill="#b9c9c6" stroke="#687d79" strokeWidth="2" />
        <circle cx="874" cy="59" r="4.5" fill="#4d615d" />
        <line x1="874" y1="42" x2="874" y2="52" stroke="#8fa6a2" strokeWidth="3" strokeLinecap="round" />
        {/* Stove / Hotplate / Microwave */}
        <rect x="942" y="46" width="42" height="28" rx="3" fill="#202c30" stroke="#485c64" strokeWidth="1.5" />
        <circle cx="953" cy="60" r="5" fill="#e05338" />
        <circle cx="972" cy="60" r="5" fill="#e05338" />
        {/* Round Dining Table in Center */}
        <ellipse cy="192" cx="920" rx="46" ry="46" fill="#14211a" opacity=".18" />
        <circle cx="920" cy="188" r="44" fill="#a46944" stroke="#5c3822" strokeWidth="4" />
        <circle cx="920" cy="188" r="38" fill="#bc8058" />
        {/* 4 Cafe Chairs around table */}
        <Chair x={920} y={128} rotate={0} color="#38634f" />
        <Chair x={920} y={248} rotate={180} color="#38634f" />
        <Chair x={860} y={188} rotate={-90} color="#38634f" />
        <Chair x={980} y={188} rotate={90} color="#38634f" />
      </g>

      {/* ========================================================
          5. 2 WASHROOMS (6' x 7' each) - TOP RIGHT
          ======================================================== */}
      <g id="washrooms-fixtures" aria-label="Washroom facilities and fixtures">
        {/* Washroom 1 (Top) */}
        <rect x="1024" y="36" width="144" height="124" rx="6" fill="#e2ebec" stroke="#9ab0b3" strokeWidth="2" />
        {/* Toilet Commode 1 */}
        <rect x="1120" y="52" width="24" height="12" rx="3" fill="#ffffff" stroke="#7e9699" strokeWidth="2" />
        <ellipse cx="1132" cy="74" rx="11" ry="15" fill="#ffffff" stroke="#7e9699" strokeWidth="2" />
        {/* Vanity Sink 1 */}
        <rect x="1120" y="112" width="28" height="24" rx="5" fill="#ffffff" stroke="#7e9699" strokeWidth="2" />
        <ellipse cx="1134" cy="124" rx="7" ry="6" fill="#9dbec2" />
        {/* Door 1 Opening & Arc */}
        <DoorSwing x={1024} y={130} radius={32} startAngle={-90} sweepAngle={90} />

        {/* Washroom 2 (Bottom) */}
        <rect x="1024" y="164" width="144" height="134" rx="6" fill="#e2ebec" stroke="#9ab0b3" strokeWidth="2" />
        {/* Toilet Commode 2 */}
        <rect x="1120" y="180" width="24" height="12" rx="3" fill="#ffffff" stroke="#7e9699" strokeWidth="2" />
        <ellipse cx="1132" cy="202" rx="11" ry="15" fill="#ffffff" stroke="#7e9699" strokeWidth="2" />
        {/* Vanity Sink 2 */}
        <rect x="1120" y="244" width="28" height="24" rx="5" fill="#ffffff" stroke="#7e9699" strokeWidth="2" />
        <ellipse cx="1134" cy="256" rx="7" ry="6" fill="#9dbec2" />
        {/* Door 2 Opening & Arc */}
        <DoorSwing x={1024} y={265} radius={32} startAngle={-90} sweepAngle={90} />
      </g>

      {/* ========================================================
          6. COLLABORATION / DISCUSSION AREA (12' x 10') - MIDDLE LEFT
          ======================================================== */}
      <g id="collaboration-furniture" aria-label="Collaboration and discussion area furniture">
        {/* Conversation Area Rug */}
        <ellipse cx="195" cy="450" rx="118" ry="118" fill="#f7f0e4" stroke="#d8c5ab" strokeWidth="2.5" />
        {/* Round Solid Oak Coffee Table */}
        <ellipse cy="454" cx="195" rx="42" ry="42" fill="#14211a" opacity=".18" />
        <circle cx="195" cy="450" r="40" fill="#a66e47" stroke="#5c3822" strokeWidth="4" />
        <circle cx="195" cy="450" r="34" fill="#c0865c" />
        <circle cx="185" cy="442" r="4" fill="#ffffff" stroke="#355c48" strokeWidth="1.5" />
        <circle cx="206" cy="455" r="4" fill="#ffffff" stroke="#355c48" strokeWidth="1.5" />
        {/* 4 Angled Armchairs around Coffee Table */}
        <Armchair x={135} y={390} rotate={-45} />
        <Armchair x={255} y={390} rotate={45} />
        <Armchair x={135} y={510} rotate={-135} />
        <Armchair x={255} y={510} rotate={135} />
        {/* Corner Plants */}
        <Plant x="65" y="340" scale={1.05} />
        <Plant x="65" y="560" scale={1.05} />
        <Plant x="350" y="560" scale={1.0} />
        {/* Glass Partition Divider on Right */}
        <rect x="370" y="340" width="8" height="190" rx="4" fill="#d2ede7" stroke="#3a685c" strokeWidth="2" />
        {[360, 410, 460, 510].map((y) => (
          <circle key={`glass-${y}`} cx={374} cy={y} r="3.5" fill="#1c3d34" />
        ))}
      </g>

      {/* ========================================================
          7. WORKSTATIONS (20' x 14') - CENTER (8 DESKS)
          ======================================================== */}
      <g id="workstations-furniture" aria-label="Center workstations furniture">
        {/* Workstations Rug Inlay */}
        <rect x="396" y="322" width="414" height="268" rx="10" fill="#f4efe6" stroke="#cfc0ad" strokeWidth="2.5" />

        {/* Central Acoustic Privacy Divider between Desk Rows */}
        <rect x="412" y="447" width="382" height="8" rx="4" fill="#355e4b" stroke="#1d382c" strokeWidth="2" />

        {/* NORTH DESK ROW (4 Workstations facing South) */}
        {[426, 520, 614, 708].map((x, idx) => (
          <g key={`north-desk-${idx}`}>
            {/* Desktop */}
            <rect x={x} y="394" width="86" height="50" rx="6" fill="#a46d47" stroke="#52331f" strokeWidth="3" />
            <rect x={x + 6} y="400" width="74" height="38" rx="4" fill="#b9825b" />
            {/* Widescreen Monitor */}
            <rect x={x + 18} y="434" width="50" height="7" rx="2" fill="#19282f" />
            <rect x={x + 22} y="435" width="42" height="4" rx="1" fill="#4fc3f7" opacity=".8" />
            {/* Keyboard & Mousepad */}
            <rect x={x + 24} y="408" width="38" height="15" rx="2" fill="#20272b" />
            <rect x={x + 67} y="411" width="10" height="11" rx="2" fill="#323c42" />
            {/* Ergonomic Swivel Chair (Facing South) */}
            <Chair x={x + 43} y={356} rotate={0} color="#294e3e" />
          </g>
        ))}

        {/* SOUTH DESK ROW (4 Workstations facing North) */}
        {[426, 520, 614, 708].map((x, idx) => (
          <g key={`south-desk-${idx}`}>
            {/* Desktop */}
            <rect x={x} y="458" width="86" height="50" rx="6" fill="#a46d47" stroke="#52331f" strokeWidth="3" />
            <rect x={x + 6} y="464" width="74" height="38" rx="4" fill="#b9825b" />
            {/* Widescreen Monitor */}
            <rect x={x + 18} y="462" width="50" height="7" rx="2" fill="#19282f" />
            <rect x={x + 22} y="464" width="42" height="4" rx="1" fill="#4fc3f7" opacity=".8" />
            {/* Keyboard & Mousepad */}
            <rect x={x + 24} y="480" width="38" height="15" rx="2" fill="#20272b" />
            <rect x={x + 67} y="482" width="10" height="11" rx="2" fill="#323c42" />
            {/* Ergonomic Swivel Chair (Facing North) */}
            <Chair x={x + 43} y={548} rotate={180} color="#294e3e" />
          </g>
        ))}
      </g>

      {/* ========================================================
          8. PRODUCT / PROJECT ROOM (10' x 12') - MIDDLE RIGHT
          ======================================================== */}
      <g id="product-room-furniture" aria-label="Product and project room furniture">
        {/* Project Room Carpet */}
        <rect x="824" y="324" width="344" height="268" rx="8" fill="#e8eee9" stroke="#b6cebe" strokeWidth="2.5" />
        {/* Project Conference Table */}
        <rect x="895" y="420" width="202" height="76" rx="12" fill="#8d5638" stroke="#482b1c" strokeWidth="4" />
        <rect x="906" y="430" width="180" height="56" rx="8" fill="#a66c48" />
        {/* 6 Project Chairs (3 Top, 3 Bottom) */}
        {[925, 995, 1065].map((x) => (
          <Chair key={`proj-top-${x}`} x={x} y={386} rotate={0} color="#294a3c" />
        ))}
        {[925, 995, 1065].map((x) => (
          <Chair key={`proj-bot-${x}`} x={x} y={530} rotate={180} color="#294a3c" />
        ))}
        {/* Wall-mounted Whiteboard / Screen on East Wall */}
        <rect x="1156" y="390" width="12" height="135" rx="3" fill="#ffffff" stroke="#253831" strokeWidth="2" />
        {/* Sticky Notes on Whiteboard */}
        <rect x="1158" y="410" width="6" height="10" fill="#facc15" />
        <rect x="1158" y="430" width="6" height="10" fill="#38bdf8" />
        <rect x="1158" y="450" width="6" height="10" fill="#4ade80" />
        {/* Corner Plants */}
        <Plant x="1140" y="348" scale={1.0} />
        <Plant x="1140" y="565" scale={1.0} />
        {/* Door Opening & Swing Arc */}
        <DoorSwing x={824} y={545} radius={38} startAngle={-90} sweepAngle={90} />
      </g>

      {/* ========================================================
          9. SERVER / IT ROOM (8' x 8') - BOTTOM LEFT
          ======================================================== */}
      <g id="server-room-furniture" aria-label="Server and IT infrastructure furniture">
        {/* Technical Raised Grid Floor */}
        <rect x="36" y="608" width="242" height="258" rx="8" fill="#dbe3e8" stroke="#9bb1bd" strokeWidth="2.5" />
        {/* 3 Heavy Server Cabinets along West Wall */}
        <rect x="42" y="628" width="56" height="216" rx="6" fill="#152129" stroke="#081014" strokeWidth="4" />
        {[644, 700, 756, 812].map((y) => (
          <g key={`rack-${y}`}>
            <rect x="48" y={y} width="44" height="42" rx="3.5" fill="#253540" stroke="#0f191f" strokeWidth="1.5" />
            <line x1="52" y1={y + 10} x2="88" y2={y + 10} stroke="#3b5261" strokeWidth="2" />
            <line x1="52" y1={y + 20} x2="88" y2={y + 20} stroke="#3b5261" strokeWidth="2" />
            <line x1="52" y1={y + 30} x2="88" y2={y + 30} stroke="#3b5261" strokeWidth="2" />
            {/* Blinking LEDs */}
            <circle cx="82" cy={y + 8} r="2.5" fill="#4ade80" />
            <circle cx="82" cy={y + 18} r="2.5" fill="#38bdf8" />
            <circle cx="82" cy={y + 28} r="2.5" fill="#f59e0b" />
          </g>
        ))}
        {/* Door Opening & Swing Arc */}
        <DoorSwing x={232} y={608} radius={38} startAngle={90} sweepAngle={90} />
      </g>

      {/* ========================================================
          10. STORAGE / UTILITY ROOM (8' x 8') - BOTTOM CENTER-LEFT
          ======================================================== */}
      <g id="storage-room-furniture" aria-label="Storage and utility furniture">
        {/* Utility Wood Planks Floor */}
        <rect x="282" y="608" width="144" height="258" rx="8" fill="#eddcd0" stroke="#cbb29e" strokeWidth="2.5" />
        {/* Modular Shelving Units along West Wall */}
        <rect x="288" y="628" width="34" height="216" rx="4" fill="#694b36" stroke="#3d2719" strokeWidth="3" />
        {[640, 680, 720, 760, 800].map((y) => (
          <g key={`shelf-box-${y}`}>
            <rect x="292" y={y} width="26" height="32" rx="2" fill="#d2a983" stroke="#875b34" strokeWidth="1.5" />
            <line x1="294" y1={y + 16} x2="316" y2={y + 16} stroke="#684221" strokeWidth="1" />
          </g>
        ))}
        {/* Storage boxes along North Wall */}
        <rect x="330" y="612" width="70" height="24" rx="3" fill="#694b36" stroke="#3d2719" strokeWidth="2" />
        {/* Door Opening & Swing Arc */}
        <DoorSwing x={380} y={608} radius={36} startAngle={90} sweepAngle={90} />
      </g>

      {/* ========================================================
          11. RECEPTION (12' x 8') - BOTTOM CENTER
          ======================================================== */}
      <g id="reception-furniture" aria-label="Reception desk and entrance furniture">
        {/* Lobby Travertine Floor Inlay */}
        <rect x="430" y="608" width="340" height="258" rx="8" fill="#f8f4ed" stroke="#dcd3c1" strokeWidth="2" />

        {/* Beautiful Modern Curved Reception Counter */}
        {/* Counter Shadow */}
        <path d="M 470 710 Q 600 684 730 710 L 730 748 Q 600 722 470 748 Z" fill="#132119" opacity=".2" />
        {/* White Composite Counter Front */}
        <path d="M 470 706 Q 600 680 730 706 L 730 742 Q 600 716 470 742 Z" fill="#ffffff" stroke="#253a30" strokeWidth="4" />
        {/* Warm Oak Top Cap */}
        <path d="M 480 702 Q 600 676 720 702 L 720 724 Q 600 698 480 724 Z" fill="#a46c46" stroke="#5a3821" strokeWidth="2.5" />
        {/* Receptionist Computer Terminal */}
        <rect x="585" y="700" width="30" height="12" rx="2" fill="#19282f" />
        <rect x="588" y="701" width="24" height="6" rx="1" fill="#4fc3f7" opacity=".8" />

        {/* Receptionist Chair (Facing South) */}
        <Chair x={600} y={660} rotate={0} color="#204434" />

        {/* Potted Ficus Trees flanking the desk */}
        <Plant x={450} y={725} scale={1.15} />
        <Plant x={750} y={725} scale={1.15} />

        {/* Entrance Welcome Mat at South Double Doors */}
        <rect x="550" y="842" width="100" height="24" rx="4" fill="#202a24" stroke="#101814" strokeWidth="2" />
        <text x="600" y="857" textAnchor="middle" className="fill-[#c8f560] text-[9px] font-black tracking-[.1em]">WELCOME</text>

        {/* Exterior Entrance Steps / Threshold */}
        <rect x="530" y="872" width="140" height="24" rx="4" fill="#c7c3b9" stroke="#54514a" strokeWidth="2" />
        <rect x="546" y="878" width="108" height="12" rx="2" fill="#32302b" />
      </g>

      {/* ========================================================
          12. WAITING AREA (12' x 10') - BOTTOM RIGHT
          ======================================================== */}
      <g id="waiting-area-furniture" aria-label="Waiting area lounge furniture">
        {/* Warm Taupe Carpet */}
        <rect x="774" y="608" width="394" height="258" rx="8" fill="#f3eae0" stroke="#cdbaa8" strokeWidth="2.5" />

        {/* 3-Seater Sofa along North Wall */}
        <g id="waiting-sofa-top">
          <ellipse cy="668" cx="935" rx="96" ry="24" fill="#132119" opacity=".2" />
          <rect x="840" y="650" width="190" height="48" rx="12" fill="#3a5849" stroke="#1d3228" strokeWidth="4" />
          {/* Backrest Cushion */}
          <rect x="846" y="654" width="178" height="14" rx="6" fill="#284235" />
          {/* 3 Seat Cushions */}
          {[850, 908, 966].map((x) => (
            <rect key={`sofa-seat-${x}`} x={x} y="670" width="54" height="24" rx="6" fill="#4d7260" stroke="#253e31" strokeWidth="1.5" />
          ))}
          {/* Armrests */}
          <rect x="836" y="656" width="12" height="38" rx="5" fill="#284235" />
          <rect x="1022" y="656" width="12" height="38" rx="5" fill="#284235" />
        </g>

        {/* 2-Seater Sofa along South Wall */}
        <g id="waiting-sofa-bottom">
          <ellipse cy="828" cx="935" rx="76" ry="20" fill="#132119" opacity=".2" />
          <rect x="860" y="812" width="150" height="44" rx="10" fill="#3a5849" stroke="#1d3228" strokeWidth="3.5" />
          <rect x="866" y="838" width="138" height="12" rx="5" fill="#284235" />
          {[870, 938].map((x) => (
            <rect key={`sofa2-seat-${x}`} x={x} y="816" width="62" height="20" rx="5" fill="#4d7260" stroke="#253e31" strokeWidth="1.5" />
          ))}
          <rect x="856" y="816" width="10" height="34" rx="4" fill="#284235" />
          <rect x="1004" y="816" width="10" height="34" rx="4" fill="#284235" />
        </g>

        {/* Round Solid Oak Coffee Table in Center */}
        <ellipse cy="754" cx="935" rx="38" ry="38" fill="#14211a" opacity=".18" />
        <circle cx="935" cy="750" r="36" fill="#a46c46" stroke="#5a3821" strokeWidth="4" />
        <circle cx="935" cy="750" r="30" fill="#be845c" />
        <rect x="922" y="742" width="26" height="16" rx="2" fill="#fffdf7" stroke="#754b2b" strokeWidth="1" />

        {/* 2 Armchairs on Left and Right of Coffee Table */}
        <Armchair x={845} y={750} rotate={-90} />
        <Armchair x={1025} y={750} rotate={90} />

        {/* Glass Partition Divider on Left */}
        <rect x="772" y="650" width="7" height="190" rx="3.5" fill="#d2ede7" stroke="#3a685c" strokeWidth="2" />

        {/* Corner Plants */}
        <Plant x="1140" y="650" scale={1.05} />
        <Plant x="1140" y="825" scale={1.05} />
        <Plant x="745" y="825" scale={1.05} />
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

      {/* Context pill at top-left */}
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
            {/* Tile pattern for hallways & circulation */}
            <pattern id="archGrid" width="48" height="48" patternUnits="userSpaceOnUse">
              <rect width="48" height="48" fill="#fcfbf7" />
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#ebe6d9" strokeWidth="1.2" />
            </pattern>
            <filter id="blueprintShadow" x="-5%" y="-5%" width="110%" height="110%">
              <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#09140e" floodOpacity=".32" />
            </filter>
            <filter id="avatarShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#09140e" floodOpacity=".38" />
            </filter>
            <filter id="badgeShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0c1d15" floodOpacity=".18" />
            </filter>
          </defs>

          {/* Exterior Architectural Drafting Backdrop */}
          <rect width={VIEW_W} height={VIEW_H} rx="24" fill="#18251e" />

          {/* Foundation Concrete Border (40ft x 30ft Architectural Blueprint) */}
          <rect
            x={PAD - 8}
            y={PAD - 8}
            width={MAP_W + 16}
            height={MAP_H + 16}
            rx="12"
            fill="#d9d4c7"
            stroke="#111c16"
            strokeWidth="4"
            filter="url(#blueprintShadow)"
          />

          {/* Main Floor Surface with Architectural Porcelain Tiles */}
          <rect x={PAD} y={PAD} width={MAP_W} height={MAP_H} rx="8" fill="url(#archGrid)" />

          {/* Architectural Wall Outlines & Partitions Background */}
          {rooms.map((item) => (
            <rect
              key={item.id}
              x={item.x}
              y={item.y}
              width={item.w}
              height={item.h}
              fill={item.color}
              opacity=".12"
              stroke="#22312a"
              strokeWidth="5"
            />
          ))}

          {/* Doorway openings on interior walls */}
          {/* Conference Room Door Arc */}
          <DoorSwing x={424} y={245} radius={44} startAngle={90} sweepAngle={90} />
          {/* Founder Cabin Door Arc */}
          <DoorSwing x={426} y={245} radius={40} startAngle={0} sweepAngle={90} />
          {/* Manager Cabin Door Arc */}
          <DoorSwing x={824} y={245} radius={40} startAngle={90} sweepAngle={90} />

          {/* 12 Detailed Architectural Furnishings */}
          <ArchitecturalFloorPlanFurnishings />

          {/* Exterior Inset Glass Windows (Cyan Double-lines matching blueprint) */}
          {/* North Windows */}
          <Window x={130} y={PAD - 6} w={190} h={12} />
          <Window x={470} y={PAD - 6} w={105} h={12} />
          <Window x={670} y={PAD - 6} w={105} h={12} />
          <Window x={870} y={PAD - 6} w={105} h={12} />
          {/* West Windows */}
          <Window x={PAD - 6} y={110} w={12} h={110} vertical />
          <Window x={PAD - 6} y={390} w={12} h={110} vertical />
          <Window x={PAD - 6} y={670} w={12} h={110} vertical />
          {/* East Windows */}
          <Window x={PAD + MAP_W - 6} y={60} w={12} h={70} vertical />
          <Window x={PAD + MAP_W - 6} y={190} w={12} h={70} vertical />
          <Window x={PAD + MAP_W - 6} y={400} w={12} h={110} vertical />
          {/* South Windows */}
          <Window x={90} y={PAD + MAP_H - 6} w={130} h={12} />
          <Window x={850} y={PAD + MAP_H - 6} w={170} h={12} />

          {/* Exterior Perimeter Walls (Heavy architectural black walls) */}
          <rect
            x={PAD}
            y={PAD}
            width={MAP_W}
            height={MAP_H}
            rx="6"
            fill="none"
            stroke="#151b1f"
            strokeWidth="14"
            className="pointer-events-none"
          />

          {/* North Row Interior Divider Walls */}
          <line x1={PAD} y1={294} x2={424} y2={294} stroke="#1b2328" strokeWidth="8" />
          <line x1={424} y1={294} x2={624} y2={294} stroke="#1b2328" strokeWidth="8" />
          <line x1={624} y1={294} x2={824} y2={294} stroke="#1b2328" strokeWidth="8" />
          <line x1={824} y1={294} x2={PAD + MAP_W} y2={294} stroke="#1b2328" strokeWidth="8" />

          {/* Vertical Dividers in North Row */}
          <line x1={424} y1={PAD} x2={424} y2={294} stroke="#1b2328" strokeWidth="8" />
          <line x1={624} y1={PAD} x2={624} y2={294} stroke="#1b2328" strokeWidth="8" />
          <line x1={824} y1={PAD} x2={824} y2={294} stroke="#1b2328" strokeWidth="8" />
          <line x1={1024} y1={PAD} x2={1024} y2={294} stroke="#1b2328" strokeWidth="8" />
          <line x1={1024} y1={160} x2={PAD + MAP_W} y2={160} stroke="#1b2328" strokeWidth="8" />

          {/* Middle Row Dividers */}
          <line x1={824} y1={316} x2={PAD + MAP_W} y2={316} stroke="#1b2328" strokeWidth="8" />
          <line x1={824} y1={316} x2={824} y2={592} stroke="#1b2328" strokeWidth="8" />
          <line x1={824} y1={592} x2={PAD + MAP_W} y2={592} stroke="#1b2328" strokeWidth="8" />

          {/* South Row Dividers */}
          <line x1={PAD} y1={592} x2={426} y2={592} stroke="#1b2328" strokeWidth="8" />
          <line x1={278} y1={592} x2={278} y2={PAD + MAP_H} stroke="#1b2328" strokeWidth="8" />
          <line x1={426} y1={592} x2={426} y2={PAD + MAP_H} stroke="#1b2328" strokeWidth="8" />

          {/* Entrance Door Opening Gap at South Center */}
          <line x1={545} y1={PAD + MAP_H} x2={655} y2={PAD + MAP_H} stroke="#fcfbf7" strokeWidth="18" />

          {/* Elegant Architectural Room Badges */}
          <RoomLabel x={227} y={270} title="CONFERENCE" detail="Client & Team Meetings (14' x 10')" />
          <RoomLabel x={524} y={270} title="FOUNDER CABIN" detail="Private Office (10' x 12')" />
          <RoomLabel x={724} y={270} title="MANAGER CABIN" detail="Workspace (10' x 12')" />
          <RoomLabel x={920} y={270} title="PANTRY" detail="Coffee & Breaks (8' x 10')" />
          <RoomLabel x={1094} y={275} title="WASHROOMS" detail="Separate Facilities (6' x 7')" />

          <RoomLabel x={195} y={560} title="COLLABORATION" detail="Brainstorming (12' x 10')" />
          <RoomLabel x={603} y={568} title="WORKSTATIONS" detail="8 Focus Desks (20' x 14')" />
          <RoomLabel x={996} y={566} title="PROJECT ROOM" detail="Plan & Launch (10' x 12')" />

          <RoomLabel x={157} y={845} title="SERVER / IT" detail="Infrastructure (8' x 8')" />
          <RoomLabel x={354} y={845} title="STORAGE" detail="Supplies & Utility (8' x 8')" />
          <RoomLabel x={600} y={830} title="RECEPTION" detail="Visitor Check-In (12' x 8')" />
          <RoomLabel x={970} y={845} title="WAITING AREA" detail="Guest Seating (12' x 10')" />

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
            <Avatar key={remote.id} player={remote} />
          ))}

          {/* Local Player */}
          <Avatar player={player} local isCaffeinated={isCaffeinated} />
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
