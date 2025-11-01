/**
 * Pool Order Detail API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { orderQueue } from '@/lib/pool/order-queue';
import { adminAuthService } from '@/lib/auth/admin-auth';

/**
 * GET /api/pool/orders/[id]
 * Get order details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await orderQueue.getOrder(params.id);
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error('Get order error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get order' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pool/orders/[id]/process
 * Process pending order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Process order
    await orderQueue.processOrder(params.id);

    return NextResponse.json({ message: 'Order processed successfully' });
  } catch (error: any) {
    console.error('Process order error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process order' },
      { status: 500 }
    );
  }
}

