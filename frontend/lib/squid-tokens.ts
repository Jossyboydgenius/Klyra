/**
 * Squid API integration for fetching testnet tokens
 */

export interface SquidToken {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  crosschain: boolean;
  commonKey?: string;
  logoURI?: string;
  coingeckoId?: string;
}

export interface SquidChain {
  chainName: string;
  chainType: string;
  rpc: string;
  networkName: string;
  chainId: number;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
    icon?: string;
  };
  blockExplorerUrls: string[];
  chainNativeContracts?: {
    wrappedNativeToken?: string;
    ensRegistry?: string;
    multicall?: string;
    usdcToken?: string;
  };
  axelarContracts?: {
    gateway?: string;
    forecallable?: string;
  };
}

const SQUID_TESTNET_API = 'https://testnet.api.squidrouter.com/v1';
const SQUID_MAINNET_API = 'https://api.squidrouter.com/v1';

// Cache for tokens and chains
let tokensCache: Map<number, SquidToken[]> | null = null;
let chainsCache: SquidChain[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch chains from Squid API
 */
export async function getSquidChains(isTestnet: boolean = true): Promise<SquidChain[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (chainsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return chainsCache;
  }

  try {
    const apiUrl = isTestnet ? SQUID_TESTNET_API : SQUID_MAINNET_API;
    const response = await fetch(`${apiUrl}/chains`);
    
    if (!response.ok) {
      throw new Error(`Squid API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status && data.data?.chains) {
      const chains = data.data.chains;
      chainsCache = chains;
      cacheTimestamp = now;
      return chains;
    }

    return [];
  } catch (error) {
    console.error('Error fetching Squid chains:', error);
    // Return cached data if available, even if expired
    return chainsCache || [];
  }
}

/**
 * Fetch tokens from Squid API
 */
export async function getSquidTokens(isTestnet: boolean = true): Promise<Map<number, SquidToken[]>> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (tokensCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return tokensCache;
  }

  try {
    const apiUrl = isTestnet ? SQUID_TESTNET_API : SQUID_MAINNET_API;
    const response = await fetch(`${apiUrl}/tokens`);
    
    if (!response.ok) {
      throw new Error(`Squid API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status && data.data?.tokens) {
      // Group tokens by chainId
      const tokensByChain = new Map<number, SquidToken[]>();
      
      data.data.tokens.forEach((token: SquidToken) => {
        if (!tokensByChain.has(token.chainId)) {
          tokensByChain.set(token.chainId, []);
        }
        tokensByChain.get(token.chainId)!.push(token);
      });

      tokensCache = tokensByChain;
      cacheTimestamp = now;
      return tokensCache;
    }

    return new Map();
  } catch (error) {
    console.error('Error fetching Squid tokens:', error);
    // Return cached data if available, even if expired
    return tokensCache || new Map();
  }
}

/**
 * Get tokens for a specific chain from Squid
 */
export async function getSquidTokensForChain(chainId: number, isTestnet: boolean = true): Promise<SquidToken[]> {
  const allTokens = await getSquidTokens(isTestnet);
  return allTokens.get(chainId) || [];
}

/**
 * Clear the cache (useful for testing or forced refresh)
 */
export function clearSquidCache() {
  tokensCache = null;
  chainsCache = null;
  cacheTimestamp = 0;
}

