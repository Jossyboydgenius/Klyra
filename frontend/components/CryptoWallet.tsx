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
  Minus
} from 'lucide-react';

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

const CRYPTO_INFO = {
  'BTC': { 
    name: 'Bitcoin', 
    color: 'bg-orange-100 text-orange-600',
    price_ghs: 537500,
    price_usd: 43000,
    change: '+2.4%',
    trending: 'up'
  },
  'ETH': { 
    name: 'Ethereum', 
    color: 'bg-blue-100 text-blue-600',
    price_ghs: 30000,
    price_usd: 2400,
    change: '+1.8%',
    trending: 'up'
  },
  'BNB': { 
    name: 'BNB', 
    color: 'bg-yellow-100 text-yellow-600',
    price_ghs: 4000,
    price_usd: 320,
    change: '+0.9%',
    trending: 'up'
  },
  'USDT': { 
    name: 'Tether', 
    color: 'bg-green-100 text-green-600',
    price_ghs: 12.5,
    price_usd: 1,
    change: '+0.01%',
    trending: 'up'
  }
};

export const CryptoWallet: React.FC<CryptoWalletProps> = ({ balances, onAssetSelectAction }) => {
  const [showBalances, setShowBalances] = useState(true);
  const [currency, setCurrency] = useState('GHS');

  const formatAmount = (amount: number, currency: string) => {
    if (!showBalances) return '••••••';
    return `${currency} ${amount.toLocaleString()}`;
  };

  const getTotalPortfolioValue = () => {
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

  const getAllCryptoAssets = (): CryptoAsset[] => {
    const assets: CryptoAsset[] = [];
    
    // Add assets with balances
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

  const allAssets: CryptoAsset[] = getAllCryptoAssets();

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
          <div className="flex items-start gap-3">
            <Network className="w-5 h-5 text-indigo-300 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white mb-1">Multi-Chain Wallet</h3>
              <p className="text-sm text-indigo-200/80">
                Your wallet supports Bitcoin, Ethereum, BNB Smart Chain, and more networks.
              </p>
            </div>
          </div>
        </Web3Card>

        {/* Crypto Assets */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Your Assets</h3>
          
          {allAssets.map((asset) => {
            const value = asset.amount * (currency === 'GHS' ? asset.price_ghs : asset.price_usd);
            
            return (
              <Web3Card 
                key={asset.symbol}
                className="cursor-pointer hover:bg-white/10 transition-all duration-300"
                onClick={() => onAssetSelectAction(asset.symbol)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white">{asset.symbol}</p>
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
                      </div>
                      <p className="text-sm text-indigo-200/70">{asset.name}</p>
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
          })}
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
