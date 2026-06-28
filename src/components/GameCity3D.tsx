import React, { useEffect, useRef, useState, useMemo } from 'react';
import { GameManager } from '../game/GameManager';
import { PlayerState } from '../types';
import { MainMenu } from './MainMenu';
import { GModMenu } from './GModMenu';
import { HUD } from './HUD';
import { Package } from 'lucide-react';

export function GameCity3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const managerRef = useRef<GameManager | null>(null);

  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [isSpawnMenuOpen, setIsSpawnMenuOpen] = useState<boolean>(false);

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
  });

  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0, z: 15 });
  const [playerYaw, setPlayerYaw] = useState(0);
  const [highlightedItemName, setHighlightedItemName] = useState<string | null>(null);
  const [nearDoor, setNearDoor] = useState<any | null>(null);

  const [menuSetup, setMenuSetup] = useState<{ startHour: number; jacketColor: number; gridSnap: number; } | null>(null);

  const handleStartGame = (setup: { startHour: number; jacketColor: number; gridSnap: number; }) => {
    setMenuSetup(setup);
    setIsGameStarted(true);
  };

  useEffect(() => {
    if (!isGameStarted || !canvasRef.current || !menuSetup) return;

    const manager = new GameManager(canvasRef.current, (reportedState) => {
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
        weedSeeds: reportedState.weedSeeds,
        weedBuds: reportedState.weedBuds,
        gangBeastsMode: reportedState.gangBeastsMode,
        jointStiffness: reportedState.jointStiffness,
        unlockedFurnitureIds: reportedState.unlockedFurnitureIds,
        fightQueueStatus: reportedState.fightQueueStatus,
        fightQueueTimer: reportedState.fightQueueTimer,
        currentWeapon: reportedState.currentWeapon,
        fightMode: reportedState.fightMode,
        currentRivals: reportedState.currentRivals
      });

      setPlayerPos(reportedState.playerPos);
      setPlayerYaw(reportedState.cameraYaw);
      setHighlightedItemName(reportedState.highlightedItem);
      setNearDoor(reportedState.nearDoor);
    });

    manager.applyInitialSettings(menuSetup.startHour, menuSetup.jacketColor, menuSetup.gridSnap);
    managerRef.current = manager;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'q') setIsSpawnMenuOpen(p => !p);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (managerRef.current) managerRef.current.renderer.dispose();
    };
  }, [isGameStarted, menuSetup]);

  const handleSelectItem = (itemId: string | null) => { if (managerRef.current) managerRef.current.activeItemId = itemId; };
  const handleSetGridSnapSize = (size: number) => { if (managerRef.current) managerRef.current.gridSnapSize = size; };
  const handleClearAllProps = () => {
    if (managerRef.current) {
      managerRef.current.builder.placedProps = [];
      managerRef.current.builder.saveToStorage();
      window.location.reload();
    }
  };

  const handleToggleDoorLock = () => { if (managerRef.current && nearDoor) managerRef.current.toggleDoorLock(nearDoor.id); };
  const handleRequestPointerLock = () => { if (managerRef.current) managerRef.current.requestMouseLock(); };
  const handleToggleMount = (mount: 'hoverboard' | 'broom') => { if (managerRef.current) managerRef.current.toggleMount(mount); };
  const handleExecuteCombat = (move: 'punch' | 'kick' | 'backflip' | 'sweep' | 'headbutt' | 'grab') => { if (managerRef.current) managerRef.current.executeCombatMove(move); };

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#05070d] font-sans">
      {!isGameStarted && <MainMenu onStartGame={handleStartGame} />}

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block outline-none cursor-crosshair active:cursor-grabbing"
        style={{ display: isGameStarted ? 'block' : 'none' }}
      />

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
        />
      )}

      {/* Bouton Builder — Discret, style Nova-Life */}
      {isGameStarted && (
        <div className="absolute top-8 left-8 z-50 pointer-events-none">
          <button
            onClick={() => setIsSpawnMenuOpen(p => !p)}
            className={`ui-interactive pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl font-black text-[12px] uppercase tracking-[0.1em] transition-all cursor-pointer border shadow-2xl backdrop-blur-xl ${
              isSpawnMenuOpen
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-600/40'
                : 'bg-black/40 text-white/60 border-white/5 hover:border-indigo-500/50 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            {isSpawnMenuOpen ? 'Quitter Builder' : 'Ouvrir Builder'}
          </button>
        </div>
      )}

      {isGameStarted && (
        <GModMenu
          isOpen={isSpawnMenuOpen}
          onClose={() => setIsSpawnMenuOpen(false)}
          onSelectItem={handleSelectItem}
          selectedItemId={playerState.selectedItemId}
          gridSnapSize={playerState.gridSnapSize}
          onSetGridSnapSize={handleSetGridSnapSize}
          onClearAllProps={handleClearAllProps}
          unlockedFurnitureIds={playerState.unlockedFurnitureIds}
        />
      )}
    </div>
  );
}
