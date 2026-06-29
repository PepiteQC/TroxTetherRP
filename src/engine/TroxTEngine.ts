// ============================================================
//  TroxT Local Engine — EtherWorld Neural Core
//  100% local, no external API needed — dev mode bypass.
//  Intent parsing + skill execution mapped to game store.
// ============================================================

import {
  toggleFly,
  toggleGod,
  toggleNoclip,
  toggleBuild,
  toggleLight,
  setActiveScene,
  setDoorLocked,
  setGlobal,
  addPlaced,
  clearAllPlaced,
  addChat,
  useGameState,
} from '../../store';
import type { ActiveScene } from '../../store';

// ── Types ─────────────────────────────────────────────────────

export interface TroxTMessage {
  id: string;
  role: 'user' | 'troxt' | 'system' | 'thought';
  text: string;
  timestamp: number;
}

export interface SkillResult {
  ok: boolean;
  summary: string;
  detail?: unknown;
}

export type SkillHandler = (params: Record<string, unknown>) => SkillResult | Promise<SkillResult>;

interface Skill {
  description: string;
  aliases: string[];
  handler: SkillHandler;
}

// ── Utility ───────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const snap = () => useGameState.getState();

// ── Skill registry ────────────────────────────────────────────

const SKILLS: Record<string, Skill> = {
  get_world_state: {
    description: 'État du monde (scène, météo, heure, mode)',
    aliases: ['état', 'etat', 'world', 'monde', 'status', 'info', 'statut'],
    handler: () => {
      const s = snap();
      return {
        ok: true,
        summary:
          `🌍 Scène: ${s.activeScene} | 🕐 ${String(s.timeOfDay).padStart(2,'0')}h00 | ` +
          `🌤 ${s.weather} | ✈️ Vol: ${s.flyMode ? 'ON' : 'OFF'} | 🛡 God: ${s.isGodMode ? 'ON' : 'OFF'} | ` +
          `🔨 Build: ${s.buildMode ? 'ON' : 'OFF'} | 📦 Objets: ${s.placedObjects.length}`,
      };
    },
  },

  fly: {
    description: 'Activer/désactiver le mode vol',
    aliases: ['fly', 'vol', 'voler'],
    handler: () => {
      const was = snap().flyMode;
      toggleFly();
      return { ok: true, summary: was ? '✈️ Vol désactivé.' : '✈️ Vol activé ! WASD pour voler.' };
    },
  },

  god: {
    description: 'Activer/désactiver le god mode',
    aliases: ['god', 'dieu', 'invincible'],
    handler: () => {
      const was = snap().isGodMode;
      toggleGod();
      return { ok: true, summary: was ? '🛡 God mode désactivé.' : '🛡 God mode activé. Tu es invincible.' };
    },
  },

  noclip: {
    description: 'Traverser les murs (noclip)',
    aliases: ['noclip', 'clip', 'traverser', 'ghost'],
    handler: () => {
      const was = snap().noclipMode;
      toggleNoclip();
      return { ok: true, summary: was ? '👻 Noclip OFF.' : '👻 Noclip ON — traverse tout !' };
    },
  },

  build: {
    description: 'Ouvrir/fermer le builder',
    aliases: ['build', 'builder', 'construire', 'bâtir'],
    handler: () => {
      const was = snap().buildMode;
      toggleBuild();
      return { ok: true, summary: was ? '🔨 Builder fermé.' : '🔨 Builder ouvert — appuie B pour toggle.' };
    },
  },

  scene: {
    description: 'Changer de scène',
    aliases: ['scene', 'scène', 'aller', 'go', 'goto'],
    handler: (params) => {
      const scenes: ActiveScene[] = ['world', 'room', 'corridor', 'hotel'];
      const name = String(params.scene || params.arg || '').toLowerCase();
      const target = scenes.find(s => name.includes(s));
      if (!target) return { ok: false, summary: `❌ Scène inconnue. Choix: ${scenes.join(', ')}` };
      setActiveScene(target);
      const labels: Record<ActiveScene, string> = {
        world: '🌍 Monde', room: '🛏 Chambre 4201', corridor: '🚪 Corridor', hotel: '🏨 Hôtel',
      };
      return { ok: true, summary: `🚀 Téléportation → ${labels[target]}` };
    },
  },

  weather: {
    description: 'Changer la météo',
    aliases: ['weather', 'météo', 'meteo', 'pluie', 'neige', 'soleil', 'brouillard'],
    handler: (params) => {
      const map: Record<string, string> = {
        clear: 'clear', clair: 'clear', soleil: 'clear', beau: 'clear',
        rain: 'rain', pluie: 'rain', pluvieux: 'rain',
        snow: 'snow', neige: 'snow', neigeux: 'snow',
        fog: 'fog', brouillard: 'fog', brume: 'fog',
      };
      const arg = String(params.arg || params.weather || '').toLowerCase();
      const found = Object.entries(map).find(([k]) => arg.includes(k));
      if (!found) return { ok: false, summary: '❌ Météo: clear | rain | snow | fog' };
      setGlobal({ weather: found[1] as any });
      const icons: Record<string, string> = { clear: '☀️', rain: '🌧', snow: '❄️', fog: '🌫' };
      return { ok: true, summary: `${icons[found[1]]} Météo → ${found[1]}` };
    },
  },

  time: {
    description: 'Changer l\'heure (0-23)',
    aliases: ['time', 'heure', 'jour', 'nuit'],
    handler: (params) => {
      let h = parseInt(String(params.arg || params.hour || params.time || ''), 10);
      const arg = String(params.raw || '').toLowerCase();
      if (arg.includes('jour') || arg.includes('day') || arg.includes('midi')) h = 12;
      if (arg.includes('nuit') || arg.includes('night') || arg.includes('soir')) h = 22;
      if (arg.includes('matin') || arg.includes('morning') || arg.includes('aube')) h = 6;
      if (isNaN(h) || h < 0 || h > 23) return { ok: false, summary: '❌ Heure: /time <0-23>' };
      setGlobal({ timeOfDay: h });
      const period = h < 6 ? '🌙' : h < 12 ? '🌅' : h < 18 ? '☀️' : h < 21 ? '🌇' : '🌃';
      return { ok: true, summary: `${period} Heure → ${String(h).padStart(2,'0')}:00` };
    },
  },

  lights: {
    description: 'Lumières ON/OFF',
    aliases: ['lights', 'lumière', 'lumières', 'lampe'],
    handler: (params) => {
      const arg = String(params.arg || '').toLowerCase();
      const on = arg.includes('on') || arg.includes('allume');
      const s = snap();
      Object.keys(s.lights).forEach(id => {
        if (s.lights[id].isOn !== on) toggleLight(id);
      });
      return { ok: true, summary: on ? '💡 Lumières ON' : '🌑 Lumières OFF' };
    },
  },

  lock: {
    description: 'Verrouiller/déverrouiller une porte',
    aliases: ['lock', 'unlock', 'verrou', 'verrouiller', 'déverrouiller'],
    handler: (params) => {
      const raw = String(params.raw || '').toLowerCase();
      const doLock = raw.includes('lock') || raw.includes('verrou');
      const id = raw.includes('bath') ? 'bathroom' : 'main';
      setDoorLocked(id, doLock);
      return { ok: true, summary: `🔐 Porte ${id} ${doLock ? 'verrouillée' : 'déverrouillée'}` };
    },
  },

  spawn: {
    description: 'Spawner un objet dans le monde',
    aliases: ['spawn', 'crée', 'create', 'ajouter', 'add', 'placer'],
    handler: (params) => {
      const TYPES = ['cube', 'sphere', 'cylinder', 'wall', 'pillar', 'tree', 'rock', 'bench',
        'streetlight', 'ramp', 'fence', 'barrel', 'crate', 'table', 'chair'];
      const raw = String(params.raw || '').toLowerCase();
      const type = TYPES.find(t => raw.includes(t)) || 'cube';
      const spread = () => (Math.random() - 0.5) * 8;
      addPlaced({
        type,
        position: [spread(), 0, spread()],
        rotation: 0,
        scale: 1,
      });
      return { ok: true, summary: `📦 ${type} spawné dans le monde !` };
    },
  },

  clearbuilt: {
    description: 'Effacer tous les objets placés',
    aliases: ['clear', 'clearbuilt', 'effacer', 'supprimer tout', 'reset objets'],
    handler: () => {
      clearAllPlaced();
      return { ok: true, summary: '🗑 Tous les objets effacés.' };
    },
  },

  help: {
    description: 'Aide — liste des commandes',
    aliases: ['help', 'aide', 'commandes', 'commands', '?'],
    handler: () => ({
      ok: true,
      summary:
        '📖 **Commandes TroxT disponibles:**\n' +
        '• état / info — état du monde\n' +
        '• fly — mode vol\n' +
        '• god — invincibilité\n' +
        '• noclip — traverser les murs\n' +
        '• build — builder mode\n' +
        '• scene <room|corridor|hotel|world>\n' +
        '• weather <clear|rain|snow|fog>\n' +
        '• time <0-23> / jour / nuit / matin\n' +
        '• lights on|off\n' +
        '• lock|unlock <main|bathroom>\n' +
        '• spawn <cube|sphere|tree|rock|...>\n' +
        '• clear — effacer les objets\n' +
        '• ping — latence\n' +
        '• version — version engine',
    }),
  },

  ping: {
    description: 'Ping',
    aliases: ['ping', 'latence'],
    handler: () => ({
      ok: true,
      summary: '🏓 Pong! Latence: 0ms (LOCAL_DEV_MODE)',
    }),
  },

  version: {
    description: 'Version',
    aliases: ['version', 'ver', 'about'],
    handler: () => ({
      ok: true,
      summary:
        '🧠 **TroxT Neural Core v4.0.0-intellectus**\n' +
        'EtherWorld RP v1.2.0-dev.47 | Node.js 24 | RTF 8\n' +
        'Mode: LOCAL_DEV_MODE | Skills: ' + Object.keys(SKILLS).length,
    }),
  },

  introspect: {
    description: 'Introspection cognitive',
    aliases: ['introspect', 'introspection', 'cerveau', 'brain', 'toi', 'qui'],
    handler: () => {
      const s = snap();
      return {
        ok: true,
        summary:
          '🧠 **TroxT — Introspection:**\n' +
          `• Conscience: 7/10 | Charge: ${s.placedObjects.length * 5}%\n` +
          `• Objets gérés: ${s.placedObjects.length}\n` +
          `• Scène active: ${s.activeScene}\n` +
          `• Modules: Forge, Prism, Lens, Weave\n` +
          `• Mémoire: ${s.chatMessages.length} messages\n` +
          '• Status: ONLINE (LOCAL_DEV_MODE)',
      };
    },
  },
};

