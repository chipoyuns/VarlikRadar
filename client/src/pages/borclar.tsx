import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  CreditCard, Car, Building2, User, Home, Wallet,
  Plus, Pencil, Trash2, X, Zap, Snowflake, Mountain,
  CheckCircle2, Sparkles, Clock, TrendingDown, Settings2, Check
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Debt } from "@shared/schema";

const fmt = (v: number) =>
  v.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const fmtR = (v: number) =>
  v.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });

/* ─── Tip config ─── */
const DEBT_TYPES: Record<string, { label: string; emoji: string; color: string; Icon: any }> = {
  credit:   { label: "Kredi Kartı",     emoji: "💳", color: "#FF4757", Icon: CreditCard },
  auto:     { label: "Taşıt Kredisi",   emoji: "🚗", color: "#A78BFA", Icon: Car },
  loan:     { label: "İhtiyaç Kredisi", emoji: "🏛️", color: "#FFB833", Icon: Building2 },
  personal: { label: "Kişisel Borç",   emoji: "👤", color: "#4B9EFF", Icon: User },
  mortgage: { label: "Konut Kredisi",   emoji: "🏠", color: "#00D4AA", Icon: Home },
  other:    { label: "Diğer",           emoji: "💰", color: "#8892A4", Icon: Wallet },
};

/* ─── Snowball / Avalanche algoritması ─── */
function simulatePayoff(
  rawDebts: Debt[],
  strategy: "snowball" | "avalanche"
) {
  if (rawDebts.length === 0) return { plan: [], totalMonths: 0, totalInterest: 0 };

  // Normalise
  type DS = { id: string; name: string; color: string; type: string; remaining: number; monthlyPayment: number; interestRate: number };
  const ds: DS[] = rawDebts.map(d => ({
    id: d.id, name: d.name, color: d.color, type: d.type,
    remaining: Number(d.remainingAmount),
    monthlyPayment: Number(d.monthlyPayment),
    interestRate: Number(d.interestRate),
  })).filter(d => d.remaining > 0 && d.monthlyPayment > 0);

  if (ds.length === 0) return { plan: [], totalMonths: 0, totalInterest: 0 };

  // Sort order for strategy
  const sorted = [...ds].sort((a, b) =>
    strategy === "snowball"
      ? a.remaining - b.remaining
      : b.interestRate - a.interestRate
  );

  // Simulate month by month
  const state = ds.map(d => ({ ...d, paid: false, payoffMonth: 0 }));
  const getState = (id: string) => state.find(s => s.id === id)!;

  let totalInterest = 0;
  let month = 0;
  let freePayment = 0; // rolled-over payments from paid-off debts
  const MAX_MONTHS = 600;

  while (state.some(s => !s.paid) && month < MAX_MONTHS) {
    month++;

    // Apply interest to all unpaid debts
    state.forEach(s => {
      if (!s.paid) {
        const interest = s.remaining * (s.interestRate / 100);
        s.remaining += interest;
        totalInterest += interest;
      }
    });

    // Determine focus debt (first unpaid in sorted order)
    const focusId = sorted.find(d => !getState(d.id).paid)?.id;

    // Pay minimums on all non-focus debts; extra goes to focus
    let extra = freePayment;
    state.forEach(s => {
      if (s.paid) return;
      const payment = s.id === focusId
        ? s.monthlyPayment + extra
        : s.monthlyPayment;
      s.remaining -= payment;
      if (s.remaining <= 0) {
        s.remaining = 0;
        s.paid = true;
        s.payoffMonth = month;
        freePayment += s.monthlyPayment; // roll over
      }
    });
  }

  // Build plan
  const plan = sorted.map((d, i) => {
    const s = getState(d.id);
    const prevPayoff = i === 0 ? 0 : getState(sorted[i - 1].id).payoffMonth;
    return {
      id: d.id, name: d.name, color: d.color, type: d.type,
      monthStart: prevPayoff + 1,
      monthEnd: s.payoffMonth,
      payoffMonth: s.payoffMonth,
    };
  });

  return { plan, totalMonths: month, totalInterest };
}

