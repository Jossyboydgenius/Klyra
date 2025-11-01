/**
 * Order Queue
 * Manages liquidity orders with priority and rate limiting
 */

import { supabase } from '@/lib/database/supabase-client';
import { poolExecutor } from './pool-executor';
import { poolBalanceTracker } from './pool-balance-tracker';
import { pricingEngine, PriceQuote } from './pricing-engine';
import type { Token } from '@/lib/payment-types';
import type { Address } from 'viem';

export interface LiquidityOrder {
  id: string;
  orderType: 'onramp' | 'offramp';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  
  // User info
  userEmail?: string;
  userWalletAddress: Address;
  
  // Request
  requestedToken: Token;
  requestedAmount: string;
  
  // Fiat
  fiatAmount: string;
  fiatCurrency: string;
  
  // Pricing
  priceQuote?: PriceQuote;
  
  // Execution
  swapTxHash?: string;
  transferTxHash?: string;
  executedAt?: Date;
  completedAt?: Date;
  
  // Tracking
  paystackReference?: string;
  errorMessage?: string;
  retryCount: number;
  
  createdAt: Date;
}

export interface CreateOrderParams {
  orderType: 'onramp' | 'offramp';
  userWalletAddress: Address;
  requestedToken: Token;
  requestedAmount: string;
  fiatAmount: string;
  fiatCurrency: string;
  userEmail?: string;
  paystackReference?: string;
}

/**
 * Manages order queue and execution
 */
export class OrderQueue {
  /**
   * Create new order
   */
  async createOrder(params: CreateOrderParams): Promise<LiquidityOrder> {
    // Get price quote
    const priceQuote = params.orderType === 'onramp'
      ? await pricingEngine.getOnRampPrice(params.requestedToken, params.requestedAmount, params.fiatCurrency)
      : await pricingEngine.getOffRampPrice(params.requestedToken, params.requestedAmount, params.fiatCurrency);

    // Create order in database
    const { data, error } = await supabase
      .from('liquidity_orders')
      .insert({
        order_type: params.orderType,
        status: 'pending',
        user_email: params.userEmail,
        user_wallet_address: params.userWalletAddress,
        requested_token_address: params.requestedToken.address,
        requested_token_symbol: params.requestedToken.symbol,
        requested_chain_id: params.requestedToken.chainId,
        requested_amount: params.requestedAmount,
        fiat_amount: params.fiatAmount,
        fiat_currency: params.fiatCurrency,
        swap_rate: priceQuote.externalRate,
        your_rate: priceQuote.yourRate,
        markup_or_discount: priceQuote.markupOrDiscount,
        external_rate: priceQuote.externalRate,
        paystack_reference: params.paystackReference,
        retry_count: 0,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create order: ${error.message}`);
    }

    return this.mapToOrder(data);
  }

  /**
   * Process pending orders
   */
  async processOrder(orderId: string): Promise<void> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status !== 'pending') {
      throw new Error(`Order ${orderId} is not pending`);
    }

    try {
      // Update status to processing
      await this.updateOrderStatus(orderId, 'processing');

      // Log execution start
      await this.logExecution(orderId, 'execution_start', 'in_progress', {
        orderType: order.orderType,
        amount: order.requestedAmount,
        token: order.requestedToken.symbol,
      });

      let result;

      if (order.orderType === 'onramp') {
        result = await this.executeOnRamp(order);
      } else {
        result = await this.executeOffRamp(order);
      }

      if (result.success) {
        // Success
        await this.updateOrderStatus(orderId, 'completed');
        await this.updateOrderExecution(orderId, result.txHash, new Date());
        
        await this.logExecution(orderId, 'execution_complete', 'completed', {
          txHash: result.txHash,
          actualOutput: result.actualOutput,
        });
      } else {
        // Failed
        throw new Error(result.error || 'Execution failed');
      }
    } catch (error: any) {
      console.error(`Order ${orderId} processing failed:`, error);

      const retryCount = order.retryCount + 1;
      const shouldRetry = retryCount < 3; // Max 3 retries

      await this.updateOrderError(orderId, error.message, retryCount);

      if (!shouldRetry) {
        await this.updateOrderStatus(orderId, 'failed');
      }

      // Log failure
      await this.logExecution(orderId, 'execution_error', 'failed', {
        error: error.message,
        retryCount,
      });
    }
  }

  /**
   * Execute on-ramp order
   */
  private async executeOnRamp(order: LiquidityOrder): Promise<any> {
    console.log(`Executing on-ramp for order ${order.id}`);

    // Check balance
    const balanceCheck = await poolBalanceTracker.checkBalance(
      order.requestedToken.chainId,
      order.requestedToken.address,
      order.requestedAmount
    );

    // Log balance check
    await this.logExecution(order.id, 'balance_check', balanceCheck.hasBalance ? 'completed' : 'failed', {
      hasBalance: balanceCheck.hasBalance,
      currentBalance: balanceCheck.currentBalance,
    });

    if (!balanceCheck.hasBalance) {
      // This should trigger replenishment (future enhancement)
      throw new Error('Insufficient balance in pool');
    }

    // Execute swap/transfer
    const result = await poolExecutor.executeOnRamp({
      fromChain: order.requestedToken.chainId,
      toChain: order.requestedToken.chainId,
      fromToken: await this.getUSDCForChain(order.requestedToken.chainId),
      toToken: order.requestedToken,
      amount: order.requestedAmount,
      recipient: order.userWalletAddress,
    });

    return result;
  }

  /**
   * Execute off-ramp order
   */
  private async executeOffRamp(order: LiquidityOrder): Promise<any> {
    console.log(`Executing off-ramp for order ${order.id}`);

    // Execute swap to USDC
    const result = await poolExecutor.executeOffRamp(
      order.requestedToken.chainId,
      order.requestedToken,
      order.requestedAmount,
      order.userWalletAddress
    );

    return result;
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<LiquidityOrder | null> {
    const { data, error } = await supabase
      .from('liquidity_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToOrder(data);
  }

  /**
   * Get orders by status
   */
  async getOrdersByStatus(status: string, limit: number = 50): Promise<LiquidityOrder[]> {
    const { data, error } = await supabase
      .from('liquidity_orders')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get orders: ${error.message}`);
    }

    return (data || []).map(item => this.mapToOrder(item));
  }

