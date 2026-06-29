// server/agents/ForgeFactory.js
// 🏭 Génère jusqu'à 200 items de gang en masse
export class ForgeFactory {
  constructor() {
    this.name      = "ForgeFactory";
    this.version   = "2.0.0";
    this.catalog   = new Map();
    this.generated = 0;
  }

  async process(packet) {
    return {
      agent: this.name,
      mission: packet?.mission,
      success: true,
      confidence: 89,
      data: { catalog: this.catalog.size, generated: this.generated }
    };
  }

  // Générer N items en masse
  async generateItems(count = 50, type = "weapon", gangTheme = "street") {
    count = Math.min(200, count);
    const items = [];
    const templates = this.#getTemplates(type, gangTheme);

    for (let i = 0; i < count; i++) {
      const tpl  = templates[i % templates.length];
      const item = {
        id:          `item_${type}_${Date.now()}_${i}`,
        name:        `${tpl.prefix} ${tpl.name} ${tpl.suffix} Mk${Math.floor(i / templates.length) + 1}`,
        type,
        gangTheme,
        rarity:      this.#getRarity(i, count),
        stats:       this.#generateStats(type, i, count),
        price:       this.#generatePrice(type, i),
        weight:      Math.round((Math.random() * 5 + 0.5) * 10) / 10,
        stackable:   type === "ammo" || type === "consumable",
        maxStack:    type === "ammo" ? 100 : type === "consumable" ? 20 : 1,
        model:       `models/${gangTheme}/${type}_${(i % 5) + 1}.glb`,
        texture:     `textures/${gangTheme}/${type}_${(i % 3) + 1}.png`,
        lua:         `-- Item: ${tpl.name}\nreturn { id="${type}_${i}", price=${this.#generatePrice(type, i)} }`,
        createdAt:   Date.now()
      };
      items.push(item);
      this.catalog.set(item.id, item);
      this.generated++;
    }

    return {
      ok:        true,
      count:     items.length,
      type,
      gangTheme,
      items,
      catalogSize: this.catalog.size,
      timestamp: Date.now()
    };
  }

  // Générer un pack complet pour un gang
  async generateGangPack(gangName = "Unknown Gang", gangStyle = "street") {
    const [weapons, vehicles, clothes, drugs] = await Promise.all([
      this.generateItems(20, "weapon",     gangStyle),
      this.generateItems(10, "vehicle",    gangStyle),
      this.generateItems(30, "clothing",   gangStyle),
      this.generateItems(10, "consumable", gangStyle),
    ]);
    return {
      gangName,
      gangStyle,
      totalItems: weapons.count + vehicles.count + clothes.count + drugs.count,
      packs: { weapons, vehicles, clothes, drugs },
      timestamp: Date.now()
    };
  }

  #getTemplates(type, theme) {
    const map = {
      weapon:     [
        { prefix: "Combat",  name: "Pistol",     suffix: "Pro"   },
        { prefix: "Street",  name: "Shotgun",    suffix: "Heavy" },
        { prefix: "Ether",   name: "SMG",        suffix: "Elite" },
        { prefix: "Ghost",   name: "Rifle",      suffix: "V2"    },
        { prefix: "Shadow",  name: "Knife",      suffix: "X"     },
      ],
      vehicle:    [
        { prefix: "Gang",    name: "Sedan",      suffix: "GT"    },
        { prefix: "Street",  name: "Motorcycle", suffix: "Turbo" },
        { prefix: "Ether",   name: "SUV",        suffix: "4x4"   },
      ],
      clothing:   [
        { prefix: "Urban",   name: "Jacket",     suffix: "RP"    },
        { prefix: "Street",  name: "Hoodie",     suffix: "Gang"  },
        { prefix: "Ether",   name: "Vest",       suffix: "Armor" },
      ],
      consumable: [
        { prefix: "Med",     name: "Kit",        suffix: "Pro"   },
        { prefix: "Boost",   name: "Drink",      suffix: "Max"   },
      ]
    };
    return map[type] || map.weapon;
  }

  #getRarity(index, total) {
    const pct = index / total;
    if (pct > 0.95) return "legendary";
    if (pct > 0.85) return "epic";
    if (pct > 0.65) return "rare";
    if (pct > 0.35) return "uncommon";
    return "common";
  }

  #generateStats(type, i, total) {
    const power = Math.round((i / total) * 100);
    if (type === "weapon")  return { damage: power, range: 100 - power / 2, accuracy: 50 + power / 2, reloadSpeed: 1.0 + i * 0.01 };
    if (type === "vehicle") return { speed: power, armor: 100 - power / 2, handling: 60 + power / 4 };
    if (type === "clothing") return { armor: power / 2, stealth: power / 3, style: power };
    return { heal: power / 2, duration: 10 + i };
  }

  #generatePrice(type, i) {
    const base = { weapon: 500, vehicle: 5000, clothing: 200, consumable: 50, ammo: 10 };
    return Math.round((base[type] || 100) * (1 + i * 0.05));
  }

  getCatalog()  { return Array.from(this.catalog.values()); }
  getItem(id)   { return this.catalog.get(id); }
  clearCatalog(){ this.catalog.clear(); this.generated = 0; }
  getStatus()   { return { name: this.name, version: this.version, catalog: this.catalog.size, generated: this.generated }; }
}

export default ForgeFactory;
