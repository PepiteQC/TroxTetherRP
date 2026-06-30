/**
 * CommandLogger.ts
 * ----------------------------------------------------------------------------
 * Journalisation complète des commandes admin (audit trail).
 */

/** Entrée unique du journal. */
export interface CommandLog {
  id: string;
  timestamp: number;
  /** ISO 8601 pour lecture humaine. */
  isoTime: string;
  adminId: string;
  adminName: string;
  commandName: string;
  /** Ligne brute saisie. */
  rawCommand: string;
  /** Cible affectée (joueur, etc.) si applicable. */
  target?: string;
  success: boolean;
  message: string;
  /** Données structurées additionnelles. */
  data?: Record<string, any>;
}

export interface LogFilter {
  adminId?: string;
  commandName?: string;
  target?: string;
  success?: boolean;
  /** Bornes temporelles (timestamps ms). */
  from?: number;
  to?: number;
}

export interface LogStats {
  total: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  byCommand: Record<string, number>;
  byAdmin: Record<string, number>;
  firstLog?: number;
  lastLog?: number;
}

export type LogListener = (log: CommandLog) => void;

export class CommandLogger {
  private logs: CommandLog[] = [];
  private listeners = new Set<LogListener>();
  private readonly limit: number;
  private seq = 0;

  constructor(options?: { limit?: number }) {
    this.limit = options?.limit ?? 10_000;
  }

  // --------------------------------------------------------------------- //
  //  Écriture
  // --------------------------------------------------------------------- //

  log(entry: Omit<CommandLog, "id" | "timestamp" | "isoTime">): CommandLog {
    const timestamp = Date.now();
    const full: CommandLog = {
      ...entry,
      id: `log_${timestamp}_${this.seq++}`,
      timestamp,
      isoTime: new Date(timestamp).toISOString(),
    };

    this.logs.push(full);

    // Respect de la limite (FIFO).
    if (this.logs.length > this.limit) {
      this.logs.splice(0, this.logs.length - this.limit);
    }

    // Notifie les abonnés (sans casser le flux si l'un lève une erreur).
    for (const listener of this.listeners) {
      try {
        listener(full);
      } catch {
        /* listener défaillant ignoré */
      }
    }

    return full;
  }

  /**
   * Insère un log déjà constitué (ex: rechargé depuis le storage / un backup),
   * sans régénérer son id ni notifier les listeners. Respecte la limite.
   */
  ingest(log: CommandLog): void {
    this.logs.push(log);
    if (this.logs.length > this.limit) {
      this.logs.splice(0, this.logs.length - this.limit);
    }
  }

  // --------------------------------------------------------------------- //
  //  Lecture / filtres
  // --------------------------------------------------------------------- //

  getLogs(filter?: LogFilter): CommandLog[] {
    if (!filter) return [...this.logs];
    return this.logs.filter((l) => {
      if (filter.adminId && l.adminId !== filter.adminId) return false;
      if (
        filter.commandName &&
        l.commandName.toLowerCase() !== filter.commandName.toLowerCase()
      )
        return false;
      if (filter.target && l.target !== filter.target) return false;
      if (filter.success !== undefined && l.success !== filter.success) return false;
      if (filter.from !== undefined && l.timestamp < filter.from) return false;
      if (filter.to !== undefined && l.timestamp > filter.to) return false;
      return true;
    });
  }

  /** Les N logs les plus récents (par défaut 50). */
  getRecentLogs(count = 50): CommandLog[] {
    return this.logs.slice(-count).reverse();
  }

  /** Logs d'un admin donné. */
  getAdminLogs(adminId: string): CommandLog[] {
    return this.getLogs({ adminId });
  }

  /** Logs d'une commande donnée. */
  getCommandLogs(commandName: string): CommandLog[] {
    return this.getLogs({ commandName });
  }

  /** Logs concernant un joueur ciblé (audit joueur). */
  getPlayerLogs(playerNameOrId: string): CommandLog[] {
    return this.logs.filter(
      (l) =>
        l.target === playerNameOrId ||
        l.data?.targetId === playerNameOrId ||
        l.data?.targetName === playerNameOrId
    );
  }

