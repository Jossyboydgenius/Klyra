"use client";

import { type ReactNode, useEffect } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base, mainnet, sepolia, baseSepolia, polygon, arbitrum, optimism } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { coinbaseWallet } from "wagmi/connectors";
import { NetworkProvider } from "@/contexts/NetworkContext";

// Create wagmi config with Coinbase Wallet connector
const wagmiConfig = createConfig({
  chains: [base, mainnet, sepolia, baseSepolia, polygon, arbitrum, optimism],
  connectors: [
    coinbaseWallet({
      appName: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Klyra",
      preference: "smartWalletOnly", // Use smart wallet for better UX
    }),
  ],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [baseSepolia.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
  },
  ssr: true,
});

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers(props: { children: ReactNode }) {
  // Suppress non-critical OnchainKit analytics errors
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;

    // Override console.error to filter out ClientMetaManager errors
    console.error = (...args: any[]) => {
      const errorMessage = args[0]?.toString() || '';
      // Suppress ClientMetaManager not initialized errors (non-critical analytics errors)
      if (
        errorMessage.includes('ClientMetaManager not initialized') ||
        errorMessage.includes('Error sending analytics')
      ) {
        return; // Silently ignore
      }
      originalError.apply(console, args);
    };

    // Override console.warn for similar analytics warnings
    console.warn = (...args: any[]) => {
      const warnMessage = args[0]?.toString() || '';
      if (warnMessage.includes('ClientMetaManager') || warnMessage.includes('analytics')) {
        return; // Silently ignore
      }
      originalWarn.apply(console, args);
    };

    // Cleanup: restore original console methods
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <NetworkProvider>
          <MiniKitProvider>
            {props.children}
          </MiniKitProvider>
        </NetworkProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
