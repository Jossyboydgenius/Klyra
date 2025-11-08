import { NextRequest, NextResponse } from 'next/server';
import { adminAuthService } from '@/lib/auth/admin-auth';
import { transactionService } from '@/lib/database/supabase-client';

export async function GET(request: NextRequest) {
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

    const transactions = await transactionService.getTransactions({
      limit: 40
    });

    return NextResponse.json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('Get transactions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
