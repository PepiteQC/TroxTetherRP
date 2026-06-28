/**
 * EconomyEngine — Moteur économique RP complet
 * Cash · Banque · Salaires · Taxes · Marché noir
 * Port-Éther RP — Fichier: server/rp/EconomyEngine.ts
 */

import { EventEmitter } from 'events';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransactionType =
  | 'salary'        | 'deposit'       | 'withdraw'
  | 'transfer'      | 'purchase'      | 'sale'
  | 'fine'          | 'tax'           | 'robbery'
  | 'casino'        | 'drug_sale'     | 'job_reward'
  | 'property_rent' | 'vehicle_sale'  | 'admin_grant';

export interface Transaction {
  id: string;
  type: TransactionType;
  fromId: string;      // 'bank' | 'system' | playerId
  toId: string;
  amount: number;
  currency: 'cash' | 'bank' | 'black';
  reason: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface BankAccount {
  ownerId: string;
  ownerName: string;
  accountNumber: string;
  balance: number;
  frozen: boolean;
  createdAt: number;
  transactions: string[];  // IDs des 50 dernières transactions
}

export interface MarketItem {
  id: string;
  name: string;
  basePrice: number;
  currentPrice: number;   // Fluctue selon offre/demande
  supply: number;
  demand: number;
  illegal: boolean;
  taxRate: number;        // % de taxe
}

// ─── EconomyEngine ────────────────────────────────────────────────────────────

export class EconomyEngine extends EventEmitter {
  private static instance: EconomyEngine;

  private accounts = new Map<string, BankAccount>();
  private transactions = new Map<string, Transaction>();
  private market = new Map<string, MarketItem>();

  // Paramètres économiques de Port-Éther
  private readonly CONFIG = {
    salaryInterval: 10 * 60 * 1000,  // Salaire toutes les 10 minutes en service
    taxRate: 0.15,                    // 15% taxe sur les transactions légales
    blackMoneyRate: 0.70,             // 70% de valeur pour le blanchiment
    startingCash: 500,
    startingBank: 2500,
    maxCashCarry: 50000,              // Max cash en main
    maxBankBalance: 10_000_000,
  };

  static getInstance(): EconomyEngine {
    if (!EconomyEngine.instance) EconomyEngine.instance = new EconomyEngine();
    return EconomyEngine.instance;
  }

  // ─── Comptes bancaires ────────────────────────────────────────────────────

  createAccount(playerId: string, playerName: string): BankAccount {
    const accountNumber = this.generateAccountNumber();
    const account: BankAccount = {
      ownerId: playerId,
      ownerName: playerName,
      accountNumber,
      balance: this.CONFIG.startingBank,
      frozen: false,
      createdAt: Date.now(),
      transactions: [],
    };
    this.accounts.set(playerId, account);
    console.log(`🏦 [BANK] Compte créé: ${accountNumber} pour ${playerName}`);
    return account;
  }

  getAccount(playerId: string): BankAccount | undefined {
    return this.accounts.get(playerId);
  }

  getOrCreateAccount(playerId: string, playerName: string): BankAccount {
    return this.accounts.get(playerId) ?? this.createAccount(playerId, playerName);
  }

  // ─── Transactions ─────────────────────────────────────────────────────────

  transfer(
    fromId: string,
    toId: string,
    amount: number,
    type: TransactionType,
    reason: string,
    currency: 'cash' | 'bank' | 'black' = 'bank'
  ): { success: boolean; txId?: string; error?: string } {
    if (amount <= 0) return { success: false, error: 'Montant invalide' };
    if (amount > this.CONFIG.maxBankBalance) return { success: false, error: 'Montant trop élevé' };

    // Vérifier le solde expéditeur (sauf 'system' et 'bank')
    if (fromId !== 'system' && fromId !== 'bank') {
      const fromAcc = this.accounts.get(fromId);
      if (!fromAcc) return { success: false, error: 'Compte expéditeur introuvable' };
      if (fromAcc.frozen) return { success: false, error: 'Compte bloqué' };
      if (currency === 'bank' && fromAcc.balance < amount) {
        return { success: false, error: `Fonds insuffisants (${fromAcc.balance}$ disponibles)` };
      }

      // Débiter
      if (currency === 'bank') fromAcc.balance -= amount;
    }

    // Créditer destinataire
    if (toId !== 'system' && toId !== 'bank') {
      const toAcc = this.getOrCreateAccount(toId, toId);
      if (currency === 'bank') toAcc.balance = Math.min(this.CONFIG.maxBankBalance, toAcc.balance + amount);
    }

    // Enregistrer la transaction
    const tx = this.recordTransaction({ fromId, toId, amount, type, reason, currency });

    this.emit('transaction:completed', tx);
    return { success: true, txId: tx.id };
  }

  // ─── Salaires ─────────────────────────────────────────────────────────────

  paySalary(playerId: string, playerName: string, jobName: string, amount: number): boolean {
    const result = this.transfer('system', playerId, amount, 'salary',
      `Salaire — ${jobName}`, 'bank');

    if (result.success) {
      this.emit('salary:paid', { playerId, jobName, amount });
      console.log(`💰 [ECONOMY] Salaire ${playerName}: +$${amount} (${jobName})`);
    }
    return result.success;
  }

  // ─── Amendes ──────────────────────────────────────────────────────────────

  fine(playerId: string, amount: number, reason: string, officerId: string): boolean {
    const result = this.transfer(playerId, 'system', amount, 'fine',
      `Amende: ${reason} — Off. ${officerId}`, 'bank');

    if (result.success) {
      this.emit('fine:issued', { playerId, amount, reason, officerId });
    }
    return result.success;
  }

