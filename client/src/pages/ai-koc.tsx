import { useState, useRef, useEffect } from "react";
import {
  Sparkles, TrendingUp, AlertTriangle, CreditCard, Bot, Send,
  User, Mic, ChevronRight, AlertCircle, CheckCircle,
} from "lucide-react";

const fmt = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v);

interface Message {
  id: string;
  role: "assistant" | "user";
  content: string;
  actionButton?: { text: string };
}

const initialMessage: Message = {
  id: "1",
  role: "assistant",
  content: `Merhaba! Ben FinOS AI Kocun. Portfoyunu analiz ettim:

Net degerin ${fmt(3891094)} - harika gidiyor!

Risk profilin agresif seviyede - portfolyun %100 kripto

Bu ay icin 3 onerim var. Gormek ister misin?`,
  actionButton: { text: "Evet, goster" },
};

const quickActions = [
  "Portfolyum nasil?",
  "Bu ay nerede harcadim?",
  "FIRE hedefim?",
  "Borc stratejim?",
  "Risk seviyem?",
  "Ne onerirsin?",
];

const dailyInsights = [
  { id: 1, type: "success", icon: TrendingUp, title: "BTC bugun +%3.09 artti", description: `Portfolyune +${fmt(116633)} katki sagladi` },
  { id: 2, type: "warning", icon: CreditCard, title: "Kredi karti son odeme tarihi", description: "8 gun sonra 1.200 TL minimum odeme" },
  { id: 3, type: "danger", icon: AlertCircle, title: "Yuksek konsantrasyon riski", description: "Portfolyunun %100'u tek varlikta" },
  { id: 4, type: "info", icon: Bot, title: "AI Gunluk Raporu hazir", description: "Bu haftaki analizini gor" },
];

const insightStyles: Record<string, { bg: string; border: string; iconColor: string }> = {
  success: { bg: "rgba(0,212,170,0.08)", border: "rgba(0,212,170,0.2)", iconColor: "#00D4AA" },
  warning: { bg: "rgba(255,184,51,0.08)", border: "rgba(255,184,51,0.2)", iconColor: "#FFB833" },
  danger: { bg: "rgba(255,71,87,0.08)", border: "rgba(255,71,87,0.2)", iconColor: "#FF4757" },
  info: { bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)", iconColor: "#A78BFA" },
};

const behaviorTags = [
  { text: "Panik satisi egilimi", color: "#FF4757", emoji: "😰" },
  { text: "FOMO alimi", color: "#FFB833", emoji: "🚀" },
];

const stressScoreBreakdown = [
  { name: "Borc orani", status: "good" },
  { name: "Nakit akisi", status: "good" },
  { name: "Acil fon", status: "warning" },
];

