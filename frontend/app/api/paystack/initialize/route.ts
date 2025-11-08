import { NextRequest, NextResponse } from 'next/server';
import { paystackService } from '@/lib/paystack/paystack-client';
import { transactionService } from '@/lib/database/supabase-client';
import { CDPService } from '@/lib/cdp/cdp-client';

export async function POST(request: NextRequest) {
  try {
    // Check for Paystack keys first
    if (!process.env.DEV_PAYSTACK_SECRET_KEY || !process.env.PAYSTACK_PUBLIC_KEY) {
      console.error('Missing Paystack environment variables');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Paystack configuration error. Please check server environment variables.',
          details: process.env.NODE_ENV === 'development' ? 'Missing PAYSTACK_SECRET_KEY or PAYSTACK_PUBLIC_KEY' : undefined
        },
        { status: 500 }
      );
    }

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
      fiat_currency,
      provider,
      provider_channel
    } = await request.json();

    console.log('Received payment request:', { email, fiat_amount, fiat_currency, crypto_asset, crypto_amount });

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

    console.log('Initializing Paystack payment...');
    // Initialize Paystack payment
    let paystackResult;
    try {
      paystackResult = await paystackService.initializePayment({
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
          token_address: token_address,
          provider,
          provider_channel,
        }
      });
      console.log('Paystack initialization successful:', paystackResult.data.reference);
    } catch (paystackError: any) {
      console.error('Paystack API error:', paystackError);
      return NextResponse.json(
        { 
          success: false, 
          error: paystackError?.message || 'Payment initialization failed',
          details: process.env.NODE_ENV === 'development' ? {
            paystackError: paystackError?.message,
            stack: paystackError?.stack
          } : undefined
        },
        { status: 500 }
      );
    }

    if (!paystackResult.status) {
      return NextResponse.json(
        { 
          success: false, 
          error: paystackResult.message || 'Payment initialization failed',
          details: process.env.NODE_ENV === 'development' ? paystackResult : undefined
        },
        { status: 500 }
      );
    }

    console.log('Creating transaction record in database...');
    // Create transaction record in database
    let transaction;
    try {
      transaction = await transactionService.createTransaction({
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
        retry_count: 0,
        provider,
        provider_channel: provider_channel?.toString(),
      });
      console.log('Transaction record created:', transaction.id);
    } catch (dbError: any) {
      console.error('Database error creating transaction:', dbError);
      // Even if DB fails, we can still return the Paystack URL
      // The webhook will handle creating the record if needed
      return NextResponse.json(
        { 
          success: true,
          authorization_url: paystackResult.data.authorization_url,
          reference: paystackResult.data.reference,
          access_code: paystackResult.data.access_code,
          warning: 'Transaction record creation failed, but payment can proceed',
          details: process.env.NODE_ENV === 'development' ? {
            dbError: dbError?.message,
            code: dbError?.code
          } : undefined
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      authorization_url: paystackResult.data.authorization_url,
      reference: paystackResult.data.reference,
      access_code: paystackResult.data.access_code,
      transaction_id: transaction.id
    });
  } catch (error: any) {
    console.error('Paystack initialization error:', error);
    console.error('Error stack:', error?.stack);
    const errorMessage = error?.message || error?.error?.message || 'Internal server error';
    const errorDetails = error?.error || error;
    console.error('Error details:', JSON.stringify(errorDetails, null, 2));
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage, 
        details: process.env.NODE_ENV === 'development' ? {
          message: error?.message,
          code: error?.code,
          details: errorDetails
        } : undefined
      },
      { status: 500 }
    );
  }
}

