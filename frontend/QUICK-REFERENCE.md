# Network & Token Selector - Quick Reference

## 🚀 Imports

```tsx
import { NetworkSelector, TokenSelector, NetworkTokenSelector } from '@/components';
import { NetworkBadge, TokenBadge } from '@/components';
import type { Chain, Token } from '@/lib/chain-data';
```

## 📝 Basic Pattern

```tsx
const [chainId, setChainId] = useState<number | null>(null);
const [token, setToken] = useState<Token | null>(null);

<NetworkSelector
  value={chainId}
  onChange={(chainId, chain) => setChainId(chainId)}
/>

<TokenSelector
  chainId={chainId}
  value={token?.address}
  onChange={setToken}
/>
```

## 🎯 Common Props

### NetworkSelector
```tsx
value={chainId}                    // number | null
onChange={(id, chain) => ...}      // (number, Chain) => void
includeTestnets={true}             // boolean
filterChainIds={[1, 8453]}         // number[]
placeholder="Select network"       // string
className="custom-class"           // string
disabled={false}                   // boolean
```

### TokenSelector
```tsx
chainId={chainId}                  // number | null (required)
value={token?.address}             // string | null
onChange={(token) => ...}          // (Token) => void
filterTokens={['USDC', 'USDT']}   // string[]
placeholder="Select token"         // string
className="custom-class"           // string
disabled={false}                   // boolean
```

## 🔧 Data Utilities

```tsx
import {
  getAllChains,
  getMainnetChains,
  getTestnetChains,
  getChainById,
  getCombinedTokensForChain,
  searchChains,
  searchTokens
} from '@/lib/chain-data';

// Get chains
const chains = getAllChains();
const mainnets = getMainnetChains();
const testnets = getTestnetChains();
const ethereum = getChainById(1);

// Get tokens
const tokens = getCombinedTokensForChain(8453);
const baseUSDC = tokens.find(t => t.symbol === 'USDC');

// Search
const results = searchChains('base', true);
const tokenResults = searchTokens(1, 'usdc');
```

## 🎨 Filtering Examples

```tsx
// Only major L2s
<NetworkSelector filterChainIds={[10, 8453, 42161, 137]} />

// Only stablecoins
<TokenSelector filterTokens={['USDC', 'USDT', 'DAI']} />

// Mainnets only
<NetworkSelector includeTestnets={false} />
```

## 🔄 Reset Token on Network Change

```tsx
const handleNetworkChange = (chainId: number, chain: Chain) => {
  setChainId(chainId);
  setToken(null); // Important!
};
```

## 📊 Access Token/Chain Data

```tsx
// Selected chain info
const chain = getChainById(chainId);
console.log(chain?.name, chain?.testnet);

// Selected token info
console.log(token?.symbol, token?.address, token?.decimals);
```

## 🎯 Popular Chain IDs

```tsx
1       // Ethereum
8453    // Base
137     // Polygon
42161   // Arbitrum
10      // Optimism
43114   // Avalanche

// Testnets
11155111  // Ethereum Sepolia
84532     // Base Sepolia
80002     // Polygon Amoy
421614    // Arbitrum Sepolia
11155420  // OP Sepolia
43113     // Avalanche Fuji
```

## ✅ Validation Pattern

```tsx
const isValid = () => {
  if (!chainId) {
    setError('Select a network');
    return false;
  }
  if (!token) {
    setError('Select a token');
    return false;
  }
  return true;
};
```

## 🎪 Display Components

```tsx
// Show selected network
<NetworkBadge chainId={chainId} />

// Show selected token
<TokenBadge token={token} showAddress={true} />
```

## 📖 Full Documentation

- `README-SELECTORS.md` - Complete API docs
- `NETWORK-TOKEN-SELECTOR-GUIDE.md` - Implementation guide
- `NetworkTokenExample.tsx` - Live examples
- `BuyCrypto.tsx` - Real usage

