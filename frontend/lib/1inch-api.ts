// 1inch API Client and Types
// API Documentation: https://portal.1inch.dev/documentation/apis/swap/introduction

const ONEINCH_API_KEY = process.env.NEXT_PUBLIC_ONEINCH_API_KEY || '4EAD4NDFu9VP2WLW9hl27D8b1yAHhCpF';
const ONEINCH_BASE_URL = 'https://api.1inch.com';

// Types
export interface Token1inch {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI: string;
  domainVersion?: string;
  eip2612?: boolean;
  isFoT?: boolean;
  tags?: string[];
}

export interface Protocol {
  name: string;
  part: number;
  fromTokenAddress?: string;
  toTokenAddress?: string;
}

export interface QuoteResponse {
  srcToken: Token1inch;
  dstToken: Token1inch;
  dstAmount: string;
  protocols?: Protocol[][];
  gas?: number;
  estimatedGas?: number;
}

export interface SwapTransaction {
  from: string;
  to: string;
  data: string;
  value: string;
  gasPrice: string;
  gas: number;
}

export interface SwapResponse extends QuoteResponse {
  tx: SwapTransaction;
}

export interface ApproveCallData {
  data: string;
  gasPrice: string;
  to: string;
  value: string;
}

export interface LiquiditySource {
  id: string;
  title: string;
  img: string;
  img_color: string;
}

export interface FusionQuotePreset {
  auctionDuration: number;
  startAuctionIn: number;
  initialRateBump: number;
  auctionStartAmount: string;
  auctionEndAmount: string;
  points: Array<{
    delay: number;
    coefficient: number;
  }>;
  allowPartialFills: boolean;
  allowMultipleFills: boolean;
  gasCost: {
    gasBumpEstimate: number;
    gasPriceEstimate: string;
  };
}

export interface FusionQuoteResponse {
  quoteId: string;
  srcTokenAmount: string;
  dstTokenAmount: string;
  presets: {
    fast: FusionQuotePreset;
    medium: FusionQuotePreset;
    slow: FusionQuotePreset;
  };
  recommendedPreset: 'fast' | 'medium' | 'slow' | 'custom';
  prices: {
    usd: {
      srcToken: string;
      dstToken: string;
    };
  };
  volume: {
    usd: {
      srcToken: string;
      dstToken: string;
    };
  };
}

// API Client
export class OneInchAPI {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || ONEINCH_API_KEY;
    this.baseURL = ONEINCH_BASE_URL;
  }

  private async request<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.description || error.error || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // Get quote for same-chain swap
  async getQuote(params: {
    chainId: number;
    src: string;
    dst: string;
    amount: string;
    protocols?: string;
    fee?: number;
    gasPrice?: string;
    includeTokensInfo?: boolean;
    includeProtocols?: boolean;
    includeGas?: boolean;
  }): Promise<QuoteResponse> {
    const { chainId, ...queryParams } = params;
    return this.request<QuoteResponse>(
      `/swap/v6.1/${chainId}/quote`,
      {
        ...queryParams,
        includeTokensInfo: true,
        includeProtocols: true,
        includeGas: true,
      }
    );
  }

  // Generate swap calldata
  async getSwap(params: {
    chainId: number;
    src: string;
    dst: string;
    amount: string;
    from: string;
    origin: string;
    slippage: number;
    protocols?: string;
    fee?: number;
    gasPrice?: string;
    includeTokensInfo?: boolean;
    includeProtocols?: boolean;
    includeGas?: boolean;
    disableEstimate?: boolean;
    allowPartialFill?: boolean;
  }): Promise<SwapResponse> {
    const { chainId, ...queryParams } = params;
    return this.request<SwapResponse>(
      `/swap/v6.1/${chainId}/swap`,
      {
        ...queryParams,
        includeTokensInfo: true,
        includeProtocols: true,
        includeGas: true,
      }
    );
  }

  // Get cross-chain quote using Fusion+
  async getFusionQuote(params: {
    srcChain: number;
    dstChain: number;
    srcTokenAddress: string;
    dstTokenAddress: string;
    amount: string;
    walletAddress: string;
    enableEstimate?: boolean;
    fee?: number;
    source?: string;
  }): Promise<FusionQuoteResponse> {
    return this.request<FusionQuoteResponse>(
      '/fusion-plus/quoter/v1.1/quote/receive',
      {
        ...params,
        enableEstimate: params.enableEstimate ?? false,
        source: params.source ?? '1', // Default source to '1'
      }
    );
  }

  // Generate approve calldata
  async getApproveCalldata(params: {
    chainId: number;
    tokenAddress: string;
    amount?: string;
  }): Promise<ApproveCallData> {
    const { chainId, ...queryParams } = params;
    return this.request<ApproveCallData>(
      `/swap/v6.1/${chainId}/approve/transaction`,
      queryParams
    );
  }

  // Get available tokens for a chain
  async getTokens(chainId: number): Promise<{ tokens: Record<string, Token1inch> }> {
    return this.request(`/swap/v6.1/${chainId}/tokens`);
  }

  // Get available liquidity sources
  async getLiquiditySources(chainId: number): Promise<{ protocols: LiquiditySource[] }> {
    return this.request(`/swap/v6.1/${chainId}/liquidity-sources`);
  }
}

// Singleton instance
export const oneInchAPI = new OneInchAPI();

// Helper functions
export function formatAmount(amount: string, decimals: number): string {
  return (BigInt(amount) / BigInt(10 ** decimals)).toString();
}

export function parseAmount(amount: string, decimals: number): string {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole + paddedFraction).toString();
}

export function calculatePriceImpact(
  srcAmount: string,
  dstAmount: string,
  srcPrice: string,
  dstPrice: string
): number {
  const srcValue = parseFloat(srcAmount) * parseFloat(srcPrice);
  const dstValue = parseFloat(dstAmount) * parseFloat(dstPrice);
  return ((srcValue - dstValue) / srcValue) * 100;
}

// Check if swap is cross-chain
export function isCrossChainSwap(srcChainId: number, dstChainId: number): boolean {
  return srcChainId !== dstChainId;
}

// Get native token address for chain (0xeeee... format that 1inch uses)
export function getNativeTokenAddress(): string {
  return '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
}

// Format gas cost
export function formatGasCost(gas: number, gasPrice: string): string {
  const gasCost = BigInt(gas) * BigInt(gasPrice);
  const gasCostInEth = Number(gasCost) / 1e18;
  return gasCostInEth.toFixed(6);
}

