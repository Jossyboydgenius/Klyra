import { useMemo } from 'react';
import { useReadContracts, useBalance } from 'wagmi';
import { formatUnits, Address, erc20Abi } from 'viem';
import { getAllChains, getCombinedTokensForChain, getMainnetChains, getTestnetChains } from '@/lib/chain-data';
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
export function useWalletBalances(address?: `0x${string}`, chainIds?: number[], includeTestnets: boolean = false) {
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

  // Get tokens separately for mainnet and testnet to prevent refresh
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
    testnetChains.forEach(chain => {
      const chainTokens = getCombinedTokensForChain(chain.id);
      tokens.push(...chainTokens);
    });
    return tokens;
  }, [testnetChains, includeTestnets]);

  // Combine tokens only when needed
  const allTokens = useMemo(() => {
    if (includeTestnets) {
      return [...mainnetTokens, ...testnetTokens];
    }
    return mainnetTokens;
  }, [mainnetTokens, testnetTokens, includeTestnets]);

  // Filter out native tokens (we'll handle separately with useBalance)
  const erc20Tokens = useMemo(() => {
    return allTokens.filter(token => token.address !== '0x0000000000000000000000000000000000000000');
  }, [allTokens]);

  // Build contract reads for ERC20 tokens only
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

  // Read all balances
  const { data: balanceData, isLoading } = useReadContracts({
    contracts,
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
  
  // Fetch native balances for mainnet chains (always enabled)
  const mainnetNativeBalance1 = useBalance({ address, chainId: mainnetChainsToCheck[0]?.id, query: { enabled: !!address && !!mainnetChainsToCheck[0] } });
  const mainnetNativeBalance2 = useBalance({ address, chainId: mainnetChainsToCheck[1]?.id, query: { enabled: !!address && !!mainnetChainsToCheck[1] } });
  const mainnetNativeBalance3 = useBalance({ address, chainId: mainnetChainsToCheck[2]?.id, query: { enabled: !!address && !!mainnetChainsToCheck[2] } });
  const mainnetNativeBalance4 = useBalance({ address, chainId: mainnetChainsToCheck[3]?.id, query: { enabled: !!address && !!mainnetChainsToCheck[3] } });
  const mainnetNativeBalance5 = useBalance({ address, chainId: mainnetChainsToCheck[4]?.id, query: { enabled: !!address && !!mainnetChainsToCheck[4] } });
  
  // Fetch native balances for testnet chains (only when includeTestnets is true)
  const testnetMainChainIds = [84532, 11155111, 80002, 11155420, 421614]; // Base Sepolia, Sepolia, Polygon Amoy, OP Sepolia, Arbitrum Sepolia
  const testnetChainsToCheck = testnetChains.filter(chain => testnetMainChainIds.includes(chain.id)).slice(0, 5);
  
  const testnetNativeBalance1 = useBalance({ address, chainId: testnetChainsToCheck[0]?.id, query: { enabled: !!address && !!testnetChainsToCheck[0] && includeTestnets } });
  const testnetNativeBalance2 = useBalance({ address, chainId: testnetChainsToCheck[1]?.id, query: { enabled: !!address && !!testnetChainsToCheck[1] && includeTestnets } });
  const testnetNativeBalance3 = useBalance({ address, chainId: testnetChainsToCheck[2]?.id, query: { enabled: !!address && !!testnetChainsToCheck[2] && includeTestnets } });
  const testnetNativeBalance4 = useBalance({ address, chainId: testnetChainsToCheck[3]?.id, query: { enabled: !!address && !!testnetChainsToCheck[3] && includeTestnets } });
  const testnetNativeBalance5 = useBalance({ address, chainId: testnetChainsToCheck[4]?.id, query: { enabled: !!address && !!testnetChainsToCheck[4] && includeTestnets } });
  
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

  // Combine ERC20 and native balances
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

  return {
    balances: allBalances,
    isLoading: isLoading || isNativeLoading,
    isEmpty: allBalances.length === 0,
  };
}

