import React, { useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (view: 'landing' | 'character-creator' | 'etherprism' | 'troxt-chat' | 'sandbox' | 'map') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Background particle loop
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleCount = 65;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 0.5,
      color: Math.random() > 0.5 ? 'rgba(123, 111, 255, 0.4)' : 'rgba(0, 212, 255, 0.4)',
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw particle connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(123, 111, 255, ${0.12 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Render and update particles
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative min-h-screen text-slate-100 flex flex-col font-sans select-none overflow-y-auto overflow-x-hidden pt-[62px]">
      <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none opacity-40" />

      {/* --- HERO SECTION --- */}
      <section className="relative z-10 max-w-7xl mx-auto w-full px-6 pt-20 pb-16 flex flex-col lg:flex-row items-center justify-between gap-12">
        <div className="flex-1 max-w-xl text-left animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-4 py-1.5 rounded-full text-indigo-400 font-mono text-xs font-bold tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            TROXT SUPERVISOR CORE v4.0
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-none mb-6">
            <span className="block text-slate-400 text-2xl uppercase tracking-widest font-mono font-normal mb-1">DÔME MULTI-AGENTS</span>
            <span className="bg-gradient-to-r from-white via-indigo-200 to-cyan-400 bg-clip-text text-transparent filter drop-shadow-[0_0_30px_rgba(99,102,241,0.2)]">
              TroxT Core
            </span>
          </h1>

          <p className="text-slate-400 text-lg leading-relaxed mb-8">
            TroxT est l'intelligence artificielle unifiée d'EtherWorld. Un dôme de 16 agents spécialisés synchronise en temps réel la base de données, la validation physique des objets 3D et le dôme de simulation RP.
          </p>

          <div className="flex flex-wrap gap-4 mb-10">
            <button
              onClick={() => onNavigate('sandbox')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3.5 rounded-xl flex items-center gap-2 transition duration-200 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transform hover:-translate-y-0.5 cursor-pointer"
            >
              Lancer le Mode GMod Sandbox
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('character-creator')}
              className="bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-amber-400 font-bold px-6 py-3.5 rounded-xl transition duration-200 cursor-pointer"
            >
              👤 Character Creator 3D
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-6 border-t border-slate-900 pt-8 font-mono">
            <div>
              <span className="block text-2xl font-black text-indigo-400">16</span>
              <span className="text-xs text-slate-500 uppercase tracking-widest">Agents Actifs</span>
            </div>
            <div>
              <span className="block text-2xl font-black text-cyan-400">98%</span>
              <span className="text-xs text-slate-500 uppercase tracking-widest">Score Cognitif</span>
            </div>
            <div>
              <span className="block text-2xl font-black text-emerald-400">0.05s</span>
              <span className="text-xs text-slate-500 uppercase tracking-widest">Sync Bus Event</span>
            </div>
          </div>
        </div>

        {/* Neural Circle Visualizer */}
        <div className="flex-1 relative w-full max-w-[420px] aspect-square flex items-center justify-center animate-fade-in delay-200">
          <div className="absolute inset-0 rounded-full border border-indigo-500/10 animate-[spin_25s_linear_infinite]" />
          <div className="absolute inset-4 rounded-full border border-dashed border-cyan-500/15 animate-[spin_18s_linear_infinite_reverse]" />
          <div className="absolute inset-12 rounded-full border border-indigo-500/30" />

          {/* Nodes */}
          <div 
            onClick={() => onNavigate('etherprism')}
            className="absolute -top-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-slate-950 border border-indigo-500/40 hover:border-indigo-400 flex items-center justify-center text-xl cursor-pointer hover:shadow-2xl hover:shadow-indigo-500/30 transition transform hover:scale-110 group"
          >
            👁️
            <span className="absolute -bottom-8 bg-slate-950/90 border border-slate-900 text-[10px] font-mono font-black uppercase text-indigo-300 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
              EtherPrism DB
            </span>
          </div>

          <div 
            onClick={() => onNavigate('sandbox')}
            className="absolute top-1/2 -right-4 -translate-y-1/2 w-14 h-14 rounded-full bg-slate-950 border border-amber-500/40 hover:border-amber-400 flex items-center justify-center text-xl cursor-pointer hover:shadow-2xl hover:shadow-amber-500/30 transition transform hover:scale-110 group"
          >
            ⚒️
            <span className="absolute -bottom-8 bg-slate-950/90 border border-slate-900 text-[10px] font-mono font-black uppercase text-amber-300 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
              EtherForge 3D
            </span>
          </div>

          <div 
            onClick={() => onNavigate('troxt-chat')}
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-slate-950 border border-cyan-500/40 hover:border-cyan-400 flex items-center justify-center text-xl cursor-pointer hover:shadow-2xl hover:shadow-cyan-500/30 transition transform hover:scale-110 group"
          >
            🤖
            <span className="absolute -bottom-8 bg-slate-950/90 border border-slate-900 text-[10px] font-mono font-black uppercase text-cyan-300 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
              Admin Brain
            </span>
          </div>

          <div 
            onClick={() => onNavigate('character-creator')}
            className="absolute top-1/2 -left-4 -translate-y-1/2 w-14 h-14 rounded-full bg-slate-950 border border-violet-500/40 hover:border-violet-400 flex items-center justify-center text-xl cursor-pointer hover:shadow-2xl hover:shadow-violet-500/30 transition transform hover:scale-110 group"
          >
            👤
            <span className="absolute -bottom-8 bg-slate-950/90 border border-slate-900 text-[10px] font-mono font-black uppercase text-violet-300 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
              CharCreator
            </span>
          </div>

          <div className="flex flex-col items-center gap-1 z-10 text-center">
            <span className="text-5xl text-indigo-400 filter drop-shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-pulse">⬡</span>
            <span className="font-mono text-sm tracking-[0.3em] font-black uppercase text-indigo-200">TroxT</span>
            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">Brain Core</span>
          </div>
        </div>
      </section>

      {/* --- BENTO MODULE CARDS --- */}
      <section className="relative z-10 max-w-7xl mx-auto w-full px-6 py-12">
        <span className="text-indigo-400 font-mono text-xs font-bold tracking-widest block mb-2 uppercase">// APPS & MODULES</span>
        <h2 className="text-3xl font-black text-slate-100 tracking-tight mb-8">Modules Actifs & Laboratoires</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* ETHERPRISM */}
          <div 
            onClick={() => onNavigate('etherprism')}
            className="group bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl p-6 transition duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/5 cursor-pointer flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-4xl">🗄️</span>
              <span className="text-[9px] font-mono font-extrabold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">LIVE ●</span>
            </div>
            <h3 className="text-xl font-bold text-indigo-300 group-hover:text-indigo-200 mb-2">EtherPrism DB</h3>
            <p className="text-slate-400 text-xs leading-relaxed flex-grow">
              Le centre administratif de base de données RP. Explorez, filtrez et modifiez les tables (Players, Vehicles, Bank, Factions...) avec sauvegarde intégrale et bac à sable de requêtes JS.
            </p>
          </div>

          {/* SANDBOX */}
          <div 
            onClick={() => onNavigate('sandbox')}
            className="group bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/40 rounded-2xl p-6 transition duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/5 cursor-pointer flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-4xl">🏗️</span>
              <span className="text-[9px] font-mono font-extrabold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">LIVE ●</span>
            </div>
            <h3 className="text-xl font-bold text-amber-400 group-hover:text-amber-300 mb-2">RP Sandbox</h3>
            <p className="text-slate-400 text-xs leading-relaxed flex-grow">
              Un simulateur de ville 3D avec physique de collisions en temps réel (Cannon-es). Construisez votre ferme de weed, achetez des maisons, et chevauchez des balais magiques ou hoverboards !
            </p>
          </div>

          {/* CHARACTER CREATOR */}
          <div 
            onClick={() => onNavigate('character-creator')}
            className="group bg-slate-900/60 border border-slate-800/80 hover:border-violet-500/40 rounded-2xl p-6 transition duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-500/5 cursor-pointer flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-4xl">👤</span>
              <span className="text-[9px] font-mono font-extrabold px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">AURA PRO ●</span>
            </div>
            <h3 className="text-xl font-bold text-violet-400 group-hover:text-violet-300 mb-2">Character Creator</h3>
            <p className="text-slate-400 text-xs leading-relaxed flex-grow">
              Outil de modélisation procedural 3D. Personnalisez l'avatar, configurez les sliders physiques et équipez une des 12 auras magiques spectaculaires (givre, feu, nécromancie...).
            </p>
          </div>

          {/* TROXT AGENT CHAT */}
          <div 
            onClick={() => onNavigate('troxt-chat')}
            className="group bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 rounded-2xl p-6 transition duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-cyan-500/5 cursor-pointer flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-4xl">🤖</span>
              <span className="text-[9px] font-mono font-extrabold px-2.5 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">AGENT AI ●</span>
            </div>
            <h3 className="text-xl font-bold text-cyan-400 group-hover:text-cyan-300 mb-2">Admin Brain Chat</h3>
            <p className="text-slate-400 text-xs leading-relaxed flex-grow">
              Interagissez directement avec le Superviseur TroxT. Demande-lui de te générer des schémas JSON, des configurations ou des logs d'Audit.
            </p>
          </div>
        </div>
      </section>

      {/* --- MOCK CORE TERMINAL --- */}
      <section className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 pb-20">
        <div className="bg-slate-950 border border-indigo-500/20 rounded-xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="bg-slate-900/60 border-b border-slate-900 px-4 py-2 flex items-center justify-between">
            <div className="flex gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            </div>
            <span className="text-[10px] font-mono text-slate-500">troxt_supervisor_core.sh</span>
            <span className="w-4 h-4 text-slate-500 text-xs">⬡</span>
          </div>
          {/* Body */}
          <div className="p-5 font-mono text-[11px] leading-relaxed text-slate-300 text-left flex flex-col gap-1 max-h-56 overflow-y-auto">
            <p className="text-indigo-400">$ node server/index.js</p>
            <p className="text-emerald-400">● [INFO] initialisation du bus d'événements Arcadius... OK</p>
            <p className="text-emerald-400">● [INFO] chargement du contrat de données Benedictus... VALIDE (8 tables)</p>
            <p className="text-emerald-400">● [INFO] allocation de la mémoire cognitive volatile Lotus... ALLOCATED (TTL 1800s)</p>
            <p className="text-slate-400">● [INFO] synchronisation avec le moteur 3D ThreeJS... CONNECTÉ</p>
            <p className="text-slate-400">● [INFO] dôme de surveillance Third Eye actif... SCORE RISQUE GLOBAL: GREEN ●</p>
            <p className="text-cyan-300">● [SUCCESS] Superviseur TroxT en attente d'instructions sur http://localhost:4000 <span className="animate-pulse font-bold">_</span></p>
          </div>
        </div>
      </section>
    </div>
  );
};
