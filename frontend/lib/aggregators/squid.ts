// Squid Router API Integration - Cross-chain swaps & bridges
// Docs: https://docs.squidrouter.com/

const SQUID_INTEGRATOR_ID = process.env.NEXT_PUBLIC_SQUID_INTEGRATOR_ID || '';
const SQUID_MAINNET_URL = 'https://v2.api.squidrouter.com/v2';
const SQUID_TESTNET_URL = 'https://testnet.api.squidrouter.com/v1';

export interface SquidRoute {
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    sendAmount: string;
    exchangeRate: string;
    aggregatePriceImpact: string;
    estimatedRouteDuration: number;
    isBoostSupported: boolean;
    actions: Array<{
      type: string;
      data: any;
    }>;
    feeCosts: Array<{
      name: string;
      description: string;
      percentage: string;
      token: any;
      amount: string;
      amountUsd: string;
    }>;
    gasCosts: Array<{
      type: string;
      token: any;
      amount: string;
      gasPrice: string;
      maxFeePerGas: string;
      maxPriorityFeePerGas: string;
      estimate: string;
      limit: string;
      amountUsd: string;
    }>;
  };
  transactionRequest: {
    routeType: string;
    target: string;
    data: string;
    value: string;
    gasLimit: string;
    gasPrice: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  };
  params: any;
  requestId?: string;
}

export interface SquidQuoteParams {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  toAddress?: string;
  slippage?: number;
  enableBoost?: boolean;
  quoteOnly?: boolean;
  prefer?: string[];
}

export interface SquidStatusParams {
  transactionId: string;
  requestId?: string;
  fromChainId: string;
  toChainId: string;
}

export class SquidAPI {
  private integratorId: string;
  private baseURL: string;
  private isTestnet: boolean;

  constructor(integratorId?: string, isTestnet: boolean = false) {
    this.integratorId = integratorId || SQUID_INTEGRATOR_ID;
    this.isTestnet = isTestnet;
    this.baseURL = isTestnet ? SQUID_TESTNET_URL : SQUID_MAINNET_URL;

    // Warn if integrator ID is missing
    if (!this.integratorId) {
      console.warn(
        '⚠️ Squid Integrator ID is missing! Add NEXT_PUBLIC_SQUID_INTEGRATOR_ID to your .env.local file.\n' +
        'Get your Integrator ID from: https://v2.app.squidrouter.com/'
      );
    }

    // Info message about testnet mode
    if (isTestnet && typeof window !== 'undefined') {
      console.info(
        '🧪 Squid Router: Running in TESTNET mode\n' +
        `API Endpoint: ${SQUID_TESTNET_URL}\n` +
        'Note: Testnet fills may be slower than mainnet'
      );
    }
  }

  private async request<T>(endpoint: string, method: string = 'GET', body?: any, params?: any): Promise<{ data: T; requestId?: string }> {
    // Check if integrator ID is set
    if (!this.integratorId) {
      throw new Error(
        'Squid Integrator ID is required. Add NEXT_PUBLIC_SQUID_INTEGRATOR_ID to your .env.local file. ' +
        'Get your ID from: https://v2.app.squidrouter.com/'
      );
    }

    let url = `${this.baseURL}${endpoint}`;

    if (params && method === 'GET') {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    }

    const response = await fetch(url, {
      method,
      headers: {
        'x-integrator-id': this.integratorId,
        'Content-Type': 'application/json',
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      // Enhanced error message for missing integrator ID
      if (error.type === 'UNAUTHORIZED' || error.message?.includes('x-integrator-id')) {
        throw new Error(
          'Squid API: Missing or invalid Integrator ID. ' +
          'Please add NEXT_PUBLIC_SQUID_INTEGRATOR_ID to your .env.local file. ' +
          'Get your ID from: https://v2.app.squidrouter.com/'
        );
      }
      
      throw new Error(error.message || `Squid API Error: ${response.status}`);
    }

    const data = await response.json();
    const requestId = response.headers.get('x-request-id') || undefined;

    return { data, requestId };
  }

  async getRoute(params: SquidQuoteParams): Promise<{ route: SquidRoute; requestId?: string }> {
    const result = await this.request<{ route: SquidRoute }>('/route', 'POST', {
      fromAddress: params.fromAddress,
      fromChain: params.fromChain.toString(),
      fromToken: params.fromToken,
      fromAmount: params.fromAmount,
      toChain: params.toChain.toString(),
      toToken: params.toToken,
      toAddress: params.toAddress || params.fromAddress,
      slippage: params.slippage || 1,
      enableBoost: params.enableBoost ?? false,
      quoteOnly: params.quoteOnly ?? false,
      ...(params.prefer && params.prefer.length > 0 && { prefer: params.prefer }),
    });

    return {
      route: result.data.route,
      requestId: result.requestId,
    };
  }

  async getStatus(params: SquidStatusParams): Promise<any> {
    const result = await this.request<any>('/status', 'GET', undefined, {
      transactionId: params.transactionId,
      ...(params.requestId && { requestId: params.requestId }),
      fromChainId: params.fromChainId,
      toChainId: params.toChainId,
    });

    return result.data;
  }

  async getChains(): Promise<any> {
    const result = await this.request<any>('/chains', 'GET');
    return result.data;
  }

  async getTokens(chainId?: number): Promise<any> {
    const params = chainId ? { chainId: chainId.toString() } : undefined;
    const result = await this.request<any>('/tokens', 'GET', undefined, params);
    return result.data;
  }

  async getSDKInfo(): Promise<any> {
    const result = await this.request<any>('/sdk-info', 'GET');
    return result.data;
  }
}

