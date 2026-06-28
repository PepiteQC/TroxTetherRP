// ============================================================
// AGENTS LIST + AUDIT LOG
// C:\TroxTServerRP\apps\troxtlab\src\components\panels\AgentsList.tsx
// ============================================================

import { useLabStore }   from '../../store/labStore'
import { AGENT_COLORS }  from '../../config/orbits'

export function AgentsList() {
  const agents      = useLabStore(s => s.agents)
  const selectedId  = useLabStore(s => s.selectedAgent)
  const selectAgent = useLabStore(s => s.selectAgent)

  return (
    <div className="flex flex-col gap-1 p-2">
      {Object.values(agents).map(agent => {
        const color = AGENT_COLORS[agent.color] || '#555577'
        const isSelected = agent.id === selectedId
        const lastMsg = agent.history?.[0]?.message || '—'

        return (
          <div
            key={agent.id}
            onClick={() => selectAgent(isSelected ? null : agent.id)}
            className={`
              cursor-pointer rounded p-2 border transition-all
              ${isSelected
                ? 'border-indigo-500 bg-indigo-950/80'
                : 'border-indigo-950 bg-indigo-950/30 hover:border-indigo-800'}
            `}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: color, boxShadow: `0 0 5px ${color}` }}
              />
              <div className="text-xs font-bold text-indigo-300 flex-1">{agent.id}</div>
              <div className="text-xs text-indigo-600">{agent.status}</div>
            </div>
            <div className="text-xs text-indigo-700 truncate mt-0.5 pl-4">{lastMsg}</div>
          </div>
        )
      })}
    </div>
  )
}

export function AuditLog() {
  const auditLog = useLabStore(s => s.auditLog)

  return (
    <div className="p-2 h-full overflow-y-auto">
      {auditLog.slice(0, 80).map((entry, i) => (
        <div key={i} className="flex gap-2 py-0.5 border-b border-indigo-950/50 text-xs">
          <span className="text-indigo-800 flex-shrink-0 font-mono">
            {entry.timestamp?.substring(11, 19)}
          </span>
          <span className="text-indigo-600 flex-shrink-0 w-20 truncate">
            {entry.agentId}
          </span>
          <span className="text-indigo-500 truncate">{entry.message}</span>
        </div>
      ))}
    </div>
  )
}
