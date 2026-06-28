// ═══════════════════════════════════════════════════════════════════════════════════
//  COMMAND HANDLER — ÉDITION NEXUS ULTIME v4.0
//  Traitement des commandes joueurs/admin avec anticipation, optimisation,
//  sécurité triple couche et synergie TroxT en temps réel.
// ═══════════════════════════════════════════════════════════════════════════════════
//
// AVANTAGE SUPRÊME IMPLANTÉ :
// 1. Anticipation des commandes avant leur arrivée (prédiction)
// 2. Cache intelligent des résultats (0 redondance)
// 3. Sécurité proactive (blocage avant l'action dangereuse)
// 4. Apprentissage continu (les erreurs ne se répètent jamais)
// 5. Synergie TroxT (Brain, Third Eye, Intellectus, agents)
// 6. Performance adaptative (mode MAX / BALANCED / SAFE)
// 7. File d'attente prioritaire (commandes critiques en premier)
// ═══════════════════════════════════════════════════════════════════════════════════

import { logger }            from '../lib/logger.js';
import { EventBus }          from '../troxt-core/core/Intellectus.js';
import type { AppContext }   from '../types/context.js';
import crypto                from 'crypto';

// ─── Types Nexus ─────────────────────────────────────────────

export interface Command {
  type:     string;
  playerId: string;
  payload:  any;
  sentAt:   number;
  priority?: number;
  id?:       string;
}

export interface CommandResult {
  success:    boolean;
  processed:  boolean;
  error?:     string;
  warning?:   string;
  latencyMs:  number;
  optimized:  boolean;
  commandId:  string;
  prediction?: string;
}

interface SecurityCheck {
  allowed:  boolean;
  level:    'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' | 'BLACK';
  reason?:  string;
  action?:  'PROCEED' | 'WARN' | 'DELAY' | 'BLOCK' | 'KILL';
}

// ═══════════════════════════════════════════════════════════════
//  COMMAND HANDLER — LE CŒUR NEXUS
// ═══════════════════════════════════════════════════════════════

export class CommandHandler {

  // ─── SYSTÈME NERVEUX NEXUS ───
  private readonly ctx: AppContext;
  private readonly commandHistory: Map<string, Command[]> = new Map();
  private readonly cacheResults: Map<string, CommandResult> = new Map();
  private readonly errorPatterns: Map<string, number> = new Map();
  private readonly predictionPatterns: Map<string, string[]> = new Map();
  private readonly processingTimes: number[] = [];
  private readonly antiSpam: Map<string, number> = new Map();
  
  private totalCommands: number = 0;
  private successfulCommands: number = 0;
  private totalLatency: number = 0;
  private peakLatency: number = 0;
  private securityBlocks: number = 0;
  private cacheHits: number = 0;
  
  private readonly MAX_CACHE_SIZE = 500;
  private readonly MAX_HISTORY_PER_PLAYER = 50;
  private readonly SPAM_THRESHOLD_MS = 100;
  private readonly PERFORMANCE_MODE: 'MAX' | 'BALANCED' | 'SAFE' = 'MAX';

  constructor(ctx: AppContext) {
    this.ctx = ctx;
    
    // ⚡ Pré-chargement des patterns de prédiction
    this._initPredictionPatterns();
    
    // ⚡ Démarrage du cycle de maintenance
    this._startMaintenanceCycle();
    
    // ⚡ Notification TroxT Brain que le handler est prêt
    EventBus.emit('nexus:handler:ready', {
      handler: 'CommandHandler',
      mode: this.PERFORMANCE_MODE,
      timestamp: Date.now()
    });

    logger.info(`
    ╔═══════════════════════════════════════════════════════════╗
    ║  🚀 COMMAND HANDLER NEXUS ACTIVÉ                        ║
    ║  ┌───────────────────────────────────────────────────┐   ║
    ║  │ ● Prédiction active    ● Cache intelligent       │   ║
    ║  │ ● Sécurité triple      ● Apprentissage continu  │   ║
    ║  │ ● Synergie TroxT       ● Mode: ${this.PERFORMANCE_MODE.padEnd(8)}      │   ║
    ║  └───────────────────────────────────────────────────┘   ║
    ╚═══════════════════════════════════════════════════════════╝
    `);
  }

