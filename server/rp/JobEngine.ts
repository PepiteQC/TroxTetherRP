/**
 * JobEngine — Système de métiers RP complet
 * 10 jobs prédéfinis · Salaires · Tâches · Grades
 * Port-Éther RP — Fichier: server/rp/JobEngine.ts
 */

import { EventEmitter } from 'events';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Job {
  id: string;
  name: string;
  category: 'gouvernement' | 'civil' | 'independant' | 'criminel';
  color: string;          // HEX pour le HUD
  icon: string;           // Emoji ou icon-id
  salary: number;         // $ par cycle (10 min)
  maxEmployees: number;
  openHiring: boolean;    // Peut s'inscrire seul?
  grades: { id: number; name: string; salary: number; permissions: string[] }[];
  spawnPoint: { x: number; y: number; z: number };
  vehicleAllowed: string[];  // IDs véhicules du job
  equipmentOnDuty: string[]; // Items reçus à la prise de service
}

export interface ActiveEmployee {
  playerId: string;
  playerName: string;
  jobId: string;
  grade: number;
  onDuty: boolean;
  dutyStart?: number;
  totalPaid: number;
}

// ─── Définitions des 10 jobs de Port-Éther ────────────────────────────────────

const PORT_ETHER_JOBS: Job[] = [
  {
    id: 'police',
    name: 'Service de Police de Port-Éther',
    category: 'gouvernement',
    color: '#3B82F6',
    icon: '👮',
    salary: 250,
    maxEmployees: 50,
    openHiring: false,
    grades: [
      { id: 0, name: 'Recrue',         salary: 200, permissions: ['arrest', 'ticket'] },
      { id: 1, name: 'Agent',          salary: 250, permissions: ['arrest', 'ticket', 'search'] },
      { id: 2, name: 'Caporal',        salary: 300, permissions: ['arrest', 'ticket', 'search', 'seize'] },
      { id: 3, name: 'Sergent',        salary: 400, permissions: ['arrest', 'ticket', 'search', 'seize', 'manage_lower'] },
      { id: 4, name: 'Lieutenant',     salary: 500, permissions: ['all'] },
      { id: 5, name: 'Chef',           salary: 700, permissions: ['all', 'admin_job'] },
    ],
    spawnPoint: { x: 50, y: 0, z: 50 },
    vehicleAllowed: ['vehicle_police_cruiser', 'vehicle_police_suv'],
    equipmentOnDuty: ['item_radio', 'item_handcuffs', 'item_baton'],
  },
  {
    id: 'ems',
    name: 'Services Médicaux d\'Urgence',
    category: 'gouvernement',
    color: '#EF4444',
    icon: '🚑',
    salary: 225,
    maxEmployees: 30,
    openHiring: false,
    grades: [
      { id: 0, name: 'Stagiaire EMT',  salary: 175, permissions: ['revive', 'treat'] },
      { id: 1, name: 'EMT',            salary: 225, permissions: ['revive', 'treat', 'prescribe'] },
      { id: 2, name: 'Infirmier',      salary: 275, permissions: ['revive', 'treat', 'prescribe', 'diagnose'] },
      { id: 3, name: 'Médecin',        salary: 400, permissions: ['revive', 'treat', 'prescribe', 'diagnose', 'surgery'] },
      { id: 4, name: 'Chef Médical',   salary: 600, permissions: ['all'] },
    ],
    spawnPoint: { x: -50, y: 0, z: 80 },
    vehicleAllowed: ['vehicle_ambulance', 'vehicle_medic_suv'],
    equipmentOnDuty: ['item_radio', 'item_medkit', 'item_defibrillator'],
  },
  {
    id: 'mecanicien',
    name: 'Garage Mécanique Port-Éther',
    category: 'civil',
    color: '#F59E0B',
    icon: '🔧',
    salary: 175,
    maxEmployees: 15,
    openHiring: true,
    grades: [
      { id: 0, name: 'Apprenti',       salary: 125, permissions: ['repair_basic'] },
      { id: 1, name: 'Mécanicien',     salary: 175, permissions: ['repair_basic', 'repair_advanced'] },
      { id: 2, name: 'Chef Mécan.',    salary: 250, permissions: ['repair_basic', 'repair_advanced', 'tow'] },
      { id: 3, name: 'Proprio',        salary: 350, permissions: ['all'] },
    ],
    spawnPoint: { x: 100, y: 0, z: -50 },
    vehicleAllowed: ['vehicle_tow_truck', 'vehicle_mechanic_van'],
    equipmentOnDuty: ['item_outil', 'item_radio'],
  },
  {
    id: 'taxi',
    name: 'Taxi Port-Éther',
    category: 'independant',
    color: '#EAB308',
    icon: '🚕',
    salary: 0,             // Payé par courses
    maxEmployees: 25,
    openHiring: true,
    grades: [
      { id: 0, name: 'Chauffeur',      salary: 0,   permissions: ['take_fare'] },
      { id: 1, name: 'Senior',         salary: 0,   permissions: ['take_fare', 'priority_dispatch'] },
    ],
    spawnPoint: { x: 0, y: 0, z: -100 },
    vehicleAllowed: ['vehicle_taxi'],
    equipmentOnDuty: ['item_radio', 'item_phone'],
  },
  {
    id: 'pompier',
    name: 'Brigade des Pompiers',
    category: 'gouvernement',
    color: '#DC2626',
    icon: '🚒',
    salary: 200,
    maxEmployees: 20,
    openHiring: false,
    grades: [
      { id: 0, name: 'Recrue',         salary: 150, permissions: ['extinguish'] },
      { id: 1, name: 'Pompier',        salary: 200, permissions: ['extinguish', 'rescue'] },
      { id: 2, name: 'Caporal',        salary: 270, permissions: ['extinguish', 'rescue', 'lead_unit'] },
      { id: 3, name: 'Capitaine',      salary: 400, permissions: ['all'] },
    ],
    spawnPoint: { x: -100, y: 0, z: -100 },
    vehicleAllowed: ['vehicle_firetruck', 'vehicle_fire_suv'],
    equipmentOnDuty: ['item_radio', 'item_extinguisher', 'item_axe'],
  },
  {
    id: 'journaliste',
    name: 'Journal Port-Éther Presse',
    category: 'independant',
    color: '#8B5CF6',
    icon: '📰',
    salary: 150,
    maxEmployees: 10,
    openHiring: true,
    grades: [
      { id: 0, name: 'Pigiste',        salary: 100, permissions: ['report'] },
      { id: 1, name: 'Journaliste',    salary: 150, permissions: ['report', 'broadcast'] },
      { id: 2, name: 'Rédacteur',      salary: 225, permissions: ['report', 'broadcast', 'publish'] },
    ],
    spawnPoint: { x: 75, y: 0, z: 75 },
    vehicleAllowed: ['vehicle_news_van'],
    equipmentOnDuty: ['item_camera', 'item_microphone', 'item_press_badge'],
  },
  {
    id: 'boucher',
    name: 'Boucherie Gagnon & Fils',
    category: 'civil',
    color: '#E11D48',
    icon: '🥩',
    salary: 160,
    maxEmployees: 8,
    openHiring: true,
    grades: [
      { id: 0, name: 'Employé',        salary: 130, permissions: ['sell_meat'] },
      { id: 1, name: 'Boucher',        salary: 160, permissions: ['sell_meat', 'process_animal'] },
      { id: 2, name: 'Gérant',         salary: 220, permissions: ['all'] },
    ],
    spawnPoint: { x: -75, y: 0, z: 25 },
    vehicleAllowed: [],
    equipmentOnDuty: ['item_tablier', 'item_couteau_boucher'],
  },
  {
    id: 'electricien',
    name: 'Hydro Port-Éther',
    category: 'civil',
    color: '#F97316',
    icon: '⚡',
    salary: 190,
    maxEmployees: 12,
    openHiring: true,
    grades: [
      { id: 0, name: 'Technicien',     salary: 150, permissions: ['repair_electric'] },
      { id: 1, name: 'Électricien',    salary: 190, permissions: ['repair_electric', 'install'] },
      { id: 2, name: 'Chef Équipe',    salary: 260, permissions: ['all'] },
    ],
    spawnPoint: { x: 150, y: 0, z: 50 },
    vehicleAllowed: ['vehicle_utility_truck'],
    equipmentOnDuty: ['item_outil_electrique', 'item_casque', 'item_radio'],
  },
  {
    id: 'avocat',
    name: 'Cabinet Juridique St-Laurent',
    category: 'independant',
    color: '#0EA5E9',
    icon: '⚖️',
    salary: 300,
    maxEmployees: 6,
    openHiring: false,
    grades: [
      { id: 0, name: 'Stagiaire',      salary: 200, permissions: ['legal_advice'] },
      { id: 1, name: 'Avocat',         salary: 300, permissions: ['legal_advice', 'represent', 'plea'] },
      { id: 2, name: 'Associé',        salary: 500, permissions: ['all'] },
    ],
    spawnPoint: { x: 25, y: 0, z: 150 },
    vehicleAllowed: ['vehicle_sedan_luxury'],
    equipmentOnDuty: ['item_mallette', 'item_phone', 'item_badge_avocat'],
  },
  {
    id: 'unemployed',
    name: 'Sans emploi',
    category: 'civil',
    color: '#6B7280',
    icon: '🏠',
    salary: 50,            // Aide sociale minimale
    maxEmployees: 9999,
    openHiring: true,
    grades: [
      { id: 0, name: 'Citoyen',        salary: 50,  permissions: [] },
    ],
    spawnPoint: { x: 0, y: 0, z: 0 },
    vehicleAllowed: [],
    equipmentOnDuty: [],
  },
];

