import * as THREE from "three";

/**
 * Procedural texture generators for authentic Gather.town style architectural office aesthetics.
 * Creates crisp, zero-network-latency, high-performance CanvasTextures for Three.js.
 */

// Cached singletons to prevent texture recreation on re-renders
let cachedWoodFloor: THREE.CanvasTexture | null = null;
let cachedCheckeredTile: THREE.CanvasTexture | null = null;
let cachedHerringboneFloor: THREE.CanvasTexture | null = null;
let cachedWovenCarpetNavy: THREE.CanvasTexture | null = null;
let cachedWovenCarpetGreen: THREE.CanvasTexture | null = null;
let cachedWovenCarpetWarm: THREE.CanvasTexture | null = null;
let cachedTravertinePromenade: THREE.CanvasTexture | null = null;
let cachedCodeScreen: THREE.CanvasTexture | null = null;
let cachedDashboardScreen: THREE.CanvasTexture | null = null;
let cachedDesignScreen: THREE.CanvasTexture | null = null;

/**
 * 1. Warm Oak Hardwood Planks (The classic Gather.town office floor)
 * Detailed staggered horizontal planks with subtle grain, slight plank-to-plank tone variation, and beveled seams.
 */
export function getWoodFloorTexture(): THREE.CanvasTexture {
  if (cachedWoodFloor) return cachedWoodFloor;
  if (typeof document === "undefined") return new THREE.CanvasTexture(new ImageData(1, 1));

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Base warm golden honey oak tone
  ctx.fillStyle = "#dfc8a7";
  ctx.fillRect(0, 0, 1024, 1024);

  const plankHeight = 64; // 16 horizontal courses
  const courses = 1024 / plankHeight;

  // Natural warm wood tones
  const plankTones = [
    "#dec39f",
    "#e2caa8",
    "#d8be97",
    "#e5cead",
    "#d4b890",
    "#dfc6a3",
    "#ebd4b4",
    "#dac09b",
  ];

  for (let c = 0; c < courses; c++) {
    const y = c * plankHeight;
    // Stagger plank end joints every course
    const offset = (c * 347) % 512;
    const plankLengths = [256, 384, 512, 320, 448];

    let x = -offset;
    let pIdx = 0;
    while (x < 1024 + 512) {
      const len = plankLengths[pIdx % plankLengths.length];
      const tone = plankTones[(c * 3 + pIdx) % plankTones.length];

      ctx.fillStyle = tone;
      ctx.fillRect(Math.max(0, x), y, Math.min(len - 2, 1024 - x), plankHeight - 2);

      // Subtle natural woodgrain lines within the plank
      ctx.fillStyle = "rgba(140, 105, 65, 0.07)";
      for (let g = 0; g < 4; g++) {
        const gy = y + 8 + g * 13;
        ctx.fillRect(Math.max(0, x + 4), gy, Math.min(len - 10, 1024 - x), 1.5);
      }

      // Vertical plank butt joint seam
      ctx.fillStyle = "#b49876";
      ctx.fillRect(x + len - 2, y, 2, plankHeight);

      x += len;
      pIdx++;
    }

    // Horizontal groove seam between plank courses
    ctx.fillStyle = "#ad906e";
    ctx.fillRect(0, y + plankHeight - 2, 1024, 2);
  }

  // Subtle ambient noise / varnish sheen
  ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
  for (let i = 0; i < 2000; i++) {
    const rx = Math.random() * 1024;
    const ry = Math.random() * 1024;
    ctx.fillRect(rx, ry, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 5); // 8x5 repeats across 30x19m
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  cachedWoodFloor = texture;
  return texture;
}

/**
 * 2. Gather.town Cozy Cafe / Pantry Checkered Ceramic Tile
 * Crisp retro bistro checkerboard (warm terracotta & off-white biscuit)
 */
export function getCheckeredTileTexture(): THREE.CanvasTexture {
  if (cachedCheckeredTile) return cachedCheckeredTile;
  if (typeof document === "undefined") return new THREE.CanvasTexture(new ImageData(1, 1));

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  const tileSize = 64; // 8x8 checkerboard
  const colorA = "#ede4d5"; // Warm biscuit cream
  const colorB = "#8a4836"; // Warm Terracotta / Moroccan red

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const isA = (r + c) % 2 === 0;
      ctx.fillStyle = isA ? colorA : colorB;
      ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);

      // Tile surface bevel / 3D ceramic edge
      ctx.fillStyle = isA ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 255, 255, 0.15)";
      ctx.fillRect(c * tileSize, r * tileSize, tileSize - 1, 2);
      ctx.fillRect(c * tileSize, r * tileSize, 2, tileSize - 1);

      ctx.fillStyle = isA ? "rgba(0, 0, 0, 0.12)" : "rgba(0, 0, 0, 0.25)";
      ctx.fillRect(c * tileSize + tileSize - 2, r * tileSize, 2, tileSize);
      ctx.fillRect(c * tileSize, r * tileSize + tileSize - 2, tileSize, 2);
    }
  }

  // Dark grout lines
  ctx.strokeStyle = "#4d3228";
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += tileSize) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 3);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  cachedCheckeredTile = texture;
  return texture;
}

