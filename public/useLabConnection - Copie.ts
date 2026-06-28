import { useEffect, useRef } from "react"
import { useLabStore } from "../store/labStore"

const LAB_WS = "ws://localhost:4242"

let globalWS: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let isConnecting = false

function connectWS() {
  if (isConnecting) return
  if (globalWS?.readyState === WebSocket.OPEN) return
  if (globalWS?.readyState === WebSocket.CONNECTING) return

  isConnecting = true
  useLabStore.getState().setWsStatus("connecting")

  const ws = new WebSocket(LAB_WS)
  globalWS = ws

  ws.onopen = () => {
    isConnecting = false
    useLabStore.getState().setWsStatus("connected")
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  }

  ws.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data)
      const store = useLabStore.getState()
      if (data.type === "FULL_STATE") {
        if (data.agents) store.setAgents(data.agents)
        if (data.thirdEyeLevel) store.setThirdEyeLevel(data.thirdEyeLevel)
        if (data.activeCombo) store.setActiveCombo(data.activeCombo)
        if (data.stats) store.setStats(data.stats)
        if (data.auditLog) store.setAuditBatch(data.auditLog)
      }
      if (data.type === "AGENT_UPDATE") {
        if (data.agent) store.updateAgent(data.agent_id, data.agent)
        if (data.thirdEyeLevel) store.setThirdEyeLevel(data.thirdEyeLevel)
        if (data.stats) store.setStats(data.stats)
        if (data.auditEntry) store.addAuditEntry(data.auditEntry)
      }
      if (data.type === "AGENT_OFFLINE") {
        store.setAgentOffline(data.agent_id)
      }
    } catch(e) { console.error("[TroxT Lab] WS parse:", e) }
  }

  ws.onclose = () => {
    isConnecting = false
    globalWS = null
    useLabStore.getState().setWsStatus("disconnected")
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => { reconnectTimer = null; connectWS() }, 4000)
    }
  }

  ws.onerror = () => ws.close()
}

export function useLabConnection() {
  const mounted = useRef(false)
  useEffect(() => {
    if (mounted.current) return
    mounted.current = true
    connectWS()
  }, [])

  return { wsStatus: useLabStore(s => s.wsStatus) }
}
