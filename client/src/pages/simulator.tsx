import { useState, useMemo } from "react";
import {
  TrendingUp, Bitcoin, DollarSign, Coins, Sparkles, Zap,
  Calculator, Target, Baby, Home, Briefcase, Heart,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, ReferenceLine,
} from "recharts";

const fmt = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v);

const historicalData: Record<string, { year: string; value: number }[]> = {
  bitcoin: [
    { year: "2020", value: 100 }, { year: "2021", value: 580 }, { year: "2022", value: 320 },
    { year: "2023", value: 850 }, { year: "2024", value: 1560 }, { year: "2025", value: 2340 },
  ],
  gold: [
    { year: "2020", value: 100 }, { year: "2021", value: 125 }, { year: "2022", value: 155 },
    { year: "2023", value: 245 }, { year: "2024", value: 389 }, { year: "2025", value: 489 },
  ],
  bist100: [
    { year: "2020", value: 100 }, { year: "2021", value: 178 }, { year: "2022", value: 265 },
    { year: "2023", value: 412 }, { year: "2024", value: 489 }, { year: "2025", value: 612 },
  ],
  usd: [
    { year: "2020", value: 100 }, { year: "2021", value: 145 }, { year: "2022", value: 198 },
    { year: "2023", value: 265 }, { year: "2024", value: 312 }, { year: "2025", value: 385 },
  ],
};

const comparisonData = historicalData.bitcoin.map((item, index) => ({
  year: item.year,
  bitcoin: item.value,
  gold: historicalData.gold[index].value,
  bist100: historicalData.bist100[index].value,
  usd: historicalData.usd[index].value,
}));

const crisisScenarios = [
  { id: "2008", name: "2008 Küresel Krizi", description: "-45% global hisse, -30% kripto", impact: { crypto: -30, stock: -45, bond: -10, gold: 15 }, recoveryMonths: 36 },
  { id: "2020", name: "2020 COVID Dip", description: "-35% kripto, -25% hisse", impact: { crypto: -35, stock: -25, bond: -5, gold: 8 }, recoveryMonths: 18 },
  { id: "2021", name: "2021 Kripto Kışı", description: "-80% BTC/ETH", impact: { crypto: -80, stock: -5, bond: 0, gold: 2 }, recoveryMonths: 24 },
  { id: "2022", name: "2022 TL Krizi", description: "Özel Türkiye senaryosu", impact: { crypto: 10, stock: -20, bond: -15, gold: 45 }, recoveryMonths: 12 },
];

const lifeScenarios = [
  { id: "baby", name: "Çocuk Olursa", icon: Baby, monthlyExpense: 8000, fireImpact: 6 },
  { id: "house", name: "Ev Alırsam", icon: Home, monthlyExpense: 15000, fireImpact: 4 },
  { id: "jobless", name: "İşsiz Kalırsam", icon: Briefcase, monthlyExpense: -85000, fireImpact: 12 },
  { id: "marriage", name: "Evlenirsem", icon: Heart, monthlyExpense: 5000, fireImpact: 3 },
];

