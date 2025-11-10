import { randomUUID } from 'crypto';

type ValidateAccountParams = {
  receiver: string;
  channel: number;
  currency?: string;
  sublistId?: string;
};

type ValidateAccountResponse = {
  status: number;
  code: string;
  message: string;
  data: string | null;
  go: unknown;
};

type SendSmsMessage = {
  recipient: string;
  message: string;
  ref?: string;
};

type SendSmsParams = {
  senderId?: string;
  messages: SendSmsMessage[];
};

const getEnv = (...keys: (string | undefined)[]) => {
  for (const key of keys) {
    if (!key) continue;
    const value = process.env[key];
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
};

const buildBaseUrl = () => {
  const raw =
    getEnv(
      'MOOLRE_API_BASE_URL',
      'NEXT_PUBLIC_MOOLRE_API_BASE_URL',
      'MOORLE_API_BASE_URL',
      'NEXT_PUBLIC_MOORLE_API_BASE_URL',
    ) ?? 'https://api.moolre.com';

  return raw.replace(/\/$/, '');
};

const getCredentials = () => {
  const baseUrl = buildBaseUrl();
  const apiUser =
    getEnv(
      'MOOLRE_USERNAME',
      'NEXT_PUBLIC_MOOLRE_USERNAME',
      'MOORLE_USERNAME',
      'NEXT_PUBLIC_MOORLE_USERNAME',
    ) ?? '';
  const apiKey =
    getEnv(
      'MOOLRE_PRIVATE_API_KEY',
      'NEXT_PUBLIC_MOOLRE_PRIVATE_API_KEY',
      'MOORLE_PRIVATE_API_KEY',
      'NEXT_PUBLIC_MOORLE_PRIVATE_API_KEY',
      'NEXT_PUBLIC_MOOLRE_PUBLIC_API_KEY',
      'NEXT_PUBLIC_MOORLE_PUBLIC_API_KEY',
    ) ?? '';
  const accountNumber =
    getEnv(
      'MOOLRE_ACCOUNT_NUMBER',
      'NEXT_PUBLIC_MOOLRE_ACCOUNT_NUMBER',
      'MOORLE_ACCOUNT_NUMBER',
      'NEXT_PUBLIC_MOORLE_ACCOUNT_NUMBER',
    ) ?? '';

  if (!apiUser || !apiKey || !accountNumber) {
    throw new Error(
      'Missing Moolre credentials. Ensure username, API key, and account number are configured.',
    );
  }

  return { baseUrl, apiUser, apiKey, accountNumber };
};

const getSmsCredentials = () => {
  const senderId =
    getEnv(
      'MOOLRE_SMS_SENDER_ID',
      'NEXT_PUBLIC_MOOLRE_SMS_SENDER_ID',
      'MOORLE_SMS_SENDER_ID',
      'NEXT_PUBLIC_MOORLE_SMS_SENDER_ID',
    ) ?? '';
  const smsApiKey =
    getEnv(
      'MOOLRE_SMS_API_KEY',
      'NEXT_PUBLIC_MOOLRE_SMS_API_KEY',
      'MOORLE_SMS_API_KEY',
      'NEXT_PUBLIC_MOORLE_SMS_API_KEY',
    ) ?? '';

  if (!smsApiKey) {
    throw new Error(
      'Missing Moolre SMS API key. Configure MOOLRE_SMS_API_KEY to enable SMS notifications.',
    );
  }

  return { senderId, smsApiKey };
};

/**
 * Validates a mobile money or bank account with Moolre API
 * 
 * NOTE: This function adds 'type: 1' and 'accountnumber' from environment variables
 * to the payload before sending to Moolre. The frontend only sends receiver, channel, and currency.
 * 
 * Required payload fields sent to Moolre:
 * - type: 1 (added here)
 * - receiver: Mobile money number or bank account number
 * - channel: Channel ID (1=MTN, 6=Vodafone, 7=AirtelTigo, 2=Bank)
 * - currency: Currency code (GHS, NGN, etc.)
 * - accountnumber: Moolre account number (added from env vars here)
 * - sublistid: Optional, only for bank transfers (channel 2)
 */
export async function validateAccount({
  receiver,
  channel,
  currency = 'GHS',
  sublistId,
}: ValidateAccountParams): Promise<ValidateAccountResponse> {
  // Get credentials first
  const { baseUrl, apiUser, apiKey, accountNumber } = getCredentials();

  // Ensure channel is a number
  const channelNumber = typeof channel === 'string' ? parseInt(channel, 10) : channel;
  
  // Validate required fields
  if (!receiver || String(receiver).trim() === '') {
    throw new Error('Receiver is required');
  }
  
  if (!channelNumber || isNaN(channelNumber)) {
    throw new Error('Valid channel is required');
  }
  
  if (!accountNumber || accountNumber.trim() === '') {
    throw new Error('Moolre account number is not configured. Set MOOLRE_ACCOUNT_NUMBER environment variable.');
  }
  
  // Construct payload EXACTLY as Moolre API expects - ALL 5 REQUIRED FIELDS
  const payload = {
    type: 1,  // Required: ID of the account status function
    receiver: String(receiver).trim(),  // Required: Mobile money number or bank account number
    channel: channelNumber,  // Required: Channel ID (1=MTN, 6=Vodafone, 7=AirtelTigo, 2=Bank)
    currency: String(currency).toUpperCase(),  // Required: Currency (GHS, NGN, etc.)
    accountnumber: String(accountNumber).trim(),  // Required: Your Moolre account number
  };

  // Add sublistid only for bank transfers (channel 2) - this is optional
  if (sublistId && channelNumber === 2) {
    (payload as typeof payload & { sublistid: string }).sublistid = String(sublistId).trim();
  }

  // Verify payload has all 5 required fields before sending
  if (!payload.type || !payload.receiver || !payload.channel || !payload.currency || !payload.accountnumber) {
    throw new Error(
      `Missing required fields in payload. Expected: type, receiver, channel, currency, accountnumber. ` +
      `Got: ${JSON.stringify(payload)}`
    );
  }

  // Log the complete payload being sent to Moolre
  console.log('[Moolre Client] ========================================');
  console.log('[Moolre Client] Sending validation request to Moolre');
  console.log('[Moolre Client] URL:', `${baseUrl}/open/transact/validate`);
  console.log('[Moolre Client] Payload (ALL 5 FIELDS):', JSON.stringify(payload, null, 2));
  console.log('[Moolre Client] Headers:', {
    'Content-Type': 'application/json',
    'X-API-USER': apiUser,
    'X-API-KEY': apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING',
  });
  console.log('[Moolre Client] ========================================');

  // Send request to Moolre API
  const response = await fetch(`${baseUrl}/open/transact/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-USER': apiUser,
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log('[Moolre Client] Response status:', response.status);
  console.log('[Moolre Client] Response body:', responseText);

  if (!response.ok) {
    throw new Error(
      `Moolre validation failed with status ${response.status}: ${responseText}`,
    );
  }

  const data: ValidateAccountResponse = JSON.parse(responseText);
  return data;
}

export async function sendSms({
  senderId,
  messages,
}: SendSmsParams): Promise<ValidateAccountResponse> {
  const baseUrl = buildBaseUrl();
  const { senderId: defaultSenderId, smsApiKey } = getSmsCredentials();

  const payload = {
    type: 1,
    senderid: senderId || defaultSenderId,
    messages: messages.map((message) => ({
      recipient: message.recipient,
      message: message.message,
      ref: message.ref || randomUUID(),
    })),
  };

  const response = await fetch(`${baseUrl}/open/sms/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-VASKEY': smsApiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Moolre SMS failed with status ${response.status}: ${text}`,
    );
  }

  const data: ValidateAccountResponse = await response.json();
  return data;
}

