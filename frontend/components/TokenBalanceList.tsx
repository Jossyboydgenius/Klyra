'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Send, RefreshCw } from 'lucide-react';
import { useWalletBalances } from '@/hooks/useWalletBalances';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import Image from 'next/image';

interface TokenBalanceListProps {
  onTokenSelect?: (token: TokenBalance) => void;
  showSendButton?: boolean;
}

export interface TokenBalance {
  chain: { id: number; name: string; testnet?: boolean };
  token: {
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
    address: string;
  };
  balance: string;
  balanceFormatted: string;
}

export function TokenBalanceList({ 
  onTokenSelect, 
  showSendButton = true 
}: TokenBalanceListProps) {
  const { address, isConnected } = useAccount();
  const { balances, isLoading, isEmpty } = useWalletBalances(address);

  const formatBalance = (balance: string, decimals: number = 18) => {
    try {
      const num = parseFloat(balance);
      if (num === 0) return '0.00';
      if (num < 0.000001) return '< 0.000001';
      if (num < 1) return num.toFixed(6);
      if (num < 1000) return num.toFixed(2);
      return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    } catch {
      return '0.00';
    }
  };

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Connect your wallet to view balances
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading balances...</p>
        </CardContent>
      </Card>
    );
  }

  if (isEmpty || !balances || balances.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Token Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No token balances found
            </p>
            <p className="text-sm text-muted-foreground">
              Connect a wallet with tokens to get started
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Token Balances ({balances.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {balances.map((balanceItem, index) => {
            const tokenBalance = balanceItem as any; // Type assertion needed
            return (
              <div
                key={`${tokenBalance.token.address}-${tokenBalance.chain.id}-${index}`}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Token Logo */}
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    {tokenBalance.token.logoURI ? (
                      <Image
                        src={tokenBalance.token.logoURI}
                        alt={tokenBalance.token.symbol}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-bold">
                        {tokenBalance.token.symbol.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Token Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">
                        {tokenBalance.token.symbol}
                      </p>
                      {tokenBalance.chain.testnet && (
                        <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                          Testnet
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{tokenBalance.token.name}</span>
                      <span>•</span>
                      <span className="truncate">{tokenBalance.chain.name}</span>
                    </div>
                  </div>
                </div>

                {/* Balance */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatBalance(tokenBalance.balanceFormatted, tokenBalance.token.decimals)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tokenBalance.token.symbol}
                    </p>
                  </div>

                  {showSendButton && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onTokenSelect && onTokenSelect(tokenBalance)}
                      className="flex-shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

