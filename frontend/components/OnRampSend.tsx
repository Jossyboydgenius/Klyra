'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RecipientInput } from '@/components/payment/RecipientInput';
import { NetworkSelector } from '@/components/NetworkSelector';
import { TokenSelector } from '@/components/TokenSelector';
import { 
  Send, 
  CreditCard,
  Loader2, 
  AlertCircle, 
  ArrowRight
} from 'lucide-react';
import type { Chain, Token } from '@/lib/chain-data';

interface Country {
  code: string;
  name: string;
  currency: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: 'NG', name: 'Nigeria', currency: 'NGN', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', flag: '🇬🇭' },
  { code: 'KE', name: 'Kenya', currency: 'KES', flag: '🇰🇪' },
];

interface OnRampSendProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function OnRampSend({ onComplete, onCancel }: OnRampSendProps) {
  const { address, isConnected } = useAccount();

  // On-ramp state
  const [country, setCountry] = useState('');
  const [chain, setChain] = useState<number | null>(null);
  const [token, setToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState<string>('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canProceed = country && chain && token && amount && recipient && !loading;
  const selectedCurrency = COUNTRIES.find(c => c.code === country)?.currency || '';

  const handleOnRampAndSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canProceed || !address) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country,
          crypto_asset: token.symbol,
          network: getChainName(chain),
          chain_id: chain,
          token_address: token.address,
          crypto_amount: amount,
          user_wallet_address: recipient, // Send directly to recipient
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to Paystack payment page
        window.location.href = data.authorization_url;
      } else {
        setError(data.error || 'Failed to initialize payment');
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to process request');
      setLoading(false);
    }
  };

  const getChainName = (chainId: number): string => {
    const chains = require('@/lib/chain-data').getAllChains();
    const chain = chains.find((c: any) => c.id === chainId);
    return chain?.name || `Chain ${chainId}`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Buy & Send
          </CardTitle>
          <CardDescription>
            Purchase crypto with mobile money and send directly to recipient
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleOnRampAndSend} className="space-y-6">
            {/* Country Selection */}
            <div>
              <Label>Country</Label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                required
              >
                <option value="">Select your country</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name} ({c.currency})
                  </option>
                ))}
              </select>
            </div>

            {/* Network Selection */}
            <div>
              <Label>Network</Label>
              <NetworkSelector
                value={chain}
                onChange={(chainId, chainData) => {
                  setChain(chainId);
                  setToken(null);
                }}
                includeTestnets={false}
                placeholder="Select network"
              />
            </div>

            {/* Token Selection */}
            {chain && (
              <div>
                <Label>Token</Label>
                <TokenSelector
                  chainId={chain}
                  value={token?.address}
                  onChange={setToken}
                  placeholder="Select token"
                />
              </div>
            )}

            {/* Recipient */}
            <div>
              <Label>Recipient Address</Label>
              <RecipientInput
                value={recipient}
                onChange={setRecipient}
                placeholder="Enter recipient address or ENS name"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Crypto will be sent directly to this address after purchase
              </p>
            </div>

            {/* Amount */}
            {token && (
              <div>
                <Label>Amount ({token.symbol})</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.000001"
                  min="0.01"
                  required
                />
                {country && (
                  <p className="text-xs text-muted-foreground mt-1">
                    You'll pay with {selectedCurrency} via mobile money or bank transfer
                  </p>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={!canProceed}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Buy & Send
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="text-sm space-y-2">
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">1.</span>
              <span>Select your country and crypto details</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">2.</span>
              <span>Enter recipient address for direct delivery</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">3.</span>
              <span>Complete payment with mobile money or bank transfer</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold text-blue-600">4.</span>
              <span>Crypto arrives directly in recipient's wallet</span>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Summary */}
      {token && amount && recipient && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Transaction Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Buying:</span>
              <span className="font-medium">{amount} {token.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sending to:</span>
              <span className="font-mono text-xs truncate max-w-[200px]">{recipient}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network:</span>
              <span className="font-medium">{getChainName(chain!)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

