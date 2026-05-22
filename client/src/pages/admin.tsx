import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Shield, Users, CreditCard, TrendingUp, FileBarChart, Database, Lock, Settings, Sparkles,
  Clock, LogOut, Eye, AlertTriangle, X, Activity, DollarSign, UserMinus, ArrowUp, ArrowDown,
  ChevronRight, Mail, Download, Plus, Search, Filter, MoreHorizontal, Edit, Trash2,
  CheckCircle, XCircle, Pause, Play, RefreshCw, Send, Bell, Globe, Cpu, HardDrive, Wifi,
  Server, Zap, AlertCircle, ExternalLink, Copy, Key, Upload, Trash, ToggleLeft, ToggleRight,
  Star, MessageSquare, ThumbsUp, Calendar, UserPlus, Receipt, Percent, Tag, Gift, Crown,
  Check, ArrowLeft,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

const fmt = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(v);
const fmtN = (v: number) => new Intl.NumberFormat('tr-TR').format(v);

const mockKpiData = {
  totalUsers: 12847,
  newUsersThisMonth: 234,
  activeToday: 3421,
  mrr: 284750,
  mrrGrowth: 12.4,
  activeSubscriptions: 1923,
  freeUsers: 10924,
  premiumUsers: 1456,
  proUsers: 467,
  churnRate: 2.3,
  churnCount: 52,
  arpu: 22.14,
};

const mockUserGrowthData = [
  { month: "Haz", kayit: 890, ayrilma: 45 },
  { month: "Tem", kayit: 1020, ayrilma: 52 },
  { month: "Ağu", kayit: 980, ayrilma: 48 },
  { month: "Eyl", kayit: 1150, ayrilma: 61 },
  { month: "Eki", kayit: 1280, ayrilma: 58 },
  { month: "Kas", kayit: 1340, ayrilma: 64 },
  { month: "Ara", kayit: 1450, ayrilma: 72 },
  { month: "Oca", kayit: 1380, ayrilma: 68 },
  { month: "Şub", kayit: 1520, ayrilma: 71 },
  { month: "Mar", kayit: 1680, ayrilma: 78 },
  { month: "Nis", kayit: 1720, ayrilma: 82 },
  { month: "May", kayit: 1890, ayrilma: 89 },
];

const mockRevenueData = [
  { month: "Ara", free: 0, premium: 168000, pro: 98000 },
  { month: "Oca", free: 0, premium: 178000, pro: 105000 },
  { month: "Şub", free: 0, premium: 189000, pro: 112000 },
  { month: "Mar", free: 0, premium: 198000, pro: 121000 },
  { month: "Nis", free: 0, premium: 208000, pro: 128000 },
  { month: "May", free: 0, premium: 216944, pro: 139633 },
];

const mockActivityFeed = [
  { type: "signup", text: "yeni_kullanici_847 kayit oldu", time: "2 dk once", color: "#00D4AA" },
  { type: "upgrade", text: "mehmet_k Premium'a yukseltildi", time: "5 dk once", color: "#FFB833" },
  { type: "cancel", text: "zeynep_a aboneligini iptal etti", time: "8 dk once", color: "#FF4757" },
  { type: "login", text: "admin giris yapti: ip 185.34.x.x", time: "12 dk once", color: "#4B9EFF" },
  { type: "warning", text: "Basarisiz giris (5x): user_test@...", time: "15 dk once", color: "#FF4757" },
  { type: "support", text: "ahmet_y destek talebi acti #1847", time: "18 dk once", color: "#4B9EFF" },
];

const mockSystemStatus = [
  { name: "API Sunucusu", status: "active", detail: "124ms" },
  { name: "Veritabani", status: "active", detail: "8ms query" },
  { name: "Odeme Sistemi", status: "active", detail: "Stripe" },
  { name: "Email Servisi", status: "slow", detail: "4.2s" },
  { name: "AI Servisi", status: "active", detail: "1.2s avg" },
  { name: "CDN", status: "active", detail: "98ms" },
];

const mockUsers = [
  { id: 1001, name: "Mehmet Kaya", email: "mehmet.kaya@gmail.com", plan: "Premium", status: "active", registered: "12 Nis 2025", lastLogin: "Bugun 14:21", spent: 1788 },
  { id: 1002, name: "Zeynep Aydin", email: "zeynep.a@outlook.com", plan: "Pro", status: "online", registered: "3 Mar 2025", lastLogin: "Su an online", spent: 4197 },
  { id: 1003, name: "Ali Vural", email: "ali.vural@icloud.com", plan: "Free", status: "suspended", registered: "28 Oca 2025", lastLogin: "3 gun once", spent: 149 },
  { id: 1004, name: "Ayse Demir", email: "ayse.d@gmail.com", plan: "Free", status: "inactive", registered: "15 Ara 2024", lastLogin: "89 gun once", spent: 0 },
  { id: 1005, name: "Can Ozturk", email: "can.o@yahoo.com", plan: "Premium", status: "deleted", registered: "8 Tem 2024", lastLogin: "Silindi", spent: 447 },
];

const mockCoupons = [
  { code: "WELCOME20", discount: "%20", used: 847, limit: 1000, expiry: "Suresiz", status: "active" },
  { code: "STUDENT50", discount: "%50", used: 234, limit: 500, expiry: "31 Ara 2026", status: "active" },
  { code: "BLACKFRIDAY", discount: "%40", used: 1250, limit: 1000, expiry: "Sona Erdi", status: "inactive" },
];

const mockTickets = [
  { id: 1847, user: "Mehmet K", plan: "Premium", subject: "BTC fiyati guncellenmiyor", category: "Teknik", priority: "high", status: "open", time: "2 saat once" },
  { id: 1846, user: "Zeynep A", plan: "Free", subject: "Premium'a gecmek istiyorum", category: "Satis", priority: "medium", status: "open", time: "4 saat once" },
  { id: 1845, user: "Ali V", plan: "Pro", subject: "Fatura indirme sorunu", category: "Fatura", priority: "low", status: "pending", time: "1 gun once" },
];

