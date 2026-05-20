import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useState } from "react";
import { AddAssetDialog } from "@/components/add-asset-dialog";
import { AssetTable } from "@/components/asset-table";
import { AssetAllocationChart } from "@/components/asset-allocation-chart";
import { MonthlyPerformanceChart } from "@/components/monthly-performance-chart";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useDisplayCurrency } from "@/lib/currency-context";
import type { PortfolioSummary, AssetDetail, AssetAllocation, MonthlyPerformance, Transaction } from "@shared/schema";

export default function Dashboard() {
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [perfPeriod, setPerfPeriod] = useState<string>("monthly");
  const { toast } = useToast();
  const { formatDisplayCurrency, displayCurrency, isLoadingRates } = useDisplayCurrency();

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery<PortfolioSummary>({
    queryKey: ["/api/portfolio/summary"],
  });

  const updatePricesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/prices/update");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/allocation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/performance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      setLastUpdate(new Date().toLocaleTimeString("tr-TR"));
      toast({
        title: "Fiyatlar Güncellendi",
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Fiyatlar güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    },
  });

  const { data: assets, isLoading: assetsLoading, error: assetsError } = useQuery<AssetDetail[]>({
    queryKey: ["/api/portfolio/details"],
  });

  const { data: allocation, isLoading: allocationLoading, error: allocationError } = useQuery<AssetAllocation[]>({
    queryKey: ["/api/portfolio/allocation"],
  });

  const { data: performance, isLoading: performanceLoading, error: performanceError } = useQuery<MonthlyPerformance[]>({
    queryKey: [`/api/portfolio/performance?period=${perfPeriod}`],
  });

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const formatCurrency = (amount: number) => {
    return formatDisplayCurrency(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
  };

  const getAssetTransactions = (assetId: string) =>
    (transactions || [])
      .filter((transaction) => transaction.assetId === assetId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (date: string | Date) =>
    new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground" data-testid="heading-portfolio">
            Portföyüm
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Yatırımlarınızı tek platformda yönetin
            {lastUpdate && (
              <span className="ml-2 text-xs">
                (Son güncelleme: {lastUpdate})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => updatePricesMutation.mutate()}
            disabled={updatePricesMutation.isPending}
            data-testid="button-refresh-prices"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${updatePricesMutation.isPending ? "animate-spin" : ""}`} />
            {updatePricesMutation.isPending ? "Güncelleniyor..." : "Fiyatları Güncelle"}
          </Button>
          <Button onClick={() => setIsAddAssetOpen(true)} data-testid="button-add-asset">
            <Plus className="h-4 w-4 mr-2" />
            Varlık Ekle
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card data-testid="card-total-assets">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Varlık</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            ) : summaryError ? (
              <div className="text-sm text-destructive">Veri yüklenemedi</div>
            ) : (
              <div className="text-2xl font-semibold" data-testid="text-total-assets">
                {formatCurrency(summary?.totalAssets || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Tüm varlıklarınızın toplam değeri
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-debt">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Borç</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            ) : summaryError ? (
              <div className="text-sm text-destructive">Veri yüklenemedi</div>
            ) : (
              <div className="text-2xl font-semibold" data-testid="text-total-debt">
                {formatCurrency(summary?.totalDebt || 0)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Toplam yükümlülükleriniz
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-net-worth">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Değer</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <div className="h-8 w-32 bg-muted animate-pulse rounded" />
            ) : summaryError ? (
              <div className="text-sm text-destructive">Veri yüklenemedi</div>
            ) : (
              <>
                <div className="text-2xl font-semibold" data-testid="text-net-worth">
                  {formatCurrency(summary?.netWorth || 0)}
                </div>
                {summary && summary.monthlyChange !== 0 && (
                  <div className={`flex items-center text-sm mt-1 ${summary.monthlyChange >= 0 ? "text-success" : "text-destructive"}`}>
                    {summary.monthlyChange >= 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    <span data-testid="text-monthly-change">
                      {formatPercent(summary.monthlyChange)} bu ay
                    </span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-asset-allocation">
          <CardHeader>
            <CardTitle>Varlık Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {allocationLoading ? (
              <div className="h-[300px] w-full bg-muted animate-pulse rounded" />
            ) : allocationError ? (
              <div className="flex items-center justify-center h-[300px] text-destructive">
                Veri yüklenemedi
              </div>
            ) : (
              <AssetAllocationChart data={allocation || []} />
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-monthly-performance">
          <CardHeader className="pb-2">
            <CardTitle>Portföy Performansı</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={perfPeriod} onValueChange={setPerfPeriod} className="mb-4">
              <TabsList>
                <TabsTrigger value="daily" data-testid="tab-perf-daily">Günlük</TabsTrigger>
                <TabsTrigger value="weekly" data-testid="tab-perf-weekly">Haftalık</TabsTrigger>
                <TabsTrigger value="monthly" data-testid="tab-perf-monthly">Aylık</TabsTrigger>
              </TabsList>
            </Tabs>
            {performanceLoading ? (
              <div className="h-[300px] w-full bg-muted animate-pulse rounded" />
            ) : performanceError ? (
              <div className="flex items-center justify-center h-[300px] text-destructive">
                Veri yüklenemedi
              </div>
            ) : (
              <MonthlyPerformanceChart data={performance || []} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-assets-list">
        <CardHeader>
          <CardTitle>Varlıklarım</CardTitle>
        </CardHeader>
        <CardContent>
          {assetsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 w-full bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : assetsError ? (
            <div className="text-center py-12 text-destructive">
              Varlıklar yüklenirken bir hata oluştu
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-2" data-testid="accordion-assets">
              {(assets || []).map((asset) => {
                const assetTransactions = getAssetTransactions(asset.id);
                return (
                  <AccordionItem key={asset.id} value={asset.id} className="rounded-md border px-4">
                    <AccordionTrigger className="py-4 hover:no-underline" data-testid={`trigger-asset-${asset.id}`}>
                      <div className="flex w-full items-center justify-between gap-4 pr-2">
                        <div className="text-left">
                          <div className="font-medium">{asset.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {asset.symbol} • {asset.market} • {asset.currency}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(asset.totalValue || 0)}</div>
                          <div className={`${(asset.change || 0) >= 0 ? "text-success" : "text-destructive"} text-sm`}>
                            {(asset.change || 0) >= 0 ? "+" : ""}
                            {(asset.change || 0).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">
                          Miktar: {Number(asset.quantity).toLocaleString("tr-TR", { maximumFractionDigits: 8 })} • Ort. Fiyat: {formatCurrency(Number(asset.averagePrice))}
                        </div>
                        {assetTransactions.length === 0 ? (
                          <div className="text-sm text-muted-foreground">Bu varlık için işlem bulunmuyor</div>
                        ) : (
                          assetTransactions.map((transaction) => (
                            <div key={transaction.id} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                              <div>
                                <div className="font-medium">{formatDate(transaction.date)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {transaction.type} • {Number(transaction.quantity).toLocaleString("tr-TR", { maximumFractionDigits: 8 })} adet
                                </div>
                              </div>
                              <div className={transaction.type === "alış" ? "text-success" : "text-destructive"}>
                                {transaction.type === "alış" ? "+" : "-"}{formatCurrency(Number(transaction.totalAmount) || 0)}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <AddAssetDialog open={isAddAssetOpen} onOpenChange={setIsAddAssetOpen} />
    </div>
  );
}
