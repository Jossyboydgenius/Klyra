import { useMemo } from 'react';
import { useReadContracts, useBalance } from 'wagmi';
import { formatUnits, Address, erc20Abi } from 'viem';
import { getAllChains, getCombinedTokensForChain, getChainById } from '@/lib/chain-data';
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
 */
export function useWalletBalances(address?: `0x${string}`, chainIds?: number[]) {
  // Get all chains or filter by chainIds
  const chains = useMemo(() => {
    const allChains = getAllChains();
    if (!chainIds || chainIds.length === 0) return allChains.slice(0, 5); // Limit to 5 chains for performance
    return allChains.filter(chain => chainIds.includes(chain.id));
  }, [chainIds]);

  // Get all tokens across chains
  const allTokens = useMemo(() => {
    const tokens: Token[] = [];
    chains.forEach(chain => {
      const chainTokens = getCombinedTokensForChain(chain.id);
      tokens.push(...chainTokens);
    });
    return tokens;
  }, [chains]);

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

  // Process ERC20 results
  const balances = useMemo(() => {
    if (!balanceData || !address) return [];
    
    const results: TokenBalance[] = [];
    
    balanceData.forEach((result, index) => {
      const token = erc20Tokens[index];
      const chain = chains.find(c => c.id === token.chainId);
      
      if (!chain || !result.status || !result.result) return;
      
      const rawBalance = result.result as bigint;
      const formatted = formatUnits(rawBalance, token.decimals);
      
      // Only include non-zero balances
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

  return {
    balances,
    isLoading,
    isEmpty: balances.length === 0,
  };
}

