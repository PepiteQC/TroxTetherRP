// server/agents/EtherUI.js
// 🖥 Générateur d'Interface UI & HUD - Version 3.0
import crypto from "node:crypto";

export class EtherUI {
  constructor(config = {}) {
    this.name = "EtherUI";
    this.version = "3.0.0";
    
    this.config = {
      enableMetrics: config.enableMetrics !== false,
      logLevel: config.logLevel || 'warn',
      defaultTheme: config.defaultTheme || "dark",
      ...config
    };

    this.templates = new Map();
    this.cache = new Map(); // Cache des HUDs générés récemment
    
    this.metrics = {
      generated: 0,
      cacheHits: 0
    };

    this.#loadDefaultTemplates();
  }

  async process(packet) {
    return {
      agent: this.name,
      version: this.version,
      mission: packet?.mission,
      success: true,
      confidence: 98,
      data: { templates: this.templates.size, metrics: this.getMetrics() }
    };
  }

  // 🏙 Générer un HUD Territoire Complet
  async generateTerritoryHUD(config = {}) {
    const cacheKey = `hud_${config.name}_${config.control}_${config.gangName}`;
    
    // Check Cache (simple TTL pourrait être ajouté)
    if (this.cache.has(cacheKey)) {
      this._incrementMetric('cacheHits');
      return this.cache.get(cacheKey);
    }

    const hudId = crypto.randomUUID();
    const now = Date.now();

    const hud = {
      id: hudId,
      type: "territory_hud",
      theme: config.theme || this.config.defaultTheme,
      elements: [
        {
          id: "title",
          type: "label",
          text: config.name || "Zone Inconnue",
          style: { fontSize: 24, fontWeight: "bold", color: config.color || "#ff4444", shadow: true }
        },
        {
          id: "control_bar",
          type: "progress",
          value: config.control || 0,
          max: 100,
          color: config.color || "#ff4444",
          label: "Contrôle"
        },
        {
          id: "owner",
          type: "label",
          text: `Propriétaire: ${config.gangName || "Aucun"}`,
          style: { fontSize: 14, color: "#ffffff" }
        },
        {
          id: "income",
          type: "label",
          text: `+$${config.income || 0}/min`,
          style: { fontSize: 12, color: "#4caf50" }
        },
        {
          id: "alert",
          type: "badge",
          visible: config.underAttack || false,
          text: "⚠️ ATTAQUE EN COURS",
          style: { backgroundColor: "#ff0000", animation: "pulse" }
        }
      ],
      // Export Lua natif pour injection directe dans le jeu
      luaCode: this.#generateLuaHUD(config),
      createdAt: now
    };

    // Mise en cache
    this.cache.set(cacheKey, hud);
    if (this.cache.size > 50) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this._incrementMetric('generated');
    return hud;
  }

  // 📱 Générer un Menu Gang Dynamique
  async generateGangMenu(gangData = {}) {
    const menuId = crypto.randomUUID();
    
    return {
      id: menuId,
      type: "context_menu",
      title: gangData.name || "Menu Gang",
      style: {
        backgroundColor: gangData.color || "#1a1a2e",
        accentColor: gangData.color || "#ff4444",
        borderRadius: "8px"
      },
      sections: [
        {
          title: "👥 Gestion",
          items: [
            { id: "members", label: "Liste des Membres", icon: "users", action: "open_members" },
            { id: "invite", label: "Inviter Joueur", icon: "user-plus", action: "open_invite" },
            { id: "kick", label: "Expulser", icon: "user-minus", action: "open_kick", permission: "leader" }
          ]
        },
        {
          title: "⚔️ Actions",
          items: [
            { id: "attack", label: "Attaquer Territoire", icon: "sword", action: "start_attack" },
            { id: "defend", label: "Mode Défense", icon: "shield", action: "toggle_defend" }
          ]
        },
        {
          title: "💰 Économie",
          items: [
            { id: "bank", label: "Coffre Fort", icon: "bank", action: "open_bank" },
            { id: "wash", label: "Blanchiment", icon: "washing-machine", action: "open_wash" }
          ]
        }
      ],
      createdAt: Date.now()
    };
  }

  // --- Générateur Lua Optimisé ---

  #generateLuaHUD(config) {
    // Génère du code Lua compatible NUI/FiveM DrawSprite/DrawText
    const safeName = (config.name || "Territory").replace(/"/g, '\\"');
    const colorHex = config.color || "#ff4444";
    const r = parseInt(colorHex.slice(1, 3), 16);
    const g = parseInt(colorHex.slice(3, 5), 16);
    const b = parseInt(colorHex.slice(5, 7), 16);
    
    return `
-- EtherUI Auto-Generated HUD
-- ID: ${crypto.randomUUID()}
Citizen.CreateThread(function()
    while true do
        Citizen.Wait(0)
        -- Draw Background
        DrawRect(0.15, 0.1, 0.2, 0.15, 0, 0, 0, 150)
        
        -- Draw Title
        SetTextFont(4)
        SetTextProportional(1)
        SetTextScale(0.5, 0.5)
        SetTextColour(${r}, ${g}, ${b}, 255)
        SetTextDropshadow(0, 0, 0, 0, 255)
        SetTextEdge(1, 0, 0, 0, 255)
        SetTextDropShadow()
        SetTextOutline()
        SetTextEntry("STRING")
        AddTextComponentString("${safeName}")
        DrawText(0.15, 0.08)
        
        -- Draw Control Bar
        local control = ${config.control || 50} / 100.0
        DrawRect(0.15 + (control * 0.1) - 0.1, 0.13, control * 0.2, 0.01, ${r}, ${g}, ${b}, 200)
        
        if not IsHudHidden() then break end
    end
end)
`;
  }

  #loadDefaultTemplates() {
    this.templates.set("minimal_hud", { style: "clean", elements: 3 });
    this.templates.set("detailed_menu", { style: "rich", sections: 4 });
  }

  _incrementMetric(metric, amount = 1) {
    if (this.config.enableMetrics && this.metrics[metric] !== undefined) {
      this.metrics[metric] += amount;
    }
  }

  getMetrics() { return { ...this.metrics, timestamp: Date.now() }; }

  getStatus() { 
    return { 
      name: this.name, 
      version: this.version, 
      templates: this.templates.size,
      metrics: this.getMetrics()
    }; 
  }
}

export default EtherUI;