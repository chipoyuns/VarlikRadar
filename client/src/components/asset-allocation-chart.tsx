import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { AssetAllocation } from "@shared/schema";

interface AssetAllocationChartProps {
  data: AssetAllocation[];
}

const TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  hisse:       { color: "#4B9EFF", label: "Hisse Senedi" },
  etf:         { color: "#00D4AA", label: "ETF" },
  kripto:      { color: "#FFB833", label: "Kripto" },
  gayrimenkul: { color: "#A78BFA", label: "Gayrimenkul" },
  emtia:       { color: "#FF6B6B", label: "Emtia" },
  madeni_para: { color: "#FF8E53", label: "Madeni Para" },
};

export function AssetAllocationChart({ data }: AssetAllocationChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[280px] gap-3">
        <div className="w-32 h-32 rounded-full border-[12px] border-[#151A23] flex items-center justify-center">
          <div className="text-center">
            <p className="text-xs text-[#4E5A6B]">Varlık</p>
            <p className="text-xs text-[#4E5A6B]">yok</p>
          </div>
        </div>
        <p className="text-sm text-[#4E5A6B]">Varlık bulunmamaktadır</p>
      </div>
    );
  }

  const totalValue = data.reduce((s, d) => s + d.value, 0);
  const chartData = data.map(item => ({
    name: TYPE_CONFIG[item.type]?.label || item.name,
    value: item.value,
    percentage: item.percentage,
    type: item.type,
    color: TYPE_CONFIG[item.type]?.color || "#4B9EFF",
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
      <div className="finos-card-inner p-3 shadow-xl text-xs border border-[rgba(255,255,255,0.08)]">
        <p className="font-semibold text-[#F0F2F7] mb-1">{p.name}</p>
        <p style={{ color: p.color }} className="font-mono">
          {p.value.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 })}
        </p>
        <p className="text-[#8892A4] mt-0.5">%{p.percentage.toFixed(1)}</p>
      </div>
    );
  };

  const CenterLabel = () => (
    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
      <tspan x="50%" dy="-8" className="fill-[#8892A4]" style={{ fontSize: 11, fill: "#8892A4" }}>Toplam</tspan>
      <tspan x="50%" dy="20" style={{ fontSize: 13, fontWeight: 700, fill: "#F0F2F7", fontFamily: "monospace" }}>
        {(totalValue / 1000).toFixed(0)}K ₺
      </tspan>
    </text>
  );

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <CenterLabel />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center px-2">
        {chartData.map((entry, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-xs text-[#8892A4]">{entry.name}</span>
            <span className="text-xs font-mono text-[#F0F2F7] font-medium">%{entry.percentage.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
