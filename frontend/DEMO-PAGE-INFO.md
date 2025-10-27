# 🌐 Network & Token Selectors - Demo Page

## Quick Access

**URL**: `/selectors`

**Example**: `http://localhost:3000/selectors` (development)

## What is it?

A beautiful, interactive demo page showcasing the NetworkSelector and TokenSelector components with:
- ✅ Live form demonstration
- ✅ Multiple usage examples
- ✅ Real-time data display
- ✅ Code snippets
- ✅ Full documentation

## Page Features

### 📱 Three Main Tabs

#### 1. **Interactive Demo**
A complete token transfer form featuring:
- Network selection with mainnet/testnet toggle
- Token selection based on chosen network
- Amount input field
- Wallet address input
- Real-time validation
- Transaction preview
- Selection summary with full details
- Copy contract addresses
- Block explorer links

#### 2. **Examples**
Four different configuration examples:
- **Filtered Networks** - Limit to Ethereum, Base, Polygon
- **Stablecoins Only** - Show only USDC, USDT, DAI
- **Mainnet Only** - Hide all testnets
- **Custom Styling** - Colored borders demo

#### 3. **Details**
Technical information display:
- Full JSON of selected network
- Full JSON of selected token
- Usage code example
- Copy-paste ready

## Screenshots Preview

### Interactive Demo Tab
```
┌─────────────────────────────────────────────────────────┐
│  🔷 Token Transfer Form    │   Current Selection        │
│  ┌───────────────────────┐ │   ┌──────────────────────┐│
│  │ Network: [Selector]   │ │   │ Network Details      ││
│  │ Token: [Selector]     │ │   │ • Base Sepolia       ││
│  │ Amount: [Input]       │ │   │ • Chain ID: 84532    ││
│  │ Wallet: [Input]       │ │   │ • Type: Testnet      ││
│  │ [Submit Button]       │ │   └──────────────────────┘│
│  └───────────────────────┘ │   ┌──────────────────────┐│
│                             │   │ Token Details        ││
│                             │   │ • USDC               ││
│                             │   │ • USD Coin           ││
│                             │   │ • Decimals: 6        ││
│                             │   └──────────────────────┘│
│                             │   ┌──────────────────────┐│
│                             │   │ Transaction Preview  ││
│                             │   │ Ready to submit!     ││
│                             │   └──────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## How to Use

### 1. Start the Development Server
```bash
cd frontend
npm run dev
```

### 2. Navigate to the Demo Page
Open your browser and go to:
```
http://localhost:3000/selectors
```

### 3. Interact with the Components
- Select different networks
- See tokens update automatically
- Try the search functionality
- Switch between mainnet/testnet
- Test different filters in the Examples tab
- View JSON data in the Details tab

## Features Demonstrated

### Network Selector
✅ 100+ blockchain networks  
✅ Mainnet/Testnet toggle  
✅ Search by name or chain ID  
✅ Visual indicators (green/orange dots)  
✅ Network metadata display  
✅ Filtering options  
✅ Block explorer links  

### Token Selector
✅ 20,000+ tokens  
✅ Dynamic loading per network  
✅ Search by symbol/name/address  
✅ Token logos with fallback  
✅ Token metadata (decimals, contract)  
✅ Native tokens included  
✅ Stablecoin prioritization  
✅ Filtering options  

### Form Features
✅ Real-time validation  
✅ Automatic token reset on network change  
✅ Transaction preview  
✅ Copy to clipboard  
✅ Visual feedback  
✅ Error handling  
✅ Responsive design  

## Code Examples from Page

### Basic Setup
```tsx
const [chainId, setChainId] = useState<number | null>(null);
const [chain, setChain] = useState<Chain | null>(null);
const [token, setToken] = useState<Token | null>(null);
```

### Network Selection
```tsx
<NetworkSelector
  value={chainId}
  onChange={(chainId, chain) => {
    setChainId(chainId);
    setChain(chain);
    setToken(null); // Important: reset token
  }}
  includeTestnets={true}
