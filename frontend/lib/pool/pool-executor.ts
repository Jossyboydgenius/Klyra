/**
 * Pool Executor
 * Executes swaps and transfers from pool wallets using aggregated routes
 */

import { poolWalletManager } from './pool-wallet-manager';
import { poolBalanceTracker } from './pool-balance-tracker';
import { RouteAggregator } from '@/lib/route-aggregator';
import type { UnifiedRoute, PaymentIntent } from '@/lib/payment-types';
import type { Token } from '@/lib/chain-data';
import type { Address, Hash } from 'viem';

export interface ExecutionResult {
  success: boolean;
  txHash?: Hash;
  routeUsed?: UnifiedRoute;
  actualOutput?: string;
  error?: string;
  metadata?: {
    gasUsed?: string;
    totalCost?: string;
    executionTime?: number;
  };
}

export interface SwapParams {
  fromChain: number;
  toChain: number;
  fromToken: Token;
  toToken: Token;
  amount: string;
  recipient: Address;
}

/**
 * Executes swaps and transfers from pool wallets
 */
export class PoolExecutor {
  private routeAggregator: RouteAggregator;

  constructor() {
    this.routeAggregator = new RouteAggregator();
  }

  /**
   * Execute on-ramp order: Check balance → Swap → Send to user
   */
  async executeOnRamp(params: SwapParams): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      console.log(`Executing on-ramp: ${params.amount} ${params.fromToken.symbol} → ${params.toToken.symbol}`);

      // Step 1: Check if we have target token
      const hasToken = await this.checkHasToken(params.toChain, params.toToken.address as Address);

      let txHash: Hash;
      let route: UnifiedRoute | undefined;

      if (hasToken) {
        // Direct transfer
        console.log(`Direct transfer: We have ${params.toToken.symbol}`);
        txHash = await this.transferDirect(
          params.toChain,
          params.toToken,
          params.recipient,
          params.amount
        );
      } else {
        // Need to swap
        console.log(`Swapping: We need ${params.toToken.symbol}`);
        const result = await this.swapAndTransfer(params);
        txHash = result.txHash;
        route = result.route;
      }

      // Step 3: Wait for confirmation
      await poolWalletManager.waitForTransaction(
        params.toChain,
        txHash
      );

      const executionTime = Date.now() - startTime;

      // Step 4: Update pool balance
      await this.updateBalancesAfterExecution(hasToken, params);

