import { useEffect, useState } from "react";
import { serverBlueprint } from "../game/serverBlueprint";

type Health = any;

export function ServerMapView() {
  const [health, setHealth] = useState<Health | null>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("http://localhost:4000/api/health", { cache: "no-store" }).catch(()=>null);
        if (!r || !r.ok) throw new Error("Serveur non démarré: node server/index.js");
        const j = await r.json();
        if (!cancelled) setHealth(j.data);
      } catch (e:any) {
        setErr(e.message);
      }
    };
    load();
    const t = setInterval(load, 4200);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  return (
    <main className="min-h-screen bg-[#05070d] text-white pt-[82px] px-5 sm:px-10 pb-16">
      <div className="max-w-[1240px] mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.42em] text-cyan-300">Server map • TroxT EtherWorld</div>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight">Map Serveur Express + WS</h2>
            <p className="text-slate-300 mt-2 max-w-2xl">Client affiche • Serveur décide • ThirdEye valide • Brain orchestre. Pattern Lua Nova-Life: eventPrefix <code className="text-cyan-200">troxt:rp</code></p>
          </div>
          <a href="/troxt-server-map.txt" target="_blank" className="text-[11px] uppercase tracking-widest text-cyan-200 border border-cyan-300/25 px-3 py-2 rounded-full hover:bg-cyan-300/10">map .txt brut</a>
        </div>

        {err && <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-amber-200 text-sm">{err} — lance <span className="font-mono">node server/index.js</span></div>}

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.035] p-5">
            <div className="text-[10px] uppercase tracking-[0.28em] text-cyan-200">Routes HTTP</div>
            <ul className="mt-4 space-y-2 text-[13px] font-mono">
              {serverBlueprint.routes.map(r => (
                <li key={r} className="flex items-center justify-between bg-black/25 border border-white/10 rounded-lg px-3 py-2">
                  <span className="text-emerald-300">GET/POST</span>
                  <span className="text-cyan-100">{r}</span>
                </li>
              ))}
              <li className="text-slate-400 px-1 pt-1">+ 404 guard • CORS • 1mb json</li>
            </ul>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-white/[0.035] p-5">
            <div className="text-[10px] uppercase tracking-[0.28em] text-cyan-200">Socket.IO Realtime</div>
            <ul className="mt-4 space-y-2 text-[13px] font-mono">
              {serverBlueprint.realtime.map(e => (
                <li key={e} className="bg-black/25 border border-white/10 rounded-lg px-3 py-2 text-[#ffe9a6]">{e}</li>
              ))}
            </ul>
            <div className="text-[11px] text-slate-400 mt-3">BuildRealtime multi-joueurs • autosave 15s</div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-white/[0.035] p-5">
            <div className="text-[10px] uppercase tracking-[0.28em] text-cyan-200">Brain status</div>
            <div className="mt-4 text-sm text-slate-200">
              {health ? (
                <>
                  <div><span className="text-cyan-200">service:</span> {health.service}</div>
                  <div><span className="text-cyan-200">brain:</span> {health.brain.name} v{health.brain.version}</div>
                  <div><span className="text-cyan-200">agents:</span> {health.brain.agentsOnline} online</div>
                  <div className="mt-2 text-[11px] text-slate-400">storage: {health.storage?.activeMode}</div>
                </>
              ) : <div className="text-slate-400">serveur endormi — démarre le node server</div>}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5 mt-5">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.032] p-5">
            <div className="text-[10px] uppercase tracking-[0.28em] text-emerald-300">EtherPrism RP Schema</div>
            <pre className="mt-3 text-[11.5px] leading-6 text-slate-200 overflow-auto">
{`player.identity: steamId, displayName, citizenId, wallet, bank, job, faction
player.state: health, hunger, thirst, stress, wantedLevel

house: ownerId, price, keys, doors, storage, mortgage, builderSlots
  actions: buy, sell, rent, giveKey, lockDoor, decorate

builder3d: wall, floor, door, window, light, garage, furniture
  validation: owner-only, zone-lock, prop-limit, collision-check

weapons: register, equip, repair, seize, blackMarketTrade
  guard: license-check, serial-number, anti-duplication

luaPattern: eventPrefix = 'troxt:rp' | serverValidates = true | clientDisplaysOnly = true`}
            </pre>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-white/[0.032] p-5">
            <div className="text-[10px] uppercase tracking-[0.28em] text-rose-300">ThirdEye • Sécurité</div>
            <ul className="mt-3 text-[13px] text-slate-200 space-y-2">
              <li>💎 Diamond Identity → SHA-512 + HMAC session</li>
              <li>👁 Risk GREEN → YELLOW → ORANGE → RED</li>
              <li>🛡 ether-guard → RBAC • JWT • Rate-limit • Anti-cheat</li>
              <li>🔒 Circuit breakers par sous-système</li>
              <li>📝 Audit Trail SHA-256</li>
            </ul>
            <div className="mt-4 text-[11px] text-slate-400">16 agents TroxT • 11 Ether • 5 Intellectus</div>
          </div>
        </div>

        <div className="mt-5 rounded-[22px] border border-cyan-300/18 bg-gradient-to-br from-cyan-400/[0.07] to-emerald-400/[0.03] p-5">
          <div className="text-[10px] uppercase tracking-[0.28em] text-cyan-200">Filesystem serveur</div>
          <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[12px] font-mono text-slate-200">
            {[
              "server/index.js",
              "server/http/app.js",
              "server/realtime/socketServer.js",
              "server/kernel.js",
              "server/brain/TroxTBrain.js",
              "server/security/thirdEye.js",
              "server/intellectus/*",
              "server/world/etherPrism.js",
              "server/world/buildRealtime.js",
              "server/storage/*",
              "src/components/*",
              "src/game/*",
            ].map(f=> <div key={f} className="bg-black/30 border border-white/8 rounded-lg px-3 py-2">{f}</div>)}
          </div>
        </div>
      </div>
    </main>
  );
}
