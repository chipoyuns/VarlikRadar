import { useState, useEffect, useMemo, useRef } from "react";
import {
  User, Bell, Shield, Palette, Globe, CreditCard, Link2,
  ChevronRight, Check, Moon, Sun, Monitor, Smartphone, Mail, Upload, Download,
  TrendingUp, Trash2, AlertTriangle, Plus, X, Play, Pause, Edit2,
  ChevronDown, ChevronUp, Calendar, Clock, Search, ArrowUp, ArrowDown,
  RotateCcw, Type, Layout, Zap, Hash, RefreshCw, Eye, EyeOff,
} from "lucide-react";
import { useDisplayCurrency } from "@/lib/currency-context";
import { exportBackupJSON, importBackupJSON } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import type { Asset } from "@shared/schema";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type DcaFrequency = "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY";
type AlertCondition = "ABOVE" | "BELOW" | "PERCENT_CHANGE";

interface DcaExecution {
  id: string;
  amount: number;
  assetAmount?: number;
  priceAtTime?: number;
  executedAt: string;
  isManual: boolean;
}

interface DcaPlan {
  id: string;
  assetTicker: string;
  assetName: string;
  assetType: string;
  amount: number;
  frequency: DcaFrequency;
  nextDate: string;
  totalInvested: number;
  isActive: boolean;
  startDate: string;
  notes?: string;
  createdAt: string;
  executions: DcaExecution[];
}

interface PriceAlert {
  id: string;
  ticker: string;
  assetName: string;
  condition: AlertCondition;
  targetPrice: number;
  percentChange?: number;
  currentPrice: number;
  currency: string;
  isActive: boolean;
  isTriggered: boolean;
  triggeredAt?: string;
  repeatOnTrigger: boolean;
  notes?: string;
  createdAt: string;
}

interface AppearanceSettings {
  theme: "dark" | "light" | "system";
  accentColor: string;
  fontSize: "small" | "normal" | "large";
  density: "compact" | "normal" | "comfortable";
  animations: boolean;
  compactNumbers: boolean;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const FREQUENCY_LABELS: Record<DcaFrequency, string> = {
  DAILY: "Günlük",
  WEEKLY: "Haftalık",
  BIWEEKLY: "2 Haftada Bir",
  MONTHLY: "Aylık",
  QUARTERLY: "3 Ayda Bir",
};

const FREQUENCY_PER_YEAR: Record<DcaFrequency, number> = {
  DAILY: 365,
  WEEKLY: 52,
  BIWEEKLY: 26,
  MONTHLY: 12,
  QUARTERLY: 4,
};

const ACCENT_COLORS = [
  { id: "teal",   hex: "#00D4AA", label: "Teal" },
  { id: "blue",   hex: "#4B9EFF", label: "Mavi" },
  { id: "purple", hex: "#A78BFA", label: "Mor" },
  { id: "gold",   hex: "#FFB833", label: "Altın" },
  { id: "red",    hex: "#FF4757", label: "Kırmızı" },
];

const DEFAULT_APPEARANCE: AppearanceSettings = {
  theme: "dark",
  accentColor: "teal",
  fontSize: "normal",
  density: "normal",
  animations: true,
  compactNumbers: false,
};

// ─── LOCAL STORAGE HOOK ───────────────────────────────────────────────────────
function useLocalStorage<T>(key: string, defaultValue: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch { return defaultValue; }
  });
  const set = (v: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  };
  return [value, set];
}

