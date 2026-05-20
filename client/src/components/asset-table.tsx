import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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

export function AssetTable({ assets, searchTerm = "" }: AssetTableProps) {
  const { toast } = useToast();
  const [editAsset, setEditAsset] = useState<AssetDetail | null>(null);
  const filteredAssets = assets.filter((asset) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return [asset.name, asset.symbol, asset.market, asset.type, asset.currency].some((value) =>
      value.toLowerCase().includes(term)
    );
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/assets/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/allocation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/performance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/details"] });
      toast({ title: "Başarılı", description: "Varlık başarıyla silindi" });
    },
    onError: () => {
      toast({ title: "Hata", description: "Varlık silinirken bir hata oluştu", variant: "destructive" });
    },
  });

  const formatCurrency = (amount: number | undefined, currency: string) => {
    const symbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€" };
    const value = amount ?? 0;
    return `${symbols[currency] || ""}${value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
  };

  const assetTypeNames: Record<string, string> = {
    hisse: "Hisse",
    etf: "ETF",
    kripto: "Kripto",
    madeni_para: "Madeni Para",
  };

  if (filteredAssets.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground" data-testid="empty-assets">
        <p>{searchTerm ? "Aramaya uygun varlık bulunamadı" : "Henüz varlık eklenmemiş"}</p>
        <p className="text-sm mt-1">
          {searchTerm ? "Farklı bir arama terimi deneyin" : "Portföyünüze varlık eklemek için yukarıdaki butonu kullanın"}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Varlık</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Borsa</TableHead>
              <TableHead className="text-right">Miktar</TableHead>
              <TableHead className="text-right">Ort. Fiyat</TableHead>
              <TableHead className="text-right">Güncel Fiyat</TableHead>
              <TableHead className="text-right">Toplam Değer</TableHead>
              <TableHead className="text-right">Değişim</TableHead>
              <TableHead className="text-right">Kar/Zarar</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssets.map((asset) => (
              <TableRow key={asset.id} data-testid={`asset-row-${asset.id}`}>
                <TableCell className="font-medium">
                  <div>
                    <div>{asset.name}</div>
                    <div className="text-sm text-muted-foreground">{asset.symbol} · {asset.currency}</div>
                  </div>
                </TableCell>
                <TableCell>{assetTypeNames[asset.type] || asset.type}</TableCell>
                <TableCell>{asset.market}</TableCell>
                <TableCell className="text-right">{Number(asset.quantity).toLocaleString("tr-TR", { maximumFractionDigits: 8 })}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(asset.averagePrice), asset.currency)}</TableCell>
                <TableCell className="text-right">{formatCurrency(Number(asset.currentPrice), asset.currency)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(asset.totalValue, asset.currency)}</TableCell>
                <TableCell className="text-right">
                  <div className={`flex items-center justify-end gap-1 ${asset.change >= 0 ? "text-success" : "text-destructive"}`}>
                    {asset.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    <span>{formatPercent(asset.change)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  <span className={`${(asset.profit ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                    {(asset.profit ?? 0) >= 0 ? "+" : ""}{formatCurrency(asset.profit, asset.currency)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditAsset(asset)}
                      data-testid={`button-edit-${asset.id}`}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(asset.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${asset.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditAssetDialog
        asset={editAsset}
        open={editAsset !== null}
        onOpenChange={(open) => { if (!open) setEditAsset(null); }}
      />
    </>
  );
}
