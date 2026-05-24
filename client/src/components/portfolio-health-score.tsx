import { useMemo } from "react";
import { GitBranch, Shield, Activity, Wallet, Gem, Target, TrendingUp, TrendingDown } from "lucide-react";
import type { AssetDetail, BudgetSummary, PortfolioSummary } from "@shared/schema";

interface PortfolioHealthScoreProps {
  assets: AssetDetail[];
  budgetSummary?: BudgetSummary;
  portfolioSummary?: PortfolioSummary;
  privacyMode?: boolean;
}

function getScoreColor(score: number): string {
  if (score <= 20) return "#FF4757";
  if (score <= 40) return "#FF6348";
  if (score <= 60) return "#FFA502";
  if (score <= 80) return "#7BED9F";
  return "#00D4AA";
}

function getScoreLabel(score: number): string {
  if (score <= 20) return "Çok Zayıf";
  if (score <= 40) return "Zayıf";
  if (score <= 60) return "Orta";
  if (score <= 80) return "İyi";
  return "Mükemmel";
}

function getComponentDesc(key: string, score: number): string {
  const descs: Record<string, string[]> = {
    diversification: [
      "Portföyün tek bir varlığa aşırı yoğunlaşmış.",
      "Varlıkların çok az çeşitlendirilmiş.",
      "Temel çeşitlendirme mevcut, geliştirilebilir.",
      "Portföyün makul düzeyde çeşitlendirilmiş.",
      "Portföyün çok iyi çeşitlendirilmiş.",
    ],
    riskManagement: [
      "Portföyün yüksek riskli varlıklara yoğunlaşmış.",
      "Risk seviyesi kullanıcı profilinle uyumsuz.",
      "Risk dengesi kabul edilebilir seviyede.",
      "Risk profili dengeli ve kontrollü.",
      "Risk yönetimi çok iyi.",
    ],
    volatility: [
      "Portföyün aşırı volatil varlıklara sahip.",
      "Yüksek volatiliteye sahip varlıkların oranı yüksek.",
      "Volatilite kontrol altında ama dikkat gerekiyor.",
      "Portföyün volatilitesi makul seviyede.",
      "Portföyün oldukça stabil.",
    ],
    cashBalance: [
      "Nakit rezervin kritik seviyede düşük.",
      "Acil durum fonun yetersiz.",
      "Nakit rezervin ortalama seviyede.",
      "Nakit dengesi yeterli.",
      "Nakit rezervin çok iyi.",
    ],
    assetQuality: [
      "Portföyünde çok riskli ve kalitesiz varlıklar var.",
      "Varlık kalitesi düşük, kayıp riski yüksek.",
      "Karışık kalitede varlıklar mevcut.",
      "Kaliteli ve güvenilir varlıkların oranı iyi.",
      "Portföyün yüksek kaliteli varlıklardan oluşuyor.",
    ],
    durability: [
      "Portföyün uzun vadede değer kaybeder.",
      "Uzun vadeli büyüme potansiyelin düşük.",
      "Uzun vadede büyüme potansiyelin orta.",
      "Portföyün uzun vadeli büyümeye uygun.",
      "Uzun vadeli dayanıklılık çok iyi.",
    ],
  };
  const arr = descs[key] || descs.diversification;
  const idx = score <= 20 ? 0 : score <= 40 ? 1 : score <= 60 ? 2 : score <= 80 ? 3 : 4;
  return arr[idx];
}

function MiniDonut({ score, color, size = 72 }: { score: number; color: string; size?: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg viewBox="0 0 60 60" width={size} height={size}>
      <circle cx="30" cy="30" r={r} fill="none" stroke="#1A2235" strokeWidth="7" />
      <circle
        cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 30 30)"
        style={{ transition: "stroke-dasharray 1.2s ease" }}
      />
      <text x="30" y="31" textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="12" fontWeight="bold" fontFamily="monospace">
        {score}
      </text>
    </svg>
  );
}

