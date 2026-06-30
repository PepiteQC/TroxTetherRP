import { useState, useEffect, useCallback, memo } from 'react';
import { useGameState, setGlobal, addChat } from '../../store';
import type { InventoryItem } from '../../store';

// ── Inventaire par défaut EtherWorld RP ────────────────────────────────────

const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: 'i1', type: 'admin_badge', name: 'Badge Admin', icon: '🛡', quantity: 1, rarity: 'legendary', category: 'keyitem', description: 'Accès total au monde EtherWorld RP.', stackable: false },
  { id: 'i2', type: 'room_keycard', name: 'Carte Chambre 305', icon: '🔑', quantity: 1, rarity: 'rare', category: 'keyitem', description: 'Accès à la suite présidentielle.', stackable: false },
  { id: 'i3', type: 'health_pack', name: 'Kit Médical', icon: '🩹', quantity: 3, rarity: 'uncommon', category: 'consumable', description: 'Restaure 50 HP. Usage unique.', stackable: true },
  { id: 'i4', type: 'radio', name: 'Radio TroxT', icon: '📻', quantity: 1, rarity: 'epic', category: 'tool', description: 'Communication directe avec TroxT IA.', stackable: false },
  { id: 'i5', type: 'ether_coin', name: 'Ether Coin', icon: '⬡', quantity: 500, rarity: 'common', category: 'material', description: 'Monnaie officielle EtherWorld.', stackable: true },
  { id: 'i6', type: 'spawn_gun', name: 'Spawn Gun', icon: '🔫', quantity: 1, rarity: 'epic', category: 'tool', description: 'Spawne des objets à distance.', stackable: false },
  { id: 'i7', type: 'physics_gun', name: 'Physics Gun', icon: '⚡', quantity: 1, rarity: 'legendary', category: 'weapon', description: 'Attire ou repousse les PhysicsProps.', stackable: false },
  { id: 'i8', type: 'ether_bread', name: 'Pain EtherWorld', icon: '🥖', quantity: 5, rarity: 'common', category: 'consumable', description: 'Restaure 10 HP. Spécialité québécoise.', stackable: true },
  { id: 'i9', type: 'map_scroll', name: 'Carte du Monde', icon: '🗺', quantity: 1, rarity: 'uncommon', category: 'keyitem', description: 'Affiche la carte complète du serveur.', stackable: false },
  { id: 'i10', type: 'troxt_chip', name: 'Puce TroxT v3', icon: '🧠', quantity: 1, rarity: 'legendary', category: 'material', description: 'Module IA NexusCore. Ne pas perdre.', stackable: false },
  { id: 'i11', type: 'rope', name: 'Corde', icon: '🪢', quantity: 10, rarity: 'common', category: 'tool', description: 'Outil Rope — relie 2 props.', stackable: true },
  { id: 'i12', type: 'color_spray', name: 'Spray Couleur', icon: '🎨', quantity: 1, rarity: 'uncommon', category: 'tool', description: 'Applique une couleur custom.', stackable: false },
];

