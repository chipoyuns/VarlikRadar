import { useQuery } from "@tanstack/react-query";
import { AssetAllocationChart } from "@/components/asset-allocation-chart";
import { useDisplayCurrency } from "@/lib/currency-context";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import type { AssetAllocation, AssetDetail, MonthlyPerformance } from "@shared/schema";
import { useState } from "react";
import { FileBarChart, Download, Calendar, TrendingUp, TrendingDown, PieChart as PieChartIcon, BarChart3 } from "lucide-react";

const TYPE_NAMES: Record<string, string> = {
  hisse: "Hisse Senetleri", etf: "ETF'ler", kripto: "Kripto Paralar", madeni_para: "Emtia",
};
const TYPE_COLORS: Record<string, string> = {
  hisse: "#4B9EFF", etf: "#A78BFA", kripto: "#FFB833", madeni_para: "#00D4AA",
};

interface BenchmarkPoint { month: string; bist100: number | null; altin: number | null; btc: number | null; }

const monthlyReturns = [
  { month: "Oca", return: 4.2 }, { month: "Şub", return: -1.8 }, { month: "Mar", return: 6.4 },
  { month: "Nis", return: -3.9 }, { month: "May", return: 10.3 }, { month: "Haz", return: 2.6 },
  { month: "Tem", return: 3.4 }, { month: "Ağu", return: -2.1 }, { month: "Eyl", return: 4.4 },
];

const yearlyPerformance = [
  { year: "2020", return: 12.5, benchmark: 8.2 }, { year: "2021", return: 28.3, benchmark: 18.4 },
  { year: "2022", return: -8.7, benchmark: -12.3 }, { year: "2023", return: 18.9, benchmark: 15.6 },
  { year: "2024", return: 23.4, benchmark: 14.2 },
];

const reportTypes = [
  { id: "portfolio", name: "Portföy Özeti", icon: PieChartIcon },
  { id: "performance", name: "Performans Analizi", icon: TrendingUp },
  { id: "income", name: "Gelir/Gider Raporu", icon: BarChart3 },
  { id: "tax", name: "Vergi Raporu", icon: FileBarChart },
];

const assetAllocationMock = [
  { name: "Kripto Paralar", value: 100, color: "#FFB833" },
];

const fmt = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v);