function SpeedometerGauge({ score, grade, change, level }: { score: number; grade: string; change: number; level: string }) {
  const color = getScoreColor(score);
  const r = 88;
  const cx = 120;
  const cy = 118;
  const arcLength = Math.PI * r;
  const fillLength = (score / 100) * arcLength;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 240, height: 145 }}>
        <svg viewBox="0 0 240 135" width="240" height="135">
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF4757" />
              <stop offset="40%" stopColor="#FFA502" />
              <stop offset="70%" stopColor="#7BED9F" />
              <stop offset="100%" stopColor="#00D4AA" />
            </linearGradient>
          </defs>
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none" stroke="#1A2235" strokeWidth="14" strokeLinecap="round"
          />
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
            strokeDasharray={`${fillLength} ${arcLength}`}
            style={{ transition: "stroke-dasharray 1.5s ease-out" }}
          />
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = Math.PI - (tick / 100) * Math.PI;
            const x1 = cx + (r - 22) * Math.cos(angle);
            const y1 = cy - (r - 22) * Math.sin(angle);
            const x2 = cx + (r - 12) * Math.cos(angle);
            const y2 = cy - (r - 12) * Math.sin(angle);
            return <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2A3545" strokeWidth="2" />;
          })}
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = Math.PI - (tick / 100) * Math.PI;
            const tx = cx + (r - 30) * Math.cos(angle);
            const ty = cy - (r - 30) * Math.sin(angle);
            return (
              <text key={`t${tick}`} x={tx} y={ty} textAnchor="middle" dominantBaseline="central"
                fill="#4E5A6B" fontSize="7" fontFamily="monospace">
                {tick}
              </text>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1 pointer-events-none">
          <span className="text-5xl font-black font-mono leading-none" style={{ color }}>{score}</span>
          <span className="text-sm text-[#4E5A6B] leading-tight">/100</span>
          <span className="text-3xl font-black mt-0.5 leading-none" style={{ color }}>{grade}</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 mt-1">
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {level}
        </span>
        {change !== 0 ? (
          <div className="flex items-center gap-1.5" style={{ color: change > 0 ? "#00D4AA" : "#FF4757" }}>
            {change > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span className="text-xs font-medium font-mono">
              Geçen Hafta {change > 0 ? "+" : ""}{change}
            </span>
          </div>
        ) : (
          <span className="text-xs text-[#4E5A6B]">Geçen Hafta — veri yok</span>
        )}
      </div>
    </div>
  );
}

const COMPONENT_ICONS = {
  diversification: GitBranch,
  riskManagement: Shield,
  volatility: Activity,
  cashBalance: Wallet,
  assetQuality: Gem,
  durability: Target,
};

const COMPONENT_LABELS: Record<string, string> = {
  diversification: "Çeşitlendirme",
  riskManagement: "Risk Yönetimi",
  volatility: "Volatilite Kontrolü",
  cashBalance: "Nakit Dengesi",
  assetQuality: "Varlık Kalitesi",
  durability: "Uzun Vadeli Dayanıklılık",
};

const COMPONENT_WEIGHTS: Record<string, string> = {
  diversification: "%25",
  riskManagement: "%20",
  volatility: "%15",
  cashBalance: "%15",
  assetQuality: "%15",
  durability: "%10",
};

