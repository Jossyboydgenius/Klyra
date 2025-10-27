# 🔄 Klyra Swap System

A comprehensive, real-time token swap system with multi-chain support and DEX aggregation.

## 🎯 Features

### Core Features
✅ **Same-Chain Swaps** - Swap tokens on the same blockchain  
✅ **Cross-Chain Swaps** - Swap tokens across different blockchains  
✅ **Bridge Transfers** - Transfer same token across chains (e.g., USDC Ethereum → USDC Base)  
✅ **Real-Time Quotes** - Auto-refreshing quotes every 15 seconds  
✅ **Router Comparison** - Compare rates across multiple routers  
✅ **Gas Estimation** - See estimated gas costs before swapping  
✅ **Route Display** - View the swap route through different DEXs  
✅ **Calldata Generation** - Generate transaction calldata in real-time  
✅ **Slippage Control** - Customize slippage tolerance  
✅ **Price Impact** - See price impact of your trade  

### Router Support
- **1inch Aggregator** - For same-chain swaps
- **1inch Fusion+** - For cross-chain swaps
- More routers coming soon!

## 🚀 Getting Started

### 1. Get 1inch API Key

Visit [1inch Developer Portal](https://portal.1inch.dev/) and get your API key.

### 2. Configure Environment

Create a `.env.local` file in the `frontend/` directory:

```bash
NEXT_PUBLIC_ONEINCH_API_KEY=your_api_key_here
```

### 3. Start the App

```bash
cd frontend
npm run dev
```

### 4. Navigate to Swap Page

Open your browser and go to:
```
http://localhost:3000/swap
```

## 📖 How to Use

### Same-Chain Swap (e.g., ETH → USDC on Ethereum)

1. **Select Source Chain**: Choose Ethereum
2. **Select Source Token**: Choose ETH
3. **Enter Amount**: Enter the amount to swap
4. **Select Destination Chain**: Choose Ethereum (same as source)
5. **Select Destination Token**: Choose USDC
6. **Review Quote**: See the quote, gas cost, and route
7. **Select Router** (optional): Click on the router button to compare rates
8. **Swap**: Click "Swap Tokens" to execute

### Cross-Chain Swap (e.g., USDC on Ethereum → USDT on Polygon)

1. **Select Source Chain**: Choose Ethereum
2. **Select Source Token**: Choose USDC
3. **Enter Amount**: Enter the amount
4. **Select Destination Chain**: Choose Polygon
5. **Select Destination Token**: Choose USDT
6. **Review Quote**: Cross-chain quotes use 1inch Fusion+
7. **Swap**: Execute the cross-chain swap

### Bridge Transfer (e.g., USDC Ethereum → USDC Base)

1. **Select Source Chain**: Choose Ethereum
2. **Select Source Token**: Choose USDC
3. **Enter Amount**: Enter the amount
4. **Select Destination Chain**: Choose Base
5. **Select Destination Token**: Choose USDC
6. **Review Quote**: System detects it's a bridge transfer
7. **Swap**: Execute the bridge

## 🏗️ Architecture

### File Structure

```
frontend/
├── lib/
│   ├── 1inch-api.ts          # 1inch API client
│   ├── swap-types.ts          # Type definitions
│   └── chain-data.ts          # Chain and token data
├── hooks/
│   └── useSwap.ts             # Swap state management hook
├── components/
│   ├── NetworkSelector.tsx    # Network selector
│   ├── TokenSelector.tsx      # Token selector
│   └── swap/
│       └── RouterSelectionModal.tsx  # Router comparison modal
└── app/
    └── swap/
        ├── page.tsx           # Main swap page
        └── layout.tsx         # Swap layout
```

### Data Flow

```
User Input → useSwap Hook → 1inch API → Quote Updates → UI Update
                ↓
        Real-time Refresh (15s)
                ↓
        Route Comparison Modal
                ↓
        Calldata Generation
```

## 🔧 Technical Details

### API Integration

#### 1inch Swap API (Same-Chain)
- **Endpoint**: `/swap/v6.1/{chain}/quote`
- **Features**: Best rates, multiple DEXs, gas estimation
- **Refresh**: Every 15 seconds

#### 1inch Fusion+ API (Cross-Chain)
- **Endpoint**: `/fusion-plus/quoter/v1.1/quote/receive`
- **Features**: Cross-chain swaps, atomic execution
- **Presets**: Fast, Medium, Slow

### State Management

The `useSwap` hook manages:
- Source/destination chain and token selection
- Amount input and output
- Quote fetching and caching
- Route comparison
- Calldata generation
- Error handling

### Real-Time Features

1. **Auto-Refresh**: Quotes auto-refresh every 15 seconds
2. **Live Updates**: UI updates in real-time as quotes change
3. **Router Comparison**: Compare multiple routes instantly
4. **Dynamic Calldata**: Generates calldata on-demand

## 🎨 Components

### NetworkSelector
Reusable component for selecting blockchain networks.
- 100+ networks from wagmi
- Mainnet/testnet toggle
- Search functionality

### TokenSelector
Reusable component for selecting tokens.
- 20,000+ tokens
- Dynamic loading per chain
- Search functionality

### RouterSelectionModal
Modal for comparing router rates.
- Shows all available routes
- Highlights best options
- Real-time comparison

## 📊 Swap Types

### 1. Same-Chain Swap
- Source and destination on same chain
- Uses 1inch Aggregator
- Fast execution
- Lower gas costs

### 2. Cross-Chain Swap
- Different source and destination chains
- Different tokens
- Uses 1inch Fusion+
- Higher gas costs

### 3. Bridge Transfer
- Same token, different chains
- Optimized for bridges
- Uses 1inch Fusion+
- Best for large amounts

## ⚙️ Settings

### Slippage Tolerance
- **Default**: 0.5%
- **Presets**: 0.1%, 0.5%, 1.0%
- **Custom**: Any value between 0.1% - 50%
- **Impact**: Higher slippage = higher chance of execution

### Auto-Refresh
- **Interval**: 15 seconds
- **Benefit**: Always get latest rates
- **Can be disabled**: Manual refresh button available

## 🔐 Security

- **No Private Keys**: App never accesses private keys
- **Calldata Only**: Generates unsigned transaction data
- **User Approval**: User must approve in wallet
- **Slippage Protection**: Configurable slippage limits
- **Price Impact Warnings**: Alerts for high impact trades

## 🐛 Troubleshooting

### Issue: No quotes showing
**Solution**: 
- Check API key is set correctly
- Verify tokens are supported on selected chains
- Check network connection

### Issue: High price impact
**Solution**:
- Reduce swap amount
- Try different route
- Split into multiple swaps

### Issue: Quote refresh stopped
**Solution**:
- Check console for errors
- Manually refresh quotes
- Reload the page

### Issue: Cross-chain swap not available
**Solution**:
- Verify both chains are supported by 1inch Fusion+
- Check token availability on destination chain

## 📈 Future Enhancements

Planned features:
- [ ] Multi-router support (Jupiter, Paraswap, etc.)
- [ ] Historical price charts
- [ ] Limit orders
- [ ] DCA (Dollar Cost Averaging)
- [ ] Portfolio tracking
- [ ] Gas price optimization
- [ ] MEV protection
- [ ] Transaction history
- [ ] Favorites/recent pairs
- [ ] Mobile optimization

## 🤝 Adding New Routers

To add a new router:

1. **Create API Client** (`lib/{router}-api.ts`)
```tsx
export class RouterAPI {
  async getQuote(params) { ... }
  async getSwap(params) { ... }
}
```

2. **Update Swap Types** (`lib/swap-types.ts`)
```tsx
export const AVAILABLE_ROUTERS: RouterInfo[] = [
  // ... existing routers
  {
    id: 'new-router',
    name: 'New Router',
    // ... router config
  }
];
```

3. **Update useSwap Hook** (`hooks/useSwap.ts`)
```tsx
// Add router-specific quote fetching logic
if (routerId === 'new-router') {
  const quote = await newRouterAPI.getQuote(...);
  // ... handle response
}
```

4. **Test**: Test all swap types with new router

## 📝 API Reference

### useSwap Hook

```tsx
const { state, actions } = useSwap(userAddress);

// State
state.srcChainId           // Selected source chain ID
state.srcToken             // Selected source token
state.srcAmount            // Source amount
state.dstChainId           // Selected destination chain ID
state.dstToken             // Selected destination token
state.dstAmount            // Calculated destination amount
state.swapType             // Type of swap
state.selectedRoute        // Currently selected route
state.availableRoutes      // All available routes
state.isLoadingQuotes      // Loading state
state.error                // Error message

// Actions
actions.setSrcChain(chainId)
actions.setSrcToken(token)
actions.setSrcAmount(amount)
actions.setDstChain(chainId)
actions.setDstToken(token)
actions.setSlippage(slippage)
actions.switchTokens()
actions.refreshQuotes()
actions.generateCalldata()
actions.setSelectedRoute(route)
```

### 1inch API Client

```tsx
import { oneInchAPI } from '@/lib/1inch-api';

// Get quote
const quote = await oneInchAPI.getQuote({
  chainId: 1,
  src: '0x...',
  dst: '0x...',
  amount: '1000000000000000000',
});

// Generate swap calldata
const swap = await oneInchAPI.getSwap({
  chainId: 1,
  src: '0x...',
  dst: '0x...',
  amount: '1000000000000000000',
  from: '0x...',
  origin: '0x...',
  slippage: 0.5,
});

// Cross-chain quote
const fusionQuote = await oneInchAPI.getFusionQuote({
  srcChain: 1,
  dstChain: 137,
  srcTokenAddress: '0x...',
  dstTokenAddress: '0x...',
  amount: '1000000000000000000',
  walletAddress: '0x...',
});
```

## 📞 Support

For issues or questions:
- Check the troubleshooting section
- Review the API documentation
- Check console for errors
- Refer to 1inch documentation: https://portal.1inch.dev/

## 📄 License

MIT - See main project LICENSE file.

---

**Built with ❤️ using 1inch API, Next.js, TypeScript, and Wagmi**