export default function Simulator() {
  const [activeTab, setActiveTab] = useState<"past" | "future" | "crisis" | "life">("past");
  const [pastAmount, setPastAmount] = useState(100000);
  const [pastDate, setPastDate] = useState("2020-01");
  const [monthlyContribution, setMonthlyContribution] = useState(5000);
  const [futureYears, setFutureYears] = useState(10);
  const [annualReturn, setAnnualReturn] = useState(12);
  const [initialCapital, setInitialCapital] = useState(50000);
  const [selectedCrisis, setSelectedCrisis] = useState(crisisScenarios[0]);
  const [selectedLifeScenario, setSelectedLifeScenario] = useState(lifeScenarios[0]);

  const pastResults = useMemo(() => {
    const multipliers = { bitcoin: 23.4, gold: 4.89, bist100: 6.12, usd: 3.85 };
    return [
      { name: "Bitcoin", icon: Bitcoin, value: pastAmount * multipliers.bitcoin, return: (multipliers.bitcoin - 1) * 100, color: "#FFB833" },
      { name: "Altın", icon: Coins, value: pastAmount * multipliers.gold, return: (multipliers.gold - 1) * 100, color: "#FFD700" },
      { name: "BIST 100", icon: TrendingUp, value: pastAmount * multipliers.bist100, return: (multipliers.bist100 - 1) * 100, color: "#4B9EFF" },
      { name: "USD", icon: DollarSign, value: pastAmount * multipliers.usd, return: (multipliers.usd - 1) * 100, color: "#00D4AA" },
    ];
  }, [pastAmount]);

  const futureProjections = useMemo(() => {
    const scenarios = [
      { name: "Kötümser", rate: annualReturn / 2, color: "#8892A4" },
      { name: "Baz", rate: annualReturn, color: "#00D4AA" },
      { name: "İyimser", rate: annualReturn * 1.5, color: "#FFB833" },
    ];
    return scenarios.map(scenario => {
      let value = initialCapital;
      const monthlyRate = scenario.rate / 100 / 12;
      for (let year = 0; year < futureYears; year++) {
        for (let month = 0; month < 12; month++) {
          value = value * (1 + monthlyRate) + monthlyContribution;
        }
      }
      return { ...scenario, finalValue: Math.round(value) };
    });
  }, [monthlyContribution, futureYears, annualReturn, initialCapital]);

  const futureChartData = useMemo(() => {
    const data: Record<string, number | string>[] = [];
    const scenarios = [
      { name: "pessimistic", rate: annualReturn / 2 },
      { name: "base", rate: annualReturn },
      { name: "optimistic", rate: annualReturn * 1.5 },
    ];
    for (let year = 0; year <= futureYears; year++) {
      const point: Record<string, number | string> = { year: `${2025 + year}` };
      scenarios.forEach(scenario => {
        let value = initialCapital;
        const monthlyRate = scenario.rate / 100 / 12;
        for (let y = 0; y < year; y++) {
          for (let month = 0; month < 12; month++) {
            value = value * (1 + monthlyRate) + monthlyContribution;
          }
        }
        point[scenario.name] = Math.round(value);
      });
      data.push(point);
    }
    return data;
  }, [monthlyContribution, futureYears, annualReturn, initialCapital]);

  const crisisImpact = useMemo(() => {
    const currentValue = 3891094;
    const totalImpact = selectedCrisis.impact.crypto * 0.4 + selectedCrisis.impact.stock * 0.3 + selectedCrisis.impact.bond * 0.2 + selectedCrisis.impact.gold * 0.1;
    const afterValue = currentValue * (1 + totalImpact / 100);
    const damage = currentValue - afterValue;
    return { before: currentValue, after: afterValue, damage, damagePercent: Math.abs(totalImpact), recoveryMonths: selectedCrisis.recoveryMonths };
  }, [selectedCrisis]);

  const lifeImpact = useMemo(() => {
    const currentFireAge = 41;
    const newFireAge = currentFireAge + selectedLifeScenario.fireImpact;
    const monthlyExpenseChange = selectedLifeScenario.monthlyExpense;
    const currentMonthlyIncome = 110000;
    const currentMonthlyExpense = 56000;
    const newMonthlyExpense = currentMonthlyExpense + monthlyExpenseChange;
    const beforeProjection: { year: string; value: number }[] = [];
    const afterProjection: { year: string; value: number }[] = [];
    let beforeWealth = 3891094;
    let afterWealth = 3891094;
    for (let year = 0; year <= 5; year++) {
      beforeProjection.push({ year: `${2025 + year}`, value: Math.round(beforeWealth) });
      afterProjection.push({ year: `${2025 + year}`, value: Math.round(afterWealth) });
      beforeWealth = beforeWealth * 1.1 + (currentMonthlyIncome - currentMonthlyExpense) * 12;
      afterWealth = afterWealth * 1.1 + (currentMonthlyIncome - newMonthlyExpense) * 12;
    }
    return { currentFireAge, newFireAge, monthlyExpenseChange, beforeProjection, afterProjection };
  }, [selectedLifeScenario]);

  const tabs = [
    { id: "past" as const, label: "📈 Geçmiş (Ya Atsaydın?)" },
    { id: "future" as const, label: "🔮 Gelecek (Ne Olur?)" },
    { id: "crisis" as const, label: "💥 Kriz Senaryosu" },
    { id: "life" as const, label: "🧬 Hayat Senaryosu" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#F0F2F7]">Simülatör</h1>
          <p className="text-sm text-[#8892A4]">Yatırım senaryolarını test edin</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg">
            <Sparkles className="w-4 h-4 text-[#A78BFA]" />
            <span className="text-xs text-[#8892A4]">AI Destekli</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 p-1 bg-[#0E1117] rounded-xl border border-[rgba(255,255,255,0.06)]">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-[#151A23] text-[#F0F2F7] border border-[rgba(255,255,255,0.1)]"
                : "text-[#8892A4] hover:text-[#F0F2F7] hover:bg-[rgba(255,255,255,0.04)]"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Geçmiş */}
      {activeTab === "past" && (
        <div className="space-y-6">
          <div className="finos-card p-6">
            <h2 className="text-xl font-semibold text-[#F0F2F7] mb-4">{"Eğer X yıl önce yatırsaydın..."}</h2>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[#8892A4]">₺</span>
                <input type="number" value={pastAmount} onChange={(e) => setPastAmount(Number(e.target.value) || 0)}
                  className="w-32 px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm font-mono text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA]" />
              </div>
              <span className="text-[#8892A4]">tarihten itibaren</span>
              <select value={pastDate} onChange={(e) => setPastDate(e.target.value)}
                className="px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA]">
                <option value="2020-01">Ocak 2020</option>
                <option value="2021-01">Ocak 2021</option>
                <option value="2022-01">Ocak 2022</option>
                <option value="2023-01">Ocak 2023</option>
              </select>
              <button className="px-4 py-2 bg-[#00D4AA] rounded-lg text-sm font-medium text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors">
                Hesapla
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {pastResults.map((result) => (
              <div key={result.name} className="finos-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#151A23] flex items-center justify-center">
                    <result.icon className="w-4 h-4" style={{ color: result.color }} />
                  </div>
                  <span className="text-sm font-medium text-[#F0F2F7]">{result.name}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-[#4E5A6B]">Başlangıç: {fmt(pastAmount)}</p>
                  <p className="text-2xl font-semibold font-mono text-[#00D4AA]">{fmt(result.value)}</p>
                  <p className="text-lg font-mono text-[#00D4AA]">+%{result.return.toLocaleString("tr-TR", { maximumFractionDigits: 0 })}</p>
                </div>
                <div className="h-12 mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historicalData[result.name.toLowerCase().replace(" ", "") as keyof typeof historicalData] || historicalData.bitcoin}>
                      <defs>
                        <linearGradient id={`spark-${result.name}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={result.color} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={result.color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke={result.color} strokeWidth={2} fill={`url(#spark-${result.name})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
          <div className="finos-card p-6">
            <h3 className="text-lg font-semibold text-[#F0F2F7] mb-4">Karşılaştırma Grafiği</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonData}>
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#4E5A6B', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4E5A6B', fontSize: 12 }} tickFormatter={(value) => `%${value}`} />
                  <Tooltip contentStyle={{ backgroundColor: '#0E1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F0F2F7' }} formatter={(value: number, name: string) => [`%${value}`, name === "bitcoin" ? "Bitcoin" : name === "gold" ? "Altın" : name === "bist100" ? "BIST 100" : "Dolar"]} />
                  <Legend formatter={(value) => value === "bitcoin" ? "Bitcoin" : value === "gold" ? "Altın" : value === "bist100" ? "BIST 100" : "Dolar"} wrapperStyle={{ color: '#8892A4' }} />
                  <Line type="monotone" dataKey="bitcoin" stroke="#FFB833" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="gold" stroke="#FFD700" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="bist100" stroke="#4B9EFF" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="usd" stroke="#00D4AA" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Gelecek */}
      {activeTab === "future" && (
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-4">
            <div className="finos-card p-5">
              <h3 className="text-lg font-semibold text-[#F0F2F7] mb-4">Parametreler</h3>
              <div className="space-y-5">
                <div>
                  <label className="flex items-center justify-between text-sm text-[#8892A4] mb-2">
                    <span>Her ay</span>
                    <span className="font-mono text-[#F0F2F7]">{fmt(monthlyContribution)}</span>
                  </label>
                  <input type="range" min="1000" max="50000" step="500" value={monthlyContribution} onChange={(e) => setMonthlyContribution(parseInt(e.target.value))} className="w-full h-2 bg-[#151A23] rounded-lg appearance-none cursor-pointer accent-[#00D4AA]" />
                  <div className="flex justify-between text-xs text-[#4E5A6B] mt-1"><span>₺1.000</span><span>₺50.000</span></div>
                </div>
                <div>
                  <label className="flex items-center justify-between text-sm text-[#8892A4] mb-2">
                    <span>Yıl boyunca</span>
                    <span className="font-mono text-[#F0F2F7]">{futureYears} yıl</span>
                  </label>
                  <input type="range" min="1" max="40" value={futureYears} onChange={(e) => setFutureYears(parseInt(e.target.value))} className="w-full h-2 bg-[#151A23] rounded-lg appearance-none cursor-pointer accent-[#00D4AA]" />
                  <div className="flex justify-between text-xs text-[#4E5A6B] mt-1"><span>1 yıl</span><span>40 yıl</span></div>
                </div>
                <div>
                  <label className="flex items-center justify-between text-sm text-[#8892A4] mb-2">
                    <span>Yıllık getiri</span>
                    <span className="font-mono text-[#F0F2F7]">%{annualReturn}</span>
                  </label>
                  <input type="range" min="1" max="30" value={annualReturn} onChange={(e) => setAnnualReturn(parseInt(e.target.value))} className="w-full h-2 bg-[#151A23] rounded-lg appearance-none cursor-pointer accent-[#00D4AA]" />
                  <div className="flex justify-between text-xs text-[#4E5A6B] mt-1"><span>%1</span><span>%30</span></div>
                </div>
                <div>
                  <label className="block text-sm text-[#8892A4] mb-2">Başlangıç sermayesi</label>
                  <input type="text" value={fmt(initialCapital)} onChange={(e) => { const value = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0; setInitialCapital(value); }}
                    className="w-full px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm font-mono text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA]" />
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-2 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {futureProjections.map((projection) => (
                <div key={projection.name} className={`finos-card p-5 ${projection.name === "Baz" ? "glow-green" : ""}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: projection.color }} />
                    <span className="text-sm text-[#8892A4]">{projection.name} (%{projection.rate})</span>
                  </div>
                  <p className="text-2xl font-semibold font-mono" style={{ color: projection.color }}>{fmt(projection.finalValue)}</p>
                </div>
              ))}
            </div>
            <div className="finos-card p-6">
              <h3 className="text-lg font-semibold text-[#F0F2F7] mb-4">Projeksiyon</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={futureChartData}>
                    <defs>
                      <linearGradient id="colorOptimistic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FFB833" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#FFB833" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorBase" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00D4AA" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPessimistic" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8892A4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8892A4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#4E5A6B', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4E5A6B', fontSize: 12 }} tickFormatter={(value) => `₺${(value / 1000000).toFixed(1)}M`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0E1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F0F2F7' }} formatter={(value: number, name: string) => [fmt(value), name === "optimistic" ? "İyimser" : name === "base" ? "Baz" : "Kötümser"]} />
                    <ReferenceLine x={`${2025 + futureYears}`} stroke="#FF4757" strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="optimistic" stroke="#FFB833" strokeWidth={2} fill="url(#colorOptimistic)" />
                    <Area type="monotone" dataKey="base" stroke="#00D4AA" strokeWidth={2} fill="url(#colorBase)" />
                    <Area type="monotone" dataKey="pessimistic" stroke="#8892A4" strokeWidth={2} fill="url(#colorPessimistic)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Kriz */}
      {activeTab === "crisis" && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {crisisScenarios.map((scenario) => (
              <button key={scenario.id} onClick={() => setSelectedCrisis(scenario)}
                className={`finos-card p-5 text-left transition-all ${selectedCrisis.id === scenario.id ? "border-[#FF4757] bg-[rgba(255,71,87,0.05)]" : ""}`}>
                <h3 className="text-sm font-semibold text-[#F0F2F7] mb-1">{scenario.name}</h3>
                <p className="text-xs text-[#8892A4]">{scenario.description}</p>
                <p className="text-xs text-[#FF4757] mt-2">Kurtuluş: {scenario.recoveryMonths} ay</p>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="finos-card p-5">
              <p className="text-xs text-[#8892A4] mb-2">Mevcut Değer</p>
              <p className="text-2xl font-mono font-semibold text-[#F0F2F7]">{fmt(crisisImpact.before)}</p>
            </div>
            <div className="finos-card p-5">
              <p className="text-xs text-[#8892A4] mb-2">Kriz Sonrası</p>
              <p className="text-2xl font-mono font-semibold text-[#FF4757]">{fmt(crisisImpact.after)}</p>
            </div>
            <div className="finos-card p-5">
              <p className="text-xs text-[#8892A4] mb-2">Kayıp</p>
              <p className="text-2xl font-mono font-semibold text-[#FF4757]">{fmt(crisisImpact.damage)} (%{crisisImpact.damagePercent.toFixed(1)})</p>
            </div>
          </div>
          <div className="finos-card p-6">
            <h3 className="text-lg font-semibold text-[#F0F2F7] mb-4">Varlık Sınıfı Etkileri</h3>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(selectedCrisis.impact).map(([key, value]) => (
                <div key={key} className="text-center p-4 bg-[#151A23] rounded-xl">
                  <p className="text-sm text-[#8892A4] capitalize mb-2">{key === "crypto" ? "Kripto" : key === "stock" ? "Hisse" : key === "bond" ? "Tahvil" : "Altın"}</p>
                  <p className={`text-2xl font-mono font-semibold ${value >= 0 ? "text-[#00D4AA]" : "text-[#FF4757]"}`}>
                    {value > 0 ? "+" : ""}%{value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Hayat */}
      {activeTab === "life" && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {lifeScenarios.map((scenario) => {
              const Icon = scenario.icon;
              return (
                <button key={scenario.id} onClick={() => setSelectedLifeScenario(scenario)}
                  className={`finos-card p-5 text-left transition-all ${selectedLifeScenario.id === scenario.id ? "border-[#00D4AA] bg-[rgba(0,212,170,0.05)]" : ""}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-5 h-5 text-[#A78BFA]" />
                    <h3 className="text-sm font-semibold text-[#F0F2F7]">{scenario.name}</h3>
                  </div>
                  <p className="text-xs text-[#8892A4]">Aylık ek: {fmt(scenario.monthlyExpense > 0 ? scenario.monthlyExpense : Math.abs(scenario.monthlyExpense))}</p>
                  <p className="text-xs text-[#FFB833] mt-1">FIRE +{scenario.fireImpact} yıl</p>
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="finos-card p-5">
              <p className="text-xs text-[#8892A4] mb-2">Mevcut FIRE Yaşı</p>
              <p className="text-2xl font-mono font-semibold text-[#F0F2F7]">{lifeImpact.currentFireAge}</p>
            </div>
            <div className="finos-card p-5">
              <p className="text-xs text-[#8892A4] mb-2">Yeni FIRE Yaşı</p>
              <p className="text-2xl font-mono font-semibold text-[#FF4757]">{lifeImpact.newFireAge}</p>
            </div>
            <div className="finos-card p-5">
              <p className="text-xs text-[#8892A4] mb-2">Aylık Etki</p>
              <p className="text-2xl font-mono font-semibold text-[#FFB833]">{fmt(Math.abs(lifeImpact.monthlyExpenseChange))}</p>
            </div>
          </div>
          <div className="finos-card p-6">
            <h3 className="text-lg font-semibold text-[#F0F2F7] mb-4">5 Yıllık Varlık Projeksiyonu</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lifeImpact.beforeProjection.map((p, i) => ({ ...p, after: lifeImpact.afterProjection[i].value }))}>
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#4E5A6B', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4E5A6B', fontSize: 12 }} tickFormatter={(v) => `₺${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip contentStyle={{ backgroundColor: '#0E1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#F0F2F7' }} formatter={(value: number, name: string) => [fmt(value), name === "value" ? "Mevcut" : "Senaryo"]} />
                  <Legend wrapperStyle={{ color: '#8892A4' }} />
                  <Line type="monotone" dataKey="value" name="Mevcut" stroke="#00D4AA" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="after" name="Senaryo" stroke="#FF4757" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