const mockFeatureRequests = [
  { title: "Kripto tax raporu", votes: 342, status: "planned" },
  { title: "Mobil uygulama", votes: 287, status: "inprogress" },
  { title: "Otomatik DCA", votes: 198, status: "review" },
  { title: "Bank baglantisi", votes: 176, status: "backlog" },
];

const adminTabs = [
  { id: "overview", label: "Genel Bakis", icon: Eye },
  { id: "users", label: "Kullanicilar", icon: Users },
  { id: "subscriptions", label: "Uyeler", icon: CreditCard },
  { id: "analytics", label: "Istatistikler", icon: TrendingUp },
  { id: "content", label: "Icerik", icon: FileBarChart },
  { id: "system", label: "Sistem", icon: Database },
  { id: "security", label: "Guvenlik", icon: Lock },
  { id: "settings", label: "Ayarlar", icon: Settings },
  { id: "support", label: "Destek", icon: Sparkles },
];

const tabMap: Record<string, string> = {
  "genel-bakis": "overview",
  "kullanicilar": "users",
  "uyeler": "subscriptions",
  "istatistikler": "analytics",
  "icerik": "content",
  "sistem": "system",
  "guvenlik": "security",
  "ayarlar": "settings",
  "destek": "support",
};

export default function AdminPage() {
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const last = location.split("/").pop() || "";
    return tabMap[last] || "overview";
  });
  const [showWarningBanner, setShowWarningBanner] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const last = location.split("/").pop() || "";
    const mapped = tabMap[last];
    if (mapped) setActiveTab(mapped);
  }, [location]);

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[rgba(255,71,87,0.15)] flex items-center justify-center">
            <Shield className="w-7 h-7 text-[#FF4757]" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#F0F2F7]">Admin Paneli</h1>
              <span className="px-2 py-1 text-xs font-bold bg-[#FF4757] text-white rounded">ADMIN</span>
            </div>
            <p className="text-xs text-[#4E5A6B] mt-1">
              Son giris: Bugun 14:32 - IP: 185.34.12.89 - Chrome / macOS
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 bg-[#00D4AA] rounded-full animate-pulse" />
            <span className="text-[#00D4AA]">Sistem Aktif</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#151A23] rounded-lg border border-[rgba(255,255,255,0.06)]">
            <Clock className="w-4 h-4 text-[#8892A4]" />
            <span className="font-mono text-sm text-[#F0F2F7]">
              {currentTime.toLocaleTimeString('tr-TR')}
            </span>
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#FF4757] text-[#FF4757] hover:bg-[rgba(255,71,87,0.1)] transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Cikis</span>
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      {showWarningBanner && (
        <div className="flex items-center justify-between px-4 py-3 bg-[rgba(255,71,87,0.1)] border border-[rgba(255,71,87,0.2)] rounded-xl">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-[#FF4757]" />
            <span className="text-sm text-[#F0F2F7]">
              Bu sayfa yalnizca yetkili yoneticiler tarafindan goruntulenebilir. Tum islemler kayit altina alinmaktadir.
            </span>
          </div>
          <button onClick={() => setShowWarningBanner(false)} className="text-[#8892A4] hover:text-[#F0F2F7]">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main Content with Sidebar */}
      <div className="flex gap-6">
        {/* Admin Sidebar Tabs */}
        <div className="w-[220px] flex-shrink-0">
          <div className="finos-card p-2">
            <nav className="space-y-1">
              {adminTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative ${
                      isActive
                        ? "bg-[rgba(255,71,87,0.08)] text-[#FF4757]"
                        : "text-[#8892A4] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F0F2F7]"
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#FF4757] rounded-r-full" />
                    )}
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{tab.label}</span>
                    {tab.id === "support" && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-[#FFB833] text-[#080A0F] rounded">
                        12
                      </span>
                    )}
                    {tab.id === "security" && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-[#FF4757] text-white rounded">
                        2
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.06)]">
              <p className="text-[10px] text-[#4E5A6B] text-center">v2.4.1</p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "users" && <UsersTab />}
          {activeTab === "subscriptions" && <SubscriptionsTab />}
          {activeTab === "analytics" && <AnalyticsTab />}
          {activeTab === "content" && <ContentTab />}
          {activeTab === "system" && <SystemTab />}
          {activeTab === "security" && <SecurityTab />}
          {activeTab === "settings" && <AdminSettingsTab />}
          {activeTab === "support" && <SupportTab />}
        </div>
      </div>
    </div>
  );
}

