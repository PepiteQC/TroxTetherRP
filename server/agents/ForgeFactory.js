// server/agents/ForgeFactory.js
// 🏭 Usine de Génération Procédurale d'Items - Version 3.0
import crypto from "node:crypto";

export class ForgeFactory {
  constructor(config = {}) {
    this.name = "ForgeFactory";
    this.version = "3.0.0";
    
    this.config = {
      maxBatchSize: config.maxBatchSize || 200,
      enableMetrics: config.enableMetrics !== false,
      logLevel: config.logLevel || 'warn',
      defaultCurrency: config.defaultCurrency || "EtherCoin",
      ...config
    };

    this.catalog = new Map(); // id -> Item
    this.typeIndex = new Map(); // type -> Set<ids>
    this.generatedCount = 0;
    
    this.metrics = {
      itemsGenerated: 0,
      packsCreated: 0,
      errors: 0
    };

    // Templates de base enrichis
    this.templates = this.#loadTemplates();
  }

  async process(packet) {
    return {
      agent: this.name,
      version: this.version,
      mission: packet?.mission,
      success: true,
      confidence: 95,
      data: { 
        catalogSize: this.catalog.size, 
        generated: this.generatedCount,
        metrics: this.config.enableMetrics ? this.getMetrics() : undefined
      }
    };
  }

  // ⚒️ Générer N items en masse (avec variabilité contrôlée)
  async generateItems(count = 50, type = "weapon", gangTheme = "street") {
    try {
      count = Math.min(this.config.maxBatchSize, count);
      const items = [];
      const templates = this.templates[type] || this.templates.weapon;
      const now = Date.now();

      for (let i = 0; i < count; i++) {
        const tpl = templates[i % templates.length];
        const rarity = this.#calculateRarity(i, count);
        const multiplier = this.#getRarityMultiplier(rarity);
        
        const item = {
          id: crypto.randomUUID(),
          name: `${tpl.prefix} ${tpl.name} ${tpl.suffix}`,
          fullName: `${rarity.toUpperCase()} ${tpl.prefix} ${tpl.name}`,
          type,
          gangTheme,
          rarity,
          stats: this.#generateStats(type, rarity, multiplier),
          price: Math.round(tpl.basePrice * multiplier * (1 + Math.random() * 0.1)),
          weight: parseFloat((Math.random() * 5 + 0.5).toFixed(1)),
          stackable: type === "ammo" || type === "consumable",
          maxStack: type === "ammo" ? 100 : type === "consumable" ? 20 : 1,
          assets: {
            model: `models/${gangTheme}/${type}_${(i % 5) + 1}.glb`,
            texture: `textures/${gangTheme}/${type}_${(i % 3) + 1}.png`
          },
          luaExport: this.#toLuaItem(type, i, tpl.basePrice * multiplier),
          createdAt: now
        };

        items.push(item);
        this.catalog.set(item.id, item);
        
        if (!this.typeIndex.has(type)) this.typeIndex.set(type, new Set());
        this.typeIndex.get(type).add(item.id);
      }

      this.generatedCount += count;
      this._incrementMetric('itemsGenerated', count);

      return {
        ok: true,
        count: items.length,
        type,
        gangTheme,
        items: items.slice(0, 10), // Retourner seulement un aperçu pour éviter payload énorme
        totalGenerated: this.generatedCount,
        timestamp: now
      };
    } catch (error) {
      this._incrementMetric('errors');
      throw error;
    }
  }

  // 📦 Générer un Pack Gang Complet (Parallèle)
  async generateGangPack(gangName = "Unknown Gang", gangStyle = "street") {
    try {
      const [weapons, vehicles, clothes, consumables] = await Promise.all([
        this.generateItems(20, "weapon", gangStyle),
        this.generateItems(10, "vehicle", gangStyle),
        this.generateItems(30, "clothing", gangStyle),
        this.generateItems(15, "consumable", gangStyle)
      ]);

      const packId = crypto.randomUUID();
      this._incrementMetric('packsCreated');

      return {
        packId,
        gangName,
        gangStyle,
        totalItems: weapons.count + vehicles.count + clothes.count + consumables.count,
        summary: {
          weapons: weapons.count,
          vehicles: vehicles.count,
          clothes: clothes.count,
          consumables: consumables.count
        },
        timestamp: Date.now()
      };
    } catch (error) {
      this._incrementMetric('errors');
      throw error;
    }
  }

