import { useMemo } from 'react';
import { SquidAPI } from '@/lib/aggregators/squid';
import { useNetworkMode } from '@/contexts/NetworkContext';

/**
 * Hook that returns a Squid API client configured for the current network mode
 * @returns SquidAPI instance configured for mainnet or testnet based on selected chain
 */
export function useSquidAPI() {
  const { isTestnet } = useNetworkMode();

  return useMemo(() => {
    return new SquidAPI(undefined, isTestnet);
  }, [isTestnet]);
}

