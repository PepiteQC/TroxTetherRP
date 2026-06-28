// C:\troxtetherworld\public\ai\agents\ether-prism\index.js
// Agent ETHER-PRISM v4.0.0 — Transformateur de schémas RP
// Le cœur de la génération de contenu RP — transforme les demandes en schémas complets

import crypto from 'crypto';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs/promises';

export class EtherPrism extends EventEmitter {
  constructor(brain) {
    super();
    this.brain = brain;
    this.schemas = new Map();
    this.cognition = new Map();     // Patterns de réflexion
    this.evolution = new Map();     // Historique d'évolution
    this.genesis = new Map();       // Templates de création

    // Registre des transformateurs RP
    this.transformers = {
      faction: this._transformFaction.bind(this),
      economy: this._transformEconomy.bind(this),
      housing: this._transformHousing.bind(this),
      job: this._transformJob.bind(this),
      vehicle: this._transformVehicle.bind(this),
      weapon: this._transformWeapon.bind(this),
      item: this._transformItem.bind(this),
      territory: this._transformTerritory.bind(this),
      npc: this._transformNPC.bind(this),
      event: this._transformEvent.bind(this)
    };

    // Niveaux de complexité
    this.complexityLevels = {
      basic: { time: 50, confidence: 0.9, iterations: 1 },
      standard: { time: 150, confidence: 0.8, iterations: 3 },
      advanced: { time: 500, confidence: 0.7, iterations: 5 },
      complex: { time: 2000, confidence: 0.6, iterations: 10 }
    };
  }

