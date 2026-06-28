import React, { useState } from 'react';
import { Eye, Shield, Play, HelpCircle, Laptop } from 'lucide-react';

interface MainMenuProps {
  onStartGame: (setup: {
    startHour: number;
    jacketColor: number;
    gridSnap: number;
  }) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame }) => {
  const [startHour, setStartHour] = useState<number>(10); // 10 AM default (0.35 cycle)
  const [jacketColor, setJacketColor] = useState<number>(0x1e293b); // Slate Navy
  const [gridSnap, setGridSnap] = useState<number>(0.5);

  const colors = [
    { name: 'Slate Navy', hex: 0x1e293b, tailwind: 'bg-slate-700' },
    { name: 'Obsidian Black', hex: 0x0f172a, tailwind: 'bg-slate-900' },
    { name: 'Crimson Red', hex: 0x991b1b, tailwind: 'bg-red-700' },
    { name: 'Toxic Green', hex: 0x166534, tailwind: 'bg-green-700' },
    { name: 'Royal Gold', hex: 0xd97706, tailwind: 'bg-amber-600' },
  ];

  const times = [
    { label: 'Jour Ensoleillé', hour: 10, bg: 'from-amber-400 to-sky-500' },
    { label: 'Coucher de Soleil', hour: 18, bg: 'from-orange-500 to-indigo-900' },
    { label: 'Nuit Sombre (RP)', hour: 23, bg: 'from-slate-950 to-indigo-950' },
  ];

  return (
    <div className="absolute inset-0 bg-slate-950 flex items-center justify-center font-sans overflow-y-auto p-6 z-[100] select-none text-white">
      
      {/* Background visual graphics */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15)_0,transparent_100%)] pointer-events-none" />
      
      <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-8 flex flex-col gap-6 relative z-10 backdrop-blur-md">
        
        {/* LOGO TITLE */}
        <div className="text-center flex flex-col gap-1 border-b border-slate-800 pb-5">
          <span className="bg-indigo-600 text-white text-[10px] font-black tracking-widest uppercase font-mono px-3 py-1 rounded-full w-max mx-auto mb-1 animate-pulse">
            ALPHA SANDBOX BUILD V4.0.0
          </span>
          <h1 className="text-4xl font-black tracking-tighter text-white">
            TROXT <span className="text-indigo-500">ETHERWORLD</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
            Un simulateur urbain 3D hybride fusionnant l'esthétique réaliste de <span className="text-indigo-400 font-bold">Nova Life</span>, le constructeur modulaire de <span className="text-indigo-400 font-bold">GMod</span> et l'interaction physique immersive de <span className="text-indigo-400 font-bold">GTA 5</span>.
          </p>
        </div>

        {/* CONTROLS MAP IN MAIN CARD */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* CHARACTER APPAREL */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider font-mono">🎨 Personnaliser l'Avatar</h3>
            <div className="flex flex-col gap-2">
              <span className="text-[11px] text-slate-300 font-medium">Couleur de la veste :</span>
              <div className="flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setJacketColor(c.hex)}
                    title={c.name}
                    className={`w-7 h-7 rounded-full cursor-pointer transition ring-offset-2 ring-offset-slate-900 ${c.tailwind} ${
                      jacketColor === c.hex ? 'ring-2 ring-indigo-500 scale-110' : 'hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <span className="text-[11px] text-slate-300 font-medium">Snap de Construction initial :</span>
              <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
                {[0.25, 0.5, 1.0].map((snap) => (
                  <button
                    key={snap}
                    onClick={() => setGridSnap(snap)}
                    className={`py-1 rounded border font-bold cursor-pointer transition ${
                      gridSnap === snap
                        ? 'bg-indigo-600 border-indigo-400 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {snap}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SERVER ATMOSPHERE */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider font-mono">⏰ Ambiance du Serveur</h3>
            <div className="flex flex-col gap-2 flex-1 justify-center">
              {times.map((t) => (
                <button
                  key={t.hour}
                  onClick={() => setStartHour(t.hour)}
                  className={`w-full p-2.5 rounded-lg border text-left cursor-pointer transition flex items-center justify-between text-xs font-semibold bg-gradient-to-r ${t.bg} ${
                    startHour === t.hour
                      ? 'border-white text-white shadow-lg scale-[1.02]'
                      : 'border-transparent text-slate-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <span>{t.label}</span>
                  <span className="text-[10px] font-mono text-white/80">
                    {t.hour === 10 ? '10h00 AM' : t.hour === 18 ? '18h00 PM' : '23h00 PM'}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* INSTRUCTIONS CARD */}
        <div className="bg-slate-950/40 border border-slate-800/40 p-4 rounded-xl flex items-start gap-3 text-xs leading-relaxed text-slate-300 font-mono">
          <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-white font-extrabold block mb-1">Règles et Instructions du Sandbox :</span>
            Explorez une petite ville de 2 rues (Avenue des Alliés et Rue de la République) avec <span className="text-indigo-400 font-bold">3 maisons à intérieurs vides</span>. Ouvrez le Spawn Menu avec la touche de l'interface, équipez un meuble, et visualisez le ghost bleu de construction. Visez et cliquez pour meubler vos pièces. Tout est sauvegardé automatiquement !
          </div>
        </div>

        {/* START TRIGGER BUTTON */}
        <button
          onClick={() => onStartGame({ startHour, jacketColor, gridSnap })}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold py-4 px-6 rounded-xl cursor-pointer shadow-xl transition transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 tracking-wide font-sans text-base"
        >
          <Play className="w-5 h-5 fill-white text-white" />
          REJOINDRE LE SERVEUR RP (CHARGEMENT DE LA VILLE)
        </button>

      </div>

    </div>
  );
};
