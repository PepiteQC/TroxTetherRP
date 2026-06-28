import { X } from 'lucide-react';
import { GarmentItem } from '../types';

interface ProductPopupProps {
  item: GarmentItem | null;
  onClose: () => void;
}

/** Popup d'information produit (marque, type, prix) pour la Boutique Éther */
export function ProductPopup({ item, onClose }: ProductPopupProps) {
  if (!item) return null;
  return (
    <div
      id="boutique-product-popup"
      style={{
        position: 'fixed',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 12, 20, 0.96)',
        border: '1px solid rgba(167, 139, 250, 0.4)',
        borderRadius: 14,
        padding: '18px 28px',
        zIndex: 100,
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        minWidth: 350,
        boxShadow: '0 0 40px rgba(124, 58, 237, 0.25)',
      }}
      className="ui-interactive animate-bounce-short border-violet-500/50"
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 8,
          background: item.color,
          border: '2px solid rgba(201, 168, 76, 0.5)',
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1 }}>
        <div
          style={{
            color: '#a78bfa',
            fontSize: 10,
            letterSpacing: 3,
            textTransform: 'uppercase',
            marginBottom: 2,
          }}
        >
          {item.type}
        </div>
        <div style={{ color: '#c9a84c', fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
          {item.brand}
        </div>
        <div style={{ color: '#64748b', fontSize: 11 }}>{item.tag}</div>
      </div>
      <div style={{ textAlign: 'right', marginRight: 8 }}>
        <div style={{ color: '#f0ede8', fontSize: 20, fontWeight: 700 }}>{item.price}</div>
        <div style={{ color: '#334155', fontSize: 9, letterSpacing: 1 }}>+ taxes</div>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: '#64748b',
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
        }}
        className="hover:text-white transition"
        aria-label="Fermer"
      >
        <X size={18} />
      </button>
    </div>
  );
}
