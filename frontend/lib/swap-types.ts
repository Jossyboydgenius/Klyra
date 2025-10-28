// Swap System Types

import type { Token } from './chain-data';
import type { QuoteResponse, SwapResponse, FusionQuoteResponse } from './1inch-api';

export type SwapType = 'same-chain' | 'cross-chain' | 'same-token-cross-chain';

export interface SwapRoute {
  routerId: string;
  routerName: string;
  quote: QuoteResponse | FusionQuoteResponse;
  quoteId?: string; // For Fusion+ cross-chain swaps (when enableEstimate: true)
  estimatedGas?: number;
  gasCost?: string;
  priceImpact?: number;
  route?: string[];
  isRecommended?: boolean;
  isFastest?: boolean;
  isCheapest?: boolean;
}

export interface SwapState {
  // Source
  srcChainId: number | null;
  srcToken: Token | null;
  srcAmount: string;
  
  // Destination
  dstChainId: number | null;
  dstToken: Token | null;
  dstAmount: string;
  
  // Swap details
  swapType: SwapType | null;
  selectedRoute: SwapRoute | null;
  availableRoutes: SwapRoute[];
  
  // User
  userAddress: string;
  slippage: number;
  
  // Status
  isLoadingQuotes: boolean;
  isLoadingCalldata: boolean;
  error: string | null;
  
  // Transaction
  calldata: SwapResponse | null;
  approvalNeeded: boolean;
  approvalCalldata: any | null;
}

export interface RouterInfo {
  id: string;
  name: string;
  logo: string;
  description: string;
  supportedChains: number[];
  supportsCrossChain: boolean;
  features: string[];
}

export const AVAILABLE_ROUTERS: RouterInfo[] = [
  {
    id: '1inch',
    name: '1inch',
    logo: 'https://app.1inch.io/assets/images/1inch_logo.svg',
    description: 'Leading DEX aggregator with best rates across 100+ liquidity sources',
    supportedChains: [1, 10, 56, 137, 8453, 42161, 43114, 59144, 324, 250, 100], // Major chains
    supportsCrossChain: true,
    features: ['Best Rates', 'Low Gas', 'Fast Execution', 'Cross-Chain'],
  },
  // More routers can be added here later
];

export interface QuoteComparison {
  router: RouterInfo;
  quote: SwapRoute;
  savings?: {
    amount: string;
    percentage: number;
  };
  timing?: {
    estimated: string;
    unit: string;
  };
}

export interface SwapSettings {
  slippage: number;
  deadline: number;
  expertMode: boolean;
  multihops: boolean;
  autoRouter: boolean;
}

export const DEFAULT_SWAP_SETTINGS: SwapSettings = {
  slippage: 0.5, // 0.5%
  deadline: 20, // 20 minutes
  expertMode: false,
  multihops: true,
  autoRouter: true,
};

export const SLIPPAGE_PRESETS = [0.1, 0.5, 1.0, 3.0]; // Percentage values

export const NATIVE_TOKEN_ADDRESSES: Record<number, string> = {
  1: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // Ethereum
  10: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // Optimism
  56: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // BSC
  137: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // Polygon
  8453: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // Base
  42161: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // Arbitrum
  43114: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // Avalanche
};

