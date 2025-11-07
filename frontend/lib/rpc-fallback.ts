/**
 * RPC Fallback Utility
 * Provides multiple RPC URLs per chain with automatic fallback on rate limiting
 * Extracts RPCs from JSON files and adds additional public endpoints
 */

import { extractRpcUrls } from './rpc-extractor';

// Extract RPCs from JSON files for major chains
const extractedBaseRPCs = extractRpcUrls(8453);
const extractedBaseSepoliaRPCs = extractRpcUrls(84532);
const extractedEthereumRPCs = extractRpcUrls(1);
const extractedSepoliaRPCs = extractRpcUrls(11155111);
const extractedPolygonRPCs = extractRpcUrls(137);
const extractedOptimismRPCs = extractRpcUrls(10);
const extractedArbitrumRPCs = extractRpcUrls(42161);

// Additional public RPC endpoints (prioritized - public RPCs first)
// These are known reliable public endpoints that don't require API keys
const ADDITIONAL_PUBLIC_RPCS: Record<number, string[]> = {
  // Base Mainnet - MANY public RPCs to avoid rate limits
  8453: [
    // Public RPCs (no API key required) - PRIORITIZE THESE
    'https://base.publicnode.com',
    'https://base-rpc.publicnode.com',
    'https://base.llamarpc.com',
    'https://1rpc.io/base',
    'https://base.drpc.org',
    'https://base-mainnet.public.blastapi.io',
    'https://base.gateway.tenderly.co',
    'https://rpc.notadegen.com/base',
    'https://base.meowrpc.com',
    'https://base.alt.technology',
    'https://base-rpc.publicnode.com',
    'https://base-mainnet-rpc.allthatnode.com',
    'https://base.blockpi.network/v1/rpc/public',
    // Alchemy (allowed even though it may need API key)
    ...(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY 
      ? [`https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`]
      : ['https://base-mainnet.g.alchemy.com/v2/demo']
    ),
    // Official (rate limited - put last)
    'https://mainnet.base.org',
    'https://developer-access-mainnet.base.org',
  ],
  // Base Sepolia
  84532: [
    'https://base-sepolia-rpc.publicnode.com',
    'https://base-sepolia.publicnode.com',
    'https://sepolia.base.org',
    'https://base-sepolia.public.blastapi.io',
    'https://base-sepolia.blockpi.network/v1/rpc/public',
    ...(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
      ? [`https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`]
      : ['https://base-sepolia.g.alchemy.com/v2/demo']
    ),
  ],
  // Ethereum Mainnet
  1: [
    'https://ethereum-rpc.publicnode.com',
    'https://ethereum.publicnode.com',
    'https://eth.llamarpc.com',
    'https://1rpc.io/eth',
    'https://eth.drpc.org',
    'https://rpc.ankr.com/eth',
    'https://eth-mainnet.public.blastapi.io',
    'https://eth.blockpi.network/v1/rpc/public',
    'https://cloudflare-eth.com',
    'https://api.mycryptoapi.com/eth',
    'https://mainnet.gateway.tenderly.co',
    ...(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
      ? [`https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`]
      : []
    ),
  ],
  // Sepolia
  11155111: [
    'https://ethereum-sepolia-rpc.publicnode.com',
    'https://sepolia.publicnode.com',
    'https://rpc.sepolia.org',
    'https://sepolia.gateway.tenderly.co',
    'https://sepolia.blockpi.network/v1/rpc/public',
    'https://sepolia.drpc.org',
    ...(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
      ? [`https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`]
      : []
    ),
  ],
};

