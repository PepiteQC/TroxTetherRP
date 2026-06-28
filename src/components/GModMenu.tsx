import React, { useState } from 'react';
import { GMOD_CATALOG } from '../game/GModBuilder';
import { X, Trash2 } from 'lucide-react';

interface GModMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (itemId: string | null) => void;
  selectedItemId: string | null;
  gridSnapSize: number;
  onSetGridSnapSize: (size: number) => void;
  onClearAllProps: () => void;
  unlockedFurnitureIds?: string[];
}

type Category = 'all' | 'furniture' | 'decor' | 'appliances' | 'outdoor';

const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: 'all',        label: 'Tout',      emoji: '🗂️' },
  { id: 'furniture',  label: 'Meubles',   emoji: '🛋️' },
  { id: 'decor',      label: 'Déco',      emoji: '🪴' },
  { id: 'appliances', label: 'Appareils', emoji: '📺' },
  { id: 'outdoor',    label: 'Extérieur', emoji: '🏡' },
];

const SNAPS = [
  { label: 'Libre', val: 0 },
  { label: '0.25m', val: 0.25 },
  { label: '0.5m',  val: 0.5 },
  { label: '1.0m',  val: 1.0 },
];

export const GModMenu: React.FC<GModMenuProps> = ({
  isOpen,
  onClose,
  onSelectItem,
  selectedItemId,
  gridSnapSize,
  onSetGridSnapSize,
  onClearAllProps,
  unlockedFurnitureIds = [],
}) => {
  const [category, setCategory] = useState<Category>('all');
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filtered = GMOD_CATALOG.filter(item =>
    (category === 'all' || item.category === category) &&
    (search === '' || item.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      {/* Backdrop click to close */}
      <div className="absolute inset-0 z-40" onClick={onClose} />

      <div className="absolute inset-y-0 left-0 w-[360px] z-50 flex flex-col bg-[#060c18]/96 backdrop-blur-2xl border-r border-white/8 shadow-[4px_0_40px_rgba(0,0,0,0.8)] pointer-events-auto animate-slide-in">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 mt-[62px] flex-shrink-0">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.35em] text-cyan-400 mb-0.5">TroxT Builder</div>
            <div className="text-[16px] font-black text-white tracking-tight">Spawn Menu</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/12 border border-white/10 text-white/50 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Grid Snap ── */}
        <div className="px-5 py-3 border-b border-white/6 flex-shrink-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/35 mb-2">Précision Grille (Snap)</div>
          <div className="grid grid-cols-4 gap-1.5">
            {SNAPS.map(s => (
              <button
                key={s.val}
                onClick={() => onSetGridSnapSize(s.val)}
                className={`py-1.5 rounded-lg text-[11px] font-bold font-mono transition cursor-pointer border text-center ${
                  gridSnapSize === s.val
                    ? 'bg-cyan-400 text-slate-950 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                    : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/25'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Search ── */}
        <div className="px-5 py-3 border-b border-white/6 flex-shrink-0">
          <input
            type="text"
            placeholder="🔍  Rechercher un objet…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 focus:border-cyan-400/50 rounded-xl px-3 py-2 text-[12px] text-white placeholder-white/25 outline-none transition"
          />
        </div>

        {/* ── Categories ── */}
        <div className="px-5 py-2.5 border-b border-white/6 flex gap-1.5 overflow-x-auto flex-shrink-0 scrollbar-none">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition cursor-pointer border ${
                category === c.id
                  ? 'bg-white text-slate-950 border-white font-black'
                  : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/25'
              }`}
            >
              <span>{c.emoji}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        {/* ── Items List ── */}
        <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col gap-2">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-white/25 text-[12px] font-mono">
              Aucun objet trouvé
            </div>
          )}
          {filtered.map(item => {
            const unlocked = unlockedFurnitureIds.includes(item.id);
            const equipped  = selectedItemId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => { if (!unlocked) return; onSelectItem(equipped ? null : item.id); }}
                className={`relative flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer overflow-hidden ${
                  !unlocked
                    ? 'opacity-40 cursor-not-allowed bg-white/3 border-white/6'
                    : equipped
                      ? 'bg-cyan-400/10 border-cyan-400/40 shadow-[0_0_20px_rgba(34,211,238,0.12)]'
                      : 'bg-white/[0.04] border-white/8 hover:bg-white/[0.07] hover:border-white/18'
                }`}
              >
                {/* Color swatch */}
                <div
                  className="w-11 h-11 rounded-lg flex-shrink-0 border border-white/10"
                  style={{ backgroundColor: item.color }}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className={`text-[12px] font-bold truncate ${equipped ? 'text-cyan-300' : 'text-white'}`}>
                    {item.name}
                  </div>
                  <div className="text-[10px] text-white/35 truncate mt-0.5">{item.description}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-white/30">{item.size[0]}×{item.size[1]}×{item.size[2]}m</span>
                  </div>
                </div>

                {/* Right badge */}
                <div className="flex-shrink-0 text-right">
                  {!unlocked ? (
                    <div className="text-[10px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/25 px-2 py-0.5 rounded-full">
                      🔒 Bloqué
                    </div>
                  ) : equipped ? (
                    <div className="text-[9px] font-mono font-black text-cyan-400 bg-cyan-400/10 border border-cyan-400/30 px-2 py-0.5 rounded-full">
                      ÉQUIPÉ
                    </div>
                  ) : (
                    <div className="text-[11px] font-mono font-bold text-emerald-400">
                      ${item.price}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-4 border-t border-white/8 flex flex-col gap-2 flex-shrink-0">
          {selectedItemId && (
            <button
              onClick={() => onSelectItem(null)}
              className="w-full bg-white/8 hover:bg-white/14 border border-white/12 text-white/70 hover:text-white font-bold text-[12px] py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
            >
              <X className="w-3.5 h-3.5" /> Déséquiper l'objet
            </button>
          )}
          <button
            onClick={() => { if (confirm('Réinitialiser toute la déco ?')) onClearAllProps(); }}
            className="w-full bg-red-950/30 hover:bg-red-950/60 border border-red-800/40 hover:border-red-600/60 text-red-300 hover:text-red-200 font-bold text-[12px] py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" /> Réinitialiser la déco
          </button>
        </div>

      </div>
    </>
  );
};
