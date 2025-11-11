// Payment Requests Database Functions

import { createClient } from '@supabase/supabase-js';
import type { PaymentRequest } from '../payment-types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface PaymentRequestDB {
  id: string;
  merchant_name: string;
  merchant_address: string;
  chain_id: number;
  token_address: string;
  token_symbol: string;
  token_decimals: number;
  amount: string;
  description: string;
  metadata: any;
  status: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  paid_at?: string;
  paid_by?: string;
  transaction_hash?: string;
}

export async function createPaymentRequest(data: {
  merchantName: string;
  merchantAddress: string;
  chainId: number;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  amount: string;
  description: string;
  expiresInHours?: number;
  metadata?: any;
}): Promise<PaymentRequest> {
  const id = generatePaymentId();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (data.expiresInHours || 24));

  const { data: result, error } = await supabase
    .from('payment_requests')
    .insert({
      id,
      merchant_name: data.merchantName,
      merchant_address: data.merchantAddress,
      chain_id: data.chainId,
      token_address: data.tokenAddress,
      token_symbol: data.tokenSymbol,
      token_decimals: data.tokenDecimals,
      amount: data.amount,
      description: data.description,
      metadata: data.metadata || {},
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[Payment Requests] Error creating payment request:', error);
    console.error('[Payment Requests] Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    
    // Provide helpful error message
    if (error.code === 'PGRST204' || error.message?.includes('does not exist')) {
      throw new Error(
        'Payment requests table does not exist. Please run the database migration to create the payment_requests table.'
      );
    }
    
    throw new Error(error.message || 'Failed to create payment request');
  }

  return mapToPaymentRequest(result);
}

export async function getPaymentRequest(id: string): Promise<PaymentRequest | null> {
  const { data, error } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[Payment Requests] Error getting payment request:', error);
    if (error.code === 'PGRST204' || error.message?.includes('does not exist')) {
      console.error('[Payment Requests] Payment requests table does not exist. Run migration 002_create_payment_requests_table.sql');
    }
    return null;
  }

  if (!data) return null;

  return mapToPaymentRequest(data);
}

export async function updatePaymentRequest(
  id: string,
  updates: {
    status?: string;
    paidBy?: string;
    paidAt?: Date;
    transactionHash?: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from('payment_requests')
    .update({
      ...(updates.status && { status: updates.status }),
      ...(updates.paidBy && { paid_by: updates.paidBy }),
      ...(updates.paidAt && { paid_at: updates.paidAt.toISOString() }),
      ...(updates.transactionHash && { transaction_hash: updates.transactionHash }),
    })
    .eq('id', id);

  if (error) {
    console.error('[Payment Requests] Error updating payment request:', error);
    if (error.code === 'PGRST204' || error.message?.includes('does not exist')) {
      throw new Error(
        'Payment requests table does not exist. Please run the database migration to create the payment_requests table.'
      );
    }
    throw new Error(error.message || 'Failed to update payment request');
  }
}

export async function getPaymentRequestsByMerchant(merchantAddress: string): Promise<PaymentRequest[]> {
  const { data, error } = await supabase
    .from('payment_requests')
    .select('*')
    .eq('merchant_address', merchantAddress)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Payment Requests] Error getting payment requests by merchant:', error);
    if (error.code === 'PGRST204' || error.message?.includes('does not exist')) {
      console.error('[Payment Requests] Payment requests table does not exist. Run migration 002_create_payment_requests_table.sql');
      return []; // Return empty array instead of throwing
    }
    throw new Error(error.message || 'Failed to get payment requests');
  }

  if (!data) return [];

  return data.map(mapToPaymentRequest);
}

export async function markAsExpired(id: string): Promise<void> {
  await updatePaymentRequest(id, { status: 'expired' });
}

function mapToPaymentRequest(data: PaymentRequestDB): PaymentRequest {
  return {
    id: data.id,
    merchant: {
      name: data.merchant_name,
      address: data.merchant_address,
      chain: data.chain_id,
      token: {
        address: data.token_address,
        symbol: data.token_symbol,
        decimals: data.token_decimals,
        name: data.token_symbol,
        logoURI: '',
        chainId: data.chain_id,
      },
    },
    amount: data.amount,
    description: data.description,
    metadata: data.metadata,
    status: data.status as any,
    createdAt: new Date(data.created_at),
    expiresAt: new Date(data.expires_at),
    paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
    paidBy: data.paid_by,
    transactionHash: data.transaction_hash,
    paymentLink: `${process.env.NEXT_PUBLIC_URL}/pay/${data.id}`,
  };
}

function generatePaymentId(): string {
  return `pay_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
