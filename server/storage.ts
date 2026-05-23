import { 
  type Asset, 
  type InsertAsset, 
  type Transaction, 
  type InsertTransaction,
  type PortfolioSummary,
  type AssetAllocation,
  type MonthlyPerformance,
  type AssetDetail,
  type Income,
  type InsertIncome,
  type Expense,
  type InsertExpense,
  type BudgetSummary,
  type Goal,
  type InsertGoal,
  type Debt,
  type InsertDebt,
  assets,
  transactions,
  incomes,
  expenses,
  goals,
  debts
} from "@shared/schema";
import { db } from "./db";
import { fetchExchangeRates, toTRY } from "./services/exchangeRateService";
import { eq, desc, gte, lte, and } from "drizzle-orm";

export interface IStorage {
  // Asset operations
  getAssets(): Promise<Asset[]>;
  getAsset(id: string): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: string, asset: Partial<InsertAsset>): Promise<Asset | undefined>;
  deleteAsset(id: string): Promise<boolean>;
  
  // Transaction operations
  getTransactions(): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionsByAsset(assetId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: string): Promise<boolean>;
  
  // Portfolio calculations
  getPortfolioSummary(): Promise<PortfolioSummary>;
  getAssetAllocation(): Promise<AssetAllocation[]>;
  getMonthlyPerformance(period?: string): Promise<MonthlyPerformance[]>;
  getAssetDetails(): Promise<AssetDetail[]>;
  
  // Income operations
  getIncomes(): Promise<Income[]>;
  getIncome(id: string): Promise<Income | undefined>;
  createIncome(income: InsertIncome): Promise<Income>;
  deleteIncome(id: string): Promise<boolean>;
  
  // Expense operations
  getExpenses(): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  deleteExpense(id: string): Promise<boolean>;
  
  // Budget calculations
  getBudgetSummary(startDate?: Date, endDate?: Date): Promise<BudgetSummary>;

  // Goal operations
  getGoals(): Promise<Goal[]>;
  getGoal(id: string): Promise<Goal | undefined>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: string, goal: Partial<InsertGoal>): Promise<Goal | undefined>;
  deleteGoal(id: string): Promise<boolean>;

  // Debt operations
  getDebts(): Promise<Debt[]>;
  getDebt(id: string): Promise<Debt | undefined>;
  createDebt(debt: InsertDebt): Promise<Debt>;
  updateDebt(id: string, debt: Partial<InsertDebt>): Promise<Debt | undefined>;
  deleteDebt(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Asset operations
  async getAssets(): Promise<Asset[]> {
    return await db.select().from(assets);
  }

  async getAsset(id: string): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset || undefined;
  }

  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    const [asset] = await db
      .insert(assets)
      .values(insertAsset)
      .returning();
    return asset;
  }

  async updateAsset(id: string, updateData: Partial<InsertAsset>): Promise<Asset | undefined> {
    const [asset] = await db
      .update(assets)
      .set(updateData)
      .where(eq(assets.id, id))
      .returning();
    return asset || undefined;
  }

  async deleteAsset(id: string): Promise<boolean> {
    const result = await db.delete(assets).where(eq(assets.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Transaction operations
  async getTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions).orderBy(desc(transactions.date));
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async getTransactionsByAsset(assetId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.assetId, assetId))
      .orderBy(desc(transactions.date));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
    
    // Update asset's average price and quantity if it's a buy/sell transaction
    const asset = await this.getAsset(insertTransaction.assetId);
    if (asset) {
      // Safely coerce decimal strings to numbers with defaults
      const currentQuantity = Number(asset.quantity) || 0;
      const currentAveragePrice = Number(asset.averagePrice) || 0;
      const transactionQuantity = Number(insertTransaction.quantity) || 0;
      const transactionPrice = Number(insertTransaction.price) || 0;
      
      if (insertTransaction.type === "alış") {
        // Calculate new average price for buy
        const currentValue = currentQuantity * currentAveragePrice;
        const newValue = transactionQuantity * transactionPrice;
        const newQuantity = currentQuantity + transactionQuantity;
        const newAveragePrice = newQuantity > 0 ? (currentValue + newValue) / newQuantity : 0;
        
        await this.updateAsset(insertTransaction.assetId, {
          quantity: newQuantity.toString(),
          averagePrice: newAveragePrice.toFixed(2),
        });
      } else if (insertTransaction.type === "satış") {
        // Reduce quantity for sell
        const newQuantity = currentQuantity - transactionQuantity;
        await this.updateAsset(insertTransaction.assetId, {
          quantity: Math.max(0, newQuantity).toString(),
        });
      }
    }
    
    return transaction;
  }

  async updateTransaction(id: string, updateData: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const [transaction] = await db
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, id))
      .returning();
    return transaction || undefined;
  }

  async deleteTransaction(id: string): Promise<boolean> {
    const result = await db.delete(transactions).where(eq(transactions.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Portfolio calculations
  async getPortfolioSummary(): Promise<PortfolioSummary> {
    const assets = await this.getAssets();
    const rates = await fetchExchangeRates();
    
    // Calculate total investment assets value (normalized to TRY)
    let investmentAssets = 0;
    assets.forEach((asset) => {
      const quantity = Number(asset.quantity) || 0;
      const currentPrice = Number(asset.currentPrice) || 0;
      investmentAssets += toTRY(quantity * currentPrice, asset.currency, rates);
    });
    
    // Get budget summary (income - expenses = cash balance) - already in TRY
    const budgetSummary = await this.getBudgetSummary();
    const cashBalance = budgetSummary.balance;
    
    // Total assets = investment assets + cash balance (if positive)
    const totalAssets = investmentAssets + Math.max(0, cashBalance);
    
    // Total debt = negative cash balance (if expenses > income)
    const totalDebt = cashBalance < 0 ? Math.abs(cashBalance) : 0;
    
    // Net worth = total assets - total debt
    const netWorth = totalAssets - totalDebt;
    
    // Calculate monthly change (normalized to TRY)
    let totalCost = 0;
    assets.forEach((asset) => {
      const quantity = Number(asset.quantity) || 0;
      const averagePrice = Number(asset.averagePrice) || 0;
      totalCost += toTRY(quantity * averagePrice, asset.currency, rates);
    });
    
    const monthlyChange = totalCost > 0 ? ((investmentAssets - totalCost) / totalCost) * 100 : 0;
    const monthlyChangeAmount = investmentAssets - totalCost;
    
    return {
      totalAssets,
      totalDebt,
      netWorth,
      monthlyChange,
      monthlyChangeAmount,
    };
  }

  async getAssetAllocation(): Promise<AssetAllocation[]> {
    const assets = await this.getAssets();
    const rates = await fetchExchangeRates();
    
    // Group by asset type (normalize values to TRY)
    const allocationMap = new Map<string, { value: number; count: number }>();
    let total = 0;
    
    assets.forEach((asset) => {
      const quantity = Number(asset.quantity) || 0;
      const currentPrice = Number(asset.currentPrice) || 0;
      const value = toTRY(quantity * currentPrice, asset.currency, rates);
      total += value;
      
      const existing = allocationMap.get(asset.type) || { value: 0, count: 0 };
      allocationMap.set(asset.type, {
        value: existing.value + value,
        count: existing.count + 1,
      });
    });
    
    const typeNames: Record<string, string> = {
      hisse: "Hisse Senetleri",
      etf: "ETF'ler",
      kripto: "Kripto Paralar",
      madeni_para: "Madeni Para",
    };
    
    const colors: Record<string, string> = {
      hisse: "hsl(var(--chart-1))",
      etf: "hsl(var(--chart-2))",
      kripto: "hsl(var(--chart-4))",
      madeni_para: "hsl(var(--chart-5))",
    };
    
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
    const incomes = await this.getIncomes();
    const expenses = await this.getExpenses();

    // Build data point dates and labels
    const dataPoints: { date: Date; label: string }[] = [];

    if (period === "daily") {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        d.setHours(23, 59, 59, 999);
        dataPoints.push({ date: d, label: `${d.getDate()}.${d.getMonth() + 1}` });
      }
    } else if (period === "weekly") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        d.setHours(23, 59, 59, 999);
        dataPoints.push({ date: d, label: `H${12 - i}` });
      }
    } else {
      // Monthly (default)
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        dataPoints.push({ date: d, label: MONTHS[d.getMonth()] });
      }
    }

    return dataPoints.map(({ date, label }) => {
      const totalIncome = incomes
        .filter((income) => new Date(income.date) <= date)
        .reduce((sum, income) => sum + (Number(income.amount) || 0), 0);
      const totalExpense = expenses
        .filter((expense) => new Date(expense.date) <= date)
        .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

      return { month: label, value: totalIncome - totalExpense };
    });
  }

  async getAssetDetails(): Promise<AssetDetail[]> {
    const assets = await this.getAssets();
    const rates = await fetchExchangeRates();
    
    return assets.map((asset) => {
      const quantity = Number(asset.quantity) || 0;
      const currentPrice = Number(asset.currentPrice) || 0;
      const averagePrice = Number(asset.averagePrice) || 0;
      
      const totalValue = quantity * currentPrice; // native currency
      const totalValueTRY = toTRY(totalValue, asset.currency, rates); // normalized to TRY
      const totalCost = quantity * averagePrice;
      const profit = totalValue - totalCost; // native currency
      const profitTRY = toTRY(profit, asset.currency, rates); // normalized to TRY
      const change = totalCost > 0 ? ((currentPrice - averagePrice) / averagePrice) * 100 : 0;
      const changeAmount = currentPrice - averagePrice;

      return {
        ...asset,
        totalValue,
        totalValueTRY,
        change,
        changeAmount,
        profit,
        profitTRY,
      };
    });
  }

  // Income operations
  async getIncomes(): Promise<Income[]> {
    return await db.select().from(incomes).orderBy(desc(incomes.date));
  }

  async getIncome(id: string): Promise<Income | undefined> {
    const [income] = await db.select().from(incomes).where(eq(incomes.id, id));
    return income || undefined;
  }

  async createIncome(insertIncome: InsertIncome): Promise<Income> {
    const [income] = await db
      .insert(incomes)
      .values(insertIncome)
      .returning();
    return income;
  }

  async deleteIncome(id: string): Promise<boolean> {
    const result = await db.delete(incomes).where(eq(incomes.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Expense operations
  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.date));
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense || undefined;
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    const [expense] = await db
      .insert(expenses)
      .values(insertExpense)
      .returning();
    return expense;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Budget calculations
  async getBudgetSummary(startDate?: Date, endDate?: Date): Promise<BudgetSummary> {
    let allIncomes = await this.getIncomes();
    let allExpenses = await this.getExpenses();
    
    // Filter by date range if provided
    if (startDate) {
      allIncomes = allIncomes.filter(i => new Date(i.date) >= startDate);
      allExpenses = allExpenses.filter(e => new Date(e.date) >= startDate);
    }
    if (endDate) {
      allIncomes = allIncomes.filter(i => new Date(i.date) <= endDate);
      allExpenses = allExpenses.filter(e => new Date(e.date) <= endDate);
    }
    
    // Calculate totals
    const totalIncome = allIncomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const totalExpense = allExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const balance = totalIncome - totalExpense;
    
    // Group by category
    const incomeByCategory = new Map<string, number>();
    allIncomes.forEach(i => {
      const current = incomeByCategory.get(i.category) || 0;
      incomeByCategory.set(i.category, current + (Number(i.amount) || 0));
    });
    
    const expenseByCategory = new Map<string, number>();
    allExpenses.forEach(e => {
      const current = expenseByCategory.get(e.category) || 0;
      expenseByCategory.set(e.category, current + (Number(e.amount) || 0));
    });
    
    return {
      totalIncome,
      totalExpense,
      balance,
      incomeByCategory: Array.from(incomeByCategory.entries()).map(([category, amount]) => ({
        category,
        amount,
        percentage: totalIncome > 0 ? (amount / totalIncome) * 100 : 0,
      })),
      expenseByCategory: Array.from(expenseByCategory.entries()).map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      })),
    };
  }

  // Debt operations
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

  // Goal operations
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
}

export const storage = new DatabaseStorage();
