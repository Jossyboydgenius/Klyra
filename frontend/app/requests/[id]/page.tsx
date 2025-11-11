'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { WalletConnect } from '@/components/WalletConnect';
import { NetworkSelector } from '@/components/NetworkSelector';
import { TokenSelector } from '@/components/TokenSelector';
import { RouteComparison } from '@/components/payment/RouteComparison';
import { TransactionStatus } from '@/components/payment/TransactionStatus';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock, ArrowRight } from 'lucide-react';
import { getPaymentRequest, updatePaymentRequest } from '@/lib/supabase/payment-requests';
import { useRouteAggregator } from '@/hooks/useRouteAggregator';
import { transactionExecutor } from '@/lib/transaction-executor';
import type { PaymentRequest, UnifiedRoute, PaymentIntent, CrossChainTransaction } from '@/lib/payment-types';
import type { Token } from '@/lib/chain-data';
import { useConfig } from 'wagmi';

export default function PaymentRequestPage() {
  const params = useParams();
  const { address, isConnected } = useAccount();
  const wagmiConfig = useConfig();
  const routeAggregator = useRouteAggregator();

  const [request, setRequest] = useState<PaymentRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment state
  const [srcChain, setSrcChain] = useState<number | null>(null);
  const [srcToken, setSrcToken] = useState<Token | null>(null);
  const [routes, setRoutes] = useState<UnifiedRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<UnifiedRoute | null>(null);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);

  // Transaction state
  const [transaction, setTransaction] = useState<CrossChainTransaction | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    loadRequest();
  }, [params.id]);

  const loadRequest = async () => {
    if (!params.id) return;

    setIsLoading(true);
    try {
      const req = await getPaymentRequest(params.id as string);
      if (!req) {
        setError('Payment request not found');
      } else if (req.status === 'expired') {
        setError('This payment request has expired');
      } else if (req.status === 'paid') {
        setError('This payment request has already been paid');
      } else {
        setRequest(req);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load payment request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindRoutes = async () => {
    if (!request || !srcChain || !srcToken || !address) return;

    setIsLoadingRoutes(true);
    setError(null);

    try {
      const intent: PaymentIntent = {
        sender: {
          address,
          token: srcToken,
          chain: srcChain,
          amount: request.amount, // Will be calculated
        },
        recipient: {
          address: request.merchant.address,
          token: request.merchant.token,
          chain: request.merchant.chain,
          expectedAmount: request.amount,
        },
      };

      const comparison = await routeAggregator.findBestRoutes(intent);
      setRoutes(comparison.allRoutes);
      setSelectedRoute(comparison.recommended);
    } catch (err: any) {
      setError(err.message || 'Failed to find routes');
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  const handlePay = async () => {
    if (!selectedRoute || !address || !request) return;

    setIsExecuting(true);
    setError(null);

    try {
      const tx = await transactionExecutor.execute(selectedRoute, address, wagmiConfig);
      setTransaction(tx);

      if (tx.status === 'completed') {
        await updatePaymentRequest(request.id, {
          status: 'paid',
          paidBy: address,
          paidAt: new Date(),
          transactionHash: tx.transactionHashes[0],
        });
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setIsExecuting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Payment Request Error</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (transaction) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <TransactionStatus
            transaction={transaction}
            onClose={() => {
              setTransaction(null);
              loadRequest();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {!isConnected && (
          <Card className="mb-6 shadow-xl">
            <CardContent className="py-8 flex flex-col items-center gap-4">
              <p className="text-lg font-medium">Connect wallet to pay</p>
              <WalletConnect autoShowModal={true} />
            </CardContent>
          </Card>
        )}

        {/* Payment Request Details */}
        <Card className="mb-6 shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{request?.merchant.name}</CardTitle>
                <CardDescription>Payment Request</CardDescription>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                {request?.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Amount Due</Label>
                <div className="text-2xl font-bold">
                  {request?.amount} {request?.merchant.token.symbol}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Chain</Label>
                <div className="text-2xl font-bold">
                  ID {request?.merchant.chain}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="mt-1">{request?.description}</p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Expires: {request?.expiresAt.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {isConnected && (
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Pay with Your Tokens</CardTitle>
              <CardDescription>
                Choose any token from any chain to pay this request
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pay From Chain</Label>
                  <NetworkSelector
                    value={srcChain}
                    onChange={(chainId) => {
                      setSrcChain(chainId);
                      setSrcToken(null);
                      setRoutes([]);
                    }}
                    includeTestnets={true}
                    placeholder="Select Chain"
                  />
                </div>
                <div>
                  <Label>Pay With Token</Label>
                  <TokenSelector
                    chainId={srcChain}
                    value={srcToken?.address}
                    onChange={(token) => {
                      setSrcToken(token);
                      setRoutes([]);
                    }}
                    placeholder="Select Token"
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!routes.length ? (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleFindRoutes}
                  disabled={!srcChain || !srcToken || isLoadingRoutes}
                >
                  {isLoadingRoutes ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Finding Routes...
                    </>
                  ) : (
                    <>
                      Find Best Route
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-4">
                  <RouteComparison
                    routes={routes}
                    selectedRoute={selectedRoute}
                    onSelectRoute={setSelectedRoute}
                    fromToken={srcToken}
                    toToken={request?.merchant.token}
                  />

                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handlePay}
                    disabled={!selectedRoute || isExecuting}
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Pay Now
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

