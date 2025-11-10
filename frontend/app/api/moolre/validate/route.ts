import { NextRequest, NextResponse } from 'next/server';
import { validateAccount } from '@/lib/moolre/client';

const PROVIDER_CHANNEL_MAP: Record<string, number> = {
  'MTN MOMO': 1,
  MTN: 1,
  'MTN MOBILE MONEY': 1,
  'VODAFONE CASH': 6,
  VODAFONE: 6,
  'AIRTELTIGO MONEY': 7,
  'AIRTELTIGO': 7,
  'AIRTEL TIGO': 7,
  'BANK TRANSFER': 2,
  BANK: 2,
};

const BANK_CHANNEL_ID = 2;

const normalizeProvider = (provider?: string) =>
  provider?.trim().toUpperCase() ?? '';

const parseChannel = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const normalizeString = (value?: unknown) =>
  typeof value === 'string' ? value.trim() : undefined;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Moolre API Route] Received request body:', JSON.stringify(body, null, 2));
    
    const {
      accountNumber,
      receiver,
      channel,
      provider,
      bankCode,
      currency = 'GHS',
      sublistId,
    }: {
      accountNumber?: string;
      receiver?: string;
      channel?: number | string;
      provider?: string;
      bankCode?: string;
      currency?: string;
      sublistId?: string;
    } = body ?? {};

    const normalizedAccountNumber = normalizeString(accountNumber);
    const normalizedReceiver = normalizeString(receiver);
    const targetReceiver = normalizedAccountNumber ?? normalizedReceiver;

    if (!targetReceiver) {
      return NextResponse.json(
        { success: false, error: 'Receiver (account) is required.' },
        { status: 400 },
      );
    }

    const normalizedProvider = normalizeProvider(provider);
    const providedChannel = parseChannel(channel);
    const normalizedBankCode = normalizeString(bankCode);
    const normalizedSublistId = normalizeString(sublistId);

    const resolvedChannel =
      providedChannel ??
      (normalizedProvider
        ? PROVIDER_CHANNEL_MAP[normalizedProvider]
        : undefined) ??
      (normalizedBankCode ? BANK_CHANNEL_ID : undefined);

    if (!resolvedChannel) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unable to resolve channel. Provide a channel id or a supported provider name.',
        },
        { status: 400 },
      );
    }

    // Log the request parameters that will be sent to Moolre client
    console.log('[Moolre API Route] Calling validateAccount with:', {
      receiver: targetReceiver,
      channel: resolvedChannel,
      currency,
      sublistId:
        normalizedBankCode && resolvedChannel === BANK_CHANNEL_ID
          ? normalizedBankCode
          : normalizedSublistId,
    });

    // This call will add type: 1 and accountnumber from env vars
    const result = await validateAccount({
      receiver: targetReceiver,
      channel: resolvedChannel,
      currency,
      sublistId:
        normalizedBankCode && resolvedChannel === BANK_CHANNEL_ID
          ? normalizedBankCode
          : normalizedSublistId,
    });

    console.log('[Moolre API Route] Validation result:', JSON.stringify(result, null, 2));

    return NextResponse.json({
      success: result.status === 1,
      data: result,
    });
  } catch (error) {
    console.error('[Moolre API Route] Validation error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Account validation failed. Please try again later.';
    
    // Check if it's a credentials error
    if (errorMessage.includes('Missing Moolre credentials')) {
      console.error('[Moolre API Route] Missing credentials. Check environment variables:');
      console.error('  - MOOLRE_USERNAME or NEXT_PUBLIC_MOOLRE_USERNAME');
      console.error('  - MOOLRE_PRIVATE_API_KEY or NEXT_PUBLIC_MOOLRE_PRIVATE_API_KEY');
      console.error('  - MOOLRE_ACCOUNT_NUMBER or NEXT_PUBLIC_MOOLRE_ACCOUNT_NUMBER');
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error: Moolre credentials are not configured. Check server logs for details.',
        },
        { status: 500 },
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
