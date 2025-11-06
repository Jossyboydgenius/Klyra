/**
 * Pricing Engine
 * Calculates on-ramp and off-ramp rates with markup/discount
 */

import { poolExecutor } from './pool-executor';
import type { Token } from '@/lib/chain-data';

export interface PriceQuote {
  // Rates
  externalRate: number; // Rate from external provider (GHS per token)
  yourRate: number; // Your rate with markup/discount (GHS per token)
  markupOrDiscount: number; // Percentage (+1.67% or -1.69%)
  
  // Amounts
  fiatAmount: string; // Amount user will pay/receive
  cryptoAmount: string; // Amount of crypto
  
  // Details
  currency: string;
  tokenSymbol: string;
  chainId: number;
  
  // Swap details (if swapping)
  requiresSwap: boolean;
  estimatedSwapCost?: string;
  
  // Metadata
  timestamp: Date;
  expiresIn?: number; // Quote expires in seconds
}

export interface PricingConfig {
  // Markup for on-ramp (buying from you)
  onRampMarkup: number; // Default: 0.0167 (1.67%)
  
  // Discount for off-ramp (selling to you)
  offRampDiscount: number; // Default: 0.0169 (1.69%)
  
  // External rate provider
  externalRateProvider?: (token: string, currency: string) => Promise<number>;
  
  // Quote expiry
  quoteExpirySeconds: number; // Default: 60
}

/**
 * Calculates pricing for on-ramp and off-ramp operations
 */
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

  /**
   * Get on-ramp price (user buying crypto from you)
   */
  async getOnRampPrice(
    token: Token,
    amount: string,
    currency: string = 'GHS'
  ): Promise<PriceQuote> {
    // Step 1: Get external rate (from external provider)
    const externalRate = await this.getExternalRate(token.symbol, currency);

    // Step 2: Check if swap is needed
    const requiresSwap = await this.requiresSwap(token);

    // Step 3: Calculate base price
    const amountNum = parseFloat(amount);
    const basePrice = amountNum * externalRate;

    // Step 4: Add markup
    const markup = this.config.onRampMarkup;
    const finalPrice = basePrice * (1 + markup);

    return {
      externalRate,
      yourRate: finalPrice / amountNum,
      markupOrDiscount: markup * 100, // Convert to percentage
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

  /**
   * Get off-ramp price (user selling crypto to you)
   */
  async getOffRampPrice(
    token: Token,
    amount: string,
    currency: string = 'GHS'
  ): Promise<PriceQuote> {
    // Step 1: Get external rate (from external provider)
    const externalRate = await this.getExternalRate(token.symbol, currency);

    // Step 2: Check if swap is needed
    const requiresSwap = await this.requiresSwap(token);

    // Step 3: Calculate base price
    const amountNum = parseFloat(amount);
    const basePrice = amountNum * externalRate;

    // Step 4: Apply discount
    const discount = this.config.offRampDiscount;
    const finalPrice = basePrice * (1 - discount);

    return {
      externalRate,
      yourRate: finalPrice / amountNum,
      markupOrDiscount: -discount * 100, // Negative because it's a discount
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

  /**
   * Get external rate from provider
   */
  private async getExternalRate(tokenSymbol: string, currency: string): Promise<number> {
    // Use custom provider if provided
    if (this.config.externalRateProvider) {
      return await this.config.externalRateProvider(tokenSymbol, currency);
    }

    // Default: Use static rates or CoinGecko API
    return await this.getCoinGeckoRate(tokenSymbol, currency);
  }

  /**
   * Get rate from CoinGecko (free API)
   */
  private async getCoinGeckoRate(tokenSymbol: string, currency: string): Promise<number> {
    try {
      // Map token symbols to CoinGecko IDs
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
        `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=${currencyLower}`,
        { next: { revalidate: 60 } } // Cache for 60 seconds
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
      
      // Fallback to fixed rates (GHS specific)
      return this.getFallbackRate(tokenSymbol, currency);
    }
  }

  /**
   * Fallback rates (should be updated regularly)
   */
  private getFallbackRate(tokenSymbol: string, currency: string): number {
    // These are example rates - update based on your needs
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

  /**
   * Check if swap is needed for a token
   */
  private async requiresSwap(token: Token): Promise<boolean> {
    // Check if token is USDC (our base token)
    const usdcAddresses = [
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
      '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Polygon
      '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Optimism
    ];

    const isUSDC = usdcAddresses.some(
      addr => addr.toLowerCase() === token.address.toLowerCase()
    );

    return !isUSDC;
  }

  /**
   * Calculate profit margin for an order
   */
  calculateProfitMargin(quote: PriceQuote): number {
    if (quote.markupOrDiscount > 0) {
      // On-ramp profit
      return parseFloat(quote.fiatAmount) * (quote.markupOrDiscount / 100);
    } else {
      // Off-ramp profit
      return Math.abs(parseFloat(quote.fiatAmount) * (quote.markupOrDiscount / 100));
    }
  }

  /**
   * Validate quote hasn't expired
   */
  isQuoteValid(quote: PriceQuote): boolean {
    if (!quote.expiresIn) return true;

    const now = Date.now();
    const quoteTimestamp = quote.timestamp.getTime();
    const expiryTime = quoteTimestamp + (quote.expiresIn * 1000);

    return now < expiryTime;
  }

  /**
   * Update markup/discount dynamically
   */
  updateMarkup(onRampMarkup: number, offRampDiscount: number): void {
    this.config.onRampMarkup = onRampMarkup;
    this.config.offRampDiscount = offRampDiscount;
  }
}

export const pricingEngine = new PricingEngine();

