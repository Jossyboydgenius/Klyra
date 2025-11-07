/**
 * Paystack Client for Mobile Money Payments
 * Handles payment initialization and verification without redirects
 */

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    customer: {
      id: number;
      email: string;
    };
  };
}

export class PaystackService {
  private secretKey: string;
  private publicKey: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
    this.publicKey = process.env.PAYSTACK_PUBLIC_KEY || '';
    
    if (!this.secretKey || !this.publicKey) {
      console.warn('Paystack keys not configured. Payments will fail.');
    }
  }

  /**
   * Initialize a payment transaction
   */
  async initializePayment(params: {
    email: string;
    amount: number; // in kobo (smallest currency unit)
    phone: string;
    currency: string;
    channels: string[]; // ['mobile_money', 'ussd', 'bank_transfer']
    metadata: {
      crypto_amount: string;
      crypto_asset: string;
      network: string;
      user_wallet: string;
      transaction_type: 'direct' | 'swap';
      chain_id?: string;
      token_address?: string;
      [key: string]: any; // Allow additional metadata fields
    };
  }): Promise<PaystackInitializeResponse> {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured. Please set PAYSTACK_SECRET_KEY environment variable.');
    }

    try {
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
    } catch (error: any) {
      console.error('Paystack initialization error:', error);
      // Re-throw with more context if it's not already an Error
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Paystack initialization failed: ${error?.message || String(error)}`);
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
    try {
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
    } catch (error) {
      console.error('Paystack verification error:', error);
      throw error;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(transactionId: string) {
    try {
      const response = await fetch(`https://api.paystack.co/transaction/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get transaction error:', error);
      throw error;
    }
  }

  /**
   * Charge mobile money directly (for supported countries)
   */
  async chargeMobileMoney(params: {
    email: string;
    amount: number;
    phone: string;
    provider: string; // 'mtn', 'airtel', 'vodafone', etc.
    currency: string;
    metadata: any;
  }) {
    try {
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
    } catch (error) {
      console.error('Mobile money charge error:', error);
      throw error;
    }
  }

  /**
   * Get supported banks for a country
   */
  async getSupportedBanks(country: string) {
    try {
      const response = await fetch(`https://api.paystack.co/bank?country=${country}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get banks error:', error);
      throw error;
    }
  }

  /**
   * Get public key for frontend usage
   */
  getPublicKey(): string {
    return this.publicKey;
  }

  /**
   * Create a transfer recipient
   * For mobile money transfers, use type: 'mobile_money'
   * For bank transfers, use type: 'nuban'
   */
  async createRecipient(params: {
    type: 'nuban' | 'mobile_money';
    name: string;
    account_number: string;
    bank_code?: string; // Required for nuban
    currency: string;
    email?: string;
    description?: string;
  }) {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured.');
    }

    try {
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
    } catch (error: any) {
      console.error('Create recipient error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to create recipient: ${error?.message || String(error)}`);
    }
  }

  /**
   * List transfer recipients
   */
  async listRecipients(params?: {
    perPage?: number;
    page?: number;
  }) {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured.');
    }

    try {
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
    } catch (error: any) {
      console.error('List recipients error:', error);
      throw error;
    }
  }

  /**
   * Initiate a transfer
   */
  async initiateTransfer(params: {
    source: 'balance';
    amount: number; // in kobo (NGN) or pesewas (GHS)
    recipient: string; // recipient code
    reference: string; // unique reference (16-50 chars, lowercase, digits, dash, underscore)
    reason?: string;
    currency?: string; // defaults to NGN
    account_reference?: string; // required for Kenya MPESA
  }) {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured.');
    }

    try {
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
    } catch (error: any) {
      console.error('Initiate transfer error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to initiate transfer: ${error?.message || String(error)}`);
    }
  }

  /**
   * Finalize a transfer (when OTP is required)
   */
  async finalizeTransfer(params: {
    transfer_code: string;
    otp: string;
  }) {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured.');
    }

    try {
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
    } catch (error: any) {
      console.error('Finalize transfer error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to finalize transfer: ${error?.message || String(error)}`);
    }
  }

  /**
   * Verify a transfer status
   */
  async verifyTransfer(reference: string) {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured.');
    }

    try {
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
    } catch (error: any) {
      console.error('Verify transfer error:', error);
      throw error;
    }
  }

  /**
   * List transfers
   */
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

    try {
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
    } catch (error: any) {
      console.error('List transfers error:', error);
      throw error;
    }
  }

  /**
   * Get transfer details by ID or code
   */
  async getTransfer(idOrCode: string) {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured.');
    }

    try {
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
    } catch (error: any) {
      console.error('Get transfer error:', error);
      throw error;
    }
  }
}

export const paystackService = new PaystackService();