// ─── APPEARANCE APPLY ─────────────────────────────────────────────────────────
function applyAppearance(settings: AppearanceSettings) {
  const root = document.documentElement;
  const accent = ACCENT_COLORS.find(c => c.id === settings.accentColor)?.hex ?? "#00D4AA";
  root.style.setProperty("--accent-primary", accent);
  root.style.setProperty("--accent-bg", `${accent}15`);
  root.style.setProperty("--accent-border", `${accent}30`);
  const fontSizeMap = { small: "13px", normal: "15px", large: "17px" };
  root.style.setProperty("--app-font-size", fontSizeMap[settings.fontSize]);
  if (!settings.animations) root.style.setProperty("--transition-speed", "0ms");
  else root.style.removeProperty("--transition-speed");
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function genId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function addFrequency(date: Date, freq: DcaFrequency): Date {
  const d = new Date(date);
  if (freq === "DAILY") d.setDate(d.getDate() + 1);
  else if (freq === "WEEKLY") d.setDate(d.getDate() + 7);
  else if (freq === "BIWEEKLY") d.setDate(d.getDate() + 14);
  else if (freq === "MONTHLY") d.setMonth(d.getMonth() + 1);
  else if (freq === "QUARTERLY") d.setMonth(d.getMonth() + 3);
  return d;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMoney(n: number) {
  return "₺" + n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function isWithin3Days(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return diff >= 0 && diff < 3 * 86400000;
}

const settingsSections = [
  { id: "profile",      name: "Profil",          icon: User },
  { id: "notifications",name: "Bildirimler",      icon: Bell },
  { id: "price_alerts", name: "Fiyat Alarmları",  icon: AlertTriangle },
  { id: "dca_plans",    name: "DCA Planları",     icon: TrendingUp },
  { id: "security",     name: "Güvenlik",          icon: Shield },
  { id: "privacy",      name: "Gizlilik",          icon: EyeOff },
  { id: "appearance",   name: "Görünüm",           icon: Palette },
  { id: "language",     name: "Dil ve Bölge",      icon: Globe },
  { id: "billing",      name: "Abonelik",          icon: CreditCard },
  { id: "connections",  name: "Bağlantılar",       icon: Link2 },
];

const notificationSettingsDefault = [
  { id: "price_alerts",  name: "Fiyat Uyarıları",       description: "Belirlediğiniz fiyat seviyelerine ulaşıldığında", enabled: true },
  { id: "budget_alerts", name: "Bütçe Uyarıları",       description: "Bütçe limitine yaklaştığınızda",                  enabled: true },
  { id: "goal_updates",  name: "Hedef Güncellemeleri",   description: "Hedeflerinizde ilerleme kaydedildiğinde",         enabled: false },
  { id: "ai_insights",   name: "AI Önerileri",           description: "Yeni AI önerileri geldiğinde",                    enabled: true },
  { id: "market_news",   name: "Piyasa Haberleri",       description: "Önemli piyasa gelişmeleri",                       enabled: false },
  { id: "weekly_report", name: "Haftalık Rapor",         description: "Her hafta performans özeti",                       enabled: true },
];

const privacySettingsDefault = [
  { id: "hide_amounts",   name: "Tutarları Gizle",         description: "Ekran paylaşımında miktarları maskele",              enabled: false },
  { id: "blur_preview",   name: "Önizleme Bulanıklığı",    description: "Uygulama arka plandayken ekranı karart",            enabled: true },
  { id: "biometric_lock", name: "Biyometrik Kilit",        description: "Hesap kilidi için parmak izi / yüz tanıma",         enabled: true },
];

const connectedAccounts = [
  { id: "bank1",   name: "Garanti Bankası", type: "Banka",        connected: true,  lastSync: "2 saat önce" },
  { id: "bank2",   name: "Akbank",          type: "Banka",        connected: true,  lastSync: "1 saat önce" },
  { id: "broker1", name: "İş Yatırım",      type: "Aracı Kurum",  connected: true,  lastSync: "30 dk önce" },
  { id: "crypto1", name: "Binance",          type: "Kripto Borsa", connected: false, lastSync: null },
];

// ─── DCA PLAN MODAL ───────────────────────────────────────────────────────────
function DcaPlanModal({
  open, onClose, onSave, editPlan, portfolioAssets,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (plan: Omit<DcaPlan, "id" | "createdAt" | "executions" | "totalInvested">) => void;
  editPlan: DcaPlan | null;
  portfolioAssets: Asset[];
}) {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const [ticker, setTicker] = useState("");
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState("crypto");
  const [amount, setAmount] = useState(5000);
  const [frequency, setFrequency] = useState<DcaFrequency>("WEEKLY");
  const [startDate, setStartDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (editPlan) {
      setTicker(editPlan.assetTicker);
      setAssetName(editPlan.assetName);
      setAssetType(editPlan.assetType);
      setAmount(editPlan.amount);
      setFrequency(editPlan.frequency);
      setStartDate(editPlan.startDate.split("T")[0]);
      setNotes(editPlan.notes ?? "");
    } else {
      setTicker(""); setAssetName(""); setAssetType("crypto");
      setAmount(5000); setFrequency("WEEKLY"); setStartDate(today); setNotes("");
    }
    setSearch("");
  }, [open, editPlan]);

  const suggestedAssets = useMemo(() => {
    return portfolioAssets.filter(a =>
      !search || a.symbol.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 6);
  }, [portfolioAssets, search]);

  const yearlyAmount = amount * FREQUENCY_PER_YEAR[frequency];
  const fiveYearAmount = yearlyAmount * 5;

  const handleSelectAsset = (asset: Asset) => {
    setTicker(asset.symbol);
    setAssetName(asset.name);
    setAssetType(asset.type);
    setSearch("");
  };

  const handleSave = () => {
    if (!ticker || !assetName) return;
    const nextDate = addFrequency(new Date(startDate), frequency).toISOString();
    onSave({ assetTicker: ticker, assetName, assetType, amount, frequency, nextDate, isActive: true, startDate: new Date(startDate).toISOString(), notes });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0E1117] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="text-lg font-semibold text-[#F0F2F7]">{editPlan ? "Planı Düzenle" : "Yeni DCA Planı"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#4E5A6B] hover:text-[#F0F2F7] hover:bg-[rgba(255,255,255,0.06)] transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Asset Picker */}
          <div>
            <label className="block text-xs text-[#4E5A6B] mb-2 uppercase tracking-wider">Varlık Seç</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4E5A6B]" />
              <input
                value={search || ticker}
                onChange={e => { setSearch(e.target.value); if (!e.target.value) { setTicker(""); setAssetName(""); } }}
                placeholder="BTC, THYAO, Altın..."
                className="w-full pl-9 pr-4 py-2.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors"
              />
            </div>
            {suggestedAssets.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {suggestedAssets.map(a => (
                  <button key={a.id} onClick={() => handleSelectAsset(a)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${ticker === a.symbol ? "bg-[rgba(0,212,170,0.12)] text-[#00D4AA] border-[rgba(0,212,170,0.3)]" : "bg-[#151A23] text-[#8892A4] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]"}`}>
                    {a.symbol}
                  </button>
                ))}
              </div>
            )}
            {ticker && assetName && (
              <p className="text-xs text-[#00D4AA] mt-1.5">✓ Seçildi: {assetName} ({ticker})</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs text-[#4E5A6B] mb-2 uppercase tracking-wider">Her Seferinde Yatırılacak Tutar</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#8892A4]">₺</span>
              <input
                type="number" value={amount} onChange={e => setAmount(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-2.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA] transition-colors"
              />
            </div>
            <div className="flex gap-2 mt-2">
              {[1000, 2500, 5000, 10000].map(v => (
                <button key={v} onClick={() => setAmount(v)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${amount === v ? "bg-[rgba(0,212,170,0.12)] text-[#00D4AA] border-[rgba(0,212,170,0.3)]" : "bg-[#151A23] text-[#8892A4] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]"}`}>
                  ₺{v >= 1000 ? `${v / 1000}K` : v}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs text-[#4E5A6B] mb-2 uppercase tracking-wider">Sıklık</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(FREQUENCY_LABELS) as DcaFrequency[]).map(f => (
                <button key={f} onClick={() => setFrequency(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${frequency === f ? "bg-[rgba(0,212,170,0.12)] text-[#00D4AA] border-[rgba(0,212,170,0.3)]" : "bg-[#151A23] text-[#8892A4] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]"}`}>
                  {FREQUENCY_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs text-[#4E5A6B] mb-2 uppercase tracking-wider">Başlangıç Tarihi</label>
            <div className="flex gap-2">
              <button onClick={() => { setStartDate(today); setShowDatePicker(false); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${startDate === today && !showDatePicker ? "bg-[rgba(0,212,170,0.12)] text-[#00D4AA] border-[rgba(0,212,170,0.3)]" : "bg-[#151A23] text-[#8892A4] border-[rgba(255,255,255,0.06)]"}`}>Bugün</button>
              <button onClick={() => { setStartDate(tomorrow); setShowDatePicker(false); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${startDate === tomorrow && !showDatePicker ? "bg-[rgba(0,212,170,0.12)] text-[#00D4AA] border-[rgba(0,212,170,0.3)]" : "bg-[#151A23] text-[#8892A4] border-[rgba(255,255,255,0.06)]"}`}>Yarın</button>
              <button onClick={() => setShowDatePicker(v => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${showDatePicker ? "bg-[rgba(0,212,170,0.12)] text-[#00D4AA] border-[rgba(0,212,170,0.3)]" : "bg-[#151A23] text-[#8892A4] border-[rgba(255,255,255,0.06)]"}`}>
                <Calendar className="w-3.5 h-3.5" /> Tarih Seç
              </button>
            </div>
            {showDatePicker && (
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={today}
                className="mt-2 w-full px-4 py-2.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA]" />
            )}
          </div>

          {/* Plan Summary */}
          {amount > 0 && (
            <div className="p-4 bg-[rgba(0,212,170,0.05)] border border-[rgba(0,212,170,0.15)] rounded-xl">
              <p className="text-xs font-semibold text-[#00D4AA] mb-3 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" /> Plan Özeti
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#8892A4]">Yıllık yatırım:</span>
                  <span className="font-semibold text-[#F0F2F7] font-mono">{fmtMoney(yearlyAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8892A4]">5 yılda toplam:</span>
                  <span className="font-semibold text-[#FFB833] font-mono">{fmtMoney(fiveYearAmount)}</span>
                </div>
                <p className="text-xs text-[#4E5A6B] mt-1">{fmtMoney(amount)} × {FREQUENCY_PER_YEAR[frequency]} {FREQUENCY_LABELS[frequency].toLowerCase()} / yıl</p>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs text-[#4E5A6B] mb-2 uppercase tracking-wider">Not (Opsiyonel)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Opsiyonel not..."
              className="w-full px-4 py-2.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] resize-none" />
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-[rgba(255,255,255,0.06)]">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-[#8892A4] border border-[rgba(255,255,255,0.06)] hover:text-[#F0F2F7] transition-colors">İptal</button>
          <button onClick={handleSave} disabled={!ticker || !assetName}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-[#00D4AA] text-[#080A0F] hover:bg-[#00D4AA]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {editPlan ? "Kaydet" : "Plan Oluştur →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PRICE ALERT MODAL ────────────────────────────────────────────────────────
function AlertModal({
  open, onClose, onSave, portfolioAssets,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (alert: Omit<PriceAlert, "id" | "createdAt" | "isTriggered">) => void;
  portfolioAssets: Asset[];
}) {
  const [ticker, setTicker] = useState("");
  const [assetName, setAssetName] = useState("");
  const [condition, setCondition] = useState<AlertCondition>("ABOVE");
  const [targetPrice, setTargetPrice] = useState("");
  const [percentChange, setPercentChange] = useState(5);
  const [percentDir, setPercentDir] = useState<"up" | "down">("up");
  const [currency, setCurrency] = useState("TRY");
  const [repeatOnTrigger, setRepeatOnTrigger] = useState(false);
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) {
      setTicker(""); setAssetName(""); setCondition("ABOVE");
      setTargetPrice(""); setPercentChange(5); setSearch(""); setNotes("");
    }
  }, [open]);

  const currentAsset = portfolioAssets.find(a => a.symbol === ticker);
  const currentPrice = currentAsset ? Number(currentAsset.currentPrice) : 0;
  const targetNum = parseFloat(targetPrice) || 0;

  const diffPct = currentPrice > 0 && targetNum > 0
    ? ((targetNum - currentPrice) / currentPrice) * 100
    : null;

  const percentTargetPrice = currentPrice > 0
    ? currentPrice * (1 + (percentDir === "up" ? 1 : -1) * percentChange / 100)
    : 0;

  const suggestedAssets = useMemo(() => {
    return portfolioAssets.filter(a =>
      !search || a.symbol.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 5);
  }, [portfolioAssets, search]);

  const handleSelectAsset = (asset: Asset) => {
    setTicker(asset.symbol);
    setAssetName(asset.name);
    setCurrency(asset.currency);
    setSearch("");
  };

  const handleSave = () => {
    if (!ticker) return;
    const finalTarget = condition === "PERCENT_CHANGE" ? percentTargetPrice : targetNum;
    onSave({
      ticker, assetName, condition,
      targetPrice: finalTarget,
      percentChange: condition === "PERCENT_CHANGE" ? (percentDir === "up" ? percentChange : -percentChange) : undefined,
      currentPrice, currency, isActive: true, repeatOnTrigger, notes,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0E1117] border border-[rgba(255,255,255,0.08)] rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.06)]">
          <h2 className="text-lg font-semibold text-[#F0F2F7]">Yeni Fiyat Alarmı</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#4E5A6B] hover:text-[#F0F2F7] hover:bg-[rgba(255,255,255,0.06)] transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Asset Search */}
          <div>
            <label className="block text-xs text-[#4E5A6B] mb-2 uppercase tracking-wider">Varlık</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4E5A6B]" />
              <input value={search || ticker} onChange={e => { setSearch(e.target.value); if (!e.target.value) { setTicker(""); setAssetName(""); } }}
                placeholder="BTC, THYAO, GARAN..."
                className="w-full pl-9 pr-4 py-2.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder-[#4E5A6B] focus:outline-none focus:border-[#00D4AA]" />
            </div>
            {suggestedAssets.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {suggestedAssets.map(a => (
                  <button key={a.id} onClick={() => handleSelectAsset(a)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${ticker === a.symbol ? "bg-[rgba(0,212,170,0.12)] text-[#00D4AA] border-[rgba(0,212,170,0.3)]" : "bg-[#151A23] text-[#8892A4] border-[rgba(255,255,255,0.06)]"}`}>
                    {a.symbol}
                  </button>
                ))}
              </div>
            )}
            {ticker && currentPrice > 0 && (
              <p className="text-xs text-[#8892A4] mt-1.5">Şu anki fiyat: <span className="font-mono text-[#F0F2F7]">{currentPrice.toLocaleString("tr-TR")} {currency}</span></p>
            )}
          </div>

          {/* Condition */}
          <div>
            <label className="block text-xs text-[#4E5A6B] mb-2 uppercase tracking-wider">Koşul</label>
            <div className="grid grid-cols-3 gap-2">
              {([["ABOVE", "↑ Üstüne Çıkınca"], ["BELOW", "↓ Altına Düşünce"], ["PERCENT_CHANGE", "% Değişimde"]] as const).map(([c, label]) => (
                <button key={c} onClick={() => setCondition(c)}
                  className={`p-3 rounded-xl border text-center transition-all ${condition === c ? "bg-[rgba(0,212,170,0.08)] border-[rgba(0,212,170,0.3)] text-[#00D4AA]" : "bg-[#151A23] border-[rgba(255,255,255,0.06)] text-[#8892A4] hover:border-[rgba(255,255,255,0.12)]"}`}>
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Target Price */}
          {condition !== "PERCENT_CHANGE" ? (
            <div>
              <label className="block text-xs text-[#4E5A6B] mb-2 uppercase tracking-wider">Hedef Fiyat</label>
              <div className="flex gap-2">
                <input type="number" value={targetPrice} onChange={e => setTargetPrice(e.target.value)} placeholder="0,00"
                  className="flex-1 px-4 py-2.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA]" />
                <span className="px-4 py-2.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#8892A4]">{currency}</span>
              </div>
              {diffPct !== null && (
                <p className={`text-xs mt-1.5 font-mono ${diffPct >= 0 ? "text-[#00D4AA]" : "text-[#FF4757]"}`}>
                  Fark: {diffPct >= 0 ? "+" : ""}{diffPct.toFixed(1)}% {diffPct >= 0 ? "yukarı gitmesi" : "aşağı düşmesi"} gerekiyor
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs text-[#4E5A6B] mb-2 uppercase tracking-wider">Değişim Yüzdesi</label>
              <div className="flex gap-2">
                <button onClick={() => setPercentDir(d => d === "up" ? "down" : "up")}
                  className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${percentDir === "up" ? "bg-[rgba(0,212,170,0.1)] text-[#00D4AA] border-[rgba(0,212,170,0.3)]" : "bg-[rgba(255,71,87,0.1)] text-[#FF4757] border-[rgba(255,71,87,0.3)]"}`}>
                  {percentDir === "up" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                </button>
                <input type="number" value={percentChange} onChange={e => setPercentChange(Number(e.target.value))} min={0} max={100}
                  className="flex-1 px-4 py-2.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA]" />
                <span className="px-4 py-2.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#8892A4]">%</span>
              </div>
              {currentPrice > 0 && (
                <p className="text-xs text-[#8892A4] mt-1.5 font-mono">
                  {currentPrice.toLocaleString("tr-TR")} → <span className="text-[#FFB833]">{percentTargetPrice.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {currency}</span>
                </p>
              )}
            </div>
          )}

          {/* Repeat */}
          <div className="flex items-center justify-between p-3 bg-[#151A23] rounded-xl">
            <div>
              <p className="text-sm font-medium text-[#F0F2F7]">Her tetiklenişte bildir</p>
              <p className="text-xs text-[#4E5A6B]">Kapalı: bir kez tetiklenince devre dışı kalır</p>
            </div>
            <button onClick={() => setRepeatOnTrigger(v => !v)}
              className={`w-12 h-6 rounded-full relative transition-colors ${repeatOnTrigger ? "bg-[#00D4AA]" : "bg-[#4E5A6B]"}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${repeatOnTrigger ? "left-7" : "left-1"}`} />
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-[#4E5A6B] mb-2 uppercase tracking-wider">Not (Opsiyonel)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Neden bu fiyat? Hatırlatma notu..."
              className="w-full px-4 py-2.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] resize-none" />
          </div>
        </div>
        <div className="flex gap-3 p-6 border-t border-[rgba(255,255,255,0.06)]">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-[#8892A4] border border-[rgba(255,255,255,0.06)] hover:text-[#F0F2F7] transition-colors">İptal</button>
          <button onClick={handleSave} disabled={!ticker}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-[#00D4AA] text-[#080A0F] hover:bg-[#00D4AA]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Alarm Oluştur →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    const map: Record<string, string> = {
      "dca-plans": "dca_plans",
      "price-alerts": "price_alerts",
      "appearance": "appearance",
    };
    return map[hash] || "profile";
  });

  const [notifications, setNotifications] = useState(notificationSettingsDefault);
  const [privacy, setPrivacy] = useState(privacySettingsDefault);
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const [backupLoading, setBackupLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // DCA state
  const [dcaPlans, setDcaPlans] = useLocalStorage<DcaPlan[]>("dca_plans", []);
  const [dcaModalOpen, setDcaModalOpen] = useState(false);
  const [editingDca, setEditingDca] = useState<DcaPlan | null>(null);
  const [expandedDca, setExpandedDca] = useState<string | null>(null);

  // Price Alerts state
  const [alerts, setAlerts] = useLocalStorage<PriceAlert[]>("price_alerts", []);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertSearch, setAlertSearch] = useState("");
  const [alertFilter, setAlertFilter] = useState<"all" | "active" | "inactive" | "triggered">("all");

  // Appearance state
  const [appearance, setAppearance] = useLocalStorage<AppearanceSettings>("appearance_settings", DEFAULT_APPEARANCE);

  const { data: portfolioAssets = [] } = useQuery<Asset[]>({ queryKey: ["/api/assets"] });

  // Apply appearance on mount and changes
  useEffect(() => { applyAppearance(appearance); }, [appearance]);

  const updateAppearance = (patch: Partial<AppearanceSettings>) => {
    setAppearance(prev => {
      const next = { ...prev, ...patch };
      applyAppearance(next);
      return next;
    });
  };

  // DCA computed stats
  const dcaStats = useMemo(() => {
    const active = dcaPlans.filter(p => p.isActive).length;
    const totalInvested = dcaPlans.reduce((s, p) => s + p.totalInvested, 0);
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const thisMonthPlanned = dcaPlans
      .filter(p => p.isActive)
      .reduce((s, p) => {
        const next = new Date(p.nextDate);
        return s + (next <= monthEnd && next >= now ? p.amount : 0);
      }, 0);
    return { active, totalInvested, thisMonthPlanned };
  }, [dcaPlans]);

  // Alert computed
  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      const matchSearch = !alertSearch || a.ticker.toLowerCase().includes(alertSearch.toLowerCase()) || a.assetName.toLowerCase().includes(alertSearch.toLowerCase());
      const matchFilter = alertFilter === "all" || (alertFilter === "active" && a.isActive && !a.isTriggered) || (alertFilter === "inactive" && !a.isActive && !a.isTriggered) || (alertFilter === "triggered" && a.isTriggered);
      return matchSearch && matchFilter;
    });
  }, [alerts, alertSearch, alertFilter]);

  function getAlertProgress(alert: PriceAlert) {
    if (alert.currentPrice <= 0 || alert.targetPrice <= 0) return { pct: 0, status: "waiting" as const };
    const diff = alert.condition === "ABOVE"
      ? alert.targetPrice - alert.currentPrice
      : alert.currentPrice - alert.targetPrice;
    const diffPct = (diff / alert.targetPrice) * 100;
    if (diffPct <= 0) return { pct: 100, status: "triggered" as const };
    if (diffPct <= 5) return { pct: 95, status: "near" as const };
    return { pct: Math.max(0, Math.min(90, 100 - diffPct)), status: "waiting" as const };
  }

  // Handlers
  const handleSaveDca = (planData: Omit<DcaPlan, "id" | "createdAt" | "executions" | "totalInvested">) => {
    if (editingDca) {
      setDcaPlans(prev => prev.map(p => p.id === editingDca.id ? { ...p, ...planData } : p));
      toast({ title: "Plan Güncellendi" });
    } else {
      const newPlan: DcaPlan = { ...planData, id: genId(), createdAt: new Date().toISOString(), totalInvested: 0, executions: [] };
      setDcaPlans(prev => [newPlan, ...prev]);
      toast({ title: "DCA Planı Oluşturuldu", description: `${planData.assetTicker} için ${fmtMoney(planData.amount)} ${FREQUENCY_LABELS[planData.frequency]}` });
    }
    setEditingDca(null);
  };

  const handleRunDca = (plan: DcaPlan) => {
    const exec: DcaExecution = { id: genId(), amount: plan.amount, executedAt: new Date().toISOString(), isManual: true };
    const nextDate = addFrequency(new Date(plan.nextDate), plan.frequency).toISOString();
    setDcaPlans(prev => prev.map(p => p.id === plan.id ? { ...p, totalInvested: p.totalInvested + plan.amount, nextDate, executions: [exec, ...p.executions] } : p));
    toast({ title: "Plan Çalıştırıldı", description: `${fmtMoney(plan.amount)} ${plan.assetTicker} için yatırım yapıldı` });
  };

  const handleToggleDca = (id: string) => {
    setDcaPlans(prev => prev.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  };

  const handleDeleteDca = (id: string) => {
    setDcaPlans(prev => prev.filter(p => p.id !== id));
    toast({ title: "Plan Silindi" });
  };

  const handleSaveAlert = (alertData: Omit<PriceAlert, "id" | "createdAt" | "isTriggered">) => {
    const newAlert: PriceAlert = { ...alertData, id: genId(), createdAt: new Date().toISOString(), isTriggered: false };
    setAlerts(prev => [newAlert, ...prev]);
    toast({ title: "Alarm Oluşturuldu", description: `${alertData.ticker} için fiyat alarmı ayarlandı` });
  };

  const handleToggleAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    toast({ title: "Alarm Silindi" });
  };

  const handleExportJSON = async () => {
    setBackupLoading(true);
    try {
      await exportBackupJSON();
      toast({ title: "Yedek Alındı", description: "JSON yedek dosyası bilgisayarınıza indirildi." });
    } catch { toast({ title: "Hata", description: "Yedek alınırken bir hata oluştu", variant: "destructive" }); }
    finally { setBackupLoading(false); }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      const result = await importBackupJSON(file);
      if (result.success) { queryClient.invalidateQueries(); toast({ title: "İçe Aktarma Tamamlandı", description: result.message }); }
      else toast({ title: "Hata", description: result.message, variant: "destructive" });
    } finally { setImportLoading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const accentHex = ACCENT_COLORS.find(c => c.id === appearance.accentColor)?.hex ?? "#00D4AA";

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#F0F2F7]">Ayarlar</h1>
        <p className="text-sm text-[#8892A4]">Hesap ve uygulama ayarlarınızı yönetin</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="finos-card p-3 h-fit">
          <nav className="space-y-0.5">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button key={section.id} onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${isActive ? "text-[#00D4AA]" : "text-[#8892A4] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F0F2F7]"}`}
                  style={isActive ? { background: "rgba(0,212,170,0.08)", borderLeft: "3px solid #00D4AA", paddingLeft: "9px" } : {}}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{section.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="col-span-3 space-y-6">

          {/* ── PROFILE ── */}
          {activeSection === "profile" && (
            <div className="finos-card p-6">
              <h2 className="text-lg font-semibold text-[#F0F2F7] mb-6">Profil Bilgileri</h2>
              <div className="flex items-start gap-6 mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4B9EFF] to-[#A78BFA] flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">ES</span>
                  </div>
                  <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#00D4AA] rounded-full flex items-center justify-center text-[#080A0F] hover:bg-[#00D4AA]/90">
                    <Palette className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#F0F2F7]">Erkan S.</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 text-xs font-bold bg-[#FFB833] text-[#080A0F] rounded">PRO</span>
                    <span className="text-xs text-[#4E5A6B]">Aralık 2025'e kadar</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[["Ad Soyad", "text", "Erkan S."], ["E-posta", "email", "erkan@email.com"], ["Telefon", "tel", "+90 5XX XXX XX XX"], ["Doğum Tarihi", "date", "1990-05-15"]].map(([label, type, val]) => (
                  <div key={label}>
                    <label className="block text-xs text-[#4E5A6B] mb-2">{label}</label>
                    <input type={type} defaultValue={val} className="w-full px-4 py-2.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA] transition-colors" />
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-6">
                <button onClick={() => toast({ title: "Profil Kaydedildi" })} className="px-6 py-2 bg-[#00D4AA] rounded-lg text-sm font-medium text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors">Kaydet</button>
              </div>
            </div>
          )}

          {/* ── DCA PLANS ── */}
          {activeSection === "dca_plans" && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Aktif Plan", value: dcaStats.active, color: "#00D4AA" },
                  { label: "Toplam Yatırılan", value: fmtMoney(dcaStats.totalInvested), color: "#FFB833" },
                  { label: "Bu Ay Planlanmış", value: fmtMoney(dcaStats.thisMonthPlanned), color: "#4B9EFF" },
                ].map(s => (
                  <div key={s.label} className="finos-card p-4">
                    <p className="text-xs text-[#4E5A6B] mb-1">{s.label}</p>
                    <p className="text-xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="finos-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-[#F0F2F7]">Otomatik Yatırım Planları (DCA)</h2>
                  <button onClick={() => { setEditingDca(null); setDcaModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-[#00D4AA] text-[#080A0F] text-sm font-medium rounded-lg hover:bg-[#00D4AA]/90 transition-colors">
                    <Plus className="w-4 h-4" /> Yeni Plan
                  </button>
                </div>

                {dcaPlans.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-10 h-10 text-[#4E5A6B] mx-auto mb-3" />
                    <p className="text-sm text-[#8892A4]">Henüz DCA planı yok</p>
                    <p className="text-xs text-[#4E5A6B] mt-1">Düzenli otomatik yatırım yapmak için plan oluşturun</p>
                    <button onClick={() => setDcaModalOpen(true)} className="mt-4 px-4 py-2 bg-[rgba(0,212,170,0.1)] text-[#00D4AA] text-sm rounded-lg hover:bg-[rgba(0,212,170,0.15)] transition-colors">İlk Planımı Oluştur</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dcaPlans.map(plan => {
                      const isExpanded = expandedDca === plan.id;
                      const isApproaching = isWithin3Days(plan.nextDate);
                      return (
                        <div key={plan.id} className="rounded-xl overflow-hidden border border-[rgba(255,255,255,0.04)]"
                          style={{ borderLeft: `3px solid ${plan.isActive ? "#00D4AA" : "#4E5A6B"}` }}>
                          <div className="group flex items-center justify-between p-4 bg-[#151A23] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: plan.isActive ? "rgba(0,212,170,0.1)" : "rgba(78,90,107,0.2)" }}>
                                <TrendingUp className="w-5 h-5" style={{ color: plan.isActive ? "#00D4AA" : "#4E5A6B" }} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-[#F0F2F7]">{plan.assetTicker}</span>
                                  {plan.assetName !== plan.assetTicker && <span className="text-xs text-[#4E5A6B]">{plan.assetName}</span>}
                                  <span className={`px-2 py-0.5 text-xs rounded font-medium ${plan.isActive ? "bg-[rgba(0,212,170,0.15)] text-[#00D4AA]" : "bg-[rgba(255,255,255,0.06)] text-[#4E5A6B]"}`}>
                                    {plan.isActive ? "Aktif" : "Pasif"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-0.5">
                                  <span className="text-xs text-[#8892A4]"><span className="font-mono text-[#00D4AA]">{fmtMoney(plan.amount)}</span> / {FREQUENCY_LABELS[plan.frequency]}</span>
                                  <span className={`text-xs ${isApproaching ? "text-[#FFB833]" : "text-[#4E5A6B]"} flex items-center gap-1`}>
                                    {isApproaching && <Clock className="w-3 h-3" />}
                                    Sonraki: {fmtDate(plan.nextDate)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right mr-2">
                                <p className="text-sm font-mono font-semibold text-[#FFB833]">{fmtMoney(plan.totalInvested)}</p>
                                <p className="text-xs text-[#4E5A6B]">{plan.executions.length} yatırım</p>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleRunDca(plan)} title="Şimdi Çalıştır"
                                  className="p-1.5 rounded-lg hover:bg-[rgba(0,212,170,0.1)] text-[#4E5A6B] hover:text-[#00D4AA] transition-colors">
                                  <Play className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => { setEditingDca(plan); setDcaModalOpen(true); }} title="Düzenle"
                                  className="p-1.5 rounded-lg hover:bg-[rgba(75,158,255,0.1)] text-[#4E5A6B] hover:text-[#4B9EFF] transition-colors">
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleToggleDca(plan.id)} title={plan.isActive ? "Duraklat" : "Aktifleştir"}
                                  className="p-1.5 rounded-lg hover:bg-[rgba(255,184,51,0.1)] text-[#4E5A6B] hover:text-[#FFB833] transition-colors">
                                  {plan.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => handleDeleteDca(plan.id)} title="Sil"
                                  className="p-1.5 rounded-lg hover:bg-[rgba(255,71,87,0.1)] text-[#4E5A6B] hover:text-[#FF4757] transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <button onClick={() => setExpandedDca(isExpanded ? null : plan.id)}
                                className="p-1.5 rounded-lg text-[#4E5A6B] hover:text-[#F0F2F7] hover:bg-[rgba(255,255,255,0.06)] transition-colors">
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="bg-[#0E1117] p-4 border-t border-[rgba(255,255,255,0.04)]">
                              {plan.executions.length === 0 ? (
                                <p className="text-xs text-[#4E5A6B] text-center py-4">Henüz yatırım yok</p>
                              ) : (
                                <>
                                  <p className="text-xs font-semibold text-[#8892A4] mb-3 uppercase tracking-wider">Yatırım Geçmişi ({plan.executions.length} işlem)</p>
                                  <div className="space-y-2">
                                    {plan.executions.slice(0, 8).map(ex => (
                                      <div key={ex.id} className="flex items-center justify-between text-xs py-1.5 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                                        <span className="text-[#8892A4]">{fmtDate(ex.executedAt)}</span>
                                        <span className="font-mono text-[#F0F2F7]">{fmtMoney(ex.amount)}</span>
                                        {ex.isManual && <span className="px-1.5 py-0.5 bg-[rgba(75,158,255,0.1)] text-[#4B9EFF] rounded text-[10px]">Manuel</span>}
                                      </div>
                                    ))}
                                  </div>
                                  {plan.executions.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)] flex justify-between text-xs">
                                      <span className="text-[#4E5A6B]">Toplam yatırılan:</span>
                                      <span className="font-mono font-semibold text-[#FFB833]">{fmtMoney(plan.totalInvested)}</span>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <DcaPlanModal
                open={dcaModalOpen}
                onClose={() => { setDcaModalOpen(false); setEditingDca(null); }}
                onSave={handleSaveDca}
                editPlan={editingDca}
                portfolioAssets={portfolioAssets}
              />
            </>
          )}

          {/* ── PRICE ALERTS ── */}
          {activeSection === "price_alerts" && (
            <div className="finos-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#F0F2F7]">Fiyat Alarmları</h2>
                <button onClick={() => setAlertModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#00D4AA] text-[#080A0F] text-sm font-medium rounded-lg hover:bg-[#00D4AA]/90 transition-colors">
                  <Plus className="w-4 h-4" /> Yeni Alarm
                </button>
              </div>

              {/* Filter bar */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4E5A6B]" />
                  <input value={alertSearch} onChange={e => setAlertSearch(e.target.value)} placeholder="THYAO, BTC..."
                    className="w-full pl-9 pr-4 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder-[#4E5A6B] focus:outline-none focus:border-[#00D4AA]" />
                </div>
                <div className="flex gap-1">
                  {([["all", "Tümü"], ["active", "Aktif"], ["inactive", "Pasif"], ["triggered", "Tetiklendi"]] as const).map(([f, label]) => (
                    <button key={f} onClick={() => setAlertFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${alertFilter === f ? "bg-[rgba(0,212,170,0.1)] text-[#00D4AA] border-[rgba(0,212,170,0.3)]" : "bg-[#151A23] text-[#8892A4] border-[rgba(255,255,255,0.06)]"}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-[#4E5A6B] ml-auto whitespace-nowrap">
                  {alerts.filter(a => a.isActive && !a.isTriggered).length} aktif / {alerts.filter(a => a.isTriggered).length} tetiklendi
                </span>
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="w-10 h-10 text-[#4E5A6B] mx-auto mb-3" />
                  <p className="text-sm text-[#8892A4]">Henüz fiyat alarmı yok</p>
                  <p className="text-xs text-[#4E5A6B] mt-1">Bir varlığın hedef fiyatına ulaştığında bildirim alın</p>
                  <button onClick={() => setAlertModalOpen(true)} className="mt-4 px-4 py-2 bg-[rgba(0,212,170,0.1)] text-[#00D4AA] text-sm rounded-lg hover:bg-[rgba(0,212,170,0.15)]">İlk Alarmımı Oluştur</button>
                </div>
              ) : filteredAlerts.length === 0 ? (
                <p className="text-center py-8 text-sm text-[#4E5A6B]">Filtreye uygun alarm bulunamadı</p>
              ) : (
                <div className="space-y-3">
                  {filteredAlerts.map(alert => {
                    const { status } = getAlertProgress(alert);
                    const isNear = status === "near";
                    const condLabel = alert.condition === "ABOVE" ? ">" : alert.condition === "BELOW" ? "<" : "±";
                    const diff = alert.currentPrice > 0 && alert.targetPrice > 0
                      ? ((alert.targetPrice - alert.currentPrice) / alert.currentPrice * 100)
                      : null;
                    return (
                      <div key={alert.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${alert.isTriggered ? "bg-[rgba(255,184,51,0.05)] border-[rgba(255,184,51,0.2)]" : isNear ? "bg-[rgba(255,184,51,0.05)] border-[rgba(255,184,51,0.15)]" : "bg-[#151A23] border-[rgba(255,255,255,0.04)]"}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${alert.isTriggered ? "bg-[rgba(255,184,51,0.15)]" : isNear ? "bg-[rgba(255,184,51,0.1)]" : "bg-[rgba(0,212,170,0.08)]"}`}>
                            <AlertTriangle className={`w-5 h-5 ${alert.isTriggered ? "text-[#FFB833]" : isNear ? "text-[#FFB833]" : "text-[#00D4AA]"}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-[#F0F2F7]">{alert.ticker}</span>
                              <span className="text-xs font-mono text-[#8892A4]">{condLabel} {alert.targetPrice.toLocaleString("tr-TR")} {alert.currency}</span>
                              {diff !== null && (
                                <span className={`text-xs font-mono ${diff >= 0 ? "text-[#00D4AA]" : "text-[#FF4757]"}`}>
                                  ({diff >= 0 ? "+" : ""}{diff.toFixed(1)}%)
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-[#4E5A6B]">
                                Şu an: <span className={`font-mono ${isNear ? "text-[#FFB833]" : "text-[#8892A4]"}`}>{alert.currentPrice > 0 ? alert.currentPrice.toLocaleString("tr-TR") : "—"}</span>
                              </span>
                              {alert.notes && <span className="text-xs text-[#4E5A6B] truncate max-w-[140px]" title={alert.notes}>• {alert.notes}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs rounded font-medium whitespace-nowrap ${alert.isTriggered ? "bg-[rgba(255,184,51,0.2)] text-[#FFB833]" : alert.isActive ? "bg-[rgba(0,212,170,0.15)] text-[#00D4AA]" : "bg-[rgba(255,255,255,0.06)] text-[#4E5A6B]"}`}>
                            {alert.isTriggered ? "✅ Tetiklendi" : alert.isActive ? "Aktif" : "Pasif"}
                          </span>
                          {!alert.isTriggered && (
                            <button onClick={() => handleToggleAlert(alert.id)}
                              className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${alert.isActive ? "bg-[#00D4AA]" : "bg-[#4E5A6B]"}`}>
                              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${alert.isActive ? "left-5" : "left-0.5"}`} />
                            </button>
                          )}
                          <button onClick={() => handleDeleteAlert(alert.id)}
                            className="p-1.5 rounded-lg hover:bg-[rgba(255,71,87,0.1)] text-[#4E5A6B] hover:text-[#FF4757] transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 p-3 border border-dashed border-[rgba(255,255,255,0.08)] rounded-xl text-center">
                <p className="text-xs text-[#4E5A6B]">Bir varlığın hedef fiyatına ulaştığında bildirim alın</p>
              </div>

              <AlertModal
                open={alertModalOpen}
                onClose={() => setAlertModalOpen(false)}
                onSave={handleSaveAlert}
                portfolioAssets={portfolioAssets}
              />
            </div>
          )}

          {/* ── APPEARANCE ── */}
          {activeSection === "appearance" && (
            <div className="space-y-4">
              <div className="finos-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-[#F0F2F7]">Görünüm</h2>
                  <button onClick={() => { updateAppearance(DEFAULT_APPEARANCE); toast({ title: "Varsayılanlara Döndürüldü" }); }}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#8892A4] border border-[rgba(255,255,255,0.06)] rounded-lg hover:text-[#F0F2F7] transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" /> Sıfırla
                  </button>
                </div>

                {/* Theme */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-[#8892A4] mb-3 flex items-center gap-2"><Moon className="w-4 h-4" /> Tema</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {([["dark", "Koyu", Moon], ["light", "Açık", Sun], ["system", "Sistem", Monitor]] as const).map(([id, label, Icon]) => (
                      <button key={id} onClick={() => updateAppearance({ theme: id })}
                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${appearance.theme === id ? "border-[#00D4AA] bg-[rgba(0,212,170,0.08)]" : "border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]"}`}>
                        <Icon className={`w-5 h-5 ${appearance.theme === id ? "text-[#00D4AA]" : "text-[#8892A4]"}`} />
                        <span className={`text-sm font-medium ${appearance.theme === id ? "text-[#00D4AA]" : "text-[#F0F2F7]"}`}>{label}</span>
                        {appearance.theme === id && <Check className="w-4 h-4 text-[#00D4AA] ml-auto" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Color */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-[#8892A4] mb-3 flex items-center gap-2"><Palette className="w-4 h-4" /> Accent Rengi</h3>
                  <div className="flex items-center gap-4">
                    {ACCENT_COLORS.map(c => (
                      <button key={c.id} onClick={() => updateAppearance({ accentColor: c.id })} title={c.label}
                        className={`w-10 h-10 rounded-full transition-all hover:scale-110 flex items-center justify-center ${appearance.accentColor === c.id ? "ring-2 ring-white ring-offset-2 ring-offset-[#0E1117] scale-110" : ""}`}
                        style={{ backgroundColor: c.hex }}>
                        {appearance.accentColor === c.id && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                    <span className="text-xs text-[#4E5A6B] ml-2">{ACCENT_COLORS.find(c => c.id === appearance.accentColor)?.label}</span>
                  </div>
                </div>

                {/* Font Size */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-[#8892A4] mb-3 flex items-center gap-2"><Type className="w-4 h-4" /> Font Boyutu</h3>
                  <div className="flex gap-2">
                    {([["small", "Küçük", "text-xs"], ["normal", "Normal", "text-sm"], ["large", "Büyük", "text-base"]] as const).map(([id, label, cls]) => (
                      <button key={id} onClick={() => updateAppearance({ fontSize: id })}
                        className={`flex-1 py-2.5 rounded-xl border text-center transition-all ${appearance.fontSize === id ? "border-[#00D4AA] bg-[rgba(0,212,170,0.08)] text-[#00D4AA]" : "border-[rgba(255,255,255,0.06)] text-[#8892A4] hover:border-[rgba(255,255,255,0.12)]"}`}>
                        <span className={cls}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Density */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-[#8892A4] mb-3 flex items-center gap-2"><Layout className="w-4 h-4" /> Yoğunluk</h3>
                  <div className="flex gap-2">
                    {([["compact", "Kompakt"], ["normal", "Normal"], ["comfortable", "Geniş"]] as const).map(([id, label]) => (
                      <button key={id} onClick={() => updateAppearance({ density: id })}
                        className={`flex-1 py-2.5 rounded-xl border text-sm text-center transition-all ${appearance.density === id ? "border-[#00D4AA] bg-[rgba(0,212,170,0.08)] text-[#00D4AA]" : "border-[rgba(255,255,255,0.06)] text-[#8892A4] hover:border-[rgba(255,255,255,0.12)]"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-3">
                  {[
                    { key: "animations" as const, label: "Animasyonlar", desc: "Geçiş ve hover animasyonları", Icon: Zap },
                    { key: "compactNumbers" as const, label: "Kısa Sayı Formatı", desc: "₺1.2M yerine ₺1.234.567", Icon: Hash },
                  ].map(({ key, label, desc, Icon }) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-[#151A23] rounded-xl">
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-[#4E5A6B]" />
                        <div>
                          <p className="text-sm font-medium text-[#F0F2F7]">{label}</p>
                          <p className="text-xs text-[#4E5A6B]">{desc}</p>
                        </div>
                      </div>
                      <button onClick={() => updateAppearance({ [key]: !appearance[key] })}
                        className={`w-12 h-6 rounded-full relative transition-colors ${appearance[key] ? "bg-[#00D4AA]" : "bg-[#4E5A6B]"}`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${appearance[key] ? "left-7" : "left-1"}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Preview */}
              <div className="finos-card p-6">
                <h3 className="text-sm font-medium text-[#8892A4] mb-4 flex items-center gap-2"><Eye className="w-4 h-4" /> Canlı Önizleme</h3>
                <div className="p-4 bg-[#151A23] rounded-xl border border-[rgba(255,255,255,0.06)]" style={{ borderLeft: `3px solid ${accentHex}` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-[#8892A4] uppercase tracking-wider">Net Değer</p>
                      <p className="text-2xl font-bold font-mono text-[#F0F2F7] mt-1">₺3.891.094,61</p>
                      <p className="text-xs mt-1" style={{ color: accentHex }}>↑ +%3.09 toplam kar</p>
                    </div>
                    <div className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: `${accentHex}20`, color: accentHex }}>Portföy</div>
                  </div>
                  <div className="w-full bg-[rgba(255,255,255,0.06)] rounded-full h-1.5 mb-3">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: "67%", background: accentHex }} />
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 rounded-lg text-sm font-medium text-[#080A0F] transition-colors" style={{ background: accentHex }}>Örnek Buton</button>
                    <button className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors" style={{ borderColor: `${accentHex}40`, color: accentHex }}>İkincil</button>
                  </div>
                  <p className="text-xs text-[#4E5A6B] mt-3">← Seçimlerinizi değiştirdikçe önizleme güncellenir</p>
                </div>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeSection === "notifications" && (
            <div className="finos-card p-6">
              <h2 className="text-lg font-semibold text-[#F0F2F7] mb-6">Bildirim Tercihleri</h2>
              <div className="space-y-3">
                {notifications.map(n => (
                  <div key={n.id} className="flex items-center justify-between p-4 bg-[#151A23] rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-[#F0F2F7]">{n.name}</p>
                      <p className="text-xs text-[#4E5A6B]">{n.description}</p>
                    </div>
                    <button onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, enabled: !x.enabled } : x))}
                      className={`w-12 h-6 rounded-full relative transition-colors ${n.enabled ? "bg-[#00D4AA]" : "bg-[#4E5A6B]"}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${n.enabled ? "left-7" : "left-1"}`} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-[#151A23] rounded-xl">
                <h3 className="text-sm font-medium text-[#F0F2F7] mb-3">Bildirim Kanalları</h3>
                <div className="grid grid-cols-3 gap-3">
                  <button className="flex items-center gap-2 p-3 border border-[#00D4AA] bg-[rgba(0,212,170,0.08)] rounded-lg"><Mail className="w-4 h-4 text-[#00D4AA]" /><span className="text-sm text-[#00D4AA]">E-posta</span><Check className="w-4 h-4 text-[#00D4AA] ml-auto" /></button>
                  <button className="flex items-center gap-2 p-3 border border-[#00D4AA] bg-[rgba(0,212,170,0.08)] rounded-lg"><Smartphone className="w-4 h-4 text-[#00D4AA]" /><span className="text-sm text-[#00D4AA]">Push</span><Check className="w-4 h-4 text-[#00D4AA] ml-auto" /></button>
                  <button className="flex items-center gap-2 p-3 border border-[rgba(255,255,255,0.06)] rounded-lg hover:border-[rgba(255,255,255,0.1)]"><Bell className="w-4 h-4 text-[#8892A4]" /><span className="text-sm text-[#8892A4]">SMS</span></button>
                </div>
              </div>
            </div>
          )}

          {/* ── PRIVACY ── */}
          {activeSection === "privacy" && (
            <div className="finos-card p-6">
              <h2 className="text-lg font-semibold text-[#F0F2F7] mb-6">Gizlilik</h2>
              <div className="space-y-3">
                {privacy.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-[#151A23] rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-[#F0F2F7]">{item.name}</p>
                      <p className="text-xs text-[#4E5A6B]">{item.description}</p>
                    </div>
                    <button onClick={() => setPrivacy(prev => prev.map(p => p.id === item.id ? { ...p, enabled: !p.enabled } : p))}
                      className={`w-12 h-6 rounded-full relative transition-colors ${item.enabled ? "bg-[#00D4AA]" : "bg-[#4E5A6B]"}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.enabled ? "left-7" : "left-1"}`} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)]">
                <h3 className="text-sm font-medium text-[#FF4757] mb-3">Tehlikeli Bölge</h3>
                <div className="p-4 bg-[rgba(255,71,87,0.08)] border border-[rgba(255,71,87,0.2)] rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#FF4757]">Hesabı Kalıcı Olarak Sil</p>
                      <p className="text-xs text-[#8892A4]">Tüm verileriniz silinecek. Bu işlem geri alınamaz.</p>
                    </div>
                    <button className="px-4 py-2 bg-[#FF4757] text-white text-sm rounded-lg hover:bg-[#e63e4d] transition-colors">Hesabı Sil</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SECURITY ── */}
          {activeSection === "security" && (
            <div className="finos-card p-6">
              <h2 className="text-lg font-semibold text-[#F0F2F7] mb-6">Güvenlik</h2>
              <div className="space-y-4">
                <div className="p-4 bg-[#151A23] rounded-xl">
                  <h3 className="text-sm font-medium text-[#F0F2F7] mb-3">Şifre Değiştir</h3>
                  <div className="space-y-3">
                    {["Mevcut Şifre", "Yeni Şifre", "Yeni Şifre (Tekrar)"].map(label => (
                      <div key={label}>
                        <label className="block text-xs text-[#4E5A6B] mb-1.5">{label}</label>
                        <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 bg-[#0E1117] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA]" />
                      </div>
                    ))}
                    <button onClick={() => toast({ title: "Şifre Güncellendi" })} className="px-4 py-2 bg-[#00D4AA] text-[#080A0F] text-sm font-medium rounded-lg hover:bg-[#00D4AA]/90 transition-colors">Şifreyi Güncelle</button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-[#151A23] rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-[#F0F2F7]">İki Faktörlü Doğrulama</p>
                    <p className="text-xs text-[#4E5A6B]">Hesabınızı ekstra güvenlik katmanıyla koruyun</p>
                  </div>
                  <button className="px-3 py-1.5 text-xs bg-[rgba(0,212,170,0.1)] text-[#00D4AA] rounded-lg border border-[rgba(0,212,170,0.2)] hover:bg-[rgba(0,212,170,0.15)]">Etkinleştir</button>
                </div>
              </div>
            </div>
          )}

          {/* ── LANGUAGE ── */}
          {activeSection === "language" && (
            <div className="finos-card p-6">
              <h2 className="text-lg font-semibold text-[#F0F2F7] mb-6">Dil ve Bölge</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[#4E5A6B] mb-2">Arayüz Dili</label>
                  <select className="w-full px-4 py-2.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA]">
                    <option value="tr">🇹🇷 Türkçe</option>
                    <option value="en">🇬🇧 English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#4E5A6B] mb-2">Para Birimi Görünümü</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["TRY", "USD", "EUR"] as const).map(c => (
                      <button key={c} onClick={() => setDisplayCurrency(c)}
                        className={`py-2.5 rounded-xl border text-sm font-medium text-center transition-all ${displayCurrency === c ? "border-[#00D4AA] bg-[rgba(0,212,170,0.08)] text-[#00D4AA]" : "border-[rgba(255,255,255,0.06)] text-[#8892A4]"}`}>
                        {c === "TRY" ? "₺ TL" : c === "USD" ? "$ USD" : "€ EUR"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── BILLING ── */}
          {activeSection === "billing" && (
            <div className="finos-card p-6">
              <h2 className="text-lg font-semibold text-[#F0F2F7] mb-6">Abonelik</h2>
              <div className="p-4 bg-[rgba(255,184,51,0.08)] border border-[rgba(255,184,51,0.2)] rounded-xl mb-6">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 text-sm font-bold bg-[#FFB833] text-[#080A0F] rounded">PRO</span>
                  <div>
                    <p className="text-sm font-semibold text-[#F0F2F7]">Pro Plan — Aktif</p>
                    <p className="text-xs text-[#8892A4]">Aralık 2025'e kadar geçerli</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {["Sınırsız varlık takibi", "Gerçek zamanlı fiyat güncellemeleri", "AI Koç önerileri", "Gelişmiş raporlar", "Fiyat alarmları", "DCA planları"].map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-[#8892A4]"><Check className="w-4 h-4 text-[#00D4AA]" />{f}</div>
                ))}
              </div>
            </div>
          )}

          {/* ── CONNECTIONS ── */}
          {activeSection === "connections" && (
            <div className="finos-card p-6">
              <h2 className="text-lg font-semibold text-[#F0F2F7] mb-6">Bağlı Hesaplar</h2>
              <div className="space-y-3">
                {connectedAccounts.map(account => (
                  <div key={account.id} className="flex items-center justify-between p-4 bg-[#151A23] rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${account.connected ? "bg-[rgba(0,212,170,0.1)]" : "bg-[rgba(78,90,107,0.2)]"}`}>
                        <CreditCard className={`w-5 h-5 ${account.connected ? "text-[#00D4AA]" : "text-[#4E5A6B]"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#F0F2F7]">{account.name}</p>
                        <p className="text-xs text-[#4E5A6B]">{account.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {account.connected ? (
                        <>
                          <span className="text-xs text-[#4E5A6B]">Son güncelleme: {account.lastSync}</span>
                          <span className="flex items-center gap-1 text-xs text-[#00D4AA]"><span className="w-2 h-2 bg-[#00D4AA] rounded-full animate-pulse" />Bağlı</span>
                        </>
                      ) : (
                        <button className="px-4 py-2 bg-[#00D4AA] rounded-lg text-sm font-medium text-[#080A0F] hover:bg-[#00D4AA]/90">Bağla</button>
                      )}
                      <ChevronRight className="w-4 h-4 text-[#4E5A6B]" />
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 p-4 border border-dashed border-[rgba(255,255,255,0.1)] rounded-xl text-sm text-[#8892A4] hover:border-[#00D4AA] hover:text-[#00D4AA] transition-colors">+ Yeni Hesap Bağla</button>
              <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)]">
                <h3 className="text-sm font-medium text-[#F0F2F7] mb-4">Veri Yedekleme</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button onClick={handleExportJSON} disabled={backupLoading} className="flex items-center gap-2 px-4 py-3 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#8892A4] hover:text-[#F0F2F7] transition-colors disabled:opacity-50">
                    <Download className="w-4 h-4" />{backupLoading ? "İndiriliyor..." : "JSON Yedek Al"}
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} disabled={importLoading} className="flex items-center gap-2 px-4 py-3 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#8892A4] hover:text-[#F0F2F7] transition-colors disabled:opacity-50">
                    <Upload className="w-4 h-4" />{importLoading ? "Yükleniyor..." : "JSON Yedek Yükle"}
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
