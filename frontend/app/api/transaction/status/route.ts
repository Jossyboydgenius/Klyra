import { NextRequest, NextResponse } from 'next/server';
import { transactionService } from '@/lib/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json(
        { success: false, error: 'Reference is required' },
        { status: 400 }
      );
    }

    const transaction = await transactionService.getTransactionByReference(reference);

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      transaction
    });
  } catch (error) {
    console.error('Get transaction status error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
