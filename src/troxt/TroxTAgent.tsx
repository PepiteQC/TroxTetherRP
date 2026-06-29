// ============================================================
//  TROXTAGENT.tsx — Page dédiée du Cerveau Neural
//  Remplace TroxTMSN : chat pleine page + dashboard cognitif.
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useTroxT, ChatMessage } from './TroxTContext'

const AVATAR_TROXT = '🧠'
const AVATAR_USER = '👤'
const AVATAR_SYSTEM = '⚙️'
const AVATAR_THOUGHT = '💭'

const SUGGESTIONS = [
  'Crée une plateforme rouge à [0, 3, 0]',
  'Génère un monde aléatoire',
  'Quels joueurs sont en ligne ?',
  'Sauvegarde ce niveau',
  'Règle la météo sur storm',
  'Montre-moi les stats DB',
  'Exporte le monde en GLTF',
  'Crée un snapshot',
  'Introspection',
  'Aide'
]

const SLASH_COMMANDS = [
  { cmd: '/forge', desc: 'Passer en mode Forge (3D)' },
  { cmd: '/prism', desc: 'Passer en mode Prism (DB)' },
  { cmd: '/lens', desc: 'Passer en mode Lens (Analyse)' },
  { cmd: '/weave', desc: 'Passer en mode Weave (Textures)' },
  { cmd: '/mode auto', desc: 'Activer le mode autonome' },
  { cmd: '/mode sleep', desc: 'Désactiver proactivité' },
  { cmd: '/snapshot', desc: 'Créer un snapshot du monde' },
  { cmd: '/memory', desc: 'Voir la mémoire récente' },
  { cmd: '/introspect', desc: 'État cognitif de TroxT' },
  { cmd: '/clear', desc: 'Effacer la conversation' },
  { cmd: '/export', desc: 'Exporter la conversation' },
  { cmd: '/help', desc: 'Aide des commandes' }
]