/**
 * 3. Woven Carpet Rug with Decorative Gather Border (Private Space Zones)
 */
export function getWovenCarpetTexture(variant: "navy" | "green" | "warm" = "navy"): THREE.CanvasTexture {
  if (variant === "navy" && cachedWovenCarpetNavy) return cachedWovenCarpetNavy;
  if (variant === "green" && cachedWovenCarpetGreen) return cachedWovenCarpetGreen;
  if (variant === "warm" && cachedWovenCarpetWarm) return cachedWovenCarpetWarm;
  if (typeof document === "undefined") return new THREE.CanvasTexture(new ImageData(1, 1));

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  let baseColor = "#2a3d45";
  let weaveColor = "#223138";
  let borderColor = "#c9a562";

  if (variant === "green") {
    baseColor = "#2e4a3b";
    weaveColor = "#23392d";
    borderColor = "#c8f560";
  } else if (variant === "warm") {
    baseColor = "#4a3528";
    weaveColor = "#3a281d";
    borderColor = "#e2b87d";
  }

  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 512, 512);

  // Micro woven loop-pile tweed texture
  ctx.fillStyle = weaveColor;
  for (let y = 0; y < 512; y += 8) {
    for (let x = 0; x < 512; x += 8) {
      if ((x / 8 + y / 8) % 2 === 0) {
        ctx.fillRect(x, y, 4, 4);
      }
    }
  }

  // Elegant woven border frame (signature Gather private space boundary)
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 10;
  ctx.strokeRect(16, 16, 480, 480);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 2;
  ctx.strokeRect(26, 26, 460, 460);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;

  if (variant === "navy") cachedWovenCarpetNavy = texture;
  else if (variant === "green") cachedWovenCarpetGreen = texture;
  else cachedWovenCarpetWarm = texture;

  return texture;
}

/**
 * 4. Polished Travertine / Terrazzo Promenade Tile
 */
export function getTravertinePromenadeTexture(): THREE.CanvasTexture {
  if (cachedTravertinePromenade) return cachedTravertinePromenade;
  if (typeof document === "undefined") return new THREE.CanvasTexture(new ImageData(1, 1));

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = "#ede5d8";
  ctx.fillRect(0, 0, 512, 512);

  // Terrazzo aggregate mineral flecks
  const fleckColors = ["#b09f8c", "#8c7d6c", "#d1c4b2", "#6e6052", "#988977"];
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = fleckColors[i % fleckColors.length];
    const fx = Math.random() * 512;
    const fy = Math.random() * 512;
    const size = 1 + Math.random() * 3.5;
    ctx.beginPath();
    ctx.arc(fx, fy, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle large square slab seams
  ctx.strokeStyle = "#cbbfae";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 256, 256);
  ctx.strokeRect(256, 0, 256, 256);
  ctx.strokeRect(0, 256, 256, 256);
  ctx.strokeRect(256, 256, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 8);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  cachedTravertinePromenade = texture;
  return texture;
}

/**
 * 5. Realistic Code Editor Screen Texture (VS Code Dark Theme)
 */
export function getCodeEditorTexture(): THREE.CanvasTexture {
  if (cachedCodeScreen) return cachedCodeScreen;
  if (typeof document === "undefined") return new THREE.CanvasTexture(new ImageData(1, 1));

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // VS Code background
  ctx.fillStyle = "#181a1f";
  ctx.fillRect(0, 0, 512, 320);

  // Left sidebar activity bar
  ctx.fillStyle = "#121417";
  ctx.fillRect(0, 0, 36, 320);

  // Top tab bar
  ctx.fillStyle = "#1e2227";
  ctx.fillRect(36, 0, 476, 32);

  // Active tab pill
  ctx.fillStyle = "#181a1f";
  ctx.fillRect(36, 0, 140, 32);
  ctx.fillStyle = "#61afef";
  ctx.fillRect(36, 0, 140, 2);

  ctx.fillStyle = "#abb2bf";
  ctx.font = "bold 11px monospace";
  ctx.fillText("OfficeCanvas.tsx", 54, 20);

  // Line numbers gutter
  ctx.fillStyle = "#495162";
  ctx.font = "10px monospace";
  for (let l = 1; l <= 14; l++) {
    ctx.fillText(String(l).padStart(2, " "), 44, 38 + l * 18);
  }

  // Realistic syntax highlighted code lines
  const codeLines = [
    { indent: 0, text: "export function VirtualOffice() {", color: "#c678dd" },
    { indent: 2, text: "const player = useOfficeStore();", color: "#61afef" },
    { indent: 2, text: "const [connected, setConnected] = useState(true);", color: "#e5c07b" },
    { indent: 2, text: "useEffect(() => {", color: "#c678dd" },
    { indent: 4, text: "initializeSpatialAudio({ range: 3.0 });", color: "#98c379" },
    { indent: 4, text: "return () => disconnectAudio();", color: "#abb2bf" },
    { indent: 2, text: "}, []);", color: "#c678dd" },
    { indent: 2, text: "return (", color: "#c678dd" },
    { indent: 4, text: "<Canvas camera={{ fov: 45 }}>", color: "#e06c75" },
    { indent: 6, text: "<GatherOfficeEnvironment />", color: "#e5c07b" },
    { indent: 6, text: "<SpatialAudioRadar />", color: "#e5c07b" },
    { indent: 4, text: "</Canvas>", color: "#e06c75" },
    { indent: 2, text: ");", color: "#abb2bf" },
    { indent: 0, text: "}", color: "#c678dd" },
  ];

  codeLines.forEach((line, idx) => {
    ctx.fillStyle = line.color;
    ctx.font = "11px monospace";
    ctx.fillText(line.text, 70 + line.indent * 8, 56 + idx * 18);
  });

  const texture = new THREE.CanvasTexture(canvas);
  cachedCodeScreen = texture;
  return texture;
}

