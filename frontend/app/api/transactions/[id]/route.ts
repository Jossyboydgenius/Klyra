import { NextRequest, NextResponse } from 'next/server';
import { transactionService } from '@/lib/database/supabase-client';

type RouteParams = { id: string };
type RouteContext = { params: RouteParams } | { params: Promise<RouteParams> };

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const params = await Promise.resolve(context.params);
    const transaction = await transactionService.getTransaction(params.id);

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
  } catch (error: any) {
    console.error('Get transaction error:', error);
    
    // Don't expose database details to client
    const isDatabaseError = error?.code === '42P01' || error?.message?.includes('relation') || error?.message?.includes('does not exist');
    
    return NextResponse.json(
      { 
        success: false, 
        error: isDatabaseError 
          ? 'Transaction service is temporarily unavailable. Please try again later.'
          : 'Unable to retrieve transaction details at this time. Please try again later.',
      },
      { status: 500 }
    );
  }
}

