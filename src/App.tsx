import { useEffect, useRef, useState } from 'react';
import { GameManager } from './game/GameManager';
import { PlayerState } from './types';
import { MainMenu } from './components/MainMenu';
import { GModMenu } from './components/GModMenu';
import { HUD } from './components/HUD';
import { Hammer, Sliders, Play, RotateCcw, AlertTriangle, Eye } from 'lucide-react';

// New view sub-components
import { LandingPage } from './components/LandingPage';
import { CharacterCreator } from './components/CharacterCreator';
import { EtherPrismAdmin } from './components/EtherPrismAdmin';
import { TroxTChat } from './components/TroxTChat';
import { AdminPanel } from './components/AdminPanel';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const managerRef = useRef<GameManager | null>(null);

  // App routing and phase views
  const [view, setView] = useState<'landing' | 'character-creator' | 'etherprism' | 'troxt-chat' | 'sandbox'>('landing');
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [isSpawnMenuOpen, setIsSpawnMenuOpen] = useState<boolean>(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState<boolean>(false);
  const typedBufferRef = useRef<string>('');

  // Player state synchronised from game loop
  const [playerState, setPlayerState] = useState<PlayerState>({
    health: 100,
    cash: 2500,
    activeStreet: 'Zone Résidentielle',
    isSprinting: false,
    isBuilding: false,
    selectedItemId: null,
    gridSnapSize: 0.5,
    activeMount: null,
    activeCombatMove: null,
    combatLogs: [],
    sceneTemplate: 'completed',
    nearCantine: false,
    examinedCantine: false,
    nearMarchand: false,
    examinedMarchand: false,
  });

  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0, z: 15 });
  const [playerYaw, setPlayerYaw] = useState(0);
  const [highlightedItemName, setHighlightedItemName] = useState<string | null>(null);
  const [nearDoor, setNearDoor] = useState<any | null>(null);

  // GMod Menu starting parameters cached from MainMenu selection
  const [menuSetup, setMenuSetup] = useState<{
    startHour: number;
    jacketColor: number;
    gridSnap: number;
  } | null>(null);

  // ─── START GAME TRIGGER ──────────────────────────────────────────
  const handleStartGame = (setup: {
    startHour: number;
    jacketColor: number;
    gridSnap: number;
  }) => {
    setMenuSetup(setup);
    setIsGameStarted(true);
  };

  // ─── INITIALISE THREEJS GAME CONTEXT ONCE STARTED ────────────────
  useEffect(() => {
    if (!isGameStarted || !canvasRef.current || !menuSetup) return;

    // Create the master GameManager instance
    const manager = new GameManager(canvasRef.current, (reportedState) => {
      // Callback executed on every 3D tick loop to synchronise React UI states
      setPlayerState({
        health: reportedState.health,
        cash: reportedState.cash,
        activeStreet: reportedState.activeStreet,
        isSprinting: reportedState.isSprinting,
        isBuilding: reportedState.isBuilding,
        selectedItemId: reportedState.selectedItemId,
        gridSnapSize: reportedState.gridSnapSize,
        activeMount: reportedState.activeMount,
        activeCombatMove: reportedState.activeCombatMove,
        combatLogs: reportedState.combatLogs || [],
        sceneTemplate: reportedState.sceneTemplate || 'completed',
        boughtPropertyIds: reportedState.boughtPropertyIds || [],
        activeAgentAction: reportedState.activeAgentAction || 'Attente',
        agentCognitiveScore: reportedState.agentCognitiveScore || 95,
        riskRating: reportedState.riskRating || 'GREEN',
        agentLogs: reportedState.agentLogs || [],
        nearGarment: reportedState.nearGarment,
        examinedGarment: reportedState.examinedGarment,
        nearCantine: reportedState.nearCantine,
        examinedCantine: reportedState.examinedCantine,
        nearMarchand: reportedState.nearMarchand,
        examinedMarchand: reportedState.examinedMarchand,
        godMode: reportedState.godMode,
      });

      // Track positions for minimap
      setPlayerPos(reportedState.playerPos);

      setPlayerYaw(reportedState.cameraYaw);
      setHighlightedItemName(reportedState.highlightedItem);
      setNearDoor(reportedState.nearDoor);
    });

    // Apply the player selections from the lobby menu
    manager.applyInitialSettings(menuSetup.startHour, menuSetup.jacketColor, menuSetup.gridSnap);
    managerRef.current = manager;

    // Listen for keys (Spawn Menu [Q], Hidden Admin Combo, Cheat Code "admin")
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'q') {
        setIsSpawnMenuOpen((prev) => !prev);
      }

      // Combo toggle: Ctrl + Shift + A
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsAdminPanelOpen((prev) => !prev);
        return;
      }

      // Combo toggle backup: Ctrl + Alt + A
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsAdminPanelOpen((prev) => !prev);
        return;
      }

      // Sequential cheat code "admin"
      const char = e.key.toLowerCase();
      if (char.length === 1 && /[a-z]/i.test(char)) {
        typedBufferRef.current = (typedBufferRef.current + char).slice(-10);
        if (typedBufferRef.current.endsWith('admin')) {
          setIsAdminPanelOpen((prev) => !prev);
          typedBufferRef.current = ''; // reset
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      // cleanup WebGL to avoid leaking memory context
      if (managerRef.current) {
        managerRef.current.renderer.dispose();
      }
    };
  }, [isGameStarted, menuSetup]);

  // ─── GMOD MENU BUILD ACTIONS ─────────────────────────────────────
  const handleSelectItem = (itemId: string | null) => {
    if (managerRef.current) {
      managerRef.current.activeItemId = itemId;
    }
  };

  const handleSetGridSnapSize = (size: number) => {
    if (managerRef.current) {
      managerRef.current.gridSnapSize = size;
    }
  };

  const handleClearAllProps = () => {
    if (managerRef.current) {
      managerRef.current.builder.placedProps = [];
      managerRef.current.builder.saveToStorage();
      window.location.reload();
    }
  };

  // Lock Door action
  const handleToggleDoorLock = () => {
    if (managerRef.current && nearDoor) {
      managerRef.current.toggleDoorLock(nearDoor.id);
    }
  };

  // Request pointer lock for immersive look
  const handleRequestPointerLock = () => {
    if (managerRef.current) {
      managerRef.current.requestMouseLock();
    }
  };

  const handleToggleMount = (mount: 'hoverboard' | 'broom') => {
    if (managerRef.current) {
      managerRef.current.toggleMount(mount);
    }
  };

  const handleExecuteCombat = (move: 'punch' | 'kick' | 'backflip' | 'sweep' | 'headbutt' | 'grab') => {
    if (managerRef.current) {
      managerRef.current.executeCombatMove(move);
    }
  };

  return (
    <div className={`relative w-screen h-screen bg-slate-950 text-slate-100 ${view === 'sandbox' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
      
      {/* GLOBAL FLOATING CYBER HEADER */}
      {view !== 'sandbox' && (
        <header className="fixed top-4 left-4 right-4 z-40 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl px-6 py-3 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('landing')}>
            <span className="text-xl text-indigo-400 font-bold animate-pulse">⬡</span>
            <span className="font-mono text-xs font-black tracking-widest text-indigo-200">ETHERWORLD</span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <button
              onClick={() => setView('landing')}
              className={`relative overflow-hidden text-[10px] sm:text-xs font-bold font-mono tracking-wider px-4 py-2 rounded-xl border transition-all duration-300 cursor-pointer group ${
                view === 'landing'
                  ? 'bg-indigo-900/40 border-indigo-500/50 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                  : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-indigo-200 hover:border-indigo-500/30 hover:bg-indigo-950/30'
              }`}
            >
              {view === 'landing' && <span className="absolute inset-0 bg-indigo-500/20 animate-pulse blur-md -z-10" />}
              <span className="relative z-10">PORTAIL</span>
            </button>
            <button
              onClick={() => setView('sandbox')}
              className={`relative overflow-hidden text-[10px] sm:text-xs font-bold font-mono tracking-wider px-4 py-2 rounded-xl border transition-all duration-300 cursor-pointer group ${
                view === 'sandbox'
                  ? 'bg-amber-900/40 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-amber-200 hover:border-amber-500/30 hover:bg-amber-950/30'
              }`}
            >
              {view === 'sandbox' && <span className="absolute inset-0 bg-amber-500/20 animate-pulse blur-md -z-10" />}
              <span className="relative z-10">🏗️ RP SANDBOX</span>
            </button>
            <button
              onClick={() => setView('character-creator')}
              className={`relative overflow-hidden text-[10px] sm:text-xs font-bold font-mono tracking-wider px-4 py-2 rounded-xl border transition-all duration-300 cursor-pointer group ${
                view === 'character-creator'
                  ? 'bg-violet-900/40 border-violet-500/50 text-violet-300 shadow-[0_0_15px_rgba(139,92,246,0.4)]'
                  : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-violet-200 hover:border-violet-500/30 hover:bg-violet-950/30'
              }`}
            >
              {view === 'character-creator' && <span className="absolute inset-0 bg-violet-500/20 animate-pulse blur-md -z-10" />}
              <span className="relative z-10">👤 AVATAR</span>
            </button>
            <button
              onClick={() => setView('etherprism')}
              className={`relative overflow-hidden text-[10px] sm:text-xs font-bold font-mono tracking-wider px-4 py-2 rounded-xl border transition-all duration-300 cursor-pointer group ${
                view === 'etherprism'
                  ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                  : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-emerald-200 hover:border-emerald-500/30 hover:bg-emerald-950/30'
              }`}
            >
              {view === 'etherprism' && <span className="absolute inset-0 bg-emerald-500/20 animate-pulse blur-md -z-10" />}
              <span className="relative z-10">🗄️ ETHERPRISM</span>
            </button>
            <button
              onClick={() => setView('troxt-chat')}
              className={`relative overflow-hidden text-[10px] sm:text-xs font-bold font-mono tracking-wider px-4 py-2 rounded-xl border transition-all duration-300 cursor-pointer group ${
                view === 'troxt-chat'
                  ? 'bg-cyan-900/40 border-cyan-500/50 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-cyan-200 hover:border-cyan-500/30 hover:bg-cyan-950/30'
              }`}
            >
              {view === 'troxt-chat' && <span className="absolute inset-0 bg-cyan-500/20 animate-pulse blur-md -z-10" />}
              <span className="relative z-10">🤖 TROXT CHAT</span>
            </button>
          </nav>
        </header>
      )}

      {/* --- SUB-VIEW ROUTING CONDITIONAL RENDER --- */}
      {view === 'landing' && <LandingPage onNavigate={setView} />}
      {view === 'character-creator' && <CharacterCreator onNavigate={setView} />}
      {view === 'etherprism' && <EtherPrismAdmin onNavigate={setView} />}
      {view === 'troxt-chat' && <TroxTChat onNavigate={setView} />}

      {/* --- SANDBOX GAME VIEWS & CANVASES --- */}
      {view === 'sandbox' && (
        <div className="relative w-full h-full overflow-hidden select-none">
          {/* EXIT SANDBOX DOCK BUTTON */}
          <div className="absolute top-5 left-5 z-40 pointer-events-none">
            <button
              onClick={() => {
                setView('landing');
                document.exitPointerLock?.();
              }}
              className="ui-interactive pointer-events-auto bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/30 text-rose-400 hover:text-rose-300 font-extrabold text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 cursor-pointer transition transform hover:scale-105"
            >
              🚪 QUITTER LE BAC À SABLE
            </button>
          </div>

          {/* LOBBY SERVER MAIN MENU */}
          {!isGameStarted && <MainMenu onStartGame={handleStartGame} />}

          {/* THREEJS 3D CANVAS STAGE */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full block outline-none cursor-grab active:cursor-grabbing"
            style={{ display: isGameStarted ? 'block' : 'none' }}
          />

          {/* HEADS-UP DISPLAY OVERLAY */}
          {isGameStarted && (
            <HUD
              playerState={playerState}
              playerPos={playerPos}
              playerYaw={playerYaw}
              highlightedItemName={highlightedItemName}
              nearDoor={nearDoor}
              onToggleDoorLock={handleToggleDoorLock}
              onRequestPointerLock={handleRequestPointerLock}
              onToggleMount={handleToggleMount}
              onExecuteCombat={handleExecuteCombat}
              onPlantWeed={() => managerRef.current?.plantWeedSeed()}
              onBuyWeedSeed={() => managerRef.current?.buyWeedSeed()}
              onBuySeedPack={() => managerRef.current?.buySeedPack()}
              onSellBud={() => managerRef.current?.sellWeedBud()}
              onSellAllBuds={() => managerRef.current?.sellAllWeedBuds()}
              onUnlockFurniture={(itemId, cost) => managerRef.current?.unlockPremiumFurniture(itemId, cost)}
              onSetGangBeastsMode={(active) => managerRef.current?.setGangBeastsMode(active)}
              onSetJointStiffness={(stiffness) => managerRef.current?.setJointStiffness(stiffness)}
              onSetSceneTemplate={(template) => managerRef.current?.setSceneTemplate(template)}
              onJoinFightQueue={(mode) => managerRef.current?.joinFightQueue(mode)}
              onLeaveFightQueue={() => managerRef.current?.leaveFightQueue()}
              onBuyProperty={(houseId) => managerRef.current?.buyProperty(houseId)}
              onRunForgeFactory={() => managerRef.current?.runForgeFactory()}
              onRunEtherWeave={() => managerRef.current?.runEtherWeave()}
              onRunThirdEyeCollisionValidation={() => managerRef.current?.runThirdEyeCollisionValidation()}
              onBuyGarment={(item) => managerRef.current?.buyGarment(item)}
              onCloseGarment={() => {
                if (managerRef.current) {
                  managerRef.current.examinedGarment = null;
                }
              }}
              onBuyCantineItem={(itemId) => managerRef.current?.buyCantineItem(itemId)}
              onCloseCantine={() => {
                if (managerRef.current) {
                  managerRef.current.examinedCantine = false;
                  managerRef.current.onStateUpdatePay();
                }
              }}
              onCloseMarchand={() => {
                if (managerRef.current) {
                  managerRef.current.examinedMarchand = false;
                  managerRef.current.onStateUpdatePay();
                }
              }}
              onExecuteConsoleCommand={(cmd) => managerRef.current ? managerRef.current.executeConsoleCommand(cmd) : { success: false, message: "Serveur non initialisé." }}
            />
          )}

          {/* FLOATING BUILD & SPAWN RADIAL TOGGLE BUTTONS */}
          {isGameStarted && !isSpawnMenuOpen && (
            <div className="absolute top-5 right-5 flex gap-2 pointer-events-none">
              <button
                onClick={() => setIsSpawnMenuOpen(true)}
                className="ui-interactive pointer-events-auto bg-indigo-600/90 hover:bg-indigo-600 border border-indigo-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-1.5 cursor-pointer transition transform hover:scale-105"
              >
                <Hammer className="w-3.5 h-3.5 fill-white" />
                <span>OUVRIR MENU SPAWN [Q]</span>
              </button>
            </div>
          )}

          {/* GMOD INVENTORY SLIDE-IN SIDEBAR */}
          {isGameStarted && (
            <GModMenu
              isOpen={isSpawnMenuOpen}
              onClose={() => setIsSpawnMenuOpen(false)}
              onSelectItem={handleSelectItem}
              selectedItemId={playerState.selectedItemId}
              gridSnapSize={playerState.gridSnapSize}
              onSetGridSnapSize={handleSetGridSnapSize}
              onClearAllProps={handleClearAllProps}
              unlockedFurnitureIds={playerState.unlockedFurnitureIds || []}
            />
          )}

          {/* ADMIN CONTROL PANEL */}
          <AdminPanel
            isOpen={isAdminPanelOpen}
            onClose={() => setIsAdminPanelOpen(false)}
            manager={managerRef.current}
            playerState={playerState}
          />
        </div>
      )}

      {/* Embedded slide-in animation styles directly inside head */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

    </div>
  );
}
