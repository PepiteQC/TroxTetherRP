import type { GameEvent } from './types';

type Listener<T> = (state: T) => void;
type Selector<T, R> = (state: T) => R;

/**
 * Store réactif léger (~80 lignes) inspiré de Zustand.
 * - Zéro dépendance
 * - Type-safe
 * - Persistence automatique (debounced)
 * - Event bus pour communication inter-systèmes
 */
export class StateManager<T extends object> {
  private state: T;
  private listeners = new Set<Listener<T>>();
  private eventHandlers = new Map<string, Set<(payload: unknown) => void>>();
  private persistenceKey: string;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(initialState: T, persistenceKey = 'game-state-v1') {
    this.persistenceKey = persistenceKey;
    this.state = this.load(initialState);
  }

  // --- Accès ---
  get(): T {
    return this.state;
  }

  /** Hook réactif : déclenche le callback quand la projection change */
  subscribe<R>(selector: Selector<T, R>, callback: (value: R) => void): () => void {
    let previous = selector(this.state);
    const listener = (newState: T) => {
      const current = selector(newState);
      if (!this.shallowEqual(previous, current)) {
        previous = current;
        callback(current);
      }
    };
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Mutation ---
  set(updater: (state: T) => T): void {
    const newState = updater(this.state);
    if (newState !== this.state) {
      this.state = newState;
      this.notify();
      this.scheduleSave();
    }
  }

  /** Mise à jour partielle d'un slice (merge shallow) */
  updateSlice<K extends keyof T>(key: K, partial: Partial<T[K]>): void {
    this.set((s) => ({
      ...s,
      [key]: { ...(s[key] as object), ...partial },
    }));
  }

  // --- Event bus ---
  on<E extends GameEvent>(type: E['type'], handler: (payload: E) => void): () => void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }
    this.eventHandlers.get(type)!.add(handler as (payload: unknown) => void);
    return () => this.eventHandlers.get(type)?.delete(handler as (payload: unknown) => void);
  }

  dispatch<E extends GameEvent>(event: E): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) handlers.forEach((h) => h(event));
  }

  // --- Persistence ---
  private load(defaults: T): T {
    try {
      const raw = localStorage.getItem(this.persistenceKey);
      if (!raw) return defaults;
      return this.deepMerge(defaults, JSON.parse(raw)) as T;
    } catch {
      return defaults;
    }
  }

  private scheduleSave(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(this.persistenceKey, JSON.stringify(this.state));
      } catch (e) {
        console.warn('[StateManager] save failed:', e);
      }
    }, 250);
  }

  private notify(): void {
    this.listeners.forEach((l) => l(this.state));
  }

  private shallowEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || !a || !b) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k) => Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }

  /** Merge deep qui préserve les valeurs par défaut pour les slices manquants */
  private deepMerge(target: unknown, source: unknown): unknown {
    if (typeof target !== 'object' || target === null) return source;
    if (typeof source !== 'object' || source === null) return target;
    const output = { ...(target as object) };
    for (const key of Object.keys(source as object)) {
      const sv = (source as Record<string, unknown>)[key];
      const tv = (target as Record<string, unknown>)[key];
      if (tv !== undefined && typeof tv === 'object' && typeof sv === 'object' && sv !== null) {
        (output as Record<string, unknown>)[key] = this.deepMerge(tv, sv);
      } else {
        (output as Record<string, unknown>)[key] = sv;
      }
    }
    return output;
  }

  reset(initial: T): void {
    this.state = initial;
    localStorage.removeItem(this.persistenceKey);
    this.notify();
  }
}