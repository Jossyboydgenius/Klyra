import { NextRequest, NextResponse } from 'next/server';
import { paystackService } from '@/lib/paystack/paystack-client';
import { transactionService } from '@/lib/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const { reference } = await request.json();

    if (!reference) {
      return NextResponse.json(
        { success: false, error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    // Verify payment with Paystack
    const verificationResult = await paystackService.verifyPayment(reference);

    if (!verificationResult.status) {
      return NextResponse.json(
        { success: false, error: 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Get transaction from database
    const transaction = await transactionService.getTransactionByReference(reference);

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Update transaction status based on Paystack response
    const paymentStatus = verificationResult.data.status === 'success' ? 'success' : 'failed';
    
    await transactionService.updateTransaction(transaction.id!, {
      payment_status: paymentStatus,
      payment_method: verificationResult.data.channel
    });

    return NextResponse.json({
      success: true,
      data: {
        status: paymentStatus,
        amount: verificationResult.data.amount / 100, // Convert from kobo/cents
        currency: verificationResult.data.currency,
        paid_at: verificationResult.data.paid_at,
        channel: verificationResult.data.channel
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
