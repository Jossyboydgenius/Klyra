import { useMemo } from 'react';
import { AcrossAPI } from '@/lib/aggregators/across';
import { useNetworkMode } from '@/contexts/NetworkContext';

/**
 * Hook that returns an Across API client configured for the current network mode
 * @returns AcrossAPI instance configured for mainnet or testnet based on selected chain
 */
export function useAcrossAPI() {
  const { isTestnet } = useNetworkMode();

  return useMemo(() => {
    return new AcrossAPI(undefined, isTestnet);
  }, [isTestnet]);
}

