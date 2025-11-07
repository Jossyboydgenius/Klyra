import { NextRequest, NextResponse } from 'next/server';
import { transactionService } from '@/lib/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const email = searchParams.get('email');
    const limit = searchParams.get('limit');

    if (!walletAddress && !email) {
      return NextResponse.json(
        { success: false, error: 'Wallet address or email is required' },
        { status: 400 }
      );
    }

    let transactions;
    if (walletAddress) {
      transactions = await transactionService.getTransactionsByWallet(
        walletAddress,
        limit ? parseInt(limit) : undefined
      );
    } else if (email) {
      transactions = await transactionService.getTransactionsByEmail(
        email,
        limit ? parseInt(limit) : undefined
      );
    }

    return NextResponse.json({
      success: true,
      transactions: transactions || []
    });
  } catch (error: any) {
    console.error('Get transactions error:', error);
    
    // Don't expose database details to client
    const isDatabaseError = error?.code === '42P01' || error?.message?.includes('relation') || error?.message?.includes('does not exist');
    
    return NextResponse.json(
      { 
        success: false, 
        error: isDatabaseError 
          ? 'Transactions service is temporarily unavailable. Please try again later.'
          : 'Unable to retrieve transactions at this time. Please try again later.',
      },
      { status: 500 }
    );
  }
}

