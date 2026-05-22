import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Plus, TrendingUp, TrendingDown, Wallet, Trash2, Pencil, Check, PiggyBank, BarChart2 } from "lucide-react";
import type { Income, Expense, BudgetSummary, PortfolioSummary } from "@shared/schema";
import { incomeCategories, expenseCategories, insertIncomeSchema, insertExpenseSchema } from "@shared/schema";

const INCOME_COLORS = ["#00D4AA","#4B9EFF","#A78BFA","#FFB833","#10B981","#34D399"];
const EXPENSE_COLORS = ["#FF4757","#FF6B6B","#FF8E53","#FFB833","#F5A623","#A78BFA","#6366F1","#4B9EFF","#34D399","#00D4AA","#8892A4"];

const incomeCategoryLabels: Record<string, string> = { maaş:"Maaş", kira:"Kira Geliri", temettü:"Temettü", faiz:"Faiz", serbest:"Serbest Gelir", diğer:"Diğer" };
const expenseCategoryLabels: Record<string, string> = { market:"Market", faturalar:"Faturalar", ulaşım:"Ulaşım", sağlık:"Sağlık", eğlence:"Eğlence", giyim:"Giyim", yemek:"Yemek", kira:"Kira", kredi:"Kredi", sigorta:"Sigorta", diğer:"Diğer" };

const incomeFormSchema = insertIncomeSchema.extend({ amount: z.coerce.number().positive("Tutar pozitif olmalıdır") });
const expenseFormSchema = insertExpenseSchema.extend({ amount: z.coerce.number().positive("Tutar pozitif olmalıdır") });

const fmt = (amount: number) => amount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
const fmtDate = (date: Date | string) => new Date(date).toLocaleDateString("tr-TR");
const fmtDateForInput = (date?: Date | string): string => {
  if (!date) return new Date().toISOString().split('T')[0];
  try { const d = date instanceof Date ? date : new Date(date); if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0]; return d.toISOString().split('T')[0]; }
  catch { return new Date().toISOString().split('T')[0]; }
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="finos-card-inner p-3 text-xs shadow-xl">
      <p className="font-semibold text-[#F0F2F7]">{payload[0].name}</p>
      <p style={{ color: payload[0].payload.fill }}>{fmt(payload[0].value)}</p>
    </div>
  );
};

function FinosInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} className={`w-full px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors ${className}`} />
  );
}

