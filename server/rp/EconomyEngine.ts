/**
 * EconomyEngine v2.0.0 — Moteur économique RP ultra-complet
 * Cash · Banque · Salaires · Taxes · Marché · Crypto · Assurance · Loterie
 * Port-Éther RP — Fichier: server/rp/EconomyEngine.ts
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

export type TransactionType =
  | 'salary' | 'deposit' | 'withdraw'
  | 'transfer' | 'purchase' | 'sale'
  | 'fine' | 'tax' | 'robbery'
  | 'casino' | 'drug_sale' | 'job_reward'
  | 'property_rent' | 'vehicle_sale' | 'admin_grant'
  | 'launder' | 'loan_issue' | 'loan_repay'
  | 'insurance' | 'lottery' | 'investment'
  | 'crypto_buy' | 'crypto_sell' | 'dividend'
  | 'refund' | 'tip' | 'bounty'
  | 'tax_collect' | 'subsidy' | 'bail';

export type Currency = 'cash' | 'bank' | 'black' | 'crypto';

export type AccountStatus = 'active' | 'frozen' | 'suspended' | 'closed';

export interface Transaction {
  id: string;
  type: TransactionType;
  fromId: string;
  toId: string;
  amount: number;
  currency: Currency;
  reason: string;
  timestamp: number;
  iso: string;
  taxAmount?: number;
  fee?: number;
  metadata?: Record<string, unknown>;
  reversedBy?: string;
  reversed?: boolean;
}

export interface BankAccount {
  ownerId: string;
  ownerName: string;
  accountNumber: string;
  balance: number;
  cashBalance: number;        // Argent liquide
  blackBalance: number;        // Argent sale
  cryptoBalance: number;        // Crypto (ETH)
  status: AccountStatus;
  frozen: boolean;
  tier: 'basic' | 'premium' | 'vip';
  interestRate: number;        // Taux intérêt épargne
  creditScore: number;        // 0–100
  transactions: string[];      // IDs des 100 dernières
  loans: string[];      // IDs des prêts actifs
  insurance: boolean;
  insuranceExpiry: number | null;
  monthlyIncome: number;        // Revenus des 30 derniers jours
  monthlyExpense: number;        // Dépenses des 30 derniers jours
  createdAt: number;
  updatedAt: number;
  lastActivity: number;
}

export interface MarketItem {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  currentPrice: number;
  supply: number;
  maxSupply: number;
  demand: number;
  illegal: boolean;
  taxRate: number;
  weight: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  priceHistory: number[];
  lastRestock: number;
  restockRate: number;          // Unités/heure
}

export interface Loan {
  id: string;
  borrowerId: string;
  amount: number;
  remaining: number;
  interestRate: number;
  monthlyPay: number;
  dueAt: number;
  issuedAt: number;
  status: 'active' | 'paid' | 'defaulted' | 'overdue';
  guarantor?: string;
}

export interface Investment {
  id: string;
  ownerId: string;
  type: 'stock' | 'crypto' | 'business' | 'property';
  name: string;
  amount: number;
  currentValue: number;
  roi: number;
  purchasedAt: number;
  maturesAt?: number;
}

export interface LotteryTicket {
  id: string;
  ownerId: string;
  numbers: number[];
  purchasedAt: number;
  drawId: string;
}

export interface EconStats {
  totalAccounts: number;
  activeAccounts: number;
  totalMoneyInCirculation: number;
  totalBlackMoney: number;
  totalCrypto: number;
  totalTransactions: number;
  totalLoans: number;
  totalLoanAmount: number;
  avgBalance: number;
  wealthGini: number;       // Coefficient d'inégalité
  inflation: number;       // % variation prix moyen
  gdp: number;       // Total transactions/heure
  transactionsPerHour: number;
  topEarners: Array<{ id: string; balance: number }>;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  startingCash: 500,
  startingBank: 2_500,
  maxCashCarry: 50_000,
  maxBankBalance: 100_000_000,
  maxTransferAmount: 1_000_000,
  taxRate: 0.15,
  blackMoneyRate: 0.60,           // 60% valeur au blanchiment
  cryptoVolatility: 0.05,           // ±5% / tick
  cryptoBasePrice: 1_000,          // 1 ETH = 1000$
  loanMaxMultiplier: 5,              // Max 5× le solde bancaire
  loanMinCreditScore: 30,
  loanInterestBase: 0.08,           // 8% base
  interestRateBasic: 0.01,           // 1% épargne/mois basic
  interestRatePremium: 0.02,           // 2% épargne/mois premium
  interestRateVIP: 0.04,           // 4% épargne/mois VIP
  feeTransferPct: 0.005,          // 0.5% frais virement
  feeMinimum: 1,
  maxTransactions: 50_000,
  maxAccountHistory: 100,
  marketTickInterval: 5 * 60_000,     // Fluctuation marché /5min
  interestInterval: 60 * 60_000,    // Intérêts /heure
  lotteryInterval: 60 * 60_000,    // Tirage loterie /heure
  lotteryTicketPrice: 50,
  lotteryJackpotBase: 10_000,
  taxCollectInterval: 10 * 60_000,    // Collecte taxes /10min
  restockInterval: 30 * 60_000,    // Restock marché /30min
  vipBalanceThreshold: 1_000_000,
  premiumBalanceThreshold: 100_000,
  maxLoanDuration: 30 * 24 * 60 * 60_000, // 30 jours
  insuranceCost: 500,
  insuranceDuration: 7 * 24 * 60 * 60_000,  // 7 jours
  insuranceCoverage: 0.8,            // 80% remboursement
  bountyMinAmount: 100,
  maxInvestments: 10,
};

// ══════════════════════════════════════════════════════════════════════════════
// ECONOMY ENGINE v2.0.0
// ══════════════════════════════════════════════════════════════════════════════

export class EconomyEngine extends EventEmitter {
  private static instance: EconomyEngine;

  // ── Stockages ──────────────────────────────────────────────────────────────
  private accounts = new Map<string, BankAccount>();
  private transactions = new Map<string, Transaction>();
  private market = new Map<string, MarketItem>();
  private loans = new Map<string, Loan>();
  private investments = new Map<string, Investment>();
  private lotteryPool = new Map<string, LotteryTicket>();
  private bounties = new Map<string, { targetId: string; amount: number; issuedBy: string; reason: string; createdAt: number }>();
  private blacklist = new Set<string>();  // Comptes bannis

  // ── État interne ───────────────────────────────────────────────────────────
  private cryptoPrice = CONFIG.cryptoBasePrice;
  private lotteryJackpot = CONFIG.lotteryJackpotBase;
  private currentLotteryId = `draw_${Date.now()}`;
  private totalTaxCollected = 0;
  private totalFinesIssued = 0;
  private priceHistory: number[] = [CONFIG.cryptoBasePrice];

  // ── Timers ────────────────────────────────────────────────────────────────
  private timers: ReturnType<typeof setInterval>[] = [];

  // ══════════════════════════════════════════════════════════════════════════
  static getInstance(): EconomyEngine {
    if (!EconomyEngine.instance) EconomyEngine.instance = new EconomyEngine();
    return EconomyEngine.instance;
  }

  constructor() {
    super();
    this.setMaxListeners(50);
    this.initMarket();
    this.startTimers();
    console.log('💰 [ECONOMY] EconomyEngine v2.0.0 initialisé');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TIMERS INTERNES
  // ══════════════════════════════════════════════════════════════════════════

  private startTimers(): void {
    // Fluctuation marché
    this.timers.push(setInterval(() => this.tickMarket(), CONFIG.marketTickInterval));
    // Intérêts épargne
    this.timers.push(setInterval(() => this.payInterests(), CONFIG.interestInterval));
    // Tirage loterie
    this.timers.push(setInterval(() => this.drawLottery(), CONFIG.lotteryInterval));
    // Restock marché
    this.timers.push(setInterval(() => this.restockMarket(), CONFIG.restockInterval));
    // Vérification prêts
    this.timers.push(setInterval(() => this.checkLoans(), 60 * 60_000));

    for (const t of this.timers) {
      if ('unref' in t) (t as NodeJS.Timeout).unref();
    }
  }

  destroy(): void {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    this.removeAllListeners();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COMPTES BANCAIRES
  // ══════════════════════════════════════════════════════════════════════════

  createAccount(playerId: string, playerName: string, options: { startingCash?: number; startingBank?: number } = {}): BankAccount {
    if (this.accounts.has(playerId)) {
      return this.accounts.get(playerId)!;
    }

    const account: BankAccount = {
      ownerId: playerId,
      ownerName: playerName,
      accountNumber: this.generateAccountNumber(),
      balance: options.startingBank ?? CONFIG.startingBank,
      cashBalance: options.startingCash ?? CONFIG.startingCash,
      blackBalance: 0,
      cryptoBalance: 0,
      status: 'active',
      frozen: false,
      tier: 'basic',
      interestRate: CONFIG.interestRateBasic,
      creditScore: 50,
      transactions: [],
      loans: [],
      insurance: false,
      insuranceExpiry: null,
      monthlyIncome: 0,
      monthlyExpense: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.accounts.set(playerId, account);
    this.emit('account:created', { playerId, playerName, accountNumber: account.accountNumber });
    console.log(`🏦 [BANK] Compte créé: ${account.accountNumber} — ${playerName}`);
    return account;
  }

  getAccount(playerId: string): BankAccount | undefined {
    return this.accounts.get(playerId);
  }

  getOrCreateAccount(playerId: string, playerName: string): BankAccount {
    return this.accounts.get(playerId) ?? this.createAccount(playerId, playerName);
  }

  closeAccount(playerId: string): { ok: boolean; error?: string } {
    const account = this.accounts.get(playerId);
    if (!account) return { ok: false, error: 'Compte introuvable' };
    if (account.balance > 0) return { ok: false, error: 'Solde doit être à 0 avant fermeture' };
    account.status = 'closed';
    this.emit('account:closed', { playerId });
    return { ok: true };
  }

  freezeAccount(playerId: string, reason = 'Suspicious activity'): boolean {
    const account = this.accounts.get(playerId);
    if (!account) return false;
    account.frozen = true;
    account.status = 'frozen';
    this.emit('account:frozen', { playerId, reason });
    console.warn(`🔒 [BANK] Compte gelé: ${playerId} — ${reason}`);
    return true;
  }

  unfreezeAccount(playerId: string): boolean {
    const account = this.accounts.get(playerId);
    if (!account) return false;
    account.frozen = false;
    account.status = 'active';
    this.emit('account:unfrozen', { playerId });
    return true;
  }

  upgradeAccountTier(playerId: string): void {
    const account = this.accounts.get(playerId);
    if (!account) return;

    const prev = account.tier;
    if (account.balance >= CONFIG.vipBalanceThreshold) {
      account.tier = 'vip';
      account.interestRate = CONFIG.interestRateVIP;
    } else if (account.balance >= CONFIG.premiumBalanceThreshold) {
      account.tier = 'premium';
      account.interestRate = CONFIG.interestRatePremium;
    } else {
      account.tier = 'basic';
      account.interestRate = CONFIG.interestRateBasic;
    }

    if (prev !== account.tier) {
      this.emit('account:tierChanged', { playerId, from: prev, to: account.tier });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TRANSACTIONS
  // ══════════════════════════════════════════════════════════════════════════

  transfer(
    fromId: string,
    toId: string,
    amount: number,
    type: TransactionType,
    reason: string,
    currency: Currency = 'bank',
    metadata: Record<string, unknown> = {}
  ): { success: boolean; txId?: string; netAmount?: number; fee?: number; tax?: number; error?: string } {

    // ── Validation ──────────────────────────────────────────────────────────
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: 'Montant invalide' };
    }
    if (amount > CONFIG.maxBankBalance) {
      return { success: false, error: 'Montant trop élevé' };
    }
    if (fromId === toId && fromId !== 'system') {
      return { success: false, error: 'Auto-transfert interdit' };
    }
    if (this.blacklist.has(fromId)) {
      return { success: false, error: 'Compte banni' };
    }

    const isSystemSource = fromId === 'system' || fromId === 'bank';
    const isSystemDest = toId === 'system' || toId === 'bank';

    // ── Calcul frais & taxes ─────────────────────────────────────────────────
    let fee = 0, taxAmount = 0;

    if (!isSystemSource && !isSystemDest && currency === 'bank') {
      fee = Math.max(CONFIG.feeMinimum, Math.floor(amount * CONFIG.feeTransferPct));
    }

    const illegalTypes: TransactionType[] = ['drug_sale', 'robbery', 'launder'];
    if (!illegalTypes.includes(type) && !isSystemSource && currency === 'bank') {
      taxAmount = Math.floor(amount * CONFIG.taxRate);
      this.totalTaxCollected += taxAmount;
    }

    const totalDebit = amount + fee + taxAmount;

    // ── Débit expéditeur ─────────────────────────────────────────────────────
    if (!isSystemSource) {
      const fromAcc = this.accounts.get(fromId);
      if (!fromAcc) return { success: false, error: 'Compte expéditeur introuvable' };
      if (fromAcc.frozen) return { success: false, error: 'Compte gelé' };
      if (fromAcc.status === 'closed') return { success: false, error: 'Compte fermé' };

      const balance = currency === 'bank' ? fromAcc.balance
        : currency === 'cash' ? fromAcc.cashBalance
          : currency === 'black' ? fromAcc.blackBalance
            : fromAcc.cryptoBalance;

      if (balance < totalDebit) {
        return { success: false, error: `Fonds insuffisants (${balance.toFixed(2)}$ dispo, besoin: ${totalDebit}$)` };
      }

      if (currency === 'bank') {
        fromAcc.balance -= totalDebit;
        fromAcc.monthlyExpense += amount;
      } else if (currency === 'cash') {
        fromAcc.cashBalance -= totalDebit;
      } else if (currency === 'black') {
        fromAcc.blackBalance -= totalDebit;
      } else if (currency === 'crypto') {
        fromAcc.cryptoBalance -= totalDebit;
      }

      fromAcc.updatedAt = Date.now();
      fromAcc.lastActivity = Date.now();
      this.upgradeAccountTier(fromId);
    }

    // ── Crédit destinataire ───────────────────────────────────────────────────
    if (!isSystemDest) {
      const toAcc = this.getOrCreateAccount(toId, toId);
      if (toAcc.frozen) return { success: false, error: 'Compte destinataire gelé' };
      if (toAcc.status === 'closed') return { success: false, error: 'Compte destinataire fermé' };

      const netAmount = amount; // Avant taxe (taxe prise à l'envoi)
      const maxBal = CONFIG.maxBankBalance;

      if (currency === 'bank') {
        toAcc.balance = Math.min(maxBal, toAcc.balance + netAmount);
        toAcc.monthlyIncome += netAmount;
      } else if (currency === 'cash') {
        toAcc.cashBalance = Math.min(CONFIG.maxCashCarry, toAcc.cashBalance + netAmount);
      } else if (currency === 'black') {
        toAcc.blackBalance += netAmount;
      } else if (currency === 'crypto') {
        toAcc.cryptoBalance += netAmount;
      }

      toAcc.updatedAt = Date.now();
      toAcc.lastActivity = Date.now();
      this.upgradeAccountTier(toId);
    }

    // ── Enregistrement ───────────────────────────────────────────────────────
    const tx = this.recordTransaction({
      fromId, toId, amount, type, reason, currency,
      taxAmount, fee, metadata,
    });

    this.emit('transaction:completed', tx);
    return { success: true, txId: tx.id, netAmount: amount, fee, tax: taxAmount };
  }

  // Annuler une transaction (remboursement)
  reverseTransaction(txId: string, reason = 'Refund'): { ok: boolean; error?: string } {
    const tx = this.transactions.get(txId);
    if (!tx) return { ok: false, error: 'Transaction introuvable' };
    if (tx.reversed) return { ok: false, error: 'Déjà annulée' };

    const result = this.transfer(
      tx.toId, tx.fromId, tx.amount, 'refund',
      `Annulation: ${reason} (ref: ${txId})`, tx.currency
    );

    if (result.success) {
      tx.reversed = true;
      tx.reversedBy = result.txId;
      this.emit('transaction:reversed', { txId, reason });
    }

    return { ok: result.success, error: result.error };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CASH
  // ══════════════════════════════════════════════════════════════════════════

  depositCash(playerId: string, amount: number): { success: boolean; error?: string } {
    const account = this.accounts.get(playerId);
    if (!account) return { success: false, error: 'Compte introuvable' };
    if (account.cashBalance < amount) return { success: false, error: 'Cash insuffisant' };
    if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: 'Montant invalide' };

    account.cashBalance -= amount;
    account.balance = Math.min(CONFIG.maxBankBalance, account.balance + amount);
    account.updatedAt = Date.now();

    this.recordTransaction({ fromId: playerId, toId: playerId, amount, type: 'deposit', reason: 'Dépôt cash → banque', currency: 'cash' });
    this.emit('cash:deposited', { playerId, amount });
    return { success: true };
  }

  withdrawCash(playerId: string, amount: number): { success: boolean; error?: string } {
    const account = this.accounts.get(playerId);
    if (!account) return { success: false, error: 'Compte introuvable' };
    if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: 'Montant invalide' };
    if (account.balance < amount) return { success: false, error: 'Solde insuffisant' };
    if (account.cashBalance + amount > CONFIG.maxCashCarry) {
      return { success: false, error: `Maximum cash en main: ${CONFIG.maxCashCarry}$` };
    }

    account.balance -= amount;
    account.cashBalance += amount;
    account.updatedAt = Date.now();

    this.recordTransaction({ fromId: playerId, toId: playerId, amount, type: 'withdraw', reason: 'Retrait banque → cash', currency: 'bank' });
    this.emit('cash:withdrawn', { playerId, amount });
    return { success: true };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SALAIRES & AMENDES
  // ══════════════════════════════════════════════════════════════════════════

  paySalary(playerId: string, playerName: string, jobName: string, amount: number): boolean {
    const result = this.transfer('system', playerId, amount, 'salary', `Salaire — ${jobName}`, 'bank');
    if (result.success) {
      this.emit('salary:paid', { playerId, jobName, amount });
      console.log(`💰 [ECONOMY] Salaire ${playerName}: +$${amount} (${jobName})`);
    }
    return result.success;
  }

  fine(playerId: string, amount: number, reason: string, officerId: string): { success: boolean; error?: string } {
    const result = this.transfer(playerId, 'system', amount, 'fine', `Amende: ${reason} — Off.${officerId}`, 'bank');
    if (result.success) {
      this.totalFinesIssued += amount;
      this.emit('fine:issued', { playerId, amount, reason, officerId });
    }
    return result;
  }

  paySubsidy(playerId: string, amount: number, reason: string): boolean {
    const result = this.transfer('system', playerId, amount, 'subsidy', `Subvention: ${reason}`, 'bank');
    return result.success;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRÊTS
  // ══════════════════════════════════════════════════════════════════════════

  requestLoan(
    playerId: string,
    amount: number,
    durationMs: number = CONFIG.maxLoanDuration,
    guarantor?: string
  ): { success: boolean; loan?: Loan; error?: string } {
    const account = this.accounts.get(playerId);
    if (!account) return { success: false, error: 'Compte introuvable' };
    if (account.creditScore < CONFIG.loanMinCreditScore) {
      return { success: false, error: `Score de crédit insuffisant (${account.creditScore}/100, min ${CONFIG.loanMinCreditScore})` };
    }

    const maxLoan = account.balance * CONFIG.loanMaxMultiplier;
    if (amount > maxLoan) {
      return { success: false, error: `Montant max empruntable: $${maxLoan.toFixed(0)}` };
    }

    const activeLoans = account.loans
      .map(id => this.loans.get(id))
      .filter(l => l?.status === 'active');
    if (activeLoans.length >= 3) {
      return { success: false, error: 'Maximum 3 prêts actifs simultanés' };
    }

    const interestRate = CONFIG.loanInterestBase + (1 - account.creditScore / 100) * 0.12;
    const totalRepay = amount * (1 + interestRate);
    const monthlyPay = totalRepay / (durationMs / (30 * 24 * 60 * 60_000));

    const loan: Loan = {
      id: `loan_${randomUUID().slice(0, 8)}`,
      borrowerId: playerId,
      amount,
      remaining: totalRepay,
      interestRate,
      monthlyPay,
      dueAt: Date.now() + durationMs,
      issuedAt: Date.now(),
      status: 'active',
      guarantor,
    };

    this.loans.set(loan.id, loan);
    account.loans.push(loan.id);
    account.creditScore = Math.max(0, account.creditScore - 5);

    // Verser le montant
    const result = this.transfer('system', playerId, amount, 'loan_issue', `Prêt: ${loan.id}`, 'bank');
    if (!result.success) {
      this.loans.delete(loan.id);
      return { success: false, error: result.error };
    }

    this.emit('loan:issued', { playerId, loan });
    return { success: true, loan };
  }

  repayLoan(playerId: string, loanId: string, amount: number): { success: boolean; error?: string } {
    const loan = this.loans.get(loanId);
    if (!loan || loan.borrowerId !== playerId) return { success: false, error: 'Prêt introuvable' };
    if (loan.status !== 'active') return { success: false, error: `Prêt non actif (${loan.status})` };

    const payment = Math.min(amount, loan.remaining);
    const result = this.transfer(playerId, 'system', payment, 'loan_repay', `Remboursement prêt: ${loanId}`, 'bank');

    if (!result.success) return result;

    loan.remaining -= payment;
    if (loan.remaining <= 0) {
      loan.status = 'paid';
      const account = this.accounts.get(playerId);
      if (account) account.creditScore = Math.min(100, account.creditScore + 10);
      this.emit('loan:paid', { playerId, loanId });
    }

    return { success: true };
  }

  private checkLoans(): void {
    const now = Date.now();
    for (const loan of this.loans.values()) {
      if (loan.status !== 'active') continue;
      if (now > loan.dueAt) {
        loan.status = 'overdue';
        const account = this.accounts.get(loan.borrowerId);
        if (account) {
          account.creditScore = Math.max(0, account.creditScore - 20);
          this.freezeAccount(loan.borrowerId, 'Prêt en défaut');
        }
        this.emit('loan:defaulted', { borrowerId: loan.borrowerId, loan });
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MARCHÉ
  // ══════════════════════════════════════════════════════════════════════════

  initMarket(): void {
    const items: Omit<MarketItem, 'currentPrice' | 'priceHistory' | 'lastRestock'>[] = [
      // Alimentaire
      { id: 'pain', name: 'Pain', category: 'food', basePrice: 5, supply: 100, maxSupply: 200, demand: 80, illegal: false, taxRate: 0, weight: 0.5, rarity: 'common', restockRate: 20 },
      { id: 'cafe', name: 'Café', category: 'food', basePrice: 3, supply: 80, maxSupply: 150, demand: 90, illegal: false, taxRate: 0, weight: 0.2, rarity: 'common', restockRate: 15 },
      { id: 'biere', name: 'Bière', category: 'alcohol', basePrice: 8, supply: 60, maxSupply: 120, demand: 70, illegal: false, taxRate: 0.10, weight: 0.5, rarity: 'common', restockRate: 10 },
      { id: 'whisky', name: 'Whisky', category: 'alcohol', basePrice: 80, supply: 20, maxSupply: 60, demand: 40, illegal: false, taxRate: 0.20, weight: 0.7, rarity: 'uncommon', restockRate: 3 },
      // Médical
      { id: 'bandage', name: 'Bandage', category: 'medical', basePrice: 20, supply: 40, maxSupply: 100, demand: 50, illegal: false, taxRate: 0, weight: 0.1, rarity: 'common', restockRate: 8 },
      { id: 'advil', name: 'Advil', category: 'medical', basePrice: 15, supply: 45, maxSupply: 100, demand: 55, illegal: false, taxRate: 0, weight: 0.1, rarity: 'common', restockRate: 8 },
      { id: 'seringue', name: 'Seringue médicale', category: 'medical', basePrice: 50, supply: 20, maxSupply: 60, demand: 25, illegal: false, taxRate: 0, weight: 0.1, rarity: 'uncommon', restockRate: 4 },
      // Outils
      { id: 'outil', name: 'Outil mécanicien', category: 'tool', basePrice: 200, supply: 20, maxSupply: 50, demand: 30, illegal: false, taxRate: 0, weight: 2.0, rarity: 'uncommon', restockRate: 2 },
      { id: 'lockpick', name: 'Crochet', category: 'tool', basePrice: 500, supply: 10, maxSupply: 30, demand: 20, illegal: true, taxRate: 0, weight: 0.1, rarity: 'rare', restockRate: 1 },
      // Armes légales
      { id: 'arme_legale', name: 'Pistolet légal', category: 'weapon', basePrice: 2000, supply: 10, maxSupply: 30, demand: 15, illegal: false, taxRate: 0.20, weight: 1.0, rarity: 'rare', restockRate: 1 },
      // Drogues
      { id: 'cigarettes', name: 'Cigarettes', category: 'drug', basePrice: 12, supply: 50, maxSupply: 150, demand: 60, illegal: false, taxRate: 0.15, weight: 0.2, rarity: 'common', restockRate: 10 },
      { id: 'weed', name: 'Cannabis', category: 'drug', basePrice: 50, supply: 30, maxSupply: 80, demand: 40, illegal: true, taxRate: 0, weight: 0.1, rarity: 'uncommon', restockRate: 5 },
      { id: 'cocaine', name: 'Cocaïne', category: 'drug', basePrice: 200, supply: 10, maxSupply: 30, demand: 20, illegal: true, taxRate: 0, weight: 0.1, rarity: 'rare', restockRate: 2 },
      { id: 'heroine', name: 'Héroïne', category: 'drug', basePrice: 500, supply: 5, maxSupply: 15, demand: 10, illegal: true, taxRate: 0, weight: 0.1, rarity: 'epic', restockRate: 1 },
      // Armes illégales
      { id: 'arme_illegale', name: 'Arme illégale', category: 'weapon', basePrice: 5000, supply: 5, maxSupply: 15, demand: 15, illegal: true, taxRate: 0, weight: 2.0, rarity: 'epic', restockRate: 0.5 },
      { id: 'explosive', name: 'Explosif', category: 'weapon', basePrice: 15000, supply: 2, maxSupply: 5, demand: 5, illegal: true, taxRate: 0, weight: 3.0, rarity: 'legendary', restockRate: 0.2 },
      // Véhicules
      { id: 'scooter', name: 'Scooter', category: 'vehicle', basePrice: 5000, supply: 5, maxSupply: 15, demand: 10, illegal: false, taxRate: 0.10, weight: 0, rarity: 'uncommon', restockRate: 0.5 },
      { id: 'sedan', name: 'Voiture', category: 'vehicle', basePrice: 25000, supply: 3, maxSupply: 10, demand: 8, illegal: false, taxRate: 0.15, weight: 0, rarity: 'rare', restockRate: 0.2 },
    ];

    for (const item of items) {
      this.market.set(item.id, {
        ...item,
        currentPrice: item.basePrice,
        priceHistory: [item.basePrice],
        lastRestock: Date.now(),
      });
    }

    console.log(`🏪 [MARKET] ${this.market.size} items initialisés`);
  }

  buyItem(
    playerId: string,
    itemId: string,
    qty: number,
    currency: Currency = 'bank'
  ): { success: boolean; totalPrice?: number; taxPaid?: number; error?: string } {
    const item = this.market.get(itemId);
    if (!item) return { success: false, error: 'Item introuvable' };
    if (item.supply < qty) return { success: false, error: `Stock insuffisant (${item.supply} dispo)` };
    if (qty <= 0 || qty > 100) return { success: false, error: 'Quantité invalide (1–100)' };

    const baseTotal = Math.round(item.currentPrice * qty);
    const taxPaid = item.illegal ? 0 : Math.round(baseTotal * item.taxRate);
    const totalPrice = baseTotal + taxPaid;

    const result = this.transfer(
      playerId, 'system', totalPrice, 'purchase',
      `Achat: ${qty}x ${item.name}`, currency
    );

    if (!result.success) return { success: false, error: result.error };

    item.supply = Math.max(0, item.supply - qty);
    item.demand += qty * 0.1;
    this.updateMarketPrice(item);
    this.emit('market:purchase', { playerId, itemId, qty, totalPrice, taxPaid });

    return { success: true, totalPrice, taxPaid };
  }

  sellItem(
    playerId: string,
    itemId: string,
    qty: number,
    quality: number = 1.0   // 0.5–1.5 selon état
  ): { success: boolean; earned?: number; error?: string } {
    const item = this.market.get(itemId);
    if (!item) return { success: false, error: 'Item introuvable' };

    const salePrice = Math.round(item.currentPrice * qty * Math.min(1.5, Math.max(0.3, quality)) * 0.85);

    const result = this.transfer(
      'system', playerId, salePrice, 'sale',
      `Vente: ${qty}x ${item.name}`, item.illegal ? 'black' : 'bank'
    );

    if (!result.success) return { success: false, error: result.error };

    item.supply += qty;
    item.demand = Math.max(0, item.demand - qty * 0.05);
    this.updateMarketPrice(item);
    this.emit('market:sale', { playerId, itemId, qty, salePrice });

    return { success: true, earned: salePrice };
  }

  private updateMarketPrice(item: MarketItem): void {
    const ratio = item.demand / Math.max(1, item.supply);
    const newPrice = Math.round(item.basePrice * (0.5 + ratio * 0.5));
    item.currentPrice = Math.max(
      Math.round(item.basePrice * 0.3),
      Math.min(Math.round(item.basePrice * 3), newPrice)
    );
    item.priceHistory.push(item.currentPrice);
    if (item.priceHistory.length > 50) item.priceHistory.shift();
  }

  private tickMarket(): void {
    for (const item of this.market.values()) {
      // Fluctuation aléatoire ±5%
      const fluctuation = 1 + (Math.random() - 0.5) * 0.10;
      item.currentPrice = Math.max(
        Math.round(item.basePrice * 0.3),
        Math.round(item.currentPrice * fluctuation)
      );
      // Decay demand naturelle
      item.demand = Math.max(0, item.demand * 0.95);
      item.priceHistory.push(item.currentPrice);
      if (item.priceHistory.length > 50) item.priceHistory.shift();
    }
    this.emit('market:tick', { ts: Date.now() });
  }

  private restockMarket(): void {
    let restocked = 0;
    for (const item of this.market.values()) {
      const hours = (Date.now() - item.lastRestock) / 3_600_000;
      const newStock = Math.floor(item.restockRate * hours);
      item.supply = Math.min(item.maxSupply, item.supply + newStock);
      item.lastRestock = Date.now();
      if (newStock > 0) restocked++;
    }
    if (restocked > 0) this.emit('market:restocked', { count: restocked });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CRYPTO
  // ══════════════════════════════════════════════════════════════════════════

  getCryptoPrice(): number { return this.cryptoPrice; }

  buyCrypto(playerId: string, ethAmount: number): { success: boolean; cost?: number; error?: string } {
    const cost = Math.round(ethAmount * this.cryptoPrice);
    const result = this.transfer(playerId, 'system', cost, 'crypto_buy', `Achat ${ethAmount} ETH`, 'bank');
    if (!result.success) return { success: false, error: result.error };

    const account = this.accounts.get(playerId);
    if (account) account.cryptoBalance += ethAmount;

    this.emit('crypto:bought', { playerId, ethAmount, cost });
    return { success: true, cost };
  }

  sellCrypto(playerId: string, ethAmount: number): { success: boolean; earned?: number; error?: string } {
    const account = this.accounts.get(playerId);
    if (!account || account.cryptoBalance < ethAmount) {
      return { success: false, error: 'Crypto insuffisante' };
    }

    const earned = Math.round(ethAmount * this.cryptoPrice * 0.98); // 2% spread
    account.cryptoBalance -= ethAmount;

    const result = this.transfer('system', playerId, earned, 'crypto_sell', `Vente ${ethAmount} ETH`, 'bank');
    if (!result.success) {
      account.cryptoBalance += ethAmount;
      return { success: false, error: result.error };
    }

    this.emit('crypto:sold', { playerId, ethAmount, earned });
    return { success: true, earned };
  }

  private tickCrypto(): void {
    const change = 1 + (Math.random() - 0.5) * CONFIG.cryptoVolatility * 2;
    this.cryptoPrice = Math.max(100, Math.round(this.cryptoPrice * change));
    this.priceHistory.push(this.cryptoPrice);
    if (this.priceHistory.length > 1000) this.priceHistory.shift();
    this.emit('crypto:priceUpdate', { price: this.cryptoPrice });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BLANCHIMENT
  // ══════════════════════════════════════════════════════════════════════════

  launder(playerId: string, blackAmount: number): { success: boolean; cleanAmount?: number; fee?: number; error?: string } {
    const account = this.accounts.get(playerId);
    if (!account) return { success: false, error: 'Compte introuvable' };
    if (account.blackBalance < blackAmount) return { success: false, error: 'Argent sale insuffisant' };
    if (blackAmount <= 0) return { success: false, error: 'Montant invalide' };

    const cleanAmount = Math.floor(blackAmount * CONFIG.blackMoneyRate);
    const fee = blackAmount - cleanAmount;

    account.blackBalance -= blackAmount;
    account.balance = Math.min(CONFIG.maxBankBalance, account.balance + cleanAmount);

    this.recordTransaction({
      fromId: playerId, toId: playerId, amount: blackAmount, type: 'launder',
      reason: `Blanchiment: $${blackAmount} → $${cleanAmount} (frais: $${fee})`,
      currency: 'black',
    });

    this.emit('money:laundered', { playerId, blackAmount, cleanAmount, fee });
    return { success: true, cleanAmount, fee };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VOL & BRAQUAGE
  // ══════════════════════════════════════════════════════════════════════════

  rob(roberId: string, victimId: string, maxAmount: number): { success: boolean; stolen?: number; error?: string } {
    const victim = this.accounts.get(victimId);
    if (!victim) return { success: false, error: 'Victime introuvable' };

    // Voler du cash uniquement
    const stolen = Math.min(victim.cashBalance, maxAmount, Math.floor(Math.random() * maxAmount));
    if (stolen <= 0) return { success: false, error: 'Victime sans cash' };

    victim.cashBalance -= stolen;
    const rober = this.getOrCreateAccount(roberId, roberId);
    rober.blackBalance += stolen;  // Argent sale

    this.recordTransaction({
      fromId: victimId, toId: roberId, amount: stolen, type: 'robbery',
      reason: `Vol par ${roberId}`, currency: 'cash',
    });

    this.emit('robbery:committed', { roberId, victimId, amount: stolen });

    // Insurance remboursement
    if (victim.insurance && victim.insuranceExpiry && Date.now() < victim.insuranceExpiry) {
      const reimb = Math.floor(stolen * CONFIG.insuranceCoverage);
      this.transfer('system', victimId, reimb, 'insurance', 'Remboursement assurance vol', 'bank');
    }

    return { success: true, stolen };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ASSURANCE
  // ══════════════════════════════════════════════════════════════════════════

  buyInsurance(playerId: string): { success: boolean; error?: string } {
    const account = this.accounts.get(playerId);
    if (!account) return { success: false, error: 'Compte introuvable' };
    if (account.insurance && account.insuranceExpiry && Date.now() < account.insuranceExpiry) {
      return { success: false, error: 'Assurance déjà active' };
    }

    const result = this.transfer(playerId, 'system', CONFIG.insuranceCost, 'insurance', 'Achat assurance', 'bank');
    if (!result.success) return result;

    account.insurance = true;
    account.insuranceExpiry = Date.now() + CONFIG.insuranceDuration;
    this.emit('insurance:bought', { playerId, expiry: account.insuranceExpiry });
    return { success: true };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LOTERIE
  // ══════════════════════════════════════════════════════════════════════════

  buyLotteryTicket(playerId: string): { success: boolean; ticket?: LotteryTicket; error?: string } {
    const result = this.transfer(playerId, 'system', CONFIG.lotteryTicketPrice, 'lottery', 'Ticket loterie', 'bank');
    if (!result.success) return { success: false, error: result.error };

    this.lotteryJackpot += CONFIG.lotteryTicketPrice * 0.7;

    const ticket: LotteryTicket = {
      id: `ticket_${randomUUID().slice(0, 8)}`,
      ownerId: playerId,
      numbers: this.generateLotteryNumbers(),
      purchasedAt: Date.now(),
      drawId: this.currentLotteryId,
    };

    this.lotteryPool.set(ticket.id, ticket);
    this.emit('lottery:ticket', { playerId, ticket });
    return { success: true, ticket };
  }

  private drawLottery(): void {
    const tickets = [...this.lotteryPool.values()].filter(t => t.drawId === this.currentLotteryId);
    if (tickets.length === 0) return;

    const winning = this.generateLotteryNumbers();
    const winners = tickets.filter(t => this.countMatches(t.numbers, winning) >= 4);

    if (winners.length > 0) {
      const share = Math.floor(this.lotteryJackpot / winners.length);
      for (const ticket of winners) {
        this.transfer('system', ticket.ownerId, share, 'lottery', `Gain loterie: ${share}$`, 'bank');
        this.emit('lottery:win', { playerId: ticket.ownerId, amount: share, ticket });
      }
      this.lotteryJackpot = CONFIG.lotteryJackpotBase;
    } else {
      this.lotteryJackpot = Math.min(this.lotteryJackpot * 1.1, 10_000_000);
    }

    // Nettoyer et nouveau tirage
    for (const t of tickets) this.lotteryPool.delete(t.id);
    this.currentLotteryId = `draw_${Date.now()}`;
    this.emit('lottery:draw', { winning, winners: winners.length, jackpot: this.lotteryJackpot });
  }

  private generateLotteryNumbers(): number[] {
    const nums = new Set<number>();
    while (nums.size < 5) nums.add(Math.floor(1 + Math.random() * 49));
    return [...nums].sort((a, b) => a - b);
  }

  private countMatches(a: number[], b: number[]): number {
    return a.filter(n => b.includes(n)).length;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BOUNTIES
  // ══════════════════════════════════════════════════════════════════════════

  placeBounty(issuedBy: string, targetId: string, amount: number, reason: string): { success: boolean; bountyId?: string; error?: string } {
    if (amount < CONFIG.bountyMinAmount) return { success: false, error: `Minimum: $${CONFIG.bountyMinAmount}` };

    const result = this.transfer(issuedBy, 'system', amount, 'fine', `Bounty sur ${targetId}`, 'bank');
    if (!result.success) return result;

    const bountyId = `bounty_${randomUUID().slice(0, 8)}`;
    this.bounties.set(bountyId, { targetId, amount, issuedBy, reason, createdAt: Date.now() });
    this.emit('bounty:placed', { bountyId, issuedBy, targetId, amount });
    return { success: true, bountyId };
  }

  claimBounty(claimerId: string, bountyId: string): { success: boolean; earned?: number; error?: string } {
    const bounty = this.bounties.get(bountyId);
    if (!bounty) return { success: false, error: 'Bounty introuvable' };

    this.transfer('system', claimerId, bounty.amount, 'bounty', `Bounty réclamé: ${bountyId}`, 'bank');
    this.bounties.delete(bountyId);
    this.emit('bounty:claimed', { bountyId, claimerId, amount: bounty.amount });
    return { success: true, earned: bounty.amount };
  }

  getBounties() { return [...this.bounties.entries()].map(([id, b]) => ({ id, ...b })); }

  // ══════════════════════════════════════════════════════════════════════════
  // INTÉRÊTS ÉPARGNE
  // ══════════════════════════════════════════════════════════════════════════

  private payInterests(): void {
    let paid = 0;
    for (const account of this.accounts.values()) {
      if (account.balance < 1000 || account.frozen) continue;
      const interest = Math.floor(account.balance * account.interestRate / 12);
      if (interest <= 0) continue;

      account.balance = Math.min(CONFIG.maxBankBalance, account.balance + interest);
      this.recordTransaction({
        fromId: 'system', toId: account.ownerId, amount: interest,
        type: 'dividend', reason: `Intérêts épargne (${(account.interestRate * 100).toFixed(1)}%)`,
        currency: 'bank',
      });
      paid++;
    }
    if (paid > 0) this.emit('interests:paid', { count: paid });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HISTORIQUE & ACCESSEURS
  // ══════════════════════════════════════════════════════════════════════════

  getPlayerTransactions(playerId: string, limit = 20): Transaction[] {
    return [...this.transactions.values()]
      .filter(t => t.fromId === playerId || t.toId === playerId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, Math.min(limit, 200));
  }

  getTransactionsByType(type: TransactionType, limit = 50): Transaction[] {
    return [...this.transactions.values()]
      .filter(t => t.type === type)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  searchTransactions(query: {
    fromId?: string;
    toId?: string;
    type?: TransactionType;
    minAmount?: number;
    maxAmount?: number;
    from?: number;
    to?: number;
    currency?: Currency;
    limit?: number;
  }): Transaction[] {
    let results = [...this.transactions.values()];

    if (query.fromId) results = results.filter(t => t.fromId === query.fromId);
    if (query.toId) results = results.filter(t => t.toId === query.toId);
    if (query.type) results = results.filter(t => t.type === query.type);
    if (query.currency) results = results.filter(t => t.currency === query.currency);
    if (query.minAmount) results = results.filter(t => t.amount >= query.minAmount!);
    if (query.maxAmount) results = results.filter(t => t.amount <= query.maxAmount!);
    if (query.from) results = results.filter(t => t.timestamp >= query.from!);
    if (query.to) results = results.filter(t => t.timestamp <= query.to!);

    return results
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, query.limit || 100);
  }

  getBalance(playerId: string) { return this.accounts.get(playerId)?.balance ?? 0; }
  getCashBalance(playerId: string) { return this.accounts.get(playerId)?.cashBalance ?? 0; }
  getBlackBalance(playerId: string) { return this.accounts.get(playerId)?.blackBalance ?? 0; }
  getCryptoBalance(playerId: string) { return this.accounts.get(playerId)?.cryptoBalance ?? 0; }
  getMarket() { return Array.from(this.market.values()); }
  getMarketItem(id: string) { return this.market.get(id); }
  getMarketByCategory(cat: string) { return this.getMarket().filter(i => i.category === cat); }
  getAllAccounts() { return Array.from(this.accounts.values()); }
  getLoan(id: string) { return this.loans.get(id); }
  getPlayerLoans(playerId: string) { return [...this.loans.values()].filter(l => l.borrowerId === playerId); }

  // ══════════════════════════════════════════════════════════════════════════
  // STATISTIQUES
  // ══════════════════════════════════════════════════════════════════════════

  getStats(): EconStats {
    const accounts = this.getAllAccounts();
    const active = accounts.filter(a => a.status === 'active');
    const balances = active.map(a => a.balance).sort((a, b) => a - b);

    const totalMoney = accounts.reduce((s, a) => s + a.balance, 0);
    const totalBlack = accounts.reduce((s, a) => s + a.blackBalance, 0);
    const totalCrypto = accounts.reduce((s, a) => s + a.cryptoBalance * this.cryptoPrice, 0);
    const totalLoansAmt = [...this.loans.values()].reduce((s, l) => s + l.remaining, 0);

    // Coefficient Gini
    const n = balances.length;
    let gini = 0;
    if (n > 1) {
      let sumAbs = 0;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) sumAbs += Math.abs(balances[i] - balances[j]);
      gini = sumAbs / (2 * n * (totalMoney || 1));
    }

    // GDP (transactions/dernière heure)
    const oneHourAgo = Date.now() - 3_600_000;
    const recentTx = [...this.transactions.values()].filter(t => t.timestamp > oneHourAgo);
    const gdp = recentTx.reduce((s, t) => s + t.amount, 0);

    const topEarners = [...accounts]
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 10)
      .map(a => ({ id: a.ownerId, balance: a.balance }));

    return {
      totalAccounts: accounts.length,
      activeAccounts: active.length,
      totalMoneyInCirculation: totalMoney,
      totalBlackMoney: totalBlack,
      totalCrypto,
      totalTransactions: this.transactions.size,
      totalLoans: this.loans.size,
      totalLoanAmount: totalLoansAmt,
      avgBalance: active.length > 0 ? Math.round(totalMoney / active.length) : 0,
      wealthGini: Math.round(gini * 100) / 100,
      inflation: 0,
      gdp,
      transactionsPerHour: recentTx.length,
      topEarners,
    };
  }

  getPlayerStats(playerId: string) {
    const account = this.accounts.get(playerId);
    if (!account) return null;
    const txs = this.getPlayerTransactions(playerId, 100);
    return {
      account,
      creditScore: account.creditScore,
      totalReceived: txs.filter(t => t.toId === playerId).reduce((s, t) => s + t.amount, 0),
      totalSent: txs.filter(t => t.fromId === playerId).reduce((s, t) => s + t.amount, 0),
      transactionCount: txs.length,
      netWorth: account.balance + account.cashBalance + account.cryptoBalance * this.cryptoPrice,
      loans: this.getPlayerLoans(playerId),
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UTILITAIRES PRIVÉS
  // ══════════════════════════════════════════════════════════════════════════

  private recordTransaction(data: Omit<Transaction, 'id' | 'timestamp' | 'iso'>): Transaction {
    const tx: Transaction = {
      ...data,
      id: `tx_${randomUUID().slice(0, 12)}`,
      timestamp: Date.now(),
      iso: new Date().toISOString(),
    };

    this.transactions.set(tx.id, tx);

    // Référencer dans les comptes
    for (const id of [tx.fromId, tx.toId]) {
      const acc = this.accounts.get(id);
      if (acc) {
        acc.transactions.unshift(tx.id);
        if (acc.transactions.length > CONFIG.maxAccountHistory) {
          acc.transactions.length = CONFIG.maxAccountHistory;
        }
      }
    }

    // Nettoyage si trop de transactions
    if (this.transactions.size > CONFIG.maxTransactions) {
      const oldest = this.transactions.keys().next().value;
      this.transactions.delete(oldest);
    }

    return tx;
  }

  private generateAccountNumber(): string {
    const part = () => String(Math.floor(1000 + Math.random() * 9000));
    return `PE-${part()}-${part()}-${part()}`;
  }

  banAccount(playerId: string, reason = 'Abuse'): void {
    this.blacklist.add(playerId);
    this.freezeAccount(playerId, reason);
    this.emit('account:banned', { playerId, reason });
  }

  unbanAccount(playerId: string): void {
    this.blacklist.delete(playerId);
    this.unfreezeAccount(playerId);
    this.emit('account:unbanned', { playerId });
  }

  updateCreditScore(playerId: string, delta: number, reason: string): void {
    const account = this.accounts.get(playerId);
    if (!account) return;
    account.creditScore = Math.max(0, Math.min(100, account.creditScore + delta));
    this.emit('creditScore:updated', { playerId, score: account.creditScore, delta, reason });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON + EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export default EconomyEngine.getInstance();