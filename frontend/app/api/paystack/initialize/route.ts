import { NextRequest, NextResponse } from 'next/server';
import { paystackService } from '@/lib/paystack/paystack-client';
import { transactionService } from '@/lib/database/supabase-client';
import { CDPService } from '@/lib/cdp/cdp-client';

export async function POST(request: NextRequest) {
  try {
    const {
      country,
      crypto_asset,
      network,
      chain_id,
      token_address,
      crypto_amount,
      user_wallet_address,
      email,
      phone,
      fiat_amount,
      fiat_currency
    } = await request.json();

    // Validate required fields
    if (!crypto_asset || !crypto_amount || !network || !user_wallet_address) {
      return NextResponse.json(
        { success: false, error: 'Missing required crypto fields' },
        { status: 400 }
      );
    }

    // If email/phone/amount/currency are provided, use them; otherwise we need to calculate from crypto amount
    if (!email || !phone || !fiat_amount || !fiat_currency) {
      return NextResponse.json(
        { success: false, error: 'Missing required payment fields. Please provide email, phone, fiat_amount, and fiat_currency.' },
        { status: 400 }
      );
    }

    // Determine transaction type (direct or swap)
    // Use static method to avoid CDP client initialization if not needed
    const transactionType = CDPService.isSwapRequired(crypto_asset) ? 'swap' : 'direct';

    // Initialize Paystack payment
    const paystackResult = await paystackService.initializePayment({
      email,
      amount: Math.round(fiat_amount * 100), // Convert to kobo/cents
      phone,
      currency: fiat_currency,
      channels: ['mobile_money', 'bank_transfer', 'ussd'],
      metadata: {
        crypto_amount: crypto_amount,
        crypto_asset: crypto_asset,
        network: network,
        user_wallet: user_wallet_address,
        transaction_type: transactionType,
        chain_id: chain_id?.toString(),
        token_address: token_address
      }
    });

    if (!paystackResult.status) {
      return NextResponse.json(
        { success: false, error: 'Payment initialization failed' },
        { status: 500 }
      );
    }

    // Create transaction record in database
    const transaction = await transactionService.createTransaction({
      user_email: email,
      user_phone: phone,
      user_wallet_address: user_wallet_address,
      paystack_reference: paystackResult.data.reference,
      paystack_access_code: paystackResult.data.access_code,
      fiat_amount: fiat_amount,
      fiat_currency: fiat_currency,
      payment_status: 'pending',
      payment_method: 'mobile_money', // Default, can be updated
      crypto_asset: crypto_asset,
      crypto_amount: crypto_amount,
      network: network,
      chain_id: chain_id?.toString(),
      token_address: token_address,
      transaction_type: transactionType,
      onramp_status: 'pending',
      transfer_status: 'pending',
      retry_count: 0
    });

    return NextResponse.json({
      success: true,
      authorization_url: paystackResult.data.authorization_url,
      reference: paystackResult.data.reference,
      access_code: paystackResult.data.access_code,
      transaction_id: transaction.id
    });
  } catch (error: any) {
    console.error('Paystack initialization error:', error);
    const errorMessage = error?.message || error?.error?.message || 'Internal server error';
    const errorDetails = error?.error || error;
    console.error('Error details:', errorDetails);
    return NextResponse.json(
      { success: false, error: errorMessage, details: process.env.NODE_ENV === 'development' ? errorDetails : undefined },
      { status: 500 }
    );
  }
}

