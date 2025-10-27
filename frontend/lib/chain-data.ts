// Chain and Token Data Management
import * as allChains from 'wagmi/chains';
import chainsTokenJson from '../chains.token.json';
import tokensList from '../tokens-list.json';

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

export interface Token {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  extensions?: any;
}

// Testnet USDC addresses from usdc-testnmet.txt
export const TESTNET_USDC_ADDRESSES: Record<string, string> = {
  '84532': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
  '11155111': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Ethereum Sepolia
  '80002': '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582', // Polygon PoS Amoy
  '11155420': '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', // OP Sepolia
  '421614': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Arbitrum Sepolia
  '43113': '0x5425890298aed601595a70AB815c96711a31Bc65', // Avalanche Fuji
  '534351': '0xFEce4462D57bD51A6A552365A011b95f0E16d9B7', // Linea Sepolia
};

// Common stablecoin addresses for mainnets
export const MAINNET_STABLECOIN_ADDRESSES: Record<string, Record<string, string>> = {
  'USDC': {
    '1': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
    '137': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Polygon
    '8453': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
    '42161': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
    '10': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Optimism
    '43114': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // Avalanche
  },
  'USDT': {
    '1': '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum
    '137': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // Polygon
    '8453': '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', // Base
    '42161': '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // Arbitrum
    '10': '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', // Optimism
    '43114': '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', // Avalanche
  },
  'DAI': {
    '1': '0x6B175474E89094C44Da98b954EedeAC495271d0F', // Ethereum
    '137': '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', // Polygon
    '8453': '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // Base
    '42161': '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', // Arbitrum
    '10': '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', // Optimism
  }
};

/**
 * Get all available chains from wagmi
 * Deduplicates chains by ID (some chains like base/baseMainnet have same ID)
 */
export function getAllChains(): Chain[] {
  const chains = Object.values(allChains).filter(
    (chain): chain is Chain => typeof chain === 'object' && 'id' in chain && 'name' in chain
  );
  
  // Deduplicate chains by ID - keep first occurrence
  const uniqueChains = new Map<number, Chain>();
  chains.forEach(chain => {
    if (!uniqueChains.has(chain.id)) {
      uniqueChains.set(chain.id, chain);
    }
  });
  
  return Array.from(uniqueChains.values());
}

/**
 * Get mainnet chains only (deduplicated)
 */
export function getMainnetChains(): Chain[] {
  const chains = getAllChains().filter(chain => !chain.testnet);
  // Additional deduplication by ID just in case
  const uniqueChains = new Map<number, Chain>();
  chains.forEach(chain => {
    if (!uniqueChains.has(chain.id)) {
      uniqueChains.set(chain.id, chain);
    }
  });
  return Array.from(uniqueChains.values());
}

/**
 * Get testnet chains only (deduplicated)
 */
export function getTestnetChains(): Chain[] {
  const chains = getAllChains().filter(chain => chain.testnet);
  // Additional deduplication by ID just in case
  const uniqueChains = new Map<number, Chain>();
  chains.forEach(chain => {
    if (!uniqueChains.has(chain.id)) {
      uniqueChains.set(chain.id, chain);
    }
  });
  return Array.from(uniqueChains.values());
}

/**
 * Get chain by ID
 */
export function getChainById(chainId: number): Chain | undefined {
  return getAllChains().find(chain => chain.id === chainId);
}

/**
 * Get tokens from the Uniswap token list (chains.token.json)
 */
export function getAllTokens(): Token[] {
  if ('tokens' in chainsTokenJson && Array.isArray(chainsTokenJson.tokens)) {
    return chainsTokenJson.tokens as Token[];
  }
  return [];
}

/**
 * Get tokens for a specific chain ID
 */
export function getTokensByChainId(chainId: number): Token[] {
  const allTokens = getAllTokens();
  return allTokens.filter(token => token.chainId === chainId);
}

/**
 * Get tokens from the Superbridge token list
 */
export function getSuperchainTokens(): Token[] {
  if ('tokens' in tokensList && Array.isArray(tokensList.tokens)) {
    return tokensList.tokens as Token[];
  }
  return [];
}

/**
 * Get testnet USDC token for a chain
 */
export function getTestnetUSDC(chainId: number): Token | null {
  const chain = getChainById(chainId);
  const address = TESTNET_USDC_ADDRESSES[chainId.toString()];
  
  if (!address || !chain) return null;

  return {
    chainId,
    address,
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoURI: 'https://assets.coingecko.com/coins/images/6319/standard/usdc.png',
  };
}

/**
 * Get common stablecoins for a chain (mainnet)
 */
