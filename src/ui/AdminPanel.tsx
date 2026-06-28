// EtherWorld RP — Port-Éther
// Panneau d'administration — gestion joueurs, véhicules, propriétés, économie, logs

import React, { useState } from 'react';
import type { PlayerState, VehicleData, PropertyData, JobData, TransactionLog } from '../shared/types';

interface AdminPanelProps {
  players: PlayerState[];
  vehicles: VehicleData[];
  properties: PropertyData[];
  jobs: JobData[];
  transactions: TransactionLog[];
  onTeleportPlayer: (playerId: string, x: number, z: number) => void;
  onChangeJob: (playerId: string, jobId: string) => void;
  onGiveMoney: (playerId: string, amount: number) => void;
  onSpawnVehicle: (model: string, x: number, z: number) => void;
  onDeleteVehicle: (vehicleId: string) => void;
  onChangeWeather: (weather: string) => void;
  onChangeTime: (hour: number) => void;
  onResetWorld: () => void;
  onClose: () => void;
}

type TabType = 'players' | 'vehicles' | 'properties' | 'jobs' | 'economy' | 'logs' | 'world';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  players,
  vehicles,
  properties,
  jobs,
  transactions,
  onTeleportPlayer,
  onChangeJob,
  onGiveMoney,
  onSpawnVehicle,
  onDeleteVehicle,
  onChangeWeather,
  onChangeTime,
  onResetWorld,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('players');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'players', label: 'Joueurs', icon: '👥' },
    { id: 'vehicles', label: 'Véhicules', icon: '🚗' },
    { id: 'properties', label: 'Propriétés', icon: '🏠' },
    { id: 'jobs', label: 'Emplois', icon: '💼' },
    { id: 'economy', label: 'Économie', icon: '💰' },
    { id: 'logs', label: 'Logs', icon: '📋' },
    { id: 'world', label: 'Monde', icon: '🌍' },
  ];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 5, 15, 0.92)',
      zIndex: 2000,
      display: 'flex',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    }}>
      {/* Barre latérale */}
      <div style={{
        width: 200,
        background: 'rgba(255,255,255,0.03)',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <h2 style={{ fontSize: 18, marginBottom: 24, color: '#88ccff' }}>
          ⚙️ Admin Panel
        </h2>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 14px',
              background: activeTab === tab.id ? 'rgba(68, 255, 136, 0.12)' : 'transparent',
              border: activeTab === tab.id ? '1px solid rgba(68, 255, 136, 0.3)' : '1px solid transparent',
              borderRadius: 8,
              color: activeTab === tab.id ? '#44ff88' : '#ffffff',
              cursor: 'pointer',
              fontSize: 13,
              textAlign: 'left',
              marginBottom: 4,
              transition: 'all 0.2s',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={onClose}
          style={{
            padding: '10px',
            background: 'rgba(255,68,68,0.1)',
            border: '1px solid rgba(255,68,68,0.2)',
            borderRadius: 8,
            color: '#ff4444',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          ✕ Fermer
        </button>
      </div>

      {/* Contenu */}
      <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
        {activeTab === 'players' && (
          <div>
            <h3 style={{ fontSize: 20, marginBottom: 16 }}>👥 Joueurs ({players.length})</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>ID</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Nom</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Job</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Cash</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Banque</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 11 }}>{p.id.slice(0, 8)}</td>
                    <td style={{ padding: 8 }}>{p.name}</td>
                    <td style={{ padding: 8 }}>{p.job}</td>
                    <td style={{ padding: 8 }}>{p.cash.toLocaleString()} $</td>
                    <td style={{ padding: 8 }}>{p.bank.toLocaleString()} $</td>
                    <td style={{ padding: 8 }}>
                      <select
                        value={p.job}
                        onChange={(e) => onChangeJob(p.id, e.target.value)}
                        style={{
                          padding: '4px 8px',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: 4,
                          color: '#ffffff',
                          fontSize: 12,
                        }}
                      >
                        {jobs.map((j) => (
                          <option key={j.id} value={j.id}>{j.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => onGiveMoney(p.id, 1000)}
                        style={{
                          marginLeft: 8,
                          padding: '4px 8px',
                          background: 'rgba(68, 255, 136, 0.15)',
                          border: '1px solid rgba(68, 255, 136, 0.3)',
                          borderRadius: 4,
                          color: '#44ff88',
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        +1000$
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'vehicles' && (
          <div>
            <h3 style={{ fontSize: 20, marginBottom: 16 }}>🚗 Véhicules ({vehicles.length})</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>ID</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Modèle</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Plaque</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Propriétaire</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Carburant</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: 8, fontFamily: 'monospace', fontSize: 11 }}>{v.id.slice(0, 8)}</td>
                    <td style={{ padding: 8 }}>{v.model}</td>
                    <td style={{ padding: 8 }}>{v.plate}</td>
                    <td style={{ padding: 8 }}>{v.ownerId || 'Aucun'}</td>
                    <td style={{ padding: 8 }}>{Math.round(v.fuel)}%</td>
                    <td style={{ padding: 8 }}>
                      <button
                        onClick={() => onDeleteVehicle(v.id)}
                        style={{
                          padding: '4px 10px',
                          background: 'rgba(255,68,68,0.15)',
                          border: '1px solid rgba(255,68,68,0.3)',
                          borderRadius: 4,
                          color: '#ff4444',
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 16 }}>
              <input
                id="spawn-model"
                placeholder="Modèle"
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6,
                  color: '#ffffff',
                  marginRight: 8,
                }}
              />
              <input
                id="spawn-x"
                placeholder="X"
                type="number"
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6,
                  color: '#ffffff',
                  width: 80,
                  marginRight: 8,
                }}
              />
              <input
                id="spawn-z"
                placeholder="Z"
                type="number"
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 6,
                  color: '#ffffff',
                  width: 80,
                  marginRight: 8,
                }}
              />
              <button
                onClick={() => {
                  const model = (document.getElementById('spawn-model') as HTMLInputElement).value;
                  const x = parseFloat((document.getElementById('spawn-x') as HTMLInputElement).value);
                  const z = parseFloat((document.getElementById('spawn-z') as HTMLInputElement).value);
                  if (model && !isNaN(x) && !isNaN(z)) onSpawnVehicle(model, x, z);
                }}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(68, 255, 136, 0.15)',
                  border: '1px solid rgba(68, 255, 136, 0.3)',
                  borderRadius: 6,
                  color: '#44ff88',
                  cursor: 'pointer',
                }}
              >
                + Spawn véhicule
              </button>
            </div>
          </div>
        )}

        {activeTab === 'properties' && (
          <div>
            <h3 style={{ fontSize: 20, marginBottom: 16 }}>🏠 Propriétés ({properties.length})</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>Adresse</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Type</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Prix</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Propriétaire</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Verrouillée</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: 8 }}>{p.address}</td>
                    <td style={{ padding: 8 }}>{p.type}</td>
                    <td style={{ padding: 8 }}>{p.price.toLocaleString()} $</td>
                    <td style={{ padding: 8 }}>{p.ownerId || '❌ Libre'}</td>
                    <td style={{ padding: 8 }}>{p.locked ? '🔒 Oui' : '🔓 Non'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div>
            <h3 style={{ fontSize: 20, marginBottom: 16 }}>💼 Emplois ({jobs.length})</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>Emploi</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Salaire</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Grades</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Véhicules</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: 8 }}>{j.name}</td>
                    <td style={{ padding: 8 }}>{j.salary} $</td>
                    <td style={{ padding: 8 }}>{j.ranks.join(', ')}</td>
                    <td style={{ padding: 8 }}>{j.vehicleAccess.join(', ') || 'Aucun'}</td>
                    <td style={{ padding: 8 }}>{j.actions.length} actions</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'economy' && (
          <div>
            <h3 style={{ fontSize: 20, marginBottom: 16 }}>💰 Économie</h3>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{
                padding: 16,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 8,
                flex: 1,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, opacity: 0.6 }}>Transactions totales</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', marginTop: 4 }}>{transactions.length}</div>
              </div>
              <div style={{
                padding: 16,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 8,
                flex: 1,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, opacity: 0.6 }}>Total cash distribué</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', marginTop: 4, color: '#44ff88' }}>
                  {transactions.filter((t) => t.type === 'salary' || t.type === 'cash')
                    .reduce((sum, t) => sum + t.amount, 0)
                    .toLocaleString()} $
                </div>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: 6, textAlign: 'left' }}>Date</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Type</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>De</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Vers</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Montant</th>
                  <th style={{ padding: 6, textAlign: 'left' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(-50).reverse().map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: 6, fontFamily: 'monospace', fontSize: 10 }}>
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: 6 }}>{t.type}</td>
                    <td style={{ padding: 6, fontSize: 10 }}>{t.fromId || 'Système'}</td>
                    <td style={{ padding: 6, fontSize: 10 }}>{t.toId || 'Système'}</td>
                    <td style={{ padding: 6, color: '#44ff88' }}>{t.amount.toLocaleString()} $</td>
                    <td style={{ padding: 6, opacity: 0.7 }}>{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'logs' && (
          <div>
            <h3 style={{ fontSize: 20, marginBottom: 16 }}>📋 Logs Système</h3>
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 8,
              padding: 16,
              fontFamily: 'monospace',
              fontSize: 11,
              maxHeight: 500,
              overflow: 'auto',
            }}>
              {transactions.slice(-100).reverse().map((t) => (
                <div key={t.id} style={{ marginBottom: 4, opacity: 0.8 }}>
                  <span style={{ color: '#888' }}>
                    [{new Date(t.timestamp).toLocaleString()}]
                  </span>{' '}
                  <span style={{ color: '#88ccff' }}>{t.type}</span>{' '}
                  <span>{t.description}</span>
                  <span style={{ color: '#44ff88' }}> ({t.amount}