// ENS Resolution Utilities
// Supports ENS (.eth), Basenames (.base), and multi-chain resolution

import { normalize } from 'viem/ens';
import { createPublicClient, http } from 'viem';
import { mainnet, base } from 'viem/chains';

// Create public clients for ENS resolution
const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const baseClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Multi-chain coin type mapping (EIP-2304)
const COIN_TYPES: Record<string, number> = {
  eth: 60,
  btc: 0,
  ltc: 2,
  doge: 3,
  dash: 5,
  bch: 145,
  bnb: 714,
  sol: 501,
  matic: 966,
  trx: 195,
  ada: 1815,
  xrp: 144,
  atom: 118,
  dot: 354,
};

/**
 * Resolve ENS name to address with multi-chain support
 * Formats:
 * - vitalik.eth → Ethereum address
 * - vitalik.eth:btc → Bitcoin address
 * - yourname.base → Base address
 */
export async function resolveENSName(name: string): Promise<string | null> {
  try {
    // Check for multi-chain format (name.eth:chain)
    const colonIndex = name.lastIndexOf(':');
    if (colonIndex !== -1) {
      const baseName = name.substring(0, colonIndex);
      const chain = name.substring(colonIndex + 1).toLowerCase();
      return await resolveMultiChainAddress(baseName, chain);
    }

    // Normalize the name
    const normalizedName = normalize(name);

    // Try primary resolution
    let address: string | null = null;

    if (name.endsWith('.base')) {
      // Resolve Basename on Base chain
      address = await baseClient.getEnsAddress({
        name: normalizedName,
      });
    } else {
      // Default to mainnet ENS
      address = await mainnetClient.getEnsAddress({
        name: normalizedName,
      });
    }

    // If primary failed, try ENSData API as fallback
    if (!address) {
      address = await resolveViaENSDataAPI(name);
    }

    return address;
  } catch (error) {
    console.error('ENS resolution error:', error);
    
    // Try fallback API
    try {
      return await resolveViaENSDataAPI(name);
    } catch (fallbackError) {
      return null;
    }
  }
}

/**
 * Resolve multi-chain address from ENS (e.g., vitalik.eth:btc)
 */
async function resolveMultiChainAddress(name: string, chain: string): Promise<string | null> {
  try {
    const normalizedName = normalize(name);
    const coinType = COIN_TYPES[chain];

    if (!coinType && coinType !== 0) {
      console.warn(`Unsupported chain: ${chain}`);
      return null;
    }

    // Use viem to get address for specific coin type
    const address = await mainnetClient.getEnsAddress({
      name: normalizedName,
      coinType: BigInt(coinType),
    });

    return address;
  } catch (error) {
    console.error(`Multi-chain resolution error for ${chain}:`, error);
    return null;
  }
}

/**
 * Resolve via ENSData API (fallback)
 * Free public API: https://api.ensdata.net/
 */
async function resolveViaENSDataAPI(name: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.ensdata.net/${name}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data?.address || null;
  } catch (error) {
    console.error('ENSData API error:', error);
    return null;
  }
}

/**
 * Reverse resolve address to ENS name
 * Checks mainnet ENS first, then Base
 */
export async function resolveAddressToENS(address: string): Promise<string | null> {
  try {
    // Try mainnet ENS first
    const ensName = await mainnetClient.getEnsName({
      address: address as `0x${string}`,
    });

    if (ensName) {
      return ensName;
    }

    // Try Base basename
    const basename = await baseClient.getEnsName({
      address: address as `0x${string}`,
    });

    return basename;
  } catch (error) {
    console.error('Reverse ENS resolution error:', error);
    return null;
  }
}

/**
 * Get ENS avatar for an address or ENS name
 */
export async function getENSAvatar(nameOrAddress: string): Promise<string | null> {
  try {
    // If it's an address, resolve to ENS first
    let ensName = nameOrAddress;
    if (nameOrAddress.startsWith('0x')) {
      const resolved = await resolveAddressToENS(nameOrAddress);
      if (!resolved) return null;
      ensName = resolved;
    }

    const normalizedName = normalize(ensName);

    // Get avatar from appropriate chain
    if (ensName.endsWith('.base')) {
      return await baseClient.getEnsAvatar({ name: normalizedName });
    } else {
      return await mainnetClient.getEnsAvatar({ name: normalizedName });
    }
  } catch (error) {
    console.error('ENS avatar resolution error:', error);
    return null;
  }
}

/**
 * Get ENS text records (e.g., description, url, twitter, etc.)
 * Common keys:
 * - 'com.twitter' or 'com.x' → Twitter handle
 * - 'com.github' → GitHub username
 * - 'url' → Website
 * - 'email' → Email
 * - 'avatar' → Avatar URL
 * - 'description' → Bio
 */
export async function getENSText(
  name: string,
  key: string
): Promise<string | null> {
  try {
    const normalizedName = normalize(name);

    let text: string | null = null;

    if (name.endsWith('.base')) {
      text = await baseClient.getEnsText({
        name: normalizedName,
        key,
      });
    } else {
      text = await mainnetClient.getEnsText({
        name: normalizedName,
        key,
      });
    }

    // If primary failed, try ENSData API
    if (!text && key === 'com.twitter') {
      text = await getENSTextViaAPI(name, 'twitter');
    }

    return text;
  } catch (error) {
    console.error('ENS text resolution error:', error);
    return null;
  }
}

/**
 * Get ENS text records via API (fallback)
 */
async function getENSTextViaAPI(name: string, type: string): Promise<string | null> {
  try {
    const response = await fetch(`https://api.ensdata.net/${name}`);
    if (!response.ok) return null;

    const data = await response.json();
    
    switch (type) {
      case 'twitter':
        return data?.twitter || null;
      case 'github':
        return data?.github || null;
      case 'url':
        return data?.url || null;
      default:
        return null;
    }
  } catch (error) {
    return null;
  }
}

/**
 * Validate if a string is a valid ENS/Basename
 * Supports multi-chain format (vitalik.eth:btc)
 */
export function isENSName(input: string): boolean {
  // Check for multi-chain format
  if (input.includes(':')) {
    const [baseName] = input.split(':');
    return isENSName(baseName);
  }

  return (
    input.endsWith('.eth') ||
    input.endsWith('.base') ||
    input.endsWith('.xyz') ||
    input.endsWith('.com') ||
    input.endsWith('.art') ||
    input.endsWith('.lens') ||
    input.endsWith('.id')
  );
}

/**
 * Parse ENS name with chain suffix
 * Example: "vitalik.eth:btc" → { name: "vitalik.eth", chain: "btc" }
 */
export function parseENSName(input: string): { name: string; chain?: string } {
  const colonIndex = input.lastIndexOf(':');
  if (colonIndex !== -1) {
    return {
      name: input.substring(0, colonIndex),
      chain: input.substring(colonIndex + 1),
    };
  }
  return { name: input };
}

/**
 * Batch resolve multiple ENS names
 */
export async function batchResolveENS(
  names: string[]
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();

  await Promise.all(
    names.map(async (name) => {
      const address = await resolveENSName(name);
      results.set(name, address);
    })
  );

  return results;
}

/**
 * Resolve name or address (smart resolver)
 * Returns the address if valid, or resolves ENS if it's a name
 */
export async function resolveNameOrAddress(input: string): Promise<string | null> {
  // If it's already an address, return it
  if (input.startsWith('0x') && input.length === 42) {
    return input;
  }

  // If it's an ENS name, resolve it
  if (isENSName(input)) {
    return await resolveENSName(input);
  }

  return null;
}

