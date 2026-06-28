import type { StateManager } from '../StateManager';
import type { CombatMove, FightMode, FightQueueStatus, Rival, WeaponType } from '../types';

export interface CombatState {
  fightQueueStatus: FightQueueStatus;
  fightQueueTimer: number;
  currentRivals: Rival[];
  currentWeapon: WeaponType;
  fightMode: FightMode;
  activeCombatMove: CombatMove | null;
  combatLogs: string[];
}

export const combatInitialState: CombatState = {
  fightQueueStatus: 'idle',
  fightQueueTimer: 0,
  currentRivals: [],
  currentWeapon: 'none',
  fightMode: 'none',
  activeCombatMove: null,
  combatLogs: [],
};

export class CombatSlice {
  constructor(private store: StateManager<{ combat: CombatState }>) {}

  get state(): CombatState {
    return this.store.get().combat;
  }

  /** Actions = seule manière de muter l'état */
  queueFight(): void {
    this.store.updateSlice('combat', { fightQueueStatus: 'queuing' });
  }

  startMatch(rivals: Rival[]): void {
    this.store.updateSlice('combat', {
      fightQueueStatus: 'fighting',
      currentRivals: rivals,
    });
    this.store.dispatch({ type: 'FIGHT_QUEUE_STATUS_CHANGED', status: 'fighting' });
  }

  executeMove(move: CombatMove): void {
    this.store.updateSlice('combat', { activeCombatMove: move });
    this.store.dispatch({ type: 'COMBAT_MOVE_EXECUTED', move });
    // Auto-reset après 300ms (animation)
    setTimeout(() => {
      this.store.updateSlice('combat', { activeCombatMove: null });
    }, 300);
  }

  damageRival(rivalId: string, amount: number): void {
    const rivals = this.state.currentRivals.map((r) =>
      r.id === rivalId
        ? { ...r, health: Math.max(0, r.health - amount), isKO: r.health - amount <= 0 }
        : r,
    );
    this.store.updateSlice('combat', { currentRivals: rivals });
  }

  equipWeapon(weapon: WeaponType): void {
    this.store.updateSlice('combat', { currentWeapon: weapon });
  }

  log(message: string): void {
    const logs = [message, ...this.state.combatLogs].slice(0, 50);
    this.store.updateSlice('combat', { combatLogs: logs });
  }
}