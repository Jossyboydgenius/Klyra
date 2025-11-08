'use client';

import { useEffect } from 'react';
import { Wallet } from 'lucide-react';
import clsx from 'clsx';

import '@reown/appkit-wallet-button/react';
import { initAppKit, openAppKitModal } from '@/lib/appkit';

interface AppKitWalletConnectButtonProps {
  className?: string;
  label?: string;
  description?: string;
}

export function AppKitWalletConnectButton({
  className,
  label = 'Connect with AppKit',
  description = 'WalletConnect + multisig support',
}: AppKitWalletConnectButtonProps) {
  useEffect(() => {
    initAppKit();
  }, []);

  return (
    <button
      type="button"
      onClick={openAppKitModal}
      className={clsx(
        'group flex w-full items-center justify-between rounded-2xl border border-indigo-500/40 bg-indigo-950/40 px-5 py-4 text-left shadow-[0_10px_30px_-12px_rgba(99,102,241,0.45)] transition hover:-translate-y-0.5 hover:border-indigo-400/70 hover:bg-indigo-900/50 hover:shadow-[0_18px_40px_-14px_rgba(99,102,241,0.65)] focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:ring-offset-2 focus:ring-offset-slate-950',
        className
      )}
      data-testid="appkit-wallet-connect-button"
    >
      <div className="flex items-center gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 transition group-hover:bg-indigo-400/20 group-hover:text-indigo-200">
          <Wallet className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-base font-semibold text-white">{label}</p>
          <p className="text-sm text-indigo-200/80">{description}</p>
        </div>
      </div>
      <span className="rounded-full border border-indigo-500/50 bg-indigo-500/15 px-3 py-1 text-xs font-medium uppercase tracking-wide text-indigo-200/90">
        AppKit
      </span>
    </button>
  );
}

