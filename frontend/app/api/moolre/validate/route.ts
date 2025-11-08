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
};

const normalizeProvider = (provider?: string) =>
  provider?.trim().toUpperCase() ?? '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      receiver,
      channel,
      provider,
      currency = 'GHS',
      sublistId,
    }: {
      receiver?: string;
      channel?: number;
      provider?: string;
      currency?: string;
      sublistId?: string;
    } = body ?? {};

    if (!receiver || typeof receiver !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Receiver (account) is required.' },
        { status: 400 },
      );
    }

    const resolvedChannel =
      channel ??
      PROVIDER_CHANNEL_MAP[normalizeProvider(provider)] ??
      undefined;

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

    const result = await validateAccount({
      receiver,
      channel: resolvedChannel,
      currency,
      sublistId,
    });

    return NextResponse.json({
      success: result.status === 1,
      data: result,
    });
  } catch (error) {
    console.error('Moolre validation error', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Account validation failed. Please try again later.',
      },
      { status: 500 },
    );
  }
}

