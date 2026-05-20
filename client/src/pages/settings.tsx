import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useDisplayCurrency } from "@/lib/currency-context";
import { exportBackupJSON, importBackupJSON } from "@/lib/export-utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Download, Upload, Database, Cloud, FileJson,
  CheckCircle, Info, HardDrive, RefreshCcw
} from "lucide-react";

export default function Settings() {
  const [darkMode, setDarkMode] = useState(false);
  const { displayCurrency, setDisplayCurrency } = useDisplayCurrency();
  const [language, setLanguage] = useState("tr");
  const [backupLoading, setBackupLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
  }, []);

  const toggleDarkMode = (checked: boolean) => {
    setDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleExportJSON = async () => {
    setBackupLoading(true);
    try {
      await exportBackupJSON();
      toast({ title: "Yedek Alındı", description: "JSON yedek dosyası bilgisayarınıza indirildi." });
    } catch {
      toast({ title: "Hata", description: "Yedek alınırken bir hata oluştu", variant: "destructive" });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    try {
      const result = await importBackupJSON(file);
      if (result.success) {
        queryClient.invalidateQueries();
        toast({ title: "İçe Aktarma Tamamlandı", description: result.message });
      } else {
        toast({ title: "Hata", description: result.message, variant: "destructive" });
      }
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground" data-testid="heading-settings">
          Ayarlar
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Platform tercihlerinizi yönetin
        </p>
      </div>

      <Card data-testid="card-backup">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Veri Yedekleme & Senkronizasyon
          </CardTitle>
          <CardDescription>Portföy verilerinizi yedekleyin, içe aktarın veya bulut durumunu görüntüleyin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-success/30 bg-success/5 p-4">
            <div className="flex items-start gap-3">
              <Cloud className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Bulut Senkronizasyonu Aktif</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tüm verileriniz <strong>Neon PostgreSQL</strong> bulut veri tabanında güvenli şekilde saklanmaktadır.
                  İnternet bağlantısı olan her cihazdan erişebilirsiniz — herhangi bir manuel senkronizasyon gerekmez.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle className="h-3.5 w-3.5 text-success" />
                  <span className="text-xs text-success font-medium">Otomatik bulut yedekleme aktif</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Otomatik Yedekleme Nasıl Çalışır?</p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">1.</span>
                    <span><strong>Bulut DB (Neon PostgreSQL):</strong> Verileriniz her işlemde otomatik olarak bulut veri tabanına yazılır. Sunucu yeniden başlasa bile veriler kaybolmaz.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">2.</span>
                    <span><strong>Manuel JSON Yedek:</strong> Aşağıdaki butonla tüm verilerinizi tek bir JSON dosyasına aktarabilirsiniz. Bu dosyayı bilgisayarınızda veya harici bir depolama alanında saklayabilirsiniz.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold mt-0.5">3.</span>
                    <span><strong>İçe Aktarma:</strong> Daha önce alınan JSON yedeğini yükleyerek verilerinizi geri yükleyebilirsiniz.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <FileJson className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">JSON Yedek Al</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Tüm varlık, işlem, gelir ve gider verilerini tek JSON dosyasına aktar
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportJSON}
                disabled={backupLoading}
                className="mt-auto"
                data-testid="button-export-json"
              >
                <Download className="h-4 w-4 mr-2" />
                {backupLoading ? "İndiriliyor..." : "JSON İndir"}
              </Button>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <Upload className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">JSON Yedek Yükle</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Daha önce alınan JSON yedeğini içe aktararak verileri geri yükle
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleImportJSON}
                data-testid="input-import-json"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={importLoading}
                className="mt-auto"
                data-testid="button-import-json"
              >
                <Upload className="h-4 w-4 mr-2" />
                {importLoading ? "Yükleniyor..." : "JSON Yükle"}
              </Button>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-success/30 bg-success/5 p-4">
              <div className="flex items-center gap-2 mb-1">
                <HardDrive className="h-4 w-4 text-success" />
                <span className="text-sm font-semibold">Bulut Depolama</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Neon PostgreSQL bulut veri tabanı — verileriniz her zaman güvende
              </p>
              <div className="flex items-center gap-1.5 mt-auto">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-medium text-success">Bağlı ve Aktif</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-appearance">
        <CardHeader>
          <CardTitle>Görünüm</CardTitle>
          <CardDescription>Platform görünüm ayarlarını özelleştirin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dark-mode">Karanlık Mod</Label>
              <div className="text-sm text-muted-foreground">Koyu tema kullan</div>
            </div>
            <Switch
              id="dark-mode"
              checked={darkMode}
              onCheckedChange={toggleDarkMode}
              data-testid="switch-dark-mode"
            />
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-regional">
        <CardHeader>
          <CardTitle>Bölgesel Ayarlar</CardTitle>
          <CardDescription>Para birimi ve dil tercihlerinizi ayarlayın</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="currency">Ana Para Birimi</Label>
            <Select value={displayCurrency} onValueChange={setDisplayCurrency}>
              <SelectTrigger id="currency" data-testid="select-currency">
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
            <p className="text-sm text-muted-foreground">Portföy özetinde kullanılacak ana para birimi</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Dil</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tr">Türkçe</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">Platform arayüz dili</p>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-notifications">
        <CardHeader>
          <CardTitle>Bildirimler</CardTitle>
          <CardDescription>Bildirim tercihlerinizi yönetin</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="price-alerts">Fiyat Uyarıları</Label>
              <div className="text-sm text-muted-foreground">Fiyat değişikliklerinde bildirim al</div>
            </div>
            <Switch id="price-alerts" data-testid="switch-price-alerts" />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="portfolio-updates">Portföy Güncellemeleri</Label>
              <div className="text-sm text-muted-foreground">Günlük portföy özeti bildirimleri</div>
            </div>
            <Switch id="portfolio-updates" data-testid="switch-portfolio-updates" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
