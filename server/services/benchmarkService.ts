interface YahooChartHistoricalResponse {
  chart: {
    result: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          close: (number | null)[];
        }>;
      };
    }> | null;
    error: null | { code: string; description: string };
  };
}

async function fetchYahooMonthly(symbol: string): Promise<{ timestamps: number[]; closes: number[] }> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1mo&range=1y`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      }
    );
    if (!response.ok) return { timestamps: [], closes: [] };
    const data: YahooChartHistoricalResponse = await response.json();
    const result = data.chart.result?.[0];
    if (!result) return { timestamps: [], closes: [] };
    const closes = result.indicators.quote[0].close;
    const validCloses = closes.map((c) => (c !== null && c !== undefined ? c : 0));
    return { timestamps: result.timestamp, closes: validCloses };
  } catch {
    return { timestamps: [], closes: [] };
  }
}

async function fetchBTCMonthly(): Promise<{ timestamps: number[]; closes: number[] }> {
  try {
    const response = await fetch("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1M&limit=13");
    if (!response.ok) return { timestamps: [], closes: [] };
    const data: any[][] = await response.json();
    return {
      timestamps: data.map((k) => Number(k[0])),
      closes: data.map((k) => parseFloat(k[4])),
    };
  } catch {
    return { timestamps: [], closes: [] };
  }
}

function mapToMonths(timestamps: number[], closes: number[], isBinanceMs = false): Record<string, number> {
  const result: Record<string, number> = {};
  timestamps.forEach((ts, idx) => {
    const d = new Date(isBinanceMs ? ts : ts * 1000);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (closes[idx] && closes[idx] > 0) {
      result[key] = closes[idx];
    }
  });
  return result;
}

export interface BenchmarkPoint {
  month: string;
  bist100: number | null;
  altin: number | null;
  btc: number | null;
}

const MONTHS_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

export async function fetchBenchmarkData(): Promise<BenchmarkPoint[]> {
  const [bist100, gold, btcData] = await Promise.all([
    fetchYahooMonthly("^XU100.IS"),
    fetchYahooMonthly("GC=F"),
    fetchBTCMonthly(),
  ]);

  const bist100Map = mapToMonths(bist100.timestamps, bist100.closes, false);
  const goldMap = mapToMonths(gold.timestamps, gold.closes, false);
  const btcMap = mapToMonths(btcData.timestamps, btcData.closes, true);

  const now = new Date();
  const result: BenchmarkPoint[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    result.push({
      month: MONTHS_TR[d.getMonth()],
      bist100: bist100Map[key] ?? null,
      altin: goldMap[key] ?? null,
      btc: btcMap[key] ?? null,
    });
  }

  const normalize = (field: "bist100" | "altin" | "btc") => {
    const firstNonNull = result.find((r) => r[field] !== null && r[field]! > 0)?.[field] ?? null;
    if (firstNonNull === null || firstNonNull === 0) return;
    result.forEach((r) => {
      if (r[field] !== null && r[field]! > 0) {
        r[field] = parseFloat((((r[field]! - firstNonNull) / firstNonNull) * 100).toFixed(2));
      }
    });
  };

  normalize("bist100");
  normalize("altin");
  normalize("btc");

  return result;
}
