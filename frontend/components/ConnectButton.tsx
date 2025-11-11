'use client';

import '@reown/appkit-wallet-button/react';

export default function ConnectButton() {
  // @ts-expect-error - AppKitButton is not typed
  return <appkit-button />
}