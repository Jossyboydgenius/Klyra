'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAllChains, type Chain } from '@/lib/chain-data';

interface NetworkContextType {
  selectedChain: Chain | null;
  isTestnet: boolean;
  setSelectedChain: (chain: Chain | null) => void;
  setSelectedChainById: (chainId: number) => void;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [isTestnet, setIsTestnet] = useState(false);

  // Update testnet status whenever chain changes
  useEffect(() => {
    if (selectedChain) {
      setIsTestnet(selectedChain.testnet || false);
      console.log(
        `🔄 Network Mode: ${selectedChain.testnet ? 'TESTNET' : 'MAINNET'}`,
        `\n📍 Chain: ${selectedChain.name} (ID: ${selectedChain.id})`
      );
    }
  }, [selectedChain]);

  const setSelectedChainById = (chainId: number) => {
    const chain = getAllChains().find(c => c.id === chainId);
    if (chain) {
      setSelectedChain(chain);
    }
  };

  return (
    <NetworkContext.Provider
      value={{
        selectedChain,
        isTestnet,
        setSelectedChain,
        setSelectedChainById,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}

// Hook to get the current network mode (mainnet/testnet) for API clients
export function useNetworkMode(): { isTestnet: boolean; chainId: number | null } {
  const context = useContext(NetworkContext);
  
  // If context is not available, default to mainnet
  if (context === undefined) {
    return { isTestnet: false, chainId: null };
  }
  
  return {
    isTestnet: context.isTestnet,
    chainId: context.selectedChain?.id || null,
  };
}

