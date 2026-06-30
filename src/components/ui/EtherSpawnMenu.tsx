import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useGameState, setGlobal, addPlaced, selectModel } from '../../store';

// ── Catalogue complet EtherWorld style Garry's Mod ─────────────────────────

interface SpawnItem {
  id: string;
  name: string;
  icon: string;
  desc: string;
  mass?: number;
  tags: string[];
  tint?: string;
}

const CATALOG: { id: string; label: string; icon: string; items: SpawnItem[] }[] = [
  {
    id: 'props', label: 'Props Physiques', icon: '📦',
    items: [
      { id: 'barrel', name: 'Barrel Explosif', icon: '🛢', desc: 'Masse 80kg, explose au contact', mass: 80, tags: ['physics', 'explosive'], tint: '#b45309' },
      { id: 'crate', name: 'Caisse en bois', icon: '📦', desc: 'Masse 50kg, destructible', mass: 50, tags: ['physics', 'wood'], tint: '#7c2d12' },
      { id: 'cube', name: 'Cube métal', icon: '◼', desc: 'Primitive rigide universelle', tags: ['physics'], tint: '#6366f1' },
      { id: 'sphere', name: 'Sphère', icon: '⬤', desc: 'Roulement parfait', tags: ['physics'], tint: '#8b5cf6' },
      { id: 'wall', name: 'Mur béton', icon: '🧱', desc: 'Structure 3m × 2.4m', tags: ['structure'], tint: '#b45309' },
      { id: 'pillar', name: 'Pilier', icon: '⬜', desc: 'Support vertical h=3m', tags: ['structure'], tint: '#92400e' },
      { id: 'ramp', name: 'Rampe', icon: '📐', desc: 'Inclinaison 22.5°', tags: ['structure'], tint: '#a16207' },
      { id: 'arch', name: 'Arche', icon: '🔲', desc: 'Portail structurel', tags: ['structure'], tint: '#d97706' },
      { id: 'sign', name: 'Panneau', icon: '🪧', desc: 'Signalétique personnalisable', tags: ['decor'], tint: '#0f766e' },
      { id: 'bench', name: 'Banc', icon: '🪑', desc: 'Mobilier urbain', tags: ['decor'], tint: '#1d4ed8' },
    ],
  },
  {
    id: 'vehicles', label: 'Véhicules', icon: '🚗',
    items: [
      { id: 'car', name: 'Voiture abandonnée', icon: '🚗', desc: 'Masse 1200kg, collision mesh', mass: 1200, tags: ['vehicle'], tint: '#991b1b' },
      { id: 'sphere', name: 'Trampoline', icon: '🔴', desc: 'Bounce 2.0, restitution 1.8', tags: ['physics', 'bounce'], tint: '#dc2626' },
      { id: 'cylinder', name: 'Pneu', icon: '⬬', desc: 'Roue détachée, roll physique', mass: 25, tags: ['vehicle', 'physics'], tint: '#1c1917' },
    ],
  },
  {
    id: 'entities', label: 'Entités IA', icon: '🤖',
    items: [
      { id: 'cube', name: 'NPC Garde', icon: '💂', desc: 'Patrouille, aggroRange 10m, HP 200', tags: ['npc', 'hostile'], tint: '#166534' },
      { id: 'sphere', name: 'NPC Marchand', icon: '🧑‍💼', desc: '5 lignes dialogue, donne items', tags: ['npc', 'friendly'], tint: '#1e40af' },
      { id: 'cube', name: 'NPC Boss', icon: '👹', desc: 'HP 1000, phases attaque', tags: ['npc', 'boss'], tint: '#7f1d1d' },
      { id: 'cube', name: 'Tourelle', icon: '🔫', desc: 'Détecte joueur <15m, tire auto', tags: ['trap', 'hostile'], tint: '#374151' },
      { id: 'sphere', name: 'SpawnPoint', icon: '🔵', desc: 'Point réapparition joueurs', tags: ['system'], tint: '#0369a1' },
      { id: 'sphere', name: 'Checkpoint', icon: '🏁', desc: 'Active/désactive zones', tags: ['system'], tint: '#16a34a' },
      { id: 'cube', name: 'EffectZone', icon: '🌀', desc: 'Applique fog/gravity/speed', tags: ['zone'], tint: '#7c3aed' },
    ],
  },
  {
    id: 'effects', label: 'Effets', icon: '✨',
    items: [
      { id: 'sphere', name: 'Explosion', icon: '💥', desc: 'Particules + force radiale', tags: ['effect'], tint: '#ea580c' },
      { id: 'sphere', name: 'Zone de Feu', icon: '🔥', desc: 'Emissive animée, dégâts zone', tags: ['effect', 'damage'], tint: '#dc2626' },
      { id: 'plane', name: 'Eau', icon: '💧', desc: 'Surface transparente, slowdown', tags: ['effect'], tint: '#0369a1' },
      { id: 'sphere', name: 'Zone Vent', icon: '💨', desc: 'Force directionnelle', tags: ['effect'], tint: '#0891b2' },
      { id: 'sphere', name: 'Antigravité', icon: '🌐', desc: 'Inverse la gravité dans la zone', tags: ['effect', 'gravity'], tint: '#7c3aed' },
      { id: 'sphere', name: 'Speedzone', icon: '⚡', desc: 'Multiplie velocity ×3', tags: ['effect', 'speed'], tint: '#ca8a04' },
      { id: 'sphere', name: 'Freezezone', icon: '❄️', desc: 'Stoppe tous les PhysicsProps', tags: ['effect', 'freeze'], tint: '#0284c7' },
      { id: 'sphere', name: 'Vortex', icon: '🌀', desc: 'Attire tout vers le centre', tags: ['effect'], tint: '#6d28d9' },
    ],
  },
  {
    id: 'nature', label: 'Nature', icon: '🌲',
    items: [
      { id: 'tree', name: 'Arbre', icon: '🌲', desc: 'Conifère québécois', tags: ['nature'], tint: '#16a34a' },
      { id: 'rock', name: 'Rocher', icon: '🪨', desc: 'Roche ignée, masse 200kg', tags: ['nature'], tint: '#78716c' },
      { id: 'bush', name: 'Buisson', icon: '🌿', desc: 'Végétation dense', tags: ['nature'], tint: '#15803d' },
    ],
  },
  {
    id: 'lights', label: 'Lumières', icon: '💡',
    items: [
      { id: 'lamp_post', name: 'Lampadaire', icon: '🏮', desc: 'Point light distance 12m', tags: ['light'], tint: '#f59e0b' },
      { id: 'spot', name: 'Spot', icon: '💡', desc: 'Éclairage directionnel', tags: ['light'], tint: '#fbbf24' },
      { id: 'neon', name: 'Tube Néon', icon: '🔵', desc: 'Néon émissif cyan, 2m', tags: ['light', 'decor'], tint: '#06b6d4' },
    ],
  },
  {
    id: 'weapons', label: 'Armes / Pièges', icon: '💣',
    items: [
      { id: 'sphere', name: 'Bombe à retardement', icon: '💣', desc: 'Timer 10s, rayon 8m', mass: 5, tags: ['weapon', 'explosive'], tint: '#1c1917' },
      { id: 'cube', name: 'Mine terrestre', icon: '💀', desc: 'Trigger zone 2m, explose', tags: ['trap'], tint: '#7f1d1d' },
      { id: 'cube', name: 'Bouclier', icon: '🛡', desc: 'Bloque projectiles, masse 15kg', mass: 15, tags: ['defense'], tint: '#1e3a8a' },
      { id: 'sphere', name: 'Portail', icon: '🌀', desc: 'Téléporte le joueur', tags: ['special'], tint: '#6d28d9' },
    ],
  },
  {
    id: 'specials', label: 'Spéciaux', icon: '🌟',
    items: [
      { id: 'neon', name: 'Enseigne EtherWorld', icon: '⬡', desc: 'Logo néon EtherWorld RP', tags: ['branding', 'decor'], tint: '#a855f7' },
      { id: 'sphere', name: 'Orbe TroxT', icon: '🧠', desc: 'Terminal IA interactif TroxT', tags: ['ai', 'interactive'], tint: '#7b6fff' },
      { id: 'pillar', name: 'Colonne EW', icon: '🏛', desc: 'Pilier stylé EtherWorld', tags: ['decor', 'branding'], tint: '#4f46e5' },
      { id: 'plane', name: 'Miroir', icon: '🪞', desc: 'Surface réfléchissante', tags: ['decor'], tint: '#64748b' },
    ],
  },
];

