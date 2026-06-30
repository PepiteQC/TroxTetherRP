// src/systems/admin/commands/anticheat.cmd.ts

import { AuditTrail } from "@/agents/AuditTrail";
import { Player } from "@/entities/Player";
import { AntiCheatEngine } from "@/systems/security/anticheat/AntiCheatEngine";
import { CommandResult, IAdminCommand } from "../types";

export const anticheatCommand: IAdminCommand = {
  verb: "ac",
  aliases: ["anticheat", "security", "protect"],
  description: "Gérer le système anti-cheat et la sécurité",
  usage: `
    ac status                    ← Vue d'ensemble du système
    ac suspects                  ← Liste des joueurs suspects
    ac profile <joueur>          ← Profil de sécurité détaillé
    ac watch <joueur>            ← Mettre sous surveillance
    ac unwatch <joueur>          ← Retirer de la surveillance
    ac ban <joueur> [raison]     ← Bannir un joueur
    ac unban <joueur>            ← Débannir un joueur
    ac kick <joueur> [raison]    ← Expulser un joueur
    ac reset <joueur>            ← Réinitialiser le profil
    ac history <joueur>          ← Historique des violations
    ac config [key] [value]      ← Configuration du système
    ac report <joueur> <raison>  ← Signaler un joueur
    ac scan                      ← Scan complet de tous les joueurs
  `,
  minRole: "admin",
  category: "security",
  cooldown: 2000, // 2 secondes entre les commandes

  async execute(args, executor, context): Promise<CommandResult> {
    const sub = args[0]?.toLowerCase();
    const targetName = args[1];
    const reason = args.slice(2).join(" ") || "Non spécifiée";

    // ═══ LOGGING ═══
    await AuditTrail.log({
      action: "admin_command",
      subAction: `ac_${sub}`,
      executor: executor.uid,
      executorName: executor.displayName,
      target: targetName,
      timestamp: Date.now(),
      metadata: { args, sub },
    });

    switch (sub) {
      // ═══ STATUS ═══
      case "status": {
        const all = AntiCheatEngine.getAllProfiles();
        const suspects = AntiCheatEngine.getSuspects();
        const banned = AntiCheatEngine.getBannedPlayers();
        const watched = AntiCheatEngine.getWatchedPlayers();

        const avgTrust = all.length > 0
          ? (all.reduce((s, p) => s + p.trustScore, 0) / all.length).toFixed(1)
          : "N/A";

        const threatLevel = suspects.length >= 5 ? "🔴 ÉLEVÉ"
          : suspects.length >= 2 ? "🟠 MOYEN"
            : "🟢 FAIBLE";

        return {
          success: true,
          message: [
            "╔══════════════════════════════════════════╗",
            "║   🛡️ ANTI-CHEAT STATUS                   ║",
            "╠══════════════════════════════════════════╣",
            `║ Joueurs surveillés: ${String(all.length).padEnd(18)} ║`,
            `║ Suspects actifs:    ${String(suspects.length).padEnd(18)} ║`,
            `║ Joueurs bannis:     ${String(banned.length).padEnd(18)} ║`,
            `║ Sous surveillance:  ${String(watched.length).padEnd(18)} ║`,
            `║ Trust moyen:        ${String(avgTrust).padEnd(15)}% ║`,
            `║ Niveau de menace:   ${String(threatLevel).padEnd(18)} ║`,
            "╚══════════════════════════════════════════╝",
          ].join("\n"),
          type: "info",
          data: { all, suspects, banned, watched, avgTrust, threatLevel },
        };
      }

      // ═══ SUSPECTS ═══
      case "suspects": {
        const suspects = AntiCheatEngine.getSuspects();

        if (suspects.length === 0) {
          return {
            success: true,
            message: "🟢 Aucun suspect détecté — Système sécurisé",
            type: "success",
          };
        }

        const lines = suspects.map((s, i) => {
          const trustColor = s.trustScore >= 80 ? "🟢" : s.trustScore >= 50 ? "🟠" : "🔴";
          return `  ${i + 1}. ${trustColor} ${s.uid.slice(0, 12)} | Trust: ${s.trustScore}% | Violations: ${s.totalViolations} | ${s.isWatched ? "👁️ WATCH" : ""}`;
        });

        return {
          success: true,
          message: [`🔍 SUSPECTS (${suspects.length}):`, ...lines].join("\n"),
          type: "warning",
          data: { suspects },
        };
      }

      // ═══ PROFILE ═══
      case "profile": {
        if (!targetName) {
          return {
            success: false,
            message: "❌ Usage: ac profile <joueur>",
            type: "error",
          };
        }

        const player = findPlayer(targetName, context.players);
        if (!player) {
          return {
            success: false,
            message: `❌ Joueur "${targetName}" introuvable`,
            type: "error",
          };
        }

        const profile = AntiCheatEngine.getProfile(player.uid);
        if (!profile) {
          return {
            success: true,
            message: `ℹ️ Aucun profil de sécurité pour ${player.displayName}`,
            type: "info",
          };
        }

        const trustColor = profile.trustScore >= 80 ? "🟢" : profile.trustScore >= 50 ? "🟠" : "🔴";
        const recentViolations = profile.violations.slice(-5);

        return {
          success: true,
          message: [
            "╔══════════════════════════════════════════╗",
            `║   🛡️ PROFIL: ${player.displayName.padEnd(28)} ║`,
            "╠══════════════════════════════════════════╣",
            `║ UID:        ${player.uid.slice(0, 16).padEnd(26)} ║`,
            `║ ${trustColor} Trust Score: ${String(profile.trustScore).padEnd(22)}% ║`,
            `║ Violations: ${String(profile.totalViolations).padEnd(26)} ║`,
            `║ Banni:      ${String(profile.isBanned ? "OUI ❌" : "NON ✅").padEnd(26)} ║`,
            `║ Surveillé:  ${String(profile.isWatched ? "OUI 👁️" : "NON").padEnd(26)} ║`,
            `║ IP:         ${String(profile.lastKnownIP || "N/A").padEnd(26)} ║`,
            `║ Session:    ${String(profile.sessionId?.slice(0, 12) || "N/A").padEnd(26)} ║`,
            "╠══════════════════════════════════════════╣",
            "║ Dernières violations (5):                ║",
            ...recentViolations.map(v =>
              `║   • ${v.type.padEnd(20)} ${String(v.severity).padEnd(10)} ║`
            ),
            recentViolations.length === 0 ? "║   (Aucune)                           ║" : "",
            "╚══════════════════════════════════════════╝",
          ].join("\n"),
          type: "info",
          data: { profile, player },
        };
      }

      // ═══ WATCH ═══
      case "watch": {
        const player = findPlayer(targetName, context.players);
        if (!player) {
          return {
            success: false,
            message: `❌ Joueur "${targetName}" introuvable`,
            type: "error",
          };
        }

        AntiCheatEngine.flagPlayer(player.uid, `Surveillance activée par ${executor.displayName}`);

        await AuditTrail.log({
          action: "player_watched",
          target: player.uid,
          targetName: player.displayName,
          executor: executor.uid,
          reason: "Manual watch command",
          timestamp: Date.now(),
        });

        return {
          success: true,
          message: `👁️ ${player.displayName} est maintenant sous surveillance renforcée`,
          type: "success",
          data: { playerId: player.uid, watched: true },
        };
      }

      // ═══ UNWATCH ═══
      case "unwatch": {
        const player = findPlayer(targetName, context.players);
        if (!player) {
          return {
            success: false,
            message: `❌ Joueur "${targetName}" introuvable`,
            type: "error",
          };
        }

        AntiCheatEngine.unflagPlayer(player.uid);

        return {
          success: true,
          message: `✅ ${player.displayName} n'est plus sous surveillance`,
          type: "success",
          data: { playerId: player.uid, watched: false },
        };
      }

      // ═══ BAN ═══
      case "ban": {
        const player = findPlayer(targetName, context.players);
        if (!player) {
          return {
            success: false,
            message: `❌ Joueur "${targetName}" introuvable`,
            type: "error",
          };
        }

        const banResult = await AntiCheatEngine.banPlayer({
          playerId: player.uid,
          reason,
          executorId: executor.uid,
          executorName: executor.displayName,
          duration: args[2] === "perm" ? Infinity : undefined,
        });

        if (!banResult.success) {
          return {
            success: false,
            message: `❌ Échec du bannissement: ${banResult.error}`,
            type: "error",
          };
        }

        // Kick the player
        await context.kickPlayer(player.uid, `Banni par ${executor.displayName}: ${reason}`);

        return {
          success: true,
          message: `❌ ${player.displayName} a été banni\nRaison: ${reason}`,
          type: "warning",
          data: { playerId: player.uid, banned: true, reason },
        };
      }

      // ═══ UNBAN ═══
      case "unban": {
        if (!targetName) {
          return {
            success: false,
            message: "❌ Usage: ac unban <joueur>",
            type: "error",
          };
        }

        const unbanResult = await AntiCheatEngine.unbanPlayer(targetName, executor.displayName);

        if (!unbanResult.success) {
          return {
            success: false,
            message: `❌ Échec du débannissement: ${unbanResult.error}`,
            type: "error",
          };
        }

        return {
          success: true,
          message: `✅ ${targetName} a été débanni`,
          type: "success",
          data: { playerId: targetName, banned: false },
        };
      }

      // ═══ KICK ═══
      case "kick": {
        const player = findPlayer(targetName, context.players);
        if (!player) {
          return {
            success: false,
            message: `❌ Joueur "${targetName}" introuvable`,
            type: "error",
          };
        }

        await context.kickPlayer(player.uid, `Expulsé par ${executor.displayName}: ${reason}`);

        await AuditTrail.log({
          action: "player_kicked",
          target: player.uid,
          targetName: player.displayName,
          executor: executor.uid,
          reason,
          timestamp: Date.now(),
        });

        return {
          success: true,
          message: `👢 ${player.displayName} a été expulsé\nRaison: ${reason}`,
          type: "warning",
          data: { playerId: player.uid, kicked: true },
        };
      }

      // ═══ RESET ═══
      case "reset": {
        const player = findPlayer(targetName, context.players);
        if (!player) {
          return {
            success: false,
            message: `❌ Joueur "${targetName}" introuvable`,
            type: "error",
          };
        }

        AntiCheatEngine.resetProfile(player.uid);

        return {
          success: true,
          message: `🔄 Profil de sécurité de ${player.displayName} réinitialisé`,
          type: "success",
          data: { playerId: player.uid, reset: true },
        };
      }

      // ═══ HISTORY ═══
      case "history": {
        const player = findPlayer(targetName, context.players);
        if (!player) {
          return {
            success: false,
            message: `❌ Joueur "${targetName}" introuvable`,
            type: "error",
          };
        }

        const profile = AntiCheatEngine.getProfile(player.uid);
        if (!profile || profile.violations.length === 0) {
          return {
            success: true,
            message: `ℹ️ Aucun historique de violations pour ${player.displayName}`,
            type: "info",
          };
        }

        const lines = profile.violations.map((v, i) =>
          `  ${i + 1}. [${new Date(v.timestamp).toLocaleString()}] ${v.type} - ${v.description} (${v.severity})`
        );

        return {
          success: true,
          message: [`📜 Historique de ${player.displayName}:`, ...lines].join("\n"),
          type: "info",
          data: { violations: profile.violations },
        };
      }

      // ═══ CONFIG ═══
      case "config": {
        const configKey = args[1];
        const configValue = args[2];

        if (!configKey) {
          const config = AntiCheatEngine.getConfig();
          return {
            success: true,
            message: [
              "⚙️ CONFIGURATION ANTI-CHEAT:",
              ...Object.entries(config).map(([k, v]) => `  ${k}: ${v}`),
            ].join("\n"),
            type: "info",
            data: { config },
          };
        }

        if (configValue) {
          AntiCheatEngine.setConfig(configKey, configValue);
          return {
            success: true,
            message: `✅ Configuration mise à jour: ${configKey} = ${configValue}`,
            type: "success",
          };
        }

        const currentValue = AntiCheatEngine.getConfigValue(configKey);
        return {
          success: true,
          message: `⚙️ ${configKey} = ${currentValue}`,
          type: "info",
        };
      }

      // ═══ REPORT ═══
      case "report": {
        const player = findPlayer(targetName, context.players);
        if (!player) {
          return {
            success: false,
            message: `❌ Joueur "${targetName}" introuvable`,
            type: "error",
          };
        }

        await AntiCheatEngine.addReport({
          reporterId: executor.uid,
          reporterName: executor.displayName,
          targetId: player.uid,
          targetName: player.displayName,
          reason,
          timestamp: Date.now(),
        });

        return {
          success: true,
          message: `📋 Signalement enregistré pour ${player.displayName}`,
          type: "success",
          data: { reported: true },
        };
      }

      // ═══ SCAN ═══
      case "scan": {
        const scanResult = await AntiCheatEngine.fullScan();

        const newSuspects = scanResult.newSuspects;
        const lines = newSuspects.map(s =>
          `  ⚠️ ${s.uid.slice(0, 12)} | Trust: ${s.trustScore}% | Raison: ${s.lastViolation?.type}`
        );

        return {
          success: true,
          message: [
            `🔍 SCAN COMPLET TERMINÉ`,
            `Joueurs analysés: ${scanResult.totalPlayers}`,
            `Nouveaux suspects: ${newSuspects.length}`,
            ...(lines.length > 0 ? lines : ["  Aucun nouveau suspect"]),
          ].join("\n"),
          type: newSuspects.length > 0 ? "warning" : "success",
          data: scanResult,
        };
      }

      // ═══ DEFAULT ═══
      default:
        return {
          success: false,
          message: [
            "❌ Sous-commandes disponibles:",
            "  status, suspects, profile, watch, unwatch",
            "  ban, unban, kick, reset, history",
            "  config, report, scan",
            "",
            "Utilise: ac <commande> --help pour plus d'infos",
          ].join("\n"),
          type: "error",
        };
    }
  },
};

// ═══ HELPER FUNCTION ═══
function findPlayer(nameOrId: string, players: Player[]): Player | null {
  return players.find(
    p =>
      p.displayName.toLowerCase() === nameOrId.toLowerCase() ||
      p.uid.toLowerCase() === nameOrId.toLowerCase() ||
      p.uid.slice(0, 8).toLowerCase() === nameOrId.toLowerCase()
  ) || null;
}