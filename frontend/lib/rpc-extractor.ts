/**
 * RPC Extractor Utility
 * Extracts RPC URLs from chain data JSON files
 * Filters out API key-required RPCs (except Alchemy)
 */

// Import JSON - TypeScript will handle this
const chainsData = require('../more-chains.json');

interface ChainData {
  name: string;
  chainId: number;
  rpc?: string[];
  rpcUrls?: {
    default?: {
      http?: string[];
    };
    public?: {
      http?: string[];
    };
  };
}

/**
 * Check if an RPC URL requires an API key
 */
function requiresApiKey(url: string): boolean {
  // Check for template variables
  if (url.includes('${')) {
    return true;
  }
  
  const apiKeyPatterns = [
    /infura\.io\/v3\/\$\{/i,
    /\.infura\.io\/v3\/[a-zA-Z0-9]+/i, // Infura with key (but demo keys are OK)
    /quicknode\.com/i,
    /tatum\.io/i,
    /nodeapi\.com/i,
    /getblock\.io/i,
    /pokt\.network/i,
    /securerpc\.com/i,
    /thirdweb\.com/i, // Thirdweb requires API key
  ];
  
  // Alchemy is allowed (even with API key)
  if (url.includes('alchemy.com')) {
    return false;
  }
  
  // Check if URL has a demo/test key (these are OK)
  if (url.includes('demo') || url.includes('test')) {
    return false;
  }
  
  return apiKeyPatterns.some(pattern => pattern.test(url));
}

/**
 * Check if RPC is WebSocket (we only want HTTP)
 */
function isWebSocket(url: string): boolean {
  return url.startsWith('wss://') || url.startsWith('ws://');
}

/**
 * Extract RPC URLs for a specific chain ID from JSON data
 */
export function extractRpcUrls(chainId: number): string[] {
  const rpcUrls: string[] = [];
  const seen = new Set<string>();
  
  // Search through chains data
  if (Array.isArray(chainsData)) {
    for (const chain of chainsData as any[]) {
      const chainIdNum = typeof chain.chainId === 'string' ? parseInt(chain.chainId, 10) : chain.chainId;
      if (chainIdNum === chainId) {
        // Extract from rpc array
        if (chain.rpc && Array.isArray(chain.rpc)) {
          for (const rpc of chain.rpc) {
            if (typeof rpc === 'string') {
              // Skip WebSocket URLs
              if (isWebSocket(rpc)) continue;
              
              // Skip API key-required RPCs (except Alchemy)
              if (requiresApiKey(rpc)) continue;
              
              // Clean up URL (remove trailing slash, etc.)
              const cleanUrl = rpc.trim().replace(/\/$/, '');
              
              if (cleanUrl && !seen.has(cleanUrl)) {
                rpcUrls.push(cleanUrl);
                seen.add(cleanUrl);
              }
            }
          }
        }
        
        // Extract from rpcUrls object
        if (chain.rpcUrls) {
          // Default RPCs
          if (chain.rpcUrls.default?.http) {
            for (const rpc of chain.rpcUrls.default.http) {
              if (typeof rpc === 'string') {
                if (isWebSocket(rpc)) continue;
                if (requiresApiKey(rpc)) continue;
                const cleanUrl = rpc.trim().replace(/\/$/, '');
                if (cleanUrl && !seen.has(cleanUrl)) {
                  rpcUrls.push(cleanUrl);
                  seen.add(cleanUrl);
                }
              }
            }
          }
          
          // Public RPCs
          if (chain.rpcUrls.public?.http) {
            for (const rpc of chain.rpcUrls.public.http) {
              if (typeof rpc === 'string') {
                if (isWebSocket(rpc)) continue;
                if (requiresApiKey(rpc)) continue;
                const cleanUrl = rpc.trim().replace(/\/$/, '');
                if (cleanUrl && !seen.has(cleanUrl)) {
                  rpcUrls.push(cleanUrl);
                  seen.add(cleanUrl);
                }
              }
            }
          }
        }
      }
    }
  }
  
  return rpcUrls;
}

/**
 * Get all RPC URLs for multiple chain IDs
 */
export function extractRpcUrlsForChains(chainIds: number[]): Record<number, string[]> {
  const result: Record<number, string[]> = {};
  
  for (const chainId of chainIds) {
    result[chainId] = extractRpcUrls(chainId);
  }
  
  return result;
}

