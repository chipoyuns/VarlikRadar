import { useState, useEffect } from "react";
import { TrendingUp, Calculator, Target, Clock, Play, Pause, RotateCcw } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const scenarios = [
  { name: "Agresif Büyüme", annualReturn: 15, risk: "Yüksek", color: "#FF4757", allocation: { stock: 70, crypto: 20, bond: 5, gold: 5 } },
  { name: "Dengeli", annualReturn: 10, risk: "Orta", color: "#FFB833", allocation: { stock: 50, crypto: 10, bond: 25, gold: 15 } },
  { name: "Muhafazakar", annualReturn: 6, risk: "Düşük", color: "#00D4AA", allocation: { stock: 30, crypto: 5, bond: 45, gold: 20 } },
];

const fmt = (v: number) => v.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="finos-card-inner p-3 text-xs shadow-xl">
      <p className="font-semibold text-[#F0F2F7] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

export default function Simulator() {
  const [selectedScenario, setSelectedScenario] = useState(scenarios[1]);
  const [years, setYears] = useState(20);
  const [monthlyContribution, setMonthlyContribution] = useState(10000);
  const [initialAmount, setInitialAmount] = useState(500000);
  const [isRunning, setIsRunning] = useState(false);
  const [currentYear, setCurrentYear] = useState(0);

  const calculateProjection = () => {
    const data = [];
    let value = initialAmount;
    const monthlyRate = selectedScenario.annualReturn / 100 / 12;
    for (let year = 0; year <= years; year++) {
      data.push({ year: `${new Date().getFullYear() + year}`, value: Math.round(value), contributions: initialAmount + monthlyContribution * 12 * year });
      for (let m = 0; m < 12; m++) value = value * (1 + monthlyRate) + monthlyContribution;
    }
    return data;
  };

  const projectionData = calculateProjection();
  const finalValue = projectionData[projectionData.length - 1].value;
  const totalContributions = initialAmount + monthlyContribution * 12 * years;
  const totalGain = finalValue - totalContributions;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && currentYear < years) {
      interval = setInterval(() => {
        setCurrentYear(prev => {
          if (prev >= years) { setIsRunning(false); return prev; }
          return prev + 1;
        });
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isRunning, currentYear, years]);

  const reset = () => { setCurrentYear(0); setIsRunning(false); };
  const displayData = isRunning ? projectionData.slice(0, currentYear + 1) : projectionData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#F0F2F7]">Yatırım Simülatörü</h1>
        <p className="text-sm text-[#8892A4] mt-1">Farklı senaryolarla yatırım projeksiyonunuzu hesaplayın</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Controls */}
        <div className="space-y-4">
          {/* Scenarios */}
          <div className="finos-card p-5">
            <h3 className="text-sm font-medium text-[#F0F2F7] mb-3">Senaryo Seçin</h3>
            <div className="space-y-2">
              {scenarios.map((s) => (
                <button key={s.name} onClick={() => { setSelectedScenario(s); reset(); }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border transition-all"
                  style={{ background: selectedScenario.name === s.name ? `${s.color}10` : "rgba(255,255,255,0.02)", borderColor: selectedScenario.name === s.name ? `${s.color}40` : "rgba(255,255,255,0.06)", color: selectedScenario.name === s.name ? s.color : "#8892A4" }}>
                  <div className="text-left">
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs opacity-70">{s.risk} Risk</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold font-mono">%{s.annualReturn}</p>
                    <p className="text-xs opacity-70">yıllık</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Inputs */}
          <div className="finos-card p-5 space-y-4">
            <h3 className="text-sm font-medium text-[#F0F2F7]">Parametreler</h3>
            {[
              { label: "Başlangıç Tutarı", value: initialAmount, setter: setInitialAmount, suffix: "₺" },
              { label: "Aylık Katkı", value: monthlyContribution, setter: setMonthlyContribution, suffix: "₺" },
              { label: "Süre (Yıl)", value: years, setter: setYears, suffix: "yıl" },
            ].map(({ label, value, setter, suffix }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-[#4E5A6B]">{label}</label>
                  <span className="text-xs font-mono text-[#F0F2F7]">{suffix === "yıl" ? `${value} ${suffix}` : fmt(value)}</span>
                </div>
                <input type="range" min={suffix === "yıl" ? 1 : suffix === "₺" && label.includes("Aylık") ? 1000 : 50000}
                  max={suffix === "yıl" ? 40 : suffix === "₺" && label.includes("Aylık") ? 50000 : 5000000}
                  step={suffix === "yıl" ? 1 : suffix === "₺" && label.includes("Aylık") ? 1000 : 50000}
                  value={value} onChange={e => { setter(Number(e.target.value)); reset(); }}
                  className="w-full h-1.5 rounded-full outline-none appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, ${selectedScenario.color} 0%, ${selectedScenario.color} ${(suffix === "yıl" ? (value-1)/39 : suffix === "₺" && label.includes("Aylık") ? (value-1000)/49000 : (value-50000)/4950000)*100}%, #151A23 ${(suffix === "yıl" ? (value-1)/39 : 0)*100}%, #151A23 100%)` }} />
              </div>
            ))}
          </div>

          {/* Allocation */}
          <div className="finos-card p-5">
            <h3 className="text-sm font-medium text-[#8892A4] mb-3">Varlık Dağılımı</h3>
            <div className="space-y-2">
              {Object.entries(selectedScenario.allocation).map(([key, value]) => {
                const labels: Record<string, string> = { stock: "Hisse", crypto: "Kripto", bond: "Tahvil", gold: "Altın" };
                const colors: Record<string, string> = { stock: "#4B9EFF", crypto: "#FFB833", bond: "#A78BFA", gold: "#00D4AA" };
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-sm text-[#8892A4] w-16">{labels[key]}</span>
                    <div className="flex-1 h-2 bg-[#151A23] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: colors[key] }} />
                    </div>
                    <span className="text-xs font-mono text-[#8892A4] w-8 text-right">%{value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="lg:col-span-2 space-y-4">
          <div className="finos-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[#F0F2F7]">Projeksiyon Grafiği</h3>
              <div className="flex gap-2">
                <button onClick={() => setIsRunning(!isRunning)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: selectedScenario.color, color: "#080A0F" }}>
                  {isRunning ? <><Pause className="w-3.5 h-3.5" /> Dur</> : <><Play className="w-3.5 h-3.5" /> Oynat</>}
                </button>
                <button onClick={reset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#151A23] text-[#8892A4] hover:text-[#F0F2F7] transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> Sıfırla
                </button>
              </div>
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayData}>
                  <defs>
                    <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={selectedScenario.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={selectedScenario.color} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="contribGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4E5A6B" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4E5A6B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" stroke="#4E5A6B" fontSize={11} tickLine={false} axisLine={false} interval={4} />
                  <YAxis stroke="#4E5A6B" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `₺${(v/1000000).toFixed(1)}M`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="contributions" name="Katkı" stroke="#4E5A6B" strokeWidth={1} fill="url(#contribGrad)" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="value" name="Portföy Değeri" stroke={selectedScenario.color} strokeWidth={2} fill="url(#valueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Result Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Tahmini Toplam Değer", value: fmt(finalValue), color: selectedScenario.color, icon: TrendingUp },
              { label: "Toplam Katkı", value: fmt(totalContributions), color: "#8892A4", icon: Calculator },
              { label: "Toplam Kazanç", value: fmt(totalGain), color: "#00D4AA", icon: Target },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className="finos-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" style={{ color }} />
                  <p className="text-xs text-[#8892A4]">{label}</p>
                </div>
                <p className="text-xl font-bold font-mono" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
