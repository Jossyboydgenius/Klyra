import { CdpClient } from "@coinbase/cdp-sdk";
import { generateJwt } from "@coinbase/cdp-sdk/auth";

interface TransferParams {
  to: string;
  amount: string;
  token: string;
  network: string;
}

export class CDPService {
  private cdp: CdpClient | null = null;
  private mainAccount: any = null;
  private isInitialized = false;

  constructor() {
  }

  private initializeCDPClient(): void {
    if (this.isInitialized && this.cdp) {
      return;
    }

    const apiKeyId = process.env.CDP_API_KEY_ID;
    const apiKeySecret = process.env.CDP_API_KEY_SECRET;
    const walletSecret = process.env.CDP_WALLET_SECRET;

    if (!apiKeyId || !apiKeySecret) {
      console.warn('CDP API keys not configured. CDP features will be disabled.');
      this.isInitialized = true;
      return;
    }

    try {
      this.cdp = new CdpClient({
        apiKeyId,
        apiKeySecret,
        walletSecret: walletSecret || undefined,
      });
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize CDP client:', error);
      this.isInitialized = true;
    }
  }

  private isCDPAvailable(): boolean {
    if (!this.isInitialized) {
      this.initializeCDPClient();
    }
    return this.cdp !== null;
  }

  async initializeMainAccount() {
    if (!this.isCDPAvailable()) {
      throw new Error('CDP client is not available. Please configure CDP_API_KEY_ID and CDP_API_KEY_SECRET environment variables.');
    }

    try {
      this.mainAccount = await this.cdp!.evm.getOrCreateAccount({
        name: "PaymasterMainAccount",
      });

      console.log(`Main account initialized: ${this.mainAccount.address}`);
      return this.mainAccount;
    } catch (error) {
      console.error("Failed to initialize main account:", error);
      throw error;
    }
  }

  async transferToUser(params: TransferParams) {
    try {
      if (!this.mainAccount) {
        await this.initializeMainAccount();
      }

      const { transactionHash } = await this.mainAccount.transfer({
        to: params.to,
        amount: params.amount,
        token: params.token,
        network: params.network,
      });

      console.log(`Transfer completed: ${transactionHash}`);
      return { success: true, transactionHash };
    } catch (error: unknown) {
      console.error("Transfer failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Transfer failed",
      };
    }
  }

  async executeSwap(
    fromAsset: string,
    toAsset: string,
    amount: string,
    _network?: string,
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      await this.initializeMainAccount();

      if (!this.mainAccount) {
        throw new Error("Main account not initialized");
      }

      const address = await this.mainAccount.getDefaultAddress();

      const trade = await address.createTrade({
        amount: parseFloat(amount),
        fromAssetId: fromAsset.toLowerCase(),
        toAssetId: toAsset.toLowerCase(),
      });

      const result = await trade.wait();

      if (result.getStatus() === "complete") {
        return {
          success: true,
          txHash: result.getTransactionHash(),
        };
      } else {
        return {
          success: false,
          error: `Trade failed with status: ${result.getStatus()}`,
        };
      }
    } catch (error) {
      console.error("Swap execution error:", error);

      if (error instanceof Error) {
        if (error.message.includes("insufficient balance")) {
          return {
            success: false,
            error: "Insufficient balance for swap",
          };
        } else if (error.message.includes("unsupported asset")) {
          return {
            success: false,
            error: "Asset not supported for swapping",
          };
        } else if (error.message.includes("network not supported")) {
          return {
            success: false,
            error: "Network not supported for swapping",
          };
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Swap failed",
      };
    }
  }

  async getBalance(token: string, network: string) {
    try {
      if (!this.mainAccount) {
        await this.initializeMainAccount();
      }

      const balance = await this.mainAccount.getBalance(token, network);
      return balance;
    } catch (error) {
      console.error("Failed to get balance:", error);
      throw error;
    }
  }

  async generateOnrampURL(params: {
    amount: string;
    asset: string;
    network: string;
    destinationWallet: string;
  }) {
    try {
      const sessionToken = await this.generateSessionToken({
        addresses: [
          {
            address: params.destinationWallet,
            blockchains: [params.network],
          },
        ],
        assets: [params.asset],
      });

      const baseUrl = "https://pay.coinbase.com/buy";
      const urlParams = new URLSearchParams({
        destinationWallet: params.destinationWallet,
        assets: params.asset,
        blockchains: params.network,
        sessionToken: sessionToken || "",
        amount: params.amount,
      });

      const onrampUrl = `${baseUrl}?${urlParams.toString()}`;

      return {
        success: true,
        url: onrampUrl,
        sessionToken,
      };
    } catch (error: unknown) {
      console.error("Failed to generate onramp URL:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate onramp URL",
      };
    }
  }

  private async generateSessionToken(params: {
    addresses: Array<{
      address: string;
      blockchains: string[];
    }>;
    assets?: string[];
  }) {
    try {
      const response = await fetch(
        "https://api.developer.coinbase.com/onramp/v1/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await this.generateJWT()}`,
          },
          body: JSON.stringify(params),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Session token generation failed: ${response.statusText}`,
        );
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error("Session token generation failed:", error);
      return null;
    }
  }

  private async generateJWT() {
    try {
      const token = await generateJwt({
        apiKeyId: process.env.CDP_API_KEY_ID!,
        apiKeySecret: process.env.CDP_API_KEY_SECRET!,
        requestMethod: "POST",
        requestHost: "api.developer.coinbase.com",
        requestPath: "/onramp/v1/token",
        expiresIn: 120,
      });

      return token;
    } catch (error) {
      console.error("JWT generation failed:", error);
      throw error;
    }
  }

  isSwapRequired(token: string): boolean {
    const directTokens = ["USDC", "USDT", "ETH", "BTC", "SOL"];
    return !directTokens.includes(token.toUpperCase());
  }

  static isSwapRequired(token: string): boolean {
    const directTokens = ["USDC", "USDT", "ETH", "BTC", "SOL"];
    return !directTokens.includes(token.toUpperCase());
  }

  async getMainAccountAddress(): Promise<string> {
    if (!this.mainAccount) {
      await this.initializeMainAccount();
    }
    return this.mainAccount.address;
  }
}

export const cdpService = new CDPService();

