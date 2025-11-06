'use client';

import { useState, useEffect, useMemo } from 'react';
import { getCombinedTokensForChain } from '@/lib/chain-data';
import { getSquidTokensForChain } from '@/lib/squid-tokens';
import { getAcrossTokensForChain } from '@/lib/across-tokens';
import type { Token } from '@/lib/chain-data';
import { getChainById } from '@/lib/chain-data';

/**
 * Hook to get enhanced token list for a chain, including Squid and Across tokens for testnets
 * Deduplication: Tokens appearing 1-2 times are included, tokens appearing 3+ times are excluded
 */
export function useEnhancedTokens(chainId: number | null) {
  const [squidTokens, setSquidTokens] = useState<Token[]>([]);
  const [acrossTokens, setAcrossTokens] = useState<Token[]>([]);
  const [isLoadingSquid, setIsLoadingSquid] = useState(false);
  const [isLoadingAcross, setIsLoadingAcross] = useState(false);

  const chain = useMemo(() => {
    return chainId ? getChainById(chainId) : null;
  }, [chainId]);

  // Get base tokens
  const baseTokens = useMemo(() => {
    if (!chainId) return [];
    return getCombinedTokensForChain(chainId);
  }, [chainId]);

  // Fetch Squid tokens for testnets
  useEffect(() => {
    if (chainId && chain?.testnet) {
      setIsLoadingSquid(true);
      getSquidTokensForChain(chainId, true)
        .then(tokens => {
          const convertedTokens: Token[] = tokens.map(t => ({
            chainId: t.chainId,
            address: t.address,
            name: t.name,
            symbol: t.symbol,
            decimals: t.decimals,
            logoURI: t.logoURI,
          }));
          setSquidTokens(convertedTokens);
        })
        .catch(err => {
          console.error('Error loading Squid tokens:', err);
          setSquidTokens([]);
        })
        .finally(() => setIsLoadingSquid(false));
    } else {
      setSquidTokens([]);
      setIsLoadingSquid(false);
    }
  }, [chainId, chain]);

  // Fetch Across tokens for testnets
  useEffect(() => {
    if (chainId && chain?.testnet) {
      setIsLoadingAcross(true);
      getAcrossTokensForChain(chainId, true)
        .then(tokens => {
          setAcrossTokens(tokens);
        })
        .catch(err => {
          console.error('Error loading Across tokens:', err);
          setAcrossTokens([]);
        })
        .finally(() => setIsLoadingAcross(false));
    } else {
      setAcrossTokens([]);
      setIsLoadingAcross(false);
    }
  }, [chainId, chain]);

  // Combine base tokens with Squid and Across tokens
  // Deduplication: Allow 2 duplicates, exclude tokens with 3+ occurrences
  const enhancedTokens = useMemo(() => {
    const tokensMap = new Map<string, { token: Token; count: number }>();
    const excludedTokens = new Set<string>(); // Track tokens that have been excluded (3+ occurrences)
    
    // Helper to add token with duplicate tracking
    const addToken = (token: Token) => {
      const key = `${token.address.toLowerCase()}-${token.symbol}`;
      
      // Skip if already excluded
      if (excludedTokens.has(key)) {
        return;
      }
      
      const existing = tokensMap.get(key);
      
      if (existing) {
        // Increment count
        existing.count++;
        // If count reaches 3+, exclude it permanently
        if (existing.count >= 3) {
          tokensMap.delete(key);
          excludedTokens.add(key);
        }
      } else {
        // First occurrence
        tokensMap.set(key, { token, count: 1 });
      }
    };
    
    // Add base tokens first
    baseTokens.forEach(addToken);
    
    // Add Squid tokens
    squidTokens.forEach(addToken);
    
    // Add Across tokens
    acrossTokens.forEach(addToken);
    
    // Extract tokens from map (only those with count <= 2)
    const finalTokens = Array.from(tokensMap.values())
      .filter(item => item.count <= 2)
      .map(item => item.token)
      .sort((a, b) => {
        // Sort native token first, then stablecoins, then alphabetically
        if (a.address === '0x0000000000000000000000000000000000000000') return -1;
        if (b.address === '0x0000000000000000000000000000000000000000') return 1;
        if (['USDC', 'USDT', 'DAI'].includes(a.symbol) && !['USDC', 'USDT', 'DAI'].includes(b.symbol)) return -1;
        if (['USDC', 'USDT', 'DAI'].includes(b.symbol) && !['USDC', 'USDT', 'DAI'].includes(a.symbol)) return 1;
        return a.symbol.localeCompare(b.symbol);
      });
    
    return finalTokens;
  }, [baseTokens, squidTokens, acrossTokens]);

  return {
    tokens: enhancedTokens,
    isLoading: isLoadingSquid || isLoadingAcross,
    hasSquidTokens: squidTokens.length > 0,
    hasAcrossTokens: acrossTokens.length > 0,
  };
}