export default function Reports() {
  const { formatDisplayCurrency, formatAssetValue } = useDisplayCurrency();
  const [selectedReport, setSelectedReport] = useState("portfolio");
  const [dateRange, setDateRange] = useState("1Y");

  const { data: allocation, isLoading: allocationLoading } = useQuery<AssetAllocation[]>({ queryKey: ["/api/portfolio/allocation"] });
  const { data: assets, isLoading: assetsLoading } = useQuery<AssetDetail[]>({ queryKey: ["/api/portfolio/details"] });
  const { data: performance } = useQuery<MonthlyPerformance[]>({ queryKey: ["/api/portfolio/performance"] });
  const { data: benchmark, isLoading: benchmarkLoading } = useQuery<BenchmarkPoint[]>({ queryKey: ["/api/benchmark"] });

  const getAssetsByType = (type: string) => assets?.filter((a) => a.type === type) || [];
  const getTotalByType = (type: string) => getAssetsByType(type).reduce((sum, a) => sum + (a.totalValueTRY || 0), 0);

  const chartData = (benchmark ?? []).map((b, i) => ({
    month: b.month, portfoy: performance?.[i]?.value ?? 0, bist100: b.bist100, altin: b.altin, btc: b.btc,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#F0F2F7]">Raporlar</h1>
          <p className="text-sm text-[#8892A4]">Detaylı finansal analizler ve raporlar</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg">
            <Calendar className="w-4 h-4 text-[#4E5A6B]" />
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="bg-transparent text-sm text-[#F0F2F7] focus:outline-none">
              <option value="1M">Son 1 Ay</option>
              <option value="3M">Son 3 Ay</option>
              <option value="6M">Son 6 Ay</option>
              <option value="1Y">Son 1 Yıl</option>
              <option value="ALL">Tümü</option>
            </select>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#00D4AA] rounded-lg text-sm font-medium text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors">
            <Download className="w-4 h-4" />PDF İndir
          </button>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          const isSelected = selectedReport === report.id;
          return (
            <button key={report.id} onClick={() => setSelectedReport(report.id)}
              className={`finos-card p-4 text-left transition-all ${isSelected ? 'border-[#00D4AA] bg-[rgba(0,212,170,0.05)]' : 'hover:border-[rgba(255,255,255,0.1)]'}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${isSelected ? 'bg-[rgba(0,212,170,0.15)]' : 'bg-[#151A23]'}`}>
                <Icon className={`w-5 h-5 ${isSelected ? 'text-[#00D4AA]' : 'text-[#8892A4]'}`} />
              </div>
              <span className={`text-sm font-medium ${isSelected ? 'text-[#00D4AA]' : 'text-[#F0F2F7]'}`}>{report.name}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="col-span-2 space-y-6">
          {/* Performance Overview */}
          <div className="finos-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#F0F2F7]">Performans Genel Bakış</h3>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#00D4AA]" />
                  <span className="text-[#8892A4]">Portföy</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#4B9EFF]" />
                  <span className="text-[#8892A4]">Benchmark</span>
                </div>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={yearlyPerformance}>
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#4E5A6B', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4E5A6B', fontSize: 12 }} tickFormatter={(value) => `%${value}`} />
                  <Tooltip contentStyle={{ backgroundColor: '#0E1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F0F2F7' }} formatter={(value: number, name: string) => [`%${value}`, name === "return" ? "Portföy" : "Benchmark"]} />
                  <Line type="monotone" dataKey="return" stroke="#00D4AA" strokeWidth={3} dot={{ fill: '#00D4AA', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, stroke: '#00D4AA', strokeWidth: 2 }} />
                  <Line type="monotone" dataKey="benchmark" stroke="#4B9EFF" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#4B9EFF', strokeWidth: 2, r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Returns */}
          <div className="finos-card p-5">
            <h3 className="text-lg font-semibold text-[#F0F2F7] mb-4">Aylık Getiriler</h3>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyReturns}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#4E5A6B', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4E5A6B', fontSize: 12 }} tickFormatter={(value) => `%${value}`} />
                  <Tooltip contentStyle={{ backgroundColor: '#0E1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F0F2F7' }} formatter={(value: number) => [`%${value}`, "Getiri"]} />
                  <Bar dataKey="return" radius={[4, 4, 0, 0]} fill="#00D4AA">
                    {monthlyReturns.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.return >= 0 ? '#00D4AA' : '#FF4757'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Benchmark */}
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
                  <YAxis stroke="#4E5A6B" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`} />
                  <Tooltip contentStyle={{ backgroundColor: '#0E1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F0F2F7' }} />
                  <Legend formatter={(v) => ({ portfoy: "Portföyüm", bist100: "XU100", altin: "Altın", btc: "Bitcoin" }[v] || v)} wrapperStyle={{ color: '#8892A4', fontSize: 11 }} />
                  <Line type="monotone" dataKey="portfoy" name="portfoy" stroke="#4B9EFF" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="altin" name="altin" stroke="#FFB833" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  <Line type="monotone" dataKey="bist100" name="bist100" stroke="#00D4AA" strokeWidth={3} dot={{ r: 4, fill: "#00D4AA" }} connectNulls />
                  <Line type="monotone" dataKey="btc" name="btc" stroke="#FF4757" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Summary Panel */}
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="space-y-4">
            {["hisse", "etf", "kripto", "madeni_para"].map((type) => {
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

          {/* Key Metrics */}
          <div className="finos-card p-5">
            <h3 className="text-sm font-medium text-[#8892A4] mb-4">Anahtar Metrikler</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between"><span className="text-sm text-[#8892A4]">Toplam Getiri</span><span className="text-sm font-mono text-[#00D4AA]">+%23.4</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-[#8892A4]">Sharpe Oranı</span><span className="text-sm font-mono text-[#F0F2F7]">1.42</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-[#8892A4]">Max Drawdown</span><span className="text-sm font-mono text-[#FF4757]">-12.3%</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-[#8892A4]">Volatilite</span><span className="text-sm font-mono text-[#FFB833]">18.7%</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-[#8892A4]">Beta</span><span className="text-sm font-mono text-[#F0F2F7]">0.92</span></div>
              <div className="flex items-center justify-between"><span className="text-sm text-[#8892A4]">Alpha</span><span className="text-sm font-mono text-[#00D4AA]">+4.8%</span></div>
            </div>
          </div>

          {/* Asset Allocation Summary */}
          <div className="finos-card p-5">
            <h3 className="text-sm font-medium text-[#8892A4] mb-4">Varlık Dağılımı</h3>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={assetAllocationMock} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                    {assetAllocationMock.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {assetAllocationMock.map((asset) => (
                <div key={asset.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: asset.color }} />
                    <span className="text-[#8892A4]">{asset.name}</span>
                  </div>
                  <span className="font-mono text-[#F0F2F7]">%{asset.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Income Summary */}
          <div className="finos-card p-5">
            <h3 className="text-sm font-medium text-[#8892A4] mb-4">Gelir Özeti</h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1"><span className="text-xs text-[#4E5A6B]">Temettü Geliri</span><span className="text-sm font-mono text-[#00D4AA]">{fmt(28450)}</span></div>
                <div className="h-1.5 bg-[#151A23] rounded-full overflow-hidden"><div className="h-full bg-[#00D4AA] rounded-full" style={{ width: '65%' }} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1"><span className="text-xs text-[#4E5A6B]">Sermaye Kazancı</span><span className="text-sm font-mono text-[#4B9EFF]">{fmt(156780)}</span></div>
                <div className="h-1.5 bg-[#151A23] rounded-full overflow-hidden"><div className="h-full bg-[#4B9EFF] rounded-full" style={{ width: '85%' }} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1"><span className="text-xs text-[#4E5A6B]">Faiz Geliri</span><span className="text-sm font-mono text-[#A78BFA]">{fmt(12340)}</span></div>
                <div className="h-1.5 bg-[#151A23] rounded-full overflow-hidden"><div className="h-full bg-[#A78BFA] rounded-full" style={{ width: '35%' }} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
