interface BinancePriceResponse {
  symbol: string;
  price: string;
}

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice: number;
        previousClose: number;
      };
    }>;
    error: null | { code: string; description: string };
  };
}

async function fetchYahooPriceInternal(symbol: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      }
    );
    if (!response.ok) return null;
    const data: YahooChartResponse = await response.json();
    if (data.chart.error) return null;
    return data.chart.result?.[0]?.meta?.regularMarketPrice || null;
  } catch {
    return null;
  }
}

async function fetchBinancePriceInternal(symbol: string): Promise<number | null> {
  try {
    const binanceSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "") + "USDT";
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`);
    if (!response.ok) return null;
    const data: BinancePriceResponse = await response.json();
    return parseFloat(data.price);
  } catch {
    return null;
  }
}

async function fetchCoinGeckoPriceInternal(coinId: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
      { headers: { "Accept": "application/json" } }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data[coinId]?.usd || null;
  } catch {
    return null;
  }
}

let cachedRates: Record<string, number> | null = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function fetchExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedRates && now - cacheTime < CACHE_DURATION) {
    return cachedRates;
  }

  const rates: Record<string, number> = { TRY: 1 };

  const usdTry = await fetchYahooPriceInternal("USDTRY=X");
  if (usdTry) rates.USD = usdTry;

  const eurTry = await fetchYahooPriceInternal("EURTRY=X");
  if (eurTry) rates.EUR = eurTry;

  let btcUsd = await fetchBinancePriceInternal("BTC");
  if (!btcUsd) btcUsd = await fetchCoinGeckoPriceInternal("bitcoin");
  if (btcUsd && usdTry) rates.BTC = btcUsd * usdTry;

  let ethUsd = await fetchBinancePriceInternal("ETH");
  if (!ethUsd) ethUsd = await fetchCoinGeckoPriceInternal("ethereum");
  if (ethUsd && usdTry) rates.ETH = ethUsd * usdTry;

  const goldOzUsd = await fetchYahooPriceInternal("GC=F");
  if (goldOzUsd && usdTry) rates.XAU = (goldOzUsd / 31.1035) * usdTry;

  cachedRates = rates;
  cacheTime = now;
  return rates;
}

export function toTRY(amount: number, currency: string, rates: Record<string, number>): number {
  if (currency === "TRY") return amount;
  const rate = rates[currency];
  if (!rate || rate === 0) return amount;
  return amount * rate;
}
