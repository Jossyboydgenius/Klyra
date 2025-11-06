/**
 * Price Service
 * Fetches real-time crypto prices and fiat exchange rates
 */

interface CryptoPrice {
  symbol: string;
  price_usd: number;
  price_ghs?: number;
  change_24h?: number;
}

interface FiatRates {
  NGN: number; // 1 USD = X NGN
  GHS: number; // 1 USD = X GHS
  KES: number; // 1 USD = X KES
}

// Cache for prices (5 minutes)
const PRICE_CACHE_DURATION = 5 * 60 * 1000;
let priceCache: {
  crypto: Map<string, { data: CryptoPrice; timestamp: number }>;
  fiat: { data: FiatRates; timestamp: number } | null;
} = {
  crypto: new Map(),
  fiat: null,
};

/**
 * Get crypto price from CoinGecko API
 * Free tier: 10-50 calls/minute
 */
export async function getCryptoPrice(symbol: string): Promise<CryptoPrice | null> {
  // Check cache first
  const cached = priceCache.crypto.get(symbol);
  if (cached && Date.now() - cached.timestamp < PRICE_CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Map token symbols to CoinGecko IDs
    const coinGeckoIds: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'USDT': 'tether',
      'USDC': 'usd-coin',
      'DAI': 'dai',
      'MATIC': 'matic-network',
      'AVAX': 'avalanche-2',
      'OP': 'optimism',
      'ARB': 'arbitrum',
      'WXRP': 'ripple',
      'WCT': 'walletconnect', // May need adjustment
    };

    const coinId = coinGeckoIds[symbol.toUpperCase()];
    if (!coinId) {
      console.warn(`No CoinGecko ID found for ${symbol}`);
      return null;
    }

    // CoinGecko API (free tier, no API key needed for basic calls)
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const coinData = data[coinId];

    if (!coinData) {
      return null;
    }

    const price: CryptoPrice = {
      symbol: symbol.toUpperCase(),
      price_usd: coinData.usd || 0,
      change_24h: coinData.usd_24h_change || 0,
    };

    // Cache the result
    priceCache.crypto.set(symbol.toUpperCase(), {
      data: price,
      timestamp: Date.now(),
    });

    return price;
  } catch (error) {
    console.error(`Error fetching crypto price for ${symbol}:`, error);
    // Return cached value if available, even if expired
    if (cached) {
      return cached.data;
    }
    return null;
  }
}

/**
 * Get multiple crypto prices at once
 */
export async function getCryptoPrices(symbols: string[]): Promise<Map<string, CryptoPrice>> {
  const prices = new Map<string, CryptoPrice>();
  
  // Fetch all prices in parallel
  const promises = symbols.map(async (symbol) => {
    const price = await getCryptoPrice(symbol);
    if (price) {
      prices.set(symbol.toUpperCase(), price);
    }
  });

  await Promise.all(promises);
  return prices;
}

/**
 * Get fiat exchange rates (USD to African currencies)
 * Using exchangerate-api.com (free tier: 1,500 requests/month)
 * Alternative: fixer.io, currencyapi.net, or exchangerate.host
 */
export async function getFiatRates(): Promise<FiatRates | null> {
  // Check cache first
  if (priceCache.fiat && Date.now() - priceCache.fiat.timestamp < PRICE_CACHE_DURATION) {
    return priceCache.fiat.data;
  }

  try {
    // Option 1: exchangerate-api.com (free, no API key needed)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }

    const data = await response.json();

    const rates: FiatRates = {
      NGN: data.rates?.NGN || 1500, // Fallback to approximate rate
      GHS: data.rates?.GHS || 12.5,
      KES: data.rates?.KES || 130,
    };

    // Cache the result
    priceCache.fiat = {
      data: rates,
      timestamp: Date.now(),
    };

    return rates;
  } catch (error) {
    console.error('Error fetching fiat exchange rates:', error);
    // Return cached value if available, even if expired
    if (priceCache.fiat) {
      return priceCache.fiat.data;
    }
    // Return fallback rates
    return {
      NGN: 1500,
      GHS: 12.5,
      KES: 130,
    };
  }
}

/**
 * Get price for a token with fallback to static data
 */
export async function getTokenPriceWithFallback(symbol: string, fallbackPrice?: number): Promise<number> {
  const price = await getCryptoPrice(symbol);
  if (price && price.price_usd > 0) {
    return price.price_usd;
  }
  return fallbackPrice || 0;
}

/**
 * Convert USD to local currency
 */
export async function convertUSDToLocal(usdAmount: number, currency: 'NGN' | 'GHS' | 'KES'): Promise<number> {
  const rates = await getFiatRates();
  if (!rates) {
    // Fallback rates
    const fallbackRates = { NGN: 1500, GHS: 12.5, KES: 130 };
    return usdAmount * fallbackRates[currency];
  }
  return usdAmount * rates[currency];
}

/**
 * Convert local currency to USD
 */
export async function convertLocalToUSD(localAmount: number, currency: 'NGN' | 'GHS' | 'KES'): Promise<number> {
  const rates = await getFiatRates();
  if (!rates) {
    // Fallback rates
    const fallbackRates = { NGN: 1500, GHS: 12.5, KES: 130 };
    return localAmount / fallbackRates[currency];
  }
  return localAmount / rates[currency];
}

/**
 * Clear price cache (useful for testing or forced refresh)
 */
export function clearPriceCache() {
  priceCache.crypto.clear();
  priceCache.fiat = null;
}

