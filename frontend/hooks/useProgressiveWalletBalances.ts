import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

interface BalanceCache {
  balances: TokenBalance[];
  timestamp: number;
  chainIndex: number;
}

const CACHE_DURATION = 20000; // 20 seconds
const MAX_INITIAL_DISPLAY = 10; // Show first 10 tokens initially
const TOKENS_PER_CHAIN_BATCH = 20; // Fetch 20 tokens per chain at a time

/**
 * Optimized hook for progressive balance fetching
 * Fetches balances chain by chain, returning results as they're found
 * Includes caching and auto-refresh
 */
export function useProgressiveWalletBalances(
  address?: `0x${string}`,
  chainIds?: number[],
  includeTestnets: boolean = false,
  options?: {
    autoRefresh?: boolean; // Auto-refresh every 20 seconds
    refreshInterval?: number; // Refresh interval in ms (default 20000)
    maxInitialDisplay?: number; // Max tokens to show initially (default 10)
    onlyNonZero?: boolean; // Only return non-zero balances (default true for display)
  }
) {
  const {
    autoRefresh = true,
    refreshInterval = CACHE_DURATION,
    maxInitialDisplay = MAX_INITIAL_DISPLAY,
    onlyNonZero = true, // For dashboard/wallet view, only show non-zero
  } = options || {};

  // Cache for balances
  const cacheRef = useRef<BalanceCache | null>(null);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentChainIndex, setCurrentChainIndex] = useState(0);
  const [fetchedChains, setFetchedChains] = useState<Set<number>>(new Set());

  // Get chains
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

  const allChains = useMemo(() => {
    return includeTestnets ? [...mainnetChains, ...testnetChains] : mainnetChains;
  }, [mainnetChains, testnetChains, includeTestnets]);

  // State for external tokens
  const [squidTokensMap, setSquidTokensMap] = useState<Map<number, Token[]>>(new Map());
  const [acrossTokensMap, setAcrossTokensMap] = useState<Map<number, Token[]>>(new Map());

  // Fetch external tokens for testnets (background)
  useEffect(() => {
    if (!includeTestnets || testnetChains.length === 0) {
      setSquidTokensMap(new Map());
      setAcrossTokensMap(new Map());
      return;
    }

    testnetChains.forEach(chain => {
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
        })
        .catch(() => {}); // Silently fail

      getAcrossTokensForChain(chain.id, true)
        .then(tokens => {
          setAcrossTokensMap(prev => new Map(prev).set(chain.id, tokens));
        })
        .catch(() => {}); // Silently fail
    });
  }, [testnetChains, includeTestnets]);

  // Get tokens for a specific chain
  const getTokensForChain = useCallback((chain: Chain): Token[] => {
    const tokens: Token[] = [];
    const tokensMap = new Map<string, Token>();

    // Base tokens
    const chainTokens = getCombinedTokensForChain(chain.id);
    chainTokens.forEach(token => {
      const key = `${token.address.toLowerCase()}-${token.symbol}`;
      if (!tokensMap.has(key)) {
        tokensMap.set(key, token);
      }
    });

    // External tokens for testnets
    if (chain.testnet) {
      const squidTokens = squidTokensMap.get(chain.id) || [];
      squidTokens.forEach(token => {
        const key = `${token.address.toLowerCase()}-${token.symbol}`;
        if (!tokensMap.has(key)) {
          tokensMap.set(key, token);
        }
      });

      const acrossTokens = acrossTokensMap.get(chain.id) || [];
      acrossTokens.forEach(token => {
        const key = `${token.address.toLowerCase()}-${token.symbol}`;
        if (!tokensMap.has(key)) {
          tokensMap.set(key, token);
        }
      });
    }

    return Array.from(tokensMap.values());
  }, [squidTokensMap, acrossTokensMap]);

  // Progressive balance fetching function
  const fetchBalancesForChain = useCallback(async (chain: Chain): Promise<TokenBalance[]> => {
    if (!address) return [];

    const chainBalances: TokenBalance[] = [];
    const tokens = getTokensForChain(chain);

    // Fetch native token balance first
    try {
      // Use a simple fetch for native balance (we'll use wagmi hooks in batches)
      // For now, we'll rely on the hook-based approach below
    } catch (error) {
      console.warn(`Error fetching native balance for ${chain.name}:`, error);
    }

    // Batch ERC20 tokens (limit to avoid rate limits)
    const erc20Tokens = tokens
      .filter(t => t.address !== '0x0000000000000000000000000000000000000000')
      .slice(0, TOKENS_PER_CHAIN_BATCH);

    // Return tokens for wagmi hook processing
    return chainBalances;
  }, [address, getTokensForChain]);

  // Manual refresh function
  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setBalances([]);
    setFetchedChains(new Set());
    setCurrentChainIndex(0);
    cacheRef.current = null;
    setIsLoading(true);
  }, []);

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh || !address) return;

    const interval = setInterval(() => {
      if (!isRefreshing && !isLoading) {
        refresh();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, address, isRefreshing, isLoading, refresh]);

  // Progressive fetching using wagmi hooks
  // We'll process chains one by one using the current chain index
  const currentChain = allChains[currentChainIndex];
  const currentChainTokens = currentChain ? getTokensForChain(currentChain) : [];
  const erc20TokensForCurrentChain = currentChainTokens
    .filter(t => t.address !== '0x0000000000000000000000000000000000000000')
    .slice(0, TOKENS_PER_CHAIN_BATCH);

  // Build contracts for current chain
  const contracts = useMemo(() => {
    if (!address || !currentChain || erc20TokensForCurrentChain.length === 0) return [];
    
    return erc20TokensForCurrentChain.map(token => ({
      address: token.address as Address,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [address],
      chainId: currentChain.id,
    }));
  }, [address, currentChain, erc20TokensForCurrentChain]);

  // Fetch ERC20 balances for current chain
  const { data: erc20BalanceData } = useReadContracts({
    contracts,
    query: {
      enabled: !!address && !!currentChain && !fetchedChains.has(currentChain.id),
      staleTime: 30000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  });

  // Fetch native balance for current chain
  const { data: nativeBalanceData } = useBalance({
    address,
    chainId: currentChain?.id,
    query: {
      enabled: !!address && !!currentChain && !fetchedChains.has(currentChain.id),
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  });

  // Process results when data is available
  useEffect(() => {
    if (!currentChain) {
      if (currentChainIndex >= allChains.length) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
      return;
    }

    if (fetchedChains.has(currentChain.id)) {
      // Already fetched this chain, move to next
      if (currentChainIndex < allChains.length - 1) {
        setCurrentChainIndex(prev => prev + 1);
      } else {
        setIsLoading(false);
        setIsRefreshing(false);
      }
      return;
    }

    // Wait for data to be available
    const hasErc20Data = erc20BalanceData !== undefined;
    const hasNativeData = nativeBalanceData !== undefined;
    
    // If we have contracts to check, wait for ERC20 data
    if (contracts.length > 0 && !hasErc20Data) return;
    // Always wait for native balance (it's fast)
    if (!hasNativeData) return;

    const chainBalances: TokenBalance[] = [];

    // Process native balance
    if (nativeBalanceData) {
      const formatted = formatUnits(nativeBalanceData.value, currentChain.nativeCurrency.decimals);
      if (!onlyNonZero || parseFloat(formatted) > 0) {
        chainBalances.push({
          chain: currentChain,
          token: {
            chainId: currentChain.id,
            address: '0x0000000000000000000000000000000000000000',
            name: currentChain.nativeCurrency.name,
            symbol: currentChain.nativeCurrency.symbol,
            decimals: currentChain.nativeCurrency.decimals,
          },
          balance: nativeBalanceData.value.toString(),
          balanceFormatted: formatted,
        });
      }
    }

    // Process ERC20 balances
    if (erc20BalanceData && erc20BalanceData.length > 0) {
      erc20BalanceData.forEach((result, index) => {
        const token = erc20TokensForCurrentChain[index];
        if (!token) return;

        if (result.status === 'success' && result.result) {
          const rawBalance = result.result as bigint;
          const formatted = formatUnits(rawBalance, token.decimals);
          
          if (!onlyNonZero || parseFloat(formatted) > 0) {
            chainBalances.push({
              chain: currentChain,
              token,
              balance: rawBalance.toString(),
              balanceFormatted: formatted,
            });
          }
        }
      });
    }

    // Mark chain as fetched and update balances
    setFetchedChains(prev => {
      const updated = new Set(prev);
      updated.add(currentChain.id);
      return updated;
    });

    if (chainBalances.length > 0) {
      setBalances(prev => {
        const updated = [...prev, ...chainBalances];
        // Update cache
        cacheRef.current = {
          balances: updated,
          timestamp: Date.now(),
          chainIndex: currentChainIndex,
        };
        return updated;
      });
    }
    
    // Move to next chain or finish
    if (currentChainIndex < allChains.length - 1) {
      // Small delay to avoid rate limits
      setTimeout(() => {
        setCurrentChainIndex(prev => prev + 1);
      }, 100);
    } else {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentChain, erc20BalanceData, nativeBalanceData, fetchedChains, currentChainIndex, allChains.length, onlyNonZero, erc20TokensForCurrentChain, contracts.length]);

  // Initialize or reset when dependencies change
  useEffect(() => {
    if (!address) {
      setBalances([]);
      setIsLoading(false);
      return;
    }

    // Check cache
    if (cacheRef.current && Date.now() - cacheRef.current.timestamp < CACHE_DURATION) {
      setBalances(cacheRef.current.balances);
      setIsLoading(false);
      return;
    }

    // Reset and start fetching
    setBalances([]);
    setFetchedChains(new Set());
    setCurrentChainIndex(0);
    setIsLoading(true);
    setIsRefreshing(false);
  }, [address, includeTestnets, chainIds]);

  // Get initial display balances (limited)
  const initialBalances = useMemo(() => {
    return balances.slice(0, maxInitialDisplay);
  }, [balances, maxInitialDisplay]);

  // Check if there are more balances to show
  const hasMore = balances.length > maxInitialDisplay;

  return {
    balances: onlyNonZero ? balances.filter(b => parseFloat(b.balanceFormatted) > 0) : balances,
    initialBalances: onlyNonZero ? initialBalances.filter(b => parseFloat(b.balanceFormatted) > 0) : initialBalances,
    isLoading,
    isRefreshing,
    isEmpty: balances.length === 0,
    hasMore,
    refresh,
    currentChain: currentChain?.name,
    progress: allChains.length > 0 ? ((fetchedChains.size / allChains.length) * 100).toFixed(0) : '0',
  };
}

