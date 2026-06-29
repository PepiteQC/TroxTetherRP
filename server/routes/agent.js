// server/routes/agent.js
import express from "express";
import { brain } from "../core/TroxTBrain.js";

const router = express.Router();

// Liste tous les agents
router.get("/", (req, res) => {
  const status = brain.getStatus();
  res.json({ ok: true, ...status });
});

// Status d'un agent spécifique
router.get("/:agentName/status", async (req, res) => {
  try {
    const { agentName } = req.params;
    const result = await brain.callAgent(agentName, "getStatus");
    res.json({ ok: true, agent: agentName, status: result });
  } catch (err) {
    res.status(404).json({ ok: false, error: err.message });
  }
});

// Appeler une méthode d'un agent
router.post("/:agentName/:method", async (req, res) => {
  try {
    const { agentName, method } = req.params;
    const params = req.body;

    // Sécurité ThirdEye
    const risk = await brain.callAgent("thirdEye", "assess", {
      type: `agent_call_${agentName}_${method}`,
      ...params
    });

    if (risk.blocked) {
      return res.status(403).json({ ok: false, blocked: true, risk });
    }

    const result = await brain.callAgent(agentName, method, params);
    res.json({ ok: true, agent: agentName, method, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
