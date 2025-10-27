# Network and Token Selector Components

Comprehensive, customizable blockchain network and token selector components for your Web3 application.

## Components Overview

### 1. NetworkSelector
A dropdown component for selecting blockchain networks from the wagmi chains library.

### 2. TokenSelector
A dropdown component for selecting tokens based on the selected blockchain network.

### 3. NetworkTokenSelector
A combined component that integrates both network and token selection.

## Features

✨ **Dynamic Chain Loading** - Automatically loads all chains from wagmi  
🔄 **Mainnet & Testnet Support** - Toggle between mainnet and testnet networks  
🔍 **Smart Search** - Search networks and tokens by name, symbol, or address  
📋 **Multiple Token Sources** - Combines tokens from:
  - Uniswap token list (chains.token.json)
  - Superbridge token list (tokens-list.json)
  - Custom testnet USDC addresses
  - Native tokens (ETH, MATIC, etc.)
  
🎨 **Customizable Styling** - Accept className prop for custom styling  
♿ **Accessible** - Built with Radix UI primitives  
🚀 **Performance Optimized** - Smart memoization and filtering

## Installation

The components are already installed with your project dependencies:
- `wagmi` - For chain definitions
- `@radix-ui/*` - For accessible UI components
- `lucide-react` - For icons

## Quick Start

```tsx
import { NetworkSelector, TokenSelector } from '@/components';
import type { Chain, Token } from '@/lib/chain-data';
import { useState } from 'react';

function MyComponent() {
  const [chainId, setChainId] = useState<number | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);

  return (
    <>
      <NetworkSelector
        value={chainId}
        onChange={(chainId, chain) => setChainId(chainId)}
        includeTestnets={true}
      />
      
      <TokenSelector
        chainId={chainId}
        value={selectedToken?.address}
        onChange={(token) => setSelectedToken(token)}
      />
    </>
  );
}
```

## NetworkSelector API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number \| null` | `null` | Selected chain ID |
| `onChange` | `(chainId: number, chain: Chain) => void` | **required** | Callback when network is selected |
| `className` | `string` | `''` | Custom CSS classes |
| `placeholder` | `string` | `'Select network'` | Placeholder text |
| `includeTestnets` | `boolean` | `true` | Show testnet networks |
| `disabled` | `boolean` | `false` | Disable the selector |
| `filterChainIds` | `number[]` | `undefined` | Only show specific chain IDs |

### Example

```tsx
<NetworkSelector
  value={chainId}
  onChange={(chainId, chain) => {
    console.log('Selected chain:', chain.name);
    setChainId(chainId);
  }}
  includeTestnets={true}
  placeholder="Choose blockchain"
  filterChainIds={[1, 8453, 137]} // Only Ethereum, Base, Polygon
  className="custom-selector"
/>
```

## TokenSelector API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `chainId` | `number \| null` | **required** | Chain ID to fetch tokens for |
| `value` | `string \| null` | `null` | Selected token address or symbol |
| `onChange` | `(token: Token) => void` | **required** | Callback when token is selected |
| `className` | `string` | `''` | Custom CSS classes |
| `placeholder` | `string` | `'Select token'` | Placeholder text |
| `disabled` | `boolean` | `false` | Disable the selector |
| `filterTokens` | `string[]` | `undefined` | Only show specific token symbols |

### Example

```tsx
<TokenSelector
  chainId={chainId}
  value={selectedToken?.address}
  onChange={(token) => {
    console.log('Selected token:', token.symbol);
    setSelectedToken(token);
  }}
  placeholder="Choose token"
  filterTokens={['USDC', 'USDT', 'DAI']} // Only show stablecoins
  className="custom-selector"
/>
```

## NetworkTokenSelector API

Combined component that manages both network and token selection.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectedChainId` | `number \| null` | **required** | Selected chain ID |
| `selectedToken` | `Token \| null` | **required** | Selected token |
| `onChainChange` | `(chainId: number) => void` | **required** | Chain change callback |
| `onTokenChange` | `(token: Token) => void` | **required** | Token change callback |
| `className` | `string` | `''` | Custom CSS classes |
| `includeTestnets` | `boolean` | `true` | Show testnet networks |

### Example

```tsx
<NetworkTokenSelector
  selectedChainId={chainId}
  selectedToken={selectedToken}
  onChainChange={(chainId) => {
    setChainId(chainId);
    setSelectedToken(null); // Reset token on network change
  }}
  onTokenChange={setSelectedToken}
  includeTestnets={true}
/>
```

## Helper Components

### NetworkBadge

Display-only component for showing network information.

```tsx
import { NetworkBadge } from '@/components/NetworkSelector';

<NetworkBadge chainId={1} className="my-custom-class" />
```

### TokenBadge

Display-only component for showing token information.

```tsx
import { TokenBadge } from '@/components/TokenSelector';

<TokenBadge 
  token={selectedToken} 
  showAddress={true}
  className="my-custom-class"
/>
```

## Data Utilities

The `chain-data.ts` module provides utility functions for working with chains and tokens:

### Chain Functions

```tsx
import {
  getAllChains,
  getMainnetChains,
  getTestnetChains,
  getChainById,
  searchChains
} from '@/lib/chain-data';

// Get all available chains
const allChains = getAllChains();

// Get only mainnet chains
const mainnets = getMainnetChains();

// Get only testnet chains
const testnets = getTestnetChains();

// Get specific chain by ID
const ethereum = getChainById(1);

