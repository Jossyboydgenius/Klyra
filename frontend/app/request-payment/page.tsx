'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { WalletConnect } from '@/components/WalletConnect';
import { NetworkSelector } from '@/components/NetworkSelector';
import { TokenSelector } from '@/components/TokenSelector';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QrCode, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';
import { createPaymentRequest } from '@/lib/supabase/payment-requests';
import type { Token } from '@/lib/chain-data';
import type { PaymentRequest } from '@/lib/payment-types';

export default function RequestPaymentPage() {
  const { address, isConnected } = useAccount();

  const [merchantName, setMerchantName] = useState('');
  const [chain, setChain] = useState<number | null>(null);
  const [token, setToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expiresIn, setExpiresIn] = useState('24');

  const [isCreating, setIsCreating] = useState(false);
  const [createdRequest, setCreatedRequest] = useState<PaymentRequest | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = merchantName && chain && token && amount && description && address;

  const handleCreate = async () => {
    if (!canCreate) return;

    setIsCreating(true);
    setError(null);

    try {
      const request = await createPaymentRequest({
        merchantName,
        merchantAddress: address!,
        chainId: chain!,
        tokenAddress: token!.address,
        tokenSymbol: token!.symbol,
        tokenDecimals: token!.decimals,
        amount,
        description,
        expiresInHours: parseInt(expiresIn),
      });

      setCreatedRequest(request);
    } catch (err: any) {
      setError(err.message || 'Failed to create payment request');
      console.error('Create request error:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = () => {
    if (createdRequest) {
      navigator.clipboard.writeText(createdRequest.paymentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setCreatedRequest(null);
    setMerchantName('');
    setAmount('');
    setDescription('');
    setChain(null);
    setToken(null);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-center">Connect Wallet</CardTitle>
              <CardDescription className="text-center">
                Connect your wallet to create payment requests
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <WalletConnect autoShowModal={true} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (createdRequest) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-center text-green-600">Payment Request Created!</CardTitle>
              <CardDescription className="text-center">
                Share this link with your customer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Payment Link */}
              <div>
                <Label>Payment Link</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={createdRequest.paymentLink}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => window.open(createdRequest.paymentLink, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* QR Code Placeholder */}
              <div className="flex justify-center p-8 bg-muted rounded-lg">
                <div className="text-center">
                  <QrCode className="h-48 w-48 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-4">QR Code (Coming Soon)</p>
                </div>
              </div>

              {/* Request Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Request Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium">{createdRequest.amount} {createdRequest.merchant.token.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chain:</span>
                    <span className="font-medium">Chain ID {createdRequest.merchant.chain}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires:</span>
                    <span className="font-medium">{createdRequest.expiresAt.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="font-medium capitalize">{createdRequest.status}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button variant="outline" className="flex-1" onClick={handleReset}>
                  Create Another
                </Button>
                <Button variant="default" className="flex-1" onClick={handleCopyLink}>
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Request Payment</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
              Create a payment request that customers can pay with any token
            </p>
          </div>
          <WalletConnect autoShowModal={false} />
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Payment Request Details</CardTitle>
            <CardDescription>
              Specify what you want to receive - customers can pay with any token they have
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Business/Merchant Name</Label>
              <Input
                placeholder="Acme Corp"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Chain</Label>
                <NetworkSelector
                  value={chain}
                  onChange={setChain}
                  includeTestnets={false}
                  placeholder="Select Chain"
                />
              </div>
              <div>
                <Label>Token</Label>
                <TokenSelector
                  chainId={chain}
                  value={token?.address}
                  onChange={setToken}
                  placeholder="Token to Receive"
                />
              </div>
            </div>

            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                placeholder="100.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg"
              />
              {token && (
                <p className="text-sm text-muted-foreground mt-1">
                  Requesting {amount || '0'} {token.symbol}
                </p>
              )}
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Product or service description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label>Expires In (hours)</Label>
              <Input
                type="number"
                placeholder="24"
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              size="lg"
              className="w-full"
              onClick={handleCreate}
              disabled={!canCreate || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Payment Request'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

