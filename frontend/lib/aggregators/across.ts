
export const ACROSS_INTEGRATOR_ID = process.env.NEXT_PUBLIC_ACROSS_INTEGRATOR_ID || '';
export const ACROSS_MAINNET_URL = 'https://app.across.to/api';
export const ACROSS_TESTNET_URL = 'https://testnet.across.to/api';

// ==================== TYPES ====================

export type TradeType = 'exactInput' | 'minOutput' | 'exactOutput';

export type DepositStatus = 'filled' | 'pending' | 'expired' | 'refunded' | 'slowFillRequested';

export type CrossSwapType = 
  | 'BRIDGEABLE_TO_BRIDGEABLE'
  | 'BRIDGEABLE_TO_ANY'
  | 'ANY_TO_BRIDGEABLE'
  | 'ANY_TO_ANY';

export interface AcrossToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoURI?: string;
}

export interface AcrossGasCost {
  type: string;
  price: string;
  estimate: string;
  limit: string;
  amount: string;
  amountUsd: string;
  token: AcrossToken;
}

export interface AcrossFeeCost {
  name: string;
  description?: string;
  percentage: string;
  token: AcrossToken;
  amount: string;
  amountUsd: string;
  included?: boolean;
}

export interface AcrossFees {
  total: {
    amount: string;
    amountUsd: string;
    pct: string;
    token: AcrossToken;
  };
  originGas: {
    amount: string;
    amountUsd: string;
    token: AcrossToken;
  };
  destinationGas: {
    amount: string;
    amountUsd: string;
    pct: string;
    token: AcrossToken;
  };
  relayerCapital: {
    amount: string;
    amountUsd: string;
    pct: string;
    token: AcrossToken;
  };
  lpFee: {
    amount: string;
    amountUsd: string;
    pct: string;
    token: AcrossToken;
  };
  relayerTotal: {
    amount: string;
    amountUsd: string;
    pct: string;
    token: AcrossToken;
  };
  app?: {
    amount: string;
    amountUsd: string;
    pct: string;
    token: AcrossToken;
  };
}

export interface AcrossSwapQuote {
  crossSwapType: CrossSwapType;
  amountType: string;
  checks: {
    allowance: {
      token: string;
      spender: string;
      actual: string;
      expected: string;
    };
    balance: {
      token: string;
      actual: string;
      expected: string;
    };
  };
  steps: {
    bridge: {
      inputAmount: string;
      outputAmount: string;
      tokenIn: AcrossToken;
      tokenOut: AcrossToken;
      fees: {
        totalRelay: { pct: string; total: string };
        relayerCapital: { pct: string; total: string };
        relayerGas: { pct: string; total: string };
        lp: { pct: string; total: string };
      };
    };
    destinationSwap?: {
      tokenIn: AcrossToken;
      tokenOut: AcrossToken;
      inputAmount: string;
      maxInputAmount: string;
      outputAmount: string;
      minOutputAmount: string;
      swapProvider: {
        name: string;
        sources: string[];
      };
    };
  };
  inputToken: AcrossToken;
  outputToken: AcrossToken;
  refundToken: AcrossToken;
  fees: AcrossFees;
  inputAmount: string;
  expectedOutputAmount: string;
  minOutputAmount: string;
  expectedFillTime: number;
  swapTx: {
    simulationSuccess: boolean;
    chainId: number;
    to: string;
    data: string;
    gas: string;
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
    value?: string;
  };
  approvalTxns?: Array<{
    chainId: number;
    to: string;
    data: string;
    value: string;
    gasLimit?: string;
  }>;
  id: string;
}

export interface AcrossDepositStatus {
  status: DepositStatus;
  fillTxnRef?: string;
  destinationChainId: number;
  originChainId: number;
  depositId: number;
  depositTxnRef: string;
  depositRefundTxnRef?: string;
  actionsSucceeded?: boolean;
  pagination?: {
    currentIndex: number;
    maxIndex: number;
  };
}

export interface AcrossTransferLimits {
  minDeposit: string;
  maxDeposit: string;
  maxDepositInstant: string;
  maxDepositShortDelay: string;
  recommendedDepositInstant: string;
}

