'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { NetworkSelector } from '@/components/NetworkSelector';
import { TokenSelector } from '@/components/TokenSelector';
import { WalletConnect } from '@/components/WalletConnect';
import type { Chain, Token } from '@/lib/chain-data';
import { useSwap } from '@/hooks/useSwap';
import { RouterSelectionModal } from '@/components/swap/RouterSelectionModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  ArrowDownUp,
  ArrowRight,
  Settings,
  Zap,
  RefreshCw,
  AlertCircle,
  Check,
  TrendingUp,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SwapPage() {
  const { address, isConnected } = useAccount();
  const { state, actions } = useSwap(address || '0x0000000000000000000000000000000000000000');
  const [routerModalOpen, setRouterModalOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSrcChainChange = (chainId: number, chain: Chain) => {
    actions.setSrcChain(chainId);
  };

  const handleDstChainChange = (chainId: number, chain: Chain) => {
    actions.setDstChain(chainId);
  };

  const handleSwitch = () => {
    actions.switchTokens();
  };

  const isSwapReady = state.srcChainId && state.dstChainId && state.srcToken && state.dstToken && state.srcAmount && state.selectedRoute;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Zap className="h-10 w-10 text-blue-500" />
              Token Swap
            </h1>
            <WalletConnect autoShowModal={false} className="ml-auto" />
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Swap tokens across chains with the best rates from 1inch and more routers
          </p>
        </div>

        {!isConnected ? (
          <Card className="max-w-2xl mx-auto shadow-xl">
            <CardHeader>
              <CardTitle className="text-center">Connect Your Wallet</CardTitle>
              <CardDescription className="text-center">
                Connect your wallet to start swapping tokens across chains
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-4">
                <Zap className="h-8 w-8 text-blue-500" />
              </div>
              <WalletConnect autoShowModal={true} />
              <div className="text-sm text-muted-foreground text-center max-w-sm">
                <ul className="space-y-2 text-left">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Swap tokens on the same chain
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Bridge assets across chains
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Get the best rates from multiple routers
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Main Swap Card */}
            <Card className="lg:col-span-3 shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Swap Tokens</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
                {state.swapType && (
                  <CardDescription>
                    <Badge variant="outline">
                      {state.swapType === 'same-chain' && 'Same Chain Swap'}
                      {state.swapType === 'cross-chain' && 'Cross-Chain Swap'}
                      {state.swapType === 'same-token-cross-chain' && 'Bridge Transfer'}
                    </Badge>
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
              {/* Advanced Settings */}
              {showAdvanced && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Slippage Tolerance</Label>
                        <div className="flex gap-2 mt-1">
                          {[0.1, 0.5, 1.0].map((val) => (
                            <Button
                              key={val}
                              size="sm"
                              variant={state.slippage === val ? 'default' : 'outline'}
                              onClick={() => actions.setSlippage(val)}
                              className="flex-1"
                            >
                              {val}%
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Custom Slippage (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="50"
                          value={state.slippage}
                          onChange={(e) => actions.setSlippage(parseFloat(e.target.value) || 0.5)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Source Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>From</Label>
                  {state.srcToken && (
                    <span className="text-xs text-muted-foreground">
                      Balance: 0.00 {state.srcToken.symbol}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <NetworkSelector
                    value={state.srcChainId}
                    onChange={handleSrcChainChange}
                    includeTestnets={true}
                    placeholder="Source Chain"
                  />
                  <TokenSelector
                    chainId={state.srcChainId}
                    value={state.srcToken?.address}
                    onChange={actions.setSrcToken}
                    placeholder="Token"
                  />
                </div>

                <div>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={state.srcAmount}
                    onChange={(e) => actions.setSrcAmount(e.target.value)}
                    className="text-2xl h-14 font-semibold"
                  />
                </div>
              </div>

              {/* Switch Button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleSwitch}
                  disabled={!state.srcChainId || !state.dstChainId}
                  className="rounded-full"
                >
                  <ArrowDownUp className="h-4 w-4" />
                </Button>
              </div>

              {/* Destination Section */}
              <div className="space-y-3">
                <Label>To</Label>

                <div className="grid grid-cols-2 gap-2">
                  <NetworkSelector
                    value={state.dstChainId}
                    onChange={handleDstChainChange}
                    includeTestnets={true}
                    placeholder="Destination Chain"
                  />
                  <TokenSelector
                    chainId={state.dstChainId}
                    value={state.dstToken?.address}
                    onChange={actions.setDstToken}
                    placeholder="Token"
                  />
                </div>

                <div className="relative">
                  <Input
                    type="text"
                    placeholder="0.00"
                    value={state.isLoadingQuotes ? 'Loading...' : state.dstAmount}
                    readOnly
                    className="text-2xl h-14 font-semibold bg-muted"
                  />
                  {state.isLoadingQuotes && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Error Alert */}
              {state.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}

              {/* Router Selection Button */}
              {state.availableRoutes.length > 0 && state.selectedRoute && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setRouterModalOpen(true)}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>Router: {state.selectedRoute.routerName}</span>
                    <div className="flex items-center gap-2">
                      {state.selectedRoute.isRecommended && (
                        <Badge variant="default" className="text-xs">
                          Best Rate
                        </Badge>
                      )}
                      <ExternalLink className="h-4 w-4" />
                    </div>
                  </div>
                </Button>
              )}

              {/* Swap Button */}
              <Button
                size="lg"
                className="w-full"
                disabled={!isSwapReady || state.isLoadingCalldata}
                onClick={() => actions.generateCalldata()}
              >
                {state.isLoadingCalldata ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Preparing Swap...
                  </>
                ) : state.approvalNeeded ? (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Approve & Swap
                  </>
                ) : (
                  <>
                    Swap Tokens
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={actions.refreshQuotes}
                disabled={state.isLoadingQuotes || !state.srcToken || !state.dstToken}
                className="w-full"
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", state.isLoadingQuotes && "animate-spin")} />
                Refresh Quotes
              </Button>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="lg:col-span-2 shadow-xl h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Swap Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!state.selectedRoute ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Enter swap details to see quote information</p>
                </div>
              ) : (
                <>
                  {/* Rate */}
                  {state.srcToken && state.dstToken && state.srcAmount && state.dstAmount && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Rate</span>
                        <span className="font-medium">
                          1 {state.srcToken.symbol} ={' '}
                          {(parseFloat(state.dstAmount) / parseFloat(state.srcAmount)).toFixed(6)}{' '}
                          {state.dstToken.symbol}
                        </span>
                      </div>
                      <Separator />
                    </div>
                  )}

                  {/* Gas Cost */}
                  {state.selectedRoute.gasCost && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Estimated Gas</span>
                      <span className="font-medium">~{state.selectedRoute.gasCost} ETH</span>
                    </div>
                  )}

                  {/* Slippage */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Slippage Tolerance</span>
                    <span className="font-medium">{state.slippage}%</span>
                  </div>

                  {/* Route */}
                  {state.selectedRoute.route && state.selectedRoute.route.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm text-muted-foreground">Route</span>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex flex-wrap gap-2 text-xs">
                          {state.selectedRoute.route.map((protocol, idx) => (
                            <React.Fragment key={idx}>
                              <Badge variant="secondary">{protocol}</Badge>
                              {idx < state.selectedRoute!.route!.length - 1 && (
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Price Impact */}
                  {state.selectedRoute.priceImpact !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Price Impact</span>
                      <span
                        className={cn(
                          'font-medium',
                          state.selectedRoute.priceImpact > 5
                            ? 'text-red-500'
                            : state.selectedRoute.priceImpact > 1
                            ? 'text-orange-500'
                            : 'text-green-500'
                        )}
                      >
                        {state.selectedRoute.priceImpact > 0 ? '+' : ''}
                        {state.selectedRoute.priceImpact.toFixed(2)}%
                      </span>
                    </div>
                  )}

                  <Separator />

                  {/* Minimum Received */}
                  {state.dstAmount && state.dstToken && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Minimum Received</span>
                      <span className="font-medium">
                        {(parseFloat(state.dstAmount) * (1 - state.slippage / 100)).toFixed(6)}{' '}
                        {state.dstToken.symbol}
                      </span>
                    </div>
                  )}

                  {/* Auto-refresh indicator */}
                  <div className="text-xs text-muted-foreground text-center pt-2 flex items-center justify-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Quotes auto-refresh every 15s
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {/* Calldata Display (for debugging) */}
        {state.calldata && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm">Transaction Calldata</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                {JSON.stringify(state.calldata.tx, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Router Selection Modal */}
        <RouterSelectionModal
          open={routerModalOpen}
          onOpenChange={setRouterModalOpen}
          routes={state.availableRoutes}
          selectedRoute={state.selectedRoute}
          onSelectRoute={actions.setSelectedRoute}
          srcToken={state.srcToken?.symbol}
          dstToken={state.dstToken?.symbol}
        />
      </div>
    </div>
  );
}

