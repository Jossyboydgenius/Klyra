import { createWalletClient, http, type Hash, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as chains from 'viem/chains';
import { supabase } from '../database.js';
import { formatUnits, parseUnits } from 'viem';

export interface PoolWallet {
  id: string;
  chainId: number;
  chainName: string;
  walletAddress: Address;
  isActive: boolean;
}

export class PoolWalletManager {
  private wallets: Map<number, PoolWallet> = new Map();
  private walletClients: Map<number, any> = new Map();
  private privateKeys: Map<number, string> = new Map();
  
  constructor() {
    this.initializePrivateKeys();
  }

  private initializePrivateKeys() {
    const envKeys = {
      1: process.env.POOL_WALLET_ETH_PRIVATE_KEY,
      8453: process.env.POOL_WALLET_BASE_PRIVATE_KEY,
      137: process.env.POOL_WALLET_POLYGON_PRIVATE_KEY,
      10: process.env.POOL_WALLET_OPTIMISM_PRIVATE_KEY,
    };

    Object.entries(envKeys).forEach(([chainId, privateKey]) => {
      if (privateKey) {
        this.privateKeys.set(Number(chainId), privateKey as `0x${string}`);
      } else {
        console.warn(`No private key configured for chain ${chainId}`);
      }
    });
  }

  private getChainById(chainId: number) {
    const chainMap: Record<number, any> = {
      1: chains.mainnet,
      8453: chains.base,
      137: chains.polygon,
      10: chains.optimism,
      84532: chains.baseSepolia,
      11155111: chains.sepolia,
    };

    return chainMap[chainId];
  }

  private getWalletClient(chainId: number): any {
    if (this.walletClients.has(chainId)) {
      return this.walletClients.get(chainId);
    }

    const privateKey = this.privateKeys.get(chainId);
    if (!privateKey) {
      throw new Error(`No private key configured for chain ${chainId}`);
    }

    const chain = this.getChainById(chainId);
    if (!chain) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const client = createWalletClient({
      account,
      chain,
      transport: http(),
    });

    this.walletClients.set(chainId, client);
    return client;
  }

  async loadPoolWallets(): Promise<PoolWallet[]> {
    const { data, error } = await supabase
      .from('pool_wallets')
      .select('*')
      .eq('is_active', true)
      .order('chain_id');

    if (error) {
      throw new Error(`Failed to load pool wallets: ${error.message}`);
    }

    const wallets = (data || []).map((w: any) => ({
      id: w.id,
      chainId: w.chain_id,
      chainName: w.chain_name,
      walletAddress: w.wallet_address as Address,
      isActive: w.is_active,
    }));

    wallets.forEach((wallet) => {
      this.wallets.set(wallet.chainId, wallet);
    });

    return wallets;
  }

  async getPoolWallet(chainId: number): Promise<PoolWallet | null> {
    if (this.wallets.size === 0) {
      await this.loadPoolWallets();
    }
    return this.wallets.get(chainId) || null;
  }

  async getWalletAddress(chainId: number): Promise<Address> {
    const wallet = await this.getPoolWallet(chainId);
    if (!wallet) {
      throw new Error(`No pool wallet found for chain ${chainId}`);
    }
    return wallet.walletAddress;
  }

  async sendNative(
    chainId: number,
    to: Address,
    amount: string
  ): Promise<Hash> {
    const client = this.getWalletClient(chainId);
    const value = parseUnits(amount, 18);

    const hash = await client.sendTransaction({
      to,
      value,
    });

    console.log(`Sent ${amount} native on chain ${chainId}: ${hash}`);
    return hash;
  }

  async sendERC20(
    chainId: number,
    tokenAddress: Address,
    to: Address,
    amount: string,
    decimals: number = 18
  ): Promise<Hash> {
    const client = this.getWalletClient(chainId);
    const value = parseUnits(amount, decimals);

    const hash = await client.writeContract({
      address: tokenAddress,
      abi: [{
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
      }],
      functionName: 'transfer',
      args: [to, value],
    });

    console.log(`Sent ${amount} tokens on chain ${chainId}: ${hash}`);
    return hash;
  }

  async executeTransaction(
    chainId: number,
    to: Address,
    data: `0x${string}`,
    value?: bigint
  ): Promise<Hash> {
    const client = this.getWalletClient(chainId);

    const hash = await client.sendTransaction({
      to,
      data,
      value: value || BigInt(0),
    });

    console.log(`Executed transaction on chain ${chainId}: ${hash}`);
    return hash;
  }

  async approve(
    chainId: number,
    tokenAddress: Address,
    spender: Address,
    amount: string,
    decimals: number = 18
  ): Promise<Hash> {
    const client = this.getWalletClient(chainId);
    const value = parseUnits(amount, decimals);

    const hash = await client.writeContract({
      address: tokenAddress,
      abi: [{
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'spender', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
      }],
      functionName: 'approve',
      args: [spender, value],
    });

    console.log(`Approved ${amount} tokens for ${spender}: ${hash}`);
    return hash;
  }

  async getTokenBalance(
    chainId: number,
    tokenAddress: Address,
    address?: Address
  ): Promise<string> {
    const client = this.getWalletClient(chainId);
    const poolAddress = await this.getWalletAddress(chainId);
    const targetAddress = address || poolAddress;

    if (tokenAddress === '0x0000000000000000000000000000000000000000') {
      const balance = await client.getBalance({ address: targetAddress });
      return formatUnits(balance, 18);
    }

    const { createPublicClient } = await import('viem');
    const chain = this.getChainById(chainId);
    
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: [{
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
      }],
      functionName: 'balanceOf',
      args: [targetAddress],
    });

    const decimals = await this.getTokenDecimals(chainId, tokenAddress);
    return formatUnits(balance as bigint, decimals);
  }

  private async getTokenDecimals(chainId: number, tokenAddress: Address): Promise<number> {
    const { createPublicClient } = await import('viem');
    const chain = this.getChainById(chainId);
    
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    try {
      const decimals = await publicClient.readContract({
        address: tokenAddress,
        abi: [{
          name: 'decimals',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ name: '', type: 'uint8' }],
        }],
        functionName: 'decimals',
      });

      return decimals as number;
    } catch {
      return 18;
    }
  }

  async waitForTransaction(
    chainId: number,
    hash: Hash
  ): Promise<void> {
    const { createPublicClient } = await import('viem');
    const chain = this.getChainById(chainId);
    
    const publicClient = createPublicClient({
      chain,
      transport: http(),
    });

    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`Transaction confirmed: ${hash}`);
  }

  getSupportedChains(): number[] {
    return Array.from(this.wallets.keys());
  }
}

export const poolWalletManager = new PoolWalletManager();

