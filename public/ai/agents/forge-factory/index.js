// C:\troxtetherworld\public\ai\agents\forge-factory\index.js
// Agent: forge-factory — Produit items, props et configurations en masse

import { EventEmitter } from 'events';
import crypto from 'crypto';

export class ForgeFactory extends EventEmitter {
  constructor(brain) {
    super();
    this.brain = brain;
    this.blueprints = new Map();
    this.productionQueue = [];
    this.types = {
      weapon: { prefix: 'wpn', categories: ['pistol', 'rifle', 'shotgun', 'sniper', 'melee', 'heavy'] },
      item:   { prefix: 'item', categories: ['consumable', 'material', 'valuable', 'food', 'medical'] },
      prop:   { prefix: 'prop', categories: ['furniture', 'decoration', 'industrial', 'outdoor', 'lighting'] },
      vehicle:{ prefix: 'veh', categories: ['car', 'bike', 'truck', 'boat', 'helicopter'] },
      clothing:{prefix: 'cloth', categories: ['hat', 'mask', 'top', 'pants', 'shoes', 'accessory'] },
      ammo:   { prefix: 'ammo', categories: ['pistol', 'rifle', 'shotgun', 'sniper', 'special'] }
    };
  }

  async handle(task) {
    const start = Date.now();
    const { request, planId } = task.payload;

    // Déterminer quoi produire
    const productionPlan = this._analyzeProduction(request);
    
    // Produire les items
    const produced = await this._produce(productionPlan);

    // Configurer les blueprints
    const blueprints = this._createBlueprints(produced);

    // Logistique (prix, poids, catégories)
    const logistics = this._calculateLogistics(produced);

    // Packager
    const package_ = this._packageResults(produced, logistics);

    const result = {
      success: true,
      output: {
        productionPlan,
        itemsProduced: produced.length,
        blueprints: blueprints.length,
        logistics,
        package_,
        totalSize: `${(JSON.stringify(package_).length / 1024).toFixed(2)} KB`
      },
      files: [
        'forge-factory/output/items.json',
        'forge-factory/output/blueprints.json',
        'forge-factory/output/configs.json'
      ],
      connections: ['ether-core', 'ether-weave', 'ether-prism'],
      risks: productionPlan.risks,
      confidence: produced.length > 0 ? 90 : 40,
      needsBrainValidation: produced.length === 0,
      needsThirdEyeValidation: productionPlan.type === 'weapon',
      executionMs: Date.now() - start
    };

    return result;
  }

  _analyzeProduction(request) {
    const r = request.toLowerCase();
    const plan = {
      type: 'item',
      count: 10,
      variants: 3,
      risks: []
    };

    if (r.includes('arme') || r.includes('weapon') || r.includes('gun')) {
      plan.type = 'weapon';
      plan.count = 5;
      plan.risks.push('Les armes nécessitent validation Third Eye');
    } else if (r.includes('véhicule') || r.includes('vehicle') || r.includes('voiture')) {
      plan.type = 'vehicle';
      plan.count = 3;
    } else if (r.includes('prop') || r.includes('meuble') || r.includes('furniture')) {
      plan.type = 'prop';
      plan.count = 20;
    } else if (r.includes('vêtement') || r.includes('clothing') || r.includes('habit')) {
      plan.type = 'clothing';
      plan.count = 15;
    } else if (r.includes('munition') || r.includes('ammo') || r.includes('bullet')) {
      plan.type = 'ammo';
      plan.count = 8;
    }

    // Extraire le nombre si spécifié
    const countMatch = r.match(/(\d+)\s*(?:items?|objets?|armes?|véhicules?)/i);
    if (countMatch) plan.count = parseInt(countMatch[1]);

    return plan;
  }

  async _produce(plan) {
    const produced = [];
    const typeConfig = this.types[plan.type];
    
    if (!typeConfig) return produced;

    for (let i = 0; i < plan.count; i++) {
      const category = typeConfig.categories[i % typeConfig.categories.length];
      const item = this._generateItem(plan.type, category, i);
      produced.push(item);
    }

    return produced;
  }

