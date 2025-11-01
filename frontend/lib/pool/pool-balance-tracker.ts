/**
 * Pool Balance Tracker
 * Manages real-time tracking and monitoring of pool balances
 */

import { poolWalletManager, PoolWallet } from './pool-wallet-manager';
import { supabase } from '@/lib/database/supabase-client';
import type { Address } from 'viem';

export interface PoolBalance {
  id: string;
  walletId: string;
  tokenAddress: Address;
  tokenSymbol: string;
  balance: string;
  thresholdWarning: string;
  thresholdCritical: string;
  lastUpdated: Date;
}

export interface BalanceCheckResult {
  hasBalance: boolean;
  currentBalance: string;
  status: 'healthy' | 'warning' | 'critical';
  needsReplenishment: boolean;
}

/**
 * USDC addresses per chain
 */
const USDC_ADDRESSES: Record<number, Address> = {
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum Mainnet
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
  137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Polygon
  10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Optimism
};

const USDC_DECIMALS: Record<number, number> = {
  1: 6,
  8453: 6,
  137: 6,
  10: 6,
};

/**
 * Tracks and manages pool balances across all chains
 */
export class PoolBalanceTracker {
  /**
   * Initialize pool balances for a wallet
   */
  async initializeBalance(
    walletId: string,
    chainId: number,
    tokenAddress: Address,
    tokenSymbol: string,
    thresholdWarning: string = '1000',
    thresholdCritical: string = '500'
  ): Promise<void> {
    const { error } = await supabase
      .from('pool_balances')
      .upsert({
        wallet_id: walletId,
        token_address: tokenAddress,
        token_symbol: tokenSymbol,
        balance: 0,
        threshold_warning: parseFloat(thresholdWarning),
        threshold_critical: parseFloat(thresholdCritical),
        last_updated: new Date().toISOString(),
      }, {
        onConflict: 'wallet_id,token_address',
      });

    if (error) {
      throw new Error(`Failed to initialize balance: ${error.message}`);
    }
  }

