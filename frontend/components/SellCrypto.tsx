/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import React, { useState } from 'react';
import { projectId } from '../lib/supabase/info';
import { CRYPTO_INFO, WITHDRAWAL_METHODS } from '../lib/constants';
import { formatAmount, formatCryptoAmountDetailed, calculateAssetValue, calculateFeeAmount } from '../lib/helpers';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { 
  Wallet, 
  CreditCard, 
  Smartphone, 
  AlertCircle,
  Info
} from 'lucide-react';

interface SellCryptoProps {
  accessToken: string;
  balances: any;
  onTransactionStart: (transactionId: string) => void;
  onBack: () => void;
}

export const SellCrypto: React.FC<SellCryptoProps> = ({ 
  accessToken, 
  balances, 
  onTransactionStart, 
  onBack 
}) => {
  const [selectedCrypto, setSelectedCrypto] = useState('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState('');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [currency, setCurrency] = useState('GHS');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const getAvailableCryptos = () => {
    if (!balances?.crypto) return [];
    return Object.entries(balances.crypto)
      .filter(([_, data]: [string, any]) => data.amount > 0)
      .map(([symbol, data]: [string, any]) => ({
        symbol,
        name: CRYPTO_INFO[symbol as keyof typeof CRYPTO_INFO]?.name || symbol,
        amount: data.amount
      }));
  };

  const getFiatAmount = () => {
    if (!cryptoAmount || !selectedCrypto) return 0;
    
    const numAmount = parseFloat(cryptoAmount);
    const cryptoInfo = CRYPTO_INFO[selectedCrypto as keyof typeof CRYPTO_INFO];
    
    return calculateAssetValue(numAmount, selectedCrypto, currency, cryptoInfo);
  };

  const getSelectedWithdrawalMethod = () => {
    return WITHDRAWAL_METHODS.find(method => method.id === selectedWithdrawal);
  };

  const getSelectedCryptoBalance = () => {
    if (!selectedCrypto || !balances?.crypto) return 0;
    return balances.crypto[selectedCrypto]?.amount || 0;
  };

  const getFeeAmount = () => {
    const withdrawalMethod = getSelectedWithdrawalMethod();
    if (!withdrawalMethod) return 0;
    
    const fiatAmount = getFiatAmount();
    return calculateFeeAmount(fiatAmount, withdrawalMethod.fee);
  };

  const getNetAmount = () => {
    return getFiatAmount() - getFeeAmount();
  };

  const handleSell = async () => {
    if (!selectedCrypto || !selectedWithdrawal || !cryptoAmount) {
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
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/${process.env.NEXT_PUBLIC_SUPABASE_FUNCTION_NAME}/crypto/sell`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          crypto_amount: numAmount,
          crypto_symbol: selectedCrypto,
          currency,
          withdrawal_method: selectedWithdrawal
        })
      });

      const data = await response.json();

      if (response.ok) {
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

  const availableCryptos = getAvailableCryptos();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Sell Cryptocurrency</h1>
          <p className="text-gray-600">Withdraw crypto to your traditional finance accounts</p>
        </div>

        {/* Currency Toggle */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <Label>Receive Currency</Label>
            <div className="flex rounded-lg border overflow-hidden">
              <button
                className={`px-3 py-1 text-sm ${currency === 'GHS' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
                onClick={() => setCurrency('GHS')}
              >
                GHS
              </button>
              <button
                className={`px-3 py-1 text-sm ${currency === 'USD' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
                onClick={() => setCurrency('USD')}
              >
                USD
              </button>
            </div>
          </div>
        </Card>

        {/* Available Balance Warning */}
        {availableCryptos.length === 0 && (
          <Card className="p-6 text-center">
            <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 mb-3">No crypto assets available for sale</p>
            <Button variant="outline" onClick={onBack}>
              Buy Crypto First
            </Button>
          </Card>
        )}

        {availableCryptos.length > 0 && (
          <>
            {/* Cryptocurrency Selection */}
            <Card className="p-6">
              <div>
                <Label>Select Cryptocurrency to Sell</Label>
                <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Choose cryptocurrency to sell" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCryptos.map((crypto) => (
                      <SelectItem key={crypto.symbol} value={crypto.symbol}>
                        <div className="flex items-center justify-between w-full">
                          <span>{crypto.name} ({crypto.symbol})</span>
                          <span className="text-sm text-gray-500 ml-2">
                            Balance: {crypto.amount.toFixed(6)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCrypto && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Available Balance</span>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {getSelectedCryptoBalance().toFixed(6)} {selectedCrypto}
                      </p>
                      <p className="text-xs text-gray-500">
                        ≈ {formatAmount(calculateAssetValue(getSelectedCryptoBalance(), selectedCrypto, 'GHS', CRYPTO_INFO[selectedCrypto as keyof typeof CRYPTO_INFO]), 'GHS')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Amount Input */}
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="crypto-amount">Amount to Sell</Label>
                  <div className="relative">
                    <Input
                      id="crypto-amount"
                      type="number"
                      placeholder="0.000000"
                      value={cryptoAmount}
                      onChange={(e) => setCryptoAmount(e.target.value)}
                      className="text-2xl py-6 pr-20"
                      step="0.000001"
                      max={getSelectedCryptoBalance()}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                      {selectedCrypto || 'CRYPTO'}
                    </div>
                  </div>
                </div>

                {/* Quick Amount Buttons */}
                {selectedCrypto && (
                  <div className="grid grid-cols-4 gap-2">
                    {[25, 50, 75, 100].map((percentage) => {
                      const amount = (getSelectedCryptoBalance() * percentage) / 100;
                      return (
                        <Button
                          key={percentage}
                          variant="outline"
                          size="sm"
                          onClick={() => setCryptoAmount(amount.toFixed(6))}
                          className="text-xs"
                        >
                          {percentage}%
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Conversion Preview */}
              {selectedCrypto && cryptoAmount && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Gross Amount</span>
                      <span className="font-semibold text-gray-900">
                        {formatAmount(getFiatAmount(), currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Network Fee</span>
                      <span className="text-gray-900">
                        -{formatAmount(getFeeAmount(), currency)}
                      </span>
                    </div>
                    <hr className="border-gray-200" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">Net Amount</span>
                      <span className="font-bold text-green-600">
                        {formatAmount(getNetAmount(), currency)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Withdrawal Method */}
            <Card className="p-6">
              <div>
                <Label>Withdrawal Method</Label>
                <RadioGroup value={selectedWithdrawal} onValueChange={setSelectedWithdrawal} className="mt-3">
                  {WITHDRAWAL_METHODS.map((method) => {
                    const IconComponent = method.icon === 'Smartphone' ? Smartphone : CreditCard;
                    return (
                      <div key={method.id} className="flex items-center space-x-3">
                        <RadioGroupItem value={method.id} id={method.id} />
                        <label
                          htmlFor={method.id}
                          className="flex-1 flex items-center justify-between cursor-pointer p-3 rounded-lg border hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-gray-100 rounded-full p-2">
                              <IconComponent className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{method.name}</p>
                              <p className="text-sm text-gray-600">{method.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">Fee: {method.fee}</p>
                            <p className="text-xs text-gray-500">{method.processing_time}</p>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>
            </Card>

            {/* Important Notice */}
            <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900 mb-1">Processing Time</p>
                  <p className="text-sm text-amber-700">
                    Crypto sales are processed instantly but withdrawal to your traditional account may take time based on your selected method.
                  </p>
                </div>
              </div>
            </Card>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Sell Button */}
            <Button
              onClick={handleSell}
              disabled={isLoading || !selectedCrypto || !selectedWithdrawal || !cryptoAmount}
              className="w-full h-12"
              variant="destructive"
            >
              {isLoading ? 'Processing...' : `Sell ${selectedCrypto || 'Crypto'}`}
            </Button>
          </>
        )}

        <p className="text-center text-xs text-gray-500">
          Transactions are secured with bank-level encryption
        </p>
      </div>
    </div>
  );
};