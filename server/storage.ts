import { 
  type Asset, type InsertAsset,
  type Transaction, type InsertTransaction,
  type PortfolioSummary, type AssetAllocation, type MonthlyPerformance, type AssetDetail,
  type Income, type InsertIncome,
  type Expense, type InsertExpense,
  type BudgetSummary,
  type Goal, type InsertGoal,
  type Debt, type InsertDebt,
  type Subscription, type InsertSubscription,
  type Note, type InsertNote,
  type BudgetSnapshot,
  assets, transactions, incomes, expenses, goals, debts, subscriptions, notes, budgetSnapshots
} from "@shared/schema";
import { db } from "./db";
import { fetchExchangeRates, toTRY } from "./services/exchangeRateService";
import { eq, desc, sql as drizzleSql } from "drizzle-orm";

export interface IStorage {
  getAssets(): Promise<Asset[]>;
  getAsset(id: string): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: string, asset: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(id: string): Promise<boolean>;
  
  getTransactions(): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionsByAsset(assetId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: string): Promise<boolean>;
  
  getPortfolioSummary(): Promise<PortfolioSummary>;
  getAssetAllocation(): Promise<AssetAllocation[]>;
  getMonthlyPerformance(period?: string): Promise<MonthlyPerformance[]>;
  getAssetDetails(): Promise<AssetDetail[]>;
  
  getIncomes(): Promise<Income[]>;
  getIncome(id: string): Promise<Income | undefined>;
  createIncome(income: InsertIncome): Promise<Income>;
  deleteIncome(id: string): Promise<boolean>;
  
  getExpenses(): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  deleteExpense(id: string): Promise<boolean>;
  
  getBudgetSummary(startDate?: Date, endDate?: Date): Promise<BudgetSummary>;