export function getMainnetStablecoins(chainId: number): Token[] {
  const tokens: Token[] = [];
  const chain = getChainById(chainId);
  
  if (!chain || chain.testnet) return tokens;

  // Add USDC
  if (MAINNET_STABLECOIN_ADDRESSES.USDC[chainId.toString()]) {
    tokens.push({
      chainId,
      address: MAINNET_STABLECOIN_ADDRESSES.USDC[chainId.toString()],
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      logoURI: 'https://assets.coingecko.com/coins/images/6319/standard/usdc.png',
    });
  }

  // Add USDT
  if (MAINNET_STABLECOIN_ADDRESSES.USDT[chainId.toString()]) {
    tokens.push({
      chainId,
      address: MAINNET_STABLECOIN_ADDRESSES.USDT[chainId.toString()],
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
      logoURI: 'https://assets.coingecko.com/coins/images/325/standard/Tether.png',
    });
  }

  // Add DAI
  if (MAINNET_STABLECOIN_ADDRESSES.DAI[chainId.toString()]) {
    tokens.push({
      chainId,
      address: MAINNET_STABLECOIN_ADDRESSES.DAI[chainId.toString()],
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      decimals: 18,
      logoURI: 'https://assets.coingecko.com/coins/images/9956/standard/Badge_Dai.png',
    });
  }

  return tokens;
}

/**
 * Get all available tokens for a chain (combining all sources)
 */
export function getCombinedTokensForChain(chainId: number): Token[] {
  const chain = getChainById(chainId);
  if (!chain) return [];

  const tokensSet = new Map<string, Token>();

  // If testnet, add testnet USDC
  if (chain.testnet) {
    const testnetUSDC = getTestnetUSDC(chainId);
    if (testnetUSDC) {
      tokensSet.set(`${testnetUSDC.address.toLowerCase()}-${testnetUSDC.symbol}`, testnetUSDC);
    }
  } else {
    // If mainnet, add mainnet stablecoins
    const stablecoins = getMainnetStablecoins(chainId);
    stablecoins.forEach(token => {
      tokensSet.set(`${token.address.toLowerCase()}-${token.symbol}`, token);
    });
  }

  // Add tokens from Uniswap list
  const uniswapTokens = getTokensByChainId(chainId);
  uniswapTokens.forEach(token => {
    const key = `${token.address.toLowerCase()}-${token.symbol}`;
    if (!tokensSet.has(key)) {
      tokensSet.set(key, token);
    }
  });

  // Add tokens from Superchain list
  const superchainTokens = getSuperchainTokens().filter(t => t.chainId === chainId);
  superchainTokens.forEach(token => {
    const key = `${token.address.toLowerCase()}-${token.symbol}`;
    if (!tokensSet.has(key)) {
      tokensSet.set(key, token);
    }
  });

  // Add native token as a special entry
  tokensSet.set(`native-${chain.nativeCurrency.symbol}`, {
    chainId,
    address: '0x0000000000000000000000000000000000000000',
    name: chain.nativeCurrency.name,
    symbol: chain.nativeCurrency.symbol,
    decimals: chain.nativeCurrency.decimals,
    logoURI: getDefaultLogoForToken(chain.nativeCurrency.symbol),
  });

  return Array.from(tokensSet.values()).sort((a, b) => {
    // Sort native token first, then stablecoins, then alphabetically
    if (a.address === '0x0000000000000000000000000000000000000000') return -1;
    if (b.address === '0x0000000000000000000000000000000000000000') return 1;
    if (['USDC', 'USDT', 'DAI'].includes(a.symbol) && !['USDC', 'USDT', 'DAI'].includes(b.symbol)) return -1;
    if (['USDC', 'USDT', 'DAI'].includes(b.symbol) && !['USDC', 'USDT', 'DAI'].includes(a.symbol)) return 1;
    return a.symbol.localeCompare(b.symbol);
  });
}

/**
 * Get default logo for common tokens
 */
function getDefaultLogoForToken(symbol: string): string {
  const logos: Record<string, string> = {
    'ETH': 'https://assets.coingecko.com/coins/images/279/standard/ethereum.png',
    'BTC': 'https://assets.coingecko.com/coins/images/1/standard/bitcoin.png',
    'MATIC': 'https://assets.coingecko.com/coins/images/4713/standard/polygon.png',
    'BNB': 'https://assets.coingecko.com/coins/images/825/standard/bnb-icon2_2x.png',
    'AVAX': 'https://assets.coingecko.com/coins/images/12559/standard/Avalanche_Circle_RedWhite_Trans.png',
    'OP': 'https://assets.coingecko.com/coins/images/25244/standard/Optimism.png',
    'ARB': 'https://assets.coingecko.com/coins/images/16547/standard/arb.jpg',
  };
  return logos[symbol] || 'https://assets.coingecko.com/coins/images/1/standard/bitcoin.png';
}

/**
 * Search chains by name or network
 */
export function searchChains(query: string, includeTestnets = false): Chain[] {
  const chains = includeTestnets ? getAllChains() : getMainnetChains();
  const lowerQuery = query.toLowerCase();
  
  return chains.filter(chain => 
    chain.name.toLowerCase().includes(lowerQuery) ||
    (chain.network && chain.network.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Search tokens by symbol or name
 */
export function searchTokens(chainId: number, query: string): Token[] {
  const tokens = getCombinedTokensForChain(chainId);
  const lowerQuery = query.toLowerCase();
  
  return tokens.filter(token =>
    token.symbol.toLowerCase().includes(lowerQuery) ||
    token.name.toLowerCase().includes(lowerQuery)
  );
}

