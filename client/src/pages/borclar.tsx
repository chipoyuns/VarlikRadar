import { useState } from "react";
import { CreditCard, Car, Building2, User, Target, Clock, Zap, Snowflake, Mountain, CheckCircle2, Sparkles, Plus } from "lucide-react";

const debts = [
  { id: 1, name: "Garanti Kredi Kartı", type: "credit", bankLogo: "🏦", interestRate: 4.5, remaining: 24000, total: 24000, monthlyPayment: 3000, dueDay: 15, daysLeft: 8, color: "#FF4757", icon: CreditCard },
  { id: 2, name: "Taşıt Kredisi", type: "auto", bankLogo: "🚗", interestRate: 1.89, remaining: 85000, total: 120000, monthlyPayment: 4200, endDate: "Ağu 2027", color: "#A78BFA", icon: Car },
  { id: 3, name: "İhtiyaç Kredisi", type: "loan", bankLogo: "🏛️", interestRate: 2.1, remaining: 32000, total: 50000, monthlyPayment: 1800, payoffMonths: 18, color: "#FFB833", icon: Building2 },
  { id: 4, name: "Arkadaş Borcu", type: "personal", bankLogo: "👤", interestRate: 0, remaining: 5000, total: 5000, note: "Faizsiz", color: "#4B9EFF", icon: User },
];

const typeColors: Record<string, string> = { credit: "#FF4757", auto: "#A78BFA", loan: "#FFB833", personal: "#4B9EFF" };

const fmt = (v: number) => v.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

