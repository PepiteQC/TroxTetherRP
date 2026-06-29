import React, { useState } from "react";

export function PhotoTo3DPanel() {
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");

  return (
    <section style={styles.shell}>
      <header style={styles.header}>
        <p style={styles.kicker}>TroxT Vision</p>
        <h2 style={styles.title}>Photo → 3D</h2>
        <p style={styles.subtitle}>Convertis une image en mesh 3D utilisable dans EtherWorld.</p>
      </header>

      <div style={styles.dropzone}>
        <span style={{ fontSize: "40px" }}>📸</span>
        <p style={{ color: "#94a3b8", margin: "12px 0 0" }}>Glisse une image ici ou clique pour sélectionner</p>
        <input type="file" accept="image/*" style={{ display: "none" }} />
      </div>

      <div style={styles.actions}>
        <button type="button" style={styles.primaryButton}
          onClick={() => { setStatus("processing"); setTimeout(() => setStatus("done"), 2000); }}>
          {status === "processing" ? "⏳ Traitement..." : status === "done" ? "✅ Modèle prêt" : "🚀 Convertir en 3D"}
        </button>
      </div>

      {status === "done" && (
        <div style={styles.result}>
          <p style={{ color: "#34d399", fontWeight: 700 }}>✅ Mesh généré avec succès</p>
          <code style={{ color: "#7dd3fc", fontSize: "12px" }}>/output/model_generated.glb</code>
        </div>
      )}
    </section>
  );
}

export default PhotoTo3DPanel;

const styles: Record<string, React.CSSProperties> = {
  shell: { width: "100%", padding: "24px", color: "#f8fafc", background: "#050816", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "18px" },
  header: { marginBottom: "22px" },
  kicker: { margin: 0, fontSize: "12px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#00d4ff", fontWeight: 800 },
  title: { margin: "6px 0", fontSize: "28px" },
  subtitle: { margin: 0, color: "#94a3b8" },
  dropzone: { border: "2px dashed rgba(0,212,255,0.35)", borderRadius: "16px", padding: "48px", textAlign: "center", cursor: "pointer", marginBottom: "16px" },
  actions: { display: "flex", gap: "10px", marginBottom: "16px" },
  primaryButton: { border: "none", background: "linear-gradient(135deg, #00d4ff, #0ea5e9)", color: "#000", borderRadius: "999px", padding: "12px 24px", cursor: "pointer", fontWeight: 800, fontSize: "14px" },
  result: { padding: "16px", borderRadius: "12px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" },
};
