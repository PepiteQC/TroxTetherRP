// EtherWorld RP — Port-Éther
// Système de jobs RP — rejoindre, quitter, salaire, actions, grades

import type { JobData, JobName, JobAction, PlayerState, VehicleModel } from '../shared/types';
import { JOBS_LIST } from '../shared/constants';

export class JobSystem {
  public jobs: Map<JobName, JobData> = new Map();
  public playerJobs: Map<string, JobName> = new Map();

  constructor() {
    this.initializeJobs();
  }

  private initializeJobs(): void {
    const jobs: JobData[] = [
      {
        id: 'sans-emploi',
        name: 'Sans Emploi',
        salary: 0,
        ranks: ['Sans emploi'],
        permissions: [],
        spawnPoint: { x: 0, y: 0, z: 25 },
        vehicleAccess: [],
        actions: [],
        description: 'Vous n\'avez pas d\'emploi actuellement.',
      },
      {
        id: 'livreur',
        name: 'Livreur',
        salary: 120,
        ranks: ['Livreur junior', 'Livreur', 'Livreur senior'],
        permissions: ['use_delivery_vehicle'],
        spawnPoint: { x: 0, y: 0, z: 180 },
        vehicleAccess: ['Atlas-Van'],
        actions: [
          { id: 'deliver_package', label: 'Livrer un colis', type: 'deliver', pay: 50, cooldown: 30000 },
          { id: 'deliver_food', label: 'Livrer un repas', type: 'deliver', pay: 35, cooldown: 20000 },
        ],
        uniformColor: 0xffaa00,
      },
      {
        id: 'mecanicien',
        name: 'Mécanicien',
        salary: 180,
        ranks: ['Apprenti', 'Mécanicien', 'Chef mécanicien'],
        permissions: ['use_garage', 'repair_vehicles'],
        spawnPoint: { x: 210, y: 0, z: -80 },
        vehicleAccess: ['Forge-Pickup'],
        actions: [
          { id: 'repair_car', label: 'Réparer véhicule', type: 'repair', pay: 80, cooldown: 45000 },
          { id: 'service_check', label: 'Inspection', type: 'repair', pay: 40, cooldown: 30000 },
        ],
        uniformColor: 0x334466,
        description: 'Réparation et entretien de véhicules.',
      },
      {
        id: 'agent-municipal',
        name: 'Agent Municipal',
        salary: 200,
        ranks: ['Agent', 'Agent principal', 'Superviseur'],
        permissions: ['use_service_vehicle', 'access_admin_area'],
        spawnPoint: { x: 170, y: 0, z: 145 },
        vehicleAccess: ['Municipal-Cruiser'],
        actions: [
          { id: 'patrol', label: 'Patrouiller', type: 'patrol', pay: 60, cooldown: 60000 },
          { id: 'fine', label: 'Verbaliser', type: 'patrol', pay: 30, cooldown: 20000 },
        ],
        uniformColor: 0x224488,
        description: 'Maintien de l\'ordre à Port-Éther.',
      },
      {
        id: 'medecin',
        name: 'Médecin RP',
        salary: 250,
        ranks: ['Stagiaire', 'Infirmier', 'Médecin', 'Chef de service'],
        permissions: ['heal_players', 'access_hospital'],
        spawnPoint: { x: 220, y: 0, z: 145 },
        vehicleAccess: ['Utility-Truck'],
        actions: [
          { id: 'heal', label: 'Soigner un patient', type: 'heal', pay: 100, cooldown: 30000 },
          { id: 'checkup', label: 'Examen médical', type: 'heal', pay: 50, cooldown: 20000 },
        ],
        uniformColor: 0xffffff,
        description: 'Soins médicaux pour les citoyens.',
      },
      {
        id: 'chauffeur',
        name: 'Chauffeur',
        salary: 100,
        ranks: ['Chauffeur', 'Chauffeur senior', 'Chauffeur VIP'],
        permissions: ['use_taxi'],
        spawnPoint: { x: 0, y: 0, z: 20 },
        vehicleAccess: ['Port-Ether-Taxi', 'Nova-Sedan'],
        actions: [
          { id: 'drive_passenger', label: 'Transporter client', type: 'drive', pay: 45, cooldown: 25000 },
        ],
        uniformColor: 0xffcc00,
        description: 'Transport de passagers dans Port-Éther.',
      },
      {
        id: 'entrepreneur',
        name: 'Entrepreneur',
        salary: 300,
        ranks: ['Indépendant', 'Chef d\'entreprise', 'Investisseur'],
        permissions: ['buy_properties', 'manage_business'],
        spawnPoint: { x: 20, y: 0, z: -15 },
        vehicleAccess: ['Nova-Sedan', 'Ether-Compact'],
        actions: [
          { id: 'manage_business', label: 'Gérer commerce', type: 'manage', pay: 120, cooldown: 60000 },
        ],
        description: 'Gestion d\'entreprises et d\'investissements.',
      },
      {
        id: 'architecte',
        name: 'Architecte',
        salary: 220,
        ranks: ['Dessinateur', 'Architecte', 'Architecte en chef'],
        permissions: ['use_builder', 'design_properties'],
        spawnPoint: { x: -20, y: 0, z: 15 },
        vehicleAccess: ['Ether-Compact'],
        actions: [
          { id: 'design', label: 'Concevoir un plan', type: 'build', pay: 90, cooldown: 45000 },
        ],
        description: 'Conception et construction de bâtiments.',
      },
      {
        id: 'employe-depanneur',
        name: 'Employé Dépanneur',
        salary: 130,
        ranks: ['Caissier', 'Employé', 'Gérant'],
        permissions: ['use_shop_cashier', 'manage_shop_stock'],
        spawnPoint: { x: 170, y: 0, z: -75 },
        vehicleAccess: [],
        actions: [
          { id: 'sell_item', label: 'Vendre article', type: 'sell', pay: 30, cooldown: 15000 },
          { id: 'restock', label: 'Réapprovisionner', type: 'sell', pay: 50, cooldown: 60000 },
        ],
        uniformColor: 0x88cc44,
        description: 'Gestion du dépanneur et service client.',
      },
      {
        id: 'gestionnaire-boutique',
        name: 'Gestionnaire Boutique',
        salary: 160,
        ranks: ['Vendeur', 'Gestionnaire', 'Directeur'],
        permissions: ['manage_shop', 'set_prices'],
        spawnPoint: { x: 190, y: 0, z: -75 },
        vehicleAccess: [],
        actions: [
          { id: 'manage_inventory', label: 'Gérer inventaire', type: 'manage', pay: 70, cooldown: 40000 },
        ],
        uniformColor: 0x446688,
        description: 'Gestion des boutiques et commerces.',
      },
    ];

    for (const job of jobs) {
      this.jobs.set(job.id, job);
    }
  }

