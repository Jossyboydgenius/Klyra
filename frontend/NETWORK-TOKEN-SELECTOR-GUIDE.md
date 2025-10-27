# Network & Token Selector Implementation Guide

## 🎉 What Was Built

Two powerful, customizable components for blockchain network and token selection:

1. **NetworkSelector** - Select from 100+ blockchain networks (mainnet + testnet)
2. **TokenSelector** - Select tokens dynamically based on the selected network
3. **NetworkTokenSelector** - Combined component for unified selection
4. **Data utilities** - Helper functions for chain/token management

## 📁 File Structure

```
frontend/
├── lib/
│   └── chain-data.ts                    # Core data utilities
├── components/
│   ├── NetworkSelector.tsx              # Network selection component
│   ├── TokenSelector.tsx                # Token selection component
│   ├── BuyCrypto.tsx                    # Updated to use new selectors
│   ├── index.ts                         # Easy imports
│   ├── examples/
│   │   └── NetworkTokenExample.tsx      # Usage examples
│   └── README-SELECTORS.md              # Detailed documentation
├── chains.token.json                    # Uniswap token list (20k+ tokens)
├── tokens-list.json                     # Superbridge token list
├── chainslist.json                      # Chain IDs
└── usdc-testnmet.txt                    # Testnet USDC addresses
```

## 🚀 Quick Start

### Basic Usage

```tsx
import { NetworkSelector, TokenSelector } from '@/components';
import type { Chain, Token } from '@/lib/chain-data';
import { useState } from 'react';

function MyComponent() {
  const [chainId, setChainId] = useState<number | null>(null);
  const [token, setToken] = useState<Token | null>(null);

  return (
    <div className="space-y-4">
      <NetworkSelector
        value={chainId}
        onChange={(chainId, chain) => {
          setChainId(chainId);
          setToken(null); // Reset token when network changes
        }}
        includeTestnets={true}
      />
      
      <TokenSelector
        chainId={chainId}
        value={token?.address}
        onChange={(token) => setToken(token)}
      />
    </div>
  );
}
```

### Using the Combined Selector

```tsx
import { NetworkTokenSelector } from '@/components';

function MyComponent() {
  const [chainId, setChainId] = useState<number | null>(null);
  const [token, setToken] = useState<Token | null>(null);

  return (
    <NetworkTokenSelector
      selectedChainId={chainId}
      selectedToken={token}
      onChainChange={(id) => {
        setChainId(id);
        setToken(null);
      }}
      onTokenChange={setToken}
      includeTestnets={true}
    />
  );
}
```

## 🎯 Key Features

### NetworkSelector Features
- ✅ **100+ Networks** - Access all wagmi chains (Ethereum, Base, Polygon, etc.)
- ✅ **Mainnet/Testnet Toggle** - Easy switching between production and test networks
- ✅ **Smart Search** - Search by network name or chain ID
- ✅ **Visual Indicators** - Green dot for mainnet, orange for testnet
- ✅ **Chain Info** - Shows chain ID, native currency, and network status
- ✅ **Filtering** - Optionally filter to specific chains only

### TokenSelector Features
- ✅ **Multi-Source Tokens** - Combines tokens from multiple sources:
  - Uniswap token list (20,000+ tokens)
  - Superbridge token list
  - Custom testnet USDC addresses
  - Native tokens (ETH, MATIC, etc.)
  - Mainnet stablecoins (USDC, USDT, DAI)
- ✅ **Dynamic Loading** - Tokens update automatically when network changes
- ✅ **Token Search** - Search by symbol, name, or address
- ✅ **Token Info** - Shows logo, name, symbol, decimals, and address
- ✅ **Smart Defaults** - Native token and stablecoins appear first
- ✅ **Filtering** - Optionally show only specific tokens

## 📊 Data Sources

### Chains (via wagmi)
All chains are automatically imported from `wagmi/chains`:
- Ethereum Mainnet (1)
- Base (8453) & Base Sepolia (84532)
- Polygon (137) & Polygon Amoy (80002)
- Arbitrum (42161) & Arbitrum Sepolia (421614)
- Optimism (10) & OP Sepolia (11155420)
- Avalanche (43114) & Avalanche Fuji (43113)
- BNB Smart Chain (56) & BSC Testnet (97)
- And 100+ more networks!

### Tokens
Tokens are sourced from:

1. **chains.token.json** - Uniswap Labs Default token list
   - 20,000+ mainnet tokens
   - Cross-chain bridge information
   - Token logos and metadata

2. **tokens-list.json** - Superbridge Superchain Token List
   - L2 optimized tokens
   - Optimism Superchain tokens