      return {
        success: true,
        txHash,
        routeUsed: route,
        metadata: {
          executionTime,
        },
      };
    } catch (error: any) {
      console.error('On-ramp execution failed:', error);
      return {
        success: false,
        error: error.message || 'Execution failed',
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Execute off-ramp order: Receive token → Swap to USDC
   */
  async executeOffRamp(
    chainId: number,
    token: Token,
    amount: string,
    recipient: Address
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      console.log(`Executing off-ramp: ${amount} ${token.symbol} → USDC`);

      // Step 1: Swap token to USDC
      const result = await this.swapToUSDC(chainId, token, amount);

      const executionTime = Date.now() - startTime;

      // Step 2: Update pool balance
      await poolBalanceTracker.increaseBalance(chainId, token.address as Address, amount);
      await poolBalanceTracker.decreaseBalance(chainId, result.usdcAddress as Address, result.usdcAmount);

      return {
        success: true,
        txHash: result.txHash,
        routeUsed: result.route,
        metadata: {
          executionTime,
        },
      };
    } catch (error: any) {
      console.error('Off-ramp execution failed:', error);
      return {
        success: false,
        error: error.message || 'Execution failed',
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Check if we have a specific token in pool
   */
  private async checkHasToken(chainId: number, tokenAddress: Address): Promise<boolean> {
    const balance = await poolBalanceTracker.getBalance(chainId, tokenAddress);
    return balance !== null && parseFloat(balance.balance) > 0;
  }

  /**
   * Transfer token directly to recipient (we have it)
   */
  private async transferDirect(
    chainId: number,
    token: Token,
    recipient: Address,
    amount: string
  ): Promise<Hash> {
    const walletAddress = await poolWalletManager.getWalletAddress(chainId);

    if (token.address === '0x0000000000000000000000000000000000000000') {
      // Native token
      return await poolWalletManager.sendNative(chainId, recipient, amount);
    } else {
      // ERC20 token
      return await poolWalletManager.sendERC20(
        chainId,
        token.address as Address,
        recipient as Address,
        amount,
        token.decimals
      );
    }
  }

  /**
   * Swap and transfer to recipient
   */
  private async swapAndTransfer(params: SwapParams): Promise<{ txHash: Hash; route: UnifiedRoute }> {
    // Step 1: Get best route
    const route = await this.getBestRoute(params);

    // Step 2: Execute route transaction
    const txHash = await this.executeRoute(route);

    return { txHash, route };
  }

  /**
   * Get best route for swap
   */
  private async getBestRoute(params: SwapParams): Promise<UnifiedRoute> {
    const walletAddress = await poolWalletManager.getWalletAddress(params.fromChain);

    const intent: PaymentIntent = {
      sender: {
        address: walletAddress,
        token: params.fromToken,
        chain: params.fromChain,
        amount: params.amount,
      },
      recipient: {
        address: params.recipient, // User receives the final token
        token: params.toToken,
        chain: params.toChain,
      },
    };

    const comparison = await this.routeAggregator.findBestRoutes(intent);
    return comparison.recommended;
  }

  /**
   * Execute route transaction
   */
  private async executeRoute(route: UnifiedRoute): Promise<Hash> {
    console.log(`Executing route: ${route.providerName}`);

    // Execute first transaction (swap/bridge)
    if (route.transactions.length === 0) {
      throw new Error('No transactions in route');
    }

    const firstTx = route.transactions[0];
    const txHash = await poolWalletManager.executeTransaction(
      firstTx.chainId,
      firstTx.to as Address,
      firstTx.data as `0x${string}`,
      BigInt(firstTx.value || '0')
    );

    return txHash;
  }

  /**
   * Swap token to USDC (for off-ramp)
   */
  private async swapToUSDC(
    chainId: number,
    token: Token,
    amount: string
  ): Promise<{
    txHash: Hash;
    route: UnifiedRoute;
    usdcAddress: Address;
    usdcAmount: string;
  }> {
    const usdcAddress = await this.getUSDCAddress(chainId);
    const walletAddress = await poolWalletManager.getWalletAddress(chainId);

    const usdcToken: Token = {
      chainId,
      address: usdcAddress,
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
    };

    const intent: PaymentIntent = {
      sender: {
        address: walletAddress,
        token: token,
        chain: chainId,
        amount: amount,
      },
      recipient: {
        address: walletAddress, // Pool wallet receives USDC
        token: usdcToken,
        chain: chainId,
      },
    };

    const comparison = await this.routeAggregator.findBestRoutes(intent);
    const route = comparison.recommended;

    const txHash = await this.executeRoute(route);

    return {
      txHash,
      route,
      usdcAddress,
      usdcAmount: route.toAmount,
    };
  }

  /**
   * Get USDC address for a chain
   */
  private async getUSDCAddress(chainId: number): Promise<Address> {
    const addresses: Record<number, Address> = {
      1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    };

    const address = addresses[chainId];
    if (!address) {
      throw new Error(`USDC not supported on chain ${chainId}`);
    }

    return address;
  }

  /**
   * Update balances after execution
   */
  private async updateBalancesAfterExecution(
    wasDirect: boolean,
    params: SwapParams
  ): Promise<void> {
    if (wasDirect) {
      // Direct transfer: decrease balance of token we sent
      await poolBalanceTracker.decreaseBalance(
        params.toChain,
        params.toToken.address as Address,
        params.amount
      );
    } else {
      // Swap: decrease USDC and potentially increase new token (if leftover)
      // This is simplified - actual implementation should parse the route output
      const usdcAddress = await this.getUSDCAddress(params.fromChain);
      
      // Estimate USDC cost (this should come from the route)
      const estimatedCost = params.amount; // Simplified
      await poolBalanceTracker.decreaseBalance(
        params.fromChain,
        usdcAddress,
        estimatedCost
      );
    }
  }
}

export const poolExecutor = new PoolExecutor();

