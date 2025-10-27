# Network & Token Selectors Demo Page

This page demonstrates the NetworkSelector and TokenSelector components in action.

## Access the Page

Visit: `/selectors` in your application

Example: `http://localhost:3000/selectors`

## What's on the Page

### 1. Interactive Demo Tab
- Complete transfer form using the selectors
- Real-time selection summary
- Transaction preview
- Copy contract addresses
- View block explorers

### 2. Examples Tab
Four different usage examples:
- **Filtered Networks** - Only show specific chains
- **Stablecoins Only** - Filter to USDC, USDT, DAI
- **Mainnet Only** - Hide testnets
- **Custom Styling** - Colored borders

### 3. Details Tab
- Full JSON data of selected network
- Full JSON data of selected token
- Usage code example

## Features Demonstrated

✅ **Network Selection** with mainnet/testnet toggle  
✅ **Token Selection** based on selected network  
✅ **Smart Search** for both networks and tokens  
✅ **Filtering** by chain IDs and token symbols  
✅ **Visual Indicators** for network types  
✅ **Token Metadata** display  
✅ **Contract Address** copying  
✅ **Block Explorer** links  
✅ **Form Validation**  
✅ **Transaction Preview**  
✅ **Custom Styling** examples  

## Use Cases

This page is perfect for:
- Testing the selector components
- Understanding how to integrate them
- Seeing different configuration options
- Copying code examples
- Debugging selection issues
- Demonstrating to stakeholders

## Code Example from Page

```tsx
import { NetworkSelector, TokenSelector } from '@/components';
import type { Chain, Token } from '@/lib/chain-data';

const [chainId, setChainId] = useState<number | null>(null);
const [chain, setChain] = useState<Chain | null>(null);
const [token, setToken] = useState<Token | null>(null);

// Network selection
<NetworkSelector
  value={chainId}
  onChange={(chainId, chain) => {
    setChainId(chainId);
    setChain(chain);
    setToken(null); // Reset token
  }}
  includeTestnets={true}
/>

// Token selection
<TokenSelector
  chainId={chainId}
  value={token?.address}
  onChange={setToken}
/>
```

## Page Structure

```
/selectors
├── Interactive Demo
│   ├── Selection Form
│   │   ├── Network Selector
│   │   ├── Token Selector
│   │   ├── Amount Input
│   │   └── Wallet Address Input
│   └── Selection Summary
│       ├── Network Details
│       ├── Token Details
│       └── Transaction Preview
├── Examples
│   ├── Filtered Networks
│   ├── Stablecoins Only
│   ├── Mainnet Only
│   └── Custom Styling
└── Details
    ├── Network JSON
    ├── Token JSON
    └── Code Example
```

## Notes

- This is a demo page - no actual transactions are processed
- Form submission shows an alert with the data
- All selector features are fully functional
- Page is responsive and works on mobile
- Dark mode supported

## Related Documentation

- `/components/README-SELECTORS.md` - Full API documentation
- `/NETWORK-TOKEN-SELECTOR-GUIDE.md` - Implementation guide
- `/QUICK-REFERENCE.md` - Quick usage reference
- `/components/examples/NetworkTokenExample.tsx` - Additional examples

