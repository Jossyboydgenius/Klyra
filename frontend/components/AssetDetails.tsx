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
  Plus, 
  Minus, 
  ArrowUpDown,
  Network,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  ExternalLink
} from 'lucide-react';

interface AssetDetailsProps {
  asset: string;
  balance: any;
  onBack: () => void;
}

const CRYPTO_INFO = {
  'BTC': { 
    name: 'Bitcoin', 
    color: 'bg-orange-100 text-orange-600',
    price_ghs: 537500,
    price_usd: 43000,
    change: '+2.4%',
    trending: 'up',
    description: 'The world\'s first and largest cryptocurrency by market cap.'
  },
  'ETH': { 
    name: 'Ethereum', 
    color: 'bg-blue-100 text-blue-600',
    price_ghs: 30000,
    price_usd: 2400,
    change: '+1.8%',
    trending: 'up',
    description: 'Smart contract platform powering decentralized applications.'
  },
  'BNB': { 
    name: 'BNB', 
    color: 'bg-yellow-100 text-yellow-600',
    price_ghs: 4000,
    price_usd: 320,
    change: '+0.9%',
    trending: 'up',
    description: 'Native token of the Binance ecosystem and BSC network.'
  },
  'USDT': { 
    name: 'Tether', 
    color: 'bg-green-100 text-green-600',
    price_ghs: 12.5,
    price_usd: 1,
    change: '0.0%',
    trending: 'stable',
    description: 'Dollar-pegged stablecoin for stable value transactions.'
  },
  'USDC': { 
    name: 'USD Coin', 
    color: 'bg-blue-100 text-blue-600',
    price_ghs: 12.5,
    price_usd: 1,
    change: '0.0%',
    trending: 'stable',
    description: 'Regulated stablecoin backed by US dollar reserves.'
  }
};

const NETWORKS = {
  'mainnet': { 
    name: 'Ethereum', 
    color: 'bg-gray-100 text-gray-700',
    explorer: 'https://etherscan.io',
    symbol: 'ETH'
  },
  'base': { 
    name: 'Base', 
    color: 'bg-blue-100 text-blue-700',
    explorer: 'https://basescan.org',
    symbol: 'BASE'
  },
  'bsc': { 
    name: 'BSC', 
    color: 'bg-yellow-100 text-yellow-700',
    explorer: 'https://bscscan.com',
    symbol: 'BNB'
  }
};

const CONVERSION_CURRENCIES = [
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' }
];

export const AssetDetails: React.FC<AssetDetailsProps> = ({ asset, balance, onBack }) => {
  const [showBalances, setShowBalances] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState('GHS');

  const cryptoInfo = CRYPTO_INFO[asset as keyof typeof CRYPTO_INFO];

  const formatAmount = (amount: number, currency: string = 'GHS') => {
    if (!showBalances) return '••••••';
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: currency === 'GHS' ? 'GHS' : 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatCryptoAmount = (amount: number) => {
    if (!showBalances) return '••••••';
    return `${amount.toFixed(8)} ${asset}`;
  };

  const getAssetValue = (currency: string = 'GHS') => {
    const price = currency === 'GHS' ? cryptoInfo.price_ghs : cryptoInfo.price_usd;
    return balance.amount * price;
  };

  const getConversionRate = (currency: string) => {
    // Mock conversion rates from the base price
    const rates: {[key: string]: number} = {
      'GHS': cryptoInfo.price_ghs,
      'USD': cryptoInfo.price_usd,
      'EUR': cryptoInfo.price_usd * 0.85,
      'GBP': cryptoInfo.price_usd * 0.75,
      'NGN': cryptoInfo.price_usd * 1500,
      'KES': cryptoInfo.price_usd * 130
    };
    return rates[currency] || rates['USD'];
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Asset Header */}
        <Card className={`${cryptoInfo.color.replace('text-', 'bg-gradient-to-r from-').replace('bg-', 'to-')} text-white p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-3">
                <Wallet className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{asset}</h1>
                <p className="text-white/80">{cryptoInfo.name}</p>
              </div>
            </div>
            
            <div className="text-right">
              <Badge 
                variant="secondary" 
                className={`${
                  cryptoInfo.trending === 'up' ? 'bg-green-100 text-green-800' : 
                  cryptoInfo.trending === 'down' ? 'bg-red-100 text-red-800' : 
                  'bg-gray-100 text-gray-800'
                } mb-2`}
              >
                {cryptoInfo.trending === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
                {cryptoInfo.trending === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
                {cryptoInfo.change}
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

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-bold">
                {formatCryptoAmount(balance.amount)}
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
            <p className="text-white/80 text-lg">
              ≈ {formatAmount(getAssetValue(selectedCurrency), selectedCurrency)}
            </p>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button className="h-16 flex flex-col gap-1">
            <Plus className="w-5 h-5" />
            <span className="text-sm">Buy More</span>
          </Button>
          <Button variant="outline" className="h-16 flex flex-col gap-1">
            <Minus className="w-5 h-5" />
            <span className="text-sm">Sell</span>
          </Button>
        </div>

        {/* Network Distribution */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Network className="w-5 h-5" />
            Network Distribution
          </h3>
          
          <div className="space-y-4">
            {Object.entries(balance.networks).map(([network, amount]: [string, any]) => {
              const networkInfo = NETWORKS[network as keyof typeof NETWORKS];
              const percentage = balance.amount > 0 ? (amount / balance.amount) * 100 : 0;
              
              return (
                <div key={network} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={`${networkInfo.color}`}
                      >
                        {networkInfo.name}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {showBalances ? `${amount.toFixed(6)} ${asset}` : '••••••'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>

                  {amount > 0 && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => window.open(networkInfo.explorer, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View on Explorer
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Price Conversions */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5" />
            Price Conversions
          </h3>
          
          <div className="space-y-3">
            {CONVERSION_CURRENCIES.map((currency) => {
              const rate = getConversionRate(currency.code);
              
              return (
                <div 
                  key={currency.code}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedCurrency === currency.code 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedCurrency(currency.code)}
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      1 {asset} = {currency.symbol}{rate.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {currency.name} ({currency.code})
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(`1 ${asset} = ${currency.symbol}${rate.toLocaleString()}`);
                    }}
                    className="p-2"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Asset Information */}
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-3">About {cryptoInfo.name}</h3>
          <p className="text-gray-600 text-sm leading-relaxed mb-4">
            {cryptoInfo.description}
          </p>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Current Price (GHS):</span>
              <span className="font-medium">{formatAmount(cryptoInfo.price_ghs, 'GHS')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current Price (USD):</span>
              <span className="font-medium">{formatAmount(cryptoInfo.price_usd, 'USD')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">24h Change:</span>
              <span className={`font-medium ${
                cryptoInfo.trending === 'up' ? 'text-green-600' : 
                cryptoInfo.trending === 'down' ? 'text-red-600' : 
                'text-gray-600'
              }`}>
                {cryptoInfo.change}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};