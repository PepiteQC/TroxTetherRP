import { useAppStore, type View } from "../game/store";

const tabs: { id: View; label: string; k: string }[] = [
  { id: "landing", label: "Accueil", k: "⌘L" },
  { id: "character-creator", label: "Avatar", k: "👤" },
  { id: "game", label: "Ville 3D", k: "🏙️" },
  { id: "etherprism", label: "EtherPrism", k: "🗄️" },
  { id: "map", label: "Serveur", k: "SRV" },
  { id: "admin", label: "Admin IA", k: "🧠" },
];

export function TopBar() {
  const { view, setView, serverPing } = useAppStore();
  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-[14px] bg-[#060b14]/82 border-b border-cyan-400/12">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 h-[62px] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-[10px] bg-gradient-to-br from-cyan-300 to-emerald-300 shadow-[0_0_28px_rgba(48,255,205,0.31)] flex items-center justify-center text-[11px] font-black text-slate-950 tracking-tighter">TX</div>
          <div>
            <div className="text-[13px] font-extrabold uppercase tracking-[0.22em] text-cyan-100">TroxT EtherWorld</div>
            <div className="text-[10px] text-cyan-300/80 tracking-widest">BRAIN v4.0.0 • NOVA-LIFE RP • QC-FR</div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 bg-white/[0.035] rounded-full border border-white/10 p-[4px]">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`px-4 py-[9px] rounded-full text-[11px] font-bold tracking-[0.14em] uppercase transition ${
                view === t.id ? "bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(103,232,249,.35)]" : "text-cyan-100/82 hover:text-white"
              }`}
            >
              {t.label} <span className="opacity-60 ml-1">{t.k}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest">
          <div className={`h-2 w-2 rounded-full ${serverPing?.ok ? "bg-emerald-400 shadow-[0_0_10px_#34d399]" : "bg-amber-300 animate-pulse"}`} />
          <div className="text-cyan-100/90 hidden sm:block">
            {serverPing?.ok ? `API ${serverPing.latencyMs}ms` : "server-first"}
          </div>
          <button
            onClick={()=>setView(view==="map"?"landing":"map")}
            className="px-3 py-1.5 rounded-full border border-cyan-300/30 text-cyan-200 hover:bg-cyan-300/10"
          >
            MAP
          </button>
        </div>
      </div>
      <div className="md:hidden border-t border-white/8 px-4 py-2 flex gap-2 overflow-x-auto">
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setView(t.id)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${view===t.id?"bg-cyan-300 text-slate-950":"text-cyan-200 border border-white/15"}`}>{t.label}</button>
        ))}
      </div>
    </header>
  );
}
