// server/index.js — TroxT EtherWorld v3.0
// Intègre Scene-Creator + 16 agents + GameWorld
import express from "express";
import { createServer } from "http";
import { Server as SocketIO } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { brain } from "./core/TroxTBrain.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const http = createServer(app);
const io   = new SocketIO(http, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../dist")));

// ── Routes API ──────────────────────────────────────
// Santé
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    server: "TroxT EtherWorld",
    version: "3.0.0",
    agents: brain.getStatus().agentCount,
    timestamp: Date.now()
  });
});

// Brain
app.get("/api/brain/status", async (req, res) => {
  try { res.json(brain.getStatus()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/brain/process", async (req, res) => {
  try {
    const { mission, data } = req.body;
    const result = await brain.process(mission, data);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/brain/forge", async (req, res) => {
  try {
    const result = await brain.callAgent("etherForge", "forge", req.body);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Importer les routes Scene-Creator
const { default: gameRoutes  } = await import("./routes/game.js");
// agentRoutes désactivé temporairement

app.use("/api/game",  gameRoutes);
// app.use("/api/agent", agentRoutes);

const { default: labRoutes } = await import("./routes/lab.js");
app.use("/api", labRoutes);

// Fallback SPA
app.get("*", (req, res) => {
  const indexPath = path.join(__dirname, "../dist/index.html");
  res.sendFile(indexPath, (err) => {
    if (err) res.status(200).send(`
      <html><body style="background:#050810;color:#fff;font-family:monospace;padding:40px">
        <h1>🌐 TroxT EtherWorld Server v3.0</h1>
        <p>✅ 16 Agents ONLINE</p>
        <p>🔗 API: <a href="/api/health" style="color:#7b6fff">/api/health</a></p>
        <p>🧠 Brain: <a href="/api/brain/status" style="color:#7b6fff">/api/brain/status</a></p>
        <p>🎮 Game: <a href="/api/game/state" style="color:#7b6fff">/api/game/state</a></p>
        <p>⚡ Agents: <a href="/api/agent" style="color:#7b6fff">/api/agent</a></p>
      </body></html>
    `);
  });
});

// ── Socket.IO ───────────────────────────────────────
// World state partagé
const worldState = {
  name:      "TroxT EtherWorld",
  version:   "3.0.0",
  platforms: [],
  props:     [],
  players:   {},
  gangs:     new Map(),
  updatedAt: Date.now()
};

// Broadcast helper
const broadcast = (event) => io.emit("world:event", event);

io.on("connection", (socket) => {
  const clientId = socket.id.slice(0, 8);
  console.log(`[Socket] ✅ Client connecté: ${clientId}`);

  // Envoyer l'état du monde au nouveau client
  socket.emit("world:state", {
    platforms: worldState.platforms,
    props:     worldState.props,
    players:   Object.values(worldState.players),
    name:      worldState.name
  });

  // Joueur rejoint
  socket.on("player:join", (data) => {
    const player = {
      id:       socket.id,
      name:     data.name || `Player_${clientId}`,
      position: [0, 1, 0],
      rotation: [0, 0, 0],
      gang:     null,
      joinedAt: Date.now()
    };
    worldState.players[socket.id] = player;
    broadcast({ type: "player_joined", player });
    console.log(`[Socket] 👤 ${player.name} a rejoint`);
  });

  // Mouvement joueur
  socket.on("player:move", (data) => {
    if (worldState.players[socket.id]) {
      worldState.players[socket.id].position = data.position;
      worldState.players[socket.id].rotation = data.rotation;
      socket.broadcast.emit("player:moved", { id: socket.id, ...data });
    }
  });

  // Chat
  socket.on("chat:message", async (data, cb) => {
    const player = worldState.players[socket.id];
    const msg = {
      type:     "chat",
      playerId: socket.id,
      name:     player?.name || "Anonyme",
      message:  data.message,
      at:       Date.now()
    };
    broadcast(msg);
    if (cb) cb({ ok: true });
  });

  // Brain process via Socket
  socket.on("brain:process", async (data, cb) => {
    try {
      const result = await brain.process(data.mission, data.payload || {});
      if (cb) cb({ success: true, result });
      socket.emit("brain:result", result);
    } catch (err) {
      if (cb) cb({ success: false, error: err.message });
    }
  });

  // Spawner un prop
  socket.on("world:spawn", async (data, cb) => {
    const prop = {
      id:       `prop_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      type:     data.type || "cube",
      name:     data.name || "Prop",
      position: data.position || [0, 1, 0],
      color:    data.color || "#00e5ff",
      spawnedBy: socket.id,
      at:       Date.now()
    };
    worldState.props.push(prop);
    broadcast({ type: "prop_spawned", prop });
    if (cb) cb({ ok: true, prop });
  });

  // Créer plateforme
  socket.on("world:platform", (data, cb) => {
    const platform = {
      id:       `plat_${Date.now()}`,
      ...data,
      createdBy: socket.id,
      at:        Date.now()
    };
    worldState.platforms.push(platform);
    broadcast({ type: "platform_created", platform });
    if (cb) cb({ ok: true, platform });
  });

  // Rejoindre gang
  socket.on("gang:join", (data, cb) => {
    if (worldState.players[socket.id]) {
      worldState.players[socket.id].gang = data.gangId;
      broadcast({ type: "player_gang_changed", playerId: socket.id, gangId: data.gangId });
    }
    if (cb) cb({ ok: true });
  });

  // Déconnexion
  socket.on("disconnect", () => {
    const player = worldState.players[socket.id];
    if (player) {
      delete worldState.players[socket.id];
      broadcast({ type: "player_left", playerId: socket.id, name: player.name });
    }
    console.log(`[Socket] ❌ Client déconnecté: ${clientId}`);
  });
});

// ── Démarrage ───────────────────────────────────────
async function start() {
  try {
    await brain.init();

    // Audit de démarrage
    brain.agents.auditTrail?.record("server_start", "system", { port: PORT, agents: 16 }, "INFO");

    http.listen(PORT, () => {
      console.log("");
      console.log("╔══════════════════════════════════════════╗");
      console.log("║   🌐 TroxT EtherWorld Server v3.0        ║");
      console.log(`║   Port: ${PORT}  ✅ ONLINE                  ║`);
      console.log("║   Agents: 16 chargés                     ║");
      console.log("║   Scene-Creator: ✅ Intégré               ║");
      console.log("╚══════════════════════════════════════════╝");
      console.log("");
      console.log("  📡 API:    http://localhost:" + PORT + "/api/health");
      console.log("  🧠 Brain:  http://localhost:" + PORT + "/api/brain/status");
      console.log("  🎮 Game:   http://localhost:" + PORT + "/api/game/state");
      console.log("  ⚡ Agents: http://localhost:" + PORT + "/api/agent");
      console.log("");
    });
  } catch (err) {
    console.error("[Server] ❌ Erreur au démarrage:", err);
    process.exit(1);
  }
}

start();

