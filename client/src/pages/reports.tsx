import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, ReferenceLine, Legend,
} from "recharts";
import { Download, Calendar, TrendingUp, TrendingDown, PieChart as PieIcon, FileText, Loader2, Check } from "lucide-react";
import type { AssetAllocation, AssetDetail, MonthlyPerformance, BudgetSummary, Income, Expense } from "@shared/schema";
import { useDisplayCurrency } from "@/lib/currency-context";

const fmt = (v: number) => v.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });
const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
const fmtK = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toFixed(0);
};

const TYPE_LABELS: Record<string, string> = { hisse: "Hisse Senedi", etf: "ETF", kripto: "Kripto", emtia: "Emtia", fon: "Fon", diger: "Diğer" };
const TYPE_COLORS: Record<string, string> = { hisse: "#4B9EFF", etf: "#A78BFA", kripto: "#FFB833", emtia: "#00D4AA", fon: "#FF6B9D", diger: "#8892A4" };
const PIE_COLORS = ["#00D4AA", "#4B9EFF", "#A78BFA", "#FFB833", "#FF4757", "#FF6B9D", "#34D399"];
const INCOME_COLORS = ["#00D4AA", "#4B9EFF", "#A78BFA", "#FFB833", "#10B981", "#34D399"];
const EXPENSE_COLORS = ["#FF4757", "#FF6B6B", "#FF8E53", "#FFB833", "#F5A623", "#A78BFA", "#6366F1", "#4B9EFF", "#34D399", "#00D4AA", "#8892A4"];

const INCOME_CAT: Record<string, string> = { "maaş": "Maaş", "kira": "Kira", "temettü": "Temettü", "faiz": "Faiz", "serbest": "Serbest", "diğer": "Diğer" };
const EXPENSE_CAT: Record<string, string> = { market: "Market", faturalar: "Faturalar", ulaşım: "Ulaşım", sağlık: "Sağlık", eğlence: "Eğlence", giyim: "Giyim", yemek: "Yemek", kira: "Kira", kredi: "Kredi", sigorta: "Sigorta", diğer: "Diğer" };

const DATE_RANGES = [
  { label: "1 Ay", value: "1M", months: 1 },
  { label: "3 Ay", value: "3M", months: 3 },
  { label: "6 Ay", value: "6M", months: 6 },
  { label: "1 Yıl", value: "1Y", months: 12 },
  { label: "Tümü", value: "ALL", months: 999 },
];

const TABS = [
  { id: "portfolio", label: "Portföy Özeti", icon: PieIcon },
  { id: "performance", label: "Performans", icon: TrendingUp },
  { id: "income", label: "Gelir/Gider", icon: TrendingDown },
  { id: "tax", label: "Vergi Raporu", icon: FileText },
];

const tooltipStyle = { backgroundColor: "#1A1F2E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#F0F2F7" };
const axisStyle = { fill: "#F0F2F7", fontSize: 11 };

