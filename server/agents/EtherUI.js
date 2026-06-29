// server/agents/EtherUI.js
// 🖥 Génère le HUD territoire — menus, interfaces joueur
export class EtherUI {
  constructor() {
    this.name      = "EtherUI";
    this.version   = "2.0.0";
    this.templates = new Map();
    this.#loadDefaultTemplates();
  }

  async process(packet) {
    return {
      agent: this.name,
      mission: packet?.mission,
      success: true,
      confidence: 85,
      data: { templates: this.templates.size }
    };
  }

  // Générer HUD territoire
  async generateTerritoryHUD(config = {}) {
    const hud = {
      id:   `hud_territory_${Date.now()}`,
      type: "territory_hud",
      elements: [
        {
          id:       "territory_name",
          type:     "label",
          text:     config.name || "Unnamed Territory",
          position: { x: 10, y: 10 },
          style:    { color: config.color || "#ff4444", fontSize: 18, fontWeight: "bold" }
        },
        {
          id:       "gang_control",
          type:     "progress_bar",
          label:    "Contrôle",
          value:    config.control || 50,
          max:      100,
          position: { x: 10, y: 40 },
          style:    { color: "#44ff88", background: "#1a1a2e" }
        },
        {
          id:       "gang_name",
          type:     "label",
          text:     `Gang: ${config.gangName || "Aucun"}`,
          position: { x: 10, y: 70 },
          style:    { color: "#ffffff", fontSize: 14 }
        },
        {
          id:       "income",
          type:     "label",
          text:     `Revenu: $${config.income || 0}/min`,
          position: { x: 10, y: 90 },
          style:    { color: "#ffd166", fontSize: 12 }
        },
        {
          id:       "alert_zone",
          type:     "alert",
          active:   config.underAttack || false,
          text:     "⚠️ TERRITOIRE SOUS ATTAQUE",
          style:    { color: "#ff0000", blink: true }
        }
      ],
      lua: this.#toHudLua(config),
      timestamp: Date.now()
    };
    return hud;
  }

  // Générer menu gang
  async generateGangMenu(gang = {}) {
    return {
      id:    `menu_gang_${Date.now()}`,
      type:  "gang_menu",
      title: gang.name || "Gang Menu",
      color: gang.color || "#ff4444",
      sections: [
        {
          title: "👥 Membres",
          items: [
            { id: "view_members",   label: "Voir les membres",      icon: "👥", action: "gang_members" },
            { id: "invite_member",  label: "Inviter un membre",     icon: "➕", action: "gang_invite"  },
            { id: "kick_member",    label: "Expulser un membre",    icon: "🚫", action: "gang_kick"    },
          ]
        },
        {
          title: "🏘 Territoire",
          items: [
            { id: "view_territory", label: "Voir le territoire",    icon: "🗺", action: "gang_territory" },
            { id: "attack",         label: "Attaquer un territoire", icon: "⚔️", action: "gang_attack"   },
            { id: "defend",         label: "Défendre",              icon: "🛡", action: "gang_defend"   },
          ]
        },
        {
          title: "💰 Économie",
          items: [
            { id: "bank",           label: "Banque du gang",        icon: "🏦", action: "gang_bank"    },
            { id: "drug_trade",     label: "Commerce",              icon: "💊", action: "gang_trade"   },
          ]
        }
      ],
      timestamp: Date.now()
    };
  }

  #toHudLua(config) {
    return `-- EtherUI HUD Territory
-- Generated: ${new Date().toISOString()}
DrawText("${config.name || "Territory"}", 10, 10, 255, 255, 255, 255)
DrawRect(10, 40, ${config.control || 50}, 10, 68, 255, 136, 200)`;
  }

  #loadDefaultTemplates() {
    this.templates.set("territory_hud", { name: "Territory HUD", type: "hud" });
    this.templates.set("gang_menu",     { name: "Gang Menu",      type: "menu" });
    this.templates.set("player_hud",    { name: "Player HUD",     type: "hud" });
  }

  getStatus() { return { name: this.name, version: this.version, templates: this.templates.size }; }
}

export default EtherUI;
