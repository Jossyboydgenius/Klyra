"use client";

import { type ReactNode, useEffect } from "react";
import { Config, WagmiProvider, cookieToInitialState, createConfig, http } from "wagmi";
import { base, mainnet, sepolia, baseSepolia, polygon, arbitrum, optimism } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { coinbaseWallet } from "wagmi/connectors";
import { NetworkProvider } from "@/contexts/NetworkContext";
import { createAppKit } from "@reown/appkit";
import { config, projectId, wagmiAdapter } from "@/contexts/wagmi";


// Set up queryClient
const queryClient = new QueryClient()

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// Set up metadata
const metadata = {
  name: 'appkit-example',
  description: 'AppKit Example',
  url: 'https://appkitexampleapp.com', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

// Create the modal
const modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [base, mainnet, sepolia, baseSepolia, polygon, arbitrum, optimism],
  defaultNetwork: mainnet,
  metadata: metadata,
  features: {
    analytics: true // Optional - defaults to your Cloud configuration
  }
})
export function Providers(props: { children: ReactNode; cookies: string | null }) {
  // Suppress non-critical OnchainKit analytics errors
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, props.cookies)
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
    <WagmiProvider config={config} initialState={initialState}>
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
