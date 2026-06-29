import React, { useState } from "react";

const TABS = [
  { id: "home",      label: "🏠 Home" },
  { id: "agents",    label: "🧠 Agents" },
  { id: "smart",     label: "🏡 Smart House" },
  { id: "model",     label: "📦 Model Viewer" },
  { id: "photo3d",   label: "📸 Photo → 3D" },
  { id: "autonomous",label: "⚡ Autonomous" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div style={styles.root}>
      <nav style={styles.nav}>
        <div style={styles.navBrand}>
          <span style={styles.brandDot} />
          TroxT EtherWorld
        </div>
        <div style={styles.navTabs}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.navButton,
                background: activeTab === tab.id ? "rgba(0,212,255,0.15)" : "transparent",
                color: activeTab === tab.id ? "#00d4ff" : "#94a3b8",
                borderColor: activeTab === tab.id ? "rgba(0,212,255,0.4)" : "transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={styles.navStatus}>
          <span style={styles.statusDot} />
          v3.0.0 ONLINE
        </div>
      </nav>

      <main style={styles.main}>
        {activeTab === "home" && <HomePage />}
        {activeTab === "agents" && <AgentsPage />}
        {activeTab === "smart" && <SmartPage />}
        {activeTab === "model" && <ModelPage />}
        {activeTab === "photo3d" && <Photo3DPage />}
        {activeTab === "autonomous" && <AutonomousPage />}
      </main>
    </div>
  );
}

function HomePage() {
  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <p style={styles.kicker}>TroxT EtherWorld v3.0</p>
        <h1 style={styles.heroTitle}>🌐 EtherWorld Platform</h1>
        <p style={styles.heroSub}>
          16 agents IA actifs · Smart House · 3D Pipeline · Blockchain
        </p>
        <div style={styles.heroGrid}>
          {[
            { icon: "🧠", label: "Agents IA", value: "16 actifs" },
            { icon: "🟢", label: "Serveur", value: "Port 3001" },
            { icon: "⚡", label: "Vite", value: "Port 5173" },
            { icon: "🛡️", label: "ThirdEye", value: "Score 100" },
          ].map(card => (
            <div key={card.label} style={styles.heroCard}>
              <span style={{ fontSize: "28px" }}>{card.icon}</span>
              <strong style={{ fontSize: "18px", display: "block", margin: "8px 0 4px" }}>{card.value}</strong>
              <span style={{ color: "#94a3b8", fontSize: "13px" }}>{card.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AgentsPage() {
  const agents = [
    "EtherForge","EtherGuard","EtherLens","EtherPrism",
    "EtherWeave","EtherUI","EtherSim","EtherMemory",
    "ForgeFactory","EtherDeploy","EtherCore","DiamondIdentity",
    "ThirdEye","RiskPredictor","EvolutionEngine","AuditTrail"
  ];
  return (
    <div style={styles.page}>
      <h2 style={styles.pageTitle}>🧠 Agents TroxTBrain</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: "12px" }}>
        {agents.map(agent => (
          <div key={agent} style={styles.agentCard}>
            <span style={styles.agentDot} />
            <span style={{ fontWeight: 700 }}>{agent}</span>
            <span style={{ color: "#34d399", fontSize: "12px" }}>v2.0.0 · ACTIF</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SmartPage() {
  return (
    <div style={styles.page}>
      <h2 style={styles.pageTitle}>🏡 Smart House Simulator</h2>
      <p style={{ color: "#94a3b8" }}>Module Smart House chargé — composant disponible.</p>
    </div>
  );
}

function ModelPage() {
  return (
    <div style={styles.page}>
      <h2 style={styles.pageTitle}>📦 Model Viewer 3D</h2>
      <p style={{ color: "#94a3b8" }}>Pipeline 3D GLB/GLTF chargé.</p>
    </div>
  );
}

function Photo3DPage() {
  return (
    <div style={styles.page}>
      <h2 style={styles.pageTitle}>📸 Photo → 3D</h2>
      <p style={{ color: "#94a3b8" }}>Convertisseur image → mesh 3D.</p>
    </div>
  );
}

function AutonomousPage() {
  return (
    <div style={styles.page}>
      <h2 style={styles.pageTitle}>⚡ Agents Autonomes</h2>
      <p style={{ color: "#94a3b8" }}>Panneau de contrôle des agents autonomes.</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "#050816", color: "#f8fafc", fontFamily: "system-ui, sans-serif" },
  nav: { display: "flex", alignItems: "center", gap: "16px", padding: "0 24px", height: "60px", background: "rgba(15,23,42,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)", position: "sticky", top: 0, zIndex: 100 },
  navBrand: { display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, fontSize: "16px", color: "#00d4ff", whiteSpace: "nowrap" },
  brandDot: { width: "8px", height: "8px", borderRadius: "50%", background: "#00d4ff", boxShadow: "0 0 12px #00d4ff" },
  navTabs: { display: "flex", gap: "4px", flex: 1, justifyContent: "center" },
  navButton: { padding: "6px 14px", borderRadius: "8px", border: "1px solid transparent", cursor: "pointer", fontSize: "13px", fontWeight: 600, transition: "all 0.2s" },
  navStatus: { display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#34d399", whiteSpace: "nowrap" },
  statusDot: { width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399" },
  main: { padding: "32px 24px", maxWidth: "1400px", margin: "0 auto" },
  page: { width: "100%" },
  pageTitle: { margin: "0 0 24px", fontSize: "28px" },
  hero: { textAlign: "center", padding: "60px 0" },
  kicker: { margin: "0 0 12px", fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#00d4ff", fontWeight: 800 },
  heroTitle: { margin: "0 0 16px", fontSize: "48px", background: "linear-gradient(135deg, #00d4ff, #ffd700)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  heroSub: { margin: "0 0 40px", color: "#94a3b8", fontSize: "18px" },
  heroGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: "16px", maxWidth: "700px", margin: "0 auto" },
  heroCard: { padding: "24px", borderRadius: "16px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.1)", textAlign: "center" },
  agentCard: { display: "grid", gap: "4px", padding: "16px", borderRadius: "14px", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(255,255,255,0.08)" },
  agentDot: { width: "8px", height: "8px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399", marginBottom: "4px" },
};
