"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Gamepad2, Trophy, RotateCcw, Volume2, VolumeX, Sparkles, Flame } from "lucide-react";
import { playChime, playSlideClick } from "./audio";

// Sound effect generator for retro 8-bit sounds using Web Audio API
function playRetroTone(freq: number, type: OscillatorType = "square", duration = 0.08) {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // AudioContext might be blocked or unavailable
  }
}

export function ArcadePanel() {
  const [activeTab, setActiveTab] = useState<"2048" | "snake">("2048");
  const [soundEnabled, setSoundEnabled] = useState(true);

  return (
    <div className="flex flex-col h-full max-h-[82vh] overflow-hidden rounded-2xl bg-[#0d1410] text-white border border-white/10 select-none">
      {/* Top Header / Arcade Bezel */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-3 bg-[#132219]">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#c8f560] text-[#121c17] shadow-lg shadow-[#c8f560]/20 animate-pulse">
            <Gamepad2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black tracking-widest text-[#c8f560] uppercase">
                Breakroom Arcade Station
              </h2>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                1P READY
              </span>
            </div>
            <p className="text-[11px] text-white/50">Relax and unwind with team casual mini-games</p>
          </div>
        </div>

        {/* Game Mode Tabs & Sound Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-black/40 p-1 border border-white/10">
            <button
              onClick={() => { setActiveTab("2048"); playSlideClick(); }}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                activeTab === "2048" ? "bg-[#c8f560] text-[#121c17] shadow-sm" : "text-white/70 hover:text-white"
              }`}
            >
              2048 Studio
            </button>
            <button
              onClick={() => { setActiveTab("snake"); playSlideClick(); }}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                activeTab === "snake" ? "bg-[#c8f560] text-[#121c17] shadow-sm" : "text-white/70 hover:text-white"
              }`}
            >
              Retro Snake
            </button>
          </div>

          <button
            onClick={() => setSoundEnabled((v) => !v)}
            className="grid h-8 w-8 place-items-center rounded-lg bg-black/40 text-white/70 hover:text-white border border-white/10 transition cursor-pointer"
            title={soundEnabled ? "Mute Arcade SFX" : "Unmute Arcade SFX"}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>
      </div>

      {/* Game Content Viewport */}
      <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
        {activeTab === "2048" ? (
          <Game2048 soundEnabled={soundEnabled} />
        ) : (
          <RetroSnakeGame soundEnabled={soundEnabled} />
        )}
      </div>
    </div>
  );
}

// ==========================================
// 1. GAME 2048 IMPLEMENTATION
// ==========================================
type Grid = number[][];

function getEmptyBoard(): Grid {
  return [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
}

function spawnTile(grid: Grid): Grid {
  const empty: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) empty.push({ r, c });
    }
  }
  if (empty.length === 0) return grid;
  const target = empty[Math.floor(Math.random() * empty.length)];
  const val = Math.random() < 0.9 ? 2 : 4;
  const newGrid = grid.map((row) => [...row]);
  newGrid[target.r][target.c] = val;
  return newGrid;
}

function slideRow(row: number[]): { newRow: number[]; scoreGained: number } {
  let arr = row.filter((val) => val !== 0);
  let scoreGained = 0;
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      scoreGained += arr[i];
      arr[i + 1] = 0;
      i++;
    }
  }
  arr = arr.filter((val) => val !== 0);
  while (arr.length < 4) {
    arr.push(0);
  }
  return { newRow: arr, scoreGained };
}

function rotateClockwise(grid: Grid): Grid {
  const rotated = getEmptyBoard();
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      rotated[c][3 - r] = grid[r][c];
    }
  }
  return rotated;
}

