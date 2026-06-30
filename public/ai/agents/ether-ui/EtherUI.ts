// ══════════════════════════════════════════════════════════════════════════════
// Ether-UI — Agent de conception d'interfaces
// Produit les plans UI : roues, panneaux, HUD, menus RP
// ══════════════════════════════════════════════════════════════════════════════

import type { TroxtTaskPacket, AgentResult, AgentTelemetry } from '../types.js';

export class EtherUI {
  readonly name = 'EtherUI' as const;

  private currentTask: string | null = null;
  private tasksCompleted = 0;

  async process(packet: TroxtTaskPacket): Promise<AgentResult> {
    this.currentTask = packet.id;
    const start = Date.now();
    const plan = this.designUI(packet);
    this.tasksCompleted++;
    this.currentTask = null;

    return {
      taskId: packet.id,
      agent: this.name,
      status: 'success',
      output: plan,
      confidence: 0.89,
      warnings: [],
      completedAt: Date.now(),
      durationMs: Date.now() - start,
    };
  }

  private designUI(packet: TroxtTaskPacket) {
    const { mission } = packet;

    if (/roue|wheel|immobil/i.test(mission)) {
      return this.designHouseWheel();
    }
    if (/achat|purchase|buy/i.test(mission)) {
      return this.designPurchasePanel();
    }
    if (/inventaire|inventory/i.test(mission)) {
      return this.designInventoryUI();
    }
    if (/hud/i.test(mission)) {
      return this.designHUD();
    }
    return this.designGenericPanel(mission);
  }

  private designHouseWheel() {
    return {
      agent: 'EtherUI',
      component: 'HouseWheel',
      description: 'Roue radiale de sélection immobilière style EtherWorld RP',
      layout: 'radial_wheel',
      trigger: 'E near pancarte À vendre',
      sections: [
        { angle: 0, label: 'Acheter', icon: '🏠', action: 'property:buy', color: '#22c55e' },
        { angle: 45, label: 'Visiter', icon: '👁', action: 'property:enter', color: '#60a5fa' },
        { angle: 90, label: 'Prix', icon: '💰', action: 'property:viewPrice', color: '#fbbf24' },
        { angle: 135, label: 'Détails', icon: '📋', action: 'property:viewDetails', color: '#a78bfa' },
        { angle: 180, label: 'Fermer', icon: '✕', action: 'wheel:close', color: '#71717a' },
      ],
      style: {
        background: 'rgba(0,0,0,0.85)',
        border: '1px solid rgba(167,139,250,0.3)',
        radius: 120,
        centerIcon: '🏡',
        animation: 'fade_scale_in',
        theme: 'etherworld_dark',
      },
    };
  }

  private designPurchasePanel() {
    return {
      agent: 'EtherUI',
      component: 'PurchasePanel',
      description: 'Panneau d\'achat immobilier EtherWorld RP',
      layout: 'modal_center',
      sections: [
        { type: 'header', content: 'Propriété à vendre' },
        { type: 'image', content: 'Aperçu 3D de la propriété' },
        { type: 'details', fields: ['Catégorie', 'Zone', 'Surface', 'Meubles max', 'Portes'] },
        { type: 'price', fields: ['Prix d\'achat', 'Taxes', 'Total', 'Votre solde'] },
        { type: 'actions', buttons: [
          { label: 'Acheter', style: 'primary', action: 'property:buy', disabled: 'insufficientFunds' },
          { label: 'Annuler', style: 'ghost', action: 'modal:close' },
        ]},
      ],
      style: { width: 420, theme: 'etherworld_dark', animation: 'slide_up' },
    };
  }

  private designInventoryUI() {
    return {
      agent: 'EtherUI',
      component: 'InventoryPanel',
      description: 'Inventaire EtherWorld RP (déjà implémenté, plan de référence)',
      layout: 'side_panel',
      trigger: 'key: I',
      features: ['20 slots', 'Rareté colorée', 'Filtres par catégorie', 'Clic droit contextuel', 'Compteur Ether Coins'],
      note: 'Composant existant — ne pas remplacer',
    };
  }

  private designHUD() {
    return {
      agent: 'EtherUI',
      component: 'GameHUD',
      description: 'HUD principal EtherWorld RP (déjà implémenté)',
      note: 'Composant existant — ne pas modifier',
      features: ['Horloge temps réel', 'Chat', 'Admin panel', 'Coordonnées', 'Météo'],
    };
  }

  private designGenericPanel(mission: string) {
    return {
      agent: 'EtherUI',
      component: 'GenericPanel',
      mission,
      layout: 'modal_center',
      sections: [
        { type: 'header', content: mission },
        { type: 'body', content: 'Corps du panneau — à personnaliser selon la mission' },
        { type: 'actions', buttons: [
          { label: 'Confirmer', style: 'primary' },
          { label: 'Annuler', style: 'ghost' },
        ]},
      ],
      style: { width: 400, theme: 'etherworld_dark' },
    };
  }

  getTelemetry(): AgentTelemetry {
    return {
      agent: this.name,
      taskId: this.currentTask ?? 'idle',
      status: this.currentTask ? 'working' : 'pending',
      confidence: 0.89,
      riskLevel: 'low',
      estimatedCompletion: 'short',
      dependencies: [],
      timestamp: Date.now(),
    };
  }

  getStats() {
    return { tasksCompleted: this.tasksCompleted, currentTask: this.currentTask };
  }
}
