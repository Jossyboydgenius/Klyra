import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Token Swap | Klyra',
  description: 'Swap tokens across chains with the best rates from multiple DEX aggregators',
};

export default function SwapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

