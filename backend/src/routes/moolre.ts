import { Router, Request, Response } from 'express';
import { sendSms, validateAccount } from '../services/moolre.js';

const router = Router();

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

router.post('/sms', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const {
      recipient,
      message,
      senderId,
      ref,
    }: { recipient?: string; message?: string; senderId?: string; ref?: string } =
      body ?? {};

    if (!recipient || !message) {
      return res.status(400).json({
        success: false,
        error: 'Recipient and message are required to send SMS.',
      });
    }

    const result = await sendSms({
      senderId,
      messages: [{ recipient, message, ref }],
    });

    return res.json({
      success: result.status === 1,
      data: result,
    });
  } catch (error) {
    console.error('Moolre SMS error', error);
    return res.status(500).json({
      success: false,
      error: 'SMS dispatch failed. Please try again later.',
    });
  }
});

router.post('/validate', async (req: Request, res: Response) => {
  try {
    const body = req.body;
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
      return res.status(400).json({
        success: false,
        error: 'Receiver (account) is required.'
      });
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
      return res.status(400).json({
        success: false,
        error:
          'Unable to resolve channel. Provide a channel id or a supported provider name.',
      });
    }

    console.log('[Moolre API Route] Calling validateAccount with:', {
      receiver: targetReceiver,
      channel: resolvedChannel,
      currency,
      sublistId:
        normalizedBankCode && resolvedChannel === BANK_CHANNEL_ID
          ? normalizedBankCode
          : normalizedSublistId,
    });

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

    return res.json({
      success: result.status === 1,
      data: result,
    });
  } catch (error) {
    console.error('[Moolre API Route] Validation error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Account validation failed. Please try again later.';
    
    if (errorMessage.includes('Missing Moolre credentials')) {
      console.error('[Moolre API Route] Missing credentials. Check environment variables:');
      console.error('  - MOOLRE_USERNAME or NEXT_PUBLIC_MOOLRE_USERNAME');
      console.error('  - MOOLRE_PRIVATE_API_KEY or NEXT_PUBLIC_MOOLRE_PRIVATE_API_KEY');
      console.error('  - MOOLRE_ACCOUNT_NUMBER or NEXT_PUBLIC_MOOLRE_ACCOUNT_NUMBER');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error: Moolre credentials are not configured. Check server logs for details.',
      });
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

export default router;