// ── Conversations ─────────────────────────────────────────────

const CHAT_RESPONSES: [RegExp, string[]][] = [
  [/bonjour|salut|coucou|hello|hi\b/i, [
    '👋 Salut ! Je suis TroxT, le cerveau neural d\'EtherWorld. Tape `aide` pour voir ce que je peux faire.',
    'Bonjour développeur ! En quoi puis-je t\'aider ?',
  ]],
  [/merci|thanks|thx/i, [
    'Avec plaisir ! 🧠',
    'De rien ! Je suis là pour ça.',
  ]],
  [/beau|super|cool|parfait|nickel|excellent/i, [
    '✨ Merci ! Je fais de mon mieux.',
    'Content que ça te plaise ! Que puis-je faire d\'autre ?',
  ]],
  [/génère|generate|procédural|procédure/i, [
    '🏗 AutoBuilder en mode LOCAL_DEV — tape `spawn cube` ou `spawn tree` pour commencer !',
  ]],
  [/qui.*tu|c.*quoi|présente/i, [
    '🧠 Je suis **TroxT** — le cerveau neural d\'EtherWorld RP.\n' +
    'Je peux contrôler le monde, spawner des objets, changer la scène, la météo, l\'heure.\n' +
    'Tape `aide` pour la liste complète.',
  ]],
];

