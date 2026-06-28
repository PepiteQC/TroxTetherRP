import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Globe, 
  Sparkles, 
  UserCheck, 
  Cpu, 
  Box, 
  RotateCcw, 
  Sliders, 
  ArrowRight, 
  Key, 
  AlertTriangle,
  Lock,
  LogOut,
  CornerDownRight,
  Database,
  MessageSquare,
  Gamepad2,
  Home
} from 'lucide-react';

// Core Game
import { GameManager } from './game/GameManager';
import { PlayerState, QualityLevel } from './types';

// App Views & Sub-components
import { LandingPage } from './components/LandingPage';
import { CharacterCreator } from './components/CharacterCreator';
import { EtherPrismAdmin } from './components/EtherPrismAdmin';
import { TroxTChat } from './components/TroxTChat';
import { HUD } from './components/HUD';
import { GModMenu } from './components/GModMenu';
import { MainMenu } from './components/MainMenu';
import { SmartHouseSimulator } from './components/SmartHouseSimulator';

// Legacy AI Tools
import { ModelViewer } from './components/ModelViewer';
import { PhotoTo3DPanel } from './components/PhotoTo3DPanel';
import { AutonomousPanel } from './components/AutonomousPanel';
import { Import3DPanel } from './components/Import3DPanel';

const SUGGESTIONS = [
  { text: "Sword of pure ice shards, frost emissive", category: "Armes" },
  { text: "Ethereal floating crystal obelisk with celestial energy", category: "Décors" },
  { text: "Demon hunter fel magic portal, neon green light", category: "Effets" },
  { text: "Futuristic plasma container, electric sparks vortex", category: "Sci-Fi" },
  { text: "Ancient brick runestone, glowing blue symbols", category: "Mystique" },
  { text: "Gold mechanical gears cluster, spinning float motion", category: "Steampunk" }
];

