// server/routes/game.js
// Routes GameWorld — importées depuis Scene-Creator
import express from "express";
import { brain } from "../core/TroxTBrain.js";

const router = express.Router();

// État du monde
router.get("/state", async (req, res) => {
  try {
    const result = await brain.callAgent("etherSim", "process", { mission: "get_world_state" });
    res.json({ ok: true, world: result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Générer monde
router.post("/generate", async (req, res) => {
  try {
    const { seed, theme, style, count } = req.body;
    const result = await brain.callAgent("etherForge", "forge", { seed, theme, style, count });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Simuler joueurs
router.post("/simulate", async (req, res) => {
  try {
    const { players = 50, scenario = "roleplay", duration = 3000 } = req.body;
    const result = await brain.callAgent("etherSim", "simulate", players, scenario, duration);
    res.json({ ok: true, simulation: result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Créer items gang
router.post("/items/generate", async (req, res) => {
  try {
    const { count = 50, type = "weapon", theme = "street" } = req.body;
    const result = await brain.callAgent("forgeFactory", "generateItems", count, type, theme);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Pack gang complet
router.post("/gang/pack", async (req, res) => {
  try {
    const { gangName, gangStyle = "street" } = req.body;
    const result = await brain.callAgent("forgeFactory", "generateGangPack", gangName, gangStyle);
    res.json({ ok: true, pack: result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Variantes de gang (EtherPrism)
router.post("/gang/variants", async (req, res) => {
  try {
    const config = req.body;
    const result = await brain.callAgent("etherPrism", "createGangVariants", config);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// HUD territoire (EtherUI)
router.post("/hud/territory", async (req, res) => {
  try {
    const config = req.body;
    const result = await brain.callAgent("etherUI", "generateTerritoryHUD", config);
    res.json({ ok: true, hud: result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Connecter systèmes (EtherWeave)
router.post("/weave", async (req, res) => {
  try {
    const { gangId, econId, territoryId } = req.body;
    const result = await brain.callAgent("etherWeave", "weaveGangEcoTerritory", gangId, econId, territoryId);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Audit trail
router.get("/audit", async (req, res) => {
  try {
    const entries = await brain.callAgent("auditTrail", "getLast", 50);
    res.json({ ok: true, entries });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ThirdEye status
router.get("/security/status", async (req, res) => {
  try {
    const status = await brain.callAgent("thirdEye", "getStatus");
    const alerts = await brain.callAgent("thirdEye", "getAlerts", 20);
    res.json({ ok: true, status, alerts });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Memory
router.get("/memory", async (req, res) => {
  try {
    const recent = await brain.callAgent("etherMemory", "recent", 30);
    const stats  = await brain.callAgent("etherMemory", "getStats");
    res.json({ ok: true, recent, stats });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