  /**
   * Get order by Paystack reference
   */
  async getOrderByReference(reference: string): Promise<LiquidityOrder | null> {
    const { data, error } = await supabase
      .from('liquidity_orders')
      .select('*')
      .eq('paystack_reference', reference)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapToOrder(data);
  }

  /**
   * Update order status
   */
  private async updateOrderStatus(orderId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('liquidity_orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      throw new Error(`Failed to update order status: ${error.message}`);
    }
  }

  /**
   * Update order execution details
   */
  private async updateOrderExecution(orderId: string, txHash: string, completedAt: Date): Promise<void> {
    const { error } = await supabase
      .from('liquidity_orders')
      .update({
        swap_tx_hash: txHash,
        completed_at: completedAt.toISOString(),
      })
      .eq('id', orderId);

    if (error) {
      throw new Error(`Failed to update order execution: ${error.message}`);
    }
  }

  /**
   * Update order error
   */
  private async updateOrderError(orderId: string, errorMessage: string, retryCount: number): Promise<void> {
    const { error } = await supabase
      .from('liquidity_orders')
      .update({
        error_message: errorMessage,
        retry_count: retryCount,
      })
      .eq('id', orderId);

    if (error) {
      throw new Error(`Failed to update order error: ${error.message}`);
    }
  }

  /**
   * Log execution step
   */
  private async logExecution(
    orderId: string,
    stepName: string,
    status: string,
    data?: any
  ): Promise<void> {
    await supabase
      .from('execution_logs')
      .insert({
        order_id: orderId,
        step_name: stepName,
        step_type: stepName,
        status,
        data,
      });
  }

  /**
   * Get USDC token for a chain
   */
  private async getUSDCForChain(chainId: number): Promise<Token> {
    const addresses: Record<number, string> = {
      1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    };

    return {
      chainId,
      address: addresses[chainId] as Address,
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
    };
  }

  /**
   * Map database record to LiquidityOrder
   */
  private mapToOrder(data: any): LiquidityOrder {
    return {
      id: data.id,
      orderType: data.order_type,
      status: data.status,
      userEmail: data.user_email,
      userWalletAddress: data.user_wallet_address,
      requestedToken: {
        chainId: data.requested_chain_id,
        address: data.requested_token_address,
        name: '', // Not stored in DB
        symbol: data.requested_token_symbol,
        decimals: 18, // Default
      },
      requestedAmount: data.requested_amount,
      fiatAmount: data.fiat_amount,
      fiatCurrency: data.fiat_currency,
      swapTxHash: data.swap_tx_hash,
      transferTxHash: data.transfer_tx_hash,
      executedAt: data.executed_at ? new Date(data.executed_at) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      paystackReference: data.paystack_reference,
      errorMessage: data.error_message,
      retryCount: data.retry_count || 0,
      createdAt: new Date(data.created_at),
    };
  }
}

export const orderQueue = new OrderQueue();

