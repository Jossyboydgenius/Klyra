'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { WalletConnect } from '@/components/WalletConnect';
import { NetworkSelector } from '@/components/NetworkSelector';
import { TokenSelector } from '@/components/TokenSelector';
import { RecipientInput } from '@/components/payment/RecipientInput';
import { RouteComparison } from '@/components/payment/RouteComparison';
import { TransactionStatus } from '@/components/payment/TransactionStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useRouteAggregator } from '@/hooks/useRouteAggregator';
import { transactionExecutor } from '@/lib/transaction-executor';
import type { Chain, Token } from '@/lib/chain-data';
import type { PaymentIntent, UnifiedRoute, CrossChainTransaction } from '@/lib/payment-types';
import { useConfig } from 'wagmi';

export default function PaymentPage() {
  const { address, isConnected } = useAccount();
  const wagmiConfig = useConfig();
  const routeAggregator = useRouteAggregator();

  // Sender state
  const [srcChain, setSrcChain] = useState<number | null>(null);
  const [srcToken, setSrcToken] = useState<Token | null>(null);
  const [srcAmount, setSrcAmount] = useState('');

  // Recipient state
  const [recipientAddress, setRecipientAddress] = useState('');
  const [dstChain, setDstChain] = useState<number | null>(null);
  const [dstToken, setDstToken] = useState<Token | null>(null);

  // Payment state
  const [message, setMessage] = useState('');
  const [routes, setRoutes] = useState<UnifiedRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<UnifiedRoute | null>(null);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transaction state
  const [transaction, setTransaction] = useState<CrossChainTransaction | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const canGetQuotes = srcChain && srcToken && srcAmount && dstChain && dstToken && recipientAddress;

  const handleGetRoutes = async () => {
    if (!canGetQuotes || !address) return;

    setIsLoadingRoutes(true);
    setError(null);
    setRoutes([]);
    setSelectedRoute(null);

    try {
      const intent: PaymentIntent = {
        sender: {
          address,
          token: srcToken!,
          chain: srcChain!,
          amount: srcAmount,
        },
        recipient: {
          address: recipientAddress,
          token: dstToken!,
          chain: dstChain!,
        },
        metadata: {
          message,
        },
      };

      const comparison = await routeAggregator.findBestRoutes(intent);
      setRoutes(comparison.allRoutes);
      setSelectedRoute(comparison.recommended);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch routes');
      console.error('Route fetch error:', err);
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  const handleExecute = async () => {
    if (!selectedRoute || !address) return;

    setIsExecuting(true);
    setError(null);

    try {
      const tx = await transactionExecutor.execute(selectedRoute, address, wagmiConfig);
      setTransaction(tx);
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
      console.error('Transaction error:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-center">Connect Wallet to Pay</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <Send className="h-16 w-16 text-primary" />
              <p className="text-center text-muted-foreground">
                Connect your wallet to send payments with any token across any chain
              </p>
              <WalletConnect autoShowModal={true} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (transaction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <TransactionStatus
            transaction={transaction}
            onClose={() => {
              setTransaction(null);
              setRoutes([]);
              setSelectedRoute(null);
              setSrcAmount('');
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Send className="h-10 w-10 text-primary" />
              Cross-Chain Payment
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
              Send any token, recipient receives any token on any chain
            </p>
          </div>
          <WalletConnect autoShowModal={false} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Payment Form */}
          <Card className="lg:col-span-3 shadow-xl">
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sender Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">
                    1
                  </div>
                  You Send
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <NetworkSelector
                    value={srcChain}
                    onChange={(chainId) => {
                      setSrcChain(chainId);
                      setSrcToken(null);
                    }}
                    includeTestnets={true}
                    placeholder="Select Chain"
                  />
                  <TokenSelector
                    chainId={srcChain}
                    value={srcToken?.address}
                    onChange={setSrcToken}
                    placeholder="Select Token"
                  />
                </div>

                <div>
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={srcAmount}
                    onChange={(e) => setSrcAmount(e.target.value)}
                    className="text-lg h-12"
                  />
                </div>
              </div>

              <div className="flex justify-center">
                <div className="p-2 bg-muted rounded-full">
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>

              {/* Recipient Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">
                    2
                  </div>
                  Recipient Receives
                </h3>

                <RecipientInput
                  value={recipientAddress}
                  onChange={setRecipientAddress}
                />

                <div className="grid grid-cols-2 gap-4">
                  <NetworkSelector
                    value={dstChain}
                    onChange={(chainId) => {
                      setDstChain(chainId);
                      setDstToken(null);
                    }}
                    includeTestnets={true}
                    placeholder="Destination Chain"
                  />
                  <TokenSelector
                    chainId={dstChain}
                    value={dstToken?.address}
                    onChange={setDstToken}
                    placeholder="Token to Receive"
                  />
                </div>
              </div>

              {/* Optional Message */}
              <div>
                <Label>Message (Optional)</Label>
                <Textarea
                  placeholder="Add a note..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="resize-none"
                  rows={2}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Get Routes Button */}
              <Button
                size="lg"
                className="w-full"
                onClick={handleGetRoutes}
                disabled={!canGetQuotes || isLoadingRoutes}
              >
                {isLoadingRoutes ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Finding Best Routes...
                  </>
                ) : (
                  <>
                    Find Routes
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Routes & Execute */}
          <Card className="lg:col-span-2 shadow-xl">
            <CardHeader>
              <CardTitle>Routes</CardTitle>
            </CardHeader>
            <CardContent>
              {routes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Enter payment details and click "Find Routes" to see options</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <RouteComparison
                    routes={routes}
                    selectedRoute={selectedRoute}
                    onSelectRoute={setSelectedRoute}
                    fromToken={srcToken}
                    toToken={dstToken}
                  />

                  {selectedRoute && (
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={handleExecute}
                      disabled={isExecuting}
                    >
                      {isExecuting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          Execute Payment
                          <Send className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

