'use client';

import { createAppKit } from '@reown/appkit';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import {
  arbitrum,
  base,
  baseSepolia,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from '@reown/appkit/networks';
import type { AppKitNetwork } from '@reown/appkit/networks';

const projectId =
  process.env.NEXT_PUBLIC_APPKIT_PROJECT_ID ??
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
  'b56e18d47c72ab683b10814fe9495694';

const appUrl = process.env.NEXT_PUBLIC_URL ?? 'https://klyra-dun.vercel.app';

const networks = [
  base,
  mainnet,
  polygon,
  arbitrum,
  optimism,
  sepolia,
  baseSepolia,
] as [AppKitNetwork, ...AppKitNetwork[]];

const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
  ssr: true,
});

const metadata = {
  name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME ?? 'Klyra',
  description:
    'Klyra – connect banks, mobile money, and crypto wallets in a unified experience.',
  url: appUrl,
  icons: [`${appUrl}/favicon.ico`],
};

let appKitInstance: ReturnType<typeof createAppKit> | undefined;

export const initAppKit = () => {
  if (typeof window === 'undefined') return undefined;
  if (!projectId) {
    console.warn(
      'AppKit project id missing: set NEXT_PUBLIC_APPKIT_PROJECT_ID or NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID'
    );
    return undefined;
  }

  if (!appKitInstance) {
    appKitInstance = createAppKit({
      adapters: [wagmiAdapter],
      projectId,
      networks,
      defaultNetwork: base,
      metadata,
      themeMode: 'dark',
      themeVariables: {
        '--w3m-font-family': 'var(--font-outfit, "Outfit", sans-serif)',
        '--w3m-accent': '#6366f1',
        '--w3m-color-mix': '#7c3aed',
        '--w3m-color-mix-strength': 20,
        '--w3m-border-radius-master': '16px',
        '--w3m-font-size-master': '16px',
      },
      features: {
        analytics: true,
      },
    });
  }

  return appKitInstance;
};

export const openAppKitModal = () => {
  const instance = initAppKit();
  instance?.open();
};