  /**
   * Update balance from on-chain data
   */
  async updateBalanceFromChain(
    chainId: number,
    tokenAddress: Address,
    walletId?: string
  ): Promise<PoolBalance> {
    // Get wallet if not provided
    if (!walletId) {
      const wallet = await poolWalletManager.getPoolWallet(chainId);
      if (!wallet) {
        throw new Error(`No pool wallet found for chain ${chainId}`);
      }
      walletId = wallet.id;
    }

    // Get on-chain balance
    const onChainBalance = await poolWalletManager.getTokenBalance(
      chainId,
      tokenAddress
    );

    // Get token symbol from database or guess from address
    const { data: existing } = await supabase
      .from('pool_balances')
      .select('token_symbol')
      .eq('wallet_id', walletId)
      .eq('token_address', tokenAddress)
      .single();

    const tokenSymbol = existing?.token_symbol || this.guessTokenSymbol(tokenAddress, chainId);

    // Update balance in database
    const { data, error } = await supabase
      .from('pool_balances')
      .upsert({
        wallet_id: walletId,
        token_address: tokenAddress,
        token_symbol: tokenSymbol,
        balance: parseFloat(onChainBalance),
        last_updated: new Date().toISOString(),
      }, {
        onConflict: 'wallet_id,token_address',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update balance: ${error.message}`);
    }

    return this.mapToPoolBalance(data);
  }

  /**
   * Get current balance from database
   */
  async getBalance(
    chainId: number,
    tokenAddress: Address
  ): Promise<PoolBalance | null> {
    const wallet = await poolWalletManager.getPoolWallet(chainId);
    if (!wallet) {
      return null;
    }

    const { data, error } = await supabase
      .from('pool_balances')
      .select('*')
      .eq('wallet_id', wallet.id)
      .eq('token_address', tokenAddress)
      .single();

    if (error) {
      return null;
    }

    return this.mapToPoolBalance(data);
  }

  /**
   * Get USDC balance for a chain
   */
  async getUSDCBalance(chainId: number): Promise<PoolBalance | null> {
    const usdcAddress = USDC_ADDRESSES[chainId];
    if (!usdcAddress) {
      throw new Error(`USDC not supported on chain ${chainId}`);
    }

    return this.getBalance(chainId, usdcAddress);
  }

  /**
   * Check if balance is sufficient for a transaction
   */
  async checkBalance(
    chainId: number,
    tokenAddress: Address,
    requiredAmount: string
  ): Promise<BalanceCheckResult> {
    const balance = await this.getBalance(chainId, tokenAddress);
    
    if (!balance) {
      // Try to initialize and fetch from chain
      const wallet = await poolWalletManager.getPoolWallet(chainId);
      if (wallet) {
        const newBalance = await this.updateBalanceFromChain(chainId, tokenAddress, wallet.id);
        return this.evaluateBalance(newBalance, requiredAmount);
      }
      
      return {
        hasBalance: false,
        currentBalance: '0',
        status: 'critical',
        needsReplenishment: true,
      };
    }

    return this.evaluateBalance(balance, requiredAmount);
  }

  /**
   * Evaluate balance against thresholds
   */
  private evaluateBalance(
    balance: PoolBalance,
    requiredAmount: string
  ): BalanceCheckResult {
    const current = parseFloat(balance.balance);
    const required = parseFloat(requiredAmount);
    const warning = parseFloat(balance.thresholdWarning);
    const critical = parseFloat(balance.thresholdCritical);

    const hasBalance = current >= required;
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    let needsReplenishment = false;

    if (current < critical) {
      status = 'critical';
      needsReplenishment = true;
    } else if (current < warning) {
      status = 'warning';
      needsReplenishment = true;
    }

    // If balance is below required amount, mark as needing replenishment
    if (!hasBalance && required > 0) {
      needsReplenishment = true;
      status = 'critical';
    }

    return {
      hasBalance,
      currentBalance: balance.balance,
      status,
      needsReplenishment,
    };
  }

  /**
   * Decrease balance after a transfer
   */
  async decreaseBalance(
    chainId: number,
    tokenAddress: Address,
    amount: string
  ): Promise<void> {
    const balance = await this.getBalance(chainId, tokenAddress);
    if (!balance) {
      throw new Error(`No balance record found for chain ${chainId}`);
    }

    const current = parseFloat(balance.balance);
    const decrease = parseFloat(amount);
    const newBalance = Math.max(0, current - decrease);

    const wallet = await poolWalletManager.getPoolWallet(chainId);
    if (!wallet) {
      throw new Error(`No pool wallet found for chain ${chainId}`);
    }

    const { error } = await supabase
      .from('pool_balances')
      .update({
        balance: newBalance,
        last_updated: new Date().toISOString(),
      })
      .eq('wallet_id', wallet.id)
      .eq('token_address', tokenAddress);

    if (error) {
      throw new Error(`Failed to decrease balance: ${error.message}`);
    }
  }

  /**
   * Increase balance after receiving tokens
   */
  async increaseBalance(
    chainId: number,
    tokenAddress: Address,
    amount: string
  ): Promise<void> {
    const balance = await this.getBalance(chainId, tokenAddress);
    
    const wallet = await poolWalletManager.getPoolWallet(chainId);
    if (!wallet) {
      throw new Error(`No pool wallet found for chain ${chainId}`);
    }

    const increase = parseFloat(amount);

    if (!balance) {
      // Initialize if doesn't exist
      const usdcAddress = USDC_ADDRESSES[chainId];
      const isUSDC = tokenAddress.toLowerCase() === usdcAddress.toLowerCase();
      
      await this.initializeBalance(
        wallet.id,
        chainId,
        tokenAddress,
        isUSDC ? 'USDC' : this.guessTokenSymbol(tokenAddress, chainId)
      );
    }

    const current = balance ? parseFloat(balance.balance) : 0;
    const newBalance = current + increase;

    const { error } = await supabase
      .from('pool_balances')
      .update({
        balance: newBalance,
        last_updated: new Date().toISOString(),
      })
      .eq('wallet_id', wallet.id)
      .eq('token_address', tokenAddress);

    if (error) {
      throw new Error(`Failed to increase balance: ${error.message}`);
    }
  }

  /**
   * Get all balances for monitoring
   */
  async getAllBalances(): Promise<PoolBalance[]> {
    const { data, error } = await supabase
      .from('pool_balances')
      .select('*')
      .order('chain_id', { ascending: true });

    if (error) {
      throw new Error(`Failed to get balances: ${error.message}`);
    }

    return (data || []).map((item: any) => this.mapToPoolBalance(item));
  }

  /**
   * Get balances that need replenishment
   */
  async getBalancesNeedingReplenishment(): Promise<PoolBalance[]> {
    const allBalances = await this.getAllBalances();
    return allBalances.filter((balance) => {
      const current = parseFloat(balance.balance);
      const critical = parseFloat(balance.thresholdCritical);
      return current < critical;
    });
  }

  /**
   * Guess token symbol from address
   */
  private guessTokenSymbol(tokenAddress: Address, chainId: number): string {
    // Check if USDC
    const usdcAddress = USDC_ADDRESSES[chainId];
    if (tokenAddress.toLowerCase() === usdcAddress.toLowerCase()) {
      return 'USDC';
    }

    // Native token
    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      return chainId === 137 ? 'MATIC' : 'ETH';
    }

    return 'UNKNOWN';
  }

  /**
   * Map database record to PoolBalance
   */
  private mapToPoolBalance(data: any): PoolBalance {
    return {
      id: data.id,
      walletId: data.wallet_id,
      tokenAddress: data.token_address as Address,
      tokenSymbol: data.token_symbol,
      balance: data.balance.toString(),
      thresholdWarning: data.threshold_warning.toString(),
      thresholdCritical: data.threshold_critical.toString(),
      lastUpdated: new Date(data.last_updated),
    };
  }

  /**
   * Sync all balances from on-chain
   */
  async syncAllBalances(): Promise<void> {
    const wallets = await poolWalletManager.loadPoolWallets();
    
    for (const wallet of wallets) {
      // Sync USDC balance
      const usdcAddress = USDC_ADDRESSES[wallet.chainId];
      if (usdcAddress) {
        try {
          await this.updateBalanceFromChain(wallet.chainId, usdcAddress, wallet.id);
        } catch (error) {
          console.error(`Failed to sync balance for chain ${wallet.chainId}:`, error);
        }
      }
    }
  }
}

export const poolBalanceTracker = new PoolBalanceTracker();