// ─── JobEngine ────────────────────────────────────────────────────────────────

export class JobEngine extends EventEmitter {
  private static instance: JobEngine;
  private jobs = new Map<string, Job>();
  private employees = new Map<string, ActiveEmployee>(); // playerId → employee
  private salaryIntervals = new Map<string, NodeJS.Timeout>();

  static getInstance(): JobEngine {
    if (!JobEngine.instance) JobEngine.instance = new JobEngine();
    return JobEngine.instance;
  }

  constructor() {
    super();
    // Charger les jobs de base
    for (const job of PORT_ETHER_JOBS) {
      this.jobs.set(job.id, job);
    }
    console.log(`✅ [JOBS] ${this.jobs.size} métiers chargés`);
  }

  // ─── Rejoindre un métier ──────────────────────────────────────────────────

  joinJob(playerId: string, playerName: string, jobId: string, grade = 0): {
    success: boolean;
    job?: Job;
    error?: string;
  } {
    const job = this.jobs.get(jobId);
    if (!job) return { success: false, error: `Métier "${jobId}" introuvable` };

    // Compter les employés actuels
    const currentCount = [...this.employees.values()].filter(e => e.jobId === jobId).length;
    if (currentCount >= job.maxEmployees) {
      return { success: false, error: `${job.name} est au complet (${currentCount}/${job.maxEmployees})` };
    }

    // Quitter l'ancien job si nécessaire
    const existing = this.employees.get(playerId);
    if (existing) this.leaveJob(playerId);

    const employee: ActiveEmployee = {
      playerId,
      playerName,
      jobId,
      grade: Math.min(grade, job.grades.length - 1),
      onDuty: false,
      totalPaid: 0,
    };

    this.employees.set(playerId, employee);
    this.emit('job:joined', { playerId, playerName, job, grade });
    console.log(`💼 [JOBS] ${playerName} rejoint: ${job.name} (grade ${grade})`);

    return { success: true, job };
  }

