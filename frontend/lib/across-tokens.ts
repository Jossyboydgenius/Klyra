/**
 * Across API integration for fetching testnet tokens
 * API: https://testnet.across.to/api/available-routes
 */

export interface AcrossRoute {
  originChainId: number;
  originToken: string;
  destinationChainId: number;
  destinationToken: string;
  originTokenSymbol: string;
  destinationTokenSymbol: string;
  isNative: boolean;
}

// Cache for routes
let routesCache: AcrossRoute[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch available routes from Across API
 */
export async function getAcrossRoutes(isTestnet: boolean = true): Promise<AcrossRoute[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (routesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return routesCache;
  }

  try {
    const apiUrl = isTestnet 
      ? 'https://testnet.across.to/api/available-routes'
      : 'https://across.to/api/available-routes';
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Across API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (Array.isArray(data)) {
      routesCache = data;
      cacheTimestamp = now;
      return routesCache;
    }

    return [];
  } catch (error) {
    console.error('Error fetching Across routes:', error);
    // Return cached data if available, even if expired
    return routesCache || [];
  }
}

/**
 * Extract unique tokens from Across routes for a specific chain
 * Note: Deduplication across all sources (base, Squid, Across) is handled in useEnhancedTokens hook
 */
export async function getAcrossTokensForChain(chainId: number, isTestnet: boolean = true): Promise<Array<{
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
}>> {
  const routes = await getAcrossRoutes(isTestnet);
  
  // Extract unique tokens from both origin and destination
  const tokensMap = new Map<string, {
    chainId: number;
    address: string;
    symbol: string;
    isNative: boolean;
  }>();

  routes.forEach(route => {
    // Process origin token
    if (route.originChainId === chainId) {
      const key = `${route.originToken.toLowerCase()}-${route.originTokenSymbol}`;
      if (!tokensMap.has(key)) {
        tokensMap.set(key, {
          chainId: route.originChainId,
          address: route.originToken,
          symbol: route.originTokenSymbol,
          isNative: route.isNative,
        });
      }
    }

    // Process destination token
    if (route.destinationChainId === chainId) {
      const key = `${route.destinationToken.toLowerCase()}-${route.destinationTokenSymbol}`;
      if (!tokensMap.has(key)) {
        tokensMap.set(key, {
          chainId: route.destinationChainId,
          address: route.destinationToken,
          symbol: route.destinationTokenSymbol,
          isNative: route.isNative,
        });
      }
    }
  });

  // Convert to token format
  const tokens: Array<{
    chainId: number;
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    logoURI?: string;
  }> = [];

  tokensMap.forEach((tokenData) => {
    // Determine decimals based on symbol (common defaults)
    let decimals = 18;
    if (['USDC', 'USDT'].includes(tokenData.symbol)) {
      decimals = 6;
    } else if (tokenData.symbol === 'DAI') {
      decimals = 18;
    }

    tokens.push({
      chainId: tokenData.chainId,
      address: tokenData.isNative ? '0x0000000000000000000000000000000000000000' : tokenData.address,
      name: tokenData.symbol,
      symbol: tokenData.symbol,
      decimals,
      logoURI: undefined, // Across doesn't provide logos, will use default
    });
  });

  return tokens;
}

/**
 * Clear the cache (useful for testing or forced refresh)
 */
export function clearAcrossCache() {
  routesCache = null;
  cacheTimestamp = 0;
}

