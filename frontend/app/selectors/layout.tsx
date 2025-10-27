import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Network & Token Selectors | Klyra',
  description: 'Interactive demo of blockchain network and token selection components',
};

export default function SelectorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