  /** Rejoindre un job */
  joinJob(playerId: string, jobId: JobName): { success: boolean; error?: string } {
    const job = this.jobs.get(jobId);
    if (!job) return { success: false, error: 'Job inexistant' };
    this.playerJobs.set(playerId, jobId);
    return { success: true };
  }

  /** Quitter un job */
  leaveJob(playerId: string): { success: boolean } {
    this.playerJobs.delete(playerId);
    this.playerJobs.set(playerId, 'sans-emploi');
    return { success: true };
  }

  /** Obtenir le job d'un joueur */
  getPlayerJob(playerId: string): JobData | null {
    const jobId = this.playerJobs.get(playerId) || 'sans-emploi';
    return this.jobs.get(jobId) || null;
  }

  /** Payer le salaire */
  paySalary(playerId: string): { success: boolean; amount: number } {
    const job = this.getPlayerJob(playerId);
    if (!job || job.salary <= 0) return { success: false, amount: 0 };
    return { success: true, amount: job.salary };
  }

  /** Vérifier si un joueur peut utiliser un véhicule de job */
  canUseJobVehicle(playerId: string, vehicleModel: VehicleModel): boolean {
    const job = this.getPlayerJob(playerId);
    if (!job) return false;
    return job.vehicleAccess.includes(vehicleModel);
  }

  /** Obtenir les actions disponibles pour un job */
  getJobActions(jobId: JobName): JobAction[] {
    const job = this.jobs.get(jobId);
    return job?.actions || [];
  }

  /** Obtenir tous les jobs disponibles */
  getAllJobs(): JobData[] {
    return Array.from(this.jobs.values());
  }

  /** Obtenir le rang d'un joueur dans son job */
  getPlayerRank(playerId: string, state: PlayerState): string {
    const job = this.getPlayerJob(playerId);
    if (!job) return 'Aucun';
    const rankIndex = Math.min(state.jobRank - 1, job.ranks.length - 1);
    return job.ranks[Math.max(0, rankIndex)];
  }
}