const VALID_CODES = ["ADMIN-TROXT", "EW-OWNER-2025", "ETHERWORLD-ADM"];

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    try {
      return localStorage.getItem("etherworld_suite_unlocked") === "true";
    } catch {
      return false;
    }
  });

  const [codeAttempt, setCodeAttempt] = useState("");
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // App routing state
  const [view, setView] = useState<'landing' | 'sandbox' | 'character-creator' | 'ai-lab' | 'etherprism' | 'troxt-chat' | 'smart-house'>('landing');

  // AI Lab specific states
  const [aiTab, setAiTab] = useState<'text3d' | 'pipelines' | 'viewer3d'>('text3d');
  const [prompt, setPrompt] = useState<string>("Sword of pure ice shards, frost emissive");
  const [customInput, setCustomInput] = useState("");
  const [quality, setQuality] = useState<QualityLevel>("balanced");

  // Sandbox game states
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameManagerRef = useRef<GameManager | null>(null);

  const [gameState, setGameState] = useState<PlayerState>(() => {
    try {
      const saved = localStorage.getItem("etherworld_gmod_state_v2");
      return saved ? JSON.parse(saved) : {
        cash: 500,
        inventory: { seed: 3, weed: 0 },
        plants: [],
        houses: { 'villa_nova': false, 'loft_industriel': false },
        activeMount: null,
        mountPos: null
      };
    } catch {
      return {
        cash: 500,
        inventory: { seed: 3, weed: 0 },
        plants: [],
        houses: { 'villa_nova': false, 'loft_industriel': false },
        activeMount: null,
        mountPos: null
      };
    }
  });

  const [gameTime, setGameTime] = useState('12:00');
  const [activeMenu, setActiveMenu] = useState<'none' | 'spawn' | 'main' | 'admin'>('none');
  const [isGameInit, setIsGameInit] = useState(false);

  // GMod Game settings state
  const [gameSettings, setGameSettings] = useState({
    jacketColor: '#8b5cf6',
    gridSnap: 0.5,
    startHour: 12,
  });

  // Keep sandbox state persisted in localStorage
  useEffect(() => {
    try {
      localStorage.setItem("etherworld_gmod_state_v2", JSON.stringify(gameState));
    } catch (err) {
      console.error("Local storage save error: ", err);
    }
  }, [gameState]);

  // Handle canvas & WebGL initialization
  useEffect(() => {
    if (view !== 'sandbox' || !canvasRef.current || !containerRef.current) {
      if (gameManagerRef.current) {
        gameManagerRef.current.destroy();
        gameManagerRef.current = null;
        setIsGameInit(false);
      }
      return;
    }

    const gm = new GameManager(
      containerRef.current,
      canvasRef.current,
      gameState,
      gameSettings,
      (newState) => {
        setGameState(newState);
      }
    );

    gameManagerRef.current = gm;
    setIsGameInit(true);

    return () => {
      if (gameManagerRef.current) {
        gameManagerRef.current.destroy();
        gameManagerRef.current = null;
        setIsGameInit(false);
      }
    };
  }, [view]);

  // Sync game time from animation loop timer
  useEffect(() => {
    if (view !== 'sandbox' || !gameManagerRef.current) return;
    const interval = setInterval(() => {
      if (gameManagerRef.current) {
        setGameTime(gameManagerRef.current.getFormattedTime());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [view, isGameInit]);

  const handleApplySettings = (settings: typeof gameSettings) => {
    setGameSettings(settings);
    if (gameManagerRef.current) {
      gameManagerRef.current.applySettings(settings);
    }
  };

  const handleSpawnItem = (itemKey: string) => {
    if (gameManagerRef.current) {
      gameManagerRef.current.enterBuildMode(itemKey);
      setActiveMenu('none');
    }
  };

  const handleInteract = (action: string) => {
    if (gameManagerRef.current) {
      gameManagerRef.current.triggerInteraction(action);
    }
  };

  const handleGenerate = useCallback(() => {
    if (customInput.trim()) {
      setPrompt(customInput);
    }
  }, [customInput]);

  const handleUnlockAttempt = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanAttempt = codeAttempt.trim().toUpperCase();
    
    if (VALID_CODES.includes(cleanAttempt)) {
      setIsUnlocked(true);
      setIsPromptOpen(false);
      setErrorMsg(null);
      setCodeAttempt("");
      try {
        localStorage.setItem("etherworld_suite_unlocked", "true");
      } catch (err) {
        console.error(err);
      }
    } else {
      setErrorMsg("CODE D'ACCÈS INVALIDE. VEUILLEZ RÉESSAYER.");
      setCodeAttempt("");
      setTimeout(() => setErrorMsg(null), 3000);
    }
  }, [codeAttempt]);

  const handleLock = useCallback(() => {
    setIsUnlocked(false);
    setView('landing');
    try {
      localStorage.removeItem("etherworld_suite_unlocked");
    } catch (err) {
      console.error(err);
    }
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#070010] text-slate-200 flex flex-col font-sans select-none antialiased relative">
      
      {/* Glow ambient background spots */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Unified Universal Header Nav */}
      <nav className="fixed top-0 left-0 right-0 h-[62px] bg-black/40 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('landing')}>
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
              <Globe className="w-5 h-5 text-white animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-widest text-indigo-400 uppercase leading-none">
                ETHERWORLD <span className="text-white/20 font-light text-xs">v4.3.0</span>
              </h1>
              <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 mt-1 font-mono">
                TroxT Unified Dome System
              </p>
            </div>
          </div>

          <span className="text-slate-800 hidden md:inline">|</span>

          {/* Unified routing buttons inside same page */}
          <div className="hidden lg:flex bg-white/5 p-1 rounded-xl border border-white/10 shadow-inner gap-1">
            <button
              onClick={() => setView('landing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none ${
                view === 'landing' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Accueil
            </button>
            <button
              onClick={() => setView('sandbox')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none flex items-center gap-1.5 ${
                view === 'sandbox' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              GMod Sandbox
            </button>
            <button
              onClick={() => setView('character-creator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none flex items-center gap-1.5 ${
                view === 'character-creator' ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Rig Perso
            </button>
            <button
              onClick={() => setView('ai-lab')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none flex items-center gap-1.5 ${
                view === 'ai-lab' ? 'bg-fuchsia-600 text-white shadow-lg shadow-fuchsia-600/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Labo IA 3D
            </button>
            <button
              onClick={() => setView('etherprism')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none flex items-center gap-1.5 ${
                view === 'etherprism' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              EtherPrism DB
            </button>
            <button
              onClick={() => setView('troxt-chat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none flex items-center gap-1.5 ${
                view === 'troxt-chat' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Supervisor Chat
            </button>
            <button
              onClick={() => setView('smart-house')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer select-none flex items-center gap-1.5 ${
                view === 'smart-house' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              Domotique 3D
            </button>
          </div>
        </div>

        {/* Right side connection / Lock stats */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-500">SYSTEM STABLE</span>
          </div>

          {isUnlocked ? (
            <button
              onClick={handleLock}
              className="p-2 rounded-xl bg-red-950/20 hover:bg-red-900/40 border border-red-500/20 text-red-400 hover:text-red-300 transition-all cursor-pointer"
              title="Verrouiller la suite"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setIsPromptOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)] flex items-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              Unlock Labs
            </button>
          )}
        </div>
      </nav>

      {/* App Main Body View Controller */}
      <div className="flex-grow w-full h-full relative">
        
        {/* LANDING PAGE (Default starting route) */}
        {view === 'landing' && (
          <LandingPage onNavigate={(v) => {
            if (!isUnlocked && v !== 'landing' && v !== 'sandbox') {
              setIsPromptOpen(true);
            } else {
              setView(v);
            }
          }} />
        )}

        {/* CHARACTER CREATOR PANEL */}
        {view === 'character-creator' && (
          <div className="pt-[62px] h-full w-full overflow-y-auto scrollbar-thin">
            {isUnlocked ? (
              <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-wider">Créateur de Rig Humanoïde</h2>
                    <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest mt-0.5">Configurez, modifiez, exportez et injectez votre personnage dans la ville RP</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-[9px] font-mono text-violet-400 font-bold uppercase tracking-widest">
                    <UserCheck className="w-3.5 h-3.5" /> Rig Active Workspace
                  </div>
                </div>
                <CharacterCreator />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">S'il vous plaît débloquer l'accès pour accéder aux modules.</div>
            )}
          </div>
        )}

        {/* ETHERPRISM DB MANAGER */}
        {view === 'etherprism' && (
          isUnlocked ? (
            <EtherPrismAdmin onNavigate={(v) => setView(v)} />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">S'il vous plaît débloquer l'accès pour accéder aux modules.</div>
          )
        )}

        {/* SUPERVISOR CHATBOT */}
        {view === 'troxt-chat' && (
          isUnlocked ? (
            <TroxTChat onNavigate={(v) => setView(v)} />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">S'il vous plaît débloquer l'accès pour accéder aux modules.</div>
          )
        )}

        {/* SMART HOUSE ACCÈS CONTROLS 3D */}
        {view === 'smart-house' && (
          <div className="pt-[62px] h-full w-full overflow-y-auto scrollbar-thin">
            {isUnlocked ? (
              <SmartHouseSimulator />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">S'il vous plaît débloquer l'accès pour accéder aux modules.</div>
            )}
          </div>
        )}

        {/* GMOD PHYSICS SANDBOX GAME */}
        {view === 'sandbox' && (
          <div ref={containerRef} className="relative w-full h-full pt-[62px] select-none flex">
            {/* The 3D Canvas */}
            <canvas ref={canvasRef} className="w-full h-full block" />

            {/* In-game Overlays */}
            {isGameInit && (
              <>
                {/* HUD Overlay */}
                <HUD 
                  state={gameState} 
                  gameTime={gameTime}
                  activeMenu={activeMenu}
                  onOpenMenu={(m) => setActiveMenu(m)}
                  onInteract={handleInteract}
                />

                {/* Flying / Flight keys instructions panel */}
                <div className="absolute left-6 top-24 z-10 flex flex-col gap-3">
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 max-w-xs backdrop-blur-md">
                    <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block mb-1">Commandes Vol / Hover</span>
                    <p className="text-[11px] text-slate-300 leading-normal">
                      Montez un <b>hoverboard</b> ou un <b>balai magique</b> pour voler : <br />
                      <b>WASD</b> pour avancer, <b>Espace</b> monter, <b>Shift</b> descendre.
                    </p>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 max-w-xs backdrop-blur-md">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block mb-1">Cannabis Farming</span>
                    <p className="text-[11px] text-slate-300 leading-normal">
                      Posez un pot, plantez une graine, puis utilisez <b>Arroser</b> dans le HUD pour la faire grandir. Récoltez et vendez ensuite !
                    </p>
                  </div>
                </div>

                {/* Spawn GMod Menu */}
                {activeMenu === 'spawn' && (
                  <GModMenu 
                    onSpawn={handleSpawnItem} 
                    onClose={() => setActiveMenu('none')} 
                  />
                )}

                {/* Settings simulation configurations Menu */}
                {activeMenu === 'main' && (
                  <MainMenu 
                    settings={gameSettings}
                    onSave={handleApplySettings}
                    onClose={() => setActiveMenu('none')}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* IA LAB TOOLS PANEL */}
        {view === 'ai-lab' && (
          isUnlocked ? (
            <div className="pt-[62px] h-full w-full overflow-y-auto scrollbar-thin">
              <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
                
                {/* AI Lab Sub Navigation */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2 flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <h2 className="text-lg font-black text-white uppercase tracking-wider">Laboratoires IA 3D</h2>
                    
                    <nav className="flex bg-white/5 p-1 rounded-xl border border-white/10 shadow-inner gap-1">
                      <button
                        onClick={() => setAiTab("text3d")}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          aiTab === "text3d" ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white"
                        }`}
                      >
                        Text-to-3D
                      </button>
                      <button
                        onClick={() => setAiTab("pipelines")}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          aiTab === "pipelines" ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white"
                        }`}
                      >
                        Photo ➜ 3D
                      </button>
                      <button
                        onClick={() => setAiTab("viewer3d")}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          aiTab === "viewer3d" ? "bg-indigo-600 text-white" : "text-white/40 hover:text-white"
                        }`}
                      >
                        Glb Import
                      </button>
                    </nav>
                  </div>
                  
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-full text-[9px] font-mono text-fuchsia-400 font-bold uppercase tracking-widest">
                    <Sparkles className="w-3.5 h-3.5" /> AI Engine Workspace
                  </div>
                </div>

                {/* AI Sub-views content rendering */}
                {aiTab === 'text3d' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                    {/* Left Panel */}
                    <div className="lg:col-span-1 space-y-6">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col space-y-4 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />
                        <div className="flex items-center gap-2">
                          <Sparkles className="text-violet-400 w-4 h-4" />
                          <h2 className="font-bold text-xs uppercase tracking-widest text-violet-400">Génération 3D</h2>
                        </div>
                        <p className="text-xs text-slate-300/60 leading-relaxed font-sans">
                          Notre compilateur IA convertit des descriptions naturelles en scènes géométriques complexes avec shaders PBR et particules d'effets dynamiques.
                        </p>

                        <div className="space-y-2">
                          <label className="text-[10px] text-white/30 uppercase tracking-widest font-mono">Prompt de Création</label>
                          <textarea
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                            placeholder="Décrivez votre objet en anglais (ex: Sword of fire, ice, gold, storm, etc.)"
                            className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-white/20 focus:border-violet-500 outline-none resize-none transition-all leading-relaxed"
                          />
                          <button
                            onClick={handleGenerate}
                            disabled={!customInput.trim()}
                            className={`w-full py-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                              customInput.trim()
                                ? "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] cursor-pointer"
                                : "bg-white/5 text-white/20 cursor-not-allowed border border-white/5"
                            }`}
                          >
                            Compiler l'objet 3D
                          </button>
                        </div>

                        {/* Quality choice */}
                        <div className="space-y-2 border-t border-white/10 pt-4">
                          <span className="text-[10px] text-white/30 uppercase tracking-widest block mb-1">Qualité de Maillage</span>
                          <div className="grid grid-cols-3 gap-2">
                            {(["fast", "balanced", "high"] as QualityLevel[]).map((q) => (
                              <button
                                key={q}
                                onClick={() => setQuality(q)}
                                className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                                  quality === q
                                    ? "bg-violet-500/25 border-violet-500/50 text-violet-300 shadow-[0_0_10px_rgba(124,58,237,0.15)]"
                                    : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                                }`}
                              >
                                {q === "fast" ? "Draft" : q === "balanced" ? "Balanced" : "Ultra HD"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Instant Blueprint Presets */}
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4 shadow-xl">
                        <h3 className="font-bold text-xs uppercase tracking-widest text-fuchsia-400 flex items-center gap-2">
                          <Sliders className="w-4 h-4" />
                          Gabarits Rapides
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                          {SUGGESTIONS.map((s, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setPrompt(s.text);
                                setCustomInput(s.text);
                              }}
                              className="text-left p-3 rounded-xl bg-black/40 hover:bg-violet-950/20 border border-white/5 hover:border-violet-500/20 transition-all text-xs group flex items-start justify-between gap-3 cursor-pointer select-none"
                            >
                              <div>
                                <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest block font-bold mb-1">
                                  {s.category}
                                </span>
                                <p className="text-white/70 group-hover:text-white font-sans text-[11px] leading-snug">
                                  {s.text}
                                </p>
                              </div>
                              <CornerDownRight className="w-4 h-4 text-white/10 group-hover:text-violet-400 mt-1 transition-colors shrink-0" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* AI Viewport Viewer */}
                    <div className="lg:col-span-2 flex flex-col min-h-[500px] lg:min-h-[640px] bg-[#06000c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
                      <div className="flex-1 w-full relative">
                        <ModelViewer prompt={prompt} quality={quality} />
                        
                        <div className="absolute bottom-5 left-5 bg-black/80 border border-white/10 rounded-xl p-3.5 max-w-md backdrop-blur-md">
                          <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest block mb-1">Prompt Actif :</span>
                          <p className="text-white text-xs leading-relaxed font-sans font-medium">{prompt}</p>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-black/60 border-t border-white/10 flex flex-wrap justify-between items-center gap-3">
                        <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
                          Clic gauche pour pivoter · Clic droit pour glisser · Molette pour zoomer
                        </span>
                        <button
                          onClick={() => {
                            setPrompt("Sword of pure ice shards, frost emissive");
                            setCustomInput("");
                          }}
                          className="flex items-center gap-1.5 text-[10px] text-violet-400 hover:text-white uppercase tracking-widest font-bold transition-all cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Réinitialiser
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {aiTab === 'pipelines' && (
                  <div className="space-y-8 animate-fade-in">
                    <PhotoTo3DPanel />
                    <div className="border-t border-violet-500/5 pt-8">
                      <AutonomousPanel />
                    </div>
                  </div>
                )}

                {aiTab === 'viewer3d' && (
                  <div className="space-y-6 animate-fade-in">
                    <Import3DPanel />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">S'il vous plaît débloquer l'accès pour accéder aux modules.</div>
          )
        )}
      </div>

      {/* Access Lock Prompt Modal */}
      {isPromptOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-black/60 border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6 max-w-md w-full backdrop-blur-xl relative animate-fade-in">
            <div className="absolute top-4 right-4">
              <button onClick={() => setIsPromptOpen(false)} className="text-white/40 hover:text-white text-xs cursor-pointer">
                ✕ Fermer
              </button>
            </div>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                <Key className="w-5 h-5" />
              </div>
              <h3 className="text-white font-bold uppercase tracking-wider text-sm">Saisir le Code d'Accès</h3>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Administration Requise</p>
            </div>

            <form onSubmit={handleUnlockAttempt} className="space-y-4">
              <input
                type="password"
                placeholder="ENTRER LE CODE D'ACCÈS"
                value={codeAttempt}
                onChange={(e) => setCodeAttempt(e.target.value)}
                className="w-full bg-black/50 border border-white/10 focus:border-indigo-500 rounded-xl py-3.5 text-center text-white placeholder-white/20 font-mono text-xs tracking-[0.2em] uppercase outline-none transition-all"
                autoFocus
              />
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-[0.15em] transition-all shadow-[0_0_15px_rgba(99,102,241,0.5)] cursor-pointer"
              >
                Valider l'authentification
              </button>
            </form>

            {errorMsg && (
              <div className="text-red-400 font-mono text-[9px] uppercase tracking-wider text-center flex items-center justify-center gap-1 font-bold animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" /> {errorMsg}
              </div>
            )}

            <div className="text-center text-[9px] font-mono text-white/20 uppercase tracking-widest mt-4">
              Codes d'administration d'origine : ADMIN-TROXT · EW-OWNER-2025
            </div>
          </div>
        </div>
      )}

      {/* Retro-futuristic Status Footer Bar */}
      {view !== 'sandbox' && view !== 'etherprism' && (
        <footer className="border-t border-white/5 bg-black/60 py-4 shrink-0 z-40">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] font-mono tracking-widest text-white/20 uppercase font-bold">
            <span>ETHERWORLD &copy; 2026 - PROPRIÉTÉ DE ETHERZRP NETWORK</span>
            <span className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                Supervisor Core: ONLINE
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                Engine: ThreeJS WebGL 2.0
              </span>
            </span>
          </div>
        </footer>
      )}
    </div>
  );
}
