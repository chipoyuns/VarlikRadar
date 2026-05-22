import { useState } from "react";
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, Bell, Send, Bot, User, RefreshCw, ThumbsUp, ThumbsDown, ChevronRight } from "lucide-react";

const aiInsights = [
  { id: 1, type: "opportunity", title: "Yatırım Fırsatı", message: "THYAO hissesi momentum göstergelerine göre güçlü bir yükseliş trendinde. Son 3 ayda %32 getiri sağladı.", action: "Portföyünüzü %5 artırabilirsiniz", confidence: 87 },
  { id: 2, type: "warning", title: "Bütçe Uyarısı", message: "Eğlence kategorisinde bütçenizin %80'ini harcadınız ve ayın sonuna 12 gün kaldı.", action: "Günlük harcama limitini ₺120 olarak ayarlayın", confidence: 94 },
  { id: 3, type: "insight", title: "Tasarruf Önerisi", message: "Mevcut tasarruf oranınız %28. Hedeflerinize ulaşmak için bu oranı %32'ye çıkarmanız önerilir.", action: "Aylık ₺3.500 daha tasarruf edin", confidence: 91 },
  { id: 4, type: "alert", title: "Borç Uyarısı", message: "Kredi kartı borcunuz yüksek faiz biriktiriyor. Öncelikli ödeme yapmanız önerilir.", action: "Bu ay ₺15.000 ek ödeme yapın", confidence: 96 },
];

const insightIcons: Record<string, any> = {
  opportunity: TrendingUp, warning: AlertTriangle, insight: Lightbulb, alert: Bell,
};
const insightColors: Record<string, { bg: string; text: string; border: string }> = {
  opportunity: { bg: "rgba(0,212,170,0.1)", text: "#00D4AA", border: "rgba(0,212,170,0.3)" },
  warning: { bg: "rgba(255,184,51,0.1)", text: "#FFB833", border: "rgba(255,184,51,0.3)" },
  insight: { bg: "rgba(75,158,255,0.1)", text: "#4B9EFF", border: "rgba(75,158,255,0.3)" },
  alert: { bg: "rgba(255,71,87,0.1)", text: "#FF4757", border: "rgba(255,71,87,0.3)" },
};

const sampleMessages = [
  { role: "assistant", content: "Merhaba! Ben FinOS AI Koç. Finansal kararlarınızda yardımcı olmak için buradayım. Bugün portföyünüzü analiz ettim ve birkaç önemli tespit var." },
  { role: "user", content: "Portföyüm hakkında ne düşünüyorsun?" },
  { role: "assistant", content: "Portföyünüz genel olarak iyi dengeli görünüyor. Ancak birkaç öneri var:\n\n1. Hisse ağırlığı yüksek — %45 hisse oranı piyasa dalgalanmalarına karşı sizi kırılgan yapıyor.\n\n2. Kripto pozisyonu — BTC ve ETH'daki pozisyonlarınız iyi getiri sağlamış, ancak %25 oran riskli olabilir.\n\n3. Acil durum fonu — Hedeflerinize göre acil durum fonunuz neredeyse tamamlanmış, harika iş!" },
];

const fmt = (v: number) => v.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

