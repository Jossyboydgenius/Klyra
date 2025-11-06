// Token utility functions for handling native token addresses across different providers

export const NATIVE_TOKEN_ADDRESSES = {
  ZERO: '0x0000000000000000000000000000000000000000',
  EEE: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
} as const;

/**
 * Normalize native token address to provider-specific format
 * Most providers use 0x0000000000000000000000000000000000000000
 * Squid uses 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
 */
export function normalizeNativeTokenAddress(address: string, provider: 'squid' | 'default' = 'default'): string {
  const addr = address.toLowerCase();
  
  // Check if it's a native token
  const isNative = 
    addr === NATIVE_TOKEN_ADDRESSES.ZERO.toLowerCase() ||
    addr === NATIVE_TOKEN_ADDRESSES.EEE.toLowerCase();

  if (!isNative) {
    return address; // Not a native token, return as is
  }

  // Convert to provider-specific format
  if (provider === 'squid') {
    return NATIVE_TOKEN_ADDRESSES.EEE;
  } else {
    return NATIVE_TOKEN_ADDRESSES.ZERO;
  }
}

/**
 * Check if an address is a native token
 */
export function isNativeToken(address: string): boolean {
  const addr = address.toLowerCase();
  return (
    addr === NATIVE_TOKEN_ADDRESSES.ZERO.toLowerCase() ||
    addr === NATIVE_TOKEN_ADDRESSES.EEE.toLowerCase()
  );
}

/**
 * Convert native token address from one format to another
 */
export function convertNativeTokenAddress(address: string, toFormat: 'zero' | 'eee'): string {
  const addr = address.toLowerCase();
  const isNative = 
    addr === NATIVE_TOKEN_ADDRESSES.ZERO.toLowerCase() ||
    addr === NATIVE_TOKEN_ADDRESSES.EEE.toLowerCase();

  if (!isNative) {
    return address; // Not native, return as is
  }

  return toFormat === 'zero' ? NATIVE_TOKEN_ADDRESSES.ZERO : NATIVE_TOKEN_ADDRESSES.EEE;
}

