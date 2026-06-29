// server/core/TroxTBrain.js
// 🧠 Chef d'orchestre — 16 agents
import { EtherForge      } from "../agents/EtherForge.js";
import { EtherGuard      } from "../agents/EtherGuard.js";
import { EtherLens       } from "../agents/EtherLens.js";
import { EtherPrism      } from "../agents/EtherPrism.js";
import { EtherWeave      } from "../agents/EtherWeave.js";
import { EtherUI         } from "../agents/EtherUI.js";
import { EtherSim        } from "../agents/EtherSim.js";
import { EtherMemory     } from "../agents/EtherMemory.js";
import { ForgeFactory    } from "../agents/ForgeFactory.js";
import { EtherDeploy     } from "../agents/EtherDeploy.js";
import { EtherCore       } from "../agents/EtherCore.js";
import { DiamondIdentity } from "../agents/DiamondIdentity.js";
import { ThirdEye        } from "../agents/ThirdEye.js";
import { RiskPredictor   } from "../agents/RiskPredictor.js";
import { EvolutionEngine } from "../agents/EvolutionEngine.js";
import { AuditTrail      } from "../agents/AuditTrail.js";
import { agentBus        } from "../agents/AgentBus.js";

export class TroxTBrain {
  constructor() {
    this.name        = "TroxTBrain";
    this.version     = "3.0.0";
    this.initialized = false;
    this.agents      = {};
  }

  async init() {
    console.log("[TroxTBrain] 🧠 Initialisation des 16 agents...");

    // ── Agents Fonctionnels ──────────────────────────
    this.agents.etherForge      = new EtherForge();
    this.agents.etherGuard      = new EtherGuard();
    this.agents.etherLens       = new EtherLens();
    this.agents.etherPrism      = new EtherPrism();
    this.agents.etherWeave      = new EtherWeave();
    this.agents.etherUI         = new EtherUI();
    this.agents.etherSim        = new EtherSim();
    this.agents.etherMemory     = new EtherMemory();
    this.agents.forgeFactory    = new ForgeFactory();
    this.agents.etherDeploy     = new EtherDeploy();
    this.agents.etherCore       = new EtherCore();

    // ── Agents Sécurité ──────────────────────────────
    this.agents.diamondIdentity = new DiamondIdentity();
    this.agents.thirdEye        = new ThirdEye();
    this.agents.riskPredictor   = new RiskPredictor();
    this.agents.evolutionEngine = new EvolutionEngine();
    this.agents.auditTrail      = new AuditTrail();

    // ── Enregistrement dans le Bus ───────────────────
    agentBus.register("EtherForge",      this.agents.etherForge);
    agentBus.register("EtherGuard",      this.agents.etherGuard);
    agentBus.register("EtherLens",       this.agents.etherLens);
    agentBus.register("EtherPrism",      this.agents.etherPrism);
    agentBus.register("EtherWeave",      this.agents.etherWeave);
    agentBus.register("EtherUI",         this.agents.etherUI);
    agentBus.register("EtherSim",        this.agents.etherSim);
    agentBus.register("EtherMemory",     this.agents.etherMemory);
    agentBus.register("ForgeFactory",    this.agents.forgeFactory);
    agentBus.register("EtherDeploy",     this.agents.etherDeploy);
    agentBus.register("EtherCore",       this.agents.etherCore);
    agentBus.register("DiamondIdentity", this.agents.diamondIdentity);
    agentBus.register("ThirdEye",        this.agents.thirdEye);
    agentBus.register("RiskPredictor",   this.agents.riskPredictor);
    agentBus.register("EvolutionEngine", this.agents.evolutionEngine);
    agentBus.register("AuditTrail",      this.agents.auditTrail);

    // Audit de démarrage
    this.agents.auditTrail.record("brain_init", "system", { agents: agentBus.getAgents() }, "INFO");

    this.initialized = true;

    console.log(`[TroxTBrain] ✅ ${agentBus.getAgents().length} agents chargés:`, agentBus.getAgents());
    return this;
  }

  async process(mission, data = {}) {
    if (!this.initialized) await this.init();

    // Vérification sécurité via ThirdEye AVANT exécution
    const risk = await this.agents.thirdEye.assess({ type: mission, ...data });
    if (risk.blocked) {
      this.agents.auditTrail.record(`blocked_${mission}`, "thirdEye", risk, "CRITICAL");
      return { brain: this.name, mission, blocked: true, reason: "ThirdEye: niveau RED", risk };
    }

    // Mémoriser la requête
    this.agents.etherMemory.record("mission", "brain", `${mission}: ${JSON.stringify(data).slice(0,100)}`, 0.6);

    // Broadcaster à tous les agents
    const packet  = { mission, data, timestamp: Date.now() };
    const results = await agentBus.broadcast(packet);

    // Audit
    this.agents.auditTrail.record(mission, "brain", { results: results.length }, "INFO");

    return { brain: this.name, mission, results, timestamp: Date.now() };
  }

  // Appeler un agent spécifique
  async callAgent(agentName, method, ...args) {
    if (!this.initialized) await this.init();
    const agent = this.agents[agentName.charAt(0).toLowerCase() + agentName.slice(1)];
    if (!agent)           throw new Error(`Agent ${agentName} introuvable`);
    if (!agent[method])   throw new Error(`Méthode ${method} introuvable sur ${agentName}`);
    return await agent[method](...args);
  }

  getStatus() {
    return {
      name:        this.name,
      version:     this.version,
      initialized: this.initialized,
      agentCount:  agentBus.getAgents().length,
      agents:      agentBus.getAgents(),
      thirdEye:    this.agents.thirdEye?.getStatus(),
      auditTrail:  this.agents.auditTrail?.getStatus(),
      memory:      this.agents.etherMemory?.getStatus(),
    };
  }
}

export const brain = new TroxTBrain();
export default TroxTBrain;