function moveGrid(grid: Grid, direction: "left" | "right" | "up" | "down"): { newGrid: Grid; scoreGained: number; changed: boolean } {
  let turns = 0;
  if (direction === "up") turns = 3;
  else if (direction === "right") turns = 2;
  else if (direction === "down") turns = 1;

  let current = grid;
  for (let i = 0; i < turns; i++) {
    current = rotateClockwise(current);
  }

  let scoreGained = 0;
  const processed = current.map((row) => {
    const res = slideRow(row);
    scoreGained += res.scoreGained;
    return res.newRow;
  });

  const reverseTurns = (4 - turns) % 4;
  let finalGrid = processed;
  for (let i = 0; i < reverseTurns; i++) {
    finalGrid = rotateClockwise(finalGrid);
  }

  let changed = false;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (finalGrid[r][c] !== grid[r][c]) {
        changed = true;
        break;
      }
    }
  }

  return { newGrid: finalGrid, scoreGained, changed };
}

function checkGameOver(grid: Grid): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) return false;
      if (c < 3 && grid[r][c] === grid[r][c + 1]) return false;
      if (r < 3 && grid[r][c] === grid[r + 1][c]) return false;
    }
  }
  return true;
}

const TILE_COLORS: Record<number, { bg: string; text: string; glow?: string }> = {
  0: { bg: "bg-white/[.04]", text: "text-transparent" },
  2: { bg: "bg-[#e8ece9]", text: "text-[#17211b]" },
  4: { bg: "bg-[#cbe3cb]", text: "text-[#122b1c]" },
  8: { bg: "bg-[#c8f560]", text: "text-[#122b1c]", glow: "shadow-[0_0_12px_rgba(200,245,96,0.4)]" },
  16: { bg: "bg-[#ffab70]", text: "text-[#2b160b]" },
  32: { bg: "bg-[#ff8647]", text: "text-white" },
  64: { bg: "bg-[#ff5722]", text: "text-white", glow: "shadow-[0_0_15px_rgba(255,87,34,0.5)]" },
  128: { bg: "bg-[#ffd54f]", text: "text-[#2b2404]", glow: "shadow-[0_0_18px_rgba(255,213,79,0.6)]" },
  256: { bg: "bg-[#ffca28]", text: "text-[#2b2404]", glow: "shadow-[0_0_20px_rgba(255,202,40,0.7)]" },
  512: { bg: "bg-[#00e5ff]", text: "text-[#00262b]", glow: "shadow-[0_0_22px_rgba(0,229,255,0.7)]" },
  1024: { bg: "bg-[#d500f9]", text: "text-white", glow: "shadow-[0_0_25px_rgba(213,0,249,0.8)]" },
  2048: { bg: "bg-gradient-to-tr from-[#ffe600] to-[#ff0055]", text: "text-white font-black", glow: "shadow-[0_0_30px_rgba(255,230,0,0.9)] animate-bounce" },
};

