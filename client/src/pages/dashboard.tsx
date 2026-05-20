import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, TrendingUp, TrendingDown, RefreshCw, Eye, EyeOff,
  Shield, Bitcoin, BarChart3, ArrowUpRight, ArrowDownRight,
  Flame, AlertTriangle, CheckCircle, Activity, FileText, FileSpreadsheet
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { exportAssetsToPDF, exportAssetsToExcel } from "@/lib/export-utils";
import { AddAssetDialog } from "@/components/add-asset-dialog";
import { AssetTable } from "@/components/asset-table";
import { AssetAllocationChart } from "@/components/asset-allocation-chart";
import { MonthlyPerformanceChart } from "@/components/monthly-performance-chart";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDisplayCurrency } from "@/lib/currency-context";
import type { PortfolioSummary, AssetDetail, AssetAllocation, MonthlyPerformance } from "@shared/schema";

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const color = positive ? "hsl(158 84% 39%)" : "hsl(0 84% 60%)";
  const fillColor = positive ? "hsl(158 84% 39% / 0.15)" : "hsl(0 84% 60% / 0.15)";
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
      {hidden ? <span className="tracking-widest text-muted-foreground">••••• ₺</span> : value}
    </span>
  );
}

export default function Dashboard() {
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [perfPeriod, setPerfPeriod] = useState<string>("monthly");
  const [assetSearch, setAssetSearch] = useState("");
  const [privacyMode, setPrivacyMode] = useState(false);
  const { toast } = useToast();
  const { formatDisplayCurrency, displayCurrency, isLoadingRates } = useDisplayCurrency();

  const { data: summary, isLoading: summaryLoading } = useQuery<PortfolioSummary>({
    queryKey: ["/api/portfolio/summary"],
  });

  const { data: assets, isLoading: assetsLoading, error: assetsError } = useQuery<AssetDetail[]>({
    queryKey: ["/api/portfolio/details"],
  });

  const { data: allocation, isLoading: allocationLoading, error: allocationError } = useQuery<AssetAllocation[]>({
    queryKey: ["/api/portfolio/allocation"],
  });

  const { data: performance, isLoading: performanceLoading, error: performanceError } = useQuery<MonthlyPerformance[]>({
    queryKey: [`/api/portfolio/performance?period=${perfPeriod}`],
  });

  const updatePricesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/prices/update");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/allocation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/performance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setLastUpdate(new Date().toLocaleTimeString("tr-TR"));
      toast({ title: "Fiyatlar Güncellendi", description: data.message });
    },
    onError: () => {
      toast({ title: "Hata", description: "Fiyatlar güncellenirken bir hata oluştu", variant: "destructive" });
    },
  });

  const formatCurrency = (amount: number) => formatDisplayCurrency(amount);
  const formatPercent = (p: number) => `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;

  const profitTRY = (asset: AssetDetail) => {
    if (!asset.change || Math.abs(asset.change) < 0.0001) return 0;
    return asset.totalValueTRY * (asset.change / 100) / (1 + asset.change / 100);
  };

  const { nonCryptoAssets, cryptoAssets, nonCryptoPnLTRY, cryptoPnLTRY,
    nonCryptoPnLPct, cryptoPnLPct, bestNonCrypto, bestCrypto, worstAsset,
    cryptoWeight, riskScore, riskLabel, riskColor, volatility,
    topConcentration, sparklineData } = useMemo(() => {
    const all = assets || [];
    const nonCrypto = all.filter(a => a.type !== "kripto");
    const crypto = all.filter(a => a.type === "kripto");

    const sumProfitTRY = (list: AssetDetail[]) =>
      list.reduce((s, a) => s + profitTRY(a), 0);
    const sumValueTRY = (list: AssetDetail[]) =>
      list.reduce((s, a) => s + a.totalValueTRY, 0);

    const ncPnL = sumProfitTRY(nonCrypto);
    const cPnL = sumProfitTRY(crypto);
    const ncVal = sumValueTRY(nonCrypto);
    const cVal = sumValueTRY(crypto);
    const totalVal = sumValueTRY(all);

    const ncPct = ncVal > 0 ? (ncPnL / (ncVal - ncPnL)) * 100 : 0;
    const cPct = cVal > 0 ? (cPnL / (cVal - cPnL)) * 100 : 0;

    const bestNC = nonCrypto.length > 0
      ? nonCrypto.reduce((a, b) => a.change > b.change ? a : b)
      : null;
    const bestC = crypto.length > 0
      ? crypto.reduce((a, b) => a.change > b.change ? a : b)
      : null;
    const worst = all.length > 0
      ? all.reduce((a, b) => a.change < b.change ? a : b)
      : null;

    const cryptoAlloc = allocation?.find(a => a.type === "kripto");
    const cryptoW = cryptoAlloc?.percentage || 0;

    const changes = all.map(a => Math.abs(a.change));
    const avgChange = changes.length > 0 ? changes.reduce((s, v) => s + v, 0) / changes.length : 0;
    const vol = avgChange;

    let score = 1;
    if (cryptoW < 10) score = 2;
    else if (cryptoW < 20) score = 3;
    else if (cryptoW < 30) score = 4;
    else if (cryptoW < 40) score = 5;
    else if (cryptoW < 50) score = 6;
    else if (cryptoW < 60) score = 7;
    else if (cryptoW < 75) score = 8;
    else if (cryptoW < 90) score = 9;
    else score = 10;
    if (vol > 15) score = Math.min(10, score + 1);

    let label = "Düşük Risk";
    let color = "success";
    if (score >= 7) { label = "Agresif"; color = "destructive"; }
    else if (score >= 5) { label = "Yüksek"; color = "warning"; }
    else if (score >= 3) { label = "Orta Risk"; color = "warning"; }

    const topAsset = all.length > 0
      ? all.reduce((a, b) => a.totalValueTRY > b.totalValueTRY ? a : b)
      : null;
    const topConc = totalVal > 0 && topAsset
      ? (topAsset.totalValueTRY / totalVal) * 100
      : 0;

    const sparkData = (performance || []).map(p => p.value).slice(-12);

    return {
      nonCryptoAssets: nonCrypto,
      cryptoAssets: crypto,
      nonCryptoPnLTRY: ncPnL,
      cryptoPnLTRY: cPnL,
      nonCryptoPnLPct: ncPct,
      cryptoPnLPct: cPct,
      bestNonCrypto: bestNC,
      bestCrypto: bestC,
      worstAsset: worst,
      cryptoWeight: cryptoW,
      riskScore: score,
      riskLabel: label,
      riskColor: color,
      volatility: vol,
      topConcentration: topConc,
      sparklineData: sparkData,
    };
  }, [assets, allocation, performance]);

  const insights = useMemo(() => {
    const all = assets || [];
    const msgs: string[] = [];

    const roi = summary?.monthlyChange || 0;
    if (roi > 5) msgs.push(`Portföy toplam +${roi.toFixed(1)}% getiri sağladı`);
    else if (roi < -5) msgs.push(`Portföy toplam ${roi.toFixed(1)}% kayıpla karşılaştı`);
    else msgs.push(`Portföy toplam ${roi >= 0 ? "+" : ""}${roi.toFixed(1)}% getiri sağladı`);

    if (cryptoWeight > 50) msgs.push(`Kripto ağırlığı yüksek: %${cryptoWeight.toFixed(0)} — risk artışına dikkat`);
    else if (cryptoWeight > 0) msgs.push(`Kripto ağırlığı: %${cryptoWeight.toFixed(0)}`);

    if (bestNonCrypto && bestNonCrypto.change > 0)
      msgs.push(`En iyi hisse performansı: ${bestNonCrypto.symbol} +${bestNonCrypto.change.toFixed(1)}%`);
    if (bestCrypto && bestCrypto.change > 0)
      msgs.push(`En iyi kripto performansı: ${bestCrypto.symbol} +${bestCrypto.change.toFixed(1)}%`);
    if (worstAsset && worstAsset.change < -2)
      msgs.push(`En büyük düşüş: ${worstAsset.symbol} ${worstAsset.change.toFixed(1)}%`);

    if (all.length === 0) msgs.push("Varlık eklemeye başlayın — yatırım portföyünüzü buradan yönetin");

    if (topConcentration > 60)
      msgs.push(`Konsantrasyon riski: En büyük varlık portföyün %${topConcentration.toFixed(0)}'ını oluşturuyor`);
    else if (topConcentration > 0)
      msgs.push(`En büyük pozisyon portföyün %${topConcentration.toFixed(0)}'ını oluşturuyor`);

    if (nonCryptoPnLTRY > 0) msgs.push(`Hisse/ETF günlük kâr: +${formatCurrency(nonCryptoPnLTRY)}`);
    if (cryptoPnLTRY > 0) msgs.push(`Kripto günlük kâr: +${formatCurrency(cryptoPnLTRY)}`);

    msgs.push(`Toplam ${all.length} varlık izleniyor`);
    if (riskScore <= 3) msgs.push("Portföy düşük risk profilinde seyrediyor");
    else if (riskScore >= 8) msgs.push("Yüksek risk profili — portföy çeşitlendirmesi önerilebilir");

    return msgs.length > 0 ? msgs : ["Portföy verilerini yükleyin"];
  }, [assets, summary, bestNonCrypto, bestCrypto, worstAsset, cryptoWeight, riskScore, nonCryptoPnLTRY, cryptoPnLTRY, topConcentration]);

  const isLoading = summaryLoading || assetsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-foreground" data-testid="heading-portfolio">
              Portföyüm
            </h1>
            <button
              onClick={() => setPrivacyMode(v => !v)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title={privacyMode ? "Rakamları göster" : "Rakamları gizle"}
              data-testid="button-privacy-toggle"
            >
              {privacyMode ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Yatırımlarınızı tek platformda yönetin
            {lastUpdate && <span className="ml-2 text-xs">(Son güncelleme: {lastUpdate})</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => updatePricesMutation.mutate()}
            disabled={updatePricesMutation.isPending}
            data-testid="button-refresh-prices"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${updatePricesMutation.isPending ? "animate-spin" : ""}`} />
            {updatePricesMutation.isPending ? "Güncelleniyor..." : "Fiyatları Güncelle"}
          </Button>
          <Button onClick={() => setIsAddAssetOpen(true)} data-testid="button-add-asset">
            <Plus className="h-4 w-4 mr-2" />
            Varlık Ekle
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <div className="gradient-border-card hover-glow glass-card md:col-span-2">
          <div className="bg-card rounded-[calc(var(--radius)+1px)] p-5 h-full" style={{ background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--primary)/0.06) 100%)" }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Varlık</p>
                <p className="text-xs text-muted-foreground mt-0.5">Toplam portföy değeri</p>
              </div>
              <div className="flex items-center gap-1.5 bg-primary/10 rounded-full px-2.5 py-1">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">Portföy</span>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                <div className="h-10 w-48 bg-muted animate-pulse rounded" />
                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="count-animate">
                  <PrivacyValue
                    value={formatCurrency(summary?.netWorth || 0)}
                    hidden={privacyMode}
                    className="text-4xl font-bold text-foreground tracking-tight"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-3">
                  {summary && (
                    <div className={`flex items-center gap-1 text-sm font-medium ${(summary.monthlyChangeAmount || 0) >= 0 ? "text-success" : "text-destructive"}`}>
                      {(summary.monthlyChangeAmount || 0) >= 0
                        ? <ArrowUpRight className="h-4 w-4" />
                        : <ArrowDownRight className="h-4 w-4" />}
                      <PrivacyValue
                        value={`${(summary.monthlyChangeAmount || 0) >= 0 ? "+" : ""}${formatCurrency(summary.monthlyChangeAmount || 0)} toplam`}
                        hidden={privacyMode}
                      />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border/50">
                  <div>
                    <p className="text-xs text-muted-foreground">Toplam ROI</p>
                    <p className={`text-sm font-semibold ${(summary?.monthlyChange || 0) >= 0 ? "text-success" : "text-destructive"}`}>
                      {privacyMode ? "••%" : formatPercent(summary?.monthlyChange || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Toplam Varlık</p>
                    <PrivacyValue
                      value={formatCurrency(summary?.totalAssets || 0)}
                      hidden={privacyMode}
                      className="text-sm font-semibold text-foreground"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Toplam Borç</p>
                    <PrivacyValue
                      value={formatCurrency(summary?.totalDebt || 0)}
                      hidden={privacyMode}
                      className="text-sm font-semibold text-foreground"
                    />
                  </div>
                  <div className="ml-auto">
                    <Sparkline data={sparklineData} positive={(summary?.monthlyChange || 0) >= 0} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className={`gradient-border-card glass-card ${nonCryptoPnLTRY >= 0 ? "gradient-border-success hover-glow-success" : "gradient-border-destructive hover-glow-destructive"} hover-glow`}
          style={{ transition: "box-shadow 0.3s ease, transform 0.2s ease" }}>
          <div className="bg-card rounded-[calc(var(--radius)+1px)] p-5 h-full"
            style={{ background: nonCryptoPnLTRY >= 0 ? "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(158 84% 39% / 0.05) 100%)" : "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(0 84% 60% / 0.05) 100%)" }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Günlük PnL</p>
                <p className="text-xs text-muted-foreground mt-0.5">Hisse · ETF · Emtia · Döviz</p>
              </div>
              <div className={`p-1.5 rounded-lg ${nonCryptoPnLTRY >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                <TrendingUp className={`h-4 w-4 ${nonCryptoPnLTRY >= 0 ? "text-success" : "text-destructive"}`} />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="count-animate">
                  <PrivacyValue
                    value={`${nonCryptoPnLTRY >= 0 ? "+" : ""}${formatCurrency(nonCryptoPnLTRY)}`}
                    hidden={privacyMode}
                    className={`text-2xl font-bold ${nonCryptoPnLTRY >= 0 ? "text-success" : "text-destructive"}`}
                  />
                </div>

                <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${nonCryptoPnLPct >= 0 ? "text-success" : "text-destructive"}`}>
                  {nonCryptoPnLPct >= 0
                    ? <ArrowUpRight className="h-3.5 w-3.5" />
                    : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {privacyMode ? "••%" : `${formatPercent(nonCryptoPnLPct)} ortalama`}
                </div>

                {bestNonCrypto && (
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">En iyi performans</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{bestNonCrypto.symbol}</span>
                      <span className={`text-sm font-semibold ${bestNonCrypto.change >= 0 ? "text-success" : "text-destructive"}`}>
                        {privacyMode ? "••%" : formatPercent(bestNonCrypto.change)}
                      </span>
                    </div>
                  </div>
                )}

                {nonCryptoAssets.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-4">Hisse/ETF varlığı bulunamadı</p>
                )}
              </>
            )}
          </div>
        </div>

        <div className={`gradient-border-card glass-card ${cryptoPnLTRY >= 0 ? "gradient-border-success hover-glow-success" : "gradient-border-destructive hover-glow-destructive"} hover-glow`}
          style={{ transition: "box-shadow 0.3s ease, transform 0.2s ease" }}>
          <div className="bg-card rounded-[calc(var(--radius)+1px)] p-5 h-full"
            style={{ background: cryptoPnLTRY >= 0 ? "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(43 96% 56% / 0.05) 100%)" : "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(0 84% 60% / 0.05) 100%)" }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kripto PnL</p>
                <p className="text-xs text-muted-foreground mt-0.5">Kripto Varlıklar</p>
              </div>
              <div className="p-1.5 rounded-lg bg-yellow-500/10">
                <Bitcoin className="h-4 w-4 text-yellow-500" />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <>
                <div className="count-animate">
                  <PrivacyValue
                    value={`${cryptoPnLTRY >= 0 ? "+" : ""}${formatCurrency(cryptoPnLTRY)}`}
                    hidden={privacyMode}
                    className={`text-2xl font-bold ${cryptoPnLTRY >= 0 ? "text-success" : "text-destructive"}`}
                  />
                </div>

                <div className={`flex items-center gap-1 mt-1 text-sm font-medium ${cryptoPnLPct >= 0 ? "text-success" : "text-destructive"}`}>
                  {cryptoPnLPct >= 0
                    ? <ArrowUpRight className="h-3.5 w-3.5" />
                    : <ArrowDownRight className="h-3.5 w-3.5" />}
                  {privacyMode ? "••%" : `${formatPercent(cryptoPnLPct)} ortalama`}
                </div>

                {bestCrypto && (
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground mb-1">En iyi performans</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{bestCrypto.symbol}</span>
                      <span className={`text-sm font-semibold ${bestCrypto.change >= 0 ? "text-success" : "text-destructive"}`}>
                        {privacyMode ? "••%" : formatPercent(bestCrypto.change)}
                      </span>
                    </div>
                  </div>
                )}

                {cryptoAssets.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-4">Kripto varlığı bulunamadı</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className={`gradient-border-card glass-card hover-glow ${riskColor === "success" ? "" : riskColor === "warning" ? "gradient-border-warning" : "gradient-border-destructive"}`}>
        <div className="bg-card rounded-[calc(var(--radius)+1px)] p-5"
          style={{
            background: riskColor === "success"
              ? "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(158 84% 39% / 0.04) 100%)"
              : riskColor === "warning"
              ? "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(43 96% 56% / 0.05) 100%)"
              : "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(0 84% 60% / 0.05) 100%)"
          }}>
          <div className="flex flex-wrap items-start gap-6">
            <div className="flex items-center gap-3 min-w-[140px]">
              <div className={`p-2 rounded-xl ${riskColor === "success" ? "bg-success/10" : riskColor === "warning" ? "bg-yellow-500/10" : "bg-destructive/10"}`}>
                <Shield className={`h-5 w-5 ${riskColor === "success" ? "text-success" : riskColor === "warning" ? "text-yellow-500" : "text-destructive"}`} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Seviyesi</p>
                <p className={`text-xl font-bold mt-0.5 ${riskColor === "success" ? "text-success" : riskColor === "warning" ? "text-yellow-500" : "text-destructive"}`}>
                  {riskLabel}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 flex-1">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Risk Skoru</p>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${riskColor === "success" ? "text-success" : riskColor === "warning" ? "text-yellow-500" : "text-destructive"}`}>
                    {riskScore.toFixed(1)}/10
                  </span>
                </div>
                <div className="flex gap-0.5 mt-1.5">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-4 rounded-full ${i < riskScore
                        ? riskScore <= 3 ? "bg-success" : riskScore <= 6 ? "bg-yellow-500" : "bg-destructive"
                        : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Kripto Ağırlığı</p>
                <p className="text-lg font-bold text-foreground">%{cryptoWeight.toFixed(1)}</p>
                <div className="h-1.5 w-24 bg-muted rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${cryptoWeight > 50 ? "bg-destructive" : cryptoWeight > 25 ? "bg-yellow-500" : "bg-success"}`}
                    style={{ width: `${Math.min(cryptoWeight, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Volatilite</p>
                <p className="text-lg font-bold text-foreground">{volatility.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Ortalama değişim</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">Konsantrasyon</p>
                <p className="text-lg font-bold text-foreground">%{topConcentration.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">En büyük pozisyon</p>
              </div>

              <div className="ml-auto flex items-center gap-2 self-center">
                {riskScore <= 3 && <CheckCircle className="h-5 w-5 text-success" />}
                {riskScore > 3 && riskScore <= 6 && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                {riskScore > 6 && <Flame className="h-5 w-5 text-destructive" />}
                <span className="text-xs text-muted-foreground">
                  {riskScore <= 3 ? "Dengeli portföy" : riskScore <= 6 ? "Orta risk profili" : "Yüksek risk profili"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/30 relative" data-testid="insights-ticker">
        <div className="flex items-center">
          <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-l-lg z-10">
            <Activity className="h-3 w-3" />
            <span>Insight</span>
          </div>
          <div className="overflow-hidden flex-1 py-2 px-3">
            <div className="flex whitespace-nowrap ticker-scroll">
              {[...insights, ...insights].map((msg, i) => (
                <span key={i} className="inline-flex items-center text-xs text-muted-foreground mr-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 mr-2 flex-shrink-0" />
                  {msg}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-asset-allocation">
          <CardHeader>
            <CardTitle>Varlık Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {allocationLoading ? (
              <div className="h-[300px] w-full bg-muted animate-pulse rounded" />
            ) : allocationError ? (
              <div className="flex items-center justify-center h-[300px] text-destructive">Veri yüklenemedi</div>
            ) : (
              <AssetAllocationChart data={allocation || []} />
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-monthly-performance">
          <CardHeader className="pb-2">
            <CardTitle>Portföy Performansı</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={perfPeriod} onValueChange={setPerfPeriod} className="mb-4">
              <TabsList>
                <TabsTrigger value="daily" data-testid="tab-perf-daily">Günlük</TabsTrigger>
                <TabsTrigger value="weekly" data-testid="tab-perf-weekly">Haftalık</TabsTrigger>
                <TabsTrigger value="monthly" data-testid="tab-perf-monthly">Aylık</TabsTrigger>
              </TabsList>
            </Tabs>
            {performanceLoading ? (
              <div className="h-[300px] w-full bg-muted animate-pulse rounded" />
            ) : performanceError ? (
              <div className="flex items-center justify-center h-[300px] text-destructive">Veri yüklenemedi</div>
            ) : (
              <MonthlyPerformanceChart data={performance || []} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-assets-list">
        <CardHeader>
          <CardTitle>Varlıklarım</CardTitle>
        </CardHeader>
        <CardContent>
          {assetsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 w-full bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : assetsError ? (
            <div className="text-center py-12 text-destructive">Varlıklar yüklenirken bir hata oluştu</div>
          ) : (
            <Tabs defaultValue="tumu" data-testid="tabs-assets">
              <TabsList className="mb-4 flex w-full flex-wrap justify-start gap-1">
                <TabsTrigger value="tumu" data-testid="tab-tumu">Tümü</TabsTrigger>
                <TabsTrigger value="hisse" data-testid="tab-hisse">Hisse Senedi</TabsTrigger>
                <TabsTrigger value="kripto" data-testid="tab-kripto">Kripto</TabsTrigger>
                <TabsTrigger value="etf" data-testid="tab-etf">ETF</TabsTrigger>
                <TabsTrigger value="madeni_para" data-testid="tab-madeni-para">Madeni Para</TabsTrigger>
                <div className="ml-auto w-full sm:w-[320px]">
                  <Input
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    placeholder="Varlık adı, sembol, piyasa veya tür ara..."
                    data-testid="input-asset-search"
                  />
                </div>
              </TabsList>
              <TabsContent value="tumu">
                <AssetTable assets={assets || []} searchTerm={assetSearch} />
              </TabsContent>
              <TabsContent value="hisse">
                <AssetTable assets={(assets || []).filter(a => a.type === "hisse")} searchTerm={assetSearch} />
              </TabsContent>
              <TabsContent value="kripto">
                <AssetTable assets={(assets || []).filter(a => a.type === "kripto")} searchTerm={assetSearch} />
              </TabsContent>
              <TabsContent value="etf">
                <AssetTable assets={(assets || []).filter(a => a.type === "etf")} searchTerm={assetSearch} />
              </TabsContent>
              <TabsContent value="madeni_para">
                <AssetTable assets={(assets || []).filter(a => a.type === "madeni_para")} searchTerm={assetSearch} />
              </TabsContent>
            </Tabs>
          )}

          {!assetsLoading && !assetsError && (assets || []).length > 0 && (
            <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground mr-2">Dışa Aktar:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportAssetsToPDF(assets || [])}
                data-testid="button-assets-export-pdf"
              >
                <FileText className="h-4 w-4 mr-1.5" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportAssetsToExcel(assets || [])}
                data-testid="button-assets-export-excel"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                Excel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AddAssetDialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen} />
    </div>
  );
}
