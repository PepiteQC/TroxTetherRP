// src/systems/security/anticheat/AntiCheatEngine.ts

import { EventEmitter } from "@/core/EventEmitter";
import { ThirdEye } from "@/agents/ThirdEye";
import { AuditTrail } from "@/agents/AuditTrail";

export interface SecurityProfile {
  uid: string;
  trustScore: number;
  totalViolations: number;
  isBanned: boolean;
  isWatched: boolean;
  violations: ViolationRecord[];
  lastKnownIP?: string;
  sessionId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ViolationRecord {
  type: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: number;
  evidence?: Record<string, unknown>;
}

export interface BanRecord {
  playerId: string;
  reason: string;
  executorId: string;
  executorName: string;
  timestamp: number;
  duration?: number; // Infinity for permaban
  expiresAt?: number;
}

export interface ReportRecord {
  id: string;
  reporterId: string;
  reporterName: string;
  targetId: string;
  targetName: string;
  reason: string;
  timestamp: number;
  status: "pending" | "reviewed" | "dismissed" | "actioned";
}

export interface AntiCheatConfig {
  autoBanThreshold: number;
  autoKickThreshold: number;
  trustDecayRate: number;
  trustRecoveryRate: number;
  scanInterval: number;
  enableAutoBan: boolean;
  enableLogging: boolean;
  maxViolationsBeforeBan: number;
}

export class AntiCheatEngine extends EventEmitter {
  private static instance: AntiCheatEngine | null = null;
  
  private profiles: Map<string, SecurityProfile> = new Map();
  private bans: Map<string, BanRecord> = new Map();
  private reports: ReportRecord[] = [];
  
  private config: AntiCheatConfig = {
    autoBanThreshold: 20,
    autoKickThreshold: 50,
    trustDecayRate: 5,
    trustRecoveryRate: 1,
    scanInterval: 60000, // 1 minute
    enableAutoBan: true,
    enableLogging: true,
    maxViolationsBeforeBan: 10,
  };

  private scanTimer: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.startAutoScan();
  }

  static getInstance(): AntiCheatEngine {
    if (!this.instance) {
      this.instance = new AntiCheatEngine();
    }
    return this.instance;
  }

  // ═══ PROFILE MANAGEMENT ═══

  getProfile(uid: string): SecurityProfile | null {
    return this.profiles.get(uid) || null;
  }

