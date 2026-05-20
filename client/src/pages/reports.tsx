import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssetAllocationChart } from "@/components/asset-allocation-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDisplayCurrency } from "@/lib/currency-context";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { AssetAllocation, AssetDetail, MonthlyPerformance } from "@shared/schema";

interface BenchmarkPoint {
  month: string;
  bist100: number | null;
  altin: number | null;
  btc: number | null;
}

const TYPE_NAMES: Record<string, string> = {
  hisse: "Hisse Senetleri",
  etf: "ETF'ler",
  kripto: "Kripto Paralar",
  madeni_para: "Emtia",
};

export default function Reports() {
  const { formatDisplayCurrency, formatAssetValue } = useDisplayCurrency();

  const { data: allocation, isLoading: allocationLoading } = useQuery<AssetAllocation[]>({
    queryKey: ["/api/portfolio/allocation"],
  });

  const { data: assets, isLoading: assetsLoading } = useQuery<AssetDetail[]>({
    queryKey: ["/api/portfolio/details"],
  });

  const { data: performance } = useQuery<MonthlyPerformance[]>({
    queryKey: ["/api/portfolio/performance"],
  });

  const { data: benchmark, isLoading: benchmarkLoading } = useQuery<BenchmarkPoint[]>({
    queryKey: ["/api/benchmark"],
  });

  const getAssetsByType = (type: string) => assets?.filter((a) => a.type === type) || [];
  const getTotalByType = (type: string) =>
    getAssetsByType(type).reduce((sum, a) => sum + (a.totalValueTRY || 0), 0);

  const chartData = (benchmark ?? []).map((b, i) => {
    const perfValue = performance?.[i]?.value ?? 0;
    const basePerf = performance?.[0]?.value ?? 0;
    const portfolioReturn =
      basePerf > 0 ? parseFloat((((perfValue - basePerf) / basePerf) * 100).toFixed(2)) : 0;
    return {
      month: b.month,
      portfoy: portfolioReturn,
      bist100: b.bist100,
      altin: b.altin,
      btc: b.btc,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground" data-testid="heading-reports">
          Raporlar
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Portföyünüzün detaylı analizini görüntüleyin
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {["hisse", "etf", "kripto", "madeni_para"].map((type) => {
          const total = getTotalByType(type);
          const count = getAssetsByType(type).length;
          return (
            <Card key={type} data-testid={`summary-card-${type}`}>
              <CardContent className="py-4 px-5">
                {assetsLoading ? (
                  <div className="h-12 w-full bg-muted animate-pulse rounded" />
                ) : (
                  <>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {TYPE_NAMES[type]}
                    </div>
                    <div className="text-lg font-bold mt-1">{formatDisplayCurrency(total)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{count} varlık</div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card data-testid="card-allocation-report">
          <CardHeader>
            <CardTitle>Varlık Sınıfı Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            {allocationLoading ? (
              <div className="h-[300px] w-full bg-muted animate-pulse rounded" />
            ) : (
              <AssetAllocationChart data={allocation || []} />
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-benchmark">
          <CardHeader>
            <CardTitle>Benchmark Kıyaslaması</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Portföy vs BIST100 / Altın / Bitcoin — 12 aylık kümülatif % getiri
            </p>
          </CardHeader>
          <CardContent>
            {benchmarkLoading ? (
              <div className="h-[300px] w-full bg-muted animate-pulse rounded" />
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                Kıyaslama verisi yüklenemedi
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const labelMap: Record<string, string> = {
                          portfoy: "Portföyüm",
                          bist100: "BIST100",
                          altin: "Altın",
                          btc: "Bitcoin",
                        };
                        return (
                          <div className="bg-popover border rounded-md p-3 shadow-md text-xs space-y-1">
                            <p className="font-semibold mb-1">{label}</p>
                            {payload.map((p: any) => (
                              <p key={p.dataKey} style={{ color: p.color }}>
                                {labelMap[p.dataKey] || p.dataKey}:{" "}
                                {p.value !== null && p.value !== undefined
                                  ? `${p.value > 0 ? "+" : ""}${p.value}%`
                                  : "—"}
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    formatter={(value) => {
                      const labels: Record<string, string> = {
                        portfoy: "Portföyüm",
                        bist100: "BIST100",
                        altin: "Altın",
                        btc: "Bitcoin",
                      };
                      return labels[value] || value;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="portfoy"
                    name="portfoy"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="bist100"
                    name="bist100"
                    stroke="hsl(142, 71%, 45%)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="altin"
                    name="altin"
                    stroke="hsl(45, 93%, 47%)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="btc"
                    name="btc"
                    stroke="hsl(25, 95%, 53%)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-detailed-breakdown">
        <CardHeader>
          <CardTitle>Detaylı Varlık Dökümü</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="hisse" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="hisse" data-testid="tab-hisse">Hisse</TabsTrigger>
              <TabsTrigger value="etf" data-testid="tab-etf">ETF</TabsTrigger>
              <TabsTrigger value="kripto" data-testid="tab-kripto">Kripto</TabsTrigger>
              <TabsTrigger value="madeni_para" data-testid="tab-madeni-para">Emtia</TabsTrigger>
            </TabsList>
            {["hisse", "etf", "kripto", "madeni_para"].map((type) => (
              <TabsContent key={type} value={type} className="mt-4">
                {assetsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-20 w-full bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getAssetsByType(type).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Bu kategoride varlık bulunmamaktadır
                      </div>
                    ) : (
                      getAssetsByType(type).map((asset) => (
                        <div
                          key={asset.id}
                          className="flex items-center justify-between p-4 border rounded-md"
                          data-testid={`asset-detail-${asset.id}`}
                        >
                          <div>
                            <div className="font-medium">{asset.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {asset.symbol} • {asset.market} • {asset.currency}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {formatAssetValue(asset.totalValue || 0, asset.currency)}
                            </div>
                            <div
                              className={`text-sm ${
                                (asset.change || 0) >= 0 ? "text-success" : "text-destructive"
                              }`}
                            >
                              {(asset.change || 0) >= 0 ? "+" : ""}
                              {(asset.change || 0).toFixed(2)}%
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
