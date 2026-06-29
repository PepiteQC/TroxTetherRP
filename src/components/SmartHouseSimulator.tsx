import React, { useMemo, useState } from "react";

type SmartDevice = {
  id: string;
  name: string;
  room: string;
  type: "light" | "door" | "camera" | "climate" | "energy";
  online: boolean;
  active: boolean;
};

const INITIAL_DEVICES: SmartDevice[] = [
  { id: "front-door", name: "Porte principale", room: "Entrée", type: "door", online: true, active: false },
  { id: "living-light", name: "Lumière salon", room: "Salon", type: "light", online: true, active: true },
  { id: "garage-camera", name: "Caméra garage", room: "Garage", type: "camera", online: true, active: true },
  { id: "climate-core", name: "Climat central", room: "Maison", type: "climate", online: true, active: true },
  { id: "energy-grid", name: "Gestion énergie", room: "Sous-sol", type: "energy", online: true, active: false },
];

function getDeviceIcon(type: SmartDevice["type"]) {
  switch (type) {
    case "light": return "💡";
    case "door": return "🚪";
    case "camera": return "📷";
    case "climate": return "🌡️";
    case "energy": return "⚡";
    default: return "⬡";
  }
}

export function SmartHouseSimulator() {
  const [devices, setDevices] = useState<SmartDevice[]>(INITIAL_DEVICES);

  const stats = useMemo(() => ({
    total: devices.length,
    online: devices.filter(d => d.online).length,
    active: devices.filter(d => d.active).length,
    securityLevel: devices.filter(d => d.active).length >= 3 ? "Élevé" : devices.filter(d => d.active).length >= 2 ? "Moyen" : "Bas",
  }), [devices]);

  const toggleDevice = (id: string) => {
    setDevices(curr => curr.map(d => d.id === id ? { ...d, active: !d.active } : d));
  };

  return (
    <section style={styles.shell}>
      <header style={styles.header}>
        <div>
          <p style={styles.kicker}>TroxT Smart House</p>
          <h2 style={styles.title}>Simulateur Maison Connectée</h2>
          <p style={styles.subtitle}>Module local pour tester les appareils, la sécurité, l'énergie et les états temps réel.</p>
        </div>
        <div style={styles.statusBadge}>
          <span style={styles.statusDot} />
          ONLINE
        </div>
      </header>

      <div style={styles.grid}>
        {[
          { label: "Appareils", value: stats.total },
          { label: "Connectés", value: stats.online },
          { label: "Actifs", value: stats.active },
          { label: "Sécurité", value: stats.securityLevel },
        ].map(stat => (
          <article key={stat.label} style={styles.statCard}>
            <span style={styles.statLabel}>{stat.label}</span>
            <strong style={styles.statValue}>{stat.value}</strong>
          </article>
        ))}
      </div>

      <div style={styles.deviceList}>
        {devices.map(device => (
          <button
            key={device.id}
            type="button"
            onClick={() => toggleDevice(device.id)}
            style={{
              ...styles.deviceCard,
              borderColor: device.active ? "rgba(0,212,255,0.65)" : "rgba(255,255,255,0.12)",
              opacity: device.online ? 1 : 0.55,
            }}
          >
            <span style={styles.deviceIcon}>{getDeviceIcon(device.type)}</span>
            <span style={styles.deviceInfo}>
              <strong style={styles.deviceName}>{device.name}</strong>
              <span style={styles.deviceRoom}>{device.room}</span>
            </span>
            <span style={{
              ...styles.deviceState,
              background: device.active ? "rgba(0,212,255,0.18)" : "rgba(255,255,255,0.08)",
              color: device.active ? "#00d4ff" : "#9ca3af",
            }}>
              {device.active ? "ACTIF" : "OFF"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: { width: "100%", minHeight: "100%", padding: "24px", color: "#f8fafc", background: "radial-gradient(circle at top left, rgba(0,212,255,0.16), transparent 32%), #050816", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "18px", boxShadow: "0 24px 80px rgba(0,0,0,0.35)" },
  header: { display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", marginBottom: "22px" },
  kicker: { margin: 0, fontSize: "12px", letterSpacing: "0.18em", textTransform: "uppercase", color: "#00d4ff" },
  title: { margin: "6px 0", fontSize: "28px", lineHeight: 1.1 },
  subtitle: { margin: 0, maxWidth: "760px", color: "#94a3b8" },
  statusBadge: { display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "999px", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)", color: "#34d399", fontSize: "12px", fontWeight: 700 },
  statusDot: { width: "8px", height: "8px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 16px rgba(52,211,153,0.8)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "12px", marginBottom: "20px" },
  statCard: { padding: "16px", borderRadius: "14px", background: "rgba(15,23,42,0.72)", border: "1px solid rgba(255,255,255,0.1)" },
  statLabel: { display: "block", marginBottom: "8px", color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em" },
  statValue: { fontSize: "24px" },
  deviceList: { display: "grid", gap: "10px" },
  deviceCard: { width: "100%", display: "grid", gridTemplateColumns: "44px 1fr auto", gap: "12px", alignItems: "center", padding: "14px", borderRadius: "14px", background: "rgba(15,23,42,0.82)", color: "#f8fafc", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", textAlign: "left" },
  deviceIcon: { width: "44px", height: "44px", display: "grid", placeItems: "center", borderRadius: "12px", background: "rgba(255,255,255,0.08)", fontSize: "22px" },
  deviceInfo: { display: "grid", gap: "4px" },
  deviceName: { fontSize: "15px" },
  deviceRoom: { fontSize: "13px", color: "#94a3b8" },
  deviceState: { padding: "7px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 800 },
};