function Game2048({ soundEnabled }: { soundEnabled: boolean }) {
  const [grid, setGrid] = useState<Grid>(() => spawnTile(spawnTile(getEmptyBoard())));
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("crewvilla-2048-best");
      if (saved) setBestScore(parseInt(saved, 10));
    } catch {
      // storage unavailable
    }
  }, []);

  const handleRestart = useCallback(() => {
    const init = spawnTile(spawnTile(getEmptyBoard()));
    setGrid(init);
    setScore(0);
    setGameOver(false);
    setHasWon(false);
    playChime();
  }, []);

  const handleMove = useCallback((dir: "left" | "right" | "up" | "down") => {
    if (gameOver) return;
    const res = moveGrid(grid, dir);
    if (!res.changed) return;

    if (soundEnabled) {
      if (res.scoreGained > 0) playRetroTone(440 + Math.min(res.scoreGained * 5, 800), "triangle", 0.08);
      else playRetroTone(220, "sine", 0.04);
    }

    const nextGrid = spawnTile(res.newGrid);
    const newScore = score + res.scoreGained;
    setGrid(nextGrid);
    setScore(newScore);

    if (newScore > bestScore) {
      setBestScore(newScore);
      try { window.localStorage.setItem("crewvilla-2048-best", newScore.toString()); } catch { /* ignore */ }
    }

    // Check if won (reached 2048)
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (nextGrid[r][c] >= 2048 && !hasWon) {
          setHasWon(true);
          if (soundEnabled) playRetroTone(880, "square", 0.3);
        }
      }
    }

    if (checkGameOver(nextGrid)) {
      setGameOver(true);
      if (soundEnabled) playRetroTone(150, "sawtooth", 0.4);
    }
  }, [grid, score, bestScore, gameOver, hasWon, soundEnabled]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "KeyW"].includes(e.code)) { e.preventDefault(); handleMove("up"); }
      else if (["ArrowDown", "KeyS"].includes(e.code)) { e.preventDefault(); handleMove("down"); }
      else if (["ArrowLeft", "KeyA"].includes(e.code)) { e.preventDefault(); handleMove("left"); }
      else if (["ArrowRight", "KeyD"].includes(e.code)) { e.preventDefault(); handleMove("right"); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleMove]);

  return (
    <div className="flex flex-col items-center gap-4 max-w-sm w-full">
      {/* Score and Reset Bar */}
      <div className="flex items-center justify-between w-full px-2">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-black/40 px-3 py-1.5 border border-white/10 text-center min-w-[72px]">
            <span className="text-[9px] uppercase tracking-wider text-white/50 block font-bold">SCORE</span>
            <span className="text-base font-black text-[#c8f560]">{score}</span>
          </div>
          <div className="rounded-xl bg-black/40 px-3 py-1.5 border border-white/10 text-center min-w-[72px]">
            <span className="text-[9px] uppercase tracking-wider text-white/50 block font-bold">BEST</span>
            <span className="text-base font-black text-amber-400 flex items-center justify-center gap-1">
              <Trophy size={13} /> {bestScore}
            </span>
          </div>
        </div>

        <button
          onClick={handleRestart}
          className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-bold transition text-white cursor-pointer"
        >
          <RotateCcw size={14} />
          <span>New Game</span>
        </button>
      </div>

      {/* 4x4 Game Matrix */}
      <div className="relative rounded-2xl bg-[#14231a] p-3.5 border-2 border-white/10 shadow-2xl">
        <div className="grid grid-cols-4 gap-2.5">
          {grid.map((row, r) =>
            row.map((val, c) => {
              const meta = TILE_COLORS[val] || { bg: "bg-emerald-400", text: "text-white" };
              return (
                <div
                  key={`${r}-${c}`}
                  className={`h-16 w-16 sm:h-18 sm:w-18 rounded-xl flex items-center justify-center text-lg sm:text-xl font-bold transition-all duration-100 ${meta.bg} ${meta.text} ${meta.glow || ""}`}
                >
                  {val > 0 ? val : ""}
                </div>
              );
            })
          )}
        </div>

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 rounded-2xl bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 p-4 animate-in fade-in">
            <span className="text-2xl font-black text-red-400 uppercase tracking-widest">GAME OVER</span>
            <p className="text-xs text-white/70">No more valid moves remaining!</p>
            <button
              onClick={handleRestart}
              className="mt-2 rounded-xl bg-[#c8f560] text-[#121c17] px-4 py-2 text-xs font-black uppercase tracking-wider hover:bg-[#d8ff7a] transition cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Victory Celebration Overlay */}
        {hasWon && !gameOver && (
          <div className="absolute top-2 right-2 rounded-full bg-amber-400/90 text-[#121c17] px-2.5 py-0.5 text-[10px] font-black flex items-center gap-1 shadow-lg animate-pulse">
            <Sparkles size={11} /> 2048 UNLOCKED!
          </div>
        )}
      </div>

      {/* On-screen Directional Touch Controls for mobile/mouse */}
      <div className="flex flex-col items-center gap-1 pt-1">
        <button
          onClick={() => handleMove("up")}
          className="h-9 w-12 rounded-lg bg-black/30 border border-white/10 hover:bg-black/50 text-xs font-bold text-white/80 transition"
        >
          ▲
        </button>
        <div className="flex gap-1">
          <button
            onClick={() => handleMove("left")}
            className="h-9 w-12 rounded-lg bg-black/30 border border-white/10 hover:bg-black/50 text-xs font-bold text-white/80 transition"
          >
            ◀
          </button>
          <button
            onClick={() => handleMove("down")}
            className="h-9 w-12 rounded-lg bg-black/30 border border-white/10 hover:bg-black/50 text-xs font-bold text-white/80 transition"
          >
            ▼
          </button>
          <button
            onClick={() => handleMove("right")}
            className="h-9 w-12 rounded-lg bg-black/30 border border-white/10 hover:bg-black/50 text-xs font-bold text-white/80 transition"
          >
            ▶
          </button>
        </div>
        <p className="text-[10px] text-white/40 mt-1">Use Arrow Keys or WASD to slide tiles</p>
      </div>
    </div>
  );
}