  getOrCreateProfile(uid: string): SecurityProfile {
    if (!this.profiles.has(uid)) {
      const profile: SecurityProfile = {
        uid,
        trustScore: 100,
        totalViolations: 0,
        isBanned: false,
        isWatched: false,
        violations: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.profiles.set(uid, profile);
    }
    return this.profiles.get(uid)!;
  }

  getAllProfiles(): SecurityProfile[] {
    return Array.from(this.profiles.values());
  }

  resetProfile(uid: string): void {
    const profile = this.profiles.get(uid);
    if (profile) {
      profile.trustScore = 100;
      profile.totalViolations = 0;
      profile.violations = [];
      profile.isWatched = false;
      profile.updatedAt = Date.now();
      this.emit("profile:reset", { uid });
    }
  }

  // ═══ VIOLATION TRACKING ═══

  recordViolation(
    uid: string,
    type: string,
    description: string,
    severity: ViolationRecord["severity"],
    evidence?: Record<string, unknown>
  ): void {
    const profile = this.getOrCreateProfile(uid);
    
    const violation: ViolationRecord = {
      type,
      description,
      severity,
      timestamp: Date.now(),
      evidence,
    };

    profile.violations.push(violation);
    profile.totalViolations++;
    profile.updatedAt = Date.now();

    // Adjust trust score based on severity
    const trustDeduction = {
      low: 5,
      medium: 15,
      high: 30,
      critical: 50,
    }[severity];

    profile.trustScore = Math.max(0, profile.trustScore - trustDeduction);

    // Auto-actions based on trust score
    if (profile.trustScore <= this.config.autoBanThreshold && this.config.enableAutoBan) {
      this.banPlayer({
        playerId: uid,
        reason: `Auto-ban: Trust score trop bas (${profile.trustScore}%)`,
        executorId: "system",
        executorName: "AntiCheat System",
      });
    }

    if (profile.isWatched) {
      ThirdEye.alert({
        type: "violation_detected",
        playerId: uid,
        violation,
        trustScore: profile.trustScore,
      });
    }

    if (this.config.enableLogging) {
      AuditTrail.log({
        action: "violation_recorded",
        target: uid,
        violation,
        trustScore: profile.trustScore,
        timestamp: Date.now(),
      });
    }

    this.emit("violation:recorded", { uid, violation, profile });
  }

  // ═══ SUSPECT MANAGEMENT ═══

  getSuspects(): SecurityProfile[] {
    return Array.from(this.profiles.values()).filter(
      p => p.trustScore < 70 || p.totalViolations >= 3
    );
  }

  getBannedPlayers(): SecurityProfile[] {
    return Array.from(this.profiles.values()).filter(p => p.isBanned);
  }

  getWatchedPlayers(): SecurityProfile[] {
    return Array.from(this.profiles.values()).filter(p => p.isWatched);
  }

  flagPlayer(uid: string, reason: string): void {
    const profile = this.getOrCreateProfile(uid);
    profile.isWatched = true;
    profile.updatedAt = Date.now();
    
    this.emit("player:flagged", { uid, reason });
  }

  unflagPlayer(uid: string): void {
    const profile = this.profiles.get(uid);
    if (profile) {
      profile.isWatched = false;
      profile.updatedAt = Date.now();
      this.emit("player:unflagged", { uid });
    }
  }

  // ═══ BAN SYSTEM ═══

  async banPlayer(options: {
    playerId: string;
    reason: string;
    executorId: string;
    executorName: string;
    duration?: number;
  }): Promise<{ success: boolean; error?: string }> {
    const profile = this.profiles.get(options.playerId);
    if (!profile) {
      return { success: false, error: "Profil introuvable" };
    }

    if (profile.isBanned) {
      return { success: false, error: "Joueur déjà banni" };
    }

    const banRecord: BanRecord = {
      playerId: options.playerId,
      reason: options.reason,
      executorId: options.executorId,
      executorName: options.executorName,
      timestamp: Date.now(),
      duration: options.duration,
      expiresAt: options.duration && options.duration !== Infinity 
        ? Date.now() + options.duration 
        : undefined,
    };

    this.bans.set(options.playerId, banRecord);
    profile.isBanned = true;
    profile.updatedAt = Date.now();

    await AuditTrail.log({
      action: "player_banned",
      target: options.playerId,
      executor: options.executorId,
      reason: options.reason,
      timestamp: Date.now(),
    });

    this.emit("player:banned", { playerId: options.playerId, ban: banRecord });

    return { success: true };
  }

  async unbanPlayer(playerId: string, executorName: string): Promise<{ success: boolean; error?: string }> {
    const profile = this.profiles.get(playerId);
    if (!profile) {
      return { success: false, error: "Profil introuvable" };
    }

    if (!profile.isBanned) {
      return { success: false, error: "Joueur non banni" };
    }

    this.bans.delete(playerId);
    profile.isBanned = false;
    profile.updatedAt = Date.now();

    await AuditTrail.log({
      action: "player_unbanned",
      target: playerId,
      executor: executorName,
      timestamp: Date.now(),
    });

    this.emit("player:unbanned", { playerId });

    return { success: true };
  }

  isBanned(uid: string): boolean {
    const profile = this.profiles.get(uid);
    if (!profile || !profile.isBanned) return false;

    const ban = this.bans.get(uid);
    if (ban?.expiresAt && Date.now() > ban.expiresAt) {
      this.unbanPlayer(uid, "system");
      return false;
    }

    return true;
  }

  // ═══ REPORT SYSTEM ═══

  async addReport(report: Omit<ReportRecord, "id" | "status">): Promise<string> {
    const reportRecord: ReportRecord = {
      ...report,
      id: `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      status: "pending",
    };

    this.reports.push(reportRecord);

    await AuditTrail.log({
      action: "player_reported",
      target: report.targetId,
      reporter: report.reporterId,
      reason: report.reason,
      timestamp: Date.now(),
    });

    this.emit("report:submitted", reportRecord);

    return reportRecord.id;
  }

  getReports(status?: ReportRecord["status"]): ReportRecord[] {
    return status 
      ? this.reports.filter(r => r.status === status)
      : this.reports;
  }

  // ═══ SCANNING ═══

  async fullScan(): Promise<{
    totalPlayers: number;
    newSuspects: SecurityProfile[];
    scanDuration: number;
  }> {
    const startTime = Date.now();
    const newSuspects: SecurityProfile[] = [];

    for (const profile of this.profiles.values()) {
      const previousTrust = profile.trustScore;
      
      // Simulated scan logic (integrate with ThirdEye agent)
      const scanResult = await ThirdEye.scanPlayer(profile.uid);
      
      if (scanResult.trustScore < previousTrust) {
        profile.trustScore = scanResult.trustScore;
        if (profile.trustScore < 70) {
          newSuspects.push(profile);
        }
      }

      // Trust recovery for clean players
      if (profile.violations.length === 0 && profile.trustScore < 100) {
        profile.trustScore = Math.min(100, profile.trustScore + this.config.trustRecoveryRate);
      }

      profile.updatedAt = Date.now();
    }

    const scanDuration = Date.now() - startTime;

    this.emit("scan:completed", { totalPlayers: this.profiles.size, newSuspects, scanDuration });

    return {
      totalPlayers: this.profiles.size,
      newSuspects,
      scanDuration,
    };
  }

  private startAutoScan(): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
    }

    this.scanTimer = setInterval(async () => {
      await this.fullScan();
    }, this.config.scanInterval);
  }

  // ═══ CONFIGURATION ═══

  getConfig(): AntiCheatConfig {
    return { ...this.config };
  }

  getConfigValue(key: keyof AntiCheatConfig): unknown {
    return this.config[key];
  }

  setConfig(key: keyof AntiCheatConfig, value: unknown): void {
    if (key in this.config) {
      (this.config[key] as unknown) = value;
      this.emit("config:changed", { key, value });
    }
  }

  // ═══ CLEANUP ═══

  dispose(): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
    }
    this.profiles.clear();
    this.bans.clear();
    this.reports = [];
    this.removeAllListeners();
  }
}

export const antiCheat = AntiCheatEngine.getInstance();