export default function Budget() {
  const { toast } = useToast();
  const [kasaValue, setKasaValue] = useState<number>(() => parseFloat(localStorage.getItem("toplam_kasa") || "0"));
  const [isEditingKasa, setIsEditingKasa] = useState(false);
  const [kasaInput, setKasaInput] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"income" | "expense">("income");

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

  const incomePieData = (summary?.incomeByCategory || []).map((item, i) => ({ name: incomeCategoryLabels[item.category] || item.category, value: item.amount, fill: INCOME_COLORS[i % INCOME_COLORS.length] }));
  const expensePieData = (summary?.expenseByCategory || []).map((item, i) => ({ name: expenseCategoryLabels[item.category] || item.category, value: item.amount, fill: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }));

  const summaryCards = [
    { label: "Toplam Kasa", icon: PiggyBank, iconColor: "#00D4AA", isKasa: true },
    { label: "Toplam Gelir", icon: TrendingUp, iconColor: "#00D4AA", value: summary?.totalIncome || 0, valueColor: "#00D4AA", testId: "text-total-income" },
    { label: "Toplam Gider", icon: TrendingDown, iconColor: "#FF4757", value: summary?.totalExpense || 0, valueColor: "#FF4757", testId: "text-total-expense" },
    { label: "Portföy Kar/Zarar", icon: BarChart2, iconColor: "#8892A4", value: portfolioSummary?.monthlyChangeAmount || 0, valueColor: (portfolioSummary?.monthlyChangeAmount || 0) >= 0 ? "#00D4AA" : "#FF4757", testId: "text-portfolio-pnl", showSign: true },
    { label: "Toplam Bakiye", icon: Wallet, iconColor: "#4B9EFF", value: totalBakiye, valueColor: totalBakiye >= 0 ? "#00D4AA" : "#FF4757", testId: "text-total-balance", showSign: false },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#F0F2F7]" data-testid="heading-budget">Bütçe Takibi</h1>
        <p className="text-sm text-[#8892A4] mt-1">Gelir ve giderlerinizi yönetin</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {summaryCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="finos-card p-4" data-testid={i === 0 ? "card-total-kasa" : i === 1 ? "card-total-income" : i === 2 ? "card-total-expense" : i === 3 ? "card-portfolio-pnl" : "card-total-balance"}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#8892A4]">{card.label}</p>
                <Icon className="h-4 w-4" style={{ color: card.iconColor }} />
              </div>
              {card.isKasa ? (
                isEditingKasa ? (
                  <div className="flex items-center gap-1 mt-1">
                    <FinosInput autoFocus value={kasaInput} onChange={e => setKasaInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveKasa(); if (e.key === "Escape") setIsEditingKasa(false); }}
                      data-testid="input-kasa" />
                    <button onClick={saveKasa} className="p-1.5 rounded-lg hover:bg-[rgba(0,212,170,0.1)] text-[#00D4AA] transition-colors" data-testid="button-save-kasa">
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-end justify-between gap-2 mt-1">
                    <p className="text-xl font-bold font-mono text-[#00D4AA]" data-testid="text-total-kasa">{fmt(kasaValue)}</p>
                    <button onClick={() => { setKasaInput(kasaValue.toString()); setIsEditingKasa(true); }} className="p-1 rounded-lg hover:bg-[rgba(255,255,255,0.04)] text-[#4E5A6B] hover:text-[#F0F2F7] transition-colors" data-testid="button-edit-kasa">
                      <Pencil className="h-3 w-3" />
                    </button>
                  </div>
                )
              ) : summaryLoading ? (
                <div className="h-8 w-28 skeleton-shimmer mt-1" />
              ) : (
                <p className="text-xl font-bold font-mono mt-1" style={{ color: card.valueColor }} data-testid={card.testId}>
                  {card.showSign && (card.value || 0) >= 0 ? "+" : ""}{fmt(card.value || 0)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[{ title: "Gelir Dağılımı", data: incomePieData, empty: "Gelir verisi bulunmamaktadır", testId: "card-income-chart" },
          { title: "Gider Dağılımı", data: expensePieData, empty: "Gider verisi bulunmamaktadır", testId: "card-expense-chart" }].map(({ title, data, empty, testId }) => (
          <div key={title} className="finos-card p-5" data-testid={testId}>
            <h3 className="text-sm font-semibold text-[#F0F2F7] mb-4">{title}</h3>
            {summaryLoading ? <div className="h-[250px] skeleton-shimmer" /> :
              data.length === 0 ? (
                <div className="flex items-center justify-center h-[250px] text-[#4E5A6B] text-sm">{empty}</div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""} labelLine={false}>
                      {data.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "11px", color: "#8892A4" }} />
                  </PieChart>
                </ResponsiveContainer>
              )
            }
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="finos-card p-5">
        <div className="flex gap-2 mb-6">
          {[{ key: "income", label: "Gelirler" }, { key: "expense", label: "Giderler" }].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key as any)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: activeTab === key ? "rgba(0,212,170,0.1)" : "rgba(255,255,255,0.04)", color: activeTab === key ? "#00D4AA" : "#8892A4", border: activeTab === key ? "1px solid rgba(0,212,170,0.3)" : "1px solid rgba(255,255,255,0.06)" }}
              data-testid={`tab-${key}`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "income" ? (
          <div className="space-y-5">
            {/* Add Income Form */}
            <div className="finos-card-inner p-4">
              <h3 className="text-sm font-medium text-[#F0F2F7] mb-3">Gelir Ekle</h3>
              <Form {...incomeForm}>
                <form onSubmit={incomeForm.handleSubmit(data => createIncomeMutation.mutate(data))} className="grid gap-3 sm:grid-cols-5">
                  <FormField control={incomeForm.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-[#4E5A6B]">Kategori</FormLabel>
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
                      <FormLabel className="text-xs text-[#4E5A6B]">Açıklama</FormLabel>
                      <FormControl>
                        <FinosInput placeholder="Açıklama" {...field} data-testid="input-income-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={incomeForm.control} name="amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-[#4E5A6B]">Tutar (₺)</FormLabel>
                      <FormControl>
                        <FinosInput type="number" step="0.01" {...field} data-testid="input-income-amount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={incomeForm.control} name="date" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-[#4E5A6B]">Tarih</FormLabel>
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
            </div>

            {/* Income List */}
            {incomesLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 skeleton-shimmer" />)}</div>
            ) : incomes && incomes.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-3 px-3 pb-2 border-b border-[rgba(255,255,255,0.06)]">
                  {["Tarih","Kategori","Açıklama","Tutar",""].map((h, i) => (
                    <div key={i} className={`text-xs font-medium text-[#4E5A6B] ${i === 3 ? "text-right" : ""}`}>{h}</div>
                  ))}
                </div>
                {incomes.map(income => (
                  <div key={income.id} className="grid grid-cols-5 gap-3 px-3 py-3 rounded-lg hover:bg-[rgba(255,255,255,0.02)] transition-colors" data-testid={`row-income-${income.id}`}>
                    <span className="text-sm text-[#8892A4]">{fmtDate(income.date)}</span>
                    <span className="text-sm text-[#F0F2F7]">{incomeCategoryLabels[income.category] || income.category}</span>
                    <span className="text-sm text-[#8892A4] truncate">{income.description}</span>
                    <span className="text-sm font-mono text-right text-[#00D4AA] font-medium">{fmt(Number(income.amount))}</span>
                    <div className="flex justify-end">
                      <button onClick={() => deleteIncomeMutation.mutate(income.id)} disabled={deleteIncomeMutation.isPending}
                        className="p-1.5 rounded-lg hover:bg-[rgba(255,71,87,0.1)] text-[#4E5A6B] hover:text-[#FF4757] transition-colors"
                        data-testid={`button-delete-income-${income.id}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[#4E5A6B] text-sm">Henüz gelir eklenmemiş</div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {/* Add Expense Form */}
            <div className="finos-card-inner p-4">
              <h3 className="text-sm font-medium text-[#F0F2F7] mb-3">Gider Ekle</h3>
              <Form {...expenseForm}>
                <form onSubmit={expenseForm.handleSubmit(data => createExpenseMutation.mutate(data))} className="grid gap-3 sm:grid-cols-5">
                  <FormField control={expenseForm.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-[#4E5A6B]">Kategori</FormLabel>
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
                      <FormLabel className="text-xs text-[#4E5A6B]">Açıklama</FormLabel>
                      <FormControl>
                        <FinosInput placeholder="Açıklama" {...field} data-testid="input-expense-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={expenseForm.control} name="amount" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-[#4E5A6B]">Tutar (₺)</FormLabel>
                      <FormControl>
                        <FinosInput type="number" step="0.01" {...field} data-testid="input-expense-amount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={expenseForm.control} name="date" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-[#4E5A6B]">Tarih</FormLabel>
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
            </div>

            {/* Expense List */}
            {expensesLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 skeleton-shimmer" />)}</div>
            ) : expenses && expenses.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-5 gap-3 px-3 pb-2 border-b border-[rgba(255,255,255,0.06)]">
                  {["Tarih","Kategori","Açıklama","Tutar",""].map((h, i) => (
                    <div key={i} className={`text-xs font-medium text-[#4E5A6B] ${i === 3 ? "text-right" : ""}`}>{h}</div>
                  ))}
                </div>
                {expenses.map(expense => (
                  <div key={expense.id} className="grid grid-cols-5 gap-3 px-3 py-3 rounded-lg hover:bg-[rgba(255,255,255,0.02)] transition-colors" data-testid={`row-expense-${expense.id}`}>
                    <span className="text-sm text-[#8892A4]">{fmtDate(expense.date)}</span>
                    <span className="text-sm text-[#F0F2F7]">{expenseCategoryLabels[expense.category] || expense.category}</span>
                    <span className="text-sm text-[#8892A4] truncate">{expense.description}</span>
                    <span className="text-sm font-mono text-right text-[#FF4757] font-medium">{fmt(Number(expense.amount))}</span>
                    <div className="flex justify-end">
                      <button onClick={() => deleteExpenseMutation.mutate(expense.id)} disabled={deleteExpenseMutation.isPending}
                        className="p-1.5 rounded-lg hover:bg-[rgba(255,71,87,0.1)] text-[#4E5A6B] hover:text-[#FF4757] transition-colors"
                        data-testid={`button-delete-expense-${expense.id}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[#4E5A6B] text-sm">Henüz gider eklenmemiş</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
