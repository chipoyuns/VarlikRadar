import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, RefreshCw, Eye, EyeOff, Shield, Bitcoin, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, BarChart3, FileText, FileSpreadsheet, Target, Layers, Pencil, Check, X } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { exportAssetsToPDF, exportAssetsToExcel } from "@/lib/export-utils";
import type { BudgetSummary } from "@shared/schema";
import { AddAssetDialog } from "@/components/add-asset-dialog";
import { AssetTable } from "@/components/asset-table";
import { AssetAllocationChart } from "@/components/asset-allocation-chart";
import { MonthlyPerformanceChart } from "@/components/monthly-performance-chart";
import { PortfolioHealthScore } from "@/components/portfolio-health-score";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDisplayCurrency } from "@/lib/currency-context";
import type { PortfolioSummary, AssetDetail, AssetAllocation, MonthlyPerformance } from "@shared/schema";

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80, h = 28;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const color = positive ? "#00D4AA" : "#FF4757";
  const fillColor = positive ? "rgba(0,212,170,0.12)" : "rgba(255,71,87,0.12)";
  const pathD = `M${points.join(" L")}`;
  const areaD = `M0,${h} L${pathD.slice(1)} L${w},${h} Z`;
  return (
    <svg width={w} height={h} className="overflow-visible">
      <path d={areaD} fill={fillColor} />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PrivacyValue({ value, hidden, className = "" }: { value: string; hidden: boolean; className?: string }) {
  return (
    <span className={className}>
      {hidden ? <span className="tracking-widest text-[#4E5A6B]">••••• ₺</span> : value}
    </span>
  );
}

function StatSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-8 w-40 skeleton-shimmer" />
      <div className="h-4 w-28 skeleton-shimmer" />
    </div>
  );
}

const ASSET_FILTERS = [
  { key: "all",    label: "Tümü" },
  { key: "hisse",  label: "Hisse Senedi" },
  { key: "kripto", label: "Kripto" },
  { key: "etf",    label: "ETF" },
  { key: "emtia",  label: "Emtia" },
] as const;

