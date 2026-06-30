import { useState, useEffect, useCallback, useRef } from 'react';

interface LoadingScreenProps {
  onComplete?: () => void;
  minDuration?: number;
}

const MATRIX_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF><{}[]|/\\';

const BOOT_PHASES: { delay: number; lines: string[] }[] = [
  {
    delay: 0,
    lines: [
      '[BIOS] EtherWorld Engine BIOS v4.7.2 — POST initialization',
      '[BIOS] CPU: ETH-CORE i9-13900X @ 5.8GHz ×32 .................. OK',
      '[BIOS] RAM: 65536MB DDR5-6400 ECC dual-channel ................. OK',
      '[BIOS] GPU: NVIDIA RTX-ETH 4090 Ti 24GB VRAM .................. OK',
      '[BIOS] NVMe: EtherDisk 8TB Gen5 SSD-WORLD ..................... OK',
      '[BIOS] VBIOS: Render pipeline integrity check .................. PASS',
    ],
  },
  {
    delay: 2200,
    lines: [
      '[KERN] Mounting EtherWorld kernel v2.4.1-stable...',
      '[KERN] sys/world.ko (scene manager) ........................... LOADED',
      '[KERN] sys/physics.ko (Rapier3D v0.12) ........................ LOADED',
      '[KERN] sys/net.ko (WebSocket transport) ....................... LOCAL_MODE',
      '[KERN] sys/audio.ko (Web Audio API) ........................... LOADED',
      '[KERN] sys/render.ko (React Three Fiber v8) ................... LOADED',
      '[KERN] sys/builder.ko (20 object types) ....................... LOADED',
    ],
  },
  {
    delay: 4800,
    lines: [
      '[ETH]  Initializing EtherWorld scene graph...',
      '[ETH]  Compiling GLSL shaders ................................ 2,847 OK',
      '[ETH]  Loading world chunk: Quebec Street ..................... DONE',
      '[ETH]  Loading world chunk: Hotel Corridor .................... DONE',
      '[ETH]  Loading world chunk: Suite 4201 ....................... DONE',
      '[ETH]  Loading world chunk: Hotel Exterior .................... DONE',
      '[ETH]  Spawning entities / NPCs .............................. DONE',
      '[ETH]  Admin command registry: 40 commands ................... READY',
    ],
  },
  {
    delay: 7400,
    lines: [
      '[AUTH] Connecting to etherworld.network:4200...',
      '[AUTH] Server: etherworld.network ............................ OFFLINE',
      '[AUTH] !! Remote auth unavailable — activating LOCAL_DEV_MODE',
      '[AUTH] ████████████████████ DEV BYPASS ACTIVATED ████████████████████',
      '[AUTH] Access level assigned: DEVELOPER_ADMIN (unrestricted)',
      '[AUTH] Account creation: SKIPPED — development build',
      '[AUTH] Session token: dev-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
    ],
  },
];

const LEFT_STATS = [
  { label: 'CPU', value: 'ETH-CORE i9-13900X', sub: '×32 @ 5.8GHz' },
  { label: 'RAM', value: '65536 MB DDR5', sub: 'ECC dual-ch' },
  { label: 'GPU', value: 'RTX-ETH 4090 Ti', sub: '24 GB VRAM' },
  { label: 'DISK', value: '8 TB NVMe Gen5', sub: 'EtherDisk SSD' },
  { label: 'OS', value: 'EtherOS 2.4.1', sub: 'Node.js 24 / RTF' },
];

const RIGHT_STATS = [
  { label: 'SERVER', value: 'LOCAL_DEV', color: '#fbbf24' },
  { label: 'PING', value: '0ms', color: '#4ade80' },
  { label: 'PLAYERS', value: '1 / 1', color: '#22d3ee' },
  { label: 'REGION', value: 'QC-MTL-01', color: '#a78bfa' },
  { label: 'BUILD', value: 'v1.2.0-dev.47', color: '#f472b6' },
  { label: 'MODE', value: '● DEV_ADMIN', color: '#ff3af2' },
];

