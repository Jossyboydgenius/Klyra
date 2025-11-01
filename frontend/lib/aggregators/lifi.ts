// LI.FI API Integration - Cross-chain bridge aggregator
// Docs: https://docs.li.fi/integrate-li.fi-js-sdk/api-reference
// Note: API key is optional - only needed for higher rate limits

const LIFI_API_KEY = process.env.LIFI_API_KEY || '';
const LIFI_BASE_URL = 'https://li.quest/v1';

// Native token addresses (ETH, MATIC, BNB, etc.)
export const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';
export const NATIVE_TOKEN_ADDRESS_ALT = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export interface LiFiRoute {
  id: string;
  fromChainId: number;
  fromAmountUSD: string;
  fromAmount: string;
  fromToken: {
    address: string;
    symbol: string;
    decimals: number;
    chainId: number;
    name: string;
    logoURI: string;
  };
  toChainId: number;
  toAmountUSD: string;
  toAmount: string;
  toAmountMin: string;
  toToken: {
    address: string;
    symbol: string;
    decimals: number;
    chainId: number;
    name: string;
    logoURI: string;
  };
  gasCostUSD: string;
  steps: Array<{
    type: 'lifi' | 'swap' | 'cross';
    tool: string;
    action: any;
    estimate: {
      fromAmount: string;
      toAmount: string;
      toAmountMin: string;
      approvalAddress: string;
      executionDuration: number;
      gasCosts: Array<{
        type: string;
        price: string;
        estimate: string;
        limit: string;
        amount: string;
        amountUSD: string;
        token: any;
      }>;
    };
  }>;
  tags: string[];
}

export interface LiFiQuoteParams {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  toAddress?: string;
  slippage?: number;
  integrator?: string;
  allowBridges?: string[];
  denyBridges?: string[];
}

export class LiFiAPI {
  private baseURL: string;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.baseURL = LIFI_BASE_URL;
    this.apiKey = apiKey || LIFI_API_KEY;

    // Info message about optional API key (only show once)
    if (!this.apiKey && typeof window !== 'undefined') {
      console.info(
        'LI.FI: Running without API key (public rate limits apply).\n' +
        'For higher rate limits, add NEXT_PUBLIC_LIFI_API_KEY to .env.local\n' +
        'Get your key from: https://li.fi/ (Optional!)'
      );
    }
  }

  private async request<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseURL}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add API key header if available (optional)
    if (this.apiKey) {
      headers['x-lifi-api-key'] = this.apiKey;
    }

    const response = await fetch(url.toString(), {
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      // Enhanced error for rate limiting
      if (response.status === 429) {
        throw new Error(
          'LI.FI: Rate limit exceeded. ' +
          (this.apiKey 
            ? 'Consider upgrading your API key limits.' 
            : 'Add NEXT_PUBLIC_LIFI_API_KEY for higher rate limits.')
        );
      }
      
      throw new Error(error.message || `LiFi API Error: ${response.status}`);
    }

    return response.json();
  }

  async getQuote(params: LiFiQuoteParams): Promise<{ routes: LiFiRoute[] }> {
    // Get integrator name from env
    const integratorName = params.integrator || 
                          process.env.LIFI_INTEGRATOR_KEY_STRING || 
                          'klyra';

    // Build options object according to LI.FI docs
    const options: any = {
      slippage: params.slippage || 0.005,
      integrator: integratorName,
      order: 'CHEAPEST',
      maxPriceImpact: 0.1,
    };

    // Add bridge filters if provided
    if (params.allowBridges && params.allowBridges.length > 0) {
      options.bridges = { allow: params.allowBridges };
    }
    if (params.denyBridges && params.denyBridges.length > 0) {
      options.bridges = { ...options.bridges, deny: params.denyBridges };
    }

    // Build request body for POST request
    const requestBody: any = {
      fromChainId: params.fromChain,
      toChainId: params.toChain,
      fromTokenAddress: params.fromToken,
      toTokenAddress: params.toToken,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
      toAddress: params.toAddress || params.fromAddress,
      options,
    };

    // Make POST request with JSON body
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['x-lifi-api-key'] = this.apiKey;
    }

    const response = await fetch(`${this.baseURL}/advanced/routes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      // Enhanced error for rate limiting
      if (response.status === 429) {
        throw new Error(
          'LI.FI: Rate limit exceeded. ' +
          (this.apiKey 
            ? 'Consider upgrading your API key limits.' 
            : 'Add NEXT_PUBLIC_LIFI_API_KEY for higher rate limits.')
        );
      }
      
      throw new Error(error.message || `LiFi API Error: ${response.status}`);
    }

    return response.json();
  }

  async getStatus(txHash: string, bridge: string, fromChain: number, toChain: number): Promise<any> {
    return this.request('/status', {
      txHash,
      bridge,
      fromChain,
      toChain,
    });
  }

  async getTools(): Promise<any> {
    return this.request('/tools');
  }

  async getChains(): Promise<any> {
    return this.request('/chains');
  }

  async getTokens(params?: { chains?: number[] }): Promise<any> {
    return this.request('/tokens', params);
  }

  async getConnections(params: { fromChain: number; toChain: number }): Promise<any> {
    return this.request('/connections', {
      fromChainId: params.fromChain,
      toChainId: params.toChain,
    });
  }

  async testApiKey(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      await this.request('/keys/test');
      return true;
    } catch {
      return false;
    }
  }

  async getGasPrice(chainId: number): Promise<any> {
    return this.request(`/gas/prices/${chainId}`);
  }
}

export const lifiAPI = new LiFiAPI();

/**
 * Check if an address is a native token
 */
export function isNativeTokenAddress(address: string): boolean {
  const addr = address.toLowerCase();
  return (
    addr === NATIVE_TOKEN_ADDRESS.toLowerCase() ||
    addr === NATIVE_TOKEN_ADDRESS_ALT.toLowerCase()
  );
}

