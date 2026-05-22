import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Target, TrendingUp, CheckCircle, X, Flame, AlertTriangle, Settings2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Goal } from "@shared/schema";
import type { PortfolioSummary } from "@shared/schema";

const fmt = (v: number) => v.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const fmtNum = (v: number) => v.toLocaleString("tr-TR", { maximumFractionDigits: 0 });

const GOAL_COLORS = ["#00D4AA", "#4B9EFF", "#FFB833", "#FF4757", "#A78BFA", "#FF6B6B", "#34D399"];
const GOAL_EMOJIS = ["🎯", "🏠", "✈️", "🏖️", "🛡️", "🚗", "📚", "💍", "🎓", "💰", "🏥", "🌍"];

function ProgressRing({ progress, size = 120, strokeWidth = 8, color = "#00D4AA" }: { progress: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="progress-ring -rotate-90" width={size} height={size}>
        <circle stroke="#151A23" strokeWidth={strokeWidth} fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
        <circle stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="transparent" r={radius} cx={size / 2} cy={size / 2}
          style={{ strokeDasharray: circumference, strokeDashoffset: offset, transition: "stroke-dashoffset 0.6s ease-in-out", filter: `drop-shadow(0 0 6px ${color}50)` }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold font-mono text-[#F0F2F7]">{Math.min(progress, 100)}%</span>
      </div>
    </div>
  );
}

/* ──────── Hedef Dialog ──────── */
function GoalDialog({ goal, open, onClose }: { goal?: Goal | null; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const isEdit = !!goal;
  const [form, setForm] = useState({
    title: "", emoji: "🎯", targetAmount: "", currentAmount: "0",
    monthlyContribution: "0", targetDate: "", color: "#00D4AA", notes: "",
  });

  useEffect(() => {
    if (goal) {
      setForm({
        title: goal.title, emoji: goal.emoji, targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount, monthlyContribution: goal.monthlyContribution,
        targetDate: goal.targetDate || "", color: goal.color, notes: goal.notes || "",
      });
    } else {
      setForm({ title: "", emoji: "🎯", targetAmount: "", currentAmount: "0", monthlyContribution: "0", targetDate: "", color: "#00D4AA", notes: "" });
    }
  }, [goal, open]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => { const r = await apiRequest("POST", "/api/goals", data); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/goals"] }); toast({ title: "Hedef eklendi" }); onClose(); },
    onError: () => toast({ title: "Hata", description: "Hedef eklenemedi", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof form) => { const r = await apiRequest("PATCH", `/api/goals/${goal!.id}`, data); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/goals"] }); toast({ title: "Hedef güncellendi" }); onClose(); },
    onError: () => toast({ title: "Hata", description: "Hedef güncellenemedi", variant: "destructive" }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.targetAmount) return;
    if (isEdit) updateMutation.mutate(form); else createMutation.mutate(form);
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(8,10,15,0.85)" }} onClick={onClose}>
      <div className="w-full max-w-lg finos-card p-6 rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#F0F2F7]">{isEdit ? "Hedefi Düzenle" : "Yeni Hedef"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-[#4E5A6B] hover:text-[#F0F2F7] transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Emoji seçici */}
          <div>
            <label className="text-xs text-[#4E5A6B] mb-2 block">İkon</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_EMOJIS.map(e => (
                <button key={e} type="button" onClick={() => setForm(f => ({ ...f, emoji: e }))}
                  className={`text-xl p-1.5 rounded-lg transition-all ${form.emoji === e ? "bg-[rgba(0,212,170,0.15)] ring-1 ring-[#00D4AA]" : "hover:bg-[rgba(255,255,255,0.04)]"}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          {/* Renk seçici */}
          <div>
            <label className="text-xs text-[#4E5A6B] mb-2 block">Renk</label>
            <div className="flex gap-2">
              {GOAL_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full transition-all ${form.color === c ? "ring-2 ring-offset-2 ring-offset-[#0E1117] scale-110" : ""}`}
                  style={{ backgroundColor: c, ringColor: c }} />
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs text-[#4E5A6B] mb-1 block">Hedef Adı *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ev Peşinatı, Tatil Fonu..."
                className="w-full px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors" required />
            </div>
            <div>
              <label className="text-xs text-[#4E5A6B] mb-1 block">Hedef Tutar (₺) *</label>
              <input type="number" value={form.targetAmount} onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))} placeholder="500000"
                className="w-full px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors" required />
            </div>
            <div>
              <label className="text-xs text-[#4E5A6B] mb-1 block">Mevcut Birikim (₺)</label>
              <input type="number" value={form.currentAmount} onChange={e => setForm(f => ({ ...f, currentAmount: e.target.value }))} placeholder="0"
                className="w-full px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors" />
            </div>
            <div>
              <label className="text-xs text-[#4E5A6B] mb-1 block">Aylık Katkı (₺)</label>
              <input type="number" value={form.monthlyContribution} onChange={e => setForm(f => ({ ...f, monthlyContribution: e.target.value }))} placeholder="5000"
                className="w-full px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors" />
            </div>
            <div>
              <label className="text-xs text-[#4E5A6B] mb-1 block">Hedef Tarih</label>
              <input value={form.targetDate} onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))} placeholder="Mart 2028"
                className="w-full px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-[#4E5A6B] mb-1 block">Not</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="İsteğe bağlı not..."
                className="w-full px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#8892A4] hover:text-[#F0F2F7] transition-colors">İptal</button>
            <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 bg-[#00D4AA] rounded-lg text-sm font-medium text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors disabled:opacity-50">
              {isPending ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Hedef Ekle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ──────── FIRE Ayarlar Dialog ──────── */
function FireSettingsDialog({ open, onClose, settings, onSave }: {
  open: boolean; onClose: () => void;
  settings: { currentAge: number; targetAge: number; monthlyExpenses: number };
  onSave: (s: { currentAge: number; targetAge: number; monthlyExpenses: number }) => void;
}) {
  const [form, setForm] = useState(settings);
  useEffect(() => { setForm(settings); }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(8,10,15,0.85)" }} onClick={onClose}>
      <div className="w-full max-w-sm finos-card p-6 rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#F0F2F7]">FIRE Ayarları</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-[#4E5A6B] hover:text-[#F0F2F7] transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4">
          {[
            { key: "currentAge", label: "Mevcut Yaşınız", placeholder: "30" },
            { key: "targetAge", label: "Hedef Emeklilik Yaşı", placeholder: "45" },
            { key: "monthlyExpenses", label: "Aylık Yaşam Gideriniz (₺)", placeholder: "20000" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-[#4E5A6B] mb-1 block">{label}</label>
              <input type="number" value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))} placeholder={placeholder}
                className="w-full px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors" />
            </div>
          ))}
          <p className="text-xs text-[#4E5A6B]">FIRE Hedefi = Aylık Gider × 12 × 25 (4% kuralı)</p>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#8892A4] hover:text-[#F0F2F7] transition-colors">İptal</button>
            <button onClick={() => { onSave(form); onClose(); }} className="flex-1 px-4 py-2 bg-[#00D4AA] rounded-lg text-sm font-medium text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors">Kaydet</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────── Hayatta Kalma Ayarlar Dialog ──────── */
function SurvivalSettingsDialog({ open, onClose, settings, onSave }: {
  open: boolean; onClose: () => void;
  settings: { rent: number; bills: number; food: number; other: number; cash: number };
  onSave: (s: { rent: number; bills: number; food: number; other: number; cash: number }) => void;
}) {
  const [form, setForm] = useState(settings);
  useEffect(() => { setForm(settings); }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(8,10,15,0.85)" }} onClick={onClose}>
      <div className="w-full max-w-sm finos-card p-6 rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-[#F0F2F7]">Hayatta Kalma Modu Ayarları</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-[#4E5A6B] hover:text-[#F0F2F7] transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4">
          {[
            { key: "rent", label: "Aylık Kira (₺)", placeholder: "8500" },
            { key: "bills", label: "Aylık Faturalar (₺)", placeholder: "1200" },
            { key: "food", label: "Aylık Yemek (₺)", placeholder: "4000" },
            { key: "other", label: "Diğer Aylık Giderler (₺)", placeholder: "0" },
            { key: "cash", label: "Mevcut Nakit / Acil Fon (₺)", placeholder: "116000" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-[#4E5A6B] mb-1 block">{label}</label>
              <input type="number" value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))} placeholder={placeholder}
                className="w-full px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors" />
            </div>
          ))}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#8892A4] hover:text-[#F0F2F7] transition-colors">İptal</button>
            <button onClick={() => { onSave(form); onClose(); }} className="flex-1 px-4 py-2 bg-[#FF4757] rounded-lg text-sm font-medium text-white hover:bg-[#FF4757]/90 transition-colors">Kaydet</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────── Ana Sayfa ──────── */
function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; } catch { return initial; }
  });
  const set = (v: T) => { setValue(v); localStorage.setItem(key, JSON.stringify(v)); };
  return [value, set] as const;
}

export default function Goals() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [fireSettingsOpen, setFireSettingsOpen] = useState(false);
  const [survivalSettingsOpen, setSurvivalSettingsOpen] = useState(false);

  const [fireSettings, setFireSettings] = useLocalStorage("fire_settings", { currentAge: 30, targetAge: 45, monthlyExpenses: 20000 });
  const [survivalSettings, setSurvivalSettings] = useLocalStorage("survival_settings", { rent: 8500, bills: 1200, food: 4000, other: 0, cash: 116000 });

  const { data: goals = [], isLoading } = useQuery<Goal[]>({ queryKey: ["/api/goals"] });
  const { data: portfolioSummary } = useQuery<PortfolioSummary>({ queryKey: ["/api/portfolio/summary"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/goals/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/goals"] }); toast({ title: "Hedef silindi" }); },
    onError: () => toast({ title: "Hata", description: "Hedef silinemedi", variant: "destructive" }),
  });

  const updateAmountMutation = useMutation({
    mutationFn: async ({ id, currentAmount }: { id: string; currentAmount: string }) => {
      const r = await apiRequest("PATCH", `/api/goals/${id}`, { currentAmount }); return r.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/goals"] }); },
  });

  /* FIRE hesaplama */
  const fireCalc = useMemo(() => {
    const netWorth = portfolioSummary?.netWorth || 0;
    const annualExpenses = fireSettings.monthlyExpenses * 12;
    const fireTarget = annualExpenses * 25;
    const progress = fireTarget > 0 ? Math.min(Math.round((netWorth / fireTarget) * 100), 100) : 0;
    const remaining = fireTarget - netWorth;
    const monthlyPassiveIncome = fireTarget * 0.04 / 12;
    const yearsLeft = fireSettings.targetAge - fireSettings.currentAge;
    const monthsLeft = Math.max(0, yearsLeft * 12);
    return { netWorth, fireTarget, progress, remaining, monthlyPassiveIncome, yearsLeft: Math.max(0, yearsLeft), monthsLeft: monthsLeft % 12, targetAge: fireSettings.targetAge };
  }, [fireSettings, portfolioSummary]);

  /* Hayatta kalma hesaplama */
  const survivalCalc = useMemo(() => {
    const totalMonthly = survivalSettings.rent + survivalSettings.bills + survivalSettings.food + survivalSettings.other;
    const months = totalMonthly > 0 ? Math.floor(survivalSettings.cash / totalMonthly) : 0;
    return { totalMonthly, months, ...survivalSettings };
  }, [survivalSettings]);

  const activeGoals = goals.filter(g => Number(g.currentAmount) < Number(g.targetAmount)).length;
  const completedGoals = goals.filter(g => Number(g.currentAmount) >= Number(g.targetAmount)).length;
  const totalTarget = goals.reduce((s, g) => s + Number(g.targetAmount), 0);
  const totalSaved = goals.reduce((s, g) => s + Number(g.currentAmount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#F0F2F7]">Hedefler</h1>
          <p className="text-sm text-[#8892A4] mt-1">Finansal hedeflerinizi takip edin</p>
        </div>
        <button
          onClick={() => { setEditGoal(null); setDialogOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#00D4AA] rounded-lg text-sm font-medium text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors"
          data-testid="button-new-goal"
        >
          <Plus className="h-4 w-4" /> Yeni Hedef
        </button>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Aktif Hedef", value: activeGoals, color: "#F0F2F7", suffix: "" },
          { label: "Tamamlanan", value: completedGoals, color: "#00D4AA", suffix: "" },
          { label: "Toplam Hedef", value: fmt(totalTarget), color: "#F0F2F7", suffix: "" },
          { label: "Toplam Birikim", value: fmt(totalSaved), color: "#00D4AA", suffix: "" },
        ].map((stat, i) => (
          <div key={i} className="finos-card p-4">
            <p className="text-xs text-[#8892A4] mb-1">{stat.label}</p>
            <p className="text-xl font-bold font-mono" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Hedef Kartları */}
      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[1,2].map(i => <div key={i} className="h-48 skeleton-shimmer finos-card" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="finos-card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[rgba(0,212,170,0.1)] flex items-center justify-center mx-auto mb-4">
            <Target className="h-8 w-8 text-[#00D4AA]" />
          </div>
          <p className="text-[#F0F2F7] font-medium mb-1">Henüz hedef eklenmemiş</p>
          <p className="text-sm text-[#4E5A6B] mb-4">İlk finansal hedefinizi eklemek için yukarıdaki butonu kullanın</p>
          <button onClick={() => { setEditGoal(null); setDialogOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#00D4AA] rounded-lg text-sm font-medium text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors mx-auto">
            <Plus className="h-4 w-4" /> Hedef Ekle
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {goals.map((goal) => {
            const progress = Math.min(Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100), 100);
            const remaining = Number(goal.targetAmount) - Number(goal.currentAmount);
            const monthlyContrib = Number(goal.monthlyContribution);
            const monthsToGo = monthlyContrib > 0 ? Math.ceil(remaining / monthlyContrib) : null;
            return (
              <div key={goal.id} className="finos-card p-5" style={{ borderLeft: `3px solid ${goal.color}` }} data-testid={`goal-card-${goal.id}`}>
                <div className="flex items-start gap-4">
                  <ProgressRing progress={progress} size={96} strokeWidth={7} color={goal.color} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{goal.emoji}</span>
                          <h3 className="text-sm font-bold text-[#F0F2F7] tracking-wide">{goal.title}</h3>
                          {progress >= 100 && <span className="text-xs px-1.5 py-0.5 rounded-full bg-[rgba(0,212,170,0.15)] text-[#00D4AA] font-medium">✓ Tamamlandı</span>}
                        </div>
                        {goal.targetDate && <p className="text-xs text-[#4E5A6B] mt-0.5">Hedef: {goal.targetDate}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditGoal(goal); setDialogOpen(true); }}
                          className="p-1.5 rounded-lg hover:bg-[rgba(75,158,255,0.1)] text-[#4E5A6B] hover:text-[#4B9EFF] transition-colors" data-testid={`button-edit-goal-${goal.id}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteMutation.mutate(goal.id)} disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg hover:bg-[rgba(255,71,87,0.1)] text-[#4E5A6B] hover:text-[#FF4757] transition-colors" data-testid={`button-delete-goal-${goal.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {[
                        { label: "Birikim", value: fmt(Number(goal.currentAmount)), color: goal.color },
                        { label: "Hedef", value: fmt(Number(goal.targetAmount)), color: "#F0F2F7" },
                        { label: "Kalan", value: fmt(Math.max(0, remaining)), color: remaining > 0 ? "#FFB833" : "#00D4AA" },
                        { label: "Aylık Katkı", value: fmt(Number(goal.monthlyContribution)), color: "#F0F2F7" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="flex items-center justify-between text-xs">
                          <span className="text-[#4E5A6B]">{label}</span>
                          <span className="font-mono font-medium" style={{ color }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-4">
                  <div className="h-1.5 bg-[#151A23] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: goal.color, boxShadow: `0 0 8px ${goal.color}50` }} />
                  </div>
                </div>
                {/* Birikim güncelle */}
                <UpdateAmountRow goal={goal} onUpdate={(amt) => updateAmountMutation.mutate({ id: goal.id, currentAmount: amt })} color={goal.color} />
                {/* AI / bilgi */}
                {monthsToGo !== null && remaining > 0 && (
                  <div className="mt-2 p-2.5 rounded-xl flex items-center gap-2" style={{ backgroundColor: `${goal.color}12`, border: `1px solid ${goal.color}30` }}>
                    <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" style={{ color: goal.color }} />
                    <p className="text-xs" style={{ color: goal.color }}>
                      {monthlyContrib > 0 ? `${monthsToGo} ay sonra tamamlanır` : "Aylık katkı ayarla"} · {fmt(Number(goal.monthlyContribution))}/ay
                    </p>
                  </div>
                )}
                {progress >= 100 && (
                  <div className="mt-2 p-2.5 rounded-xl bg-[rgba(0,212,170,0.08)] border border-[rgba(0,212,170,0.2)] flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-[#00D4AA] flex-shrink-0" />
                    <p className="text-xs text-[#00D4AA]">Tebrikler! Bu hedefe ulaştınız 🎉</p>
                  </div>
                )}
                {goal.notes && (
                  <p className="text-xs text-[#4E5A6B] mt-2 italic">{goal.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── FİNANSAL ÖZGÜRLÜK SAYACI ── */}
      <div className="finos-card p-0 overflow-hidden" style={{ borderLeft: "3px solid #FFB833" }}>
        <div className="p-5 pb-4">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[rgba(255,184,51,0.15)] flex items-center justify-center">
                <Flame className="h-5 w-5 text-[#FFB833]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#F0F2F7] uppercase tracking-wider">Finansal Özgürlük Sayacı</h2>
                <p className="text-xs text-[#4E5A6B]">FIRE — Financial Independence, Retire Early</p>
              </div>
            </div>
            <button onClick={() => setFireSettingsOpen(true)} className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)] text-[#4E5A6B] hover:text-[#F0F2F7] transition-colors" data-testid="button-fire-settings">
              <Settings2 className="h-4 w-4" />
            </button>
          </div>

          {/* Ana gösterge */}
          <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
            <div className="text-center">
              <div className="flex items-baseline gap-2 justify-center">
                <span className="text-6xl font-black text-[#F0F2F7] font-mono">{fireCalc.targetAge}</span>
                <span className="text-lg text-[#8892A4]">yaşında özgürsün</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Dairesel progress */}
              <div className="relative w-28 h-28 flex-shrink-0">
                <svg viewBox="0 0 112 112" className="w-full h-full -rotate-90">
                  <circle cx="56" cy="56" r="46" fill="none" stroke="#151A23" strokeWidth="10" />
                  <circle cx="56" cy="56" r="46" fill="none" stroke="#FFB833" strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(fireCalc.progress / 100) * 289} 289`}
                    style={{ transition: "stroke-dasharray 1s ease", filter: "drop-shadow(0 0 6px rgba(255,184,51,0.4))" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black font-mono text-[#FFB833]">{fireCalc.progress}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-[#8892A4]">Hedefe</p>
                <p className="text-xl font-bold text-[#FFB833]">%{fireCalc.progress} yaklaştın</p>
                <p className="text-xs text-[#4E5A6B] mt-1">
                  {fireCalc.yearsLeft > 0 ? `${fireCalc.yearsLeft} yıl ${fireCalc.monthsLeft} ay kaldı` : "Hedefe ulaştınız! 🎉"}
                </p>
              </div>
            </div>
          </div>

          {/* Bilgi kartları */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              { label: "FIRE Hedefi", value: fmt(fireCalc.fireTarget), color: "#F0F2F7", sub: "25× yıllık gider" },
              { label: "Mevcut Net Değer", value: fmt(fireCalc.netWorth), color: "#00D4AA", sub: `%${fireCalc.progress} tamamlandı` },
              { label: "Aylık Pasif Gelir (FIRE'da)", value: fmt(fireCalc.monthlyPassiveIncome), color: "#4B9EFF", sub: "4% kuralı" },
              { label: "Kalan Süre", value: fireCalc.yearsLeft > 0 ? `${fireCalc.yearsLeft} yıl ${fireCalc.monthsLeft} ay` : "Tamamlandı", color: "#FFB833", sub: "tahmini" },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="finos-card-inner p-3 text-center rounded-xl">
                <p className="text-xs text-[#4E5A6B] mb-1">{label}</p>
                <p className="text-sm font-bold font-mono" style={{ color }}>{value}</p>
                <p className="text-xs text-[#4E5A6B] mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-[#151A23] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#FFB833] transition-all" style={{ width: `${fireCalc.progress}%`, boxShadow: "0 0 10px rgba(255,184,51,0.4)" }} />
          </div>
          <p className="text-xs text-[#4E5A6B] mt-2 text-center">4% kuralına göre hesaplanmıştır · Ayarlardan kişiselleştirebilirsiniz</p>
        </div>
      </div>

      {/* ── HAYATTA KALMA MODU ── */}
      <div className="finos-card p-0 overflow-hidden" style={{ borderLeft: "3px solid #FF4757" }}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[rgba(255,71,87,0.15)] flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-[#FF4757]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#F0F2F7] uppercase tracking-wider">Hayatta Kalma Modu</h2>
                <p className="text-xs text-[#4E5A6B]">İşsizlik senaryosu</p>
              </div>
            </div>
            <button onClick={() => setSurvivalSettingsOpen(true)} className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.04)] text-[#4E5A6B] hover:text-[#F0F2F7] transition-colors" data-testid="button-survival-settings">
              <Settings2 className="h-4 w-4" />
            </button>
          </div>

          {/* Büyük sayı */}
          <div className="text-center mb-2">
            <div className="flex items-baseline gap-3 justify-center">
              <span className="text-8xl font-black font-mono" style={{ color: survivalCalc.months <= 3 ? "#FF4757" : survivalCalc.months <= 6 ? "#FFB833" : "#00D4AA" }}>
                {survivalCalc.months}
              </span>
              <span className="text-4xl font-bold text-[#FF4757]">AY</span>
            </div>
            <p className="text-sm text-[#8892A4] mt-1">
              Bugün işini kaybetsen{" "}
              <span style={{ color: survivalCalc.months <= 3 ? "#FF4757" : survivalCalc.months <= 6 ? "#FFB833" : "#00D4AA" }} className="font-bold">
                {survivalCalc.months} ay
              </span>{" "}
              hayatta kalabilirsin
            </p>
          </div>

          {/* Gider kartları */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
            {[
              { label: "Aylık Kira", value: survivalCalc.rent, color: "#FF4757" },
              { label: "Aylık Faturalar", value: survivalCalc.bills, color: "#FFB833" },
              { label: "Aylık Yemek", value: survivalCalc.food, color: "#FF6B6B" },
              { label: "Toplam Aylık Gider", value: survivalCalc.totalMonthly, color: "#FF4757", highlight: true },
              { label: "Mevcut Nakit", value: survivalCalc.cash, color: "#00D4AA", highlight: true },
            ].map(({ label, value, color, highlight }) => (
              <div key={label} className={`p-3 rounded-xl text-center ${highlight ? "finos-card-inner" : "bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]"}`}>
                <p className="text-xs text-[#4E5A6B] mb-1">{label}</p>
                <p className="text-sm font-bold font-mono" style={{ color }}>{fmt(value)}</p>
              </div>
            ))}
          </div>

          {/* Ay takvimi */}
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-[#4E5A6B]">Ay:</span>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: 12 }, (_, i) => {
                  const month = i + 1;
                  const isCovered = month <= survivalCalc.months;
                  const isBorderline = month === survivalCalc.months;
                  return (
                    <div key={month}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all"
                      style={{
                        backgroundColor: isCovered ? "rgba(255,71,87,0.25)" : "rgba(255,255,255,0.04)",
                        color: isCovered ? "#FF4757" : "#4E5A6B",
                        border: isBorderline ? "1px solid #FF4757" : "1px solid transparent",
                        boxShadow: isBorderline ? "0 0 8px rgba(255,71,87,0.3)" : "none",
                      }}>
                      {month}
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-[#4E5A6B] mt-2">
              {survivalCalc.months <= 3 ? "⚠️ Kritik seviye! Acil fon oluşturmanız önerilir (6 aylık gider)." :
                survivalCalc.months <= 6 ? "Acil fonunuzu artırmayı düşünün. Hedef: 6–12 ay." :
                "✓ Acil fonunuz iyi görünüyor. 12+ ay için çalışmaya devam edin."}
            </p>
          </div>
        </div>
      </div>

      {/* Dialoglar */}
      <GoalDialog
        goal={editGoal}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditGoal(null); }}
      />
      <FireSettingsDialog
        open={fireSettingsOpen}
        onClose={() => setFireSettingsOpen(false)}
        settings={fireSettings}
        onSave={setFireSettings}
      />
      <SurvivalSettingsDialog
        open={survivalSettingsOpen}
        onClose={() => setSurvivalSettingsOpen(false)}
        settings={survivalSettings}
        onSave={setSurvivalSettings}
      />
    </div>
  );
}

/* ──────── Birikim güncelleme satırı ──────── */
function UpdateAmountRow({ goal, onUpdate, color }: { goal: Goal; onUpdate: (v: string) => void; color: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(goal.currentAmount);
  if (!editing) {
    return (
      <button onClick={() => { setVal(goal.currentAmount); setEditing(true); }}
        className="mt-2 text-xs text-[#4E5A6B] hover:text-[#F0F2F7] transition-colors flex items-center gap-1">
        <Pencil className="h-3 w-3" /> Birikimi güncelle
      </button>
    );
  }
  return (
    <div className="mt-2 flex items-center gap-2">
      <input type="number" value={val} onChange={e => setVal(e.target.value)} autoFocus
        className="flex-1 px-2 py-1 bg-[#151A23] border border-[rgba(255,255,255,0.1)] rounded-lg text-xs text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA] transition-colors"
        onKeyDown={e => { if (e.key === "Enter") { onUpdate(val); setEditing(false); } if (e.key === "Escape") setEditing(false); }} />
      <button onClick={() => { onUpdate(val); setEditing(false); }}
        className="px-2 py-1 rounded-lg text-xs font-medium text-[#080A0F] transition-colors" style={{ backgroundColor: color }}>
        Kaydet
      </button>
      <button onClick={() => setEditing(false)} className="px-2 py-1 rounded-lg text-xs text-[#4E5A6B] hover:text-[#F0F2F7] transition-colors">İptal</button>
    </div>
  );
}