const ASCII_LOGO = [
  ' ███████╗████████╗██╗  ██╗███████╗██████╗ ',
  ' ██╔════╝╚══██╔══╝██║  ██║██╔════╝██╔══██╗',
  ' █████╗     ██║   ███████║█████╗  ██████╔╝',
  ' ██╔══╝     ██║   ██╔══██║██╔══╝  ██╔══██╗',
  ' ███████╗   ██║   ██║  ██║███████╗██║  ██║',
  ' ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝',
  '  ██╗    ██╗ ██████╗ ██████╗ ██╗     ██████╗ ',
  '  ██║    ██║██╔═══██╗██╔══██╗██║     ██╔══██╗',
  '  ██║ █╗ ██║██║   ██║██████╔╝██║     ██║  ██║',
  '  ██║███╗██║██║   ██║██╔══██╗██║     ██║  ██║',
  '  ╚███╔███╔╝╚██████╔╝██║  ██║███████╗██████╔╝',
  '   ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═════╝ ',
];

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [phase, setPhase] = useState<'booting' | 'ready' | 'entering'>('booting');
  const [blink, setBlink] = useState(true);
  const [glitch, setGlitch] = useState(false);
  const [progress, setProgress] = useState(0);
  const [entered, setEntered] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Matrix rain
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const cols = Math.floor(canvas.width / 18);
    const drops: number[] = Array(cols).fill(1).map(() => Math.random() * -50);

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.045)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drops.forEach((y, i) => {
        const bright = Math.random() > 0.97;
        ctx.fillStyle = bright ? '#ffffff' : '#00ff41';
        ctx.font = `${bright ? 'bold ' : ''}13px monospace`;
        ctx.globalAlpha = bright ? 0.9 : 0.55;
        const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        ctx.fillText(char, i * 18, y * 18);
        ctx.globalAlpha = 1;
        if (y * 18 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.6;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Blinking cursor
  useEffect(() => {
    const iv = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(iv);
  }, []);

  // Glitch flicker
  useEffect(() => {
    const iv = setInterval(() => {
      if (Math.random() > 0.85) {
        setGlitch(true);
        setTimeout(() => setGlitch(false), 80 + Math.random() * 120);
      }
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  // Boot sequence - reveal lines phase by phase
  useEffect(() => {
    let timeouts: ReturnType<typeof setTimeout>[] = [];
    let totalLines = 0;
    BOOT_PHASES.forEach(phase => { totalLines += phase.lines.length; });

    BOOT_PHASES.forEach(({ delay, lines }) => {
      lines.forEach((line, i) => {
        const t = setTimeout(() => {
          setVisibleLines(prev => [...prev, line]);
          setProgress(prev => {
            const next = prev + (100 / totalLines);
            return Math.min(next, 98);
          });
          // Auto-scroll
          setTimeout(() => {
            terminalRef.current?.scrollTo({ top: 99999, behavior: 'smooth' });
          }, 30);
        }, delay + i * 220);
        timeouts.push(t);
      });
    });

    // After all phases: show ready
    const readyT = setTimeout(() => {
      setProgress(100);
      setPhase('ready');
    }, 9600);
    timeouts.push(readyT);

    return () => timeouts.forEach(clearTimeout);
  }, []);

  // ENTER key listener
  useEffect(() => {
    if (phase !== 'ready' || entered) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') handleEnter();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, entered]);

  const handleEnter = useCallback(() => {
    if (entered) return;
    setEntered(true);
    setPhase('entering');
    setTimeout(() => onComplete?.(), 1200);
  }, [entered, onComplete]);

  const isEntering = phase === 'entering';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#000',
        fontFamily: '"Courier New", Courier, monospace',
        overflow: 'hidden',
        opacity: isEntering ? 0 : 1,
        transition: isEntering ? 'opacity 1.2s ease-in' : undefined,
      }}
    >
      {/* Matrix rain canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute', inset: 0,
          opacity: 0.22,
          pointerEvents: 'none',
        }}
      />

      {/* CRT scanlines overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
      }} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
        background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.85) 100%)',
      }} />

      {/* Glitch flicker */}
      {glitch && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
          background: 'rgba(0,255,65,0.04)',
          animation: 'none',
          transform: `translateX(${Math.random() * 6 - 3}px)`,
        }} />
      )}

      {/* Main layout */}
      <div style={{
        position: 'relative', zIndex: 10,
        display: 'flex', height: '100vh', gap: '0',
        padding: '16px',
        boxSizing: 'border-box',
      }}>

        {/* ── LEFT PANEL ── */}
        <div style={{
          width: '240px', flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: '10px',
          marginRight: '12px',
        }}>
          {/* DEV MODE badge */}
          <div style={{
            border: '1px solid #ff3af2',
            background: 'rgba(255,58,242,0.08)',
            borderRadius: '4px',
            padding: '10px 12px',
            textAlign: 'center',
          }}>
            <div style={{ color: '#ff3af2', fontSize: '10px', letterSpacing: '3px', fontWeight: 'bold' }}>
              ◈ DEV_MODE ACTIVE ◈
            </div>
            <div style={{ color: '#a855f7', fontSize: '9px', marginTop: '4px', letterSpacing: '1px' }}>
              NO LOGIN REQUIRED
            </div>
          </div>

          {/* System specs */}
          <Panel title="SYSTEM_SPECS" color="#22d3ee">
            {LEFT_STATS.map((s, i) => (
              <div key={i} style={{ marginBottom: '8px' }}>
                <div style={{ color: '#4ade80', fontSize: '9px', letterSpacing: '2px' }}>{s.label}</div>
                <div style={{ color: '#e2e8f0', fontSize: '10px', marginTop: '1px' }}>{s.value}</div>
                <div style={{ color: '#52525b', fontSize: '9px' }}>{s.sub}</div>
              </div>
            ))}
          </Panel>

          {/* World stats */}
          <Panel title="WORLD_STATS" color="#4ade80">
            {[
              ['Scenes', '4 loaded'],
              ['Entities', '847'],
              ['Shaders', '2,847'],
              ['Commands', '40'],
              ['Objects', '20 types'],
            ].map(([k, v], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ color: '#71717a', fontSize: '9px', letterSpacing: '1px' }}>{k}</span>
                <span style={{ color: '#4ade80', fontSize: '9px', fontWeight: 'bold' }}>{v}</span>
              </div>
            ))}
          </Panel>

          {/* Version watermark */}
          <div style={{ color: '#27272a', fontSize: '9px', textAlign: 'center', marginTop: 'auto', letterSpacing: '1px' }}>
            ETHERWORLD RP v1.2.0-dev.47<br />
            build 2026-05-24 | Node 24
          </div>
        </div>

        {/* ── CENTER PANEL ── */}
        <div style={{
          flex: 1,
          display: 'flex', flexDirection: 'column', gap: '10px',
          minWidth: 0,
        }}>
          {/* ASCII Logo */}
          <div style={{
            border: '1px solid #1a1a2e',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '4px',
            padding: '8px 4px 4px',
            overflow: 'hidden',
          }}>
            {ASCII_LOGO.map((line, i) => (
              <div key={i} style={{
                color: i < 6 ? '#00e5ff' : '#4ade80',
                fontSize: 'clamp(5px, 1vw, 9px)',
                lineHeight: 1.2,
                letterSpacing: '0px',
                textShadow: i < 6
                  ? '0 0 8px #00e5ff, 0 0 16px #00e5ff44'
                  : '0 0 8px #4ade8066',
                whiteSpace: 'nowrap',
                transform: glitch && i % 3 === 0 ? `translateX(${Math.random() * 4 - 2}px)` : undefined,
              }}>
                {line}
              </div>
            ))}
          </div>

          {/* Terminal output */}
          <div style={{
            flex: 1,
            border: '1px solid #16a34a',
            background: 'rgba(0,0,0,0.75)',
            borderRadius: '4px',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 0 20px rgba(74,222,128,0.08), inset 0 0 30px rgba(0,0,0,0.5)',
          }}>
            {/* Terminal title bar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 10px',
              borderBottom: '1px solid #14532d',
              background: 'rgba(0,0,0,0.4)',
            }}>
              <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#eab308' }} />
              <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ marginLeft: '6px', color: '#4ade80', fontSize: '10px', letterSpacing: '2px' }}>
                etherworld@localhost: ~/engine/boot
              </span>
              <span style={{ marginLeft: 'auto', color: '#27272a', fontSize: '9px' }}>BASH — 80×24</span>
            </div>

            {/* Scrollable log */}
            <div
              ref={terminalRef}
              style={{
                flex: 1, overflowY: 'auto', overflowX: 'hidden',
                padding: '10px 12px',
                scrollbarWidth: 'none',
              }}
            >
              {visibleLines.map((line, i) => {
                const isAuth = line.includes('[AUTH]');
                const isKern = line.includes('[KERN]');
                const isEth = line.includes('[ETH]');
                const isBios = line.includes('[BIOS]');
                const isOK = line.endsWith('OK') || line.endsWith('PASS') || line.endsWith('DONE') || line.endsWith('READY') || line.endsWith('LOADED');
                const isDev = line.includes('DEV');
                const isWarn = line.includes('!!') || line.includes('OFFLINE');

                let color = '#a3a3a3';
                if (isBios) color = '#60a5fa';
                if (isKern) color = '#a78bfa';
                if (isEth) color = '#22d3ee';
                if (isAuth) color = '#fbbf24';
                if (isDev && isAuth) color = '#ff3af2';

                return (
                  <div key={i} style={{
                    fontSize: '10px',
                    lineHeight: '1.65',
                    color: isWarn ? '#ef4444' : color,
                    textShadow: isDev && isAuth ? '0 0 10px #ff3af2' : isOK ? '0 0 6px currentColor' : undefined,
                    fontWeight: isDev && isAuth ? 'bold' : undefined,
                    letterSpacing: isDev && isAuth ? '1px' : undefined,
                  }}>
                    {line}
                    {isOK && <span style={{ color: '#4ade80', marginLeft: '4px' }}>✓</span>}
                  </div>
                );
              })}

              {/* Blinking cursor at end of output */}
              {phase === 'booting' && (
                <span style={{
                  display: 'inline-block', width: '8px', height: '12px',
                  background: '#4ade80', opacity: blink ? 1 : 0,
                  verticalAlign: 'middle', marginLeft: '2px',
                  boxShadow: '0 0 6px #4ade80',
                }} />
              )}
            </div>

            {/* Progress bar */}
            <div style={{ padding: '8px 12px 10px', borderTop: '1px solid #14532d' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginBottom: '4px', fontSize: '9px', letterSpacing: '1px',
              }}>
                <span style={{ color: '#4ade80' }}>
                  {phase === 'booting' ? 'LOADING SYSTEMS...' : '● ALL SYSTEMS OPERATIONAL'}
                </span>
                <span style={{ color: '#22d3ee', fontWeight: 'bold' }}>{Math.round(progress)}%</span>
              </div>
              <div style={{
                height: '4px', background: '#0a0a0a', borderRadius: '2px',
                border: '1px solid #14532d', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${progress}%`,
                  background: 'linear-gradient(90deg, #16a34a, #4ade80, #22d3ee)',
                  boxShadow: '0 0 8px #4ade80, 0 0 16px #22d3ee44',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          </div>

          {/* ENTER prompt */}
          {phase === 'ready' && (
            <div
              onClick={handleEnter}
              style={{
                border: '1px solid #22d3ee',
                background: 'rgba(34,211,238,0.07)',
                borderRadius: '4px',
                padding: '14px',
                textAlign: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(34,211,238,0.15)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,211,238,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(34,211,238,0.07)')}
            >
              <div style={{
                color: '#22d3ee',
                fontSize: '13px', fontWeight: 'bold', letterSpacing: '4px',
                textShadow: '0 0 12px #22d3ee, 0 0 24px #22d3ee55',
              }}>
                ► PRESS [ENTER] OR CLICK TO CONNECT ◄
              </div>
              <div style={{ color: '#4ade80', fontSize: '9px', marginTop: '4px', letterSpacing: '2px', opacity: blink ? 1 : 0.3 }}>
                DEV_ADMIN SESSION — NO CREDENTIALS REQUIRED
              </div>
            </div>
          )}

          {phase === 'entering' && (
            <div style={{
              border: '1px solid #4ade80',
              background: 'rgba(74,222,128,0.08)',
              borderRadius: '4px',
              padding: '14px',
              textAlign: 'center',
            }}>
              <div style={{ color: '#4ade80', fontSize: '11px', letterSpacing: '3px', fontWeight: 'bold' }}>
                ✓ CONNECTING TO ETHERWORLD...
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{
          width: '200px', flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: '10px',
          marginLeft: '12px',
        }}>
          {/* Network status */}
          <Panel title="NETWORK_STATUS" color="#a78bfa">
            {RIGHT_STATS.map((s, i) => (
              <div key={i} style={{ marginBottom: '8px' }}>
                <div style={{ color: '#52525b', fontSize: '9px', letterSpacing: '2px' }}>{s.label}</div>
                <div style={{ color: s.color, fontSize: '10px', fontWeight: 'bold', textShadow: `0 0 6px ${s.color}55` }}>
                  {s.value}
                </div>
              </div>
            ))}
          </Panel>

          {/* Live metrics */}
          <Panel title="LIVE_METRICS" color="#fbbf24">
            {[
              { label: 'FPS', value: '144', max: 144, color: '#4ade80' },
              { label: 'VRAM', value: '3.2GB', max: 24, pct: 13, color: '#22d3ee' },
              { label: 'CPU', value: '12%', max: 100, pct: 12, color: '#a78bfa' },
              { label: 'RAM', value: '2.1GB', max: 64, pct: 3, color: '#fbbf24' },
            ].map((m, i) => (
              <div key={i} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ color: '#52525b', fontSize: '9px', letterSpacing: '1px' }}>{m.label}</span>
                  <span style={{ color: m.color, fontSize: '9px' }}>{m.value}</span>
                </div>
                <div style={{ height: '3px', background: '#18181b', borderRadius: '2px' }}>
                  <div style={{
                    height: '100%', width: `${m.pct ?? 100}%`,
                    background: m.color, borderRadius: '2px',
                    boxShadow: `0 0 4px ${m.color}`,
                  }} />
                </div>
              </div>
            ))}
          </Panel>

          {/* Admin commands */}
          <Panel title="ADMIN_CONSOLE" color="#f472b6">
            <div style={{ color: '#71717a', fontSize: '9px', lineHeight: 1.7 }}>
              {['/noclip', '/fly', '/god', '/scene', '/build', '/weather', '/time', '/lock'].map((cmd, i) => (
                <div key={i}>
                  <span style={{ color: '#f472b6' }}>{cmd}</span>
                  <span style={{ color: '#27272a' }}> — ready</span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Timestamp */}
          <div style={{
            border: '1px solid #1a1a2e',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: '4px',
            padding: '8px 10px',
            textAlign: 'center',
          }}>
            <LiveClock />
          </div>
        </div>
      </div>

      {/* Top + bottom border bars */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px', zIndex: 20,
        background: 'linear-gradient(90deg, transparent, #00e5ff, #4ade80, #ff3af2, #00e5ff, transparent)',
        opacity: 0.7,
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', zIndex: 20,
        background: 'linear-gradient(90deg, transparent, #ff3af2, #4ade80, #00e5ff, #ff3af2, transparent)',
        opacity: 0.7,
      }} />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Panel({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{
      border: `1px solid ${color}33`,
      background: 'rgba(0,0,0,0.6)',
      borderRadius: '4px',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '5px 10px',
        borderBottom: `1px solid ${color}22`,
        background: `${color}0a`,
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
        <span style={{ color, fontSize: '8px', letterSpacing: '2px', fontWeight: 'bold' }}>{title}</span>
      </div>
      <div style={{ padding: '8px 10px' }}>
        {children}
      </div>
    </div>
  );
}

function LiveClock() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => {
    const iv = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);
  const fmt = (n: number) => String(n).padStart(2, '0');
  return (
    <>
      <div style={{ color: '#22d3ee', fontSize: '16px', fontWeight: 'bold', letterSpacing: '3px', textShadow: '0 0 8px #22d3ee' }}>
        {fmt(t.getHours())}:{fmt(t.getMinutes())}:{fmt(t.getSeconds())}
      </div>
      <div style={{ color: '#27272a', fontSize: '8px', marginTop: '2px', letterSpacing: '1px' }}>
        {t.toLocaleDateString('fr-CA', { timeZone: 'America/Montreal', year: 'numeric', month: 'short', day: 'numeric' })}
      </div>
      <div style={{ color: '#4ade80', fontSize: '8px', letterSpacing: '1px' }}>
        EST / QC-MTL
      </div>
    </>
  );
}
