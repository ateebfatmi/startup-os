"use client";

import { motion } from "framer-motion";
import { Circle, Download, Eraser, Loader2, MousePointer2, PenTool, Plus, Redo2, RotateCcw, Square, StickyNote, Type, Undo2, Wifi } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  connectWhiteboardChannel,
  loadWhiteboard,
  mergeWhiteboardElement,
  saveWhiteboard,
  type WhiteboardElement,
  type WhiteboardOperation,
  type WhiteboardRecord,
} from "./whiteboard-service";

type Tool = "select" | "draw" | "erase";
type HistoryItem = { before: WhiteboardElement | null; after: WhiteboardElement };
const WIDTH = 900;
const HEIGHT = 500;
const COLORS = ["#173f2b", "#2563eb", "#dc2626", "#d97706", "#8b5cf6"];
const NOTE_COLORS = ["#c8f560", "#ffbc7f", "#a8d4ed", "#d7b4e6", "#ffb4c2"];

export function WhiteboardPanel({ workspaceId }: { workspaceId: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const boardAreaRef = useRef<HTMLDivElement | null>(null);
  const clientId = useRef(crypto.randomUUID());
  const clock = useRef(0);
  const channel = useRef<ReturnType<typeof connectWhiteboardChannel> | null>(null);
  const draft = useRef<Array<{ x: number; y: number }>>([]);
  const undoStack = useRef<HistoryItem[]>([]);
  const redoStack = useRef<HistoryItem[]>([]);
  const [board, setBoard] = useState<WhiteboardRecord | null>(null);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState(COLORS[0]);
  const [penSize, setPenSize] = useState(4);
  const [drawing, setDrawing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState("Loading…");
  const [error, setError] = useState<string | null>(null);
  const visibleElements = useMemo(() => elements.filter((element) => !element.deleted), [elements]);

  useEffect(() => {
    let active = true;
    void loadWhiteboard(workspaceId).then((loaded) => {
      if (!active) return;
      setBoard(loaded); setElements(loaded.document.elements);
      clock.current = Math.max(0, ...loaded.document.elements.map((element) => element.clock)) + 1;
      channel.current = connectWhiteboardChannel(workspaceId, loaded.id, (operation) => {
        clock.current = Math.max(clock.current, operation.element.clock + 1);
        setElements((current) => mergeWhiteboardElement(current, operation.element));
        setStatus("Live update received");
      });
      setStatus("Live · saved");
    }).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not open whiteboard"));
    return () => { active = false; channel.current?.close(); channel.current = null; };
  }, [workspaceId]);

  useEffect(() => {
    if (!board) return;
    const timer = window.setTimeout(() => {
      void saveWhiteboard(workspaceId, { ...board, document: { version: 2, elements } })
        .then(() => setStatus("Live · saved"))
        .catch((cause) => setError(cause instanceof Error ? cause.message : "Could not save whiteboard"));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [board, elements, workspaceId]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const context = canvas.getContext("2d"); if (!context) return;
    context.clearRect(0, 0, WIDTH, HEIGHT);
    for (const element of visibleElements) {
      if (element.type !== "stroke") continue;
      context.beginPath();
      element.points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
      context.strokeStyle = element.color; context.lineWidth = element.size; context.lineCap = "round"; context.lineJoin = "round"; context.stroke();
    }
    if (draft.current.length) {
      context.beginPath(); draft.current.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
      context.strokeStyle = color; context.lineWidth = penSize; context.lineCap = "round"; context.lineJoin = "round"; context.stroke();
    }
  }, [color, penSize, visibleElements]);

  useEffect(() => { renderCanvas(); }, [renderCanvas, drawing]);

  const nextRevision = () => ({ clock: clock.current++, clientId: clientId.current });
  const emit = (element: WhiteboardElement, remember = true) => {
    const before = elements.find((item) => item.id === element.id) || null;
    setElements((current) => mergeWhiteboardElement(current, element));
    if (remember) { undoStack.current.push({ before, after: element }); redoStack.current = []; }
    if (board) channel.current?.publish({ id: crypto.randomUUID(), boardId: board.id, element });
    setStatus("Saving…");
  };
  const revise = (element: WhiteboardElement, changes: Record<string, unknown> = {}) => ({ ...element, ...changes, ...nextRevision() }) as WhiteboardElement;
  const createBase = () => ({ id: crypto.randomUUID(), color, deleted: false, ...nextRevision() });
  const pointer = (event: React.PointerEvent) => { const rect = event.currentTarget.getBoundingClientRect(); return { x: (event.clientX - rect.left) * WIDTH / rect.width, y: (event.clientY - rect.top) * HEIGHT / rect.height }; };

  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = pointer(event);
    if (tool === "erase") {
      const target = [...visibleElements].reverse().find((element) => element.type === "stroke" && element.points.some((item) => Math.hypot(item.x - point.x, item.y - point.y) < Math.max(16, element.size * 2)));
      if (target) emit(revise(target, { deleted: true }));
      return;
    }
    if (tool !== "draw") { setSelectedId(null); return; }
    event.currentTarget.setPointerCapture(event.pointerId); draft.current = [point]; setDrawing(true); renderCanvas();
  };
  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing || tool !== "draw") return;
    draft.current.push(pointer(event)); renderCanvas();
  };
  const pointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const points = draft.current; draft.current = []; setDrawing(false);
    if (points.length > 1) emit({ ...createBase(), type: "stroke", points, size: penSize });
  };

  const addNote = () => emit({ ...createBase(), type: "note", x: 90, y: 75, width: 190, height: 125, text: "New idea…", color: NOTE_COLORS[visibleElements.filter((item) => item.type === "note").length % NOTE_COLORS.length] });
  const addText = () => emit({ ...createBase(), type: "text", x: 320, y: 90, width: 260, height: 80, text: "Type a headline", size: 24 });
  const addShape = (shape: "rectangle" | "ellipse") => emit({ ...createBase(), type: "shape", shape, x: 360, y: 240, width: 190, height: 110 });
  const remove = (element: WhiteboardElement) => { emit(revise(element, { deleted: true })); setSelectedId(null); };
  const move = (element: WhiteboardElement, offset: { x: number; y: number }) => {
    if (!("x" in element) || !("y" in element)) return;
    const rect = boardAreaRef.current?.getBoundingClientRect(); if (!rect) return;
    emit(revise(element, { x: Math.max(0, element.x + offset.x * WIDTH / rect.width), y: Math.max(0, element.y + offset.y * HEIGHT / rect.height) }));
  };
  const updateText = (element: WhiteboardElement, text: string) => { if (element.type === "note" || element.type === "text") emit(revise(element, { text })); };

  const undo = () => {
    const item = undoStack.current.pop(); if (!item) return;
    redoStack.current.push(item);
    emit(item.before ? revise(item.before, { deleted: item.before.deleted }) : revise(item.after, { deleted: true }), false);
  };
  const redo = () => {
    const item = redoStack.current.pop(); if (!item) return;
    undoStack.current.push(item); emit(revise(item.after, { deleted: false }), false);
  };
  const clear = () => visibleElements.forEach((element) => emit(revise(element, { deleted: true })));

  const exportImage = () => {
    const canvas = document.createElement("canvas"); canvas.width = WIDTH; canvas.height = HEIGHT;
    const context = canvas.getContext("2d"); if (!context) return;
    context.fillStyle = "#f7f0dd"; context.fillRect(0, 0, WIDTH, HEIGHT);
    for (const element of visibleElements) {
      context.strokeStyle = element.color; context.fillStyle = element.color;
      if (element.type === "stroke") { context.beginPath(); element.points.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)); context.lineWidth = element.size; context.lineCap = "round"; context.stroke(); }
      if (element.type === "shape") { context.lineWidth = 4; if (element.shape === "ellipse") { context.beginPath(); context.ellipse(element.x + element.width / 2, element.y + element.height / 2, element.width / 2, element.height / 2, 0, 0, Math.PI * 2); context.stroke(); } else context.strokeRect(element.x, element.y, element.width, element.height); }
      if (element.type === "note") { context.fillStyle = element.color; context.fillRect(element.x, element.y, element.width, element.height); context.fillStyle = "#173f2b"; context.font = "600 16px sans-serif"; context.fillText(element.text.slice(0, 60), element.x + 12, element.y + 30, element.width - 24); }
      if (element.type === "text") { context.font = `700 ${element.size}px sans-serif`; context.fillText(element.text.slice(0, 80), element.x, element.y + element.size, element.width); }
    }
    const link = document.createElement("a"); link.download = `orbit-whiteboard-${Date.now()}.png`; link.href = canvas.toDataURL(); link.click();
  };

  if (!board && !error) return <div className="grid place-items-center p-16"><Loader2 className="animate-spin" /></div>;
  return <div className="space-y-3">
    {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-black/10 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap gap-1"><ToolButton active={tool === "select"} onClick={() => setTool("select")} icon={MousePointer2}>Select</ToolButton><ToolButton active={tool === "draw"} onClick={() => setTool("draw")} icon={PenTool}>Draw</ToolButton><ToolButton active={tool === "erase"} onClick={() => setTool("erase")} icon={Eraser}>Erase</ToolButton><Button size="sm" variant="ghost" onClick={addNote}><StickyNote size={15} /> Note</Button><Button size="sm" variant="ghost" onClick={addText}><Type size={15} /> Text</Button><Button size="icon" variant="ghost" onClick={() => addShape("rectangle")} aria-label="Add rectangle"><Square size={16} /></Button><Button size="icon" variant="ghost" onClick={() => addShape("ellipse")} aria-label="Add ellipse"><Circle size={16} /></Button></div>
      <div className="flex items-center gap-1">{COLORS.map((value) => <button key={value} aria-label={`Use ${value}`} onClick={() => setColor(value)} className={`h-5 w-5 rounded-full ${color === value ? "ring-2 ring-offset-1" : ""}`} style={{ background: value }} />)}<select aria-label="Pen size" value={penSize} onChange={(event) => setPenSize(Number(event.target.value))} className="ml-1 rounded-lg border border-black/10 p-1 text-xs"><option value={2}>2px</option><option value={4}>4px</option><option value={8}>8px</option><option value={14}>14px</option></select></div>
      <div className="flex gap-1"><Button size="icon" variant="ghost" onClick={undo} aria-label="Undo"><Undo2 size={16} /></Button><Button size="icon" variant="ghost" onClick={redo} aria-label="Redo"><Redo2 size={16} /></Button><Button size="icon" variant="ghost" onClick={clear} aria-label="Clear board"><RotateCcw size={16} /></Button><Button size="icon" variant="ghost" onClick={exportImage} aria-label="Export board"><Download size={16} /></Button></div>
    </div>
    <div ref={boardAreaRef} className="relative aspect-[9/5] w-full overflow-hidden rounded-2xl border border-black/10 bg-[#f7f0dd] grid-noise shadow-inner">
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} className={`absolute inset-0 h-full w-full touch-none ${tool === "draw" ? "cursor-crosshair" : tool === "erase" ? "cursor-cell" : "cursor-default"}`} />
      {visibleElements.filter((element) => element.type !== "stroke").map((element) => <BoardObject key={`${element.id}:${element.clock}:${element.clientId}`} element={element} selected={selectedId === element.id} onSelect={() => setSelectedId(element.id)} onMove={(offset) => move(element, offset)} onText={(text) => updateText(element, text)} onDelete={() => remove(element)} />)}
    </div>
    <div className="flex items-center justify-between text-xs text-[#68736b]"><span className="flex items-center gap-1.5"><Wifi size={13} className="text-emerald-600" /> {status}</span><span>{visibleElements.length} element{visibleElements.length === 1 ? "" : "s"} · changes merge by logical clock</span></div>
  </div>;
}

function ToolButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof Plus; children: React.ReactNode }) {
  return <Button size="sm" variant={active ? "solid" : "ghost"} onClick={onClick}><Icon size={15} /> {children}</Button>;
}

function BoardObject({ element, selected, onSelect, onMove, onText, onDelete }: { element: Exclude<WhiteboardElement, { type: "stroke" }>; selected: boolean; onSelect: () => void; onMove: (offset: { x: number; y: number }) => void; onText: (text: string) => void; onDelete: () => void }) {
  const [text, setText] = useState("text" in element ? element.text : "");
  useEffect(() => { if ("text" in element) setText(element.text); }, [element]);
  const style = { left: `${element.x / WIDTH * 100}%`, top: `${element.y / HEIGHT * 100}%`, width: `${element.width / WIDTH * 100}%`, height: `${element.height / HEIGHT * 100}%`, color: element.color };
  return <motion.div drag dragMomentum={false} onPointerDown={(event) => { event.stopPropagation(); onSelect(); }} onDragEnd={(_, info) => onMove(info.offset)} className={`group absolute z-10 touch-none ${selected ? "ring-2 ring-[#173f2b] ring-offset-2" : ""}`} style={style}>
    {element.type === "shape" ? <div className={`h-full w-full border-4 ${element.shape === "ellipse" ? "rounded-full" : "rounded-lg"}`} style={{ borderColor: element.color }} /> : <textarea aria-label={element.type === "note" ? "Sticky note" : "Whiteboard text"} value={text} onChange={(event) => setText(event.target.value)} onBlur={() => { if (text !== element.text) onText(text); }} className={`h-full w-full resize-none bg-transparent p-3 outline-none ${element.type === "note" ? "rounded-md font-semibold shadow-lg" : "font-bold"}`} style={{ background: element.type === "note" ? element.color : "transparent", color: element.type === "note" ? "#173f2b" : element.color, fontSize: element.type === "text" ? `${element.size}px` : undefined }} />}
    {selected && <button aria-label="Delete selected element" onClick={(event) => { event.stopPropagation(); onDelete(); }} className="absolute -right-3 -top-3 grid h-7 w-7 place-items-center rounded-full bg-[#a94135] text-white shadow"><Plus size={14} className="rotate-45" /></button>}
  </motion.div>;
}
