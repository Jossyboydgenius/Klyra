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
    this.secretKey = process.env.DEV_PAYSTACK_SECRET_KEY!;
    this.publicKey = process.env.DEV_PAYSTACK_PUBLIC_KEY!;
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
    };
  }): Promise<PaystackInitializeResponse> {
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
      
      if (!data.status) {
        throw new Error(data.message || 'Payment initialization failed');
      }

      return data;
    } catch (error) {
      console.error('Paystack initialization error:', error);
      throw error;
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
}

export const paystackService = new PaystackService();
