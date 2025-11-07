"use client"
import React from 'react'
import { 
  mainnet, 
  kairos, 
  coreDao, 
  coreTestnet2, 
  baseSepolia, 
  sepolia, 
  base,
  polygon,
  polygonAmoy,
  optimism,
  optimismSepolia,
  arbitrum,
  arbitrumSepolia,
  avalanche,
  avalancheFuji
} from '@wagmi/core/chains'
import { WagmiProvider, createConfig, http, fallback } from 'wagmi'
import { RPC_ENDPOINTS } from './rpc-fallback'

// Helper to create fallback transport for a chain
function createChainTransport(chainId: number) {
  const urls = RPC_ENDPOINTS[chainId] || [];
  
  if (urls.length === 0) {
    // No custom RPCs, use default
    return http();
  }
  
  if (urls.length === 1) {
    // Single RPC, use it directly with timeout and batching
    return http(urls[0], {
      batch: {
        wait: 100,
        batchSize: 10,
      },
      retryCount: 1,
    });
  }
  
  // Multiple RPCs, create fallback
  const transports = urls.map((url) => 
    http(url, {
      batch: {
        wait: 100, // Wait 100ms before sending batch
        batchSize: 10, // Batch up to 10 requests together
      },
      retryCount: 0, // Don't retry on same RPC
    })
  );
  
  return fallback(transports, {
    rank: false, // Don't rank by response time - try in order
    retryCount: 0, // Don't retry on same RPC - immediately move to next on error
    retryDelay: 0, // No delay
  });
}

export const config = createConfig({
  chains: [
    mainnet, 
    kairos, 
    coreDao, 
    coreTestnet2, 
    baseSepolia, 
    sepolia, 
    base,
    polygon,
    polygonAmoy,
    optimism,
    optimismSepolia,
    arbitrum,
    arbitrumSepolia,
    avalanche,
    avalancheFuji
  ],
  transports: {
    // Core chains (custom)
    [kairos.id]: http(),
    [coreDao.id]: http(),
    [coreTestnet2.id]: http(),
    
    // Major chains with RPC fallbacks
    [mainnet.id]: createChainTransport(mainnet.id),
    [sepolia.id]: createChainTransport(sepolia.id),
    [base.id]: createChainTransport(base.id),
    [baseSepolia.id]: createChainTransport(baseSepolia.id),
    [polygon.id]: createChainTransport(polygon.id),
    [polygonAmoy.id]: createChainTransport(polygonAmoy.id),
    [optimism.id]: createChainTransport(optimism.id),
    [optimismSepolia.id]: createChainTransport(optimismSepolia.id),
    [arbitrum.id]: createChainTransport(arbitrum.id),
    [arbitrumSepolia.id]: createChainTransport(arbitrumSepolia.id),
    [avalanche.id]: createChainTransport(avalanche.id),
    [avalancheFuji.id]: createChainTransport(avalancheFuji.id),
  },
  ssr: true,
})

const WagProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      {children}
    </WagmiProvider>
  )
}

export default WagProvider