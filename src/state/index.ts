import { StateManager } from './StateManager';
import { combatInitialState, CombatSlice, type CombatState } from './slices/CombatSlice';
// ... autres slices à importer (PropertySlice, AgentSlice, etc.)

export interface GameState {
  combat: CombatState;
  // property: PropertyState;
  // agent: AgentState;
  // inventory: InventoryState;
  // ...
}

const initialState: GameState = {
  combat: combatInitialState,
  // ... autres slices initiaux
};

/** Instance singleton du store */
export const store = new StateManager<GameState>(initialState, 'portneuf-game-v1');

/** Slices publics — API ergonomique */
export const combat = new CombatSlice(store);
// export const property = new PropertySlice(store);
// export const agent = new AgentSlice(store);

// --- Usage dans un système de jeu ---
// combat.queueFight();
// combat.executeMove('backflip');
// store.dispatch({ type: 'PLAYER_DAMAGED', amount: 25, source: 'rival_001' });

// --- Reactivity dans l'UI ---
// store.subscribe(
//   (s) => s.combat.currentRivals,
//   (rivals) => renderRivalsHUD(rivals),
// );