export function PortfolioHealthScore({ assets, budgetSummary, portfolioSummary }: PortfolioHealthScoreProps) {
  const result = useMemo(() => {
    const all = assets || [];

    if (all.length === 0) {
      return {
        total: 0, grade: "F", level: "Kritik Seviye", change: 0,
        components: { diversification: 0, riskManagement: 0, volatility: 0, cashBalance: 0, assetQuality: 0, durability: 0 },
        recommendations: [],
      };
    }

    const totalValue = all.reduce((s, a) => s + a.totalValueTRY, 0);

    const calcDiversification = (): number => {
      const hasKripto = all.some(a => a.type === "kripto");
      const hasBIST = all.some(a => a.type === "hisse" && (a.market === "BIST" || !a.market));
      const hasGlobal = all.some(a => a.type === "hisse" && a.market === "US");
      const hasGold = all.some(a => a.type === "madeni_para");
      const hasDoviz = all.some(a => a.currency === "USD" || a.currency === "EUR");
      const hasETF = all.some(a => a.type === "etf" || a.type === "fon");
      const classCount = [hasKripto, hasBIST, hasGlobal, hasGold, hasDoviz, hasETF].filter(Boolean).length;
      const A = classCount <= 1 ? 5 : classCount === 2 ? 15 : classCount === 3 ? 25 : classCount === 4 ? 35 : classCount === 5 ? 43 : 50;

      const topAsset = all.reduce((a, b) => a.totalValueTRY > b.totalValueTRY ? a : b);
      const topPct = totalValue > 0 ? (topAsset.totalValueTRY / totalValue) * 100 : 100;
      const B = topPct > 80 ? 5 : topPct > 60 ? 15 : topPct > 40 ? 28 : topPct > 25 ? 38 : topPct > 15 ? 45 : 50;

      let bonus = 0;
      const cryptoTotal = all.filter(a => a.type === "kripto").reduce((s, a) => s + a.totalValueTRY, 0);
      const cryptoPct = totalValue > 0 ? (cryptoTotal / totalValue) * 100 : 0;
      if (cryptoPct > 70) bonus -= 10;
      if (all.every(a => a.type === "kripto")) bonus -= 15;
      if (hasDoviz) bonus += 5;
      if (hasGold) bonus += 5;

      return Math.max(0, Math.min(100, A + B + bonus));
    };

    const calcRiskManagement = (): number => {
      let weightedRisk = 0;
      for (const a of all) {
        let risk = 5.0;
        if (a.type === "madeni_para") risk = 2.5;
        else if (a.type === "etf" || a.type === "fon") risk = 5.0;
        else if (a.type === "hisse") { risk = a.market === "US" ? 5.0 : 5.5; }
        else if (a.type === "kripto") {
          const sym = (a.symbol || "").toUpperCase().replace("USDT", "").replace("BUSD", "");
          if (sym === "BTC") risk = 7.0;
          else if (sym === "ETH") risk = 7.5;
          else if (["BNB", "SOL", "ADA", "XRP", "DOT", "AVAX", "MATIC", "LINK"].includes(sym)) risk = 8.5;
          else risk = 9.0;
        }
        const weight = totalValue > 0 ? a.totalValueTRY / totalValue : 0;
        weightedRisk += weight * risk;
      }
      let score = Math.max(0, 100 - weightedRisk * 11.5);
      const totalDebt = portfolioSummary?.totalDebt || 0;
      const netWorth = Math.abs(portfolioSummary?.netWorth || 1);
      const debtRatio = totalDebt / netWorth;
      if (debtRatio > 0.5) score -= 20;
      else if (debtRatio > 0.3) score -= 10;
      else if (totalDebt === 0) score += 5;
      return Math.max(0, Math.min(100, score));
    };

    const calcVolatility = (): number => {
      let weightedVol = 0;
      for (const a of all) {
        let vol = 8;
        if (a.type === "madeni_para") vol = 3;
        else if (a.type === "etf" || a.type === "fon") vol = 6;
        else if (a.type === "hisse") { vol = a.market === "US" ? 6 : 12; }
        else if (a.type === "kripto") {
          const sym = (a.symbol || "").toUpperCase().replace("USDT", "").replace("BUSD", "");
          if (sym === "BTC") vol = 18;
          else if (sym === "ETH") vol = 22;
          else if (["BNB", "SOL", "ADA", "XRP", "DOT", "AVAX", "MATIC", "LINK"].includes(sym)) vol = 30;
          else vol = 45;
        }
        const weight = totalValue > 0 ? a.totalValueTRY / totalValue : 0;
        weightedVol += weight * vol;
      }
      let score = Math.max(0, 100 - weightedVol * 3.8);
      const hasKripto = all.some(a => a.type === "kripto");
      const hasGold = all.some(a => a.type === "madeni_para");
      const hasHisse = all.some(a => a.type === "hisse");
      const hasDoviz = all.some(a => a.currency === "USD" || a.currency === "EUR");
      if (hasKripto && hasGold) score += 5;
      if (hasKripto && hasHisse) score += 3;
      if (hasDoviz) score += 5;
      return Math.max(0, Math.min(100, score));
    };

    const calcCashBalance = (): number => {
      const monthlyExpense = budgetSummary?.totalExpense || 0;
      const kasaVal = parseFloat(typeof window !== "undefined" ? localStorage.getItem("toplam_kasa") || "0" : "0");

      let emergencyScore = 30;
      if (monthlyExpense > 0) {
        const months = kasaVal / monthlyExpense;
        emergencyScore = months < 1 ? 0 : months < 2 ? 15 : months < 3 ? 30 : months < 6 ? 50 : months < 12 ? 60 : 55;
      }

      const stableCoins = all.filter(a => {
        const sym = (a.symbol || "").toUpperCase();
        return sym.includes("USDT") || sym.includes("USDC") || sym.includes("BUSD");
      }).reduce((s, a) => s + a.totalValueTRY, 0);
      const cashRatio = totalValue > 0 ? (stableCoins / totalValue) * 100 : 0;
      const cashRatioScore = cashRatio < 2 ? 5 : cashRatio < 5 ? 15 : cashRatio < 10 ? 35 : cashRatio < 20 ? 40 : 30;

      return Math.max(0, Math.min(100, emergencyScore * 0.6 + cashRatioScore * 0.4 + (kasaVal > 0 ? 8 : 0)));
    };

    const calcAssetQuality = (): number => {
      let weightedQuality = 0;
      for (const a of all) {
        let quality = 6.0;
        if (a.type === "madeni_para") quality = 9.0;
        else if (a.type === "etf") quality = 8.5;
        else if (a.type === "fon") quality = 7.5;
        else if (a.type === "hisse") { quality = a.market === "US" ? 8.0 : 7.0; }
        else if (a.type === "kripto") {
          const sym = (a.symbol || "").toUpperCase().replace("USDT", "").replace("BUSD", "");
          if (sym === "BTC") quality = 7.5;
          else if (sym === "ETH") quality = 7.0;
          else if (sym.includes("USDT") || sym.includes("USDC")) quality = 8.0;
          else if (["BNB", "SOL", "ADA", "XRP", "DOT", "AVAX", "MATIC", "LINK"].includes(sym)) quality = 6.0;
          else quality = 4.5;
        }
        const weight = totalValue > 0 ? a.totalValueTRY / totalValue : 0;
        weightedQuality += weight * quality;
      }
      let score = weightedQuality * 10;
      const liquidTypes = ["kripto", "hisse", "etf", "fon"];
      const liquidValue = all.filter(a => liquidTypes.includes(a.type)).reduce((s, a) => s + a.totalValueTRY, 0);
      if (totalValue > 0 && liquidValue / totalValue >= 0.7) score += 5;
      score += 3;
      return Math.max(0, Math.min(100, score));
    };

    const calcDurability = (): number => {
      const protectedValue = all.filter(a =>
        a.type === "madeni_para" || a.currency === "USD" || a.currency === "EUR"
      ).reduce((s, a) => s + a.totalValueTRY, 0);
      const protectedPct = totalValue > 0 ? (protectedValue / totalValue) * 100 : 0;
      const A = protectedPct < 10 ? 5 : protectedPct < 30 ? 20 : protectedPct < 50 ? 30 : 40;

      const passiveTypes = ["hisse", "etf", "fon", "madeni_para"];
      const passiveValue = all.filter(a => passiveTypes.includes(a.type)).reduce((s, a) => s + a.totalValueTRY, 0);
      const passivePct = totalValue > 0 ? (passiveValue / totalValue) * 100 : 0;
      const B = passivePct === 0 ? 0 : passivePct < 20 ? 10 : passivePct < 40 ? 20 : 30;

      const growthTypes = ["hisse", "kripto", "etf", "fon"];
      const growthValue = all.filter(a => growthTypes.includes(a.type)).reduce((s, a) => s + a.totalValueTRY, 0);
      const growthPct = totalValue > 0 ? (growthValue / totalValue) * 100 : 0;
      const C = growthPct < 10 ? 10 : growthPct < 30 ? 20 : growthPct < 60 ? 30 : 20;

      return Math.max(0, Math.min(100, A + B + C));
    };

    const diversification = Math.round(calcDiversification());
    const riskManagement = Math.round(calcRiskManagement());
    const volatility = Math.round(calcVolatility());
    const cashBalance = Math.round(calcCashBalance());
    const assetQuality = Math.round(calcAssetQuality());
    const durability = Math.round(calcDurability());

    const total = Math.round(
      diversification * 0.25 +
      riskManagement * 0.20 +
      volatility * 0.15 +
      cashBalance * 0.15 +
      assetQuality * 0.15 +
      durability * 0.10
    );

    const grade = total >= 90 ? "A+" : total >= 80 ? "A" : total >= 70 ? "B" : total >= 60 ? "C" : total >= 50 ? "D" : "F";
    const level = total >= 80 ? "Yüksek Seviye" : total >= 60 ? "Orta Seviye" : total >= 40 ? "Düşük Seviye" : "Kritik Seviye";

    let change = 0;
    if (typeof window !== "undefined") {
      const weekAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toDateString();
      const prevScore = parseInt(localStorage.getItem(`health_score_${weekAgoDate}`) || "0");
      change = prevScore > 0 ? total - prevScore : 0;
      localStorage.setItem(`health_score_${new Date().toDateString()}`, total.toString());
    }

    const recommendations: { priority: "HIGH" | "MEDIUM" | "LOW"; component: string; message: string; action: string }[] = [];
    if (diversification < 40) recommendations.push({ priority: "HIGH", component: "Çeşitlendirme", message: "Portföyün tek varlık türüne yoğunlaşmış. En az 3 farklı varlık sınıfına yatırım yapmayı düşün.", action: "Altın veya döviz pozisyonu aç" });
    if (riskManagement < 30) recommendations.push({ priority: "HIGH", component: "Risk Yönetimi", message: "Risk seviyeni düşürmek için yüksek riskli varlığı altın veya tahvile çevir.", action: "Portföyünün %20'sini güvenli varlıklara taşı" });
    if (cashBalance < 40) recommendations.push({ priority: "MEDIUM", component: "Nakit Dengesi", message: "Acil durum fonun yetersiz. En az 3 aylık gider kadar nakit rezerv bulundur.", action: "Nakit rezervi artır" });
    if (volatility < 35) recommendations.push({ priority: "MEDIUM", component: "Volatilite", message: "Yüksek volatiliteyi dengelemek için stabil varlık ekle (altın, dolar, tahvil).", action: "Portföyüne %15 altın ekle" });
    if (durability < 50) recommendations.push({ priority: "LOW", component: "Uzun Vade", message: "Temettü ödeyen hisse veya fon ekleyerek pasif gelir oluşturabilirsin.", action: "Temettü hissesi veya fon araştır" });
    recommendations.sort((a, b) => ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[a.priority] - { HIGH: 0, MEDIUM: 1, LOW: 2 }[b.priority]));

    return {
      total, grade, level, change,
      components: { diversification, riskManagement, volatility, cashBalance, assetQuality, durability },
      recommendations: recommendations.slice(0, 4),
    };
  }, [assets, budgetSummary, portfolioSummary]);

  const componentKeys = ["diversification", "riskManagement", "volatility", "cashBalance", "assetQuality", "durability"] as const;

  return (
    <div className="finos-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
        <div>
          <h3 className="text-sm font-semibold text-[#F0F2F7]">Portföy Sağlık Puanı</h3>
          <p className="text-xs text-[#4E5A6B] mt-0.5">Portföyünün genel sağlık durumunu yapay zeka ile analiz ediyoruz.</p>
        </div>
        <div className="text-xs text-[#4E5A6B]">
          Son Güncelleme: {new Date().toLocaleDateString("tr-TR")} — {new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-col xl:flex-row gap-6">
          {/* LEFT: Speedometer */}
          <div className="flex flex-col items-center xl:w-64 flex-shrink-0">
            <SpeedometerGauge
              score={result.total}
              grade={result.grade}
              change={result.change}
              level={result.level}
            />
            {/* Description */}
            {result.total > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-[#0E1117] border border-[rgba(255,255,255,0.06)] w-full max-w-[240px]">
                <p className="text-xs text-[#8892A4] text-center leading-relaxed">
                  {result.total >= 80
                    ? "Portföyün mükemmel sağlıkta. Stratejiyi koruyarak devam et."
                    : result.total >= 60
                    ? "Portföyün orta düzeyde sağlıklı. Bazı riskler bulunuyor, önerileri takip ederek skoru artırabilirsin."
                    : result.total >= 40
                    ? "Portföyünde önemli riskler var. Acil önlem almayı düşün."
                    : "Portföyün kritik seviyede. Çeşitlendirme ve risk yönetimine odaklan."}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT: 6 Component Cards */}
          <div className="flex-1">
            <p className="text-xs font-bold text-[#4E5A6B] uppercase tracking-widest mb-3">Sağlık Skoru Bileşenleri</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {componentKeys.map((key) => {
                const score = result.components[key];
                const color = getScoreColor(score);
                const label = getScoreLabel(score);
                const desc = getComponentDesc(key, score);
                const Icon = COMPONENT_ICONS[key];
                const componentLabel = COMPONENT_LABELS[key];
                const weight = COMPONENT_WEIGHTS[key];
                return (
                  <div
                    key={key}
                    className="group relative flex flex-col items-center gap-2 p-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0E1117] transition-all duration-200 cursor-default"
                    style={{ borderColor: `${color}20` }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px ${color}25`;
                      (e.currentTarget as HTMLElement).style.borderColor = `${color}50`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                      (e.currentTarget as HTMLElement).style.borderColor = `${color}20`;
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                      <span className="text-[9px] font-bold uppercase tracking-wider text-center leading-tight" style={{ color: "#8892A4" }}>
                        {componentLabel}
                      </span>
                    </div>
                    <MiniDonut score={score} color={color} size={68} />
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-bold" style={{ color }}>{label}</span>
                      <span className="text-[9px] text-[#4E5A6B]">Ağırlık {weight}</span>
                    </div>
                    <p className="text-[9px] text-[#4E5A6B] text-center leading-relaxed">{desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold text-[#4E5A6B] uppercase tracking-widest mb-2">Öneriler</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0E1117] border border-[rgba(255,255,255,0.04)]">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                        style={{ backgroundColor: rec.priority === "HIGH" ? "#FF4757" : rec.priority === "MEDIUM" ? "#FFB833" : "#00D4AA" }}
                      />
                      <div>
                        <p className="text-[10px] font-semibold text-[#F0F2F7]">{rec.component}</p>
                        <p className="text-[10px] text-[#8892A4] leading-relaxed mt-0.5">{rec.message}</p>
                        <p className="text-[10px] font-medium mt-1" style={{ color: "#00D4AA" }}>→ {rec.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
