import { create } from "zustand"

export interface AgentState {
  id: string
  name: string
  status: string
  color: string
  orbit: number
  orbitIndex: number
  position: { x: number; y: number; z: number }
  currentLoad: number
  lastSeen: string | null
  currentTask: string | null
  qualityScore: Record<string, number> | null
  thirdEyeStatus: string | null
  brainValidated: boolean
  connectionsNeeded: string[]
  filesProduced: string[]
  history: Array<{ type: string; status: string; message: string; timestamp: string }>
}

export interface AuditEntry {
  timestamp: string
  type: string
  agentId: string
  message: string
  data: Record<string, any>
}

export interface LabStats {
  activeTasks: number
  completedToday: number
  blocked: number
  warnings: number
}

interface LabStore {
  agents: Record<string, AgentState>
  selectedAgent: string | null
  thirdEyeLevel: string
  activeCombo: string | null
  stats: LabStats
  auditLog: AuditEntry[]
  wsStatus: "connecting" | "connected" | "disconnected"
  setAgents: (agents: Record<string, AgentState>) => void
  updateAgent: (agentId: string, agent: AgentState) => void
  setAgentOffline: (agentId: string) => void
  selectAgent: (agentId: string | null) => void
  setThirdEyeLevel: (level: string) => void
  setActiveCombo: (combo: string | null) => void
  setStats: (stats: LabStats) => void
  addAuditEntry: (entry: AuditEntry) => void
  setAuditBatch: (entries: AuditEntry[]) => void
  setWsStatus: (status: "connecting" | "connected" | "disconnected") => void
  sendCommand: (agentId: string, type: string, payload?: Record<string, any>) => Promise<void>
  sendGlobalCommand: (type: string) => Promise<void>
}

const LAB_HTTP = "http://localhost:4242"

export const useLabStore = create<LabStore>((set, get) => ({
  agents: {},
  selectedAgent: null,
  thirdEyeLevel: "GREEN",
  activeCombo: null,
  stats: { activeTasks: 0, completedToday: 0, blocked: 0, warnings: 0 },
  auditLog: [],
  wsStatus: "disconnected",

  setAgents: (agents) => set({ agents }),
  updateAgent: (agentId, agent) => set(s => ({ agents: { ...s.agents, [agentId]: agent } })),
  setAgentOffline: (agentId) => set(s => ({
    agents: {
      ...s.agents,
      [agentId]: s.agents[agentId] ? { ...s.agents[agentId], status: "offline", color: "GREY" } : s.agents[agentId]
    }
  })),
  selectAgent: (id) => set({ selectedAgent: id }),
  setThirdEyeLevel: (level) => set({ thirdEyeLevel: level }),
  setActiveCombo: (combo) => set({ activeCombo: combo }),
  setStats: (stats) => set({ stats }),
  addAuditEntry: (entry) => set(s => ({ auditLog: [entry, ...s.auditLog].slice(0, 200) })),
  setAuditBatch: (entries) => set({ auditLog: entries }),
  setWsStatus: (status) => set({ wsStatus: status }),

  sendCommand: async (agentId, type, payload = {}) => {
    try {
      await fetch(`${LAB_HTTP}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId, type, payload })
      })
    } catch(e) { console.error("[LabStore] sendCommand:", e) }
  },

  sendGlobalCommand: async (type) => {
    try {
      await fetch(`${LAB_HTTP}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      })
    } catch(e) { console.error("[LabStore] sendGlobal:", e) }
  }
}))
