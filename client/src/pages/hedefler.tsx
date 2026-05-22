import { useState } from "react";
import { Plus, Pencil, Trash2, Target, TrendingUp, CheckCircle } from "lucide-react";

const goals = [
  { id: 1, title: "EV PEŞİNATI", emoji: "🏠", current: 180000, target: 500000, monthlyContribution: 8000, estimatedCompletion: "Mart 2028", remainingMonths: 33, aiInsight: "Katkını ₺10.000'e çıkarsan 8 ay erken tamamlarsın", color: "#00D4AA" },
  { id: 2, title: "ACİL DURUM FONU", emoji: "🛡️", current: 42000, target: 70000, monthlyContribution: 3000, estimatedCompletion: "Aralık 2025", remainingMonths: 10, subtitle: "6 aylık gider hedefi", warning: "Hedefinize ulaşmak için ₺28.000 daha gerekiyor", color: "#FFB833" },
  { id: 3, title: "TATİL FONU", emoji: "✈️", current: 17000, target: 20000, monthlyContribution: 1500, estimatedCompletion: "Temmuz 2026", remainingMonths: 2, celebration: "Hedefinize çok yakınsınız!", color: "#00D4AA" },
  { id: 4, title: "EMEKLİLİK", emoji: "🏖️", current: 120000, target: 1500000, monthlyContribution: 5000, estimatedCompletion: "2045", remainingMonths: 240, color: "#FF4757" },
];

const fireData = { targetAge: 41, fireTarget: 18750000, currentNetWorth: 3891094, monthlyPassiveIncome: 62500, remainingYears: 11, remainingMonths: 4, progress: 67 };

