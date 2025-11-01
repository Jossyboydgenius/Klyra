/**
 * Pool Replenishment Service
 * Monitors balances and triggers replenishment when needed
 */

import { poolBalanceTracker, BalanceCheckResult } from './pool-balance-tracker';
import { supabase } from '@/lib/database/supabase-client';
import type { Address } from 'viem';

export interface ReplenishmentJob {
  id: string;
  walletId: string;
  tokenAddress: Address;
  currentBalance: string;
  targetBalance: string;
  amountNeeded: string;
  method: 'swap' | 'external' | 'manual';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: string;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface ReplenishmentConfig {
  // Thresholds
  warningThreshold: number; // Start monitoring
  criticalThreshold: number; // Trigger replenishment
  
  // Replenishment amount
  replenishAmount: number; // How much to replenish
  
  // Method priority
  preferredMethod: 'swap' | 'external' | 'manual';
}

/**
 * Monitors pool balances and triggers replenishment
 */
export class PoolReplenishment {
  private config: ReplenishmentConfig;

  constructor(config?: Partial<ReplenishmentConfig>) {
    this.config = {
      warningThreshold: config?.warningThreshold || 1000,
      criticalThreshold: config?.criticalThreshold || 500,
      replenishAmount: config?.replenishAmount || 5000,
      preferredMethod: config?.preferredMethod || 'manual',
    };
  }

  /**
   * Check all balances and trigger replenishment if needed
   */
  async checkAndReplenish(): Promise<ReplenishmentJob[]> {
    const jobs: ReplenishmentJob[] = [];

    // Get all balances
    const balances = await poolBalanceTracker.getAllBalances();

    for (const balance of balances) {
      // Only check USDC balances
      if (balance.tokenSymbol !== 'USDC') {
        continue;
      }

      const current = parseFloat(balance.balance);
      const critical = parseFloat(balance.thresholdCritical);

      if (current < critical) {
        console.log(`Low balance detected: ${balance.tokenSymbol} on wallet ${balance.walletId}`);
        
        const job = await this.createReplenishmentJob(balance);
        jobs.push(job);
      }
    }

    return jobs;
  }

  /**
   * Create replenishment job
   */
  private async createReplenishmentJob(balance: any): Promise<ReplenishmentJob> {
    const current = parseFloat(balance.balance);
    const target = this.config.replenishAmount;
    const needed = target;

    // Insert into database
    const { data, error } = await supabase
      .from('replenishments')
      .insert({
        wallet_id: balance.walletId,
        token_address: balance.tokenAddress,
        current_balance: current,
        target_balance: target,
        amount_needed: needed,
        method: this.config.preferredMethod,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create replenishment job: ${error.message}`);
    }

    return this.mapToReplenishmentJob(data);
  }

  /**
   * Execute replenishment job
   */
  async executeReplenishment(jobId: string): Promise<void> {
    const job = await this.getReplenishmentJob(jobId);
    if (!job) {
      throw new Error(`Replenishment job ${jobId} not found`);
    }

    if (job.status !== 'pending') {
      throw new Error(`Replenishment job ${jobId} is not pending`);
    }

    try {
      // Update status to processing
      await this.updateReplenishmentStatus(jobId, 'processing');

      switch (job.method) {
        case 'manual':
          // Manual replenishment - just mark as pending for admin
          console.log(`Manual replenishment required for job ${jobId}`);
          break;

        case 'external':
          // External provider purchase (future implementation)
          console.log(`External replenishment not yet implemented for job ${jobId}`);
          await this.updateReplenishmentStatus(jobId, 'failed');
          await this.updateReplenishmentError(jobId, 'External replenishment not yet implemented');
          break;

        case 'swap':
          // Swap from other reserves (future implementation)
          console.log(`Swap replenishment not yet implemented for job ${jobId}`);
          await this.updateReplenishmentStatus(jobId, 'failed');
          await this.updateReplenishmentError(jobId, 'Swap replenishment not yet implemented');
          break;
      }

      // For manual, don't mark as completed - wait for admin action
      if (job.method !== 'manual') {
        await this.updateReplenishmentStatus(jobId, 'completed');
      }
    } catch (error: any) {
      console.error(`Replenishment job ${jobId} failed:`, error);
      await this.updateReplenishmentStatus(jobId, 'failed');
      await this.updateReplenishmentError(jobId, error.message);
    }
  }

  /**
   * Get replenishment job by ID
   */
  async getReplenishmentJob(jobId: string): Promise<ReplenishmentJob | null> {
    const { data, error } = await supabase
      .from('replenishments')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToReplenishmentJob(data);
  }

  /**
   * Get pending replenishments
   */
  async getPendingReplenishments(): Promise<ReplenishmentJob[]> {
    const { data, error } = await supabase
      .from('replenishments')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get pending replenishments: ${error.message}`);
    }

    return (data || []).map(item => this.mapToReplenishmentJob(item));
  }

  /**
   * Update replenishment status
   */
  private async updateReplenishmentStatus(jobId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('replenishments')
      .update({ status })
      .eq('id', jobId);

    if (error) {
      throw new Error(`Failed to update replenishment status: ${error.message}`);
    }
  }

  /**
   * Update replenishment error
   */
  private async updateReplenishmentError(jobId: string, errorMessage: string): Promise<void> {
    const { error } = await supabase
      .from('replenishments')
      .update({ error_message: errorMessage })
      .eq('id', jobId);

    if (error) {
      throw new Error(`Failed to update replenishment error: ${error.message}`);
    }
  }

  /**
   * Manually mark replenishment as completed (after admin action)
   */
  async markReplenishmentComplete(jobId: string, txHash?: string): Promise<void> {
    const { error } = await supabase
      .from('replenishments')
      .update({
        status: 'completed',
        tx_hash: txHash,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (error) {
      throw new Error(`Failed to mark replenishment complete: ${error.message}`);
    }
  }

  /**
   * Map database record to ReplenishmentJob
   */
  private mapToReplenishmentJob(data: any): ReplenishmentJob {
    return {
      id: data.id,
      walletId: data.wallet_id,
      tokenAddress: data.token_address,
      currentBalance: data.current_balance.toString(),
      targetBalance: data.target_balance.toString(),
      amountNeeded: data.amount_needed.toString(),
      method: data.method,
      status: data.status,
      txHash: data.tx_hash,
      errorMessage: data.error_message,
      createdAt: new Date(data.created_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
    };
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<ReplenishmentConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export const poolReplenishment = new PoolReplenishment();

