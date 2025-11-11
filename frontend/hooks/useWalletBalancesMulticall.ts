/**
 * Multicall-based Wallet Balances Hook
 * This is an optimized version that uses Multicall3 to batch all token balance queries
 * into a single RPC call per chain, dramatically reducing rate limiting issues
 * 
 * Usage: Replace useWalletBalances with useWalletBalancesMulticall for better performance
 */

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useBalance } from 'wagmi';
import { formatUnits, Address, createPublicClient, http } from 'viem';
import { getCombinedTokensForChain, getMainnetChains, getTestnetChains } from '@/lib/chain-data';
import { getSquidTokensForChain } from '@/lib/squid-tokens';
import { getAcrossTokensForChain } from '@/lib/across-tokens';
import { executeMulticall, batchTokensByChain } from '@/lib/multicall/multicall3';
import { getRpcUrls } from '@/lib/rpc-fallback';
import type { Chain, Token } from '@/lib/chain-data';

export interface TokenBalance {
  chain: Chain;
  token: Token;
  balance: string;
  balanceFormatted: string;
}

interface UseWalletBalancesOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onlyNonZero?: boolean;
}

/**
 * Hook to fetch token balances using Multicall3
 * Batches all token queries into a single RPC call per chain
 */
export function useWalletBalancesMulticall(
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

  const [isLoading, setIsLoading] = useState(false);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

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

      // Fetch balances for each chain using multicall (ONE RPC CALL PER CHAIN!)
      const chainPromises = Array.from(tokensByChain.entries()).map(async ([chainId, tokens]) => {
        const chain = chains.find(c => c.id === chainId);
        if (!chain || tokens.length === 0) return;

        try {
          // Get RPC URLs for this chain
          const rpcUrls = getRpcUrls(chainId);
          if (rpcUrls.length === 0) {
            console.warn(`No RPC URLs found for chain ${chainId}`);
            return;
          }

          // Create public client with first RPC
          // Use the chain data we already have and map it to viem's chain format
          const viemChain = {
            id: chainId,
            name: chain.name,
            network: chain.network || chain.name.toLowerCase().replace(/\s+/g, '-'),
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: {
              default: {
                http: rpcUrls,
              },
              public: {
                http: rpcUrls,
              },
            },
            blockExplorers: chain.blockExplorers || {
              default: {
                name: 'Explorer',
                url: `https://explorer.chain${chainId}.com`,
              },
            },
            testnet: chain.testnet || false,
          } as any;

          const publicClient = createPublicClient({
            chain: viemChain,
            transport: http(rpcUrls[0], {
              fetchOptions: {
                timeout: 30000, // 30 second timeout
              },
            }),
          });

          // Execute multicall - ALL tokens in ONE RPC call!
          console.log(`[Multicall Balance Hook] Fetching ${tokens.length} token balances for chain ${chainId} (${chain.name})`);
          const results = await executeMulticall(publicClient, tokens, address as Address);
          console.log(`[Multicall Balance Hook] Chain ${chainId} results:`, results.length, 'tokens processed');

          // Process results
          let successfulCount = 0;
          let nonZeroCount = 0;
          results.forEach(({ token, balance, success }) => {
            if (!success) {
              console.warn(`[Multicall Balance Hook] Failed to fetch balance for ${token.symbol} on ${chain.name}`);
              return;
            }

            successfulCount++;

            // Only include non-zero balances if onlyNonZero is true
            if (onlyNonZero && balance === 0n) return;

            nonZeroCount++;
            const formatted = formatUnits(balance, token.decimals);
            allResults.push({
              chain,
              token,
              balance: balance.toString(),
              balanceFormatted: formatted,
            });
          });
          console.log(`[Multicall Balance Hook] Chain ${chainId}: ${successfulCount} successful, ${nonZeroCount} non-zero balances`);
        } catch (error) {
          console.error(`[Multicall Balance Hook] Error fetching balances for chain ${chainId}:`, error);
          // Continue with other chains even if one fails
        }
      });

      // Wait for all chains to complete
      const settledResults = await Promise.allSettled(chainPromises);
      console.log('[Multicall Balance Hook] All chains completed. Results:', allResults.length, 'balances found');
      console.log('[Multicall Balance Hook] Settled results:', settledResults.map((r, i) => ({
        index: i,
        status: r.status,
        reason: r.status === 'rejected' ? r.reason : undefined
      })));
      
      setBalances(allResults);
      setHasInitiallyLoaded(true);
    } catch (error) {
      console.error('[Multicall Balance Hook] Error fetching balances:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address, erc20Tokens, chains, onlyNonZero]);

  // Initial fetch
  useEffect(() => {
    if (address && !isLoadingExternalTokens) {
      console.log('[Multicall Balance Hook] Starting balance fetch for address:', address);
      console.log('[Multicall Balance Hook] ERC20 tokens count:', erc20Tokens.length);
      console.log('[Multicall Balance Hook] Chains:', chains.map(c => c.name));
      fetchBalances();
    } else {
      console.log('[Multicall Balance Hook] Skipping fetch - address:', address, 'isLoadingExternalTokens:', isLoadingExternalTokens);
    }
  }, [address, fetchBalances, isLoadingExternalTokens, erc20Tokens.length, chains.length]);

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

  // Fetch native balances for main chains (using wagmi's useBalance)
  const mainnetMainChainIds = [8453, 1, 137, 10, 42161];
  const mainnetChainsToCheck = mainnetChains.filter(chain => mainnetMainChainIds.includes(chain.id)).slice(0, 5);
  
  const mainnetNativeBalance1 = useBalance({ 
    address, 
    chainId: mainnetChainsToCheck[0]?.id, 
    query: { enabled: !!address && !!mainnetChainsToCheck[0], refetchOnWindowFocus: false } 
  });
  const mainnetNativeBalance2 = useBalance({ 
    address, 
    chainId: mainnetChainsToCheck[1]?.id, 
    query: { enabled: !!address && !!mainnetChainsToCheck[1], refetchOnWindowFocus: false } 
  });
  const mainnetNativeBalance3 = useBalance({ 
    address, 
    chainId: mainnetChainsToCheck[2]?.id, 
    query: { enabled: !!address && !!mainnetChainsToCheck[2], refetchOnWindowFocus: false } 
  });
  const mainnetNativeBalance4 = useBalance({ 
    address, 
    chainId: mainnetChainsToCheck[3]?.id, 
    query: { enabled: !!address && !!mainnetChainsToCheck[3], refetchOnWindowFocus: false } 
  });
  const mainnetNativeBalance5 = useBalance({ 
    address, 
    chainId: mainnetChainsToCheck[4]?.id, 
    query: { enabled: !!address && !!mainnetChainsToCheck[4], refetchOnWindowFocus: false } 
  });

  const testnetMainChainIds = [84532, 11155111, 80002, 11155420, 421614];
  const testnetChainsToCheck = testnetChains.filter(chain => testnetMainChainIds.includes(chain.id)).slice(0, 5);
  
  const testnetNativeBalance1 = useBalance({ 
    address, 
    chainId: testnetChainsToCheck[0]?.id, 
    query: { enabled: !!address && !!testnetChainsToCheck[0] && includeTestnets, refetchOnWindowFocus: false } 
  });
  const testnetNativeBalance2 = useBalance({ 
    address, 
    chainId: testnetChainsToCheck[1]?.id, 
    query: { enabled: !!address && !!testnetChainsToCheck[1] && includeTestnets, refetchOnWindowFocus: false } 
  });
  const testnetNativeBalance3 = useBalance({ 
    address, 
    chainId: testnetChainsToCheck[2]?.id, 
    query: { enabled: !!address && !!testnetChainsToCheck[2] && includeTestnets, refetchOnWindowFocus: false } 
  });
  const testnetNativeBalance4 = useBalance({ 
    address, 
    chainId: testnetChainsToCheck[3]?.id, 
    query: { enabled: !!address && !!testnetChainsToCheck[3] && includeTestnets, refetchOnWindowFocus: false } 
  });
  const testnetNativeBalance5 = useBalance({ 
    address, 
    chainId: testnetChainsToCheck[4]?.id, 
    query: { enabled: !!address && !!testnetChainsToCheck[4] && includeTestnets, refetchOnWindowFocus: false } 
  });

  // Combine native balances
  const nativeBalances = useMemo(() => {
    const results: TokenBalance[] = [];
    
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

    [...mainnetNativeBalances, ...testnetNativeBalances].forEach(({ chain, data }) => {
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
  }, [
    mainnetChainsToCheck,
    testnetChainsToCheck,
    mainnetNativeBalance1.data,
    mainnetNativeBalance2.data,
    mainnetNativeBalance3.data,
    mainnetNativeBalance4.data,
    mainnetNativeBalance5.data,
    testnetNativeBalance1.data,
    testnetNativeBalance2.data,
    testnetNativeBalance3.data,
    testnetNativeBalance4.data,
    testnetNativeBalance5.data,
    address,
    includeTestnets,
  ]);

  // Combine ERC20 and native balances
  const allBalances = useMemo(() => {
    return [...filteredBalances, ...nativeBalances];
  }, [filteredBalances, nativeBalances]);

  const isNativeLoading = mainnetNativeBalance1.isLoading || mainnetNativeBalance2.isLoading || 
    mainnetNativeBalance3.isLoading || mainnetNativeBalance4.isLoading || mainnetNativeBalance5.isLoading ||
    (includeTestnets && (testnetNativeBalance1.isLoading || testnetNativeBalance2.isLoading || 
    testnetNativeBalance3.isLoading || testnetNativeBalance4.isLoading || testnetNativeBalance5.isLoading));

  const showLoading = (!hasInitiallyLoaded && (isLoading || isNativeLoading || isLoadingExternalTokens)) || isManuallyRefreshing;

  return {
    balances: allBalances,
    initialBalances: allBalances,
    isLoading: showLoading,
    isEmpty: allBalances.length === 0 && hasInitiallyLoaded,
    refresh,
    hasMore: false,
  };
}