export interface AcrossSuggestedFees {
  totalRelayFee: {
    pct: string;
    total: string;
  };
  relayerCapitalFee: {
    pct: string;
    total: string;
  };
  relayerGasFee: {
    pct: string;
    total: string;
  };
  lpFee: {
    pct: string;
    total: string;
  };
  timestamp: string;
  isAmountTooLow: boolean;
  quoteBlock: string;
  spokePoolAddress: string;
  exclusiveRelayer: string;
  exclusivityDeadline: string;
  expectedFillTimeSec: string;
  fillDeadline: string;
  limits: AcrossTransferLimits;
}

export interface AcrossAvailableRoute {
  originChainId: string;
  destinationChainId: string;
  originToken: string;
  destinationToken: string;
  originTokenSymbol: string;
  destinationTokenSymbol: string;
}

export interface AcrossChain {
  chainId: number;
  name: string;
  logoURI?: string;
}

// ==================== API PARAMS ====================

export interface AcrossSwapQuoteParams {
  tradeType: TradeType;
  amount: string;
  inputToken: string;
  outputToken: string;
  originChainId: number;
  destinationChainId: number;
  depositor: string;
  recipient?: string;
  appFee?: number;
  appFeeRecipient?: string;
  integratorId?: string;
  refundAddress?: string;
  refundOnOrigin?: boolean;
  slippage?: number;
  skipOriginTxEstimation?: boolean;
  strictTradeType?: boolean;
  excludeSources?: string[];
  includeSources?: string[];
}

export interface AcrossDepositStatusParams {
  originChainId?: number;
  depositId?: number;
  depositTxnRef?: string;
}

export interface AcrossDepositsParams {
  depositor: string;
  limit?: number;
  skip?: number;
}

export interface AcrossSuggestedFeesParams {
  inputToken: string;
  outputToken: string;
  originChainId: number;
  destinationChainId: number;
  amount: string;
  recipient?: string;
  message?: string;
  relayer?: string;
  timestamp?: number;
}

export interface AcrossLimitsParams {
  inputToken: string;
  outputToken: string;
  originChainId: number;
  destinationChainId: number;
}

export interface AcrossAvailableRoutesParams {
  originChainId?: number;
  destinationChainId?: number;
  originToken?: string;
  destinationToken?: string;
}

// ==================== API CLIENT ====================

export class AcrossAPI {
  private integratorId: string;
  private baseURL: string;
  private isTestnet: boolean;

