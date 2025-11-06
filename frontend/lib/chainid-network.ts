/**
 * ChainID.network API integration
 * Fetches chains from https://chainid.network/chains.json
 */

export interface ChainIdNetworkChain {
  name: string;
  chain: string;
  icon?: string;
  rpc: string[];
  features?: Array<{ name: string }>;
  faucets: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  infoURL?: string;
  shortName: string;
  chainId: number;
  networkId: number;
  slip44?: number;
  ens?: {
    registry: string;
  };
  explorers?: Array<{
    name: string;
    url: string;
    standard?: string;
    icon?: string;
  }>;
  title?: string;
  status?: string;
  testnet?: boolean;
  parent?: {
    type: string;
    chain: string;
    bridges?: Array<any>;
  };
  redFlags?: string[];
}

export interface Chain {
  id: number;
  name: string;
  network?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls?: {
    default: {
      http: string[];
    };
  };
  blockExplorers?: {
    default: {
      name: string;
      url: string;
    };
  };
  testnet?: boolean;
}

// Cache for chains
let chainsCache: Chain[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (chains don't change often)

/**
 * Fetch chains from chainid.network
 */
export async function getChainIdNetworkChains(): Promise<ChainIdNetworkChain[]> {
  try {
    const response = await fetch('https://chainid.network/chains.json');
    
    if (!response.ok) {
      throw new Error(`ChainID.network API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (Array.isArray(data)) {
      return data;
    }

    return [];
  } catch (error) {
    console.error('Error fetching chains from chainid.network:', error);
    return [];
  }
}

/**
 * Convert ChainID.network chain format to our Chain format
 */
export function convertChainIdNetworkToChain(chainIdChain: ChainIdNetworkChain): Chain {
  // Determine if it's a testnet
  const isTestnet = 
    chainIdChain.testnet === true ||
    chainIdChain.status === 'deprecated' ||
    chainIdChain.name.toLowerCase().includes('testnet') ||
    chainIdChain.name.toLowerCase().includes('test') ||
    chainIdChain.title?.toLowerCase().includes('testnet') ||
    chainIdChain.title?.toLowerCase().includes('test');

  // Get first valid RPC URL (filter out template variables)
  const validRpcUrls = chainIdChain.rpc.filter(url => 
    !url.includes('${') && 
    !url.includes('${INFURA_API_KEY}') &&
    !url.includes('${ALCHEMY_API_KEY}') &&
    url.startsWith('http')
  );

  // Get first explorer URL
  const explorer = chainIdChain.explorers?.[0];

  return {
    id: chainIdChain.chainId,
    name: chainIdChain.name,
    network: chainIdChain.shortName || chainIdChain.name.toLowerCase().replace(/\s+/g, '-'),
    nativeCurrency: {
      name: chainIdChain.nativeCurrency.name,
      symbol: chainIdChain.nativeCurrency.symbol,
      decimals: chainIdChain.nativeCurrency.decimals,
    },
    rpcUrls: validRpcUrls.length > 0 ? {
      default: {
        http: validRpcUrls,
      },
    } : undefined,
    blockExplorers: explorer ? {
      default: {
        name: explorer.name,
        url: explorer.url,
      },
    } : undefined,
    testnet: isTestnet,
  };
}

/**
 * Get all chains from chainid.network, converted to our format
 */
export async function getAllChainIdNetworkChains(): Promise<Chain[]> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (chainsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return chainsCache;
  }

  try {
    const chainIdChains = await getChainIdNetworkChains();
    const convertedChains = chainIdChains
      .filter(chain => {
        // Filter out deprecated chains unless they're testnets
        if (chain.status === 'deprecated' && !chain.testnet) {
          return false;
        }
        // Filter out chains with red flags (reused chain IDs, etc.)
        if (chain.redFlags && chain.redFlags.length > 0) {
          return false;
        }
        return true;
      })
      .map(convertChainIdNetworkToChain);

    chainsCache = convertedChains;
    cacheTimestamp = now;
    return convertedChains;
  } catch (error) {
    console.error('Error converting chainid.network chains:', error);
    // Return cached data if available, even if expired
    return chainsCache || [];
  }
}

/**
 * Get chain by ID from chainid.network
 */
export async function getChainIdNetworkChainById(chainId: number): Promise<Chain | undefined> {
  const chains = await getAllChainIdNetworkChains();
  return chains.find(chain => chain.id === chainId);
}

/**
 * Clear the cache (useful for testing or forced refresh)
 */
export function clearChainIdNetworkCache() {
  chainsCache = null;
  cacheTimestamp = 0;
}

/**
 * Convert chain to wallet_addEthereumChain format
 */
export function chainToWalletFormat(chain: Chain): {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
} {
  return {
    chainId: `0x${chain.id.toString(16)}`,
    chainName: chain.name,
    nativeCurrency: chain.nativeCurrency,
    rpcUrls: chain.rpcUrls?.default?.http || [],
    blockExplorerUrls: chain.blockExplorers?.default?.url 
      ? [chain.blockExplorers.default.url] 
      : undefined,
  };
}

