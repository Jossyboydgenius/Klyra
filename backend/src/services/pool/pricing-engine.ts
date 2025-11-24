export interface PriceQuote {
  externalRate: number;
  yourRate: number;
  markupOrDiscount: number;
  fiatAmount: string;
  cryptoAmount: string;
  currency: string;
  tokenSymbol: string;
  chainId: number;
  requiresSwap: boolean;
  estimatedSwapCost?: string;
  timestamp: Date;
  expiresIn?: number;
}

export interface PricingConfig {
  onRampMarkup: number;
  offRampDiscount: number;
  externalRateProvider?: (token: string, currency: string) => Promise<number>;
  quoteExpirySeconds: number;
}

export class PricingEngine {
  private config: PricingConfig;

  constructor(config?: Partial<PricingConfig>) {
    this.config = {
      onRampMarkup: config?.onRampMarkup || 0.0167,
      offRampDiscount: config?.offRampDiscount || 0.0169,
      externalRateProvider: config?.externalRateProvider,
      quoteExpirySeconds: config?.quoteExpirySeconds || 60,
    };
  }

  async getOnRampPrice(
    token: any,
    amount: string,
    currency: string = 'GHS'
  ): Promise<PriceQuote> {
    const externalRate = await this.getExternalRate(token.symbol, currency);
    const requiresSwap = await this.requiresSwap(token);

    const amountNum = parseFloat(amount);
    const basePrice = amountNum * externalRate;

    const markup = this.config.onRampMarkup;
    const finalPrice = basePrice * (1 + markup);

    return {
      externalRate,
      yourRate: finalPrice / amountNum,
      markupOrDiscount: markup * 100,
      fiatAmount: finalPrice.toFixed(2),
      cryptoAmount: amount,
      currency,
      tokenSymbol: token.symbol,
      chainId: token.chainId,
      requiresSwap,
      timestamp: new Date(),
      expiresIn: this.config.quoteExpirySeconds,
    };
  }

  async getOffRampPrice(
    token: any,
    amount: string,
    currency: string = 'GHS'
  ): Promise<PriceQuote> {
    const externalRate = await this.getExternalRate(token.symbol, currency);
    const requiresSwap = await this.requiresSwap(token);

    const amountNum = parseFloat(amount);
    const basePrice = amountNum * externalRate;

    const discount = this.config.offRampDiscount;
    const finalPrice = basePrice * (1 - discount);

    return {
      externalRate,
      yourRate: finalPrice / amountNum,
      markupOrDiscount: -discount * 100,
      fiatAmount: finalPrice.toFixed(2),
      cryptoAmount: amount,
      currency,
      tokenSymbol: token.symbol,
      chainId: token.chainId,
      requiresSwap,
      timestamp: new Date(),
      expiresIn: this.config.quoteExpirySeconds,
    };
  }

  private async getExternalRate(tokenSymbol: string, currency: string): Promise<number> {
    if (this.config.externalRateProvider) {
      return await this.config.externalRateProvider(tokenSymbol, currency);
    }

    return await this.getCoinGeckoRate(tokenSymbol, currency);
  }

  private async getCoinGeckoRate(tokenSymbol: string, currency: string): Promise<number> {
    try {
      const tokenMap: Record<string, string> = {
        'USDC': 'usd-coin',
        'USDT': 'tether',
        'DAI': 'dai',
        'ETH': 'ethereum',
        'BTC': 'bitcoin',
        'MATIC': 'matic-network',
      };

      const coingeckoId = tokenMap[tokenSymbol.toUpperCase()] || tokenSymbol.toLowerCase();
      const currencyLower = currency.toLowerCase();

      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=${currencyLower}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch rate from CoinGecko');
      }

      const data = await response.json();
      const rate = data[coingeckoId]?.[currencyLower];

      if (!rate) {
        throw new Error(`No rate found for ${tokenSymbol} in ${currency}`);
      }

      return rate;
    } catch (error) {
      console.error('CoinGecko rate fetch error:', error);
      return this.getFallbackRate(tokenSymbol, currency);
    }
  }

  private getFallbackRate(tokenSymbol: string, currency: string): number {
    const rates: Record<string, Record<string, number>> = {
      GHS: {
        'USDC': 12.0,
        'USDT': 12.0,
        'DAI': 12.0,
        'ETH': 36000,
        'BTC': 540000,
      },
      USD: {
        'USDC': 1.0,
        'USDT': 1.0,
        'DAI': 1.0,
        'ETH': 3000,
        'BTC': 45000,
      },
    };

    return rates[currency]?.[tokenSymbol.toUpperCase()] || 1;
  }

  private async requiresSwap(token: any): Promise<boolean> {
    const usdcAddresses = [
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    ];

    const isUSDC = usdcAddresses.some(
      addr => addr.toLowerCase() === token.address.toLowerCase()
    );

    return !isUSDC;
  }

  calculateProfitMargin(quote: PriceQuote): number {
    if (quote.markupOrDiscount > 0) {
      return parseFloat(quote.fiatAmount) * (quote.markupOrDiscount / 100);
    } else {
      return Math.abs(parseFloat(quote.fiatAmount) * (quote.markupOrDiscount / 100));
    }
  }

  isQuoteValid(quote: PriceQuote): boolean {
    if (!quote.expiresIn) return true;

    const now = Date.now();
    const quoteTimestamp = quote.timestamp.getTime();
    const expiryTime = quoteTimestamp + (quote.expiresIn * 1000);

    return now < expiryTime;
  }

  updateMarkup(onRampMarkup: number, offRampDiscount: number): void {
    this.config.onRampMarkup = onRampMarkup;
    this.config.offRampDiscount = offRampDiscount;
  }
}

export const pricingEngine = new PricingEngine();

