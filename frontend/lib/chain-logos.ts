// Chain logo mapping utility
// Maps chain IDs to logos from blockchains.json

import blockchainsData from '../blockchains.json';

interface BlockchainEntry {
  name: string;
  chainId?: string;
  evmChainId?: number;
  logo?: string;
}

// Create a map of chain ID -> chain logo
const chainLogoMap = new Map<number, string>();

// Initialize the map from blockchains.json
if (blockchainsData?.data && Array.isArray(blockchainsData.data)) {
  blockchainsData.data.forEach((entry: BlockchainEntry) => {
    // Use evmChainId if available, otherwise parse chainId
    const chainId = entry.evmChainId || (entry.chainId ? parseInt(entry.chainId, 10) : null);
    
    if (chainId && entry.logo) {
      // Only add if not already present (first occurrence wins)
      if (!chainLogoMap.has(chainId)) {
        chainLogoMap.set(chainId, entry.logo);
      }
    }
  });
}

/**
 * Get chain logo URL for a given chain ID
 * For testnets, tries to find mainnet logo first
 * @param chainId - The chain ID (e.g., 1 for Ethereum, 8453 for Base)
 * @param isTestnet - Whether this is a testnet chain
 * @returns The logo URL or null if not found
 */
export function getChainLogo(chainId: number, isTestnet?: boolean): string | null {
  // First try to get the logo for this specific chain
  let logo = chainLogoMap.get(chainId);
  
  // If testnet and no logo found, try to find mainnet equivalent
  if (isTestnet && !logo) {
    // Map of testnet chain IDs to their mainnet equivalents
    const testnetToMainnet: Record<number, number> = {
      11155111: 1,    // Sepolia -> Ethereum
      84532: 8453,    // Base Sepolia -> Base
      80001: 137,     // Mumbai -> Polygon
      421614: 42161,  // Arbitrum Sepolia -> Arbitrum
      11155420: 10,   // Optimism Sepolia -> Optimism
      97: 56,         // BSC Testnet -> BSC
    };
    
    const mainnetId = testnetToMainnet[chainId];
    if (mainnetId) {
      logo = chainLogoMap.get(mainnetId);
    }
  }
  
  return logo || null;
}

/**
 * Get chain logo URL for a chain by name (fallback)
 * @param chainName - The chain name (e.g., "Ethereum", "Base", "Polygon")
 * @returns The logo URL or null if not found
 */
export function getChainLogoByName(chainName: string): string | null {
  const entry = blockchainsData?.data?.find((item: BlockchainEntry) => 
    item.name?.toLowerCase() === chainName.toLowerCase()
  );
  
  return entry?.logo || null;
}

/**
 * Check if a logo URL exists for a chain
 */
export function hasChainLogo(chainId: number): boolean {
  return chainLogoMap.has(chainId);
}