  // ─── Marché ───────────────────────────────────────────────────────────────

  initMarket(): void {
    const items: Omit<MarketItem, 'currentPrice'>[] = [
      { id: 'pain',         name: 'Pain',             basePrice: 5,     supply: 100, demand: 80,  illegal: false, taxRate: 0 },
      { id: 'cafe',         name: 'Café',             basePrice: 3,     supply: 80,  demand: 90,  illegal: false, taxRate: 0 },
      { id: 'biere',        name: 'Bière',            basePrice: 8,     supply: 60,  demand: 70,  illegal: false, taxRate: 0.10 },
      { id: 'cigarettes',   name: 'Cigarettes',       basePrice: 12,    supply: 50,  demand: 60,  illegal: false, taxRate: 0.15 },
      { id: 'bandage',      name: 'Bandage',          basePrice: 20,    supply: 40,  demand: 50,  illegal: false, taxRate: 0 },
      { id: 'advil',        name: 'Advil',            basePrice: 15,    supply: 45,  demand: 55,  illegal: false, taxRate: 0 },
      { id: 'outil',        name: 'Outil mécanicien', basePrice: 200,   supply: 20,  demand: 30,  illegal: false, taxRate: 0 },
      { id: 'weed',         name: 'Cannabis',         basePrice: 50,    supply: 30,  demand: 40,  illegal: true,  taxRate: 0 },
      { id: 'cocaine',      name: 'Cocaïne',          basePrice: 200,   supply: 10,  demand: 20,  illegal: true,  taxRate: 0 },
      { id: 'arme_illegale',name: 'Arme illégale',    basePrice: 5000,  supply: 5,   demand: 15,  illegal: true,  taxRate: 0 },
    ];

    for (const item of items) {
      this.market.set(item.id, {
        ...item,
        currentPrice: item.basePrice,
      });
    }
  }

  buyItem(playerId: string, itemId: string, qty: number): {
    success: boolean;
    totalPrice?: number;
    error?: string;
  } {
    const item = this.market.get(itemId);
    if (!item) return { success: false, error: 'Item introuvable' };
    if (item.supply < qty) return { success: false, error: 'Stock insuffisant' };

    const totalPrice = Math.round(item.currentPrice * qty * (1 + item.taxRate));

    const result = this.transfer(playerId, 'system', totalPrice, 'purchase',
      `Achat: ${qty}x ${item.name}`, 'bank');

    if (result.success) {
      item.supply -= qty;
      item.demand += qty * 0.1;
      this.updateMarketPrice(item);
      this.emit('market:purchase', { playerId, itemId, qty, totalPrice });
      return { success: true, totalPrice };
    }

    return { success: false, error: result.error };
  }

  private updateMarketPrice(item: MarketItem): void {
    const ratio = item.demand / Math.max(1, item.supply);
    item.currentPrice = Math.round(item.basePrice * (0.5 + ratio * 0.5));
    item.currentPrice = Math.max(item.basePrice * 0.3, Math.min(item.basePrice * 3, item.currentPrice));
  }

  // ─── Blanchiment d'argent ────────────────────────────────────────────────

  launder(playerId: string, blackAmount: number): {
    success: boolean;
    cleanAmount?: number;
    error?: string;
  } {
    const account = this.accounts.get(playerId);
    if (!account) return { success: false, error: 'Compte introuvable' };

    const cleanAmount = Math.floor(blackAmount * this.CONFIG.blackMoneyRate);

    // Enregistrer la transaction (côté serveur uniquement)
    this.recordTransaction({
      fromId: playerId,
      toId: playerId,
      amount: blackAmount,
      type: 'drug_sale',
      reason: `Blanchiment: ${blackAmount}$ → ${cleanAmount}$`,
      currency: 'black',
    });

    account.balance += cleanAmount;
    this.emit('money:laundered', { playerId, blackAmount, cleanAmount });

    return { success: true, cleanAmount };
  }

  // ─── Historique ───────────────────────────────────────────────────────────

  getPlayerTransactions(playerId: string, limit = 20): Transaction[] {
    return [...this.transactions.values()]
      .filter(t => t.fromId === playerId || t.toId === playerId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  // ─── Utilitaires ─────────────────────────────────────────────────────────

  private recordTransaction(data: Omit<Transaction, 'id' | 'timestamp'>): Transaction {
    const tx: Transaction = {
      ...data,
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    };
    this.transactions.set(tx.id, tx);
    if (this.transactions.size > 10_000) {
      const oldest = [...this.transactions.keys()][0];
      this.transactions.delete(oldest);
    }
    return tx;
  }

  private generateAccountNumber(): string {
    const part = () => Math.floor(1000 + Math.random() * 9000);
    return `PE-${part()}-${part()}-${part()}`;
  }

  // ─── Accesseurs ────────────────────────────────────────────────────────────

  getBalance(playerId: string)      { return this.accounts.get(playerId)?.balance ?? 0; }
  getMarket()                       { return Array.from(this.market.values()); }
  getMarketItem(id: string)         { return this.market.get(id); }
  getAllAccounts()                   { return Array.from(this.accounts.values()); }

  getStats() {
    const accounts = this.getAllAccounts();
    const totalMoney = accounts.reduce((sum, a) => sum + a.balance, 0);
    return {
      totalAccounts: accounts.size,
      totalMoneyInCirculation: totalMoney,
      totalTransactions: this.transactions.size,
      avgBalance: totalMoney / Math.max(1, accounts.length),
    };
  }
}

export default EconomyEngine.getInstance();