import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useMemo, forwardRef } from "react";
import {
  Wallet, TrendingUp, TrendingDown, BarChart3, Database,
  Pencil, Plus, Utensils, AlertTriangle, Sparkles, CreditCard,
  Trash2, Edit2, Check, PiggyBank,
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
import type { Income, Expense, BudgetSummary, PortfolioSummary } from "@shared/schema";
import { incomeCategories, expenseCategories, insertIncomeSchema, insertExpenseSchema } from "@shared/schema";

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

const incomeFormSchema = insertIncomeSchema.extend({ amount: z.coerce.number().positive("Tutar pozitif olmalıdır") });
const expenseFormSchema = insertExpenseSchema.extend({ amount: z.coerce.number().positive("Tutar pozitif olmalıdır") });

const envelopesMock = [
  { id: 1, emoji: "🛒", name: "Market", spent: 3420, limit: 4000, daysLeft: 3 },
  { id: 2, emoji: "🍽️", name: "Yemek", spent: 1850, limit: 2500, daysLeft: 3 },
  { id: 3, emoji: "🚗", name: "Ulaşım", spent: 920, limit: 1500, daysLeft: 3 },
  { id: 4, emoji: "⚡", name: "Faturalar", spent: 1200, limit: 1500, daysLeft: 3 },
  { id: 5, emoji: "🎮", name: "Eğlence", spent: 680, limit: 1000, daysLeft: 3 },
  { id: 6, emoji: "🏠", name: "Kira", spent: 8500, limit: 8500, daysLeft: 3 },
  { id: 7, emoji: "💊", name: "Sağlık", spent: 450, limit: 1000, daysLeft: 3 },
  { id: 8, emoji: "📚", name: "Eğitim", spent: 250, limit: 500, daysLeft: 3 },
];

const subscriptionsMock = [
  { id: 1, name: "Netflix", logo: "N", color: "#E50914", price: 149, billingDate: "15 Haz", unused: false },
  { id: 2, name: "Spotify", logo: "S", color: "#1DB954", price: 49, billingDate: "20 Haz", unused: false },
  { id: 3, name: "iCloud 200GB", logo: "☁️", color: "#007AFF", price: 19, billingDate: "1 Haz", unused: false },
  { id: 4, name: "YouTube Premium", logo: "▶", color: "#FF0000", price: 79, billingDate: "25 Haz", unused: true },
  { id: 5, name: "Amazon Prime", logo: "P", color: "#FF9900", price: 39, billingDate: "5 Haz", unused: true },
  { id: 6, name: "ChatGPT Plus", logo: "◯", color: "#10A37F", price: 314, billingDate: "10 Haz", unused: false },
];

const cashFlowEventsMock = [
  { id: 1, name: "Maaş günü", type: "income" as const, amount: 45000, date: "1 Haz" },
  { id: 2, name: "Kira ödeme", type: "expense" as const, amount: 8500, date: "5 Haz" },
  { id: 3, name: "Kredi kartı", type: "expense" as const, amount: 12500, date: "15 Haz" },
  { id: 4, name: "Fatura", type: "expense" as const, amount: 1200, date: "20 Haz" },
];

const aiInsightsMock = [
  { icon: Utensils, text: "Bu ay dışarıda yemek harcamanız %47 arttı", type: "warning" as const },
  { icon: CreditCard, text: "Son 90 günde kahveye ₺8.420 harcadınız", type: "info" as const },
  { icon: AlertTriangle, text: "Bu hızla devam ederseniz ay sonu ₺2.100 açık verirsiniz", type: "danger" as const },
];

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

export default function Budget() {
  const { toast } = useToast();
  const [kasaValue, setKasaValue] = useState<number>(() => parseFloat(localStorage.getItem("toplam_kasa") || "0"));
  const [isEditingKasa, setIsEditingKasa] = useState(false);
  const [kasaInput, setKasaInput] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"gelirler" | "giderler">("gelirler");
  const [activeTab2, setActiveTab2] = useState<"income" | "expense">("income");

  const saveKasa = () => {
    const parsed = parseFloat(kasaInput.replace(",", "."));
    if (!isNaN(parsed) && parsed >= 0) { setKasaValue(parsed); localStorage.setItem("toplam_kasa", parsed.toString()); }
    setIsEditingKasa(false);
  };

  const { data: summary, isLoading: summaryLoading } = useQuery<BudgetSummary>({ queryKey: ["/api/budget/summary"] });
  const { data: portfolioSummary } = useQuery<PortfolioSummary>({ queryKey: ["/api/portfolio/summary"] });
  const { data: incomes, isLoading: incomesLoading } = useQuery<Income[]>({ queryKey: ["/api/incomes"] });
  const { data: expenses, isLoading: expensesLoading } = useQuery<Expense[]>({ queryKey: ["/api/expenses"] });

  const incomeForm = useForm({ resolver: zodResolver(incomeFormSchema), defaultValues: { category: "maaş", description: "", amount: 0, currency: "TRY", date: new Date(), isRecurring: 0 } });
  const expenseForm = useForm({ resolver: zodResolver(expenseFormSchema), defaultValues: { category: "market", description: "", amount: 0, currency: "TRY", date: new Date(), isRecurring: 0 } });

  const createIncomeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof incomeFormSchema>) => { const r = await apiRequest("POST", "/api/incomes", { ...data, amount: data.amount.toString() }); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/incomes"] }); queryClient.invalidateQueries({ queryKey: ["/api/budget/summary"] }); incomeForm.reset(); toast({ title: "Başarılı", description: "Gelir eklendi" }); },
    onError: () => toast({ title: "Hata", description: "Gelir eklenemedi", variant: "destructive" }),
  });
  const createExpenseMutation = useMutation({
    mutationFn: async (data: z.infer<typeof expenseFormSchema>) => { const r = await apiRequest("POST", "/api/expenses", { ...data, amount: data.amount.toString() }); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/expenses"] }); queryClient.invalidateQueries({ queryKey: ["/api/budget/summary"] }); expenseForm.reset(); toast({ title: "Başarılı", description: "Gider eklendi" }); },
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

  const totalBakiye = kasaValue + (summary?.totalIncome || 0) - (summary?.totalExpense || 0) + (portfolioSummary?.monthlyChangeAmount || 0);

  const incomePieData = useMemo(() => (summary?.incomeByCategory || []).map((item, i) => ({ name: incomeCategoryLabels[item.category] || item.category, value: item.amount, fill: INCOME_COLORS[i % INCOME_COLORS.length] })), [summary]);
  const expensePieData = useMemo(() => (summary?.expenseByCategory || []).map((item, i) => ({ name: expenseCategoryLabels[item.category] || item.category, value: item.amount, fill: EXPENSE_COLORS[i % EXPENSE_COLORS.length] })), [summary]);

  const monthlySubscription = subscriptionsMock.reduce((sum, s) => sum + s.price, 0);
  const yearlySubscription = monthlySubscription * 12;
  const netFreeCash = totalBakiye > 0 ? totalBakiye * 0.15 : 0;

  const getProgressColor = (percent: number) => {
    if (percent < 60) return "#00D4AA";
    if (percent < 80) return "#FFB833";
    return "#FF4757";
  };

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
        <button onClick={() => { setActiveTab("gelirler"); setActiveTab2("income"); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "gelirler" ? "bg-white text-[#080A0F]" : "bg-[#151A23] text-[#8892A4] hover:text-[#F0F2F7]"}`}>
          Gelirler
        </button>
        <button onClick={() => { setActiveTab("giderler"); setActiveTab2("expense"); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "giderler" ? "bg-white text-[#080A0F]" : "bg-[#151A23] text-[#8892A4] hover:text-[#F0F2F7]"}`}>
          Giderler
        </button>
      </div>

      {/* ZARFLAMA SİSTEMİ */}
      <div className="finos-card p-5">
        <h2 className="text-base font-semibold text-[#F0F2F7] mb-4">Zarflama Sistemi</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {envelopesMock.map((envelope) => {
            const percent = (envelope.spent / envelope.limit) * 100;
            const progressColor = getProgressColor(percent);
            const isWarning = envelope.daysLeft <= 5 && percent > 70;
            return (
              <div key={envelope.id} className="finos-card-inner p-4 group hover:border-[rgba(255,255,255,0.15)] transition-all cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{envelope.emoji}</span>
                    <span className="text-sm font-medium text-[#F0F2F7]">{envelope.name}</span>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 text-xs text-[#8892A4] hover:text-[#F0F2F7] hover:bg-[rgba(255,255,255,0.05)] rounded">
                    Düzenle
                  </button>
                </div>
                <p className="text-sm font-mono text-[#8892A4] mb-2">{fmtCurrency(envelope.spent)} / {fmtCurrency(envelope.limit)}</p>
                <div className="relative h-2 bg-[#0E1117] rounded-full overflow-hidden mb-2">
                  <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(percent, 100)}%`, backgroundColor: progressColor }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium" style={{ color: progressColor }}>%{percent.toFixed(1)}</span>
                  {isWarning && (
                    <span className="flex items-center gap-1 text-xs text-[#FFB833]">{envelope.daysLeft} gün kaldı <AlertTriangle className="w-3 h-3" /></span>
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
                    <FinosInput type="number" step="0.01" {...field} data-testid="input-income-amount" />
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
                  <Plus className="h-4 w-4" /> Ekle
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
                    <FinosInput type="number" step="0.01" {...field} data-testid="input-expense-amount" />
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
                  <Plus className="h-4 w-4" /> Ekle
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
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1.5 hover:bg-[rgba(255,255,255,0.05)] rounded transition-colors"><Edit2 className="w-4 h-4 text-[#4E5A6B] hover:text-[#8892A4]" /></button>
                          <button onClick={() => deleteIncomeMutation.mutate(item.id)} disabled={deleteIncomeMutation.isPending}
                            className="p-1.5 hover:bg-[rgba(255,71,87,0.1)] rounded transition-colors" data-testid={`button-delete-income-${item.id}`}>
                            <Trash2 className="w-4 h-4 text-[#4E5A6B] hover:text-[#FF4757]" />
                          </button>
                        </div>
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
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1.5 hover:bg-[rgba(255,255,255,0.05)] rounded transition-colors"><Edit2 className="w-4 h-4 text-[#4E5A6B] hover:text-[#8892A4]" /></button>
                          <button onClick={() => deleteExpenseMutation.mutate(item.id)} disabled={deleteExpenseMutation.isPending}
                            className="p-1.5 hover:bg-[rgba(255,71,87,0.1)] rounded transition-colors" data-testid={`button-delete-expense-${item.id}`}>
                            <Trash2 className="w-4 h-4 text-[#4E5A6B] hover:text-[#FF4757]" />
                          </button>
                        </div>
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

      {/* ABONELİK TAKİPÇİSİ */}
      <div className="finos-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#F0F2F7]">Abonelikler</h2>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-[#8892A4]">Aylık: <span className="font-mono text-[#F0F2F7]">{fmtCurrency(monthlySubscription)}</span></span>
            <span className="text-[#8892A4]">Yıllık: <span className="font-mono text-[#F0F2F7]">{fmtCurrency(yearlySubscription)}</span></span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {subscriptionsMock.map((sub) => (
            <div key={sub.id} className="finos-card-inner p-3 group hover:border-[rgba(255,255,255,0.15)] transition-all relative">
              {sub.unused && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-[#FFB833] rounded-full text-[10px] font-medium text-[#080A0F] z-10">3 aydır kullanılmadı</div>
              )}
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg mb-2" style={{ backgroundColor: sub.color }}>{sub.logo}</div>
                <span className="text-xs font-medium text-[#F0F2F7] mb-1">{sub.name}</span>
                <span className="text-xs font-mono text-[#8892A4] mb-1">{fmtCurrency(sub.price)}/ay</span>
                <span className="text-[10px] text-[#4E5A6B]">{sub.billingDate}</span>
                <button className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 text-xs text-[#FF4757] hover:bg-[rgba(255,71,87,0.1)] rounded"
                  onClick={() => toast({ title: "Bilgi", description: `${sub.name} iptal edilecek (demo)`, variant: "default" })}>
                  İptal
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM ROW: Cash Flow + AI Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Nakit Akış Projeksiyonu */}
        <div className="lg:col-span-2 finos-card p-5">
          <h2 className="text-base font-semibold text-[#F0F2F7] mb-4">Önümüzdeki 30 Gün</h2>
          <div className="flex items-center gap-4 mb-6 overflow-x-auto finos-scrollbar pb-2">
            {cashFlowEventsMock.map((event, index) => (
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
                {index < cashFlowEventsMock.length - 1 && <div className="w-12 h-[2px] bg-[#4E5A6B] mx-2" />}
              </div>
            ))}
          </div>
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
            {aiInsightsMock.map((insight, index) => {
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
    </div>
  );
}
