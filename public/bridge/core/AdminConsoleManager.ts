/**
 * AdminConsoleManager.ts
 * ----------------------------------------------------------------------------
 * Orchestrateur central : compose le Parser + le système de Permissions + le
 * Logger en une API unique et simple à consommer depuis le jeu / l'UI.
 *
 *  - Constructor avec config
 *  - initializeAdmin()
 *  - executeCommand() (orchestration complète + audit)
 *  - registerCustomCommand()
 *  - getAvailableCommands(), hasPermission()
 *  - getLogs(), generateReport(), exportLogs(), exportLogsCSV()
 *  - setEnabled() (enable/disable global)
 *  - onCommandLogged()
 *  - getStats(), cleanupOldLogs()
 *  - getConsoleInfo() (rapport d'état)
 *  - Gestion de la config (enableLogging, logToConsole, ...)
 * ----------------------------------------------------------------------------
 */

import { AllCommands } from "../commands/StandardCommands";
import {
  AdminFlag,
  Admin,
  PermissionLevel,
  PermissionSystem,
  ResolvedPermissions,
} from "../permissions/PermissionSystem";
import {
  CommandContext,
  CommandDefinition,
  CommandError,
  CommandNotFoundError,
  CommandParser,
  CommandResult,
  InsufficientPermissionsError,
  Player,
} from "./CommandParser";
import {
  CommandLog,
  CommandLogger,
  LogFilter,
  LogListener,
  LogStats,
} from "./CommandLogger";
import {
  FullBackup,
  StorageAdapter,
} from "../storage/StorageAdapter";

export interface AdminConsoleConfig {
  /** Active la journalisation. */
  enableLogging?: boolean;
  /** Reflète aussi les logs dans la console JS (console.log). */
  logToConsole?: boolean;
  /** Limite de l'historique du parser. */
  historyLimit?: number;
  /** Limite du nombre de logs. */
  logLimit?: number;
  /** Charge automatiquement les commandes standard. */
  loadStandardCommands?: boolean;
  /** Adaptateur de jeu transmis à chaque commande. */
  gameAdapter?: Record<string, any>;
  /** Résolveur de joueur (nom/id -> Player). */
  resolvePlayer?: (query: string) => Player | undefined;
  /** Adaptateur de persistance (Firestore, mémoire, ...). */
  storage?: StorageAdapter;
  /** Persiste chaque log immédiatement (sinon : par lots via flush). */
  persistImmediately?: boolean;
  /** Taille du buffer avant flush automatique (si persistImmediately=false). */
  persistBatchSize?: number;
  /**
   * Fournisseurs d'état sérialisable pour les sauvegardes globales.
   * Ex: { regions: () => regionSystem.toState(), economy: ... }
   */
  stateProviders?: Record<string, () => unknown>;
  /** Consommateurs d'état pour la restauration. */
  stateLoaders?: Record<string, (data: unknown) => void>;
}

export interface ExecutionOutcome extends CommandResult {
  /** Le log généré (si la journalisation est active). */
  log?: CommandLog;
}

export class AdminConsoleManager {
  readonly permissions: PermissionSystem;
  readonly parser: CommandParser;
  readonly logger: CommandLogger;

  private enabled = true;
  private config: {
    enableLogging: boolean;
    logToConsole: boolean;
    historyLimit: number;
    logLimit: number;
    loadStandardCommands: boolean;
    persistImmediately: boolean;
    persistBatchSize: number;
    gameAdapter?: Record<string, any>;
    resolvePlayer?: (query: string) => Player | undefined;
    storage?: StorageAdapter;
    stateProviders: Record<string, () => unknown>;
    stateLoaders: Record<string, (data: unknown) => void>;
  };

  /** Buffer de logs en attente de persistance par lots. */
  private persistBuffer: CommandLog[] = [];

  constructor(config: AdminConsoleConfig = {}) {
    this.config = {
      enableLogging: config.enableLogging ?? true,
      logToConsole: config.logToConsole ?? false,
      historyLimit: config.historyLimit ?? 100,
      logLimit: config.logLimit ?? 10_000,
      loadStandardCommands: config.loadStandardCommands ?? true,
      persistImmediately: config.persistImmediately ?? true,
      persistBatchSize: config.persistBatchSize ?? 25,
      gameAdapter: config.gameAdapter,
      resolvePlayer: config.resolvePlayer,
      storage: config.storage,
      stateProviders: config.stateProviders ?? {},
      stateLoaders: config.stateLoaders ?? {},
    };

    this.permissions = new PermissionSystem();
    this.logger = new CommandLogger({ limit: this.config.logLimit });
    this.parser = new CommandParser(this.permissions, {
      historyLimit: this.config.historyLimit,
    });

    if (this.config.loadStandardCommands) {
      this.parser.registerCommands(AllCommands);
    }

    // Persistance automatique des logs vers le storage.
    if (this.config.storage) {
      this.logger.onCommandLogged((log) => void this.persist(log));
    }
  }

