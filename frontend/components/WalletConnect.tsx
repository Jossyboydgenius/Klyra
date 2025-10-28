"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
  WalletModal,
} from "@coinbase/onchainkit/wallet";
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";

interface WalletConnectProps {
  /**
   * Custom className for styling the wallet container
   */
  className?: string;
  /**
   * Whether to show the modal automatically when not connected
   * @default true
   */
  autoShowModal?: boolean;
  /**
   * Whether to show balance in the connect button
   * @default false
   */
  showBalance?: boolean;
  /**
   * Custom button text when wallet is not connected
   */
  connectText?: string;
}

/**
 * WalletConnect Component
 * 
 * A reusable wallet connection component built with OnchainKit that provides:
 * - Coinbase Wallet connection
 * - Smart wallet support
 * - Modal for wallet selection
 * - Dropdown showing user identity, balance, and disconnect option
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <WalletConnect />
 * 
 * // Custom styling and behavior
 * <WalletConnect 
 *   className="custom-class"
 *   autoShowModal={false}
 *   showBalance={true}
 *   connectText="Connect Your Wallet"
 * />
 * ```
 */
export function WalletConnect({
  className,
  autoShowModal = true,
  showBalance = false,
  connectText,
}: WalletConnectProps) {
  const { isConnected } = useAccount();
  const [showModal, setShowModal] = useState(false);

  // Auto-show modal when wallet is not connected
  useEffect(() => {
    if (autoShowModal && !isConnected) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [isConnected, autoShowModal]);

  return (
    <>
      <Wallet className={className}>
        <ConnectWallet text={connectText}>
          <Name className="text-inherit" />
          {showBalance && <EthBalance />}
        </ConnectWallet>
        <WalletDropdown>
          <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar />
            <Name />
            <Address />
            <EthBalance />
          </Identity>
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
      <WalletModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}

/**
 * CompactWalletConnect Component
 * 
 * A minimal version of the wallet connect component without the auto-modal
 * Useful for navigation bars and compact UI areas
 */
export function CompactWalletConnect({ className }: { className?: string }) {
  return (
    <Wallet className={className}>
      <ConnectWallet>
        <Name className="text-inherit" />
      </ConnectWallet>
      <WalletDropdown>
        <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
          <Avatar />
          <Name />
          <Address />
          <EthBalance />
        </Identity>
        <WalletDropdownDisconnect />
      </WalletDropdown>
    </Wallet>
  );
}

/**
 * WalletConnectButton Component
 * 
 * A simple button-only wallet connect component without dropdown or modal
 * Useful for CTAs and simple connection flows
 */
export function WalletConnectButton({
  className,
  text,
}: {
  className?: string;
  text?: string;
}) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Wallet className={className}>
        <ConnectWallet text={text} onClick={() => setShowModal(true)}>
          <Name className="text-inherit" />
        </ConnectWallet>
      </Wallet>
      <WalletModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}



