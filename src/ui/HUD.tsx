// EtherWorld RP — Port-Éther
// Interface HUD — argent, job, santé, minimap, interactions, véhicule

import React from 'react';
import type { PlayerState, InteractionDef } from '../shared/types';

interface HUDProps {
  player: PlayerState;
  currentStreet: string;
  nearestInteraction: InteractionDef | null;
  gameTime: number;
  isBuilding: boolean;
  currentVehicleFuel?: number;
  currentVehicleSpeed?: number;
  recentLogs: string[];
}

export const HUD: React.FC<HUDProps> = ({
  player,
  currentStreet,
  nearestInteraction,
  gameTime,
  isBuilding,
  currentVehicleFuel,
  currentVehicleSpeed,
  recentLogs,
}) => {
  const formatTime = (time: number): string => {
    const hours = Math.floor(time);
    const minutes = Math.floor((time - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getHealthColor = (health: number): string => {
    if (health > 70) return '#44cc44';
    if (health > 35) return '#ccaa22';
    return '#cc4444';
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      zIndex: 100,
    }}>
      {/* Coin supérieur gauche - Stats principales */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        background: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 8,
        padding: '12px 16px',
        minWidth: 200,
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 4 }}>
          {player.name}
        </div>
        <div style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>
          {player.cash.toLocaleString()} $ 💵
        </div>
        <div style={{ fontSize: 13, marginBottom: 4 }}>
          🏦 {player.bank.toLocaleString()} $
        </div>
        <div style={{ fontSize: 13, marginBottom: 4 }}>
          💼 {player.job.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </div>

        {/* Barre de santé */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
            <span>❤️ Santé</span>
            <span>{Math.round(player.health)}%</span>
          </div>
          <div style={{
            width: '100%',
            height: 6,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${player.health}%`,
              height: '100%',
              background: getHealthColor(player.health),
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Faim et Soif */}
        <div style={{ marginTop: 6, display: 'flex', gap: 16 }}>
          <div style={{ fontSize: 12 }}>
            🍔 {Math.round(player.hunger)}%
          </div>
          <div style={{ fontSize: 12 }}>
            💧 {Math.round(player.thirst)}%
          </div>
        </div>
      </div>

      {/* Coin supérieur droit - Infos monde */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        textAlign: 'right',
        background: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 8,
        padding: '12px 16px',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 4 }}>
          🕐 {formatTime(gameTime)}
        </div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          📍 {currentStreet || 'Port-Éther'}
        </div>
      </div>

      {/* Informations véhicule (quand en conduite) */}
      {player.isDriving && currentVehicleFuel !== undefined && (
        <div style={{
          position: 'absolute',
          bottom: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.7)',
          borderRadius: 8,
          padding: '10px 20px',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
          textAlign: 'center',
        }}>
          {currentVehicleSpeed !== undefined && (
            <div style={{ fontSize: 28, fontWeight: 'bold' }}>
              {Math.round(currentVehicleSpeed * 3.6)} km/h
            </div>
          )}
          <div style={{ fontSize: 12, marginTop: 4 }}>
            ⛽ {Math.round(currentVehicleFuel)}%
          </div>
        </div>
      )}

      {/* Prompt d'interaction */}
      {nearestInteraction && (
        <div style={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.75)',
          borderRadius: 6,
          padding: '10px 20px',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.2)',
          fontSize: 14,
          textAlign: 'center',
          animation: 'fadeIn 0.2s ease',
        }}>
          {nearestInteraction.label}
        </div>
      )}

      {/* Indicateur mode builder */}
      {isBuilding && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 20,
          transform: 'translateY(-50%)',
          background: 'rgba(0, 255, 136, 0.2)',
          borderRadius: 6,
          padding: '8px 12px',
          border: '1px solid rgba(0, 255, 136, 0.4)',
          fontSize: 12,
          color: '#00ff88',
        }}>
          🔨 MODE BUILDER
        </div>
      )}

      {/* Logs récents */}
      {recentLogs.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 80,
          right: 20,
          maxWidth: 300,
          textAlign: 'right',
        }}>
          {recentLogs.slice(-3).reverse().map((log, i) => (
            <div key={i} style={{
              background: 'rgba(0,0,0,0.5)',
              borderRadius: 4,
              padding: '4px 10px',
              margin: '2px 0',
              fontSize: 12,
              opacity: 1 - i * 0.2,
            }}>
              {log}
            </div>
          ))}
        </div>
      )}

      {/* Minicarte (simplifiée) */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 160,
        height: 160,
        background: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 8,
        border: '2px solid rgba(255,255,255,0.15)',
        overflow: 'hidden',
        backdropFilter: 'blur(8px)',
      }}>
        {/* Point joueur au centre */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 6,
          height: 6,
          background: '#00ff88',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 8px #00ff88',
        }} />
        {/* Points cardinaux */}
        <div style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', fontSize: 10, opacity: 0.5 }}>N</div>
        <div style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', fontSize: 10, opacity: 0.5 }}>S</div>
        <div style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', fontSize: 10, opacity: 0.5 }}>O</div>
        <div style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', fontSize: 10, opacity: 0.5 }}>E</div>
      </div>

      {/* Contrôles en bas à gauche */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        fontSize: 11,
        opacity: 0.5,
        background: 'rgba(0,0,0,0.4)',
        borderRadius: 6,
        padding: '8px 12px',
      }}>
        WASD/ZQSD — Déplacement | Shift — Sprint | Espace — Saut | E — Interagir | Tab — Souris
      </div>
    </div>
  );
};