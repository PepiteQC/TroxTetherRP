import { serverBlueprint } from "../game/serverBlueprint";
import { useAppStore } from "../game/store";

const layers = [
  "Express API REST",
  "Socket.IO temps reel",
  "TroxTBrain v4.0.0",
  "ThirdEye risk gate",
  "Intellectus: Arcadius, Benedictus, Decaprius, Lotus, Momentus",
  "EtherPrism schema RP: joueur, maison, Builder3D, armes",
];

export function ServerFoundation() {
  const setView = useAppStore(s=>s.setView);
  return (
    <main className="min-h-screen overflow-hidden bg-[#05070d] text-white">
      <section className="relative flex min-h-screen items-center px-6 py-16 sm:px-10 lg:px-16 pt-[94px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(38,120,255,0.38),transparent_34%),radial-gradient(circle_at_82%_30%,rgba(0,255,194,0.20),transparent_30%),linear-gradient(135deg,#05070d_0%,#08121d_46%,#101827_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(rgba(0,255,194,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,194,0.10)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(to_top,black,transparent)]" />

        <div className="relative z-10 grid w-full gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="max-w-4xl">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.42em] text-cyan-200">Base serveur en premier</p>
            <h1 className="text-5xl font-black uppercase leading-[0.9] tracking-[-0.08em] sm:text-7xl lg:text-8xl">
              TroxT<br />EtherWorld
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Le noyau NodeJS est structuré pour un RP style Nova-Life: le client affiche, le serveur décide, ThirdEye valide et le Brain orchestre les 16 agents.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row flex-wrap">
              <button onClick={()=>setView("map")} className="bg-cyan-300 px-6 py-3 text-sm font-bold uppercase tracking-[0.22em] text-slate-950 transition hover:bg-white">
                Voir la map serveur
              </button>
              <button onClick={()=>setView("game")} className="border border-cyan-300/40 px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-cyan-100 hover:bg-cyan-300/10">
                Entrer /game 3D
              </button>
              <button onClick={()=>setView("admin")} className="border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-200 hover:border-white/40">
                /admin Brain
              </button>
            </div>
            <div className="mt-4 text-[11px] tracking-widest uppercase text-slate-400">node server/index.js • http://localhost:4000</div>
          </div>

          <div className="relative min-h-[440px] border-l border-cyan-200/20 pl-8">
            <div className="absolute left-0 top-0 h-24 w-px bg-cyan-200 shadow-[0_0_24px_rgba(103,232,249,0.9)]" />
            <p className="text-sm uppercase tracking-[0.34em] text-cyan-200">Architecture active</p>
            <div className="mt-8 space-y-6">
              {layers.map((layer, index) => (
                <div className="group flex items-center gap-4" key={layer}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-cyan-200/40 bg-cyan-200/10 font-mono text-sm text-cyan-100 transition group-hover:bg-cyan-200 group-hover:text-slate-950">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-xl font-semibold text-slate-100">{layer}</span>
                </div>
              ))}
            </div>
            <div className="mt-10 grid gap-4 text-sm text-slate-300 sm:grid-cols-2">
              <div>
                <p className="text-cyan-200">Routes</p>
                <p>{serverBlueprint.routes.join(" | ")}</p>
              </div>
              <div>
                <p className="text-cyan-200">Realtime</p>
                <p>{serverBlueprint.realtime.join(" | ")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
