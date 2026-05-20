import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

function sanitize(str: string | undefined | null): string {
  if (!str) return "";
  return str
    .replace(/ğ/g, "g").replace(/Ğ/g, "G")
    .replace(/ü/g, "u").replace(/Ü/g, "U")
    .replace(/ş/g, "s").replace(/Ş/g, "S")
    .replace(/ı/g, "i").replace(/İ/g, "I")
    .replace(/ö/g, "o").replace(/Ö/g, "O")
    .replace(/ç/g, "c").replace(/Ç/g, "C");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAssetsToPDF(assets: any[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text(sanitize("Varliklarim"), 14, 16);
  doc.setFontSize(9);
  doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`, 14, 23);

  autoTable(doc, {
    startY: 28,
    head: [["Varlik", "Tip", "Borsa", "Miktar", "Ort. Fiyat", "Guncel Fiyat", "Toplam Deger", "Degisim %", "Kar/Zarar"]],
    body: assets.map(a => [
      sanitize(`${a.name} (${a.symbol})`),
      sanitize(a.type),
      sanitize(a.market),
      Number(a.quantity).toLocaleString("tr-TR", { maximumFractionDigits: 8 }),
      `${a.currency} ${Number(a.averagePrice).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
      `${a.currency} ${Number(a.currentPrice).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
      `${a.currency} ${Number(a.totalValue || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
      `${Number(a.change || 0) >= 0 ? "+" : ""}${Number(a.change || 0).toFixed(2)}%`,
      `${Number(a.profit || 0) >= 0 ? "+" : ""}${Number(a.profit || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 252] },
  });

  doc.save(`varliklarim_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportAssetsToExcel(assets: any[]) {
  const rows = assets.map(a => ({
    "Varlık": `${a.name} (${a.symbol})`,
    "Tip": a.type,
    "Borsa": a.market,
    "Para Birimi": a.currency,
    "Miktar": Number(a.quantity),
    "Ortalama Fiyat": Number(a.averagePrice),
    "Güncel Fiyat": Number(a.currentPrice),
    "Toplam Değer": Number(a.totalValue || 0),
    "Değişim (%)": Number((a.change || 0).toFixed(4)),
    "Kar/Zarar": Number(a.profit || 0),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [20, 12, 10, 10, 14, 16, 16, 16, 12, 14].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Varliklarim");
  XLSX.writeFile(wb, `varliklarim_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportTransactionsToPDF(transactions: any[], assets: any[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text(sanitize("Islem Gecmisi"), 14, 16);
  doc.setFontSize(9);
  doc.text(`Tarih: ${new Date().toLocaleDateString("tr-TR")}`, 14, 23);

  const getAsset = (id: string) => assets.find(a => a.id === id);

  autoTable(doc, {
    startY: 28,
    head: [["Tarih", "Varlik", "Tur", "Miktar", "Fiyat", "Toplam Tutar", "Para Birimi", "Notlar"]],
    body: transactions.map(t => {
      const asset = getAsset(t.assetId);
      return [
        new Date(t.date).toLocaleDateString("tr-TR"),
        asset ? sanitize(`${asset.symbol} - ${asset.name}`) : sanitize(t.assetId),
        sanitize(t.type),
        Number(t.quantity).toLocaleString("tr-TR", { maximumFractionDigits: 8 }),
        `${t.currency} ${Number(t.price).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
        `${t.currency} ${Number(t.totalAmount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`,
        t.currency,
        sanitize(t.notes || ""),
      ];
    }),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 252] },
  });

  doc.save(`islem_gecmisi_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportTransactionsToExcel(transactions: any[], assets: any[]) {
  const getAsset = (id: string) => assets.find(a => a.id === id);

  const rows = transactions.map(t => {
    const asset = getAsset(t.assetId);
    return {
      "Tarih": new Date(t.date).toLocaleDateString("tr-TR"),
      "Varlık": asset ? `${asset.symbol} - ${asset.name}` : t.assetId,
      "Tür": t.type,
      "Miktar": Number(t.quantity),
      "Fiyat": Number(t.price),
      "Toplam Tutar": Number(t.totalAmount),
      "Para Birimi": t.currency,
      "Notlar": t.notes || "",
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [14, 24, 8, 14, 14, 16, 12, 20].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Islemler");
  XLSX.writeFile(wb, `islem_gecmisi_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function exportBackupJSON(): Promise<void> {
  const [assets, transactions, incomes, expenses] = await Promise.all([
    fetch("/api/assets").then(r => r.json()),
    fetch("/api/transactions").then(r => r.json()),
    fetch("/api/incomes").then(r => r.json()),
    fetch("/api/expenses").then(r => r.json()),
  ]);

  const backup = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    platform: "Portföy Takip",
    data: { assets, transactions, incomes, expenses },
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  triggerDownload(blob, `portfoy_yedek_${new Date().toISOString().slice(0, 10)}.json`);
}

export async function importBackupJSON(file: File): Promise<{ success: boolean; message: string }> {
  try {
    const text = await file.text();
    const backup = JSON.parse(text);

    if (!backup.data) {
      return { success: false, message: "Geçersiz yedek dosyası formatı" };
    }

    const response = await fetch("/api/backup/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backup.data),
    });

    if (!response.ok) {
      const err = await response.json();
      return { success: false, message: err.error || "İçe aktarma başarısız" };
    }

    const result = await response.json();
    return { success: true, message: result.message };
  } catch (e) {
    return { success: false, message: "Dosya okunamadı veya format hatalı" };
  }
}
