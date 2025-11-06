/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import React, { useState } from 'react';
import { CRYPTO_INFO } from '../lib/constants';
import { formatAmount } from '../lib/helpers';
import { Web3Container, Web3Card, Web3Button } from './Web3Theme';
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
  Settings,
  Link2,
  CircleCheck,
  CircleX,
  Clock
} from 'lucide-react';
import { WalletConnect } from './WalletConnect';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useWalletBalances } from '@/hooks/useWalletBalances';
import { getChainLogo } from '@/lib/chain-logos';

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
  const [includeTestnets, setIncludeTestnets] = useState(false);
  const { address, isConnected } = useAccount();
  const router = useRouter();
  
  // Get real wallet balances
  const { balances: walletBalances, isLoading: isLoadingBalances } = useWalletBalances(
    address,
    undefined,
    includeTestnets
  );

  // Calculate total value from real wallet balances
  const getTotalCryptoValue = () => {
    if (!isConnected || !walletBalances || walletBalances.length === 0) {
      // Fallback to dummy data if wallet not connected
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
    }

    // Calculate from real wallet balances
    // Note: For accurate pricing, we'd need to fetch prices for all tokens
    // For now, we'll use a simplified calculation
    let total = 0;
    walletBalances.forEach((balance) => {
      // Use fallback price from CRYPTO_INFO or estimate
      const cryptoInfo = CRYPTO_INFO[balance.token.symbol as keyof typeof CRYPTO_INFO];
      const price = cryptoInfo 
        ? (currency === 'GHS' ? cryptoInfo.price_ghs : cryptoInfo.price_usd)
        : 0;
      const value = parseFloat(balance.balanceFormatted) * price;
      total += value;
    });
    return total;
  };

  const formatCryptoAmount = (amount: number | string, symbol: string) => {
    if (!showBalances) return '••••••';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${numAmount.toFixed(6)} ${symbol}`;
  };

  // Get active assets from real wallet balances or fallback to dummy data
  const getActiveCryptoAssets = () => {
    if (isConnected && walletBalances && walletBalances.length > 0) {
      // Return real wallet balances
      return walletBalances.map((balance) => ({
        symbol: balance.token.symbol,
        chain: balance.chain.name,
        chainId: balance.chain.id,
        amount: parseFloat(balance.balanceFormatted),
        balanceFormatted: balance.balanceFormatted,
        token: balance.token,
      }));
    }
    
    // Fallback to dummy data
    if (!balances?.crypto) return [];
    return Object.entries(balances.crypto)
      .filter(([_, data]: [string, any]) => data.amount > 0)
      .map(([symbol, data]: [string, any]) => ({
        symbol,
        chain: 'Unknown',
        chainId: 0,
        amount: data.amount,
        balanceFormatted: data.amount.toString(),
        token: { symbol, name: symbol },
      }));
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
    <Web3Container>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">
            Welcome back, {user.name.split(' ')[0]}!
          </h1>
          <p className="text-indigo-200/80 text-sm">Manage your finances in one place</p>
        </div>
        <Web3Button variant="secondary" onClick={onRefresh} className="p-2" icon>
          <RefreshCw className="w-5 h-5" />
        </Web3Button>
      </div>

      {/* Total Crypto Value Card */}
      <Web3Card className="bg-linear-to-r from-blue-600/30 to-purple-600/30 border-blue-500/30 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-indigo-200/80 text-sm">Total Crypto Value</p>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-white">
                {formatAmount(getTotalCryptoValue(), currency, !showBalances)}
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
            <Badge className="bg-green-400/20 text-green-400 border-green-400/30">
              <TrendingUp className="w-3 h-3 mr-1" />
              +2.4%
            </Badge>
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

      {/* Wallet Connect Section */}
      <Web3Card className="mb-6 bg-linear-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Web3 Wallet
            </h3>
            <p className="text-sm text-indigo-200/80">
              {isConnected 
                ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}`
                : 'Connect your wallet to use cross-chain payments'
              }
            </p>
          </div>
          <div className="flex gap-2">
            {!isConnected && (
              <div className="w-[200px]">
                <WalletConnect />
              </div>
            )}
            {isConnected && (
              <Web3Button
                variant="secondary"
                onClick={() => router.push('/payment')}
                className="flex items-center gap-2"
              >
                <Link2 className="w-4 h-4" />
                Cross-Chain Pay
              </Web3Button>
            )}
          </div>
        </div>
      </Web3Card>

      {/* Onramp Fiat System Status */}
      <Web3Card className="mb-6 bg-linear-to-r from-green-600/20 to-blue-600/20 border-green-500/30">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
              <CircleCheck className="w-5 h-5 text-green-400" />
              Onramp Fiat System
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CircleCheck className="w-4 h-4 text-green-400" />
                <span className="text-indigo-200/90">Fiat-to-Crypto onramp: Active</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CircleCheck className="w-4 h-4 text-green-400" />
                <span className="text-indigo-200/90">Liquidity Pool: Operational</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CircleCheck className="w-4 h-4 text-green-400" />
                <span className="text-indigo-200/90">Supported Chains: Base, Ethereum, Polygon, Optimism</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CircleCheck className="w-4 h-4 text-green-400" />
                <span className="text-indigo-200/90">Auto-swap & bridge: Enabled</span>
              </div>
            </div>
          </div>
          <Badge className="bg-green-400/20 text-green-400 border-green-400/30">
            <CircleCheck className="w-3 h-3 mr-1" />
            Active
          </Badge>
        </div>
      </Web3Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Web3Button 
          className="h-16 flex flex-col gap-1"
          onClick={() => onNavigate('buy')}
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm">Buy</span>
        </Web3Button>
        <Web3Button 
          variant="secondary" 
          className="h-16 flex flex-col gap-1"
          onClick={() => onNavigate('sell')}
        >
          <ArrowDownLeft className="w-5 h-5" />
          <span className="text-sm">Sell</span>
        </Web3Button>
        <Web3Button 
          variant="secondary" 
          className="h-16 flex flex-col gap-1"
          onClick={() => onNavigate('send')}
        >
          <Send className="w-5 h-5" />
          <span className="text-sm">Send</span>
        </Web3Button>
      </div>

      {/* Payment Methods */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Methods
          </h3>
          <Web3Button 
            variant="ghost" 
            onClick={() => onNavigate('payment-methods')}
            className="text-blue-400"
          >
            <Settings className="w-4 h-4 mr-1" />
            Manage
          </Web3Button>
        </div>

        {paymentMethods.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {paymentMethods.slice(0, 4).map((method) => {
              const IconComponent = getPaymentMethodIcon(method.type);
              
              return (
                <Web3Card key={method.id} className="p-4">
                  <div className="text-center space-y-2">
                    <div className={`w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto`}>
                      <IconComponent className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm truncate">{method.name}</p>
                      <p className="text-xs text-indigo-200/70 truncate">
                        {formatPaymentMethodDetails(method)}
                      </p>
                      {method.is_verified && (
                        <Badge className="bg-green-400/20 text-green-400 border-green-400/30 text-xs mt-1">
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                </Web3Card>
              );
            })}
            
            {paymentMethods.length < 4 && (
              <Web3Card 
                className="p-4 cursor-pointer hover:bg-white/10 transition-all duration-300 border-dashed border-2 border-white/20 hover:border-blue-400/50"
                onClick={() => onNavigate('payment-methods')}
              >
                <div className="text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mx-auto">
                    <Plus className="w-5 h-5 text-indigo-200/70" />
                  </div>
                  <p className="text-sm text-indigo-200/70">Add Payment</p>
                </div>
              </Web3Card>
            )}
          </div>
        ) : (
          <Web3Card 
            className="p-6 text-center cursor-pointer hover:bg-white/10 transition-all duration-300 border-dashed border-2 border-white/20 hover:border-blue-400/50"
            onClick={() => onNavigate('payment-methods')}
          >
            <CreditCard className="w-12 h-12 text-indigo-200/70 mx-auto mb-3" />
            <p className="text-indigo-200/70 mb-3">No payment methods added</p>
            <Web3Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Method
            </Web3Button>
          </Web3Card>
        )}
      </div>

      {/* Crypto Wallet */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Crypto Wallet
            {isConnected && (
              <Badge className="bg-green-400/20 text-green-400 border-green-400/30 text-xs">
                Connected
              </Badge>
            )}
          </h3>
          <div className="flex gap-2">
            {isConnected && (
              <Web3Button 
                variant="ghost" 
                onClick={() => setIncludeTestnets(!includeTestnets)}
                className="text-blue-400 text-xs"
              >
                {includeTestnets ? 'Hide Testnets' : 'Show Testnets'}
              </Web3Button>
            )}
          <div className="flex gap-2">
            <Web3Button 
              variant="ghost" 
              onClick={() => onNavigate('add-network-token')}
              className="text-blue-400 text-xs"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Web3Button>
            <Web3Button 
              variant="ghost" 
              onClick={() => onNavigate('wallet')}
              className="text-blue-400"
            >
              View All
            </Web3Button>
          </div>
          </div>
        </div>

        {!isConnected ? (
          <Web3Card className="p-6 text-center">
            <Wallet className="w-12 h-12 text-indigo-200/70 mx-auto mb-3" />
            <p className="text-indigo-200/70 mb-3">Connect your wallet to view balances</p>
            <div className="w-[200px] mx-auto">
              <WalletConnect />
            </div>
          </Web3Card>
        ) : isLoadingBalances ? (
          <Web3Card className="p-6 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-400 mx-auto mb-3 animate-spin" />
            <p className="text-indigo-200/70">Loading wallet balances...</p>
          </Web3Card>
        ) : activeAssets.length > 0 ? (
          <div className="space-y-3">
            {activeAssets.slice(0, 3).map((asset: any, index: number) => {
              const chainLogo = asset.chainId ? getChainLogo(asset.chainId, asset.chain?.testnet) : null;
              const cryptoInfo = CRYPTO_INFO[asset.symbol as keyof typeof CRYPTO_INFO];
              const price = cryptoInfo 
                ? (currency === 'GHS' ? cryptoInfo.price_ghs : cryptoInfo.price_usd)
                : 0;
              const fiatValue = asset.amount * price;
              
              return (
                <Web3Card 
                  key={`${asset.symbol}-${asset.chainId}-${index}`} 
                  className="p-4 cursor-pointer hover:bg-white/10 transition-all duration-300"
                  onClick={() => onNavigate('wallet')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {chainLogo ? (
                        <div className="relative">
                          <img 
                            src={chainLogo} 
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
                        <div className={`w-12 h-12 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center`}>
                          <Wallet className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">{asset.symbol}</p>
                          {asset.chain !== 'Unknown' && (
                            <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/30 text-xs">
                              {asset.chain}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-indigo-200/70">
                          {asset.chain !== 'Unknown' ? asset.chain : asset.token.name || asset.symbol}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        {formatCryptoAmount(asset.amount, asset.symbol)}
                      </p>
                      <p className="text-sm text-indigo-200/70">
                        {formatAmount(fiatValue, currency, !showBalances)}
                      </p>
                    </div>
                  </div>
                </Web3Card>
              );
            })}
          </div>
        ) : (
          <Web3Card className="p-6 text-center">
            <Wallet className="w-12 h-12 text-indigo-200/70 mx-auto mb-3" />
            <p className="text-indigo-200/70 mb-3">
              {isConnected ? 'No crypto assets found in your wallet' : 'No crypto assets yet'}
            </p>
            {!isConnected && (
              <Web3Button onClick={() => onNavigate('buy')}>
                Buy Your First Crypto
              </Web3Button>
            )}
          </Web3Card>
        )}
      </div>

      {/* Recent Activity */}
      <div className="mb-6">
        <h3 className="font-semibold text-white mb-3">Recent Activity</h3>
        <Web3Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-green-500/20 rounded-full p-2">
                  <ArrowDownLeft className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Account Created</p>
                  <p className="text-sm text-indigo-200/70">Welcome to Klyra</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-white">Today</p>
                <Badge className="bg-green-400/20 text-green-400 border-green-400/30">
                  Completed
                </Badge>
              </div>
            </div>
          </div>
        </Web3Card>
      </div>
    </Web3Container>
  );
};