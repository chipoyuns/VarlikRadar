import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo, forwardRef } from "react";
import {
  Wallet, TrendingUp, TrendingDown, BarChart3, Database,
  Pencil, Plus, Utensils, AlertTriangle, Sparkles, CreditCard,
  Trash2, Edit2, Check, PiggyBank, X, RefreshCw,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
} from "recharts";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import type { Income, Expense, BudgetSummary, PortfolioSummary, Subscription } from "@shared/schema";
import { incomeCategories, expenseCategories, insertIncomeSchema, insertExpenseSchema, insertSubscriptionSchema } from "@shared/schema";

const fmt = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtCurrency = (amount: number) => `₺${fmt(amount)}`;
const fmtDate = (date: Date | string) => new Date(date).toLocaleDateString("tr-TR");
const fmtDateForInput = (date?: Date | string): string => {
  if (!date) return new Date().toISOString().split("T")[0];
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
    return d.toISOString().split("T")[0];
  } catch { return new Date().toISOString().split("T")[0]; }
};

const INCOME_COLORS = ["#00D4AA", "#4B9EFF", "#A78BFA", "#FFB833", "#10B981", "#34D399"];
const EXPENSE_COLORS = ["#FF4757", "#FF6B6B", "#FF8E53", "#FFB833", "#F5A623", "#A78BFA", "#6366F1", "#4B9EFF", "#34D399", "#00D4AA", "#8892A4"];

const incomeCategoryLabels: Record<string, string> = { maaş: "Maaş", kira: "Kira Geliri", temettü: "Temettü", faiz: "Faiz", serbest: "Serbest Gelir", diğer: "Diğer" };
const expenseCategoryLabels: Record<string, string> = { market: "Market", faturalar: "Faturalar", ulaşım: "Ulaşım", sağlık: "Sağlık", eğlence: "Eğlence", giyim: "Giyim", yemek: "Yemek", kira: "Kira", kredi: "Kredi", sigorta: "Sigorta", diğer: "Diğer" };

const envelopeCategories = [
  { key: "market", emoji: "🛒", name: "Market", defaultLimit: 4000 },
  { key: "yemek", emoji: "🍽️", name: "Yemek", defaultLimit: 2500 },
  { key: "ulaşım", emoji: "🚗", name: "Ulaşım", defaultLimit: 1500 },
  { key: "faturalar", emoji: "⚡", name: "Faturalar", defaultLimit: 1500 },
  { key: "eğlence", emoji: "🎮", name: "Eğlence", defaultLimit: 1000 },
  { key: "kira", emoji: "🏠", name: "Kira", defaultLimit: 8500 },
  { key: "sağlık", emoji: "💊", name: "Sağlık", defaultLimit: 1000 },
  { key: "giyim", emoji: "👕", name: "Giyim", defaultLimit: 500 },
];

const incomeFormSchema = insertIncomeSchema.extend({ amount: z.coerce.number().positive("Tutar pozitif olmalıdır") });
const expenseFormSchema = insertExpenseSchema.extend({ amount: z.coerce.number().positive("Tutar pozitif olmalıdır") });
const subscriptionFormSchema = z.object({
  name: z.string().min(1, "Ad gereklidir"),
  logo: z.string().min(1, "Logo gereklidir"),
  color: z.string().default("#4B9EFF"),
  price: z.coerce.number().positive("Fiyat pozitif olmalıdır"),
  billingDay: z.coerce.number().min(1).max(31).default(1),
  category: z.string().default("dijital"),
  isActive: z.number().default(1),
});

const FinosInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => {
    return <input ref={ref} {...props} className={`w-full px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors ${className}`} />;
  }
);
FinosInput.displayName = "FinosInput";

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="finos-card-inner p-3 text-xs shadow-xl">
      <p className="font-semibold text-[#F0F2F7]">{payload[0].name}</p>
      <p style={{ color: payload[0].payload.fill }}>{fmtCurrency(payload[0].value)}</p>
    </div>
  );
};

const PRESET_COLORS = ["#E50914", "#1DB954", "#007AFF", "#FF0000", "#FF9900", "#10A37F", "#6366F1", "#FF4757", "#00D4AA", "#4B9EFF", "#A78BFA", "#FFB833"];

