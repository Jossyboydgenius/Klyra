// Transaction Executor - Handles multi-step cross-chain transactions
// Properly implements LI.FI and Squid swap execution according to their documentation

import { writeContract, waitForTransactionReceipt, switchChain, sendTransaction, readContract } from 'wagmi/actions';
import type { UnifiedRoute, CrossChainTransaction, TransactionStep } from './payment-types';
import { erc20Abi } from 'viem';
import type { SquidAPI } from './aggregators/squid';
import { lifiAPI } from './aggregators/lifi';
import { isNativeToken } from './token-utils';
import type { Config } from 'wagmi';

export class TransactionExecutor {
  async execute(
    route: UnifiedRoute, 
    userAddress: string, 
    wagmiConfig: Config,
    recipientAddress?: string
  ): Promise<CrossChainTransaction> {
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
          address: recipientAddress || userAddress,
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
      // Handle based on provider
      if (route.provider === 'lifi') {
        await this.executeLiFiRoute(transaction, route, userAddress, wagmiConfig, recipientAddress);
      } else if (route.provider === 'squid') {
        await this.executeSquidRoute(transaction, route, userAddress, wagmiConfig, recipientAddress);
      } else if (route.provider === 'across') {
        await this.executeAcrossRoute(transaction, route, userAddress, wagmiConfig, recipientAddress);
      } else {
        // Fallback for other providers
        await this.executeGenericRoute(transaction, route, userAddress, wagmiConfig, recipientAddress);
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

  private async executeLiFiRoute(
    transaction: CrossChainTransaction,
    route: UnifiedRoute,
    userAddress: string,
    wagmiConfig: Config,
    recipientAddress?: string
  ): Promise<void> {
    const lifiRoute = route.rawData as any;
    
    // Step 1: Check and set allowance
    if (route.requiresApproval && lifiRoute.steps?.[0]?.estimate?.approvalAddress) {
      await this.handleLiFiApproval(transaction, route, userAddress, wagmiConfig, lifiRoute);
    }

    // Step 2: Get transactionRequest
    // LI.FI may provide transactionRequest directly in route (from /quote) or need to fetch it (from /advanced/routes)
    let transactionRequest = lifiRoute.steps?.[0]?.transactionRequest;
    
    if (!transactionRequest && lifiRoute.steps?.[0]) {
      // Fetch transactionRequest from /advanced/stepTransaction
      // LI.FI requires the full step object, not just routeId/stepIndex
      const firstStep = lifiRoute.steps[0];
      
      // Update the step with current account address
      const stepToSend = {
        ...firstStep,
        action: {
          ...firstStep.action,
          fromAddress: userAddress,
          toAddress: recipientAddress || userAddress,
        },
      };

      try {
        const stepTransaction = await lifiAPI.getStepTransaction(stepToSend);
        transactionRequest = stepTransaction.transactionRequest || stepTransaction;
      } catch (error: any) {
        console.error('Failed to fetch LI.FI stepTransaction:', error);
        throw new Error(`LI.FI route missing transactionRequest: ${error.message}`);
      }
    }
    
    if (!transactionRequest) {
      throw new Error('LI.FI route missing transactionRequest');
    }

    // Switch to correct chain
    await switchChain(wagmiConfig, { chainId: route.fromChain });

    // Send transaction
    const step: TransactionStep = {
      name: 'Execute LI.FI Transaction',
      status: 'in_progress',
      chainId: route.fromChain,
      startedAt: new Date(),
    };
    transaction.steps.push(step);
    transaction.status = 'executing';

    try {
      // LI.FI transactionRequest structure can vary
      // It might be nested or flat depending on the endpoint used
      const txData = transactionRequest.transactionRequest || transactionRequest;
      
      // Handle gas pricing: Use EIP-1559 if available, otherwise use gasPrice
      const hasEIP1559 = txData.maxFeePerGas && txData.maxPriorityFeePerGas;
      const gasConfig = hasEIP1559
        ? {
            maxFeePerGas: BigInt(txData.maxFeePerGas),
            maxPriorityFeePerGas: BigInt(txData.maxPriorityFeePerGas),
          }
        : txData.gasPrice
        ? { gasPrice: BigInt(txData.gasPrice) }
        : {};
      
      const hash = await sendTransaction(wagmiConfig, {
        to: txData.to as `0x${string}`,
        data: txData.data as `0x${string}`,
        value: BigInt(txData.value || '0'),
        ...(txData.gasLimit && { gas: BigInt(txData.gasLimit) }),
        ...gasConfig,
      });

      step.transactionHash = hash;
      transaction.transactionHashes.push(hash);

      // Wait for confirmation
      await waitForTransactionReceipt(wagmiConfig, { hash });

      step.status = 'completed';
      step.completedAt = new Date();

      // Step 3: Poll status for cross-chain transfers
      if (route.fromChain !== route.toChain) {
        transaction.status = 'bridging';
        const bridge = lifiRoute.steps?.[0]?.tool || 'unknown';
        await this.pollLiFIStatus(transaction, hash, bridge, route.fromChain, route.toChain);
      }
    } catch (error: any) {
      step.status = 'failed';
      step.error = error.message;
      throw error;
    }
  }

  private async executeSquidRoute(
    transaction: CrossChainTransaction,
    route: UnifiedRoute,
    userAddress: string,
    wagmiConfig: Config,
    recipientAddress?: string
  ): Promise<void> {
    const squidRoute = route.rawData as any;
    const transactionRequest = squidRoute.transactionRequest;
    const requestId = squidRoute.requestId;

    if (!transactionRequest) {
      throw new Error('Squid route missing transactionRequest');
    }

    // Step 1: Approve spending (check allowance first)
    if (route.requiresApproval) {
      await this.handleSquidApproval(transaction, route, userAddress, wagmiConfig, transactionRequest.target);
    }

    // Step 2: Switch to correct chain
    await switchChain(wagmiConfig, { chainId: route.fromChain });

    // Step 3: Execute transaction
    const step: TransactionStep = {
      name: 'Execute Squid Transaction',
      status: 'in_progress',
      chainId: route.fromChain,
      startedAt: new Date(),
    };
    transaction.steps.push(step);
    transaction.status = 'executing';

    try {
      // Squid: Use EIP-1559 fields if available, otherwise use gasPrice
      // Cannot specify both gasPrice and maxFeePerGas/maxPriorityFeePerGas
      const hasEIP1559 = transactionRequest.maxFeePerGas && transactionRequest.maxPriorityFeePerGas;
      const gasConfig = hasEIP1559
        ? {
            maxFeePerGas: BigInt(transactionRequest.maxFeePerGas),
            maxPriorityFeePerGas: BigInt(transactionRequest.maxPriorityFeePerGas),
          }
        : transactionRequest.gasPrice
        ? { gasPrice: BigInt(transactionRequest.gasPrice) }
        : {};

      const hash = await sendTransaction(wagmiConfig, {
        to: transactionRequest.target as `0x${string}`,
        data: transactionRequest.data as `0x${string}`,
        value: BigInt(transactionRequest.value || '0'),
        ...(transactionRequest.gasLimit && { gas: BigInt(transactionRequest.gasLimit) }),
        ...gasConfig,
      });

      step.transactionHash = hash;
      transaction.transactionHashes.push(hash);

      // Wait for confirmation
      await waitForTransactionReceipt(wagmiConfig, { hash });

      step.status = 'completed';
      step.completedAt = new Date();

      // Step 4: Poll status for cross-chain transfers
      if (route.fromChain !== route.toChain && requestId) {
        transaction.status = 'bridging';
        await this.pollSquidStatus(transaction, hash, requestId, route.fromChain, route.toChain);
      }
    } catch (error: any) {
      step.status = 'failed';
      step.error = error.message;
      throw error;
    }
  }

  private async executeAcrossRoute(
    transaction: CrossChainTransaction,
    route: UnifiedRoute,
    userAddress: string,
    wagmiConfig: Config,
    recipientAddress?: string
  ): Promise<void> {
    // Execute approval transactions if needed
    if (route.requiresApproval && route.transactions.length > 1) {
      // First transactions are approvals
      for (let i = 0; i < route.transactions.length - 1; i++) {
        const approvalTx = route.transactions[i];
        await this.executeTransaction(transaction, approvalTx, wagmiConfig);
      }
    }

    // Execute main transaction (last one)
    const mainTx = route.transactions[route.transactions.length - 1];
    await this.executeTransaction(transaction, mainTx, wagmiConfig);

    if (route.fromChain !== route.toChain) {
      transaction.status = 'bridging';
    }
  }

  private async executeGenericRoute(
    transaction: CrossChainTransaction,
    route: UnifiedRoute,
    userAddress: string,
    wagmiConfig: Config,
    recipientAddress?: string
  ): Promise<void> {
    // Generic execution for other providers
    if (route.requiresApproval) {
      await this.handleApproval(transaction, route, userAddress, wagmiConfig);
    }

    for (const tx of route.transactions) {
      await this.executeTransaction(transaction, tx, wagmiConfig);
    }

    if (route.fromChain !== route.toChain) {
      transaction.status = 'bridging';
    }
  }

  private async handleLiFiApproval(
    transaction: CrossChainTransaction,
    route: UnifiedRoute,
    userAddress: string,
    wagmiConfig: Config,
    lifiRoute: any
  ): Promise<void> {
    const approvalAddress = lifiRoute.steps?.[0]?.estimate?.approvalAddress;
    const fromToken = route.fromToken as `0x${string}`;
    const fromAmount = BigInt(route.fromAmount);

    if (!approvalAddress || isNativeToken(fromToken)) {
      return; // Native token, no approval needed
    }

    const step: TransactionStep = {
      name: 'Token Approval',
      status: 'in_progress',
      chainId: route.fromChain,
      startedAt: new Date(),
    };
    transaction.steps.push(step);
    transaction.status = 'approving';

    try {
      await switchChain(wagmiConfig, { chainId: route.fromChain });

      // Check current allowance
      const allowance = await readContract(wagmiConfig, {
        address: fromToken,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [userAddress as `0x${string}`, approvalAddress as `0x${string}`],
      });

      if (allowance < fromAmount) {
        // Approve token spending
        const hash = await writeContract(wagmiConfig, {
          address: fromToken,
          abi: erc20Abi,
          functionName: 'approve',
          args: [approvalAddress as `0x${string}`, fromAmount],
        });

        step.transactionHash = hash;
        transaction.transactionHashes.push(hash);

        // Wait for confirmation
        await waitForTransactionReceipt(wagmiConfig, { hash });
      }

      step.status = 'completed';
      step.completedAt = new Date();
    } catch (error: any) {
      step.status = 'failed';
      step.error = error.message;
      throw error;
    }
  }

  private async handleSquidApproval(
    transaction: CrossChainTransaction,
    route: UnifiedRoute,
    userAddress: string,
    wagmiConfig: Config,
    spenderAddress: string
  ): Promise<void> {
    const fromToken = route.fromToken as `0x${string}`;
    const fromAmount = BigInt(route.fromAmount);

    if (!fromToken || isNativeToken(fromToken)) {
      return; // Native token, no approval needed
    }

    const step: TransactionStep = {
      name: 'Token Approval',
      status: 'in_progress',
      chainId: route.fromChain,
      startedAt: new Date(),
    };
    transaction.steps.push(step);
    transaction.status = 'approving';

    try {
      await switchChain(wagmiConfig, { chainId: route.fromChain });

      // Check current allowance
      const allowance = await readContract(wagmiConfig, {
        address: fromToken,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [userAddress as `0x${string}`, spenderAddress as `0x${string}`],
      });

      if (allowance < fromAmount) {
        // Approve token spending
        const hash = await writeContract(wagmiConfig, {
          address: fromToken,
          abi: erc20Abi,
          functionName: 'approve',
          args: [spenderAddress as `0x${string}`, fromAmount],
        });

        step.transactionHash = hash;
        transaction.transactionHashes.push(hash);

        // Wait for confirmation
        await waitForTransactionReceipt(wagmiConfig, { hash });
      }

      step.status = 'completed';
      step.completedAt = new Date();
    } catch (error: any) {
      step.status = 'failed';
      step.error = error.message;
      throw error;
    }
  }

  private async handleApproval(
    transaction: CrossChainTransaction,
    route: UnifiedRoute,
    userAddress: string,
    wagmiConfig: Config
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
      await switchChain(wagmiConfig, { chainId: route.fromChain });

      const spender = this.getSpenderAddress(route);
      const fromToken = route.fromToken as `0x${string}`;
      const fromAmount = BigInt(route.fromAmount);

      if (!fromToken || isNativeToken(fromToken)) {
        step.status = 'completed';
        step.completedAt = new Date();
        return; // Native token
      }

      // Check current allowance
      const allowance = await readContract(wagmiConfig, {
        address: fromToken,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [userAddress as `0x${string}`, spender as `0x${string}`],
      });

      if (allowance < fromAmount) {
        const hash = await writeContract(wagmiConfig, {
          address: fromToken,
          abi: erc20Abi,
          functionName: 'approve',
          args: [spender as `0x${string}`, fromAmount],
        });

        step.transactionHash = hash;
        transaction.transactionHashes.push(hash);
        await waitForTransactionReceipt(wagmiConfig, { hash });
      }

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
    wagmiConfig: Config
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
      await switchChain(wagmiConfig, { chainId: tx.chainId });

      // Handle gas pricing: Use EIP-1559 if available, otherwise use gasPrice
      const hasEIP1559 = tx.maxFeePerGas && tx.maxPriorityFeePerGas;
      const gasConfig = hasEIP1559
        ? {
            maxFeePerGas: BigInt(tx.maxFeePerGas),
            maxPriorityFeePerGas: BigInt(tx.maxPriorityFeePerGas),
          }
        : tx.gasPrice
        ? { gasPrice: BigInt(tx.gasPrice) }
        : {};

      const hash = await sendTransaction(wagmiConfig, {
        to: tx.to as `0x${string}`,
        data: tx.data as `0x${string}`,
        value: BigInt(tx.value || '0'),
        ...(tx.gasLimit && { gas: BigInt(tx.gasLimit) }),
        ...gasConfig,
      });

      step.transactionHash = hash;
      transaction.transactionHashes.push(hash);
      await waitForTransactionReceipt(wagmiConfig, { hash });

      step.status = 'completed';
      step.completedAt = new Date();
    } catch (error: any) {
      step.status = 'failed';
      step.error = error.message;
      throw error;
    }
  }

  private async pollLiFIStatus(
    transaction: CrossChainTransaction,
    txHash: string,
    bridge: string,
    fromChain: number,
    toChain: number
  ): Promise<void> {
    const maxRetries = 60; // 5 minutes max (5 second intervals)
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const status = await lifiAPI.getStatus(txHash, bridge, fromChain, toChain);
        
        if (status.status === 'DONE') {
          transaction.status = 'completed';
          return;
        } else if (status.status === 'FAILED') {
          transaction.status = 'failed';
          transaction.error = 'Cross-chain transfer failed';
          throw new Error('Cross-chain transfer failed');
        }

        // Wait 5 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 5000));
        retryCount++;
      } catch (error: any) {
        if (retryCount >= maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
        retryCount++;
      }
    }

    throw new Error('Status polling timeout');
  }

