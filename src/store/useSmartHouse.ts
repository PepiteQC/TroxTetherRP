import { create } from 'zustand';

export interface DoorLock {
  id: string;
  name: string;
  status: 'locked' | 'unlocked' | 'blocked' | 'alarm_triggered';
  requiresCard: boolean;
  requiredLevel: 'none' | 'resident' | 'vip' | 'admin';
  numpadCode: string;
  attemptCount: number;
  blockedUntil: number; // timestamp if blocked
}

export interface AccessCard {
  id: string;
  ownerName: string;
  level: 'none' | 'resident' | 'vip' | 'admin';
  isActive: boolean;
  expiryDate: string; // ISO format
}

export interface AlarmEvent {
  id: string;
  doorId: string;
  type: 'failed_attempt' | 'forced_entry' | 'card_rejected' | 'alarm_reset';
  timestamp: number;
  details: string;
}

const LEVEL_HIERARCHY = {
  none: 0,
  resident: 1,
  vip: 2,
  admin: 3,
};

interface SmartHouseState {
  doors: Record<string, DoorLock>;
  playerCard: AccessCard | null;
  alarmEvents: AlarmEvent[];
  masterAlarmActive: boolean;
  alarmSilenceUntil: number; // timestamp
  activeDoorId: string;
  
  // Actions
  createDoor: (door: Omit<DoorLock, 'attemptCount' | 'blockedUntil'>) => void;
  tryUnlockWithCard: (doorId: string, card: AccessCard) => { success: boolean; message: string };
  tryUnlockWithNumpad: (doorId: string, code: string) => { success: boolean; message: string };
  forceUnlock: (doorId: string) => void;
  lock: (doorId: string) => void;
  triggerAlarm: (doorId: string, type: AlarmEvent['type'], details: string) => void;
  silenceAlarm: (durationMs: number) => void;
  resetAlarm: () => void;
  setPlayerCard: (card: AccessCard | null) => void;
  clearEvents: () => void;
  setActiveDoorId: (id: string) => void;
  
  // Selectors/getters inside or outside
  getAlarmStatus: () => { active: boolean; silenced: boolean; eventCount: number };
  getRecentEvents: (limit?: number) => AlarmEvent[];
}

