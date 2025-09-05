"use client"
import React from 'react'
import { mainnet, kairos, coreDao, coreTestnet2, baseSepolia, sepolia, base } from '@wagmi/core/chains'
import { WagmiProvider, createConfig, http } from 'wagmi'

export const config = createConfig({
  chains: [mainnet, kairos, coreDao, coreTestnet2, baseSepolia, sepolia, base],
  transports: {
    [kairos.id]: http(),
    [mainnet.id]: http(),
    [coreDao.id]: http(),
    [coreTestnet2.id]: http(),
    [baseSepolia.id]: http(),
    [sepolia.id]: http(),
    [base.id]: http(),
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