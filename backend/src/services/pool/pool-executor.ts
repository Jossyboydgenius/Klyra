import { poolWalletManager } from './pool-wallet-manager.js';
import { poolBalanceTracker } from './pool-balance-tracker.js';
import type { Hash, Address } from 'viem';

export interface ExecutionResult {
  success: boolean;
  txHash?: Hash;
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
  fromToken: any;
  toToken: any;
  amount: string;
  recipient: Address;
}

export class PoolExecutor {
  async executeOnRamp(params: SwapParams): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      console.log(`Executing on-ramp: ${params.amount} ${params.fromToken.symbol} → ${params.toToken.symbol}`);

      const hasToken = await this.checkHasToken(params.toChain, params.toToken.address as Address);

      let txHash: Hash;

      if (hasToken) {
        console.log(`Direct transfer: We have ${params.toToken.symbol}`);
        txHash = await this.transferDirect(
          params.toChain,
          params.toToken,
          params.recipient,
          params.amount
        );
      } else {
        console.log(`Swapping: We need ${params.toToken.symbol}`);
        const result = await this.swapAndTransfer(params);
        txHash = result.txHash;
      }

      await poolWalletManager.waitForTransaction(
        params.toChain,
        txHash
      );

      const executionTime = Date.now() - startTime;

      await this.updateBalancesAfterExecution(hasToken, params);

      return {
        success: true,
        txHash,
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

  async executeOffRamp(
    chainId: number,
    token: any,
    amount: string,
    recipient: Address
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      console.log(`Executing off-ramp: ${amount} ${token.symbol} → USDC`);

      const result = await this.swapToUSDC(chainId, token, amount);

      const executionTime = Date.now() - startTime;

      await poolBalanceTracker.increaseBalance(chainId, token.address as Address, amount);
      await poolBalanceTracker.decreaseBalance(chainId, result.usdcAddress as Address, result.usdcAmount);

      return {
        success: true,
        txHash: result.txHash,
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

  private async checkHasToken(chainId: number, tokenAddress: Address): Promise<boolean> {
    const balance = await poolBalanceTracker.getBalance(chainId, tokenAddress);
    return balance !== null && parseFloat(balance.balance) > 0;
  }

  private async transferDirect(
    chainId: number,
    token: any,
    recipient: Address,
    amount: string
  ): Promise<Hash> {
    const walletAddress = await poolWalletManager.getWalletAddress(chainId);

    if (token.address === '0x0000000000000000000000000000000000000000') {
      return await poolWalletManager.sendNative(chainId, recipient, amount);
    } else {
      return await poolWalletManager.sendERC20(
        chainId,
        token.address as Address,
        recipient as Address,
        amount,
        token.decimals
      );
    }
  }

  private async swapAndTransfer(params: SwapParams): Promise<{ txHash: Hash }> {
    const route = await this.getBestRoute(params);
    const txHash = await this.executeRoute(route);
    return { txHash };
  }

  private async getBestRoute(params: SwapParams): Promise<any> {
    throw new Error('Route aggregation not yet implemented in backend');
  }

  private async executeRoute(route: any): Promise<Hash> {
    console.log(`Executing route: ${route.providerName}`);

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

  private async swapToUSDC(
    chainId: number,
    token: any,
    amount: string
  ): Promise<{
    txHash: Hash;
    usdcAddress: Address;
    usdcAmount: string;
  }> {
    const usdcAddress = await this.getUSDCAddress(chainId);
    const route = await this.getBestRoute({
      fromChain: chainId,
      toChain: chainId,
      fromToken: token,
      toToken: { address: usdcAddress, symbol: 'USDC', decimals: 6 },
      amount,
      recipient: await poolWalletManager.getWalletAddress(chainId),
    });

    const txHash = await this.executeRoute(route);

    return {
      txHash,
      usdcAddress,
      usdcAmount: route.toAmount,
    };
  }

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

  private async updateBalancesAfterExecution(
    wasDirect: boolean,
    params: SwapParams
  ): Promise<void> {
    if (wasDirect) {
      await poolBalanceTracker.decreaseBalance(
        params.toChain,
        params.toToken.address as Address,
        params.amount
      );
    } else {
      const usdcAddress = await this.getUSDCAddress(params.fromChain);
      const estimatedCost = params.amount;
      await poolBalanceTracker.decreaseBalance(
        params.fromChain,
        usdcAddress,
        estimatedCost
      );
    }
  }
}

export const poolExecutor = new PoolExecutor();