export default function AICoach() {
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [messages]);

  const handleSend = (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;
    const userMessage: Message = { id: Date.now().toString(), role: "user", content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      let response = "";
      if (messageText.toLowerCase().includes("risk") || messageText.toLowerCase().includes("portfoly")) {
        response = `Evet, portfolyun su anda yuksek risk seviyesinde:\n\n- Kripto agirligi: %100 (onerilen maksimum: %30-40)\n- Tek varlikta %100 konsantrasyon var (BTC)\n- Cesitlilik skoru: 20/100\n\nOnerilerim:\n1. BIST'ten 2-3 hisse ekle (portfolyun %20-30'u)\n2. Altin pozisyonu ac (%10-15)\n3. 10.000 TL nakit rezerv tut\n\nBu degisiklikler risk skorunu 10/10'dan yaklasik 5/10'a dusurur.`;
      } else if (messageText.toLowerCase().includes("harca") || messageText.toLowerCase().includes("butce")) {
        response = `Bu ayki harcama analizin:\n\nMarket: 6.234 TL (%78 butce kullanimi)\nUlasim: 2.890 TL (%96 butce kullanimi)\nEglence: 3.200 TL (%80 butce kullanimi)\n\nDikkat: Ulasim kategorisinde butceni neredeyse astin. Alternatif ulasim seceneklerini degerlendir.`;
      } else if (messageText.toLowerCase().includes("fire") || messageText.toLowerCase().includes("emekli")) {
        response = `FIRE Hedef Analizi:\n\nMevcut tasarruf oranin: %28\nHedef FIRE yasi: 45\nTahmini FIRE tarihi: 2042\n\nDaha erken emekli olmak icin:\n- Tasarruf oranini %35'e cikar (FIRE yasini 42'ye dusurur)\n- Pasif gelir kaynaklari olustur\n- Temettu hisseleri ekle`;
      } else {
        response = `Sorunuzu analiz ediyorum. Portfoly verilerinize ve piyasa kosullarina gore size en uygun oneriyi hazirliyorum.\n\nSimdilik genel onerim: Risk dagiliminizi gozden gecirin ve cesitlendirme yapin.`;
      }
      const aiMessage: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: response };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const stressScore = 42;

  return (
    <div className="flex gap-6 h-[calc(100vh-120px)]">
      {/* LEFT - Chat Interface (65%) */}
      <div className="w-[65%] finos-card flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#A78BFA] flex items-center justify-center glow-purple">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[#F0F2F7]">FinOS AI Kocu</h3>
                <span className="w-2 h-2 bg-[#00D4AA] rounded-full" />
                <span className="text-xs text-[#00D4AA]">Her zaman cevrimici</span>
              </div>
              <p className="text-xs text-[#4E5A6B]">Tum finansal verilerinize erisimim var</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {message.role === 'assistant' ? (
                <div className="w-9 h-9 rounded-full bg-[#A78BFA] flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white">AI</span>
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#151A23] flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-[#8892A4]" />
                </div>
              )}
              <div className={`max-w-[75%] ${message.role === 'user' ? 'text-right' : ''}`}>
                <div className={`p-4 rounded-2xl ${message.role === 'assistant' ? 'bg-[#151A23] rounded-tl-sm' : 'bg-[#1a1f2e] rounded-tr-sm'}`}>
                  <p className="text-sm text-[#F0F2F7] whitespace-pre-line leading-relaxed">{message.content}</p>
                  {message.actionButton && (
                    <button onClick={() => handleSend("Evet, onerilerini goster")}
                      className="mt-3 flex items-center gap-2 px-4 py-2 bg-[#00D4AA] text-[#080A0F] rounded-lg text-sm font-medium hover:bg-[#00D4AA]/90 transition-colors">
                      {message.actionButton.text}<ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#A78BFA] flex items-center justify-center">
                <span className="text-xs font-bold text-white">AI</span>
              </div>
              <div className="bg-[#151A23] p-4 rounded-2xl rounded-tl-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-[#8892A4] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[#8892A4] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[#8892A4] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-3 border-t border-[rgba(255,255,255,0.06)]">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button key={action} onClick={() => handleSend(action)}
                className="px-3 py-1.5 text-xs text-[#8892A4] bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-full hover:border-[#A78BFA] hover:text-[#A78BFA] transition-colors">
                {action}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Bir sey sor..."
                className="w-full px-4 py-3 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-xl text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#A78BFA] transition-colors pr-12" />
            </div>
            <button className="p-3 bg-[#A78BFA] rounded-xl hover:bg-[#A78BFA]/90 transition-colors">
              <Mic className="w-5 h-5 text-white" />
            </button>
            <button onClick={() => handleSend()} className="p-3 bg-[#00D4AA] rounded-xl hover:bg-[#00D4AA]/90 transition-colors">
              <Send className="w-5 h-5 text-[#080A0F]" />
            </button>
          </div>
          <p className="text-[10px] text-[#4E5A6B] mt-2 text-center">Shift+Enter ile satir ekle</p>
        </div>
      </div>

      {/* RIGHT - Insights Panel (35%) */}
      <div className="w-[35%] space-y-4 overflow-y-auto">
        {/* Daily Insights */}
        <div className="finos-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#F0F2F7]">Gunluk Icgoruler</h3>
            <span className="text-xs text-[#4E5A6B]">22 May 2024</span>
          </div>
          <div className="space-y-3">
            {dailyInsights.map((insight) => {
              const style = insightStyles[insight.type];
              const Icon = insight.icon;
              return (
                <div key={insight.id} className="p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: style.bg, border: `1px solid ${style.border}` }}>
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 flex-shrink-0" style={{ color: style.iconColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#F0F2F7]">{insight.title}</p>
                      <p className="text-xs text-[#8892A4] mt-0.5">{insight.description}</p>
                    </div>
                    {insight.type === "info" && <ChevronRight className="w-4 h-4 text-[#A78BFA] flex-shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Behavioral Analysis */}
        <div className="finos-card p-5">
          <h3 className="text-sm font-semibold text-[#F0F2F7] mb-4">Yatirim Davranisi</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {behaviorTags.map((tag, index) => (
              <span key={index} className="px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: `${tag.color}15`, color: tag.color, border: `1px solid ${tag.color}30` }}>
                {tag.emoji} {tag.text}
              </span>
            ))}
          </div>
          <div className="p-3 bg-[#151A23] rounded-xl mb-3">
            <p className="text-xs text-[#8892A4] leading-relaxed">Son 5 isleminizde panik satisi davranisi tespit edildi</p>
          </div>
          <div className="p-3 bg-[rgba(0,212,170,0.08)] border border-[rgba(0,212,170,0.2)] rounded-xl">
            <p className="text-xs text-[#00D4AA] leading-relaxed">Oneri: Otomatik DCA plani kur, duygusal kararlari azalt</p>
          </div>
        </div>

        {/* Financial Stress Score */}
        <div className="finos-card p-5">
          <h3 className="text-sm font-semibold text-[#F0F2F7] mb-4">Finansal Stres Skoru</h3>
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="#151A23" strokeWidth="8" fill="none" />
                <circle cx="48" cy="48" r="40" stroke="#00D4AA" strokeWidth="8" fill="none" strokeLinecap="round"
                  strokeDasharray={`${(stressScore / 100) * 251} 251`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold font-mono text-[#F0F2F7]">{stressScore}</span>
                <span className="text-[10px] text-[#00D4AA] font-medium">Dusuk</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {stressScoreBreakdown.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-xs text-[#8892A4]">{item.name}</span>
                  {item.status === "good" ? <CheckCircle className="w-4 h-4 text-[#00D4AA]" /> : <AlertTriangle className="w-4 h-4 text-[#FFB833]" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