/* ─── useLocalStorage ─── */
function useLS<T>(key: string, init: T) {
  const [v, setV] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; } catch { return init; }
  });
  const set = (val: T) => { setV(val); localStorage.setItem(key, JSON.stringify(val)); };
  return [v, set] as const;
}

/* ─────────── Borç Ekleme / Düzenleme Dialog ─────────── */
function DebtDialog({ debt, open, onClose }: { debt?: Debt | null; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const isEdit = !!debt;
  const blank = {
    name: "", type: "loan", emoji: "🏛️",
    interestRate: "0", totalAmount: "", remainingAmount: "",
    monthlyPayment: "0", dueDay: "", endDate: "", notes: "", color: "#FFB833",
  };
  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (!open) return;
    if (debt) {
      setForm({
        name: debt.name, type: debt.type, emoji: debt.emoji,
        interestRate: debt.interestRate, totalAmount: debt.totalAmount,
        remainingAmount: debt.remainingAmount, monthlyPayment: debt.monthlyPayment,
        dueDay: debt.dueDay?.toString() || "", endDate: debt.endDate || "",
        notes: debt.notes || "", color: debt.color,
      });
    } else {
      setForm(blank);
    }
  }, [debt, open]);

  // Auto-fill emoji & color when type changes
  const handleTypeChange = (t: string) => {
    const cfg = DEBT_TYPES[t];
    setForm(f => ({ ...f, type: t, emoji: cfg.emoji, color: cfg.color }));
  };

  const buildPayload = (data: typeof form) => ({
    name: data.name,
    type: data.type,
    emoji: data.emoji,
    color: data.color,
    interestRate: data.interestRate || "0",
    totalAmount: data.totalAmount,
    remainingAmount: data.remainingAmount,
    monthlyPayment: data.monthlyPayment || "0",
    ...(data.dueDay ? { dueDay: parseInt(data.dueDay) } : {}),
    ...(data.endDate ? { endDate: data.endDate } : {}),
    ...(data.notes ? { notes: data.notes } : {}),
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const r = await apiRequest("POST", "/api/debts", buildPayload(data));
      return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/debts"] }); toast({ title: "✓ Borç eklendi" }); onClose(); },
    onError: (e: any) => toast({ title: "Hata", description: e?.message || "Borç eklenemedi", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const r = await apiRequest("PATCH", `/api/debts/${debt!.id}`, buildPayload(data));
      return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/debts"] }); toast({ title: "✓ Borç güncellendi" }); onClose(); },
    onError: (e: any) => toast({ title: "Hata", description: e?.message || "Borç güncellenemedi", variant: "destructive" }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.totalAmount || !form.remainingAmount) return;
    if (isEdit) updateMutation.mutate(form); else createMutation.mutate(form);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(8,10,15,0.88)" }} onClick={onClose}>
      <div className="w-full max-w-lg finos-card p-6 rounded-2xl my-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#F0F2F7]">{isEdit ? "Borcu Düzenle" : "Yeni Borç Ekle"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-[#4E5A6B] hover:text-[#F0F2F7] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tür seçimi */}
          <div>
            <label className="text-xs text-[#4E5A6B] mb-2 block">Borç Türü</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(DEBT_TYPES).map(([key, cfg]) => (
                <button key={key} type="button"
                  onClick={() => handleTypeChange(key)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left"
                  style={{
                    background: form.type === key ? `${cfg.color}20` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${form.type === key ? cfg.color : "rgba(255,255,255,0.06)"}`,
                    color: form.type === key ? cfg.color : "#4E5A6B",
                  }}>
                  <span className="text-base">{cfg.emoji}</span> {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ad */}
          <div>
            <label className="text-xs text-[#4E5A6B] mb-1 block">Borç Adı *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Garanti Kredi Kartı, Taşıt Kredisi..."
              className="w-full px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#4E5A6B] mb-1 block">Toplam Borç (₺) *</label>
              <input type="number" value={form.totalAmount}
                onChange={e => {
                  setForm(f => ({ ...f, totalAmount: e.target.value, remainingAmount: f.remainingAmount || e.target.value }));
                }}
                placeholder="100000"
                className="w-full px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors" required />
            </div>
            <div>
              <label className="text-xs text-[#4E5A6B] mb-1 block">Kalan Borç (₺) *</label>
              <input type="number" value={form.remainingAmount}
                onChange={e => setForm(f => ({ ...f, remainingAmount: e.target.value }))}
                placeholder="85000"
                className="w-full px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors" required />
            </div>
            <div>
              <label className="text-xs text-[#4E5A6B] mb-1 block">Aylık Taksit (₺)</label>
              <input type="number" value={form.monthlyPayment}
                onChange={e => setForm(f => ({ ...f, monthlyPayment: e.target.value }))}
                placeholder="4200"
                className="w-full px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors" />
            </div>
            <div>
              <label className="text-xs text-[#4E5A6B] mb-1 block">Aylık Faiz (%)</label>
              <input type="number" step="0.01" value={form.interestRate}
                onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))}
                placeholder="4.5"
                className="w-full px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors" />
            </div>
            <div>
              <label className="text-xs text-[#4E5A6B] mb-1 block">Vade Günü</label>
              <input type="number" min="1" max="31" value={form.dueDay}
                onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))}
                placeholder="15 (her ayın 15'i)"
                className="w-full px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors" />
            </div>
            <div>
              <label className="text-xs text-[#4E5A6B] mb-1 block">Bitiş Tarihi</label>
              <input value={form.endDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                placeholder="Ağu 2027"
                className="w-full px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors" />
            </div>
          </div>

          <div>
            <label className="text-xs text-[#4E5A6B] mb-1 block">Not</label>
            <input value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Opsiyonel not..."
              className="w-full px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#8892A4] hover:text-[#F0F2F7] transition-colors">
              İptal
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 px-4 py-2 bg-[#FF4757] rounded-lg text-sm font-medium text-white hover:bg-[#FF4757]/90 transition-colors disabled:opacity-50">
              {isPending ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Borç Ekle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────── Ödeme Yap satırı ─────────── */
function PaymentRow({ debt, onPay }: { debt: Debt; onPay: (amount: string) => void }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(debt.monthlyPayment);
  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="mt-2 text-xs text-[#4E5A6B] hover:text-[#00D4AA] transition-colors flex items-center gap-1">
      <Check className="h-3 w-3" /> Ödeme Yaptım
    </button>
  );
  return (
    <div className="mt-2 flex items-center gap-2">
      <input type="number" value={val} onChange={e => setVal(e.target.value)} autoFocus
        className="flex-1 px-2 py-1 bg-[#151A23] border border-[rgba(255,255,255,0.1)] rounded-lg text-xs text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA] transition-colors"
        onKeyDown={e => { if (e.key === "Enter") { onPay(val); setOpen(false); } if (e.key === "Escape") setOpen(false); }} />
      <button onClick={() => { onPay(val); setOpen(false); }}
        className="px-2 py-1 rounded-lg text-xs font-medium bg-[#00D4AA] text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors">
        Onayla
      </button>
      <button onClick={() => setOpen(false)} className="px-2 py-1 rounded-lg text-xs text-[#4E5A6B] hover:text-[#F0F2F7] transition-colors">İptal</button>
    </div>
  );
}

/* ─────────── Ana Sayfa ─────────── */
export default function Debts() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [strategy, setStrategy] = useLS<"snowball" | "avalanche">("debt_strategy", "avalanche");
  const [planApplied, setPlanApplied] = useLS<boolean>("debt_plan_applied", false);
  const [planStrategy, setPlanStrategy] = useLS<string>("debt_plan_strategy", "");

  const { data: debtsList = [], isLoading } = useQuery<Debt[]>({ queryKey: ["/api/debts"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/debts/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/debts"] }); toast({ title: "✓ Borç silindi" }); },
    onError: () => toast({ title: "Hata", description: "Borç silinemedi", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const r = await apiRequest("PATCH", `/api/debts/${id}`, data); return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/debts"] }); },
  });

  // Pay down a debt
  const handlePayment = (debt: Debt, amount: string) => {
    const paid = parseFloat(amount);
    if (isNaN(paid) || paid <= 0) return;
    const newRemaining = Math.max(0, Number(debt.remainingAmount) - paid);
    updateMutation.mutate({ id: debt.id, data: { remainingAmount: newRemaining.toFixed(2) } });
    toast({ title: `✓ ${fmt(paid)} ödeme kaydedildi` });
  };

  /* ─── Hesaplamalar ─── */
  const totalDebt = debtsList.reduce((s, d) => s + Number(d.remainingAmount), 0);
  const totalMonthly = debtsList.reduce((s, d) => s + Number(d.monthlyPayment), 0);
  const highestInterest = debtsList.length > 0 ? Math.max(...debtsList.map(d => Number(d.interestRate))) : 0;

  const snowballSim = useMemo(() => simulatePayoff(debtsList, "snowball"), [debtsList]);
  const avalancheSim = useMemo(() => simulatePayoff(debtsList, "avalanche"), [debtsList]);
  const activeSim = strategy === "snowball" ? snowballSim : avalancheSim;

  // Earliest payoff date estimate
  const debtFreeDate = useMemo(() => {
    if (activeSim.totalMonths <= 0) return null;
    const d = new Date();
    d.setMonth(d.getMonth() + activeSim.totalMonths);
    return d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  }, [activeSim]);

  const interestSaving = Math.abs(snowballSim.totalInterest - avalancheSim.totalInterest);
  const monthSaving = Math.abs(snowballSim.totalMonths - avalancheSim.totalMonths);
  const betterStrategy = avalancheSim.totalInterest <= snowballSim.totalInterest ? "avalanche" : "snowball";

  const handleApplyPlan = () => {
    setPlanApplied(true);
    setPlanStrategy(strategy);
    toast({
      title: `✓ ${strategy === "snowball" ? "Kartopu" : "Çığ"} planı uygulandı!`,
      description: `${activeSim.totalMonths} ayda borçsuz olma hedefi aktif.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#F0F2F7]">Borçlar</h1>
          <p className="text-sm text-[#8892A4] mt-1">Borçlarınızı takip edin ve optimize edin</p>
        </div>
        <button
          onClick={() => { setEditDebt(null); setDialogOpen(true); }}
          data-testid="button-add-debt"
          className="flex items-center gap-2 px-4 py-2 bg-[#FF4757] rounded-lg text-sm font-medium text-white hover:bg-[#FF4757]/90 transition-colors">
          <Plus className="h-4 w-4" /> Borç Ekle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="finos-card p-4">
          <p className="text-xs text-[#8892A4] mb-1">Toplam Borç</p>
          <p className="text-xl font-bold font-mono text-[#FF4757]">{fmt(totalDebt)}</p>
        </div>
        <div className="finos-card p-4">
          <p className="text-xs text-[#8892A4] mb-1">Aylık Ödeme</p>
          <p className="text-xl font-bold font-mono text-[#FFB833]">{fmt(totalMonthly)}</p>
        </div>
        <div className="finos-card p-4">
          <p className="text-xs text-[#8892A4] mb-1">En Yüksek Faiz</p>
          <p className="text-xl font-bold font-mono text-[#FF4757]">
            {highestInterest > 0 ? `%${highestInterest}/ay` : "—"}
          </p>
        </div>
        <div className="finos-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-3.5 h-3.5 text-[#00D4AA]" />
            <p className="text-xs text-[#8892A4]">Borçsuz Tarih</p>
          </div>
          <p className="text-lg font-bold font-mono text-[#00D4AA]">{debtFreeDate || "—"}</p>
        </div>
      </div>

      {/* Borç Kartları */}
      {isLoading ? (
        <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-36 skeleton-shimmer finos-card" />)}</div>
      ) : debtsList.length === 0 ? (
        <div className="finos-card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[rgba(255,71,87,0.1)] flex items-center justify-center mx-auto mb-4">
            <CreditCard className="h-8 w-8 text-[#FF4757]" />
          </div>
          <p className="text-[#F0F2F7] font-medium mb-1">Henüz borç eklenmemiş</p>
          <p className="text-sm text-[#4E5A6B] mb-4">Kredi kartı, kredi veya kişisel borcunuzu ekleyin</p>
          <button onClick={() => { setEditDebt(null); setDialogOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF4757] rounded-lg text-sm font-medium text-white hover:bg-[#FF4757]/90 transition-colors mx-auto">
            <Plus className="h-4 w-4" /> Borç Ekle
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {debtsList.map((debt) => {
            const total = Number(debt.totalAmount);
            const remaining = Number(debt.remainingAmount);
            const progress = total > 0 ? ((total - remaining) / total) * 100 : 0;
            const cfg = DEBT_TYPES[debt.type] || DEBT_TYPES.other;
            const Icon = cfg.Icon;
            const color = debt.color || cfg.color;

            // Days until due this month
            const now = new Date();
            let daysLeft: number | null = null;
            if (debt.dueDay) {
              const due = new Date(now.getFullYear(), now.getMonth(), debt.dueDay);
              if (due < now) due.setMonth(due.getMonth() + 1);
              daysLeft = Math.ceil((due.getTime() - now.getTime()) / 86400000);
            }

            return (
              <div key={debt.id} className="finos-card p-5 hover:border-[rgba(255,255,255,0.1)] transition-all"
                style={{ borderLeft: `3px solid ${color}` }}
                data-testid={`debt-card-${debt.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ backgroundColor: `${color}18` }}>
                      {debt.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-bold text-[#F0F2F7]">{debt.name}</h3>
                        <span className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: `${color}20`, color }}>
                          {cfg.label}
                        </span>
                        {planApplied && planStrategy === strategy &&
                          activeSim.plan[0]?.id === debt.id && (
                            <span className="px-2 py-0.5 rounded text-xs bg-[rgba(0,212,170,0.15)] text-[#00D4AA] flex items-center gap-1">
                              <Zap className="w-3 h-3" /> Öncelikli
                            </span>
                          )}
                      </div>
                      <div className="flex items-center gap-4 flex-wrap text-xs">
                        {Number(debt.interestRate) > 0 && (
                          <span className="px-2 py-0.5 rounded bg-[rgba(255,71,87,0.12)] text-[#FF4757] font-mono font-medium">
                            %{Number(debt.interestRate).toFixed(2)}/ay faiz
                          </span>
                        )}
                        {Number(debt.interestRate) === 0 && (
                          <span className="px-2 py-0.5 rounded bg-[rgba(0,212,170,0.12)] text-[#00D4AA]">
                            Faizsiz
                          </span>
                        )}
                        {Number(debt.monthlyPayment) > 0 && (
                          <span className="text-[#8892A4]">
                            Aylık: <span className="text-[#F0F2F7] font-mono">{fmt(Number(debt.monthlyPayment))}</span>
                          </span>
                        )}
                        {debt.dueDay && (
                          <span className="flex items-center gap-1 text-[#8892A4]">
                            <Clock className="w-3 h-3" />
                            Her ayın {debt.dueDay}'si
                            {daysLeft !== null && (
                              <span className={`ml-1 px-1.5 py-0.5 rounded font-medium ${daysLeft <= 5 ? "bg-[rgba(255,71,87,0.15)] text-[#FF4757]" : "bg-[rgba(255,184,51,0.15)] text-[#FFB833]"}`}>
                                {daysLeft} gün
                              </span>
                            )}
                          </span>
                        )}
                        {debt.endDate && (
                          <span className="text-[#8892A4]">
                            Bitiş: <span className="text-[#00D4AA]">{debt.endDate}</span>
                          </span>
                        )}
                        {debt.notes && (
                          <span className="text-[#4E5A6B] italic">{debt.notes}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="text-2xl font-bold font-mono" style={{ color }}>{fmt(remaining)}</p>
                    <p className="text-xs text-[#4E5A6B]">kalan</p>
                    {total !== remaining && (
                      <p className="text-xs text-[#8892A4] mt-0.5">/ {fmt(total)}</p>
                    )}
                    <div className="flex gap-1 mt-2 justify-end">
                      <button onClick={() => { setEditDebt(debt); setDialogOpen(true); }}
                        data-testid={`button-edit-debt-${debt.id}`}
                        className="p-1.5 rounded-lg hover:bg-[rgba(75,158,255,0.1)] text-[#4E5A6B] hover:text-[#4B9EFF] transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(debt.id)} disabled={deleteMutation.isPending}
                        data-testid={`button-delete-debt-${debt.id}`}
                        className="p-1.5 rounded-lg hover:bg-[rgba(255,71,87,0.1)] text-[#4E5A6B] hover:text-[#FF4757] transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[#4E5A6B]">Ödenen</span>
                    <span className="text-xs font-mono text-[#8892A4]">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-[#151A23] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.max(progress, 1)}%`, backgroundColor: progress > 0 ? "#00D4AA" : color, boxShadow: `0 0 6px ${color}40` }} />
                  </div>
                </div>

                {/* Ödeme yap */}
                {remaining > 0 && (
                  <PaymentRow debt={debt} onPay={(amt) => handlePayment(debt, amt)} />
                )}
                {remaining === 0 && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-[#00D4AA]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Bu borç kapatıldı 🎉
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Borçtan Çıkış Motoru ─── */}
      {debtsList.filter(d => Number(d.remainingAmount) > 0).length > 0 && (
        <div className="finos-card p-6" style={{ borderLeft: "3px solid #00D4AA" }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-[rgba(0,212,170,0.15)] flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#00D4AA]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F0F2F7]">Borçtan Çıkış Motoru</h2>
              <p className="text-xs text-[#4E5A6B]">En hızlı borçsuzluk stratejisi</p>
            </div>
            {planApplied && (
              <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(0,212,170,0.12)] border border-[rgba(0,212,170,0.25)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00D4AA]" />
                <span className="text-xs text-[#00D4AA] font-medium">Plan Aktif</span>
              </div>
            )}
          </div>

          {/* Strateji seçimi */}
          <div className="flex gap-2 mb-5">
            {[
              { key: "snowball", label: "Kartopu", Icon: Snowflake, color: "#4B9EFF", desc: "En küçük borçtan başla" },
              { key: "avalanche", label: "Çığ", Icon: Mountain, color: "#A78BFA", desc: "En yüksek faizden başla" },
            ].map(({ key, label, Icon, color, desc }) => (
              <button key={key} onClick={() => { setStrategy(key as any); setPlanApplied(false); }}
                className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: strategy === key ? `${color}20` : "#151A23",
                  border: `1.5px solid ${strategy === key ? color : "rgba(255,255,255,0.06)"}`,
                  color: strategy === key ? color : "#8892A4",
                }}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <div className="text-left">
                  <div className="font-semibold">{label}</div>
                  <div className="text-xs opacity-70">{desc}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Açıklama */}
          <div className="finos-card-inner p-4 mb-4 rounded-xl">
            <p className="text-sm text-[#8892A4]">
              {strategy === "avalanche"
                ? "En yüksek faizli borçtan başla — toplam faiz tasarrufu maximize edilir. Matematiksel olarak en optimal yöntem."
                : "En küçük borçtan başla — hızlı kapanan borçlar motivasyon sağlar ve ödeme gücü diğer borçlara aktarılır."}
            </p>
          </div>

          {/* Plan sırası */}
          {activeSim.plan.length > 0 && (
            <div className="space-y-2 mb-5">
              <p className="text-xs text-[#4E5A6B] mb-3 uppercase tracking-wider">Ödeme Sırası</p>
              {activeSim.plan.map((step, i) => {
                const cfg = DEBT_TYPES[step.type] || DEBT_TYPES.other;
                const Icon = cfg.Icon;
                const isFirst = i === 0;
                const debt = debtsList.find(d => d.id === step.id);
                const interest = debt ? Number(debt.interestRate) : 0;
                return (
                  <div key={step.id}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all"
                    style={{
                      background: isFirst && planApplied ? `${step.color}12` : "#151A23",
                      border: `1px solid ${isFirst && planApplied ? step.color + "40" : "transparent"}`,
                    }}>
                    <div className="w-16 text-xs font-mono text-[#4E5A6B] flex-shrink-0">
                      {step.monthStart === step.monthEnd
                        ? `Ay ${step.monthStart}`
                        : `Ay ${step.monthStart}–${step.monthEnd}`}
                    </div>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${step.color}20` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: step.color }} />
                    </div>
                    <span className="text-sm text-[#F0F2F7] flex-1">{step.name}</span>
                    {interest > 0 && (
                      <span className="px-2 py-0.5 rounded text-xs font-mono"
                        style={{ backgroundColor: `${step.color}20`, color: step.color }}>
                        %{interest}/ay
                      </span>
                    )}
                    {isFirst && planApplied && (
                      <span className="px-2 py-0.5 rounded bg-[rgba(0,212,170,0.15)] text-[#00D4AA] text-xs flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Odak
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Karşılaştırma */}
          {snowballSim.totalMonths > 0 && avalancheSim.totalMonths > 0 && (
            <div className="finos-card-inner p-4 mb-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Snowflake className="w-4 h-4 text-[#4B9EFF]" />
                  <span className="text-sm text-[#8892A4]">
                    Kartopu: <span className="text-[#F0F2F7] font-mono">{snowballSim.totalMonths} ay</span>
                    <span className="text-xs text-[#4E5A6B] ml-1">({fmtR(snowballSim.totalInterest)} faiz)</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mountain className="w-4 h-4 text-[#A78BFA]" />
                  <span className="text-sm text-[#8892A4]">
                    Çığ: <span className="text-[#F0F2F7] font-mono">{avalancheSim.totalMonths} ay</span>
                    <span className="text-xs text-[#4E5A6B] ml-1">({fmtR(avalancheSim.totalInterest)} faiz)</span>
                  </span>
                </div>
              </div>
              {interestSaving > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00D4AA]" />
                  <span className="text-sm text-[#00D4AA] font-medium">
                    {betterStrategy === "avalanche" ? "Çığ" : "Kartopu"}: {monthSaving > 0 ? `${monthSaving} ay erken + ` : ""}{fmtR(interestSaving)} faiz tasarrufu
                  </span>
                </div>
              )}
            </div>
          )}

          {/* AI içgörü */}
          {activeSim.plan.length > 0 && (
            <div className="finos-card-inner p-4 mb-4 rounded-xl border-l-2 border-[#A78BFA]">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[rgba(167,139,250,0.15)] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-[#A78BFA]" />
                </div>
                <div>
                  <p className="text-xs text-[#A78BFA] font-medium mb-1">Strateji İçgörüsü</p>
                  <p className="text-sm text-[#8892A4]">
                    {strategy === "avalanche"
                      ? `Çığ stratejisi ile ${activeSim.plan[0]?.name || "ilk borç"}'a odaklanarak toplam `
                      : `Kartopu stratejisi ile ${activeSim.plan[0]?.name || "ilk borç"}'ı kapatarak `}
                    <span className="text-[#00D4AA] font-medium">{activeSim.totalMonths} ayda</span> tamamen borçsuz olabilirsiniz.
                    {interestSaving > 0 && betterStrategy !== strategy &&
                      ` ${betterStrategy === "avalanche" ? "Çığ" : "Kartopu"} stratejisine geçerek ${fmtR(interestSaving)} ek faiz tasarruf edebilirsiniz.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Planı Uygula */}
          <button
            onClick={handleApplyPlan}
            disabled={activeSim.plan.length === 0}
            data-testid="button-apply-plan"
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            style={{
              background: planApplied && planStrategy === strategy
                ? "rgba(0,212,170,0.15)"
                : "#00D4AA",
              color: planApplied && planStrategy === strategy ? "#00D4AA" : "#080A0F",
              border: planApplied && planStrategy === strategy ? "1.5px solid #00D4AA" : "none",
            }}>
            {planApplied && planStrategy === strategy ? (
              <><CheckCircle2 className="w-4 h-4" /> Plan Aktif — {strategy === "snowball" ? "Kartopu" : "Çığ"} Stratejisi</>
            ) : (
              <><Zap className="w-4 h-4" /> Planı Uygula — {strategy === "snowball" ? "Kartopu" : "Çığ"} Stratejisi</>
            )}
          </button>
        </div>
      )}

      {/* Dialog */}
      <DebtDialog
        debt={editDebt}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditDebt(null); }}
      />
    </div>
  );
}
