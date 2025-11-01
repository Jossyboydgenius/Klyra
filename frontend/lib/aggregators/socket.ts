// Socket API Integration - Multi-bridge aggregator
// Docs: https://docs.socket.tech/socket-api/v2

const SOCKET_API_KEY = process.env.NEXT_PUBLIC_SOCKET_API_KEY || '';
const SOCKET_BASE_URL = 'https://api.socket.tech/v2';

export interface SocketRoute {
  routeId: string;
  fromChainId: number;
  fromAsset: {
    address: string;
    symbol: string;
    decimals: number;
  };
  toChainId: number;
  toAsset: {
    address: string;
    symbol: string;
    decimals: number;
  };
  fromAmount: string;
  toAmount: string;
  userTxs: Array<{
    userTxType: string;
    txType: string;
    chainId: number;
    txTarget: string;
    txData: string;
    value: string;
    approvalData: any;
  }>;
  totalGasFeesInUsd: number;
  recipient: string;
  totalUserTx: number;
  serviceTime: number; // seconds
  integratorFee: {
    amount: string;
    asset: any;
  };
}

export interface SocketQuoteParams {
  fromChainId: number;
  fromTokenAddress: string;
  toChainId: number;
  toTokenAddress: string;
  fromAmount: string;
  userAddress: string;
  recipient?: string;
  uniqueRoutesPerBridge?: boolean;
  sort?: 'output' | 'gas' | 'time';
  singleTxOnly?: boolean;
}

export class SocketAPI {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || SOCKET_API_KEY;
    this.baseURL = SOCKET_BASE_URL;

    // Warn if API key is missing
    if (!this.apiKey) {
      console.warn(
        ' Socket API Key is missing! Add NEXT_PUBLIC_SOCKET_API_KEY to your .env.local file.\n' +
        'Get your API Key from: https://socket.tech/dashboard'
      );
    }
  }

  private async request<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    // Check if API key is set
    if (!this.apiKey) {
      throw new Error(
        'Socket API Key is required. Add NEXT_PUBLIC_SOCKET_API_KEY to your .env.local file. ' +
        'Get your key from: https://socket.tech/dashboard'
      );
    }

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
        'API-KEY': this.apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      // Enhanced error message for missing/invalid API key
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          'Socket API: Missing or invalid API Key. ' +
          'Please add NEXT_PUBLIC_SOCKET_API_KEY to your .env.local file. ' +
          'Get your key from: https://socket.tech/dashboard'
        );
      }
      
      throw new Error(error.message || `Socket API Error: ${response.status}`);
    }

    return response.json();
  }

  async getQuote(params: SocketQuoteParams): Promise<{ result: { routes: SocketRoute[] } }> {
    return this.request('/quote', {
      fromChainId: params.fromChainId,
      fromTokenAddress: params.fromTokenAddress,
      toChainId: params.toChainId,
      toTokenAddress: params.toTokenAddress,
      fromAmount: params.fromAmount,
      userAddress: params.userAddress,
      recipient: params.recipient || params.userAddress,
      uniqueRoutesPerBridge: params.uniqueRoutesPerBridge ?? true,
      sort: params.sort || 'output',
      singleTxOnly: params.singleTxOnly ?? false,
    });
  }

  async buildTx(route: SocketRoute): Promise<any> {
    return this.request('/build-tx', {
      route: JSON.stringify(route),
    });
  }

  async getStatus(transactionHash: string, fromChainId: number, toChainId: number): Promise<any> {
    return this.request('/bridge-status', {
      transactionHash,
      fromChainId,
      toChainId,
    });
  }

  async getSupportedBridges(): Promise<any> {
    return this.request('/supported/bridges');
  }

  async getTokenList(chainId: number): Promise<any> {
    return this.request('/token-lists/from-token-list', {
      fromChainId: chainId,
      toChainId: chainId,
    });
  }
}

export const socketAPI = new SocketAPI();

