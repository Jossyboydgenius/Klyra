# Wallet Components - Quick Reference

## Import
```tsx
import { WalletConnect, CompactWalletConnect, WalletConnectButton } from '@/components';
import { useAccount, useBalance } from 'wagmi';
```

## Components

### 1. WalletConnect (Full)
```tsx
<WalletConnect 
  className="z-10"
  autoShowModal={true}
  showBalance={false}
  connectText="Connect Wallet"
/>
```

### 2. CompactWalletConnect (Minimal)
```tsx
<CompactWalletConnect className="ml-auto" />
```

### 3. WalletConnectButton (Button Only)
```tsx
<WalletConnectButton text="Get Started" />
```

## Hooks

### Get Account
```tsx
const { address, isConnected, isConnecting } = useAccount();
```

### Get Balance
```tsx
const { data: balance } = useBalance({ address });
// balance.formatted, balance.symbol
```

### Read Token Balance
```tsx
const { data } = useReadContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: 'balanceOf',
  args: [userAddress],
});
```

### Switch Chain
```tsx
const { switchChain } = useSwitchChain();
switchChain({ chainId: base.id });
```

## Common Patterns

### Conditional Rendering
```tsx
{isConnected ? (
  <SwapInterface />
) : (
  <WalletConnect />
)}
```

### With Balance Display
```tsx
const { address } = useAccount();
const { data: balance } = useBalance({ address });

<div>
  <WalletConnect showBalance={true} />
  <p>Balance: {balance?.formatted} ETH</p>
</div>
```

### In Header
```tsx
<header className="flex justify-between">
  <Logo />
  <CompactWalletConnect />
</header>
```

## Environment Variables
```bash
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_key
```

## Supported Chains
- Base, Ethereum, Polygon, Arbitrum, Optimism
- Sepolia, Base Sepolia (testnets)