export default function Dashboard() {
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [perfPeriod, setPerfPeriod] = useState<string>("monthly");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>("all");
  const [privacyMode, setPrivacyMode] = useState(false);
  const [portfolioTitle, setPortfolioTitle] = useState(() => localStorage.getItem("portfolio_title") || "Portföyüm");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(portfolioTitle);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { formatDisplayCurrency, displayCurrency, isLoadingRates } = useDisplayCurrency();

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const saveTitle = () => {
    const clean = editTitleValue.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s]/g, "").trim();
    const val = clean || "Portföyüm";
    setPortfolioTitle(val);
    localStorage.setItem("portfolio_title", val);
    setIsEditingTitle(false);
  };

  const { data: summary, isLoading: summaryLoading } = useQuery<PortfolioSummary>({ queryKey: ["/api/portfolio/summary"] });
  const { data: assets, isLoading: assetsLoading } = useQuery<AssetDetail[]>({ queryKey: ["/api/portfolio/details"] });
  const { data: allocation, isLoading: allocationLoading } = useQuery<AssetAllocation[]>({ queryKey: ["/api/portfolio/allocation"] });
  const { data: performance } = useQuery<MonthlyPerformance[]>({ queryKey: [`/api/portfolio/performance?period=${perfPeriod}`] });
  const { data: budgetPerformance, isLoading: budgetPerfLoading } = useQuery<MonthlyPerformance[]>({ queryKey: [`/api/budget/performance?period=${perfPeriod}&kasaValue=${parseFloat(localStorage.getItem("toplam_kasa") || "0") || 0}&portfolioKarZarar=${summary?.monthlyChangeAmount || 0}`] });
  const { data: budgetSummary } = useQuery<BudgetSummary>({ queryKey: ["/api/budget/summary"] });

  const updatePricesMutation = useMutation({
    mutationFn: async () => { const r = await apiRequest("POST", "/api/prices/update"); return r.json(); },
    onSuccess: (data) => {
      ["summary","details","allocation","performance"].forEach(k => queryClient.invalidateQueries({ queryKey: [`/api/portfolio/${k}`] }));
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setLastUpdate(new Date().toLocaleTimeString("tr-TR"));
      toast({ title: "Fiyatlar Güncellendi", description: data.message });
    },
    onError: () => toast({ title: "Hata", description: "Fiyatlar güncellenirken hata oluştu", variant: "destructive" }),
  });

  const fmt = (amount: number) => formatDisplayCurrency(amount);
  const fmtPct = (p: number) => `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;

  const profitTRY = (a: AssetDetail) => {
    if (!a.change || Math.abs(a.change) < 0.0001) return 0;
    return a.totalValueTRY * (a.change / 100) / (1 + a.change / 100);
  };

  const { nonCryptoAssets, cryptoAssets, nonCryptoPnLTRY, cryptoPnLTRY,
    nonCryptoPnLPct, cryptoPnLPct, bestNonCrypto, bestCrypto, worstAsset,
    cryptoWeight, riskScore, riskLabel, riskColor, riskHex, volatility,
    topConcentration, sparklineData } = useMemo(() => {
    const all = assets || [];
    const nonCrypto = all.filter(a => a.type !== "kripto");
    const crypto = all.filter(a => a.type === "kripto");
    const sumPnl = (list: AssetDetail[]) => list.reduce((s, a) => s + profitTRY(a), 0);
    const sumVal = (list: AssetDetail[]) => list.reduce((s, a) => s + a.totalValueTRY, 0);
    const ncPnL = sumPnl(nonCrypto), cPnL = sumPnl(crypto);
    const ncVal = sumVal(nonCrypto), cVal = sumVal(crypto), totalVal = sumVal(all);
    const ncPct = ncVal > 0 ? (ncPnL / (ncVal - ncPnL)) * 100 : 0;
    const cPct = cVal > 0 ? (cPnL / (cVal - cPnL)) * 100 : 0;
    const bestNC = nonCrypto.length > 0 ? nonCrypto.reduce((a, b) => a.change > b.change ? a : b) : null;
    const bestC = crypto.length > 0 ? crypto.reduce((a, b) => a.change > b.change ? a : b) : null;
    const worst = all.length > 0 ? all.reduce((a, b) => a.change < b.change ? a : b) : null;
    const cryptoAlloc = allocation?.find(a => a.type === "kripto");
    const cryptoW = cryptoAlloc?.percentage || 0;
    const changes = all.map(a => Math.abs(a.change));
    const vol = changes.length > 0 ? changes.reduce((s, v) => s + v, 0) / changes.length : 0;
    let score = 1;
    if (cryptoW < 10) score = 2; else if (cryptoW < 20) score = 3;
    else if (cryptoW < 30) score = 4; else if (cryptoW < 40) score = 5;
    else if (cryptoW < 50) score = 6; else if (cryptoW < 60) score = 7;
    else if (cryptoW < 75) score = 8; else if (cryptoW < 90) score = 9;
    else score = 10;
    if (vol > 15) score = Math.min(10, score + 1);
    let label = "Düşük Risk", color = "green", hex = "#00D4AA";
    if (score >= 7) { label = "Agresif"; color = "red"; hex = "#FF4757"; }
    else if (score >= 5) { label = "Yüksek"; color = "yellow"; hex = "#FFB833"; }
    else if (score >= 3) { label = "Orta Risk"; color = "yellow"; hex = "#FFB833"; }
    const topAsset = all.length > 0 ? all.reduce((a, b) => a.totalValueTRY > b.totalValueTRY ? a : b) : null;
    const topConc = totalVal > 0 && topAsset ? (topAsset.totalValueTRY / totalVal) * 100 : 0;
    const sparkData = (performance || []).map(p => p.value).slice(-12);
    return { nonCryptoAssets: nonCrypto, cryptoAssets: crypto, nonCryptoPnLTRY: ncPnL, cryptoPnLTRY: cPnL,
      nonCryptoPnLPct: ncPct, cryptoPnLPct: cPct, bestNonCrypto: bestNC, bestCrypto: bestC,
      worstAsset: worst, cryptoWeight: cryptoW, riskScore: score, riskLabel: label, riskColor: color,
      riskHex: hex, volatility: vol, topConcentration: topConc, sparklineData: sparkData };
  }, [assets, allocation, performance]);


  /* Bütçe Toplam Bakiye */
  const kasaValue = useMemo(() => parseFloat(localStorage.getItem("toplam_kasa") || "0"), []);
  const totalBakiye = kasaValue + (budgetSummary?.totalIncome || 0) - (budgetSummary?.totalExpense || 0) + (summary?.monthlyChangeAmount || 0);

  const insights = useMemo(() => {
    const all = assets || [];
    const msgs: string[] = [];
    const roi = summary?.monthlyChange || 0;
    msgs.push(`Portföy toplam ${roi >= 0 ? "+" : ""}${roi.toFixed(1)}% getiri sağladı`);
    if (cryptoWeight > 50) msgs.push(`Kripto ağırlığı yüksek: %${cryptoWeight.toFixed(0)} — risk artışına dikkat`);
    else if (cryptoWeight > 0) msgs.push(`Kripto ağırlığı: %${cryptoWeight.toFixed(0)}`);
    if (bestNonCrypto && bestNonCrypto.change > 0) msgs.push(`En iyi hisse: ${bestNonCrypto.symbol} +${bestNonCrypto.change.toFixed(1)}%`);
    if (bestCrypto && bestCrypto.change > 0) msgs.push(`En iyi kripto: ${bestCrypto.symbol} +${bestCrypto.change.toFixed(1)}%`);
    if (worstAsset && worstAsset.change < -2) msgs.push(`En büyük düşüş: ${worstAsset.symbol} ${worstAsset.change.toFixed(1)}%`);
    if (all.length === 0) msgs.push("Varlık eklemeye başlayın — yatırım portföyünüzü buradan yönetin");
    msgs.push(`Toplam ${all.length} varlık izleniyor`);
    if (nonCryptoPnLTRY > 0) msgs.push(`Hisse/ETF günlük kâr: +${fmt(nonCryptoPnLTRY)}`);
    if (cryptoPnLTRY > 0) msgs.push(`Kripto günlük kâr: +${fmt(cryptoPnLTRY)}`);
    return msgs.length > 0 ? msgs : ["Portföy verilerini yükleyin"];
  }, [assets, summary, bestNonCrypto, bestCrypto, worstAsset, cryptoWeight, nonCryptoPnLTRY, cryptoPnLTRY]);

  const isLoading = summaryLoading || assetsLoading;

  const filteredAssets = useMemo(() => {
    const all = assets || [];
    return all.filter(a => {
      const matchType = assetTypeFilter === "all"
        || a.type === assetTypeFilter
        || (assetTypeFilter === "emtia" && (a.type === "emtia" || a.type === "madeni_para"));
      const matchSearch = !assetSearch
        || a.name?.toLowerCase().includes(assetSearch.toLowerCase())
        || a.symbol?.toLowerCase().includes(assetSearch.toLowerCase());
      return matchType && matchSearch;
    });
  }, [assets, assetTypeFilter, assetSearch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  ref={titleInputRef}
                  value={editTitleValue}
                  onChange={e => setEditTitleValue(e.target.value.replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s]/g, ""))}
                  onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setIsEditingTitle(false); setEditTitleValue(portfolioTitle); } }}
                  className="text-2xl font-semibold text-[#F0F2F7] bg-transparent border-b border-[#00D4AA] outline-none focus:border-[#00D4AA] w-52"
                  maxLength={30}
                  data-testid="input-portfolio-title"
                />
                <button onClick={saveTitle} className="p-1.5 rounded-lg text-[#00D4AA] hover:bg-[rgba(0,212,170,0.08)] transition-colors" data-testid="button-save-title">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => { setIsEditingTitle(false); setEditTitleValue(portfolioTitle); }} className="p-1.5 rounded-lg text-[#4E5A6B] hover:bg-[rgba(255,255,255,0.04)] transition-colors" data-testid="button-cancel-title">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <h1 className="text-2xl font-semibold text-[#F0F2F7]" data-testid="heading-portfolio">{portfolioTitle}</h1>
            )}
            {!isEditingTitle && (
              <button
                onClick={() => { setIsEditingTitle(true); setEditTitleValue(portfolioTitle); }}
                className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors text-[#4E5A6B] hover:text-[#F0F2F7]"
                title="Başlığı düzenle"
                data-testid="button-edit-title"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {!isEditingTitle && (
              <button
                onClick={() => setPrivacyMode(v => !v)}
                className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors text-[#4E5A6B] hover:text-[#F0F2F7]"
                data-testid="button-privacy-toggle"
              >
                {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}
          </div>
          <p className="text-sm text-[#8892A4] mt-1">
            Yatırımlarınızı tek platformda yönetin
            {lastUpdate && <span className="ml-2 text-xs text-[#4E5A6B]">(Son güncelleme: {lastUpdate})</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => updatePricesMutation.mutate()}
            disabled={updatePricesMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#8892A4] hover:border-[rgba(255,255,255,0.1)] hover:text-[#F0F2F7] transition-all disabled:opacity-50"
            data-testid="button-refresh-prices"
          >
            <RefreshCw className={`h-4 w-4 ${updatePricesMutation.isPending ? "animate-spin" : ""}`} />
            {updatePricesMutation.isPending ? "Güncelleniyor..." : "Fiyatları Güncelle"}
          </button>
          <button
            onClick={() => setIsAddAssetOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#00D4AA] rounded-lg text-sm font-medium text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors"
            data-testid="button-add-asset"
          >
            <Plus className="h-4 w-4" />
            Varlık Ekle
          </button>
        </div>
      </div>

      {/* Top Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        {/* Net Varlık */}
        <div className="finos-card p-5 md:col-span-2 hover-glow gradient-border-card">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-medium text-[#8892A4] uppercase tracking-wider">Net Varlık</p>
              <p className="text-xs text-[#4E5A6B] mt-0.5">Toplam portföy değeri</p>
            </div>
            <div className="flex items-center gap-1.5 bg-[rgba(0,212,170,0.1)] rounded-full px-2.5 py-1">
              <BarChart3 className="h-3.5 w-3.5 text-[#00D4AA]" />
              <span className="text-xs font-medium text-[#00D4AA]">Portföy</span>
            </div>
          </div>
          {isLoading ? <StatSkeleton /> : (
            <>
              <div className="count-animate">
                <PrivacyValue value={fmt(summary?.netWorth || 0)} hidden={privacyMode}
                  className="text-4xl font-bold text-[#F0F2F7] tracking-tight font-mono" />
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                {summary && (
                  <div className={`flex items-center gap-1 text-sm font-medium ${(summary.monthlyChangeAmount || 0) >= 0 ? "text-[#00D4AA]" : "text-[#FF4757]"}`}>
                    {(summary.monthlyChangeAmount || 0) >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    <PrivacyValue value={`${(summary.monthlyChangeAmount || 0) >= 0 ? "+" : ""}${fmt(summary.monthlyChangeAmount || 0)} toplam`} hidden={privacyMode} />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
                <div>
                  <p className="text-xs text-[#4E5A6B]">Toplam ROI</p>
                  <p className={`text-sm font-semibold font-mono ${(summary?.monthlyChange || 0) >= 0 ? "text-[#00D4AA]" : "text-[#FF4757]"}`}>
                    {privacyMode ? "••%" : fmtPct(summary?.monthlyChange || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#4E5A6B]">Toplam Varlık</p>
                  <PrivacyValue value={fmt(summary?.totalAssets || 0)} hidden={privacyMode} className="text-sm font-semibold text-[#F0F2F7] font-mono" />
                </div>
                <div>
                  <p className="text-xs text-[#4E5A6B]">Toplam Borç</p>
                  <PrivacyValue value={fmt(summary?.totalDebt || 0)} hidden={privacyMode} className="text-sm font-semibold text-[#F0F2F7] font-mono" />
                </div>
                <div className="ml-auto">
                  <Sparkline data={sparklineData} positive={(summary?.monthlyChange || 0) >= 0} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Günlük PnL */}
        <div className={`finos-card p-5 hover-glow gradient-border-card ${nonCryptoPnLTRY >= 0 ? "gradient-border-success hover-glow-success" : "gradient-border-destructive hover-glow-destructive"}`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-medium text-[#8892A4] uppercase tracking-wider">Günlük PnL</p>
              <p className="text-xs text-[#4E5A6B] mt-0.5">Hisse · ETF · Emtia · Döviz</p>
            </div>
            <div className={`p-1.5 rounded-lg ${nonCryptoPnLTRY >= 0 ? "bg-[rgba(0,212,170,0.1)]" : "bg-[rgba(255,71,87,0.1)]"}`}>
              <TrendingUp className={`h-4 w-4 ${nonCryptoPnLTRY >= 0 ? "text-[#00D4AA]" : "text-[#FF4757]"}`} />
            </div>
          </div>
          {isLoading ? <StatSkeleton /> : (
            <>
              <div className="count-animate">
                <PrivacyValue value={`${nonCryptoPnLTRY >= 0 ? "+" : ""}${fmt(nonCryptoPnLTRY)}`} hidden={privacyMode}
                  className={`text-2xl font-bold font-mono ${nonCryptoPnLTRY >= 0 ? "text-[#00D4AA]" : "text-[#FF4757]"}`} />
              </div>
              <div className={`flex items-center gap-1 mt-1 text-sm font-medium font-mono ${nonCryptoPnLPct >= 0 ? "text-[#00D4AA]" : "text-[#FF4757]"}`}>
                {nonCryptoPnLPct >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {privacyMode ? "••%" : `${fmtPct(nonCryptoPnLPct)} ortalama`}
              </div>
              {bestNonCrypto ? (
                <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                  <p className="text-xs text-[#4E5A6B] mb-1">En iyi performans</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#F0F2F7]">{bestNonCrypto.symbol}</span>
                    <span className={`text-sm font-semibold font-mono ${bestNonCrypto.change >= 0 ? "text-[#00D4AA]" : "text-[#FF4757]"}`}>
                      {privacyMode ? "••%" : fmtPct(bestNonCrypto.change)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#4E5A6B] mt-4">Hisse/ETF varlığı bulunamadı</p>
              )}
            </>
          )}
        </div>

        {/* Kripto PnL */}
        <div className={`finos-card p-5 hover-glow gradient-border-card ${cryptoPnLTRY >= 0 ? "gradient-border-success hover-glow-success" : "gradient-border-destructive hover-glow-destructive"}`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs font-medium text-[#8892A4] uppercase tracking-wider">Kripto PnL</p>
              <p className="text-xs text-[#4E5A6B] mt-0.5">Kripto Varlıklar</p>
            </div>
            <div className="p-1.5 rounded-lg bg-[rgba(255,184,51,0.1)]">
              <Bitcoin className="h-4 w-4 text-[#FFB833]" />
            </div>
          </div>
          {isLoading ? <StatSkeleton /> : (
            <>
              <div className="count-animate">
                <PrivacyValue value={`${cryptoPnLTRY >= 0 ? "+" : ""}${fmt(cryptoPnLTRY)}`} hidden={privacyMode}
                  className={`text-2xl font-bold font-mono ${cryptoPnLTRY >= 0 ? "text-[#00D4AA]" : "text-[#FF4757]"}`} />
              </div>
              <div className={`flex items-center gap-1 mt-1 text-sm font-medium font-mono ${cryptoPnLPct >= 0 ? "text-[#00D4AA]" : "text-[#FF4757]"}`}>
                {cryptoPnLPct >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {privacyMode ? "••%" : `${fmtPct(cryptoPnLPct)} ortalama`}
              </div>
              {bestCrypto ? (
                <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                  <p className="text-xs text-[#4E5A6B] mb-1">En iyi performans</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#F0F2F7]">{bestCrypto.symbol}</span>
                    <span className={`text-sm font-semibold font-mono ${bestCrypto.change >= 0 ? "text-[#00D4AA]" : "text-[#FF4757]"}`}>
                      {privacyMode ? "••%" : fmtPct(bestCrypto.change)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#4E5A6B] mt-4">Kripto varlığı bulunamadı</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Risk Card — tüm içerik dikey ortada */}
      <div className="finos-card p-5" style={{ borderLeft: `3px solid ${riskHex}` }}>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3 min-w-[140px]">
            <div className="p-2 rounded-xl" style={{ backgroundColor: `${riskHex}15` }}>
              <Shield className="h-5 w-5" style={{ color: riskHex }} />
            </div>
            <div>
              <p className="text-xs font-medium text-[#8892A4] uppercase tracking-wider">Risk Seviyesi</p>
              <p className="text-xl font-bold mt-0.5 font-mono" style={{ color: riskHex }}>{riskLabel}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 flex-1">
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-xs text-[#4E5A6B] text-center">Risk Skoru</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono" style={{ color: riskHex }}>{riskScore.toFixed(1)}/10</span>
                <div className="flex gap-1">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div key={i} className="risk-dash" style={{ backgroundColor: i < Math.round(riskScore) ? riskHex : "#151A23" }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-xs text-[#4E5A6B] text-center">Kripto Ağırlığı</p>
              <p className="text-lg font-bold font-mono text-[#F0F2F7]">%{cryptoWeight.toFixed(1)}</p>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-xs text-[#4E5A6B] text-center">Volatilite</p>
              <p className="text-lg font-bold font-mono text-[#F0F2F7]">{volatility.toFixed(1)}%</p>
              <p className="text-xs text-[#4E5A6B] text-center">Ortalama değişim</p>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-xs text-[#4E5A6B] text-center">Konsantrasyon</p>
              <p className="text-lg font-bold font-mono text-[#F0F2F7]">%{topConcentration.toFixed(1)}</p>
              <p className="text-xs text-[#4E5A6B] text-center">En büyük pozisyon</p>
            </div>
            <div className="flex items-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: `${riskHex}15` }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: riskHex }} />
                <span className="text-sm font-medium" style={{ color: riskHex }}>Dengeli portföy</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Insights ticker */}
      <div className="finos-card p-0 overflow-hidden">
        <div className="flex items-center">
          <div className="flex-shrink-0 px-4 py-3 bg-[#151A23] border-r border-[rgba(255,255,255,0.06)]">
            <span className="text-xs font-bold text-[#00D4AA] uppercase tracking-wider flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] animate-pulse" />
              INSİGHT
            </span>
          </div>
          <div className="overflow-hidden flex-1 relative">
            <div className="ticker-scroll flex items-center gap-8 py-3 px-4 whitespace-nowrap">
              {[...insights, ...insights].map((msg, i) => (
                <span key={i} className="text-xs text-[#8892A4] flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-[#4E5A6B]" />
                  {msg}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Varlık Dağılımı - Simit Grafik */}
        <div className="finos-card p-5">
          <h3 className="text-sm font-semibold text-[#F0F2F7] mb-4">Varlık Dağılımı</h3>
          {allocationLoading ? (
            <div className="h-[280px] skeleton-shimmer" />
          ) : (
            <AssetAllocationChart data={allocation || []} />
          )}
        </div>

        {/* Bütçe Bakiyesi Performansı */}
       
         <div className="finos-card p-5">

          <div className="flex items-start justify-between mb-3">

            <div>

              <h3 className="text-sm font-semibold text-[#F0F2F7]">Bütçe Bakiyesi Performansı</h3>

              <div className="flex items-baseline gap-2 mt-1">

                <span className={`text-2xl font-bold font-mono ${totalBakiye >= 0 ? "text-[#00D4AA]" : "text-[#FF4757]"}`}>

                  {privacyMode ? "•••••" : totalBakiye.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 })}

                </span>

                <span className="text-xs text-[#4E5A6B]">Toplam Bakiye</span>

              </div>

            </div>

            <div className="flex gap-1">

              {["monthly", "quarterly", "yearly"].map(p => (

                <button key={p} onClick={() => setPerfPeriod(p)}

                  className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"

                  style={{ background: perfPeriod === p ? "#00D4AA" : "rgba(255,255,255,0.04)", color: perfPeriod === p ? "#080A0F" : "#8892A4" }}>

                  {p === "monthly" ? "Günlük" : p === "quarterly" ? "Haftalık" : "Aylık"}

                </button>

              ))}

            </div>

          </div>

          {budgetPerfLoading ? (

            <div className="h-[220px] skeleton-shimmer" />

          ) : (

            <MonthlyPerformanceChart data={budgetPerformance || []} />

          )}

        </div>

      </div>

      {/* Asset Table */}
      <div className="finos-card p-5">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-sm font-semibold text-[#F0F2F7]">Varlıklarım</h3>
            {/* Kategori Filtre Sekmeleri */}
            <div className="flex gap-1 flex-wrap" data-testid="asset-type-filters">
              {ASSET_FILTERS.map(f => {
                const count = f.key === "all"
                  ? (assets || []).length
                  : (assets || []).filter(a => a.type === f.key || (f.key === "emtia" && a.type === "madeni_para")).length;
                const isActive = assetTypeFilter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setAssetTypeFilter(f.key)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: isActive ? "rgba(0,212,170,0.12)" : "rgba(255,255,255,0.04)",
                      color: isActive ? "#00D4AA" : "#8892A4",
                      border: isActive ? "1px solid rgba(0,212,170,0.3)" : "1px solid rgba(255,255,255,0.06)",
                    }}
                    data-testid={`filter-${f.key}`}
                  >
                    {f.label}
                    {count > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: isActive ? "rgba(0,212,170,0.2)" : "rgba(255,255,255,0.06)", color: isActive ? "#00D4AA" : "#4E5A6B" }}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              placeholder="Varlık ara..."
              value={assetSearch}
              onChange={e => setAssetSearch(e.target.value)}
              className="px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#00D4AA] transition-colors w-48"
              data-testid="input-asset-search"
            />
            {(assets || []).length > 0 && (
              <>
                <button onClick={() => exportAssetsToPDF(filteredAssets)} className="flex items-center gap-1.5 px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-xs text-[#8892A4] hover:text-[#F0F2F7] transition-colors" data-testid="button-assets-export-pdf">
                  <FileText className="h-3.5 w-3.5" /> PDF
                </button>
                <button onClick={() => exportAssetsToExcel(filteredAssets)} className="flex items-center gap-1.5 px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-xs text-[#8892A4] hover:text-[#F0F2F7] transition-colors" data-testid="button-assets-export-excel">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                </button>
              </>
            )}
          </div>
        </div>
        {assetsLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-14 skeleton-shimmer" />)}
          </div>
        ) : (
          <AssetTable assets={filteredAssets} />
        )}
      </div>

      {/* Portföy Sağlık Puanı */}
      <PortfolioHealthScore
        assets={assets || []}
        budgetSummary={budgetSummary}
        portfolioSummary={summary}
        privacyMode={privacyMode}
      />

      <AddAssetDialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen} />
    </div>
  );
}