  // ─── Quitter un métier ────────────────────────────────────────────────────

  leaveJob(playerId: string): void {
    const emp = this.employees.get(playerId);
    if (!emp) return;
    this.setOffDuty(playerId);
    this.employees.delete(playerId);
    this.emit('job:left', { playerId, jobId: emp.jobId });
  }

  // ─── Prise/fin de service ─────────────────────────────────────────────────

  setOnDuty(playerId: string): { success: boolean; equipment?: string[]; error?: string } {
    const emp = this.employees.get(playerId);
    if (!emp) return { success: false, error: 'Pas de métier assigné' };
    if (emp.onDuty) return { success: false, error: 'Déjà en service' };

    emp.onDuty = true;
    emp.dutyStart = Date.now();

    const job = this.jobs.get(emp.jobId)!;

    // Démarrer le timer de salaire
    const interval = setInterval(() => {
      this.emit('salary:due', { playerId, jobId: emp.jobId, amount: job.grades[emp.grade].salary });
      emp.totalPaid += job.grades[emp.grade].salary;
    }, 10 * 60 * 1000); // 10 minutes

    this.salaryIntervals.set(playerId, interval);
    this.emit('job:on_duty', { playerId, jobId: emp.jobId });

    return { success: true, equipment: job.equipmentOnDuty };
  }

  setOffDuty(playerId: string): void {
    const emp = this.employees.get(playerId);
    if (!emp || !emp.onDuty) return;

    emp.onDuty = false;
    const interval = this.salaryIntervals.get(playerId);
    if (interval) { clearInterval(interval); this.salaryIntervals.delete(playerId); }

    this.emit('job:off_duty', { playerId, jobId: emp.jobId });
  }

  // ─── Promotion ────────────────────────────────────────────────────────────

  promoteEmployee(playerId: string, newGrade: number): boolean {
    const emp = this.employees.get(playerId);
    if (!emp) return false;
    const job = this.jobs.get(emp.jobId)!;
    if (newGrade >= job.grades.length) return false;
    emp.grade = newGrade;
    this.emit('job:promoted', { playerId, jobId: emp.jobId, grade: newGrade });
    return true;
  }

  // ─── Vérification de permission ───────────────────────────────────────────

  hasPermission(playerId: string, permission: string): boolean {
    const emp = this.employees.get(playerId);
    if (!emp) return false;
    const job = this.jobs.get(emp.jobId)!;
    const grade = job.grades[emp.grade];
    return grade.permissions.includes('all') || grade.permissions.includes(permission);
  }

  // ─── Accesseurs ────────────────────────────────────────────────────────────

  getJob(id: string)                   { return this.jobs.get(id); }
  getAllJobs()                          { return Array.from(this.jobs.values()); }
  getEmployee(playerId: string)        { return this.employees.get(playerId); }
  getEmployeesByJob(jobId: string)     { return [...this.employees.values()].filter(e => e.jobId === jobId); }
  getOnDutyByJob(jobId: string)        { return this.getEmployeesByJob(jobId).filter(e => e.onDuty); }

  registerJob(job: Job): void {
    this.jobs.set(job.id, job);
    console.log(`✅ [JOBS] Nouveau métier enregistré: ${job.name}`);
  }

  getStats() {
    const employees = [...this.employees.values()];
    return {
      totalJobs: this.jobs.size,
      totalEmployees: employees.length,
      onDuty: employees.filter(e => e.onDuty).length,
      byJob: Object.fromEntries(
        [...this.jobs.keys()].map(id => [id, this.getEmployeesByJob(id).length])
      ),
    };
  }
}

export default JobEngine.getInstance();