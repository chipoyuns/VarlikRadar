import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useRef } from "react";
import { useDisplayCurrency } from "@/lib/currency-context";
import { exportBackupJSON, importBackupJSON } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Download, Upload, Database, Cloud, FileJson, CheckCircle, Info, HardDrive, Bell, Globe, Shield, ChevronRight } from "lucide-react";

export default function Settings() {
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const [language, setLanguage] = useState("tr");
  const [backupLoading, setBackupLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [priceAlerts, setPriceAlerts] = useState(false);
  const [portfolioUpdates, setPortfolioUpdates] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const settingRow = (id: string, label: string, desc: string, checked: boolean, onChange: (v: boolean) => void, testId: string) => (
    <div className="flex items-center justify-between py-4 border-b border-[rgba(255,255,255,0.06)] last:border-0">
      <div>
        <Label htmlFor={id} className="text-sm font-medium text-[#F0F2F7]">{label}</Label>
        <p className="text-xs text-[#4E5A6B] mt-0.5">{desc}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} data-testid={testId} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#F0F2F7]" data-testid="heading-settings">Ayarlar</h1>
        <p className="text-sm text-[#8892A4] mt-1">Platform tercihlerinizi yönetin</p>
      </div>

      {/* Cloud Backup */}
      <div className="finos-card p-6" data-testid="card-backup">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[rgba(0,212,170,0.1)] flex items-center justify-center">
            <Database className="h-5 w-5 text-[#00D4AA]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#F0F2F7]">Veri Yedekleme & Senkronizasyon</h2>
            <p className="text-xs text-[#4E5A6B]">Portföy verilerinizi yedekleyin veya içe aktarın</p>
          </div>
        </div>

        {/* Cloud status */}
        <div className="p-4 rounded-xl bg-[rgba(0,212,170,0.05)] border border-[rgba(0,212,170,0.2)] mb-4">
          <div className="flex items-start gap-3">
            <Cloud className="h-5 w-5 text-[#00D4AA] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#F0F2F7]">Bulut Senkronizasyonu Aktif</p>
              <p className="text-xs text-[#8892A4] mt-1">
                Tüm verileriniz <span className="text-[#F0F2F7] font-medium">Neon PostgreSQL</span> bulut veri tabanında güvenli şekilde saklanmaktadır.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00D4AA] animate-pulse" />
                <span className="text-xs text-[#00D4AA] font-medium">Otomatik bulut yedekleme aktif</span>
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] mb-5">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-[#4B9EFF] mt-0.5 flex-shrink-0" />
            <div className="space-y-1.5">
              {[
                { n: 1, title: "Bulut DB (Neon PostgreSQL)", desc: "Verileriniz her işlemde otomatik olarak bulut veri tabanına yazılır." },
                { n: 2, title: "Manuel JSON Yedek", desc: "Tüm verilerinizi tek bir JSON dosyasına aktarabilirsiniz." },
                { n: 3, title: "İçe Aktarma", desc: "Daha önce alınan JSON yedeğini yükleyerek verilerinizi geri yükleyebilirsiniz." },
              ].map(({ n, title, desc }) => (
                <div key={n} className="flex items-start gap-2 text-xs text-[#8892A4]">
                  <span className="text-[#00D4AA] font-bold flex-shrink-0">{n}.</span>
                  <span><span className="text-[#F0F2F7] font-medium">{title}:</span> {desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: FileJson, iconColor: "#4B9EFF", title: "JSON Yedek Al", desc: "Tüm verileri tek JSON dosyasına aktar", btnText: backupLoading ? "İndiriliyor..." : "JSON İndir", btnIcon: Download, onClick: handleExportJSON, disabled: backupLoading, testId: "button-export-json", style: {} },
            { icon: Upload, iconColor: "#A78BFA", title: "JSON Yedek Yükle", desc: "Daha önce alınan JSON yedeğini içe aktar", btnText: importLoading ? "Yükleniyor..." : "JSON Yükle", btnIcon: Upload, onClick: () => fileInputRef.current?.click(), disabled: importLoading, testId: "button-import-json", style: {} },
            { icon: HardDrive, iconColor: "#00D4AA", title: "Bulut Depolama", desc: "Neon PostgreSQL — verileriniz her zaman güvende", btnText: "Bağlı & Aktif", btnIcon: CheckCircle, onClick: () => {}, disabled: true, testId: "", style: { borderColor: "rgba(0,212,170,0.2)", background: "rgba(0,212,170,0.05)" } },
          ].map(({ icon: Icon, iconColor, title, desc, btnText, btnIcon: BtnIcon, onClick, disabled, testId, style }) => (
            <div key={title} className="finos-card-inner p-4 flex flex-col" style={style}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4" style={{ color: iconColor }} />
                <span className="text-sm font-semibold text-[#F0F2F7]">{title}</span>
              </div>
              <p className="text-xs text-[#4E5A6B] mb-4 flex-1">{desc}</p>
              <button onClick={onClick} disabled={disabled}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                style={{ background: disabled && title !== "JSON Yedek Al" && title !== "JSON Yedek Yükle" ? "rgba(0,212,170,0.1)" : "rgba(255,255,255,0.04)", color: disabled && title.includes("Bulut") ? "#00D4AA" : "#8892A4", border: "1px solid rgba(255,255,255,0.06)" }}
                {...(testId ? { "data-testid": testId } : {})}>
                <BtnIcon className="h-3.5 w-3.5" /> {btnText}
              </button>
            </div>
          ))}
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportJSON} data-testid="input-import-json" />
        </div>
      </div>

      {/* Regional */}
      <div className="finos-card p-6" data-testid="card-regional">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[rgba(75,158,255,0.1)] flex items-center justify-center">
            <Globe className="h-5 w-5 text-[#4B9EFF]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#F0F2F7]">Bölgesel Ayarlar</h2>
            <p className="text-xs text-[#4E5A6B]">Para birimi ve dil tercihlerinizi ayarlayın</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency" className="text-sm text-[#8892A4]">Ana Para Birimi</Label>
            <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
              <SelectTrigger id="currency" className="bg-[#151A23] border-[rgba(255,255,255,0.06)] text-[#F0F2F7] max-w-xs" data-testid="select-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRY">Türk Lirası (₺)</SelectItem>
                <SelectItem value="USD">Amerikan Doları ($)</SelectItem>
                <SelectItem value="EUR">Euro (€)</SelectItem>
                <SelectItem value="BTC">Bitcoin (₿)</SelectItem>
                <SelectItem value="ETH">Ethereum (Ξ)</SelectItem>
                <SelectItem value="XAU">Gram Altın (gr)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-[#4E5A6B]">Portföy özetinde kullanılacak ana para birimi</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language" className="text-sm text-[#8892A4]">Dil</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language" className="bg-[#151A23] border-[rgba(255,255,255,0.06)] text-[#F0F2F7] max-w-xs" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tr">Türkçe</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-[#4E5A6B]">Platform arayüz dili</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="finos-card p-6" data-testid="card-notifications">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[rgba(255,184,51,0.1)] flex items-center justify-center">
            <Bell className="h-5 w-5 text-[#FFB833]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#F0F2F7]">Bildirimler</h2>
            <p className="text-xs text-[#4E5A6B]">Bildirim tercihlerinizi yönetin</p>
          </div>
        </div>
        {settingRow("price-alerts", "Fiyat Uyarıları", "Fiyat değişikliklerinde bildirim al", priceAlerts, setPriceAlerts, "switch-price-alerts")}
        {settingRow("portfolio-updates", "Portföy Güncellemeleri", "Günlük portföy özeti bildirimleri", portfolioUpdates, setPortfolioUpdates, "switch-portfolio-updates")}
      </div>

      {/* About */}
      <div className="finos-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[rgba(167,139,250,0.1)] flex items-center justify-center">
            <Shield className="h-5 w-5 text-[#A78BFA]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#F0F2F7]">Hakkında</h2>
            <p className="text-xs text-[#4E5A6B]">Platform bilgileri</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { label: "Versiyon", value: "v2.4.1 FinOS" },
            { label: "Son Güncelleme", value: "14 Aralık 2025" },
            { label: "Veri Tabanı", value: "Neon PostgreSQL" },
            { label: "Platform", value: "React + TypeScript + Express" },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.04)] last:border-0">
              <span className="text-sm text-[#4E5A6B]">{label}</span>
              <span className="text-sm text-[#8892A4] font-mono">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
