// ============================================================
// HEADER
// C:\TroxTServerRP\apps\troxtlab\src\components\panels\Header.tsx
// ============================================================

import { useLabStore }      from '../../store/labStore'
import { THIRD_EYE_MESSAGES } from '../../config/orbits'

export function Header() {
  const stats         = useLabStore(s => s.stats)
  const thirdEyeLevel = useLabStore(s => s.thirdEyeLevel)
  const activeCombo   = useLabStore(s => s.activeCombo)
  const wsStatus      = useLabStore(s => s.wsStatus)
  const agents        = useLabStore(s => s.agents)

  const online = Object.values(agents).filter(a => a.status !== 'offline').length
  const total  = Object.keys(agents).length

  const wsColor = wsStatus === 'connected'    ? '#44ff88'
                : wsStatus === 'connecting'   ? '#ffdd44'
                : '#ff3333'

  const eyeMsg = THIRD_EYE_MESSAGES[thirdEyeLevel]

  return (
    <>
      {/* Barre principale */}
      <div className="fixed top-0 left-0 right-0 h-12 bg-slate-950/95 border-b border-indigo-950 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <div className="text-indigo-400 font-mono text-sm tracking-widest font-bold">
            ⬡ TROXTLAB v2.0
          </div>
          {activeCombo && (
            <div className="text-xs text-indigo-700 border border-indigo-900 px-2 py-0.5 rounded">
              {activeCombo}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <Stat label="WS" value={wsStatus.toUpperCase()} color={wsColor} />
          <Stat label="ONLINE" value={`${online}/${total}`} />
          <Stat label="TÂCHES" value={stats.activeTasks} />
          <Stat label="FAITS" value={stats.completedToday} />
          <Stat label="BLOQUÉS" value={stats.blocked} color={stats.blocked > 0 ? '#ff3333' : undefined} />
          <Stat label="EYE" value={thirdEyeLevel} color={
            thirdEyeLevel === 'GREEN'  ? '#44ff88' :
            thirdEyeLevel === 'ORANGE' ? '#ff8844' :
            thirdEyeLevel === 'RED'    ? '#ff3333' : '#4488ff'
          } />
        </div>
      </div>

      {/* Bannière Third Eye */}
      {eyeMsg && (
        <div className={`
          fixed top-12 left-0 right-80 z-40 py-1 text-center text-xs tracking-widest
          ${thirdEyeLevel === 'RED'
            ? 'bg-red-950/90 text-red-400 border-b border-red-800 animate-pulse'
            : 'bg-orange-950/90 text-orange-400 border-b border-orange-800'}
        `}>
          {eyeMsg}
        </div>
      )}
    </>
  )
}

function Stat({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-indigo-700">{label}:</span>
      <span className="text-indigo-300 font-bold" style={color ? { color } : {}}>
        {value}
      </span>
    </div>
  )
}
