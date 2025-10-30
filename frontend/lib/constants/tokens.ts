// Token Address Constants
// Native tokens and commonly used addresses

/**
 * Native Token Addresses
 * These represent the native gas token on each chain (ETH, MATIC, BNB, etc.)
 */

// Standard zero address for native tokens
export const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

// Alternative address used by some protocols (1inch, etc.)
export const NATIVE_TOKEN_ADDRESS_ALT = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

/**
 * Check if an address represents a native token
 */
export function isNativeToken(address: string): boolean {
  const addr = address.toLowerCase();
  return (
    addr === NATIVE_TOKEN_ADDRESS.toLowerCase() ||
    addr === NATIVE_TOKEN_ADDRESS_ALT.toLowerCase()
  );
}

/**
 * Get the standard native token address
 */
export function getNativeAddress(): string {
  return NATIVE_TOKEN_ADDRESS;
}

/**
 * Commonly used token addresses across chains
 */
export const COMMON_TOKENS = {
  // Ethereum Mainnet (1)
  ETH_MAINNET: {
    NATIVE: NATIVE_TOKEN_ADDRESS,
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  
  // Polygon (137)
  POLYGON: {
    NATIVE: NATIVE_TOKEN_ADDRESS, // MATIC
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  },
  
  // Arbitrum (42161)
  ARBITRUM: {
    NATIVE: NATIVE_TOKEN_ADDRESS, // ETH
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  },
  
  // Base (8453)
  BASE: {
    NATIVE: NATIVE_TOKEN_ADDRESS, // ETH
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    WETH: '0x4200000000000000000000000000000000000006',
  },
  
  // Optimism (10)
  OPTIMISM: {
    NATIVE: NATIVE_TOKEN_ADDRESS, // ETH
    USDC: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    WETH: '0x4200000000000000000000000000000000000006',
  },
  
  // BNB Chain (56)
  BSC: {
    NATIVE: NATIVE_TOKEN_ADDRESS, // BNB
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    DAI: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
    WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  },
  
  // Avalanche (43114)
  AVALANCHE: {
    NATIVE: NATIVE_TOKEN_ADDRESS, // AVAX
    USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    USDT: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
    DAI: '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
    WAVAX: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
  },
} as const;

/**
 * Get native token symbol for a chain
 */
export function getNativeSymbol(chainId: number): string {
  switch (chainId) {
    case 1: // Ethereum
    case 42161: // Arbitrum
    case 10: // Optimism
    case 8453: // Base
      return 'ETH';
    case 137: // Polygon
      return 'MATIC';
    case 56: // BSC
      return 'BNB';
    case 43114: // Avalanche
      return 'AVAX';
    default:
      return 'Native';
  }
}

/**
 * Get wrapped native token address for a chain
 */
export function getWrappedNativeAddress(chainId: number): string | null {
  switch (chainId) {
    case 1:
      return COMMON_TOKENS.ETH_MAINNET.WETH;
    case 137:
      return COMMON_TOKENS.POLYGON.WMATIC;
    case 42161:
      return COMMON_TOKENS.ARBITRUM.WETH;
    case 8453:
      return COMMON_TOKENS.BASE.WETH;
    case 10:
      return COMMON_TOKENS.OPTIMISM.WETH;
    case 56:
      return COMMON_TOKENS.BSC.WBNB;
    case 43114:
      return COMMON_TOKENS.AVALANCHE.WAVAX;
    default:
      return null;
  }
}