// ── Intent parser ─────────────────────────────────────────────

function parseIntent(text: string): { skill: string | null; params: Record<string, unknown> } {
  const t = text.trim().toLowerCase();

  // Check each skill by aliases
  for (const [skillId, skill] of Object.entries(SKILLS)) {
    for (const alias of skill.aliases) {
      if (t.includes(alias)) {
        // Extract argument after the alias
        const idx = t.indexOf(alias);
        const after = t.slice(idx + alias.length).trim();
        // Also extract numbers
        const numMatch = text.match(/\b(\d+)\b/);
        return {
          skill: skillId,
          params: {
            arg: after,
            raw: t,
            hour: numMatch ? parseInt(numMatch[1]) : NaN,
            time: numMatch ? parseInt(numMatch[1]) : NaN,
          },
        };
      }
    }
  }

  return { skill: null, params: { raw: t } };
}

// ── Main process function ─────────────────────────────────────

export async function processMessage(text: string): Promise<TroxTMessage[]> {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const results: TroxTMessage[] = [];

  const push = (role: TroxTMessage['role'], txt: string) => {
    results.push({ id: uid(), role, text: txt, timestamp: Date.now() });
  };

  // Slash command passthrough to game
  if (trimmed.startsWith('/')) {
    const cmd = trimmed.slice(1).trim();
    addChat('TroxT-CMD', trimmed, 'admin');
    push('system', `⚙️ Commande relayée: \`${trimmed}\``);
    return results;
  }

  // Check chat responses first
  for (const [pattern, replies] of CHAT_RESPONSES) {
    if (pattern.test(lower)) {
      await delay(300 + Math.random() * 400);
      push('troxt', replies[Math.floor(Math.random() * replies.length)]);
      return results;
    }
  }

  // Intent parse
  const { skill: skillId, params } = parseIntent(lower);

  if (skillId && SKILLS[skillId]) {
    await delay(200 + Math.random() * 300);
    try {
      const result = await SKILLS[skillId].handler({ ...params, raw: lower });
      push('troxt', result.summary);
      if (result.ok) {
        addChat('TroxT', `Action: ${skillId} — ${result.summary.split('\n')[0]}`, 'admin');
      }
    } catch (e) {
      push('troxt', `❌ Erreur skill ${skillId}: ${String(e)}`);
    }
    return results;
  }

  // Fallback — conversational
  await delay(400 + Math.random() * 600);
  const fallbacks = [
    `Hmm, je n'ai pas compris « ${trimmed} ». Tape \`aide\` pour voir mes capacités.`,
    `🤔 Requête non reconnue. Je peux contrôler la scène, la météo, l'heure, les objets… Tape \`aide\`.`,
    `Je suis en mode LOCAL_DEV — pas d'IA externe. Tape \`aide\` pour la liste de mes commandes.`,
  ];
  push('troxt', fallbacks[Math.floor(Math.random() * fallbacks.length)]);
  return results;
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export { SKILLS };
