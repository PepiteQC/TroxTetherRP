import React, { useEffect, useState } from 'react';
import { PlayerState } from '../types';
import { 
  Heart, 
  Zap, 
  Settings, 
  LogOut, 
  Home, 
  Package, 
  Search,
  X,
  PlayCircle
} from 'lucide-react';

interface HUDProps {
  playerState: PlayerState;
  playerPos: { x: number; y: number; z: number };
  playerYaw: number;
  highlightedItemName: string | null;
  nearDoor: any;
  onToggleDoorLock: () => void;
  onRequestPointerLock: () => void;
  onToggleMount: (mount: 'hoverboard' | 'broom') => void;
  onExecuteCombat: (move: 'punch' | 'kick' | 'backflip' | 'sweep' | 'headbutt' | 'grab') => void;
  onPlantWeed: () => void;
  onBuyWeedSeed: () => void;
  onBuySeedPack: () => void;
  onSellBud: () => void;
  onSellAllBuds: () => void;
  onUnlockFurniture: (itemId: string, cost: number) => void;
  onSetGangBeastsMode: (active: boolean) => void;
  onSetJointStiffness: (stiffness: 'stiff' | 'relaxed' | 'floppy') => void;
  onSetSceneTemplate: (template: string) => void;
  onJoinFightQueue: (mode: '1v1' | 'ffa') => void;
  onLeaveFightQueue: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  playerState,
}) => {
  const [isEscOpen, setIsEscOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  
  const showHealth = playerState.health < 100;
  const showStamina = playerState.isSprinting;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEscOpen(prev => !prev);
        setIsInventoryOpen(false);
      }
      if (e.key.toLowerCase() === 'i') {
        setIsInventoryOpen(prev => !prev);
        setIsEscOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-50 font-sans select-none">
      
      {/* ── STATS DYNAMIQUES (BAS GAUCHE) ── */}
      <div className="absolute bottom-8 left-8 flex flex-col gap-3 transition-all duration-500">
        <div className={`flex items-center gap-3 transition-opacity duration-500 ${showHealth ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-red-500/30 flex items-center justify-center shadow-lg">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          </div>
          <div className="w-48 h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
            <div className="h-full bg-red-500 transition-all duration-300" style={{ width: `${playerState.health}%` }} />
          </div>
        </div>

        <div className={`flex items-center gap-3 transition-opacity duration-500 ${showStamina ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-cyan-500/30 flex items-center justify-center shadow-lg">
            <Zap className="w-5 h-5 text-cyan-500 fill-cyan-500" />
          </div>
          <div className="w-48 h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
            <div className="h-full bg-cyan-500 transition-all duration-100 animate-pulse" style={{ width: `70%` }} />
          </div>
        </div>
      </div>

      {/* ── CASH & QUARTIER (HAUT DROITE) ── */}
      <div className="absolute top-8 right-8 flex flex-col items-end gap-2">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3 shadow-2xl">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">Solde Cash</div>
          <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
            ${playerState.cash.toLocaleString()}
          </div>
        </div>
        <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-xl px-4 py-1.5 text-[11px] font-bold text-white/60 tracking-wider">
          {playerState.activeStreet}
        </div>
      </div>

      {/* ── MENU ESC (OVERLAY) ── */}
      {isEscOpen && (
        <div className="absolute inset-0 bg-[#04070f]/95 backdrop-blur-lg pointer-events-auto flex items-center justify-center animate-fade-in">
          <div className="max-w-4xl w-full px-12 grid grid-cols-1 md:grid-cols-2 gap-16">
            <div className="flex flex-col justify-center">
              <h1 className="text-6xl font-black text-white tracking-tighter mb-2">PAUSE</h1>
              <p className="text-cyan-400 font-mono text-sm tracking-[0.3em] uppercase mb-12">TroxT EtherWorld Core</p>
              
              <nav className="flex flex-col gap-4">
                {[
                  { label: 'Reprendre le jeu', icon: <PlayCircle className="w-6 h-6" />, action: () => setIsEscOpen(false) },
                  { label: 'Paramètres système', icon: <Settings className="w-6 h-6" />, action: () => {} },
                  { label: 'Retour au Lobby', icon: <Home className="w-6 h-6" />, action: () => window.location.reload() },
                  { label: 'Quitter EtherWorld', icon: <LogOut className="w-6 h-6" />, action: () => window.close() },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={item.action}
                    className="flex items-center gap-6 text-2xl font-bold text-white/40 hover:text-white transition-all hover:translate-x-4 group cursor-pointer text-left"
                  >
                    <span className="text-cyan-500 group-hover:scale-125 transition-transform">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col gap-6">
              <div className="flex items-center gap-4 border-b border-white/10 pb-6">
                <div className="w-16 h-16 rounded-2xl bg-cyan-400 flex items-center justify-center text-3xl">👤</div>
                <div>
                  <h3 className="text-xl font-bold text-white">Citoyen Connecté</h3>
                  <p className="text-sm text-white/40 font-mono">ID: #TX-4829</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                  <div className="text-[10px] text-white/30 uppercase font-bold mb-1">Session</div>
                  <div className="text-lg font-mono text-cyan-400">01:24:12</div>
                </div>
                <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                  <div className="text-[10px] text-white/30 uppercase font-bold mb-1">Latence</div>
                  <div className="text-lg font-mono text-emerald-400">14ms</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── INVENTAIRE (SIDEBAR DROITE) ── */}
      <div className={`absolute inset-y-0 right-0 w-[450px] bg-[#060b14]/98 border-l border-white/10 backdrop-blur-2xl transition-transform duration-500 pointer-events-auto flex flex-col p-8 shadow-[-20px_0_60px_rgba(0,0,0,0.5)] z-40 ${isInventoryOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">Inventaire</h2>
              <p className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest">Capacité: 8/45kg</p>
            </div>
          </div>
          <button onClick={() => setIsInventoryOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition cursor-pointer">
            <X className="w-6 h-6 text-white/40" />
          </button>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <input 
            type="text" 
            placeholder="Rechercher un objet..." 
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-indigo-500/50"
          />
        </div>

        <div className="flex-1 grid grid-cols-4 auto-rows-max gap-3 overflow-y-auto pr-2 scrollbar-thin">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all cursor-pointer group flex items-center justify-center relative overflow-hidden">
              {i === 0 && <span className="text-2xl group-hover:scale-110 transition-transform">🍞</span>}
              {i === 1 && <span className="text-2xl group-hover:scale-110 transition-transform">🥤</span>}
              {i === 2 && <span className="text-2xl group-hover:scale-110 transition-transform">🔨</span>}
              <div className="absolute inset-0 border-2 border-indigo-500 opacity-0 group-hover:opacity-10 transition-opacity" />
            </div>
          ))}
        </div>

        <div className="mt-8 bg-white/5 rounded-3xl p-6 border border-white/10">
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 rounded-2xl bg-black/40 flex items-center justify-center text-3xl">🍞</div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-white">Pain Tradition</h4>
              <p className="text-xs text-white/40 leading-relaxed mt-1">Restaure 15% de faim. Consommable artisanal.</p>
            </div>
          </div>
          <button className="w-full mt-6 bg-white text-black font-black py-4 rounded-2xl hover:bg-cyan-400 transition-colors uppercase tracking-widest text-sm cursor-pointer">
            Utiliser l'objet
          </button>
        </div>
      </div>

      {!isEscOpen && !isInventoryOpen && (
        <div className="absolute bottom-8 right-8 flex items-center gap-6 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">
          <span>[I] Inventaire</span>
          <span>[Q] Builder</span>
          <span>[ESC] Menu</span>
        </div>
      )}

    </div>
  );
};
