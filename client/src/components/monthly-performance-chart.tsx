import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from "recharts";
import type { MonthlyPerformance } from "@shared/schema";

interface MonthlyPerformanceChartProps {
  data: MonthlyPerformance[];
  referenceValue?: number;
  referenceLabel?: string;
}

export function MonthlyPerformanceChart({
  data,
  referenceValue,
  referenceLabel,
}: MonthlyPerformanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        Performans verisi bulunmamaktadır
      </div>
    );
  }

  const formatTRY = (v: number) =>
    v.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 });

  const formatK = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
    return v.toFixed(0);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0]?.value ?? 0;
      const val2 = payload[1]?.value;
      return (
        <div className="bg-popover border border-popover-border rounded-md p-3 shadow-md space-y-1">
          <p className="font-medium text-xs text-muted-foreground">{payload[0].payload.month}</p>
          <p className="text-sm font-semibold" style={{ color: val >= 0 ? "hsl(158 84% 39%)" : "hsl(0 84% 60%)" }}>
            Bütçe Bakiyesi: {formatTRY(val)}
          </p>
          {val2 !== undefined && (
            <p className="text-sm font-semibold text-primary">
              Toplam Bakiye: {formatTRY(val2)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(158 84% 39%)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="hsl(158 84% 39%)" stopOpacity={0.03} />
          </linearGradient>
          <linearGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(0 84% 60%)" stopOpacity={0.22} />
            <stop offset="95%" stopColor="hsl(0 84% 60%)" stopOpacity={0.03} />
          </linearGradient>
        </defs>

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
          tickFormatter={formatK}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />

        {referenceValue !== undefined && (
          <ReferenceLine
            y={referenceValue}
            stroke="hsl(221 64% 45%)"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: referenceLabel || `Bakiye: ${formatK(referenceValue)}`,
              position: "insideTopRight",
              fontSize: 10,
              fill: "hsl(221 64% 45%)",
            }}
          />
        )}

        <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />

        <Area
          type="monotone"
          dataKey="value"
          stroke={data.some(d => d.value < 0) ? "hsl(0 84% 60%)" : "hsl(158 84% 39%)"}
          strokeWidth={2}
          fill={data.some(d => d.value < 0) ? "url(#gradNeg)" : "url(#gradPos)"}
          dot={{ r: 3, fill: data.some(d => d.value < 0) ? "hsl(0 84% 60%)" : "hsl(158 84% 39%)" }}
          activeDot={{ r: 5 }}
          name="Bütçe Bakiyesi"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
