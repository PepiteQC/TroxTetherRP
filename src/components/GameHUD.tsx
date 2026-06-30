import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import {
  useGameState,
  toggleBuild,
  setChatOpen,
  setAdminOpen,
  toggleGod,
  toggleFly,
  toggleNoclip,
  setActiveScene,
  addChat,
  setGlobal,
  clearAllPlaced,
  setDoorLocked,
  toggleLight,
} from "../store";
import type { ChatMessage, ActiveScene } from "../store";

const COMMANDS = [
  { cmd: "/help", desc: "Aide — liste complète" },
  { cmd: "/tp <x> <y> <z>", desc: "Téléportation" },
  { cmd: "/fly", desc: "Mode vol" },
  { cmd: "/god", desc: "God mode" },
  { cmd: "/noclip", desc: "Noclip (traverser les murs)" },
  { cmd: "/spawn", desc: "Retour spawn" },
  { cmd: "/time <0-23>", desc: "Heure" },
  { cmd: "/day", desc: "Jour (12h)" },
  { cmd: "/night", desc: "Nuit (0h)" },
  { cmd: "/weather <clear|rain|snow|fog>", desc: "Météo" },
  { cmd: "/speed <val>", desc: "Vitesse joueur" },
  { cmd: "/scene <world|room|corridor|hotel>", desc: "Changer de scène" },
  { cmd: "/room", desc: "Aller à la chambre d'hôtel" },
  { cmd: "/corridor", desc: "Aller au corridor" },
  { cmd: "/hotel", desc: "Aller à l'hôtel" },
  { cmd: "/clear", desc: "Vider le chat" },
  { cmd: "/list", desc: "Joueurs en ligne" },
  { cmd: "/coords", desc: "Coordonnées actuelles" },
  { cmd: "/pos", desc: "Position exacte" },
  { cmd: "/build", desc: "Builder mode" },
  { cmd: "/clearbuilt", desc: "Effacer tous les objets placés" },
  { cmd: "/broadcast <msg>", desc: "Message global" },
  { cmd: "/msg <joueur> <msg>", desc: "Message privé" },
  { cmd: "/kick <joueur>", desc: "Expulser" },
  { cmd: "/ban <joueur>", desc: "Bannir" },
  { cmd: "/mute <joueur>", desc: "Réduire au silence" },
  { cmd: "/unmute <joueur>", desc: "Rétablir la voix" },
  { cmd: "/reset", desc: "Réinitialiser le monde" },
  { cmd: "/heal", desc: "Soins complets" },
  { cmd: "/xp <val>", desc: "Donner XP" },
  { cmd: "/gamemode <mode>", desc: "Mode de jeu" },
  { cmd: "/lock <doorId>", desc: "Verrouiller une porte" },
  { cmd: "/unlock <doorId>", desc: "Déverrouiller une porte" },
  { cmd: "/lights <on|off>", desc: "Lumières on/off" },
  { cmd: "/fog <near> <far>", desc: "Densité brouillard" },
  { cmd: "/ping", desc: "Latence réseau" },
  { cmd: "/version", desc: "Version du serveur" },
  { cmd: "/save", desc: "Sauvegarder le monde" },
  { cmd: "/setspawn", desc: "Définir le point de spawn" },
  { cmd: "/home", desc: "Retour chez soi" },
] as const;

const WEATHER_OPTIONS = ["clear", "rain", "snow", "fog"] as const;
type Weather = (typeof WEATHER_OPTIONS)[number];
const WEATHER_ICONS: Record<Weather, string> = {
  clear: "☀️",
  rain: "🌧️",
  snow: "❄️",
  fog: "🌫️",
};
const ALERT_COLORS: Record<string, string> = {
  info: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
  success: "border-green-500/40 bg-green-500/10 text-green-300",
  error: "border-red-500/40 bg-red-500/10 text-red-300",
  warn: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
};

interface Alert {
  id: number;
  msg: string;
  type: keyof typeof ALERT_COLORS;
}
type AdminTab = "status" | "world" | "commands" | "players" | "server" | "scene";

