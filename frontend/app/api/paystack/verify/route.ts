import { NextRequest, NextResponse } from 'next/server';
import { paystackService } from '@/lib/paystack/paystack-client';
import { transactionService } from '@/lib/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const { reference } = await request.json();

    if (!reference) {
      return NextResponse.json(
        { success: false, error: 'Reference is required' },
        { status: 400 }
      );
    }

    // Verify payment with Paystack
    const paystackResult = await paystackService.verifyPayment(reference);

    // Get transaction from database
    const transaction = await transactionService.getTransactionByReference(reference);

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found in database' },
        { status: 404 }
      );
    }

    // Update transaction status based on Paystack response
    const paymentStatus = paystackResult.data.status === 'success' ? 'success' : 
                         paystackResult.data.status === 'failed' ? 'failed' : 'pending';

    const updatedTransaction = await transactionService.updateTransaction(transaction.id!, {
      payment_status: paymentStatus,
      payment_method: paystackResult.data.channel || transaction.payment_method
    });

    return NextResponse.json({
      success: true,
      transaction: updatedTransaction,
      paystackData: paystackResult.data
    });
  } catch (error: any) {
    console.error('Paystack verify error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Failed to verify payment',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

