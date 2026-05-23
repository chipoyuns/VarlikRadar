import { Trash2, TrendingUp, TrendingDown, Pencil } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AssetDetail } from "@shared/schema";
import { EditAssetDialog } from "./edit-asset-dialog";

interface AssetTableProps {
  assets: AssetDetail[];
  searchTerm?: string;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  hisse:       { label: "Hisse",  color: "#4B9EFF", bg: "rgba(75,158,255,0.12)" },
  etf:         { label: "ETF",    color: "#00D4AA", bg: "rgba(0,212,170,0.12)" },
  kripto:      { label: "Kripto", color: "#FFB833", bg: "rgba(255,184,51,0.12)" },
  emtia:       { label: "Emtia",  color: "#FF6B6B", bg: "rgba(255,107,107,0.12)" },
  madeni_para: { label: "Emtia",  color: "#FF8E53", bg: "rgba(255,142,83,0.12)" },
};

export function AssetTable({ assets, searchTerm = "" }: AssetTableProps) {
  const { toast } = useToast();
  const [editAsset, setEditAsset] = useState<AssetDetail | null>(null);

  const filteredAssets = assets.filter((asset) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return [asset.name, asset.symbol, asset.market, asset.type, asset.currency].some((value) =>
      value?.toLowerCase().includes(term)
    );
  });

  /* Alt Toplam hesaplamaları */
  const subtotalValueTRY = filteredAssets.reduce((sum, a) => sum + (a.totalValueTRY || 0), 0);
  const subtotalProfit = filteredAssets.reduce((sum, a) => sum + (a.profit || 0), 0);
  const weightedChange = subtotalValueTRY > 0
    ? filteredAssets.reduce((sum, a) => sum + (a.change || 0) * (a.totalValueTRY || 0), 0) / subtotalValueTRY
    : 0;
  const subtotalCount = filteredAssets.length;

  const fmtTRY = (amount: number) => {
    return `₺${amount.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await apiRequest("DELETE", `/api/assets/${id}`, undefined),
    onSuccess: () => {
      ["assets","portfolio/summary","portfolio/allocation","portfolio/performance","portfolio/details"].forEach(k =>
        queryClient.invalidateQueries({ queryKey: [`/api/${k}`] })
      );
      toast({ title: "Başarılı", description: "Varlık başarıyla silindi" });
    },
    onError: () => toast({ title: "Hata", description: "Varlık silinirken bir hata oluştu", variant: "destructive" }),
  });

  const fmtCurrency = (amount: number | undefined, currency: string) => {
    const symbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };
    const v = amount ?? 0;
    return `${symbols[currency] || ""}${v.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (filteredAssets.length === 0) {
    return (
      <div className="text-center py-12 text-[#4E5A6B] text-sm" data-testid="empty-assets">
        <p>{searchTerm ? "Aramaya uygun varlık bulunamadı" : "Henüz varlık eklenmemiş"}</p>
        <p className="text-xs mt-1 text-[#4E5A6B]/70">
          {searchTerm ? "Farklı bir arama terimi deneyin" : "Portföyünüze varlık eklemek için Varlık Ekle butonunu kullanın"}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px]">
          <thead>
            <tr className="border-b border-[rgba(255,255,255,0.05)]">
              {["Varlık", "Tip", "Borsa", "Miktar", "Ort. Fiyat", "Güncel Fiyat", "Toplam Değer", "Değişim", "Kar/Zarar", ""].map((h, i) => (
                <th key={i} className={`pb-3 text-xs font-medium text-[#4E5A6B] uppercase tracking-wider ${i >= 3 && i <= 8 ? "text-right" : "text-left"} ${i === 9 ? "w-20" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredAssets.map((asset) => {
              const cfg = TYPE_CONFIG[asset.type] || { label: asset.type, color: "#8892A4", bg: "rgba(136,146,164,0.1)" };
              const pnl = asset.profit ?? 0;
              const change = asset.change ?? 0;
              const isPos = change >= 0;
              const isPnlPos = pnl >= 0;
              return (
                <tr
                  key={asset.id}
                  className="border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.02)] transition-colors group"
                  data-testid={`asset-row-${asset.id}`}
                >
                  <td className="py-3.5 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                        {asset.symbol?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#F0F2F7]">{asset.name}</p>
                        <p className="text-xs text-[#4E5A6B] font-mono">{asset.symbol} · {asset.currency}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className="text-sm text-[#8892A4]">{asset.market}</span>
                  </td>
                  <td className="py-3.5 pr-4 text-right">
                    <span className="text-sm font-mono text-[#F0F2F7]">
                      {Number(asset.quantity).toLocaleString("tr-TR", { maximumFractionDigits: 8 })}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 text-right">
                    <span className="text-sm font-mono text-[#8892A4]">{fmtCurrency(Number(asset.averagePrice), asset.currency)}</span>
                  </td>
                  <td className="py-3.5 pr-4 text-right">
                    <span className="text-sm font-mono text-[#F0F2F7] font-medium">{fmtCurrency(Number(asset.currentPrice), asset.currency)}</span>
                  </td>
                  <td className="py-3.5 pr-4 text-right">
                    <span className="text-sm font-mono font-semibold text-[#F0F2F7]">{fmtCurrency(asset.totalValue, asset.currency)}</span>
                  </td>
                  <td className="py-3.5 pr-4 text-right">
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold ${isPos ? "bg-[rgba(0,212,170,0.1)] text-[#00D4AA]" : "bg-[rgba(255,71,87,0.1)] text-[#FF4757]"}`}>
                      {isPos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {isPos ? "+" : ""}{change.toFixed(2)}%
                    </div>
                  </td>
                  <td className="py-3.5 pr-4 text-right">
                    <span className={`text-sm font-mono font-semibold ${isPnlPos ? "text-[#00D4AA]" : "text-[#FF4757]"}`}>
                      {isPnlPos ? "+" : ""}{fmtCurrency(pnl, asset.currency)}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditAsset(asset)}
                        className="p-1.5 rounded-lg hover:bg-[rgba(75,158,255,0.1)] text-[#4E5A6B] hover:text-[#4B9EFF] transition-colors"
                        data-testid={`button-edit-${asset.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(asset.id)}
                        disabled={deleteMutation.isPending}
                        className="p-1.5 rounded-lg hover:bg-[rgba(255,71,87,0.1)] text-[#4E5A6B] hover:text-[#FF4757] transition-colors"
                        data-testid={`button-delete-${asset.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[rgba(0,212,170,0.2)] bg-[rgba(0,212,170,0.04)]">
              <td className="py-3.5 pr-4" colSpan={3}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#00D4AA]">Alt Toplam</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[rgba(0,212,170,0.15)] text-[#00D4AA]">
                    {subtotalCount} varlık
                  </span>
                </div>
              </td>
              <td className="py-3.5 pr-4" colSpan={3}></td>
              <td className="py-3.5 pr-4 text-right">
                <span className="text-sm font-mono font-bold text-[#F0F2F7]">{fmtTRY(subtotalValueTRY)}</span>
              </td>
              <td className="py-3.5 pr-4 text-right">
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold ${weightedChange >= 0 ? "bg-[rgba(0,212,170,0.12)] text-[#00D4AA]" : "bg-[rgba(255,71,87,0.12)] text-[#FF4757]"}`}>
                  {weightedChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {weightedChange >= 0 ? "+" : ""}{weightedChange.toFixed(2)}%
                </div>
              </td>
              <td className="py-3.5 pr-4 text-right">
                <span className={`text-sm font-mono font-bold ${subtotalProfit >= 0 ? "text-[#00D4AA]" : "text-[#FF4757]"}`}>
                  {subtotalProfit >= 0 ? "+" : ""}{fmtTRY(subtotalProfit)}
                </span>
              </td>
              <td className="py-3.5"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <EditAssetDialog
        asset={editAsset}
        open={editAsset !== null}
        onOpenChange={(open) => { if (!open) setEditAsset(null); }}
      />
    </>
  );
}