export const useSmartHouse = create<SmartHouseState>((set, get) => ({
  doors: {},
  playerCard: {
    id: 'CARD-101',
    ownerName: 'Alex Mercer',
    level: 'resident',
    isActive: true,
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  },
  alarmEvents: [],
  masterAlarmActive: false,
  alarmSilenceUntil: 0,
  activeDoorId: 'front_door',

  createDoor: (door) => set((state) => {
    if (state.doors[door.id]) return state; // Already exists
    return {
      doors: {
        ...state.doors,
        [door.id]: {
          ...door,
          attemptCount: 0,
          blockedUntil: 0,
        },
      },
    };
  }),

  tryUnlockWithCard: (doorId, card) => {
    const { doors } = get();
    const door = doors[doorId];
    if (!door) return { success: false, message: 'Porte introuvable.' };

    if (door.status === 'blocked') {
      if (door.blockedUntil > Date.now()) {
        const secs = Math.ceil((door.blockedUntil - Date.now()) / 1000);
        return { success: false, message: `Porte bloquée. Réessayez dans ${secs}s.` };
      } else {
        // Reset block status
        set((state) => ({
          doors: {
            ...state.doors,
            [doorId]: { ...state.doors[doorId], status: 'locked', attemptCount: 0 },
          },
        }));
      }
    }

    // Expiry check
    const isExpired = new Date(card.expiryDate).getTime() < Date.now();
    if (isExpired) {
      get().triggerAlarm(doorId, 'card_rejected', `Carte de ${card.ownerName} expirée.`);
      return { success: false, message: 'Accès refusé : carte expirée.' };
    }

    if (!card.isActive) {
      get().triggerAlarm(doorId, 'card_rejected', `Carte de ${card.ownerName} désactivée.`);
      return { success: false, message: 'Accès refusé : carte inactive.' };
    }

    // Level check
    const cardPower = LEVEL_HIERARCHY[card.level] || 0;
    const doorPower = LEVEL_HIERARCHY[door.requiredLevel] || 0;

    if (cardPower < doorPower) {
      get().triggerAlarm(doorId, 'card_rejected', `Accès insuffisant pour ${card.ownerName} (Niveau ${card.level} < requis ${door.requiredLevel}).`);
      return { success: false, message: `Accès insuffisant (requis: ${door.requiredLevel}).` };
    }

    // Unlock success!
    set((state) => ({
      doors: {
        ...state.doors,
        [doorId]: {
          ...state.doors[doorId],
          status: 'unlocked',
          attemptCount: 0,
        },
      },
      alarmEvents: [
        {
          id: `EV-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          doorId,
          type: 'alarm_reset' as const, // Normal reset/access
          timestamp: Date.now(),
          details: `Accès autorisé par carte pour ${card.ownerName} (${card.level}).`,
        },
        ...state.alarmEvents,
      ].slice(0, 50),
    }));

    return { success: true, message: `Bienvenue, ${card.ownerName} !` };
  },

  tryUnlockWithNumpad: (doorId, code) => {
    const { doors } = get();
    const door = doors[doorId];
    if (!door) return { success: false, message: 'Porte introuvable.' };

    if (door.status === 'blocked') {
      if (door.blockedUntil > Date.now()) {
        const secs = Math.ceil((door.blockedUntil - Date.now()) / 1000);
        return { success: false, message: `Porte verrouillée. Attendez ${secs}s.` };
      }
    }

    if (door.numpadCode === code) {
      // Unlock success!
      set((state) => ({
        doors: {
          ...state.doors,
          [doorId]: {
            ...state.doors[doorId],
            status: 'unlocked',
            attemptCount: 0,
          },
        },
        alarmEvents: [
          {
            id: `EV-${Date.now()}`,
            doorId,
            type: 'alarm_reset' as const,
            timestamp: Date.now(),
            details: `Porte déverrouillée avec succès par code clavier.`,
          },
          ...state.alarmEvents,
        ].slice(0, 50),
      }));
      return { success: true, message: 'Code correct. Porte déverrouillée !' };
    } else {
      // Failed attempt
      const nextAttempts = door.attemptCount + 1;
      const willTriggerAlarm = nextAttempts >= 3;

      set((state) => {
        const updatedDoor = {
          ...state.doors[doorId],
          attemptCount: nextAttempts,
          status: willTriggerAlarm 
            ? 'alarm_triggered' as const 
            : (nextAttempts === 2 ? 'blocked' as const : 'locked' as const),
          blockedUntil: nextAttempts === 2 ? Date.now() + 30 * 1000 : 0, // 30s block on 2nd fail
        };

        return {
          doors: {
            ...state.doors,
            [doorId]: updatedDoor,
          },
        };
      });

      if (willTriggerAlarm) {
        get().triggerAlarm(doorId, 'failed_attempt', `3 codes incorrects saisis. Alarme générale déclenchée.`);
        return { success: false, message: 'Alarme déclenchée ! Clavier bloqué.' };
      } else if (nextAttempts === 2) {
        get().triggerAlarm(doorId, 'failed_attempt', `2 codes incorrects saisis. Clavier temporairement verrouillé.`);
        return { success: false, message: 'Code incorrect (Tentative 2/3). Clavier bloqué 30s.' };
      } else {
        get().triggerAlarm(doorId, 'failed_attempt', `Saisie de code incorrect (${nextAttempts}/3).`);
        return { success: false, message: `Code incorrect (Tentative ${nextAttempts}/3).` };
      }
    }
  },

  forceUnlock: (doorId) => set((state) => ({
    doors: {
      ...state.doors,
      [doorId]: {
        ...state.doors[doorId],
        status: 'unlocked',
        attemptCount: 0,
      },
    },
    alarmEvents: [
      {
        id: `EV-${Date.now()}`,
        doorId,
        type: 'forced_entry' as const,
        timestamp: Date.now(),
        details: `Déverrouillage d'urgence forcé par l'administrateur.`,
      },
      ...state.alarmEvents,
    ].slice(0, 50),
  })),

  lock: (doorId) => set((state) => ({
    doors: {
      ...state.doors,
      [doorId]: {
        ...state.doors[doorId],
        status: 'locked',
        attemptCount: 0,
      },
    },
    alarmEvents: [
      {
        id: `EV-${Date.now()}`,
        doorId,
        type: 'alarm_reset' as const,
        timestamp: Date.now(),
        details: `Porte reverrouillée manuellement.`,
      },
      ...state.alarmEvents,
    ].slice(0, 50),
  })),

  triggerAlarm: (doorId, type, details) => set((state) => {
    const isSilenced = state.alarmSilenceUntil > Date.now();
    const isAlreadyMaster = state.masterAlarmActive;

    // Set status of the door to alarm_triggered
    const updatedDoors = { ...state.doors };
    if (updatedDoors[doorId]) {
      updatedDoors[doorId].status = 'alarm_triggered';
    }

    return {
      doors: updatedDoors,
      masterAlarmActive: isSilenced ? isAlreadyMaster : true,
      alarmEvents: [
        {
          id: `ALARM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          doorId,
          type,
          timestamp: Date.now(),
          details,
        },
        ...state.alarmEvents,
      ].slice(0, 50),
    };
  }),

  silenceAlarm: (durationMs) => set(() => ({
    alarmSilenceUntil: Date.now() + durationMs,
    masterAlarmActive: false, // temporarily disable flashing siren in UI
  })),

  resetAlarm: () => set((state) => {
    const resetDoors = { ...state.doors };
    Object.keys(resetDoors).forEach((id) => {
      if (resetDoors[id].status === 'alarm_triggered') {
        resetDoors[id].status = 'locked';
        resetDoors[id].attemptCount = 0;
      }
    });

    return {
      doors: resetDoors,
      masterAlarmActive: false,
      alarmEvents: [
        {
          id: `RESET-${Date.now()}`,
          doorId: 'ALL',
          type: 'alarm_reset' as const,
          timestamp: Date.now(),
          details: 'Alarme réinitialisée par l\'administrateur. Toutes les portes sont sécurisées.',
        },
        ...state.alarmEvents,
      ].slice(0, 50),
    };
  }),

  setPlayerCard: (card) => set({ playerCard: card }),
  clearEvents: () => set({ alarmEvents: [] }),
  setActiveDoorId: (id) => set({ activeDoorId: id }),

  getAlarmStatus: () => {
    const { masterAlarmActive, alarmSilenceUntil, alarmEvents } = get();
    const isSilenced = alarmSilenceUntil > Date.now();
    return {
      active: masterAlarmActive && !isSilenced,
      silenced: isSilenced,
      eventCount: alarmEvents.length,
    };
  },

  getRecentEvents: (limit = 10) => {
    return get().alarmEvents.slice(0, limit);
  }
}));