export default function Budget() {
  const { toast } = useToast();
  const [kasaValue, setKasaValue] = useState<number>(() => parseFloat(localStorage.getItem("toplam_kasa") || "0"));
  const [isEditingKasa, setIsEditingKasa] = useState(false);
  const [kasaInput, setKasaInput] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"gelirler" | "giderler">("gelirler");
  const [showSubDialog, setShowSubDialog] = useState(false);
  const [envelopeLimits, setEnvelopeLimits] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem("envelope_limits") || "{}"); } catch { return {}; }
  });
  const [editingEnvelope, setEditingEnvelope] = useState<string | null>(null);
  const [envelopeLimitInput, setEnvelopeLimitInput] = useState<string>("");

  const saveKasa = () => {
    const parsed = parseFloat(kasaInput.replace(",", "."));
    if (!isNaN(parsed) && parsed >= 0) { setKasaValue(parsed); localStorage.setItem("toplam_kasa", parsed.toString()); }
    setIsEditingKasa(false);
  };

  const { data: summary, isLoading: summaryLoading } = useQuery<BudgetSummary>({ queryKey: ["/api/budget/summary"] });
  const { data: portfolioSummary } = useQuery<PortfolioSummary>({ queryKey: ["/api/portfolio/summary"] });
  const { data: incomes, isLoading: incomesLoading } = useQuery<Income[]>({ queryKey: ["/api/incomes"] });
  const { data: expenses, isLoading: expensesLoading } = useQuery<Expense[]>({ queryKey: ["/api/expenses"] });
  const { data: subscriptionsList, isLoading: subsLoading } = useQuery<Subscription[]>({ queryKey: ["/api/subscriptions"] });

  const incomeForm = useForm({ resolver: zodResolver(incomeFormSchema), defaultValues: { category: "maaş", description: "", amount: 0, currency: "TRY", date: new Date(), isRecurring: 0 } });
  const expenseForm = useForm({ resolver: zodResolver(expenseFormSchema), defaultValues: { category: "market", description: "", amount: 0, currency: "TRY", date: new Date(), isRecurring: 0 } });
  const subForm = useForm({ resolver: zodResolver(subscriptionFormSchema), defaultValues: { name: "", logo: "", color: "#4B9EFF", price: 0, billingDay: 1, category: "dijital", isActive: 1 } });

  const createIncomeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof incomeFormSchema>) => { const r = await apiRequest("POST", "/api/incomes", { ...data, amount: data.amount.toString() }); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/incomes"] }); queryClient.invalidateQueries({ queryKey: ["/api/budget/summary"] }); incomeForm.reset({ category: "maaş", description: "", amount: 0, currency: "TRY", date: new Date(), isRecurring: 0 }); toast({ title: "Başarılı", description: "Gelir eklendi" }); },
    onError: () => toast({ title: "Hata", description: "Gelir eklenemedi", variant: "destructive" }),
  });
  const createExpenseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof expenseFormSchema>) => { const r = await apiRequest("POST", "/api/expenses", { ...data, amount: data.amount.toString() }); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/expenses"] }); queryClient.invalidateQueries({ queryKey: ["/api/budget/summary"] }); expenseForm.reset({ category: "market", description: "", amount: 0, currency: "TRY", date: new Date(), isRecurring: 0 }); toast({ title: "Başarılı", description: "Gider eklendi" }); },
    onError: () => toast({ title: "Hata", description: "Gider eklenemedi", variant: "destructive" }),
  });
  const deleteIncomeMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/incomes/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/incomes"] }); queryClient.invalidateQueries({ queryKey: ["/api/budget/summary"] }); toast({ title: "Başarılı", description: "Gelir silindi" }); },
    onError: () => toast({ title: "Hata", description: "Gelir silinemedi", variant: "destructive" }),
  });
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/expenses/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/expenses"] }); queryClient.invalidateQueries({ queryKey: ["/api/budget/summary"] }); toast({ title: "Başarılı", description: "Gider silindi" }); },
    onError: () => toast({ title: "Hata", description: "Gider silinemedi", variant: "destructive" }),
  });
  const createSubMutation = useMutation({
    mutationFn: async (data: z.infer<typeof subscriptionFormSchema>) => {
      const r = await apiRequest("POST", "/api/subscriptions", { ...data, price: data.price.toString() });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      subForm.reset({ name: "", logo: "", color: "#4B9EFF", price: 0, billingDay: 1, category: "dijital", isActive: 1 });
      setShowSubDialog(false);
      toast({ title: "Başarılı", description: "Abonelik eklendi" });
    },
    onError: () => toast({ title: "Hata", description: "Abonelik eklenemedi", variant: "destructive" }),
  });
  const deleteSubMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/subscriptions/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] }); toast({ title: "Başarılı", description: "Abonelik silindi" }); },
    onError: () => toast({ title: "Hata", description: "Abonelik silinemedi", variant: "destructive" }),
  });

  const totalBakiye = kasaValue + (summary?.totalIncome || 0) - (summary?.totalExpense || 0) + (portfolioSummary?.monthlyChangeAmount || 0);

  const incomePieData = useMemo(() => (summary?.incomeByCategory || []).map((item, i) => ({ name: incomeCategoryLabels[item.category] || item.category, value: item.amount, fill: INCOME_COLORS[i % INCOME_COLORS.length] })), [summary]);
  const expensePieData = useMemo(() => (summary?.expenseByCategory || []).map((item, i) => ({ name: expenseCategoryLabels[item.category] || item.category, value: item.amount, fill: EXPENSE_COLORS[i % EXPENSE_COLORS.length] })), [summary]);

  const monthlySubscription = useMemo(() => (subscriptionsList || []).filter(s => s.isActive === 1).reduce((sum, s) => sum + parseFloat(s.price), 0), [subscriptionsList]);
  const yearlySubscription = monthlySubscription * 12;

  const netFreeCash = totalBakiye > 0 ? totalBakiye * 0.15 : 0;

  const getProgressColor = (percent: number) => {
    if (percent < 60) return "#00D4AA";
    if (percent < 80) return "#FFB833";
    return "#FF4757";
  };

  // Current month expenses by category for envelope system
  const now = new Date();
  const currentMonthExpenses = useMemo(() => {
    return (expenses || []).filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [expenses]);

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    currentMonthExpenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + parseFloat(e.amount);
    });
    return map;
  }, [currentMonthExpenses]);

  const daysLeftInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

  const saveEnvelopeLimit = (key: string, value: number) => {
    const updated = { ...envelopeLimits, [key]: value };
    setEnvelopeLimits(updated);
    localStorage.setItem("envelope_limits", JSON.stringify(updated));
    setEditingEnvelope(null);
  };

  // Cash flow: recurring incomes and expenses in next 30 days
  const cashFlowEvents = useMemo(() => {
    const events: { id: string; name: string; type: "income" | "expense"; amount: number; date: string }[] = [];
    // Subscriptions (monthly)
    (subscriptionsList || []).filter(s => s.isActive === 1).forEach(s => {
      const day = s.billingDay;
      const daysUntil = day >= now.getDate()
        ? day - now.getDate()
        : new Date(now.getFullYear(), now.getMonth() + 1, day).getDate() - now.getDate() + new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      if (daysUntil <= 30) {
        const billingDate = new Date(now.getFullYear(), now.getMonth() + (day < now.getDate() ? 1 : 0), day);
        events.push({
          id: `sub-${s.id}`,
          name: s.name,
          type: "expense",
          amount: parseFloat(s.price),
          date: billingDate.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
        });
      }
    });
    // Recurring incomes
    (incomes || []).filter(i => i.isRecurring === 1).slice(0, 3).forEach(i => {
      events.push({
        id: `inc-${i.id}`,
        name: i.description || incomeCategoryLabels[i.category] || i.category,
        type: "income",
        amount: parseFloat(i.amount),
        date: "Her ay",
      });
    });
    // Recurring expenses
    (expenses || []).filter(e => e.isRecurring === 1).slice(0, 3).forEach(e => {
      events.push({
        id: `exp-${e.id}`,
        name: e.description || expenseCategoryLabels[e.category] || e.category,
        type: "expense",
        amount: parseFloat(e.amount),
        date: "Her ay",
      });
    });
    return events.slice(0, 6);
  }, [subscriptionsList, incomes, expenses]);

  // AI Insights from real data
  const aiInsights = useMemo(() => {
    const insights: { icon: any; text: string; type: "warning" | "info" | "danger" }[] = [];
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const prevMonthExpenses = (expenses || []).filter(e => {
      const d = new Date(e.date);
      return d >= prevMonth && d <= prevMonthEnd;
    });
    const prevTotal = prevMonthExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);
    const currTotal = currentMonthExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);

    if (prevTotal > 0 && currTotal > 0) {
      const change = ((currTotal - prevTotal) / prevTotal) * 100;
      if (change > 20) {
        insights.push({ icon: AlertTriangle, text: `Bu ay giderleriniz geçen aya göre %${Math.abs(change).toFixed(0)} arttı`, type: "warning" });
      } else if (change < -10) {
        insights.push({ icon: TrendingDown, text: `Bu ay giderleriniz geçen aya göre %${Math.abs(change).toFixed(0)} azaldı`, type: "info" });
      }
    }

    const topCategory = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0];
    if (topCategory) {
      insights.push({ icon: CreditCard, text: `En yüksek gider kategoriniz: ${expenseCategoryLabels[topCategory[0]] || topCategory[0]} (${fmtCurrency(topCategory[1])})`, type: "info" });
    }

    const monthlyIncome = (summary?.totalIncome || 0);
    const projectedExpense = currTotal + monthlySubscription;
    if (monthlyIncome > 0 && projectedExpense > monthlyIncome * 0.9) {
      insights.push({ icon: AlertTriangle, text: `Aylık giderleriniz gelirinizin %${Math.min(((projectedExpense / monthlyIncome) * 100), 999).toFixed(0)}'ine ulaşıyor`, type: "danger" });
    } else if (monthlyIncome > 0) {
      insights.push({ icon: Sparkles, text: `Aylık gelirinizin %${(((monthlyIncome - projectedExpense) / monthlyIncome) * 100).toFixed(0)}'ini biriktirme potansiyeliniz var`, type: "info" });
    }

    if (monthlySubscription > 0) {
      insights.push({ icon: CreditCard, text: `Aylık toplam abonelik maliyetiniz: ${fmtCurrency(monthlySubscription)}`, type: "info" });
    }

    if (insights.length === 0) {
      insights.push({ icon: Sparkles, text: "Gelir ve gider ekleyerek AI analizini aktif edin", type: "info" });
    }

    return insights.slice(0, 3);
  }, [expenses, currentMonthExpenses, expenseByCategory, summary, monthlySubscription]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold text-[#F0F2F7]" data-testid="heading-budget">Bütçe Takibi</h1>
        <p className="text-sm text-[#8892A4] mt-1">Gelir ve giderlerinizi yönetin</p>
      </div>

      {/* TOP STATS ROW - 5 CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Toplam Kasa */}
        <div className="finos-card p-4" data-testid="card-total-kasa">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="w-4 h-4 text-[#4B9EFF]" />
            <span className="text-xs text-[#8892A4]">Toplam Kasa</span>
          </div>
          {isEditingKasa ? (
            <div className="flex items-center gap-1">
              <FinosInput autoFocus type="number" value={kasaInput} onChange={e => setKasaInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveKasa(); if (e.key === "Escape") setIsEditingKasa(false); }}
                data-testid="input-kasa" />
              <button onClick={saveKasa} className="p-1.5 rounded-lg hover:bg-[rgba(0,212,170,0.1)] text-[#00D4AA] transition-colors" data-testid="button-save-kasa">
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold font-mono text-[#F0F2F7]" data-testid="text-total-kasa">{fmtCurrency(kasaValue)}</span>
              <button onClick={() => { setKasaInput(kasaValue.toString()); setIsEditingKasa(true); }} className="p-1 hover:bg-[rgba(255,255,255,0.05)] rounded transition-colors" data-testid="button-edit-kasa">
                <Pencil className="w-3 h-3 text-[#4E5A6B] hover:text-[#8892A4]" />
              </button>
            </div>
          )}
        </div>

        {/* Toplam Gelir */}
        <div className="finos-card p-4" data-testid="card-total-income">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#00D4AA]" />
            <span className="text-xs text-[#8892A4]">Toplam Gelir</span>
          </div>
          {summaryLoading ? <div className="h-7 w-24 skeleton-shimmer" /> : (
            <span className="text-lg font-semibold font-mono text-[#00D4AA]" data-testid="text-total-income">{fmtCurrency(summary?.totalIncome || 0)}</span>
          )}
        </div>

        {/* Toplam Gider */}
        <div className="finos-card p-4" data-testid="card-total-expense">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-[#FF4757]" />
            <span className="text-xs text-[#8892A4]">Toplam Gider</span>
          </div>
          {summaryLoading ? <div className="h-7 w-24 skeleton-shimmer" /> : (
            <span className="text-lg font-semibold font-mono text-[#FF4757]" data-testid="text-total-expense">{fmtCurrency(summary?.totalExpense || 0)}</span>
          )}
        </div>

        {/* Portföy Kar/Zarar */}
        <div className="finos-card p-4" data-testid="card-portfolio-pnl">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-[#00D4AA]" />
            <span className="text-xs text-[#8892A4]">Portföy Kar/Zarar</span>
          </div>
          {summaryLoading ? <div className="h-7 w-24 skeleton-shimmer" /> : (
            <span className={`text-lg font-semibold font-mono ${(portfolioSummary?.monthlyChangeAmount || 0) >= 0 ? "text-[#00D4AA]" : "text-[#FF4757]"}`} data-testid="text-portfolio-pnl">
              {(portfolioSummary?.monthlyChangeAmount || 0) >= 0 ? "+" : ""}{fmtCurrency(Math.abs(portfolioSummary?.monthlyChangeAmount || 0))}
            </span>
          )}
        </div>

        {/* Toplam Bakiye */}
        <div className="finos-card p-4" data-testid="card-total-balance">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-[#A78BFA]" />
            <span className="text-xs text-[#8892A4]">Toplam Bakiye</span>
          </div>
          {summaryLoading ? <div className="h-7 w-24 skeleton-shimmer" /> : (
            <span className={`text-lg font-semibold font-mono ${totalBakiye >= 0 ? "text-[#F0F2F7]" : "text-[#FF4757]"}`} data-testid="text-total-balance">{fmtCurrency(totalBakiye)}</span>
          )}
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gelir Dağılımı */}
        <div className="finos-card p-5" data-testid="card-income-chart">
          <h2 className="text-base font-semibold text-[#F0F2F7] mb-4">Gelir Dağılımı</h2>
          <div className="h-[200px]">
            {summaryLoading ? <div className="h-full skeleton-shimmer" /> :
              incomePieData.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-3 rounded-full border-2 border-dashed border-[#4E5A6B] flex items-center justify-center">
                      <TrendingUp className="w-8 h-8 text-[#4E5A6B]" />
                    </div>
                    <p className="text-sm text-[#4E5A6B]">Gelir verisi bulunmamaktadır</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={incomePieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                      {incomePieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend formatter={(value) => <span className="text-[#8892A4] text-xs">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )
            }
          </div>
        </div>

        {/* Gider Dağılımı */}
        <div className="finos-card p-5" data-testid="card-expense-chart">
          <h2 className="text-base font-semibold text-[#F0F2F7] mb-4">Gider Dağılımı</h2>
          <div className="h-[200px]">
            {summaryLoading ? <div className="h-full skeleton-shimmer" /> :
              expensePieData.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-3 rounded-full border-2 border-dashed border-[#4E5A6B] flex items-center justify-center">
                      <TrendingDown className="w-8 h-8 text-[#4E5A6B]" />
                    </div>
                    <p className="text-sm text-[#4E5A6B]">Gider verisi bulunmamaktadır</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                      {expensePieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend formatter={(value) => <span className="text-[#8892A4] text-xs">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )
            }
          </div>
        </div>
      </div>

      {/* TAB SWITCHER: Gelirler / Giderler */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab("gelirler")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "gelirler" ? "bg-white text-[#080A0F]" : "bg-[#151A23] text-[#8892A4] hover:text-[#F0F2F7]"}`}
          data-testid="tab-gelirler">Gelirler</button>
        <button onClick={() => setActiveTab("giderler")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "giderler" ? "bg-white text-[#080A0F]" : "bg-[#151A23] text-[#8892A4] hover:text-[#F0F2F7]"}`}
          data-testid="tab-giderler">Giderler</button>
      </div>

      {/* ZARFLAMA SİSTEMİ - Real Data */}
      <div className="finos-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#F0F2F7]">Zarflama Sistemi</h2>
          <span className="text-xs text-[#4E5A6B]">{now.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })} · {daysLeftInMonth} gün kaldı</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {envelopeCategories.map((envelope) => {
            const spent = expenseByCategory[envelope.key] || 0;
            const limit = envelopeLimits[envelope.key] ?? envelope.defaultLimit;
            const percent = limit > 0 ? (spent / limit) * 100 : 0;
            const progressColor = getProgressColor(percent);
            const isWarning = daysLeftInMonth <= 5 && percent > 70;
            const isEditing = editingEnvelope === envelope.key;
            return (
              <div key={envelope.key} className="finos-card-inner p-4 group hover:border-[rgba(255,255,255,0.15)] transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{envelope.emoji}</span>
                    <span className="text-sm font-medium text-[#F0F2F7]">{envelope.name}</span>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 text-xs text-[#8892A4] hover:text-[#F0F2F7] hover:bg-[rgba(255,255,255,0.05)] rounded"
                    onClick={() => { setEditingEnvelope(envelope.key); setEnvelopeLimitInput(limit.toString()); }}
                    data-testid={`button-edit-envelope-${envelope.key}`}>
                    Limit
                  </button>
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-1 mb-2">
                    <FinosInput type="number" value={envelopeLimitInput} onChange={e => setEnvelopeLimitInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveEnvelopeLimit(envelope.key, parseFloat(envelopeLimitInput) || limit); if (e.key === "Escape") setEditingEnvelope(null); }}
                      className="text-xs" />
                    <button onClick={() => saveEnvelopeLimit(envelope.key, parseFloat(envelopeLimitInput) || limit)}
                      className="p-1 rounded hover:bg-[rgba(0,212,170,0.1)] text-[#00D4AA]">
                      <Check className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <p className="text-sm font-mono text-[#8892A4] mb-2">{fmtCurrency(spent)} / {fmtCurrency(limit)}</p>
                )}
                <div className="relative h-2 bg-[#0E1117] rounded-full overflow-hidden mb-2">
                  <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: progressColor }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium" style={{ color: progressColor }}>%{Math.min(percent, 100).toFixed(1)}</span>
                  {isWarning && (
                    <span className="flex items-center gap-1 text-xs text-[#FFB833]">{daysLeftInMonth}g <AlertTriangle className="w-3 h-3" /></span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* GELİR/GİDER EKLE FORMU */}
      <div className="finos-card p-5">
        <h2 className="text-base font-semibold text-[#F0F2F7] mb-4">{activeTab === "gelirler" ? "Gelir Ekle" : "Gider Ekle"}</h2>
        {activeTab === "gelirler" ? (
          <Form {...incomeForm}>
            <form onSubmit={incomeForm.handleSubmit(data => createIncomeMutation.mutate(data))} className="grid gap-3 sm:grid-cols-5">
              <FormField control={incomeForm.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-[#8892A4]">Kategori</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-[#0E1117] border-[rgba(255,255,255,0.06)] text-[#F0F2F7] h-9" data-testid="select-income-category"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {incomeCategories.map(cat => <SelectItem key={cat} value={cat}>{incomeCategoryLabels[cat]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={incomeForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-[#8892A4]">Açıklama</FormLabel>
                  <FormControl>
                    <FinosInput placeholder="Açıklama" {...field} data-testid="input-income-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={incomeForm.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-[#8892A4]">Tutar (₺)</FormLabel>
                  <FormControl>
                    <FinosInput type="number" step="0.01" min="0" {...field} data-testid="input-income-amount" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={incomeForm.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-[#8892A4]">Tarih</FormLabel>
                  <FormControl>
                    <FinosInput type="date" value={fmtDateForInput(field.value)} onChange={e => field.onChange(new Date(e.target.value))} data-testid="input-income-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex items-end">
                <button type="submit" disabled={createIncomeMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-[#00D4AA] rounded-lg text-sm font-medium text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors disabled:opacity-50 w-full justify-center"
                  data-testid="button-add-income">
                  {createIncomeMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ekle
                </button>
              </div>
            </form>
          </Form>
        ) : (
          <Form {...expenseForm}>
            <form onSubmit={expenseForm.handleSubmit(data => createExpenseMutation.mutate(data))} className="grid gap-3 sm:grid-cols-5">
              <FormField control={expenseForm.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-[#8892A4]">Kategori</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-[#0E1117] border-[rgba(255,255,255,0.06)] text-[#F0F2F7] h-9" data-testid="select-expense-category"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {expenseCategories.map(cat => <SelectItem key={cat} value={cat}>{expenseCategoryLabels[cat]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={expenseForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-[#8892A4]">Açıklama</FormLabel>
                  <FormControl>
                    <FinosInput placeholder="Açıklama" {...field} data-testid="input-expense-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={expenseForm.control} name="amount" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-[#8892A4]">Tutar (₺)</FormLabel>
                  <FormControl>
                    <FinosInput type="number" step="0.01" min="0" {...field} data-testid="input-expense-amount" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={expenseForm.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-[#8892A4]">Tarih</FormLabel>
                  <FormControl>
                    <FinosInput type="date" value={fmtDateForInput(field.value)} onChange={e => field.onChange(new Date(e.target.value))} data-testid="input-expense-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="flex items-end">
                <button type="submit" disabled={createExpenseMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF4757] rounded-lg text-sm font-medium text-white hover:bg-[#FF4757]/90 transition-colors disabled:opacity-50 w-full justify-center"
                  data-testid="button-add-expense">
                  {createExpenseMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Ekle
                </button>
              </div>
            </form>
          </Form>
        )}
      </div>

      {/* GELİR / GİDER LİSTELERİ */}
      {activeTab === "gelirler" ? (
        <div className="finos-card p-5">
          <h2 className="text-base font-semibold text-[#F0F2F7] mb-4">Gelir Geçmişi</h2>
          {incomesLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 skeleton-shimmer" />)}</div>
          ) : incomes && incomes.length > 0 ? (
            <div className="overflow-x-auto finos-scrollbar">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.05)]">
                    <th className="text-left text-xs font-medium text-[#4E5A6B] uppercase tracking-wider py-3 px-4">Tarih</th>
                    <th className="text-left text-xs font-medium text-[#4E5A6B] uppercase tracking-wider py-3 px-4">Kategori</th>
                    <th className="text-left text-xs font-medium text-[#4E5A6B] uppercase tracking-wider py-3 px-4">Açıklama</th>
                    <th className="text-right text-xs font-medium text-[#4E5A6B] uppercase tracking-wider py-3 px-4">Tutar</th>
                    <th className="text-right text-xs font-medium text-[#4E5A6B] uppercase tracking-wider py-3 px-4">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {incomes.map((item) => (
                    <tr key={item.id} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                      <td className="py-3 px-4 text-sm text-[#8892A4] font-mono">{fmtDate(item.date)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs bg-[rgba(0,212,170,0.1)] text-[#00D4AA]">{incomeCategoryLabels[item.category] || item.category}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-[#F0F2F7]">{item.description}</td>
                      <td className="py-3 px-4 text-sm text-[#00D4AA] font-mono text-right">+{fmtCurrency(Number(item.amount))}</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => deleteIncomeMutation.mutate(item.id)} disabled={deleteIncomeMutation.isPending}
                          className="p-1.5 hover:bg-[rgba(255,71,87,0.1)] rounded transition-colors" data-testid={`button-delete-income-${item.id}`}>
                          <Trash2 className="w-4 h-4 text-[#4E5A6B] hover:text-[#FF4757]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-[#4E5A6B] text-sm">Henüz gelir eklenmemiş</div>
          )}
        </div>
      ) : (
        <div className="finos-card p-5">
          <h2 className="text-base font-semibold text-[#F0F2F7] mb-4">Gider Geçmişi</h2>
          {expensesLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 skeleton-shimmer" />)}</div>
          ) : expenses && expenses.length > 0 ? (
            <div className="overflow-x-auto finos-scrollbar">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.05)]">
                    <th className="text-left text-xs font-medium text-[#4E5A6B] uppercase tracking-wider py-3 px-4">Tarih</th>
                    <th className="text-left text-xs font-medium text-[#4E5A6B] uppercase tracking-wider py-3 px-4">Kategori</th>
                    <th className="text-left text-xs font-medium text-[#4E5A6B] uppercase tracking-wider py-3 px-4">Açıklama</th>
                    <th className="text-right text-xs font-medium text-[#4E5A6B] uppercase tracking-wider py-3 px-4">Tutar</th>
                    <th className="text-right text-xs font-medium text-[#4E5A6B] uppercase tracking-wider py-3 px-4">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((item) => (
                    <tr key={item.id} className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                      <td className="py-3 px-4 text-sm text-[#8892A4] font-mono">{fmtDate(item.date)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 rounded-full text-xs bg-[rgba(255,71,87,0.1)] text-[#FF4757]">{expenseCategoryLabels[item.category] || item.category}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-[#F0F2F7]">{item.description}</td>
                      <td className="py-3 px-4 text-sm text-[#FF4757] font-mono text-right">-{fmtCurrency(Number(item.amount))}</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => deleteExpenseMutation.mutate(item.id)} disabled={deleteExpenseMutation.isPending}
                          className="p-1.5 hover:bg-[rgba(255,71,87,0.1)] rounded transition-colors" data-testid={`button-delete-expense-${item.id}`}>
                          <Trash2 className="w-4 h-4 text-[#4E5A6B] hover:text-[#FF4757]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-[#4E5A6B] text-sm">Henüz gider eklenmemiş</div>
          )}
        </div>
      )}

      {/* ABONELİK TAKİPÇİSİ - Real Data */}
      <div className="finos-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#F0F2F7]">Abonelikler</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#8892A4]">Aylık: <span className="font-mono text-[#F0F2F7]">{fmtCurrency(monthlySubscription)}</span></span>
            <span className="text-sm text-[#8892A4]">Yıllık: <span className="font-mono text-[#F0F2F7]">{fmtCurrency(yearlySubscription)}</span></span>
            <button
              onClick={() => setShowSubDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00D4AA] text-[#080A0F] rounded-lg text-xs font-medium hover:bg-[#00D4AA]/90 transition-colors"
              data-testid="button-add-subscription">
              <Plus className="w-3.5 h-3.5" /> Abonelik Ekle
            </button>
          </div>
        </div>
        {subsLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-28 skeleton-shimmer rounded-xl" />)}
          </div>
        ) : (subscriptionsList || []).length === 0 ? (
          <div className="text-center py-10 text-[#4E5A6B] text-sm">
            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Henüz abonelik eklenmemiş</p>
            <p className="text-xs mt-1">Netflix, Spotify gibi aylık aboneliklerinizi takip edin</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {(subscriptionsList || []).map((sub) => (
              <div key={sub.id} className="finos-card-inner p-3 group hover:border-[rgba(255,255,255,0.15)] transition-all relative" data-testid={`card-subscription-${sub.id}`}>
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg mb-2" style={{ backgroundColor: sub.color }}>{sub.logo}</div>
                  <span className="text-xs font-medium text-[#F0F2F7] mb-1">{sub.name}</span>
                  <span className="text-xs font-mono text-[#8892A4] mb-1">{fmtCurrency(parseFloat(sub.price))}/ay</span>
                  <span className="text-[10px] text-[#4E5A6B]">Her {sub.billingDay}. gün</span>
                  <button
                    className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 text-xs text-[#FF4757] hover:bg-[rgba(255,71,87,0.1)] rounded flex items-center gap-1"
                    onClick={() => deleteSubMutation.mutate(sub.id)}
                    disabled={deleteSubMutation.isPending}
                    data-testid={`button-delete-subscription-${sub.id}`}>
                    <Trash2 className="w-3 h-3" /> Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM ROW: Cash Flow + AI Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Nakit Akış Projeksiyonu */}
        <div className="lg:col-span-2 finos-card p-5">
          <h2 className="text-base font-semibold text-[#F0F2F7] mb-4">Önümüzdeki 30 Gün</h2>
          {cashFlowEvents.length === 0 ? (
            <div className="text-center py-8 text-[#4E5A6B] text-sm">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nakit akışı hesaplamak için abonelik veya tekrar eden gelir/gider ekleyin</p>
            </div>
          ) : (
            <div className="flex items-center gap-4 mb-6 overflow-x-auto finos-scrollbar pb-2">
              {cashFlowEvents.map((event, index) => (
                <div key={event.id} className="flex items-center">
                  <div className="flex flex-col items-center min-w-[100px]">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${event.type === "income" ? "bg-[rgba(0,212,170,0.1)]" : "bg-[rgba(255,71,87,0.1)]"}`}>
                      {event.type === "income" ? <TrendingUp className="w-5 h-5 text-[#00D4AA]" /> : <TrendingDown className="w-5 h-5 text-[#FF4757]" />}
                    </div>
                    <span className="text-xs text-[#F0F2F7] font-medium text-center">{event.name}</span>
                    <span className={`text-xs font-mono ${event.type === "income" ? "text-[#00D4AA]" : "text-[#FF4757]"}`}>
                      {event.type === "income" ? "+" : "-"}{fmtCurrency(event.amount)}
                    </span>
                    <span className="text-[10px] text-[#4E5A6B]">{event.date}</span>
                  </div>
                  {index < cashFlowEvents.length - 1 && <div className="w-12 h-[2px] bg-[#4E5A6B] mx-2 flex-shrink-0" />}
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-[rgba(255,255,255,0.05)] pt-4">
            <span className="text-sm text-[#8892A4]">Net özgür harcanabilir:</span>
            <span className="ml-2 text-2xl font-bold font-mono text-[#00D4AA]">{fmtCurrency(netFreeCash)}</span>
          </div>
        </div>

        {/* AI Bütçe Analizi */}
        <div className="finos-card p-5 bg-[linear-gradient(135deg,rgba(167,139,250,0.05)_0%,rgba(167,139,250,0.02)_100%)] border-[rgba(167,139,250,0.2)]">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-[#A78BFA]" />
            <h2 className="text-base font-semibold text-[#F0F2F7]">AI Analizi</h2>
          </div>
          <div className="space-y-3">
            {aiInsights.map((insight, index) => {
              const Icon = insight.icon;
              const colors = {
                warning: { bg: "rgba(255,184,51,0.1)", text: "#FFB833" },
                info: { bg: "rgba(75,158,255,0.1)", text: "#4B9EFF" },
                danger: { bg: "rgba(255,71,87,0.1)", text: "#FF4757" },
              };
              const color = colors[insight.type];
              return (
                <div key={index} className="finos-card-inner p-3 flex items-start gap-3" style={{ borderColor: `${color.text}20` }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color.bg }}>
                    <Icon className="w-4 h-4" style={{ color: color.text }} />
                  </div>
                  <p className="text-sm text-[#8892A4] leading-relaxed">{insight.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ABONELİK EKLE DİYALOGU */}
      {showSubDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowSubDialog(false); }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-[#151A23] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-md shadow-2xl p-6" data-testid="dialog-add-subscription">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-[#F0F2F7]">Abonelik Ekle</h3>
              <button onClick={() => setShowSubDialog(false)} className="p-1.5 hover:bg-[rgba(255,255,255,0.05)] rounded-lg transition-colors">
                <X className="w-4 h-4 text-[#8892A4]" />
              </button>
            </div>
            <Form {...subForm}>
              <form onSubmit={subForm.handleSubmit(data => createSubMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={subForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-[#8892A4]">Servis Adı</FormLabel>
                      <FormControl>
                        <FinosInput placeholder="Netflix, Spotify..." {...field} data-testid="input-sub-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={subForm.control} name="logo" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-[#8892A4]">Logo (harf/emoji)</FormLabel>
                      <FormControl>
                        <FinosInput placeholder="N, S, ☁️..." {...field} data-testid="input-sub-logo" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={subForm.control} name="price" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-[#8892A4]">Aylık Ücret (₺)</FormLabel>
                      <FormControl>
                        <FinosInput type="number" step="0.01" min="0" {...field} data-testid="input-sub-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={subForm.control} name="billingDay" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-[#8892A4]">Fatura Günü (1-31)</FormLabel>
                      <FormControl>
                        <FinosInput type="number" min="1" max="31" {...field} data-testid="input-sub-billing-day" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={subForm.control} name="color" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-[#8892A4]">Renk</FormLabel>
                    <div className="flex items-center gap-2 flex-wrap">
                      {PRESET_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => field.onChange(c)}
                          className="w-7 h-7 rounded-lg transition-all hover:scale-110"
                          style={{ backgroundColor: c, boxShadow: field.value === c ? `0 0 0 2px #F0F2F7` : "none" }} />
                      ))}
                      <FinosInput type="color" value={field.value} onChange={e => field.onChange(e.target.value)}
                        className="w-7 h-7 p-0 cursor-pointer rounded-lg border-0" style={{ padding: "0" }} />
                    </div>
                  </FormItem>
                )} />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowSubDialog(false)}
                    className="flex-1 py-2.5 rounded-lg bg-[rgba(255,255,255,0.04)] text-sm text-[#8892A4] hover:text-[#F0F2F7] transition-colors">
                    İptal
                  </button>
                  <button type="submit" disabled={createSubMutation.isPending}
                    className="flex-1 py-2.5 rounded-lg bg-[#00D4AA] text-sm font-medium text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    data-testid="button-submit-subscription">
                    {createSubMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Ekle
                  </button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
}
