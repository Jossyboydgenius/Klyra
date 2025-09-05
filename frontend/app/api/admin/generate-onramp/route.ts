import { NextRequest, NextResponse } from 'next/server';
import { adminAuthService } from '@/lib/auth/admin-auth';
import { transactionService } from '@/lib/database/supabase-client';
import { cdpService } from '@/lib/cdp/cdp-client';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const authResult = await adminAuthService.verifyToken(token);

    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { transactionId } = await request.json();

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Get transaction details
    const transaction = await transactionService.getTransactionByReference(transactionId);
    
    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    if (transaction.payment_status !== 'success') {
      return NextResponse.json(
        { error: 'Payment not confirmed yet' },
        { status: 400 }
      );
    }

    // Generate Coinbase onramp URL
    const onrampResult = await cdpService.generateOnrampURL({
      amount: transaction.fiat_amount.toString(),
      asset: transaction.crypto_asset,
      network: transaction.network,
      destinationWallet: transaction.user_wallet_address
    });

    if (!onrampResult.success) {
      return NextResponse.json(
        { error: onrampResult.error },
        { status: 500 }
      );
    }

    // Update transaction with onramp URL
    await transactionService.updateTransaction(transaction.id!, {
      coinbase_onramp_url: onrampResult.url,
      coinbase_session_token: onrampResult.sessionToken,
      onramp_status: 'generated'
    });

    return NextResponse.json({
      success: true,
      onrampUrl: onrampResult.url
    });
  } catch (error) {
    console.error('Generate onramp API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
