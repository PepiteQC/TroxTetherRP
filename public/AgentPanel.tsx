// ============================================================
// AGENT PANEL
// C:\TroxTServerRP\apps\troxtlab\src\components\panels\AgentPanel.tsx
// ============================================================

import { useState }        from 'react'
import { useLabStore }     from '../../store/labStore'
import { STATUS_LABELS }   from '../../config/orbits'

export function AgentPanel() {
  const selectedId   = useLabStore(s => s.selectedAgent)
  const agents       = useLabStore(s => s.agents)
  const sendCommand  = useLabStore(s => s.sendCommand)
  const sendGlobal   = useLabStore(s => s.sendGlobalCommand)
  const [taskInput, setTaskInput] = useState('')

  const agent = selectedId ? agents[selectedId] : null

  if (!agent) {
    return (
      <div className="p-4 text-center text-indigo-800 text-sm">
        — Sélectionne un agent sur la planète —
      </div>
    )
  }

  const colorMap: Record<string, string> = {
    GREY:   '#555577', BLUE:   '#4488ff',
    GREEN:  '#44ff88', YELLOW: '#ffdd44',
    ORANGE: '#ff8844', RED:    '#ff3333', PURPLE: '#aa44ff'
  }
  const color = colorMap[agent.color] || '#555577'

  const cmd = (type: string) => {
    sendCommand(selectedId!, type, taskInput ? { task: taskInput } : {})
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Header agent */}
      <div className="flex items-center gap-2 border-b border-indigo-950 pb-2">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        />
        <div>
          <div className="text-xs font-bold text-indigo-200">{agent.id.toUpperCase()}</div>
          <div className="text-xs text-indigo-600">{STATUS_LABELS[agent.status] || agent.status}</div>
        </div>
        {agent.brainValidated && (
          <div className="ml-auto text-xs text-purple-500">✓ BRAIN</div>
        )}
      </div>

      {/* Task courante */}
      {agent.currentTask && (
        <div className="text-xs text-indigo-400 truncate">
          ▸ {agent.currentTask}
        </div>
      )}

      {/* Input tâche */}
      <input
        className="w-full px-2 py-1 text-xs bg-indigo-950/50 border border-indigo-900 rounded text-indigo-200 placeholder-indigo-700 focus:outline-none focus:border-indigo-600"
        placeholder="Nom de la tâche..."
        value={taskInput}
        onChange={e => setTaskInput(e.target.value)}
      />

      {/* Commandes */}
      <div className="flex flex-col gap-1">
        <CmdBtn onClick={() => cmd('assign_task')} color="green">▶ assign_task</CmdBtn>
        <CmdBtn onClick={() => cmd('pause')}>⏸ pause</CmdBtn>
        <CmdBtn onClick={() => cmd('resume')}>▶ resume</CmdBtn>
        <CmdBtn onClick={() => cmd('ask_status')}>? ask_status</CmdBtn>
        <CmdBtn onClick={() => cmd('request_score')}>★ request_score</CmdBtn>
        <CmdBtn onClick={() => cmd('sync_team')}>⟳ sync_team</CmdBtn>
        <CmdBtn onClick={() => cmd('trigger_sim')}>⚙ trigger_sim</CmdBtn>
        <CmdBtn onClick={() => cmd('escalate_brain')}>↑ escalate_brain</CmdBtn>
        <CmdBtn onClick={() => cmd('deploy_now')}>⬆ deploy_now</CmdBtn>
        <CmdBtn onClick={() => cmd('stop')} color="red">■ stop</CmdBtn>
      </div>

      {/* Séparateur global */}
      <div className="border-t border-indigo-950 pt-2">
        <CmdBtn onClick={() => sendGlobal('ALL_PAUSE')} color="red">⏸⏸ ALL PAUSE</CmdBtn>
      </div>

      {/* Quality Score */}
      {agent.qualityScore && (
        <div className="border-t border-indigo-950 pt-2">
          <div className="text-xs text-indigo-600 mb-2 tracking-widest">QUALITY SCORE</div>
          {Object.entries(agent.qualityScore).map(([key, val]) => (
            <ScoreBar key={key} label={key} value={val as number} />
          ))}
        </div>
      )}

      {/* Historique */}
      {agent.history.length > 0 && (
        <div className="border-t border-indigo-950 pt-2">
          <div className="text-xs text-indigo-600 mb-2 tracking-widest">HISTORIQUE</div>
          {agent.history.slice(0, 5).map((h, i) => (
            <div key={i} className="text-xs text-indigo-700 truncate py-0.5">
              {h.timestamp?.substring(11, 19)} — {h.message || h.type}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CmdBtn({ children, onClick, color = 'default' }: any) {
  const colors: Record<string, string> = {
    default: 'border-indigo-900 text-indigo-400 hover:border-indigo-600 hover:text-white hover:bg-indigo-900/50',
    green:   'border-green-900 text-green-500 hover:border-green-600 hover:bg-green-900/30',
    red:     'border-red-900 text-red-500 hover:border-red-600 hover:bg-red-900/30'
  }
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-1.5 text-xs border rounded transition-all font-mono ${colors[color]}`}
    >
      {children}
    </button>
  )
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const bg = value >= 80 ? '#44ff88' : value >= 60 ? '#ffdd44' : '#ff3333'
  return (
    <div className="flex items-center gap-2 mb-1">
      <div className="text-xs text-indigo-600 w-24 truncate">{label}</div>
      <div className="flex-1 h-1 bg-indigo-950 rounded">
        <div className="h-full rounded" style={{ width: `${value}%`, background: bg }} />
      </div>
      <div className="text-xs text-indigo-400 w-6 text-right">{value}</div>
    </div>
  )
}