  getGoals(): Promise<Goal[]>;
  getGoal(id: string): Promise<Goal | undefined>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: string, goal: Partial<InsertGoal>): Promise<Goal | undefined>;
  deleteGoal(id: string): Promise<boolean>;

  getDebts(): Promise<Debt[]>;
  getDebt(id: string): Promise<Debt | undefined>;
  createDebt(debt: InsertDebt): Promise<Debt>;
  updateDebt(id: string, debt: Partial<InsertDebt>): Promise<Debt | undefined>;
  deleteDebt(id: string): Promise<boolean>;

  getSubscriptions(): Promise<Subscription[]>;
  getSubscription(id: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, subscription: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  deleteSubscription(id: string): Promise<boolean>;

  // Notes operations
  getNotes(filters?: { category?: string; isPinned?: boolean; isArchived?: boolean }): Promise<Note[]>;
  getNote(id: string): Promise<Note | undefined>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: string, note: Partial<InsertNote>): Promise<Note | undefined>;
  deleteNote(id: string): Promise<boolean>;

  // Budget snapshot operations
  saveBudgetSnapshot(date: string, balance: number): Promise<void>;
  getBudgetSnapshots(days: number): Promise<BudgetSnapshot[]>;
  getSnapshotByDate(date: string): Promise<BudgetSnapshot | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getAssets(): Promise<Asset[]> {
    return await db.select().from(assets);
  }

  async getAsset(id: string): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset || undefined;
  }

  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    const [asset] = await db.insert(assets).values(insertAsset).returning();
    return asset;
  }

  async updateAsset(id: string, updateData: Partial<InsertAsset>): Promise<Asset | undefined> {
    const [asset] = await db.update(assets).set(updateData).where(eq(assets.id, id)).returning();
    return asset || undefined;
  }

  async deleteAsset(id: string): Promise<boolean> {
    const result = await db.delete(assets).where(eq(assets.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions).orderBy(desc(transactions.date));
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async getTransactionsByAsset(assetId: string): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.assetId, assetId)).orderBy(desc(transactions.date));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    const asset = await this.getAsset(insertTransaction.assetId);
    if (asset) {
      const currentQuantity = Number(asset.quantity) || 0;
      const currentAveragePrice = Number(asset.averagePrice) || 0;
      const transactionQuantity = Number(insertTransaction.quantity) || 0;
      const transactionPrice = Number(insertTransaction.price) || 0;
      if (insertTransaction.type === "alış") {
        const newQuantity = currentQuantity + transactionQuantity;
        const newAveragePrice = newQuantity > 0
          ? (currentQuantity * currentAveragePrice + transactionQuantity * transactionPrice) / newQuantity
          : 0;
        await this.updateAsset(insertTransaction.assetId, {
          quantity: newQuantity.toString(),
          averagePrice: newAveragePrice.toFixed(2),
        });
      } else if (insertTransaction.type === "satış") {
        const newQuantity = Math.max(0, currentQuantity - transactionQuantity);
        await this.updateAsset(insertTransaction.assetId, { quantity: newQuantity.toString() });
      }
    }
    return transaction;
  }

  async updateTransaction(id: string, updateData: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const [transaction] = await db.update(transactions).set(updateData).where(eq(transactions.id, id)).returning();
    return transaction || undefined;
  }

  async deleteTransaction(id: string): Promise<boolean> {
    const result = await db.delete(transactions).where(eq(transactions.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getPortfolioSummary(): Promise<PortfolioSummary> {
    const assetList = await this.getAssets();
    const rates = await fetchExchangeRates();
    let investmentAssets = 0;
    assetList.forEach((asset) => {
      const quantity = Number(asset.quantity) || 0;
      const currentPrice = Number(asset.currentPrice) || 0;
      investmentAssets += toTRY(quantity * currentPrice, asset.currency, rates);
    });
    const budgetSummary = await this.getBudgetSummary();
    const cashBalance = budgetSummary.balance;
    const totalAssets = investmentAssets + Math.max(0, cashBalance);
    const totalDebt = cashBalance < 0 ? Math.abs(cashBalance) : 0;
    const netWorth = totalAssets - totalDebt;
    let totalCost = 0;
    assetList.forEach((asset) => {
      totalCost += toTRY((Number(asset.quantity) || 0) * (Number(asset.averagePrice) || 0), asset.currency, rates);
    });
    const monthlyChange = totalCost > 0 ? ((investmentAssets - totalCost) / totalCost) * 100 : 0;
    const monthlyChangeAmount = investmentAssets - totalCost;
    return { totalAssets, totalInvested: totalCost, totalDebt, netWorth, monthlyChange, monthlyChangeAmount };
  }

  async getAssetAllocation(): Promise<AssetAllocation[]> {
    const assetList = await this.getAssets();
    const rates = await fetchExchangeRates();
    const allocationMap = new Map<string, { value: number; count: number }>();
    let total = 0;
    assetList.forEach((asset) => {
      const value = toTRY((Number(asset.quantity) || 0) * (Number(asset.currentPrice) || 0), asset.currency, rates);
      total += value;
      const existing = allocationMap.get(asset.type) || { value: 0, count: 0 };
      allocationMap.set(asset.type, { value: existing.value + value, count: existing.count + 1 });
    });
    const typeNames: Record<string, string> = { hisse: "Hisse Senetleri", etf: "ETF'ler", kripto: "Kripto Paralar", madeni_para: "Madeni Para" };
    const colors: Record<string, string> = { hisse: "hsl(var(--chart-1))", etf: "hsl(var(--chart-2))", kripto: "hsl(var(--chart-4))", madeni_para: "hsl(var(--chart-5))" };
    return Array.from(allocationMap.entries()).map(([type, data]) => ({
      type: type as any,
      name: typeNames[type] || type,
      value: data.value,
      percentage: total > 0 ? (data.value / total) * 100 : 0,
      color: colors[type] || "hsl(var(--chart-1))",
    }));
  }

  async getMonthlyPerformance(period: string = "monthly"): Promise<MonthlyPerformance[]> {
    const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
    const now = new Date();
    const incomeList = await this.getIncomes();
    const expenseList = await this.getExpenses();
    const dataPoints: { date: Date; label: string }[] = [];
    if (period === "daily") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i); d.setHours(23, 59, 59, 999);
        dataPoints.push({ date: d, label: `${d.getDate()}.${d.getMonth() + 1}` });
      }
    } else if (period === "weekly") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i * 7); d.setHours(23, 59, 59, 999);
        dataPoints.push({ date: d, label: `H${12 - i}` });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        dataPoints.push({ date: d, label: MONTHS[d.getMonth()] });
      }
    }
    return dataPoints.map(({ date, label }) => {
      const totalIncome = incomeList.filter(i => new Date(i.date) <= date).reduce((s, i) => s + (Number(i.amount) || 0), 0);
      const totalExpense = expenseList.filter(e => new Date(e.date) <= date).reduce((s, e) => s + (Number(e.amount) || 0), 0);
      return { month: label, value: totalIncome - totalExpense };
    });
  }

  async getAssetDetails(): Promise<AssetDetail[]> {
    const assetList = await this.getAssets();
    const rates = await fetchExchangeRates();
    return assetList.map((asset) => {
      const quantity = Number(asset.quantity) || 0;
      const currentPrice = Number(asset.currentPrice) || 0;
      const averagePrice = Number(asset.averagePrice) || 0;
      const totalValue = quantity * currentPrice;
      const totalValueTRY = toTRY(totalValue, asset.currency, rates);
      const totalCost = quantity * averagePrice;
      const profit = totalValue - totalCost;
      const profitTRY = toTRY(profit, asset.currency, rates);
      const change = totalCost > 0 ? ((currentPrice - averagePrice) / averagePrice) * 100 : 0;
      const changeAmount = currentPrice - averagePrice;
      return { ...asset, totalValue, totalValueTRY, change, changeAmount, profit, profitTRY };
    });
  }

  async getIncomes(): Promise<Income[]> {
    return await db.select().from(incomes).orderBy(desc(incomes.date));
  }

  async getIncome(id: string): Promise<Income | undefined> {
    const [income] = await db.select().from(incomes).where(eq(incomes.id, id));
    return income || undefined;
  }

  async createIncome(insertIncome: InsertIncome): Promise<Income> {
    const [income] = await db.insert(incomes).values(insertIncome).returning();
    return income;
  }

  async deleteIncome(id: string): Promise<boolean> {
    const result = await db.delete(incomes).where(eq(incomes.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.date));
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense || undefined;
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(insertExpense).returning();
    return expense;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getBudgetSummary(startDate?: Date, endDate?: Date): Promise<BudgetSummary> {
    let allIncomes = await this.getIncomes();
    let allExpenses = await this.getExpenses();
    if (startDate) {
      allIncomes = allIncomes.filter(i => new Date(i.date) >= startDate);
      allExpenses = allExpenses.filter(e => new Date(e.date) >= startDate);
    }
    if (endDate) {
      allIncomes = allIncomes.filter(i => new Date(i.date) <= endDate);
      allExpenses = allExpenses.filter(e => new Date(e.date) <= endDate);
    }
    const totalIncome = allIncomes.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const totalExpense = allExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const balance = totalIncome - totalExpense;
    const incomeByCategory = new Map<string, number>();
    allIncomes.forEach(i => incomeByCategory.set(i.category, (incomeByCategory.get(i.category) || 0) + (Number(i.amount) || 0)));
    const expenseByCategory = new Map<string, number>();
    allExpenses.forEach(e => expenseByCategory.set(e.category, (expenseByCategory.get(e.category) || 0) + (Number(e.amount) || 0)));
    return {
      totalIncome, totalExpense, balance,
      incomeByCategory: Array.from(incomeByCategory.entries()).map(([category, amount]) => ({ category, amount, percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0 })),
      expenseByCategory: Array.from(expenseByCategory.entries()).map(([category, amount]) => ({ category, amount, percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0 })),
    };
  }

  async getDebts(): Promise<Debt[]> {
    return await db.select().from(debts).orderBy(desc(debts.createdAt));
  }

  async getDebt(id: string): Promise<Debt | undefined> {
    const [debt] = await db.select().from(debts).where(eq(debts.id, id));
    return debt || undefined;
  }

  async createDebt(insertDebt: InsertDebt): Promise<Debt> {
    const [debt] = await db.insert(debts).values(insertDebt).returning();
    return debt;
  }

  async updateDebt(id: string, updateData: Partial<InsertDebt>): Promise<Debt | undefined> {
    const [debt] = await db.update(debts).set(updateData).where(eq(debts.id, id)).returning();
    return debt || undefined;
  }

  async deleteDebt(id: string): Promise<boolean> {
    const result = await db.delete(debts).where(eq(debts.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getGoals(): Promise<Goal[]> {
    return await db.select().from(goals).orderBy(desc(goals.createdAt));
  }

  async getGoal(id: string): Promise<Goal | undefined> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    return goal || undefined;
  }

  async createGoal(insertGoal: InsertGoal): Promise<Goal> {
    const [goal] = await db.insert(goals).values(insertGoal).returning();
    return goal;
  }

  async updateGoal(id: string, updateData: Partial<InsertGoal>): Promise<Goal | undefined> {
    const [goal] = await db.update(goals).set(updateData).where(eq(goals.id, id)).returning();
    return goal || undefined;
  }

  async deleteGoal(id: string): Promise<boolean> {
    const result = await db.delete(goals).where(eq(goals.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getSubscriptions(): Promise<Subscription[]> {
    return await db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
  }

  async getSubscription(id: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return sub || undefined;
  }

  async createSubscription(insertSub: InsertSubscription): Promise<Subscription> {
    const [sub] = await db.insert(subscriptions).values(insertSub).returning();
    return sub;
  }

  async updateSubscription(id: string, updateData: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const [sub] = await db.update(subscriptions).set(updateData).where(eq(subscriptions.id, id)).returning();
    return sub || undefined;
  }

  async deleteSubscription(id: string): Promise<boolean> {
    const result = await db.delete(subscriptions).where(eq(subscriptions.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Notes operations
  async getNotes(filters?: { category?: string; isPinned?: boolean; isArchived?: boolean }): Promise<Note[]> {
    let query = db.select().from(notes).$dynamic();
    const conditions = [];
    if (filters?.isArchived !== undefined) {
      conditions.push(eq(notes.isArchived, filters.isArchived ? 1 : 0));
    } else {
      conditions.push(eq(notes.isArchived, 0));
    }
    if (filters?.category && filters.category !== "all") {
      conditions.push(eq(notes.category, filters.category));
    }
    if (filters?.isPinned !== undefined) {
      conditions.push(eq(notes.isPinned, filters.isPinned ? 1 : 0));
    }
    for (const cond of conditions) {
      query = query.where(cond);
    }
    return await query.orderBy(desc(notes.isPinned), desc(notes.updatedAt));
  }

  async getNote(id: string): Promise<Note | undefined> {
    const [note] = await db.select().from(notes).where(eq(notes.id, id));
    return note || undefined;
  }

  async createNote(insertNote: InsertNote): Promise<Note> {
    const [note] = await db.insert(notes).values({ ...insertNote, updatedAt: new Date() }).returning();
    return note;
  }

  async updateNote(id: string, updateData: Partial<InsertNote>): Promise<Note | undefined> {
    const [note] = await db.update(notes).set({ ...updateData, updatedAt: new Date() }).where(eq(notes.id, id)).returning();
    return note || undefined;
  }

  async deleteNote(id: string): Promise<boolean> {
    const result = await db.delete(notes).where(eq(notes.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Budget snapshot operations
  async saveBudgetSnapshot(date: string, balance: number): Promise<void> {
    const existing = await this.getSnapshotByDate(date);
    if (existing) {
      await db.update(budgetSnapshots).set({ balance: balance.toString() }).where(eq(budgetSnapshots.date, date));
    } else {
      await db.insert(budgetSnapshots).values({ date, balance: balance.toString() });
    }
  }

  async getBudgetSnapshots(days: number): Promise<BudgetSnapshot[]> {
    const allSnapshots = await db.select().from(budgetSnapshots).orderBy(desc(budgetSnapshots.date));
    return allSnapshots.slice(0, days).reverse();
  }

  async getSnapshotByDate(date: string): Promise<BudgetSnapshot | undefined> {
    const [snap] = await db.select().from(budgetSnapshots).where(eq(budgetSnapshots.date, date));
    return snap || undefined;
  }
}

export const storage = new DatabaseStorage();
