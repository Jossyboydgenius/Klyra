import { NextRequest, NextResponse } from 'next/server';
import { paystackService } from '@/lib/paystack/paystack-client';
import { transactionService } from '@/lib/database/supabase-client';
import { cdpService } from '@/lib/cdp/cdp-client';

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      phone,
      amount,
      currency,
      cryptoAsset,
      cryptoAmount,
      network,
      userWallet,
      paymentMethod
    } = await request.json();

    // Validate required fields
    if (!email || !phone || !amount || !currency || !cryptoAsset || !cryptoAmount || !network || !userWallet) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const callbackBase =
      process.env.PAYSTACK_CALLBACK_URL || process.env.NEXT_PUBLIC_URL || '';
    const callbackUrl = callbackBase
      ? callbackBase.includes('/payment/callback')
        ? callbackBase
        : `${callbackBase.replace(/\/$/, '')}/payment/callback`
      : undefined;

    // Determine transaction type (direct or swap)
    const transactionType = cdpService.isSwapRequired(cryptoAsset) ? 'swap' : 'direct';

    // Initialize Paystack payment
    const paymentChannels = paymentMethod === 'mobile_money' 
      ? ['mobile_money', 'ussd'] 
      : ['bank_transfer', 'ussd'];

    const paystackResult = await paystackService.initializePayment({
      email,
      amount: Math.round(amount * 100), // Convert to kobo/cents
      phone,
      currency,
      channels: paymentChannels,
      callback_url: callbackUrl,
      metadata: {
        crypto_amount: cryptoAmount,
        crypto_asset: cryptoAsset,
        network,
        user_wallet: userWallet,
        transaction_type: transactionType
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
      user_wallet_address: userWallet,
      paystack_reference: paystackResult.data.reference,
      paystack_access_code: paystackResult.data.access_code,
      fiat_amount: amount,
      fiat_currency: currency,
      payment_status: 'pending',
      payment_method: paymentMethod,
      crypto_asset: cryptoAsset,
      crypto_amount: cryptoAmount,
      network,
      transaction_type: transactionType,
      onramp_status: 'pending',
      transfer_status: 'pending',
      retry_count: 0
    });

    return NextResponse.json({
      success: true,
      data: {
        reference: paystackResult.data.reference,
        access_code: paystackResult.data.access_code,
        authorization_url: paystackResult.data.authorization_url,
        transaction_id: transaction.id,
        public_key: paystackService.getPublicKey()
      }
    });
  } catch (error) {
    console.error('Payment initialization error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