  constructor(integratorId?: string, isTestnet: boolean = false) {
    this.integratorId = integratorId || ACROSS_INTEGRATOR_ID;
    this.isTestnet = isTestnet;
    this.baseURL = isTestnet ? ACROSS_TESTNET_URL : ACROSS_MAINNET_URL;

    // Warn if integrator ID is missing
    if (!this.integratorId) {
      console.warn(
        '⚠️ Across Protocol: Integrator ID is missing!\n' +
        'Fill this form to get your Integrator ID: https://docs.google.com/forms/d/e/1FAIpQLSe-HY6mzTeGZs91HxObkQmwkMQuH7oy8ngZ1ROiu-f4SR4oMw/viewform\n' +
        'Add NEXT_PUBLIC_ACROSS_INTEGRATOR_ID to your .env.local file (e.g., "0xdead")'
      );
    }

    // Info message about testnet mode
    if (isTestnet && typeof window !== 'undefined') {
      console.info(
        '🧪 Across Protocol: Running in TESTNET mode\n' +
        'API Endpoint: ' + ACROSS_TESTNET_URL + '\n' +
        'Note: Testnet fills typically take ~1 minute (vs 2 seconds on mainnet)\n' +
        'Test with smaller amounts (~$10) as relayer settlement does not occur on testnet'
      );
    }
  }

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    params?: Record<string, any>,
    body?: any
  ): Promise<T> {
    const baseUrl = this.baseURL;
    let url = baseUrl + endpoint;

    if (params && method === 'GET') {
      const queryParams = new URLSearchParams();
      for (const key in params) {
        const value = params[key];
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            for (const v of value) {
              queryParams.append(key, String(v));
            }
          } else {
            queryParams.append(key, String(value));
          }
        }
      }
      const queryString = queryParams.toString();
      if (queryString) {
        url = url + '?' + queryString;
      }
    }

    const requestOptions: RequestInit = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body && method === 'POST') {
      requestOptions.body = JSON.stringify(body);
    }

    if (this.integratorId && method === 'GET' && !params?.integratorId) {
      const sep = url.includes('?') ? '&' : '?';
      url = url + sep + 'integratorId=' + this.integratorId;
    }

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      let errorMessage = 'HTTP ' + String(response.status) + ': ' + response.statusText;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // Use default error message
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result;
  }

  // ==================== SWAP API ====================

  /**
   * Get swap approval data and executable calldata
   * @param params - Swap quote parameters
   * @returns Swap quote with transaction data
   */
  async getSwapQuote(params: AcrossSwapQuoteParams): Promise<AcrossSwapQuote> {
    return this.request<AcrossSwapQuote>('/swap/approval', 'GET', {
      tradeType: params.tradeType,
      amount: params.amount,
      inputToken: params.inputToken,
      outputToken: params.outputToken,
      originChainId: params.originChainId,
      destinationChainId: params.destinationChainId,
      depositor: params.depositor,
      recipient: params.recipient,
      appFee: params.appFee,
      appFeeRecipient: params.appFeeRecipient,
      integratorId: params.integratorId || this.integratorId,
      refundAddress: params.refundAddress,
      refundOnOrigin: params.refundOnOrigin ?? true,
      slippage: params.slippage ?? 0.005,
      skipOriginTxEstimation: params.skipOriginTxEstimation ?? true,
      strictTradeType: params.strictTradeType ?? true,
      excludeSources: params.excludeSources,
      includeSources: params.includeSources,
    });
  }

  /**
   * Get supported chains for swap operations
   * @returns List of supported chains
   */
  async getSwapChains(): Promise<AcrossChain[]> {
    return this.request<AcrossChain[]>('/swap/chains', 'GET');
  }

  /**
   * Get supported tokens for swap operations
   * @returns List of supported tokens
   */
  async getSwapTokens(): Promise<AcrossToken[]> {
    return this.request<AcrossToken[]>('/swap/tokens', 'GET');
  }

  /**
   * Get supported swap sources for a chain
   * @param chainId - Optional chain ID to filter sources
   * @returns List of supported sources
   */
  async getSwapSources(chainId?: number): Promise<string[]> {
    return this.request<string[]>('/swap/sources', 'GET', chainId ? { chainId } : undefined);
  }

  // ==================== TRACKING API ====================

  /**
   * Track the lifecycle of a deposit
   * @param params - Deposit status parameters
   * @returns Deposit status information
   */
  async getDepositStatus(params: AcrossDepositStatusParams): Promise<AcrossDepositStatus> {
    if (!params.depositTxnRef && (!params.originChainId || params.depositId === undefined)) {
      throw new Error(
        'Either depositTxnRef or both originChainId and depositId must be provided'
      );
    }

    return this.request<AcrossDepositStatus>('/deposit/status', 'GET', {
      originChainId: params.originChainId,
      depositId: params.depositId,
      depositTxnRef: params.depositTxnRef,
    });
  }

  /**
   * Get all deposits for a given depositor
   * @param params - Deposits query parameters
   * @returns List of deposits
   */
  async getDeposits(params: AcrossDepositsParams): Promise<any[]> {
    return this.request<any[]>('/deposits', 'GET', {
      depositor: params.depositor,
      limit: params.limit,
      skip: params.skip,
    });
  }

  // ==================== SUGGESTED FEES API ====================

  /**
   * Get suggested fee quote for a deposit
   * @param params - Suggested fees parameters
   * @returns Suggested fees and supporting data
   */
  async getSuggestedFees(params: AcrossSuggestedFeesParams): Promise<AcrossSuggestedFees> {
    return this.request<AcrossSuggestedFees>('/suggested-fees', 'GET', {
      inputToken: params.inputToken,
      outputToken: params.outputToken,
      originChainId: params.originChainId,
      destinationChainId: params.destinationChainId,
      amount: params.amount,
      recipient: params.recipient,
      message: params.message,
      relayer: params.relayer,
      timestamp: params.timestamp,
    });
  }

  /**
   * Get current transfer limits
   * @param params - Limits parameters
   * @returns Transfer limits
   */
  async getLimits(params: AcrossLimitsParams): Promise<AcrossTransferLimits> {
    return this.request<AcrossTransferLimits>('/limits', 'GET', {
      inputToken: params.inputToken,
      outputToken: params.outputToken,
      originChainId: params.originChainId,
      destinationChainId: params.destinationChainId,
    });
  }

  /**
   * Get available routes for transfers
   * @param params - Available routes parameters
   * @returns List of available routes
   */
  async getAvailableRoutes(params?: AcrossAvailableRoutesParams): Promise<AcrossAvailableRoute[]> {
    return this.request<AcrossAvailableRoute[]>('/available-routes', 'GET', params);
  }
}

