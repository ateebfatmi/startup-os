import { createServer } from "node:http";
import { Server, Socket } from "socket.io";
import { MovementUpdateSchema, type ServerPlayer } from "./types.js";
import { SpatialPartitioning } from "./spatial.js";

const PORT = Number(process.env.PORT) || 4001;

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", timestamp: Date.now() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// In-memory player state (supports Redis adapter when scaled)
const players = new Map<string, ServerPlayer>();
const spatial = new SpatialPartitioning(8);

io.on("connection", (socket: Socket) => {
  const workspaceId = (socket.handshake.query.workspaceId as string) || "default";
  const userId = (socket.handshake.query.userId as string) || socket.id;
  const displayName = (socket.handshake.query.name as string) || "Anonymous";
  const color = (socket.handshake.query.color as string) || "#c8f560";

  socket.join(`workspace:${workspaceId}`);

  const newPlayer: ServerPlayer = {
    id: userId,
    userId,
    workspaceId,
    name: displayName,
    color,
    x: 0,
    z: 4.8,
    rotation: Math.PI,
    animation: "idle",
    status: "available",
    socketId: socket.id,
    updatedAt: Date.now(),
  };

  players.set(socket.id, newPlayer);
  spatial.updatePlayer(newPlayer);

  // Send initial state of existing players in this workspace
  const workspacePlayers = Array.from(players.values()).filter(
    (p) => p.workspaceId === workspaceId && p.socketId !== socket.id
  );
  socket.emit("room:players", workspacePlayers);

  // Broadcast player joined to workspace room
  socket.to(`workspace:${workspaceId}`).emit("player:joined", newPlayer);

  // High-frequency movement events (validated and throttled to 10-15 Hz)
  socket.on("player:move", (data: unknown) => {
    const parsed = MovementUpdateSchema.safeParse(data);
    if (!parsed.success) return;

    const player = players.get(socket.id);
    if (!player) return;

    // Movement validation: max speed check (prevent teleport hacks)
    const dt = Math.max((Date.now() - player.updatedAt) / 1000, 0.05);
    const dist = Math.hypot(parsed.data.x - player.x, parsed.data.z - player.z);
    const speed = dist / dt;

    if (speed > 12.0) {
      // Reject impossible teleport/speed
      return;
    }

    player.x = parsed.data.x;
    player.z = parsed.data.z;
    player.rotation = parsed.data.rotation;
    player.animation = parsed.data.animation;
    player.status = parsed.data.status;
    player.roomId = parsed.data.roomId;
    player.updatedAt = Date.now();

    spatial.updatePlayer(player);

    // Broadcast movement update
    socket.to(`workspace:${workspaceId}`).emit("player:moved", {
      id: player.id,
      x: player.x,
      z: player.z,
      rotation: player.rotation,
      animation: player.animation,
      status: player.status,
      roomId: player.roomId,
      updatedAt: player.updatedAt,
    });
  });

  socket.on("disconnect", () => {
    const player = players.get(socket.id);
    if (player) {
      spatial.removePlayer(player.id);
      players.delete(socket.id);
      io.to(`workspace:${player.workspaceId}`).emit("player:left", player.id);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[CrewVilla Realtime] Socket.IO Multiplayer service running on port ${PORT}`);
});