3. **Testnet USDC** - Hardcoded addresses for testnets:
   - Base Sepolia: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
   - Ethereum Sepolia: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
   - Polygon Amoy: `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582`
   - Arbitrum Sepolia: `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d`
   - OP Sepolia: `0x5fd84259d66Cd46123540766Be93DFE6D43130D7`
   - Avalanche Fuji: `0x5425890298aed601595a70AB815c96711a31Bc65`
   - Linea Sepolia: `0xFEce4462D57bD51A6A552365A011b95f0E16d9B7`

4. **Mainnet Stablecoins** - Pre-configured addresses:
   - USDC on Ethereum, Base, Polygon, Arbitrum, Optimism, Avalanche
   - USDT on Ethereum, Base, Polygon, Arbitrum, Optimism, Avalanche
   - DAI on Ethereum, Base, Polygon, Arbitrum, Optimism

5. **Native Tokens** - Automatically included:
   - ETH (Ethereum chains)
   - MATIC (Polygon)
   - AVAX (Avalanche)
   - BNB (BSC)
   - And more...

## 🎨 Customization Examples

### Filtering to Specific Networks

```tsx
// Only show Ethereum, Base, and Polygon
<NetworkSelector
  value={chainId}
  onChange={handleChange}
  filterChainIds={[1, 8453, 137, 84532, 11155111, 80002]}
/>
```

### Filtering to Stablecoins Only

```tsx
<TokenSelector
  chainId={chainId}
  value={token?.address}
  onChange={handleChange}
  filterTokens={['USDC', 'USDT', 'DAI']}
  placeholder="Select stablecoin"
/>
```

### Custom Styling

```tsx
<NetworkSelector
  value={chainId}
  onChange={handleChange}
  className="border-2 border-blue-500 hover:border-blue-600 bg-blue-50"
/>

<TokenSelector
  chainId={chainId}
  value={token?.address}
  onChange={handleChange}
  className="border-2 border-green-500 hover:border-green-600 bg-green-50"
/>
```

## 🛠️ Data Utility Functions

### Chain Utilities

```tsx
import {
  getAllChains,
  getMainnetChains,
  getTestnetChains,
  getChainById,
  searchChains
} from '@/lib/chain-data';

// Get all chains
const chains = getAllChains();

// Get only mainnets
const mainnets = getMainnetChains();

// Get only testnets
const testnets = getTestnetChains();

// Find specific chain
const base = getChainById(8453);

// Search chains
const results = searchChains('base', true);
```

### Token Utilities

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

// Get tokens for specific chain
const baseTokens = getTokensByChainId(8453);

// Get all available tokens for a chain (recommended)
const combinedTokens = getCombinedTokensForChain(8453);

// Get testnet USDC
const usdc = getTestnetUSDC(84532); // Base Sepolia

// Get mainnet stablecoins
const stables = getMainnetStablecoins(1); // Ethereum

// Search tokens on a chain
const results = searchTokens(8453, 'usdc');
```

## 📝 Real-World Example: BuyCrypto Component

The `BuyCrypto.tsx` component has been updated to use these new selectors. Key changes:

**Before:**
```tsx
// Hardcoded assets and networks
const CRYPTO_ASSETS = [
  { symbol: 'USDC', name: 'USD Coin', networks: ['ethereum', 'base'] },
  // ...
];

<select value={selectedAsset}>
  {CRYPTO_ASSETS.map(asset => (
    <option key={asset.symbol}>{asset.symbol}</option>
  ))}
</select>
```

**After:**
```tsx
// Dynamic networks and tokens from wagmi + token lists
<NetworkSelector
  value={selectedChainId}
  onChange={(chainId, chain) => {
    setSelectedChainId(chainId);
    setSelectedChain(chain);
    setSelectedToken(null); // Reset token
  }}
  includeTestnets={true}
/>

<TokenSelector
  chainId={selectedChainId}
  value={selectedToken?.address}
  onChange={setSelectedToken}
/>
```

**Benefits:**
- ✅ Access to 100+ networks instead of 3
- ✅ Access to 20,000+ tokens instead of 3
- ✅ Automatic testnet USDC support
- ✅ Smart filtering and search
- ✅ Better UX with visual indicators
- ✅ Type-safe with full TypeScript support

## 🔧 Advanced Usage

### Handling Network Switches

```tsx
const handleNetworkChange = (chainId: number, chain: Chain) => {
  // Update state
  setChainId(chainId);
  
  // Reset dependent state
  setToken(null);
  
  // Show notification
  if (chain.testnet) {
    toast.warning(`Switched to ${chain.name} (Testnet)`);
  } else {
    toast.success(`Switched to ${chain.name}`);
  }
  
  // Optional: Switch wallet
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  }
};
```

### Programmatic Token Selection

```tsx
import { getCombinedTokensForChain } from '@/lib/chain-data';

