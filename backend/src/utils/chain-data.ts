export interface Chain {
  id: number;
  name: string;
  network?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls?: {
    default: {
      http: string[];
    };
  };
  blockExplorers?: {
    default: {
      name: string;
      url: string;
    };
  };
  testnet?: boolean;
}

export interface Token {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  extensions?: any;
}

export function getChainById(chainId: number): Chain | undefined {
  const chains: Chain[] = [
    {
      id: 1,
      name: 'Ethereum',
      network: 'mainnet',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      testnet: false,
    },
    {
      id: 8453,
      name: 'Base',
      network: 'base',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      testnet: false,
    },
    {
      id: 137,
      name: 'Polygon',
      network: 'polygon',
      nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
      testnet: false,
    },
    {
      id: 10,
      name: 'Optimism',
      network: 'optimism',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      testnet: false,
    },
  ];

  return chains.find(c => c.id === chainId);
}

