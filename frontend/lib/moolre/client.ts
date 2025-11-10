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

export async function validateAccount({
  receiver,
  channel,
  currency = 'GHS',
  sublistId,
}: ValidateAccountParams): Promise<ValidateAccountResponse> {
  const { baseUrl, apiUser, apiKey, accountNumber } = getCredentials();

  const payload: Record<string, unknown> = {
    type: 1,
    receiver,
    channel,
    currency,
    accountnumber: accountNumber,
  };

  if (sublistId) {
    payload.sublistid = sublistId;
  }

  const response = await fetch(`${baseUrl}/open/transact/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-USER': apiUser,
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Moolre validation failed with status ${response.status}: ${text}`,
    );
  }

  const data: ValidateAccountResponse = await response.json();
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

