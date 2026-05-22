import { useQuery } from "@tanstack/react-query";
import { AssetAllocationChart } from "@/components/asset-allocation-chart";
import { useDisplayCurrency } from "@/lib/currency-context";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import type { AssetAllocation, AssetDetail, MonthlyPerformance } from "@shared/schema";
import { useState } from "react";

interface BenchmarkPoint { month: string; bist100: number | null; altin: number | null; btc: number | null; }

const TYPE_NAMES: Record<string, string> = {
  hisse: "Hisse Senetleri", etf: "ETF'ler", kripto: "Kripto Paralar", madeni_para: "Emtia",
};
const TYPE_COLORS: Record<string, string> = {
  hisse: "#4B9EFF", etf: "#A78BFA", kripto: "#FFB833", madeni_para: "#00D4AA",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const labelMap: Record<string, string> = { portfoy: "Portföyüm", bist100: "XU100", altin: "Altın", btc: "Bitcoin" };
  return (
    <div className="finos-card-inner p-3 text-xs space-y-1 shadow-xl">
      <p className="font-semibold text-[#F0F2F7] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {labelMap[p.dataKey] || p.dataKey}: {p.value !== null && p.value !== undefined ? `${p.value > 0 ? "+" : ""}${p.value}%` : "—"}
        </p>
      ))}
    </div>
  );
};

export default function Reports() {
  const { formatDisplayCurrency, formatAssetValue } = useDisplayCurrency();
  const [activeTab, setActiveTab] = useState("hisse");

  const { data: allocation, isLoading: allocationLoading } = useQuery<AssetAllocation[]>({ queryKey: ["/api/portfolio/allocation"] });
  const { data: assets, isLoading: assetsLoading } = useQuery<AssetDetail[]>({ queryKey: ["/api/portfolio/details"] });
  const { data: performance } = useQuery<MonthlyPerformance[]>({ queryKey: ["/api/portfolio/performance"] });
  const { data: benchmark, isLoading: benchmarkLoading } = useQuery<BenchmarkPoint[]>({ queryKey: ["/api/benchmark"] });

  const getAssetsByType = (type: string) => assets?.filter((a) => a.type === type) || [];
  const getTotalByType = (type: string) => getAssetsByType(type).reduce((sum, a) => sum + (a.totalValueTRY || 0), 0);

  const chartData = (benchmark ?? []).map((b, i) => ({
    month: b.month,
    portfoy: performance?.[i]?.value ?? 0,
    bist100: b.bist100, altin: b.altin, btc: b.btc,
  }));

  const typeAssets = getAssetsByType(activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#F0F2F7]" data-testid="heading-reports">Raporlar</h1>
        <p className="text-sm text-[#8892A4] mt-1">Portföyünüzün detaylı analizini görüntüleyin</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {["hisse","etf","kripto","madeni_para"].map((type) => {
          const total = getTotalByType(type);
          const count = getAssetsByType(type).length;
          const color = TYPE_COLORS[type];
          return (
            <div key={type} className="finos-card p-5" data-testid={`summary-card-${type}`}>
              {assetsLoading ? (
                <div className="space-y-2"><div className="h-4 w-20 skeleton-shimmer" /><div className="h-8 w-32 skeleton-shimmer" /></div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-[#8892A4] uppercase tracking-wide">{TYPE_NAMES[type]}</span>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  </div>
                  <div className="text-xl font-bold font-mono text-[#F0F2F7]">{formatDisplayCurrency(total)}</div>
                  <div className="text-xs text-[#4E5A6B] mt-1">{count} varlık</div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="finos-card p-5" data-testid="card-allocation-report">
          <h3 className="text-sm font-semibold text-[#F0F2F7] mb-4">Varlık Sınıfı Dağılımı</h3>
          {allocationLoading ? <div className="h-[300px] skeleton-shimmer" /> : <AssetAllocationChart data={allocation || []} />}
        </div>

        <div className="finos-card p-5" data-testid="card-benchmark">
          <h3 className="text-sm font-semibold text-[#F0F2F7] mb-1">Benchmark Kıyaslaması</h3>
          <p className="text-xs text-[#4E5A6B] mb-4">Portföy vs BIST100 / Altın / Bitcoin — 12 aylık kümülatif % getiri</p>
          {benchmarkLoading ? (
            <div className="h-[300px] skeleton-shimmer" />
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-[#4E5A6B] text-sm">Kıyaslama verisi yüklenemedi</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#4E5A6B" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#4E5A6B" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={v => ({ portfoy: "Portföyüm", bist100: "XU100", altin: "Altın", btc: "Bitcoin" }[v] || v)} wrapperStyle={{ color: "#8892A4", fontSize: 11 }} />
                <Line type="monotone" dataKey="portfoy" name="portfoy" stroke="#4B9EFF" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="altin" name="altin" stroke="#FFB833" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="bist100" name="bist100" stroke="#00D4AA" strokeWidth={3} dot={{ r: 4, fill: "#00D4AA" }} connectNulls />
                <Line type="monotone" dataKey="btc" name="btc" stroke="#FF4757" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Detailed breakdown */}
      <div className="finos-card p-5" data-testid="card-detailed-breakdown">
        <h3 className="text-sm font-semibold text-[#F0F2F7] mb-4">Detaylı Varlık Dökümü</h3>
        <div className="flex gap-2 mb-6">
          {["hisse","etf","kripto","madeni_para"].map(type => (
            <button key={type} onClick={() => setActiveTab(type)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ background: activeTab === type ? "rgba(0,212,170,0.1)" : "rgba(255,255,255,0.04)", color: activeTab === type ? "#00D4AA" : "#8892A4", border: activeTab === type ? "1px solid rgba(0,212,170,0.3)" : "1px solid rgba(255,255,255,0.06)" }}
              data-testid={`tab-${type.replace("_","-")}`}
            >
              {TYPE_NAMES[type]}
            </button>
          ))}
        </div>
        {assetsLoading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 skeleton-shimmer" />)}</div>
        ) : typeAssets.length === 0 ? (
          <div className="text-center py-12 text-[#4E5A6B] text-sm">Bu kategoride varlık bulunmamaktadır</div>
        ) : (
          <div className="space-y-3">
            {typeAssets.map((asset) => (
              <div key={asset.id} className="finos-card-inner p-4 flex items-center justify-between" data-testid={`asset-detail-${asset.id}`}>
                <div>
                  <div className="font-medium text-[#F0F2F7]">{asset.name}</div>
                  <div className="text-sm text-[#4E5A6B] mt-0.5">
                    <span className="text-[#8892A4]">{asset.symbol}</span>
                    {asset.market && <span> · {asset.market}</span>}
                    {asset.currency && <span> · {asset.currency}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-[#F0F2F7] font-mono">{formatAssetValue(asset.totalValue || 0, asset.currency)}</div>
                  <div className={`text-sm font-mono ${(asset.change || 0) >= 0 ? "text-[#00D4AA]" : "text-[#FF4757]"}`}>
                    {(asset.change || 0) >= 0 ? "+" : ""}{(asset.change || 0).toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