export default function AICoach() {
  const [messages, setMessages] = useState(sampleMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: "user", content: input }]);
    setInput("");
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorunuzu analiz ediyorum... Portföy verilerinizi ve piyasa koşullarını değerlendirerek kısa süre içinde kapsamlı bir yanıt hazırlayacağım." }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#F0F2F7]">AI Koç</h1>
          <p className="text-sm text-[#8892A4] mt-1">Yapay zeka destekli finansal danışmanlık</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#8892A4] hover:border-[rgba(255,255,255,0.1)] hover:text-[#F0F2F7] transition-all">
          <RefreshCw className="w-4 h-4" /> Yeni Analiz
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel */}
        <div className="space-y-4">
          <div className="finos-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[rgba(167,139,250,0.15)] flex items-center justify-center glow-purple">
                <Sparkles className="w-5 h-5 text-[#A78BFA]" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-[#F0F2F7]">AI Önerileri</h3>
                <p className="text-xs text-[#4E5A6B]">Bugün için {aiInsights.length} yeni öneri</p>
              </div>
            </div>
            <div className="space-y-3">
              {aiInsights.map((insight) => {
                const colors = insightColors[insight.type];
                const Icon = insightIcons[insight.type];
                return (
                  <div key={insight.id} className="p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.02]"
                    style={{ backgroundColor: colors.bg, borderColor: colors.border }}>
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: colors.text }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium" style={{ color: colors.text }}>{insight.title}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${colors.text}20`, color: colors.text }}>%{insight.confidence}</span>
                        </div>
                        <p className="text-xs text-[#8892A4] line-clamp-2 mb-2">{insight.message}</p>
                        <button className="flex items-center gap-1 text-xs font-medium" style={{ color: colors.text }}>
                          {insight.action}<ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="finos-card p-5">
            <h3 className="text-sm font-medium text-[#8892A4] mb-3">AI Performansı</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#4E5A6B]">Doğru Tahminler</span>
                <span className="text-sm font-mono text-[#00D4AA]">%87</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#4E5A6B]">Tasarruf Sağlanan</span>
                <span className="text-sm font-mono text-[#00D4AA]">{fmt(45230)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#4E5A6B]">Kaçırılan Riskler</span>
                <span className="text-sm font-mono text-[#F0F2F7]">12</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-2 finos-card flex flex-col" style={{ height: "700px" }}>
          {/* Chat Header */}
          <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#00D4AA] flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-[#F0F2F7]">FinOS AI Koç</h3>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#00D4AA] rounded-full animate-pulse" />
                  <span className="text-xs text-[#4E5A6B]">Çevrimiçi</span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === "assistant" ? "bg-gradient-to-br from-[#A78BFA] to-[#00D4AA]" : "bg-[#4B9EFF]"}`}>
                  {message.role === "assistant" ? <Bot className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-white" />}
                </div>
                <div className={`max-w-[80%] ${message.role === "user" ? "text-right" : ""}`}>
                  <div className={`p-4 rounded-2xl ${message.role === "assistant" ? "bg-[#151A23] rounded-tl-sm" : "bg-[#4B9EFF] rounded-tr-sm"}`}>
                    <p className="text-sm text-[#F0F2F7] whitespace-pre-line">{message.content}</p>
                  </div>
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-2 mt-2">
                      <button className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.04)] text-[#4E5A6B] hover:text-[#00D4AA] transition-colors"><ThumbsUp className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded-md hover:bg-[rgba(255,255,255,0.04)] text-[#4E5A6B] hover:text-[#FF4757] transition-colors"><ThumbsDown className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#00D4AA] flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-[#151A23] p-4 rounded-2xl rounded-tl-sm">
                  <div className="flex items-center gap-1">
                    {[0, 150, 300].map(delay => (
                      <span key={delay} className="w-2 h-2 bg-[#8892A4] rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-3">
              <input type="text" value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="Bir soru sorun..."
                className="flex-1 px-4 py-3 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-xl text-sm text-[#F0F2F7] placeholder:text-[#4E5A6B] focus:outline-none focus:border-[#A78BFA] transition-colors" />
              <button onClick={handleSend} className="p-3 bg-gradient-to-r from-[#A78BFA] to-[#00D4AA] rounded-xl hover:opacity-90 transition-opacity">
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {["Portföy analizi", "Bütçe önerisi", "Yatırım fırsatları"].map(suggestion => (
                <button key={suggestion} onClick={() => setInput(suggestion)}
                  className="px-3 py-1.5 text-xs text-[#8892A4] bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg hover:border-[rgba(255,255,255,0.1)] hover:text-[#F0F2F7] transition-colors">
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