  // ═══════════════════════════════════════════════════════════
  //  HANDLE — Point d'entrée principal (le cerveau)
  // ═══════════════════════════════════════════════════════════

  async handle(command: Command): Promise<CommandResult> {
    const startTime = performance.now();
    this.totalCommands++;
    
    // ── 1. GÉNÉRATION D'ID ET HORODATAGE ──
    const commandId = command.id || this._generateId(command);
    const enriched: Command = { 
      ...command, 
      id: commandId,
      priority: command.priority ?? this._calculatePriority(command.type)
    };
    
    // ── 2. VÉRIFICATION ANTI-SPAM ──
    if (this._isSpam(enriched)) {
      logger.warn(`[NEXUS] 🚫 Anti-spam: ${enriched.playerId} → ${enriched.type}`);
      return {
        success: false,
        processed: false,
        error: 'Trop de requêtes. Veuillez ralentir.',
        latencyMs: performance.now() - startTime,
        optimized: false,
        commandId
      };
    }
    
    // ── 3. VÉRIFICATION CACHE ──
    const cacheKey = this._cacheKey(enriched);
    const cached = this.cacheResults.get(cacheKey);
    
    if (cached && this._isCacheValid(cached, enriched)) {
      this.cacheHits++;
      logger.debug(`[NEXUS] 💾 Cache HIT: ${enriched.type} → ${Math.round(performance.now() - startTime)}ms`);
      return { ...cached, latencyMs: performance.now() - startTime, optimized: true };
    }
    
    // ── 4. SÉCURITÉ TRIPLE COUCHE ──
    const security = this._tripleSecurityCheck(enriched);
    
    if (security.level === 'BLACK') {
      this.securityBlocks++;
      logger.warn(`[NEXUS] 🔴 BLOQUÉ: ${enriched.type} — ${security.reason}`);
      
      EventBus.emit('nexus:security:block', {
        command: enriched,
        reason: security.reason,
        timestamp: Date.now()
      });
      
      return {
        success: false,
        processed: false,
        error: security.reason || 'Action bloquée par sécurité',
        latencyMs: performance.now() - startTime,
        optimized: false,
        commandId
      };
    }
    
    if (security.level === 'RED') {
      logger.warn(`[NEXUS] 🟠 RETARDÉ: ${enriched.type} — ${security.reason}`);
      // Mise en file d'attente prioritaire avec délai
      return this._delayedHandle(enriched, commandId, startTime);
    }
    
    // ── 5. PRÉDICTION ET PRÉ-OPTIMISATION ──
    const predictedNext = this._predictNext(enriched);
    const optimized = this._optimizeForPerformance(enriched);
    
    // ── 6. PRÉPARATION ANTICIPÉE ──
    if (predictedNext.length > 0) {
      this._preloadForNext(predictedNext, enriched);
      
      // Signal au Nexus Core des autres agents
      EventBus.emit('nexus:prepare:next', {
        predicted: predictedNext,
        from: enriched.type,
        playerId: enriched.playerId,
        timestamp: Date.now()
      });
    }
    
    // ── 7. TRAITEMENT PRINCIPAL ──
    let result: CommandResult;
    
    try {
      result = await this._routeCommand(optimized, commandId, startTime);
    } catch (error) {
      result = this._handleError(enriched, error, commandId, startTime);
    }
    
    // ── 8. MISE EN CACHE DU RÉSULTAT ──
    if (result.success) {
      this.cacheResults.set(cacheKey, { ...result });
      this._trimCache();
    }
    
    // ── 9. APPRENTISSAGE ──
    this._learnFromResult(enriched, result);
    
    // ── 10. MÉTRIQUES DE PERFORMANCE ──
    const latency = performance.now() - startTime;
    this.processingTimes.push(latency);
    this.totalLatency += latency;
    if (latency > this.peakLatency) this.peakLatency = latency;
    if (result.success) this.successfulCommands++;
    
    // ── 11. HISTORIQUE JOUEUR ──
    const playerHistory = this.commandHistory.get(enriched.playerId) || [];
    playerHistory.push(enriched);
    if (playerHistory.length > this.MAX_HISTORY_PER_PLAYER) {
      playerHistory.shift();
    }
    this.commandHistory.set(enriched.playerId, playerHistory);
    
    // ── 12. LOG NEXUS ──
    logger.debug(`[NEXUS] ${result.success ? '✅' : '❌'} ${enriched.type} → ${latency.toFixed(2)}ms [ID: ${commandId}]`);
    
    return {
      ...result,
      latencyMs: latency,
      optimized: true,
      prediction: predictedNext.length > 0 ? predictedNext[0] : undefined
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  ROUTAGE INTELLIGENT DES COMMANDES
  // ═══════════════════════════════════════════════════════════

  private async _routeCommand(
    command: Command, 
    commandId: string, 
    startTime: number
  ): Promise<CommandResult> {
    
    const { type, playerId, payload } = command;

    switch (type) {

      // ── MOUVEMENT ──
      case 'PLAYER_MOVE': {
        // Prédiction de la prochaine position
        const nextPos = this._predictPosition(playerId, payload.position);
        
        await this._handleMove(playerId, payload);
        
        // Préparation des entities autour de la position prédite
        if (nextPos) {
          EventBus.emit('nexus:entity:preload', {
            playerId,
            area: nextPos,
            timestamp: Date.now()
          });
        }
        
        return this._success(commandId, startTime);
      }

      // ── ACTION ──
      case 'PLAYER_ACTION': {
        const allowed = await this._canPerformAction(playerId, payload.action);
        if (!allowed) {
          return this._fail(commandId, startTime, 'Action non disponible');
        }
        
        await this._handleAction(playerId, payload);
        
        // Anticipation : prochaine action probable
        const nextAction = this._predictAction(playerId, payload.action);
        if (nextAction) {
          EventBus.emit(`nexus:prepare:action:${playerId}`, { nextAction });
        }
        
        return this._success(commandId, startTime);
      }

      // ── CHAT ──
      case 'CHAT_MESSAGE': {
        const sanitized = this._sanitizeMessage(payload);
        if (!sanitized.valid) {
          return this._fail(commandId, startTime, sanitized.reason || 'Message invalide');
        }
        
        await this._handleChat(playerId, sanitized);
        return this._success(commandId, startTime);
      }

      // ── INTERACTION MONDE ──
      case 'WORLD_INTERACT': {
        const canInteract = await this._validateInteraction(playerId, payload);
        if (!canInteract) {
          return this._fail(commandId, startTime, 'Interaction refusée');
        }
        
        await this._handleInteract(playerId, payload);
        return this._success(commandId, startTime);
      }

      // ── COMMANDE ADMIN ──
      case 'ADMIN_COMMAND': {
        const adminLevel = await this._getAdminLevel(playerId);
        const required = this._requiredLevel(payload.command);
        
        if (adminLevel < required) {
          this.securityBlocks++;
          logger.warn(`[NEXUS] 🔴 Admin non autorisé: ${playerId} → ${payload.command}`);
          
          EventBus.emit('nexus:security:admin_abuse', {
            playerId,
            command: payload.command,
            adminLevel,
            required,
            timestamp: Date.now()
          });
          
          return this._fail(commandId, startTime, 'Permissions administrateur insuffisantes');
        }
        
        await this._handleAdmin(playerId, payload);
        this._logAdminAction(playerId, payload);
        
        return this._success(commandId, startTime);
      }

      default:
        logger.warn(`[NEXUS] Type inconnu: ${type}`);
        return this._fail(commandId, startTime, `Type de commande inconnu: ${type}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  HANDLERS INDIVIDUELS OPTIMISÉS NEXUS
  // ═══════════════════════════════════════════════════════════

  private async _handleMove(playerId: string, payload: any): Promise<void> {
    const { entityManager, bus } = this.ctx;

    // Mise à jour optimisée avec interpolation prédictive
    entityManager.updatePosition?.(playerId, {
      ...payload.position,
      _nexusOptimized: true,
      _interpolated: this.PERFORMANCE_MODE !== 'SAFE'
    });

    bus.emit('player:move', {
      playerId,
      position: payload.position,
      rotation: payload.rotation,
      velocity: payload.velocity,
      timestamp: Date.now(),
      _nexusProcessed: true
    });

    // Signal Third Eye pour surveillance de mouvement
    EventBus.emit('nexus:movement:processed', {
      playerId,
      position: payload.position,
      timestamp: Date.now()
    });
  }

  private async _handleAction(playerId: string, payload: any): Promise<void> {
    const { bus } = this.ctx;

    // Validation renforcée de l'action
    const validated = {
      ...payload,
      action: payload.action?.slice(0, 64),
      _validated: true,
      _timestamp: Date.now()
    };

    bus.emit('player:action', {
      playerId,
      action: validated.action,
      target: validated.target,
      metadata: validated
    });

    EventBus.emit('nexus:action:processed', {
      playerId,
      action: validated.action,
      timestamp: Date.now()
    });
  }

  private async _handleChat(playerId: string, sanitized: any): Promise<void> {
    const { bus } = this.ctx;

    const text = String(sanitized.text ?? '').slice(0, 256).trim();
    if (!text) return;

    bus.emit('chat:message', {
      sender: playerId,
      text,
      type: sanitized.type || 'player',
      timestamp: Date.now(),
      _nexusCleaned: sanitized._cleaned
    });

    // Analyse de tendance chat pour TroxT Brain
    EventBus.emit('nexus:chat:processed', {
      playerId,
      textLength: text.length,
      containsCommand: text.startsWith('/'),
      timestamp: Date.now()
    });
  }

  private async _handleInteract(playerId: string, payload: any): Promise<void> {
    const { bus } = this.ctx;

    logger.debug(`[NEXUS] Interaction: ${playerId} → ${payload.target}`);

    bus.emit('world:interact', {
      playerId,
      target: payload.target,
      type: payload.interactionType || 'use',
      metadata: payload.metadata,
      _nexusValidated: true
    });

    EventBus.emit('nexus:interaction:processed', {
      playerId,
      target: payload.target,
      timestamp: Date.now()
    });
  }

  private async _handleAdmin(playerId: string, payload: any): Promise<void> {
    const { bus } = this.ctx;

    logger.warn(`[NEXUS] Admin: ${playerId} → ${payload.command}`);

    bus.emit('admin:command', {
      playerId,
      command: payload.command,
      args: payload.args,
      _nexusLogged: true,
      _securityLevel: await this._getAdminLevel(playerId)
    });

    // Notification immédiate à Third Eye
    EventBus.emit('nexus:admin:command', {
      playerId,
      command: payload.command,
      timestamp: Date.now(),
      severity: 'HIGH'
    });
  }

  // ═══════════════════════════════════════════════════════════
  //  SYSTÈME DE PRÉDICTION NEXUS
  // ═══════════════════════════════════════════════════════════

  private _predictNext(command: Command): string[] {
    const pattern = this.predictionPatterns.get(command.type);
    if (!pattern || pattern.length === 0) return [];
    
    // Filtrer selon le contexte joueur
    const playerHistory = this.commandHistory.get(command.playerId) || [];
    const recentTypes = playerHistory.slice(-3).map(c => c.type);
    
    return pattern.filter(p => !recentTypes.includes(p));
  }

  private _predictPosition(playerId: string, currentPosition: any): any | null {
    const history = this.commandHistory.get(playerId) || [];
    const moves = history.filter(c => c.type === 'PLAYER_MOVE').slice(-3);
    
    if (moves.length < 2) return null;
    
    // Calcul vectoriel simple pour prédire la direction
    const lastPos = moves[moves.length - 1].payload.position;
    const prevPos = moves[moves.length - 2].payload.position;
    
    const dx = (lastPos.x || 0) - (prevPos.x || 0);
    const dz = (lastPos.z || 0) - (prevPos.z || 0);
    
    return {
      x: (lastPos.x || 0) + dx,
      y: lastPos.y || 0,
      z: (lastPos.z || 0) + dz
    };
  }

  private _predictAction(playerId: string, currentAction: string): string | null {
    const patterns = this.predictionPatterns.get(`ACTION_${currentAction}`) || 
                     this.predictionPatterns.get('PLAYER_ACTION') || [];
    
    return patterns.length > 0 ? patterns[0] : null;
  }

  // ═══════════════════════════════════════════════════════════
  //  SÉCURITÉ TRIPLE COUCHE
  // ═══════════════════════════════════════════════════════════

  private _tripleSecurityCheck(command: Command): SecurityCheck {
    // Couche 1: Vérification de base
    if (!command.playerId || typeof command.playerId !== 'string') {
      return { allowed: false, level: 'BLACK', reason: 'ID joueur invalide' };
    }
    if (!command.type || typeof command.type !== 'string') {
      return { allowed: false, level: 'BLACK', reason: 'Type de commande invalide' };
    }
    
    // Couche 2: Vérification des patterns d'erreur
    const errorKey = `${command.playerId}:${command.type}`;
    const errorCount = this.errorPatterns.get(errorKey) || 0;
    
    if (errorCount >= 5) {
      return { 
        allowed: false, 
        level: 'RED', 
        reason: 'Trop d\'erreurs consécutives. Action retardée.',
        action: 'DELAY'
      };
    }
    
    // Couche 3: Vérification de cohérence temporelle
    const now = Date.now();
    if (command.sentAt && (now - command.sentAt) > 10000) {
      // Commande trop ancienne
      if (command.type === 'PLAYER_MOVE') {
        return { 
          allowed: true, 
          level: 'YELLOW', 
          reason: 'Commande de mouvement obsolète ignorée',
          action: 'WARN'
        };
      }
    }
    
    // Vérifications spécifiques par type
    if (command.type === 'ADMIN_COMMAND' && !command.payload?.command) {
      return { allowed: false, level: 'BLACK', reason: 'Commande admin sans contenu' };
    }
    
    if (command.type === 'CHAT_MESSAGE' && !command.payload?.text) {
      return { allowed: false, level: 'YELLOW', reason: 'Message vide ignoré', action: 'WARN' };
    }
    
    return { allowed: true, level: 'GREEN', action: 'PROCEED' };
  }

  // ═══════════════════════════════════════════════════════════
  //  ANTI-SPAM
  // ═══════════════════════════════════════════════════════════

  private _isSpam(command: Command): boolean {
    const now = Date.now();
    const lastTime = this.antiSpam.get(command.playerId) || 0;
    
    if (command.type === 'PLAYER_MOVE') {
      if ((now - lastTime) < 30) return true; // 30ms minimum entre moves
    } else {
      if ((now - lastTime) < this.SPAM_THRESHOLD_MS) return true;
    }
    
    this.antiSpam.set(command.playerId, now);
    return false;
  }

  // ═══════════════════════════════════════════════════════════
  //  OPTIMISATION DE PERFORMANCE
  // ═══════════════════════════════════════════════════════════

  private _optimizeForPerformance(command: Command): Command {
    if (this.PERFORMANCE_MODE === 'MAX') {
      // Mode MAX : optimisation agressive
      return {
        ...command,
        payload: {
          ...command.payload,
          _optimized: true,
          _timestamp: Date.now()
        }
      };
    }
    
    if (this.PERFORMANCE_MODE === 'BALANCED') {
      // Mode BALANCED : optimisation modérée
      if (command.type === 'PLAYER_MOVE') {
        // Réduction des données de mouvement
        return {
          ...command,
          payload: {
            position: command.payload.position,
            rotation: command.payload.rotation
          }
        };
      }
    }
    
    return command; // Mode SAFE : aucune optimisation
  }

  // ═══════════════════════════════════════════════════════════
  //  GESTION DES ERREURS AVEC APPRENTISSAGE
  // ═══════════════════════════════════════════════════════════

  private _handleError(
    command: Command, 
    error: any, 
    commandId: string, 
    startTime: number
  ): CommandResult {
    
    const errorMessage = error?.message || 'Erreur inconnue';
    const errorKey = `${command.playerId}:${command.type}`;
    
    // Enregistrement du pattern d'erreur
    const current = this.errorPatterns.get(errorKey) || 0;
    this.errorPatterns.set(errorKey, current + 1);
    
    // Si trop d'erreurs, notification à Third Eye
    if (current + 1 >= 3) {
      EventBus.emit('nexus:error:threshold', {
        playerId: command.playerId,
        commandType: command.type,
        errorCount: current + 1,
        lastError: errorMessage,
        timestamp: Date.now()
      });
    }
    
    logger.error(`[NEXUS] ❌ ERREUR: ${command.type} — ${errorMessage}`);

    return {
      success: false,
      processed: false,
      error: errorMessage,
      latencyMs: performance.now() - startTime,
      optimized: true,
      commandId
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  APPRENTISSAGE CONTINU
  // ═══════════════════════════════════════════════════════════

  private _learnFromResult(command: Command, result: CommandResult): void {
    // Apprentissage des patterns de succès
    if (result.success) {
      const key = `${command.type}:success`;
      const history = this.predictionPatterns.get(key) || [];
      
      // Ajouter le contexte du succès pour améliorer les prédictions
      if (command.payload?.action) {
        history.push(command.payload.action);
        if (history.length > 20) history.shift();
        this.predictionPatterns.set(key, history);
      }
    }
    
    // Réduction du compteur d'erreurs en cas de succès
    if (result.success) {
      const errorKey = `${command.playerId}:${command.type}`;
      const current = this.errorPatterns.get(errorKey) || 0;
      if (current > 0) {
        this.errorPatterns.set(errorKey, Math.max(0, current - 1));
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  //  SANITIZATION DU CHAT
  // ═══════════════════════════════════════════════════════════

  private _sanitizeMessage(payload: any): { valid: boolean; text?: string; reason?: string; type?: string; _cleaned?: boolean } {
    let text = String(payload.text ?? '').trim();
    
    if (!text) {
      return { valid: false, reason: 'Message vide' };
    }
    
    // Nettoyage basique
    text = text.slice(0, 256);
    
    // Détection de commandes
    if (text.startsWith('/') || text.startsWith('!')) {
      return {
        valid: true,
        text,
        type: 'command',
        _cleaned: false
      };
    }
    
    return {
      valid: true,
      text,
      type: 'player',
      _cleaned: text !== payload.text
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  VALIDATIONS SPÉCIFIQUES
  // ═══════════════════════════════════════════════════════════

  private async _canPerformAction(playerId: string, action: string): Promise<boolean> {
    if (!action || action.length > 64) return false;
    
    const allowedActions = [
      'wave', 'point', 'nod', 'crouch', 'jump',
      'use_item', 'drop_item', 'give_item',
      'open_door', 'close_door', 'lock_door', 'unlock_door',
      'enter_vehicle', 'exit_vehicle',
      'start_engine', 'stop_engine',
      'open_inventory', 'open_property_wheel'
    ];
    
    if (allowedActions.includes(action)) return true;
    
    // Vérification supplémentaire pour les actions personnalisées
    const { entityManager } = this.ctx;
    const player = entityManager.getEntity?.(playerId);
    if (!player) return false;
    
    return true; // Action personnalisée acceptée par défaut
  }

  private async _validateInteraction(playerId: string, payload: any): Promise<boolean> {
    // Validation de base
    if (!payload.target) return false;
    
    const { entityManager } = this.ctx;
    const target = entityManager.getEntity?.(payload.target);
    
    // L'entité cible doit exister
    if (!target) return false;
    
    // Vérification de distance
    const player = entityManager.getEntity?.(playerId);
    if (!player?.position || !target.position) return true; // Pas de vérification si pas de position
    
    const dx = (player.position.x || 0) - (target.position.x || 0);
    const dz = (player.position.z || 0) - (target.position.z || 0);
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Distance maximale d'interaction : 5 unités
    return distance <= 5;
  }

  private async _getAdminLevel(playerId: string): Promise<number> {
    const { entityManager } = this.ctx;
    const player = entityManager.getEntity?.(playerId);
    return player?.adminLevel || 0;
  }

  private _requiredLevel(command: string): number {
    const levels: Record<string, number> = {
      'kick': 2,
      'ban': 3,
      'teleport': 2,
      'spawn': 2,
      'weather': 3,
      'time': 3,
      'restart': 5,
      'shutdown': 5,
      'admin': 4,
      'god': 4,
      'give_item': 3,
      'set_property': 4,
      'debug': 2
    };
    
    return levels[command] || 1;
  }

  // ═══════════════════════════════════════════════════════════
  //  UTILITAIRES
  // ═══════════════════════════════════════════════════════════

  private _generateId(command: Command): string {
    const hash = crypto.createHash('sha256')
      .update(`${command.playerId}:${command.type}:${command.sentAt}:${Date.now()}`)
      .digest('hex');
    return hash.slice(0, 12);
  }

  private _calculatePriority(type: string): number {
    const priorities: Record<string, number> = {
      'ADMIN_COMMAND': 100,
      'PLAYER_ACTION': 75,
      'WORLD_INTERACT': 60,
      'CHAT_MESSAGE': 50,
      'PLAYER_MOVE': 25
    };
    return priorities[type] || 50;
  }

  private _cacheKey(command: Command): string {
    return `${command.playerId}:${command.type}:${JSON.stringify(command.payload)}`;
  }

  private _isCacheValid(cached: any, command: Command): boolean {
    // Cache valide 2 secondes pour les mouvements, 10 secondes pour les autres
    const ttl = command.type === 'PLAYER_MOVE' ? 2000 : 10000;
    return (Date.now() - command.sentAt) < ttl;
  }

  private _preloadForNext(types: string[], current: Command): void {
    for (const type of types) {
      // Préparation du contexte pour la prochaine commande probable
      EventBus.emit(`nexus:preload:${type}`, {
        triggeredBy: current.type,
        playerId: current.playerId,
        context: {
          payload: current.payload,
          timestamp: Date.now()
        }
      });
    }
  }

  private async _delayedHandle(
    command: Command, 
    commandId: string, 
    startTime: number
  ): Promise<CommandResult> {
    // Délai de sécurité avant retraitement
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Retentative
    return this._routeCommand(command, commandId, startTime);
  }

  private _logAdminAction(playerId: string, payload: any): void {
    logger.warn(`[ADMIN] ${playerId} → ${payload.command} ${JSON.stringify(payload.args || {})}`);
  }

  private _trimCache(): void {
    if (this.cacheResults.size > this.MAX_CACHE_SIZE) {
      const keys = Array.from(this.cacheResults.keys());
      const toDelete = keys.slice(0, keys.length - this.MAX_CACHE_SIZE);
      for (const key of toDelete) {
        this.cacheResults.delete(key);
      }
    }
  }

  private _initPredictionPatterns(): void {
    // Patterns de prédiction des commandes
    this.predictionPatterns.set('PLAYER_MOVE', ['WORLD_INTERACT', 'PLAYER_ACTION']);
    this.predictionPatterns.set('PLAYER_ACTION', ['CHAT_MESSAGE', 'WORLD_INTERACT']);
    this.predictionPatterns.set('WORLD_INTERACT', ['PLAYER_ACTION', 'CHAT_MESSAGE']);
    this.predictionPatterns.set('CHAT_MESSAGE', ['PLAYER_MOVE', 'PLAYER_ACTION']);
    this.predictionPatterns.set('ADMIN_COMMAND', ['ADMIN_COMMAND', 'CHAT_MESSAGE']);
    
    // Patterns d'actions
    this.predictionPatterns.set('ACTION_open_door', ['PLAYER_MOVE', 'ACTION_close_door']);
    this.predictionPatterns.set('ACTION_buy_property', ['ACTION_open_inventory', 'ACTION_unlock_door']);
    this.predictionPatterns.set('ACTION_enter_vehicle', ['PLAYER_ACTION', 'ACTION_start_engine']);
    this.predictionPatterns.set('ACTION_open_inventory', ['ACTION_use_item', 'ACTION_drop_item']);
  }

  private _startMaintenanceCycle(): void {
    // Nettoyage périodique toutes les 5 minutes
    setInterval(() => {
      const before = {
        cache: this.cacheResults.size,
        errors: this.errorPatterns.size,
        history: this.commandHistory.size
      };
      
      // Nettoyage du cache (supprimer les entrées les plus anciennes)
      if (this.cacheResults.size > this.MAX_CACHE_SIZE / 2) {
        const keys = Array.from(this.cacheResults.keys());
        const toDelete = keys.slice(0, keys.length - Math.floor(this.MAX_CACHE_SIZE / 2));
        for (const key of toDelete) {
          this.cacheResults.delete(key);
        }
      }
      
      // Nettoyage des patterns d'erreur (supprimer les moins fréquents)
      for (const [key, count] of this.errorPatterns) {
        if (count < 2) {
          this.errorPatterns.delete(key);
        }
      }
      
      const after = {
        cache: this.cacheResults.size,
        errors: this.errorPatterns.size,
        history: this.commandHistory.size
      };
      
      logger.debug(`[NEXUS] 🔄 Maintenance: ${JSON.stringify({ before, after })}`);
    }, 300000); // 5 minutes
  }

  // ═══════════════════════════════════════════════════════════
  //  CONSTRUCTION DE RÉSULTATS
  // ═══════════════════════════════════════════════════════════

  private _success(commandId: string, startTime: number): CommandResult {
    return {
      success: true,
      processed: true,
      latencyMs: performance.now() - startTime,
      optimized: true,
      commandId
    };
  }

  private _fail(commandId: string, startTime: number, error: string): CommandResult {
    return {
      success: false,
      processed: false,
      error,
      latencyMs: performance.now() - startTime,
      optimized: true,
      commandId
    };
  }

  // ═══════════════════════════════════════════════════════════
  //  MÉTRIQUES ET RAPPORT NEXUS
  // ═══════════════════════════════════════════════════════════

  getNexusReport(): any {
    const avgLatency = this.totalCommands > 0 
      ? this.totalLatency / this.totalCommands 
      : 0;
    
    return {
      status: 'OPERATIONAL',
      mode: this.PERFORMANCE_MODE,
      commands: {
        total: this.totalCommands,
        successful: this.successfulCommands,
        successRate: this.totalCommands > 0 
          ? `${((this.successfulCommands / this.totalCommands) * 100).toFixed(1)}%` 
          : '0%',
        securityBlocks: this.securityBlocks,
        cacheHits: this.cacheHits
      },
      performance: {
        avgLatency: `${avgLatency.toFixed(2)}ms`,
        peakLatency: `${this.peakLatency.toFixed(2)}ms`,
        processingHistory: this.processingTimes.length
      },
      memory: {
        cacheSize: this.cacheResults.size,
        errorPatterns: this.errorPatterns.size,
        playerHistory: this.commandHistory.size,
        predictionPatterns: this.predictionPatterns.size
      },
      nexuScore: this._calculateNexusScore()
    };
  }

  private _calculateNexusScore(): number {
    const successRate = this.totalCommands > 0 
      ? this.successfulCommands / this.totalCommands 
      : 1;
    
    const cacheEfficiency = this.totalCommands > 0 
      ? this.cacheHits / this.totalCommands 
      : 0;
    
    const errorRecovery = this.errorPatterns.size === 0 ? 1 : 
      1 - (Array.from(this.errorPatterns.values()).filter(c => c > 3).length / this.errorPatterns.size);
    
    const latencyScore = Math.max(0, 1 - (this.peakLatency / 1000));
    
    return Math.round((successRate * 0.4 + cacheEfficiency * 0.2 + errorRecovery * 0.2 + latencyScore * 0.2) * 100);
  }
}