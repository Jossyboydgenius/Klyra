// Payment System Types

import type { Token } from './chain-data';

export interface PaymentIntent {
  id?: string;
  sender: {
    address: string;
    token: Token;
    chain: number;
    amount: string;
    balance?: string;
  };
  recipient: {
    address: string;
    token: Token;
    chain: number;
    expectedAmount?: string;
  };
  metadata?: {
    message?: string;
    reference?: string;
    memo?: string;
  };
  createdAt?: Date;
  expiresAt?: Date;
}

export interface UnifiedRoute {
  id: string;
  provider: '1inch-fusion' | 'socket' | 'lifi' | 'squid' | 'across';
  providerName: string;
  
  // Input/Output
  fromChain: number;
  fromToken: string;
  fromAmount: string;
  toChain: number;
  toToken: string;
  toAmount: string;
  toAmountMin: string;
  
  // Steps breakdown
  steps: RouteStep[];
  
  // Costs & Time
  totalGasUSD: number;
  totalFeeUSD: number;
  estimatedTime: number; // seconds
  priceImpact?: number;
  
  // Execution
  transactions: RouteTransaction[];
  requiresApproval: boolean;
  approvalData?: any;
  
  // Metadata
  isRecommended?: boolean;
  isFastest?: boolean;
  isCheapest?: boolean;
  tags?: string[];
  
  // Raw data from provider
  rawData: any;
}

export interface RouteStep {
  type: 'approval' | 'swap' | 'bridge' | 'transfer';
  chain: number;
  protocol: string;
  description: string;
  fromToken?: string;
  toToken?: string;
  estimatedTime?: number;
}

export interface RouteTransaction {
  chainId: number;
  to: string;
  data: string;
  value: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
}

export interface PaymentRequest {
  id: string;
  merchant: {
    name: string;
    address: string;
    chain: number;
    token: Token;
  };
  amount: string;
  description: string;
  metadata?: Record<string, any>;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  createdAt: Date;
  expiresAt: Date;
  paidAt?: Date;
  paidBy?: string;
  transactionHash?: string;
  paymentLink: string;
}

export interface CrossChainTransaction {
  id: string;
  intent: PaymentIntent;
  route: UnifiedRoute;
  status: 'pending' | 'approving' | 'executing' | 'bridging' | 'completed' | 'failed';
  steps: TransactionStep[];
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  transactionHashes: string[];
}

export interface TransactionStep {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  transactionHash?: string;
  chainId?: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface RouteComparison {
  recommended: UnifiedRoute;
  fastest: UnifiedRoute;
  cheapest: UnifiedRoute;
  allRoutes: UnifiedRoute[];
  summary: {
    timeDifference: number;
    costDifference: number;
    outputDifference: string;
  };
}

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;

export const TX_STATUS = {
  PENDING: 'pending',
  APPROVING: 'approving',
  EXECUTING: 'executing',
  BRIDGING: 'bridging',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