/**
 * 6. Product Analytics Dashboard Screen Texture
 */
export function getDashboardScreenTexture(): THREE.CanvasTexture {
  if (cachedDashboardScreen) return cachedDashboardScreen;
  if (typeof document === "undefined") return new THREE.CanvasTexture(new ImageData(1, 1));

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, 512, 320);

  // Top header bar
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 0, 512, 38);

  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("CREWVILLA STARTUP OS — LIVE TELEMETRY", 16, 24);

  // Status badge
  ctx.fillStyle = "rgba(74, 222, 128, 0.2)";
  ctx.fillRect(380, 8, 116, 22);
  ctx.fillStyle = "#4ade80";
  ctx.font = "bold 10px monospace";
  ctx.fillText("● 99.98% HEALTH", 392, 23);

  // KPI Metric Cards
  const kpis = [
    { title: "ACTIVE TEAMMATES", val: "14", change: "+4 online", color: "#38bdf8" },
    { title: "SPRINT VELOCITY", val: "94.2%", change: "+12% this wk", color: "#4ade80" },
    { title: "COMMITS SHIPPED", val: "48", change: "28 merged", color: "#f472b6" },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 16 + idx * 164;
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x, 48, 154, 76);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "9px sans-serif";
    ctx.fillText(kpi.title, x + 12, 66);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(kpi.val, x + 12, 96);

    ctx.fillStyle = kpi.color;
    ctx.font = "10px sans-serif";
    ctx.fillText(kpi.change, x + 12, 114);
  });

  // Main Bar Chart
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(16, 136, 480, 168);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("TEAM HOURLY OPERATING RHYTHM (FOCUS vs CALLS)", 28, 156);

  const bars = [45, 62, 85, 98, 110, 84, 92, 125, 140, 115, 95, 78];
  bars.forEach((height, i) => {
    const bx = 42 + i * 36;
    const by = 284 - height;

    // Gradient bar
    const barGrad = ctx.createLinearGradient(0, by, 0, 284);
    barGrad.addColorStop(0, "#38bdf8");
    barGrad.addColorStop(1, "#0284c7");
    ctx.fillStyle = barGrad;
    ctx.fillRect(bx, by, 22, height);

    ctx.fillStyle = "#64748b";
    ctx.font = "9px monospace";
    ctx.fillText(`${9 + i}h`, bx + 2, 298);
  });

  const texture = new THREE.CanvasTexture(canvas);
  cachedDashboardScreen = texture;
  return texture;
}

/**
 * 7. Bookshelf Spine Texture (Colorful realistic book spines for the library wall)
 */
export function getBookshelfSpineTexture(): THREE.CanvasTexture {
  if (typeof document === "undefined") return new THREE.CanvasTexture(new ImageData(1, 1));

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = "#261a12";
  ctx.fillRect(0, 0, 512, 256);

  const spineColors = [
    "#b83a28", // Brick red
    "#234e52", // Deep teal
    "#315641", // Forest
    "#d97706", // Amber
    "#1e3a8a", // Navy
    "#4c1d95", // Purple
    "#374151", // Charcoal
    "#854d0e", // Ochre
    "#991b1b", // Crimson
    "#065f46", // Emerald
  ];

  for (let shelf = 0; shelf < 3; shelf++) {
    const sy = shelf * 84 + 8;
    let sx = 12;
    while (sx < 500) {
      const bookWidth = 10 + (sx * 7) % 18;
      const bookHeight = 60 + ((sx + shelf) * 11) % 16;
      const color = spineColors[(sx * 3 + shelf) % spineColors.length];

      ctx.fillStyle = color;
      ctx.fillRect(sx, sy + (76 - bookHeight), bookWidth, bookHeight);

      // Gold spine lettering line
      ctx.fillStyle = "rgba(255, 230, 160, 0.4)";
      ctx.fillRect(sx + 2, sy + (76 - bookHeight) + 8, bookWidth - 4, 2);
      ctx.fillRect(sx + 3, sy + (76 - bookHeight) + 14, bookWidth - 6, 1.5);

      sx += bookWidth + 2;
    }

    // Wooden shelf ledge
    ctx.fillStyle = "#543721";
    ctx.fillRect(0, sy + 76, 512, 8);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  return texture;
}
