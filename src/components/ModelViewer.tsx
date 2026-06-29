import React, { useMemo, useState } from "react";

type ModelViewerProps = {
  title?: string;
  modelUrl?: string;
  className?: string;
  onClose?: () => void;
};

const DEFAULT_MODELS = [
  { id: "character", name: "Personnage RP", type: "Character", status: "Ready", url: "/models/character.glb" },
  { id: "vehicle", name: "Véhicule test", type: "Vehicle", status: "Local", url: "/models/vehicle.glb" },
  { id: "building", name: "Bâtiment modulaire", type: "Environment", status: "Draft", url: "/models/building.glb" },
];

export function ModelViewer({ title = "Model Viewer", modelUrl, className, onClose }: ModelViewerProps) {
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODELS[0]?.id ?? "");
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const selectedModel = useMemo(() => DEFAULT_MODELS.find(m => m.id === selectedModelId) ?? DEFAULT_MODELS[0], [selectedModelId]);
  const currentUrl = modelUrl || selectedModel?.url || "";

  return (
    <section className={className} style={styles.shell}>
      <header style={styles.header}>
        <div>
          <p style={styles.kicker}>TroxT 3D Pipeline</p>
          <h2 style={styles.title}>{title}</h2>
          <p style={styles.subtitle}>Visualiseur local pour préparer les modèles GLB/GLTF.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button type="button" onClick={() => setRotationEnabled(v => !v)} style={styles.secondaryButton}>
            {rotationEnabled ? "Rotation ON" : "Rotation OFF"}
          </button>
          {onClose && <button type="button" onClick={onClose} style={styles.closeButton}>Fermer</button>}
        </div>
      </header>

      <div style={styles.layout}>
        <aside style={styles.sidebar}>
          <h3 style={{ margin: "0 0 12px", fontSize: "16px" }}>Modèles</h3>
          <div style={{ display: "grid", gap: "10px" }}>
            {DEFAULT_MODELS.map(model => (
              <button key={model.id} type="button" onClick={() => setSelectedModelId(model.id)}
                style={{ ...styles.modelButton, borderColor: selectedModelId === model.id ? "rgba(0,212,255,0.65)" : "rgba(255,255,255,0.1)", background: selectedModelId === model.id ? "rgba(0,212,255,0.12)" : "rgba(15,23,42,0.78)" }}>
                <span style={{ fontWeight: 800 }}>{model.name}</span>
                <span style={{ color: "#94a3b8", fontSize: "12px" }}>{model.type} · {model.status}</span>
              </button>
            ))}
          </div>
        </aside>

        <main style={styles.viewer}>
          <div style={styles.viewport}>
            <div style={{ ...styles.previewObject, animation: rotationEnabled ? "troxtSpin 6s linear infinite" : "none" }}>
              <div style={styles.cubeFace}>GLB</div>
            </div>
            <style>{`@keyframes troxtSpin { from { transform: rotateX(58deg) rotateZ(0deg); } to { transform: rotateX(58deg) rotateZ(360deg); } }`}</style>
          </div>
          <div style={styles.infoBar}>
            <div><span style={styles.infoLabel}>Asset actif</span><strong>{selectedModel?.name}</strong></div>
            <div><span style={styles.infoLabel}>Chemin</span><code style={{ color: "#7dd3fc", fontSize: "12px" }}>{currentUrl}</code></div>
          </div>
        </main>
      </div>
    </section>
  );
}

export default ModelViewer;

const styles: Record<string, React.CSSProperties> = {
  shell: { width: "100%", padding: "24px", color: "#f8fafc", background: "radial-gradient(circle at top left, rgba(0,212,255,0.14), transparent 34%), #050816", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "18px" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "18px", marginBottom: "22px" },
  kicker: { margin: 0, fontSize: "12px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#00d4ff", fontWeight: 800 },
  title: { margin: "6px 0", fontSize: "28px" },
  subtitle: { margin: 0, color: "#94a3b8" },
  secondaryButton: { border: "1px solid rgba(0,212,255,0.35)", background: "rgba(0,212,255,0.1)", color: "#7dd3fc", borderRadius: "999px", padding: "9px 13px", cursor: "pointer", fontWeight: 800 },
  closeButton: { border: "1px solid rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.1)", color: "#fca5a5", borderRadius: "999px", padding: "9px 13px", cursor: "pointer", fontWeight: 800 },
  layout: { display: "grid", gridTemplateColumns: "280px 1fr", gap: "16px" },
  sidebar: { borderRadius: "16px", padding: "16px", background: "rgba(15,23,42,0.78)", border: "1px solid rgba(255,255,255,0.1)" },
  modelButton: { display: "grid", gap: "4px", width: "100%", textAlign: "left", padding: "13px", borderRadius: "13px", color: "#f8fafc", cursor: "pointer", border: "1px solid" },
  viewer: { minHeight: "460px", display: "grid", gridTemplateRows: "1fr auto", borderRadius: "16px", overflow: "hidden", background: "rgba(2,6,23,0.82)", border: "1px solid rgba(255,255,255,0.1)" },
  viewport: { display: "grid", placeItems: "center", minHeight: "380px" },
  previewObject: { width: "150px", height: "150px", transform: "rotateX(58deg) rotateZ(35deg)", borderRadius: "24px", background: "linear-gradient(135deg, rgba(0,212,255,0.95), rgba(255,215,0,0.75))", position: "relative" },
  cubeFace: { position: "absolute", inset: "18px", display: "grid", placeItems: "center", borderRadius: "18px", background: "rgba(2,6,23,0.55)", color: "#fff", fontWeight: 900, letterSpacing: "0.18em" },
  infoBar: { display: "grid", gridTemplateColumns: "220px 1fr", gap: "12px", padding: "14px", background: "rgba(15,23,42,0.9)", borderTop: "1px solid rgba(255,255,255,0.1)" },
  infoLabel: { display: "block", marginBottom: "4px", color: "#94a3b8", fontSize: "11px", textTransform: "uppercase" },
};