// ==========================================
// 2. RETRO SNAKE IMPLEMENTATION
// ==========================================
type SnakeSegment = { x: number; y: number };

function RetroSnakeGame({ soundEnabled }: { soundEnabled: boolean }) {
  const GRID_SIZE = 16;
  const [snake, setSnake] = useState<SnakeSegment[]>([
    { x: 8, y: 8 },
    { x: 8, y: 9 },
    { x: 8, y: 10 },
  ]);
  const [direction, setDirection] = useState<{ x: number; y: number }>({ x: 0, y: -1 });
  const [food, setFood] = useState<SnakeSegment>({ x: 4, y: 4 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const directionRef = useRef(direction);
  directionRef.current = direction;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("crewvilla-snake-high");
      if (saved) setHighScore(parseInt(saved, 10));
    } catch {
      // storage unavailable
    }
  }, []);

  const spawnFood = useCallback((currentSnake: SnakeSegment[]) => {
    let newFood: SnakeSegment;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      if (!currentSnake.some((s) => s.x === newFood.x && s.y === newFood.y)) break;
    }
    return newFood;
  }, [GRID_SIZE]);

  const resetGame = useCallback(() => {
    const initSnake = [
      { x: 8, y: 8 },
      { x: 8, y: 9 },
      { x: 8, y: 10 },
    ];
    setSnake(initSnake);
    setDirection({ x: 0, y: -1 });
    directionRef.current = { x: 0, y: -1 };
    setFood(spawnFood(initSnake));
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    playChime();
  }, [spawnFood]);

  // Main game loop
  useEffect(() => {
    if (isGameOver || isPaused) return;

    const interval = setInterval(() => {
      setSnake((prev) => {
        const head = {
          x: prev[0].x + directionRef.current.x,
          y: prev[0].y + directionRef.current.y,
        };

        // Wall collision
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setIsGameOver(true);
          if (soundEnabled) playRetroTone(130, "sawtooth", 0.3);
          return prev;
        }

        // Self collision
        if (prev.some((s) => s.x === head.x && s.y === head.y)) {
          setIsGameOver(true);
          if (soundEnabled) playRetroTone(130, "sawtooth", 0.3);
          return prev;
        }

        const newSnake = [head, ...prev];

        // Eat food
        if (head.x === food.x && head.y === food.y) {
          if (soundEnabled) playRetroTone(600, "square", 0.08);
          setScore((s) => {
            const next = s + 10;
            if (next > highScore) {
              setHighScore(next);
              try { window.localStorage.setItem("crewvilla-snake-high", next.toString()); } catch { /* ignore */ }
            }
            return next;
          });
          setFood(spawnFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, 110);

    return () => clearInterval(interval);
  }, [isGameOver, isPaused, food, spawnFood, highScore, soundEnabled, GRID_SIZE]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const cur = directionRef.current;
      if ((e.code === "ArrowUp" || e.code === "KeyW") && cur.y === 0) { e.preventDefault(); setDirection({ x: 0, y: -1 }); }
      else if ((e.code === "ArrowDown" || e.code === "KeyS") && cur.y === 0) { e.preventDefault(); setDirection({ x: 0, y: 1 }); }
      else if ((e.code === "ArrowLeft" || e.code === "KeyA") && cur.x === 0) { e.preventDefault(); setDirection({ x: -1, y: 0 }); }
      else if ((e.code === "ArrowRight" || e.code === "KeyD") && cur.x === 0) { e.preventDefault(); setDirection({ x: 1, y: 0 }); }
      else if (e.code === "Space") { e.preventDefault(); setIsPaused((v) => !v); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 max-w-sm w-full">
      {/* Score Header */}
      <div className="flex items-center justify-between w-full px-2">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-black/40 px-3 py-1.5 border border-white/10 text-center min-w-[72px]">
            <span className="text-[9px] uppercase tracking-wider text-white/50 block font-bold">SCORE</span>
            <span className="text-base font-black text-[#c8f560]">{score}</span>
          </div>
          <div className="rounded-xl bg-black/40 px-3 py-1.5 border border-white/10 text-center min-w-[72px]">
            <span className="text-[9px] uppercase tracking-wider text-white/50 block font-bold">HIGH</span>
            <span className="text-base font-black text-amber-400 flex items-center justify-center gap-1">
              <Trophy size={13} /> {highScore}
            </span>
          </div>
        </div>

        <button
          onClick={resetGame}
          className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-bold transition text-white cursor-pointer"
        >
          <RotateCcw size={14} />
          <span>Reset</span>
        </button>
      </div>

      {/* Snake Canvas Grid */}
      <div className="relative rounded-2xl bg-[#09120c] p-2 border-2 border-emerald-500/30 shadow-[0_0_20px_rgba(20,80,40,0.4)]">
        <div
          className="grid gap-[2px] bg-black/30 p-1 rounded-xl"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
            const x = index % GRID_SIZE;
            const y = Math.floor(index / GRID_SIZE);
            const isHead = snake[0].x === x && snake[0].y === y;
            const isBody = snake.slice(1).some((s) => s.x === x && s.y === y);
            const isFood = food.x === x && food.y === y;

            return (
              <div
                key={index}
                className={`h-4 w-4 sm:h-5 sm:w-5 rounded-[3px] transition-colors ${
                  isHead
                    ? "bg-[#c8f560] shadow-[0_0_8px_#c8f560]"
                    : isBody
                    ? "bg-[#62a84a]"
                    : isFood
                    ? "bg-[#ff4757] rounded-full shadow-[0_0_8px_#ff4757] animate-pulse"
                    : "bg-white/[.02]"
                }`}
              />
            );
          })}
        </div>

        {/* Game Over Screen */}
        {isGameOver && (
          <div className="absolute inset-0 rounded-2xl bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center gap-3 p-4 animate-in fade-in">
            <span className="text-2xl font-black text-red-400 uppercase tracking-widest">CRASH!</span>
            <p className="text-xs text-white/70">Final Score: {score}</p>
            <button
              onClick={resetGame}
              className="mt-2 rounded-xl bg-[#c8f560] text-[#121c17] px-4 py-2 text-xs font-black uppercase tracking-wider hover:bg-[#d8ff7a] transition cursor-pointer"
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Snake Touch Controls */}
      <div className="flex flex-col items-center gap-1 pt-1">
        <button
          onClick={() => { if (directionRef.current.y === 0) setDirection({ x: 0, y: -1 }); }}
          className="h-8 w-12 rounded-lg bg-black/30 border border-white/10 hover:bg-black/50 text-xs font-bold text-white/80 transition"
        >
          ▲
        </button>
        <div className="flex gap-1">
          <button
            onClick={() => { if (directionRef.current.x === 0) setDirection({ x: -1, y: 0 }); }}
            className="h-8 w-12 rounded-lg bg-black/30 border border-white/10 hover:bg-black/50 text-xs font-bold text-white/80 transition"
          >
            ◀
          </button>
          <button
            onClick={() => { if (directionRef.current.y === 0) setDirection({ x: 0, y: 1 }); }}
            className="h-8 w-12 rounded-lg bg-black/30 border border-white/10 hover:bg-black/50 text-xs font-bold text-white/80 transition"
          >
            ▼
          </button>
          <button
            onClick={() => { if (directionRef.current.x === 0) setDirection({ x: 1, y: 0 }); }}
            className="h-8 w-12 rounded-lg bg-black/30 border border-white/10 hover:bg-black/50 text-xs font-bold text-white/80 transition"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}