function OverviewTab() {
  const d = mockKpiData;
  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <div className="grid grid-cols-6 gap-4">
        <div className="finos-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-[#4B9EFF]" />
            <span className="text-xs text-[#8892A4]">Toplam Kullanici</span>
          </div>
          <p className="text-2xl font-mono font-semibold text-[#F0F2F7]">{fmtN(d.totalUsers)}</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUp className="w-3 h-3 text-[#00D4AA]" />
            <span className="text-xs text-[#00D4AA]">+{d.newUsersThisMonth} bu ay</span>
          </div>
        </div>
        <div className="finos-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-[#00D4AA]" />
            <span className="text-xs text-[#8892A4]">Aktif Bugun</span>
          </div>
          <p className="text-2xl font-mono font-semibold text-[#F0F2F7]">{fmtN(d.activeToday)}</p>
          <p className="text-xs text-[#8892A4] mt-1">%26.6 gunluk aktiflik</p>
        </div>
        <div className="finos-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-[#FFB833]" />
            <span className="text-xs text-[#8892A4]">MRR</span>
          </div>
          <p className="text-2xl font-mono font-semibold text-[#FFB833]">{fmt(d.mrr)}</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUp className="w-3 h-3 text-[#00D4AA]" />
            <span className="text-xs text-[#00D4AA]">+%{d.mrrGrowth}</span>
          </div>
        </div>
        <div className="finos-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-5 h-5 text-[#A78BFA]" />
            <span className="text-xs text-[#8892A4]">Abonelikler</span>
          </div>
          <p className="text-2xl font-mono font-semibold text-[#F0F2F7]">{fmtN(d.activeSubscriptions)}</p>
          <p className="text-xs text-[#8892A4] mt-1">Free: {fmtN(d.freeUsers)}</p>
        </div>
        <div className="finos-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <UserMinus className="w-5 h-5 text-[#FF4757]" />
            <span className="text-xs text-[#8892A4]">Churn</span>
          </div>
          <p className="text-2xl font-mono font-semibold text-[#F0F2F7]">%{d.churnRate}</p>
          <p className="text-xs text-[#FF4757] mt-1">{d.churnCount} iptal bu ay</p>
        </div>
        <div className="finos-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-[#00D4AA]" />
            <span className="text-xs text-[#8892A4]">ARPU</span>
          </div>
          <p className="text-2xl font-mono font-semibold text-[#F0F2F7]">{fmt(d.arpu)}</p>
          <p className="text-xs text-[#8892A4] mt-1">Kullanici basina gelir</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 space-y-6">
          <div className="finos-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-[#F0F2F7]">Kullanici Buyume Trendi</h3>
              <div className="flex gap-2">
                {["Gunluk", "Haftalik", "Aylik"].map((period, i) => (
                  <button key={period} className={`px-3 py-1 text-xs rounded-lg transition-colors ${i === 2 ? "bg-[rgba(255,71,87,0.1)] text-[#FF4757]" : "text-[#8892A4] hover:bg-[rgba(255,255,255,0.04)]"}`}>
                    {period}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockUserGrowthData}>
                  <defs>
                    <linearGradient id="colorKayit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00D4AA" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" tick={{ fill: '#8892A4', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8892A4', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#151A23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} labelStyle={{ color: '#F0F2F7' }} />
                  <Area type="monotone" dataKey="kayit" stroke="#00D4AA" fillOpacity={1} fill="url(#colorKayit)" strokeWidth={2} />
                  <Line type="monotone" dataKey="ayrilma" stroke="#FF4757" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="finos-card p-4">
            <h3 className="text-sm font-medium text-[#F0F2F7] mb-4">Gelir Dagilimi</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" tick={{ fill: '#8892A4', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8892A4', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#151A23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} formatter={(value: number) => [`${(value / 1000).toFixed(0)}K TL`, '']} />
                  <Bar dataKey="premium" fill="#A78BFA" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pro" fill="#FFB833" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="col-span-2">
          <div className="finos-card p-4 h-full">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 bg-[#FF4757] rounded-full animate-pulse" />
              <h3 className="text-sm font-medium text-[#F0F2F7]">Canli Aktivite</h3>
            </div>
            <div className="space-y-3 max-h-[380px] overflow-y-auto">
              {mockActivityFeed.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.02)]">
                  <div className="w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: item.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#F0F2F7] truncate">{item.text}</p>
                    <p className="text-xs text-[#4E5A6B]">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="flex items-center gap-1 text-xs text-[#FF4757] mt-4 hover:underline">
              Tumunu Gor <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-3 gap-6">
        <div className="finos-card p-4">
          <h3 className="text-sm font-medium text-[#F0F2F7] mb-4">Sistem Durumu</h3>
          <div className="space-y-3">
            {mockSystemStatus.map((service, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${service.status === "active" ? "bg-[#00D4AA]" : "bg-[#FFB833] animate-pulse"}`} />
                  <span className="text-sm text-[#F0F2F7]">{service.name}</span>
                </div>
                <span className="text-xs text-[#8892A4]">{service.detail}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#4E5A6B] mt-4">Son kontrol: 30 sn once</p>
        </div>
        <div className="finos-card p-4">
          <h3 className="text-sm font-medium text-[#F0F2F7] mb-4">Performans</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><span className="text-sm text-[#8892A4]">API Yanit Suresi</span><span className="font-mono text-sm text-[#00D4AA]">124ms</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-[#8892A4]">Sayfa Yukleme</span><span className="font-mono text-sm text-[#00D4AA]">1.8s</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-[#8892A4]">Hata Orani</span><span className="font-mono text-sm text-[#00D4AA]">%0.12</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-[#8892A4]">Uptime</span><span className="font-mono text-sm text-[#00D4AA]">%99.97</span></div>
          </div>
          <p className="text-xs text-[#4E5A6B] mt-4">32 gundur kesintisiz</p>
        </div>
        <div className="finos-card p-4">
          <h3 className="text-sm font-medium text-[#F0F2F7] mb-4">Bugunun Ozeti</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4 text-[#00D4AA]" /><span className="text-[#F0F2F7]">234 yeni kayit</span></div>
            <div className="flex items-center gap-2 text-sm"><CreditCard className="w-4 h-4 text-[#FFB833]" /><span className="text-[#F0F2F7]">18 yeni odeme - 4.218 TL</span></div>
            <div className="flex items-center gap-2 text-sm"><XCircle className="w-4 h-4 text-[#FF4757]" /><span className="text-[#F0F2F7]">3 abonelik iptali</span></div>
            <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-[#4B9EFF]" /><span className="text-[#F0F2F7]">847 email gonderildi</span></div>
            <div className="flex items-center gap-2 text-sm"><AlertTriangle className="w-4 h-4 text-[#FFB833]" /><span className="text-[#F0F2F7]">2 guvenlik uyarisi</span></div>
          </div>
          <button className="w-full mt-4 px-3 py-2 bg-[#FF4757] text-white text-sm rounded-lg hover:bg-[#e63e4d] transition-colors">
            Gunluk Rapor Indir
          </button>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const [searchTerm, setSearchTerm] = useState("");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium text-[#F0F2F7]">Kullanici Yonetimi</h2>
          <span className="px-2 py-1 text-xs bg-[rgba(255,255,255,0.06)] text-[#8892A4] rounded">12,847 toplam</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 text-sm text-[#8892A4] border border-[rgba(255,255,255,0.1)] rounded-lg hover:bg-[rgba(255,255,255,0.04)]">
            <Download className="w-4 h-4 inline mr-1" /> CSV Aktar
          </button>
          <button className="px-3 py-2 text-sm text-[#00D4AA] border border-[#00D4AA] rounded-lg hover:bg-[rgba(0,212,170,0.1)]">
            <Download className="w-4 h-4 inline mr-1" /> Excel
          </button>
          <button className="px-3 py-2 text-sm bg-[#FF4757] text-white rounded-lg hover:bg-[#e63e4d]">
            <Plus className="w-4 h-4 inline mr-1" /> Kullanici Ekle
          </button>
        </div>
      </div>
      <div className="finos-card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8892A4]" />
            <input type="text" placeholder="Ad, email, ID ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder-[#4E5A6B] focus:outline-none focus:border-[#FF4757]" />
          </div>
          <select className="px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7]">
            <option>Tum Planlar</option><option>Free</option><option>Premium</option><option>Pro</option>
          </select>
          <select className="px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7]">
            <option>Tum Durumlar</option><option>Aktif</option><option>Pasif</option><option>Askiya Alinmis</option>
          </select>
          <button className="px-4 py-2 bg-[#FF4757] text-white text-sm rounded-lg">Filtrele</button>
          <button className="px-4 py-2 text-[#8892A4] text-sm hover:text-[#F0F2F7]">Temizle</button>
        </div>
      </div>
      <div className="finos-card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.06)]">
              <th className="p-4 text-left"><input type="checkbox" className="rounded border-[rgba(255,255,255,0.2)]" /></th>
              <th className="p-4 text-left text-xs font-medium text-[#8892A4]">#</th>
              <th className="p-4 text-left text-xs font-medium text-[#8892A4]">Kullanici</th>
              <th className="p-4 text-left text-xs font-medium text-[#8892A4]">Plan</th>
              <th className="p-4 text-left text-xs font-medium text-[#8892A4]">Durum</th>
              <th className="p-4 text-left text-xs font-medium text-[#8892A4]">Kayit</th>
              <th className="p-4 text-left text-xs font-medium text-[#8892A4]">Son Giris</th>
              <th className="p-4 text-left text-xs font-medium text-[#8892A4]">Harcama</th>
              <th className="p-4 text-left text-xs font-medium text-[#8892A4]">Islemler</th>
            </tr>
          </thead>
          <tbody>
            {mockUsers.map((user) => (
              <tr key={user.id} className={`border-b border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,71,87,0.04)] transition-colors ${user.status === "deleted" ? "opacity-50" : ""} ${user.status === "suspended" ? "border-l-2 border-l-[#FFB833]" : ""}`}>
                <td className="p-4"><input type="checkbox" className="rounded border-[rgba(255,255,255,0.2)]" /></td>
                <td className="p-4 text-sm text-[#8892A4]">#{user.id}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4B9EFF] to-[#A78BFA] flex items-center justify-center">
                      <span className="text-xs font-semibold text-white">{user.name.split(" ").map(n => n[0]).join("")}</span>
                    </div>
                    <div>
                      <p className={`text-sm font-medium text-[#F0F2F7] ${user.status === "deleted" ? "line-through" : ""}`}>{user.name}</p>
                      <p className={`text-xs text-[#8892A4] ${user.status === "deleted" ? "line-through" : ""}`}>{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded ${user.plan === "Premium" ? "bg-[rgba(167,139,250,0.2)] text-[#A78BFA]" : user.plan === "Pro" ? "bg-[rgba(255,184,51,0.2)] text-[#FFB833]" : "bg-[rgba(255,255,255,0.06)] text-[#8892A4]"}`}>
                    {user.plan}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${user.status === "active" ? "bg-[#00D4AA]" : user.status === "online" ? "bg-[#00D4AA] animate-pulse" : user.status === "suspended" ? "bg-[#FFB833]" : user.status === "inactive" ? "bg-[#8892A4]" : "bg-[#FF4757]"}`} />
                    <span className={`text-xs ${user.status === "active" || user.status === "online" ? "text-[#00D4AA]" : user.status === "suspended" ? "text-[#FFB833]" : user.status === "inactive" ? "text-[#8892A4]" : "text-[#FF4757]"}`}>
                      {user.status === "active" ? "Aktif" : user.status === "online" ? "Online" : user.status === "suspended" ? "Askida" : user.status === "inactive" ? "Pasif" : "Silindi"}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-sm text-[#8892A4]">{user.registered}</td>
                <td className={`p-4 text-sm ${user.lastLogin.includes("gun once") && parseInt(user.lastLogin) > 30 ? "text-[#FFB833]" : "text-[#8892A4]"}`}>{user.lastLogin}</td>
                <td className="p-4 font-mono text-sm text-[#FFB833]">{fmt(user.spent)}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 hover:bg-[rgba(255,255,255,0.04)] rounded"><Eye className="w-4 h-4 text-[#8892A4]" /></button>
                    <button className="p-1.5 hover:bg-[rgba(255,255,255,0.04)] rounded"><Edit className="w-4 h-4 text-[#8892A4]" /></button>
                    <button className="p-1.5 hover:bg-[rgba(255,255,255,0.04)] rounded"><MoreHorizontal className="w-4 h-4 text-[#8892A4]" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between p-4 border-t border-[rgba(255,255,255,0.06)]">
          <p className="text-sm text-[#8892A4]">1-5 / 12,847 kullanici gosteriliyor</p>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 text-sm text-[#8892A4] hover:text-[#F0F2F7]">{"<"}</button>
            <button className="px-3 py-1 text-sm bg-[#FF4757] text-white rounded">1</button>
            <button className="px-3 py-1 text-sm text-[#8892A4] hover:text-[#F0F2F7]">2</button>
            <button className="px-3 py-1 text-sm text-[#8892A4] hover:text-[#F0F2F7]">3</button>
            <span className="text-[#8892A4]">...</span>
            <button className="px-3 py-1 text-sm text-[#8892A4] hover:text-[#F0F2F7]">514</button>
            <button className="px-3 py-1 text-sm text-[#8892A4] hover:text-[#F0F2F7]">{">"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubscriptionsTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4">
        <div className="finos-card p-4">
          <p className="text-xs text-[#8892A4] mb-1">MRR</p>
          <p className="text-2xl font-mono font-semibold text-[#FFB833]">{fmt(284750)}</p>
        </div>
        <div className="finos-card p-4">
          <p className="text-xs text-[#8892A4] mb-1">ARR</p>
          <p className="text-2xl font-mono font-semibold text-[#F0F2F7]">{fmt(3417000)}</p>
        </div>
        <div className="finos-card p-4">
          <p className="text-xs text-[#8892A4] mb-1">Aktif Abonelik</p>
          <p className="text-2xl font-mono font-semibold text-[#F0F2F7]">1,923</p>
        </div>
        <div className="finos-card p-4">
          <p className="text-xs text-[#8892A4] mb-1">Yeni Bu Ay</p>
          <p className="text-2xl font-mono font-semibold text-[#00D4AA]">+156</p>
        </div>
        <div className="finos-card p-4">
          <p className="text-xs text-[#8892A4] mb-1">Iptal Bu Ay</p>
          <p className="text-2xl font-mono font-semibold text-[#FF4757]">-52</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="finos-card p-6 border-[rgba(255,255,255,0.06)]">
          <p className="text-lg font-semibold text-[#8892A4] mb-2">FREE</p>
          <p className="text-3xl font-mono font-bold text-[#F0F2F7] mb-4">{fmt(0)}<span className="text-sm font-normal">/ay</span></p>
          <p className="text-2xl font-mono text-[#F0F2F7] mb-2">10,924</p>
          <div className="w-full h-2 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden mb-4">
            <div className="h-full bg-[#8892A4] rounded-full" style={{ width: "85%" }} />
          </div>
          <p className="text-xs text-[#8892A4] mb-4">%85 toplam kullanici</p>
          <button className="w-full px-4 py-2 border border-[rgba(255,255,255,0.1)] text-[#8892A4] text-sm rounded-lg hover:bg-[rgba(255,255,255,0.04)]">Plani Duzenle</button>
        </div>
        <div className="finos-card p-6 border-[#A78BFA] border-2 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#A78BFA] text-white text-xs font-bold rounded">EN POPULER</div>
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-[#A78BFA]" />
            <p className="text-lg font-semibold text-[#A78BFA]">PREMIUM</p>
          </div>
          <p className="text-3xl font-mono font-bold text-[#F0F2F7] mb-4">{fmt(149)}<span className="text-sm font-normal">/ay</span></p>
          <p className="text-2xl font-mono text-[#F0F2F7] mb-2">1,456</p>
          <p className="text-xs text-[#8892A4] mb-4">Aylik gelir: {fmt(216944)}</p>
          <button className="w-full px-4 py-2 bg-[#A78BFA] text-white text-sm rounded-lg hover:bg-[#9171e8]">Plani Duzenle</button>
        </div>
        <div className="finos-card p-6 border-[#FFB833] border">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-[#FFB833]" />
            <p className="text-lg font-semibold text-[#FFB833]">PRO</p>
          </div>
          <p className="text-3xl font-mono font-bold text-[#F0F2F7] mb-4">{fmt(299)}<span className="text-sm font-normal">/ay</span></p>
          <p className="text-2xl font-mono text-[#F0F2F7] mb-2">467</p>
          <p className="text-xs text-[#8892A4] mb-4">Aylik gelir: {fmt(139633)}</p>
          <button className="w-full px-4 py-2 bg-[#FFB833] text-[#080A0F] text-sm font-semibold rounded-lg hover:bg-[#e6a52e]">Plani Duzenle</button>
        </div>
      </div>
      <div className="finos-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-[#F0F2F7]">Kupon Kodlari</h3>
          <button className="px-3 py-1.5 text-sm bg-[#FF4757] text-white rounded-lg">
            <Plus className="w-4 h-4 inline mr-1" /> Yeni Kupon
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.06)]">
              <th className="p-3 text-left text-xs font-medium text-[#8892A4]">Kod</th>
              <th className="p-3 text-left text-xs font-medium text-[#8892A4]">Indirim</th>
              <th className="p-3 text-left text-xs font-medium text-[#8892A4]">Kullanim</th>
              <th className="p-3 text-left text-xs font-medium text-[#8892A4]">Gecerlilik</th>
              <th className="p-3 text-left text-xs font-medium text-[#8892A4]">Durum</th>
              <th className="p-3 text-left text-xs font-medium text-[#8892A4]">Islem</th>
            </tr>
          </thead>
          <tbody>
            {mockCoupons.map((coupon, i) => (
              <tr key={i} className="border-b border-[rgba(255,255,255,0.06)]">
                <td className="p-3 font-mono text-sm text-[#F0F2F7]">{coupon.code}</td>
                <td className="p-3 text-sm text-[#00D4AA]">{coupon.discount}</td>
                <td className="p-3 text-sm text-[#8892A4]">{coupon.used}/{coupon.limit}{coupon.used > coupon.limit && <AlertTriangle className="w-4 h-4 text-[#FFB833] inline ml-1" />}</td>
                <td className="p-3 text-sm text-[#8892A4]">{coupon.expiry}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 text-xs rounded ${coupon.status === "active" ? "bg-[rgba(0,212,170,0.2)] text-[#00D4AA]" : "bg-[rgba(255,71,87,0.2)] text-[#FF4757]"}`}>{coupon.status === "active" ? "Aktif" : "Pasif"}</span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <button className="p-1 hover:bg-[rgba(255,255,255,0.04)] rounded"><Edit className="w-4 h-4 text-[#8892A4]" /></button>
                    <button className="p-1 hover:bg-[rgba(255,255,255,0.04)] rounded"><Trash2 className="w-4 h-4 text-[#FF4757]" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MRR Growth Chart */}
      <div className="finos-card p-4">
        <h3 className="text-sm font-medium text-[#F0F2F7] mb-4">MRR Gelisimi (Son 12 Ay)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={[
            { ay: "Haz", free: 0, premium: 145000, pro: 65000 },
            { ay: "Tem", free: 0, premium: 156000, pro: 72000 },
            { ay: "Agu", free: 0, premium: 168000, pro: 78000 },
            { ay: "Eyl", free: 0, premium: 175000, pro: 82000 },
            { ay: "Eki", free: 0, premium: 182000, pro: 88000 },
            { ay: "Kas", free: 0, premium: 190000, pro: 95000 },
            { ay: "Ara", free: 0, premium: 198000, pro: 105000 },
            { ay: "Oca", free: 0, premium: 204000, pro: 115000 },
            { ay: "Sub", free: 0, premium: 208000, pro: 125000 },
            { ay: "Mar", free: 0, premium: 212000, pro: 132000 },
            { ay: "Nis", free: 0, premium: 216000, pro: 136000 },
            { ay: "May", free: 0, premium: 216944, pro: 139633 },
          ]}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="ay" stroke="#4E5A6B" fontSize={12} />
            <YAxis stroke="#4E5A6B" fontSize={12} tickFormatter={(v: number) => `${(v/1000)}K`} />
            <Tooltip contentStyle={{ backgroundColor: '#151A23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} itemStyle={{ color: '#F0F2F7' }} />
            <Area type="monotone" dataKey="premium" stackId="1" stroke="#A78BFA" fill="rgba(167,139,250,0.3)" name="Premium" />
            <Area type="monotone" dataKey="pro" stackId="1" stroke="#FFB833" fill="rgba(255,184,51,0.3)" name="Pro" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Cohort Analysis */}
        <div className="finos-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[#F0F2F7]">Kohort Analizi</h3>
            <button className="text-xs text-[#FF4757] hover:underline">Kohort Raporu Indir</button>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                <th className="p-2 text-left text-[#8892A4]">Kayit Aki</th>
                <th className="p-2 text-center text-[#8892A4]">M0</th>
                <th className="p-2 text-center text-[#8892A4]">M1</th>
                <th className="p-2 text-center text-[#8892A4]">M2</th>
                <th className="p-2 text-center text-[#8892A4]">M3</th>
                <th className="p-2 text-center text-[#8892A4]">M6</th>
                <th className="p-2 text-center text-[#8892A4]">M12</th>
              </tr>
            </thead>
            <tbody>
              {[
                { ay: "Ocak 2026", m0: "100%", m1: "78%", m2: "65%", m3: "58%", m6: "48%", m12: "42%" },
                { ay: "Subat 2026", m0: "100%", m1: "82%", m2: "71%", m3: "64%", m6: "52%", m12: "—" },
                { ay: "Mart 2026", m0: "100%", m1: "85%", m2: "74%", m3: "68%", m6: "—", m12: "—" },
                { ay: "Nisan 2026", m0: "100%", m1: "80%", m2: "69%", m3: "—", m6: "—", m12: "—" },
                { ay: "Mayis 2026", m0: "100%", m1: "76%", m2: "—", m3: "—", m6: "—", m12: "—" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-[rgba(255,255,255,0.04)]">
                  <td className="p-2 text-[#8892A4]">{row.ay}</td>
                  {["m0","m1","m2","m3","m6","m12"].map((k) => (
                    <td key={k} className={`p-2 text-center font-mono ${
                      row[k as keyof typeof row] === "—" ? "text-[#4E5A6B]" :
                      parseInt(row[k as keyof typeof row] as string) >= 80 ? "text-[#00D4AA]" :
                      parseInt(row[k as keyof typeof row] as string) >= 60 ? "text-[#A78BFA]" :
                      parseInt(row[k as keyof typeof row] as string) >= 40 ? "text-[#FFB833]" : "text-[#FF4757]"
                    }`}>{row[k as keyof typeof row]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Churn Analysis */}
        <div className="finos-card p-4">
          <h3 className="text-sm font-medium text-[#F0F2F7] mb-4">Iptal Nedenleri</h3>
          <div className="flex items-center justify-center mb-4">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={[
                  { name: "Cok pahali", value: 34, color: "#FF4757" },
                  { name: "Ozellik kullanmadim", value: 28, color: "#FFB833" },
                  { name: "Baska uygulama", value: 19, color: "#A78BFA" },
                  { name: "Teknik sorun", value: 12, color: "#4B9EFF" },
                  { name: "Diger", value: 7, color: "#8892A4" },
                ]} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name">
                  {[
                    { name: "Cok pahali", value: 34, color: "#FF4757" },
                    { name: "Ozellik kullanmadim", value: 28, color: "#FFB833" },
                    { name: "Baska uygulama", value: 19, color: "#A78BFA" },
                    { name: "Teknik sorun", value: 12, color: "#4B9EFF" },
                    { name: "Diger", value: 7, color: "#8892A4" },
                  ].map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#151A23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {[
              { label: "Cok pahali", pct: 34, color: "#FF4757" },
              { label: "Ozellik kullanmadim", pct: 28, color: "#FFB833" },
              { label: "Baska uygulama", pct: 19, color: "#A78BFA" },
              { label: "Teknik sorun", pct: 12, color: "#4B9EFF" },
              { label: "Diger", pct: 7, color: "#8892A4" },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="text-xs text-[#8892A4] flex-1">{r.label}</span>
                <span className="text-xs font-mono text-[#F0F2F7]">%{r.pct}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 p-2 bg-[rgba(255,184,51,0.08)] border border-[rgba(255,184,51,0.2)] rounded-lg">
            <p className="text-xs text-[#FFB833]"><AlertTriangle className="w-3 h-3 inline mr-1" />Churn Riski Yuksek: <span className="font-mono font-semibold">234</span> kullanici</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const funnelData = [
    { name: "Ziyaretci", value: 50000, rate: "100%" },
    { name: "Kayit Sayfasi", value: 8400, rate: "16.8%" },
    { name: "Kayit Tamamlandi", value: 4200, rate: "50%" },
    { name: "Ilk Varlik Ekledi", value: 2800, rate: "67%" },
    { name: "Premium Gecis", value: 420, rate: "15%" },
  ];
  return (
    <div className="space-y-6">
      <div className="finos-card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {["Bugun", "Bu Hafta", "Bu Ay", "Son 3 Ay", "Bu Yil", "Tumu"].map((period, i) => (
            <button key={period} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${i === 2 ? "bg-[#FF4757] text-white" : "text-[#8892A4] hover:bg-[rgba(255,255,255,0.04)]"}`}>{period}</button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button className="px-4 py-2 bg-[#FF4757] text-white text-sm rounded-lg">Rapor Olustur</button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="finos-card p-4">
          <p className="text-xs text-[#8892A4] mb-2">Toplam Sayfa Goruntuleme</p>
          <p className="text-3xl font-mono font-semibold text-[#F0F2F7]">2,847,291</p>
          <p className="text-xs text-[#00D4AA] mt-1">+%23 gecen aya gore</p>
        </div>
        <div className="finos-card p-4">
          <p className="text-xs text-[#8892A4] mb-2">Ort. Oturum Suresi</p>
          <p className="text-3xl font-mono font-semibold text-[#F0F2F7]">18dk 42sn</p>
          <p className="text-xs text-[#00D4AA] mt-1">+2dk gecen aya gore</p>
        </div>
        <div className="finos-card p-4">
          <p className="text-xs text-[#8892A4] mb-2">Kullanici Tutma</p>
          <div className="flex items-center gap-4 mt-2">
            <div><span className="text-lg font-mono text-[#00D4AA]">D1: %68</span></div>
            <div><span className="text-lg font-mono text-[#FFB833]">D7: %42</span></div>
            <div><span className="text-lg font-mono text-[#FF4757]">D30: %28</span></div>
          </div>
        </div>
      </div>
      <div className="finos-card p-4">
        <h3 className="text-sm font-medium text-[#F0F2F7] mb-4">Kayit Donusum Hunisi</h3>
        <div className="space-y-3">
          {funnelData.map((step, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-32 text-sm text-[#8892A4]">{step.name}</div>
              <div className="flex-1 h-8 bg-[rgba(255,255,255,0.06)] rounded-lg overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#FF4757] to-[#00D4AA] rounded-lg flex items-center justify-end pr-3" style={{ width: `${(step.value / 50000) * 100}%` }}>
                  <span className="text-xs font-mono text-white">{step.value.toLocaleString()}</span>
                </div>
              </div>
              <div className="w-16 text-sm text-[#8892A4] text-right">{step.rate}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="finos-card p-4">
        <h3 className="text-sm font-medium text-[#F0F2F7] mb-4">Kullanici Dagilimi - Turkiye</h3>
        <div className="space-y-3">
          {[
            { city: "Istanbul", count: 5847, percent: 45.5 },
            { city: "Ankara", count: 2341, percent: 18.2 },
            { city: "Izmir", count: 1567, percent: 12.2 },
            { city: "Bursa", count: 678, percent: 5.3 },
            { city: "Diger", count: 2414, percent: 18.8 },
          ].map((city, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-20 text-sm text-[#F0F2F7]">{city.city}</div>
              <div className="flex-1 h-4 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                <div className="h-full bg-[#FF4757] rounded-full" style={{ width: `${city.percent}%` }} />
              </div>
              <div className="w-24 text-sm text-[#8892A4] text-right">{city.count.toLocaleString()} (%{city.percent})</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContentTab() {
  return (
    <div className="space-y-6">
      <div className="finos-card p-2">
        <div className="flex gap-2">
          {["Bildirimler", "Email Kampanyalari", "Push Bildirimleri", "Segmentasyon"].map((tab, i) => (
            <button key={tab} className={`px-4 py-2 text-sm rounded-lg transition-colors ${i === 0 ? "bg-[#FF4757] text-white" : "text-[#8892A4] hover:bg-[rgba(255,255,255,0.04)]"}`}>{tab}</button>
          ))}
        </div>
      </div>
      <div className="finos-card p-4">
        <h3 className="text-sm font-medium text-[#F0F2F7] mb-4">Yeni Bildirim Gonder</h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <select className="flex-1 px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7]">
              <option>Tumu (12,847)</option><option>Premium kullanicilar</option><option>Pro kullanicilar</option><option>Free kullanicilar</option>
            </select>
            <div className="flex gap-2">
              {["In-app", "Email", "Push", "SMS"].map((channel, i) => (
                <label key={channel} className="flex items-center gap-2 px-3 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg cursor-pointer">
                  <input type="checkbox" defaultChecked={i < 2} className="rounded" />
                  <span className="text-sm text-[#F0F2F7]">{channel}</span>
                </label>
              ))}
            </div>
          </div>
          <input type="text" placeholder="Baslik (max 80 karakter)" className="w-full px-4 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder-[#4E5A6B]" />
          <textarea placeholder="Mesajinizi yazin..." rows={4} className="w-full px-4 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] placeholder-[#4E5A6B] resize-none" />
          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 text-sm text-[#8892A4] border border-[rgba(255,255,255,0.1)] rounded-lg">Taslak Kaydet</button>
            <button className="px-4 py-2 text-sm bg-[#FF4757] text-white rounded-lg">Gonder</button>
          </div>
        </div>
      </div>
      <div className="finos-card p-4">
        <h3 className="text-sm font-medium text-[#F0F2F7] mb-4">Gonderilen Bildirimler</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.06)]">
              <th className="p-3 text-left text-xs font-medium text-[#8892A4]">Baslik</th>
              <th className="p-3 text-left text-xs font-medium text-[#8892A4]">Hedef</th>
              <th className="p-3 text-left text-xs font-medium text-[#8892A4]">Gonderildi</th>
              <th className="p-3 text-left text-xs font-medium text-[#8892A4]">Acilma</th>
              <th className="p-3 text-left text-xs font-medium text-[#8892A4]">Tiklama</th>
              <th className="p-3 text-left text-xs font-medium text-[#8892A4]">Durum</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[rgba(255,255,255,0.06)]">
              <td className="p-3 text-sm text-[#F0F2F7]">Aylik portfoy ozeti</td>
              <td className="p-3 text-sm text-[#8892A4]">Tum kullanicilar</td>
              <td className="p-3 text-sm text-[#8892A4]">12,847</td>
              <td className="p-3 text-sm text-[#00D4AA]">%68</td>
              <td className="p-3 text-sm text-[#00D4AA]">%12</td>
              <td className="p-3"><span className="px-2 py-1 text-xs bg-[rgba(0,212,170,0.2)] text-[#00D4AA] rounded">Tamamlandi</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SystemTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        {mockSystemStatus.map((service, i) => (
          <div key={i} className="finos-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${service.status === "active" ? "bg-[#00D4AA]" : "bg-[#FFB833] animate-pulse"}`} />
                <span className="text-sm font-medium text-[#F0F2F7]">{service.name}</span>
              </div>
              <span className="text-xs text-[#8892A4]">{service.detail}</span>
            </div>
            <div className="h-2 bg-[#151A23] rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${service.status === "active" ? "bg-[#00D4AA]" : "bg-[#FFB833]"}`} style={{ width: `${Math.random() * 30 + 70}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="finos-card p-4">
        <h3 className="text-sm font-medium text-[#F0F2F7] mb-4">Sunucu Kaynaklari</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "CPU", value: "42%", color: "#4B9EFF" },
            { label: "RAM", value: "68%", color: "#A78BFA" },
            { label: "Disk", value: "34%", color: "#00D4AA" },
            { label: "Network", value: "12%", color: "#FFB833" },
          ].map((r) => (
            <div key={r.label} className="text-center">
              <p className="text-xs text-[#8892A4] mb-2">{r.label}</p>
              <p className="text-2xl font-mono font-semibold" style={{ color: r.color }}>{r.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="finos-card p-4">
          <h3 className="text-sm font-medium text-[#F0F2F7] mb-4">Son Girisler</h3>
          <div className="space-y-3">
            {[
              { user: "admin", ip: "185.34.12.89", time: "Bugun 14:32", status: "success" },
              { user: "admin", ip: "185.34.12.89", time: "Bugun 09:15", status: "success" },
              { user: "mehmet_k", ip: "88.23.45.12", time: "Dun 18:42", status: "success" },
              { user: "bilinmeyen", ip: "45.12.34.56", time: "Dun 03:12", status: "failed" },
            ].map((log, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-[#151A23] rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${log.status === "success" ? "bg-[#00D4AA]" : "bg-[#FF4757]"}`} />
                  <span className="text-sm text-[#F0F2F7]">{log.user}</span>
                  <span className="text-xs text-[#8892A4]">{log.ip}</span>
                </div>
                <span className="text-xs text-[#4E5A6B]">{log.time}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="finos-card p-4">
          <h3 className="text-sm font-medium text-[#F0F2F7] mb-4">Guvenlik Uyarıları</h3>
          <div className="space-y-3">
            {[
              { type: "critical", text: "5x basarisiz giris: user_test@...", time: "15 dk once" },
              { type: "warning", text: "Yeni cihaz girisi: zeynep_a", time: "1 saat once" },
            ].map((alert, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${alert.type === "critical" ? "bg-[rgba(255,71,87,0.1)] border border-[rgba(255,71,87,0.2)]" : "bg-[rgba(255,184,51,0.1)] border border-[rgba(255,184,51,0.2)]"}`}>
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${alert.type === "critical" ? "text-[#FF4757]" : "text-[#FFB833]"}`} />
                <div className="flex-1">
                  <p className="text-sm text-[#F0F2F7]">{alert.text}</p>
                  <p className="text-xs text-[#4E5A6B]">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminSettingsTab() {
  return (
    <div className="space-y-6">
      <div className="finos-card p-4">
        <h3 className="text-sm font-medium text-[#F0F2F7] mb-4">Genel Ayarlar</h3>
        <div className="space-y-4">
          {[
            { label: "Kayit Acik", desc: "Yeni kullanici kayitlarina izin ver", enabled: true },
            { label: "Bakim Modu", desc: "Sistem bakim moduna al", enabled: false },
            { label: "Email Dogrulama", desc: "Kayit sirasinda email dogrulama zorunlu", enabled: true },
          ].map((s) => (
            <div key={s.label} className="flex items-center justify-between p-4 bg-[#151A23] rounded-xl">
              <div>
                <p className="text-sm font-medium text-[#F0F2F7]">{s.label}</p>
                <p className="text-xs text-[#4E5A6B]">{s.desc}</p>
              </div>
              <button className={`w-12 h-6 rounded-full relative ${s.enabled ? "bg-[#00D4AA]" : "bg-[#4E5A6B]"}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${s.enabled ? "left-7" : "left-1"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SupportTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="finos-card p-4">
          <h3 className="text-sm font-medium text-[#F0F2F7] mb-4">Destek Talepleri</h3>
          <div className="space-y-3">
            {mockTickets.map((ticket) => (
              <div key={ticket.id} className="flex items-start gap-3 p-3 bg-[#151A23] rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${ticket.priority === "high" ? "bg-[#FF4757]" : ticket.priority === "medium" ? "bg-[#FFB833]" : "bg-[#00D4AA]"}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#F0F2F7]">#{ticket.id}</span>
                    <span className="text-xs text-[#8892A4]">{ticket.user} · {ticket.plan}</span>
                  </div>
                  <p className="text-sm text-[#F0F2F7] mt-0.5">{ticket.subject}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 bg-[rgba(255,255,255,0.06)] text-[#8892A4] rounded">{ticket.category}</span>
                    <span className="text-[10px] text-[#4E5A6B]">{ticket.time}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-[10px] rounded ${ticket.status === "open" ? "bg-[rgba(255,71,87,0.2)] text-[#FF4757]" : "bg-[rgba(255,184,51,0.2)] text-[#FFB833]"}`}>
                  {ticket.status === "open" ? "Acik" : "Beklemede"}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="finos-card p-4">
          <h3 className="text-sm font-medium text-[#F0F2F7] mb-4">Ozellik Talepleri</h3>
          <div className="space-y-3">
            {mockFeatureRequests.map((req, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-[#151A23] rounded-lg">
                <div>
                  <p className="text-sm text-[#F0F2F7]">{req.title}</p>
                  <p className="text-xs text-[#8892A4]">{req.votes} oy</p>
                </div>
                <span className={`px-2 py-0.5 text-[10px] rounded ${req.status === "inprogress" ? "bg-[rgba(0,212,170,0.2)] text-[#00D4AA]" : req.status === "planned" ? "bg-[rgba(167,139,250,0.2)] text-[#A78BFA]" : "bg-[rgba(255,255,255,0.06)] text-[#8892A4]"}`}>
                  {req.status === "inprogress" ? "Devam Ediyor" : req.status === "planned" ? "Planlandi" : req.status === "review" ? "Incelemede" : "Beklemede"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
