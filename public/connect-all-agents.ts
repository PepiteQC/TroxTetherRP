// ═══════════════════════════════════════════════════════════════
// 🚀 TROXT LAB — CONNEXION DE TOUS LES AGENTS
// ═══════════════════════════════════════════════════════════════
// Ce fichier connecte TOUS les agents TroxT au Lab en une ligne.
// Chaque agent reçoit un LabBridge avec son type détecté auto.
// ═══════════════════════════════════════════════════════════════

import { LabBridge, detectAgentType } from './lab-bridge.js';

// ─── MAP GLOBALE DES PONTS AGENTS ───
export const agentBridges: Map<string, LabBridge> = new Map();

// ─── LISTE DE TOUS LES AGENTS TROXT ───
const ALL_AGENTS = [
  'TroxT-Brain',
  'TroxT-ThirdEye',
  'TroxT-Intellectus',
  'Ether-Forge',
  'Ether-Lens',
  'Ether-Prism',
  'Ether-Weave',
  'Forge-Factory',
  'Ether-Guard',
  'Ether-UI',
  'Ether-Sim',
  'Ether-Deploy',
  'Ether-Memory',
  'Ether-Core',
  'CommandHandler'
];

// ═══════════════════════════════════════════════════════════════
//  CONNECT ALL AGENTS — Connexion massive avec synergie
// ═══════════════════════════════════════════════════════════════

export async function connectAllAgents(): Promise<{
  connected: number;
  bridges: Map<string, LabBridge>;
  report: any;
}> {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║  🚀 CONNEXION DE TOUS LES AGENTS TROXT AU LAB           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
  
  let connected = 0;
  
  for (const agentId of ALL_AGENTS) {
    try {
      const bridge = new LabBridge({
        agentId,
        useHttp: false,
        agentType: detectAgentType(agentId),
        enableNexus: true
      });
      
      await bridge.connect();
      
      agentBridges.set(agentId, bridge);
      connected++;
      
      console.log(`  ✅ ${agentId.padEnd(25)} → Connecté`);
    } catch (error: any) {
      console.error(`  ❌ ${agentId.padEnd(25)} → Échec: ${error.message}`);
    }
  }
  
  const report = {
    total: ALL_AGENTS.length,
    connected,
    failed: ALL_AGENTS.length - connected,
    synergyScore: connected > 0 ? Math.round((connected / ALL_AGENTS.length) * 100) : 0,
    timestamp: Date.now()
  };
  
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║  📊 RAPPORT DE CONNEXION                                 ║
  ║  Connectés: ${connected}/${ALL_AGENTS.length}                                    ║
  ║  Score synergie: ${report.synergyScore}%                                         ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
  
  return { connected, bridges: agentBridges, report };
}

// ═══════════════════════════════════════════════════════════════
//  DISCONNECT ALL — Déconnexion massive
// ═══════════════════════════════════════════════════════════════

export async function disconnectAllAgents(): Promise<void> {
  for (const [agentId, bridge] of agentBridges) {
    try {
      await bridge.disconnect();
      console.log(`  ⏹ ${agentId} déconnecté`);
    } catch (error: any) {
      console.error(`  ⚠ ${agentId} erreur déconnexion: ${error.message}`);
    }
  }
  
  agentBridges.clear();
  console.log('  ✅ Tous les agents déconnectés');
}

// ═══════════════════════════════════════════════════════════════
//  GET AGENT BRIDGE — Récupérer le pont d'un agent
// ═══════════════════════════════════════════════════════════════

export function getAgentBridge(agentId: string): LabBridge | undefined {
  return agentBridges.get(agentId);
}

// ═══════════════════════════════════════════════════════════════
//  GET TEAM REPORT — Rapport complet de l'équipe
// ═══════════════════════════════════════════════════════════════

export function getTeamReport(): any {
  const agents = LabBridge.getAgentRegistry();
  const online = Array.from(agents.values()).filter(a => a.status === 'online');
  const byType: Record<string, number> = {};
  
  for (const [, profile] of agents) {
    byType[profile.agentType] = (byType[profile.agentType] || 0) + 1;
  }
  
  return {
    totalAgents: agents.size,
    online: online.length,
    offline: agents.size - online.length,
    byType,
    synergyScore: agents.size > 0 ? Math.round((online.length / agents.size) * 100) : 0,
    agents: Array.from(agents.values()).map(a => ({
      id: a.agentId,
      type: a.agentType,
      status: a.status,
      errors: a.errors,
      lastSeen: new Date(a.lastSeen).toISOString()
    }))
  };
}

// ═══════════════════════════════════════════════════════════════
//  AUTO-CONNECT AU DÉMARRAGE
// ═══════════════════════════════════════════════════════════════

// Démarrer automatiquement si ce fichier est exécuté directement
const isMainModule = process.argv[1]?.includes('connect-all-agents');
if (isMainModule) {
  connectAllAgents().then(() => {
    console.log('✅ Tous les agents TroxT sont connectés au Lab');
  });
}