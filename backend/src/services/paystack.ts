export class PaystackService {
  private secretKey: string;
  private publicKey: string;

  constructor() {
    this.secretKey = process.env.DEV_PAYSTACK_SECRET_KEY || '';
    this.publicKey = process.env.DEV_PAYSTACK_PUBLIC_KEY || '';
    
    if (!this.secretKey || !this.publicKey) {
      console.warn('Paystack keys not configured. Payments will fail.');
    }
  }

  async initializePayment(params: {
    email: string;
    amount: number;
    phone: string;
    currency: string;
    channels: string[];
    callback_url?: string;
    metadata: any;
  }) {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured.');
    }

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amount,
        currency: params.currency,
        callback_url: params.callback_url,
        channels: params.channels,
        metadata: {
          ...params.metadata,
          phone: params.phone,
          custom_fields: [
            {
              display_name: "Phone Number",
              variable_name: "phone_number",
              value: params.phone
            }
          ]
        }
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.status) {
      const errorMessage = data.message || `Paystack API error: ${response.status} ${response.statusText}`;
      console.error('Paystack API error response:', data);
      throw new Error(errorMessage);
    }

    return data;
  }

  async verifyPayment(reference: string) {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!data.status) {
      throw new Error(data.message || 'Payment verification failed');
    }

    return data;
  }

  async getTransaction(transactionId: string) {
    const response = await fetch(`https://api.paystack.co/transaction/${transactionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return data;
  }

  async chargeMobileMoney(params: {
    email: string;
    amount: number;
    phone: string;
    provider: string;
    currency: string;
    metadata: any;
  }) {
    const response = await fetch('https://api.paystack.co/charge', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amount,
        currency: params.currency,
        mobile_money: {
          phone: params.phone,
          provider: params.provider
        },
        metadata: params.metadata
      }),
    });

    const data = await response.json();
    return data;
  }

  async getSupportedBanks(country: string) {
    const response = await fetch(`https://api.paystack.co/bank?country=${country}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return data;
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  async createRecipient(params: {
    type: 'nuban' | 'mobile_money';
    name: string;
    account_number: string;
    bank_code?: string;
    currency: string;
    email?: string;
    description?: string;
  }) {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured.');
    }

    const body: any = {
      type: params.type,
      name: params.name,
      currency: params.currency,
    };

    if (params.type === 'nuban') {
      body.account_number = params.account_number;
      body.bank_code = params.bank_code;
    } else if (params.type === 'mobile_money') {
      body.account_number = params.account_number;
    }

    if (params.email) body.email = params.email;
    if (params.description) body.description = params.description;

    const response = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      const errorMessage = data.message || `Paystack API error: ${response.status} ${response.statusText}`;
      console.error('Paystack create recipient error:', data);
      throw new Error(errorMessage);
    }

    return data;
  }

  async listRecipients(params?: {
    perPage?: number;
    page?: number;
  }) {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured.');
    }

    const queryParams = new URLSearchParams();
    if (params?.perPage) queryParams.append('perPage', params.perPage.toString());
    if (params?.page) queryParams.append('page', params.page.toString());

    const url = `https://api.paystack.co/transferrecipient${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      const errorMessage = data.message || `Paystack API error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return data;
  }

  async initiateTransfer(params: {
    source: 'balance';
    amount: number;
    recipient: string;
    reference: string;
    reason?: string;
    currency?: string;
    account_reference?: string;
  }) {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured.');
    }

    const body: any = {
      source: params.source,
      amount: params.amount,
      recipient: params.recipient,
      reference: params.reference,
    };

    if (params.reason) body.reason = params.reason;
    if (params.currency) body.currency = params.currency;
    if (params.account_reference) body.account_reference = params.account_reference;

    const response = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      const errorMessage = data.message || `Paystack API error: ${response.status} ${response.statusText}`;
      console.error('Paystack initiate transfer error:', data);
      throw new Error(errorMessage);
    }

    return data;
  }

  async finalizeTransfer(params: {
    transfer_code: string;
    otp: string;
  }) {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured.');
    }

    const response = await fetch('https://api.paystack.co/transfer/finalize_transfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transfer_code: params.transfer_code,
        otp: params.otp,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      const errorMessage = data.message || `Paystack API error: ${response.status} ${response.statusText}`;
      console.error('Paystack finalize transfer error:', data);
      throw new Error(errorMessage);
    }

    return data;
  }

  async verifyTransfer(reference: string) {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured.');
    }

    const response = await fetch(`https://api.paystack.co/transfer/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      const errorMessage = data.message || `Paystack API error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return data;
  }

  async listTransfers(params?: {
    perPage?: number;
    page?: number;
    recipient?: number;
    from?: string;
    to?: string;
  }) {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured.');
    }

    const queryParams = new URLSearchParams();
    if (params?.perPage) queryParams.append('perPage', params.perPage.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.recipient) queryParams.append('recipient', params.recipient.toString());
    if (params?.from) queryParams.append('from', params.from);
    if (params?.to) queryParams.append('to', params.to);

    const url = `https://api.paystack.co/transfer${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      const errorMessage = data.message || `Paystack API error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return data;
  }

  async getTransfer(idOrCode: string) {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured.');
    }

    const response = await fetch(`https://api.paystack.co/transfer/${idOrCode}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      const errorMessage = data.message || `Paystack API error: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    return data;
  }
}

export const paystackService = new PaystackService();

