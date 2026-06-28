// EtherWorld RP — Port-Éther
// Menu Builder / GMod — catalogue props, recherche, catégories

import React, { useState } from 'react';
import type { PropData, PropCategory } from '../shared/types';

interface GModMenuProps {
  catalog: PropData[];
  currentPropId: string | null;
  onSelectProp: (propId: string) => void;
  onDeselectProp: () => void;
  onResetProps: () => void;
  isActive: boolean;
  onClose: () => void;
}

const categoryLabels: Record<PropCategory, { label: string; icon: string }> = {
  meubles: { label: 'Meubles', icon: '🛋️' },
  decor: { label: 'Décor', icon: '🎨' },
  appareils: { label: 'Appareils', icon: '📺' },
  exterieur: { label: 'Extérieur', icon: '🌳' },
  construction: { label: 'Construction', icon: '🏗️' },
  business: { label: 'Business', icon: '🏪' },
  utilitaire: { label: 'Utilitaire', icon: '🔧' },
};

export const GModMenu: React.FC<GModMenuProps> = ({
  catalog,
  currentPropId,
  onSelectProp,
  onDeselectProp,
  onResetProps,
  isActive,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PropCategory | 'all'>('all');

  const filteredProps = catalog.filter((prop) => {
    const matchSearch = prop.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === 'all' || prop.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const currentProp = currentPropId ? catalog.find((p) => p.id === currentPropId) : null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: 380,
      height: '100%',
      background: 'rgba(5, 10, 25, 0.95)',
      borderLeft: '1px solid rgba(255,255,255,0.1)',
      zIndex: 1500,
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      backdropFilter: 'blur(12px)',
    }}>
      {/* En-tête */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h2 style={{ fontSize: 18, margin: 0, color: '#44ff88' }}>
          🔨 Catalogue Builder
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            color: '#ffffff',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          ✕
        </button>
      </div>

      {/* Barre de recherche */}
      <div style={{ padding: '12px 16px' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Rechercher un prop..."
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            color: '#ffffff',
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Catégories */}
      <div style={{
        padding: '0 16px 12px',
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setSelectedCategory('all')}
          style={{
            padding: '6px 12px',
            background: selectedCategory === 'all' ? 'rgba(68, 255, 136, 0.15)' : 'rgba(255,255,255,0.05)',
            border: selectedCategory === 'all' ? '1px solid rgba(68, 255, 136, 0.3)' : '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6,
            color: selectedCategory === 'all' ? '#44ff88' : '#ffffff',
            cursor: 'pointer',
            fontSize: 12,
            transition: 'all 0.2s',
          }}
        >
          Tous
        </button>
        {(Object.entries(categoryLabels) as [PropCategory, { label: string; icon: string }][]).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            style={{
              padding: '6px 12px',
              background: selectedCategory === key ? 'rgba(68, 255, 136, 0.15)' : 'rgba(255,255,255,0.05)',
              border: selectedCategory === key ? '1px solid rgba(68, 255, 136, 0.3)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6,
              color: selectedCategory === key ? '#44ff88' : '#ffffff',
              cursor: 'pointer',
              fontSize: 12,
              transition: 'all 0.2s',
            }}
          >
            {val.icon} {val.label}
          </button>
        ))}
      </div>

      {/* Liste des props */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 16px' }}>
        {filteredProps.length === 0 && (
          <div style={{ textAlign: 'center', opacity: 0.4, padding: 40, fontSize: 13 }}>
            Aucun prop trouvé
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {filteredProps.map((prop) => (
            <button
              key={prop.id}
              onClick={() => onSelectProp(prop.id)}
              style={{
                padding: 12,
                background: currentPropId === prop.id
                  ? 'rgba(68, 255, 136, 0.12)'
                  : 'rgba(255,255,255,0.03)',
                border: currentPropId === prop.id
                  ? '1px solid rgba(68, 255, 136, 0.4)'
                  : '1px solid rgba(255,255,255,0.06)',
                borderRadius: 8,
                color: '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <div style={{
                width: '100%',
                height: 60,
                background: `rgba(${parseInt(prop.color.toString(16).slice(0, 2), 16)}, ${parseInt(prop.color.toString(16).slice(2, 4), 16)}, ${parseInt(prop.color.toString(16).slice(4, 6), 16)}, 0.3)`,
                borderRadius: 4,
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}>
                🏗️
              </div>
              <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 2 }}>
                {prop.name}
              </div>
              <div style={{ fontSize: 11, opacity: 0.5 }}>
                {prop.price} $
              </div>
              <div style={{ fontSize: 10, opacity: 0.3, marginTop: 2 }}>
                {prop.size.x.toFixed(1)}×{prop.size.y.toFixed(1)}×{prop.size.z.toFixed(1)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Barre d'actions en bas */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        gap: 8,
      }}>
        <button
          onClick={onDeselectProp}
          disabled={!currentPropId}
          style={{
            flex: 1,
            padding: '10px',
            background: 'rgba(255,68,68,0.1)',
            border: currentPropId ? '1px solid rgba(255,68,68,0.3)' : '1px solid rgba(255,68,68,0.05)',
            borderRadius: 8,
            color: currentPropId ? '#ff4444' : '#555555',
            cursor: currentPropId ? 'pointer' : 'default',
            fontSize: 13,
          }}
        >
          Déséquiper
        </button>
        <button
          onClick={onResetProps}
          style={{
            flex: 1,
            padding: '10px',
            background: 'rgba(255, 136, 0, 0.1)',
            border: '1px solid rgba(255, 136, 0, 0.3)',
            borderRadius: 8,
            color: '#ff8800',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Reset props
        </button>
      </div>
    </div>
  );
};