import { memo } from 'react';
import {
  useGameState,
  selectModel,
  rotateGhost,
  scaleGhostUp,
  scaleGhostDown,
  removePlaced,
  clearAllPlaced,
  toggleBuild,
} from '../../store';

interface CatalogItem {
  id: string;
  label: string;
  icon: string;
  color: string;
}

const CATALOG: { category: string; items: CatalogItem[] }[] = [
  {
    category: 'Primitives',
    items: [
      { id: 'cube', label: 'Cube', icon: '◼', color: '#6366f1' },
      { id: 'sphere', label: 'Sphère', icon: '●', color: '#8b5cf6' },
      { id: 'cylinder', label: 'Cylindre', icon: '⬬', color: '#7c3aed' },
      { id: 'plane', label: 'Plane', icon: '▬', color: '#5b21b6' },
    ],
  },
  {
    category: 'Nature',
    items: [
      { id: 'tree', label: 'Arbre', icon: '🌲', color: '#16a34a' },
      { id: 'rock', label: 'Rocher', icon: '🪨', color: '#78716c' },
      { id: 'bush', label: 'Buisson', icon: '🌿', color: '#15803d' },
    ],
  },
  {
    category: 'Structures',
    items: [
      { id: 'wall', label: 'Mur', icon: '🧱', color: '#b45309' },
      { id: 'pillar', label: 'Pilier', icon: '⬜', color: '#92400e' },
      { id: 'ramp', label: 'Rampe', icon: '📐', color: '#a16207' },
      { id: 'arch', label: 'Arche', icon: '🔲', color: '#d97706' },
    ],
  },
  {
    category: 'Lumières',
    items: [
      { id: 'lamp_post', label: 'Lampadaire', icon: '🏮', color: '#f59e0b' },
      { id: 'spot', label: 'Spot', icon: '💡', color: '#fbbf24' },
      { id: 'neon', label: 'Néon', icon: '🔵', color: '#06b6d4' },
    ],
  },
  {
    category: 'Décor',
    items: [
      { id: 'bench', label: 'Banc', icon: '🪑', color: '#1d4ed8' },
      { id: 'crate', label: 'Caisse', icon: '📦', color: '#7c2d12' },
      { id: 'barrel', label: 'Tonneau', icon: '🛢', color: '#713f12' },
      { id: 'sign', label: 'Panneau', icon: '🪧', color: '#0f766e' },
    ],
  },
];

export const BuilderPanel = memo(function BuilderPanel() {
  const state = useGameState();
  const { selectedModelType, selectedPlacedId, ghostRotation, ghostScale, placedObjects } = state;

  if (!state.buildMode) return null;

  return (
    <div
      className="fixed left-0 top-0 bottom-0 w-72 z-40 pointer-events-auto"
      style={{ paddingTop: '56px', paddingBottom: '48px' }}
    >
      <div className="h-full glass-card flex flex-col overflow-hidden border-r border-zinc-700/50 rounded-none">
        {/* Header */}
        <div className="px-3 py-2.5 border-b border-zinc-700/50 flex items-center justify-between shrink-0">
          <div>
            <div className="text-xs font-black text-purple-300 tracking-widest uppercase">🔨 Builder</div>
            <div className="text-[9px] text-zinc-500 mt-0.5">Clic sur le sol pour placer</div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30 font-mono">
              {placedObjects.length} objets
            </span>
            <button
              onClick={toggleBuild}
              className="w-5 h-5 flex items-center justify-center rounded text-zinc-500 hover:text-white hover:bg-zinc-700/50 text-xs transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Controls bar */}
        <div className="px-3 py-2 border-b border-zinc-700/50 shrink-0">
          <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1.5 tracking-wider">Contrôles</div>
          <div className="flex gap-1.5 flex-wrap">
            <ControlBtn label="↻ Rotation" onClick={rotateGhost} />
            <ControlBtn label="+ Grand" onClick={scaleGhostUp} />
            <ControlBtn label="- Petit" onClick={scaleGhostDown} />
            {selectedPlacedId && (
              <ControlBtn
                label="🗑 Suppr."
                onClick={() => removePlaced(selectedPlacedId)}
                danger
              />
            )}
            {placedObjects.length > 0 && (
              <ControlBtn label="🗑 Tout effacer" onClick={clearAllPlaced} danger />
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[9px] text-zinc-600">
            <span>Rot: {Math.round((ghostRotation * 180) / Math.PI)}°</span>
            <span>Éch: ×{ghostScale.toFixed(2)}</span>
            {selectedModelType && (
              <span className="text-purple-400 font-bold truncate">
                [{selectedModelType}]
              </span>
            )}
          </div>
        </div>

        {/* Catalog */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
          {CATALOG.map(cat => (
            <div key={cat.category}>
              <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1 tracking-wider">
                {cat.category}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {cat.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => selectModel(selectedModelType === item.id ? null : item.id)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left transition-all duration-150 ${
                      selectedModelType === item.id
                        ? 'border-purple-500/60 bg-purple-500/15 text-white'
                        : 'border-zinc-700/40 bg-zinc-800/30 text-zinc-400 hover:text-white hover:border-zinc-600/60'
                    }`}
                    style={{
                      boxShadow: selectedModelType === item.id
                        ? `0 0 8px ${item.color}33`
                        : undefined,
                    }}
                  >
                    <span className="text-sm leading-none">{item.icon}</span>
                    <span className="text-[10px] font-medium truncate">{item.label}</span>
                    {selectedModelType === item.id && (
                      <span className="ml-auto text-[8px] text-purple-400 font-bold">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Keybindings */}
        <div className="px-3 py-2 border-t border-zinc-700/50 shrink-0">
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            {[
              ['B', 'Fermer'],
              ['R', 'Rotation'],
              ['Clic', 'Placer'],
              ['Del', 'Supprimer'],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center gap-1 text-[9px]">
                <kbd className="bg-zinc-800 border border-zinc-700 px-1 py-0.5 rounded text-[8px] font-mono text-zinc-400">
                  {key}
                </kbd>
                <span className="text-zinc-600">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

function ControlBtn({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded text-[10px] font-medium border transition-all duration-150 ${
        danger
          ? 'border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20'
          : 'border-zinc-700/50 bg-zinc-800/50 text-zinc-400 hover:text-white hover:border-zinc-600/60'
      }`}
    >
      {label}
    </button>
  );
}
