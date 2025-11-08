/**
 * Paystack Liquidity Pool Webhook
 * Handles Paystack payment confirmations and triggers liquidity pool execution
 */

import { NextRequest, NextResponse } from 'next/server';
import { orderQueue } from '@/lib/pool/order-queue';
import { supabase } from '@/lib/database/supabase-client';
import crypto from 'crypto';

/**
 * POST /api/webhooks/paystack-liquidity
 * Handle Paystack webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-paystack-signature');

    // Verify webhook signature (optional but recommended)
    if (signature) {
      const isValid = verifyPaystackSignature(body, signature);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    const event = body.event;
    const data = body.data;

    console.log('Paystack webhook event:', event);

    // Handle successful payment
    if (event === 'charge.success') {
      await handleSuccessfulPayment(data);
    }

    return NextResponse.json({ message: 'Webhook processed' });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle successful payment
 */
async function handleSuccessfulPayment(data: any) {
  const reference = data.reference;
  const amount = data.amount / 100; // Convert from kobo/cents

  console.log(`Processing successful payment: ${reference}, Amount: ${amount}`);

  // Get order by Paystack reference
  const order = await orderQueue.getOrderByReference(reference);

  if (!order) {
    console.log(`No order found for reference: ${reference}`);
    return;
  }

  if (order.status !== 'pending') {
    console.log(`Order ${order.id} is not pending: ${order.status}`);
    return;
  }

  // Process order
  await orderQueue.processOrder(order.id);
}

/**
 * Verify Paystack webhook signature
 */
function verifyPaystackSignature(body: any, signature: string): boolean {
  const secretKey = process.env.DEV_PAYSTACK_SECRET_KEY || '';
  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(JSON.stringify(body))
    .digest('hex');

  return hash === signature;
}

