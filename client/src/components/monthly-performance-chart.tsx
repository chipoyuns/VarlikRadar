import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
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
      <div className="flex items-center justify-center h-[300px] text-[#4E5A6B] text-sm">
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

  const hasNeg = data.some(d => d.value < 0);
  const lineColor = hasNeg ? "#FF4757" : "#00D4AA";

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const val = payload[0]?.value ?? 0;
    return (
      <div className="bg-[#1A1F2E] border border-[rgba(255,255,255,0.1)] rounded-xl p-3 shadow-xl">
        <p className="text-xs text-[#8892A4] mb-1">{payload[0].payload.month}</p>
        <p className="text-sm font-semibold font-mono" style={{ color: val >= 0 ? "#00D4AA" : "#FF4757" }}>
          {formatTRY(val)}
        </p>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#00D4AA" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#FF4757" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#FF4757" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />

        <XAxis
          dataKey="month"
          tick={{ fill: "#F0F2F7", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
        />
        <YAxis
          tick={{ fill: "#F0F2F7", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatK}
          width={50}
        />

        <Tooltip content={<CustomTooltip />} />

        {referenceValue !== undefined && (
          <ReferenceLine
            y={referenceValue}
            stroke="#4B9EFF"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: referenceLabel || formatK(referenceValue),
              position: "insideTopRight",
              fontSize: 10,
              fill: "#4B9EFF",
            }}
          />
        )}

        <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

        <Area
          type="monotone"
          dataKey="value"
          stroke={lineColor}
          strokeWidth={2.5}
          fill={hasNeg ? "url(#gradNeg)" : "url(#gradPos)"}
          dot={false}
          activeDot={{ r: 5, fill: lineColor, stroke: "#080A0F", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
