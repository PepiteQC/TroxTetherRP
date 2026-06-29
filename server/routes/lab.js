// Routes NodeJS Lab — Télémétrie, snippets, tâches, exécution
import express from "express";

const router = express.Router();

// Store in-memory (en prod, remplacer par une base)
const snippets = [];
const tasks = [];
const executions = [];

let nextSnippetsId = 1;
let nextTaskId = 1;
let nextExecId = 1;

// ── Code Execution ──────────────────────────────────
router.post("/lab/execute", (req, res) => {
  const { code, language, timeout = 5000 } = req.body;
  const start = Date.now();
  let output = "";
  let error = null;
  let success = true;

  try {
    // Exécution sécurisée via vm
    const vm = require("vm");
    const sandbox = {
      console: {
        log: (...args) => { output += args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(" ") + "\n"; },
        error: (...args) => { output += "[ERROR] " + args.join(" ") + "\n"; },
        warn: (...args) => { output += "[WARN] " + args.join(" ") + "\n"; },
      },
      setTimeout: setTimeout,
      Date: Date,
      Math: Math,
      JSON: JSON,
    };
    if (timeout > 30000) throw new Error("Timeout max: 30s");
    const context = vm.createContext(sandbox);
    vm.runInContext(code, context, { timeout: Math.min(timeout, 30000) });
  } catch (err) {
    error = err.message;
    success = false;
    output = error;
  }

  const duration = Date.now() - start;
  const result = {
    id: "exec_" + (nextExecId++),
    code,
    language,
    output: output || (success ? "Execution completed." : ""),
    error,
    success,
    duration,
    timestamp: Date.now(),
  };

  executions.unshift(result);
  if (executions.length > 100) executions.length = 100;

  res.json(result);
});

// ── Stats ───────────────────────────────────────────
router.get("/lab/stats", (req, res) => {
  const total = executions.length;
  const successCount = executions.filter(e => e.success).length;
  const totalDuration = executions.reduce((s, e) => s + e.duration, 0);

  res.json({
    totalSnippets: snippets.length,
    totalExecutions: total,
    successRate: total > 0 ? Math.round((successCount / total) * 100) : 100,
    avgDuration: total > 0 ? Math.round(totalDuration / total) : 0,
    recentExecutions: executions.slice(0, 20),
  });
});

// ── Snippets CRUD ───────────────────────────────────
router.get("/snippets", (req, res) => {
  res.json(snippets);
});

router.get("/snippets/:id", (req, res) => {
  const snippet = snippets.find(s => s.id === req.params.id);
  if (!snippet) return res.status(404).json({ error: "Snippet not found" });
  res.json(snippet);
});

router.post("/snippets", (req, res) => {
  const { title, code, language, tags } = req.body;
  const snippet = {
    id: "snp_" + (nextSnippetsId++),
    title: title || "Untitled",
    code: code || "",
    language: language || "javascript",
    tags: tags || [],
    createdAt: new Date().toISOString(),
  };
  snippets.unshift(snippet);
  res.status(201).json(snippet);
});

router.delete("/snippets/:id", (req, res) => {
  const idx = snippets.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Snippet not found" });
  snippets.splice(idx, 1);
  res.json({ ok: true });
});

// ── Tasks CRUD ──────────────────────────────────────
router.get("/tasks", (req, res) => {
  let filtered = [...tasks];
  if (req.query.agent && req.query.agent !== "all")
    filtered = filtered.filter(t => t.agentId === req.query.agent);
  if (req.query.status && req.query.status !== "all")
    filtered = filtered.filter(t => t.status === req.query.status);
  res.json(filtered);
});

router.post("/tasks", (req, res) => {
  const { agentId, title, mission, priority, context, input, expectedOutput, rules, dependencies } = req.body;
  const task = {
    id: "task_" + (nextTaskId++),
    agentId: agentId || "unknown",
    agentName: agentId ? agentId.charAt(0).toUpperCase() + agentId.slice(1) : "Unknown",
    title: title || "Untitled Task",
    mission: mission || "",
    priority: priority || "normal",
    status: "pending",
    context: context || "",
    input: input || "",
    expectedOutput: expectedOutput || "",
    rules: rules || [],
    dependencies: dependencies || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.unshift(task);
  res.status(201).json(task);
});

router.patch("/tasks/:id", (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  Object.assign(task, req.body, { updatedAt: new Date().toISOString() });
  res.json(task);
});

router.delete("/tasks/:id", (req, res) => {
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Task not found" });
  tasks.splice(idx, 1);
  res.json({ ok: true });
});

export default router;