function ProgressRing({ progress, size = 120, strokeWidth = 8, color = "#00D4AA" }: { progress: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="progress-ring" width={size} height={size}>
        <circle stroke="#151A23" strokeWidth={strokeWidth} fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
        <circle stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="transparent" r={radius} cx={size / 2} cy={size / 2}
          style={{ strokeDasharray: circumference, strokeDashoffset: offset, transition: "stroke-dashoffset 0.5s ease-in-out", filter: `drop-shadow(0 0 6px ${color}40)` }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold font-mono text-[#F0F2F7]">{progress}%</span>
      </div>
    </div>
  );
}

const fmt = (v: number) => v.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

export default function Goals() {
  const activeGoals = goals.filter(g => (g.current / g.target) < 1).length;
  const completedGoals = goals.filter(g => (g.current / g.target) >= 1).length;
  const totalTarget = goals.reduce((s, g) => s + g.target, 0);
  const totalSaved = goals.reduce((s, g) => s + g.current, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#F0F2F7]">Hedefler</h1>
          <p className="text-sm text-[#8892A4] mt-1">Finansal hedeflerinizi takip edin</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#00D4AA] rounded-lg text-sm font-medium text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors">
          <Plus className="h-4 w-4" /> Yeni Hedef
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Aktif Hedef", value: activeGoals, color: "#F0F2F7" },
          { label: "Tamamlanan", value: completedGoals, color: "#00D4AA" },
          { label: "Toplam Hedef", value: fmt(totalTarget), color: "#F0F2F7" },
          { label: "Toplam Birikim", value: fmt(totalSaved), color: "#00D4AA" },
        ].map((stat, i) => (
          <div key={i} className="finos-card p-4">
            <p className="text-xs text-[#8892A4] mb-1">{stat.label}</p>
            <p className="text-2xl font-bold font-mono" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Goal Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {goals.map((goal) => {
          const progress = Math.min(Math.round((goal.current / goal.target) * 100), 100);
          const remaining = goal.target - goal.current;
          return (
            <div key={goal.id} className="finos-card p-5">
              <div className="flex items-start gap-4">
                <ProgressRing progress={progress} size={100} strokeWidth={7} color={goal.color} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{goal.emoji}</span>
                        <h3 className="text-sm font-bold text-[#F0F2F7] tracking-wide">{goal.title}</h3>
                      </div>
                      {goal.subtitle && <p className="text-xs text-[#4E5A6B] mt-0.5">{goal.subtitle}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] text-[#4E5A6B] hover:text-[#F0F2F7] transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded-lg hover:bg-[rgba(255,71,87,0.1)] text-[#4E5A6B] hover:text-[#FF4757] transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8892A4]">Birikim</span>
                      <span className="font-mono text-[#F0F2F7]">{fmt(goal.current)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8892A4]">Hedef</span>
                      <span className="font-mono text-[#F0F2F7]">{fmt(goal.target)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8892A4]">Kalan</span>
                      <span className="font-mono" style={{ color: goal.color }}>{fmt(remaining)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8892A4]">Aylık Katkı</span>
                      <span className="font-mono text-[#F0F2F7]">{fmt(goal.monthlyContribution)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#8892A4]">Tahmini Tamamlanma</span>
                      <span className="font-mono text-[#F0F2F7]">{goal.estimatedCompletion}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="h-1.5 bg-[#151A23] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: goal.color }} />
                </div>
              </div>

              {/* AI/Warning banners */}
              {goal.celebration && (
                <div className="mt-3 p-3 rounded-xl bg-[rgba(0,212,170,0.08)] border border-[rgba(0,212,170,0.2)] flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#00D4AA] flex-shrink-0" />
                  <p className="text-xs text-[#00D4AA]">{goal.celebration}</p>
                </div>
              )}
              {goal.aiInsight && (
                <div className="mt-3 p-3 rounded-xl bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.2)] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#A78BFA] flex-shrink-0" />
                  <p className="text-xs text-[#A78BFA]">{goal.aiInsight}</p>
                </div>
              )}
              {goal.warning && (
                <div className="mt-3 p-3 rounded-xl bg-[rgba(255,184,51,0.08)] border border-[rgba(255,184,51,0.2)] flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#FFB833] flex-shrink-0" />
                  <p className="text-xs text-[#FFB833]">{goal.warning}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FIRE Calculator */}
      <div className="finos-card p-6" style={{ borderLeft: "3px solid #00D4AA" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[rgba(0,212,170,0.15)] flex items-center justify-center">
            <span className="text-xl">🔥</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#F0F2F7]">FIRE Hesabı</h2>
            <p className="text-xs text-[#4E5A6B]">Finansal Özgürlük ve Erken Emeklilik</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="finos-card-inner p-4 text-center">
            <p className="text-xs text-[#8892A4] mb-1">FIRE Hedefi</p>
            <p className="text-lg font-bold font-mono text-[#F0F2F7]">{fmt(fireData.fireTarget)}</p>
            <p className="text-xs text-[#4E5A6B]">25× yıllık gider</p>
          </div>
          <div className="finos-card-inner p-4 text-center">
            <p className="text-xs text-[#8892A4] mb-1">Mevcut Net Değer</p>
            <p className="text-lg font-bold font-mono text-[#00D4AA]">{fmt(fireData.currentNetWorth)}</p>
            <p className="text-xs text-[#4E5A6B]">%{fireData.progress} tamamlandı</p>
          </div>
          <div className="finos-card-inner p-4 text-center">
            <p className="text-xs text-[#8892A4] mb-1">Hedef Yaş</p>
            <p className="text-lg font-bold font-mono text-[#FFB833]">{fireData.targetAge}</p>
            <p className="text-xs text-[#4E5A6B]">{fireData.remainingYears} yıl {fireData.remainingMonths} ay kaldı</p>
          </div>
          <div className="finos-card-inner p-4 text-center">
            <p className="text-xs text-[#8892A4] mb-1">Pasif Gelir</p>
            <p className="text-lg font-bold font-mono text-[#4B9EFF]">{fmt(fireData.monthlyPassiveIncome)}</p>
            <p className="text-xs text-[#4E5A6B]">aylık</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#4E5A6B]">FIRE İlerlemesi</span>
            <span className="text-xs font-mono text-[#00D4AA]">%{fireData.progress}</span>
          </div>
          <div className="h-3 bg-[#151A23] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#00D4AA] transition-all" style={{ width: `${fireData.progress}%`, boxShadow: "0 0 10px rgba(0,212,170,0.4)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
