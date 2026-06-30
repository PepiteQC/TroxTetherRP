  import { create } from 'zustand';
  
  // ── Inventory ──────────────────────────────────────────────────────────────
  export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  export type ItemCategory = 'weapon' | 'tool' | 'consumable' | 'keyitem' | 'material' | 'prop';
  
  export interface InventoryItem {
    id: string;
    type: string;
    name: string;
    icon: string;
    quantity: number;
    rarity: ItemRarity;
    category: ItemCategory;
    description: string;
    stackable: boolean;
  }
  
  export type ChatMessage = {
    id: string;
    sender: string;
    text: string;
    type: 'chat' | 'system' | 'admin';
    timestamp: number;
  };
  
  export type DoorState = { isOpen: boolean; isLocked: boolean };
  export type LightState = { isOn: boolean };
  export type PlayerCard = 'resident' | 'staff' | 'admin';
  export type ActiveScene = 'world' | 'room' | 'corridor' | 'hotel';
  
  export interface PlacedObject {
    id: string;
    type: string;
    position: [number, number, number];
    rotation: number;
    scale: number;
    color?: string;
  }
  
  interface GameState {
    buildMode: boolean;
    chatOpen: boolean;
    adminOpen: boolean;
    inventoryOpen: boolean;
    spawnMenuOpen: boolean;
    isGodMode: boolean;
    flyMode: boolean;
    noclipMode: boolean;
    chatMessages: ChatMessage[];
    playerPos: [number, number, number];
    timeOfDay: number;
    weather: string;
    activeScene: ActiveScene;
    fogDensity: number;
  
    selectedModelType: string | null;
    ghostPosition: [number, number, number] | null;
    ghostRotation: number;
    ghostScale: number;
    placedObjects: PlacedObject[];
    selectedPlacedId: string | null;
  
    doors: Record<string, DoorState>;
    lights: Record<string, LightState>;
    playerCard: PlayerCard;
  }
  
  export const useGameState = create<GameState>(() => ({
    buildMode: false,
    chatOpen: false,
    adminOpen: false,
    inventoryOpen: false,
    spawnMenuOpen: false,
    isGodMode: false,
    flyMode: false,
    noclipMode: false,
    chatMessages: [],
    playerPos: [0, 0, 0],
    timeOfDay: 14,
    weather: 'clear',
    activeScene: 'world',
    fogDensity: 80,
  
    selectedModelType: null,
    ghostPosition: null,
    ghostRotation: 0,
    ghostScale: 1,
    placedObjects: [],
    selectedPlacedId: null,
  
    doors: {
      main: { isOpen: false, isLocked: false },
      bathroom: { isOpen: false, isLocked: false },
      room101: { isOpen: false, isLocked: true },
      room102: { isOpen: false, isLocked: true },
    },
    lights: {
      main: { isOn: true },
      bathroom: { isOn: true },
      corridor: { isOn: true },
    },
    playerCard: 'admin',
  }));
  
  export const setGlobal = (partial: Partial<GameState>) => useGameState.setState(partial);
  export const toggleBuild = () => useGameState.setState(s => ({ buildMode: !s.buildMode }));
  export const setChatOpen = (v: boolean) => useGameState.setState({ chatOpen: v });
  export const setAdminOpen = (v: boolean) => useGameState.setState({ adminOpen: v });
  export const toggleGod = () => useGameState.setState(s => ({ isGodMode: !s.isGodMode }));
  export const toggleFly = () => useGameState.setState(s => ({ flyMode: !s.flyMode }));
  export const toggleNoclip = () => useGameState.setState(s => ({ noclipMode: !s.noclipMode }));
  export const setActiveScene = (scene: ActiveScene) => useGameState.setState({ activeScene: scene });
  
  export const addChat = (sender: string, text: string, type: ChatMessage['type'] = 'chat') => {
    useGameState.setState(s => ({
      chatMessages: [
        ...s.chatMessages,
        { id: Math.random().toString(36).slice(2), sender, text, type, timestamp: Date.now() }
      ]
    }));
  };
  
  export const addPlaced = (o: Omit<PlacedObject, 'id'>) => {
    useGameState.setState(s => ({
      placedObjects: [
        ...s.placedObjects,
        { ...o, id: Math.random().toString(36).slice(2) }
      ]
    }));
  };
  
  export const removePlaced = (id: string) => {
    useGameState.setState(s => ({
      placedObjects: s.placedObjects.filter(obj => obj.id !== id),
      selectedPlacedId: s.selectedPlacedId === id ? null : s.selectedPlacedId,
    }));
  };
  
  export const selectPlaced = (id: string | null) => {
    useGameState.setState({ selectedPlacedId: id });
  };
  
  export const selectModel = (id: string | null) => {
    useGameState.setState({ selectedModelType: id });
  };
  
  export const rotateGhost = () => {
    useGameState.setState(s => ({
      ghostRotation: (s.ghostRotation + Math.PI / 4) % (Math.PI * 2)
    }));
  };
  
  export const scaleGhostUp = () => {
    useGameState.setState(s => ({ ghostScale: Math.min(s.ghostScale + 0.25, 10) }));
  };
  
  export const scaleGhostDown = () => {
    useGameState.setState(s => ({ ghostScale: Math.max(s.ghostScale - 0.25, 0.25) }));
  };
  
  export const updatePlaced = (id: string, partial: Partial<PlacedObject>) => {
    useGameState.setState(s => ({
      placedObjects: s.placedObjects.map(obj => obj.id === id ? { ...obj, ...partial } : obj)
    }));
  };
  
  export const clearAllPlaced = () => {
    useGameState.setState({ placedObjects: [], selectedPlacedId: null });
  };
  
  export const requestDoorAccess = (doorId: string) => {
    useGameState.setState(s => {
      const door = s.doors[doorId];
      if (!door) return {};
      const canAccess = s.playerCard === 'admin' || !door.isLocked;
      if (!canAccess) return {};
      return {
        doors: {
          ...s.doors,
          [doorId]: { ...door, isOpen: !door.isOpen }
        }
      };
    });
  };
  
  export const setDoorLocked = (doorId: string, isLocked: boolean) => {
    useGameState.setState(s => ({
      doors: {
        ...s.doors,
        [doorId]: { ...s.doors[doorId], isLocked }
      }
    }));
  };
  
  export const toggleLight = (lightId: string) => {
    useGameState.setState(s => ({
      lights: {
        ...s.lights,
        [lightId]: { isOn: !s.lights[lightId]?.isOn }
      }
    }));
  };
  