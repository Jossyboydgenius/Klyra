'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useWalletBalances, type TokenBalance } from '@/hooks/useWalletBalances';
import { Web3Card, Web3Button } from './Web3Theme';
import { Wallet, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { getChainLogo } from '@/lib/chain-logos';
import Image from 'next/image';

interface WalletBalanceListProps {
  onSelectToken?: (balance: TokenBalance) => void;
}

export function WalletBalanceList({ onSelectToken }: WalletBalanceListProps) {
  const { address, isConnected } = useAccount();
  const [includeTestnets, setIncludeTestnets] = useState(false);
  
  const { balances, isLoading, isEmpty } = useWalletBalances(
    address,
    undefined, // All chains
    includeTestnets
  );

  if (!isConnected || !address) {
    return (
      <Web3Card className="p-6 text-center">
        <Wallet className="w-12 h-12 mx-auto mb-4 text-indigo-400/50" />
        <p className="text-indigo-200/80">Connect your wallet to view balances</p>
      </Web3Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Testnet Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Wallet Balances</h2>
          <p className="text-sm text-indigo-200/80">
            {address.slice(0, 6)}...{address.slice(-4)}
          </p>
        </div>
        <button
          onClick={() => setIncludeTestnets(!includeTestnets)}
          className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
        >
          {includeTestnets ? (
            <ToggleRight className="w-5 h-5" />
          ) : (
            <ToggleLeft className="w-5 h-5" />
          )}
          <span>Testnets</span>
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Web3Card className="p-6 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-indigo-400" />
          <p className="text-indigo-200/80">Loading balances...</p>
        </Web3Card>
      )}

      {/* Empty State */}
      {!isLoading && isEmpty && (
        <Web3Card className="p-6 text-center">
          <Wallet className="w-12 h-12 mx-auto mb-4 text-indigo-400/50" />
          <p className="text-indigo-200/80">No balances found</p>
          <p className="text-sm text-indigo-300/60 mt-1">
            {includeTestnets ? 'Try switching to mainnet only' : 'Try enabling testnets'}
          </p>
        </Web3Card>
      )}

      {/* Balance List */}
      {!isLoading && !isEmpty && (
        <div className="space-y-2">
          {balances.map((balance, index) => {
            const chainLogo = getChainLogo(balance.chain.id, balance.chain.testnet);
            return (
              <Web3Card
                key={`${balance.chain.id}-${balance.token.address}-${index}`}
                className={`p-4 cursor-pointer hover:bg-white/10 transition-all ${
                  onSelectToken ? 'hover:border-blue-400/50' : ''
                }`}
                onClick={() => onSelectToken?.(balance)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Chain Logo */}
                    {chainLogo ? (
                      <div className="relative shrink-0">
                        <img
                          src={chainLogo}
                          alt={balance.chain.name}
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        {balance.chain.testnet && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                            <span className="text-[8px] text-white font-bold">T</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        balance.chain.testnet ? 'bg-orange-500' : 'bg-green-500'
                      }`} />
                    )}
                    
                    {/* Token Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white truncate">
                          {balance.token.symbol}
                        </span>
                        {balance.chain.testnet && (
                          <span className="text-xs text-orange-400">(Testnet)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-indigo-200/80">
                        <span className="truncate">{balance.chain.name}</span>
                      </div>
                    </div>
                    
                    {/* Balance */}
                    <div className="text-right shrink-0">
                      <div className="font-medium text-white">
                        {parseFloat(balance.balanceFormatted).toFixed(8)}
                      </div>
                      <div className="text-xs text-indigo-300/70 truncate max-w-[100px]">
                        {balance.token.symbol}
                      </div>
                    </div>
                  </div>
                </div>
              </Web3Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

