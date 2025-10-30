# 🔄 Dynamic Network Switching - Mainnet/Testnet Auto-Detection

## 🎯 **What Changed?**

**Before**: Environment variables (`NEXT_PUBLIC_USE_SQUID_TESTNET`, `NEXT_PUBLIC_USE_ACROSS_TESTNET`) to toggle between mainnet/testnet.

**Now**: ✅ **Automatic detection** based on the selected chain in your Network Selector!

---

## 🚀 **How It Works**

### **1. Network Selector Already Has Mainnet/Testnet Tabs**
Your `NetworkSelector` component has tabs to switch between mainnet and testnet chains.

### **2. Global Network Context**
When a user selects a chain:
- The `NetworkContext` tracks whether it's a mainnet or testnet chain
- APIs (Squid, Across) automatically use the correct endpoint
- No environment variables needed!

### **3. API Clients Auto-Configure**
- **Squid Router**: `https://v2.api.squidrouter.com/v2` (mainnet) or `https://testnet.api.squidrouter.com/v1` (testnet)
- **Across Protocol**: `https://app.across.to/api` (mainnet) or `https://testnet.across.to/api` (testnet)

---

## 📋 **Implementation Details**

### **New Files:**
1. **`contexts/NetworkContext.tsx`** - Global state for selected chain and mainnet/testnet detection
2. **`hooks/useSquidAPI.ts`** - Returns Squid API client configured for current network mode
3. **`hooks/useAcrossAPI.ts`** - Returns Across API client configured for current network mode

### **Updated Files:**
1. **`lib/aggregators/squid.ts`** - Constructor now accepts `isTestnet` parameter
2. **`lib/aggregators/across.ts`** - Constructor now accepts `isTestnet` parameter
3. **`components/NetworkSelector.tsx`** - Updates NetworkContext when chain is selected
4. **`app/providers.tsx`** - Wraps app with `NetworkProvider`

---

## 💻 **Usage in Your Code**

### **For API Calls (in React Components):**

```tsx
import { useSquidAPI } from '@/hooks/useSquidAPI';
import { useAcrossAPI } from '@/hooks/useAcrossAPI';

function MyComponent() {
  const squidAPI = useSquidAPI();   // Auto-configured for current network
  const acrossAPI = useAcrossAPI(); // Auto-configured for current network

  const fetchQuote = async () => {
    const quote = await squidAPI.getRoute({...});
    // Automatically uses testnet or mainnet endpoint based on selected chain
  };

  return <div>...</div>;
}
```

### **For Network Detection:**

```tsx
import { useNetworkMode } from '@/contexts/NetworkContext';

function MyComponent() {
  const { isTestnet, chainId } = useNetworkMode();

  return (
    <div>
      {isTestnet ? (
        <Badge>🧪 Testnet Mode</Badge>
      ) : (
        <Badge>🟢 Mainnet</Badge>
      )}
    </div>
  );
}
```

---

## ✅ **Benefits**

1. ✅ **Better UX** - Users can switch mainnet/testnet in the UI, no restart needed
2. ✅ **Cleaner Code** - No environment variables to manage for testnet toggles
3. ✅ **Automatic** - No manual configuration, works out of the box
4. ✅ **Real-time** - Changes apply immediately when user switches networks
5. ✅ **Console Logs** - Shows current mode in console for debugging

---

## 📝 **Console Output**

When a user selects a chain, you'll see:

**Mainnet:**
```
🔄 Network Mode: MAINNET
📍 Chain: Ethereum (ID: 1)
```

**Testnet:**
```
🔄 Network Mode: TESTNET
📍 Chain: Sepolia (ID: 11155111)
🧪 Squid Router: Running in TESTNET mode
API Endpoint: https://testnet.api.squidrouter.com/v1
Note: Testnet fills may be slower than mainnet
```

---

## 🔧 **For Developers**

### **Network Context Structure:**

```typescript
interface NetworkContextType {
  selectedChain: Chain | null;  // Currently selected chain
  isTestnet: boolean;            // true if testnet chain selected
  setSelectedChain: (chain: Chain | null) => void;
  setSelectedChainById: (chainId: number) => void;
}
```

### **API Client Constructors:**

```typescript
// Squid
new SquidAPI(integratorId?: string, isTestnet: boolean = false)

// Across
new AcrossAPI(integratorId?: string, isTestnet: boolean = false)
```

---

## ⚠️ **Important Notes**

1. **Network Selector Required**: The system relies on users selecting chains via the `NetworkSelector` component. Make sure it's available where needed.

2. **Default Behavior**: If no chain is selected yet, APIs default to **mainnet** mode.

3. **Chain Detection**: The system checks the chain's `testnet` property (from `@wagmi/core/chains`) to determine if it's a testnet.

4. **Testnet Performance**: Testnet fills are slower:
   - **Mainnet**: ~2 seconds (Across)
   - **Testnet**: ~1 minute (relayers are manually funded)

---

## 🎉 **Result**

Users can now seamlessly switch between mainnet and testnet networks in your app, and all API calls automatically use the correct endpoints. No configuration needed! 🚀

---

**Old Way:**
```bash
# .env.local
NEXT_PUBLIC_USE_SQUID_TESTNET=true  # ❌ Manual toggle
NEXT_PUBLIC_USE_ACROSS_TESTNET=true # ❌ Restart required
```

**New Way:**
```tsx
// User just clicks "Testnet" tab in NetworkSelector
// Everything auto-configures! ✅
```

