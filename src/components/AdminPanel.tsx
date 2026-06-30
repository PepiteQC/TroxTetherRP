import React, { useState } from 'react';
import { GameManager } from '../game/GameManager';
import { PlayerState } from '../types';
import { GMOD_CATALOG, addCustomCatalogItem } from '../game/GModBuilder';
import { 
  Shield, Sparkles, Coins, Hammer, Key, Sun, Sliders, X, Skull, 
  Flame, Zap, RotateCcw, Compass, CheckCircle, Eye, Settings, 
  Layers, ChevronRight, Activity, Trash2, ShieldCheck, HelpCircle,
  Search, Plus, Wrench, Bot, Sprout
} from 'lucide-react';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  manager: GameManager | null;
  playerState: PlayerState;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  manager,
  playerState,
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'world' | 'user'>('items');

  // Library Browser search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [registryFilter, setRegistryFilter] = useState<'all' | 'gmod' | 'weapons' | 'mounts' | 'cannabis' | 'entities'>('all');

  // Custom item state
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<'furniture' | 'decor' | 'appliances' | 'outdoor'>('furniture');
  const [customColor, setCustomColor] = useState('#6366f1');
  const [customPrice, setCustomPrice] = useState('250');
  const [customWidth, setCustomWidth] = useState('1.5');
  const [customHeight, setCustomHeight] = useState('0.8');
  const [customDepth, setCustomDepth] = useState('0.8');

  if (!isOpen) return null;

  // ─── ACTION HANDLERS ─────────────────────────────────────────────

  // 1. Spawning GMod Catalog Item at player's feet
  const handleSpawnItemAtFeet = (itemId: string) => {
    if (!manager) return;
    const p = manager.playerPos;
    const r = manager.playerGroup.rotation;
    const uuid = 'prop_' + Math.random().toString(36).substr(2, 9);
    
    const propData = {
      uuid,
      itemId,
      position: { x: p.x, y: p.y + 0.05, z: p.z },
      rotation: { x: 0, y: r.y, z: 0 }
    };

    manager.builder.placedProps.push(propData);
    manager.builder.instantiatePropMesh(propData);
    manager.builder.saveToStorage();
    manager.addCombatLog(`🛠️ ADMIN: Objet "${itemId}" généré directement à vos pieds !`);
    manager.onStateUpdatePay();
  };

  // 2. Equip GMod Catalog Item to build cursor
  const handleEquipItem = (itemId: string) => {
    if (!manager) return;
    manager.activeItemId = itemId;
    manager.addCombatLog(`🛠️ ADMIN: Objet "${itemId}" équipé dans l'éditeur de construction.`);
    manager.onStateUpdatePay();
  };

  // 3. Create a totally custom object
  const handleCreateCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const id = 'custom_' + Date.now();
    const w = parseFloat(customWidth) || 1.0;
    const h = parseFloat(customHeight) || 1.0;
    const d = parseFloat(customDepth) || 1.0;
    const price = parseInt(customPrice) || 100;

    const newItem = {
      id,
      name: customName,
      category: customCategory,
      size: [w, h, d] as [number, number, number],
      color: customColor,
      description: `Objet personnalisé d'administration : ${customName}`,
      icon: 'Box',
      price
    };

    addCustomCatalogItem(newItem);
    if (manager) {
      manager.addCombatLog(`🎨 ADMIN: Nouvel objet personnalisé "${customName}" enregistré au catalogue !`);
      manager.onStateUpdatePay();
    }
    
    // Clear form
    setCustomName('');
  };

  // 4. Player modifications
  const handleToggleGodMode = () => {
    if (!manager) return;
    manager.godMode = !manager.godMode;
    if (manager.godMode) {
      manager.playerHealth = 100;
    }
    manager.addCombatLog(`🛡️ ADMIN: God Mode ${manager.godMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
    manager.onStateUpdatePay();
  };

  const handleSetHealth = (val: number) => {
    if (!manager) return;
    manager.playerHealth = val;
    manager.addCombatLog(`❤️ ADMIN: Points de vie fixés à ${val}%`);
    manager.onStateUpdatePay();
  };

  const handleGiveCash = (amt: number) => {
    if (!manager) return;
    manager.cash = Math.max(0, manager.cash + amt);
    manager.saveEconomy();
    manager.addCombatLog(`💵 ADMIN: Trésorerie modifiée de $${amt >= 0 ? '+' : ''}${amt}. Solde: $${manager.cash}`);
    manager.onStateUpdatePay();
  };

  const handleGiveSeeds = (amt: number) => {
    if (!manager) return;
    manager.weedSeeds = Math.max(0, manager.weedSeeds + amt);
    manager.saveEconomy();
    manager.addCombatLog(`🌱 ADMIN: Graines de Cannabis modifiées de ${amt >= 0 ? '+' : ''}${amt}.`);
    manager.onStateUpdatePay();
  };

  const handleGiveBuds = (amt: number) => {
    if (!manager) return;
    manager.weedBuds = Math.max(0, manager.weedBuds + amt);
    manager.saveEconomy();
    manager.addCombatLog(`🌿 ADMIN: Récolte de Cannabis modifiée de ${amt >= 0 ? '+' : ''}${amt}.`);
    manager.onStateUpdatePay();
  };

  // 5. Weapon equip
  const handleEquipWeapon = (weapon: 'none' | 'pipe' | 'bat' | 'bottle' | 'hammer') => {
    if (!manager) return;
    manager.adminEquipWeapon(weapon);
  };

  // 6. Mount select
  const handleSelectMount = (mount: 'hoverboard' | 'broom' | null) => {
    if (!manager) return;
    if (mount === null) {
      manager.activeMount = null;
      manager.addCombatLog(`🚶 ADMIN: Descente de monture forcée.`);
    } else {
      manager.activeMount = mount;
      manager.addCombatLog(`🚀 ADMIN: Monture forcée : ${mount.toUpperCase()}`);
    }
    manager.onStateUpdatePay();
  };

  // 7. World control
  const handleSetTimeOfDay = (hour: number) => {
    if (!manager) return;
    // Set direct time value (0 to 1)
    // we change the time of day factor directly
    manager.executeConsoleCommand(`teleport spawn`); // refresh lighting anchor point
    // Set the sky time factor directly to be precise
    const dummyObj: any = manager;
    dummyObj.skyTimeOfDay = hour / 24;
    manager.addCombatLog(`☀️ ADMIN: Heure solaire réglée à ${hour}h00.`);
    manager.onStateUpdatePay();
  };

  const handleSetGravity = (g: number) => {
    if (!manager) return;
    manager.gravity = g;
    manager.addCombatLog(`🌎 ADMIN: Gravité modifiée à ${g} m/s² (Terre: 19.8, Lune: 3.5, Zéro-G: 0).`);
    manager.onStateUpdatePay();
  };

  const handleSetSpeed = (s: number) => {
    if (!manager) return;
    manager.playerSpeed = s;
    manager.addCombatLog(`⚡ ADMIN: Vitesse d'avatar réglée à ${s} m/s.`);
    manager.onStateUpdatePay();
  };

  const handleSetJointStiffness = (stiffness: 'stiff' | 'relaxed' | 'floppy') => {
    if (!manager) return;
    manager.jointStiffness = stiffness;
    manager.addCombatLog(`🥋 ADMIN: Raideur des ragdolls fixée à [${stiffness.toUpperCase()}].`);
    manager.onStateUpdatePay();
  };

  const handleToggleGangBeasts = () => {
    if (!manager) return;
    manager.gangBeastsMode = !manager.gangBeastsMode;
    manager.addCombatLog(`🤪 ADMIN: Mode physique désarticulé ${manager.gangBeastsMode ? 'ACTIVÉ' : 'DÉSACTIVÉ'}.`);
    manager.onStateUpdatePay();
  };

  const handleResetAlarms = () => {
    if (!manager) return;
    // Clear alarms in useSmartHouse if needed, or trigger global reset
    manager.addCombatLog(`🚨 ADMIN: Alarme générale réinitialisée, verrous sécurisés.`);
    // Trigger terminal command
    manager.executeConsoleCommand(`audit`);
    manager.onStateUpdatePay();
  };

  const handleUnlockAllProperties = () => {
    if (!manager) return;
    manager.boughtPropertyIds = ['villa_nova', 'modern_loft', 'suburban_dream'];
    manager.saveEconomy();
    manager.addCombatLog(`🔑 ADMIN: Trousseau immobilier complet octroyé ! Toutes les clés sont débloquées.`);
    manager.onStateUpdatePay();
  };

  const handleClearAllProps = () => {
    if (!manager) return;
    if (confirm("Confirmez-vous le nettoyage complet de tous les objets posés dans l'Etherworld ? (Action irréversible)")) {
      manager.builder.placedProps = [];
      manager.builder.saveToStorage();
      manager.addCombatLog(`🧹 ADMIN: Table de décors nettoyée. Rechargement...`);
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in text-slate-100">
        
        {/* PANEL HEADER */}
        <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Shield className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wider uppercase font-mono flex items-center gap-1.5">
                PANEL D'ADMINISTRATION <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded font-mono uppercase">Master Console</span>
              </h2>
              <p className="text-[10px] text-slate-400 font-mono font-bold tracking-widest uppercase mt-0.5">
                Accès Super-Utilisateur Étherworld 
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 cursor-pointer transition flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TOP LEVEL CONFIG TABS */}
        <div className="bg-slate-900/40 px-6 py-2 flex gap-2 border-b border-slate-800/80 shrink-0 font-mono text-[11px]">
          <button
            onClick={() => setActiveTab('items')}
            className={`px-4 py-2 rounded-xl border font-bold tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'items'
                ? 'bg-indigo-600 border-indigo-500 text-white font-black'
                : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Items
          </button>
          <button
            onClick={() => setActiveTab('world')}
            className={`px-4 py-2 rounded-xl border font-bold tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'world'
                ? 'bg-indigo-600 border-indigo-500 text-white font-black'
                : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> World Settings
          </button>
          <button
            onClick={() => setActiveTab('user')}
            className={`px-4 py-2 rounded-xl border font-bold tracking-wider transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'user'
                ? 'bg-indigo-600 border-indigo-500 text-white font-black'
                : 'bg-slate-950/40 border-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> User Management
          </button>
        </div>

        {/* MAIN BODY SCROLLABLE LAYOUT */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin flex flex-col gap-6 bg-slate-950/20">
          
          {/* TAB 1: USER MANAGEMENT & BUDGET CONTROLS */}
          {activeTab === 'user' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* GOD MODE & STATS */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-1">
                  <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" /> Mode Dieu & Vitalité
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-black text-slate-400">STATUT:</span>
                    <span className={`text-[10px] font-mono font-black px-1.5 rounded uppercase ${playerState.godMode ? 'bg-emerald-950/60 text-emerald-400' : 'bg-red-950/40 text-red-400'}`}>
                      {playerState.godMode ? '🛡️ ACTIF' : 'NORMAL'}
                    </span>
                  </div>
                </div>

                {/* God mode master toggle */}
                <div className="flex items-center justify-between bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-xs font-bold block text-white">Togglé le God Mode</span>
                    <span className="text-[10px] text-slate-400 font-medium">Rend invulnérable à toutes les attaques et collisions</span>
                  </div>
                  <button
                    onClick={handleToggleGodMode}
                    className={`px-4 py-2 font-mono text-[10px] font-black rounded-xl border transition cursor-pointer uppercase tracking-wider ${
                      playerState.godMode
                        ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white shadow-lg'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    {playerState.godMode ? '🟢 DÉSACTIVER' : '🔴 ACTIVER'}
                  </button>
                </div>

                {/* Direct health adjustment slider */}
                <div className="flex flex-col gap-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60 font-mono text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300">Ajuster la Santé</span>
                    <span className="text-indigo-300 font-extrabold">{playerState.health}% HP</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={playerState.health || 0}
                    onChange={(e) => handleSetHealth(parseInt(e.target.value))}
                    disabled={playerState.godMode}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-50"
                  />
                  <div className="grid grid-cols-4 gap-1.5 mt-1 text-[10px]">
                    {[0, 10, 50, 100].map((hpVal) => (
                      <button
                        key={hpVal}
                        onClick={() => handleSetHealth(hpVal)}
                        disabled={playerState.godMode}
                        className="py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition text-center cursor-pointer disabled:opacity-50"
                      >
                        {hpVal === 0 ? '💀 Kill' : `${hpVal}%`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* BUDGET & INVENTORY GRANTS */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4">
                <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-indigo-300 border-b border-slate-800 pb-2 mb-1 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-indigo-400" /> Trésorerie & Cannabis Inventory
                </h3>

                {/* Cash Grants */}
                <div className="flex flex-col gap-1.5 font-mono text-xs">
                  <span className="text-slate-300">Solde Cash Actuel : <span className="text-emerald-400 font-extrabold">${playerState.cash}</span></span>
                  <div className="grid grid-cols-3 gap-1.5 mt-1">
                    {[
                      { label: '+$1,000', amt: 1000 },
                      { label: '+$10,000', amt: 10000 },
                      { label: '-$1,000', amt: -1000 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        onClick={() => handleGiveCash(btn.amt)}
                        className="py-2 px-1 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition font-bold text-center text-[10px] cursor-pointer"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cannabis Seed/Bud inventory adjustments */}
                <div className="grid grid-cols-2 gap-3 mt-1 font-mono text-xs">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-slate-300">Graines : <span className="text-amber-500 font-extrabold">{playerState.weedSeeds}</span></span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleGiveSeeds(5)}
                        className="flex-1 py-1.5 rounded bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-[10px] font-bold transition cursor-pointer"
                      >
                        +5 Seed
                      </button>
                      <button
                        onClick={() => handleGiveSeeds(25)}
                        className="flex-1 py-1.5 rounded bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-[10px] font-bold transition cursor-pointer"
                      >
                        +25
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-slate-300">Têtes : <span className="text-green-500 font-extrabold">{playerState.weedBuds}</span></span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleGiveBuds(5)}
                        className="flex-1 py-1.5 rounded bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-[10px] font-bold transition cursor-pointer"
                      >
                        +5 Bud
                      </button>
                      <button
                        onClick={() => handleGiveBuds(25)}
                        className="flex-1 py-1.5 rounded bg-slate-950/60 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-[10px] font-bold transition cursor-pointer"
                      >
                        +25
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* WEAPONS & COMBAT EQUIPMENT */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4">
                <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-indigo-300 border-b border-slate-800 pb-2 mb-1 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-indigo-400" /> Arsenal & Armement Tactique
                </h3>

                <div className="flex flex-col gap-1.5 font-mono text-[11px]">
                  <span className="text-slate-300">Arme Active : <span className="text-indigo-400 font-black uppercase">{playerState.currentWeapon || 'none'}</span></span>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {[
                      { id: 'none', label: '👊 Mains nues' },
                      { id: 'pipe', label: '🔧 Tuyau de Plomb' },
                      { id: 'bat', label: '🏏 Batte Cloutée' },
                      { id: 'bottle', label: '🍾 Bouteille' },
                      { id: 'hammer', label: '🔨 Masse Chantier' },
                    ].map((wpn) => (
                      <button
                        key={wpn.id}
                        onClick={() => handleEquipWeapon(wpn.id as any)}
                        className={`py-2 px-3 rounded-xl border text-left transition text-[10px] font-bold cursor-pointer flex items-center justify-between ${
                          (playerState.currentWeapon || 'none') === wpn.id
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <span>{wpn.label}</span>
                        {(playerState.currentWeapon || 'none') === wpn.id && <span className="text-[9px] text-white">●</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* MOUNTS & VEHICLES */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4">
                <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-indigo-300 border-b border-slate-800 pb-2 mb-1 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-400" /> Montures & Véhicules Véloces
                </h3>

                <div className="flex flex-col gap-1.5 font-mono text-[11px]">
                  <span className="text-slate-300">Monture Active : <span className="text-indigo-400 font-black uppercase">{playerState.activeMount || '🚶 À pied'}</span></span>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {[
                      { id: null, label: '🚶 Pied' },
                      { id: 'hoverboard', label: '🛹 Hoverboard' },
                      { id: 'broom', label: '🧹 Balai' },
                    ].map((mnt) => (
                      <button
                        key={mnt.id ?? 'null'}
                        onClick={() => handleSelectMount(mnt.id as any)}
                        className={`py-2 px-2.5 rounded-xl border text-center transition text-[10px] font-bold cursor-pointer ${
                          playerState.activeMount === mnt.id
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {mnt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug mt-2">
                    💡 **Balai** permet de voler en 3D en maintenant **ESPACE** pour s'élever ou **CTRL / C** pour descendre.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: REGISTRY LIBRARY BROWSER & CUSTOM CREATION */}
          {activeTab === 'items' && (() => {
            // Build dynamic entries for our Registry Library Browser
            const customGmodItems = GMOD_CATALOG.map(item => ({
              id: item.id,
              name: item.name,
              registry: 'gmod' as const,
              subtext: `Prop GMod • ${item.category.toUpperCase()} • ${item.size.join('x')}m`,
              description: item.description || 'Objet de construction physique.',
              color: item.color,
              price: item.price,
              actions: [
                {
                  label: 'Spawn on Cursor',
                  icon: Hammer,
                  title: 'Équiper et fermer le panel pour placer l\'objet avec le curseur',
                  primary: true,
                  handler: () => {
                    handleEquipItem(item.id);
                    onClose();
                  }
                },
                {
                  label: 'Spawn at Feet',
                  icon: Sparkles,
                  title: 'Générer l\'objet directement à vos pieds',
                  primary: false,
                  handler: () => handleSpawnItemAtFeet(item.id)
                }
              ]
            }));

            const weaponItems = [
              { id: 'pipe', name: 'Tuyau de Plomb', subtext: 'Arme de corps-à-corps rapide • Dégâts Modérés', description: 'Idéal pour le combat de rue rapproché. Rapide et efficace.', color: '#475569' },
              { id: 'bat', name: 'Batte Cloutée', subtext: 'Arme lourde improvisée • Dégâts Élevés', description: 'Batte de baseball entourée de barbelés métalliques.', color: '#b45309' },
              { id: 'bottle', name: 'Bouteille Cassée', subtext: 'Arme de fortune tranchante • Vitesse Max', description: 'Bouteille en verre brisée, rapide et imprévisible.', color: '#0f766e' },
              { id: 'hammer', name: 'Masse de Chantier', subtext: 'Arme Titan • Étourdissement Critique', description: 'Une masse de démolition extrêmement lourde avec un knockback massif.', color: '#312e81' },
            ].map(wpn => ({
              id: wpn.id,
              name: wpn.name,
              registry: 'weapons' as const,
              subtext: wpn.subtext,
              description: wpn.description,
              color: wpn.color,
              price: 0,
              actions: [
                {
                  label: 'Equip Weapon',
                  icon: Flame,
                  title: 'Équiper l\'arme et fermer le panel',
                  primary: true,
                  handler: () => {
                    handleEquipWeapon(wpn.id as any);
                    onClose();
                  }
                }
              ]
            }));

            const vehicleItems = [
              { id: 'hoverboard', name: 'Hoverboard Éther-Core', subtext: 'Véhicule de glisse urbaine • Vitesse x2', description: 'Glissez sur les routes avec style et fluidité.', color: '#6366f1' },
              { id: 'broom', name: 'Balai Volant Nimbus', subtext: 'Monture 3D • Vol Libre (Espace/Ctrl)', description: 'Évadez-vous dans le ciel de l\'Etherworld en contrôlant l\'altitude.', color: '#854d0e' },
            ].map(veh => ({
              id: veh.id,
              name: veh.name,
              registry: 'mounts' as const,
              subtext: veh.subtext,
              description: veh.description,
              color: veh.color,
              price: 0,
              actions: [
                {
                  label: 'Force Mount',
                  icon: Compass,
                  title: 'Monter à bord immédiatement et fermer le panel',
                  primary: true,
                  handler: () => {
                    handleSelectMount(veh.id as any);
                    onClose();
                  }
                }
              ]
            }));

            const cannabisItems = [
              {
                id: 'seeds_pack',
                name: 'Paquet de 10 Graines',
                registry: 'cannabis' as const,
                subtext: 'Botanique • Intrant de Culture',
                description: 'Graines de cannabis de haute qualité prêtes à être plantées en extérieur.',
                color: '#d97706',
                price: 0,
                actions: [
                  {
                    label: 'Give +10 Seeds',
                    icon: Sprout,
                    title: 'Ajoute 10 graines de cannabis à votre inventaire',
                    primary: true,
                    handler: () => {
                      handleGiveSeeds(10);
                    }
                  }
                ]
              },
              {
                id: 'buds_pack',
                name: 'Sac de 10 Récoltes (Têtes)',
                registry: 'cannabis' as const,
                subtext: 'Botanique • Produit Commercialisable',
                description: 'Têtes séchées prêtes à la revente au Dispensaire de weed pour maximiser votre cash.',
                color: '#15803d',
                price: 0,
                actions: [
                  {
                    label: 'Give +10 Buds',
                    icon: Coins,
                    title: 'Ajoute 10 récoltes de cannabis à votre inventaire',
                    primary: true,
                    handler: () => {
                      handleGiveBuds(10);
                    }
                  }
                ]
              },
              {
                id: 'weed_seedling',
                name: 'Jeune Pousse de Cannabis',
                registry: 'cannabis' as const,
                subtext: 'Culture Vivante • Stade Initial (10% Croissance)',
                description: 'Génère une jeune plante de cannabis fraîchement plantée à vos pieds.',
                color: '#a3e635',
                price: 0,
                actions: [
                  {
                    label: 'Plant Seedling',
                    icon: Plus,
                    title: 'Faire pousser une jeune plante à vos pieds',
                    primary: true,
                    handler: () => {
                      if (manager) {
                        manager.adminSpawnWeedPlantAtFeet('seedling');
                      }
                    }
                  }
                ]
              },
              {
                id: 'weed_medium',
                name: 'Canopée Végétative',
                registry: 'cannabis' as const,
                subtext: 'Culture Vivante • Croissance Avancée (50%)',
                description: 'Génère une plante de cannabis à mi-chemin de sa floraison.',
                color: '#22c55e',
                price: 0,
                actions: [
                  {
                    label: 'Plant Medium',
                    icon: Plus,
                    title: 'Faire pousser une plante en floraison moyenne à vos pieds',
                    primary: true,
                    handler: () => {
                      if (manager) {
                        manager.adminSpawnWeedPlantAtFeet('medium');
                      }
                    }
                  }
                ]
              },
              {
                id: 'weed_mature',
                name: 'Buisson de Cannabis Mature',
                registry: 'cannabis' as const,
                subtext: 'Culture Vivante • Prête à Récolter (100% - Prête)',
                description: 'Génère un grand buisson prêt à la récolte immédiate avec [E].',
                color: '#166534',
                price: 0,
                actions: [
                  {
                    label: 'Plant Mature',
                    icon: Plus,
                    title: 'Faire pousser un buisson mûr prêt à récolter à vos pieds',
                    primary: true,
                    handler: () => {
                      if (manager) {
                        manager.adminSpawnWeedPlantAtFeet('mature');
                      }
                    }
                  }
                ]
              }
            ];

            const entityItems = [
              {
                id: 'dummy_wood',
                name: 'Mannequin d\'Entraînement Bois',
                registry: 'entities' as const,
                subtext: 'Cible d\'Entraînement • Standard (150 PV)',
                description: 'Idéal pour peaufiner vos coups de pied d\'arts martiaux. Pivot rotatif réversible.',
                color: '#b45309',
                price: 0,
                actions: [
                  {
                    label: 'Spawn Dummy',
                    icon: Bot,
                    title: 'Fait apparaître un mannequin de bois à vos pieds',
                    primary: true,
                    handler: () => {
                      if (manager) {
                        manager.adminSpawnDummyAtFeet('wooden');
                      }
                    }
                  }
                ]
              },
              {
                id: 'dummy_iron',
                name: 'Mannequin d\'Acier Blindé',
                registry: 'entities' as const,
                subtext: 'Cible d\'Entraînement • Blindé (500 PV)',
                description: 'Ultra résistant. Encaisse des centaines de coups, idéal pour les armes d\'impact lourdes.',
                color: '#64748b',
                price: 0,
                actions: [
                  {
                    label: 'Spawn Heavy Dummy',
                    icon: Bot,
                    title: 'Fait apparaître un mannequin d\'acier à vos pieds',
                    primary: true,
                    handler: () => {
                      if (manager) {
                        manager.adminSpawnDummyAtFeet('iron');
                      }
                    }
                  }
                ]
              },
              {
                id: 'dummy_punchbag',
                name: 'Sac de Frappe Suspendu',
                registry: 'entities' as const,
                subtext: 'Cible Suspendue • Flexible (150 PV)',
                description: 'Sac de boxe suspendu sur portique en métal, bouge selon la physique des impacts.',
                color: '#ef4444',
                price: 0,
                actions: [
                  {
                    label: 'Spawn Punchbag',
                    icon: Bot,
                    title: 'Fait apparaître un sac de frappe suspendu à vos pieds',
                    primary: true,
                    handler: () => {
                      if (manager) {
                        manager.adminSpawnDummyAtFeet('punchbag');
                      }
                    }
                  }
                ]
              },
              {
                id: 'entity_rival',
                name: 'AI Clone Combat Rival (Fight Club)',
                registry: 'entities' as const,
                subtext: 'Rival Intelligent • Hostile (150 PV)',
                description: 'Clone de combattant de la cage. Engage le combat immédiatement avec des arts martiaux physiques !',
                color: '#7f1d1d',
                price: 0,
                actions: [
                  {
                    label: 'Spawn Hostile Clone',
                    icon: Skull,
                    title: 'Fait apparaître un combattant hostile actif à vos pieds',
                    primary: true,
                    handler: () => {
                      if (manager) {
                        manager.adminSpawnRivalAtFeet();
                      }
                    }
                  }
                ]
              }
            ];

            // Combine lists
            const allRegistryItems = [
              ...customGmodItems,
              ...weaponItems,
              ...vehicleItems,
              ...cannabisItems,
              ...entityItems
            ];

            // Filter items based on query and registry filter type
            const filteredRegistryItems = allRegistryItems.filter(item => {
              const matchesRegistry = registryFilter === 'all' || item.registry === registryFilter;
              const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                    item.subtext.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    item.description.toLowerCase().includes(searchQuery.toLowerCase());
              return matchesRegistry && matchesSearch;
            });

            return (
              <div className="flex flex-col gap-6">
                
                {/* MASTER LIBRARY BROWSER GRID & FILTER CONTROLS */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4">
                  
                  {/* Search and Registry Categories */}
                  <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between border-b border-slate-800/80 pb-4">
                    <div>
                      <h3 className="font-bold text-xs font-mono uppercase tracking-wider text-indigo-300 flex items-center gap-1.5 mb-1">
                        <Search className="w-3.5 h-3.5 text-indigo-400" /> EXPLORATEUR DE REGISTRE ({filteredRegistryItems.length} Éléments)
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Recherchez, équipez ou générez n'importe quel prop, arme, monture ou entité de combat.
                      </p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative max-w-xs w-full">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Filtrer par nom, description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-slate-950 border border-slate-800/80 text-white rounded-xl pl-9 pr-3 py-2 text-xs w-full focus:outline-none focus:border-indigo-500 transition font-mono"
                      />
                      {searchQuery && (
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-2 text-slate-400 hover:text-white font-mono text-xs"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Subcategory selectors */}
                  <div className="flex flex-wrap gap-1.5 font-mono text-[10px] bg-slate-950/40 p-1.5 rounded-xl border border-slate-800/40">
                    {[
                      { id: 'all', label: '🗂️ TOUT LE REGISTRE' },
                      { id: 'gmod', label: '📦 GMOD PROPS' },
                      { id: 'weapons', label: '⚔️ WEAPONS' },
                      { id: 'mounts', label: '🚀 MOUNTS' },
                      { id: 'cannabis', label: '🌱 BOTANIQUE' },
                      { id: 'entities', label: '🤖 ENTITIES / NPCS' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setRegistryFilter(tab.id as any)}
                        className={`px-3 py-1.5 rounded-lg border transition cursor-pointer font-bold ${
                          registryFilter === tab.id
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md font-black'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* GRID LISTING OF ASSETS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[38vh] overflow-y-auto pr-1 scrollbar-thin">
                    {filteredRegistryItems.length === 0 ? (
                      <div className="col-span-1 md:col-span-2 py-10 flex flex-col items-center justify-center text-center bg-slate-950/40 border border-slate-800/60 rounded-xl font-mono">
                        <HelpCircle className="w-8 h-8 text-slate-600 animate-bounce mb-2" />
                        <span className="text-slate-400 text-xs font-bold">AUCUN ÉLÉMENT NE CORRESPOND À VOTRE RECHERCHE</span>
                        <span className="text-slate-600 text-[10px] uppercase mt-1">Vérifiez l'orthographe ou changez de filtre de registre</span>
                      </div>
                    ) : (
                      filteredRegistryItems.map((item) => (
                        <div 
                          key={item.id + '_' + item.registry}
                          className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between gap-3 hover:bg-slate-900/60 hover:border-slate-700 transition group"
                        >
                          <div className="flex items-start gap-3">
                            <div 
                              className="w-10 h-10 rounded-lg shrink-0 border border-slate-700/60 shadow-inner flex items-center justify-center font-bold text-white uppercase text-xs"
                              style={{ backgroundColor: item.color }}
                            >
                              {item.registry === 'weapons' ? '⚔️' : item.registry === 'mounts' ? '🚀' : item.registry === 'cannabis' ? '🌱' : item.registry === 'entities' ? '🤖' : '📦'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start gap-2">
                                <h4 className="text-white font-extrabold text-xs leading-tight truncate group-hover:text-indigo-300 transition">
                                  {item.name}
                                </h4>
                                {item.price > 0 && (
                                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                    ${item.price}
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] font-mono font-bold text-slate-400 tracking-wider block uppercase mt-0.5">
                                {item.subtext}
                              </span>
                              <p className="text-[10px] text-slate-500 font-sans leading-relaxed mt-1 line-clamp-2 font-medium">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          {/* Action buttons list */}
                          <div className="flex flex-wrap gap-1.5 justify-end mt-1 border-t border-slate-900 pt-2 font-mono">
                            {item.actions.map((act, index) => {
                              const IconC = act.icon;
                              return (
                                <button
                                  key={index}
                                  onClick={act.handler}
                                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold cursor-pointer transition flex items-center gap-1.5 uppercase ${
                                    act.primary
                                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                                      : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300'
                                  }`}
                                  title={act.title}
                                >
                                  <IconC className="w-3 h-3" /> {act.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* CREATE COMPLETELY CUSTOM ITEM (FORGE) */}
                <form 
                  onSubmit={handleCreateCustomItem}
                  className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4 font-mono text-xs"
                >
                  <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-300 border-b border-slate-800 pb-2 mb-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Forger un Objet GMod Personnalisé de toutes pièces
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Name field */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 font-bold uppercase text-[10px]">Nom de l'Objet</label>
                      <input
                        type="text"
                        placeholder="Super Trône en Marbre"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    {/* Category */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 font-bold uppercase text-[10px]">Catégorie</label>
                      <select
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value as any)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 transition"
                      >
                        <option value="furniture">🛋️ Salon / Intérieur</option>
                        <option value="decor">🪴 Décoration / Lumière</option>
                        <option value="appliances">📺 Électroménager / Tech</option>
                        <option value="outdoor">🏡 Aménagement Extérieur</option>
                      </select>
                    </div>

                    {/* Hex Color */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 font-bold uppercase text-[10px]">Couleur (Hex ou Palette)</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl h-9 w-12 cursor-pointer p-1"
                        />
                        <input
                          type="text"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          placeholder="#ffffff"
                          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white flex-1 outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-1">
                    {/* Width */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 font-bold uppercase text-[10px]">Largeur (mètres)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={customWidth}
                        onChange={(e) => setCustomWidth(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    {/* Height */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 font-bold uppercase text-[10px]">Hauteur (mètres)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={customHeight}
                        onChange={(e) => setCustomHeight(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    {/* Depth */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 font-bold uppercase text-[10px]">Profondeur (mètres)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={customDepth}
                        onChange={(e) => setCustomDepth(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    {/* Price */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-slate-400 font-bold uppercase text-[10px]">Prix Sandbox ($)</label>
                      <input
                        type="number"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!customName.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 mt-2 shadow-lg"
                  >
                    <Sparkles className="w-4.5 h-4.5 text-white" />
                    <span>AJOUTER L'OBJET AU CATALOGUE SPONSORISÉ</span>
                  </button>
                </form>

              </div>
            );
          })()}

          {/* TAB 3: WORLD STATE MANAGEMENT */}
          {activeTab === 'world' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* ENVIRONMENT STATE SLIDERS */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4 font-mono text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-300 border-b border-slate-800 pb-2 mb-1 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-indigo-400" /> Environnement & Paramètres Célestes
                </h3>

                {/* Time slider */}
                <div className="flex flex-col gap-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
                  <span className="text-slate-300">Régler l'heure solaire</span>
                  <div className="grid grid-cols-4 gap-1 text-[10px] mt-1">
                    {[
                      { l: '🌅 Matin', h: 8 },
                      { l: '☀️ Midi', h: 12 },
                      { l: '🌆 Crépuscule', h: 18 },
                      { l: '🌑 Nuit', h: 0 },
                    ].map((item) => (
                      <button
                        key={item.h}
                        onClick={() => handleSetTimeOfDay(item.h)}
                        className="py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition text-center cursor-pointer font-bold"
                      >
                        {item.l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gravity modifier */}
                <div className="flex flex-col gap-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300">Gravité Physique</span>
                    <span className="text-indigo-300 font-extrabold">{playerState.gridSnapSize === 0 ? 'Normal' : `${manager?.gravity} m/s²`}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[10px] mt-1">
                    {[
                      { l: 'Zero-G', g: 0 },
                      { l: 'Lune', g: 3.5 },
                      { l: 'Standard', g: 19.8 },
                      { l: 'Lourde', g: 30 },
                    ].map((item) => (
                      <button
                        key={item.l}
                        onClick={() => handleSetGravity(item.g)}
                        className={`py-1.5 rounded border transition text-center cursor-pointer font-bold ${
                          manager?.gravity === item.g
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400'
                        }`}
                      >
                        {item.l} ({item.g})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* PHYSICS STABILIZERS & RAGDOLLS */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-4 font-mono text-xs">
                <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-300 border-b border-slate-800 pb-2 mb-1 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" /> Moteur Ragdoll & Physique Ragdoll
                </h3>

                {/* Walk speed adjustment */}
                <div className="flex flex-col gap-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-300">Vitesse de Marche</span>
                    <span className="text-indigo-300 font-extrabold">{manager?.playerSpeed} m/s</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="25"
                    step="1"
                    value={manager?.playerSpeed || 5}
                    onChange={(e) => handleSetSpeed(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>2 m/s (Tortue)</span>
                    <button 
                      onClick={() => handleSetSpeed(5.0)}
                      className="text-indigo-400 hover:underline cursor-pointer font-bold"
                    >
                      Réinitialiser (5.0)
                    </button>
                    <span>25 m/s (Flash)</span>
                  </div>
                </div>

                {/* Ragdoll settings stiffness */}
                <div className="flex flex-col gap-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
                  <span className="text-slate-300">Rigidité des Ragdolls (Gang Beasts)</span>
                  <div className="grid grid-cols-3 gap-1.5 text-[10px] mt-1">
                    {[
                      { id: 'stiff', label: '🦾 Rigide' },
                      { id: 'relaxed', label: '🧘 Relaxé' },
                      { id: 'floppy', label: '🤪 Guimauve' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSetJointStiffness(item.id as any)}
                        className={`py-1.5 rounded border transition text-center cursor-pointer font-bold ${
                          playerState.jointStiffness === item.id
                            ? 'bg-indigo-600 border-indigo-500 text-white font-extrabold'
                            : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gang Beasts active status toggle */}
                <div className="flex items-center justify-between bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-xs font-bold block text-white">Ragdoll Complet (Gang Beasts)</span>
                    <span className="text-[10px] text-slate-400 font-medium">Force les articulations en marionnette active</span>
                  </div>
                  <button
                    onClick={handleToggleGangBeasts}
                    className={`px-3 py-1.5 font-mono text-[10px] font-black rounded-xl border transition cursor-pointer uppercase tracking-wider ${
                      playerState.gangBeastsMode
                        ? 'bg-indigo-600 border-indigo-400 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400'
                    }`}
                  >
                    {playerState.gangBeastsMode ? '🟢 ACTIVE' : '🔴 DESACTIVE'}
                  </button>
                </div>
              </div>

              {/* WORLD INFRASTRUCTURE & REFRESHERS */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3 font-mono text-xs md:col-span-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-300 border-b border-slate-800 pb-2 mb-1 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-indigo-400" /> Infrastructure, Propriétés & Sécurité
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* Unlock immo keys keyring */}
                  <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between gap-3">
                    <div>
                      <span className="font-bold text-xs block text-white">Trousseau Immobilier Complet</span>
                      <p className="text-[10px] text-slate-400 leading-snug mt-1">Débloque toutes les propriétés immobilières (Villa Celeste, Loft Moderne, Suburban).</p>
                    </div>
                    <button
                      onClick={handleUnlockAllProperties}
                      className="w-full bg-slate-900 hover:bg-slate-800 hover:border-indigo-500/40 text-indigo-300 font-bold py-2 rounded-xl border border-slate-800 transition cursor-pointer text-center text-[10px] uppercase"
                    >
                      🎁 Débloquer clés
                    </button>
                  </div>

                  {/* Reset smart alarms */}
                  <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between gap-3">
                    <div>
                      <span className="font-bold text-xs block text-white">Audit & Réinit Alarmes</span>
                      <p className="text-[10px] text-slate-400 leading-snug mt-1">Déclenche un audit de conformité et réinitialise les systèmes d'alarme antivol.</p>
                    </div>
                    <button
                      onClick={handleResetAlarms}
                      className="w-full bg-slate-900 hover:bg-slate-800 hover:border-indigo-500/40 text-indigo-300 font-bold py-2 rounded-xl border border-slate-800 transition cursor-pointer text-center text-[10px] uppercase"
                    >
                      🚨 Reset Alarme
                    </button>
                  </div>

                  {/* Reset posé props decors in world */}
                  <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between gap-3">
                    <div>
                      <span className="font-bold text-xs block text-white text-rose-400">Nettoyage GMod Total</span>
                      <p className="text-[10px] text-slate-400 leading-snug mt-1">Supprime instantanément tous les décors et meubles posés par les joueurs dans la ville.</p>
                    </div>
                    <button
                      onClick={handleClearAllProps}
                      className="w-full bg-rose-950/40 hover:bg-rose-900 text-rose-200 font-bold py-2 rounded-xl border border-rose-900/60 hover:border-rose-500 transition cursor-pointer text-center text-[10px] uppercase"
                    >
                      🗑️ Vider le monde
                    </button>
                  </div>

                </div>
              </div>

            </div>
          )}

        </div>

        {/* BOTTOM Master console activity logs */}
        <div className="bg-slate-950 px-6 py-3.5 border-t border-slate-800 flex flex-col sm:flex-row gap-2 items-center justify-between shrink-0 font-mono text-[10px]">
          <div className="flex items-center gap-2 text-slate-400">
            <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>ACTIVITÉ DU FLUX :</span>
            <span className="text-slate-300 font-black truncate max-w-sm sm:max-w-md">
              {playerState.activeAgentAction || 'Standby'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[9px] font-bold text-slate-500 uppercase">
            <span>Score cognitif: <span className="text-indigo-400">{playerState.agentCognitiveScore}%</span></span>
            <span>Risque: <span className={`px-1 rounded ${playerState.riskRating === 'GREEN' ? 'text-emerald-400 bg-emerald-950/60' : 'text-amber-400 bg-amber-950/60'}`}>{playerState.riskRating}</span></span>
          </div>
        </div>

      </div>
    </div>
  );
};
