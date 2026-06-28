import { createServer } from 'node:http';
import { env } from './config/env.js';
import { createDreamEngine } from './dream/dreamEngine.js';
import { createApp } from './http/app.js';
import { kernel } from './kernel.js';
import { createNarrativeMemory } from './memory/narrativeMemory.js';
import { createRealtimeServer } from './realtime/socketServer.js';
import { generateDiamondIdentity, logger, printDiamond } from './shared/logger.js';

async function start() {
  // ===== AMÉLIORATION SPÉCIALE #1 : INITIALISATION ORACULAIRE =====
  // Le kernel ne s'initialise pas seul — il reçoit une graine narrative
  // qui façonne la personnalité et la mémoire du monde
  const genesisSeed = env.GENESIS_SEED || crypto.randomUUID();
  await kernel.initialize({ seed: genesisSeed, genesisMode: 'unfold' });

  // ===== AMÉLIORATION SPÉCIALE #2 : APPLICATION MORPHIC =====
  // L'app n'est plus juste HTTP — elle devient une interface morphique
  // capable de muter son comportement selon l'état du cerveau
  const app = createApp({
    kernel,
    morphic: true,
    adaptiveRoutes: env.ADAPTIVE_ROUTES !== 'false'
  });

  const httpServer = createServer(app);

  // ===== AMÉLIORATION SPÉCIALE #3 : REALITÉ AUGMENTÉE DU SERVEUR =====
  // Le serveur temps-réel devient une couche de conscience partagée
  const realtimeLayer = createRealtimeServer(httpServer, {
    kernel,
    sharedConsciousness: true,
    presenceTracking: 'holographic'
  });

  // ===== AMÉLIORATION SPÉCIALE #4 : MOTEUR DE RÊVES =====
  // Le serveur rêve entre les événements — génère des intrigues,
  // des PNJ, des quêtes, des événements météo, des cycles jour/nuit
  const dreamEngine = createDreamEngine(kernel, {
    dreamIntervalMs: env.DREAM_INTERVAL_MS || 30_000,
    narrativeDepth: env.NARRATIVE_DEPTH || 3,
    autonomousNpc: true,
    weatherSystem: true,
    factionDynamics: true
  });
  kernel.dreamEngine = dreamEngine;

  // ===== AMÉLIORATION SPÉCIALE #5 : MÉMOIRE NARRATIVE PERSISTANTE =====
  // La mémoire n'est plus un simple snapshot — elle tisse une tapisserie
  // temporelle avec flashbacks, prophéties, et échos du passé
  const narrativeMemory = createNarrativeMemory(kernel.memory, {
    temporalLayers: 7,
    dreamRecallEnabled: true,
    prophecyEngine: true
  });

  // ===== AMÉLIORATION SPÉCIALE #6 : SCHEDULER DREAM-CONSCIOUS =====
  // Le scheduler est conscient des rêves et adapte ses cycles
  kernel.scheduler.every('autosave', env.autosaveMs, async () => {
    const snapshot = narrativeMemory.read({ enriched: true });
    const dreamState = kernel.dreamEngine?.currentDream || null;
    const schemas = snapshot.rpSchemas?.length || 0;
    const prophecies = snapshot.prophecies?.length || 0;

    await kernel.bus.emit('world.autosave', {
      schemas,
      prophecies,
      dreamActive: !!dreamState,
      narrativeDepth: snapshot.narrativeDepth || 0,
      timestamp: Date.now()
    }, 'low');

    // Si le monde rêve, on enregistre aussi le rêve
    if (dreamState) {
      await kernel.bus.emit('world.dream.saved', { dream: dreamState.id }, 'low');
    }
  });

  // ===== AMÉLIORATION SPÉCIALE #7 : INTERFACE MORPHIQUE AU LANCEMENT =====
  httpServer.listen(env.port, env.host, () => {
    const identity = generateDiamondIdentity();
    const brainState = kernel.brain ? kernel.brain.state : 'UNKNOWN';
    const dreamState = kernel.dreamEngine?.isDreaming ? 'DREAMING' : 'AWAKE';
    const morphicVersion = '0.1.0-morphic';

    // Le diamant affiche maintenant l'état du rêve
    printDiamond(env.port, brainState, identity, {
      dreamState,
      morphicVersion,
      seed: genesisSeed.slice(0, 8) + '...'
    });

    logger.ok('server', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.ok('server', `🌐 Troxt EtherWorld RP v${morphicVersion}`);
    logger.ok('server', `📡 http://${env.host}:${env.port}`);
    logger.ok('server', `🧠 Cerveau: ${brainState} | Rêve: ${dreamState}`);
    logger.ok('server', `🌱 Graine: ${genesisSeed.slice(0, 16)}...`);
    logger.ok('server', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.ok('server', 'Routes:');
    logger.ok('server', '  /api/health');
    logger.ok('server', '  /api/brain/execute');
    logger.ok('server', '  /api/world/*');
    logger.ok('server', '  /api/admin/command');
    logger.ok('server', '  /api/morphic/evolve');
    logger.ok('server', '  /api/dream/state');
    logger.ok('server', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.ok('server', 'WebSocket:');
    logger.ok('server', '  player:join | player:move');
    logger.ok('server', '  chat:send | brain:intent');
    logger.ok('server', '  rp:command | dream:influence');
    logger.ok('server', '  morphic:evolve | narrative:echo');
    logger.ok('server', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  });

  // ===== AMÉLIORATION SPÉCIALE #8 : ARRÊT EN DOUCEUR AVEC DERNIER RÊVE =====
  process.on('SIGINT', async () => {
    logger.warn('server', '◈ Arrêt demandé... Sauvegarde du rêve en cours...');
    kernel.scheduler.stopAll();

    // On laisse le moteur de rêves écrire un dernier rêve
    if (kernel.dreamEngine?.isDreaming) {
      await kernel.dreamEngine.finalizeDream();
      logger.ok('server', '◈ Dernier rêve préservé.');
    }

    // Sauvegarde narrative finale
    await narrativeMemory.flush();

    httpServer.close(() => {
      logger.ok('server', '◈ Serveur arrêté. Le monde se souvient.');
      process.exit(0);
    });

    // Timeout de sécurité
    setTimeout(() => process.exit(1), 5000);
  });
}

start().catch(err => {
  logger.fatal('server', `⌨ ERREUR FATALE: ${err.message}`);
  console.error(err);
  process.exit(1);
});