  async initialize() {
    // Charger les schémas existants
    try {
      const schemasDir = path.join(process.cwd(), 'public', 'ai', 'agents', 'ether-prism', 'schemas');
      const files = await fs.readdir(schemasDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(schemasDir, file), 'utf-8');
          const schema = JSON.parse(content);
          this.schemas.set(schema.id || file.replace('.json', ''), schema);
        }
      }
      console.log(`[EtherPrism] ${this.schemas.size} schémas chargés`);
    } catch (err) {
      console.log('[EtherPrism] Aucun schéma existant, démarrage vierge');
    }

    return this;
  }

  async handle(task) {
    const start = Date.now();
    const { request, planId } = task.payload;

    // PHASE 1: COGNITION — Comprendre la demande
    const cognition = await this._cognize(request);
    
    // PHASE 2: GENESIS — Créer le schéma de base
    const genesis = await this._genesis(cognition);
    
    // PHASE 3: TRANSFORMATION — Appliquer les transformateurs
    const transformed = await this._transform(genesis, request);
    
    // PHASE 4: ÉVOLUTION — Améliorer avec l'historique
    const evolved = await this._evolve(transformed);
    
    // PHASE 5: VALIDATION — Vérifier l'intégrité
    const validation = await this._validate(evolved);
    
    // PHASE 6: EXPORT — Formater pour l'import
    const export_ = await this._export(evolved);

    // Mémoriser pour évolution future
    this._memorize(cognition, evolved, validation);

    const result = {
      success: validation.valid,
      output: {
        cognition: {
          type: cognition.type,
          complexity: cognition.complexity,
          entities: cognition.entities,
          relations: cognition.relations
        },
        genesis: {
          id: genesis.id,
          name: genesis.name,
          version: genesis.version
        },
        schema: evolved,
        validation,
        export: export_,
        evolution: {
          iterations: evolved._meta?.evolutionIterations || 0,
          similarPatterns: this._findSimilarPatterns(cognition.type).length
        }
      },
      files: [
        `ether-prism/schemas/${cognition.type}/${evolved.id}.json`,
        `ether-prism/exports/${cognition.type}/${evolved.id}_import.json`,
        `ether-prism/evolution/${cognition.type}_patterns.json`
      ],
      connections: ['ether-forge', 'ether-weave', 'ether-core', 'forge-factory'],
      risks: validation.warnings,
      confidence: validation.score,
      needsBrainValidation: validation.score < 70,
      needsThirdEyeValidation: cognition.type === 'economy' || cognition.type === 'faction',
      executionMs: Date.now() - start
    };

    return result;
  }

  // ─── PHASE 1: COGNITION ───────────────────────────────────────────────────

  async _cognize(request) {
    const r = request.toLowerCase();
    
    // Analyse sémantique profonde
    const cognition = {
      type: this._detectType(r),
      complexity: this._detectComplexity(r),
      entities: this._extractEntities(r),
      relations: this._extractRelations(r),
      constraints: this._extractConstraints(r),
      intent: this._detectIntent(r),
      sentiment: this._analyzeSentiment(r),
      timestamp: Date.now()
    };

    // Analyse des dépendances entre entités
    cognition.dependencies = this._analyzeDependencies(cognition.entities, cognition.relations);

    // Score de confiance basé sur la clarté de la demande
    cognition.clarity = this._calculateClarity(r, cognition);

    this.cognition.set(cognition.type, cognition);
    return cognition;
  }

  _detectType(r) {
    // Détection multi-critères avec scoring
    const scores = {
      faction: 0,
      economy: 0,
      housing: 0,
      job: 0,
      vehicle: 0,
      weapon: 0,
      territory: 0,
      npc: 0,
      event: 0
    };

    // Mots-clés principaux (poids fort)
    const keywords = {
      faction: { words: ['gang', 'faction', 'crew', 'famille', 'organisation', 'clan', 'mafia'], weight: 3 },
      economy: { words: ['banque', 'économie', 'argent', 'taxe', 'salaire', 'prix', 'commerce', 'bourse'], weight: 3 },
      housing: { words: ['maison', 'appartement', 'villa', 'propriété', 'logement', 'résidence', 'immeuble'], weight: 3 },
      job: { words: ['métier', 'job', 'travail', 'emploi', 'profession', 'carrière', 'poste'], weight: 3 },
      vehicle: { words: ['voiture', 'véhicule', 'moto', 'bateau', 'hélicoptère', 'concessionnaire'], weight: 3 },
      weapon: { words: ['arme', 'pistolet', 'fusil', 'mitraillette', 'sniper', 'shotgun'], weight: 3 },
      territory: { words: ['territoire', 'zone', 'quartier', 'district', 'secteur', 'région'], weight: 3 },
      npc: { words: ['pnj', 'npc', 'marchand', 'gardien', 'habitant', 'personnage'], weight: 3 },
      event: { words: ['événement', 'event', 'mission', 'quête', 'défi', 'compétition'], weight: 3 }
    };

    // Mots-clés secondaires (poids faible)
    const secondary = {
      faction: ['recruter', 'alliance', 'guerre', 'territoire', 'membre', 'rang'],
      economy: ['acheter', 'vendre', 'investir', 'prêt', 'intérêt', 'dette'],
      housing: ['acheter', 'louer', 'meuble', 'garage', 'clé', 'porte'],
      job: ['embaucher', 'promouvoir', 'licencier', 'salaire', 'grade'],
      vehicle: ['conduire', 'acheter', 'vendre', 'tuning', 'réparation'],
      weapon: ['tirer', 'munition', 'dégât', 'portée', 'cadence'],
      territory: ['contrôler', 'défendre', 'attaquer', 'influence', 'frontière'],
      npc: ['parler', 'dialoguer', 'interagir', 'commerce', 'service'],
      event: ['participer', 'gagner', 'perdre', 'récompense', 'challenge']
    };

    // Calculer les scores
    for (const [type, { words, weight }] of Object.entries(keywords)) {
      for (const word of words) {
        if (r.includes(word)) {
          scores[type] += weight;
        }
      }
    }

    for (const [type, words] of Object.entries(secondary)) {
      for (const word of words) {
        if (r.includes(word)) {
          scores[type] += 1;
        }
      }
    }

    // Retourner le type avec le score le plus élevé
    const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
    
    if (sorted[0][1] === 0) return 'custom';
    if (sorted[0][1] === sorted[1][1]) return 'complex'; // Types mixtes
    return sorted[0][0];
  }

  _detectComplexity(r) {
    const wordCount = r.split(/\s+/).length;
    const hasDetails = /\d+|paramètres?|configuration|options?/i.test(r);
    const hasMultiple = /et|avec|aussi|également|plusieurs/i.test(r);
    
    if (wordCount > 50 && hasDetails && hasMultiple) return 'complex';
    if (wordCount > 20 && (hasDetails || hasMultiple)) return 'advanced';
    if (wordCount > 10) return 'standard';
    return 'basic';
  }

  _extractEntities(r) {
    const entities = [];

    // Noms propres
    const namePatterns = [
      /["""]([^"""]+)["""]/g,
      /(?:appelé|nommé|called|named)\s+["']?([^"'\s]+(?: ["'][^"'\s]+)*)["']?/gi,
      /(?:crée|create|add|new)\s+(?:un\s+|une\s+)?["']?([^"'\s]+)["']?/gi
    ];

    for (const pattern of namePatterns) {
      let match;
      while ((match = pattern.exec(r)) !== null) {
        entities.push({
          type: 'named_entity',
          value: match[1].trim(),
          confidence: 0.8
        });
      }
    }

    // Nombres et quantités
    const numbers = r.match(/\d+/g);
    if (numbers) {
      entities.push({
        type: 'quantity',
        value: numbers.map(Number),
        confidence: 0.9
      });
    }

    // Mots-clés spécifiques
    const specificKeywords = ['argent', 'membres', 'prix', 'salaire', 'dégâts'];
    for (const keyword of specificKeywords) {
      if (r.includes(keyword)) {
        entities.push({
          type: 'keyword',
          value: keyword,
          confidence: 0.7
        });
      }
    }

    return entities;
  }

  _extractRelations(r) {
    const relations = [];
    
    // Patterns de relations
    const relationPatterns = [
      { pattern: /(\w+)\s+(?:appartient|belongs)\s+(?:à|to)\s+(\w+)/i, type: 'ownership' },
      { pattern: /(\w+)\s+(?:contrôle|controls)\s+(\w+)/i, type: 'control' },
      { pattern: /(\w+)\s+(?:connect|connecté)\s+(?:à|to)\s+(\w+)/i, type: 'connection' },
      { pattern: /(\w+)\s+(?:dépend|depends)\s+(?:de|on)\s+(\w+)/i, type: 'dependency' },
      { pattern: /(\w+)\s+(?:contient|contains)\s+(\w+)/i, type: 'containment' },
    ];

    for (const { pattern, type } of relationPatterns) {
      const match = r.match(pattern);
      if (match) {
        relations.push({
          type,
          from: match[1],
          to: match[2],
          confidence: 0.8
        });
      }
    }

    return relations;
  }

  _extractConstraints(r) {
    const constraints = [];

    // Contraintes de nombre
    const numberConstraints = r.match(/(\d+)\s*(?:maximum?|minimum?|limite?|max|min)/gi);
    if (numberConstraints) {
      constraints.push({ type: 'numeric', values: numberConstraints });
    }

    // Contraintes de temps
    if (/temps?|time|durée|duration|heure|hour/i.test(r)) {
      constraints.push({ type: 'temporal', description: 'Contrainte temporelle détectée' });
    }

    // Contraintes de permission
    if (/admin|mod|permission|rôle|role/i.test(r)) {
      constraints.push({ type: 'permission', description: 'Contrainte de permission détectée' });
    }

    return constraints;
  }

  _detectIntent(r) {
    if (/crée|génère|create|generate|new|nouveau/i.test(r)) return 'creation';
    if (/modifie|change|update|modify|edit|édite/i.test(r)) return 'modification';
    if (/supprime|efface|delete|remove|détruit/i.test(r)) return 'deletion';
    if (/connect|lie|link|relie|associe/i.test(r)) return 'connection';
    if (/test|simule|simulate|vérifie|check/i.test(r)) return 'validation';
    return 'unknown';
  }

  _analyzeSentiment(r) {
    const positif = ['bon', 'bien', 'excellent', 'parfait', 'super', 'génial', 'beau', 'simple'];
    const negatif = ['mauvais', 'bug', 'problème', 'casse', 'marche pas', 'erreur', 'compliqué'];
    
    const words = r.toLowerCase().split(/\s+/);
    const posCount = words.filter(w => positif.includes(w)).length;
    const negCount = words.filter(w => negatif.includes(w)).length;

    return { positive: posCount, negative: negCount, score: posCount - negCount };
  }

  _analyzeDependencies(entities, relations) {
    const deps = [];
    const entityValues = entities.map(e => e.value).flat();

    for (const rel of relations) {
      if (entityValues.includes(rel.from) || entityValues.includes(rel.to)) {
        deps.push(rel);
      }
    }

    return deps;
  }

  _calculateClarity(r, cognition) {
    let clarity = 0.5;

    // Plus il y a d'entités, plus c'est clair
    clarity += cognition.entities.length * 0.05;
    
    // Plus il y a de relations, plus c'est clair
    clarity += cognition.relations.length * 0.1;
    
    // Moins il y a d'ambiguïté, plus c'est clair
    if (cognition.type !== 'custom' && cognition.type !== 'complex') {
      clarity += 0.2;
    }

    // Phrases longues = moins claires
    const words = r.split(/\s+/).length;
    if (words > 100) clarity -= 0.1;
    if (words > 200) clarity -= 0.2;

    return Math.max(0, Math.min(1, clarity));
  }

  // ─── PHASE 2: GENESIS ─────────────────────────────────────────────────────

  async _genesis(cognition) {
    // Templates de création pour chaque type
    const genesisTemplates = {
      faction: this._genesisFaction.bind(this),
      economy: this._genesisEconomy.bind(this),
      housing: this._genesisHousing.bind(this),
      job: this._genesisJob.bind(this),
      vehicle: this._genesisVehicle.bind(this),
      weapon: this._genesisWeapon.bind(this),
      territory: this._genesisTerritory.bind(this),
      npc: this._genesisNPC.bind(this),
      event: this._genesisEvent.bind(this),
      complex: this._genesisComplex.bind(this),
      custom: this._genesisCustom.bind(this)
    };

    const generator = genesisTemplates[cognition.type] || genesisTemplates.custom;
    const baseSchema = await generator(cognition);

    // Ajouter les métadonnées standardisées
    baseSchema._meta = {
      ...baseSchema._meta,
      cognitionId: cognition.timestamp,
      complexity: cognition.complexity,
      clarity: cognition.clarity,
      evolutionIterations: 0,
      prismaVersion: '4.0.0'
    };

    this.genesis.set(baseSchema.id, baseSchema);
    return baseSchema;
  }

  async _genesisFaction(cognition) {
    return {
      id: `faction_schema_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      name: 'Nouvelle Faction',
      type: 'faction',
      version: '1.0.0',
      data: {
        identity: {
          name: null,
          type: 'gang',
          color: '#ff0000',
          emblem: null,
          motto: null,
          founded: new Date().toISOString()
        },
        hierarchy: {
          leader: null,
          ranks: [
            { id: 'leader', name: 'Chef', permissions: ['*'] },
            { id: 'co-leader', name: 'Co-Chef', permissions: ['manage_members', 'manage_economy'] },
            { id: 'captain', name: 'Capitaine', permissions: ['invite', 'kick', 'manage_territory'] },
            { id: 'member', name: 'Membre', permissions: ['view_territory', 'use_armory'] },
            { id: 'recruit', name: 'Recrue', permissions: ['view_chat'] }
          ],
          maxMembers: 50,
          memberLimit: {
            recruit: null,
            member: null,
            captain: 5,
            'co-leader': 2,
            leader: 1
          }
        },
        economy: {
          bank: 0,
          income: 0,
          expenses: 0,
          taxRate: 0.05,
          lastPayday: null
        },
        territory: {
          owned: [],
          influence: 0,
          maxZones: 5,
          contested: []
        },
        armory: {
          weapons: [],
          ammo: [],
          maxSlots: 50
        },
        vehicles: {
          owned: [],
          maxSlots: 10,
          parking: null
        },
        diplomacy: {
          allies: [],
          enemies: [],
          wars: [],
          treaties: []
        },
        stats: {
          kills: 0,
          deaths: 0,
          territoriesWon: 0,
          territoriesLost: 0,
          wealth: 0
        }
      },
      _meta: {
        type: 'faction',
        template: 'standard',
        version: '1.0.0'
      }
    };
  }

  async _genesisEconomy(cognition) {
    return {
      id: `economy_schema_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      name: 'Système Économique',
      type: 'economy',
      version: '1.0.0',
      data: {
        banks: {
          central: {
            name: 'Banque Centrale',
            reserve: 10000000,
            interestRate: 0.02,
            maxLoan: 500000
          },
          commercial: {
            name: 'Banque Commerciale',
            reserve: 5000000,
            interestRate: 0.035,
            maxLoan: 250000
          },
          underground: {
            name: 'Banque Souterraine',
            reserve: 2000000,
            interestRate: 0.08,
            maxLoan: 100000,
            illegal: true
          }
        },
        taxes: {
          income: { rate: 0.05, bracket: [] },
          property: { rate: 0.02, exemption: 50000 },
          sales: { rate: 0.08, categories: ['luxury', 'standard'] },
          luxury: { rate: 0.15, threshold: 10000 },
          wealth: { rate: 0.01, threshold: 1000000 }
        },
        jobs: {
          government: ['police', 'ems', 'judge', 'lawyer'],
          civilian: ['mechanic', 'vendor', 'fisher', 'miner', 'farmer'],
          illegal: ['drug_dealer', 'hacker', 'fence', 'smuggler'],
          salary: {
            min: 500,
            max: 10000,
            average: 2500
          }
        },
        inflation: {
          current: 0.02,
          history: [],
          factors: ['money_supply', 'demand', 'events']
        },
        market: {
          stocks: [],
          commodities: [],
          black_market: {
            active: true,
            premium: 0.3,
            risk: 'medium'
          }
        }
      },
      _meta: {
        type: 'economy',
        template: 'advanced',
        version: '1.0.0'
      }
    };
  }

  async _genesisHousing(cognition) {
    return {
      id: `housing_schema_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      name: 'Système Immobilier',
      type: 'housing',
      version: '1.0.0',
      data: {
        types: {
          apartment: { priceRange: [25000, 100000], maxStorage: 50, garage: false },
          house: { priceRange: [75000, 300000], maxStorage: 100, garage: true },
          villa: { priceRange: [200000, 800000], maxStorage: 200, garage: 2 },
          penthouse: { priceRange: [150000, 500000], maxStorage: 150, garage: false },
          warehouse: { priceRange: [50000, 200000], maxStorage: 500, garage: false }
        },
        limits: {
          maxPerPlayer: 3,
          maxTotal: 500,
          rentEnabled: true
        },
        features: {
          furniture: true,
          decoration: true,
          keys: { max: 5, shareable: true },
          garage: { vehicleSlots: 1, upgradeable: true },
          security: { alarm: true, cameras: true, safe: true }
        },
        economy: {
          rentMultiplier: 0.02,
          sellTax: 0.05,
          renovationCost: 1000,
          propertyTax: 0.02
        },
        interiors: ['default', 'luxury', 'modern', 'vintage', 'industrial']
      },
      _meta: {
        type: 'housing',
        template: 'standard',
        version: '1.0.0'
      }
    };
  }

  async _genesisJob(cognition) {
    return {
      id: `job_schema_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      name: 'Nouveau Métier',
      type: 'job',
      version: '1.0.0',
      data: {
        identity: {
          name: null,
          type: 'civilian',
          category: 'service',
          description: null
        },
        grades: [
          { level: 1, name: 'Stagiaire', salary: 500, permissions: ['basic'] },
          { level: 2, name: 'Employé', salary: 1000, permissions: ['work', 'use_tools'] },
          { level: 3, name: 'Senior', salary: 1500, permissions: ['train', 'manage'] },
          { level: 4, name: 'Superviseur', salary: 2000, permissions: ['schedule', 'evaluate'] },
          { level: 5, name: 'Manager', salary: 3000, permissions: ['hire', 'fire'] }
        ],
        duties: [
          { id: 'duty_1', name: 'Tâche principale', description: null, xpReward: 10, moneyReward: 50 },
          { id: 'duty_2', name: 'Tâche secondaire', description: null, xpReward: 5, moneyReward: 25 }
        ],
        requirements: {
          minLevel: 1,
          skills: [],
          items: [],
          vehicles: []
        },
        schedule: {
          hours: { start: 8, end: 18 },
          daysOff: [6, 7],
          maxOvertime: 4
        },
        benefits: {
          insurance: false,
          vehicle: null,
          housing: null,
          bonuses: []
        }
      },
      _meta: {
        type: 'job',
        template: 'standard',
        version: '1.0.0'
      }
    };
  }

  async _genesisVehicle(cognition) {
    return {
      id: `vehicle_schema_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      name: 'Nouveau Véhicule',
      type: 'vehicle',
      version: '1.0.0',
      data: {
        identity: {
          model: null,
          brand: null,
          type: 'car',
          year: 2024,
          class: 'standard'
        },
        performance: {
          speed: { max: 150, acceleration: 5, braking: 8 },
          handling: { steering: 7, stability: 6, traction: 7 },
          fuel: { type: 'essence', capacity: 50, consumption: 8 }
        },
        physical: {
          seats: 4,
          doors: 4,
          trunk: 50,
          weight: 1500,
          dimensions: { length: 4.5, width: 1.8, height: 1.4 }
        },
        customization: {
          colors: ['#ffffff', '#000000', '#ff0000', '#0000ff'],
          parts: ['bumper', 'spoiler', 'rims', 'exhaust'],
          performance: ['engine', 'suspension', 'brakes', 'turbo'],
          visual: ['neon', 'wrap', 'window_tint']
        },
        economy: {
          price: 25000,
          insurance: 500,
          tax: 0.08,
          depreciation: 0.1
        }
      },
      _meta: {
        type: 'vehicle',
        template: 'standard',
        version: '1.0.0'
      }
    };
  }

  async _genesisWeapon(cognition) {
    return {
      id: `weapon_schema_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      name: 'Nouvelle Arme',
      type: 'weapon',
      version: '1.0.0',
      data: {
        identity: {
          name: null,
          type: 'pistol',
          category: 'firearm',
          caliber: '9mm'
        },
        stats: {
          damage: 25,
          fireRate: 400,
          range: 50,
          accuracy: 0.85,
          recoil: 0.3,
          penetration: 0.5
        },
        magazine: {
          capacity: 15,
          type: 'detachable',
          reloadTime: 2000
        },
        attachments: {
          barrel: ['suppressor', 'compensator'],
          sight: ['red_dot', 'holographic', 'scope'],
          grip: ['vertical', 'angled', 'none'],
          underbarrel: ['flashlight', 'laser', 'bipod']
        },
        ammo: {
          types: ['standard', 'hollow_point', 'armor_piercing', 'tracer'],
          pricePerRound: 2,
          maxCarry: 120
        },
        economy: {
          price: 5000,
          illegal: false,
          license: 'firearm'
        }
      },
      _meta: {
        type: 'weapon',
        template: 'standard',
        version: '1.0.0'
      }
    };
  }

  async _genesisTerritory(cognition) {
    return {
      id: `territory_schema_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      name: 'Nouveau Territoire',
      type: 'territory',
      version: '1.0.0',
      data: {
        identity: {
          name: null,
          district: null,
          type: 'urban',
          size: 'medium'
        },
        boundaries: {
          points: [],
          center: { x: 0, y: 0, z: 0 },
          radius: 100
        },
        control: {
          owner: null,
          contested: false,
          captureProgress: 0,
          lastCaptured: null,
          captureTime: 300000 // 5 minutes
        },
        economy: {
          incomePerHour: 100,
          businesses: [],
          resources: []
        },
        features: {
          safeZone: false,
          policePresence: 'low',
          civilianTraffic: 'medium',
          illegalActivity: 'low'
        },
        influence: {
          current: 50,
          max: 100,
          decayRate: 0.1,
          bonuses: []
        }
      },
      _meta: {
        type: 'territory',
        template: 'standard',
        version: '1.0.0'
      }
    };
  }

  async _genesisNPC(cognition) {
    return {
      id: `npc_schema_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      name: 'Nouveau PNJ',
      type: 'npc',
      version: '1.0.0',
      data: {
        identity: {
          name: null,
          age: 30,
          gender: 'male',
          model: 'default'
        },
        behavior: {
          routine: [
            { time: '08:00', action: 'ouvrir_magasin', location: 'shop' },
            { time: '12:00', action: 'pause_dejeuner', location: 'restaurant' },
            { time: '18:00', action: 'fermer_magasin', location: 'shop' },
            { time: '20:00', action: 'rentrer_maison', location: 'home' }
          ],
          personality: {
            traits: ['amical', 'honnête'],
            aggression: 0.2,
            fear: 0.3,
            greed: 0.5
          }
        },
        interactions: {
          dialogues: [],
          trades: { enabled: true, markup: 0.1 },
          missions: { enabled: false, available: [] }
        },
        economy: {
          money: 5000,
          inventory: [],
          salary: null
        }
      },
      _meta: {
        type: 'npc',
        template: 'standard',
        version: '1.0.0'
      }
    };
  }

  async _genesisEvent(cognition) {
    return {
      id: `event_schema_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      name: 'Nouvel Événement',
      type: 'event',
      version: '1.0.0',
      data: {
        identity: {
          name: null,
          type: 'world',
          category: 'special',
          description: null
        },
        timing: {
          startTime: null,
          endTime: null,
          duration: 3600000, // 1 heure
          repeatable: false,
          interval: null
        },
        participation: {
          minPlayers: 1,
          maxPlayers: 50,
          levelRequirement: 1,
          factionRestriction: null
        },
        rewards: {
          money: 10000,
          xp: 500,
          items: [],
          reputation: 10
        },
        mechanics: {
          type: 'capture_the_flag',
          teams: 2,
          duration: 1800,
          respawn: true,
          respawnTime: 10000
        },
        location: {
          position: { x: 0, y: 0, z: 0 },
          radius: 200,
          safeZone: false
        }
      },
      _meta: {
        type: 'event',
        template: 'standard',
        version: '1.0.0'
      }
    };
  }

  async _genesisComplex(cognition) {
    // Pour les demandes complexes, créer un méta-schéma qui combine plusieurs types
    return {
      id: `complex_schema_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      name: 'Système Complexe',
      type: 'complex',
      version: '1.0.0',
      data: {
        components: [],
        relations: cognition.relations,
        orchestration: {
          type: 'sequential',
          dependencies: cognition.dependencies
        }
      },
      _meta: {
        type: 'complex',
        template: 'dynamic',
        version: '1.0.0'
      }
    };
  }

  async _genesisCustom(cognition) {
    return {
      id: `custom_schema_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      name: 'Schéma Personnalisé',
      type: 'custom',
      version: '1.0.0',
      data: {
        raw: cognition.entities,
        structure: cognition.relations,
        constraints: cognition.constraints
      },
      _meta: {
        type: 'custom',
        template: 'flexible',
        version: '1.0.0'
      }
    };
  }

  // ─── PHASE 3: TRANSFORMATION ───────────────────────────────────────────────

  async _transform(genesis, request) {
    const transformer = this.transformers[genesis.type];
    if (!transformer) return genesis;

    const transformed = await transformer(genesis, request);
    
    // Appliquer les transformations de base communes
    transformed._meta.transformed = true;
    transformed._meta.transformedAt = new Date().toISOString();

    return transformed;
  }

  async _transformFaction(schema, request) {
    const r = request.toLowerCase();
    const faction = schema.data;

    // Extraire des infos de la demande
    if (r.includes('gang')) faction.identity.type = 'gang';
    else if (r.includes('police') || r.includes('ems')) faction.identity.type = 'government';
    else if (r.includes('entreprise') || r.includes('company')) faction.identity.type = 'corporation';

    // Gérer les couleurs
    const colors = r.match(/#[0-9a-f]{6}/gi);
    if (colors) faction.identity.color = colors[0];

    // Extraire le nombre de membres
    const memberMatch = r.match(/(\d+)\s*membres?/i);
    if (memberMatch) faction.hierarchy.maxMembers = parseInt(memberMatch[1]);

    return schema;
  }

  async _transformEconomy(schema, request) {
    const r = request.toLowerCase();
    const economy = schema.data;

    if (r.includes('taxe') || r.includes('tax')) {
      const rateMatch = r.match(/(\d+)\s*%/g);
      if (rateMatch) {
        economy.taxes.income.rate = parseInt(rateMatch[0]) / 100;
      }
    }

    return schema;
  }

  async _transformHousing(schema, request) {
    const r = request.toLowerCase();
    const housing = schema.data;

    if (r.includes('villa')) housing.types.villa.priceRange = [300000, 1000000];
    if (r.includes('appartement') || r.includes('apartment')) {
      housing.types.apartment.priceRange = [50000, 200000];
    }

    return schema;
  }

  async _transformJob(schema, request) {
    const r = request.toLowerCase();
    const job = schema.data;

    if (r.includes('police')) {
      job.identity.type = 'government';
      job.identity.category = 'law_enforcement';
      job.grades = [
        { level: 1, name: 'Cadet', salary: 1000 },
        { level: 2, name: 'Officier', salary: 1500 },
        { level: 3, name: 'Sergent', salary: 2000 },
        { level: 4, name: 'Lieutenant', salary: 3000 },
        { level: 5, name: 'Capitaine', salary: 4000 },
        { level: 6, name: 'Chef', salary: 5000 }
      ];
    }

    if (r.includes('médecin') || r.includes('medic') || r.includes('ems')) {
      job.identity.type = 'government';
      job.identity.category = 'emergency';
    }

    return schema;
  }

  async _transformVehicle(schema, request) {
    const r = request.toLowerCase();
    const vehicle = schema.data;

    if (r.includes('moto') || r.includes('bike')) {
      vehicle.identity.type = 'bike';
      vehicle.performance.speed.max = 200;
      vehicle.physical.seats = 2;
    }

    if (r.includes('camion') || r.includes('truck')) {
      vehicle.identity.type = 'truck';
      vehicle.physical.trunk = 500;
      vehicle.performance.speed.max = 100;
    }

    const priceMatch = r.match(/(\d+)\s*(?:€|\$|euros?|dollars?)/i);
    if (priceMatch) vehicle.economy.price = parseInt(priceMatch[1]);

    return schema;
  }

  async _transformWeapon(schema, request) {
    const r = request.toLowerCase();
    const weapon = schema.data;

    if (r.includes('pompe') || r.includes('shotgun')) {
      weapon.identity.type = 'shotgun';
      weapon.stats.damage = 40;
      weapon.stats.range = 30;
      weapon.stats.spread = 0.8;
      weapon.magazine.capacity = 8;
    }

    if (r.includes('sniper')) {
      weapon.identity.type = 'sniper';
      weapon.stats.damage = 80;
      weapon.stats.range = 200;
      weapon.stats.accuracy = 0.95;
      weapon.magazine.capacity = 5;
    }

    if (r.includes('mitraillette') || r.includes('smg')) {
      weapon.identity.type = 'smg';
      weapon.stats.fireRate = 150;
      weapon.stats.range = 35;
      weapon.magazine.capacity = 30;
    }

    return schema;
  }

  async _transformTerritory(schema, request) {
    const r = request.toLowerCase();
    const territory = schema.data;

    const sizeMatch = r.match(/(petit|moyen|grand|small|medium|large|big)/i);
    if (sizeMatch) {
      const sizes = { petit: 50, small: 50, moyen: 100, medium: 100, grand: 200, large: 200, big: 200 };
      territory.boundaries.radius = sizes[sizeMatch[1].toLowerCase()] || 100;
    }

    return schema;
  }

  async _transformNPC(schema, request) {
    const r = request.toLowerCase();
    const npc = schema.data;

    if (r.includes('marchand') || r.includes('vendor') || r.includes('commerçant')) {
      npc.behavior.routine[0].action = 'ouvrir_magasin';
      npc.interactions.trades.markup = 0.15;
    }

    if (r.includes('gardien') || r.includes('guard')) {
      npc.behavior.personality.aggression = 0.7;
      npc.behavior.routine = [
        { time: '00:00', action: 'patrouiller', location: 'zone' }
      ];
    }

    return schema;
  }

  async _transformEvent(schema, request) {
    const r = request.toLowerCase();
    const event = schema.data;

    if (r.includes('braquage') || r.includes('heist') || r.includes('braquage')) {
      event.mechanics.type = 'heist';
      event.rewards.money = 100000;
      event.participation.maxPlayers = 6;
    }

    return schema;
  }

  // ─── PHASE 4: ÉVOLUTION ────────────────────────────────────────────────────

  async _evolve(schema) {
    // Chercher des schémas similaires pour amélioration
    const similarPatterns = this._findSimilarPatterns(schema.type);
    
    if (similarPatterns.length > 0) {
      // Fusionner les meilleures pratiques des schémas précédents
      for (const pattern of similarPatterns.slice(0, 3)) {
        schema = this._mergePattern(schema, pattern);
      }
      schema._meta.evolutionIterations = (schema._meta.evolutionIterations || 0) + 1;
    }

    // Auto-amélioration basée sur les règles
    schema = this._autoImprove(schema);

    // Versionner
    schema._meta.evolvedAt = new Date().toISOString();
    schema._meta.version = this._bumpVersion(schema._meta.version);

    return schema;
  }

  _findSimilarPatterns(type) {
    const patterns = [];
    
    for (const [key, data] of this.evolution) {
      if (data.type === type) {
        patterns.push(data);
      }
    }

    return patterns.sort((a, b) => b.success - a.success);
  }

  _mergePattern(schema, pattern) {
    // Fusion intelligente: ne prendre que les améliorations
    const merged = JSON.parse(JSON.stringify(schema));

    if (pattern.data) {
      for (const [key, value] of Object.entries(pattern.data)) {
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value) && Array.isArray(merged.data[key])) {
            // Fusionner les arrays sans doublons
            const existing = new Set(merged.data[key].map(i => JSON.stringify(i)));
            for (const item of value) {
              if (!existing.has(JSON.stringify(item))) {
                merged.data[key].push(item);
              }
            }
          } else if (typeof value === 'object' && merged.data[key]) {
            // Fusion récursive
            Object.assign(merged.data[key], value);
          }
        }
      }
    }

    return merged;
  }

  _autoImprove(schema) {
    // Règles d'amélioration automatique
    if (schema.data) {
      // Ajouter des champs manquants
      if (schema.data.diplomacy && !schema.data.diplomacy.treaties) {
        schema.data.diplomacy.treaties = [];
      }
      
      // Normaliser les prix
      if (schema.data.economy) {
        for (const [key, value] of Object.entries(schema.data.economy)) {
          if (typeof value === 'number' && value > 10000000) {
            schema.data.economy[key] = 10000000; // Plafond
          }
        }
      }
    }

    return schema;
  }

  _bumpVersion(version) {
    const parts = version.split('.').map(Number);
    parts[2] = (parts[2] || 0) + 1;
    if (parts[2] >= 100) { parts[1]++; parts[2] = 0; }
    if (parts[1] >= 100) { parts[0]++; parts[1] = 0; }
    return parts.join('.');
  }

  // ─── PHASE 5: VALIDATION ───────────────────────────────────────────────────

  async _validate(schema) {
    const validation = {
      valid: true,
      score: 100,
      warnings: [],
      errors: []
    };

    // Validation structurelle
    if (!schema.id) { validation.errors.push('ID manquant'); validation.score -= 20; }
    if (!schema.data) { validation.errors.push('Données manquantes'); validation.score -= 30; }
    if (!schema._meta) { validation.warnings.push('Métadonnées manquantes'); validation.score -= 10; }

    // Validation du contenu
    if (schema.data) {
      // Vérifier les valeurs aberrantes
      this._validateValues(schema.data, validation, '');

      // Vérifier les dépendances circulaires
      if (schema.data.diplomacy) {
        if (schema.data.diplomacy.allies?.includes(schema.data.diplomacy.enemies)) {
          validation.warnings.push('Un allié est aussi un ennemi');
          validation.score -= 5;
        }
      }
    }

    validation.valid = validation.errors.length === 0 && validation.score >= 50;

    return validation;
  }

  _validateValues(obj, validation, path) {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = path ? `${path}.${key}` : key;

      if (typeof value === 'object' && value !== null) {
        this._validateValues(value, validation, fullPath);
      } else if (typeof value === 'number') {
        if (isNaN(value)) {
          validation.errors.push(`${fullPath}: NaN`);
          validation.score -= 10;
        }
        if (value < 0 && !['position', 'score', 'balance'].some(k => fullPath.includes(k))) {
          validation.warnings.push(`${fullPath}: Valeur négative inattendue (${value})`);
          validation.score -= 2;
        }
        if (value > 1e12) {
          validation.warnings.push(`${fullPath}: Valeur extrêmement élevée (${value})`);
          validation.score -= 5;
        }
      }
    }
  }

  // ─── PHASE 6: EXPORT ──────────────────────────────────────────────────────

  async _export(schema) {
    return {
      format: 'ether_prism_v4',
      generated: new Date().toISOString(),
      type: schema.type,
      schema: {
        id: schema.id,
        name: schema.name,
        data: schema.data
      },
      import_instructions: {
        order: ['ether-core', 'ether-weave', schema.type],
        validators: ['ether-guard'],
        tests: ['ether-sim']
      },
      dependencies: this._getDependencies(schema.type),
      compatibility: {
        minVersion: '4.0.0',
        maxVersion: '5.0.0',
        requiredModules: ['kernel', 'agents', 'intellectus']
      }
    };
  }

  _getDependencies(type) {
    const deps = {
      faction: ['economy', 'territory', 'housing'],
      economy: ['faction', 'job', 'housing'],
      housing: ['economy', 'faction'],
      job: ['economy'],
      vehicle: ['economy'],
      weapon: ['economy'],
      territory: ['faction', 'economy'],
      npc: ['economy', 'job'],
      event: ['faction', 'economy', 'territory']
    };

    return deps[type] || ['core'];
  }

  _memorize(cognition, schema, validation) {
    this.evolution.set(schema.id, {
      type: schema.type,
      data: schema.data,
      cognition,
      success: validation.valid ? 1 : 0,
      timestamp: Date.now()
    });

    // Nettoyer les vieilles entrées
    if (this.evolution.size > 100) {
      const oldest = [...this.evolution.entries()]
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0];
      this.evolution.delete(oldest[0]);
    }
  }
}