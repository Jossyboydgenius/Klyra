// Transaction Executor - Handles multi-step cross-chain transactions

import { writeContract, waitForTransactionReceipt, switchChain } from 'wagmi/actions';
import type { UnifiedRoute, CrossChainTransaction, TransactionStep } from './payment-types';
import { erc20Abi } from 'viem';
import type { SquidAPI } from './aggregators/squid';

export class TransactionExecutor {
  async execute(route: UnifiedRoute, userAddress: string, wagmiConfig: any): Promise<CrossChainTransaction> {
    const transaction: CrossChainTransaction = {
      id: `tx-${Date.now()}`,
      intent: {
        sender: {
          address: userAddress,
          token: {} as any,
          chain: route.fromChain,
          amount: route.fromAmount,
        },
        recipient: {
          address: userAddress,
          token: {} as any,
          chain: route.toChain,
        },
      },
      route,
      status: 'pending',
      steps: [],
      startedAt: new Date(),
      transactionHashes: [],
    };

    try {
      // Step 1: Approval (if needed)
      if (route.requiresApproval) {
        await this.handleApproval(transaction, route, userAddress, wagmiConfig);
      }

      // Step 2: Execute route transactions
      for (const tx of route.transactions) {
        await this.executeTransaction(transaction, tx, wagmiConfig);
      }

      transaction.status = 'completed';
      transaction.completedAt = new Date();
    } catch (error: any) {
      transaction.status = 'failed';
      transaction.error = error.message;
      throw error;
    }

    return transaction;
  }

  private async handleApproval(
    transaction: CrossChainTransaction,
    route: UnifiedRoute,
    userAddress: string,
    wagmiConfig: any
  ): Promise<void> {
    const step: TransactionStep = {
      name: 'Token Approval',
      status: 'in_progress',
      chainId: route.fromChain,
      startedAt: new Date(),
    };
    transaction.steps.push(step);
    transaction.status = 'approving';

    try {
      // Switch to correct chain
      await switchChain(wagmiConfig, { chainId: route.fromChain });

      // Get spender address from route data
      const spender = this.getSpenderAddress(route);

      // Approve token spending
      const hash = await writeContract(wagmiConfig, {
        address: route.fromToken as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spender as `0x${string}`, BigInt(route.fromAmount)],
      });

      step.transactionHash = hash;
      transaction.transactionHashes.push(hash);

      // Wait for confirmation
      await waitForTransactionReceipt(wagmiConfig, { hash });

      step.status = 'completed';
      step.completedAt = new Date();
    } catch (error: any) {
      step.status = 'failed';
      step.error = error.message;
      throw error;
    }
  }

  private async executeTransaction(
    transaction: CrossChainTransaction,
    tx: any,
    wagmiConfig: any
  ): Promise<void> {
    const step: TransactionStep = {
      name: `Execute on Chain ${tx.chainId}`,
      status: 'in_progress',
      chainId: tx.chainId,
      startedAt: new Date(),
    };
    transaction.steps.push(step);
    transaction.status = 'executing';

    try {
      // Switch to correct chain
      await switchChain(wagmiConfig, { chainId: tx.chainId });

      // Send transaction
      const hash = await this.sendTransaction(tx, wagmiConfig);

      step.transactionHash = hash;
      transaction.transactionHashes.push(hash);

      // Wait for confirmation
      await waitForTransactionReceipt(wagmiConfig, { hash });

      step.status = 'completed';
      step.completedAt = new Date();

      // If cross-chain, update status to bridging
      if (transaction.route.fromChain !== transaction.route.toChain) {
        transaction.status = 'bridging';
      }
    } catch (error: any) {
      step.status = 'failed';
      step.error = error.message;
      throw error;
    }
  }

  private async sendTransaction(tx: any, wagmiConfig: any): Promise<string> {
    const { sendTransaction } = await import('wagmi/actions');
    
    const hash = await sendTransaction(wagmiConfig, {
      to: tx.to,
      data: tx.data,
      value: BigInt(tx.value || '0'),
      ...(tx.gasLimit && { gas: BigInt(tx.gasLimit) }),
      ...(tx.maxFeePerGas && { maxFeePerGas: BigInt(tx.maxFeePerGas) }),
      ...(tx.maxPriorityFeePerGas && { maxPriorityFeePerGas: BigInt(tx.maxPriorityFeePerGas) }),
    });

    return hash;
  }

  private getSpenderAddress(route: UnifiedRoute): string {
    // Extract spender address from route data based on provider
    switch (route.provider) {
      case 'socket':
        return route.rawData.userTxs?.[0]?.approvalData?.approvalTokenAddress || route.rawData.userTxs?.[0]?.txTarget || '';
      case 'lifi':
        return route.rawData.steps?.[0]?.estimate?.approvalAddress || '';
      case 'squid':
        return route.rawData.transactionRequest?.target || route.transactions?.[0]?.to || '';
      case 'across':
        return route.rawData.spender || route.transactions?.[0]?.to || '';
      case '1inch-fusion':
        return '0x111111125421ca6dc452d289314280a0f8842a65'; // 1inch Router v5
      default:
        throw new Error('Unknown provider');
    }
  }

  async getSquidTransactionStatus(
    squidAPI: SquidAPI,
    txHash: string,
    requestId: string,
    fromChain: number,
    toChain: number
  ): Promise<any> {
    try {
      const status = await squidAPI.getStatus({
        transactionId: txHash,
        requestId,
        fromChainId: fromChain.toString(),
        toChainId: toChain.toString(),
      });
      return status;
    } catch (error) {
      console.error('Squid status check error:', error);
      return { squidTransactionStatus: 'pending' };
    }
  }

  async getTransactionStatus(txHash: string, fromChain: number, toChain: number, provider: string): Promise<any> {
    // Check status with appropriate provider
    // This is a placeholder - implement actual status checking
    return {
      status: 'pending',
      txHash,
    };
  }
}

export const transactionExecutor = new TransactionExecutor();

