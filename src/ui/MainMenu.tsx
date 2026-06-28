// EtherWorld RP — Port-Éther
// Menu principal — démarrer, configuration initiale

import React, { useState } from 'react';

interface MainMenuProps {
  onStart: (config: MainMenuConfig) => void;
  onOpenAdmin: () => void;
  onOpenBuilder: () => void;
}

export interface MainMenuConfig {
  startHour: number;
  jacketColor: string;
  gridSnap: number;
  playerName: string;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStart,
  onOpenAdmin,
  onOpenBuilder,
}) => {
  const [config, setConfig] = useState<MainMenuConfig>({
    startHour: 12,
    jacketColor: '#4488cc',
    gridSnap: 0.5,
    playerName: 'Citoyen',
  });

  const jacketColors = [
    { name: 'Bleu', color: '#4488cc' },
    { name: 'Rouge', color: '#cc4444' },
    { name: 'Vert', color: '#44aa44' },
    { name: 'Noir', color: '#333333' },
    { name: 'Blanc', color: '#dddddd' },
    { name: 'Orange', color: '#dd8833' },
  ];

  const gridSnaps = [0.0, 0.25, 0.5, 1.0];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a1a2a 0%, #1a2a4a 50%, #0a1a2a 100%)',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 48,
        maxWidth: 480,
        width: '90%',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)',
      }}>
        <h1 style={{
          fontSize: 36,
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: 8,
          background: 'linear-gradient(135deg, #88ccff, #44ff88)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          EtherWorld RP
        </h1>
        <p style={{
          textAlign: 'center',
          fontSize: 14,
          opacity: 0.6,
          marginBottom: 32,
          letterSpacing: 2,
        }}>
          PORT-ÉTHER
        </p>

        {/* Nom du joueur */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, opacity: 0.7, display: 'block', marginBottom: 6 }}>
            Nom du personnage
          </label>
          <input
            value={config.playerName}
            onChange={(e) => setConfig({ ...config, playerName: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              color: '#ffffff',
              fontSize: 15,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            placeholder="Entrez votre nom..."
          />
        </div>

        {/* Heure de départ */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, opacity: 0.7, display: 'block', marginBottom: 6 }}>
            Heure de départ 🕐
          </label>
          <input
            type="range"
            min={0}
            max={23}
            value={config.startHour}
            onChange={(e) => setConfig({ ...config, startHour: parseInt(e.target.value) })}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: 13, opacity: 0.5, textAlign: 'center', marginTop: 4 }}>
            {config.startHour.toString().padStart(2, '0')}:00
          </div>
        </div>

        {/* Couleur veste */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, opacity: 0.7, display: 'block', marginBottom: 8 }}>
            Couleur de la veste
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {jacketColors.map((jc) => (
              <button
                key={jc.color}
                onClick={() => setConfig({ ...config, jacketColor: jc.color })}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: jc.color,
                  border: config.jacketColor === jc.color
                    ? '3px solid #ffffff'
                    : '3px solid transparent',
                  cursor: 'pointer',
                  boxShadow: config.jacketColor === jc.color
                    ? '0 0 12px rgba(255,255,255,0.3)'
                    : 'none',
                  transition: 'all 0.2s',
                }}
                title={jc.name}
              />
            ))}
          </div>
        </div>

        {/* Précision grille builder */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, opacity: 0.7, display: 'block', marginBottom: 8 }}>
            Précision de grille 🔲
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {gridSnaps.map((snap) => (
              <button
                key={snap}
                onClick={() => setConfig({ ...config, gridSnap: snap })}
                style={{
                  padding: '8px 16px',
                  background: config.gridSnap === snap
                    ? 'rgba(68, 255, 136, 0.2)'
                    : 'rgba(255,255,255,0.06)',
                  border: config.gridSnap === snap
                    ? '1px solid rgba(68, 255, 136, 0.5)'
                    : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6,
                  color: config.gridSnap === snap ? '#44ff88' : '#ffffff',
                  cursor: 'pointer',
                  fontSize: 14,
                  transition: 'all 0.2s',
                }}
              >
                {snap === 0 ? 'Libre' : `${snap}m`}
              </button>
            ))}
          </div>
        </div>

        {/* Boutons */}
        <button
          onClick={() => onStart(config)}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: 'linear-gradient(135deg, #44ff88 0%, #22cc66 100%)',
            border: 'none',
            borderRadius: 10,
            color: '#0a1a2a',
            fontSize: 18,
            fontWeight: 'bold',
            cursor: 'pointer',
            marginBottom: 12,
            transition: 'transform 0.1s, box-shadow 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(68, 255, 136, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          🎮 Démarrer l'aventure
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onOpenBuilder}
            style={{
              flex: 1,
              padding: '10px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#88ccff',
              cursor: 'pointer',
              fontSize: 13,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          >
            🔨 Builder
          </button>
          <button
            onClick={onOpenAdmin}
            style={{
              flex: 1,
              padding: '10px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#ff8866',
              cursor: 'pointer',
              fontSize: 13,
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          >
            ⚙️ Admin
          </button>
        </div>

        <p style={{
          textAlign: 'center',
          fontSize: 11,
          opacity: 0.35,
          marginTop: 20,
        }}>
          EtherWorld RP — Port-Éther v0.1.0
        </p>
      </div>
    </div>
  );
};