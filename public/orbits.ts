// ============================================================
// TROXTLAB CONFIG
// C:\TroxTServerRP\apps\troxtlab\src\config\orbits.ts
// ============================================================

export const ORBIT_RADII = [0, 90, 160, 230, 300]

export const ORBIT_SPEEDS = [0, 0.004, 0.0025, 0.0015, 0.001]

export const AGENT_COLORS: Record<string, string> = {
  GREY:   '#555577',
  BLUE:   '#4488ff',
  GREEN:  '#44ff88',
  YELLOW: '#ffdd44',
  ORANGE: '#ff8844',
  RED:    '#ff3333',
  PURPLE: '#aa44ff'
}

export const AGENT_GLOW: Record<string, string> = {
  GREY:   'rgba(85,85,119,0)',
  BLUE:   'rgba(68,136,255,0.4)',
  GREEN:  'rgba(68,255,136,0.5)',
  YELLOW: 'rgba(255,221,68,0.4)',
  ORANGE: 'rgba(255,136,68,0.5)',
  RED:    'rgba(255,51,51,0.6)',
  PURPLE: 'rgba(170,68,255,0.5)'
}

export const STATUS_LABELS: Record<string, string> = {
  offline:    'HORS LIGNE',
  idle:       'EN ATTENTE',
  working:    'EN TRAVAIL',
  thinking:   'ANALYSE',
  waiting:    'PAUSE',
  paused:     'PAUSE',
  error:      'ERREUR',
  stopped:    'ARRÊTÉ',
  validating: 'VALIDATION'
}

export const THIRD_EYE_MESSAGES: Record<string, string> = {
  GREEN:  '',
  BLUE:   'THIRD EYE — SURVEILLANCE ACTIVE',
  YELLOW: 'THIRD EYE — ATTENTION REQUISE',
  ORANGE: 'THIRD EYE — RISQUE DÉTECTÉ — RALENTIR',
  RED:    'THIRD EYE — DANGER — ARRÊT RECOMMANDÉ'
}
