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

type CacheKey = 'mainnet' | 'testnet';

interface ChainCacheEntry {
  data: SquidChain[];
  timestamp: number;
}

interface TokenCacheEntry {
  data: Map<number, SquidToken[]>;
  timestamp: number;
}

// Cache for tokens and chains (separate per environment)
const chainCache: Record<CacheKey, ChainCacheEntry | null> = {
  mainnet: null,
  testnet: null,
};

const tokenCache: Record<CacheKey, TokenCacheEntry | null> = {
  mainnet: null,
  testnet: null,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (isTestnet: boolean): CacheKey =>
  isTestnet ? 'testnet' : 'mainnet';

/**
 * Fetch chains from Squid API
 */
export async function getSquidChains(isTestnet: boolean = true): Promise<SquidChain[]> {
  const now = Date.now();
  const cacheKey = getCacheKey(isTestnet);
  const cached = chainCache[cacheKey];

  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
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
      chainCache[cacheKey] = { data: chains, timestamp: now };
      return chains;
    }

    return [];
  } catch (error) {
    console.error('Error fetching Squid chains:', error);
    return cached?.data || [];
  }
}

/**
 * Fetch tokens from Squid API
 */
export async function getSquidTokens(isTestnet: boolean = true): Promise<Map<number, SquidToken[]>> {
  const now = Date.now();
  const cacheKey = getCacheKey(isTestnet);
  const cached = tokenCache[cacheKey];

  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const apiUrl = isTestnet ? SQUID_TESTNET_API : SQUID_MAINNET_API;
    
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${apiUrl}/tokens`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
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

        tokenCache[cacheKey] = { data: tokensByChain, timestamp: now };
        return tokensByChain;
      }

      return new Map();
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Handle abort (timeout)
      if (fetchError.name === 'AbortError') {
        console.warn('Squid API request timed out');
        throw new Error('Request timeout');
      }
      
      // Handle network errors
      if (fetchError instanceof TypeError && fetchError.message === 'Failed to fetch') {
        console.warn('Squid API network error - API may be unreachable');
        throw new Error('Network error');
      }
      
      throw fetchError;
    }
  } catch (error: any) {
    console.warn('Error fetching Squid tokens:', error?.message || error);
    return cached?.data || new Map();
  }
}

/**
 * Get tokens for a specific chain from Squid
 */
export async function getSquidTokensForChain(chainId: number, isTestnet: boolean = true): Promise<SquidToken[]> {
  try {
    const allTokens = await getSquidTokens(isTestnet);
    return allTokens.get(chainId) || [];
  } catch (error) {
    // Silently fail - return empty array so component continues to work
    console.warn(`Failed to get Squid tokens for chain ${chainId}:`, error);
    return [];
  }
}

/**
 * Clear the cache (useful for testing or forced refresh)
 */
export function clearSquidCache() {
  tokenCache.mainnet = null;
  tokenCache.testnet = null;
  chainCache.mainnet = null;
  chainCache.testnet = null;
}

