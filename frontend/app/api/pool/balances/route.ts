/**
 * Pool Balance API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { poolBalanceTracker } from '@/lib/pool/pool-balance-tracker';
import { adminAuthService } from '@/lib/auth/admin-auth';

/**
 * GET /api/pool/balances
 * Get all pool balances
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const authResult = await adminAuthService.verifyToken(token);

    if (!authResult.valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get all balances
    const balances = await poolBalanceTracker.getAllBalances();

    return NextResponse.json({ balances });
  } catch (error: any) {
    console.error('Get balances error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get balances' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pool/balances/sync
 * Sync all balances from on-chain
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const authResult = await adminAuthService.verifyToken(token);

    if (!authResult.valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Sync all balances
    await poolBalanceTracker.syncAllBalances();

    return NextResponse.json({ message: 'Balances synced successfully' });
  } catch (error: any) {
    console.error('Sync balances error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync balances' },
      { status: 500 }
    );
  }
}