  _generateItem(type, category, index) {
    const id = `${this.types[type].prefix}_${Date.now().toString(36)}_${index}`;
    const base = {
      id,
      name: `${category.charAt(0).toUpperCase() + category.slice(1)}_${index + 1}`,
      type,
      category,
      rarity: this._weightedRandom(['common', 'uncommon', 'rare', 'epic', 'legendary'], [0.5, 0.25, 0.15, 0.07, 0.03]),
      weight: Math.floor(Math.random() * 10) + 1,
      value: Math.floor(Math.random() * 10000) + 100,
      metadata: {
        created: new Date().toISOString(),
        version: '4.0.0',
        blueprint: `${type}_${category}_v1`
      }
    };

    // Propriétés spécifiques selon le type
    switch (type) {
      case 'weapon':
        return {
          ...base,
          damage: Math.floor(Math.random() * 50) + 10,
          fireRate: Math.floor(Math.random() * 500) + 100,
          range: Math.floor(Math.random() * 100) + 20,
          magSize: Math.floor(Math.random() * 30) + 5,
          ammoType: category === 'melee' ? null : 'standard'
        };
      case 'vehicle':
        return {
          ...base,
          speed: Math.floor(Math.random() * 150) + 50,
          seats: Math.floor(Math.random() * 4) + 2,
          trunk: Math.floor(Math.random() * 100) + 20,
          fuelType: ['essence', 'diesel', 'electric'][Math.floor(Math.random() * 3)]
        };
      case 'prop':
        return {
          ...base,
          size: ['small', 'medium', 'large'][Math.floor(Math.random() * 3)],
          interactive: Math.random() > 0.5,
          health: Math.floor(Math.random() * 100) + 50
        };
      default:
        return {
          ...base,
          consumable: Math.random() > 0.5,
          stackable: Math.random() > 0.3,
          maxStack: Math.floor(Math.random() * 50) + 10
        };
    }
  }

  _createBlueprints(items) {
    const blueprints = [];

    for (const item of items) {
      const blueprint = {
        id: `${item.metadata.blueprint}`,
        name: item.name,
        type: item.type,
        category: item.category,
        recipe: this._generateRecipe(item),
        craftingTime: Math.floor(Math.random() * 60) + 10,
        requirements: {
          level: Math.floor(Math.random() * 10) + 1,
          skills: [item.type],
          tools: []
        }
      };

      this.blueprints.set(blueprint.id, blueprint);
      blueprints.push(blueprint);
    }

    return blueprints;
  }

  _generateRecipe(item) {
    const ingredients = [];
    const count = Math.floor(Math.random() * 4) + 2;

    for (let i = 0; i < count; i++) {
      ingredients.push({
        item: `item_${crypto.randomUUID().slice(0, 8)}`,
        quantity: Math.floor(Math.random() * 5) + 1,
        type: 'material'
      });
    }

    return ingredients;
  }

  _calculateLogistics(items) {
    const logistics = {
      totalWeight: 0,
      totalValue: 0,
      averagePrice: 0,
      categories: new Set(),
      rarities: {}
    };

    for (const item of items) {
      logistics.totalWeight += item.weight;
      logistics.totalValue += item.value;
      logistics.categories.add(item.category);
      
      logistics.rarities[item.rarity] = (logistics.rarities[item.rarity] || 0) + 1;
    }

    logistics.averagePrice = Math.floor(logistics.totalValue / items.length);
    logistics.categories = Array.from(logistics.categories);

    return logistics;
  }

  _packageResults(items, logistics) {
    return {
      manifest: {
        id: `forge_${Date.now()}`,
        timestamp: new Date().toISOString(),
        total: items.length
      },
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        rarity: item.rarity,
        value: item.value
      })),
      logistics,
      blueprints: Array.from(this.blueprints.values()).slice(-items.length)
    };
  }

  _weightedRandom(options, weights) {
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < options.length; i++) {
      random -= weights[i];
      if (random <= 0) return options[i];
    }
    
    return options[options.length - 1];
  }
}