const RARITY_COLORS: Record<string, string> = {
  physics: '#f59e0b',
  explosive: '#ef4444',
  npc: '#22c55e',
  boss: '#a855f7',
  effect: '#06b6d4',
  weapon: '#ef4444',
  trap: '#f97316',
  special: '#a855f7',
  branding: '#a855f7',
  ai: '#7b6fff',
  vehicle: '#3b82f6',
  light: '#fbbf24',
  nature: '#16a34a',
  structure: '#b45309',
};

function tagColor(tags: string[]) {
  for (const t of tags) if (RARITY_COLORS[t]) return RARITY_COLORS[t];
  return '#6366f1';
}

// ── Component ──────────────────────────────────────────────────────────────

export const EtherSpawnMenu = memo(function EtherSpawnMenu() {
  const spawnMenuOpen = useGameState(s => s.spawnMenuOpen);
  const buildMode = useGameState(s => s.buildMode);

  const [catId, setCatId] = useState('props');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SpawnItem | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set(['barrel', 'tree', 'lamp_post', 'neon']));
  const [recents, setRecents] = useState<SpawnItem[]>([]);
  const [showFav, setShowFav] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Tab key to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        setGlobal({ spawnMenuOpen: !spawnMenuOpen });
      }
      if (e.key === 'Escape' && spawnMenuOpen) {
        setGlobal({ spawnMenuOpen: false });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [spawnMenuOpen]);

  useEffect(() => {
    if (spawnMenuOpen) setTimeout(() => searchRef.current?.focus(), 80);
  }, [spawnMenuOpen]);

  const allItems = CATALOG.flatMap(c => c.items);
  const currentCat = CATALOG.find(c => c.id === catId)!;
  const displayItems = showFav
    ? allItems.filter(i => favorites.has(i.id))
    : search.length > 1
    ? allItems.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.tags.some(t => t.includes(search.toLowerCase()))
      )
    : currentCat.items;

  const spawnItem = useCallback((item: SpawnItem) => {
    selectModel(item.id);
    setGlobal({ buildMode: true, spawnMenuOpen: false });
    setRecents(r => [item, ...r.filter(x => x.id !== item.id || x.name !== item.name)].slice(0, 6));
  }, []);

  const toggleFav = useCallback((itemId: string) => {
    setFavorites(f => {
      const n = new Set(f);
      n.has(itemId) ? n.delete(itemId) : n.add(itemId);
      return n;
    });
  }, []);

  if (!spawnMenuOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
      onClick={() => setGlobal({ spawnMenuOpen: false })}
    >
      <div
        style={{
          width: 780, height: 560, background: '#0d0d12',
          border: '1px solid rgba(167,139,250,0.25)', borderRadius: 16,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(167,139,250,0.1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(167,139,250,0.04)',
        }}>
          <span style={{ fontSize: 18 }}>⬡</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa', letterSpacing: '-0.3px' }}>
            ETHER SPAWN
          </span>
          <span style={{ fontSize: 10, color: '#3f3f46', letterSpacing: 2 }}>ETHERWORLD RP</span>
          <input
            ref={searchRef}
            value={search}
            onChange={e => { setSearch(e.target.value); setShowFav(false); }}
            placeholder="🔍 Rechercher un objet, tag…"
            style={{
              flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, color: '#e4e4e7', fontSize: 12, padding: '6px 12px',
              outline: 'none', marginLeft: 8,
            }}
          />
          <kbd style={{ fontSize: 10, color: '#52525b', background: 'rgba(255,255,255,0.04)', padding: '3px 7px', borderRadius: 4 }}>
            Tab / F1
          </kbd>
          <button
            onClick={() => setGlobal({ spawnMenuOpen: false })}
            style={{ background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left sidebar */}
          <div style={{
            width: 160, borderRight: '1px solid rgba(255,255,255,0.05)',
            padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto',
          }}>
            {CATALOG.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setCatId(cat.id); setSearch(''); setShowFav(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 14px', background: catId === cat.id && !showFav
                    ? 'rgba(167,139,250,0.12)' : 'none',
                  border: 'none',
                  borderLeft: `2px solid ${catId === cat.id && !showFav ? '#a78bfa' : 'transparent'}`,
                  color: catId === cat.id && !showFav ? '#a78bfa' : '#71717a',
                  fontSize: 12, cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                <span style={{ fontSize: 14 }}>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 4, paddingTop: 4 }}>
              <button
                onClick={() => { setShowFav(true); setSearch(''); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                  background: showFav ? 'rgba(251,191,36,0.1)' : 'none',
                  border: 'none', borderLeft: `2px solid ${showFav ? '#fbbf24' : 'transparent'}`,
                  color: showFav ? '#fbbf24' : '#71717a', fontSize: 12, cursor: 'pointer',
                  textAlign: 'left', width: '100%',
                }}
              >
                <span>⭐</span><span>Favoris</span>
              </button>
              <button
                onClick={() => { setShowFav(false); setSearch('recent'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                  background: 'none', border: 'none', borderLeft: '2px solid transparent',
                  color: '#71717a', fontSize: 12, cursor: 'pointer', textAlign: 'left', width: '100%',
                }}
              >
                <span>🕐</span><span>Récents</span>
              </button>
            </div>
          </div>

          {/* Center grid */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{
              flex: 1, overflowY: 'auto', padding: 12,
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
              alignContent: 'start', scrollbarWidth: 'none',
            }}>
              {displayItems.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#3f3f46', padding: 40, fontSize: 13 }}>
                  Aucun résultat pour "{search}"
                </div>
              )}
              {displayItems.map((item, i) => {
                const isSelected = selected?.name === item.name;
                const isFav = favorites.has(item.id);
                const tc = tagColor(item.tags);
                return (
                  <div
                    key={`${item.id}-${i}`}
                    onClick={() => setSelected(item)}
                    onDoubleClick={() => spawnItem(item)}
                    style={{
                      background: isSelected ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isSelected ? 'rgba(167,139,250,0.4)' : 'rgba(255,255,255,0.05)'}`,
                      borderRadius: 10, padding: '10px 8px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      transition: 'all 0.1s', position: 'relative',
                    }}
                  >
                    {isFav && (
                      <span style={{ position: 'absolute', top: 4, right: 4, fontSize: 9 }}>⭐</span>
                    )}
                    <div style={{
                      width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 22,
                      background: `${tc}15`, border: `1px solid ${tc}25`,
                    }}>
                      {item.icon}
                    </div>
                    <div style={{ fontSize: 10, color: '#a1a1aa', textAlign: 'center', lineHeight: 1.3, fontWeight: 500 }}>
                      {item.name}
                    </div>
                    {item.mass && (
                      <div style={{ fontSize: 9, color: '#52525b' }}>{item.mass}kg</div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom info bar */}
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.05)',
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12,
              background: 'rgba(0,0,0,0.2)', minHeight: 62,
            }}>
              {selected ? (
                <>
                  <span style={{ fontSize: 24 }}>{selected.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#e4e4e7' }}>{selected.name}</div>
                    <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>{selected.desc}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      {selected.tags.map(t => (
                        <span key={t} style={{
                          fontSize: 9, padding: '1px 6px', borderRadius: 4,
                          background: `${tagColor([t])}15`, color: tagColor([t]),
                        }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleFav(selected.id)}
                    style={{
                      background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 6, color: favorites.has(selected.id) ? '#fbbf24' : '#52525b',
                      cursor: 'pointer', padding: '5px 8px', fontSize: 13,
                    }}
                  >
                    {favorites.has(selected.id) ? '★' : '☆'}
                  </button>
                  <button
                    onClick={() => spawnItem(selected)}
                    style={{
                      background: 'linear-gradient(135deg, #7b6fff, #a78bfa)',
                      border: 'none', borderRadius: 8, color: '#fff',
                      cursor: 'pointer', padding: '8px 20px', fontSize: 12, fontWeight: 700,
                      boxShadow: '0 4px 14px rgba(123,111,255,0.4)',
                    }}
                  >
                    ⬡ SPAWNER ICI
                  </button>
                </>
              ) : (
                <div style={{ color: '#3f3f46', fontSize: 12 }}>
                  Cliquez sur un objet pour le sélectionner · Double-clic pour spawner
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer quick actions */}
        <div style={{
          display: 'flex', gap: 6, padding: '8px 14px',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          background: 'rgba(0,0,0,0.3)',
        }}>
          {[
            { icon: '🎯', label: 'Snap Grid' },
            { icon: '🔗', label: 'Weld' },
            { icon: '🎨', label: 'Color' },
            { icon: '🤖', label: 'TroxT Suggest' },
            { icon: '📡', label: 'Sync Live' },
            { icon: '💾', label: 'Save Preset' },
            { icon: '⚖️', label: 'Physics Override' },
            { icon: '📸', label: 'Snapshot' },
          ].map(a => (
            <div key={a.label} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <span style={{ fontSize: 11 }}>{a.icon}</span>
              <span style={{ fontSize: 9, color: '#71717a' }}>{a.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
