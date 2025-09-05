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

    // Mark as processed by admin
    await transactionService.markAsProcessed(transaction.id!, authResult.email!);

    // Initiate automatic transfer to user wallet
    if (transaction.transaction_type === 'direct') {
      // Direct transfer for USDC, USDT, ETH
      const transferResult = await cdpService.transferToUser({
        to: transaction.user_wallet_address,
        amount: transaction.crypto_amount,
        token: transaction.crypto_asset.toLowerCase(),
        network: transaction.network.toLowerCase()
      });

      if (transferResult.success) {
        await transactionService.updateTransferStatus(
          transaction.id!,
          'success',
          transferResult.transactionHash
        );
      } else {
        await transactionService.updateTransferStatus(
          transaction.id!,
          'failed',
          undefined,
          transferResult.error
        );
      }
    } else {
      // Swap required for other tokens
      // This will be implemented in the next phase
      await transactionService.updateTransaction(transaction.id!, {
        error_message: 'Swap functionality not yet implemented'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction marked as processed and transfer initiated'
    });
  } catch (error) {
    console.error('Mark processed API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
