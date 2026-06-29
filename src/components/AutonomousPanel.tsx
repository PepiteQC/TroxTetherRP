import React, { useState } from "react";

type AgentTask = { id: string; agent: string; task: string; status: "pending" | "running" | "done" | "error" };

const DEMO_TASKS: AgentTask[] = [
  { id: "1", agent: "EtherForge", task: "Générer un smart contract ERC-20", status: "done" },
  { id: "2", agent: "EtherGuard", task: "Audit de sécurité du contrat", status: "running" },
  { id: "3", agent: "RiskPredictor", task: "Analyse de risque DeFi", status: "pending" },
];

const STATUS_COLOR: Record<AgentTask["status"], string> = {
  pending: "#94a3b8", running: "#fbbf24", done: "#34d399", error: "#f87171"
};

export function AutonomousPanel() {
  const [tasks] = useState<AgentTask[]>(DEMO_TASKS);

  return (
    <section style={styles.shell}>
      <header style={styles.header}>
        <p style={styles.kicker}>TroxT Brain</p>
        <h2 style={styles.title}>Agents Autonomes</h2>
        <p style={styles.subtitle}>Vue en temps réel des tâches exécutées par les 16 agents IA.</p>
      </header>

      <div style={styles.taskList}>
        {tasks.map(task => (
          <div key={task.id} style={styles.taskCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, color: "#00d4ff" }}>{task.agent}</span>
              <span style={{ ...styles.badge, color: STATUS_COLOR[task.status], borderColor: STATUS_COLOR[task.status] }}>
                {task.status.toUpperCase()}
              </span>
            </div>
            <p style={{ margin: "8px 0 0", color: "#94a3b8", fontSize: "14px" }}>{task.task}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default AutonomousPanel;

const styles: Record<string, React.CSSProperties> = {
  shell: { width: "100%", padding: "24px", color: "#f8fafc", background: "#050816", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "18px" },
  header: { marginBottom: "22px" },
  kicker: { margin: 0, fontSize: "12px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#00d4ff", fontWeight: 800 },
  title: { margin: "6px 0", fontSize: "28px" },
  subtitle: { margin: 0, color: "#94a3b8" },
  taskList: { display: "grid", gap: "12px" },
  taskCard: { padding: "16px", borderRadius: "14px", background: "rgba(15,23,42,0.78)", border: "1px solid rgba(255,255,255,0.1)" },
  badge: { padding: "4px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 800, border: "1px solid" },
};
