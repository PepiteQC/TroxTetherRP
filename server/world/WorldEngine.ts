/**
 * WorldEngine — Moteur du monde 3D de Port-Éther
 * Districts · Zones RP · Points d'intérêt · Météo · Heure
 * Port-Éther RP — Fichier: server/world/WorldEngine.ts
 * 
 * AMÉLIORATION SPÉCIALE — Le monde devient un organisme vivant
 * avec humeurs, événements dynamiques, écosystème de gangs,
 * légendes urbaines, et cycles lunaires.
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'node:crypto';
import { kernel } from '../kernel.js';
import { logger } from '../shared/logger.js';

// ─── Types améliorés ──────────────────────────────────────────────────────────

export interface District {
  id: string;
  name: string;
  description: string;
  color: string;
  safeZone: boolean;
  center: { x: number; z: number };
  radius: number;
  gangId?: string;
  crimeLevel: 0 | 1 | 2 | 3 | 4 | 5;

  // ★ NOUVEAU : Âme du district
  mood: 'calme' | 'tendu' | 'festif' | 'triste' | 'revolte';
  influence: number;               // 0-100 — influence du gang control
  prosperity: number;              // 0-100 — santé économique
  population: number;              // NPCs simulés
  lastEvent?: WorldEvent;          // Dernier événement marquant
  rumors: string[];                // Rumeurs actives dans le district
  ambientSound: string;            // Ambiance sonore
}

export interface InterestPoint {
  id: string;
  name: string;
  type: POIType;
  district: string;
  position: { x: number; y: number; z: number };
  heading: number;
  isOpen: boolean;
  openHours: { open: number; close: number };
  requiresJob?: string;
  interactionRadius: number;
  description: string;
  flavorText: string;              // ★ Texte d'ambiance contextuel
  lastVisitedBy?: string[];        // ★ Derniers joueurs
  reputation: number;              // ★ 0-100
  customizations?: Record<string, any>; // ★ Évolutions possibles
}

export type POIType =
  | 'bank' | 'hospital' | 'police_station' | 'fire_station'
  | 'garage' | 'car_dealer' | 'gun_shop' | 'clothing_store'
  | 'grocery' | 'pharmacy' | 'bar' | 'restaurant'
  | 'hotel' | 'casino' | 'courthouse' | 'city_hall'
  | 'spawn' | 'atm' | 'black_market' | 'gas_station'
  | 'radio' | 'port' | 'eglise' | 'temple'       // ★ Nouveaux
  | 'club' | 'parc' | 'marina' | 'marche';        // ★ Nouveaux

export interface WorldTime {
  hour: number;
  minute: number;
  day: number;
  weekDay: 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche';
  month: number;
  season: 'printemps' | 'ete' | 'automne' | 'hiver';
  isNight: boolean;
  moonPhase: 'nouvelle' | 'croissante' | 'pleine' | 'decroissante'; // ★
  timestamp: number;
}

export interface Weather {
  type: 'ensoleille' | 'nuageux' | 'pluvieux' | 'orageux' | 'neigeux' | 'brouillard' | 'tempete'; // ★
  intensity: 0 | 1 | 2 | 3;
  wind: number;
  temperature: number;
  visibility: number;
  feelsLike: number;               // ★ Température ressentie
  precipitation: number;           // ★ mm/h
  uvIndex: number;                 // ★
}

// ★ NOUVEAU : Événements dynamiques du monde
export interface WorldEvent {
  id: string;
  type: 'braquage' | 'bagarre' | 'incendie' | 'manifestation'
  | 'concert' | 'carfree' | 'inondation' | 'coupure'
  | 'decouverte' | 'epidemie' | 'festival' | 'attaque_gang';
  district: string;
  position: { x: number; y: number; z: number };
  title: string;
  description: string;
  severity: 1 | 2 | 3 | 4 | 5;
  startHour: number;
  durationHours: number;
  active: boolean;
  participants?: number;
  lootable?: boolean;
}

// ★ NOUVEAU : Gang dynamics
export interface Gang {
  id: string;
  name: string;
  color: string;
  territory: string[];
  strength: number;
  treasury: number;
  leader: string;
  members: number;
  ally?: string;
  enemy?: string;
  activity: 'faible' | 'moyen' | 'eleve' | 'tres_eleve';
  lastRaid?: number;              // Timestamp
}

// ★ NOUVEAU : Légendes urbaines
export interface UrbanLegend {
  id: string;
  name: string;
  description: string;
  district: string;
  sightings: number;
  lastSighted?: number;
  verified: boolean;
  fearFactor: 1 | 2 | 3 | 4 | 5;
}

// ─── Définition enrichie de Port-Éther ────────────────────────────────────────

const PORT_ETHER_DISTRICTS: District[] = [
  {
    id: 'centre_ville',
    name: 'Centre-Ville',
    description: 'Le cœur commercial et administratif de Port-Éther',
    color: '#3B82F6',
    safeZone: true,
    center: { x: 0, z: 0 },
    radius: 200,
    crimeLevel: 1,
    mood: 'calme',
    influence: 15,
    prosperity: 85,
    population: 1200,
    rumors: ['Une nouvelle loi municipale se prépare'],
    ambientSound: 'ambient_city_day',
  },
  {
    id: 'vieux_port',
    name: 'Vieux-Port',
    description: 'Le quartier historique avec ses docks et entrepôts',
    color: '#92400E',
    safeZone: false,
    center: { x: -300, z: 200 },
    radius: 150,
    crimeLevel: 3,
    mood: 'tendu',
    influence: 60,
    prosperity: 35,
    population: 800,
    rumors: ['Un trésor serait caché dans les docks abandonnés'],
    ambientSound: 'ambient_docks',
  },
  {
    id: 'quartier_affaires',
    name: 'Quartier des Affaires',
    description: 'Tours de bureaux, banques et commerces haut de gamme',
    color: '#1D4ED8',
    safeZone: true,
    center: { x: 300, z: -100 },
    radius: 180,
    crimeLevel: 0,
    mood: 'calme',
    influence: 10,
    prosperity: 95,
    population: 600,
    rumors: ['Une fusion majeure entre deux entreprises'],
    ambientSound: 'ambient_business',
  },
  {
    id: 'basse_ville',
    name: 'Basse-Ville',
    description: 'Quartier résidentiel populaire, forte présence de gangs',
    color: '#B91C1C',
    safeZone: false,
    center: { x: -200, z: -300 },
    radius: 200,
    crimeLevel: 4,
    mood: 'revolte',
    influence: 85,
    prosperity: 15,
    population: 1500,
    rumors: ['Les Serpents d\'Airain préparent un coup'],
    ambientSound: 'ambient_ghetto',
  },
  {
    id: 'plateau_vert',
    name: 'Plateau-Vert',
    description: 'Zone résidentielle calme avec parcs et maisons bourgeoises',
    color: '#16A34A',
    safeZone: true,
    center: { x: 400, z: 300 },
    radius: 220,
    crimeLevel: 0,
    mood: 'calme',
    influence: 5,
    prosperity: 90,
    population: 900,
    rumors: ['Des animaux sauvages ont été aperçus dans le parc'],
    ambientSound: 'ambient_park',
  },
  {
    id: 'zone_industrielle',
    name: 'Zone Industrielle',
    description: 'Usines, entrepôts et trafic illégal en périphérie',
    color: '#374151',
    safeZone: false,
    center: { x: -500, z: 100 },
    radius: 250,
    crimeLevel: 5,
    mood: 'triste',
    influence: 90,
    prosperity: 10,
    population: 400,
    rumors: ['Une usine abandonnée servirait de repaire'],
    ambientSound: 'ambient_industrial',
  },
];

const PORT_ETHER_POIS: (InterestPoint & { flavorText: string })[] = [
  { id: 'spde_hq', name: 'Poste de Police Centrale', type: 'police_station', district: 'centre_ville', position: { x: 50, y: 0, z: 50 }, heading: 0, isOpen: true, openHours: { open: 0, close: 24 }, interactionRadius: 10, description: 'Siège du SPDE', flavorText: 'Les lumières du commissariat percent l\'obscurité. Une patrouille part en intervention.', reputation: 75 },
  { id: 'hopital_main', name: 'Hôpital Saint-Luc', type: 'hospital', district: 'centre_ville', position: { x: -50, y: 0, z: 80 }, heading: 90, isOpen: true, openHours: { open: 0, close: 24 }, interactionRadius: 12, description: 'Urgences 24/7', flavorText: 'Une ambulance arrive sirène hurlante. L\'odeur d\'antiseptique flotte dans l\'air.', reputation: 80 },
  { id: 'caserne_1', name: 'Caserne #1', type: 'fire_station', district: 'quartier_affaires', position: { x: 280, y: 0, z: -80 }, heading: 180, isOpen: true, openHours: { open: 0, close: 24 }, interactionRadius: 10, description: 'Brigade principale', flavorText: 'Les pompiers jouent aux cartes. Le camion est prêt à partir.', reputation: 90 },
  { id: 'hotel_de_ville', name: 'Hôtel de Ville', type: 'city_hall', district: 'centre_ville', position: { x: 0, y: 0, z: -50 }, heading: 0, isOpen: true, openHours: { open: 8, close: 20 }, interactionRadius: 8, description: 'Administration municipale', flavorText: 'Des employés sortent avec des dossiers sous le bras.', reputation: 60 },
  { id: 'palais_justice', name: 'Palais de Justice', type: 'courthouse', district: 'quartier_affaires', position: { x: 350, y: 0, z: -50 }, heading: 270, isOpen: true, openHours: { open: 8, close: 18 }, interactionRadius: 8, description: 'Tribunaux de Port-Éther', flavorText: 'Un procès très médiatisé se déroule aujourd\'hui.', reputation: 65 },
  { id: 'banque_nationale', name: 'Banque Nationale de Port-Éther', type: 'bank', district: 'quartier_affaires', position: { x: 320, y: 0, z: -120 }, heading: 90, isOpen: true, openHours: { open: 9, close: 17 }, interactionRadius: 8, description: 'Banque principale', flavorText: 'La porte en verre blindé reflète les gratte-ciels.', reputation: 85 },
  { id: 'atm_centre', name: 'Guichet ATM — Centre', type: 'atm', district: 'centre_ville', position: { x: 20, y: 0, z: 20 }, heading: 0, isOpen: true, openHours: { open: 0, close: 24 }, interactionRadius: 3, description: 'Guichet automatique', flavorText: 'Un SDF dort près du distributeur.', reputation: 50 },
  { id: 'atm_vieux_port', name: 'Guichet ATM — Vieux-Port', type: 'atm', district: 'vieux_port', position: { x: -280, y: 0, z: 180 }, heading: 0, isOpen: true, openHours: { open: 0, close: 24 }, interactionRadius: 3, description: 'Guichet automatique', flavorText: 'Tags et graffitis recouvrent le mur adjacent.', reputation: 25 },
  { id: 'concess_auto', name: 'Concessionnaire AutoMax', type: 'car_dealer', district: 'quartier_affaires', position: { x: 400, y: 0, z: -200 }, heading: 0, isOpen: true, openHours: { open: 9, close: 20 }, interactionRadius: 15, description: 'Vente de véhicules légaux', flavorText: 'Des bolides rutilants alignés sous les néons.', reputation: 70 },
  { id: 'armurerie', name: 'Armurerie Légale', type: 'gun_shop', district: 'centre_ville', position: { x: 80, y: 0, z: -30 }, heading: 270, isOpen: true, openHours: { open: 9, close: 18 }, requiresJob: 'police', interactionRadius: 6, description: 'Vente d\'armes légales', flavorText: 'Le propriétaire vous regarde par-dessus ses lunettes.', reputation: 45 },
  { id: 'iga_centre', name: 'IGA Port-Éther', type: 'grocery', district: 'centre_ville', position: { x: -80, y: 0, z: -80 }, heading: 0, isOpen: true, openHours: { open: 7, close: 23 }, interactionRadius: 10, description: 'Épicerie générale', flavorText: 'Un employé aligne des boîtes de conserve.', reputation: 70 },
  { id: 'pharmaprix', name: 'Pharmaprix', type: 'pharmacy', district: 'centre_ville', position: { x: -30, y: 0, z: 100 }, heading: 180, isOpen: true, openHours: { open: 8, close: 22 }, interactionRadius: 6, description: 'Pharmacie et soins', flavorText: 'Des vitrines bien éclairées exposent des médicaments.', reputation: 80 },
  { id: 'garage_joe', name: 'Garage Joe', type: 'garage', district: 'vieux_port', position: { x: -250, y: 0, z: 150 }, heading: 90, isOpen: true, openHours: { open: 8, close: 20 }, interactionRadius: 12, description: 'Réparations et tuning', flavorText: 'Joe a les mains couvertes de graisse, comme toujours.', reputation: 85 },
  { id: 'casino_royal', name: 'Casino Royal Port-Éther', type: 'casino', district: 'quartier_affaires', position: { x: 380, y: 0, z: -180 }, heading: 0, isOpen: true, openHours: { open: 18, close: 4 }, interactionRadius: 15, description: 'Casino légal', flavorText: 'Lumières clignotantes, machines à sous, rires gras et parfum de cigare.', reputation: 60 },
  { id: 'station_esso', name: 'Station Esso', type: 'gas_station', district: 'centre_ville', position: { x: 120, y: 0, z: 120 }, heading: 0, isOpen: true, openHours: { open: 0, close: 24 }, interactionRadius: 8, description: 'Carburant', flavorText: 'Un chat errant se frotte contre la pompe.', reputation: 65 },
  { id: 'marche_noir', name: 'Marché Noir (Vieux-Port)', type: 'black_market', district: 'vieux_port', position: { x: -350, y: 0, z: 250 }, heading: 270, isOpen: false, openHours: { open: 22, close: 5 }, interactionRadius: 5, description: 'Seuls les initiés savent...', flavorText: 'Une porte rouillée quelque part dans l\'obscurité...', reputation: 10 },
  { id: 'spawn_new', name: 'Spawn Nouveaux Joueurs', type: 'spawn', district: 'centre_ville', position: { x: 0, y: 0, z: 0 }, heading: 0, isOpen: true, openHours: { open: 0, close: 24 }, interactionRadius: 20, description: 'Point de départ', flavorText: 'Bienvenue à Port-Éther. La ville a besoin de héros... et de salauds.', reputation: 100 },
  // ★ Nouveaux POIs
  { id: 'radio_ether', name: 'Radio Éther FM', type: 'radio', district: 'centre_ville', position: { x: -100, y: 3, z: 0 }, heading: 0, isOpen: true, openHours: { open: 6, close: 23 }, interactionRadius: 8, description: 'Station de radio locale', flavorText: 'Un animateur passionné commente l\'actualité de Port-Éther.', reputation: 55 },
  { id: 'club_underground', name: 'Club Underground', type: 'club', district: 'basse_ville', position: { x: -180, y: 0, z: -350 }, heading: 0, isOpen: true, openHours: { open: 21, close: 6 }, interactionRadius: 10, description: 'Boîte de nuit clandestine', flavorText: 'Boum boum boum — les basses font vibrer le bitume.', reputation: 35 },
  { id: 'marina_ether', name: 'Marina de Port-Éther', type: 'marina', district: 'vieux_port', position: { x: -380, y: 0, z: 300 }, heading: 90, isOpen: true, openHours: { open: 6, close: 22 }, interactionRadius: 15, description: 'Port de plaisance', flavorText: 'Les voiliers dansent sur l\'eau calme du bassin.', reputation: 70 },
];

// ★ NOUVEAU : Système de gangs
const GANGS: Gang[] = [
  { id: 'serpents_airain', name: 'Serpents d\'Airain', color: '#DC2626', territory: ['basse_ville', 'zone_industrielle'], strength: 85, treasury: 150000, leader: 'Victor "Le Boa" Marceau', members: 45, activity: 'eleve', lastRaid: Date.now() - 3600000 },
  { id: 'loups_marins', name: 'Loups Marins', color: '#2563EB', territory: ['vieux_port'], strength: 65, treasury: 80000, leader: 'Yann "Barbe-Rouge" Kerviel', members: 30, activity: 'moyen' },
  { id: 'spectres', name: 'Les Spectres', color: '#6B21A8', territory: ['zone_industrielle'], strength: 45, treasury: 30000, leader: 'Inconnu', members: 15, activity: 'faible' },
];

// ★ NOUVEAU : Légendes urbaines
const URBAN_LEGENDS: UrbanLegend[] = [
  { id: 'legend_chat_rouge', name: 'Le Chat Rouge', description: 'Un chat rouge fantomatique aperçu dans le Vieux-Port les nuits sans lune. Porterait malheur.', district: 'vieux_port', sightings: 7, lastSighted: Date.now() - 86400000 * 3, verified: false, fearFactor: 3 },
  { id: 'legend_machine', name: 'La Machine', description: 'Un engin mécanique monstrueux qui rôderait dans la zone industrielle la nuit.', district: 'zone_industrielle', sightings: 3, verified: false, fearFactor: 5 },
  { id: 'legend_femme_blanche', name: 'La Femme Blanche', description: 'Une silhouette féminine vêtue de blanc qui apparaît au centre-ville aux victimes de trahison.', district: 'centre_ville', sightings: 12, lastSighted: Date.now() - 86400000 * 30, verified: false, fearFactor: 4 },
];

// ★ NOUVEAU : Calendrier des événements scriptés
const SCHEDULED_EVENTS: { weekDay: number; hour: number; event: Omit<WorldEvent, 'id' | 'active' | 'startHour'> }[] = [
  { weekDay: 6, hour: 20, event: { type: 'festival', district: 'plateau_vert', position: { x: 420, y: 0, z: 320 }, title: 'Marché Nocturne du Plateau', description: 'Artisans, musiciens et street-food envahissent le parc.', severity: 2, durationHours: 4 } },
  { weekDay: 3, hour: 12, event: { type: 'manifestation', district: 'centre_ville', position: { x: 0, y: 0, z: 30 }, title: 'Manifestation des Employés Municipaux', description: 'Les fonctionnaires réclament de meilleurs salaires.', severity: 3, durationHours: 3 } },
];

// ─── WorldEngine Amélioré ──────────────────────────────────────────────────────

const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const;
const MOON_PHASES = ['nouvelle', 'croissante', 'pleine', 'decroissante'] as const;

export class WorldEngine extends EventEmitter {
  private static instance: WorldEngine;

  private districts = new Map<string, District>();
  private pois = new Map<string, InterestPoint>();
  private gangs = new Map<string, Gang>();
  private legends = new Map<string, UrbanLegend>();
  private activeEvents: WorldEvent[] = [];
  private worldTime: WorldTime;
  private weather: Weather;
  private timeInterval?: NodeJS.Timeout;
  private eventCheckInterval?: NodeJS.Timeout;
  private eventTimeoutIds: NodeJS.Timeout[] = [];

  // ★ Statistiques vivantes
  public stats = {
    totalPlayerVisits: 0,
    crimesCommitted: 0,
    eventsTriggered: 0,
    legendsDiscovered: 0,
    economyBalance: 1000000,
    lastReset: Date.now(),
  };

  static getInstance(): WorldEngine {
    if (!WorldEngine.instance) WorldEngine.instance = new WorldEngine();
    return WorldEngine.instance;
  }

  constructor() {
    super();

    for (const d of PORT_ETHER_DISTRICTS) this.districts.set(d.id, d);
    for (const p of PORT_ETHER_POIS as InterestPoint[]) this.pois.set(p.id, p);
    for (const g of GANGS) this.gangs.set(g.id, g);
    for (const l of URBAN_LEGENDS) this.legends.set(l.id, l);

    const now = new Date();
    const gameHour = Math.floor((now.getHours() * 60 + now.getMinutes()) / 15) % 24;
    const totalDays = Math.floor(now.getTime() / 86400000);

    this.worldTime = {
      hour: gameHour,
      minute: now.getMinutes() % 60,
      day: totalDays % 365 + 1,
      weekDay: DAYS[totalDays % 7],
      month: Math.floor(totalDays / 30) % 12 + 1,
      season: this.calcSeason(this.worldTime?.day ?? 1),
      isNight: gameHour < 6 || gameHour >= 22,
      moonPhase: MOON_PHASES[Math.floor((totalDays / 7) % 4)],
      timestamp: Date.now(),
    };

    this.weather = this.generateWeather();
    this.startWorldClock();
    this.startEventScheduler();

    // ★ Lier au kernel pour les rêves
    if (kernel?.dreamEngine) {
      this.on('world:hour_changed', (time: WorldTime) => {
        if (time.hour === 3 && time.moonPhase === 'pleine') {
          kernel.dreamEngine?.triggerNightmare('vieux_port');
        }
      });
    }

    logger.ok('world', `🌍 Port-Éther vivant — ${this.districts.size} districts, ${this.pois.size} POIs, ${this.gangs.size} gangs, ${this.legends.size} légendes`);
  }

  // ─── Horloge du monde (améliorée) ─────────────────────────────────────────

  private startWorldClock(): void {
    this.timeInterval = setInterval(() => {
      const oldTime = { ...this.worldTime };

      this.worldTime.minute += 15;
      if (this.worldTime.minute >= 60) {
        this.worldTime.minute = 0;
        this.worldTime.hour = (this.worldTime.hour + 1) % 24;
        this.worldTime.timestamp = Date.now();

        const wasNight = this.worldTime.isNight;
        this.worldTime.isNight = this.worldTime.hour < 6 || this.worldTime.hour >= 22;

        if (wasNight !== this.worldTime.isNight) {
          this.emit('world:daynight', {
            isNight: this.worldTime.isNight,
            moonPhase: this.worldTime.moonPhase
          });
        }

        // Mise à jour des POIs
        for (const poi of this.pois.values()) {
          const shouldBeOpen = this.isPoiOpen(poi);
          if (poi.isOpen !== shouldBeOpen) {
            poi.isOpen = shouldBeOpen;
            this.emit('poi:status_changed', {
              ...poi,
              flavorText: shouldBeOpen
                ? poi.flavorText
                : `${poi.name} est fermé. Les stores sont baissés.`
            });
          }
        }

        // Changement météo
        if (Math.random() < 0.10) {
          this.weather = this.generateWeather();
          this.emit('world:weather_changed', this.weather);
        }

        // Changement de jour
        if (this.worldTime.hour === 0) {
          this.worldTime.day = (this.worldTime.day % 365) + 1;
          this.worldTime.season = this.calcSeason(this.worldTime.day);
          this.worldTime.weekDay = DAYS[DAYS.indexOf(this.worldTime.weekDay as any) + 1] || 'lundi';

          // Cycle lunaire
          const phaseIndex = MOON_PHASES.indexOf(this.worldTime.moonPhase as any);
          this.worldTime.moonPhase = MOON_PHASES[(phaseIndex + 1) % 4] || 'nouvelle';

          // Évolution des gangs chaque jour
          this.evolveGangs();

          // Propagation des rumeurs
          this.propagateRumors();

          this.emit('world:day_changed', this.worldTime);
        }

        // ★ Événements surprises (non schedulés)
        if (Math.random() < 0.05 && this.activeEvents.length < 3) {
          this.spawnRandomEvent();
        }

        this.emit('world:hour_changed', { ...this.worldTime });
      }

      // Mise à jour du mood des districts
      this.updateDistrictMoods();

    }, 60_000);
  }

  // ★ NOUVEAU : Scheduler d'événements programmés
  private startEventScheduler(): void {
    this.eventCheckInterval = setInterval(() => {
      const { weekDay, hour } = this.worldTime;
      const dayIndex = DAYS.indexOf(weekDay as any);

      for (const se of SCHEDULED_EVENTS) {
        if (se.weekDay === dayIndex && se.hour === hour) {
          const alreadyActive = this.activeEvents.some(e => e.title === se.event.title);
          if (!alreadyActive) {
            this.triggerEvent({
              id: randomUUID(),
              ...se.event,
              startHour: hour,
              active: true,
            });
          }
        }
      }
    }, 60_000);
  }

  // ★ NOUVEAU : Évolution des gangs
  private evolveGangs(): void {
    for (const gang of this.gangs.values()) {
      // Gains territoriaux
      gang.strength += Math.floor(Math.random() * 5) - 2;
      gang.strength = Math.max(0, Math.min(100, gang.strength));

      // Trésorerie
      const income = Math.floor(Math.random() * 5000) + 1000;
      gang.treasury += income;

      // Activité
      if (gang.lastRaid && Date.now() - gang.lastRaid > 86400000 * 3) {
        gang.activity = 'faible';
      } else if (gang.strength > 70) {
        gang.activity = 'tres_eleve';
      }

      // Conflits
      if (gang.enemy) {
        const enemy = this.gangs.get(gang.enemy);
        if (enemy && Math.random() < 0.1) {
          this.spawnTerritoryWar(gang, enemy);
        }
      }
    }
  }

  // ★ NOUVEAU : Guerre de territoire
  private spawnTerritoryWar(attacker: Gang, defender: Gang): void {
    const contestedDistrict = attacker.territory.find(t => defender.territory.includes(t));
    if (!contestedDistrict) return;

    const district = this.districts.get(contestedDistrict)!;
    district.mood = 'revolte';
    district.crimeLevel = Math.min(5, district.crimeLevel + 1) as any;

    this.triggerEvent({
      id: randomUUID(),
      type: 'attaque_gang',
      district: contestedDistrict,
      position: { x: district.center.x, y: 0, z: district.center.z },
      title: `Affrontement: ${attacker.name} vs ${defender.name}`,
      description: `Le district ${district.name} est le théâtre d\'un violent affrontement entre gangs.`,
      severity: 4,
      startHour: this.worldTime.hour,
      durationHours: 3 + Math.floor(Math.random() * 3),
      active: true,
      participants: attacker.members + defender.members,
    });
  }

  // ★ NOUVEAU : Propagation des rumeurs
  private propagateRumors(): void {
    for (const district of this.districts.values()) {
      if (Math.random() < 0.3) {
        const rumors = [
          'Un trésor serait caché dans le quartier',
          'La police prépare une descente',
          'Un personnage mystérieux a été aperçu',
          'Les prix de l\'immobilier explosent',
          'Une nouvelle loi se prépare à la mairie',
          'Des bruits étranges la nuit venue',
          'Un témoin aurait vu quelque chose d\'inexplicable',
        ];
        district.rumors.push(rumors[Math.floor(Math.random() * rumors.length)]);
        if (district.rumors.length > 5) district.rumors.shift();
      }
    }
  }

  // ★ NOUVEAU : Événement aléatoire
  private spawnRandomEvent(): void {
    const eventTypes: WorldEvent['type'][] = [
      'braquage', 'bagarre', 'incendie', 'carfree', 'decouverte'
    ];
    const districts = [...this.districts.values()];
    const district = districts[Math.floor(Math.random() * districts.length)];

    const eventTemplates: Record<string, { title: string; description: string }> = {
      braquage: { title: `Braquage en cours à ${district.name}`, description: 'Une bijouterie est attaquée !' },
      bagarre: { title: `Bagarre générale à ${district.name}`, description: 'Deux groupes s\'affrontent dans la rue.' },
      incendie: { title: `Incendie à ${district.name}`, description: 'Un bâtiment est en feu, les pompiers sont en route.' },
      carfree: { title: `Voiture en feu à ${district.name}`, description: 'Un véhicule brûle au milieu de la route.' },
      decouverte: { title: `Découverte étrange à ${district.name}`, description: 'Un objet mystérieux a été trouvé.' },
    };

    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const template = eventTemplates[type];

    this.triggerEvent({
      id: randomUUID(),
      type,
      district: district.id,
      position: {
        x: district.center.x + Math.floor(Math.random() * 100 - 50),
        y: 0,
        z: district.center.z + Math.floor(Math.random() * 100 - 50)
      },
      title: template.title,
      description: template.description,
      severity: Math.floor(Math.random() * 3) + 1 as any,
      startHour: this.worldTime.hour,
      durationHours: 1 + Math.floor(Math.random() * 2),
      active: true,
      lootable: type === 'braquage',
    });
  }

  // ★ NOUVEAU : Mise à jour des moods
  private updateDistrictMoods(): void {
    for (const district of this.districts.values()) {
      // Le mood change selon l'heure, la criminalité, et les événements
      if (this.activeEvents.some(e => e.district === district.id)) {
        district.mood = 'tendu';
      } else if (this.worldTime.isNight && district.crimeLevel >= 3) {
        district.mood = 'triste';
      } else if (district.prosperity > 80) {
        district.mood = Math.random() < 0.3 ? 'festif' : 'calme';
      } else if (district.crimeLevel >= 4) {
        district.mood = 'revolte';
      } else {
        district.mood = 'calme';
      }

      // L'influence des gangs évolue
      if (district.gangId) {
        const gang = this.gangs.get(district.gangId);
        if (gang) district.influence = Math.min(100, gang.strength);
      }
    }
  }

  // ★ NOUVEAU : Déclencher un événement
  triggerEvent(event: WorldEvent): void {
    this.activeEvents.push(event);
    this.stats.eventsTriggered++;

    logger.info('world', `⚡ Événement: ${event.title} [${event.district}]`);
    this.emit('world:event_started', event);

    // Auto-expiration
    const timeoutId = setTimeout(() => {
      event.active = false;
      this.activeEvents = this.activeEvents.filter(e => e.id !== event.id);
      this.emit('world:event_ended', event);
    }, event.durationHours * 3600_000);

    this.eventTimeoutIds.push(timeoutId);
  }

  // ─── Météo (améliorée) ────────────────────────────────────────────────────

  private generateWeather(): Weather {
    const season = this.worldTime?.season ?? 'ete';

    const seasonalTypes: Record<string, Weather['type'][]> = {
      hiver: ['ensoleille', 'nuageux', 'neigeux', 'neigeux', 'tempete', 'brouillard'],
      printemps: ['ensoleille', 'nuageux', 'pluvieux', 'pluvieux', 'orageux', 'brouillard'],
      ete: ['ensoleille', 'ensoleille', 'nuageux', 'orageux', 'pluvieux', 'ensoleille'],
      automne: ['ensoleille', 'nuageux', 'pluvieux', 'brouillard', 'tempete', 'orageux'],
    };

    const types = seasonalTypes[season] ?? ['ensoleille', 'nuageux'];
    const type = types[Math.floor(Math.random() * types.length)];

    const baseTemps: Record<string, number> = { hiver: -10, printemps: 10, ete: 28, automne: 10 };
    const baseTemp = baseTemps[season] ?? 15;
    const tempVariation = Math.floor(Math.random() * 12) - 6;
    const temperature = baseTemp + tempVariation;

    return {
      type,
      intensity: Math.floor(Math.random() * 4) as 0 | 1 | 2 | 3,
      wind: Math.floor(Math.random() * (type === 'tempete' ? 120 : 80)),
      temperature,
      feelsLike: type === 'pluvieux' || type === 'neigeux' ? temperature - 5 : temperature,
      visibility: type === 'brouillard' ? 15 : type === 'tempete' ? 30 : type === 'orageux' ? 60 : 100,
      precipitation: type === 'pluvieux' ? Math.floor(Math.random() * 10) + 2 : type === 'orageux' ? Math.floor(Math.random() * 20) + 10 : 0,
      uvIndex: type === 'ensoleille' ? Math.floor(Math.random() * 8) + 3 : 1,
    };
  }

  // ─── Géolocalisation enrichie ─────────────────────────────────────────────

  getDistrictAtPosition(x: number, z: number): District | undefined {
    for (const d of this.districts.values()) {
      const dist = Math.hypot(x - d.center.x, z - d.center.z);
      if (dist <= d.radius) return d;
    }
    return undefined;
  }

  getNearbyPOIs(x: number, z: number, radius = 100): (InterestPoint & { distance: number })[] {
    return [...this.pois.values()]
      .map(poi => ({
        ...poi,
        flavorText: this.worldTime.isNight ? `${poi.flavorText} (nuit)` : poi.flavorText,
        distance: Math.hypot(x - poi.position.x, z - poi.position.z),
      }))
      .filter(poi => poi.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }

  // ★ NOUVEAU : Interactions contextuelles
  getContextualFlavor(districtId: string, playerId?: string): string {
    const district = this.districts.get(districtId);
    if (!district) return 'Un endroit inconnu...';

    const timeOfDay = this.worldTime.isNight ? 'nuit' : 'journée';
    const moonStr = this.worldTime.moonPhase !== 'nouvelle' ? `la ${this.worldTime.moonPhase} lune` : 'pas de lune';

    let flavor = `[${district.name}] — ${this.worldTime.weekDay}, ${this.worldTime.hour}h, ${moonStr}. `;
    flavor += `Ambiance: ${district.mood}. `;

    if (this.weather.type !== 'ensoleille') {
      flavor += `Il fait ${this.weather.type} (${this.weather.temperature}°C). `;
    }

    const activeEvent = this.activeEvents.find(e => e.district === districtId);
    if (activeEvent) {
      flavor += `⚠️ ${activeEvent.title}: ${activeEvent.description} `;
    }

    if (district.rumors.length > 0) {
      flavor += `On raconte que ${district.rumors[district.rumors.length - 1]}.`;
    }

    return flavor;
  }

  // ─── Accesseurs ────────────────────────────────────────────────────────────

  getDistrict(id: string) { return this.districts.get(id); }
  getAllDistricts() { return Array.from(this.districts.values()); }
  getPOI(id: string) { return this.pois.get(id); }
  getAllPOIs() { return Array.from(this.pois.values()); }
  getOpenPOIs() { return [...this.pois.values()].filter(p => p.isOpen); }
  getTime() { return { ...this.worldTime }; }
  getWeather() { return { ...this.weather }; }
  getGangs() { return Array.from(this.gangs.values()); }
  getLegends() { return Array.from(this.legends.values()); }
  getActiveEvents() { return [...this.activeEvents]; }

  setWeather(w: Partial<Weather>): void {
    this.weather = { ...this.weather, ...w };
    this.emit('world:weather_changed', this.weather);
  }

  // ★ NOUVEAU : Interaction joueur → POI
  visitPOI(poiId: string, playerId: string): { message: string; xp?: number } {
    const poi = this.pois.get(poiId);
    if (!poi) return { message: 'Ce lieu n\'existe pas.' };

    if (!poi.isOpen) return { message: `${poi.name} est fermé. ${poi.flavorText}` };

    if (!poi.lastVisitedBy) poi.lastVisitedBy = [];
    if (!poi.lastVisitedBy.includes(playerId)) {
      poi.lastVisitedBy.push(playerId);
      this.stats.totalPlayerVisits++;
      return { message: poi.flavorText, xp: 10 };
    }

    return { message: poi.flavorText };
  }

  // ★ NOUVEAU : Vérifier légende urbaine
  checkLegend(location: { x: number; z: number }): UrbanLegend | null {
    for (const legend of this.legends.values()) {
      const district = this.districts.get(legend.district);
      if (!district) continue;

      const dist = Math.hypot(location.x - district.center.x, location.z - district.center.z);
      if (dist <= district.radius && this.worldTime.isNight && this.worldTime.moonPhase === 'pleine') {
        legend.sightings++;
        legend.lastSighted = Date.now();
        if (legend.sightings >= 10) legend.verified = true;
        this.stats.legendsDiscovered++;
        return legend;
      }
    }
    return null;
  }

  stop(): void {
    if (this.timeInterval) clearInterval(this.timeInterval);
    if (this.eventCheckInterval) clearInterval(this.eventCheckInterval);
    this.eventTimeoutIds.forEach(id => clearTimeout(id));
  }
}

export default WorldEngine.getInstance();