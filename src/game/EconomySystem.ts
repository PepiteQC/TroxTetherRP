// EtherWorld RP — Port-Éther
// Système économique — cash, banque, transactions, salaires

import type { TransactionLog } from '../shared/types';
import { MAX_CASH } from '../shared/constants';

export class EconomySystem {
  public transactions: TransactionLog[] = [];
  private maxLogEntries = 1000;

  /** Ajoute du cash */
  addCash(playerId: string, amount: number): { success: boolean; newBalance: number; error?: string } {
    if (amount <= 0) return { success: false, newBalance: 0, error: 'Montant invalide' };
    // Note: la validation du solde réel se fait via le PlayerManager
    this.logTransaction(null, playerId, amount, 'cash', 'Dépôt');
    return { success: true, newBalance: amount };
  }

  /** Retire du cash */
  removeCash(playerId: string, amount: number, currentCash: number): { success: boolean; newBalance: number; error?: string } {
    if (amount <= 0) return { success: false, newBalance: currentCash, error: 'Montant invalide' };
    if (amount > currentCash) return { success: false, newBalance: currentCash, error: 'Solde insuffisant' };
    this.logTransaction(playerId, null, amount, 'cash', 'Retrait');
    return { success: true, newBalance: currentCash - amount };
  }

  /** Transfère du cash entre joueurs */
  transferCash(fromId: string, toId: string, amount: number, fromCash: number): { success: boolean; error?: string } {
    if (amount <= 0) return { success: false, error: 'Montant invalide' };
    if (amount > fromCash) return { success: false, error: 'Solde insuffisant' };
    this.logTransaction(fromId, toId, amount, 'transfer', `Transfert vers ${toId}`);
    return { success: true };
  }

  /** Ajoute en banque */
  addBank(playerId: string, amount: number): { success: boolean; error?: string } {
    if (amount <= 0) return { success: false, error: 'Montant invalide' };
    this.logTransaction(null, playerId, amount, 'bank', 'Dépôt bancaire');
    return { success: true };
  }

  /** Retire de la banque */
  removeBank(playerId: string, amount: number, currentBank: number): { success: boolean; newBalance: number; error?: string } {
    if (amount <= 0) return { success: false, newBalance: currentBank, error: 'Montant invalide' };
    if (amount > currentBank) return { success: false, newBalance: currentBank, error: 'Fonds bancaires insuffisants' };
    this.logTransaction(playerId, null, amount, 'bank', 'Retrait bancaire');
    return { success: true, newBalance: currentBank - amount };
  }

  /** Paie le salaire d'un job */
  paySalary(playerId: string, salary: number): { success: boolean; amount: number } {
    const amount = salary;
    this.logTransaction(null, playerId, amount, 'salary', 'Salaire');
    return { success: true, amount };
  }

  /** Achète un objet */
  buyItem(playerId: string, price: number, itemName: string, currentCash: number): { success: boolean; error?: string } {
    if (price <= 0) return { success: false, error: 'Prix invalide' };
    if (price > currentCash) return { success: false, error: 'Fonds insuffisants' };
    this.logTransaction(playerId, null, price, 'purchase', `Achat: ${itemName}`);
    return { success: true };
  }

  /** Vends un objet */
  sellItem(playerId: string, price: number, itemName: string): { success: boolean; amount: number } {
    if (price <= 0) return { success: false, amount: 0 };
    this.logTransaction(null, playerId, price, 'sale', `Vente: ${itemName}`);
    return { success: true, amount: price };
  }

  /** Enregistre une transaction dans les logs */
  private logTransaction(
    fromId: string | null,
    toId: string | null,
    amount: number,
    type: TransactionLog['type'],
    description: string,
  ): void {
    const log: TransactionLog = {
      id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      fromId,
      toId,
      amount,
      type,
      description,
    };
    this.transactions.push(log);

    // Limiter la taille des logs
    if (this.transactions.length > this.maxLogEntries) {
      this.transactions = this.transactions.slice(-this.maxLogEntries);
    }
  }

  /** Récupère les logs récents */
  getRecentLogs(count: number = 50): TransactionLog[] {
    return this.transactions.slice(-count);
  }

  /** Vérifie si un montant est valide */
  isValidAmount(amount: number): boolean {
    return amount > 0 && amount <= MAX_CASH && Number.isFinite(amount);
  }

  /** Nettoie les logs */
  clearLogs(): void {
    this.transactions = [];
  }
}