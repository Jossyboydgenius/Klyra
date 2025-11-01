/**
 * Pool Execution API Route
 * Simplified endpoint for executing orders from webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { orderQueue } from '@/lib/pool/order-queue';

/**
 * POST /api/pool/execute
 * Execute order (called from Paystack webhook)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Process order asynchronously
    // Don't await - return immediately to webhook
    orderQueue.processOrder(orderId).catch((error) => {
      console.error(`Failed to process order ${orderId}:`, error);
    });

    return NextResponse.json({
      success: true,
      message: 'Order processing started',
    });
  } catch (error: any) {
    console.error('Execute order error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute order' },
      { status: 500 }
    );
  }
}