// Search chains
const results = searchChains('base', true); // includeTestnets
```

### Token Functions

```tsx
import {
  getAllTokens,
  getTokensByChainId,
  getCombinedTokensForChain,
  getTestnetUSDC,
  getMainnetStablecoins,
  searchTokens
} from '@/lib/chain-data';

// Get all tokens from Uniswap list
const allTokens = getAllTokens();

// Get tokens for a specific chain
const ethereumTokens = getTokensByChainId(1);

// Get combined tokens (all sources) for a chain
const combinedTokens = getCombinedTokensForChain(8453); // Base

// Get testnet USDC
const testnetUSDC = getTestnetUSDC(84532); // Base Sepolia

// Get mainnet stablecoins
const stablecoins = getMainnetStablecoins(1); // Ethereum

// Search tokens
const results = searchTokens(1, 'usdc'); // chain ID, query
```

## TypeScript Types

```tsx
interface Chain {
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

interface Token {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
  extensions?: any;
}
```

## Advanced Usage

### Filtering Specific Networks

```tsx
// Only show L2 networks
const L2_CHAIN_IDS = [10, 8453, 42161, 137]; // OP, Base, Arbitrum, Polygon

<NetworkSelector
  value={chainId}
  onChange={handleChange}
  filterChainIds={L2_CHAIN_IDS}
/>
```

### Custom Styling

```tsx
// Using Tailwind classes
<NetworkSelector
  value={chainId}
  onChange={handleChange}
  className="border-2 border-blue-500 hover:border-blue-600 focus:ring-blue-500"
/>

<TokenSelector
  chainId={chainId}
  value={token?.address}
  onChange={handleTokenChange}
  className="bg-gradient-to-r from-purple-500 to-pink-500"
/>
```

### Stablecoins Only

```tsx
<TokenSelector
  chainId={chainId}
  value={token?.address}
  onChange={handleChange}
  filterTokens={['USDC', 'USDT', 'DAI', 'USDC.e']}
  placeholder="Select stablecoin"
/>
```

### Handling Network Changes

```tsx
function MyForm() {
  const [chainId, setChainId] = useState<number | null>(null);
  const [token, setToken] = useState<Token | null>(null);
  
  const handleNetworkChange = (newChainId: number, chain: Chain) => {
    setChainId(newChainId);
    
    // Reset token when network changes
    setToken(null);
    
    // Optional: Show notification
    toast(`Switched to ${chain.name}`);
    
    // Optional: Update connected wallet
    if (chain.testnet) {
      console.log('⚠️ Testnet selected');
    }
  };
  
  return (
    <NetworkSelector
      value={chainId}
      onChange={handleNetworkChange}
    />
  );
}
```

## Token Data Sources

The TokenSelector automatically combines tokens from multiple sources:

1. **Uniswap Token List** (`chains.token.json`)
   - 20,000+ mainnet tokens
   - Cross-chain token data
   - Bridge information

2. **Superbridge Token List** (`tokens-list.json`)
   - L2 optimized tokens
   - Superchain tokens

3. **Custom Testnet USDC** (`usdc-testnmet.txt`)
   - Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
   - Ethereum Sepolia: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
   - Polygon Amoy: `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582`
   - And more...

4. **Mainnet Stablecoins**
   - USDC, USDT, DAI
   - Pre-configured for major networks

5. **Native Tokens**
   - ETH, MATIC, BNB, AVAX, etc.
   - Automatically included

## Supported Networks

### Mainnets
- Ethereum (1)
- Polygon (137)
- Base (8453)
- Arbitrum (42161)
- Optimism (10)
- Avalanche (43114)
- BNB Smart Chain (56)
- And 100+ more from wagmi

### Testnets
- Base Sepolia (84532)
- Ethereum Sepolia (11155111)
- Polygon Amoy (80002)
- Arbitrum Sepolia (421614)
- OP Sepolia (11155420)
- Avalanche Fuji (43113)
- And many more...

## Performance Tips

1. **Memoize callbacks** to prevent unnecessary re-renders:
```tsx
const handleNetworkChange = useCallback((chainId: number, chain: Chain) => {
  setChainId(chainId);
}, []);
```

2. **Filter chains** if you don't need all networks:
```tsx
<NetworkSelector filterChainIds={[1, 8453, 137]} />
```

3. **Filter tokens** to reduce search space:
```tsx
<TokenSelector filterTokens={['USDC', 'USDT']} />
```

## Troubleshooting

### Issue: No tokens showing
**Solution**: Make sure you've selected a network first. TokenSelector is disabled until a valid `chainId` is provided.

### Issue: Custom tokens not appearing
**Solution**: Add your custom tokens to the appropriate JSON file or use the data utilities to add them programmatically.

### Issue: Styling not applied
**Solution**: Make sure your Tailwind config includes the component paths:
```js
// tailwind.config.js
content: [
  './components/**/*.{ts,tsx}',
  './app/**/*.{ts,tsx}',
]
```

## Example: Complete Buy Crypto Form

See `frontend/components/BuyCrypto.tsx` for a complete implementation showing:
- Country selection
- Network selection with testnet support
- Token selection with dynamic filtering
- Amount input with token context
- Wallet address validation
- Summary display

## Contributing

To add new token sources:
1. Add your token list JSON to `frontend/`
2. Update `getCombinedTokensForChain()` in `chain-data.ts`
3. Ensure tokens follow the `Token` interface

## License

MIT - See the main project LICENSE file.

