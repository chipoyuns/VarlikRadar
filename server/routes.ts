import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAssetSchema, insertTransactionSchema, insertIncomeSchema, insertExpenseSchema, insertGoalSchema, insertDebtSchema } from "@shared/schema";
import { updateAllAssetPrices, fetchSingleAssetPrice, fetchExchangeRates } from "./services/priceService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Asset routes
  app.get("/api/assets", async (req, res) => {
    try {
      const assets = await storage.getAssets();
      res.json(assets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });

  app.get("/api/assets/:id", async (req, res) => {
    try {
      const asset = await storage.getAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch asset" });
    }
  });

  app.post("/api/assets", async (req, res) => {
    try {
      const validated = insertAssetSchema.parse(req.body);
      const asset = await storage.createAsset(validated);
      res.status(201).json(asset);
    } catch (error) {
      res.status(400).json({ error: "Invalid asset data" });
    }
  });

  app.patch("/api/assets/:id", async (req, res) => {
    try {
      const validated = insertAssetSchema.partial().parse(req.body);
      const asset = await storage.updateAsset(req.params.id, validated);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      res.status(400).json({ error: "Invalid asset data" });
    }
  });

  app.delete("/api/assets/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAsset(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete asset" });
    }
  });

  // Transaction routes
  app.get("/api/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/:id", async (req, res) => {
    try {
      const transaction = await storage.getTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transaction" });
    }
  });

  app.get("/api/assets/:assetId/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByAsset(req.params.assetId);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const validated = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validated);
      res.status(201).json(transaction);
    } catch (error) {
      res.status(400).json({ error: "Invalid transaction data" });
    }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const validated = insertTransactionSchema.partial().parse(req.body);
      const transaction = await storage.updateTransaction(req.params.id, validated);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      res.status(400).json({ error: "Invalid transaction data" });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTransaction(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  // Portfolio analytics routes
  app.get("/api/portfolio/summary", async (req, res) => {
    try {
      const summary = await storage.getPortfolioSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolio summary" });
    }
  });

  app.get("/api/portfolio/allocation", async (req, res) => {
    try {
      const allocation = await storage.getAssetAllocation();
      res.json(allocation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch asset allocation" });
    }
  });

  app.get("/api/portfolio/performance", async (req, res) => {
    try {
      const period = (req.query.period as string) || "monthly";
      const performance = await storage.getMonthlyPerformance(period);
      res.json(performance);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch performance" });
    }
  });

  app.get("/api/benchmark", async (req, res) => {
    try {
      const { fetchBenchmarkData } = await import("./services/benchmarkService");
      const data = await fetchBenchmarkData();
      res.json(data);
    } catch (error) {
      console.error("Benchmark error:", error);
      res.status(500).json({ error: "Failed to fetch benchmark data" });
    }
  });

  app.get("/api/portfolio/details", async (req, res) => {
    try {
      const details = await storage.getAssetDetails();
      res.json(details);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch asset details" });
    }
  });

  // Price update routes
  app.post("/api/prices/update", async (req, res) => {
    try {
      const results = await updateAllAssetPrices();
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      res.json({
        message: `Fiyatlar güncellendi: ${successful} başarılı, ${failed} başarısız`,
        results,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Price update error:", error);
      res.status(500).json({ error: "Fiyatlar güncellenirken hata oluştu" });
    }
  });

  app.get("/api/prices/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const { type, market } = req.query;
      
      if (!type || !market) {
        return res.status(400).json({ error: "type and market query params required" });
      }
      
      const price = await fetchSingleAssetPrice(
        symbol,
        type as string,
        market as string
      );
      
      if (price === null) {
        return res.status(404).json({ error: "Price not found" });
      }
      
      res.json({ symbol, price, fetchedAt: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch price" });
    }
  });

  // Exchange rates endpoint
  app.get("/api/exchange-rates", async (req, res) => {
    try {
      const rates = await fetchExchangeRates();
      res.json({ rates, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Exchange rates error:", error);
      res.status(500).json({ error: "Failed to fetch exchange rates" });
    }
  });

  // Income routes
  app.get("/api/incomes", async (req, res) => {
    try {
      const incomes = await storage.getIncomes();
      res.json(incomes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch incomes" });
    }
  });

  app.post("/api/incomes", async (req, res) => {
    try {
      const validated = insertIncomeSchema.parse(req.body);
      const income = await storage.createIncome(validated);
      res.status(201).json(income);
    } catch (error) {
      res.status(400).json({ error: "Invalid income data" });
    }
  });

  app.delete("/api/incomes/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteIncome(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Income not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete income" });
    }
  });

  // Expense routes
  app.get("/api/expenses", async (req, res) => {
    try {
      const expenses = await storage.getExpenses();
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const validated = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(validated);
      res.status(201).json(expense);
    } catch (error) {
      res.status(400).json({ error: "Invalid expense data" });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteExpense(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Expense not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete expense" });
    }
  });

  // Budget summary route
  app.get("/api/budget/summary", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const summary = await storage.getBudgetSummary(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch budget summary" });
    }
  });

  // Backup export endpoint
  app.get("/api/backup/export", async (req, res) => {
    try {
      const [assets, transactions, incomes, expenses] = await Promise.all([
        storage.getAssets(),
        storage.getTransactions(),
        storage.getIncomes(),
        storage.getExpenses(),
      ]);
      const backup = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        platform: "Portföy Takip",
        data: { assets, transactions, incomes, expenses },
      };
      res.setHeader("Content-Disposition", `attachment; filename="portfoy_yedek_${new Date().toISOString().slice(0, 10)}.json"`);
      res.setHeader("Content-Type", "application/json");
      res.json(backup);
    } catch (error) {
      res.status(500).json({ error: "Yedek alınamadı" });
    }
  });

  // Backup import endpoint
  app.post("/api/backup/import", async (req, res) => {
    try {
      const { assets: assetsData, transactions: txData, incomes: incomesData, expenses: expensesData } = req.body;
      let imported = { assets: 0, transactions: 0, incomes: 0, expenses: 0 };

      if (Array.isArray(assetsData)) {
        for (const a of assetsData) {
          try {
            const validated = insertAssetSchema.parse({
              type: a.type, name: a.name, symbol: a.symbol, market: a.market,
              quantity: a.quantity, averagePrice: a.averagePrice,
              currentPrice: a.currentPrice, currency: a.currency,
            });
            await storage.createAsset(validated);
            imported.assets++;
          } catch {}
        }
      }

      if (Array.isArray(txData)) {
        for (const t of txData) {
          try {
            const validated = insertTransactionSchema.parse({
              assetId: t.assetId, type: t.type, quantity: t.quantity,
              price: t.price, totalAmount: t.totalAmount,
              currency: t.currency, notes: t.notes, date: t.date,
            });
            await storage.createTransaction(validated);
            imported.transactions++;
          } catch {}
        }
      }

      if (Array.isArray(incomesData)) {
        for (const i of incomesData) {
          try {
            const validated = insertIncomeSchema.parse({
              category: i.category, description: i.description,
              amount: i.amount, currency: i.currency,
              date: i.date, isRecurring: i.isRecurring || 0,
            });
            await storage.createIncome(validated);
            imported.incomes++;
          } catch {}
        }
      }

      if (Array.isArray(expensesData)) {
        for (const e of expensesData) {
          try {
            const validated = insertExpenseSchema.parse({
              category: e.category, description: e.description,
              amount: e.amount, currency: e.currency,
              date: e.date, isRecurring: e.isRecurring || 0,
            });
            await storage.createExpense(validated);
            imported.expenses++;
          } catch {}
        }
      }

      res.json({
        message: `İçe aktarma tamamlandı: ${imported.assets} varlık, ${imported.transactions} işlem, ${imported.incomes} gelir, ${imported.expenses} gider`,
        imported,
      });
    } catch (error) {
      console.error("Backup import error:", error);
      res.status(500).json({ error: "İçe aktarma sırasında hata oluştu" });
    }
  });

  // Debt routes
  app.get("/api/debts", async (req, res) => {
    try {
      const debtsList = await storage.getDebts();
      res.json(debtsList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch debts" });
    }
  });

  app.post("/api/debts", async (req, res) => {
    try {
      const validated = insertDebtSchema.parse(req.body);
      const debt = await storage.createDebt(validated);
      res.status(201).json(debt);
    } catch (error) {
      console.error("POST /api/debts error:", error);
      res.status(400).json({ error: "Invalid debt data", detail: String(error) });
    }
  });

  app.patch("/api/debts/:id", async (req, res) => {
    try {
      const validated = insertDebtSchema.partial().parse(req.body);
      const debt = await storage.updateDebt(req.params.id, validated);
      if (!debt) return res.status(404).json({ error: "Debt not found" });
      res.json(debt);
    } catch (error) {
      res.status(400).json({ error: "Invalid debt data" });
    }
  });

  app.delete("/api/debts/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteDebt(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Debt not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete debt" });
    }
  });

  // Goals routes
  app.get("/api/goals", async (req, res) => {
    try {
      const goalsList = await storage.getGoals();
      res.json(goalsList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch goals" });
    }
  });

  app.post("/api/goals", async (req, res) => {
    try {
      const validated = insertGoalSchema.parse(req.body);
      const goal = await storage.createGoal(validated);
      res.status(201).json(goal);
    } catch (error) {
      res.status(400).json({ error: "Invalid goal data" });
    }
  });

  app.patch("/api/goals/:id", async (req, res) => {
    try {
      const validated = insertGoalSchema.partial().parse(req.body);
      const goal = await storage.updateGoal(req.params.id, validated);
      if (!goal) return res.status(404).json({ error: "Goal not found" });
      res.json(goal);
    } catch (error) {
      res.status(400).json({ error: "Invalid goal data" });
    }
  });

  app.delete("/api/goals/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteGoal(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Goal not found" });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete goal" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
