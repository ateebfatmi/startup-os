"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, Eraser, Move, Palette, PenTool, Plus, RotateCcw, Trash2, Type } from "lucide-react";
import { Button } from "@/components/ui/button";

type StickyNote = {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
};

const NOTE_COLORS = [
  { name: "Lime", bg: "#c8f560", text: "#173f2b" },
  { name: "Amber", bg: "#ffbc7f", text: "#3d2208" },
  { name: "Sky", bg: "#a8d4ed", text: "#0d3147" },
  { name: "Lavender", bg: "#d7b4e6", text: "#3a134a" },
  { name: "Pink", bg: "#ffb4c2", text: "#4a0d18" },
];

const PEN_COLORS = ["#173f2b", "#c8f560", "#2563eb", "#dc2626", "#d97706", "#8b5cf6"];

const KEY_DRAW = "orbit-whiteboard-drawing";
const KEY_NOTES = "orbit-whiteboard-notes";

export function WhiteboardPanel() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTool, setActiveTool] = useState<"draw" | "erase" | "move">("draw");
  const [penColor, setPenColor] = useState("#173f2b");
  const [penSize, setPenSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedNoteColor, setSelectedNoteColor] = useState(NOTE_COLORS[0]);

  const [notes, setNotes] = useState<StickyNote[]>([
    { id: "note-1", text: "What must be true for Q4 launch?", color: "#c8f560", x: 40, y: 40 },
    { id: "note-2", text: "Talk to 5 beta engineering teams", color: "#ffbc7f", x: 260, y: 80 },
    { id: "note-3", text: "Benchmark 60 FPS spatial canvas", color: "#a8d4ed", x: 140, y: 220 },
  ]);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Load saved state
  useEffect(() => {
    try {
      const savedNotes = window.localStorage.getItem(KEY_NOTES);
      if (savedNotes) setNotes(JSON.parse(savedNotes));
    } catch {}
  }, []);

  // Save notes to localStorage
  useEffect(() => {
    window.localStorage.setItem(KEY_NOTES, JSON.stringify(notes));
  }, [notes]);

  // Canvas drawing setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Load saved canvas drawing
    const savedDrawing = window.localStorage.getItem(KEY_DRAW);
    if (savedDrawing) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = savedDrawing;
    }
  }, []);

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    window.localStorage.setItem(KEY_DRAW, canvas.toDataURL());
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "move") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool === "move") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === "erase") {
      ctx.clearRect(x - penSize * 2, y - penSize * 2, penSize * 4, penSize * 4);
    } else {
      ctx.lineTo(x, y);
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveCanvas();
    }
  };

  const handleAddNote = () => {
    const newNote: StickyNote = {
      id: `note-${Date.now()}`,
      text: "New idea...",
      color: selectedNoteColor.bg,
      x: 100 + Math.random() * 100,
      y: 100 + Math.random() * 80,
    };
    setNotes((prev) => [...prev, newNote]);
    setEditingNoteId(newNote.id);
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleUpdateNoteText = (id: string, text: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, text } : n)));
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    window.localStorage.removeItem(KEY_DRAW);
  };

  const handleExportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `orbit-whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-black/10 bg-white p-3 shadow-sm">
        {/* Tool Mode Toggles */}
        <div className="flex items-center gap-1">
          <Button
            variant={activeTool === "draw" ? "solid" : "ghost"}
            size="sm"
            onClick={() => setActiveTool("draw")}
            className={activeTool === "draw" ? "bg-[#173f2b] text-[#c8f560]" : ""}
          >
            <PenTool size={16} /> Draw
          </Button>
          <Button
            variant={activeTool === "erase" ? "solid" : "ghost"}
            size="sm"
            onClick={() => setActiveTool("erase")}
            className={activeTool === "erase" ? "bg-[#173f2b] text-[#c8f560]" : ""}
          >
            <Eraser size={16} /> Eraser
          </Button>
          <Button
            variant={activeTool === "move" ? "solid" : "ghost"}
            size="sm"
            onClick={() => setActiveTool("move")}
            className={activeTool === "move" ? "bg-[#173f2b] text-[#c8f560]" : ""}
          >
            <Move size={16} /> Drag Notes
          </Button>
        </div>

        {/* Pen Colors & Sizes */}
        {activeTool === "draw" && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {PEN_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setPenColor(color)}
                  className={`h-5 w-5 rounded-full transition ${penColor === color ? "scale-125 ring-2 ring-black/30" : "opacity-80 hover:opacity-100"}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="mx-1 h-4 w-px bg-black/10" />
            <div className="flex items-center gap-1">
              {[2, 4, 8, 14].map((size) => (
                <button
                  key={size}
                  onClick={() => setPenSize(size)}
                  className={`grid h-6 w-6 place-items-center rounded-md text-xs font-bold ${penSize === size ? "bg-black/10 text-black" : "text-black/50"}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Note Controls & Actions */}
        <div className="flex items-center gap-2">
          {/* Note Color Selector */}
          <div className="flex items-center gap-1">
            {NOTE_COLORS.map((nc) => (
              <button
                key={nc.name}
                onClick={() => setSelectedNoteColor(nc)}
                className={`h-5 w-5 rounded-md border border-black/20 transition ${selectedNoteColor.name === nc.name ? "ring-2 ring-black" : ""}`}
                style={{ backgroundColor: nc.bg }}
              />
            ))}
          </div>

          <Button size="sm" onClick={handleAddNote} className="bg-[#173f2b] text-white hover:bg-[#20573c]">
            <Plus size={16} /> Add Note
          </Button>

          <Button variant="ghost" size="icon" onClick={handleClearCanvas} title="Clear Drawing Canvas">
            <RotateCcw size={16} />
          </Button>

          <Button variant="ghost" size="icon" onClick={handleExportImage} title="Export as PNG">
            <Download size={16} />
          </Button>
        </div>
      </div>

      {/* Main Canvas & Sticky Notes Container */}
      <div className="relative h-[440px] w-full overflow-hidden rounded-2xl border border-black/10 bg-[#f7f0dd] grid-noise shadow-inner">
        {/* HTML5 Drawing Canvas */}
        <canvas
          ref={canvasRef}
          width={760}
          height={440}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className={`absolute inset-0 h-full w-full ${activeTool === "move" ? "pointer-events-none" : "cursor-crosshair"}`}
        />

        {/* Draggable Sticky Notes Layer */}
        {notes.map((note) => (
          <motion.div
            key={note.id}
            drag={activeTool === "move"}
            dragConstraints={{ left: 10, right: 540, top: 10, bottom: 280 }}
            initial={{ x: note.x, y: note.y }}
            className="group absolute w-48 rounded-md p-4 shadow-lg transition-shadow hover:shadow-xl"
            style={{ backgroundColor: note.color, zIndex: editingNoteId === note.id ? 30 : 10 }}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-black/40">Sticky Note</span>
              <button
                onClick={() => handleDeleteNote(note.id)}
                className="opacity-0 transition-opacity group-hover:opacity-100 text-black/60 hover:text-red-600"
              >
                <Trash2 size={13} />
              </button>
            </div>

            {editingNoteId === note.id ? (
              <textarea
                autoFocus
                className="w-full resize-none bg-transparent font-medium text-sm outline-none"
                rows={3}
                value={note.text}
                onChange={(e) => handleUpdateNoteText(note.id, e.target.value)}
                onBlur={() => setEditingNoteId(null)}
              />
            ) : (
              <p
                onClick={() => setEditingNoteId(note.id)}
                className="cursor-pointer text-sm font-semibold leading-snug"
              >
                {note.text}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-[#68736b]">
        <span>💡 Tip: Switch to <b>Drag Notes</b> mode to position sticky notes freely.</span>
        <span>{notes.length} sticky note{notes.length === 1 ? "" : "s"} on canvas</span>
      </div>
    </div>
  );
}
