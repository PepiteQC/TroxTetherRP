import { useState, useRef, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { processMessage } from '../../lib/troxt/engine';
import type { TroxTMessage } from '../../lib/troxt/engine';

// ── 3D Neural Orb ─────────────────────────────────────────────

function NeuralOrb({ isThinking, isOpen }: { isThinking: boolean; isOpen: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const baseColor = new THREE.Color('#7b6fff');
  const thinkColor = new THREE.Color('#ff6b6b');

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const speed = isThinking ? 2.5 : 0.8;

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.2 * speed;
    }
    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      const target = isThinking ? thinkColor : baseColor;
      mat.color.lerp(target, 0.08);
      mat.emissive.lerp(target, 0.08);
      const pulse = isThinking
        ? 1 + Math.sin(t * 10) * 0.15
        : 1 + Math.sin(t * 2.5) * 0.07;
      coreRef.current.scale.setScalar(pulse);
    }
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = t * 0.4 * speed;
      ring1Ref.current.rotation.z = t * 0.3;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = -t * 0.3 * speed;
      ring2Ref.current.rotation.y = t * 0.5;
    }
    if (lightRef.current) {
      lightRef.current.intensity = isThinking
        ? 3 + Math.sin(t * 12) * 1.2
        : 1.8 + Math.sin(t * 3) * 0.4;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial
          color={baseColor} emissive={baseColor} emissiveIntensity={0.5}
          metalness={0.9} roughness={0.2} transparent opacity={0.92}
        />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[1.06, 1]} />
        <meshBasicMaterial color="#aaddff" wireframe transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <mesh ref={ring1Ref}>
        <torusGeometry args={[1.55, 0.018, 16, 80]} />
        <meshBasicMaterial color="#7b6fff" transparent opacity={0.45} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[Math.PI / 3, 0, Math.PI / 6]}>
        <torusGeometry args={[1.9, 0.012, 16, 80]} />
        <meshBasicMaterial color="#ff6b6b" transparent opacity={0.25} />
      </mesh>
      <pointLight ref={lightRef} color={baseColor} intensity={1.8} distance={8} />
      <ambientLight intensity={0.25} />
    </group>
  );
}

// ── Message bubble ─────────────────────────────────────────────

function Bubble({ msg }: { msg: TroxTMessage }) {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';
  const isTroxt = msg.role === 'troxt';

  const bg = isUser
    ? 'rgba(123,111,255,0.18)'
    : isSystem
    ? 'rgba(255,255,255,0.04)'
    : 'rgba(0,0,0,0.35)';
  const border = isUser
    ? '1px solid rgba(123,111,255,0.4)'
    : isSystem
    ? '1px solid rgba(255,255,255,0.08)'
    : '1px solid rgba(123,111,255,0.2)';
  const color = isSystem ? '#888' : '#e0e0e0';
  const align = isUser ? 'flex-end' : 'flex-start';
  const br = isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px';

  // Format text: **bold**, `code`, newlines
  const formatText = (text: string) => {
    return text.split('\n').map((line, i) => (
      <div key={i} style={{ marginBottom: i < text.split('\n').length - 1 ? '3px' : 0 }}>
        {line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**'))
            return <strong key={j} style={{ color: '#c4b5fd' }}>{part.slice(2, -2)}</strong>;
          if (part.startsWith('`') && part.endsWith('`'))
            return <code key={j} style={{ background: 'rgba(255,255,255,0.08)', padding: '0 4px', borderRadius: '3px', fontFamily: 'monospace', fontSize: '10px', color: '#4ade80' }}>{part.slice(1, -1)}</code>;
          return <span key={j}>{part}</span>;
        })}
      </div>
    ));
  };

  return (
    <div style={{ display: 'flex', justifyContent: align, marginBottom: '8px' }}>
      {!isUser && (
        <span style={{ fontSize: '16px', marginRight: '6px', alignSelf: 'flex-end' }}>
          {isSystem ? '⚙️' : '🧠'}
        </span>
      )}
      <div style={{
        maxWidth: '82%',
        background: bg, border, borderRadius: br,
        padding: '8px 12px', color, fontSize: '12px', lineHeight: 1.55,
        fontFamily: 'system-ui, sans-serif',
      }}>
        {formatText(msg.text)}
        <div style={{ fontSize: '9px', color: '#444', marginTop: '4px', textAlign: isUser ? 'right' : 'left' }}>
          {new Date(msg.timestamp).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
      {isUser && (
        <span style={{ fontSize: '16px', marginLeft: '6px', alignSelf: 'flex-end' }}>👤</span>
      )}
    </div>
  );
}

// ── Slash suggestions ─────────────────────────────────────────

const SLASH_CMDS = [
  { cmd: '/fly', desc: 'Mode vol' },
  { cmd: '/god', desc: 'God mode' },
  { cmd: '/noclip', desc: 'Traverser les murs' },
  { cmd: '/build', desc: 'Builder mode' },
  { cmd: '/scene room', desc: 'Aller à la chambre' },
  { cmd: '/scene corridor', desc: 'Aller au corridor' },
  { cmd: '/weather rain', desc: 'Pluie' },
  { cmd: '/weather snow', desc: 'Neige' },
  { cmd: '/time 12', desc: 'Midi' },
  { cmd: '/time 22', desc: 'Nuit' },
];