export default function Reports() {
  const { formatDisplayCurrency } = useDisplayCurrency();
  const [activeTab, setActiveTab] = useState("portfolio");
  const [dateRange, setDateRange] = useState("1Y");
  const [pdfState, setPdfState] = useState<"idle" | "loading" | "done">("idle");
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: allocation = [] } = useQuery<AssetAllocation[]>({ queryKey: ["/api/portfolio/allocation"] });
  const { data: assets = [], isLoading: assetsLoading } = useQuery<AssetDetail[]>({ queryKey: ["/api/portfolio/details"] });
  const { data: summary } = useQuery<any>({ queryKey: ["/api/portfolio/summary"] });
  const { data: performance = [] } = useQuery<MonthlyPerformance[]>({ queryKey: ["/api/portfolio/performance?period=monthly"] });
  const { data: budgetSummary } = useQuery<BudgetSummary>({ queryKey: ["/api/budget/summary"] });
  const { data: incomes = [] } = useQuery<Income[]>({ queryKey: ["/api/incomes"] });
  const { data: expenses = [] } = useQuery<Expense[]>({ queryKey: ["/api/expenses"] });

  const selectedRange = DATE_RANGES.find(r => r.value === dateRange) || DATE_RANGES[3];

  const filteredPerformance = useMemo(() => {
    if (selectedRange.value === "ALL") return performance;
    return performance.slice(-selectedRange.months);
  }, [performance, selectedRange]);

  const monthlyReturns = useMemo(() => {
    return filteredPerformance.map((p, i) => {
      const prev = filteredPerformance[i - 1];
      if (!prev || prev.value === 0) return { month: p.month, return: 0 };
      return { month: p.month, return: parseFloat(((p.value - prev.value) / Math.abs(prev.value) * 100).toFixed(2)) };
    }).slice(1);
  }, [filteredPerformance]);

  const allocationPieData = useMemo(() =>
    allocation.map((a, i) => ({
      name: TYPE_LABELS[a.type] || a.type,
      value: a.percentage,
      amount: a.totalValueTRY || 0,
      fill: TYPE_COLORS[a.type] || PIE_COLORS[i % PIE_COLORS.length],
    })), [allocation]);

  const incomePieData = useMemo(() =>
    (budgetSummary?.incomeByCategory || []).map((item: any, i: number) => ({
      name: INCOME_CAT[item.category] || item.category,
      value: item.amount,
      fill: INCOME_COLORS[i % INCOME_COLORS.length],
    })), [budgetSummary]);

  const expensePieData = useMemo(() =>
    (budgetSummary?.expenseByCategory || []).map((item: any, i: number) => ({
      name: EXPENSE_CAT[item.category] || item.category,
      value: item.amount,
      fill: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
    })), [budgetSummary]);

  const incomeExpenseTrend = useMemo(() => {
    const monthMap: Record<string, { month: string; income: number; expense: number }> = {};
    [...incomes].forEach(inc => {
      const d = new Date(inc.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("tr-TR", { month: "short" });
      if (!monthMap[key]) monthMap[key] = { month: label, income: 0, expense: 0 };
      monthMap[key].income += parseFloat(inc.amount);
    });
    [...expenses].forEach(exp => {
      const d = new Date(exp.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("tr-TR", { month: "short" });
      if (!monthMap[key]) monthMap[key] = { month: label, income: 0, expense: 0 };
      monthMap[key].expense += parseFloat(exp.amount);
    });
    return Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v).slice(-selectedRange.months);
  }, [incomes, expenses, selectedRange]);

  const taxCalc = useMemo(() => {
    const totalValue = assets.reduce((s, a) => s + (a.totalValueTRY || 0), 0);
    const totalCost = assets.reduce((s, a) => s + ((a.quantity || 0) * (a.averagePrice || 0)), 0);
    const totalGain = totalValue - totalCost;
    const cryptoValue = assets.filter(a => a.type === "kripto").reduce((s, a) => s + (a.totalValueTRY || 0), 0);
    const cryptoCost = assets.filter(a => a.type === "kripto").reduce((s, a) => s + ((a.quantity || 0) * (a.averagePrice || 0)), 0);
    const cryptoGain = Math.max(0, cryptoValue - cryptoCost);
    const borsaGain = Math.max(0, totalGain - cryptoGain);
    const cryptoTaxThreshold = 87000;
    const cryptoTaxable = Math.max(0, cryptoGain - cryptoTaxThreshold);
    const cryptoTax = cryptoTaxable * 0.15;
    const dividendIncome = incomes.filter(i => i.category === "temettü").reduce((s, i) => s + parseFloat(i.amount), 0);
    const dividendTax = dividendIncome * 0.10;
    const totalTax = cryptoTax + dividendTax;
    return { totalGain, borsaGain, cryptoGain, cryptoTax, dividendIncome, dividendTax, totalTax };
  }, [assets, incomes]);

  const handlePDF = async () => {
    if (!reportRef.current) return;
    setPdfState("loading");
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: "#080A0F", scale: 2, useCORS: true, logging: false,
      });
      const pdf = new jsPDF("landscape", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.setFillColor(8, 10, 15);
      pdf.rect(0, 0, 297, 210, "F");
      pdf.setTextColor(240, 242, 247);
      pdf.setFontSize(14);
      pdf.text("EkoS — Finansal Rapor", 10, 12);
      pdf.setFontSize(9);
      pdf.setTextColor(136, 146, 164);
      pdf.text(`${TABS.find(t => t.id === activeTab)?.label} · ${DATE_RANGES.find(r => r.value === dateRange)?.label} · ${new Date().toLocaleDateString("tr-TR")}`, 10, 19);
      pdf.addImage(imgData, "PNG", 0, 24, imgWidth, Math.min(imgHeight, 185));
      pdf.save(`EkoS_Rapor_${activeTab}_${dateRange}_${new Date().toISOString().slice(0, 10)}.pdf`);
      setPdfState("done");
      setTimeout(() => setPdfState("idle"), 3000);
    } catch {
      setPdfState("idle");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#F0F2F7]">Raporlar</h1>
          <p className="text-sm text-[#8892A4]">Detaylı finansal analizler ve raporlar</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg">
            <Calendar className="w-4 h-4 text-[#4E5A6B]" />
            <select value={dateRange} onChange={e => setDateRange(e.target.value)}
              className="bg-transparent text-sm text-[#F0F2F7] focus:outline-none cursor-pointer">
              {DATE_RANGES.map(r => <option key={r.value} value={r.value} className="bg-[#151A23]">{r.label}</option>)}
            </select>
          </div>
          <button onClick={handlePDF} disabled={pdfState === "loading"}
            className="flex items-center gap-2 px-4 py-2 bg-[#00D4AA] rounded-lg text-sm font-medium text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors disabled:opacity-70"
            data-testid="button-download-pdf">
            {pdfState === "loading" ? <><Loader2 className="w-4 h-4 animate-spin" />Hazırlanıyor...</>
              : pdfState === "done" ? <><Check className="w-4 h-4" />İndirildi</>
              : <><Download className="w-4 h-4" />PDF İndir</>}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-[rgba(0,212,170,0.12)] text-[#00D4AA] border border-[rgba(0,212,170,0.3)]" : "text-[#8892A4] hover:text-[#F0F2F7] border border-transparent hover:bg-[rgba(255,255,255,0.04)]"}`}
              data-testid={`tab-${tab.id}`}>
              <Icon className="w-4 h-4" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div ref={reportRef}>

        {/* ── PORTFÖY ÖZETİ ── */}
        {activeTab === "portfolio" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Toplam Varlık", value: fmt(summary?.totalAssets || 0), color: "#F0F2F7" },
                { label: "Net Değer", value: fmt(summary?.netWorth || 0), color: "#00D4AA" },
                { label: "Aylık Değişim", value: fmtPct(summary?.monthlyChangePercent || 0), color: (summary?.monthlyChangePercent || 0) >= 0 ? "#00D4AA" : "#FF4757" },
                { label: "Varlık Sayısı", value: String(assets.length), color: "#4B9EFF" },
              ].map((s, i) => (
                <div key={i} className="finos-card p-4">
                  <p className="text-xs text-[#8892A4] mb-2">{s.label}</p>
                  <p className="text-xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Allocation Pie */}
              <div className="finos-card p-5">
                <h3 className="text-sm font-semibold text-[#F0F2F7] mb-4">Varlık Dağılımı</h3>
                {allocationPieData.length === 0 ? (
                  <div className="flex items-center justify-center h-[200px] text-[#4E5A6B] text-sm">Varlık eklenmemiş</div>
                ) : (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={allocationPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                          {allocationPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`%${Number(v).toFixed(1)}`, ""]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="space-y-2 mt-3">
                  {allocationPieData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                        <span className="text-[#8892A4]">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#F0F2F7]">%{Number(item.value).toFixed(1)}</span>
                        <span className="text-[#4E5A6B]">{fmtK(item.amount)}₺</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Asset table */}
              <div className="lg:col-span-2 finos-card p-5">
                <h3 className="text-sm font-semibold text-[#F0F2F7] mb-4">Varlık Listesi</h3>
                {assetsLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 skeleton-shimmer rounded-lg" />)}</div>
                ) : assets.length === 0 ? (
                  <div className="flex items-center justify-center h-[200px] text-[#4E5A6B] text-sm">Varlık eklenmemiş</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.05)]">
                          {["Varlık", "Tür", "Miktar", "Maliyet", "Değer (₺)", "K/Z"].map(h => (
                            <th key={h} className="text-left text-[10px] font-medium text-[#4E5A6B] uppercase tracking-wide py-2 px-2 first:pl-0">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgba(255,255,255,0.03)]">
                        {assets.map(asset => {
                          const cost = (asset.quantity || 0) * (asset.averagePrice || 0);
                          const value = asset.totalValueTRY || 0;
                          const pnl = value - cost;
                          const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                          return (
                            <tr key={asset.id} className="hover:bg-[rgba(255,255,255,0.02)]">
                              <td className="py-2.5 px-2 pl-0">
                                <p className="text-sm font-bold text-[#F0F2F7]">{asset.symbol}</p>
                                <p className="text-[10px] text-[#4E5A6B] truncate max-w-[80px]">{asset.name}</p>
                              </td>
                              <td className="py-2.5 px-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${TYPE_COLORS[asset.type] || "#8892A4"}20`, color: TYPE_COLORS[asset.type] || "#8892A4" }}>
                                  {TYPE_LABELS[asset.type] || asset.type}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 text-xs font-mono text-[#F0F2F7]">{Number(asset.quantity).toFixed(4)}</td>
                              <td className="py-2.5 px-2 text-xs font-mono text-[#8892A4]">{fmt(cost)}</td>
                              <td className="py-2.5 px-2 text-xs font-mono text-[#F0F2F7]">{fmt(value)}</td>
                              <td className="py-2.5 px-2">
                                <p className={`text-xs font-mono font-bold ${pnl >= 0 ? "text-[#00D4AA]" : "text-[#FF4757]"}`}>
                                  {pnl >= 0 ? "+" : ""}{fmt(pnl)}
                                </p>
                                <p className={`text-[10px] font-mono ${pnl >= 0 ? "text-[#00D4AA]" : "text-[#FF4757]"}`}>
                                  ({fmtPct(pnlPct)})
                                </p>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── PERFORMANS ── */}
        {activeTab === "performance" && (
          <div className="space-y-6">
            {/* Performance metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(() => {
                const vals = filteredPerformance.map(p => p.value).filter(v => v > 0);
                const first = vals[0] || 0;
                const last = vals[vals.length - 1] || 0;
                const totalReturn = first > 0 ? ((last - first) / first) * 100 : 0;
                const maxVal = vals.length > 0 ? Math.max(...vals) : 0;
                const maxIdx = vals.indexOf(maxVal);
                const afterMax = vals.slice(maxIdx);
                const maxDrawdown = maxVal > 0 && afterMax.length > 0 ? Math.min(...afterMax.map(v => ((v - maxVal) / maxVal) * 100)) : 0;
                const returns = monthlyReturns.map(m => m.return);
                const avgReturn = returns.length > 0 ? returns.reduce((s, r) => s + r, 0) / returns.length : 0;
                const variance = returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / (returns.length || 1);
                const volatility = Math.sqrt(variance);
                const sharpe = volatility > 0 ? (avgReturn / volatility) * Math.sqrt(12) : 0;
                return [
                  { label: "Toplam Getiri", value: fmtPct(totalReturn), color: totalReturn >= 0 ? "#00D4AA" : "#FF4757" },
                  { label: "Max Drawdown", value: fmtPct(maxDrawdown), color: "#FF4757" },
                  { label: "Ort. Aylık Getiri", value: fmtPct(avgReturn), color: avgReturn >= 0 ? "#00D4AA" : "#FF4757" },
                  { label: "Sharpe Oranı", value: sharpe.toFixed(2), color: "#F0F2F7" },
                ];
              })().map((m, i) => (
                <div key={i} className="finos-card p-4">
                  <p className="text-xs text-[#8892A4] mb-2">{m.label}</p>
                  <p className="text-xl font-bold font-mono" style={{ color: m.color }}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* Area chart */}
            <div className="finos-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#F0F2F7]">Portföy Değer Trendi</h3>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-[#00D4AA]" />
                  <span className="text-xs text-[#8892A4]">Portföy Değeri</span>
                </div>
              </div>
              {filteredPerformance.length === 0 ? (
                <div className="flex items-center justify-center h-[260px] text-[#4E5A6B] text-sm">Performans verisi bulunmamaktadır</div>
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredPerformance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#00D4AA" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="month" tick={axisStyle} tickLine={false} axisLine={false} />
                      <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={v => `${fmtK(v)}₺`} width={60} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmt(Number(v)), "Değer"]} />
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
                      <Area type="monotone" dataKey="value" stroke="#00D4AA" strokeWidth={2.5} fill="url(#perfGrad)" dot={false} activeDot={{ r: 5, fill: "#00D4AA", stroke: "#080A0F", strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Monthly returns bar */}
            <div className="finos-card p-5">
              <h3 className="text-sm font-semibold text-[#F0F2F7] mb-4">Aylık Değer Değişimi (%)</h3>
              {monthlyReturns.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-[#4E5A6B] text-sm">Veri yetersiz (en az 2 ay gerekli)</div>
              ) : (
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyReturns} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="month" tick={axisStyle} tickLine={false} axisLine={false} />
                      <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={v => `%${v}`} />
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`%${Number(v).toFixed(2)}`, Number(v) >= 0 ? "Kazanç" : "Kayıp"]} />
                      <Bar dataKey="return" radius={[4, 4, 0, 0]}>
                        {monthlyReturns.map((entry, i) => <Cell key={i} fill={entry.return >= 0 ? "#00D4AA" : "#FF4757"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── GELİR/GİDER ── */}
        {activeTab === "income" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Toplam Gelir", value: fmt(budgetSummary?.totalIncome || 0), color: "#00D4AA" },
                { label: "Toplam Gider", value: fmt(budgetSummary?.totalExpense || 0), color: "#FF4757" },
                { label: "Net Bakiye", value: fmt((budgetSummary?.totalIncome || 0) - (budgetSummary?.totalExpense || 0)), color: ((budgetSummary?.totalIncome || 0) - (budgetSummary?.totalExpense || 0)) >= 0 ? "#00D4AA" : "#FF4757" },
                { label: "Tasarruf Oranı", value: (budgetSummary?.totalIncome || 0) > 0 ? `%${Math.max(0, (((budgetSummary?.totalIncome || 0) - (budgetSummary?.totalExpense || 0)) / (budgetSummary?.totalIncome || 1)) * 100).toFixed(1)}` : "%0", color: "#4B9EFF" },
              ].map((s, i) => (
                <div key={i} className="finos-card p-4">
                  <p className="text-xs text-[#8892A4] mb-2">{s.label}</p>
                  <p className="text-xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income pie */}
              <div className="finos-card p-5">
                <h3 className="text-sm font-semibold text-[#F0F2F7] mb-4">Gelir Kategorileri</h3>
                {incomePieData.length === 0 ? (
                  <div className="flex items-center justify-center h-[180px] text-[#4E5A6B] text-sm">Gelir verisi yok</div>
                ) : (
                  <>
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={incomePieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2}>
                            {incomePieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmt(Number(v)), ""]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-3">
                      {incomePieData.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                            <span className="text-[#8892A4]">{item.name}</span>
                          </div>
                          <span className="font-mono text-[#00D4AA]">{fmt(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Expense pie */}
              <div className="finos-card p-5">
                <h3 className="text-sm font-semibold text-[#F0F2F7] mb-4">Gider Kategorileri</h3>
                {expensePieData.length === 0 ? (
                  <div className="flex items-center justify-center h-[180px] text-[#4E5A6B] text-sm">Gider verisi yok</div>
                ) : (
                  <>
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2}>
                            {expensePieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [fmt(Number(v)), ""]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-3">
                      {expensePieData.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                            <span className="text-[#8892A4]">{item.name}</span>
                          </div>
                          <span className="font-mono text-[#FF4757]">{fmt(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Trend bar chart */}
            <div className="finos-card p-5">
              <h3 className="text-sm font-semibold text-[#F0F2F7] mb-4">Aylık Gelir/Gider Trendi</h3>
              {incomeExpenseTrend.length === 0 ? (
                <div className="flex items-center justify-center h-[220px] text-[#4E5A6B] text-sm">Yeterli veri yok</div>
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={incomeExpenseTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="month" tick={axisStyle} tickLine={false} axisLine={false} />
                      <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={v => `${fmtK(v)}₺`} width={60} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: string) => [fmt(Number(v)), name === "income" ? "Gelir" : "Gider"]} />
                      <Legend formatter={v => v === "income" ? "Gelir" : "Gider"} wrapperStyle={{ color: "#8892A4", fontSize: 11 }} />
                      <Bar dataKey="income" name="income" fill="#00D4AA" radius={[4, 4, 0, 0]} opacity={0.85} />
                      <Bar dataKey="expense" name="expense" fill="#FF4757" radius={[4, 4, 0, 0]} opacity={0.85} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Recent transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="finos-card p-5">
                <h3 className="text-sm font-semibold text-[#F0F2F7] mb-4">Son Gelirler</h3>
                {incomes.length === 0 ? (
                  <p className="text-[#4E5A6B] text-sm text-center py-6">Gelir kaydı yok</p>
                ) : (
                  <div className="space-y-2">
                    {[...incomes].slice(0, 6).map(inc => (
                      <div key={inc.id} className="flex items-center justify-between text-xs py-1.5 border-b border-[rgba(255,255,255,0.03)]">
                        <div>
                          <p className="text-[#F0F2F7]">{inc.description || INCOME_CAT[inc.category] || inc.category}</p>
                          <p className="text-[#4E5A6B]">{new Date(inc.date).toLocaleDateString("tr-TR")}</p>
                        </div>
                        <span className="font-mono font-bold text-[#00D4AA]">+{fmt(parseFloat(inc.amount))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="finos-card p-5">
                <h3 className="text-sm font-semibold text-[#F0F2F7] mb-4">Son Giderler</h3>
                {expenses.length === 0 ? (
                  <p className="text-[#4E5A6B] text-sm text-center py-6">Gider kaydı yok</p>
                ) : (
                  <div className="space-y-2">
                    {[...expenses].slice(0, 6).map(exp => (
                      <div key={exp.id} className="flex items-center justify-between text-xs py-1.5 border-b border-[rgba(255,255,255,0.03)]">
                        <div>
                          <p className="text-[#F0F2F7]">{exp.description || EXPENSE_CAT[exp.category] || exp.category}</p>
                          <p className="text-[#4E5A6B]">{new Date(exp.date).toLocaleDateString("tr-TR")}</p>
                        </div>
                        <span className="font-mono font-bold text-[#FF4757]">-{fmt(parseFloat(exp.amount))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── VERGİ RAPORU ── */}
        {activeTab === "tax" && (
          <div className="space-y-6">
            <div className="finos-card p-4 border-l-2 border-[#FFB833] bg-[rgba(255,184,51,0.04)]">
              <p className="text-xs text-[#FFB833]">⚠️ Bu rapor yalnızca bilgilendirme amaçlıdır. Vergi hesaplamaları Türk Gelir Vergisi Kanunu'nun basitleştirilmiş bir uygulamasıdır. Kesin vergi hesabı için mali müşavirinize danışınız.</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Toplam Sermaye Kazancı", value: fmt(taxCalc.totalGain), color: taxCalc.totalGain >= 0 ? "#00D4AA" : "#FF4757" },
                { label: "Temettü Geliri", value: fmt(taxCalc.dividendIncome), color: "#4B9EFF" },
                { label: "Tahmini Vergi Yükü", value: fmt(taxCalc.totalTax), color: "#FF4757" },
                { label: "Net Kazanç (Vergi Sonrası)", value: fmt(taxCalc.totalGain - taxCalc.totalTax), color: (taxCalc.totalGain - taxCalc.totalTax) >= 0 ? "#00D4AA" : "#FF4757" },
              ].map((s, i) => (
                <div key={i} className="finos-card p-4">
                  <p className="text-xs text-[#8892A4] mb-2">{s.label}</p>
                  <p className="text-xl font-bold font-mono" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tax breakdown */}
              <div className="finos-card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-[#F0F2F7]">Vergi Kalemleri</h3>
                {[
                  { label: "BIST Hisseleri Kar/Zarar", value: taxCalc.borsaGain, note: "2 yıl+ tutulursa %0 vergi (GVK Geçici 67)", tax: 0, color: "#4B9EFF" },
                  { label: "Kripto Para Kazancı", value: taxCalc.cryptoGain, note: "87.000₺ üzeri için %15 vergi", tax: taxCalc.cryptoTax, color: "#FFB833" },
                  { label: "Temettü Geliri", value: taxCalc.dividendIncome, note: "Stopaj %10 (kaynakta kesilir)", tax: taxCalc.dividendTax, color: "#00D4AA" },
                ].map((item, i) => (
                  <div key={i} className="finos-card-inner p-4 space-y-2 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#F0F2F7]">{item.label}</span>
                      <span className="font-mono text-sm font-bold" style={{ color: item.color }}>{fmt(item.value)}</span>
                    </div>
                    <p className="text-xs text-[#4E5A6B]">{item.note}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-[rgba(255,255,255,0.05)]">
                      <span className="text-xs text-[#8892A4]">Vergi Tutarı</span>
                      <span className="font-mono text-xs text-[#FF4757] font-bold">{fmt(item.tax)}</span>
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="finos-card-inner p-4 rounded-xl border border-[rgba(255,71,87,0.2)]">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#F0F2F7]">Toplam Vergi Yükü</span>
                    <span className="font-mono text-sm font-bold text-[#FF4757]">{fmt(taxCalc.totalTax)}</span>
                  </div>
                </div>
              </div>

              {/* Tax info cards */}
              <div className="finos-card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-[#F0F2F7]">Türkiye Vergi Rehberi</h3>
                <div className="space-y-3">
                  {[
                    { icon: "📊", title: "BIST Hisseleri", desc: "2 yıldan fazla tutulan hisseler için stopaj %0. 2 yıl altı için %10 stopaj uygulanır." },
                    { icon: "₿", title: "Kripto Paralar", desc: "2024 itibarıyla kripto kazançları beyana tabi. 87.000₺ üzeri kazançlar için %15 vergi." },
                    { icon: "💰", title: "Temettü", desc: "Halka açık şirket temettüleri kaynakta %10 stopaj kesintisine tabidir." },
                    { icon: "🏠", title: "Gayrimenkul", desc: "5 yıl sonraki satışlar vergiden muaf. 5 yıl içinde değer artışı vergisi uygulanır." },
                    { icon: "📅", title: "Beyan Tarihi", desc: "Yıllık gelir vergisi beyannamesi Mart ayında verilir. Vergi avukatınıza danışın." },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-[rgba(255,255,255,0.04)] last:border-0">
                      <span className="text-xl flex-shrink-0">{item.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-[#F0F2F7]">{item.title}</p>
                        <p className="text-xs text-[#4E5A6B] mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