const RARITY_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  common:    { color: '#a1a1aa', bg: 'rgba(161,161,170,0.08)', label: 'Commun' },
  uncommon:  { color: '#4ade80', bg: 'rgba(74,222,128,0.08)', label: 'Peu commun' },
  rare:      { color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', label: 'Rare' },
  epic:      { color: '#c084fc', bg: 'rgba(192,132,252,0.08)', label: 'Épique' },
  legendary: { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', label: 'Légendaire' },
};

const CAT_ICONS: Record<string, string> = {
  weapon: '⚔️', tool: '🔧', consumable: '🧃', keyitem: '🔑', material: '💎', prop: '📦',
};

const TABS = ['Tout', 'Armes', 'Outils', 'Conso.', 'Clés', 'Matériaux'] as const;
type Tab = typeof TABS[number];
const TAB_CAT: Record<Tab, string | null> = {
  'Tout': null, 'Armes': 'weapon', 'Outils': 'tool',
  'Conso.': 'consumable', 'Clés': 'keyitem', 'Matériaux': 'material',
};

// ── Component ──────────────────────────────────────────────────────────────

export const InventoryPanel = memo(function InventoryPanel() {
  const inventoryOpen = useGameState(s => s.inventoryOpen);
  const playerCard = useGameState(s => s.playerCard);

  const [items, setItems] = useState<InventoryItem[]>(DEFAULT_INVENTORY);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [tab, setTab] = useState<Tab>('Tout');
  const [contextMenu, setContextMenu] = useState<{ item: InventoryItem; x: number; y: number } | null>(null);

  // Press 'i' to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setGlobal({ inventoryOpen: !inventoryOpen });
      }
      if (e.key === 'Escape' && inventoryOpen) {
        setGlobal({ inventoryOpen: false });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [inventoryOpen]);

  const useItem = useCallback((item: InventoryItem) => {
    if (item.category === 'consumable' && item.quantity > 0) {
      setItems(prev => prev.map(i =>
        i.id === item.id
          ? { ...i, quantity: i.quantity - 1 }
          : i
      ).filter(i => i.quantity > 0));
      addChat('Système', `✅ Utilisé : ${item.name}`, 'system');
      setContextMenu(null);
    }
  }, []);

  const dropItem = useCallback((item: InventoryItem) => {
    setItems(prev => prev.filter(i => i.id !== item.id));
    if (selected?.id === item.id) setSelected(null);
    addChat('Système', `📦 Jeté : ${item.name}`, 'system');
    setContextMenu(null);
  }, [selected]);

  const filteredItems = tab === 'Tout'
    ? items
    : items.filter(i => i.category === TAB_CAT[tab]);

  const totalWeight = items.length;
  const maxSlots = 20;

  if (!inventoryOpen) return null;

  const rs = selected ? RARITY_STYLES[selected.rarity] : null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 55,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
      onClick={() => { setGlobal({ inventoryOpen: false }); setContextMenu(null); }}
    >
      <div
        style={{
          width: 720, maxHeight: '85vh', background: '#0d0d12',
          border: '1px solid rgba(167,139,250,0.2)', borderRadius: 16,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.9)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(167,139,250,0.04)',
        }}>
          <span style={{ fontSize: 20 }}>🎒</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#e4e4e7' }}>Inventaire</div>
            <div style={{ fontSize: 10, color: '#52525b' }}>EtherWorld RP · {playerCard.toUpperCase()}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Slots bar */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
              <div style={{ fontSize: 10, color: '#52525b' }}>{totalWeight}/{maxSlots} slots</div>
              <div style={{ width: 80, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 99 }}>
                <div style={{
                  width: `${(totalWeight / maxSlots) * 100}%`, height: '100%',
                  background: totalWeight > 15 ? '#ef4444' : '#a78bfa', borderRadius: 99,
                  transition: 'width 0.3s',
                }} />
              </div>
            </div>
            {/* Ether coins */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: 8, padding: '4px 10px',
            }}>
              <span style={{ fontSize: 14 }}>⬡</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>
                {items.find(i => i.type === 'ether_coin')?.quantity ?? 0}
              </span>
            </div>
            <button
              onClick={() => setGlobal({ inventoryOpen: false })}
              style={{ background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', fontSize: 18 }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 2, padding: '0 18px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'none', border: 'none', padding: '8px 12px',
                fontSize: 11, cursor: 'pointer',
                color: tab === t ? '#a78bfa' : '#71717a',
                borderBottom: `2px solid ${tab === t ? '#a78bfa' : 'transparent'}`,
                fontWeight: tab === t ? 600 : 400,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {/* Slot grid */}
          <div style={{ flex: 1, padding: 16, overflowY: 'auto', scrollbarWidth: 'none' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8,
            }}>
              {filteredItems.map(item => {
                const rs = RARITY_STYLES[item.rarity];
                const isSel = selected?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelected(isSel ? null : item)}
                    onContextMenu={e => {
                      e.preventDefault();
                      setContextMenu({ item, x: e.clientX, y: e.clientY });
                    }}
                    style={{
                      background: isSel ? rs.bg : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isSel ? rs.color + '60' : rs.color + '20'}`,
                      borderRadius: 10, padding: '10px 8px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      position: 'relative', transition: 'all 0.12s',
                    }}
                  >
                    <div style={{ fontSize: 26 }}>{item.icon}</div>
                    <div style={{ fontSize: 10, color: '#a1a1aa', textAlign: 'center', lineHeight: 1.3, fontWeight: 500 }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 9, color: rs.color, fontWeight: 600 }}>{rs.label}</div>
                    {item.quantity > 1 && (
                      <div style={{
                        position: 'absolute', top: 4, right: 5,
                        fontSize: 9, color: '#e4e4e7', background: 'rgba(0,0,0,0.6)',
                        borderRadius: 4, padding: '1px 4px', fontWeight: 700,
                      }}>
                        ×{item.quantity}
                      </div>
                    )}
                    <div style={{
                      position: 'absolute', bottom: 4, left: 5,
                      fontSize: 11,
                    }}>
                      {CAT_ICONS[item.category]}
                    </div>
                  </div>
                );
              })}
              {/* Empty slots */}
              {Array.from({ length: Math.max(0, maxSlots - filteredItems.length) }).map((_, i) => (
                <div key={`empty-${i}`} style={{
                  background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.04)',
                  borderRadius: 10, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 18, color: '#27272a' }}>+</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right detail panel */}
          <div style={{
            width: 200, borderLeft: '1px solid rgba(255,255,255,0.05)',
            padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {selected && rs ? (
              <>
                <div style={{
                  background: rs.bg, border: `1px solid ${rs.color}30`,
                  borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 40 }}>{selected.icon}</span>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#e4e4e7', textAlign: 'center' }}>
                    {selected.name}
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: rs.color,
                    background: `${rs.color}15`, padding: '2px 8px', borderRadius: 20,
                    textTransform: 'uppercase', letterSpacing: 1,
                  }}>
                    {rs.label}
                  </div>
                </div>

                <div style={{ fontSize: 11, color: '#71717a', lineHeight: 1.6 }}>
                  {selected.description}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: '#52525b' }}>Catégorie</span>
                    <span style={{ color: '#a1a1aa' }}>{selected.category}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: '#52525b' }}>Quantité</span>
                    <span style={{ color: '#a1a1aa' }}>×{selected.quantity}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: '#52525b' }}>Empilable</span>
                    <span style={{ color: selected.stackable ? '#4ade80' : '#71717a' }}>
                      {selected.stackable ? 'Oui' : 'Non'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
                  {selected.category === 'consumable' && (
                    <button
                      onClick={() => useItem(selected)}
                      style={{
                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                        border: 'none', borderRadius: 8, color: '#fff',
                        cursor: 'pointer', padding: '8px', fontSize: 12, fontWeight: 700,
                      }}
                    >
                      ✅ Utiliser
                    </button>
                  )}
                  <button
                    onClick={() => dropItem(selected)}
                    style={{
                      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                      borderRadius: 8, color: '#ef4444', cursor: 'pointer', padding: '7px', fontSize: 11,
                    }}
                  >
                    📦 Jeter
                  </button>
                </div>
              </>
            ) : (
              <div style={{ color: '#27272a', fontSize: 12, textAlign: 'center', marginTop: 40, lineHeight: 1.8 }}>
                Sélectionnez<br />un objet<br />pour les détails<br />
                <span style={{ fontSize: 11, color: '#1c1c24', display: 'block', marginTop: 8 }}>
                  Clic droit → options
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 18px', borderTop: '1px solid rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(0,0,0,0.2)', fontSize: 10, color: '#3f3f46',
        }}>
          <span style={{ color: '#52525b' }}>⬡ EtherWorld RP</span>
          <span>·</span>
          <span>TroxT NexusCore v3</span>
          <span style={{ marginLeft: 'auto' }}>
            <kbd style={{ background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: 4 }}>I</kbd>
            {' '}Fermer
          </span>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed', left: contextMenu.x, top: contextMenu.y,
            background: '#111118', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, overflow: 'hidden', zIndex: 999, minWidth: 140,
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {[
            { label: '👁 Inspecter', action: () => { setSelected(contextMenu.item); setContextMenu(null); } },
            ...(contextMenu.item.category === 'consumable' ? [{ label: '✅ Utiliser', action: () => useItem(contextMenu.item) }] : []),
            { label: '📦 Jeter', action: () => dropItem(contextMenu.item) },
            { label: '❌ Annuler', action: () => setContextMenu(null) },
          ].map(opt => (
            <button
              key={opt.label}
              onClick={opt.action}
              style={{
                width: '100%', display: 'block', background: 'none', border: 'none',
                padding: '8px 14px', fontSize: 12, color: '#a1a1aa', cursor: 'pointer',
                textAlign: 'left', transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