  private async pollSquidStatus(
    transaction: CrossChainTransaction,
    txHash: string,
    requestId: string,
    fromChain: number,
    toChain: number
  ): Promise<void> {
    // Import SquidAPI dynamically to avoid circular dependencies
    const { SquidAPI } = await import('./aggregators/squid');
    const squidAPI = new SquidAPI();

    const maxRetries = 60; // 5 minutes max (5 second intervals)
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const status = await squidAPI.getStatus({
          transactionId: txHash,
          requestId,
          fromChainId: fromChain.toString(),
          toChainId: toChain.toString(),
        });

        const completedStatuses = ['success', 'partial_success', 'needs_gas', 'not_found'];
        
        if (completedStatuses.includes(status.squidTransactionStatus)) {
          if (status.squidTransactionStatus === 'success') {
            transaction.status = 'completed';
          } else if (status.squidTransactionStatus === 'partial_success') {
            transaction.status = 'completed';
            transaction.error = 'Partial success';
          } else {
            transaction.status = 'failed';
            transaction.error = `Transaction status: ${status.squidTransactionStatus}`;
          }
          return;
        }

        // Wait 5 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 5000));
        retryCount++;
      } catch (error: any) {
        // Handle 404 errors (transaction not found yet)
        if (error.response?.status === 404 && retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          retryCount++;
          continue;
        }

        if (retryCount >= maxRetries) {
          throw error;
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
        retryCount++;
      }
    }

    throw new Error('Status polling timeout');
  }

  private getSpenderAddress(route: UnifiedRoute): string {
    switch (route.provider) {
      case 'lifi':
        return route.rawData?.steps?.[0]?.estimate?.approvalAddress || '';
      case 'squid':
        return route.rawData?.transactionRequest?.target || route.transactions?.[0]?.to || '';
      case 'across':
        return route.rawData?.spender || route.transactions?.[0]?.to || '';
      default:
        return route.transactions?.[0]?.to || '';
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
}

export const transactionExecutor = new TransactionExecutor();
