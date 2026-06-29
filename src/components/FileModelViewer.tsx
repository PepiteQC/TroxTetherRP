import React, { useState } from "react";

export type ModelPosition = {
  x: number;
  y: number;
  z: number;
  rotationY?: number;
  scale?: number;
};

export const PRESET_POSITIONS: Record<string, ModelPosition> = {
  center:    { x: 0,    y: 0, z: 0,    rotationY: 0,   scale: 1 },
  left:      { x: -5,   y: 0, z: 0,    rotationY: 0.5, scale: 1 },
  right:     { x: 5,    y: 0, z: 0,    rotationY: -0.5, scale: 1 },
  front:     { x: 0,    y: 0, z: 5,    rotationY: Math.PI, scale: 1 },
  back:      { x: 0,    y: 0, z: -5,   rotationY: 0,   scale: 1 },
  elevated:  { x: 0,    y: 3, z: 0,    rotationY: 0,   scale: 0.8 },
};

type FileModelViewerProps = {
  fileUrl?: string;
  fileName?: string;
  position?: ModelPosition;
  onPositionChange?: (pos: ModelPosition) => void;
  className?: string;
};

export function FileModelViewer({
  fileUrl,
  fileName = "model.glb",
  position = PRESET_POSITIONS.center,
  onPositionChange,
  className,
}: FileModelViewerProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(true);

  return (
    <div className={className} style={styles.shell}>
      <div style={styles.viewport}>
        {fileUrl ? (
          <div style={styles.modelContainer}>
            <div style={{
              ...styles.modelCube,
              animation: isSpinning ? "fileViewerSpin 4s linear infinite" : "none",
              transform: `rotateX(55deg) rotateZ(${rotation}deg)`,
            }}>
              <div style={styles.cubeLabel}>3D</div>
              <div style={styles.cubeGlow} />
            </div>
            <style>{`
              @keyframes fileViewerSpin {
                from { transform: rotateX(55deg) rotateZ(0deg); }
                to   { transform: rotateX(55deg) rotateZ(360deg); }
              }
            `}</style>
          </div>
        ) : (
          <div style={styles.emptyState}>
            <span style={{ fontSize: "48px" }}>📦</span>
            <p style={{ color: "#94a3b8", margin: "12px 0 0" }}>Aucun modèle chargé</p>
          </div>
        )}
      </div>

      <div style={styles.controls}>
        <div style={styles.fileInfo}>
          <span style={styles.infoLabel}>Fichier</span>
          <code style={styles.fileName}>{fileName}</code>
        </div>

        <div style={styles.positionInfo}>
          <span style={styles.infoLabel}>Position</span>
          <span style={styles.posValue}>
            X:{position.x} Y:{position.y} Z:{position.z}
          </span>
        </div>

        <div style={styles.buttons}>
          <button
            type="button"
            style={styles.ctrlButton}
            onClick={() => setIsSpinning(v => !v)}
          >
            {isSpinning ? "⏸ Stop" : "▶ Spin"}
          </button>

          <button
            type="button"
            style={styles.ctrlButton}
            onClick={() => setRotation(r => (r + 45) % 360)}
          >
            🔄 +45°
          </button>
        </div>
      </div>

      {onPositionChange && (
        <div style={styles.presetBar}>
          <span style={styles.infoLabel}>Preset :</span>
          {Object.entries(PRESET_POSITIONS).map(([key, pos]) => (
            <button
              key={key}
              type="button"
              style={styles.presetButton}
              onClick={() => onPositionChange(pos)}
            >
              {key}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileModelViewer;

const styles: Record<string, React.CSSProperties> = {
  shell: {
    width: "100%",
    borderRadius: "16px",
    overflow: "hidden",
    background: "rgba(2,6,23,0.92)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#f8fafc",
  },
  viewport: {
    minHeight: "320px",
    display: "grid",
    placeItems: "center",
    background:
      "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
    backgroundSize: "30px 30px",
  },
  modelContainer: {
    display: "grid",
    placeItems: "center",
  },
  modelCube: {
    position: "relative",
    width: "120px",
    height: "120px",
    borderRadius: "20px",
    background: "linear-gradient(135deg, rgba(0,212,255,0.9), rgba(255,215,0,0.7))",
    boxShadow: "0 0 60px rgba(0,212,255,0.25)",
  },
  cubeLabel: {
    position: "absolute",
    inset: "14px",
    display: "grid",
    placeItems: "center",
    borderRadius: "14px",
    background: "rgba(2,6,23,0.6)",
    color: "#fff",
    fontWeight: 900,
    letterSpacing: "0.2em",
    fontSize: "18px",
  },
  cubeGlow: {
    position: "absolute",
    inset: "-14px",
    borderRadius: "28px",
    border: "1px solid rgba(0,212,255,0.22)",
    filter: "blur(1px)",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px",
  },
  controls: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr auto",
    gap: "12px",
    alignItems: "center",
    padding: "14px",
    background: "rgba(15,23,42,0.9)",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  fileInfo: { display: "grid", gap: "4px" },
  positionInfo: { display: "grid", gap: "4px" },
  infoLabel: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#94a3b8",
  },
  fileName: {
    fontSize: "12px",
    color: "#7dd3fc",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  posValue: { fontSize: "13px", color: "#f8fafc" },
  buttons: { display: "flex", gap: "8px" },
  ctrlButton: {
    border: "1px solid rgba(0,212,255,0.35)",
    background: "rgba(0,212,255,0.1)",
    color: "#7dd3fc",
    borderRadius: "999px",
    padding: "7px 12px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "12px",
  },
  presetBar: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    padding: "10px 14px",
    background: "rgba(15,23,42,0.7)",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    flexWrap: "wrap",
  },
  presetButton: {
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.05)",
    color: "#94a3b8",
    borderRadius: "8px",
    padding: "5px 10px",
    cursor: "pointer",
    fontSize: "12px",
    textTransform: "capitalize",
  },
};
