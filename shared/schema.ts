import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const assetTypeEnum = z.enum(["hisse", "etf", "kripto", "madeni_para", "fon"]);
export type AssetType = z.infer<typeof assetTypeEnum>;

export const marketEnum = z.enum(["BIST", "US", "Diğer"]);
export type Market = z.infer<typeof marketEnum>;

export const transactionTypeEnum = z.enum(["alış", "satış"]);
export type TransactionType = z.infer<typeof transactionTypeEnum>;

export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  market: text("market").notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull().default("0"),
  averagePrice: decimal("average_price", { precision: 18, scale: 8 }).notNull(),
  currentPrice: decimal("current_price", { precision: 18, scale: 8 }).notNull(),
  currency: text("currency").notNull().default("TRY"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assets).omit({ id: true, createdAt: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assets.$inferSelect;

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull(),
  type: text("type").notNull(),
  quantity: decimal("quantity", { precision: 18, scale: 8 }).notNull(),
  price: decimal("price", { precision: 18, scale: 8 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 18, scale: 8 }).notNull(),
  currency: text("currency").notNull().default("TRY"),
  notes: text("notes"),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions, {
  date: z.coerce.date(),
}).omit({ id: true, createdAt: true });

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type PortfolioSummary = {
  totalAssets: number;
  totalInvested: number;
  totalDebt: number;
  netWorth: number;
  monthlyChange: number;
  monthlyChangeAmount: number;
};

export type AssetAllocation = {
  type: AssetType;
  name: string;
  value: number;
  percentage: number;
  color: string;
};

export type MonthlyPerformance = {
  month: string;
  value: number;
};

export type AssetDetail = Asset & {
  totalValue: number;
  totalValueTRY: number;
  change: number;
  changeAmount: number;
  profit: number;
  profitTRY: number;
};

export const incomeCategories = ["maaş", "kira", "temettü", "faiz", "serbest", "diğer"] as const;
export const expenseCategories = ["market", "faturalar", "ulaşım", "sağlık", "eğlence", "giyim", "yemek", "kira", "kredi", "sigorta", "diğer"] as const;
export type IncomeCategory = typeof incomeCategories[number];
export type ExpenseCategory = typeof expenseCategories[number];

export const incomes = pgTable("incomes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("TRY"),
  date: timestamp("date").notNull(),
  isRecurring: integer("is_recurring").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIncomeSchema = createInsertSchema(incomes, { date: z.coerce.date() }).omit({ id: true, createdAt: true });
export type InsertIncome = z.infer<typeof insertIncomeSchema>;
export type Income = typeof incomes.$inferSelect;

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("TRY"),
  date: timestamp("date").notNull(),
  isRecurring: integer("is_recurring").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expenses, { date: z.coerce.date() }).omit({ id: true, createdAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  emoji: text("emoji").notNull().default("🎯"),
  targetAmount: decimal("target_amount", { precision: 18, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  monthlyContribution: decimal("monthly_contribution", { precision: 18, scale: 2 }).notNull().default("0"),
  targetDate: text("target_date"),
  color: text("color").notNull().default("#00D4AA"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGoalSchema = createInsertSchema(goals).omit({ id: true, createdAt: true });
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type Goal = typeof goals.$inferSelect;

export const debts = pgTable("debts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull().default("loan"),
  emoji: text("emoji").notNull().default("💳"),
  interestRate: decimal("interest_rate", { precision: 8, scale: 4 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 18, scale: 2 }).notNull(),
  remainingAmount: decimal("remaining_amount", { precision: 18, scale: 2 }).notNull(),
  monthlyPayment: decimal("monthly_payment", { precision: 18, scale: 2 }).notNull().default("0"),
  dueDay: integer("due_day"),
  endDate: text("end_date"),
  notes: text("notes"),
  color: text("color").notNull().default("#FF4757"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDebtSchema = createInsertSchema(debts).omit({ id: true, createdAt: true }).extend({
  dueDay: z.union([z.number().int(), z.null()]).optional(),
  endDate: z.string().nullish().transform(v => v || null),
  notes: z.string().nullish().transform(v => v || null),
});

export type InsertDebt = z.infer<typeof insertDebtSchema>;
export type Debt = typeof debts.$inferSelect;

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  logo: text("logo").notNull().default("S"),
  color: text("color").notNull().default("#4B9EFF"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  billingDay: integer("billing_day").notNull().default(1),
  category: text("category").notNull().default("dijital"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

export type BudgetSummary = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  incomeByCategory: { category: string; amount: number; percentage: number }[];
  expenseByCategory: { category: string; amount: number; percentage: number }[];
};

// ─── Not Defteri ────────────────────────────────────────────────────────────────
export const notes = pgTable("notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  category: text("category").notNull().default("other"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  mood: text("mood"),
  assetTicker: text("asset_ticker"),
  isPinned: integer("is_pinned").notNull().default(0),
  isArchived: integer("is_archived").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNoteSchema = createInsertSchema(notes).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  tags: z.array(z.string()).optional().default([]),
  mood: z.string().nullish().transform(v => v || null),
  assetTicker: z.string().nullish().transform(v => v || null),
});

export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

// ─── Bütçe Bakiye Anlık Görüntüsü ───────────────────────────────────────────
export const budgetSnapshots = pgTable("budget_balance_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(), // 'YYYY-MM-DD'
  balance: decimal("balance", { precision: 18, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BudgetSnapshot = typeof budgetSnapshots.$inferSelect;
