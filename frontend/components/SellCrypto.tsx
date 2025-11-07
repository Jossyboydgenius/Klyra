/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import React, { useState, useEffect } from 'react';
import { projectId } from '../lib/supabase/info';
import { CRYPTO_INFO } from '../lib/constants';
import { formatAmount, calculateAssetValue } from '../lib/helpers';
import { Web3Container, Web3Card, Web3Button } from './Web3Theme';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  Wallet, 
  CreditCard, 
  Smartphone, 
  AlertCircle,
  Info,
  ChevronDown,
  Loader2,
  Plus,
  Check
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { useWalletBalances, TokenBalance } from '@/hooks/useWalletBalances';
import { getChainLogo } from '@/lib/chain-logos';
import Image from 'next/image';

interface SellCryptoProps {
  accessToken: string;
  balances: any;
  paymentMethods: any[];
  onTransactionStart: (transactionId: string) => void;
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

export const SellCrypto: React.FC<SellCryptoProps> = ({ 
  accessToken, 
  balances, 
  paymentMethods,
  onTransactionStart, 
  onBack,
  onNavigate 
}) => {
  const { address, isConnected } = useAccount();
  const { balances: walletBalances, isLoading: isLoadingBalances } = useWalletBalances(address, undefined, true);
  
  const [selectedBalance, setSelectedBalance] = useState<TokenBalance | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>(null);
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [currency, setCurrency] = useState('GHS');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [showPaymentMethodSelector, setShowPaymentMethodSelector] = useState(false);

  const getFiatAmount = () => {
    if (!cryptoAmount || !selectedBalance) return 0;
    
    const numAmount = parseFloat(cryptoAmount);
    const cryptoInfo = CRYPTO_INFO[selectedBalance.token.symbol as keyof typeof CRYPTO_INFO];
    
    return calculateAssetValue(numAmount, selectedBalance.token.symbol, currency, cryptoInfo);
  };

  const getSelectedCryptoBalance = () => {
    if (!selectedBalance) return 0;
    return parseFloat(selectedBalance.balanceFormatted);
  };

  const getFeeAmount = () => {
    // Paystack transfer fee: typically 1% or fixed fee
    // For simplicity, use 1% for now
    const fiatAmount = getFiatAmount();
    return fiatAmount * 0.01; // 1% fee
  };

  const getNetAmount = () => {
    return getFiatAmount() - getFeeAmount();
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

  const getPaymentMethodDisplay = (method: any) => {
    if (method.type === 'momo') {
      return `${method.details?.provider || 'Mobile Money'} - ${method.details?.phone || method.name}`;
    }
    if (method.type === 'bank') {
      return `${method.details?.bank_name || 'Bank'} - ${method.details?.account_number?.slice(-4) || method.name}`;
    }
    return method.name;
  };

  const handleSell = async () => {
    if (!selectedBalance || !selectedPaymentMethod || !cryptoAmount) {
      setError('Please fill in all fields');
      return;
    }

    const numAmount = parseFloat(cryptoAmount);
    const availableBalance = getSelectedCryptoBalance();
    
    if (numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (numAmount > availableBalance) {
      setError('Insufficient crypto balance');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/paystack/sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crypto_amount: numAmount,
          crypto_symbol: selectedBalance.token.symbol,
          token_address: selectedBalance.token.address,
          chain_id: selectedBalance.chain.id,
          network: selectedBalance.chain.name,
          fiat_currency: currency,
          fiat_amount: getNetAmount(),
          payment_method_id: selectedPaymentMethod.id,
          payment_method_type: selectedPaymentMethod.type,
          payment_method_details: selectedPaymentMethod.details,
          user_wallet_address: address
        })
      });

      const data = await response.json();

      if (data.success) {
        onTransactionStart(data.transaction_id);
      } else {
        setError(data.error || 'Sale failed');
      }
    } catch (error) {
      console.log('Sale error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Web3Container>
      <div className="max-w-md mx-auto space-y-6 px-4 py-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white mb-2">Sell Cryptocurrency</h1>
          <p className="text-indigo-200/80">Withdraw crypto to your traditional finance accounts</p>
        </div>

        {/* Currency Toggle */}
        <Web3Card className="p-4">
          <div className="flex items-center justify-between">
            <Label className="text-white">Receive Currency</Label>
            <div className="flex rounded-lg border border-indigo-400/30 overflow-hidden">
              <button
                className={`px-3 py-1 text-sm transition-colors ${currency === 'GHS' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-indigo-200'}`}
                onClick={() => setCurrency('GHS')}
              >
                GHS
              </button>
              <button
                className={`px-3 py-1 text-sm transition-colors ${currency === 'USD' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-indigo-200'}`}
                onClick={() => setCurrency('USD')}
              >
                USD
              </button>
            </div>
          </div>
        </Web3Card>

        {/* Wallet Not Connected or Loading */}
        {(!isConnected || isLoadingBalances) && (
          <Web3Card className="p-6 text-center">
            <Loader2 className="w-12 h-12 text-indigo-400 mx-auto mb-3 animate-spin" />
            <p className="text-indigo-200/80 mb-3">
              {!isConnected ? 'Connect your wallet to sell crypto' : 'Loading your balances...'}
            </p>
          </Web3Card>
        )}

        {/* No Balances */}
        {isConnected && !isLoadingBalances && (!walletBalances || walletBalances.length === 0) && (
          <Web3Card className="p-6 text-center">
            <Wallet className="w-12 h-12 text-indigo-200/70 mx-auto mb-3" />
            <p className="text-indigo-200/80 mb-3">No crypto assets available for sale</p>
            <Web3Button onClick={() => onNavigate('buy')}>
              Buy Crypto First
            </Web3Button>
          </Web3Card>
        )}

        {/* No Payment Methods */}
        {isConnected && !isLoadingBalances && walletBalances && walletBalances.length > 0 && (!paymentMethods || paymentMethods.length === 0) && (
          <Web3Card className="p-6 text-center">
            <CreditCard className="w-12 h-12 text-indigo-200/70 mx-auto mb-3" />
            <p className="text-indigo-200/80 mb-3">No payment methods configured</p>
            <p className="text-sm text-indigo-300/70 mb-4">Add a mobile money or bank account to receive funds</p>
            <Web3Button onClick={() => onNavigate('payment-methods')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Method
            </Web3Button>
          </Web3Card>
        )}

        {isConnected && !isLoadingBalances && walletBalances && walletBalances.length > 0 && paymentMethods && paymentMethods.length > 0 && (
          <>
            {/* Asset Selection - Show individual chain balances */}
            <Web3Card className="p-6">
              <div>
                <Label className="text-white">Select Asset to Sell</Label>
                <button
                  onClick={() => setShowAssetSelector(!showAssetSelector)}
                  className="mt-2 w-full flex items-center justify-between px-4 py-3 bg-white/10 rounded-lg border border-indigo-400/30 hover:bg-white/20 transition-colors"
                >
                  {selectedBalance ? (
                    <div className="flex items-center gap-3">
                      {(() => {
                        const logoUrl = getChainLogo(selectedBalance.chain.id, selectedBalance.chain.testnet);
                        return logoUrl ? (
                          <Image 
                            src={logoUrl} 
                            alt={selectedBalance.chain.name} 
                            className="w-6 h-6 rounded-full"
                            width={24}
                            height={24}
                            unoptimized={true}
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-linear-to-br from-blue-500 to-purple-600" />
                        );
                      })()}
                      <span className="text-white font-medium">
                        {parseFloat(selectedBalance.balanceFormatted).toFixed(6)} {selectedBalance.token.symbol} on {selectedBalance.chain.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-indigo-200/70">Choose asset and chain</span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-white transition-transform ${showAssetSelector ? 'rotate-180' : ''}`} />
                </button>

                {showAssetSelector && (
                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                    {walletBalances.map((balance, index) => {
                      const logoUrl = getChainLogo(balance.chain.id, balance.chain.testnet);
                      return (
                        <button
                          key={`${balance.chain.id}-${balance.token.address}-${index}`}
                          onClick={() => {
                            setSelectedBalance(balance);
                            setShowAssetSelector(false);
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 bg-white/5 rounded-lg border border-indigo-400/20 hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {logoUrl ? (
                              <div className="relative">
                                <Image 
                                  src={logoUrl} 
                                  alt={balance.chain.name} 
                                  className="w-8 h-8 rounded-full"
                                  width={32}
                                  height={32}
                                  unoptimized={true}
                                />
                                {balance.chain.testnet && (
                                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border border-slate-900" />
                                )}
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <span className="text-white text-xs font-bold">{balance.token.symbol.slice(0, 2)}</span>
                              </div>
                            )}
                            <div className="text-left">
                              <p className="text-white font-medium">{balance.token.symbol}</p>
                              <p className="text-xs text-indigo-200/70">{balance.chain.name}</p>
                            </div>
                          </div>
                          <p className="text-white font-semibold">
                            {parseFloat(balance.balanceFormatted).toFixed(6)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedBalance && (
                <div className="mt-4 p-3 bg-blue-600/20 rounded-lg border border-blue-400/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-indigo-200/80">Available Balance</span>
                    <div className="text-right">
                      <p className="font-semibold text-white">
                        {getSelectedCryptoBalance().toFixed(6)} {selectedBalance.token.symbol}
                      </p>
                      <p className="text-xs text-indigo-200/70">on {selectedBalance.chain.name}</p>
                    </div>
                  </div>
                </div>
              )}
            </Web3Card>

            {/* Amount Input */}
            <Web3Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="crypto-amount" className="text-white">Amount to Sell</Label>
                  <div className="relative mt-2">
                    <Input
                      id="crypto-amount"
                      type="number"
                      placeholder="0.000000"
                      value={cryptoAmount}
                      onChange={(e) => setCryptoAmount(e.target.value)}
                      className="text-2xl py-6 pr-24 bg-white/10 border-indigo-400/30 text-white placeholder:text-indigo-200/50"
                      step="0.000001"
                      max={getSelectedCryptoBalance()}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-200/80 font-medium">
                      {selectedBalance?.token.symbol || 'CRYPTO'}
                    </div>
                  </div>
                </div>

                {/* Quick Amount Buttons */}
                {selectedBalance && (
                  <div className="grid grid-cols-4 gap-2">
                    {[25, 50, 75, 100].map((percentage) => {
                      const amount = (getSelectedCryptoBalance() * percentage) / 100;
                      return (
                        <Web3Button
                          key={percentage}
                          variant="secondary"
                          onClick={() => setCryptoAmount(amount.toFixed(6))}
                          className="text-xs h-auto py-2"
                        >
                          {percentage}%
                        </Web3Button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Conversion Preview */}
              {selectedBalance && cryptoAmount && (
                <div className="mt-4 p-3 bg-green-600/20 rounded-lg border border-green-400/30">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-indigo-200/80">Gross Amount</span>
                      <span className="font-semibold text-white">
                        {formatAmount(getFiatAmount(), currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-indigo-200/80">Processing Fee (1%)</span>
                      <span className="text-white">
                        -{formatAmount(getFeeAmount(), currency)}
                      </span>
                    </div>
                    <hr className="border-indigo-400/30" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">You Receive</span>
                      <span className="font-bold text-green-400">
                        {formatAmount(getNetAmount(), currency)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </Web3Card>

            {/* Payment Method Selection - Use real user payment methods */}
            <Web3Card className="p-6">
              <div>
                <Label className="text-white">Receive Funds Via</Label>
                <button
                  onClick={() => setShowPaymentMethodSelector(!showPaymentMethodSelector)}
                  className="mt-2 w-full flex items-center justify-between px-4 py-3 bg-white/10 rounded-lg border border-indigo-400/30 hover:bg-white/20 transition-colors"
                >
                  {selectedPaymentMethod ? (
                    <div className="flex items-center gap-3">
                      {(() => {
                        const IconComponent = getPaymentMethodIcon(selectedPaymentMethod.type);
                        return <IconComponent className="w-5 h-5 text-indigo-200" />;
                      })()}
                      <span className="text-white font-medium">
                        {getPaymentMethodDisplay(selectedPaymentMethod)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-indigo-200/70">Choose payment method</span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-white transition-transform ${showPaymentMethodSelector ? 'rotate-180' : ''}`} />
                </button>

                {showPaymentMethodSelector && (
                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                    {paymentMethods.map((method) => {
                      const IconComponent = getPaymentMethodIcon(method.type);
                      const isSelected = selectedPaymentMethod?.id === method.id;
                      return (
                        <button
                          key={method.id}
                          onClick={() => {
                            setSelectedPaymentMethod(method);
                            setShowPaymentMethodSelector(false);
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                            isSelected 
                              ? 'bg-indigo-600/30 border-indigo-400' 
                              : 'bg-white/5 border-indigo-400/20 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`rounded-full p-2 ${isSelected ? 'bg-indigo-600' : 'bg-white/10'}`}>
                              <IconComponent className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-indigo-200'}`} />
                            </div>
                            <div className="text-left">
                              <p className="font-medium text-white">{method.name}</p>
                              <p className="text-sm text-indigo-200/70">{getPaymentMethodDisplay(method)}</p>
                            </div>
                          </div>
                          {method.is_verified && (
                            <Badge className="bg-green-400/20 text-green-400 border-green-400/30">
                              <Check className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => {
                        setShowPaymentMethodSelector(false);
                        onNavigate('payment-methods');
                      }}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-indigo-400/30 hover:bg-white/10 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-indigo-200" />
                      <span className="text-indigo-200">Add New Payment Method</span>
                    </button>
                  </div>
                )}
              </div>
            </Web3Card>

            {/* Important Notice */}
            <Web3Card className="p-4 bg-amber-600/20 border-amber-400/30">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-400 mt-0.5" />
                <div>
                  <p className="font-medium text-white mb-1">Processing Time</p>
                  <p className="text-sm text-indigo-200/80">
                    Crypto sales are processed instantly but withdrawal to your traditional account may take time based on your selected method.
                  </p>
                </div>
              </div>
            </Web3Card>

            {/* Error Message */}
            {error && (
              <Web3Card className="p-4 bg-red-600/20 border-red-400/30">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-red-200">{error}</span>
                </div>
              </Web3Card>
            )}

            {/* Sell Button */}
            <Web3Button
              onClick={handleSell}
              disabled={isLoading || !selectedBalance || !selectedPaymentMethod || !cryptoAmount}
              className="w-full h-12 bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'Processing...' : `Sell ${selectedBalance?.token.symbol || 'Crypto'}`}
            </Web3Button>
          </>
        )}

        <p className="text-center text-xs text-indigo-200/60">
          Transactions are secured with bank-level encryption
        </p>
      </div>
    </Web3Container>
  );
};