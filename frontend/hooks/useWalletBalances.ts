import { useMemo, useState, useEffect, useCallback } from 'react';
import { useReadContracts, useBalance } from 'wagmi';
import { formatUnits, Address, erc20Abi } from 'viem';
import { getAllChains, getCombinedTokensForChain, getMainnetChains, getTestnetChains } from '@/lib/chain-data';
import { getSquidTokensForChain } from '@/lib/squid-tokens';
import { getAcrossTokensForChain } from '@/lib/across-tokens';
import type { Chain, Token } from '@/lib/chain-data';

export interface TokenBalance {
  chain: Chain;
  token: Token;
  balance: string;
  balanceFormatted: string;
}

/**
 * Hook to fetch token balances from connected wallet
 * Only returns tokens with non-zero balances
 * Includes native tokens and ERC20 tokens
 * Mainnet and testnet balances are kept separate to prevent unnecessary refreshes
 */
interface UseWalletBalancesOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onlyNonZero?: boolean;
}

export function useWalletBalances(
  address?: `0x${string}`, 
  chainIds?: number[], 
  includeTestnets: boolean = false,
  options?: UseWalletBalancesOptions
) {
  const {
    autoRefresh = true,
    refreshInterval = 60000, // 60 seconds
    onlyNonZero = true,
  } = options || {};

  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  // Separate mainnet and testnet chains to prevent refresh when toggling
  const mainnetChains = useMemo(() => {
    const chains = getMainnetChains();
    if (chainIds && chainIds.length > 0) {
      return chains.filter(chain => chainIds.includes(chain.id));
    }
    return chains;
  }, [chainIds]); // Don't include includeTestnets here

  const testnetChains = useMemo(() => {
    if (!includeTestnets) return [];
    const chains = getTestnetChains();
    if (chainIds && chainIds.length > 0) {
      return chains.filter(chain => chainIds.includes(chain.id));
    }
    return chains;
  }, [chainIds, includeTestnets]);

  // Combine chains only when needed
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
      // Fetch Squid tokens - wrap in a promise that always resolves
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
            // Silently fail, just don't add tokens
            console.warn(`Failed to fetch Squid tokens for chain ${chain.id}:`, error);
            return { success: false, chainId: chain.id, source: 'squid', error };
          })
      );

      // Fetch Across tokens - wrap in a promise that always resolves
      promises.push(
        getAcrossTokensForChain(chain.id, true)
          .then(tokens => {
            setAcrossTokensMap(prev => new Map(prev).set(chain.id, tokens));
            return { success: true, chainId: chain.id, source: 'across' };
          })
          .catch((error) => {
            // Silently fail, just don't add tokens
            console.warn(`Failed to fetch Across tokens for chain ${chain.id}:`, error);
            return { success: false, chainId: chain.id, source: 'across', error };
          })
      );
    });

    // Use allSettled to ensure all promises complete, even if some fail
    Promise.allSettled(promises).finally(() => {
      setIsLoadingExternalTokens(false);
    });
  }, [testnetChains, includeTestnets]);

  // Get tokens separately for mainnet and testnet to prevent refresh
  // Include enhanced tokens from Squid and Across for testnets
  const mainnetTokens = useMemo(() => {
    const tokens: Token[] = [];
    mainnetChains.forEach(chain => {
      const chainTokens = getCombinedTokensForChain(chain.id);
      tokens.push(...chainTokens);
    });
    return tokens;
  }, [mainnetChains]);

  const testnetTokens = useMemo(() => {
    if (!includeTestnets) return [];
    const tokens: Token[] = [];
    const tokensMap = new Map<string, Token>(); // Deduplicate by address-symbol

    testnetChains.forEach(chain => {
      // Base tokens
      const chainTokens = getCombinedTokensForChain(chain.id);
      chainTokens.forEach(token => {
        const key = `${token.address.toLowerCase()}-${token.symbol}`;
        if (!tokensMap.has(key)) {
          tokensMap.set(key, token);
        }
      });

      // Squid tokens
      const squidTokens = squidTokensMap.get(chain.id) || [];
      squidTokens.forEach(token => {
        const key = `${token.address.toLowerCase()}-${token.symbol}`;
        if (!tokensMap.has(key)) {
          tokensMap.set(key, token);
        }
      });

      // Across tokens
      const acrossTokens = acrossTokensMap.get(chain.id) || [];
      acrossTokens.forEach(token => {
        const key = `${token.address.toLowerCase()}-${token.symbol}`;
        if (!tokensMap.has(key)) {
          tokensMap.set(key, token);
        }
      });
    });

    return Array.from(tokensMap.values());
  }, [testnetChains, includeTestnets, squidTokensMap, acrossTokensMap]);

  // Combine tokens only when needed
  const allTokens = useMemo(() => {
    if (includeTestnets) {
      return [...mainnetTokens, ...testnetTokens];
    }
    return mainnetTokens;
  }, [mainnetTokens, testnetTokens, includeTestnets]);

  // Filter out native tokens (we'll handle separately with useBalance)
  // Prioritize tokens: stablecoins first, then limit total to avoid rate limiting
  const erc20Tokens = useMemo(() => {
    const filtered = allTokens.filter(token => token.address !== '0x0000000000000000000000000000000000000000');
    
    // Sort: stablecoins first (USDC, USDT, DAI), then others
    const sorted = filtered.sort((a, b) => {
      const aIsStablecoin = ['USDC', 'USDT', 'DAI'].includes(a.symbol);
      const bIsStablecoin = ['USDC', 'USDT', 'DAI'].includes(b.symbol);
      
      if (aIsStablecoin && !bIsStablecoin) return -1;
      if (!aIsStablecoin && bIsStablecoin) return 1;
      return a.symbol.localeCompare(b.symbol);
    });
    
    return sorted;
  }, [allTokens]);

  // Build contract reads for ERC20 tokens
  const contracts = useMemo(() => {
    if (!address) return [];
    
    return erc20Tokens.map(token => ({
      address: token.address as Address,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [address],
      chainId: token.chainId,
    }));
  }, [address, erc20Tokens]);

  // Read balances with optimized settings
  const { data: balanceData, isLoading, refetch: refetchErc20 } = useReadContracts({
    contracts,
    query: {
      // Add stale time to reduce refetching
      staleTime: 30000, // 30 seconds - balances don't change that frequently
      // Add retry configuration with exponential backoff
      retry: (failureCount, error) => {
        // Don't retry on rate limit errors immediately
        if (error?.message?.includes('rate limit') || error?.message?.includes('429')) {
          return failureCount < 1; // Only retry once for rate limits
        }
        return failureCount < 2; // Retry twice for other errors
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff, max 5s
      // Refetch settings
      refetchOnWindowFocus: false, // Don't refetch on window focus to reduce requests
      refetchOnReconnect: true, // Refetch when reconnecting
    },
  });

  // Fetch native balances for the first chain
  // Note: Full multi-chain native balance support would require fetching for each chain separately

  // Process ERC20 results
  const erc20Balances = useMemo(() => {
    if (!balanceData || !address) return [];
    
    const results: TokenBalance[] = [];
    
    balanceData.forEach((result, index) => {
      const token = erc20Tokens[index];
      const chain = chains.find(c => c.id === token.chainId);
      
      if (!chain || !result.status || !result.result) return;
      
      const rawBalance = result.result as bigint;
      const formatted = formatUnits(rawBalance, token.decimals);
      
      // Only include non-zero balances (even if very small like 0.0002)
      if (parseFloat(formatted) > 0) {
        results.push({
          chain,
          token,
          balance: rawBalance.toString(),
          balanceFormatted: formatted,
        });
      }
    });
    
    return results;
  }, [balanceData, address, chains, erc20Tokens]);

  // Fetch native balances for mainnet chains (Base, Ethereum, Polygon, Optimism, Arbitrum)
  const mainnetMainChainIds = [8453, 1, 137, 10, 42161]; // Base, Ethereum, Polygon, Optimism, Arbitrum
  const mainnetChainsToCheck = mainnetChains.filter(chain => mainnetMainChainIds.includes(chain.id)).slice(0, 5);
  
  // Shared query options for native balances to reduce rate limiting
  const nativeBalanceQueryOptions = {
    staleTime: 30000, // 30 seconds
    retry: (failureCount: number, error: any) => {
      if (error?.message?.includes('rate limit') || error?.message?.includes('429')) {
        return failureCount < 1;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  };

  // Fetch native balances for mainnet chains (always enabled)
  const mainnetNativeBalance1 = useBalance({ 
    address, 
    chainId: mainnetChainsToCheck[0]?.id, 
    query: { ...nativeBalanceQueryOptions, enabled: !!address && !!mainnetChainsToCheck[0] } 
  });
  const mainnetNativeBalance2 = useBalance({ 
    address, 
    chainId: mainnetChainsToCheck[1]?.id, 
    query: { ...nativeBalanceQueryOptions, enabled: !!address && !!mainnetChainsToCheck[1] } 
  });
  const mainnetNativeBalance3 = useBalance({ 
    address, 
    chainId: mainnetChainsToCheck[2]?.id, 
    query: { ...nativeBalanceQueryOptions, enabled: !!address && !!mainnetChainsToCheck[2] } 
  });
  const mainnetNativeBalance4 = useBalance({ 
    address, 
    chainId: mainnetChainsToCheck[3]?.id, 
    query: { ...nativeBalanceQueryOptions, enabled: !!address && !!mainnetChainsToCheck[3] } 
  });
  const mainnetNativeBalance5 = useBalance({ 
    address, 
    chainId: mainnetChainsToCheck[4]?.id, 
    query: { ...nativeBalanceQueryOptions, enabled: !!address && !!mainnetChainsToCheck[4] } 
  });

  // Collect refetch functions for native balances
  const nativeRefetchFunctions = [
    mainnetNativeBalance1.refetch,
    mainnetNativeBalance2.refetch,
    mainnetNativeBalance3.refetch,
    mainnetNativeBalance4.refetch,
    mainnetNativeBalance5.refetch,
  ];
  
  // Fetch native balances for testnet chains (only when includeTestnets is true)
  const testnetMainChainIds = [84532, 11155111, 80002, 11155420, 421614]; // Base Sepolia, Sepolia, Polygon Amoy, OP Sepolia, Arbitrum Sepolia
  const testnetChainsToCheck = testnetChains.filter(chain => testnetMainChainIds.includes(chain.id)).slice(0, 5);
  
  const testnetNativeBalance1 = useBalance({ 
    address, 
    chainId: testnetChainsToCheck[0]?.id, 
    query: { ...nativeBalanceQueryOptions, enabled: !!address && !!testnetChainsToCheck[0] && includeTestnets } 
  });
  const testnetNativeBalance2 = useBalance({ 
    address, 
    chainId: testnetChainsToCheck[1]?.id, 
    query: { ...nativeBalanceQueryOptions, enabled: !!address && !!testnetChainsToCheck[1] && includeTestnets } 
  });
  const testnetNativeBalance3 = useBalance({ 
    address, 
    chainId: testnetChainsToCheck[2]?.id, 
    query: { ...nativeBalanceQueryOptions, enabled: !!address && !!testnetChainsToCheck[2] && includeTestnets } 
  });
  const testnetNativeBalance4 = useBalance({ 
    address, 
    chainId: testnetChainsToCheck[3]?.id, 
    query: { ...nativeBalanceQueryOptions, enabled: !!address && !!testnetChainsToCheck[3] && includeTestnets } 
  });
  const testnetNativeBalance5 = useBalance({ 
    address, 
    chainId: testnetChainsToCheck[4]?.id, 
    query: { ...nativeBalanceQueryOptions, enabled: !!address && !!testnetChainsToCheck[4] && includeTestnets } 
  });

  // Collect refetch functions for testnet native balances
  const testnetNativeRefetchFunctions = includeTestnets ? [
    testnetNativeBalance1.refetch,
    testnetNativeBalance2.refetch,
    testnetNativeBalance3.refetch,
    testnetNativeBalance4.refetch,
    testnetNativeBalance5.refetch,
  ] : [];
  
  const isMainnetNativeLoading = mainnetNativeBalance1.isLoading || mainnetNativeBalance2.isLoading || mainnetNativeBalance3.isLoading || mainnetNativeBalance4.isLoading || mainnetNativeBalance5.isLoading;
  const isTestnetNativeLoading = testnetNativeBalance1.isLoading || testnetNativeBalance2.isLoading || testnetNativeBalance3.isLoading || testnetNativeBalance4.isLoading || testnetNativeBalance5.isLoading;
  const isNativeLoading = isMainnetNativeLoading || (includeTestnets && isTestnetNativeLoading);
  
  // Combine mainnet and testnet native balances
  const mainnetNativeBalances = [
    { chain: mainnetChainsToCheck[0], data: mainnetNativeBalance1.data },
    { chain: mainnetChainsToCheck[1], data: mainnetNativeBalance2.data },
    { chain: mainnetChainsToCheck[2], data: mainnetNativeBalance3.data },
    { chain: mainnetChainsToCheck[3], data: mainnetNativeBalance4.data },
    { chain: mainnetChainsToCheck[4], data: mainnetNativeBalance5.data },
  ].filter(item => item.chain && item.data);
  
  const testnetNativeBalances = includeTestnets ? [
    { chain: testnetChainsToCheck[0], data: testnetNativeBalance1.data },
    { chain: testnetChainsToCheck[1], data: testnetNativeBalance2.data },
    { chain: testnetChainsToCheck[2], data: testnetNativeBalance3.data },
    { chain: testnetChainsToCheck[3], data: testnetNativeBalance4.data },
    { chain: testnetChainsToCheck[4], data: testnetNativeBalance5.data },
  ].filter(item => item.chain && item.data) : [];
  
  const nativeBalances = [...mainnetNativeBalances, ...testnetNativeBalances];

  // Combine ERC20 and native balances - this updates progressively as data comes in
  const allBalances = useMemo(() => {
    const results = [...erc20Balances];
    
    // Add native token balances
    nativeBalances.forEach(({ chain, data }) => {
      if (chain && data && address && parseFloat(data.formatted) > 0) {
        results.push({
          chain,
          token: {
            chainId: chain.id,
            address: '0x0000000000000000000000000000000000000000',
            name: chain.nativeCurrency.name,
            symbol: chain.nativeCurrency.symbol,
            decimals: chain.nativeCurrency.decimals,
          } as Token,
          balance: data.value.toString(),
          balanceFormatted: data.formatted,
        });
      }
    });
    
    return results;
  }, [erc20Balances, nativeBalances, address]);

  // Reset initial load flag when address or testnet toggle changes
  useEffect(() => {
    setHasInitiallyLoaded(false);
  }, [address, includeTestnets]);

  // Track initial load - once we have at least one balance or all queries have completed, mark as loaded
  useEffect(() => {
    if (!address) {
      return;
    }

    // If we have balances or all queries are no longer loading, mark as initially loaded
    const hasAnyBalance = allBalances.length > 0;
    const allQueriesDone = !isLoading && !isNativeLoading && !isLoadingExternalTokens;
    
    if (hasAnyBalance || allQueriesDone) {
      if (!hasInitiallyLoaded) {
        setHasInitiallyLoaded(true);
      }
    }
  }, [address, allBalances.length, isLoading, isNativeLoading, isLoadingExternalTokens, hasInitiallyLoaded]);

  // Auto-refresh timer (uses refetch functions) - only runs after initial load
  useEffect(() => {
    if (!autoRefresh || !address || !hasInitiallyLoaded) return;

    const interval = setInterval(() => {
      // Silently refetch all balances in background without showing loading state
      refetchErc20().catch(() => {});
      nativeRefetchFunctions.forEach(fn => fn().catch(() => {}));
      testnetNativeRefetchFunctions.forEach(fn => fn().catch(() => {}));
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, address, hasInitiallyLoaded, refetchErc20, nativeRefetchFunctions, testnetNativeRefetchFunctions]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    setIsManuallyRefreshing(true);
    try {
      // Refetch all balances
      await Promise.all([
        refetchErc20(),
        ...nativeRefetchFunctions.map(fn => fn()),
        ...testnetNativeRefetchFunctions.map(fn => fn()),
      ]);
    } catch (error) {
      console.warn('Error refreshing balances:', error);
    } finally {
      setTimeout(() => setIsManuallyRefreshing(false), 1000);
    }
  }, [refetchErc20, nativeRefetchFunctions, testnetNativeRefetchFunctions]);

  // Filter balances based on onlyNonZero option
  // Use a ref to track previous balances to prevent unnecessary re-renders
  const filteredBalances = useMemo(() => {
    if (!onlyNonZero) return allBalances;
    return allBalances.filter(balance => {
      try {
        return BigInt(balance.balance) > 0n;
      } catch {
        return parseFloat(balance.balanceFormatted) > 0;
      }
    });
  }, [allBalances, onlyNonZero]);

  // Get initial display balances (first 10)
  const initialBalances = useMemo(() => {
    return filteredBalances;
  }, [filteredBalances]);

  // Only show loading state on initial load or manual refresh
  // Once initial load is done, balances update progressively in background without blocking UI
  const showLoading = (!hasInitiallyLoaded && (isLoading || isNativeLoading || isLoadingExternalTokens)) || isManuallyRefreshing;

  // Stable return object - only recreate when balances actually change
  return {
    balances: filteredBalances,
    initialBalances,
    isLoading: showLoading, // Only true on initial load or manual refresh - balances appear progressively otherwise
    isEmpty: filteredBalances.length === 0 && hasInitiallyLoaded, // Only empty if we've loaded and found nothing
    refresh,
    hasMore: false,
  };
}