export function GameHUD() {
  const state = useGameState();
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);
  const sessionStart = useRef<number>(0);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<AdminTab>("status");
  const [chatInput, setChatInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [autocomplete, setAutocomplete] = useState<string[]>([]);
  const [timeStr, setTimeStr] = useState("00:00");
  const clockRef = useRef({ h: state.timeOfDay, m: 0 });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alertIdRef = useRef(0);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.chatMessages.length]);

  useEffect(() => {
    const iv = setInterval(() => {
      const c = clockRef.current;
      c.m = (c.m + 1) % 60;
      if (c.m === 0) c.h = (c.h + 1) % 24;
      setTimeStr(
        `${String(c.h).padStart(2, "0")}:${String(c.m).padStart(2, "0")}`,
      );
    }, 500);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    clockRef.current = { h: state.timeOfDay, m: 0 };
    setTimeStr(`${String(state.timeOfDay).padStart(2, "0")}:00`);
  }, [state.timeOfDay]);

  useEffect(() => {
    if (!sessionStarted) return;
    sessionStart.current = Date.now();
    const iv = setInterval(() => {
      setSessionDuration(
        Math.floor((Date.now() - sessionStart.current) / 1000),
      );
    }, 1000);
    return () => clearInterval(iv);
  }, [sessionStarted]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        toggleBuild();
      }
      if (e.key === "Escape") {
        if (state.chatOpen) setChatOpen(false);
        else if (state.adminOpen) setAdminOpen(false);
      }
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        setChatOpen(true);
        setTimeout(() => chatInputRef.current?.focus(), 50);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.chatOpen, state.adminOpen]);

  const showAlert = useCallback(
    (msg: string, type: keyof typeof ALERT_COLORS = "info", dur = 3500) => {
      const id = ++alertIdRef.current;
      setAlerts((p) => [...p, { id, msg, type }].slice(-4));
      setTimeout(() => setAlerts((p) => p.filter((a) => a.id !== id)), dur);
    },
    [],
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const updateAutocomplete = useCallback((val: string) => {
    if (!val.startsWith("/") || val.length < 2) {
      setAutocomplete([]);
      return;
    }
    const matches = COMMANDS.filter((c) =>
      c.cmd.startsWith(val.split(" ")[0]),
    ).map((c) => c.cmd);
    setAutocomplete(matches.slice(0, 5));
  }, []);

  const processCommand = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;
      if (trimmed !== cmdHistory[0])
        setCmdHistory((p) => [trimmed, ...p].slice(0, 50));
      setHistoryIdx(-1);
      setAutocomplete([]);
      if (!trimmed.startsWith("/")) {
        addChat("Vous", trimmed, "chat");
        setChatInput("");
        return;
      }
      const parts = trimmed.slice(1).split(/\s+/);
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);
      const addSystem = (msg: string) => addChat("System", msg, "system");
      const addAdmin = (msg: string) => addChat("Admin", msg, "admin");

      switch (cmd) {
        case "help":
          addSystem(
            "📖 Commandes:\n" +
              COMMANDS.map((c) => `  ${c.cmd} — ${c.desc}`).join("\n"),
          );
          break;
        case "tp": {
          if (args.length < 3) {
            addSystem("❌ Usage: /tp <x> <y> <z>");
            break;
          }
          const [x, y, z] = args.map(Number);
          if ([x, y, z].some(isNaN)) {
            addSystem("❌ Coordonnées invalides");
            break;
          }
          addAdmin(`📍 Téléporté à (${x}, ${y}, ${z})`);
          showAlert(`Téléportation → ${x}, ${y}, ${z}`, "success");
          break;
        }
        case "fly":
          toggleFly();
          addAdmin(state.flyMode ? "🪰 Vol désactivé" : "🪰 Vol activé");
          showAlert(state.flyMode ? "Vol désactivé" : "Vol activé", "info");
          break;
        case "god":
          toggleGod();
          addAdmin(
            state.isGodMode ? "🛡️ God mode désactivé" : "🛡️ God mode activé",
          );
          showAlert(
            state.isGodMode ? "God mode OFF" : "God mode ON",
            state.isGodMode ? "warn" : "success",
          );
          break;
        case "spawn":
          addAdmin("🏠 Retour au spawn");
          showAlert("Retour au spawn", "info");
          break;
        case "time": {
          const h = parseInt(args[0], 10);
          if (isNaN(h) || h < 0 || h > 23) {
            addSystem("❌ Usage: /time <0-23>");
            break;
          }
          setGlobal({ timeOfDay: h });
          addAdmin(`🕐 Heure: ${String(h).padStart(2, "0")}:00`);
          break;
        }
        case "day":
          setGlobal({ timeOfDay: 12 });
          addAdmin("☀️ Jour");
          break;
        case "night":
          setGlobal({ timeOfDay: 0 });
          addAdmin("🌙 Nuit");
          break;
        case "weather": {
          const w = args[0] as Weather;
          if (!WEATHER_OPTIONS.includes(w)) {
            addSystem("❌ Usage: /weather <clear|rain|snow|fog>");
            break;
          }
          setGlobal({ weather: w });
          addAdmin(`${WEATHER_ICONS[w]} Météo: ${w}`);
          showAlert(`Météo → ${w}`, "info");
          break;
        }
        case "speed":
          if (!args[0] || isNaN(Number(args[0]))) {
            addSystem("❌ Usage: /speed <valeur>");
            break;
          }
          addAdmin(`⚡ Vitesse: ${args[0]}`);
          showAlert(`Vitesse → ${args[0]}`, "success");
          break;
        case "clear":
          addChat("System", "🗑️ Chat vidé", "system");
          break;
        case "list":
          addSystem("👥 Joueurs en ligne: Vous (Admin) — 1/100");
          break;
        case "coords":
          addSystem(
            `📍 Position: X=${state.playerPos[0].toFixed(1)} Y=${state.playerPos[1].toFixed(1)} Z=${state.playerPos[2].toFixed(1)}`,
          );
          break;
        case "pos":
          addSystem(
            `📍 Pos exacte: X=${state.playerPos[0].toFixed(2)} Y=${state.playerPos[1].toFixed(2)} Z=${state.playerPos[2].toFixed(2)}`,
          );
          break;
        case "build":
          toggleBuild();
          addAdmin("🔨 Builder " + (!state.buildMode ? "activé" : "désactivé"));
          break;
        case "broadcast":
          if (!args.length) {
            addSystem("❌ Usage: /broadcast <message>");
            break;
          }
          addChat("📢 Broadcast", args.join(" "), "admin");
          showAlert("Broadcast envoyé", "success");
          break;
        case "kick":
          if (!args[0]) {
            addSystem("❌ Usage: /kick <joueur>");
            break;
          }
          addAdmin(`🚪 ${args[0]} a été expulsé`);
          showAlert(`${args[0]} expulsé`, "warn");
          break;
        case "ban":
          if (!args[0]) {
            addSystem("❌ Usage: /ban <joueur>");
            break;
          }
          addAdmin(`🔨 ${args[0]} a été banni`);
          showAlert(`${args[0]} banni`, "error");
          break;
        case "reset":
          addAdmin("🔄 Monde réinitialisé");
          showAlert("Monde réinitialisé", "warn", 5000);
          break;
        case "heal":
          addAdmin("💊 Santé complète");
          showAlert("Soin complet appliqué", "success");
          break;
        case "xp": {
          const amount = parseInt(args[0], 10);
          if (isNaN(amount)) {
            addSystem("❌ Usage: /xp <valeur>");
            break;
          }
          addAdmin(`✨ +${amount} XP accordé`);
          showAlert(`+${amount} XP`, "success");
          break;
        }
        case "gamemode":
          if (!args[0]) {
            addSystem("❌ Usage: /gamemode <survival|creative|spectator>");
            break;
          }
          addAdmin(`🎮 Mode: ${args[0]}`);
          showAlert(`Mode → ${args[0]}`, "info");
          break;
        case "noclip":
          toggleNoclip();
          addAdmin(state.noclipMode ? "🔓 Noclip désactivé" : "🔓 Noclip activé");
          showAlert(state.noclipMode ? "Noclip OFF" : "Noclip ON", "info");
          break;
        case "scene": {
          const scenes = ["world", "room", "corridor", "hotel"];
          const s = args[0] as ActiveScene;
          if (!scenes.includes(s)) {
            addSystem("❌ Usage: /scene <world|room|corridor|hotel>");
            break;
          }
          setActiveScene(s);
          addAdmin(`🌍 Scène: ${s}`);
          showAlert(`Scène → ${s}`, "success");
          break;
        }
        case "room":
          setActiveScene("room");
          addAdmin("🏨 Chambre d'hôtel activée");
          showAlert("Chambre → activée", "success");
          break;
        case "corridor":
          setActiveScene("corridor");
          addAdmin("🚪 Corridor activé");
          showAlert("Corridor → activé", "success");
          break;
        case "hotel":
          setActiveScene("hotel");
          addAdmin("🏨 Hôtel activé");
          showAlert("Hôtel → activé", "success");
          break;
        case "clearbuilt":
          clearAllPlaced();
          addAdmin("🗑️ Objets placés supprimés");
          showAlert("Builder vidé", "warn");
          break;
        case "lock": {
          const doorId = args[0] || "main";
          setDoorLocked(doorId, true);
          addAdmin(`🔒 Porte "${doorId}" verrouillée`);
          showAlert(`Porte ${doorId} verrouillée`, "warn");
          break;
        }
        case "unlock": {
          const doorId = args[0] || "main";
          setDoorLocked(doorId, false);
          addAdmin(`🔓 Porte "${doorId}" déverrouillée`);
          showAlert(`Porte ${doorId} déverrouillée`, "success");
          break;
        }
        case "lights": {
          const on = args[0] !== "off";
          ["main", "bathroom", "corridor"].forEach(id => {
            const lights = useGameState.getState().lights;
            if (lights[id]?.isOn !== on) toggleLight(id);
          });
          addAdmin(on ? "💡 Lumières allumées" : "🌑 Lumières éteintes");
          showAlert(on ? "Lumières ON" : "Lumières OFF", "info");
          break;
        }
        case "fog": {
          const far = parseFloat(args[0]) || 120;
          setGlobal({ fogDensity: far });
          addAdmin(`🌫️ Brouillard: ${far}m`);
          showAlert(`Fog → ${far}m`, "info");
          break;
        }
        case "msg":
          if (!args[0] || args.length < 2) {
            addSystem("❌ Usage: /msg <joueur> <message>");
            break;
          }
          addChat(`📩 → ${args[0]}`, args.slice(1).join(" "), "admin");
          break;
        case "mute":
          if (!args[0]) { addSystem("❌ Usage: /mute <joueur>"); break; }
          addAdmin(`🔇 ${args[0]} a été réduit au silence`);
          showAlert(`${args[0]} muté`, "warn");
          break;
        case "unmute":
          if (!args[0]) { addSystem("❌ Usage: /unmute <joueur>"); break; }
          addAdmin(`🔊 ${args[0]} a été rétabli`);
          showAlert(`${args[0]} unmuted`, "success");
          break;
        case "ping":
          addSystem(`📡 Ping: ${Math.floor(Math.random() * 12) + 4}ms — Serveur local`);
          break;
        case "version":
          addSystem("⚙️ EtherWorld v1.2.0 — React Three Fiber · Vite · Zustand");
          break;
        case "save":
          addAdmin("💾 Monde sauvegardé");
          showAlert("Sauvegarde OK", "success");
          break;
        case "setspawn":
          addAdmin(`📍 Spawn défini à X=${state.playerPos[0].toFixed(1)} Z=${state.playerPos[2].toFixed(1)}`);
          showAlert("Spawn mis à jour", "success");
          break;
        case "home":
          addAdmin("🏠 Retour chez soi");
          showAlert("Home", "info");
          break;
        default:
          addSystem(`❌ Commande inconnue: /${cmd}. Tapez /help`);
      }
      setChatInput("");
    },
    [
      state.flyMode,
      state.isGodMode,
      state.buildMode,
      state.noclipMode,
      state.playerPos,
      cmdHistory,
      showAlert,
    ],
  );

  const handleChatKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const idx = Math.min(historyIdx + 1, cmdHistory.length - 1);
        setHistoryIdx(idx);
        const val = cmdHistory[idx] ?? "";
        setChatInput(val);
        updateAutocomplete(val);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const idx = Math.max(historyIdx - 1, -1);
        setHistoryIdx(idx);
        const val = idx === -1 ? "" : (cmdHistory[idx] ?? "");
        setChatInput(val);
        updateAutocomplete(val);
      } else if (e.key === "Tab" && autocomplete.length > 0) {
        e.preventDefault();
        const completed = autocomplete[0].split(" ")[0] + " ";
        setChatInput(completed);
        updateAutocomplete(completed);
      }
    },
    [historyIdx, cmdHistory, autocomplete, updateAutocomplete],
  );

  const handleChatChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setChatInput(val);
      updateAutocomplete(val);
      setHistoryIdx(-1);
    },
    [updateAutocomplete],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      processCommand(chatInput);
    },
    [chatInput, processCommand],
  );

  const handleStart = useCallback(() => {
    setSessionStarted(true);
    showToast("💎 Bienvenue dans EtherWorld !");
    setTimeout(
      () => showAlert("🔨 Appuyez B pour activer le Builder", "success", 5000),
      1000,
    );
    setTimeout(
      () => showAlert("💬 Appuyez T pour chatter", "info", 5000),
      2500,
    );
  }, [showAlert, showToast]);

  const sessionTime = useMemo(() => {
    const h = Math.floor(sessionDuration / 3600);
    const m = Math.floor((sessionDuration % 3600) / 60);
    const s = sessionDuration % 60;
    if (h > 0) return `${h}h${String(m).padStart(2, "0")}m`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [sessionDuration]);

  const weatherIcon = WEATHER_ICONS[state.weather as Weather] ?? "☀️";
  const leftPad = state.buildMode ? "296px" : "12px";

  if (!sessionStarted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-lg">
        <div className="relative max-w-md w-full mx-4">
          <div className="glass-card p-10 text-center border-t border-cyan-500/30">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 text-[11px] font-semibold mb-6 tracking-wide uppercase">
              🌍 Serveur Local - Actif
            </div>
            <h1 className="text-5xl font-black text-white mb-1 tracking-tighter">
              💎 EtherWorld
            </h1>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-6">
              World Builder RP
            </p>
            <p className="text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">
              Découvrez la liberté de construire et modérer votre propre univers
              avec le panel administrateur intégré.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-6 mb-6 text-xs text-left">
              {[
                ["🔨", "Builder drag & drop"],
                ["💬", "Chat & commandes"],
                ["🌙", "Cycle jour/nuit"],
                ["⚙️", "Panel admin"],
              ].map(([icon, label]) => (
                <div
                  key={label}
                  className="flex items-center gap-2 bg-zinc-800/50 rounded-lg px-3 py-2 text-zinc-300"
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <button
              onClick={handleStart}
              className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-500/30 transition-all duration-200 text-white font-bold text-sm flex items-center justify-between group shadow-lg shadow-cyan-900/20"
            >
              <span className="flex items-center gap-3">
                <span className="text-2xl">🚀</span>
                <strong className="block">Entrer dans le monde</strong>
              </span>
              <span className="text-xl group-hover:translate-x-1 transition-transform duration-150">
                →
              </span>
            </button>
            <p className="mt-5 text-[10px] text-zinc-500 font-mono">
              WASD = déplacer · Clic droit = orbiter · Scroll = zoom
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      <div className="vignette" />

      {/* Top Bar */}
      <div
        className="absolute top-0 left-0 right-0 p-3 flex items-start justify-between pointer-events-auto transition-all duration-300"
        style={{ paddingLeft: leftPad }}
      >
        <div className="flex items-center gap-2">
          <div className="glass-card px-3 py-2 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">💎</span>
            </div>
            <div>
              <div className="text-[11px] font-black text-white tracking-widest">
                ETHERWORLD
              </div>
              <div className="text-[8px] text-zinc-500 uppercase tracking-widest">
                Serveur Privé
              </div>
            </div>
          </div>
          <div className="glass-card px-2 py-1.5 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] text-green-400 font-bold tracking-wider">
              LIVE
            </span>
          </div>
          <div className="glass-card px-2 py-1.5">
            <span className="text-[9px] text-zinc-500">⏱ </span>
            <span className="text-[10px] font-mono text-zinc-400">
              {sessionTime}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="glass-card px-3 py-1.5">
            <span className="text-sm font-mono font-bold text-white">
              {timeStr}
            </span>
          </div>
          <HudButton
            active={state.buildMode}
            activeClass="bg-purple-500/20 border-purple-500/50 text-purple-300"
            onClick={toggleBuild}
            label="🔨 Builder"
            tag={state.buildMode ? "ON" : undefined}
          />
          <HudButton
            active={state.chatOpen}
            activeClass="bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
            onClick={() => setChatOpen(!state.chatOpen)}
            label="💬 Chat"
            count={
              state.chatMessages.length > 0
                ? state.chatMessages.length
                : undefined
            }
          />
          <HudButton
            active={state.adminOpen}
            activeClass="bg-red-500/20 border-red-500/50 text-red-300"
            onClick={() => setAdminOpen(!state.adminOpen)}
            label="⚙️ Admin"
          />
        </div>
      </div>

      {/* Alerts */}
      <div className="absolute top-16 right-4 flex flex-col gap-2 max-w-xs pointer-events-none z-50">
        {alerts.map((a) => (
          <div
            key={a.id}
            className={`glass-card px-3 py-2 text-xs font-medium border animate-slide-in ${ALERT_COLORS[a.type]}`}
          >
            {a.msg}
          </div>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none z-50">
          <div className="glass-card px-5 py-2.5 text-sm font-medium text-cyan-300 border border-cyan-500/30">
            {toast}
          </div>
        </div>
      )}

      {/* Bottom Status */}
      <div
        className="absolute bottom-0 left-0 right-0 p-3 pointer-events-auto transition-all duration-300"
        style={{ paddingLeft: leftPad }}
      >
        <div className="glass-card px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <StatusPill label="GOD" value={state.isGodMode ? "ON" : "OFF"} active={state.isGodMode} />
            <StatusPill label="FLY" value={state.flyMode ? "ON" : "OFF"} active={state.flyMode} />
            <StatusPill label="NOCLIP" value={state.noclipMode ? "ON" : "OFF"} active={state.noclipMode} />
            <StatusPill label="SCÈNE" value={state.activeScene.toUpperCase()} color="text-cyan-400" />
            <StatusPill label="HEURE" value={timeStr} color="text-violet-400" />
            <StatusPill label="MÉTÉO" value={weatherIcon} color="text-white" />
          </div>
          <div className="text-[9px] text-zinc-500 hidden md:block shrink-0 uppercase tracking-widest font-bold">
            X:{state.playerPos[0].toFixed(1)} Y:
            {state.playerPos[1].toFixed(1)} Z:{state.playerPos[2].toFixed(1)}
          </div>
        </div>
      </div>

      {/* Chat Panel */}
      {state.chatOpen && (
        <div className="absolute bottom-12 left-4 w-80 pointer-events-auto animate-slide-in z-50">
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700/50">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                💬 Chat & Commandes
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-zinc-600">
                  {state.chatMessages.length} msgs
                </span>
                <button
                  onClick={() => setChatOpen(false)}
                  className="text-zinc-500 hover:text-white text-xs transition-colors w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-700/50"
                >
                  ✕
                </button>
              </div>
            </div>
            <div
              className="overflow-y-auto p-3 space-y-1.5"
              style={{ maxHeight: "260px", minHeight: "120px" }}
            >
              {state.chatMessages.map((msg: ChatMessage) => (
                <ChatItem key={msg.id} msg={msg} />
              ))}
              <div ref={chatEndRef} />
            </div>
            {autocomplete.length > 0 && (
              <div className="border-t border-zinc-700/50 bg-zinc-900/80">
                {autocomplete.map((sug) => (
                  <button
                    key={sug}
                    onClick={() => {
                      const val = sug.split(" ")[0] + " ";
                      setChatInput(val);
                      updateAutocomplete(val);
                      chatInputRef.current?.focus();
                    }}
                    className="w-full text-left px-3 py-1.5 text-[11px] font-mono text-cyan-400 hover:bg-zinc-800/60 transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={handleSubmit}
              className="flex gap-2 px-3 py-2 border-t border-zinc-700/50"
            >
              <span className="text-cyan-400 text-xs font-mono self-center select-none">
                {">"}
              </span>
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                onChange={handleChatChange}
                onKeyDown={handleChatKeyDown}
                placeholder="Message ou /commande…"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                className="flex-1 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
              <button
                type="submit"
                className="px-2 py-1.5 bg-cyan-600/30 border border-cyan-500/30 rounded-lg text-cyan-300 text-xs hover:bg-cyan-600/50 transition-colors"
              >
                ↵
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Panel */}
      {state.adminOpen && (
        <div className="absolute top-12 right-4 w-72 pointer-events-auto animate-slide-in z-50">
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700/50">
              <span className="text-xs font-bold text-white">
                ⚙️ Admin Panel
              </span>
              <button
                onClick={() => setAdminOpen(false)}
                className="text-zinc-500 hover:text-white text-xs transition-colors w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-700/50"
              >
                ✕
              </button>
            </div>
            <div className="flex border-b border-zinc-700/50 overflow-x-auto">
              {[
                { id: "status" as AdminTab, label: "🎮 Status" },
                { id: "world" as AdminTab, label: "🌍 Monde" },
                { id: "scene" as AdminTab, label: "🏨 Scène" },
                { id: "players" as AdminTab, label: "👥 Joueurs" },
                { id: "server" as AdminTab, label: "💻 Serveur" },
                { id: "commands" as AdminTab, label: "📡 Cmds" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setAdminTab(t.id)}
                  className={`shrink-0 px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide transition-colors ${adminTab === t.id ? "text-cyan-300 border-b-2 border-cyan-500 -mb-px" : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div
              className="p-3"
              style={{ maxHeight: "350px", overflowY: "auto" }}
            >
              {adminTab === "status" && (
                <div className="grid grid-cols-2 gap-1.5">
                  <AdminBtn icon="🛡️" label="God Mode" active={state.isGodMode} onClick={toggleGod} />
                  <AdminBtn icon="🪰" label="Fly Mode" active={state.flyMode} onClick={toggleFly} />
                  <AdminBtn icon="🔓" label="Noclip" active={state.noclipMode} onClick={toggleNoclip} />
                  <AdminBtn icon="🔨" label="Builder" active={state.buildMode} onClick={toggleBuild} />
                  <AdminBtn icon="💬" label="Chat" active={state.chatOpen} onClick={() => setChatOpen(!state.chatOpen)} />
                  <AdminBtn icon="🌍" label={state.activeScene.toUpperCase()} active={false} onClick={() => setAdminTab("scene")} />
                </div>
              )}
              {adminTab === "scene" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold block mb-1.5 tracking-wider">
                      Scène active
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {([
                        { id: "world", icon: "🌍", label: "Monde" },
                        { id: "room", icon: "🛏", label: "Chambre" },
                        { id: "corridor", icon: "🚪", label: "Corridor" },
                        { id: "hotel", icon: "🏨", label: "Hôtel" },
                      ] as { id: ActiveScene; icon: string; label: string }[]).map(s => (
                        <button
                          key={s.id}
                          onClick={() => setActiveScene(s.id)}
                          className={`flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-lg border transition-all duration-150 ${
                            state.activeScene === s.id
                              ? "bg-cyan-500/15 border-cyan-500/40 text-white"
                              : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-white hover:border-zinc-500/50"
                          }`}
                        >
                          <span className="text-lg">{s.icon}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wide">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold block mb-1.5 tracking-wider">
                      Portes
                    </label>
                    <div className="space-y-1">
                      {Object.entries(state.doors).map(([id, door]) => (
                        <div key={id} className="flex items-center justify-between bg-zinc-800/40 rounded px-2 py-1">
                          <span className="text-[10px] font-mono text-zinc-400">{id}</span>
                          <div className="flex gap-1">
                            <span className={`text-[8px] px-1 py-0.5 rounded ${door.isOpen ? "bg-green-500/20 text-green-400" : "bg-zinc-700/50 text-zinc-500"}`}>
                              {door.isOpen ? "OUVERTE" : "FERMÉE"}
                            </span>
                            <span className={`text-[8px] px-1 py-0.5 rounded ${door.isLocked ? "bg-red-500/20 text-red-400" : "bg-zinc-700/50 text-zinc-500"}`}>
                              {door.isLocked ? "🔒" : "🔓"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold block mb-1.5 tracking-wider">
                      Builder — {state.placedObjects.length} objet(s)
                    </label>
                    <button
                      onClick={clearAllPlaced}
                      className="w-full py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-[10px] font-bold hover:bg-red-500/20 transition-colors"
                    >
                      🗑 Effacer les objets placés
                    </button>
                  </div>
                </div>
              )}
              {adminTab === "world" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold block mb-1.5 tracking-wider">
                      Heure du jour
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">🌙</span>
                      <input
                        type="range"
                        min="0"
                        max="23"
                        step="1"
                        value={state.timeOfDay}
                        onChange={(e) =>
                          setGlobal({
                            timeOfDay: parseInt(e.target.value, 10),
                          })
                        }
                        className="flex-1 h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-cyan-500"
                      />
                      <span className="text-xs">☀️</span>
                    </div>
                    <div className="text-center text-[10px] font-mono text-zinc-400 mt-1">
                      {String(state.timeOfDay).padStart(2, "0")}:00
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold block mb-1.5 tracking-wider">
                      Météo
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {WEATHER_OPTIONS.map((w) => (
                        <button
                          key={w}
                          onClick={() => setGlobal({ weather: w })}
                          className={`flex flex-col items-center gap-0.5 px-1 py-2 rounded-lg text-[9px] font-bold transition-all border ${state.weather === w ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-zinc-800/50 text-zinc-500 border-zinc-700/50 hover:text-white"}`}
                        >
                          <span className="text-base">{WEATHER_ICONS[w]}</span>
                          <span className="capitalize">{w}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {adminTab === "players" && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-cyan-500/10 border border-cyan-500/20 p-2 rounded-lg">
                    <span className="text-xs font-bold text-cyan-300">
                      👑 Vous (Admin)
                    </span>
                    <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                      Ping: 12ms
                    </span>
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-zinc-800/40 p-2 rounded-lg border border-zinc-700/30"
                    >
                      <span className="text-xs text-zinc-300">
                        Joueur_Test_{i}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() =>
                            showToast(`Joueur_Test_${i} téléporté`)
                          }
                          className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-1 rounded hover:bg-blue-500/30"
                        >
                          TP
                        </button>
                        <button
                          onClick={() =>
                            processCommand(`/kick Joueur_Test_${i}`)
                          }
                          className="text-[10px] bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded hover:bg-yellow-500/30"
                        >
                          Kick
                        </button>
                        <button
                          onClick={() =>
                            processCommand(`/ban Joueur_Test_${i}`)
                          }
                          className="text-[10px] bg-red-500/20 text-red-300 px-2 py-1 rounded hover:bg-red-500/30"
                        >
                          Ban
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {adminTab === "server" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold block mb-1.5 tracking-wider">
                      Multiplicateur de temps
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      defaultValue="1"
                      className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase font-bold block mb-1.5 tracking-wider">
                      Gravité
                    </label>
                    <input
                      type="range"
                      min="-40"
                      max="0"
                      defaultValue="-22"
                      className="w-full h-1.5 bg-zinc-700 rounded-full appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>
                  <div className="flex gap-1.5 mt-4">
                    <button
                      onClick={() => processCommand("/reset")}
                      className="flex-1 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-[10px] font-bold hover:bg-red-500/20 transition-colors"
                    >
                      Wipe Serveur
                    </button>
                    <button
                      onClick={() =>
                        processCommand("/broadcast Maintenance dans 5 min")
                      }
                      className="flex-1 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold hover:bg-amber-500/20 transition-colors"
                    >
                      Alerte Maint.
                    </button>
                  </div>
                </div>
              )}
              {adminTab === "commands" && (
                <div className="space-y-0.5">
                  {COMMANDS.map((c) => (
                    <button
                      key={c.cmd}
                      onClick={() => processCommand(c.cmd.split(" ")[0])}
                      className="w-full text-left px-2 py-1.5 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/70 transition-colors group"
                    >
                      <span className="text-[10px] font-mono text-cyan-400 group-hover:text-cyan-300">
                        {c.cmd.split(" ")[0]}
                      </span>
                      <span className="text-[9px] text-zinc-500 ml-1.5">
                        {c.desc}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface HudButtonProps {
  active?: boolean;
  activeClass: string;
  onClick: () => void;
  label: string;
  tag?: string;
  count?: number;
}
const HudButton = memo(function HudButton({
  active,
  activeClass,
  onClick,
  label,
  tag,
  count,
}: HudButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`glass-card px-3 py-2 text-xs font-bold transition-all duration-150 flex items-center gap-1.5 ${active ? activeClass : "text-zinc-400 hover:text-white"}`}
    >
      {label}
      {tag && (
        <span className="text-[8px] bg-current/10 px-1 py-0.5 rounded">
          {tag}
        </span>
      )}
      {count !== undefined && count > 0 && (
        <span className="text-[8px] bg-zinc-700 text-zinc-400 px-1 py-0.5 rounded-full min-w-[16px] text-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
});

interface StatusPillProps {
  label: string;
  value: string;
  active?: boolean;
  color?: string;
}
const StatusPill = memo(function StatusPill({
  label,
  value,
  active,
  color,
}: StatusPillProps) {
  const vc =
    color ??
    (active === true
      ? "text-green-400"
      : active === false
        ? "text-red-400"
        : "text-white");
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-[10px] font-bold font-mono ${vc}`}>{value}</span>
      <span className="text-[9px] text-zinc-600 uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
});

const CHAT_COLORS: Record<string, string> = {
  chat: "text-white",
  system: "text-yellow-300",
  admin: "text-purple-300",
};
const CHAT_ICONS: Record<string, string> = {
  chat: "💬",
  system: "⚡",
  admin: "🛡️",
};
const ChatItem = memo(function ChatItem({ msg }: { msg: ChatMessage }) {
  const color = CHAT_COLORS[msg.type] ?? "text-white";
  const icon = CHAT_ICONS[msg.type] ?? "💬";
  const time = new Date(msg.timestamp).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="leading-snug">
      <div className="flex items-baseline gap-1.5">
        <span className="text-[9px] font-bold text-cyan-400">
          {icon} {msg.sender}
        </span>
        <span className="text-[8px] text-zinc-600">{time}</span>
      </div>
      <div
        className={`text-[11px] leading-relaxed whitespace-pre-wrap pl-3 ${color}`}
      >
        {msg.text}
      </div>
    </div>
  );
});

function AdminBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg border transition-all duration-150 ${active ? "bg-cyan-500/15 border-cyan-500/40 text-white" : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-white hover:border-zinc-500/50"}`}
    >
      <span className="text-sm">{icon}</span>
      <span className="text-[8px] font-bold uppercase tracking-wide">
        {label}
      </span>
    </button>
  );
}