/>
```

### Token Selection
```tsx
<TokenSelector
  chainId={chainId}
  value={token?.address}
  onChange={setToken}
/>
```

### Filtered Examples
```tsx
// Only specific chains
<NetworkSelector filterChainIds={[1, 8453, 137]} />

// Only stablecoins
<TokenSelector filterTokens={['USDC', 'USDT', 'DAI']} />

// Mainnet only
<NetworkSelector includeTestnets={false} />
```

## Page Benefits

### For Developers
- 🔍 **Testing Ground** - Test selectors in isolation
- 📝 **Code Examples** - Copy-paste working code
- 🐛 **Debugging** - See JSON data for debugging
- 📚 **Documentation** - Learn all features

### For Stakeholders
- 👀 **Visual Demo** - See components in action
- 💡 **Feature Understanding** - Understand capabilities
- ✅ **Quality Assurance** - Verify functionality
- 🎨 **UI/UX Review** - Review design and interactions

### For Users
- 🎓 **Learning** - Understand how to use the app
- 🧪 **Experimentation** - Try different networks/tokens
- 📊 **Data Exploration** - Explore available options
- 🔗 **Quick Access** - Jump to block explorers

## Technical Details

### Technologies Used
- **Next.js 15** - App router with React Server Components
- **TypeScript** - Full type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components
- **Lucide Icons** - Icon library
- **Wagmi** - Chain data

### File Location
```
frontend/
└── app/
    └── selectors/
        ├── page.tsx        # Main demo page
        ├── layout.tsx      # Layout with metadata
        └── README.md       # This file
```

### Page Size
- **Lines of Code**: ~550 lines
- **Components Used**: 10+ UI components
- **Features**: 15+ interactive features
- **Examples**: 4 different configurations

## Customization

You can easily customize the demo page:

### Change Default Network
```tsx
const [selectedChainId, setSelectedChainId] = useState<number | null>(8453); // Base
```

### Add More Examples
Add new cards to the Examples tab with different configurations.

### Modify Form Fields
Add or remove fields in the Interactive Demo form.

### Change Styling
Update Tailwind classes for different colors/themes.

## Troubleshooting

### Issue: Page not loading
**Solution**: Make sure the dev server is running: `npm run dev`

### Issue: Selectors not working
**Solution**: Check that all dependencies are installed: `npm install`

### Issue: Tokens not showing
**Solution**: Select a network first - tokens load based on selected network

### Issue: Styling looks wrong
**Solution**: Ensure Tailwind is configured correctly in `tailwind.config.ts`

## Related Files

- `/components/NetworkSelector.tsx` - Network selector component
- `/components/TokenSelector.tsx` - Token selector component
- `/lib/chain-data.ts` - Data utilities
- `/components/README-SELECTORS.md` - API documentation
- `/NETWORK-TOKEN-SELECTOR-GUIDE.md` - Implementation guide
- `/QUICK-REFERENCE.md` - Quick reference

## Next Steps

After exploring the demo page:

1. **Integrate into your app** - Use the code examples
2. **Customize as needed** - Adjust for your use case
3. **Read the docs** - Check full API documentation
4. **Build features** - Create your own implementations

## Feedback & Improvements

The demo page can be extended with:
- [ ] Token balance display
- [ ] Price information
- [ ] Gas estimation
- [ ] Network switching (Web3)
- [ ] Transaction simulation
- [ ] Favorites system
- [ ] Recent selections
- [ ] More examples

## Summary

The `/selectors` demo page is a **complete showcase** of the NetworkSelector and TokenSelector components, featuring:
- 🎯 **Interactive demo** with real-time updates
- 📚 **Multiple examples** showing different configurations
- 📊 **Technical details** with JSON data
- 💻 **Code snippets** ready to copy-paste
- 🎨 **Beautiful UI** with responsive design
- ♿ **Accessible** components
- 🌓 **Dark mode** support

**Perfect for testing, learning, and demonstrating the components!** 🚀

