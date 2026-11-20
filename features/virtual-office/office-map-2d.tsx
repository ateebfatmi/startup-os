"use client";

import { useEffect, useMemo, useRef } from "react";
import { INTERACTION_ZONES, OFFICE_ROOMS, getOfficeRoomAt } from "./office-data";
import { OFFICE_BOUNDS, resolveMovement } from "./collision";
import { useOfficeStore } from "./store";
import type { PlayerSnapshot } from "./types";

const VIEW_W = 1200;
const VIEW_H = 900;
const PAD = 28;
const MAP_W = VIEW_W - PAD * 2;
const MAP_H = VIEW_H - PAD * 2;

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
    const editable = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
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
        if (action) useOfficeStore.getState().openPanel(action.kind);
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
        else { dx = tx / distance; dz = tz / distance; }
      }

      if (dx || dz) {
        const length = Math.hypot(dx, dz) || 1;
        const speed = state.isCaffeinated ? 4.5 : 3.5;
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
      const action = nearest ? { kind: nearest.kind, label: nearest.label } : null;
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

function Chair({ x, y, rotate = 0, color = "#315047" }: { x: number; y: number; rotate?: number; color?: string }) {
  return <g transform={`translate(${x} ${y}) rotate(${rotate})`}><rect x="-12" y="-10" width="24" height="20" rx="7" fill={color} stroke="#162b25" strokeWidth="3"/><path d="M-11 5h22v10H-11z" rx="4" fill="#203b33"/><path d="M-7 15v7M7 15v7" stroke="#162b25" strokeWidth="3" strokeLinecap="round"/></g>;
}

function Plant({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}><ellipse cy="12" rx="14" ry="8" fill="#b66f45"/><path d="M0 9C-3-12-18-24-25-15C-28-5-14 1 0 9ZM0 8C3-12 18-25 25-14C26-3 13 2 0 8ZM0 5C-2-15 2-28 10-25C20-19 12-4 0 5Z" fill="#4d8457" stroke="#2f6745" strokeWidth="2"/></g>;
}

function Desk({ x, y, w = 120, rotate = 0, seats = 2 }: { x: number; y: number; w?: number; rotate?: number; seats?: number }) {
  return <g transform={`translate(${x} ${y}) rotate(${rotate})`}><rect x={-w / 2} y="-24" width={w} height="48" rx="6" fill="#9a613c" stroke="#513725" strokeWidth="4"/><path d={`M${-w/2 + 8} 15H${w/2 - 8}`} stroke="#c58b59" strokeWidth="3"/><rect x="-22" y="-11" width="44" height="21" rx="3" fill="#172c31"/><rect x="-16" y="-7" width="32" height="13" rx="2" fill="#8ad2d1" opacity=".75"/>{Array.from({ length: seats }).map((_, index) => <Chair key={index} x={(index - (seats - 1) / 2) * Math.min(64, w / seats)} y={48} color="#344e57" />)}</g>;
}

function RoomLabel({ x, y, title, detail }: { x: number; y: number; title: string; detail: string }) {
  return <g className="pointer-events-none"><rect x={x - 72} y={y - 15} width="144" height="32" rx="10" fill="#fffdf7" opacity=".88"/><text x={x} y={y - 1} textAnchor="middle" className="fill-[#18352a] text-[12px] font-extrabold tracking-[.02em]">{title}</text><text x={x} y={y + 11} textAnchor="middle" className="fill-[#647269] text-[8px] font-semibold">{detail}</text></g>;
}

function Avatar({ player, local = false }: { player: PlayerSnapshot; local?: boolean }) {
  const x = mapX(player.x);
  const y = mapY(player.z);
  const initials = player.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <g transform={`translate(${x} ${y})`} className="pointer-events-none" filter="url(#avatarShadow)"><ellipse cy="18" rx="18" ry="8" fill="#173f2b" opacity=".2"/><circle r={local ? 22 : 20} fill="#fffdf7" stroke={local ? "#c8f560" : "#fffdf7"} strokeWidth={local ? 6 : 4}/><circle r="17" fill={player.color}/><text y="5" textAnchor="middle" className="fill-white text-[11px] font-black">{initials || "YO"}</text><circle cx="15" cy="14" r="6" fill="#55ac74" stroke="#fffdf7" strokeWidth="3"/><g transform="translate(0 -34)"><rect x="-37" y="-12" width="74" height="22" rx="9" fill={local ? "#173f2b" : "#fffdf7"}/><text y="3" textAnchor="middle" className={`${local ? "fill-[#c8f560]" : "fill-[#173f2b]"} text-[9px] font-extrabold`}>{local ? "You" : player.name.slice(0, 12)}</text></g></g>;
}

function Furnishings() {
  return <>
    <g aria-label="Conference room furniture"><rect x="90" y="88" width="330" height="115" rx="12" fill="#865136" stroke="#4b2e23" strokeWidth="5"/><rect x="112" y="108" width="286" height="74" rx="7" fill="#a66d45"/><rect x="213" y="42" width="90" height="26" rx="5" fill="#172a30"/><text x="258" y="59" textAnchor="middle" className="fill-[#91dad9] text-[9px] font-bold">TEAM PULSE</text>{[125,200,275,350].map((x) => <Chair key={`t${x}`} x={x} y={67} />)}{[125,200,275,350].map((x) => <Chair key={`b${x}`} x={x} y={227} rotate={180} />)}<Chair x={62} y={145} rotate={-90}/><Chair x={447} y={145} rotate={90}/></g>
    <g aria-label="Executive offices"><Desk x={525} y={158} w={132}/><Desk x={727} y={158} w={132}/><rect x="476" y="55" width="100" height="24" rx="5" fill="#24483a"/><rect x="678" y="55" width="100" height="24" rx="5" fill="#263d4b"/></g>
    <g aria-label="Pantry"><rect x="822" y="47" width="157" height="48" rx="6" fill="#b88a62" stroke="#69482f" strokeWidth="4"/><circle cx="850" cy="71" r="13" fill="#dbe8e4"/><rect x="911" y="57" width="46" height="25" rx="4" fill="#263537"/><circle cx="900" cy="176" r="49" fill="#a66d45" stroke="#5b3827" strokeWidth="5"/>{[0,90,180,270].map((r) => <Chair key={r} x={900 + Math.sin(r*Math.PI/180)*76} y={176 + Math.cos(r*Math.PI/180)*66} rotate={r}/>)}</g>
    <g aria-label="Washrooms"><path d="M1040 61h55v70h-55zM1040 184h55v70h-55z" fill="#d6e2df" stroke="#65746e" strokeWidth="4"/><ellipse cx="1067" cy="86" rx="16" ry="23" fill="#fffdf7"/><ellipse cx="1067" cy="209" rx="16" ry="23" fill="#fffdf7"/><circle cx="1130" cy="99" r="18" fill="#fffdf7" stroke="#82918a" strokeWidth="3"/><circle cx="1130" cy="222" r="18" fill="#fffdf7" stroke="#82918a" strokeWidth="3"/></g>
    <g aria-label="Collaboration area"><circle cx="187" cy="432" r="62" fill="#b17749" stroke="#573a28" strokeWidth="5"/>{[0,90,180,270].map((r) => <Chair key={r} x={187 + Math.sin(r*Math.PI/180)*91} y={432 + Math.cos(r*Math.PI/180)*79} rotate={r} color="#546b62"/>)}<rect x="318" y="357" width="18" height="150" rx="8" fill="#dcece5" stroke="#4f6c60" strokeWidth="4"/><path d="M322 385h10M322 410h10M322 435h10M322 460h10" stroke="#72a88c" strokeWidth="5"/></g>
    <g aria-label="Workstations"><Desk x={563} y={381} w={310} seats={4}/><Desk x={563} y={510} w={310} seats={4} rotate={180}/></g>
    <g aria-label="Project room"><rect x="855" y="361" width="236" height="124" rx="12" fill="#8f5839" stroke="#4e3225" strokeWidth="5"/>{[890,945,1000,1055].map((x) => <Chair key={x} x={x} y={335} />)}{[890,945,1000,1055].map((x) => <Chair key={x} x={x} y={511} rotate={180} />)}<rect x="1098" y="379" width="24" height="94" rx="5" fill="#dceddf"/><path d="M1104 398h12M1104 420h12M1104 442h12" stroke="#55a177" strokeWidth="5"/></g>
    <g aria-label="Server and storage"><rect x="44" y="650" width="48" height="168" rx="5" fill="#1b2936" stroke="#0c1820" strokeWidth="5"/>{[670,710,750,790].map((y) => <g key={y}><rect x="51" y={y} width="34" height="25" rx="3" fill="#2d4354"/><circle cx="76" cy={y+8} r="3" fill="#c8f560"/></g>)}{[153,190,227].map((x) => <g key={x}><rect x={x} y="660" width="29" height="133" rx="4" fill="#9a7959" stroke="#5c4635" strokeWidth="4"/><path d={`M${x+5} 695h19M${x+5} 730h19M${x+5} 765h19`} stroke="#d0af83" strokeWidth="3"/></g>)}</g>
    <g aria-label="Reception"><path d="M390 716q0-34 34-34h225q34 0 34 34v68H390z" fill="#b88151" stroke="#65432d" strokeWidth="5"/><path d="M421 721h231v38H421z" fill="#d5a16c"/><rect x="505" y="694" width="62" height="35" rx="5" fill="#1d3035"/><Chair x={536} y={650}/></g>
    <g aria-label="Waiting area"><rect x="794" y="665" width="248" height="56" rx="18" fill="#52685f" stroke="#283b35" strokeWidth="5"/><path d="M814 688h208" stroke="#799084" strokeWidth="4"/><circle cx="922" cy="786" r="48" fill="#b27a4b" stroke="#5f402d" strokeWidth="5"/><Chair x={827} y={796} rotate={-90} color="#6d766f"/><Chair x={1017} y={796} rotate={90} color="#6d766f"/></g>
    <Plant x={54} y={57}/><Plant x={450} y={55}/><Plant x={793} y={55}/><Plant x={81} y={565}/><Plant x={321} y={568}/><Plant x={1114} y={542}/><Plant x={720} y={797}/><Plant x={1096} y={803}/>
  </>;
}

export function OfficeMap2D() {
  useOfficeMovement();
  const player = useOfficeStore((state) => state.player);
  const remotePlayers = useOfficeStore((state) => state.remotePlayers);
  const clickTarget = useOfficeStore((state) => state.clickTarget);
  const zoomLevel = useOfficeStore((state) => state.zoomLevel);
  const lighting = useOfficeStore((state) => state.lightingMode);
  const mapRef = useRef<SVGSVGElement>(null);
  const room = getOfficeRoomAt(player.x, player.z);
  const rooms = useMemo(() => OFFICE_ROOMS.map((item) => ({ ...item, x: mapX(item.bounds.minX), y: mapY(item.bounds.minZ), w: mapX(item.bounds.maxX) - mapX(item.bounds.minX), h: mapY(item.bounds.maxZ) - mapY(item.bounds.minZ) })), []);

  const walkToPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!mapRef.current) return;
    const point = mapRef.current.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    const matrix = mapRef.current.getScreenCTM()?.inverse();
    if (!matrix) return;
    const mapped = point.matrixTransform(matrix);
    useOfficeStore.getState().setClickTarget({ x: worldX(mapped.x), z: worldZ(mapped.y) });
  };

  return <section className={`office-map-shell office-map-${lighting}`} aria-label="Interactive 2D office">
    <output className="sr-only" aria-label="Player position" data-x={player.x} data-z={player.z}>{`Player position ${player.x.toFixed(2)}, ${player.z.toFixed(2)}`}</output>
    <div className="office-map-context" aria-live="polite"><span className="office-map-context__dot"/><span>{room?.shortName ?? "Office corridor"}</span><span aria-hidden="true">·</span><span>Click anywhere to walk</span></div>
    <div className="office-map-stage" style={{ transform: `scale(${zoomLevel})` }}>
      <svg ref={mapRef} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="application" aria-label="CrewVilla office floor plan. Use arrow keys or W A S D to move, or click a destination." onPointerDown={walkToPointer}>
        <defs><pattern id="tile" width="42" height="42" patternUnits="userSpaceOnUse"><rect width="42" height="42" fill="#ece9df"/><path d="M42 0H0V42" fill="none" stroke="#d8d4c9" strokeWidth="1"/></pattern><filter id="roomShadow"><feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#142a20" floodOpacity=".2"/></filter><filter id="avatarShadow"><feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#142a20" floodOpacity=".35"/></filter></defs>
        <rect width={VIEW_W} height={VIEW_H} rx="26" fill="#1a2922"/>
        <rect x={PAD} y={PAD} width={MAP_W} height={MAP_H} rx="8" fill="url(#tile)" stroke="#0e1b17" strokeWidth="16" filter="url(#roomShadow)"/>
        {rooms.map((item) => <rect key={item.id} x={item.x} y={item.y} width={item.w} height={item.h} fill={item.color} opacity=".16" stroke="#1c2d27" strokeWidth="7"/>) }
        <Furnishings />
        <RoomLabel x={255} y={275} title="CONFERENCE" detail="Client & team meetings"/><RoomLabel x={523} y={275} title="FOUNDER CABIN" detail="Private office"/><RoomLabel x={725} y={275} title="MANAGER CABIN" detail="Team workspace"/><RoomLabel x={900} y={275} title="PANTRY" detail="Coffee & breaks"/><RoomLabel x={1080} y={280} title="WASHROOMS" detail="2 facilities"/>
        <RoomLabel x={186} y={565} title="COLLABORATION" detail="Brainstorm together"/><RoomLabel x={560} y={570} title="WORKSTATIONS" detail="8 focused desks"/><RoomLabel x={976} y={570} title="PROJECT ROOM" detail="Plan & review"/><RoomLabel x={110} y={842} title="SERVER / IT" detail="Infrastructure"/><RoomLabel x={232} y={842} title="STORAGE" detail="Office supplies"/><RoomLabel x={535} y={842} title="RECEPTION" detail="Visitor check-in"/><RoomLabel x={918} y={842} title="WAITING AREA" detail="Guest seating"/>
        {INTERACTION_ZONES.map((zone) => <circle key={zone.id} cx={mapX(zone.x)} cy={mapY(zone.z)} r={zone.radius * 30} fill="none" stroke="#c8f560" strokeWidth="3" strokeDasharray="7 8" opacity={Math.hypot(zone.x-player.x, zone.z-player.z) <= zone.radius ? .95 : .22}/>) }
        {clickTarget && <g transform={`translate(${mapX(clickTarget.x)} ${mapY(clickTarget.z)})`} className="office-map-target"><circle r="17" fill="none" stroke="#c8f560" strokeWidth="5"/><circle r="4" fill="#173f2b"/></g>}
        {Object.values(remotePlayers).map((remote) => <Avatar key={remote.id} player={remote}/>) }
        <Avatar player={player} local/>
      </svg>
    </div>
    <nav className="office-room-jump" aria-label="Office destinations">
      {OFFICE_ROOMS.filter((item) => !["washrooms", "storage-utility"].includes(item.id)).map((item) => <button key={item.id} onClick={() => useOfficeStore.getState().setClickTarget(item.destination)} aria-current={room?.id === item.id ? "location" : undefined}>{item.shortName}</button>)}
    </nav>
  </section>;
}
