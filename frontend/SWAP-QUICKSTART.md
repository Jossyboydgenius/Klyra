# 🚀 Swap System Quick Start

## ⚡ 3-Minute Setup

### Step 1: Get API Key
Visit https://portal.1inch.dev/ and get your free API key.

### Step 2: Add Environment Variable
Create or update `.env.local` in the `frontend/` folder:
```bash
NEXT_PUBLIC_ONEINCH_API_KEY=your_api_key_here
```

### Step 3: Start the App
```bash
cd frontend
npm run dev
```

### Step 4: Open Swap Page
Navigate to: http://localhost:3000/swap

## 💡 Quick Usage

### Example 1: Swap ETH to USDC on Ethereum
1. Select "Ethereum" for both source and destination
2. Choose "ETH" as source token
3. Choose "USDC" as destination token
4. Enter amount (e.g., "0.1")
5. Click "Swap Tokens"

### Example 2: Bridge USDC from Ethereum to Base
1. Select "Ethereum" as source chain
2. Select "Base" as destination chain
3. Choose "USDC" for both tokens
4. Enter amount
5. System automatically detects it's a bridge
6. Click "Swap Tokens"

### Example 3: Cross-Chain Swap
1. Select "Ethereum" as source
2. Select "Polygon" as destination
3. Choose "USDC" on Ethereum
4. Choose "USDT" on Polygon
5. Enter amount
6. Review Fusion+ quote
7. Click "Swap Tokens"

## 🎯 Key Features

- ✅ Real-time quotes (auto-refresh every 15s)
- ✅ Router comparison
- ✅ Gas estimation
- ✅ Slippage control
- ✅ Price impact warnings
- ✅ Cross-chain support
- ✅ 100+ networks
- ✅ 20,000+ tokens

## 📚 Full Documentation

See `SWAP-SYSTEM-README.md` for complete documentation.

## 🔗 Access Points

- **Swap Page**: `/swap`
- **Network Selector Demo**: `/selectors`

## ⚙️ Configuration

### Environment Variables
```bash
# Required
NEXT_PUBLIC_ONEINCH_API_KEY=your_key

# Optional (future)
# NEXT_PUBLIC_PARASWAP_API_KEY=your_key
# NEXT_PUBLIC_JUPITER_API_KEY=your_key
```

### Default Settings
- Slippage: 0.5%
- Quote Refresh: 15 seconds
- Auto Router: Enabled

## 🎨 Components Available

### For Integration in Your App
```tsx
import { NetworkSelector, TokenSelector } from '@/components';
import { useSwap } from '@/hooks/useSwap';

// Use in your components
function MySwap() {
  const { state, actions } = useSwap(userAddress);
  // ... your swap logic
}
```

## 📊 Swap Types Supported

| Type | Description | Router |
|------|-------------|--------|
| Same-Chain | ETH → USDC on Ethereum | 1inch Aggregator |
| Cross-Chain | USDC on ETH → USDT on Polygon | 1inch Fusion+ |
| Bridge | USDC on ETH → USDC on Base | 1inch Fusion+ |

## 🔐 Security Notes

- Never shares private keys
- All transactions require wallet approval
- Calldata generated client-side
- Slippage protection included
- Price impact warnings

## 💰 Gas Costs

- **Same-Chain**: Lower gas (~50k-200k gas)
- **Cross-Chain**: Higher gas (~200k-500k gas)
- **Bridge**: Moderate gas (~100k-300k gas)

*Actual costs vary by network congestion and route complexity*

## 🐛 Common Issues

**Q: Quotes not loading?**
A: Check API key is set and valid

**Q: Token not found?**
A: Token may not be supported on selected chain

**Q: High price impact?**
A: Reduce amount or try different route

**Q: Swap button disabled?**
A: Fill all fields and wait for quote to load

## 📈 Next Steps

1. ✅ Test same-chain swaps
2. ✅ Test cross-chain swaps
3. ✅ Try router comparison
4. ✅ Adjust slippage settings
5. ✅ Connect real wallet (coming soon)
6. ✅ Execute real swaps

## 🤝 Need Help?

- Check `SWAP-SYSTEM-README.md` for detailed docs
- Review browser console for errors
- Check 1inch API status: https://status.1inch.io/
- Verify network connectivity

---

**Ready to swap?** Open http://localhost:3000/swap and start trading! 🚀

