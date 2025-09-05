/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import React, { useState } from 'react';
import { CRYPTO_INFO } from '../lib/constants';
import { formatAmount } from '../lib/helpers';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Wallet, 
  CreditCard, 
  Smartphone, 
  TrendingUp, 
  RefreshCw,
  Plus,
  Send,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
  Settings
} from 'lucide-react';

interface DashboardProps {
  user: any;
  balances: any;
  paymentMethods: any[];
  onNavigate: (screen: string) => void;
  onRefresh: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  balances, 
  paymentMethods, 
  onNavigate, 
  onRefresh 
}) => {
  const [showBalances, setShowBalances] = useState(true);
  const [currency, setCurrency] = useState('GHS');

  const getTotalCryptoValue = () => {
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

  const formatCryptoAmount = (amount: number, symbol: string) => {
    if (!showBalances) return '••••••';
    return `${amount.toFixed(6)} ${symbol}`;
  };

  const getActiveCryptoAssets = () => {
    if (!balances?.crypto) return [];
    return Object.entries(balances.crypto).filter(([_, data]: [string, any]) => data.amount > 0);
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'momo':
        return Smartphone;
      case 'bank':
      case 'card':
        return CreditCard;
      default:
        return CreditCard;
    }
  };

  const getPaymentMethodColor = (type: string) => {
    switch (type) {
      case 'momo':
        return 'bg-green-100 text-green-600';
      case 'bank':
        return 'bg-blue-100 text-blue-600';
      case 'card':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatPaymentMethodDetails = (method: any) => {
    switch (method.type) {
      case 'momo':
        return `${method.details.provider}`;
      case 'bank':
        return `${method.details.bank_name}`;
      case 'card':
        return `Card ending ${method.details.card_number?.slice(-4)}`;
      default:
        return method.name;
    }
  };

  const activeAssets = getActiveCryptoAssets();

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Welcome back, {user.name.split(' ')[0]}!
          </h1>
          <p className="text-gray-600 text-sm">Manage your finances in one place</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh} className="p-2">
          <RefreshCw className="w-5 h-5" />
        </Button>
      </div>

      {/* Total Crypto Value Card */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-100 text-sm">Total Crypto Value</p>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold">
                {formatAmount(getTotalCryptoValue(), currency, !showBalances)}
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
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <TrendingUp className="w-3 h-3 mr-1" />
              +2.4%
            </Badge>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Button 
          className="h-16 flex flex-col gap-1"
          onClick={() => onNavigate('buy')}
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm">Buy</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-16 flex flex-col gap-1"
          onClick={() => onNavigate('sell')}
        >
          <ArrowDownLeft className="w-5 h-5" />
          <span className="text-sm">Sell</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-16 flex flex-col gap-1"
          onClick={() => onNavigate('send')}
        >
          <Send className="w-5 h-5" />
          <span className="text-sm">Send</span>
        </Button>
      </div>

      {/* Payment Methods */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Methods
          </h3>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onNavigate('payment-methods')}
            className="text-blue-600"
          >
            <Settings className="w-4 h-4 mr-1" />
            Manage
          </Button>
        </div>

        {paymentMethods.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {paymentMethods.slice(0, 4).map((method) => {
              const IconComponent = getPaymentMethodIcon(method.type);
              const colorClass = getPaymentMethodColor(method.type);
              
              return (
                <Card key={method.id} className="p-4">
                  <div className="text-center space-y-2">
                    <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center mx-auto`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm truncate">{method.name}</p>
                      <p className="text-xs text-gray-600 truncate">
                        {formatPaymentMethodDetails(method)}
                      </p>
                      {method.is_verified && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs mt-1">
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
            
            {paymentMethods.length < 4 && (
              <Card 
                className="p-4 cursor-pointer hover:shadow-md transition-shadow border-dashed border-2 border-gray-300 hover:border-blue-400"
                onClick={() => onNavigate('payment-methods')}
              >
                <div className="text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                    <Plus className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600">Add Payment</p>
                </div>
              </Card>
            )}
          </div>
        ) : (
          <Card 
            className="p-6 text-center cursor-pointer hover:shadow-md transition-shadow border-dashed border-2 border-gray-300 hover:border-blue-400"
            onClick={() => onNavigate('payment-methods')}
          >
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 mb-3">No payment methods added</p>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Method
            </Button>
          </Card>
        )}
      </div>

      {/* Crypto Wallet */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Crypto Wallet
          </h3>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onNavigate('wallet')}
            className="text-blue-600"
          >
            View All
          </Button>
        </div>

        {activeAssets.length > 0 ? (
          <div className="space-y-3">
            {activeAssets.slice(0, 3).map(([symbol, data]: [string, any]) => {
              const cryptoInfo = CRYPTO_INFO[symbol as keyof typeof CRYPTO_INFO];
              
              return (
                <Card 
                  key={symbol} 
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onNavigate('wallet')}
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
                              cryptoInfo.trending === 'up' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {cryptoInfo.trending === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
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
                        {formatAmount(data.amount * (currency === 'GHS' ? cryptoInfo.price_ghs : cryptoInfo.price_usd), currency, !showBalances)}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 mb-3">No crypto assets yet</p>
            <Button size="sm" onClick={() => onNavigate('buy')}>
              Buy Your First Crypto
            </Button>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 rounded-full p-2">
                  <ArrowDownLeft className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Account Created</p>
                  <p className="text-sm text-gray-600">Welcome to Paymaster</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-900">Today</p>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Completed
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};