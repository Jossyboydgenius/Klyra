import { useMemo } from 'react';
import { RouteAggregator } from '@/lib/route-aggregator';
import { useSquidAPI } from './useSquidAPI';
import { useAcrossAPI } from './useAcrossAPI';

export function useRouteAggregator() {
  const squidAPI = useSquidAPI();
  const acrossAPI = useAcrossAPI();

  const aggregator = useMemo(() => {
    return new RouteAggregator({ squidAPI, acrossAPI });
  }, [squidAPI, acrossAPI]);

  return aggregator;
}


