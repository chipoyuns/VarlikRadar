import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertAssetSchema, insertTransactionSchema, insertIncomeSchema, insertExpenseSchema,
  insertGoalSchema, insertDebtSchema, insertSubscriptionSchema, insertNoteSchema
} from "@shared/schema";
import { updateAllAssetPrices, fetchSingleAssetPrice, fetchExchangeRates } from "./services/priceService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Asset routes
  app.get("/api/assets", async (req, res) => {
    try { res.json(await storage.getAssets()); } catch { res.status(500).json({ error: "Failed to fetch assets" }); }
  });

  app.get("/api/assets/:id", async (req, res) => {
    try {
      const asset = await storage.getAsset(req.params.id);
      if (!asset) return res.status(404).json({ error: "Asset not found" });
      res.json(asset);
    } catch { res.status(500).json({ error: "Failed to fetch asset" }); }
  });

  app.post("/api/assets", async (req, res) => {
    try {
      const validated = insertAssetSchema.parse(req.body);
      res.status(201).json(await storage.createAsset(validated));
    } catch { res.status(400).json({ error: "Invalid asset data" }); }
  });

  app.patch("/api/assets/:id", async (req, res) => {
    try {
      const validated = insertAssetSchema.partial().parse(req.body);
      const asset = await storage.updateAsset(req.params.id, validated);
      if (!asset) return res.status(404).json({ error: "Asset not found" });
      res.json(asset);
    } catch { res.status(400).json({ error: "Invalid asset data" }); }
  });

  app.delete("/api/assets/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAsset(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Asset not found" });
      res.status(204).send();
    } catch { res.status(500).json({ error: "Failed to delete asset" }); }
  });

  // Transaction routes
  app.get("/api/transactions", async (req, res) => {
    try { res.json(await storage.getTransactions()); } catch { res.status(500).json({ error: "Failed to fetch transactions" }); }
  });

  app.get("/api/transactions/:id", async (req, res) => {
    try {
      const tx = await storage.getTransaction(req.params.id);
      if (!tx) return res.status(404).json({ error: "Transaction not found" });
      res.json(tx);
    } catch { res.status(500).json({ error: "Failed to fetch transaction" }); }
  });

  app.get("/api/assets/:assetId/transactions", async (req, res) => {
    try { res.json(await storage.getTransactionsByAsset(req.params.assetId)); }
    catch { res.status(500).json({ error: "Failed to fetch transactions" }); }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const validated = insertTransactionSchema.parse(req.body);
      res.status(201).json(await storage.createTransaction(validated));
    } catch { res.status(400).json({ error: "Invalid transaction data" }); }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const validated = insertTransactionSchema.partial().parse(req.body);
      const tx = await storage.updateTransaction(req.params.id, validated);
      if (!tx) return res.status(404).json({ error: "Transaction not found" });
      res.json(tx);
    } catch { res.status(400).json({ error: "Invalid transaction data" }); }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTransaction(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Transaction not found" });
      res.status(204).send();
    } catch { res.status(500).json({ error: "Failed to delete transaction" }); }
  });

  // Portfolio analytics
  app.get("/api/portfolio/summary", async (req, res) => {
    try { res.json(await storage.getPortfolioSummary()); } catch { res.status(500).json({ error: "Failed to fetch portfolio summary" }); }
  });

  app.get("/api/portfolio/allocation", async (req, res) => {
    try { res.json(await storage.getAssetAllocation()); } catch { res.status(500).json({ error: "Failed to fetch asset allocation" }); }
  });

  app.get("/api/portfolio/performance", async (req, res) => {
    try {
      const period = (req.query.period as string) || "monthly";
      res.json(await storage.getMonthlyPerformance(period));
    } catch { res.status(500).json({ error: "Failed to fetch performance" }); }
  });

  app.get("/api/benchmark", async (req, res) => {
    try {
      const { fetchBenchmarkData } = await import("./services/benchmarkService");
      res.json(await fetchBenchmarkData());
    } catch (error) {
      console.error("Benchmark error:", error);
      res.status(500).json({ error: "Failed to fetch benchmark data" });
    }
  });

  app.get("/api/portfolio/details", async (req, res) => {
    try { res.json(await storage.getAssetDetails()); } catch { res.status(500).json({ error: "Failed to fetch asset details" }); }
  });

  // Price routes
  app.post("/api/prices/update", async (req, res) => {
    try {
      const results = await updateAllAssetPrices();
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      res.json({ message: `Fiyatlar güncellendi: ${successful} başarılı, ${failed} başarısız`, results, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Price update error:", error);
      res.status(500).json({ error: "Fiyatlar güncellenirken hata oluştu" });
    }
  });

  app.get("/api/prices/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const { type, market } = req.query;
      if (!type || !market) return res.status(400).json({ error: "type and market query params required" });
      const price = await fetchSingleAssetPrice(symbol, type as string, market as string);
      if (price === null) return res.status(404).json({ error: "Price not found" });
      res.json({ symbol, price, fetchedAt: new Date().toISOString() });
    } catch { res.status(500).json({ error: "Failed to fetch price" }); }
  });

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
    try { res.json(await storage.getIncomes()); } catch { res.status(500).json({ error: "Failed to fetch incomes" }); }
  });

  app.post("/api/incomes", async (req, res) => {
    try {
      const validated = insertIncomeSchema.parse(req.body);
      res.status(201).json(await storage.createIncome(validated));
    } catch { res.status(400).json({ error: "Invalid income data" }); }
  });

  app.delete("/api/incomes/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteIncome(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Income not found" });
      res.status(204).send();
    } catch { res.status(500).json({ error: "Failed to delete income" }); }
  });

  // Expense routes
  app.get("/api/expenses", async (req, res) => {
    try { res.json(await storage.getExpenses()); } catch { res.status(500).json({ error: "Failed to fetch expenses" }); }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const validated = insertExpenseSchema.parse(req.body);
      res.status(201).json(await storage.createExpense(validated));
    } catch { res.status(400).json({ error: "Invalid expense data" }); }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteExpense(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Expense not found" });
      res.status(204).send();
    } catch { res.status(500).json({ error: "Failed to delete expense" }); }
  });

  // Budget summary
  app.get("/api/budget/summary", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      res.json(await storage.getBudgetSummary(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      ));
    } catch { res.status(500).json({ error: "Failed to fetch budget summary" }); }
  });

  // Budget balance performance — saves daily snapshot on each call (snapshot ops are non-critical)
  app.get("/api/budget/performance", async (req, res) => {
    try {
      const period = (req.query.period as string) || "monthly";
      const kasaValue = parseFloat((req.query.kasaValue as string) || "0") || 0;
      const portfolioKarZarar = parseFloat((req.query.portfolioKarZarar as string) || "0") || 0;
      const [allIncomes, allExpenses] = await Promise.all([storage.getIncomes(), storage.getExpenses()]);
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);

      // Save today's snapshot — wrapped in try/catch: if table doesn't exist yet, we still return data
      const calcBalance = (cutoff: Date) => {
        const inc = allIncomes.filter(i => new Date(i.date) <= cutoff).reduce((s, i) => s + (Number(i.amount) || 0), 0);
        const exp = allExpenses.filter(e => new Date(e.date) <= cutoff).reduce((s, e) => s + (Number(e.amount) || 0), 0);
        return kasaValue + inc + portfolioKarZarar - exp;
      };
      try {
        await storage.saveBudgetSnapshot(todayStr, calcBalance(new Date()));
      } catch (snapErr) {
        console.warn("Budget snapshot save skipped (table may not exist):", (snapErr as Error).message);
      }

      // Try to load snapshots — if table missing, fall back to empty map
      let snapMap = new Map<string, number>();
      try {
        const snapshots = await storage.getBudgetSnapshots(400);
        snapshots.forEach(s => snapMap.set(s.date, Number(s.balance)));
      } catch {
        // snapshots table not available — use pure calculation fallback
      }

      const MONTH_NAMES = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

      if (period === "daily") {
        const points: { label: string; date: string; end: Date }[] = [];
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now); d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().slice(0, 10);
          const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
          points.push({ label: `${d.getDate()}.${d.getMonth() + 1}`, date: dateStr, end });
        }
        return res.json(points.map(p =>
          snapMap.has(p.date)
            ? { month: p.label, value: snapMap.get(p.date)! }
            : { month: p.label, value: calcBalance(p.end) }
        ));
      }

      if (period === "weekly") {
        const points: { label: string; end: Date; key: string }[] = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now); d.setDate(d.getDate() - i * 7);
          const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
          points.push({ label: `H${12 - i}`, end, key: d.toISOString().slice(0, 10) });
        }
        return res.json(points.map(p =>
          snapMap.has(p.key)
            ? { month: p.label, value: snapMap.get(p.key)! }
            : { month: p.label, value: calcBalance(p.end) }
        ));
      }

      // Monthly (default)
      const monthSnapMap = new Map<string, number>();
      snapMap.forEach((v, k) => monthSnapMap.set(k.slice(0, 7), v));

      const points: { label: string; end: Date; monthStr: string }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        points.push({ label: MONTH_NAMES[d.getMonth()], end, monthStr });
      }
      return res.json(points.map(p =>
        monthSnapMap.has(p.monthStr)
          ? { month: p.label, value: monthSnapMap.get(p.monthStr)! }
          : { month: p.label, value: calcBalance(p.end) }
      ));
    } catch (error) {
      console.error("Budget performance error:", error);
      res.status(500).json({ error: "Failed to fetch budget performance" });
    }
  });

  // Subscription routes
  app.get("/api/subscriptions", async (req, res) => {
    try { res.json(await storage.getSubscriptions()); } catch { res.status(500).json({ error: "Failed to fetch subscriptions" }); }
  });

  app.post("/api/subscriptions", async (req, res) => {
    try {
      const validated = insertSubscriptionSchema.parse(req.body);
      res.status(201).json(await storage.createSubscription(validated));
    } catch (error) {
      console.error("POST /api/subscriptions error:", error);
      res.status(400).json({ error: "Invalid subscription data", detail: String(error) });
    }
  });

  app.patch("/api/subscriptions/:id", async (req, res) => {
    try {
      const validated = insertSubscriptionSchema.partial().parse(req.body);
      const sub = await storage.updateSubscription(req.params.id, validated);
      if (!sub) return res.status(404).json({ error: "Subscription not found" });
      res.json(sub);
    } catch { res.status(400).json({ error: "Invalid subscription data" }); }
  });

  app.delete("/api/subscriptions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSubscription(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Subscription not found" });
      res.status(204).send();
    } catch { res.status(500).json({ error: "Failed to delete subscription" }); }
  });

  // Debt routes
  app.get("/api/debts", async (req, res) => {
    try { res.json(await storage.getDebts()); } catch { res.status(500).json({ error: "Failed to fetch debts" }); }
  });

  app.post("/api/debts", async (req, res) => {
    try {
      const validated = insertDebtSchema.parse(req.body);
      res.status(201).json(await storage.createDebt(validated));
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
    } catch { res.status(400).json({ error: "Invalid debt data" }); }
  });

  app.delete("/api/debts/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteDebt(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Debt not found" });
      res.status(204).send();
    } catch { res.status(500).json({ error: "Failed to delete debt" }); }
  });

  // Goals routes
  app.get("/api/goals", async (req, res) => {
    try { res.json(await storage.getGoals()); } catch { res.status(500).json({ error: "Failed to fetch goals" }); }
  });

  app.post("/api/goals", async (req, res) => {
    try {
      const validated = insertGoalSchema.parse(req.body);
      res.status(201).json(await storage.createGoal(validated));
    } catch { res.status(400).json({ error: "Invalid goal data" }); }
  });

  app.patch("/api/goals/:id", async (req, res) => {
    try {
      const validated = insertGoalSchema.partial().parse(req.body);
      const goal = await storage.updateGoal(req.params.id, validated);
      if (!goal) return res.status(404).json({ error: "Goal not found" });
      res.json(goal);
    } catch { res.status(400).json({ error: "Invalid goal data" }); }
  });

  app.delete("/api/goals/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteGoal(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Goal not found" });
      res.status(204).send();
    } catch { res.status(500).json({ error: "Failed to delete goal" }); }
  });

  // ─── Notes (Not Defteri) ─────────────────────────────────────────────────────
  app.get("/api/notes", async (req, res) => {
    try {
      const { category, isPinned, isArchived } = req.query;
      const notesList = await storage.getNotes({
        category: category as string | undefined,
        isPinned: isPinned === "true" ? true : undefined,
        isArchived: isArchived === "true" ? true : false,
      });
      res.json(notesList);
    } catch { res.status(500).json({ error: "Failed to fetch notes" }); }
  });

  app.get("/api/notes/:id", async (req, res) => {
    try {
      const note = await storage.getNote(req.params.id);
      if (!note) return res.status(404).json({ error: "Note not found" });
      res.json(note);
    } catch { res.status(500).json({ error: "Failed to fetch note" }); }
  });

  app.post("/api/notes", async (req, res) => {
    try {
      const validated = insertNoteSchema.parse(req.body);
      res.status(201).json(await storage.createNote(validated));
    } catch (error) {
      console.error("POST /api/notes error:", error);
      res.status(400).json({ error: "Invalid note data", detail: String(error) });
    }
  });

  app.patch("/api/notes/:id", async (req, res) => {
    try {
      const validated = insertNoteSchema.partial().parse(req.body);
      const note = await storage.updateNote(req.params.id, validated);
      if (!note) return res.status(404).json({ error: "Note not found" });
      res.json(note);
    } catch (error) {
      console.error("PATCH /api/notes error:", error);
      res.status(400).json({ error: "Invalid note data" });
    }
  });

  app.delete("/api/notes/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteNote(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Note not found" });
      res.status(204).send();
    } catch { res.status(500).json({ error: "Failed to delete note" }); }
  });

  // ─── Backup Export (full portfolio) ─────────────────────────────────────────
  app.get("/api/backup/export", async (req, res) => {
    try {
      const [assetList, txList, incomeList, expenseList, goalList, debtList, subList, noteList] = await Promise.all([
        storage.getAssets(),
        storage.getTransactions(),
        storage.getIncomes(),
        storage.getExpenses(),
        storage.getGoals(),
        storage.getDebts(),
        storage.getSubscriptions(),
        storage.getNotes(),
      ]);
      const backup = {
        version: "2.0",
        exportedAt: new Date().toISOString(),
        platform: "EkoS Portföy Takip",
        data: {
          assets: assetList,
          transactions: txList,
          incomes: incomeList,
          expenses: expenseList,
          goals: goalList,
          debts: debtList,
          subscriptions: subList,
          notes: noteList,
        },
      };
      res.setHeader("Content-Disposition", `attachment; filename="ekos_yedek_${new Date().toISOString().slice(0, 10)}.json"`);
      res.setHeader("Content-Type", "application/json");
      res.json(backup);
    } catch (error) {
      console.error("Backup export error:", error);
      res.status(500).json({ error: "Yedek alınamadı" });
    }
  });

  // ─── Backup Import (replaces all data) ───────────────────────────────────────
  app.post("/api/backup/import", async (req, res) => {
    try {
      const body = req.body;
      const data = body.data || body; // support both v1 and v2 format
      const { assets: assetsData, transactions: txData, incomes: incomesData, expenses: expensesData,
              goals: goalsData, debts: debtsData, subscriptions: subsData, notes: notesData } = data;

      // Clear existing data first (replace mode) — order matters due to relations
      const [existingAssets, existingTx, existingIncomes, existingExpenses,
              existingGoals, existingDebts, existingSubs, existingNotes] = await Promise.all([
        storage.getAssets(), storage.getTransactions(), storage.getIncomes(), storage.getExpenses(),
        storage.getGoals(), storage.getDebts(), storage.getSubscriptions(), storage.getNotes(),
      ]);
      await Promise.all([
        ...existingTx.map(t => storage.deleteTransaction(t.id)),
        ...existingIncomes.map(i => storage.deleteIncome(i.id)),
        ...existingExpenses.map(e => storage.deleteExpense(e.id)),
        ...existingGoals.map(g => storage.deleteGoal(g.id)),
        ...existingDebts.map(d => storage.deleteDebt(d.id)),
        ...existingSubs.map(s => storage.deleteSubscription(s.id)),
        ...existingNotes.map(n => storage.deleteNote(n.id)),
      ]);
      await Promise.all(existingAssets.map(a => storage.deleteAsset(a.id)));

      const imported = { assets: 0, transactions: 0, incomes: 0, expenses: 0, goals: 0, debts: 0, subscriptions: 0, notes: 0 };

      if (Array.isArray(assetsData)) {
        for (const a of assetsData) {
          try {
            const validated = insertAssetSchema.parse({ type: a.type, name: a.name, symbol: a.symbol, market: a.market, quantity: a.quantity, averagePrice: a.averagePrice, currentPrice: a.currentPrice, currency: a.currency });
            await storage.createAsset(validated);
            imported.assets++;
          } catch {}
        }
      }

      if (Array.isArray(txData)) {
        const currentAssets = await storage.getAssets();
        for (const t of txData) {
          try {
            const validated = insertTransactionSchema.parse({ assetId: t.assetId, type: t.type, quantity: t.quantity, price: t.price, totalAmount: t.totalAmount, currency: t.currency, notes: t.notes, date: t.date });
            await storage.createTransaction(validated);
            imported.transactions++;
          } catch {}
        }
      }

      if (Array.isArray(incomesData)) {
        for (const i of incomesData) {
          try {
            const validated = insertIncomeSchema.parse({ category: i.category, description: i.description, amount: i.amount, currency: i.currency, date: i.date, isRecurring: i.isRecurring || 0 });
            await storage.createIncome(validated);
            imported.incomes++;
          } catch {}
        }
      }

      if (Array.isArray(expensesData)) {
        for (const e of expensesData) {
          try {
            const validated = insertExpenseSchema.parse({ category: e.category, description: e.description, amount: e.amount, currency: e.currency, date: e.date, isRecurring: e.isRecurring || 0 });
            await storage.createExpense(validated);
            imported.expenses++;
          } catch {}
        }
      }

      if (Array.isArray(goalsData)) {
        for (const g of goalsData) {
          try {
            const validated = insertGoalSchema.parse({ title: g.title, emoji: g.emoji, targetAmount: g.targetAmount, currentAmount: g.currentAmount, monthlyContribution: g.monthlyContribution, targetDate: g.targetDate, color: g.color, notes: g.notes });
            await storage.createGoal(validated);
            imported.goals++;
          } catch {}
        }
      }

      if (Array.isArray(debtsData)) {
        for (const d of debtsData) {
          try {
            const validated = insertDebtSchema.parse({ name: d.name, type: d.type, emoji: d.emoji, interestRate: d.interestRate, totalAmount: d.totalAmount, remainingAmount: d.remainingAmount, monthlyPayment: d.monthlyPayment, dueDay: d.dueDay, endDate: d.endDate, notes: d.notes, color: d.color });
            await storage.createDebt(validated);
            imported.debts++;
          } catch {}
        }
      }

      if (Array.isArray(subsData)) {
        for (const s of subsData) {
          try {
            const validated = insertSubscriptionSchema.parse({ name: s.name, logo: s.logo, color: s.color, price: s.price, billingDay: s.billingDay, category: s.category, isActive: s.isActive });
            await storage.createSubscription(validated);
            imported.subscriptions++;
          } catch {}
        }
      }

      if (Array.isArray(notesData)) {
        for (const n of notesData) {
          try {
            const validated = insertNoteSchema.parse({ title: n.title, content: n.content, category: n.category, tags: n.tags || [], mood: n.mood, assetTicker: n.assetTicker, isPinned: n.isPinned || 0, isArchived: n.isArchived || 0 });
            await storage.createNote(validated);
            imported.notes++;
          } catch {}
        }
      }

      res.json({
        message: `İçe aktarma tamamlandı: ${imported.assets} varlık, ${imported.transactions} işlem, ${imported.incomes} gelir, ${imported.expenses} gider, ${imported.goals} hedef, ${imported.debts} borç, ${imported.notes} not`,
        imported,
      });
    } catch (error) {
      console.error("Backup import error:", error);
      res.status(500).json({ error: "İçe aktarma sırasında hata oluştu" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