  // --- Méthodes Privées de Génération ---

  #calculateRarity(index, total) {
    const rand = Math.random();
    // Distribution probabiliste plutôt que linéaire pour plus de naturel
    if (rand > 0.98) return "legendary";
    if (rand > 0.90) return "epic";
    if (rand > 0.75) return "rare";
    if (rand > 0.50) return "uncommon";
    return "common";
  }

  #getRarityMultiplier(rarity) {
    const multipliers = {
      common: 1.0,
      uncommon: 1.5,
      rare: 2.5,
      epic: 4.0,
      legendary: 8.0
    };
    return multipliers[rarity] || 1.0;
  }

  #generateStats(type, rarity, multiplier) {
    const base = { quality: Math.floor(Math.random() * 10) + 90 }; // 90-100
    
    if (type === "weapon") {
      return {
        ...base,
        damage: Math.floor(20 * multiplier + Math.random() * 10),
        accuracy: Math.floor(50 + Math.random() * 40),
        range: Math.floor(30 * multiplier),
        fireRate: parseFloat((1.0 + Math.random()).toFixed(2))
      };
    }
    if (type === "vehicle") {
      return {
        ...base,
        speed: Math.floor(100 * multiplier),
        handling: Math.floor(50 + Math.random() * 50),
        armor: Math.floor(20 * multiplier)
      };
    }
    if (type === "clothing") {
      return {
        ...base,
        stealth: Math.floor(30 + Math.random() * 70),
        style: Math.floor(50 + Math.random() * 50),
        comfort: Math.floor(40 + Math.random() * 60)
      };
    }
    return { ...base, potency: Math.floor(50 * multiplier) };
  }

  #toLuaItem(type, index, price) {
    return `-- Item Generated by ForgeFactory\nlocal item = {\n  type = "${type}",\n  price = ${price},\n  id = "${index}"\n}\nreturn item`;
  }

  #loadTemplates() {
    return {
      weapon: [
        { prefix: "Combat", name: "Pistol", suffix: "Pro", basePrice: 500 },
        { prefix: "Street", name: "Shotgun", suffix: "Heavy", basePrice: 800 },
        { prefix: "Ether", name: "SMG", suffix: "Elite", basePrice: 1200 },
        { prefix: "Ghost", name: "Rifle", suffix: "V2", basePrice: 1500 },
        { prefix: "Shadow", name: "Knife", suffix: "X", basePrice: 200 }
      ],
      vehicle: [
        { prefix: "Gang", name: "Sedan", suffix: "GT", basePrice: 5000 },
        { prefix: "Street", name: "Motorcycle", suffix: "Turbo", basePrice: 3000 },
        { prefix: "Ether", name: "SUV", suffix: "4x4", basePrice: 8000 }
      ],
      clothing: [
        { prefix: "Urban", name: "Jacket", suffix: "RP", basePrice: 200 },
        { prefix: "Street", name: "Hoodie", suffix: "Gang", basePrice: 150 },
        { prefix: "Ether", name: "Vest", suffix: "Armor", basePrice: 400 }
      ],
      consumable: [
        { prefix: "Med", name: "Kit", suffix: "Pro", basePrice: 50 },
        { prefix: "Boost", name: "Drink", suffix: "Max", basePrice: 30 }
      ]
    };
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
      catalog: this.catalog.size,
      generated: this.generatedCount,
      metrics: this.config.enableMetrics ? this.getMetrics() : undefined
    };
  }
}

export default ForgeFactory;