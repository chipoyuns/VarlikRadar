import { useState } from "react";
import {
  Settings as SettingsIcon, User, Bell, Shield, Palette, Globe, CreditCard, Link2,
  ChevronRight, Check, Moon, Sun, Monitor, Smartphone, Mail, Upload, Download,
  TrendingUp, Trash2, AlertTriangle, Plus, X, Star, Crown, Zap,
} from "lucide-react";
import { useDisplayCurrency } from "@/lib/currency-context";
import { exportBackupJSON, importBackupJSON } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useRef } from "react";

const settingsSections = [
  { id: "profile", name: "Profil", icon: User },
  { id: "notifications", name: "Bildirimler", icon: Bell },
  { id: "price_alerts", name: "Fiyat Alarmları", icon: AlertTriangle },
  { id: "dca_plans", name: "DCA Planları", icon: TrendingUp },
  { id: "security", name: "Güvenlik", icon: Shield },
  { id: "privacy", name: "Gizlilik", icon: Trash2 },
  { id: "appearance", name: "Görünüm", icon: Palette },
  { id: "language", name: "Dil ve Bölge", icon: Globe },
  { id: "billing", name: "Abonelik", icon: CreditCard },
  { id: "connections", name: "Bağlantılar", icon: Link2 },
];

const priceAlertsMock = [
  { id: 1, asset: "THYAO.IS", condition: ">", target: "285,00", current: "248,50", active: true },
  { id: 2, asset: "BTC/USDT", condition: "<", target: "850.000", current: "967.340", active: true },
  { id: 3, asset: "GARAN.IS", condition: ">", target: "95,00", current: "87,20", active: false },
];

const dcaPlansMock = [
  { id: 1, asset: "BTC", amount: "₺5.000", frequency: "Haftalık", nextDate: "28 Mayıs 2026", totalInvested: "₺125.000", status: "Aktif" },
  { id: 2, asset: "THYAO.IS", amount: "₺2.500", frequency: "Aylık", nextDate: "1 Haziran 2026", totalInvested: "₺30.000", status: "Aktif" },
];

const privacySettings = [
  { id: "hide_amounts", name: "Tutarları Gizle", description: "Ekran paylaşımında miktarları maskele", enabled: false },
  { id: "blur_preview", name: "Önizleme Bulanıklığı", description: "Uygulama arka plandayken ekranı karart", enabled: true },
  { id: "biometric_lock", name: "Biyometrik Kilit", description: "Hesap kilidi için parmak izi / yüz tanıma", enabled: true },
];

const notificationSettings = [
  { id: "price_alerts", name: "Fiyat Uyarıları", description: "Belirlediğiniz fiyat seviyelerine ulaşıldığında", enabled: true },
  { id: "budget_alerts", name: "Bütçe Uyarıları", description: "Bütçe limitine yaklaştığınızda", enabled: true },
  { id: "goal_updates", name: "Hedef Güncellemeleri", description: "Hedeflerinizde ilerleme kaydedildiğinde", enabled: false },
  { id: "ai_insights", name: "AI Önerileri", description: "Yeni AI önerileri geldiğinde", enabled: true },
  { id: "market_news", name: "Piyasa Haberleri", description: "Önemli piyasa gelişmeleri", enabled: false },
  { id: "weekly_report", name: "Haftalık Rapor", description: "Her hafta performans özeti", enabled: true },
];