export default function Debts() {
  const [strategy, setStrategy] = useState<"snowball" | "avalanche">("avalanche");

  const totalDebt = debts.reduce((s, d) => s + d.remaining, 0);
  const totalMonthly = debts.reduce((s, d) => s + (d.monthlyPayment || 0), 0);
  const highestInterest = Math.max(...debts.map(d => d.interestRate));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#F0F2F7]">Borçlar</h1>
          <p className="text-sm text-[#8892A4] mt-1">Borçlarınızı takip edin ve optimize edin</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#00D4AA] rounded-lg text-sm font-medium text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors">
          <Plus className="h-4 w-4" /> Borç Ekle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="finos-card p-4">
          <p className="text-xs text-[#8892A4] mb-1">Toplam Borç</p>
          <p className="text-2xl font-bold font-mono text-[#FF4757]">{fmt(totalDebt)}</p>
        </div>
        <div className="finos-card p-4">
          <p className="text-xs text-[#8892A4] mb-1">Aylık Ödeme</p>
          <p className="text-2xl font-bold font-mono text-[#FFB833]">{fmt(totalMonthly)}</p>
        </div>
        <div className="finos-card p-4">
          <p className="text-xs text-[#8892A4] mb-1">En Yüksek Faiz</p>
          <p className="text-2xl font-bold font-mono text-[#FF4757]">%{highestInterest}/ay</p>
        </div>
        <div className="finos-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-3.5 h-3.5 text-[#00D4AA]" />
            <p className="text-xs text-[#8892A4]">Borçsuz Tarih</p>
          </div>
          <p className="text-2xl font-bold font-mono text-[#00D4AA]">Ağu 2027</p>
        </div>
      </div>

      {/* Debt Cards */}
      <div className="space-y-4">
        {debts.map((debt) => {
          const progress = ((debt.total - debt.remaining) / debt.total) * 100;
          const color = typeColors[debt.type];
          const Icon = debt.icon;
          return (
            <div key={debt.id} className="finos-card p-5 hover:border-[rgba(255,255,255,0.1)] transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${color}15` }}>
                    {debt.bankLogo}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-semibold text-[#F0F2F7]">{debt.name}</h3>
                      <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: `${color}20`, color }}>
                        {debt.type === "credit" ? "Kredi Kartı" : debt.type === "auto" ? "Taşıt Kredisi" : debt.type === "personal" ? "Kişisel Borç" : "İhtiyaç Kredisi"}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 mt-2 flex-wrap">
                      {debt.interestRate > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#8892A4]">Faiz:</span>
                          <span className="px-2 py-0.5 rounded bg-[rgba(255,71,87,0.15)] text-[#FF4757] text-xs font-mono font-medium">%{debt.interestRate}/ay</span>
                        </div>
                      )}
                      {debt.monthlyPayment > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#8892A4]">Aylık:</span>
                          <span className="text-sm font-mono text-[#F0F2F7]">{fmt(debt.monthlyPayment)}</span>
                        </div>
                      )}
                      {debt.dueDay && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#8892A4]">Vade:</span>
                          <span className="text-sm text-[#F0F2F7]">Her ayın {debt.dueDay}'si</span>
                          {debt.daysLeft && (
                            <span className="px-2 py-0.5 rounded bg-[rgba(255,184,51,0.15)] text-[#FFB833] text-xs font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3" />{debt.daysLeft} gün kaldı
                            </span>
                          )}
                        </div>
                      )}
                      {debt.note && <span className="text-sm text-[#8892A4] italic">{debt.note}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold font-mono text-[#FF4757]">{fmt(debt.remaining)}</p>
                  <p className="text-xs text-[#4E5A6B]">kaldı</p>
                  {debt.total !== debt.remaining && (
                    <p className="text-sm text-[#8892A4] mt-1">Toplam: {fmt(debt.total)}</p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#4E5A6B]">Ödenen</span>
                  <span className="text-xs font-mono text-[#8892A4]">{progress.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-[#151A23] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(progress, 2)}%`, backgroundColor: progress > 0 ? "#00D4AA" : color }} />
                </div>
                {debt.payoffMonths && <p className="text-xs text-[#8892A4] mt-2">Bu tek borç <span className="text-[#FFB833] font-medium">{debt.payoffMonths} ay</span> sürer</p>}
                {debt.endDate && <p className="text-xs text-[#8892A4] mt-2"><span className="text-[#00D4AA] font-medium">{debt.endDate}</span>'de bitiyor</p>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Debt Exit Engine */}
      <div className="finos-card p-6" style={{ borderLeft: "3px solid #00D4AA" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[rgba(0,212,170,0.15)] flex items-center justify-center">
            <Zap className="w-5 h-5 text-[#00D4AA]" />
          </div>
          <h2 className="text-lg font-semibold text-[#F0F2F7]">Borçtan Çıkış Motoru</h2>
        </div>

        <div className="flex gap-2 mb-6">
          {[{ key: "snowball", label: "Kartopu (Snowball)", Icon: Snowflake, color: "#4B9EFF" },
            { key: "avalanche", label: "Çığ (Avalanche)", Icon: Mountain, color: "#A78BFA" }].map(({ key, label, Icon, color }) => (
            <button key={key} onClick={() => setStrategy(key as any)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{ background: strategy === key ? color : "#151A23", color: strategy === key ? "white" : "#8892A4" }}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        <div className="finos-card-inner p-4 mb-4">
          <p className="text-sm text-[#8892A4]">
            {strategy === "avalanche" ? "En yüksek faizli borçtan başla — toplam faiz tasarrufu maximize et" : "En küçük borçtan başla — motivasyon için hızlı kazançlar elde et"}
          </p>
        </div>

        <div className="space-y-2 mb-6">
          {strategy === "avalanche" ? (
            <>
              <div className="flex items-center gap-4 p-3 rounded-lg bg-[#151A23]">
                <div className="w-20 text-xs font-mono text-[#4E5A6B]">Ay 1-8</div>
                <CreditCard className="w-4 h-4 text-[#FF4757]" />
                <span className="text-sm text-[#F0F2F7]">Garanti Kredi Kartı'na fokus</span>
                <span className="ml-auto px-2 py-0.5 rounded bg-[rgba(255,71,87,0.15)] text-[#FF4757] text-xs">%4.5 faiz</span>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-lg bg-[#151A23]">
                <div className="w-20 text-xs font-mono text-[#4E5A6B]">Ay 9-32</div>
                <Building2 className="w-4 h-4 text-[#FFB833]" />
                <span className="text-sm text-[#F0F2F7]">İhtiyaç Kredisi'ne fokus</span>
                <span className="ml-auto px-2 py-0.5 rounded bg-[rgba(255,184,51,0.15)] text-[#FFB833] text-xs">%2.1 faiz</span>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-lg bg-[#151A23]">
                <div className="w-20 text-xs font-mono text-[#4E5A6B]">Ay 33+</div>
                <Car className="w-4 h-4 text-[#A78BFA]" />
                <span className="text-sm text-[#F0F2F7]">Taşıt Kredisi'ne fokus</span>
                <span className="ml-auto px-2 py-0.5 rounded bg-[rgba(167,139,250,0.15)] text-[#A78BFA] text-xs">%1.89 faiz</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-4 p-3 rounded-lg bg-[#151A23]">
                <div className="w-20 text-xs font-mono text-[#4E5A6B]">Ay 1-3</div>
                <User className="w-4 h-4 text-[#4B9EFF]" />
                <span className="text-sm text-[#F0F2F7]">Arkadaş Borcu'nu kapat</span>
                <span className="ml-auto px-2 py-0.5 rounded bg-[rgba(75,158,255,0.15)] text-[#4B9EFF] text-xs">₺5.000</span>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-lg bg-[#151A23]">
                <div className="w-20 text-xs font-mono text-[#4E5A6B]">Ay 4-12</div>
                <CreditCard className="w-4 h-4 text-[#FF4757]" />
                <span className="text-sm text-[#F0F2F7]">Garanti Kredi Kartı'na fokus</span>
                <span className="ml-auto px-2 py-0.5 rounded bg-[rgba(255,71,87,0.15)] text-[#FF4757] text-xs">₺24.000</span>
              </div>
            </>
          )}
        </div>

        <div className="finos-card-inner p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Snowflake className="w-4 h-4 text-[#4B9EFF]" />
              <span className="text-sm text-[#8892A4]">Kartopu: <span className="text-[#F0F2F7] font-mono">34 ay</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Mountain className="w-4 h-4 text-[#A78BFA]" />
              <span className="text-sm text-[#8892A4]">Çığ: <span className="text-[#F0F2F7] font-mono">30 ay</span></span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00D4AA]" />
            <span className="text-sm text-[#00D4AA] font-medium">4 ay erken + ₺12.400 faiz tasarrufu</span>
          </div>
        </div>

        <div className="finos-card-inner p-4 mb-4 border-l-2 border-[#A78BFA]">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[rgba(167,139,250,0.15)] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-[#A78BFA]" />
            </div>
            <div>
              <p className="text-xs text-[#A78BFA] font-medium mb-1">AI İçgörü</p>
              <p className="text-sm text-[#8892A4]">
                Önce Garanti kredi kartını kapatırsan toplam <span className="text-[#00D4AA] font-medium">14 ay erken</span> borçsuz olursun ve <span className="text-[#00D4AA] font-medium">₺12.400</span> faiz ödemezsin.
              </p>
            </div>
          </div>
        </div>

        <button className="w-full py-3 bg-[#00D4AA] rounded-lg text-sm font-medium text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors">
          Planı Uygula
        </button>
      </div>
    </div>
  );
}
