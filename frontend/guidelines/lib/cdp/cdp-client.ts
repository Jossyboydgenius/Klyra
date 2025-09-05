/**
 * CDP (Coinbase Developer Platform) Client for Server Wallet v2
 * Handles automatic signing and transaction execution
 */
import { CdpClient } from '@coinbase/cdp-sdk';
import { generateJwt } from '@coinbase/cdp-sdk/auth';

interface TransferParams {
  to: string;
  amount: string;
  token: string;
  network: string;
}

interface SwapParams {
  fromToken: string;
  toToken: string;
  amount: string;
  network: string;
}

export class CDPService {
  private cdp: CdpClient;
  private mainAccount: any;
  
  constructor() {
    this.cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID!,
      apiKeySecret: process.env.CDP_API_KEY_SECRET!,
      walletSecret: process.env.CDP_WALLET_SECRET!,
    });
  }

  /**
   * Initialize the main server wallet account
   */
  async initializeMainAccount() {
    try {
      // Get or create the main account that will handle all transactions
      this.mainAccount = await this.cdp.evm.getOrCreateAccount({
        name: "PaymasterMainAccount"
      });
      
      console.log(`Main account initialized: ${this.mainAccount.address}`);
      return this.mainAccount;
    } catch (error) {
      console.error('Failed to initialize main account:', error);
      throw error;
    }
  }

  /**
   * Transfer tokens directly to user wallet
   * Used for USDC, USDT, ETH that are directly available on Coinbase
   */
  async transferToUser(params: TransferParams) {
    try {
      if (!this.mainAccount) {
        await this.initializeMainAccount();
      }

      const { transactionHash } = await this.mainAccount.transfer({
        to: params.to,
        amount: params.amount,
        token: params.token,
        network: params.network
      });

      console.log(`Transfer completed: ${transactionHash}`);
      return { success: true, transactionHash };
    } catch (error: unknown) {
      console.error('Transfer failed:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Transfer failed' };
    }
  }

  /**
   * Execute a swap from one token to another
   */
  async executeSwap(
    fromAsset: string,
    toAsset: string,
    amount: string,
    network: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      await this.initializeMainAccount();
      
      if (!this.mainAccount) {
        throw new Error('Main account not initialized');
      }

      // Get the default address for the wallet
      const address = await this.mainAccount.getDefaultAddress();
      
      // Create a trade for swapping tokens
      const trade = await address.createTrade({
        amount: parseFloat(amount),
        fromAssetId: fromAsset.toLowerCase(),
        toAssetId: toAsset.toLowerCase(),
      });

      // Execute the trade
      const result = await trade.wait();
      
      if (result.getStatus() === 'complete') {
        return {
          success: true,
          txHash: result.getTransactionHash()
        };
      } else {
        return {
          success: false,
          error: `Trade failed with status: ${result.getStatus()}`
        };
      }
    } catch (error) {
      console.error('Swap execution error:', error);
      
      // Check if it's a specific CDP error
      if (error instanceof Error) {
        if (error.message.includes('insufficient balance')) {
          return {
            success: false,
            error: 'Insufficient balance for swap'
          };
        } else if (error.message.includes('unsupported asset')) {
          return {
            success: false,
            error: 'Asset not supported for swapping'
          };
        } else if (error.message.includes('network not supported')) {
          return {
            success: false,
            error: 'Network not supported for swapping'
          };
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Swap failed'
      };
    }
  }

  /**
   * Get account balance
   */
  async getBalance(token: string, network: string) {
    try {
      if (!this.mainAccount) {
        await this.initializeMainAccount();
      }

      const balance = await this.mainAccount.getBalance(token, network);
      return balance;
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  /**
   * Generate a Coinbase onramp URL for the admin panel
   */
  async generateOnrampURL(params: {
    amount: string;
    asset: string;
    network: string;
    destinationWallet: string;
  }) {
    try {
      // Generate session token for secure onramp initialization
      const sessionToken = await this.generateSessionToken({
        addresses: [{
          address: params.destinationWallet,
          blockchains: [params.network]
        }],
        assets: [params.asset]
      });

      // Construct the onramp URL
      const baseUrl = 'https://pay.coinbase.com/buy';
      const urlParams = new URLSearchParams({
        destinationWallet: params.destinationWallet,
        assets: params.asset,
        blockchains: params.network,
        sessionToken: sessionToken || '',
        amount: params.amount
      });

      const onrampUrl = `${baseUrl}?${urlParams.toString()}`;
      
      return {
        success: true,
        url: onrampUrl,
        sessionToken
      };
    } catch (error: unknown) {
      console.error('Failed to generate onramp URL:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate onramp URL'
      };
    }
  }

  /**
   * Generate session token for Coinbase onramp
   */
  private async generateSessionToken(params: {
    addresses: Array<{
      address: string;
      blockchains: string[];
    }>;
    assets?: string[];
  }) {
    try {
      const response = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.generateJWT()}`
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`Session token generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Session token generation failed:', error);
      return null;
    }
  }

  /**
   * Generate JWT for Coinbase API authentication
   */
  private async generateJWT() {
    try {
      const token = await generateJwt({
        apiKeyId: process.env.CDP_API_KEY_ID!,
        apiKeySecret: process.env.CDP_API_KEY_SECRET!,
        requestMethod: 'POST',
        requestHost: 'api.developer.coinbase.com',
        requestPath: '/onramp/v1/token',
        expiresIn: 120
      });
      
      return token;
    } catch (error) {
      console.error('JWT generation failed:', error);
      throw error;
    }
  }

  /**
   * Check if a token requires swapping
   */
  isSwapRequired(token: string): boolean {
    const directTokens = ['USDC', 'USDT', 'ETH', 'BTC', 'SOL'];
    return !directTokens.includes(token.toUpperCase());
  }

  /**
   * Get the main account address
   */
  async getMainAccountAddress(): Promise<string> {
    if (!this.mainAccount) {
      await this.initializeMainAccount();
    }
    return this.mainAccount.address;
  }
}

export const cdpService = new CDPService();
