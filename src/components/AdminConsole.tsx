import { useState } from "react";
import { useAppStore } from "../game/store";

export function AdminConsole() {
  const [prompt, setPrompt] = useState("Crée un système de gang avec territoire, économie et missions dynamiques pour 3 gangs rivaux");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const setBrainResult = useAppStore(s=>s.setBrainResult);

  const run = async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      const r = await fetch("http://localhost:4000/api/admin/command", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ prompt })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error?.message || "Command rejected");
      setResult(j.data);
      setBrainResult(j.data);
    } catch(e:any) {
      setError(e.message || String(e));
    } finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-[#05070f] text-white pt-[82px] px-5 sm:px-10 pb-16">
      <div className="max-w-[1120px] mx-auto grid lg:grid-cols-[1.05fr_.95fr] gap-6">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-6">
          <div className="text-[10px] uppercase tracking-[0.34em] text-cyan-200">TroxTBrain v4.0.0 • /admin</div>
          <h2 className="text-3xl font-black mt-2">Console IA — Admin parle, Brain code</h2>
          <p className="text-slate-300 mt-2 text-sm">Serveur Express NodeJS • Socket.IO • MySQL ready • Redis ready • FR-QC</p>

          <textarea
            value={prompt}
            onChange={e=>setPrompt(e.target.value)}
            className="mt-5 w-full h-36 rounded-2xl bg-black/30 border border-white/12 p-4 text-[14px] outline-none focus:border-cyan-300/60 text-slate-100"
            placeholder="Décris le système RP à générer..."
          />
          <div className="flex gap-3 mt-3">
            <button onClick={run} disabled={loading}
              className="px-5 py-3 rounded-full bg-cyan-300 text-slate-950 font-extrabold text-[12px] uppercase tracking-wider disabled:opacity-60">
              {loading ? "Brain calcule…" : "Exécuter via Brain"}
            </button>
            <button onClick={()=>setPrompt("")} className="px-4 py-3 rounded-full border border-white/18 text-[12px]">Effacer</button>
          </div>
          {error && <div className="mt-4 text-rose-300 text-sm">{error} — assure-toi que <code>node server/index.js</code> tourne.</div>}

          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            {[
              "ether-forge",
              "ether-guard",
              "ether-lens",
              "ether-prism",
              "ether-weave",
              "ether-ui",
              "ether-sim",
              "ether-memory",
            ].map(a=> <div key={a} className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-cyan-100">{a}</div>)}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-[#08121d]/80 p-6">
          <div className="text-[10px] uppercase tracking-[0.34em] text-emerald-300">Agent Output Format</div>
          {!result ? (
            <div className="text-slate-400 mt-4 text-sm">En attente d’une mission…</div>
          ) : (
            <div className="mt-4 text-[13px] space-y-2 text-slate-200">
              <div><b>Agent:</b> {result.agent}</div>
              <div><b>Mission reçue:</b> {result.missionRecue}</div>
              <div><b>Résumé compréhension:</b> {result.resumeComprehension}</div>
              <div><b>Recherche effectuée:</b> {result.rechercheEffectuee}</div>
              <div><b>Risques détectés:</b> {result.risquesDetectes?.level} • {result.risquesDetectes?.reason}</div>
              <div><b>Score confiance:</b> {Math.round((result.scoreConfiance||0)*100)}%</div>
              <div><b>Fichiers concernés:</b> {result.fichiersConcernnes?.join(", ")}</div>
              <div className="pt-2 text-[11px] text-slate-300">
                <div className="text-cyan-200">Lua pattern</div>
                <pre className="bg-black/35 p-3 rounded-lg overflow-auto mt-1">{JSON.stringify(result.resultatProduit?.luaPattern, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