const connectedAccounts = [
  { id: "bank1", name: "Garanti Bankası", type: "Banka", connected: true, lastSync: "2 saat önce" },
  { id: "bank2", name: "Akbank", type: "Banka", connected: true, lastSync: "1 saat önce" },
  { id: "broker1", name: "İş Yatırım", type: "Aracı Kurum", connected: true, lastSync: "30 dk önce" },
  { id: "crypto1", name: "Binance", type: "Kripto Borsa", connected: false, lastSync: null },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState(() => {
    const path = window.location.pathname;
    const map: Record<string, string> = {
      "/settings/gorunum": "appearance",
      "/settings/bildirimler": "notifications",
      "/settings/fiyat-alarmlari": "price_alerts",
      "/settings/dca-planlari": "dca_plans",
      "/settings/guvenlik": "security",
      "/settings/gizlilik": "privacy",
      "/settings/bolgesel": "language",
      "/settings/abonelik": "billing",
      "/settings/premium": "billing",
      "/settings/yedekleme": "connections",
    };
    return map[path] || "profile";
  });
  const [notifications, setNotifications] = useState(notificationSettings);
  const [theme, setTheme] = useState("dark");
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const [language, setLanguage] = useState("tr");
  const [backupLoading, setBackupLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [alerts, setAlerts] = useState(priceAlertsMock);
  const [dcaPlans, setDcaPlans] = useState(dcaPlansMock);
  const [privacy, setPrivacy] = useState(privacySettings);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleNotification = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, enabled: !n.enabled } : n));
  };

  const handleExportJSON = async () => {
    setBackupLoading(true);
    try {
      await exportBackupJSON();
      toast({ title: "Yedek Alındı", description: "JSON yedek dosyası bilgisayarınıza indirildi." });
    } catch {
      toast({ title: "Hata", description: "Yedek alınırken bir hata oluştu", variant: "destructive" });
    } finally { setBackupLoading(false); }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      const result = await importBackupJSON(file);
      if (result.success) { queryClient.invalidateQueries(); toast({ title: "İçe Aktarma Tamamlandı", description: result.message }); }
      else toast({ title: "Hata", description: result.message, variant: "destructive" });
    } finally { setImportLoading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#F0F2F7]">Ayarlar</h1>
        <p className="text-sm text-[#8892A4]">Hesap ve uygulama ayarlarınızı yönetin</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="finos-card p-3 h-fit">
          <nav className="space-y-1">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button key={section.id} onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive ? 'bg-[rgba(0,212,170,0.08)] text-[#00D4AA]' : 'text-[#8892A4] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F0F2F7]'
                  }`}>
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{section.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="col-span-3 space-y-6">
          {/* Profile Section */}
          {activeSection === "profile" && (
            <div className="finos-card p-6">
              <h2 className="text-lg font-semibold text-[#F0F2F7] mb-6">Profil Bilgileri</h2>
              <div className="flex items-start gap-6 mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4B9EFF] to-[#A78BFA] flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">AY</span>
                  </div>
                  <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#00D4AA] rounded-full flex items-center justify-center text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors">
                    <Palette className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#F0F2F7]">Ahmet Yılmaz</h3>
                  <p className="text-sm text-[#8892A4]">ahmet.yilmaz@email.com</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 text-xs font-bold bg-[#FFB833] text-[#080A0F] rounded glow-gold">PRO</span>
                    <span className="text-xs text-[#4E5A6B]">Aralık 2025'e kadar</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#4E5A6B] mb-2">Ad Soyad</label>
                  <input type="text" defaultValue="Ahmet Yılmaz" className="w-full px-4 py-2.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-[#4E5A6B] mb-2">E-posta</label>
                  <input type="email" defaultValue="ahmet.yilmaz@email.com" className="w-full px-4 py-2.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-[#4E5A6B] mb-2">Telefon</label>
                  <input type="tel" defaultValue="+90 532 XXX XX XX" className="w-full px-4 py-2.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-[#4E5A6B] mb-2">Doğum Tarihi</label>
                  <input type="date" defaultValue="1990-05-15" className="w-full px-4 py-2.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA] transition-colors" />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button className="px-6 py-2 bg-[#00D4AA] rounded-lg text-sm font-medium text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors">Kaydet</button>
              </div>
            </div>
          )}

          {/* Price Alerts Section */}
          {activeSection === "price_alerts" && (
            <div className="finos-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[#F0F2F7]">Fiyat Alarmları</h2>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#00D4AA] text-[#080A0F] text-sm font-medium rounded-lg hover:bg-[#00D4AA]/90 transition-colors">
                  <Plus className="w-4 h-4" /> Yeni Alarm
                </button>
              </div>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 bg-[#151A23] rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[rgba(0,212,170,0.1)] flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-[#00D4AA]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#F0F2F7]">{alert.asset}</span>
                          <span className="text-xs text-[#8892A4]">{alert.condition} {alert.target}</span>
                        </div>
                        <p className="text-xs text-[#4E5A6B] mt-0.5">Şu an: <span className="font-mono text-[#8892A4]">{alert.current}</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 text-xs rounded ${alert.active ? 'bg-[rgba(0,212,170,0.15)] text-[#00D4AA]' : 'bg-[rgba(255,255,255,0.06)] text-[#4E5A6B]'}`}>
                        {alert.active ? 'Aktif' : 'Pasif'}
                      </span>
                      <button className="text-[#FF4757] hover:bg-[rgba(255,71,87,0.1)] p-1.5 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 border border-dashed border-[rgba(255,255,255,0.1)] rounded-xl text-center">
                <p className="text-sm text-[#8892A4]">Bir varlığın hedef fiyatına ulaştığında bildirim alın</p>
              </div>
            </div>
          )}

          {/* DCA Plans Section */}
          {activeSection === "dca_plans" && (
            <div className="finos-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[#F0F2F7]">Otomatik Yatırım Planları (DCA)</h2>
                <button className="flex items-center gap-2 px-4 py-2 bg-[#00D4AA] text-[#080A0F] text-sm font-medium rounded-lg hover:bg-[#00D4AA]/90 transition-colors">
                  <Plus className="w-4 h-4" /> Yeni Plan
                </button>
              </div>
              <div className="space-y-3">
                {dcaPlans.map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between p-4 bg-[#151A23] rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[rgba(0,212,170,0.1)] flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-[#00D4AA]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#F0F2F7]">{plan.asset}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-[#8892A4]"><span className="font-mono text-[#00D4AA]">{plan.amount}</span> / {plan.frequency}</span>
                          <span className="text-xs text-[#4E5A6B]">Sonraki: {plan.nextDate}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono font-semibold text-[#FFB833]">{plan.totalInvested}</p>
                      <span className="text-xs text-[#00D4AA]">{plan.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Privacy Section */}
          {activeSection === "privacy" && (
            <div className="finos-card p-6">
              <h2 className="text-lg font-semibold text-[#F0F2F7] mb-6">Gizlilik</h2>
              <div className="space-y-4">
                {privacy.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-[#151A23] rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-[#F0F2F7]">{item.name}</p>
                      <p className="text-xs text-[#4E5A6B]">{item.description}</p>
                    </div>
                    <button onClick={() => setPrivacy(privacy.map(p => p.id === item.id ? { ...p, enabled: !p.enabled } : p))}
                      className={`w-12 h-6 rounded-full relative transition-colors ${item.enabled ? 'bg-[#00D4AA]' : 'bg-[#4E5A6B]'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.enabled ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)]">
                <h3 className="text-sm font-medium text-[#FF4757] mb-3">Tehlikeli Bölge</h3>
                <div className="p-4 bg-[rgba(255,71,87,0.08)] border border-[rgba(255,71,87,0.2)] rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#FF4757]">Hesabı Kalıcı Olarak Sil</p>
                      <p className="text-xs text-[#8892A4]">Tüm verileriniz silinecek. Bu işlem geri alınamaz.</p>
                    </div>
                    <button className="px-4 py-2 bg-[#FF4757] text-white text-sm rounded-lg hover:bg-[#e63e4d] transition-colors">
                      Hesabı Sil
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === "notifications" && (
            <div className="finos-card p-6">
              <h2 className="text-lg font-semibold text-[#F0F2F7] mb-6">Bildirim Tercihleri</h2>
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div key={notification.id} className="flex items-center justify-between p-4 bg-[#151A23] rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-[#F0F2F7]">{notification.name}</p>
                      <p className="text-xs text-[#4E5A6B]">{notification.description}</p>
                    </div>
                    <button onClick={() => toggleNotification(notification.id)} className={`w-12 h-6 rounded-full transition-colors relative ${notification.enabled ? 'bg-[#00D4AA]' : 'bg-[#4E5A6B]'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${notification.enabled ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-[#151A23] rounded-xl">
                <h3 className="text-sm font-medium text-[#F0F2F7] mb-3">Bildirim Kanalları</h3>
                <div className="grid grid-cols-3 gap-3">
                  <button className="flex items-center gap-2 p-3 border border-[#00D4AA] bg-[rgba(0,212,170,0.08)] rounded-lg">
                    <Mail className="w-4 h-4 text-[#00D4AA]" /><span className="text-sm text-[#00D4AA]">E-posta</span><Check className="w-4 h-4 text-[#00D4AA] ml-auto" />
                  </button>
                  <button className="flex items-center gap-2 p-3 border border-[#00D4AA] bg-[rgba(0,212,170,0.08)] rounded-lg">
                    <Smartphone className="w-4 h-4 text-[#00D4AA]" /><span className="text-sm text-[#00D4AA]">Push</span><Check className="w-4 h-4 text-[#00D4AA] ml-auto" />
                  </button>
                  <button className="flex items-center gap-2 p-3 border border-[rgba(255,255,255,0.06)] rounded-lg hover:border-[rgba(255,255,255,0.1)] transition-colors">
                    <Bell className="w-4 h-4 text-[#8892A4]" /><span className="text-sm text-[#8892A4]">SMS</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === "appearance" && (
            <div className="finos-card p-6">
              <h2 className="text-lg font-semibold text-[#F0F2F7] mb-6">Görünüm</h2>
              <div className="mb-6">
                <h3 className="text-sm font-medium text-[#8892A4] mb-3">Tema</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "dark", name: "Koyu", icon: Moon },
                    { id: "light", name: "Açık", icon: Sun },
                    { id: "system", name: "Sistem", icon: Monitor },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = theme === t.id;
                    return (
                      <button key={t.id} onClick={() => setTheme(t.id)}
                        className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${isSelected ? 'border-[#00D4AA] bg-[rgba(0,212,170,0.08)]' : 'border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.1)]'}`}>
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-[#00D4AA]' : 'text-[#8892A4]'}`} />
                        <span className={`text-sm font-medium ${isSelected ? 'text-[#00D4AA]' : 'text-[#F0F2F7]'}`}>{t.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#00D4AA] ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-[#8892A4] mb-3">Accent Rengi</h3>
                <div className="flex items-center gap-3">
                  {["#00D4AA", "#4B9EFF", "#A78BFA", "#FFB833", "#FF4757"].map((color) => (
                    <button key={color} className={`w-10 h-10 rounded-full transition-transform hover:scale-110 ${color === "#00D4AA" ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0E1117]' : ''}`} style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Connections Section */}
          {activeSection === "connections" && (
            <div className="finos-card p-6">
              <h2 className="text-lg font-semibold text-[#F0F2F7] mb-6">Bağlı Hesaplar</h2>
              <div className="space-y-3">
                {connectedAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-4 bg-[#151A23] rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${account.connected ? 'bg-[rgba(0,212,170,0.1)]' : 'bg-[rgba(78,90,107,0.2)]'}`}>
                        <CreditCard className={`w-5 h-5 ${account.connected ? 'text-[#00D4AA]' : 'text-[#4E5A6B]'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#F0F2F7]">{account.name}</p>
                        <p className="text-xs text-[#4E5A6B]">{account.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {account.connected ? (
                        <>
                          <span className="text-xs text-[#4E5A6B]">Son güncelleme: {account.lastSync}</span>
                          <span className="flex items-center gap-1 text-xs text-[#00D4AA]"><span className="w-2 h-2 bg-[#00D4AA] rounded-full" />Bağlı</span>
                        </>
                      ) : (
                        <button className="px-4 py-2 bg-[#00D4AA] rounded-lg text-sm font-medium text-[#080A0F] hover:bg-[#00D4AA]/90 transition-colors">Bağla</button>
                      )}
                      <ChevronRight className="w-4 h-4 text-[#4E5A6B]" />
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 p-4 border border-dashed border-[rgba(255,255,255,0.1)] rounded-xl text-sm text-[#8892A4] hover:border-[#00D4AA] hover:text-[#00D4AA] transition-colors">+ Yeni Hesap Bağla</button>
              {/* Backup Section */}
              <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)]">
                <h3 className="text-sm font-medium text-[#F0F2F7] mb-4">Veri Yedekleme</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <button onClick={handleExportJSON} disabled={backupLoading} className="flex items-center gap-2 px-4 py-3 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#8892A4] hover:text-[#F0F2F7] transition-colors">
                    <Download className="w-4 h-4" />{backupLoading ? "İndiriliyor..." : "JSON Yedek Al"}
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} disabled={importLoading} className="flex items-center gap-2 px-4 py-3 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#8892A4] hover:text-[#F0F2F7] transition-colors">
                    <Upload className="w-4 h-4" />{importLoading ? "Yükleniyor..." : "JSON Yedek Yükle"}
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === "security" && (
            <div className="finos-card p-6">
              <h2 className="text-lg font-semibold text-[#F0F2F7] mb-6">Güvenlik</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#151A23] rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-[#F0F2F7]">İki Faktörlü Doğrulama</p>
                    <p className="text-xs text-[#4E5A6B]">Hesabınıza ekstra güvenlik katmanı ekleyin</p>
                  </div>
                  <div className="flex items-center gap-3"><span className="text-xs text-[#00D4AA]">Aktif</span><ChevronRight className="w-4 h-4 text-[#4E5A6B]" /></div>
                </div>
                <div className="flex items-center justify-between p-4 bg-[#151A23] rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-[#F0F2F7]">Şifre Değiştir</p>
                    <p className="text-xs text-[#4E5A6B]">Son değişiklik: 3 ay önce</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#4E5A6B]" />
                </div>
                <div className="flex items-center justify-between p-4 bg-[#151A23] rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-[#F0F2F7]">Oturum Geçmişi</p>
                    <p className="text-xs text-[#4E5A6B]">Tüm aktif oturumlarınızı görüntüleyin</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#4E5A6B]" />
                </div>
                <div className="flex items-center justify-between p-4 bg-[#151A23] rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-[#F0F2F7]">Biyometrik Giriş</p>
                    <p className="text-xs text-[#4E5A6B]">Face ID / Touch ID ile giriş yapın</p>
                  </div>
                  <button className="w-12 h-6 rounded-full bg-[#00D4AA] relative"><span className="absolute top-1 left-7 w-4 h-4 bg-white rounded-full" /></button>
                </div>
              </div>
            </div>
          )}

          {/* Language Section */}
          {activeSection === "language" && (
            <div className="finos-card p-6">
              <h2 className="text-lg font-semibold text-[#F0F2F7] mb-6">Dil ve Bölge</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#4E5A6B] mb-2">Dil</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-4 py-2.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA]">
                    <option value="tr">Türkçe</option><option value="en">English</option><option value="de">Deutsch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#4E5A6B] mb-2">Para Birimi</label>
                  <select value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)} className="w-full px-4 py-2.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA]">
                    <option value="TRY">TRY (₺)</option><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#4E5A6B] mb-2">Zaman Dilimi</label>
                  <select className="w-full px-4 py-2.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA]">
                    <option>İstanbul (GMT+3)</option><option>London (GMT+0)</option><option>New York (GMT-5)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#4E5A6B] mb-2">Tarih Formatı</label>
                  <select className="w-full px-4 py-2.5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#F0F2F7] focus:outline-none focus:border-[#00D4AA]">
                    <option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Billing Section */}
          {activeSection === "billing" && (
            <div className="finos-card p-6">
              <h2 className="text-lg font-semibold text-[#F0F2F7] mb-6">Abonelik</h2>
              <div className="p-6 bg-gradient-to-r from-[#FFB833]/20 to-[#FF8C00]/20 border border-[#FFB833]/30 rounded-2xl mb-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 text-xs font-bold bg-[#FFB833] text-[#080A0F] rounded">PRO</span>
                      <span className="text-sm text-[#FFB833]">Aktif</span>
                    </div>
                    <h3 className="text-xl font-bold text-[#F0F2F7] mb-1">FinOS Pro</h3>
                    <p className="text-sm text-[#8892A4]">Sınırsız erişim, AI önerileri ve premium özellikler</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold font-mono text-[#F0F2F7]">₺299</p>
                    <p className="text-xs text-[#4E5A6B]">/ay</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-[#FFB833]/20">
                  <p className="text-xs text-[#8892A4]">Sonraki ödeme: 15 Ekim 2024</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button className="px-6 py-2 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-lg text-sm text-[#8892A4] hover:border-[rgba(255,255,255,0.1)] transition-colors">Plan Değiştir</button>
                <button className="px-6 py-2 text-sm text-[#FF4757] hover:underline transition-colors">Aboneliği İptal Et</button>
              </div>
              {/* Plan Comparison */}
              <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.06)]">
                <h3 className="text-sm font-medium text-[#F0F2F7] mb-4">Plan Karşılaştırma</h3>
                <div className="grid grid-cols-3 gap-4">
                  {/* Free Plan */}
                  <div className="p-5 bg-[#151A23] border border-[rgba(255,255,255,0.06)] rounded-2xl">
                    <p className="text-xl font-bold text-[#8892A4] mb-1">FREE</p>
                    <p className="text-2xl font-mono font-bold text-[#F0F2F7] mb-4">₺0<span className="text-sm font-normal text-[#8892A4]">/ay</span></p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-center gap-2 text-xs text-[#8892A4]"><Check className="w-3.5 h-3.5 text-[#00D4AA]" /> 5 varlık</li>
                      <li className="flex items-center gap-2 text-xs text-[#8892A4]"><Check className="w-3.5 h-3.5 text-[#00D4AA]" /> 50 işlem/ay</li>
                      <li className="flex items-center gap-2 text-xs text-[#8892A4]"><Check className="w-3.5 h-3.5 text-[#00D4AA]" /> 5 AI mesaj</li>
                    </ul>
                    <button className="w-full py-2 border border-[rgba(255,255,255,0.1)] text-[#8892A4] text-sm rounded-lg hover:bg-[rgba(255,255,255,0.04)] transition-colors">Mevcut</button>
                  </div>
                  {/* Premium Plan */}
                  <div className="p-5 bg-[rgba(167,139,250,0.08)] border border-[#A78BFA]/30 rounded-2xl relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#A78BFA] text-white text-xs font-bold rounded">EN POPULER</div>
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-5 h-5 text-[#A78BFA]" />
                      <p className="text-xl font-bold text-[#A78BFA]">PREMIUM</p>
                    </div>
                    <p className="text-2xl font-mono font-bold text-[#F0F2F7] mb-4">₺149<span className="text-sm font-normal text-[#8892A4]">/ay</span></p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-center gap-2 text-xs text-[#8892A4]"><Check className="w-3.5 h-3.5 text-[#00D4AA]" /> Sınırsız varlık</li>
                      <li className="flex items-center gap-2 text-xs text-[#8892A4]"><Check className="w-3.5 h-3.5 text-[#00D4AA]" /> AI Koç</li>
                      <li className="flex items-center gap-2 text-xs text-[#8892A4]"><Check className="w-3.5 h-3.5 text-[#00D4AA]" /> PDF Rapor</li>
                    </ul>
                    <button className="w-full py-2 bg-[#A78BFA] text-white text-sm rounded-lg hover:bg-[#9171e8] transition-colors">Yükselt</button>
                  </div>
                  {/* Pro Plan */}
                  <div className="p-5 bg-[rgba(255,184,51,0.08)] border border-[#FFB833]/30 rounded-2xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="w-5 h-5 text-[#FFB833]" />
                      <p className="text-xl font-bold text-[#FFB833]">PRO</p>
                    </div>
                    <p className="text-2xl font-mono font-bold text-[#F0F2F7] mb-4">₺299<span className="text-sm font-normal text-[#8892A4]">/ay</span></p>
                    <ul className="space-y-2 mb-4">
                      <li className="flex items-center gap-2 text-xs text-[#8892A4]"><Check className="w-3.5 h-3.5 text-[#00D4AA]" /> Vergi Raporu</li>
                      <li className="flex items-center gap-2 text-xs text-[#8892A4]"><Check className="w-3.5 h-3.5 text-[#00D4AA]" /> API Erişimi</li>
                      <li className="flex items-center gap-2 text-xs text-[#8892A4]"><Check className="w-3.5 h-3.5 text-[#00D4AA]" /> Öncelikli Destek</li>
                    </ul>
                    <button className="w-full py-2 bg-[#FFB833] text-[#080A0F] font-semibold text-sm rounded-lg hover:bg-[#e6a52e] transition-colors">Mevcut</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
