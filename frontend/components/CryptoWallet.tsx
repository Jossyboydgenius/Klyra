/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import React, { useState } from 'react';
import { Web3Container, Web3Card, Web3Button } from './Web3Theme';
import { Badge } from './ui/badge';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Eye,
  EyeOff,
  Network,
  Plus,
  Minus,
  Loader2
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { useWalletBalances } from '@/hooks/useWalletBalances';
import { getChainLogo } from '@/lib/chain-logos';
import { CRYPTO_INFO } from '@/lib/constants';

interface CryptoWalletProps {
  balances: any;
  onAssetSelectAction: (asset: string) => void;
}

interface CryptoAsset {
  symbol: string;
  amount: number;
  hasBalance: boolean;
  name: string;
  color: string;
  price_ghs: number;
  price_usd: number;
  change: string;
  trending: string;
}

export const CryptoWallet: React.FC<CryptoWalletProps> = ({ balances, onAssetSelectAction }) => {
  const [showBalances, setShowBalances] = useState(true);
  const [currency, setCurrency] = useState('GHS');
  const [includeTestnets, setIncludeTestnets] = useState(false);
  const { address, isConnected } = useAccount();
  
  // Get real wallet balances
  const { balances: walletBalances, isLoading: isLoadingBalances } = useWalletBalances(
    address,
    undefined,
    includeTestnets
  );

  const formatAmount = (amount: number, currency: string) => {
    if (!showBalances) return '••••••';
    return `${currency} ${amount.toLocaleString()}`;
  };

  const getTotalPortfolioValue = () => {
    if (isConnected && walletBalances && walletBalances.length > 0) {
      // Calculate from real wallet balances
      let total = 0;
      walletBalances.forEach((balance) => {
        const cryptoInfo = CRYPTO_INFO[balance.token.symbol as keyof typeof CRYPTO_INFO];
        if (cryptoInfo) {
          const price = currency === 'GHS' ? cryptoInfo.price_ghs : cryptoInfo.price_usd;
          total += parseFloat(balance.balanceFormatted) * price;
        }
      });
      return total;
    }
    
    // Fallback to dummy data
    if (!balances?.crypto) return 0;
    let total = 0;
    Object.entries(balances.crypto).forEach(([symbol, data]: [string, any]) => {
      if (data.amount > 0) {
        const cryptoInfo = CRYPTO_INFO[symbol as keyof typeof CRYPTO_INFO];
        if (cryptoInfo) {
          const price = currency === 'GHS' ? cryptoInfo.price_ghs : cryptoInfo.price_usd;
          total += data.amount * price;
        }
      }
    });
    return total;
  };

  const getAllCryptoAssets = () => {
    if (isConnected && walletBalances && walletBalances.length > 0) {
      // Return real wallet balances
      return walletBalances.map((balance) => {
        const cryptoInfo = CRYPTO_INFO[balance.token.symbol as keyof typeof CRYPTO_INFO] || {
          name: balance.token.name,
          color: 'bg-gray-100 text-gray-600',
          price_ghs: 0,
          price_usd: 0,
          change: '0%',
          trending: 'stable' as const,
        };
        
        return {
          symbol: balance.token.symbol,
          amount: parseFloat(balance.balanceFormatted),
          hasBalance: true,
          chain: balance.chain.name,
          chainId: balance.chain.id,
          ...cryptoInfo,
        };
      });
    }
    
    // Fallback to dummy data
    const assets: CryptoAsset[] = [];
    if (balances?.crypto) {
      Object.entries(balances.crypto).forEach(([symbol, data]: [string, any]) => {
        if (data.amount > 0) {
          assets.push({
            symbol,
            amount: data.amount,
            hasBalance: true,
            ...CRYPTO_INFO[symbol as keyof typeof CRYPTO_INFO]
          });
        }
      });
    }
    
    // Add available assets without balances
    Object.entries(CRYPTO_INFO).forEach(([symbol, info]) => {
      const hasBalance = balances?.crypto?.[symbol]?.amount > 0;
      if (!hasBalance) {
        assets.push({
          symbol,
          amount: 0,
          hasBalance: false,
          ...info
        });
      }
    });
    
    return assets;
  };

  const allAssets = getAllCryptoAssets();

  return (
    <Web3Container>
      <div className="max-w-md mx-auto space-y-6">
        {/* Portfolio Summary */}
        <Web3Card className="bg-gradient-to-r from-purple-600/30 to-blue-600/30 border-purple-500/30">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-indigo-200/80 text-sm">Total Portfolio Value</p>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold text-white">
                  {formatAmount(getTotalPortfolioValue(), currency)}
                </h2>
                <Web3Button
                  variant="ghost"
                  onClick={() => setShowBalances(!showBalances)}
                  className="text-white hover:bg-white/10 p-1"
                  icon
                >
                  {showBalances ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Web3Button>
              </div>
            </div>
            <div className="text-right">
              <Badge className="bg-green-400/20 text-green-400 border-green-400/30 mb-2">
                <TrendingUp className="w-3 h-3 mr-1" />
                +5.2%
              </Badge>
              <Web3Button
                variant="ghost"
                className="text-white hover:bg-white/10 p-1 block ml-auto"
                icon
              >
                <RefreshCw className="w-4 h-4" />
              </Web3Button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Web3Button
              variant="secondary"
              className="bg-white/20 text-white hover:bg-white/30 border-0"
              onClick={() => setCurrency(currency === 'GHS' ? 'USD' : 'GHS')}
            >
              {currency === 'GHS' ? 'Switch to USD' : 'Switch to GHS'}
            </Web3Button>
          </div>
        </Web3Card>

        {/* Universal Wallet Info */}
        <Web3Card className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-indigo-400/30">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <Network className="w-5 h-5 text-indigo-300 mt-0.5" />
              <div>
                <h3 className="font-semibold text-white mb-1">Multi-Chain Wallet</h3>
                <p className="text-sm text-indigo-200/80">
                  {isConnected 
                    ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}`
                    : 'Connect your wallet to view balances across all chains'
                  }
                </p>
              </div>
            </div>
            {isConnected && (
              <button
                onClick={() => setIncludeTestnets(!includeTestnets)}
                className="text-xs text-indigo-300 hover:text-indigo-200 px-2 py-1 rounded bg-white/10"
              >
                {includeTestnets ? 'Hide Testnets' : 'Show Testnets'}
              </button>
            )}
          </div>
        </Web3Card>

        {/* Crypto Assets */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">
            Your Assets
            {isConnected && walletBalances && (
              <span className="text-sm text-indigo-300/80 ml-2">
                ({walletBalances.length} tokens)
              </span>
            )}
          </h3>
          
          {!isConnected ? (
            <Web3Card className="p-6 text-center">
              <Wallet className="w-12 h-12 text-indigo-200/70 mx-auto mb-3" />
              <p className="text-indigo-200/70 mb-3">Connect your wallet to view your assets</p>
            </Web3Card>
          ) : isLoadingBalances ? (
            <Web3Card className="p-6 text-center">
              <Loader2 className="w-8 h-8 text-indigo-400 mx-auto mb-3 animate-spin" />
              <p className="text-indigo-200/70">Loading wallet balances...</p>
            </Web3Card>
          ) : allAssets.length === 0 ? (
            <Web3Card className="p-6 text-center">
              <Wallet className="w-12 h-12 text-indigo-200/70 mx-auto mb-3" />
              <p className="text-indigo-200/70">No assets found in your wallet</p>
            </Web3Card>
          ) : (
            allAssets.map((asset: any, index: number) => {
            const value = asset.amount * (currency === 'GHS' ? asset.price_ghs : asset.price_usd);
            
            return (
              <Web3Card 
                key={`${asset.symbol}-${asset.chainId || 'unknown'}-${index}`}
                className="cursor-pointer hover:bg-white/10 transition-all duration-300"
                onClick={() => onAssetSelectAction(asset.symbol)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {asset.chainId ? (
                      <div className="relative">
                        <img 
                          src={getChainLogo(asset.chainId, asset.chain?.testnet) || ''} 
                          alt={asset.chain}
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        {asset.chain?.testnet && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                            <span className="text-[8px] text-white font-bold">T</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{asset.symbol}</p>
                        {asset.chain && asset.chain !== 'Unknown' && (
                          <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/30 text-xs">
                            {asset.chain}
                          </Badge>
                        )}
                        {asset.change && (
                          <Badge 
                            className={`${
                              asset.trending === 'up' 
                                ? 'bg-green-400/20 text-green-400 border-green-400/30' 
                                : 'bg-red-400/20 text-red-400 border-red-400/30'
                            }`}
                          >
                            {asset.trending === 'up' ? 
                              <TrendingUp className="w-3 h-3 mr-1" /> : 
                              <TrendingDown className="w-3 h-3 mr-1" />
                            }
                            {asset.change}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-indigo-200/70">
                        {asset.chain && asset.chain !== 'Unknown' ? asset.chain : asset.name}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {asset.hasBalance ? (
                      <>
                        <p className="font-semibold text-white">
                          {showBalances ? `${asset.amount.toFixed(6)} ${asset.symbol}` : '••••••'}
                        </p>
                        <p className="text-sm text-indigo-200/70">
                          {formatAmount(value, currency)}
                        </p>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-indigo-200/70">No balance</p>
                        <Web3Button
                          variant="ghost"
                          className="p-1"
                          icon
                        >
                          <Plus className="w-4 h-4" />
                        </Web3Button>
                      </div>
                    )}
                  </div>
                </div>
              </Web3Card>
            );
            })
          )}
        </div>

        {/* Quick Actions */}
        <Web3Card>
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Web3Button className="flex flex-col items-center gap-2 p-4 h-auto">
              <Plus className="w-6 h-6" />
              <span className="text-sm">Buy Crypto</span>
            </Web3Button>
            <Web3Button 
              variant="secondary" 
              className="flex flex-col items-center gap-2 p-4 h-auto"
            >
              <Minus className="w-6 h-6" />
              <span className="text-sm">Sell Crypto</span>
            </Web3Button>
          </div>
        </Web3Card>
      </div>
    </Web3Container>
  );
};