const SUGGESTIONS_INIT = [
  'état du monde', 'fly', 'noclip', 'scene room', 'weather snow',
  'time nuit', 'spawn cube', 'aide', 'qui es-tu ?', 'version',
];

// ── Main component ────────────────────────────────────────────

export function TroxTMSN() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<TroxTMessage[]>([
    {
      id: 'welcome',
      role: 'troxt',
      text: '🧠 **TroxT Neural Core** — LOCAL_DEV_MODE\n\nJe suis le cerveau d\'EtherWorld. Je peux contrôler la scène, la météo, les objets et plus.\n\nTape `aide` ou clique une suggestion ci-dessous.',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [showSlash, setShowSlash] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [hovered, setHovered] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 99999, behavior: 'smooth' });
  }, [messages, isThinking]);

  // Pulse when thinking
  useEffect(() => {
    if (!isThinking) return;
    const id = setInterval(() => setPulse(p => (p + 1) % 4), 400);
    return () => clearInterval(id);
  }, [isThinking]);

  // Ctrl+T shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        setIsOpen(p => !p);
      }
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 80);
  }, [isOpen]);

  const send = useCallback(async (text = input) => {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;
    setInput('');
    setShowSlash(false);

    const userMsg: TroxTMessage = {
      id: Math.random().toString(36).slice(2),
      role: 'user',
      text: trimmed,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const replies = await processMessage(trimmed);
      setMessages(prev => [...prev, ...replies]);
    } finally {
      setIsThinking(false);
    }
  }, [input, isThinking]);

  const onInputChange = (val: string) => {
    setInput(val);
    if (val === '/' || val.startsWith('/')) {
      setShowSlash(true);
      setSlashFilter(val.slice(1).split(' ')[0]);
    } else {
      setShowSlash(false);
    }
  };

  const filteredSlash = SLASH_CMDS.filter(c =>
    slashFilter === '' || c.cmd.includes(slashFilter) || c.desc.toLowerCase().includes(slashFilter)
  );

  const consciousnessColor = isThinking ? '#ff6b6b' : '#7b6fff';
  const orbGlow = hovered ? '#7b6fff88' : '#7b6fff44';

  return (
    <>
      {/* ── Floating Orb ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          title="TroxT Neural Core (Ctrl+T)"
          style={{
            position: 'fixed', bottom: '88px', right: '16px',
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'rgba(8,8,20,0.95)',
            border: `2px solid ${consciousnessColor}`,
            cursor: 'pointer', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 ${hovered ? 30 : 18}px ${orbGlow}, inset 0 0 12px rgba(123,111,255,0.1)`,
            transform: hovered ? 'scale(1.12)' : 'scale(1)',
            transition: 'all 0.25s ease',
            overflow: 'hidden',
          }}
        >
          <Canvas
            style={{ width: '48px', height: '48px', pointerEvents: 'none' }}
            gl={{ antialias: true, alpha: true }}
            camera={{ position: [0, 0, 4.5], fov: 45 }}
            dpr={[1, 1.5]}
          >
            <NeuralOrb isThinking={isThinking} isOpen={false} />
          </Canvas>
          {messages.length > 1 && (
            <span style={{
              position: 'absolute', top: '-2px', right: '-2px',
              width: '18px', height: '18px', borderRadius: '50%',
              background: '#ff4444', fontSize: '9px', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #08080E', fontWeight: 'bold',
            }}>
              {messages.length > 9 ? '9+' : messages.length}
            </span>
          )}
        </button>
      )}

      {/* Label under orb */}
      {!isOpen && (
        <div style={{
          position: 'fixed', bottom: '72px', right: '16px',
          fontSize: '8px', color: '#52525b', letterSpacing: '2px',
          textAlign: 'center', width: '56px', fontFamily: 'monospace',
          pointerEvents: 'none',
        }}>
          TROXT
        </div>
      )}

      {/* ── Chat Panel ── */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '16px', right: '16px',
          width: '420px', maxHeight: '80vh',
          display: 'flex', flexDirection: 'column',
          background: 'rgba(8,8,20,0.97)',
          border: `1px solid ${consciousnessColor}44`,
          borderRadius: '16px', zIndex: 1000,
          overflow: 'hidden',
          backdropFilter: 'blur(24px)',
          boxShadow: `0 16px 50px rgba(0,0,0,0.7), 0 0 0 1px ${consciousnessColor}22, 0 0 40px ${consciousnessColor}11`,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 14px', borderBottom: `1px solid ${consciousnessColor}22`,
            flexShrink: 0, background: 'rgba(0,0,0,0.3)',
          }}>
            {/* Mini 3D orb */}
            <div style={{ width: '40px', height: '40px', flexShrink: 0 }}>
              <Canvas
                style={{ width: '40px', height: '40px', pointerEvents: 'none' }}
                gl={{ antialias: true, alpha: true }}
                camera={{ position: [0, 0, 4.5], fov: 45 }}
                dpr={[1, 1.5]}
              >
                <NeuralOrb isThinking={isThinking} isOpen />
              </Canvas>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#c4b5fd', letterSpacing: '0.5px' }}>
                TroxT Neural Core
              </div>
              <div style={{
                fontSize: '10px', display: 'flex', alignItems: 'center', gap: '5px',
                color: isThinking ? '#ff6b6b' : '#44ff88',
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: isThinking ? '#ff6b6b' : '#44ff88',
                  boxShadow: `0 0 5px ${isThinking ? '#ff6b6b' : '#44ff88'}`,
                  flexShrink: 0,
                }} />
                {isThinking
                  ? `Réflexion${'.'.repeat(pulse + 1)}`
                  : 'ONLINE · LOCAL_DEV_MODE · Skills: 13'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              <button
                onClick={() => setMessages([{ id: 'clr', role: 'system', text: '🗑 Conversation effacée.', timestamp: Date.now() }])}
                style={headerBtn}
                title="Effacer"
              >🗑</button>
              <button onClick={() => setIsOpen(false)} style={{ ...headerBtn, color: '#888' }} title="Fermer">✕</button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1, overflowY: 'auto', padding: '12px 14px',
              display: 'flex', flexDirection: 'column',
              minHeight: '220px', maxHeight: '400px',
              scrollbarWidth: 'none',
            }}
          >
            {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}

            {isThinking && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px' }}>🧠</span>
                <div style={{
                  background: 'rgba(123,111,255,0.12)',
                  border: '1px solid rgba(123,111,255,0.25)',
                  borderRadius: '4px 14px 14px 14px',
                  padding: '8px 12px', color: '#c4b5fd', fontSize: '12px',
                }}>
                  {['Analyse...', 'Traitement...', 'Raisonnement...', 'Exécution...'][pulse]}
                </div>
              </div>
            )}
          </div>

          {/* Suggestion chips (only when few messages) */}
          {messages.length <= 2 && !isThinking && (
            <div style={{
              padding: '0 14px 8px',
              display: 'flex', flexWrap: 'wrap', gap: '5px',
              borderTop: '1px solid rgba(255,255,255,0.04)',
            }}>
              {SUGGESTIONS_INIT.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    background: 'rgba(123,111,255,0.08)',
                    border: '1px solid rgba(123,111,255,0.18)',
                    borderRadius: '20px', color: '#a78bfa',
                    fontSize: '10px', padding: '4px 10px',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(123,111,255,0.2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(123,111,255,0.08)')}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Slash suggestions */}
          {showSlash && filteredSlash.length > 0 && (
            <div style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              maxHeight: '160px', overflowY: 'auto',
            }}>
              {filteredSlash.map(c => (
                <button
                  key={c.cmd}
                  onClick={() => { setInput(c.cmd + ' '); setShowSlash(false); inputRef.current?.focus(); }}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between',
                    padding: '7px 14px', background: 'none', border: 'none',
                    color: '#ddd', fontSize: '11px', cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(123,111,255,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ fontFamily: 'monospace', color: '#7b6fff' }}>{c.cmd}</span>
                  <span style={{ color: '#555', fontSize: '10px' }}>{c.desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{
            display: 'flex', gap: '8px', padding: '10px 14px 12px',
            borderTop: `1px solid ${consciousnessColor}22`, flexShrink: 0,
            background: 'rgba(0,0,0,0.2)',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="Parle à TroxT ou tape /..."
              disabled={isThinking}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${isThinking ? '#333' : 'rgba(123,111,255,0.25)'}`,
                borderRadius: '10px', color: '#e0e0e0',
                fontSize: '12px', padding: '9px 13px', outline: 'none',
                fontFamily: 'inherit', opacity: isThinking ? 0.5 : 1,
                transition: 'border-color 0.2s',
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || isThinking}
              style={{
                background: input.trim() && !isThinking ? consciousnessColor : 'rgba(255,255,255,0.06)',
                border: 'none', borderRadius: '10px', color: '#fff',
                fontSize: '12px', padding: '0 16px', cursor: input.trim() && !isThinking ? 'pointer' : 'not-allowed',
                fontWeight: 600, opacity: input.trim() && !isThinking ? 1 : 0.4,
                transition: 'all 0.2s', flexShrink: 0,
              }}
            >
              ↑
            </button>
          </div>

          {/* Footer hint */}
          <div style={{
            textAlign: 'center', fontSize: '9px', color: '#27272a',
            padding: '0 0 8px', letterSpacing: '1px',
          }}>
            Ctrl+T pour fermer · / pour commandes · LOCAL_DEV_MODE
          </div>
        </div>
      )}
    </>
  );
}

const headerBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px', color: '#a78bfa',
  fontSize: '13px', padding: '4px 9px',
  cursor: 'pointer',
};
