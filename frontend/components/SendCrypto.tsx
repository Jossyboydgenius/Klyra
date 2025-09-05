/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
'use client';
import React, { useState } from 'react';
import { projectId } from '../lib/supabase/info';
import { CRYPTO_INFO, NETWORKS } from '../lib/constants';
import { formatCryptoAmount, calculateAssetValue } from '../lib/helpers';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { 
  Send, 
  User, 
  Wallet, 
  AlertCircle,
  CheckCircle,
  Search,
  ArrowRight
} from 'lucide-react';

interface SendCryptoProps {
  accessToken: string;
  balances: any;
  onSuccess: () => void;
  onBack: () => void;
}

interface Recipient {
  id: string;
  name: string;
  email: string;
}

export const SendCrypto: React.FC<SendCryptoProps> = ({ 
  accessToken, 
  balances, 
  onSuccess, 
  onBack 
}) => {
  const [step, setStep] = useState(1); // 1: recipient, 2: amount, 3: confirm, 4: success
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [recipientInput, setRecipientInput] = useState('');
  const [selectedCrypto, setSelectedCrypto] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionId, setTransactionId] = useState('');

  const getAvailableCryptos = () => {
    if (!balances?.crypto) return [];
    return Object.entries(balances.crypto)
      .filter(([_, data]: [string, any]) => data.amount > 0)
      .map(([symbol, data]: [string, any]) => ({
        symbol,
        name: CRYPTO_INFO[symbol as keyof typeof CRYPTO_INFO]?.name || symbol,
        amount: data.amount,
        networks: data.networks
      }));
  };

  const getAvailableNetworks = () => {
    if (!selectedCrypto || !balances?.crypto[selectedCrypto]) return [];
    
    const cryptoData = balances.crypto[selectedCrypto];
    return Object.entries(cryptoData.networks)
      .filter(([_, amount]: [string, any]) => amount > 0)
      .map(([network, amount]: [string, any]) => ({
        network,
        name: NETWORKS[network as keyof typeof NETWORKS]?.name || network,
        amount
      }));
  };

  const getMaxAmount = () => {
    if (!selectedCrypto || !selectedNetwork || !balances?.crypto[selectedCrypto]) return 0;
    return balances.crypto[selectedCrypto].networks[selectedNetwork] || 0;
  };

  const handleRecipientLookup = async () => {
    if (!recipientInput.trim()) {
      setError('Please enter a phone number, email, or Base name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/${process.env.NEXT_PUBLIC_SUPABASE_FUNCTION_NAME}/user/lookup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identifier: recipientInput.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        setRecipient(data.recipient);
        setStep(2);
      } else {
        setError(data.error || 'User not found');
      }
    } catch (error) {
      console.log('Error looking up user:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCrypto = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/${process.env.NEXT_PUBLIC_SUPABASE_FUNCTION_NAME}/crypto/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipient_id: recipient!.id,
          crypto_symbol: selectedCrypto,
          amount: parseFloat(amount),
          network: selectedNetwork,
          message: message.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        setTransactionId(data.transaction_id);
        setStep(4);
        setTimeout(() => {
          onSuccess();
        }, 3000);
      } else {
        setError(data.error || 'Failed to send crypto');
      }
    } catch (error) {
      console.log('Error sending crypto:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateAmount = () => {
    const numAmount = parseFloat(amount);
    const maxAmount = getMaxAmount();
    
    if (numAmount <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    
    if (numAmount > maxAmount) {
      setError('Insufficient balance on selected network');
      return false;
    }
    
    return true;
  };

  const renderRecipientStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Find Recipient</h2>
        <p className="text-gray-600">Enter phone number, email, or Base name</p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="recipient">Recipient</Label>
            <Input
              id="recipient"
              type="text"
              placeholder="Phone (+233XXXXXXXXX), Email, or basename.base.eth"
              value={recipientInput}
              onChange={(e) => {
                setRecipientInput(e.target.value);
                setError('');
              }}
              className="mt-1"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <Button 
            onClick={handleRecipientLookup} 
            disabled={isLoading || !recipientInput.trim()}
            className="w-full"
          >
            {isLoading ? 'Searching...' : 'Find User'}
          </Button>
        </div>
      </Card>

      <div className="text-center text-sm text-gray-500">
        <p>Supported formats:</p>
        <p>• Phone: +233XXXXXXXXX or 0XXXXXXXXX</p>
        <p>• Email: user@example.com</p>
        <p>• Base name: username.base.eth</p>
      </div>
    </div>
  );

  const renderAmountStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Send Amount</h2>
        <p className="text-gray-600">Choose crypto and amount to send</p>
      </div>

      {/* Recipient Card */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 rounded-full p-2">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-blue-900">{recipient!.name}</p>
            <p className="text-sm text-blue-700">{recipient!.email}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          {/* Cryptocurrency Selection */}
          <div>
            <Label>Select Cryptocurrency</Label>
            <Select value={selectedCrypto} onValueChange={(value) => {
              setSelectedCrypto(value);
              setSelectedNetwork('');
              setError('');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose cryptocurrency" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableCryptos().map((crypto) => (
                  <SelectItem key={crypto.symbol} value={crypto.symbol}>
                    <div className="flex items-center justify-between w-full">
                      <span>{crypto.name} ({crypto.symbol})</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {crypto.amount.toFixed(6)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Network Selection */}
          {selectedCrypto && (
            <div>
              <Label>Select Network</Label>
              <Select value={selectedNetwork} onValueChange={(value) => {
                setSelectedNetwork(value);
                setError('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose network" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableNetworks().map((network) => (
                    <SelectItem key={network.network} value={network.network}>
                      <div className="flex items-center justify-between w-full">
                        <span>{network.name}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          {network.amount.toFixed(6)} {selectedCrypto}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Amount Input */}
          {selectedNetwork && (
            <div>
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.000000"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError('');
                  }}
                  className="pr-20"
                  step="0.000001"
                  max={getMaxAmount()}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  {selectedCrypto}
                </div>
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-gray-600">
                  Max: {getMaxAmount().toFixed(6)} {selectedCrypto}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAmount(getMaxAmount().toString())}
                  className="text-xs"
                >
                  Use Max
                </Button>
              </div>
            </div>
          )}

          {/* Message (Optional) */}
          <div>
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a message with your transaction..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">{message.length}/200 characters</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
              Back
            </Button>
            <Button 
              onClick={() => {
                if (validateAmount()) {
                  setStep(3);
                }
              }}
              disabled={!selectedCrypto || !selectedNetwork || !amount}
              className="flex-1"
            >
              Continue
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderConfirmStep = () => {
    const cryptoInfo = CRYPTO_INFO[selectedCrypto as keyof typeof CRYPTO_INFO];
    const networkInfo = NETWORKS[selectedNetwork as keyof typeof NETWORKS];
    const amountValue = calculateAssetValue(parseFloat(amount), selectedCrypto, 'GHS', cryptoInfo);

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Confirm Transaction</h2>
          <p className="text-gray-600">Review details before sending</p>
        </div>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">To:</span>
              <div className="text-right">
                <p className="font-medium text-gray-900">{recipient!.name}</p>
                <p className="text-sm text-gray-600">{recipient!.email}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Amount:</span>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  {parseFloat(amount).toFixed(6)} {selectedCrypto}
                </p>
                <p className="text-sm text-gray-600">≈ GHS {amountValue.toFixed(2)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Network:</span>
              <Badge variant="secondary" className={networkInfo?.color}>
                {networkInfo?.name}
              </Badge>
            </div>

            {message && (
              <div className="border-t pt-4">
                <span className="text-gray-600 text-sm">Message:</span>
                <p className="text-gray-900 mt-1 bg-gray-50 p-3 rounded-lg text-sm">
                  {message}
                </p>
              </div>
            )}

            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Network Fee:</span>
                <span className="text-gray-900">Free</span>
              </div>
              <div className="flex items-center justify-between font-semibold">
                <span className="text-gray-900">Total:</span>
                <span className="text-gray-900">
                  {parseFloat(amount).toFixed(6)} {selectedCrypto}
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={handleSendCrypto}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Sending...' : 'Send Crypto'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderSuccessStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Transaction Sent!</h2>
        <p className="text-gray-600">Your crypto has been successfully sent</p>
      </div>

      <Card className="p-6">
        <div className="space-y-3 text-center">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="font-semibold text-green-900 mb-2">
              {parseFloat(amount).toFixed(6)} {selectedCrypto}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-green-700">
              <span>To: {recipient!.name}</span>
              <ArrowRight className="w-4 h-4" />
              <span>Completed</span>
            </div>
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <p>Transaction ID: {transactionId}</p>
            <p>Network: {NETWORKS[selectedNetwork as keyof typeof NETWORKS]?.name}</p>
            <p>Status: Completed</p>
          </div>

          {message && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600 font-medium">Message sent:</p>
              <p className="text-sm text-gray-900 mt-1">"{message}"</p>
            </div>
          )}
        </div>
      </Card>

      <p className="text-center text-sm text-gray-500">
        Redirecting to wallet...
      </p>
    </div>
  );

  const availableCryptos = getAvailableCryptos();

  if (availableCryptos.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="p-8 text-center">
            <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Crypto to Send</h3>
            <p className="text-gray-600 mb-6">
              You need to have crypto in your wallet before you can send it to others.
            </p>
            <Button onClick={onBack}>
              Buy Crypto First
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Send Cryptocurrency</h1>
          <p className="text-gray-600">Send crypto to other Paymaster users</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNumber
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step > stepNumber ? <CheckCircle className="w-4 h-4" /> : stepNumber}
                </div>
                {stepNumber < 4 && (
                  <div
                    className={`w-8 h-0.5 ${
                      step > stepNumber ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        {step === 1 && renderRecipientStep()}
        {step === 2 && renderAmountStep()}
        {step === 3 && renderConfirmStep()}
        {step === 4 && renderSuccessStep()}
      </div>
    </div>
  );
};