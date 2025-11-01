/**
 * Pool Orders API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { orderQueue } from '@/lib/pool/order-queue';
import { adminAuthService } from '@/lib/auth/admin-auth';

/**
 * GET /api/pool/orders
 * Get orders by status
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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');

    const orders = await orderQueue.getOrdersByStatus(status, limit);

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get orders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pool/orders
 * Create new order
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const order = await orderQueue.createOrder({
      orderType: body.orderType,
      userWalletAddress: body.userWalletAddress,
      requestedToken: body.requestedToken,
      requestedAmount: body.requestedAmount,
      fiatAmount: body.fiatAmount,
      fiatCurrency: body.fiatCurrency,
      userEmail: body.userEmail,
      paystackReference: body.paystackReference,
    });

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}