// Auto-select USDC when network changes
const handleNetworkChange = (chainId: number) => {
  setChainId(chainId);
  
  // Find and auto-select USDC
  const tokens = getCombinedTokensForChain(chainId);
  const usdc = tokens.find(t => t.symbol === 'USDC');
  
  if (usdc) {
    setToken(usdc);
  }
};
```

### Form Validation

```tsx
const validateSelection = () => {
  if (!selectedChainId) {
    setError('Please select a network');
    return false;
  }
  
  if (!selectedToken) {
    setError('Please select a token');
    return false;
  }
  
  const chain = getChainById(selectedChainId);
  if (chain?.testnet && !confirmTestnet) {
    setError('Please confirm you want to use a testnet');
    return false;
  }
  
  return true;
};
```

## 🎓 Component Props Reference

### NetworkSelector Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| value | `number \| null` | No | `null` | Selected chain ID |
| onChange | `(chainId: number, chain: Chain) => void` | Yes | - | Callback when network selected |
| className | `string` | No | `''` | Custom CSS classes |
| placeholder | `string` | No | `'Select network'` | Placeholder text |
| includeTestnets | `boolean` | No | `true` | Show testnet networks |
| disabled | `boolean` | No | `false` | Disable selector |
| filterChainIds | `number[]` | No | `undefined` | Only show specific chains |

### TokenSelector Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| chainId | `number \| null` | Yes | - | Chain ID to fetch tokens for |
| value | `string \| null` | No | `null` | Selected token address |
| onChange | `(token: Token) => void` | Yes | - | Callback when token selected |
| className | `string` | No | `''` | Custom CSS classes |
| placeholder | `string` | No | `'Select token'` | Placeholder text |
| disabled | `boolean` | No | `false` | Disable selector |
| filterTokens | `string[]` | No | `undefined` | Only show specific tokens |

## 🐛 Troubleshooting

### Issue: "No tokens found"
**Cause:** Network not selected or no tokens available for that network  
**Solution:** Ensure chainId is valid and the network has tokens in the data sources

### Issue: Testnet USDC not showing
**Cause:** Chain ID not in the testnet USDC mapping  
**Solution:** Add the chain ID and address to `TESTNET_USDC_ADDRESSES` in `chain-data.ts`

### Issue: Custom styling not working
**Cause:** Tailwind classes not being processed  
**Solution:** Ensure component path is in `tailwind.config.js`:
```js
content: [
  './components/**/*.{ts,tsx}',
  './app/**/*.{ts,tsx}',
]
```

### Issue: "Cannot read property 'name' of undefined"
**Cause:** Trying to access chain before it's loaded  
**Solution:** Use optional chaining: `chain?.name`

## 🌐 Live Demo Page

Visit `/selectors` in your application to see an interactive demo:
- Complete transfer form with the selectors
- Multiple usage examples
- Real-time selection details
- Copy-paste ready code examples

Example: `http://localhost:3000/selectors`

## 📚 Additional Resources

- **Live Demo Page**: `/selectors` - Interactive demo with examples
- **Full API Documentation**: `frontend/components/README-SELECTORS.md`
- **Usage Examples**: `frontend/components/examples/NetworkTokenExample.tsx`
- **Live Example**: See `frontend/components/BuyCrypto.tsx`
- **Wagmi Chains**: https://wagmi.sh/core/chains
- **Uniswap Token Lists**: https://tokenlists.org/

## ✨ Next Steps

1. **Add More Token Lists**: Import additional token lists for more coverage
2. **Add Token Logos**: Enhance token display with better logo sources
3. **Add Price Data**: Integrate token prices from Coingecko or similar
4. **Add Network Logos**: Add custom logos for popular networks
5. **Add Balances**: Show user's token balances in the selector
6. **Add Favorites**: Allow users to favorite networks/tokens
7. **Add Recent**: Show recently used networks/tokens

## 🤝 Contributing

To add new token sources:
1. Add your JSON file to `frontend/`
2. Update `getCombinedTokensForChain()` in `lib/chain-data.ts`
3. Ensure tokens follow the `Token` interface

To add testnet addresses:
1. Update `TESTNET_USDC_ADDRESSES` in `lib/chain-data.ts`
2. Follow the format: `'chainId': 'address'`

---

**Built with ❤️ using:**
- Next.js 15
- TypeScript
- Wagmi
- Radix UI
- Tailwind CSS
- Lucide Icons

