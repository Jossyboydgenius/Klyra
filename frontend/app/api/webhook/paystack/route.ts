import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { paystackService } from '@/lib/paystack/paystack-client';
import { transactionService } from '@/lib/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', process.env.DEV_PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);

    // Handle different webhook events
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;
      case 'charge.failed':
        await handleChargeFailed(event.data);
        break;
      default:
        console.log(`Unhandled webhook event: ${event.event}`);
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleChargeSuccess(data: any) {
  try {
    const reference = data.reference;
    const transaction = await transactionService.getTransactionByReference(reference);

    if (transaction) {
      await transactionService.updateTransaction(transaction.id!, {
        payment_status: 'success',
        payment_method: data.channel
      });

      console.log(`Payment confirmed for transaction: ${transaction.id}`);
    }
  } catch (error) {
    console.error('Error handling charge success:', error);
  }
}

async function handleChargeFailed(data: any) {
  try {
    const reference = data.reference;
    const transaction = await transactionService.getTransactionByReference(reference);

    if (transaction) {
      await transactionService.updateTransaction(transaction.id!, {
        payment_status: 'failed',
        error_message: data.gateway_response || 'Payment failed'
      });

      console.log(`Payment failed for transaction: ${transaction.id}`);
    }
  } catch (error) {
    console.error('Error handling charge failure:', error);
  }
}
