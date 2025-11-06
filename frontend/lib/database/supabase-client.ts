/**
 * Supabase client for transaction management
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Transaction {
  id?: string;
  created_at?: string;
  updated_at?: string;
  user_email: string;
  user_phone: string;
  user_wallet_address: string;
  paystack_reference: string;
  paystack_access_code?: string;
  fiat_amount: number;
  fiat_currency: string;
  payment_status: 'pending' | 'success' | 'failed';
  payment_method?: string;
  crypto_asset: string;
  crypto_amount: string;
  network: string;
  chain_id?: string;
  token_address?: string;
  transaction_type: 'direct' | 'swap';
  coinbase_onramp_url?: string;
  coinbase_session_token?: string;
  onramp_status: 'pending' | 'generated' | 'executed' | 'completed';
  transfer_tx_hash?: string;
  transfer_status: 'pending' | 'success' | 'failed';
  transfer_completed_at?: string;
  swap_tx_hash?: string;
  swap_status?: 'pending' | 'success' | 'failed';
  swap_completed_at?: string;
  admin_processed_by?: string;
  admin_processed_at?: string;
  error_message?: string;
  retry_count: number;
}

export class TransactionService {
  /**
   * Create a new transaction record
   */
  async createTransaction(transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get transaction by Paystack reference
   */
  async getTransactionByReference(reference: string): Promise<Transaction | null> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('paystack_reference', reference)
        .single();

      if (error) {
        console.error('Error getting transaction by reference:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting transaction by reference:', error);
      return null;
    }
  }

  async getTransactionById(id: string): Promise<Transaction | null> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error getting transaction by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting transaction by ID:', error);
      return null;
    }
  }

  /**
   * Update transaction status
   */
  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get pending transactions for admin panel
   */
  async getPendingTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('payment_status', 'success')
      .eq('onramp_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting pending transactions:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get transactions ready for processing (onramp URL generated)
   */
  async getTransactionsReadyForProcessing(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('payment_status', 'success')
      .eq('onramp_status', 'generated')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting transactions ready for processing:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get all transactions with filters
   */
  async getTransactions(filters?: {
    status?: string;
    email?: string;
    limit?: number;
    offset?: number;
  }): Promise<Transaction[]> {
    let query = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('payment_status', filters.status);
    }

    if (filters?.email) {
      query = query.eq('user_email', filters.email);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting transactions:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Mark transaction as admin processed
   */
  async markAsProcessed(id: string, adminEmail: string): Promise<Transaction> {
    return this.updateTransaction(id, {
      onramp_status: 'executed',
      admin_processed_by: adminEmail,
      admin_processed_at: new Date().toISOString()
    });
  }

  /**
   * Update transfer status
   */
  async updateTransferStatus(id: string, status: 'success' | 'failed', txHash?: string, errorMessage?: string): Promise<Transaction> {
    const updates: Partial<Transaction> = {
      transfer_status: status,
      transfer_completed_at: new Date().toISOString()
    };

    if (txHash) {
      updates.transfer_tx_hash = txHash;
    }

    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    return this.updateTransaction(id, updates);
  }
}

export const transactionService = new TransactionService();