// Popular public RPC endpoints for major chains
// Combine extracted RPCs from JSON with additional known public RPCs
export const RPC_ENDPOINTS: Record<number, string[]> = {
  // Base Mainnet - Combine extracted + additional, prioritize public ones
  8453: [
    // First: Additional public RPCs (most reliable)
    ...ADDITIONAL_PUBLIC_RPCS[8453],
    // Then: Extracted from JSON (filtered for public only)
    ...extractedBaseRPCs.filter(url => 
      !url.includes('mainnet.base.org') && // Don't duplicate official
      !ADDITIONAL_PUBLIC_RPCS[8453].includes(url)
    ),
  ],
  // Base Sepolia
  84532: [
    ...ADDITIONAL_PUBLIC_RPCS[84532],
    ...extractedBaseSepoliaRPCs.filter(url => 
      !ADDITIONAL_PUBLIC_RPCS[84532].includes(url)
    ),
  ],
  // Ethereum Mainnet
  1: [
    ...ADDITIONAL_PUBLIC_RPCS[1],
    ...extractedEthereumRPCs.filter(url => 
      !ADDITIONAL_PUBLIC_RPCS[1].includes(url) &&
      !url.includes('infura.io') && // Skip Infura (requires key)
      !url.includes('${') // Skip template variables
    ),
  ],
  // Sepolia
  11155111: [
    ...ADDITIONAL_PUBLIC_RPCS[11155111],
    ...extractedSepoliaRPCs.filter(url => 
      !ADDITIONAL_PUBLIC_RPCS[11155111].includes(url) &&
      !url.includes('infura.io') &&
      !url.includes('${')
    ),
  ],
  // Polygon
  137: [
    'https://polygon.llamarpc.com',
    'https://polygon-rpc.com',
    'https://rpc.ankr.com/polygon',
    'https://polygon.publicnode.com',
    'https://1rpc.io/matic',
    'https://polygon.drpc.org',
    'https://polygon.blockpi.network/v1/rpc/public',
    ...extractedPolygonRPCs.filter(url => 
      !url.includes('${') && !url.includes('infura')
    ),
  ],
  // Polygon Amoy
  80002: [
    'https://rpc-amoy.polygon.technology',
    'https://polygon-amoy.publicnode.com',
    ...extractRpcUrls(80002),
  ],
  // Optimism
  10: [
    'https://optimism.llamarpc.com',
    'https://optimism.publicnode.com',
    'https://1rpc.io/op',
    'https://optimism.drpc.org',
    'https://rpc.ankr.com/optimism',
    'https://optimism.blockpi.network/v1/rpc/public',
    ...extractedOptimismRPCs.filter(url => 
      !url.includes('${') && !url.includes('infura')
    ),
  ],
  // OP Sepolia
  11155420: [
    'https://sepolia.optimism.io',
    'https://optimism-sepolia.publicnode.com',
    ...extractRpcUrls(11155420),
  ],
  // Arbitrum
  42161: [
    'https://arbitrum.llamarpc.com',
    'https://arbitrum-one.publicnode.com',
    'https://1rpc.io/arb',
    'https://arbitrum.drpc.org',
    'https://rpc.ankr.com/arbitrum',
    'https://arbitrum.blockpi.network/v1/rpc/public',
    ...extractedArbitrumRPCs.filter(url => 
      !url.includes('${') && !url.includes('infura')
    ),
  ],
  // Arbitrum Sepolia
  421614: [
    'https://sepolia-rollup.arbitrum.io/rpc',
    'https://arbitrum-sepolia.publicnode.com',
    ...extractRpcUrls(421614),
  ],
  // Avalanche
  43114: [
    'https://avalanche.public-rpc.com',
    'https://1rpc.io/avax/c',
    'https://avalanche.drpc.org',
    'https://rpc.ankr.com/avalanche',
    'https://avalanche.blockpi.network/v1/rpc/public',
    ...extractRpcUrls(43114),
  ],
  // Avalanche Fuji
  43113: [
    'https://api.avax-test.network/ext/bc/C/rpc',
    'https://avalanche-fuji-c-chain.publicnode.com',
    ...extractRpcUrls(43113),
  ],
};

// Log RPC counts for debugging
if (typeof window === 'undefined') {
  console.log('RPC Endpoints loaded:');
  Object.entries(RPC_ENDPOINTS).forEach(([chainId, urls]) => {
    console.log(`  Chain ${chainId}: ${urls.length} RPC endpoints`);
  });
}

/**
 * Get RPC URLs for a chain, with fallbacks
 */
export function getRpcUrls(chainId: number): string[] {
  // First, check if we have custom RPCs defined
  if (RPC_ENDPOINTS[chainId] && RPC_ENDPOINTS[chainId].length > 0) {
    return RPC_ENDPOINTS[chainId];
  }
  
  // Fallback to default public RPCs based on chain type
  const chainName = getChainName(chainId);
  if (chainName.includes('base')) {
    return RPC_ENDPOINTS[8453] || ['https://mainnet.base.org'];
  }
  if (chainName.includes('ethereum') || chainName.includes('mainnet')) {
    return RPC_ENDPOINTS[1] || ['https://eth.llamarpc.com'];
  }
  
  // Generic fallback
  return ['https://rpc.ankr.com/multichain'];
}

/**
 * Get a random RPC URL from the list (for load balancing)
 */
export function getRandomRpcUrl(chainId: number): string {
  const urls = getRpcUrls(chainId);
  return urls[Math.floor(Math.random() * urls.length)];
}

/**
 * Create a fallback HTTP transport for wagmi
 * This will automatically fallback to next RPC on failure
 */
export function createFallbackHttp(chainId: number) {
  const urls = getRpcUrls(chainId);
  
  // Import http from viem/wagmi
  const { http, fallback } = require('wagmi');
  
  // Create HTTP transports for each RPC
  const transports = urls.map((url) => http(url, { 
    fetchOptions: {
      timeout: 10000, // 10 second timeout
    },
  }));
  
  // Return fallback transport
  return fallback(transports, {
    rank: false, // Don't rank by response time
    retryCount: 2, // Retry 2 times before failing
    retryDelay: 100, // 100ms delay between retries
  });
}

function getChainName(chainId: number): string {
  const chainMap: Record<number, string> = {
    1: 'ethereum',
    8453: 'base',
    137: 'polygon',
    10: 'optimism',
    42161: 'arbitrum',
    43114: 'avalanche',
    11155111: 'sepolia',
    84532: 'base-sepolia',
    80002: 'polygon-amoy',
    11155420: 'optimism-sepolia',
    421614: 'arbitrum-sepolia',
    43113: 'avalanche-fuji',
  };
  return chainMap[chainId] || 'unknown';
}

