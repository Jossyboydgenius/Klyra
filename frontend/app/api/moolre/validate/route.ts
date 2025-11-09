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

    const result = await validateAccount({
      receiver: targetReceiver,
      channel: resolvedChannel,
      currency,
      sublistId:
        normalizedBankCode && resolvedChannel === BANK_CHANNEL_ID
          ? normalizedBankCode
          : normalizedSublistId,
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
