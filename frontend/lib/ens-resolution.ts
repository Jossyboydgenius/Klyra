/**
 * ENS Resolution Utility
 * Resolves ENS names to addresses and addresses to ENS names
 * Includes input validation and sanitization
 */

import { createPublicClient, http, isAddress } from 'viem';
import { mainnet, base } from 'viem/chains';
import { normalize } from 'viem/ens';

/**
 * Sanitize and validate input to prevent XSS, SQL injection, etc.
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Remove any script tags and HTML
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '');

  // Limit length to prevent DoS
  if (sanitized.length > 256) {
    sanitized = sanitized.substring(0, 256);
  }

  return sanitized;
}

/**
 * Validate if input is an Ethereum address
 */
export function isValidAddress(address: string): boolean {
  try {
    return isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Validate if input is an ENS name
 */
export function isValidENSName(name: string): boolean {
  // ENS names should end with .eth or be a valid domain
  const ensRegex = /^[a-z0-9-]+\.(eth|base\.eth|xyz)$/i;
  return ensRegex.test(name);
}

/**
 * Resolve ENS name to address
 */
export async function resolveENS(ensName: string): Promise<{ address: string | null; error?: string }> {
  try {
    const sanitized = sanitizeInput(ensName);
    
    if (!isValidENSName(sanitized)) {
      return { address: null, error: 'Invalid ENS name format' };
    }

    // Try mainnet first (most ENS names are on mainnet)
    const mainnetClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    });

    try {
      const normalized = normalize(sanitized);
      const address = await mainnetClient.getEnsAddress({ name: normalized });
      
      if (address) {
        return { address };
      }
    } catch (error) {
      console.log('Mainnet resolution failed, trying Base:', error);
    }

    // Try Base (for .base.eth names)
    const baseClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    try {
      const normalized = normalize(sanitized);
      const address = await baseClient.getEnsAddress({ name: normalized });
      
      if (address) {
        return { address };
      }
    } catch (error) {
      console.log('Base resolution failed:', error);
    }

    return { address: null, error: 'ENS name not found' };
  } catch (error: any) {
    console.error('ENS resolution error:', error);
    return { address: null, error: error.message || 'Failed to resolve ENS name' };
  }
}

/**
 * Resolve address to ENS name
 */
export async function lookupENS(address: string): Promise<{ name: string | null; error?: string }> {
  try {
    const sanitized = sanitizeInput(address);
    
    if (!isValidAddress(sanitized)) {
      return { name: null, error: 'Invalid address format' };
    }

    // Try mainnet first
    const mainnetClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    });

    try {
      const name = await mainnetClient.getEnsName({ address: sanitized as `0x${string}` });
      
      if (name) {
        return { name };
      }
    } catch (error) {
      console.log('Mainnet lookup failed, trying Base:', error);
    }

    // Try Base
    const baseClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    try {
      const name = await baseClient.getEnsName({ address: sanitized as `0x${string}` });
      
      if (name) {
        return { name };
      }
    } catch (error) {
      console.log('Base lookup failed:', error);
    }

    return { name: null };
  } catch (error: any) {
    console.error('ENS lookup error:', error);
    return { name: null, error: error.message || 'Failed to lookup ENS name' };
  }
}

/**
 * Get ENS avatar URL
 */
export async function getENSAvatar(ensName: string): Promise<string | null> {
  try {
    const sanitized = sanitizeInput(ensName);
    
    if (!isValidENSName(sanitized)) {
      return null;
    }

    const mainnetClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    });

    try {
      const normalized = normalize(sanitized);
      const avatar = await mainnetClient.getEnsAvatar({ name: normalized });
      return avatar || null;
    } catch (error) {
      console.log('Avatar fetch failed:', error);
      return null;
    }
  } catch (error) {
    console.error('ENS avatar error:', error);
    return null;
  }
}

/**
 * Parse input and determine if it's an address or ENS name
 */
export function parseAddressInput(input: string): { type: 'address' | 'ens' | 'invalid'; value: string } {
  const sanitized = sanitizeInput(input);
  
  if (!sanitized) {
    return { type: 'invalid', value: '' };
  }

  if (isValidAddress(sanitized)) {
    return { type: 'address', value: sanitized };
  }

  if (isValidENSName(sanitized)) {
    return { type: 'ens', value: sanitized };
  }

  return { type: 'invalid', value: sanitized };
}

/**
 * Generate a deterministic avatar URL based on address (Jazzicon style)
 * This provides a fallback when ENS avatar is not available
 */
export function getAddressAvatar(address: string): string {
  // Use a simple hash-based avatar service as fallback
  // You can replace this with your preferred avatar service
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${address.toLowerCase()}`;
}

