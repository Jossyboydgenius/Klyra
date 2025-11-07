import { useMemo } from 'react';
import { useReadContracts, useBalance } from 'wagmi';
import { formatUnits, Address, erc20Abi } from 'viem';
import type { Token, Chain } from '@/lib/chain-data';

/**
 * Hook to fetch balances for a list of tokens on a specific chain
 * Returns balances for ALL tokens (including zero balances)
 * Used for TokenSelector to show user's balance for each token
 */
export function useTokenBalances(
  address: `0x${string}` | undefined,
  chainId: number | null,
  tokens: Token[]
) {
  const nativeToken = useMemo(() => {
    return tokens.find(t => t.address === '0x0000000000000000000000000000000000000000');
  }, [tokens]);

  // Fetch native token balance
  const { data: nativeBalance, isLoading: isNativeLoading } = useBalance({
    address,
    chainId: chainId || undefined,
    query: {
      enabled: !!address && !!chainId && !!nativeToken,
      staleTime: 30000,
      retry: 1,
    },
  });

  // Filter ERC20 tokens (exclude native)
  const erc20Tokens = useMemo(() => {
    return tokens.filter(t => t.address !== '0x0000000000000000000000000000000000000000');
  }, [tokens]);

  // Fetch ERC20 token balances
  const contracts = useMemo(() => {
    if (!address || !chainId || erc20Tokens.length === 0) return [];
    
    return erc20Tokens.map(token => ({
      address: token.address as Address,
      abi: erc20Abi,
      functionName: 'balanceOf' as const,
      args: [address],
      chainId,
    }));
  }, [address, chainId, erc20Tokens]);

  const { data: erc20Balances, isLoading: isERC20Loading } = useReadContracts({
    contracts,
    query: {
      enabled: !!address && !!chainId && erc20Tokens.length > 0,
      staleTime: 30000,
      retry: 1,
    },
  });

  // Combine all balances
  const balances = useMemo(() => {
    const result: Map<string, string> = new Map();

    // Add native token balance
    if (nativeToken && nativeBalance) {
      const formatted = formatUnits(nativeBalance.value, nativeToken.decimals);
      result.set(nativeToken.address.toLowerCase(), formatted);
    }

    // Add ERC20 token balances
    if (erc20Balances && erc20Tokens.length > 0) {
      erc20Balances.forEach((balance, index) => {
        if (balance.status === 'success' && balance.result) {
          const token = erc20Tokens[index];
          const formatted = formatUnits(balance.result as bigint, token.decimals);
          result.set(token.address.toLowerCase(), formatted);
        }
      });
    }

    return result;
  }, [nativeToken, nativeBalance, erc20Balances, erc20Tokens]);

  const isLoading = isNativeLoading || isERC20Loading;

  return {
    balances,
    isLoading,
    getBalance: (tokenAddress: string) => {
      return balances.get(tokenAddress.toLowerCase()) || '0';
    },
  };
}

