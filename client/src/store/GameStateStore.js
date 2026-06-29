import { create } from 'zustand'

let ws = null

export const useGameStore = create((set, get) => ({
  // État monde
  players:    [],
  world:      { buildings: [], zones: [], props: [] },
  myPlayer:   null,
  chat:       [],
  riskLevel:  'GREEN',

  // Connexion WebSocket
  connect: (playerId) => {
    ws = new WebSocket('ws://localhost:3000')

    ws.onopen = () => {
      console.log('🔌 Connecté à EtherWorld')
      ws.send(JSON.stringify({ 
        type: 'PLAYER_JOIN', 
        payload: { playerId } 
      }))
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)
      get().handleMessage(msg)
    }

    ws.onclose = () => {
      console.log('⚡ Déconnecté')
      // Reconnexion auto après 3s
      setTimeout(() => get().connect(playerId), 3000)
    }
  },

  // Traitement messages serveur
  handleMessage: (msg) => {
    switch (msg.type) {
      case 'WORLD_STATE':
        set({ world: msg.data.world, players: msg.data.players })
        break
      case 'PLAYER_UPDATE':
        set(s => ({
          players: s.players.map(p => 
            p.id === msg.data.id ? { ...p, ...msg.data } : p
          )
        }))
        break
      case 'CHAT':
        set(s => ({ chat: [...s.chat.slice(-100), msg.data] }))
        break
      case 'RISK_UPDATE':
        set({ riskLevel: msg.data.level })
        break
    }
  },

  // Envoyer une action
  send: (type, payload) => {
    if (ws?.readyState === 1) {
      ws.send(JSON.stringify({ type, payload }))
    }
  },
}))