import { storage } from "../storage";
export { fetchExchangeRates } from "./exchangeRateService";

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

interface TEFASResponse {
  data: Array<{
    TARIH: string;
    FIYAT: string;
    [key: string]: string;
  }>;
}

export async function fetchBinancePrice(symbol: string): Promise<number | null> {
  try {
    const binanceSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "") + "USDT";
    const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`);
    
    if (!response.ok) {
      console.log(`Binance API error for ${symbol}: ${response.status}`);
      return null;
    }
    
    const data: BinancePriceResponse = await response.json();
    return parseFloat(data.price);
  } catch (error) {
    console.error(`Failed to fetch Binance price for ${symbol}:`, error);
    return null;
  }
}

export async function fetchYahooPrice(symbol: string, market: string): Promise<number | null> {
  try {
    let yahooSymbol = symbol;
    
    if (market === "BIST") {
      yahooSymbol = symbol.toUpperCase() + ".IS";
    } else if (market === "US") {
      yahooSymbol = symbol.toUpperCase();
    }
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      }
    );
    
    if (!response.ok) {
      console.log(`Yahoo Finance API error for ${symbol}: ${response.status}`);
      return null;
    }
    
    const data: YahooChartResponse = await response.json();
    
    if (data.chart.error) {
      console.log(`Yahoo Finance error for ${symbol}:`, data.chart.error.description);
      return null;
    }
    
    const result = data.chart.result?.[0];
    if (!result?.meta?.regularMarketPrice) {
      console.log(`No price data for ${symbol}`);
      return null;
    }
    
    return result.meta.regularMarketPrice;
  } catch (error) {
    console.error(`Failed to fetch Yahoo price for ${symbol}:`, error);
    return null;
  }
}

export async function fetchTEFASPrice(symbol: string): Promise<number | null> {
  try {
    const upperSymbol = symbol.toUpperCase();
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://www.tefas.gov.tr/FonAnaliz.aspx",
      "Accept": "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8",
      "X-Requested-With": "XMLHttpRequest",
      "Origin": "https://www.tefas.gov.tr",
    };

    // Try last 10 days across both fund types (YAT = Yatırım Fonu, EMK = Emeklilik Fonu)
    for (let i = 0; i < 10; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      // Skip weekends
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}${month}${day}`;

      for (const fontip of ["YAT", "EMK"]) {
        const url = `https://www.tefas.gov.tr/api/DB/BindHistoryInfo?fontip=${fontip}&sfonkod=${upperSymbol}&bastarih=${dateStr}&bittarih=${dateStr}`;
        try {
          const response = await fetch(url, { headers });

          if (!response.ok) {
            console.log(`TEFAS ${fontip} error for ${symbol} on ${dateStr}: ${response.status}`);
            continue;
          }

          const data: TEFASResponse = await response.json();

          if (data?.data && data.data.length > 0) {
            const price = parseFloat(data.data[0].FIYAT);
            if (!isNaN(price) && price > 0) {
              console.log(`TEFAS price for ${symbol} (${fontip}): ${price} (date: ${dateStr})`);
              return price;
            }
          }
        } catch (innerErr) {
          console.log(`TEFAS fetch failed for ${symbol} ${fontip} ${dateStr}`);
        }
      }
    }

    console.log(`No TEFAS price found for ${symbol}`);
    return null;
  } catch (error) {
    console.error(`Failed to fetch TEFAS price for ${symbol}:`, error);
    return null;
  }
}

export interface PriceUpdateResult {
  assetId: string;
  symbol: string;
  oldPrice: number;
  newPrice: number | null;
  success: boolean;
  error?: string;
}

export async function updateAllAssetPrices(): Promise<PriceUpdateResult[]> {
  const assets = await storage.getAssets();
  const results: PriceUpdateResult[] = [];
  
  for (const asset of assets) {
    const oldPrice = Number(asset.currentPrice) || 0;
    let newPrice: number | null = null;
    let error: string | undefined;
    
    try {
      if (asset.type === "kripto") {
        newPrice = await fetchBinancePrice(asset.symbol);
      } else if (asset.type === "hisse" || asset.type === "etf") {
        newPrice = await fetchYahooPrice(asset.symbol, asset.market);
      } else if (asset.type === "fon") {
        newPrice = await fetchTEFASPrice(asset.symbol);
      } else if (asset.type === "madeni_para") {
        newPrice = oldPrice;
      }
      
      if (newPrice !== null && newPrice > 0) {
        await storage.updateAsset(asset.id, {
          currentPrice: newPrice.toFixed(6),
        });
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Unknown error";
      console.error(`Error updating price for ${asset.symbol}:`, error);
    }
    
    results.push({
      assetId: asset.id,
      symbol: asset.symbol,
      oldPrice,
      newPrice,
      success: newPrice !== null && newPrice > 0,
      error,
    });
  }
  
  return results;
}

export async function fetchSingleAssetPrice(
  symbol: string,
  type: string,
  market: string
): Promise<number | null> {
  if (type === "kripto") {
    return await fetchBinancePrice(symbol);
  } else if (type === "hisse" || type === "etf") {
    return await fetchYahooPrice(symbol, market);
  } else if (type === "fon") {
    return await fetchTEFASPrice(symbol);
  }
  return null;
}
