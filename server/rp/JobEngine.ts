/**
 * JobEngine v2.0.0 — Système de métiers RP ultra-complet
 * 15 jobs · Grades · Salaires · Tâches · Syndicats · Évaluations · IA RH
 * Port-Éther RP — Fichier: server/rp/JobEngine.ts
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

export type JobCategory =
  | 'gouvernement'
  | 'civil'
  | 'independant'
  | 'criminel'
  | 'militaire'
  | 'medical';

export type EmployeeStatus = 'active' | 'suspended' | 'probation' | 'fired' | 'retired';
export type ShiftType = 'day' | 'evening' | 'night' | 'weekend';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type DisciplineType = 'warning' | 'suspension' | 'demotion' | 'termination';

export interface JobGrade {
  id: number;
  name: string;
  salary: number;
  permissions: string[];
  minReputation: number;     // Réputation minimum pour ce grade
  badge?: string;      // Badge/couleur du grade
  clearance?: number;      // Niveau de habilitation (0–5)
}

export interface Job {
  id: string;
  name: string;
  shortName: string;
  category: JobCategory;
  color: string;
  icon: string;
  description: string;
  salary: number;
  maxEmployees: number;
  openHiring: boolean;
  minAge?: number;
  minCreditScore?: number;
  requiredLicense?: string;
  grades: JobGrade[];
  spawnPoint: { x: number; y: number; z: number };
  vehicleAllowed: string[];
  equipmentOnDuty: string[];
  uniformId?: string;
  headOffice?: string;
  taxRate: number;         // % de taxe sur le salaire
  overtimeMultiplier: number;         // Multiplicateur heures sup
  benefitsPackage: string[];       // Avantages sociaux
  unionId?: string;         // ID du syndicat
  legalStatus: 'legal' | 'semi-legal' | 'illegal';
  minShiftDuration: number;         // Durée min service (ms)
  salaryInterval: number;         // Intervalle salaire (ms)
  tasks: JobTask[];      // Tâches disponibles pour ce job
}

export interface JobTask {
  id: string;
  name: string;
  description: string;
  reward: number;
  cooldown: number;       // ms entre 2 tâches
  minGrade: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  illegal: boolean;
  xpReward: number;
}

export interface ActiveEmployee {
  id: string;
  playerId: string;
  playerName: string;
  jobId: string;
  grade: number;
  status: EmployeeStatus;
  onDuty: boolean;
  dutyStart?: number;
  dutyEnd?: number;
  totalPaid: number;
  totalHours: number;
  shiftsCompleted: number;
  overtime: number;           // Heures supplémentaires (ms)
  reputation: number;          // 0–100
  xp: number;
  xpNextLevel: number;
  performance: number;          // 0–100 (avg des évals)
  tasksDone: number;
  warnings: DisciplineRecord[];
  hiredAt: number;
  lastPromotion?: number;
  lastEvaluation?: number;
  preferredShift: ShiftType;
  notes: string;
  isManager: boolean;
  managedBy?: string;           // playerId du supérieur
}

export interface DisciplineRecord {
  id: string;
  type: DisciplineType;
  reason: string;
  issuedBy: string;
  issuedAt: number;
  resolved: boolean;
  resolvedAt?: number;
}

export interface TaskExecution {
  id: string;
  taskId: string;
  playerId: string;
  jobId: string;
  status: TaskStatus;
  startedAt: number;
  completedAt?: number;
  reward: number;
  xpEarned: number;
  notes?: string;
}

export interface JobApplication {
  id: string;
  playerId: string;
  playerName: string;
  jobId: string;
  motivation: string;
  appliedAt: number;
  status: 'pending' | 'accepted' | 'rejected' | 'interview';
  reviewedBy?: string;
  reviewedAt?: number;
  notes?: string;
}

export interface Union {
  id: string;
  name: string;
  jobIds: string[];
  leaderId: string;
  members: string[];
  fund: number;
  demands: string[];
  onStrike: boolean;
  strikeStart?: number;
}

export interface PayStub {
  id: string;
  playerId: string;
  jobId: string;
  period: string;
  baseSalary: number;
  overtime: number;
  taskBonus: number;
  gross: number;
  tax: number;
  net: number;
  paidAt: number;
}

export interface Evaluation {
  id: string;
  employeeId: string;
  evaluatorId: string;
  score: number;       // 0–100
  criteria: {
    punctuality: number;
    performance: number;
    teamwork: number;
    attitude: number;
  };
  comments: string;
  period: string;
  createdAt: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// JOBS PORT-ÉTHER (15 métiers)
// ══════════════════════════════════════════════════════════════════════════════

const PORT_ETHER_JOBS: Job[] = [
  // ── GOUVERNEMENT ────────────────────────────────────────────────────────────
  {
    id: 'police', name: 'Service de Police de Port-Éther', shortName: 'SPPE',
    category: 'gouvernement', color: '#3B82F6', icon: '👮',
    description: 'Maintien de l\'ordre public et protection des citoyens',
    salary: 250, maxEmployees: 50, openHiring: false,
    minAge: 18, minCreditScore: 40, requiredLicense: 'driver',
    grades: [
      { id: 0, name: 'Recrue', salary: 200, permissions: ['arrest', 'ticket'], minReputation: 0, badge: 'bronze', clearance: 1 },
      { id: 1, name: 'Agent', salary: 250, permissions: ['arrest', 'ticket', 'search'], minReputation: 10, badge: 'silver', clearance: 2 },
      { id: 2, name: 'Caporal', salary: 300, permissions: ['arrest', 'ticket', 'search', 'seize'], minReputation: 25, badge: 'gold', clearance: 2 },
      { id: 3, name: 'Sergent', salary: 400, permissions: ['arrest', 'ticket', 'search', 'seize', 'manage_lower'], minReputation: 40, badge: 'gold', clearance: 3 },
      { id: 4, name: 'Lieutenant', salary: 500, permissions: ['all'], minReputation: 60, badge: 'plat', clearance: 4 },
      { id: 5, name: 'Chef', salary: 700, permissions: ['all', 'admin_job'], minReputation: 80, badge: 'diamond', clearance: 5 },
    ],
    spawnPoint: { x: 50, y: 0, z: 50 }, vehicleAllowed: ['vehicle_police_cruiser', 'vehicle_police_suv'],
    equipmentOnDuty: ['item_radio', 'item_handcuffs', 'item_baton', 'item_taser'],
    uniformId: 'uniform_police', headOffice: 'Commissariat Central',
    taxRate: 0.18, overtimeMultiplier: 1.5,
    benefitsPackage: ['health_insurance', 'pension', 'danger_pay'],
    unionId: 'union_police', legalStatus: 'legal',
    minShiftDuration: 30 * 60_000, salaryInterval: 10 * 60_000,
    tasks: [
      { id: 'patrol', name: 'Patrouille', description: 'Patrouiller une zone', reward: 50, cooldown: 5_000, minGrade: 0, difficulty: 'easy', illegal: false, xpReward: 10 },
      { id: 'arrest', name: 'Arrestation', description: 'Arrêter un suspect', reward: 150, cooldown: 60_000, minGrade: 0, difficulty: 'medium', illegal: false, xpReward: 25 },
      { id: 'traffic', name: 'Contrôle Routier', description: 'Émettre des contraventions', reward: 75, cooldown: 30_000, minGrade: 0, difficulty: 'easy', illegal: false, xpReward: 15 },
      { id: 'raid', name: 'Opération SWAT', description: 'Mener une opération spéciale', reward: 500, cooldown: 900_000, minGrade: 3, difficulty: 'expert', illegal: false, xpReward: 100 },
    ],
  },
  {
    id: 'ems', name: 'Services Médicaux d\'Urgence', shortName: 'SMU',
    category: 'medical', color: '#EF4444', icon: '🚑',
    description: 'Sauver des vies et prodiguer des soins d\'urgence',
    salary: 225, maxEmployees: 30, openHiring: false,
    minAge: 20, minCreditScore: 30,
    grades: [
      { id: 0, name: 'Stagiaire EMT', salary: 175, permissions: ['revive', 'treat'], minReputation: 0, clearance: 1 },
      { id: 1, name: 'EMT', salary: 225, permissions: ['revive', 'treat', 'prescribe'], minReputation: 15, clearance: 2 },
      { id: 2, name: 'Infirmier', salary: 275, permissions: ['revive', 'treat', 'prescribe', 'diagnose'], minReputation: 30, clearance: 3 },
      { id: 3, name: 'Médecin', salary: 400, permissions: ['revive', 'treat', 'prescribe', 'diagnose', 'surgery'], minReputation: 50, clearance: 4 },
      { id: 4, name: 'Chef Médical', salary: 600, permissions: ['all'], minReputation: 70, clearance: 5 },
    ],
    spawnPoint: { x: -50, y: 0, z: 80 }, vehicleAllowed: ['vehicle_ambulance', 'vehicle_medic_suv'],
    equipmentOnDuty: ['item_radio', 'item_medkit', 'item_defibrillator', 'item_stethoscope'],
    uniformId: 'uniform_ems', headOffice: 'Hôpital Général de Port-Éther',
    taxRate: 0.15, overtimeMultiplier: 1.75,
    benefitsPackage: ['health_insurance', 'pension', 'stress_pay'],
    unionId: 'union_health', legalStatus: 'legal',
    minShiftDuration: 30 * 60_000, salaryInterval: 10 * 60_000,
    tasks: [
      { id: 'revive', name: 'Réanimation', description: 'Réanimer un joueur', reward: 200, cooldown: 30_000, minGrade: 0, difficulty: 'medium', illegal: false, xpReward: 30 },
      { id: 'transport', name: 'Transport', description: 'Transporter un blessé à l\'hôpital', reward: 100, cooldown: 60_000, minGrade: 0, difficulty: 'easy', illegal: false, xpReward: 15 },
      { id: 'surgery', name: 'Chirurgie', description: 'Effectuer une opération', reward: 500, cooldown: 300_000, minGrade: 3, difficulty: 'expert', illegal: false, xpReward: 80 },
    ],
  },
  {
    id: 'pompier', name: 'Brigade des Pompiers', shortName: 'BPE',
    category: 'gouvernement', color: '#DC2626', icon: '🚒',
    description: 'Lutter contre les incendies et secourir les victimes',
    salary: 200, maxEmployees: 20, openHiring: false,
    grades: [
      { id: 0, name: 'Recrue', salary: 150, permissions: ['extinguish'], minReputation: 0, clearance: 1 },
      { id: 1, name: 'Pompier', salary: 200, permissions: ['extinguish', 'rescue'], minReputation: 10, clearance: 2 },
      { id: 2, name: 'Caporal', salary: 270, permissions: ['extinguish', 'rescue', 'lead_unit'], minReputation: 30, clearance: 3 },
      { id: 3, name: 'Capitaine', salary: 400, permissions: ['all'], minReputation: 50, clearance: 4 },
    ],
    spawnPoint: { x: -100, y: 0, z: -100 }, vehicleAllowed: ['vehicle_firetruck', 'vehicle_fire_suv'],
    equipmentOnDuty: ['item_radio', 'item_extinguisher', 'item_axe', 'item_breathing_apparatus'],
    uniformId: 'uniform_firefighter', headOffice: 'Caserne Centrale',
    taxRate: 0.16, overtimeMultiplier: 1.5,
    benefitsPackage: ['health_insurance', 'pension', 'danger_pay'],
    unionId: 'union_fire', legalStatus: 'legal',
    minShiftDuration: 30 * 60_000, salaryInterval: 10 * 60_000,
    tasks: [
      { id: 'fire', name: 'Incendie', description: 'Éteindre un feu', reward: 250, cooldown: 60_000, minGrade: 0, difficulty: 'hard', illegal: false, xpReward: 40 },
      { id: 'rescue', name: 'Sauvetage', description: 'Secourir des victimes', reward: 200, cooldown: 30_000, minGrade: 1, difficulty: 'medium', illegal: false, xpReward: 30 },
    ],
  },
  // ── CIVIL ──────────────────────────────────────────────────────────────────
  {
    id: 'mecanicien', name: 'Garage Mécanique Port-Éther', shortName: 'GMPE',
    category: 'civil', color: '#F59E0B', icon: '🔧',
    description: 'Réparer et entretenir les véhicules des citoyens',
    salary: 175, maxEmployees: 15, openHiring: true,
    grades: [
      { id: 0, name: 'Apprenti', salary: 125, permissions: ['repair_basic'], minReputation: 0 },
      { id: 1, name: 'Mécanicien', salary: 175, permissions: ['repair_basic', 'repair_advanced'], minReputation: 10 },
      { id: 2, name: 'Chef Mécan.', salary: 250, permissions: ['repair_basic', 'repair_advanced', 'tow'], minReputation: 30 },
      { id: 3, name: 'Proprio', salary: 350, permissions: ['all'], minReputation: 50 },
    ],
    spawnPoint: { x: 100, y: 0, z: -50 }, vehicleAllowed: ['vehicle_tow_truck', 'vehicle_mechanic_van'],
    equipmentOnDuty: ['item_outil', 'item_radio', 'item_clé_molette'],
    uniformId: 'uniform_mechanic', headOffice: 'Garage Central',
    taxRate: 0.14, overtimeMultiplier: 1.25,
    benefitsPackage: ['tool_allowance'],
    legalStatus: 'legal', minShiftDuration: 20 * 60_000, salaryInterval: 10 * 60_000,
    tasks: [
      { id: 'repair', name: 'Réparation', description: 'Réparer un véhicule', reward: 100, cooldown: 30_000, minGrade: 0, difficulty: 'easy', illegal: false, xpReward: 15 },
      { id: 'tow', name: 'Remorquage', description: 'Remorquer un véhicule', reward: 150, cooldown: 60_000, minGrade: 2, difficulty: 'medium', illegal: false, xpReward: 25 },
      { id: 'tune', name: 'Tuning', description: 'Améliorer les performances', reward: 300, cooldown: 120_000, minGrade: 1, difficulty: 'hard', illegal: false, xpReward: 50 },
    ],
  },
  {
    id: 'boucher', name: 'Boucherie Gagnon & Fils', shortName: 'BGF',
    category: 'civil', color: '#E11D48', icon: '🥩',
    description: 'Préparer et vendre de la viande fraîche aux habitants',
    salary: 160, maxEmployees: 8, openHiring: true,
    grades: [
      { id: 0, name: 'Employé', salary: 130, permissions: ['sell_meat'], minReputation: 0 },
      { id: 1, name: 'Boucher', salary: 160, permissions: ['sell_meat', 'process_animal'], minReputation: 10 },
      { id: 2, name: 'Gérant', salary: 220, permissions: ['all'], minReputation: 30 },
    ],
    spawnPoint: { x: -75, y: 0, z: 25 }, vehicleAllowed: ['vehicle_delivery_van'],
    equipmentOnDuty: ['item_tablier', 'item_couteau_boucher'],
    uniformId: 'uniform_butcher', headOffice: 'Boucherie Gagnon',
    taxRate: 0.12, overtimeMultiplier: 1.2,
    benefitsPackage: ['food_allowance'],
    legalStatus: 'legal', minShiftDuration: 20 * 60_000, salaryInterval: 10 * 60_000,
    tasks: [
      { id: 'butcher', name: 'Découpe', description: 'Découper des pièces de viande', reward: 80, cooldown: 30_000, minGrade: 1, difficulty: 'easy', illegal: false, xpReward: 10 },
      { id: 'deliver', name: 'Livraison', description: 'Livrer une commande', reward: 120, cooldown: 60_000, minGrade: 0, difficulty: 'easy', illegal: false, xpReward: 15 },
    ],
  },
  {
    id: 'electricien', name: 'Hydro Port-Éther', shortName: 'HPE',
    category: 'civil', color: '#F97316', icon: '⚡',
    description: 'Maintenir et réparer les infrastructures électriques de la ville',
    salary: 190, maxEmployees: 12, openHiring: true,
    grades: [
      { id: 0, name: 'Technicien', salary: 150, permissions: ['repair_electric'], minReputation: 0 },
      { id: 1, name: 'Électricien', salary: 190, permissions: ['repair_electric', 'install'], minReputation: 15 },
      { id: 2, name: 'Chef Équipe', salary: 260, permissions: ['all'], minReputation: 35 },
    ],
    spawnPoint: { x: 150, y: 0, z: 50 }, vehicleAllowed: ['vehicle_utility_truck'],
    equipmentOnDuty: ['item_outil_electrique', 'item_casque', 'item_radio'],
    uniformId: 'uniform_electrician', headOffice: 'Centrale Hydro Port-Éther',
    taxRate: 0.14, overtimeMultiplier: 1.3,
    benefitsPackage: ['tool_allowance', 'danger_pay'],
    legalStatus: 'legal', minShiftDuration: 20 * 60_000, salaryInterval: 10 * 60_000,
    tasks: [
      { id: 'repair_grid', name: 'Réparation réseau', description: 'Réparer une panne électrique', reward: 200, cooldown: 60_000, minGrade: 1, difficulty: 'medium', illegal: false, xpReward: 30 },
      { id: 'install', name: 'Installation', description: 'Installer un équipement', reward: 150, cooldown: 45_000, minGrade: 1, difficulty: 'easy', illegal: false, xpReward: 20 },
    ],
  },
  // ── INDÉPENDANT ───────────────────────────────────────────────────────────
  {
    id: 'taxi', name: 'Taxi Port-Éther', shortName: 'TAXIPE',
    category: 'independant', color: '#EAB308', icon: '🚕',
    description: 'Transporter les citoyens à travers la ville',
    salary: 0, maxEmployees: 25, openHiring: true,
    grades: [
      { id: 0, name: 'Chauffeur', salary: 0, permissions: ['take_fare'], minReputation: 0 },
      { id: 1, name: 'Senior', salary: 0, permissions: ['take_fare', 'priority_dispatch'], minReputation: 20 },
      { id: 2, name: 'Vétéran', salary: 0, permissions: ['take_fare', 'priority_dispatch', 'vip_transport'], minReputation: 50 },
    ],
    spawnPoint: { x: 0, y: 0, z: -100 }, vehicleAllowed: ['vehicle_taxi', 'vehicle_taxi_van'],
    equipmentOnDuty: ['item_radio', 'item_phone', 'item_gps'],
    uniformId: 'uniform_taxi', headOffice: 'Dépôt Taxi Central',
    taxRate: 0.10, overtimeMultiplier: 1.0,
    benefitsPackage: ['vehicle_fuel_discount'],
    legalStatus: 'legal', minShiftDuration: 15 * 60_000, salaryInterval: 10 * 60_000,
    tasks: [
      { id: 'fare', name: 'Course', description: 'Compléter une course de taxi', reward: 50, cooldown: 5_000, minGrade: 0, difficulty: 'easy', illegal: false, xpReward: 8 },
      { id: 'vip_fare', name: 'Course VIP', description: 'Transporter un client VIP', reward: 200, cooldown: 30_000, minGrade: 2, difficulty: 'easy', illegal: false, xpReward: 25 },
    ],
  },
  {
    id: 'journaliste', name: 'Journal Port-Éther Presse', shortName: 'PEP',
    category: 'independant', color: '#8B5CF6', icon: '📰',
    description: 'Informer et rapporter les événements de la ville',
    salary: 150, maxEmployees: 10, openHiring: true,
    grades: [
      { id: 0, name: 'Pigiste', salary: 100, permissions: ['report'], minReputation: 0 },
      { id: 1, name: 'Journaliste', salary: 150, permissions: ['report', 'broadcast'], minReputation: 15 },
      { id: 2, name: 'Rédacteur', salary: 225, permissions: ['report', 'broadcast', 'publish'], minReputation: 35 },
      { id: 3, name: 'Rédac-chef', salary: 350, permissions: ['all'], minReputation: 60 },
    ],
    spawnPoint: { x: 75, y: 0, z: 75 }, vehicleAllowed: ['vehicle_news_van'],
    equipmentOnDuty: ['item_camera', 'item_microphone', 'item_press_badge'],
    uniformId: 'uniform_journalist', headOffice: 'Immeuble de Presse PE',
    taxRate: 0.12, overtimeMultiplier: 1.2,
    benefitsPackage: ['press_pass'],
    legalStatus: 'legal', minShiftDuration: 15 * 60_000, salaryInterval: 10 * 60_000,
    tasks: [
      { id: 'report', name: 'Reportage', description: 'Couvrir un événement', reward: 100, cooldown: 30_000, minGrade: 0, difficulty: 'easy', illegal: false, xpReward: 15 },
      { id: 'interview', name: 'Interview', description: 'Interviewer une personnalité', reward: 200, cooldown: 60_000, minGrade: 1, difficulty: 'medium', illegal: false, xpReward: 30 },
      { id: 'scoop', name: 'Scoop', description: 'Révéler un secret', reward: 500, cooldown: 300_000, minGrade: 2, difficulty: 'hard', illegal: false, xpReward: 75 },
    ],
  },
  {
    id: 'avocat', name: 'Cabinet Juridique St-Laurent', shortName: 'CJSL',
    category: 'independant', color: '#0EA5E9', icon: '⚖️',
    description: 'Défendre les droits des citoyens devant la loi',
    salary: 300, maxEmployees: 6, openHiring: false,
    minAge: 25, minCreditScore: 60,
    grades: [
      { id: 0, name: 'Stagiaire', salary: 200, permissions: ['legal_advice'], minReputation: 0 },
      { id: 1, name: 'Avocat', salary: 300, permissions: ['legal_advice', 'represent', 'plea'], minReputation: 20 },
      { id: 2, name: 'Associé', salary: 500, permissions: ['all'], minReputation: 50 },
    ],
    spawnPoint: { x: 25, y: 0, z: 150 }, vehicleAllowed: ['vehicle_sedan_luxury'],
    equipmentOnDuty: ['item_mallette', 'item_phone', 'item_badge_avocat'],
    uniformId: 'uniform_lawyer', headOffice: 'Tour St-Laurent',
    taxRate: 0.22, overtimeMultiplier: 2.0,
    benefitsPackage: ['health_insurance', 'pension', 'expense_account'],
    legalStatus: 'legal', minShiftDuration: 30 * 60_000, salaryInterval: 10 * 60_000,
    tasks: [
      { id: 'consultation', name: 'Consultation', description: 'Consulter un client', reward: 150, cooldown: 30_000, minGrade: 0, difficulty: 'easy', illegal: false, xpReward: 20 },
      { id: 'defense', name: 'Défense', description: 'Défendre un accusé', reward: 500, cooldown: 300_000, minGrade: 1, difficulty: 'hard', illegal: false, xpReward: 80 },
    ],
  },
  // ── CRIMINEL ──────────────────────────────────────────────────────────────
  {
    id: 'gang_nord', name: 'Gang du Nord', shortName: 'GDN',
    category: 'criminel', color: '#1F2937', icon: '💀',
    description: 'Organisation criminelle contrôlant le nord de Port-Éther',
    salary: 100, maxEmployees: 30, openHiring: false,
    grades: [
      { id: 0, name: 'Recrue', salary: 75, permissions: ['deal_small', 'patrol_territory'], minReputation: 0 },
      { id: 1, name: 'Soldat', salary: 150, permissions: ['deal_small', 'deal_large', 'patrol_territory'], minReputation: 15 },
      { id: 2, name: 'Capo', salary: 300, permissions: ['deal_small', 'deal_large', 'manage_soldiers'], minReputation: 35 },
      { id: 3, name: 'Lieutenant', salary: 500, permissions: ['all_criminal'], minReputation: 60 },
      { id: 4, name: 'Boss', salary: 800, permissions: ['all'], minReputation: 80 },
    ],
    spawnPoint: { x: -200, y: 0, z: -150 }, vehicleAllowed: ['vehicle_gang_car', 'vehicle_muscle'],
    equipmentOnDuty: ['item_radio', 'item_arme_illegale', 'item_armor'],
    uniformId: 'uniform_gang_nord', headOffice: 'Entrepôt du Nord',
    taxRate: 0, overtimeMultiplier: 1.0,
    benefitsPackage: ['territory_income'],
    legalStatus: 'illegal', minShiftDuration: 0, salaryInterval: 15 * 60_000,
    tasks: [
      { id: 'deal', name: 'Deal', description: 'Vendre de la drogue', reward: 200, cooldown: 60_000, minGrade: 0, difficulty: 'medium', illegal: true, xpReward: 20 },
      { id: 'heist', name: 'Braquage', description: 'Braquer un commerce', reward: 1000, cooldown: 600_000, minGrade: 2, difficulty: 'hard', illegal: true, xpReward: 80 },
      { id: 'territory', name: 'Territoire', description: 'Défendre/conquérir un secteur', reward: 500, cooldown: 300_000, minGrade: 1, difficulty: 'hard', illegal: true, xpReward: 60 },
    ],
  },
  {
    id: 'cartel', name: 'Cartel del Éther', shortName: 'CDE',
    category: 'criminel', color: '#7C3AED', icon: '🌵',
    description: 'Organisation de trafic de drogue à grande échelle',
    salary: 0, maxEmployees: 20, openHiring: false,
    grades: [
      { id: 0, name: 'Mule', salary: 0, permissions: ['transport_drugs'], minReputation: 0 },
      { id: 1, name: 'Dealer', salary: 0, permissions: ['transport_drugs', 'deal_cartel'], minReputation: 20 },
      { id: 2, name: 'Sicario', salary: 500, permissions: ['transport_drugs', 'deal_cartel', 'eliminate'], minReputation: 40 },
      { id: 3, name: 'Jefe', salary: 1000, permissions: ['all'], minReputation: 70 },
    ],
    spawnPoint: { x: 250, y: 0, z: 250 }, vehicleAllowed: ['vehicle_cartel_truck', 'vehicle_offroad'],
    equipmentOnDuty: ['item_radio', 'item_arme_illegale', 'item_cocaine'],
    uniformId: 'uniform_cartel', headOffice: 'Villa Éther',
    taxRate: 0, overtimeMultiplier: 1.0,
    benefitsPackage: ['drug_income'],
    legalStatus: 'illegal', minShiftDuration: 0, salaryInterval: 20 * 60_000,
    tasks: [
      { id: 'transport', name: 'Transport', description: 'Transporter de la marchandise', reward: 300, cooldown: 120_000, minGrade: 0, difficulty: 'hard', illegal: true, xpReward: 40 },
      { id: 'lab', name: 'Laboratoire', description: 'Produire de la drogue', reward: 500, cooldown: 300_000, minGrade: 1, difficulty: 'medium', illegal: true, xpReward: 60 },
    ],
  },
  // ── AUTRES ────────────────────────────────────────────────────────────────
  {
    id: 'livreur', name: 'Éther Express Livraisons', shortName: 'EEL',
    category: 'independant', color: '#10B981', icon: '📦',
    description: 'Livrer des colis et marchandises à travers la ville',
    salary: 120, maxEmployees: 20, openHiring: true,
    grades: [
      { id: 0, name: 'Livreur', salary: 120, permissions: ['deliver'], minReputation: 0 },
      { id: 1, name: 'Vétéran', salary: 175, permissions: ['deliver', 'priority_route'], minReputation: 20 },
      { id: 2, name: 'Dispatcher', salary: 250, permissions: ['all'], minReputation: 40 },
    ],
    spawnPoint: { x: 80, y: 0, z: -80 }, vehicleAllowed: ['vehicle_delivery_van', 'vehicle_scooter'],
    equipmentOnDuty: ['item_radio', 'item_gps', 'item_scanner'],
    uniformId: 'uniform_delivery', headOffice: 'Centre de tri Éther',
    taxRate: 0.10, overtimeMultiplier: 1.2,
    benefitsPackage: ['vehicle_fuel_discount'],
    legalStatus: 'legal', minShiftDuration: 15 * 60_000, salaryInterval: 10 * 60_000,
    tasks: [
      { id: 'deliver_small', name: 'Petite livraison', description: 'Livrer un colis', reward: 60, cooldown: 10_000, minGrade: 0, difficulty: 'easy', illegal: false, xpReward: 8 },
      { id: 'deliver_bulk', name: 'Gros lot', description: 'Livrer plusieurs colis', reward: 200, cooldown: 60_000, minGrade: 1, difficulty: 'medium', illegal: false, xpReward: 25 },
    ],
  },
  {
    id: 'militaire', name: 'Garde Nationale de Port-Éther', shortName: 'GNPE',
    category: 'militaire', color: '#374151', icon: '🎖️',
    description: 'Unité d\'élite en charge de la sécurité nationale',
    salary: 400, maxEmployees: 15, openHiring: false,
    minAge: 21, minCreditScore: 60,
    grades: [
      { id: 0, name: 'Soldat', salary: 300, permissions: ['patrol', 'secure_zone'], minReputation: 0, clearance: 3 },
      { id: 1, name: 'Caporal', salary: 400, permissions: ['patrol', 'secure_zone', 'detain'], minReputation: 25, clearance: 4 },
      { id: 2, name: 'Sergent', salary: 550, permissions: ['all_military'], minReputation: 50, clearance: 5 },
      { id: 3, name: 'Colonel', salary: 800, permissions: ['all'], minReputation: 75, clearance: 5 },
    ],
    spawnPoint: { x: 300, y: 0, z: 0 }, vehicleAllowed: ['vehicle_military_jeep', 'vehicle_armored'],
    equipmentOnDuty: ['item_radio', 'item_arme_legale', 'item_armor', 'item_night_vision'],
    uniformId: 'uniform_military', headOffice: 'Fort Port-Éther',
    taxRate: 0.15, overtimeMultiplier: 2.0,
    benefitsPackage: ['health_insurance', 'pension', 'danger_pay', 'housing_allowance'],
    unionId: 'union_military', legalStatus: 'legal',
    minShiftDuration: 60 * 60_000, salaryInterval: 10 * 60_000,
    tasks: [
      { id: 'perimeter', name: 'Périmètre', description: 'Sécuriser un périmètre', reward: 150, cooldown: 30_000, minGrade: 0, difficulty: 'medium', illegal: false, xpReward: 20 },
      { id: 'ops', name: 'Opération', description: 'Mener une opération tactique', reward: 800, cooldown: 600_000, minGrade: 2, difficulty: 'expert', illegal: false, xpReward: 120 },
    ],
  },
  {
    id: 'unemployed', name: 'Sans emploi', shortName: 'CHOM',
    category: 'civil', color: '#6B7280', icon: '🏠',
    description: 'Citoyen sans emploi de Port-Éther',
    salary: 50, maxEmployees: 9999, openHiring: true,
    grades: [
      { id: 0, name: 'Citoyen', salary: 50, permissions: [], minReputation: 0 },
    ],
    spawnPoint: { x: 0, y: 0, z: 0 }, vehicleAllowed: [], equipmentOnDuty: [],
    taxRate: 0, overtimeMultiplier: 1.0,
    benefitsPackage: ['welfare'],
    legalStatus: 'legal', minShiftDuration: 0, salaryInterval: 10 * 60_000,
    tasks: [],
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// JOB ENGINE v2.0.0
// ══════════════════════════════════════════════════════════════════════════════

export class JobEngine extends EventEmitter {
  private static instance: JobEngine;

  // ── Stockages ──────────────────────────────────────────────────────────────
  private jobs = new Map<string, Job>();
  private employees = new Map<string, ActiveEmployee>();
  private applications = new Map<string, JobApplication>();
  private unions = new Map<string, Union>();
  private taskExec = new Map<string, TaskExecution>();
  private payStubs = new Map<string, PayStub[]>();   // playerId → stubs
  private evaluations = new Map<string, Evaluation[]>(); // employeeId → evals
  private taskCooldowns = new Map<string, number>();     // `${playerId}:${taskId}` → ts

  // ── Timers ────────────────────────────────────────────────────────────────
  private salaryIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private maintenanceTimer: ReturnType<typeof setInterval> | null = null;

  // ── Métriques ─────────────────────────────────────────────────────────────
  private metrics = {
    totalSalaryPaid: 0,
    totalTasksDone: 0,
    totalApplications: 0,
    totalPromotions: 0,
    totalFirings: 0,
  };

  // ══════════════════════════════════════════════════════════════════════════
  static getInstance(): JobEngine {
    if (!JobEngine.instance) JobEngine.instance = new JobEngine();
    return JobEngine.instance;
  }

  constructor() {
    super();
    this.setMaxListeners(50);
    for (const job of PORT_ETHER_JOBS) this.jobs.set(job.id, job);

    // Syndicats par défaut
    this.initDefaultUnions();
    this.startMaintenanceTimer();

    console.log(`✅ [JOBS] JobEngine v2.0.0 — ${this.jobs.size} métiers, ${this.unions.size} syndicats`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAINTENANCE
  // ══════════════════════════════════════════════════════════════════════════

  private startMaintenanceTimer(): void {
    this.maintenanceTimer = setInterval(() => {
      this.checkPerformanceReviews();
      this.checkSuspensions();
      this.cleanOldCooldowns();
    }, 60 * 60_000);
    if ('unref' in (this.maintenanceTimer as object)) {
      (this.maintenanceTimer as NodeJS.Timeout).unref();
    }
  }

  private checkPerformanceReviews(): void {
    const now = Date.now();
    for (const emp of this.employees.values()) {
      if (!emp.lastEvaluation || now - emp.lastEvaluation > 7 * 24 * 60 * 60_000) {
        this.emit('evaluation:due', { employeeId: emp.id, playerId: emp.playerId, jobId: emp.jobId });
      }
    }
  }

  private checkSuspensions(): void {
    const now = Date.now();
    for (const emp of this.employees.values()) {
      for (const warn of emp.warnings) {
        if (!warn.resolved && warn.type === 'suspension') {
          // Auto-resolve après 24h
          if (now - warn.issuedAt > 24 * 60 * 60_000) {
            warn.resolved = true;
            warn.resolvedAt = now;
            if (emp.status === 'suspended') emp.status = 'active';
          }
        }
      }
    }
  }

  private cleanOldCooldowns(): void {
    const now = Date.now();
    for (const [key, ts] of this.taskCooldowns) {
      if (now - ts > 24 * 60 * 60_000) this.taskCooldowns.delete(key);
    }
  }

  private initDefaultUnions(): void {
    const defaultUnions: Union[] = [
      { id: 'union_police', name: 'Syndicat des Forces de l\'Ordre', jobIds: ['police'], leaderId: 'system', members: [], fund: 5000, demands: [], onStrike: false },
      { id: 'union_health', name: 'Syndicat du Personnel Médical', jobIds: ['ems'], leaderId: 'system', members: [], fund: 3000, demands: [], onStrike: false },
      { id: 'union_fire', name: 'Syndicat des Pompiers', jobIds: ['pompier'], leaderId: 'system', members: [], fund: 2000, demands: [], onStrike: false },
      { id: 'union_military', name: 'Association Militaire GNPE', jobIds: ['militaire'], leaderId: 'system', members: [], fund: 8000, demands: [], onStrike: false },
      { id: 'union_civil', name: 'Syndicat des Travailleurs Civils', jobIds: ['mecanicien', 'electricien', 'boucher', 'livreur'], leaderId: 'system', members: [], fund: 1000, demands: [], onStrike: false },
    ];
    for (const u of defaultUnions) this.unions.set(u.id, u);
  }

  destroy(): void {
    for (const t of this.salaryIntervals.values()) clearInterval(t);
    this.salaryIntervals.clear();
    if (this.maintenanceTimer) clearInterval(this.maintenanceTimer);
    this.removeAllListeners();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CANDIDATURE
  // ══════════════════════════════════════════════════════════════════════════

  applyForJob(
    playerId: string,
    playerName: string,
    jobId: string,
    motivation: string
  ): { success: boolean; applicationId?: string; error?: string } {
    const job = this.jobs.get(jobId);
    if (!job) return { success: false, error: 'Métier introuvable' };

    // Vérifier candidature existante
    const existing = [...this.applications.values()]
      .find(a => a.playerId === playerId && a.jobId === jobId && a.status === 'pending');
    if (existing) return { success: false, error: 'Candidature déjà en cours' };

    const app: JobApplication = {
      id: `app_${randomUUID().slice(0, 8)}`,
      playerId,
      playerName,
      jobId,
      motivation: motivation.slice(0, 500),
      appliedAt: Date.now(),
      status: 'pending',
    };

    this.applications.set(app.id, app);
    this.metrics.totalApplications++;
    this.emit('job:applied', { app });
    return { success: true, applicationId: app.id };
  }

  reviewApplication(
    applicationId: string,
    reviewerId: string,
    decision: 'accepted' | 'rejected' | 'interview',
    notes?: string
  ): { success: boolean; error?: string } {
    const app = this.applications.get(applicationId);
    if (!app || app.status !== 'pending') return { success: false, error: 'Candidature introuvable ou déjà traitée' };

    app.status = decision;
    app.reviewedBy = reviewerId;
    app.reviewedAt = Date.now();
    app.notes = notes;

    if (decision === 'accepted') {
      this.joinJob(app.playerId, app.playerName, app.jobId);
    }

    this.emit('application:reviewed', { app, decision });
    return { success: true };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // REJOINDRE / QUITTER UN MÉTIER
  // ══════════════════════════════════════════════════════════════════════════

  joinJob(
    playerId: string,
    playerName: string,
    jobId: string,
    grade = 0,
    managedBy?: string
  ): { success: boolean; job?: Job; employee?: ActiveEmployee; error?: string } {
    const job = this.jobs.get(jobId);
    if (!job) return { success: false, error: `Métier "${jobId}" introuvable` };

    const count = this.getEmployeesByJob(jobId).length;
    if (count >= job.maxEmployees) {
      return { success: false, error: `${job.name} est au complet (${count}/${job.maxEmployees})` };
    }

    // Quitter l'ancien job
    if (this.employees.has(playerId)) this.leaveJob(playerId);

    const clampedGrade = Math.max(0, Math.min(grade, job.grades.length - 1));
    const employee: ActiveEmployee = {
      id: `emp_${randomUUID().slice(0, 8)}`,
      playerId,
      playerName,
      jobId,
      grade: clampedGrade,
      status: clampedGrade === 0 ? 'probation' : 'active',
      onDuty: false,
      totalPaid: 0,
      totalHours: 0,
      shiftsCompleted: 0,
      overtime: 0,
      reputation: 0,
      xp: 0,
      xpNextLevel: 100,
      performance: 70,
      tasksDone: 0,
      warnings: [],
      hiredAt: Date.now(),
      preferredShift: 'day',
      notes: '',
      isManager: clampedGrade >= job.grades.length - 2,
      managedBy,
    };

    this.employees.set(playerId, employee);
    this.payStubs.set(playerId, []);

    // Rejoindre syndicat
    if (job.unionId && this.unions.has(job.unionId)) {
      const union = this.unions.get(job.unionId)!;
      if (!union.members.includes(playerId)) union.members.push(playerId);
    }

    this.emit('job:joined', { playerId, playerName, job, grade: clampedGrade, employee });
    console.log(`💼 [JOBS] ${playerName} → ${job.name} (grade ${clampedGrade})`);
    return { success: true, job, employee };
  }

  leaveJob(playerId: string, reason = 'voluntary'): void {
    const emp = this.employees.get(playerId);
    if (!emp) return;

    this.setOffDuty(playerId);
    this.employees.delete(playerId);

    // Quitter syndicat
    const job = this.jobs.get(emp.jobId);
    if (job?.unionId) {
      const union = this.unions.get(job.unionId);
      if (union) union.members = union.members.filter(id => id !== playerId);
    }

    this.emit('job:left', { playerId, jobId: emp.jobId, reason });
    console.log(`🚪 [JOBS] ${emp.playerName} quitte ${emp.jobId} (${reason})`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SERVICE (ON DUTY / OFF DUTY)
  // ══════════════════════════════════════════════════════════════════════════

  setOnDuty(playerId: string): { success: boolean; equipment?: string[]; error?: string } {
    const emp = this.employees.get(playerId);
    if (!emp) return { success: false, error: 'Pas de métier assigné' };
    if (emp.onDuty) return { success: false, error: 'Déjà en service' };
    if (emp.status === 'suspended') return { success: false, error: 'Compte suspendu' };
    if (emp.status === 'fired') return { success: false, error: 'Employé licencié' };

    const job = this.jobs.get(emp.jobId);
    if (!job) return { success: false, error: 'Métier introuvable' };

    // Vérifier grève syndicale
    if (job.unionId) {
      const union = this.unions.get(job.unionId);
      if (union?.onStrike) {
        return { success: false, error: `Le syndicat ${union.name} est en grève` };
      }
    }

    emp.onDuty = true;
    emp.dutyStart = Date.now();

    // Timer de salaire
    const salaryMs = job.salaryInterval || 10 * 60_000;
    const interval = setInterval(() => {
      const gradeData = job.grades[emp.grade];
      const baseSalary = gradeData.salary;
      const taxAmount = Math.floor(baseSalary * job.taxRate);
      const netSalary = baseSalary - taxAmount;

      emp.totalPaid += netSalary;
      this.metrics.totalSalaryPaid += netSalary;

      // Générer une fiche de paie
      const stub: PayStub = {
        id: `stub_${randomUUID().slice(0, 8)}`,
        playerId,
        jobId: emp.jobId,
        period: new Date().toISOString().slice(0, 10),
        baseSalary,
        overtime: 0,
        taskBonus: 0,
        gross: baseSalary,
        tax: taxAmount,
        net: netSalary,
        paidAt: Date.now(),
      };

      const stubs = this.payStubs.get(playerId) || [];
      stubs.unshift(stub);
      if (stubs.length > 100) stubs.length = 100;
      this.payStubs.set(playerId, stubs);

      this.emit('salary:due', { playerId, jobId: emp.jobId, amount: netSalary, stub });
    }, salaryMs);

    this.salaryIntervals.set(playerId, interval);
    this.emit('job:on_duty', { playerId, jobId: emp.jobId, shift: this.detectShift() });

    return { success: true, equipment: job.equipmentOnDuty };
  }

  setOffDuty(playerId: string): { hoursWorked?: number } {
    const emp = this.employees.get(playerId);
    if (!emp || !emp.onDuty) return {};

    const hoursMs = emp.dutyStart ? Date.now() - emp.dutyStart : 0;
    const hours = hoursMs / 3_600_000;
    const minShift = this.jobs.get(emp.jobId)?.minShiftDuration || 0;

    emp.onDuty = false;
    emp.dutyEnd = Date.now();
    emp.totalHours += hours;
    emp.overtime += Math.max(0, hoursMs - minShift);

    if (hoursMs >= minShift) emp.shiftsCompleted++;

    // Bonus de réputation pour shift complet
    if (hoursMs >= minShift) {
      this.addReputation(playerId, 2, 'Shift complet');
    }

    const interval = this.salaryIntervals.get(playerId);
    if (interval) { clearInterval(interval); this.salaryIntervals.delete(playerId); }

    this.emit('job:off_duty', { playerId, jobId: emp.jobId, hoursWorked: hours });
    return { hoursWorked: Math.round(hours * 100) / 100 };
  }

  private detectShift(): ShiftType {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return 'day';
    if (hour >= 14 && hour < 22) return 'evening';
    return 'night';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TÂCHES
  // ══════════════════════════════════════════════════════════════════════════

  startTask(playerId: string, taskId: string): { success: boolean; task?: JobTask; error?: string } {
    const emp = this.employees.get(playerId);
    if (!emp || !emp.onDuty) return { success: false, error: 'Non en service' };

    const job = this.jobs.get(emp.jobId);
    const task = job?.tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Tâche introuvable' };
    if (emp.grade < task.minGrade) {
      return { success: false, error: `Grade ${task.minGrade} requis (vous êtes grade ${emp.grade})` };
    }

    // Vérifier cooldown
    const cdKey = `${playerId}:${taskId}`;
    const lastTs = this.taskCooldowns.get(cdKey);
    if (lastTs && Date.now() - lastTs < task.cooldown) {
      const remaining = Math.ceil((task.cooldown - (Date.now() - lastTs)) / 1000);
      return { success: false, error: `Tâche en cooldown (${remaining}s restants)` };
    }

    const exec: TaskExecution = {
      id: `texec_${randomUUID().slice(0, 8)}`,
      taskId,
      playerId,
      jobId: emp.jobId,
      status: 'in_progress',
      startedAt: Date.now(),
      reward: task.reward,
      xpEarned: task.xpReward,
    };

    this.taskExec.set(exec.id, exec);
    this.emit('task:started', { playerId, taskId, exec });
    return { success: true, task };
  }

  completeTask(
    playerId: string,
    taskId: string,
    quality: number = 1.0
  ): { success: boolean; reward?: number; xpEarned?: number; error?: string } {
    const emp = this.employees.get(playerId);
    if (!emp) return { success: false, error: 'Employé introuvable' };

    const exec = [...this.taskExec.values()]
      .find(e => e.playerId === playerId && e.taskId === taskId && e.status === 'in_progress');
    if (!exec) return { success: false, error: 'Tâche non démarrée' };

    const job = this.jobs.get(emp.jobId);
    const task = job?.tasks.find(t => t.id === taskId);
    if (!task) return { success: false, error: 'Tâche introuvable' };

    const clampedQuality = Math.max(0.5, Math.min(1.5, quality));
    const reward = Math.round(task.reward * clampedQuality);
    const xpEarned = Math.round(task.xpReward * clampedQuality);

    exec.status = 'completed';
    exec.completedAt = Date.now();
    exec.reward = reward;
    exec.xpEarned = xpEarned;

    // Mettre à jour l'employé
    emp.tasksDone++;
    emp.xp += xpEarned;
    this.metrics.totalTasksDone++;

    // Cooldown
    this.taskCooldowns.set(`${playerId}:${taskId}`, Date.now());

    // Réputation
    this.addReputation(playerId, 1, `Tâche ${task.name} complétée`);

    // Vérifier montée de grade automatique
    this.checkAutoPromotion(playerId);

    this.emit('task:completed', { playerId, taskId, reward, xpEarned, exec });
    return { success: true, reward, xpEarned };
  }

  failTask(playerId: string, taskId: string, reason: string): void {
    const exec = [...this.taskExec.values()]
      .find(e => e.playerId === playerId && e.taskId === taskId && e.status === 'in_progress');
    if (!exec) return;

    exec.status = 'failed';
    exec.notes = reason;
    exec.completedAt = Date.now();

    const emp = this.employees.get(playerId);
    if (emp) this.addReputation(playerId, -2, `Tâche ${taskId} échouée`);

    this.emit('task:failed', { playerId, taskId, reason });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GRADES & PROMOTIONS
  // ══════════════════════════════════════════════════════════════════════════

  promoteEmployee(
    playerId: string,
    newGrade: number,
    promotedBy: string,
    reason = ''
  ): { success: boolean; error?: string } {
    const emp = this.employees.get(playerId);
    if (!emp) return { success: false, error: 'Employé introuvable' };

    const job = this.jobs.get(emp.jobId)!;
    if (newGrade >= job.grades.length || newGrade < 0) {
      return { success: false, error: `Grade invalide (0–${job.grades.length - 1})` };
    }
    if (newGrade <= emp.grade) {
      return { success: false, error: 'Nouveau grade doit être supérieur au grade actuel' };
    }

    const gradeData = job.grades[newGrade];
    if (emp.reputation < gradeData.minReputation) {
      return { success: false, error: `Réputation insuffisante (${emp.reputation}/${gradeData.minReputation})` };
    }

    const oldGrade = emp.grade;
    emp.grade = newGrade;
    emp.lastPromotion = Date.now();
    emp.isManager = newGrade >= job.grades.length - 2;
    emp.status = 'active'; // Fin de probatoire
    this.metrics.totalPromotions++;

    this.emit('job:promoted', { playerId, jobId: emp.jobId, oldGrade, newGrade, promotedBy, reason });
    console.log(`⬆️ [JOBS] ${emp.playerName} promu grade ${newGrade} (${gradeData.name})`);
    return { success: true };
  }

  demoteEmployee(
    playerId: string,
    newGrade: number,
    demotedBy: string,
    reason = ''
  ): { success: boolean; error?: string } {
    const emp = this.employees.get(playerId);
    if (!emp) return { success: false, error: 'Employé introuvable' };

    const job = this.jobs.get(emp.jobId)!;
    if (newGrade < 0 || newGrade >= emp.grade) {
      return { success: false, error: 'Rétrogradation invalide' };
    }

    const oldGrade = emp.grade;
    emp.grade = newGrade;
    emp.isManager = false;

    this.emit('job:demoted', { playerId, jobId: emp.jobId, oldGrade, newGrade, demotedBy, reason });
    return { success: true };
  }

  private checkAutoPromotion(playerId: string): void {
    const emp = this.employees.get(playerId);
    if (!emp) return;
    const job = this.jobs.get(emp.jobId);
    if (!job) return;

    const nextGrade = emp.grade + 1;
    if (nextGrade >= job.grades.length) return;

    const gradeData = job.grades[nextGrade];
    if (
      emp.reputation >= gradeData.minReputation &&
      emp.xp >= emp.xpNextLevel &&
      emp.status === 'active' &&
      !emp.lastPromotion || (Date.now() - (emp.lastPromotion || 0) > 24 * 60 * 60_000)
    ) {
      // Signaler qu'une promotion est possible
      this.emit('promotion:available', { playerId, jobId: emp.jobId, currentGrade: emp.grade, nextGrade });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RÉPUTATION & XP
  // ══════════════════════════════════════════════════════════════════════════

  addReputation(playerId: string, amount: number, reason: string): void {
    const emp = this.employees.get(playerId);
    if (!emp) return;
    emp.reputation = Math.max(0, Math.min(100, emp.reputation + amount));
    this.emit('reputation:changed', { playerId, reputation: emp.reputation, delta: amount, reason });
  }

  addXP(playerId: string, xp: number): void {
    const emp = this.employees.get(playerId);
    if (!emp) return;
    emp.xp += xp;
    if (emp.xp >= emp.xpNextLevel) {
      emp.xp -= emp.xpNextLevel;
      emp.xpNextLevel = Math.floor(emp.xpNextLevel * 1.5);
      this.addReputation(playerId, 5, 'Level up');
      this.emit('employee:levelUp', { playerId, xpNextLevel: emp.xpNextLevel });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DISCIPLINE
  // ══════════════════════════════════════════════════════════════════════════

  issueWarning(
    targetId: string,
    issuedBy: string,
    type: DisciplineType,
    reason: string
  ): { success: boolean; record?: DisciplineRecord; error?: string } {
    const emp = this.employees.get(targetId);
    if (!emp) return { success: false, error: 'Employé introuvable' };

    const record: DisciplineRecord = {
      id: `disc_${randomUUID().slice(0, 8)}`,
      type,
      reason,
      issuedBy,
      issuedAt: Date.now(),
      resolved: false,
    };

    emp.warnings.push(record);

    switch (type) {
      case 'suspension':
        emp.status = 'suspended';
        this.setOffDuty(targetId);
        break;
      case 'demotion':
        if (emp.grade > 0) this.demoteEmployee(targetId, emp.grade - 1, issuedBy, reason);
        break;
      case 'termination':
        emp.status = 'fired';
        this.setOffDuty(targetId);
        this.metrics.totalFirings++;
        this.emit('employee:fired', { playerId: targetId, reason });
        break;
    }

    this.addReputation(targetId, -10, `Sanction: ${type}`);
    this.emit('discipline:issued', { targetId, issuedBy, record });
    return { success: true, record };
  }

  resolveWarning(warningId: string, resolverId: string): boolean {
    for (const emp of this.employees.values()) {
      const warn = emp.warnings.find(w => w.id === warningId);
      if (warn) {
        warn.resolved = true;
        warn.resolvedAt = Date.now();
        if (emp.status === 'suspended') emp.status = 'active';
        this.emit('discipline:resolved', { employeeId: emp.id, warningId, resolverId });
        return true;
      }
    }
    return false;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ÉVALUATIONS
  // ══════════════════════════════════════════════════════════════════════════

  evaluateEmployee(
    employeeId: string,
    evaluatorId: string,
    criteria: { punctuality: number; performance: number; teamwork: number; attitude: number },
    comments: string
  ): { success: boolean; evaluation?: Evaluation; error?: string } {
    const emp = this.employees.get(employeeId);
    if (!emp) return { success: false, error: 'Employé introuvable' };

    const score = Math.round(
      (criteria.punctuality * 0.25 + criteria.performance * 0.35 +
        criteria.teamwork * 0.20 + criteria.attitude * 0.20)
    );

    const evaluation: Evaluation = {
      id: `eval_${randomUUID().slice(0, 8)}`,
      employeeId,
      evaluatorId,
      score,
      criteria,
      comments: comments.slice(0, 500),
      period: new Date().toISOString().slice(0, 7),
      createdAt: Date.now(),
    };

    const evals = this.evaluations.get(employeeId) || [];
    evals.unshift(evaluation);
    if (evals.length > 12) evals.length = 12;
    this.evaluations.set(employeeId, evals);

    // Mettre à jour la performance moyenne
    emp.performance = Math.round(evals.reduce((s, e) => s + e.score, 0) / evals.length);
    emp.lastEvaluation = Date.now();

    // Impact réputation
    const repDelta = Math.round((score - 50) / 10);
    this.addReputation(employeeId, repDelta, `Évaluation: ${score}/100`);

    this.emit('employee:evaluated', { employeeId, evaluatorId, score, evaluation });
    return { success: true, evaluation };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SYNDICATS
  // ══════════════════════════════════════════════════════════════════════════

  declareStrike(unionId: string, leaderId: string, demands: string[]): { success: boolean; error?: string } {
    const union = this.unions.get(unionId);
    if (!union) return { success: false, error: 'Syndicat introuvable' };
    if (union.leaderId !== leaderId) return { success: false, error: 'Seul le leader peut déclencher une grève' };
    if (union.onStrike) return { success: false, error: 'Grève déjà en cours' };

    union.onStrike = true;
    union.strikeStart = Date.now();
    union.demands = demands;

    // Forcer tous les membres en service à quitter
    for (const playerId of union.members) {
      this.setOffDuty(playerId);
    }

    this.emit('union:strike', { unionId, demands });
    console.warn(`🚨 [JOBS] Grève: ${union.name} — ${demands.join(', ')}`);
    return { success: true };
  }

  endStrike(unionId: string): boolean {
    const union = this.unions.get(unionId);
    if (!union || !union.onStrike) return false;
    union.onStrike = false;
    union.strikeStart = undefined;
    this.emit('union:strikeEnd', { unionId });
    return true;
  }

  contributeToUnion(playerId: string, amount: number): { success: boolean; error?: string } {
    const emp = this.employees.get(playerId);
    if (!emp) return { success: false, error: 'Employé introuvable' };
    const job = this.jobs.get(emp.jobId);
    if (!job?.unionId) return { success: false, error: 'Pas de syndicat pour ce métier' };
    const union = this.unions.get(job.unionId);
    if (!union) return { success: false, error: 'Syndicat introuvable' };
    union.fund += amount;
    this.emit('union:contribution', { playerId, unionId: job.unionId, amount });
    return { success: true };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PERMISSIONS
  // ══════════════════════════════════════════════════════════════════════════

  hasPermission(playerId: string, permission: string): boolean {
    const emp = this.employees.get(playerId);
    if (!emp) return false;
    const job = this.jobs.get(emp.jobId);
    const grade = job?.grades[emp.grade];
    if (!grade) return false;
    return grade.permissions.includes('all') ||
      grade.permissions.includes(`all_${job!.category}`) ||
      grade.permissions.includes(permission);
  }

  getPermissions(playerId: string): string[] {
    const emp = this.employees.get(playerId);
    if (!emp) return [];
    const job = this.jobs.get(emp.jobId);
    const grade = job?.grades[emp.grade];
    return grade?.permissions || [];
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ACCESSEURS
  // ══════════════════════════════════════════════════════════════════════════

  getJob(id: string) { return this.jobs.get(id); }
  getAllJobs() { return Array.from(this.jobs.values()); }
  getJobsByCategory(cat: JobCategory) { return this.getAllJobs().filter(j => j.category === cat); }
  getLegalJobs() { return this.getAllJobs().filter(j => j.legalStatus === 'legal'); }
  getOpenJobs() { return this.getAllJobs().filter(j => j.openHiring); }
  getEmployee(playerId: string) { return this.employees.get(playerId); }
  getEmployeesByJob(jobId: string) { return [...this.employees.values()].filter(e => e.jobId === jobId); }
  getOnDutyByJob(jobId: string) { return this.getEmployeesByJob(jobId).filter(e => e.onDuty); }
  getAllOnDuty() { return [...this.employees.values()].filter(e => e.onDuty); }
  getApplications(jobId?: string) { return [...this.applications.values()].filter(a => !jobId || a.jobId === jobId); }
  getPendingApplications(jobId: string) { return this.getApplications(jobId).filter(a => a.status === 'pending'); }
  getPayStubs(playerId: string, n = 10) { return (this.payStubs.get(playerId) || []).slice(0, n); }
  getEvaluations(employeeId: string) { return this.evaluations.get(employeeId) || []; }
  getUnion(id: string) { return this.unions.get(id); }
  getAllUnions() { return Array.from(this.unions.values()); }
  getTaskHistory(playerId: string, n = 20) {
    return [...this.taskExec.values()]
      .filter(e => e.playerId === playerId)
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, n);
  }

  registerJob(job: Job): void {
    this.jobs.set(job.id, job);
    console.log(`✅ [JOBS] Métier enregistré: ${job.name}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STATISTIQUES
  // ══════════════════════════════════════════════════════════════════════════

  getStats() {
    const emps = [...this.employees.values()];
    const onDuty = emps.filter(e => e.onDuty).length;
    const byJob: Record<string, { total: number; onDuty: number; avgGrade: number }> = {};

    for (const [jobId] of this.jobs) {
      const jobEmps = emps.filter(e => e.jobId === jobId);
      const avgGrade = jobEmps.length > 0
        ? Math.round(jobEmps.reduce((s, e) => s + e.grade, 0) / jobEmps.length * 10) / 10
        : 0;
      byJob[jobId] = { total: jobEmps.length, onDuty: jobEmps.filter(e => e.onDuty).length, avgGrade };
    }

    const topPerformers = [...emps]
      .sort((a, b) => b.performance - a.performance)
      .slice(0, 5)
      .map(e => ({ playerId: e.playerId, name: e.playerName, job: e.jobId, performance: e.performance }));

    return {
      totalJobs: this.jobs.size,
      totalEmployees: emps.length,
      onDuty,
      offDuty: emps.length - onDuty,
      suspended: emps.filter(e => e.status === 'suspended').length,
      probation: emps.filter(e => e.status === 'probation').length,
      pendingApplications: [...this.applications.values()].filter(a => a.status === 'pending').length,
      totalTasksDone: this.metrics.totalTasksDone,
      totalSalaryPaid: this.metrics.totalSalaryPaid,
      totalPromotions: this.metrics.totalPromotions,
      totalFirings: this.metrics.totalFirings,
      totalUnions: this.unions.size,
      onStrikeUnions: [...this.unions.values()].filter(u => u.onStrike).length,
      byJob,
      topPerformers,
    };
  }

  getPlayerStats(playerId: string) {
    const emp = this.employees.get(playerId);
    if (!emp) return null;
    const job = this.jobs.get(emp.jobId);
    return {
      employee: emp,
      job: job ? { id: job.id, name: job.name, category: job.category, color: job.color } : null,
      gradeName: job?.grades[emp.grade]?.name || 'Inconnu',
      permissions: this.getPermissions(playerId),
      taskHistory: this.getTaskHistory(playerId, 10),
      payStubs: this.getPayStubs(playerId, 5),
      evaluations: this.getEvaluations(emp.id),
      union: job?.unionId ? this.getUnion(job.unionId) : null,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON + EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export default JobEngine.getInstance();