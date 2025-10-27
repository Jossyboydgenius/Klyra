# Wallet Integration Guide

This guide explains how to use the wallet connection functionality in your Klyra app.

## Overview

The wallet integration uses:
- **Coinbase OnchainKit** - For wallet UI components
- **Wagmi** - For Web3 wallet management
- **Smart Wallets** - Default to Coinbase Smart Wallet for better UX

## Setup

The wallet providers are already configured in `app/providers.tsx` with:
- WagmiProvider with multi-chain support
- QueryClientProvider for React Query
- MiniKitProvider for Coinbase Mini App features

### Supported Chains

- Base (primary)
- Ethereum Mainnet
- Sepolia
- Base Sepolia
- Polygon
- Arbitrum
- Optimism

## Components

### 1. WalletConnect (Full Featured)

The main wallet component with auto-modal and full functionality.

```tsx
import { WalletConnect } from '@/components/WalletConnect';

// Basic usage - shows modal automatically when not connected
<WalletConnect />

// Custom configuration
<WalletConnect 
  className="z-10"
  autoShowModal={false}
  showBalance={true}
  connectText="Connect Your Wallet"
/>
```

**Props:**
- `className?: string` - Custom styling
- `autoShowModal?: boolean` - Auto-show modal when disconnected (default: true)
- `showBalance?: boolean` - Show ETH balance in button (default: false)
- `connectText?: string` - Custom button text

### 2. CompactWalletConnect

Minimal version without auto-modal, perfect for navigation bars.

```tsx
import { CompactWalletConnect } from '@/components/WalletConnect';

<CompactWalletConnect className="ml-auto" />
```

### 3. WalletConnectButton

Simple button-only component for CTAs.

```tsx
import { WalletConnectButton } from '@/components/WalletConnect';

<WalletConnectButton 
  text="Get Started"
  className="btn-primary"
/>
```

## Using Wallet Data

### Get Connected Account

```tsx
import { useAccount } from 'wagmi';

function MyComponent() {
  const { address, isConnected, isConnecting, isDisconnected } = useAccount();
  
  if (isConnecting) return <div>Connecting...</div>;
  if (isDisconnected) return <div>Please connect wallet</div>;
  
  return <div>Connected: {address}</div>;
}
```

### Get Account Balance

```tsx
import { useBalance } from 'wagmi';

function BalanceDisplay() {
  const { address } = useAccount();
  const { data: balance } = useBalance({
    address,
  });
  
  return (
    <div>
      Balance: {balance?.formatted} {balance?.symbol}
    </div>
  );
}
```

### Read Token Balances

```tsx
import { useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';

function TokenBalance({ tokenAddress }: { tokenAddress: string }) {
  const { address } = useAccount();
  const { data: balance } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });
  
  return <div>Token Balance: {balance?.toString()}</div>;
}
```

### Switch Networks

```tsx
import { useSwitchChain } from 'wagmi';
import { base } from 'wagmi/chains';

function NetworkSwitcher() {
  const { switchChain } = useSwitchChain();
  
  return (
    <button onClick={() => switchChain({ chainId: base.id })}>
      Switch to Base
    </button>
  );
}
```

## Integration with Token Selectors

Combine wallet connection with the network and token selectors:

```tsx
import { useState } from 'react';
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { WalletConnect } from '@/components/WalletConnect';
import { NetworkSelector, TokenSelector } from '@/components';
import { erc20Abi, formatUnits } from 'viem';

function SwapInterface() {
  const { address, isConnected } = useAccount();
  const [selectedChain, setSelectedChain] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);
  
  // Get token balance
  const { data: tokenBalance } = useReadContract({
    address: selectedToken?.address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address && selectedToken ? [address] : undefined,
    query: {
      enabled: !!address && !!selectedToken && selectedToken.address !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    },
  });
  
  // Get native balance (ETH, MATIC, etc.)
  const { data: nativeBalance } = useBalance({
    address,
    query: {
      enabled: !!address && selectedToken?.address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    },
  });
  
  const displayBalance = selectedToken?.address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    ? nativeBalance?.formatted
    : tokenBalance 
      ? formatUnits(tokenBalance, selectedToken?.decimals || 18)
      : '0';
  
  return (
    <div className="space-y-4">
      <WalletConnect />
      
      {isConnected && (
        <>
          <NetworkSelector
            value={selectedChain}
            onSelect={setSelectedChain}
            placeholder="Select Network"
          />
          
          {selectedChain && (
            <TokenSelector
              value={selectedToken}
              onSelect={setSelectedToken}
              chainId={selectedChain.id}
              placeholder="Select Token"
            />
          )}
          
          {selectedToken && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Your Balance</p>
              <p className="text-lg font-semibold">
                {displayBalance} {selectedToken.symbol}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

## Environment Variables

Make sure these are set in your `.env.local`:

```bash
# OnchainKit API Key (from Coinbase Developer Portal)
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_api_key_here

# Optional: Project customization
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=Klyra
NEXT_PUBLIC_ICON_URL=https://your-icon-url.com/icon.png
```

## Wallet Features

### Smart Wallet Benefits

The integration defaults to Coinbase Smart Wallet which provides:
- **Gasless transactions** - Sponsored by your app
- **Email/Social login** - No seed phrases needed
- **Batch transactions** - Multiple operations in one
- **Better UX** - Simplified user experience

### Wallet Dropdown Features

When connected, users can:
- View their avatar and name (ENS/basename)
- Copy their address with one click
- See their ETH balance
- Disconnect their wallet

## Best Practices

1. **Always check connection status** before wallet operations
2. **Handle loading and error states** gracefully
3. **Show clear wallet prompts** when actions require connection
4. **Use appropriate component** for your UI context:
   - `WalletConnect` for main pages
   - `CompactWalletConnect` for headers/nav
   - `WalletConnectButton` for CTAs

## Example: Complete Swap Page

```tsx
import { WalletConnect } from '@/components/WalletConnect';
import { NetworkSelector, TokenSelector } from '@/components';
import { useSwap } from '@/hooks/useSwap';
import { useAccount } from 'wagmi';

export default function SwapPage() {
  const { isConnected } = useAccount();
  const {
    srcChainId,
    setSrcChainId,
    srcToken,
    setSrcToken,
    // ... other swap state
  } = useSwap();
  
  return (
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-8">
        <h1>Swap</h1>
        <WalletConnect className="ml-auto" autoShowModal={false} />
      </header>
      
      {!isConnected ? (
        <div className="text-center p-8">
          <p className="mb-4">Connect your wallet to start swapping</p>
          <WalletConnectButton text="Connect Wallet" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Your swap interface */}
        </div>
      )}
    </div>
  );
}
```

## Troubleshooting

### Modal doesn't appear
- Check that `NEXT_PUBLIC_ONCHAINKIT_API_KEY` is set
- Ensure providers are properly wrapped in layout

### Balance not showing
- Verify the token address is correct
- Check that the chain is supported
- Ensure wallet is connected to the right network

### Transaction fails
- Confirm user has sufficient balance
- Check gas settings
- Verify contract addresses are correct for the network

## Additional Resources

- [OnchainKit Documentation](https://onchainkit.xyz)
- [Wagmi Documentation](https://wagmi.sh)
- [Coinbase Smart Wallet](https://www.coinbase.com/wallet/smart-wallet)