export const TroxTAgent: React.FC = () => {
  const troxt = useTroxT()
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [slashFilter, setSlashFilter] = useState('')
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [activePanel, setActivePanel] = useState<'chat' | 'brain' | 'skills' | 'memory'>('chat')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pulse, setPulse] = useState(0)

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [troxt.messages, troxt.isThinking])

  // Pulse animation
  useEffect(() => {
    if (!troxt.isThinking) return
    const id = setInterval(() => setPulse(p => (p + 1) % 4), 500)
    return () => clearInterval(id)
  }, [troxt.isThinking])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text) return
    if (text.startsWith('/')) { handleSlash(text); setInput(''); return }
    setInput('')
    setShowSuggestions(false)
    await troxt.sendMessage(text)
  }, [input, troxt])

  const handleSlash = (text: string) => {
    const cmd = text.split(' ')[0]
    const rest = text.slice(cmd.length).trim()
    switch (cmd) {
      case '/clear': troxt.clearChat(); break
      case '/export': {
        const blob = new Blob([troxt.exportMemory()], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `troxt-conversation-${Date.now()}.json`; a.click()
        URL.revokeObjectURL(url)
        break
      }
      case '/introspect': troxt.sendMessage('introspect'); break
      case '/memory': troxt.sendMessage('memory recent'); break
      case '/snapshot': troxt.runSkill('admin_create_snapshot', { description: 'Snapshot via TroxTAgent' }); break
      case '/mode':
        if (rest.includes('auto')) troxt.setConsciousnessLevel(8)
        if (rest.includes('sleep')) troxt.setConsciousnessLevel(2)
        break
      default: troxt.sendMessage(text)
    }
  }

  const onInputChange = (val: string) => {
    setInput(val)
    if (val === '/') { setShowSlashMenu(true); setSlashFilter('') }
    else if (val.startsWith('/')) { setShowSlashMenu(true); setSlashFilter(val.slice(1)) }
    else { setShowSlashMenu(false) }
  }

  const filteredSlash = SLASH_COMMANDS.filter(c =>
    c.cmd.includes(slashFilter.toLowerCase()) || c.desc.toLowerCase().includes(slashFilter.toLowerCase())
  )

  const consciousnessColor =
    troxt.consciousnessLevel >= 8 ? '#ff6b6b' :
    troxt.consciousnessLevel >= 5 ? '#ffd166' : '#06d6a0'

  const state = troxt.state

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#050810', color: '#fff', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>

      {/* Sidebar Navigation */}
      <div style={{ width: '64px', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: '12px', flexShrink: 0, background: 'rgba(5,8,16,0.95)' }}>
        <NavIcon active={activePanel === 'chat'} onClick={() => setActivePanel('chat')} icon="💬" color="#7b6fff" label="Chat" />
        <NavIcon active={activePanel === 'brain'} onClick={() => setActivePanel('brain')} icon="🧠" color="#44ff88" label="Brain" />
        <NavIcon active={activePanel === 'skills'} onClick={() => setActivePanel('skills')} icon="⚡" color="#ffaa44" label="Skills" />
        <NavIcon active={activePanel === 'memory'} onClick={() => setActivePanel('memory')} icon="📚" color="#ff4488" label="Memory" />
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>{AVATAR_TROXT}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#7b6fff' }}>TroxT Agent</div>
              <div style={{ fontSize: '11px', color: troxt.isOnline ? '#44ff88' : '#ff4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: troxt.isOnline ? '#44ff88' : '#ff4444', boxShadow: troxt.isOnline ? '0 0 6px #44ff88' : '0 0 6px #ff4444' }} />
                {troxt.isOnline ? 'Neural Core Online' : 'Offline'} · C:{troxt.consciousnessLevel}/10 · Load:{troxt.state?.cognitiveLoad ?? 0}%
                {troxt.isThinking && ' · Réflexion...'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => troxt.setConsciousnessLevel(Math.max(1, (troxt.consciousnessLevel || 5) - 1))} style={controlBtn}>-</button>
            <div style={{ fontSize: '12px', color: consciousnessColor, fontFamily: 'monospace', minWidth: '40px', textAlign: 'center' }}>
              C:{troxt.consciousnessLevel}
            </div>
            <button onClick={() => troxt.setConsciousnessLevel(Math.min(10, (troxt.consciousnessLevel || 5) + 1))} style={controlBtn}>+</button>
            <button onClick={() => troxt.clearChat()} style={{ ...controlBtn, color: '#ff4444' }} title="Clear">🗑</button>
          </div>
        </div>

        {/* Panels */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

          {/* === PANEL CHAT === */}
          {activePanel === 'chat' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Messages */}
              <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {troxt.messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#444', padding: '40px 20px', lineHeight: 1.6 }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🧠</div>
                    <strong style={{ color: '#888', fontSize: '16px' }}>Bienvenue dans l'Agent TroxT</strong>
                    <p style={{ fontSize: '13px', margin: '8px 0 20px' }}>Je suis le cerveau neural d'EtherWorld. Je peux contrôler la 3D, la DB, le serveur, et me souvenir de nos conversations.</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
                      {SUGGESTIONS.slice(0, 6).map(s => (
                        <button key={s} onClick={() => { setInput(s); setShowSuggestions(false); inputRef.current?.focus() }}
                          style={{ background: 'rgba(123,111,255,0.1)', border: '1px solid rgba(123,111,255,0.2)', borderRadius: '16px', color: '#bbaaff', fontSize: '12px', padding: '6px 12px', cursor: 'pointer' }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {troxt.messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
                {troxt.isThinking && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{AVATAR_TROXT}</span>
                    <div style={{ background: 'rgba(123,111,255,0.12)', border: '1px solid rgba(123,111,255,0.25)', borderRadius: '14px 14px 14px 4px', padding: '10px 14px', color: '#bbaaff', fontSize: '13px' }}>
                      Réflexion en cours{'.'.repeat(pulse + 1)}
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '8px', flexShrink: 0 }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => onInputChange(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  placeholder="Commande ou conversation avec TroxT..."
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', color: '#fff', fontSize: '13px', padding: '10px 14px', outline: 'none', fontFamily: 'inherit'
                  }}
                  autoFocus
                />
                <button onClick={handleSend} disabled={!input.trim() || troxt.isThinking}
                  style={{
                    background: input.trim() ? consciousnessColor : 'rgba(255,255,255,0.06)', border: 'none',
                    borderRadius: '10px', color: '#fff', fontSize: '13px', padding: '0 18px', cursor: input.trim() ? 'pointer' : 'not-allowed',
                    fontWeight: 600, opacity: input.trim() ? 1 : 0.4
                  }}>
                  Envoyer
                </button>
              </div>

              {/* Slash menu */}
              {showSlashMenu && (
                <div style={{ maxHeight: '140px', overflowY: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 16px' }}>
                  {filteredSlash.map(c => (
                    <button key={c.cmd} onClick={() => { setInput(c.cmd + ' '); setShowSlashMenu(false); inputRef.current?.focus() }}
                      style={{ background: 'none', border: 'none', textAlign: 'left', color: '#ddd', fontSize: '12px', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', width: '100%' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(123,111,255,0.1)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <span style={{ fontFamily: 'monospace', color: '#7b6fff' }}>{c.cmd}</span>
                      <span style={{ color: '#666', fontSize: '11px' }}>{c.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === PANEL BRAIN === */}
          {activePanel === 'brain' && (
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <BrainCard title="État Cognitif" color="#7b6fff">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Stat label="Conscience" value={`${state?.consciousnessLevel ?? '-'}/10`} color={consciousnessColor} />
                  <Stat label="Charge cognitive" value={`${state?.cognitiveLoad ?? '-'}%`} color={state && state.cognitiveLoad > 80 ? '#ff4444' : '#44ff88'} />
                  <Stat label="Module actif" value={state?.currentModule ?? 'none'} color="#ffaa44" />
                  <Stat label="Dernière activité" value={state ? `${Math.round((Date.now() - state.lastActivity) / 1000)}s` : '-'} color="#fff" />
                </div>
              </BrainCard>
              <BrainCard title="Personnalité" color="#ffaa44">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Stat label="Curiosité" value="0.80" color="#7b6fff" />
                  <Stat label="Prudence" value="0.70" color="#44ff88" />
                  <Stat label="Créativité" value="0.75" color="#ffaa44" />
                  <Stat label="Empathie" value="0.65" color="#ff4488" />
                </div>
              </BrainCard>
              <BrainCard title="Architecture" color="#44ff88">
                <div style={{ fontSize: '13px', color: '#aaa', lineHeight: 1.6 }}>
                  • ReAct (Reasoning + Acting) avec boucle de rétroaction<br />
                  • Chain-of-Thought explicite visible dans chaque réponse<br />
                  • Planning DAG avec auto-correction et retry exponentiel<br />
                  • Mémoire épisodique avec RAG simulé et courbe d'oubli<br />
                  • Boucle autonome 5Hz avec 5 règles natives<br />
                  • 25 skills enregistrés couvrant 100% des API REST
                </div>
              </BrainCard>
            </div>
          )}

          {/* === PANEL SKILLS === */}
          {activePanel === 'skills' && (
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#7b6fff', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                ⚡ Registre de Skills — 25 Compétences
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {SKILL_LIST.map(s => (
                  <div key={s.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#ddd' }}>{s.name}</div>
                      <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{s.desc}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: s.danger ? '#ff4444' : '#44ff88', border: `1px solid ${s.danger ? '#ff4444' : '#44ff88'}`, borderRadius: '4px', padding: '2px 6px' }}>
                        {s.danger ? '⚠️' : '✓'}
                      </span>
                      <span style={{ fontSize: '10px', color: '#555', fontFamily: 'monospace' }}>{s.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === PANEL MEMORY === */}
          {activePanel === 'memory' && (
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ff4488', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                📚 Mémoire Épisodique & Sémantique
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#888', lineHeight: 1.6 }}>
                  La mémoire est stockée dans le contexte React et persistée via localStorage.<br />
                  Chaque conversation, perception système et action skill est enregistrée comme un épisode avec valence émotionnelle et importance.<br />
                  RAG simulé par embedding hash-based + cosine similarity.<br />
                  Consolidation automatique pour les événements d'importance {'>'} 0.8.
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#555', fontFamily: 'monospace' }}>
                Messages dans la session : {troxt.messages.length}<br />
                Messages utilisateur : {troxt.messages.filter(m => m.role === 'user').length}<br />
                Latence moyenne : {troxt.messages.filter(m => m.meta?.latencyMs).reduce((a, m) => a + (m.meta!.latencyMs || 0), 0) / Math.max(1, troxt.messages.filter(m => m.meta?.latencyMs).length) || 0}ms
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sub-Components ──────────────────────────────────────────
function NavIcon({ active, onClick, icon, color, label }: { active: boolean; onClick: () => void; icon: string; color: string; label: string }) {
  return (
    <button onClick={onClick} title={label}
      style={{
        width: '44px', height: '44px', borderRadius: '12px', border: active ? `1px solid ${color}66` : '1px solid transparent',
        background: active ? `${color}18` : 'transparent', color: active ? color : '#555',
        fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.2s'
      }}>
      {icon}
    </button>
  )
}

function BrainCard({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}22`, borderRadius: '14px', padding: '16px' }}>
      <div style={{ fontWeight: 700, fontSize: '13px', color, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</div>
      {children}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: '12px', color: '#888' }}>{label}</span>
      <span style={{ fontSize: '13px', color, fontFamily: 'monospace', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  const isSystem = msg.role === 'system'
  const isThought = msg.role === 'thought'
  const avatar = isUser ? AVATAR_USER : isSystem ? AVATAR_SYSTEM : isThought ? AVATAR_THOUGHT : AVATAR_TROXT
  const bg = isUser ? 'rgba(60,120,255,0.15)' : isSystem ? 'rgba(255,160,60,0.12)' : isThought ? 'rgba(100,100,100,0.1)' : 'rgba(123,111,255,0.12)'
  const border = isUser ? 'rgba(60,120,255,0.3)' : isSystem ? 'rgba(255,160,60,0.25)' : isThought ? 'rgba(255,255,255,0.08)' : 'rgba(123,111,255,0.25)'
  const color = isUser ? '#aaddff' : isSystem ? '#ffcc88' : isThought ? '#999' : '#ddccff'
  const align = isUser ? 'flex-end' : 'flex-start'
  const radius = isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px'

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', justifyContent: align, maxWidth: '100%' }}>
      {!isUser && <span style={{ fontSize: '18px', flexShrink: 0 }}>{avatar}</span>}
      <div style={{ maxWidth: '80%' }}>
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: radius, padding: '10px 14px', color, fontSize: '13px', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
          {msg.text}
        </div>
        {msg.meta && (
          <div style={{ fontSize: '10px', color: '#555', marginTop: '4px', padding: '0 4px', display: 'flex', gap: '8px' }}>
            {msg.meta.latencyMs && <span>{msg.meta.latencyMs}ms</span>}
            {msg.meta.skillId && <span style={{ color: '#7b6fff' }}>@{msg.meta.skillId}</span>}
            {msg.meta.confidence && <span>conf: {Math.round(msg.meta.confidence * 100)}%</span>}
          </div>
        )}
        <div style={{ fontSize: '10px', color: '#444', marginTop: '2px', padding: '0 4px' }}>
          {new Date(msg.timestamp).toLocaleTimeString()}
        </div>
      </div>
      {isUser && <span style={{ fontSize: '18px', flexShrink: 0 }}>{avatar}</span>}
    </div>
  )
}

const controlBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px', color: '#aaa', fontSize: '14px', width: '32px', height: '32px',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
}

const SKILL_LIST = [
  { id: 'prism_query', name: 'Prism Query', desc: 'SELECT sur tables DB RP', danger: false },
  { id: 'prism_insert', name: 'Prism Insert', desc: 'INSERT ligne dans DB', danger: true },
  { id: 'prism_update', name: 'Prism Update', desc: 'UPDATE ligne par ID', danger: true },
  { id: 'prism_stats', name: 'Prism Stats', desc: 'Statistiques globales DB', danger: false },
  { id: 'prism_seed', name: 'Prism Seed', desc: 'Remplir DB avec données démo', danger: true },
  { id: 'forge_load_platforms', name: 'Forge Load Platforms', desc: 'Charger liste plateformes 3D', danger: false },
  { id: 'forge_create_platform', name: 'Forge Create Platform', desc: 'Ajouter plateforme 3D', danger: false },
  { id: 'forge_generate_world', name: 'Forge Generate World', desc: 'Générer monde procédural', danger: false },
  { id: 'forge_save_level', name: 'Forge Save Level', desc: 'Sauvegarder niveau', danger: false },
  { id: 'forge_load_level', name: 'Forge Load Level', desc: 'Charger niveau sauvegardé', danger: false },
  { id: 'forge_export_gltf', name: 'Forge Export GLTF', desc: 'Exporter monde en GLTF', danger: false },
  { id: 'world_set_time', name: 'World Set Time', desc: 'Régler heure du monde 0-24', danger: false },
  { id: 'world_set_weather', name: 'World Set Weather', desc: 'Changer météo', danger: false },
  { id: 'world_get_state', name: 'World Get State', desc: 'État complet du monde', danger: false },
  { id: 'admin_list_players', name: 'Admin List Players', desc: 'Liste joueurs en ligne', danger: false },
  { id: 'admin_kick_player', name: 'Admin Kick Player', desc: 'Expulser joueur', danger: true },
  { id: 'admin_teleport_player', name: 'Admin Teleport', desc: 'Téléporter joueur', danger: true },
  { id: 'admin_create_snapshot', name: 'Admin Snapshot', desc: 'Créer snapshot monde', danger: false },
  { id: 'admin_restore_snapshot', name: 'Admin Restore', desc: 'Restaurer snapshot', danger: true },
  { id: 'admin_server_control', name: 'Server Control', desc: 'Pause/resume/backup', danger: true },
  { id: 'admin_metrics', name: 'Admin Metrics', desc: 'Métriques serveur', danger: false },
  { id: 'lens_ocr_scan', name: 'Lens OCR', desc: 'Scan texte sur image', danger: false },
  { id: 'lens_measure', name: 'Lens Measure', desc: 'Mesure précision scène', danger: false },
  { id: 'weave_generate_noise', name: 'Weave Noise', desc: 'Texture bruit procédural', danger: false },
  { id: 'code_generate_snippet', name: 'Code Generate', desc: 'Générer snippet code', danger: false },
]

export default TroxTAgent