  // --------------------------------------------------------------------- //
  //  Persistance (storage adapter)
  // --------------------------------------------------------------------- //

  private async persist(log: CommandLog): Promise<void> {
    const storage = this.config.storage;
    if (!storage) return;
    if (this.config.persistImmediately) {
      try {
        await storage.appendLog(log);
      } catch {
        /* ne pas casser le flux de jeu sur erreur réseau */
      }
      return;
    }
    this.persistBuffer.push(log);
    if (this.persistBuffer.length >= this.config.persistBatchSize) {
      await this.flushLogs();
    }
  }

  /** Vide le buffer de logs vers le storage. */
  async flushLogs(): Promise<void> {
    const storage = this.config.storage;
    if (!storage || this.persistBuffer.length === 0) return;
    const batch = this.persistBuffer;
    this.persistBuffer = [];
    try {
      await storage.appendLogs(batch);
    } catch {
      // remet en buffer en cas d'échec (best effort)
      this.persistBuffer.unshift(...batch);
    }
  }

  /** Définit / remplace l'adaptateur de stockage. */
  setStorage(storage: StorageAdapter): void {
    this.config.storage = storage;
  }

  /** Charge les logs depuis le storage dans le logger mémoire. */
  async loadLogsFromStorage(filter?: LogFilter, limit?: number): Promise<number> {
    const storage = this.config.storage;
    if (!storage) return 0;
    const logs = await storage.queryLogs(filter, limit);
    for (const log of logs) this.logger.ingest(log);
    return logs.length;
  }

  // --------------------------------------------------------------------- //
  //  Sauvegarde / restauration globale
  // --------------------------------------------------------------------- //

  /** Crée une sauvegarde complète (logs + états enregistrés). */
  async createBackup(): Promise<FullBackup> {
    await this.flushLogs();
    // Persiste d'abord l'état courant des sous-systèmes.
    if (this.config.storage) {
      for (const [key, provider] of Object.entries(this.config.stateProviders)) {
        await this.config.storage.saveState(key, provider());
      }
      return this.config.storage.createBackup();
    }
    // Sans storage : backup en mémoire à partir des providers + logger.
    return {
      createdAt: Date.now(),
      version: "1.0.0",
      logs: this.logger.getLogs(),
      states: Object.entries(this.config.stateProviders).map(([key, p]) => ({
        key,
        data: p(),
        updatedAt: Date.now(),
        version: 1,
      })),
    };
  }

  /** Restaure une sauvegarde (logs + états -> sous-systèmes). */
  async restoreBackup(backup: FullBackup): Promise<void> {
    if (this.config.storage) {
      await this.config.storage.restoreBackup(backup);
    }
    // Recharge le logger mémoire.
    this.logger.clearLogs();
    for (const log of backup.logs) this.logger.ingest(log);
    // Réinjecte les états dans les sous-systèmes.
    for (const state of backup.states) {
      const loader = this.config.stateLoaders[state.key];
      if (loader) loader(state.data);
    }
  }

  /** Enregistre un fournisseur/consommateur d'état pour les backups. */
  registerStateProvider(
    key: string,
    provider: () => unknown,
    loader?: (data: unknown) => void
  ): void {
    this.config.stateProviders[key] = provider;
    if (loader) this.config.stateLoaders[key] = loader;
  }

  // --------------------------------------------------------------------- //
  //  Admins
  // --------------------------------------------------------------------- //

  /** Enregistre un admin et retourne l'objet créé. */
  initializeAdmin(
    id: string,
    name: string,
    level: PermissionLevel,
    options?: { flags?: AdminFlag[]; addedBy?: string }
  ): Admin {
    return this.permissions.registerAdmin(id, name, level, options);
  }

  hasPermission(userId: string, flag: AdminFlag): boolean {
    return this.permissions.hasPermission(userId, flag);
  }

  getUserPermissions(userId: string): ResolvedPermissions {
    return this.permissions.getUserPermissions(userId);
  }

  // --------------------------------------------------------------------- //
  //  Commandes
  // --------------------------------------------------------------------- //

  registerCustomCommand(def: CommandDefinition): void {
    this.parser.registerCommand(def);
  }

  registerCustomCommands(defs: CommandDefinition[]): void {
    this.parser.registerCommands(defs);
  }

  getAvailableCommands(userId: string): CommandDefinition[] {
    return this.parser.getAvailableCommands(userId);
  }