  // --------------------------------------------------------------------- //
  //  Export
  // --------------------------------------------------------------------- //

  /** Export JSON (string formaté). */
  exportLogs(filter?: LogFilter): string {
    return JSON.stringify(this.getLogs(filter), null, 2);
  }

  /** Export CSV (échappement correct des champs). */
  exportLogsCSV(filter?: LogFilter): string {
    const rows = this.getLogs(filter);
    const headers = [
      "id",
      "isoTime",
      "adminId",
      "adminName",
      "commandName",
      "target",
      "success",
      "message",
      "rawCommand",
    ];
    const escape = (v: unknown): string => {
      const s = v === undefined || v === null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [headers.join(",")];
    for (const l of rows) {
      lines.push(
        [
          l.id,
          l.isoTime,
          l.adminId,
          l.adminName,
          l.commandName,
          l.target ?? "",
          l.success,
          l.message,
          l.rawCommand,
        ]
          .map(escape)
          .join(",")
      );
    }
    return lines.join("\n");
  }

  // --------------------------------------------------------------------- //
  //  Statistiques / rapport
  // --------------------------------------------------------------------- //

  getStats(filter?: LogFilter): LogStats {
    const logs = this.getLogs(filter);
    const byCommand: Record<string, number> = {};
    const byAdmin: Record<string, number> = {};
    let successCount = 0;

    for (const l of logs) {
      byCommand[l.commandName] = (byCommand[l.commandName] ?? 0) + 1;
      byAdmin[l.adminName] = (byAdmin[l.adminName] ?? 0) + 1;
      if (l.success) successCount++;
    }

    return {
      total: logs.length,
      successCount,
      failureCount: logs.length - successCount,
      successRate: logs.length ? successCount / logs.length : 0,
      byCommand,
      byAdmin,
      firstLog: logs[0]?.timestamp,
      lastLog: logs[logs.length - 1]?.timestamp,
    };
  }

  /** Rapport textuel formaté, lisible dans la console. */
  generateReport(filter?: LogFilter): string {
    const stats = this.getStats(filter);
    const lines: string[] = [];
    lines.push("=== RAPPORT CONSOLE ADMIN ===");
    lines.push(`Généré le        : ${new Date().toISOString()}`);
    lines.push(`Total de logs    : ${stats.total}`);
    lines.push(`Succès           : ${stats.successCount}`);
    lines.push(`Échecs           : ${stats.failureCount}`);
    lines.push(`Taux de succès   : ${(stats.successRate * 100).toFixed(1)}%`);
    if (stats.firstLog)
      lines.push(`Premier log      : ${new Date(stats.firstLog).toISOString()}`);
    if (stats.lastLog)
      lines.push(`Dernier log      : ${new Date(stats.lastLog).toISOString()}`);

    lines.push("");
    lines.push("--- Commandes les plus utilisées ---");
    for (const [name, n] of Object.entries(stats.byCommand).sort((a, b) => b[1] - a[1])) {
      lines.push(`  ${name.padEnd(16)} ${n}`);
    }

    lines.push("");
    lines.push("--- Activité par admin ---");
    for (const [name, n] of Object.entries(stats.byAdmin).sort((a, b) => b[1] - a[1])) {
      lines.push(`  ${name.padEnd(16)} ${n}`);
    }

    return lines.join("\n");
  }

  // --------------------------------------------------------------------- //
  //  Callbacks
  // --------------------------------------------------------------------- //

  /** Abonne un listener. Retourne une fonction de désinscription. */
  onCommandLogged(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --------------------------------------------------------------------- //
  //  Nettoyage
  // --------------------------------------------------------------------- //

  clearLogs(): void {
    this.logs = [];
  }

  /** Supprime les logs plus vieux que maxAgeMs. Retourne le nombre supprimé. */
  clearOldLogs(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    const before = this.logs.length;
    this.logs = this.logs.filter((l) => l.timestamp >= cutoff);
    return before - this.logs.length;
  }

  get count(): number {
    return this.logs.length;
  }
}

export default CommandLogger;