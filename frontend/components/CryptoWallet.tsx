/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
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
  onAssetSelect: (asset: string) => void;
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
    change: '0.0%',
    trending: 'stable'
  },
  'USDC': { 
    name: 'USD Coin', 
    color: 'bg-blue-100 text-blue-600',
    price_ghs: 12.5,
    price_usd: 1,
    change: '0.0%',
    trending: 'stable'
  }
};

const NETWORKS = {
  'mainnet': { name: 'Ethereum', color: 'bg-gray-100 text-gray-700' },
  'base': { name: 'Base', color: 'bg-blue-100 text-blue-700' },
  'bsc': { name: 'BSC', color: 'bg-yellow-100 text-yellow-700' }
};

export const CryptoWallet: React.FC<CryptoWalletProps> = ({ balances, onAssetSelect }) => {
  const [showBalances, setShowBalances] = useState(true);
  const [currency, setCurrency] = useState('GHS');

  const formatAmount = (amount: number, currency: string = 'GHS') => {
    if (!showBalances) return '••••••';
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: currency === 'GHS' ? 'GHS' : 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatCryptoAmount = (amount: number, symbol: string) => {
    if (!showBalances) return '••••••';
    return `${amount.toFixed(6)} ${symbol}`;
  };

  const getTotalPortfolioValue = () => {
    if (!balances?.crypto) return 0;
    
    let total = 0;
    Object.entries(balances.crypto).forEach(([symbol, data]: [string, any]) => {
      if (data.amount > 0) {
        const cryptoInfo = CRYPTO_INFO[symbol as keyof typeof CRYPTO_INFO];
        const price = currency === 'GHS' ? cryptoInfo.price_ghs : cryptoInfo.price_usd;
        total += data.amount * price;
      }
    });
    
    return total;
  };

  const getActiveCryptoAssets = () => {
    if (!balances?.crypto) return [];
    return Object.entries(balances.crypto)
      .filter(([_, data]: [string, any]) => data.amount > 0)
      .sort(([a], [b]) => a.localeCompare(b));
  };

  const getAllCryptoAssets = () => {
    if (!balances?.crypto) return [];
    return Object.entries(balances.crypto).sort(([a], [b]) => a.localeCompare(b));
  };

  const getAssetValue = (symbol: string, amount: number) => {
    const cryptoInfo = CRYPTO_INFO[symbol as keyof typeof CRYPTO_INFO];
    const price = currency === 'GHS' ? cryptoInfo.price_ghs : cryptoInfo.price_usd;
    return amount * price;
  };

  const activeAssets = getActiveCryptoAssets();
  const allAssets = getAllCryptoAssets();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Portfolio Summary */}
        <Card className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-purple-100 text-sm">Total Portfolio Value</p>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold">
                  {formatAmount(getTotalPortfolioValue(), currency)}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBalances(!showBalances)}
                  className="text-white hover:bg-white/10 p-1"
                >
                  {showBalances ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="bg-green-100 text-green-800 mb-2">
                <TrendingUp className="w-3 h-3 mr-1" />
                +5.2%
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 p-1 block ml-auto"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 text-white hover:bg-white/30 border-0"
              onClick={() => setCurrency(currency === 'GHS' ? 'USD' : 'GHS')}
            >
              {currency === 'GHS' ? 'Switch to USD' : 'Switch to GHS'}
            </Button>
          </div>
        </Card>

        {/* Universal Wallet Info */}
        <Card className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <div className="flex items-start gap-3">
            <Network className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <p className="font-medium text-indigo-900 mb-1">Universal Wallet</p>
              <p className="text-sm text-indigo-700">
                Your crypto works seamlessly across Ethereum, Base, BSC, and other supported networks.
              </p>
            </div>
          </div>
        </Card>

        {/* Active Assets */}
        {activeAssets.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Your Assets</h3>
            <div className="space-y-3">
              {activeAssets.map(([symbol, data]: [string, any]) => {
                const cryptoInfo = CRYPTO_INFO[symbol as keyof typeof CRYPTO_INFO];
                const value = getAssetValue(symbol, data.amount);
                
                return (
                  <Card 
                    key={symbol} 
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onAssetSelect(symbol)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full ${cryptoInfo.color} flex items-center justify-center`}>
                          <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{symbol}</p>
                            <Badge 
                              variant="secondary" 
                              className={`${
                                cryptoInfo.trending === 'up' ? 'bg-green-100 text-green-800' : 
                                cryptoInfo.trending === 'down' ? 'bg-red-100 text-red-800' : 
                                'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {cryptoInfo.trending === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
                              {cryptoInfo.trending === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
                              {cryptoInfo.change}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{cryptoInfo.name}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCryptoAmount(data.amount, symbol)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatAmount(value, currency)}
                        </p>
                      </div>
                    </div>

                    {/* Network Distribution */}
                    <div className="mt-3 flex gap-2">
                      {Object.entries(data.networks).map(([network, amount]: [string, any]) => {
                        if (amount > 0) {
                          const networkInfo = NETWORKS[network as keyof typeof NETWORKS];
                          return (
                            <Badge 
                              key={network} 
                              variant="secondary" 
                              className={`text-xs ${networkInfo.color}`}
                            >
                              {networkInfo.name}: {amount.toFixed(4)}
                            </Badge>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Assets */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">
            {activeAssets.length > 0 ? 'Other Assets' : 'Available Assets'}
          </h3>
          <div className="space-y-3">
            {allAssets
              .filter(([symbol, data]: [string, any]) => data.amount === 0)
              .map(([symbol, data]: [string, any]) => {
                const cryptoInfo = CRYPTO_INFO[symbol as keyof typeof CRYPTO_INFO];
                
                return (
                  <Card 
                    key={symbol} 
                    className="p-4 cursor-pointer hover:shadow-md transition-shadow opacity-60"
                    onClick={() => onAssetSelect(symbol)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full ${cryptoInfo.color} flex items-center justify-center`}>
                          <Wallet className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900">{symbol}</p>
                            <Badge 
                              variant="secondary" 
                              className={`${
                                cryptoInfo.trending === 'up' ? 'bg-green-100 text-green-800' : 
                                cryptoInfo.trending === 'down' ? 'bg-red-100 text-red-800' : 
                                'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {cryptoInfo.trending === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
                              {cryptoInfo.trending === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
                              {cryptoInfo.change}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{cryptoInfo.name}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">0.000000 {symbol}</p>
                        <p className="text-sm text-gray-600">
                          {formatAmount(currency === 'GHS' ? cryptoInfo.price_ghs : cryptoInfo.price_usd, currency)}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>

        {/* Empty State */}
        {activeAssets.length === 0 && (
          <Card className="p-8 text-center">
            <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Your Wallet is Empty</h3>
            <p className="text-gray-600 mb-6">
              Start building your crypto portfolio by purchasing your first digital asset.
            </p>
            <div className="flex gap-3">
              <Button className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                Buy Crypto
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};