  /** Construit le contexte enrichi pour les handlers. */
  private buildContext(senderId: string, senderName: string): CommandContext {
    // On enrichit l'adaptateur jeu avec quelques helpers internes
    // (registre des commandes + accès aux permissions) pour `help`, `perms`...
    const game: Record<string, any> = {
      ...(this.config.gameAdapter ?? {}),
      __commandRegistry: this.parser.getAllCommands(),
      getUserPermissions: (id: string) => this.permissions.getUserPermissions(id),
    };

    return {
      senderId,
      senderName,
      resolvePlayer: this.config.resolvePlayer,
      game,
    };
  }

  /**
   * Exécute une commande de bout en bout :
   *   parsing -> permissions -> exécution -> audit.
   * Ne lève jamais : retourne toujours un ExecutionOutcome.
   */
  async executeCommand(
    raw: string,
    sender: { id: string; name: string }
  ): Promise<ExecutionOutcome> {
    if (!this.enabled) {
      return { success: false, message: "⛔ La console admin est désactivée." };
    }

    const ctx = this.buildContext(sender.id, sender.name);
    let commandName = "?";

    try {
      const parsed = this.parser.parseCommand(raw);
      commandName = parsed.name;

      const result = await this.parser.executeCommand(raw, ctx);
      const log = this.writeLog({
        adminId: sender.id,
        adminName: sender.name,
        commandName,
        rawCommand: raw,
        success: result.success,
        message: result.message,
        target: result.target,
        data: result.data,
      });
      return { ...result, log };
    } catch (err) {
      const message = this.describeError(err);
      const log = this.writeLog({
        adminId: sender.id,
        adminName: sender.name,
        commandName,
        rawCommand: raw,
        success: false,
        message,
      });
      return { success: false, message, log };
    }
  }

  private describeError(err: unknown): string {
    if (err instanceof CommandNotFoundError) return `❌ ${err.message}`;
    if (err instanceof InsufficientPermissionsError) return `🔒 ${err.message}`;
    if (err instanceof CommandError) return `⚠️  ${err.message}`;
    if (err instanceof Error) return `💥 Erreur : ${err.message}`;
    return "💥 Erreur inconnue.";
  }

  private writeLog(
    entry: Omit<CommandLog, "id" | "timestamp" | "isoTime">
  ): CommandLog | undefined {
    if (!this.config.enableLogging) return undefined;
    const log = this.logger.log(entry);
    if (this.config.logToConsole) {
      const tag = log.success ? "✅" : "❌";
      // eslint-disable-next-line no-console
      console.log(`[AdminConsole] ${tag} ${log.adminName}: ${log.rawCommand} -> ${log.message}`);
    }
    return log;
  }

  // --------------------------------------------------------------------- //
  //  Logs / rapports
  // --------------------------------------------------------------------- //

  getLogs(filter?: LogFilter): CommandLog[] {
    return this.logger.getLogs(filter);
  }

  generateReport(filter?: LogFilter): string {
    return this.logger.generateReport(filter);
  }

  exportLogs(filter?: LogFilter): string {
    return this.logger.exportLogs(filter);
  }

  exportLogsCSV(filter?: LogFilter): string {
    return this.logger.exportLogsCSV(filter);
  }

  getStats(filter?: LogFilter): LogStats {
    return this.logger.getStats(filter);
  }

  cleanupOldLogs(maxAgeMs: number): number {
    return this.logger.clearOldLogs(maxAgeMs);
  }

  onCommandLogged(listener: LogListener): () => void {
    return this.logger.onCommandLogged(listener);
  }

  // --------------------------------------------------------------------- //
  //  État
  // --------------------------------------------------------------------- //

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setGameAdapter(adapter: Record<string, any>): void {
    this.config.gameAdapter = adapter;
  }

  setPlayerResolver(resolver: (q: string) => Player | undefined): void {
    this.config.resolvePlayer = resolver;
  }

  /** Rapport d'état global de la console. */
  getConsoleInfo(): string {
    const cmds = this.parser.getAllCommands();
    const admins = this.permissions.getAllAdmins();
    const lines = [
      "=== INFORMATIONS CONSOLE ADMIN ===",
      `Activée          : ${this.enabled ? "oui" : "non"}`,
      `Journalisation   : ${this.config.enableLogging ? "oui" : "non"}`,
      `Logs en console  : ${this.config.logToConsole ? "oui" : "non"}`,
      `Commandes        : ${cmds.length}`,
      `Admins           : ${admins.length}`,
      `Logs stockés     : ${this.logger.count}`,
      `Stockage         : ${this.config.storage?.name ?? "(aucun)"}`,
      `Persistance      : ${this.config.persistImmediately ? "immédiate" : "par lots"}`,
      `Limite historique: ${this.config.historyLimit}`,
      `Limite logs      : ${this.config.logLimit}`,
    ];
    return lines.join("\n");
  }
}

export default AdminConsoleManager;