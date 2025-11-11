/**
 * Multicall-based Balance Fetching Hook
 * Uses Multicall3 to batch all token balance queries into a single RPC call per chain
 * This dramatically reduces rate limiting issues
 */

import { useMemo, useState, useEffect, useCallback } from 'react';
import { usePublicClient, useBalance } from 'wagmi';
import { formatUnits, Address } from 'viem';
import { getAllChains, getCombinedTokensForChain, getMainnetChains, getTestnetChains } from '@/lib/chain-data';
import { getSquidTokensForChain } from '@/lib/squid-tokens';
import { getAcrossTokensForChain } from '@/lib/across-tokens';
import {
  executeMulticall,
  batchTokensByChain,
} from './multicall3';
import type { Chain, Token } from '@/lib/chain-data';

export interface TokenBalance {
  chain: Chain;
  token: Token;
  balance: string;
  balanceFormatted: string;
}

interface UseMulticallBalancesOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onlyNonZero?: boolean;
}

/**
 * Hook to fetch token balances using Multicall3
 * Batches all token queries into a single RPC call per chain
 */
export function useMulticallBalances(
  address?: `0x${string}`,
  chainIds?: number[],
  includeTestnets: boolean = false,
  options?: UseMulticallBalancesOptions
) {
  const {
    autoRefresh = true,
    refreshInterval = 60000, // 60 seconds
    onlyNonZero = true,
  } = options || {};

  const [isLoading, setIsLoading] = useState(false);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Get public clients for each chain (wagmi handles this)
  // We'll use the public client from wagmi for multicall execution
  const publicClients = useMemo(() => {
    // This will be handled per-chain in the fetch function
    return {};
  }, []);

  // Separate mainnet and testnet chains
  const mainnetChains = useMemo(() => {
    const chains = getMainnetChains();
    if (chainIds && chainIds.length > 0) {
      return chains.filter(chain => chainIds.includes(chain.id));
    }
    return chains;
  }, [chainIds]);

  const testnetChains = useMemo(() => {
    if (!includeTestnets) return [];
    const chains = getTestnetChains();
    if (chainIds && chainIds.length > 0) {
      return chains.filter(chain => chainIds.includes(chain.id));
    }
    return chains;
  }, [chainIds, includeTestnets]);

  const chains = useMemo(() => {
    if (includeTestnets) {
      return [...mainnetChains, ...testnetChains];
    }
    return mainnetChains;
  }, [mainnetChains, testnetChains, includeTestnets]);

  // State for enhanced tokens from APIs
  const [squidTokensMap, setSquidTokensMap] = useState<Map<number, Token[]>>(new Map());
  const [acrossTokensMap, setAcrossTokensMap] = useState<Map<number, Token[]>>(new Map());
  const [isLoadingExternalTokens, setIsLoadingExternalTokens] = useState(false);

  // Fetch Squid and Across tokens for testnets
  useEffect(() => {
    if (!includeTestnets || testnetChains.length === 0) {
      setSquidTokensMap(new Map());
      setAcrossTokensMap(new Map());
      return;
    }

    setIsLoadingExternalTokens(true);
    const promises: Promise<any>[] = [];

    testnetChains.forEach(chain => {
      promises.push(
        getSquidTokensForChain(chain.id, true)
          .then(tokens => {
            const convertedTokens: Token[] = tokens.map(t => ({
              chainId: t.chainId,
              address: t.address,
              name: t.name,
              symbol: t.symbol,
              decimals: t.decimals,
              logoURI: t.logoURI,
            }));
            setSquidTokensMap(prev => new Map(prev).set(chain.id, convertedTokens));
            return { success: true, chainId: chain.id, source: 'squid' };
          })
          .catch((error) => {
            console.warn(`Failed to fetch Squid tokens for chain ${chain.id}:`, error);
            return { success: false, chainId: chain.id, source: 'squid', error };
          })
      );

      promises.push(
        getAcrossTokensForChain(chain.id, true)
          .then(tokens => {
            setAcrossTokensMap(prev => new Map(prev).set(chain.id, tokens));
            return { success: true, chainId: chain.id, source: 'across' };
          })
          .catch((error) => {
            console.warn(`Failed to fetch Across tokens for chain ${chain.id}:`, error);
            return { success: false, chainId: chain.id, source: 'across', error };
          })
      );
    });

    Promise.allSettled(promises).finally(() => {
      setIsLoadingExternalTokens(false);
    });
  }, [testnetChains, includeTestnets]);

  // Get all tokens for all chains
  const allTokens = useMemo(() => {
    const tokens: Token[] = [];
    const tokensMap = new Map<string, Token>(); // Deduplicate by address-symbol

    chains.forEach(chain => {
      // Base tokens
      const chainTokens = getCombinedTokensForChain(chain.id);
      chainTokens.forEach(token => {
        const key = `${token.address.toLowerCase()}-${token.symbol}`;
        if (!tokensMap.has(key)) {
          tokensMap.set(key, token);
        }
      });

      // Squid tokens (testnets)
      if (includeTestnets) {
        const squidTokens = squidTokensMap.get(chain.id) || [];
        squidTokens.forEach(token => {
          const key = `${token.address.toLowerCase()}-${token.symbol}`;
          if (!tokensMap.has(key)) {
            tokensMap.set(key, token);
          }
        });
      }

      // Across tokens (testnets)
      if (includeTestnets) {
        const acrossTokens = acrossTokensMap.get(chain.id) || [];
        acrossTokens.forEach(token => {
          const key = `${token.address.toLowerCase()}-${token.symbol}`;
          if (!tokensMap.has(key)) {
            tokensMap.set(key, token);
          }
        });
      }
    });

    return Array.from(tokensMap.values());
  }, [chains, includeTestnets, squidTokensMap, acrossTokensMap]);

  // Filter ERC20 tokens (exclude native tokens)
  const erc20Tokens = useMemo(() => {
    return allTokens.filter(token => token.address !== '0x0000000000000000000000000000000000000000');
  }, [allTokens]);

  // Fetch balances using multicall
  const fetchBalances = useCallback(async () => {
    if (!address) {
      setBalances([]);
      return;
    }

    setIsLoading(true);

    try {
      // Batch tokens by chain
      const tokensByChain = batchTokensByChain(erc20Tokens);
      const allResults: TokenBalance[] = [];

      // Fetch balances for each chain using multicall
      const chainPromises = Array.from(tokensByChain.entries()).map(async ([chainId, tokens]) => {
        const chain = chains.find(c => c.id === chainId);
        if (!chain) return;

        try {
          // Get public client for this chain
          // We need to create a client for each chain
          // For now, we'll use a fallback approach with dynamic imports
          const { createPublicClient, http } = await import('viem');
          const { getRpcUrls } = await import('@/lib/rpc-fallback');
          
          // Get RPC URLs for this chain
          const rpcUrls = getRpcUrls(chainId);
          if (rpcUrls.length === 0) {
            console.warn(`No RPC URLs found for chain ${chainId}`);
            return;
          }

          // Create public client with first RPC (with fallback)
          const publicClient = createPublicClient({
            chain: chain as any, // Cast to viem Chain type
            transport: http(rpcUrls[0], {
              fetchOptions: {
                timeout: 30000, // 30 second timeout
              },
            }),
          });

          if (tokens.length === 0) return;

          // Execute multicall using viem's built-in multicall (uses Multicall3)
          const results = await executeMulticall(publicClient, tokens, address as Address);

          // Process results
          results.forEach(({ token, balance, success }) => {
            if (!success) return;

            // Only include non-zero balances if onlyNonZero is true
            if (onlyNonZero && balance === 0n) return;

            const formatted = formatUnits(balance, token.decimals);
            allResults.push({
              chain,
              token,
              balance: balance.toString(),
              balanceFormatted: formatted,
            });
          });
        } catch (error) {
          console.error(`Error fetching balances for chain ${chainId}:`, error);
        }
      });

      await Promise.allSettled(chainPromises);
      setBalances(allResults);
      setHasInitiallyLoaded(true);
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address, erc20Tokens, chains, onlyNonZero]);

  // Initial fetch
  useEffect(() => {
    if (address && !isLoadingExternalTokens) {
      fetchBalances();
    }
  }, [address, fetchBalances, isLoadingExternalTokens]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !address || !hasInitiallyLoaded) return;

    const interval = setInterval(() => {
      fetchBalances();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, address, hasInitiallyLoaded, fetchBalances]);

  // Manual refresh
  const refresh = useCallback(async () => {
    setIsManuallyRefreshing(true);
    try {
      await fetchBalances();
    } catch (error) {
      console.error('Error refreshing balances:', error);
    } finally {
      setTimeout(() => setIsManuallyRefreshing(false), 1000);
    }
  }, [fetchBalances]);

  // Filter balances
  const filteredBalances = useMemo(() => {
    if (!onlyNonZero) return balances;
    return balances.filter(balance => {
      try {
        return BigInt(balance.balance) > 0n;
      } catch {
        return parseFloat(balance.balanceFormatted) > 0;
      }
    });
  }, [balances, onlyNonZero]);

  const showLoading = (!hasInitiallyLoaded && (isLoading || isLoadingExternalTokens)) || isManuallyRefreshing;

  return {
    balances: filteredBalances,
    initialBalances: filteredBalances,
    isLoading: showLoading,
    isEmpty: filteredBalances.length === 0 && hasInitiallyLoaded,
    refresh,
    hasMore: false,
  };
}

