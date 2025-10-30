'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, Clock, DollarSign, TrendingUp, Zap, Shield } from 'lucide-react';
import type { UnifiedRoute } from '@/lib/payment-types';
import { formatUnits } from 'viem';

interface RouteComparisonProps {
  routes: UnifiedRoute[];
  selectedRoute: UnifiedRoute | null;
  onSelectRoute: (route: UnifiedRoute) => void;
  fromToken: any;
  toToken: any;
}

export function RouteComparison({
  routes,
  selectedRoute,
  onSelectRoute,
  fromToken,
  toToken,
}: RouteComparisonProps) {
  if (routes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No routes available. Try different tokens or chains.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Available Routes</h3>
        <Badge variant="outline">{routes.length} options</Badge>
      </div>

      <div className="grid gap-4">
        {routes.map((route) => (
          <Card
            key={route.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedRoute?.id === route.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onSelectRoute(route)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{route.providerName}</CardTitle>
                  {route.isRecommended && (
                    <Badge variant="default" className="text-xs">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Best
                    </Badge>
                  )}
                  {route.isFastest && (
                    <Badge variant="secondary" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Fastest
                    </Badge>
                  )}
                  {route.isCheapest && (
                    <Badge variant="outline" className="text-xs">
                      <DollarSign className="h-3 w-3 mr-1" />
                      Cheapest
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={selectedRoute?.id === route.id ? 'default' : 'outline'}
                >
                  {selectedRoute?.id === route.id ? 'Selected' : 'Select'}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Amount Display */}
              <div className="flex items-center justify-between text-lg font-semibold">
                <div>
                  {formatUnits(BigInt(route.fromAmount), fromToken?.decimals || 18)} {fromToken?.symbol}
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                <div className="text-green-600">
                  {formatUnits(BigInt(route.toAmount), toToken?.decimals || 18)} {toToken?.symbol}
                </div>
              </div>

              <Separator />

              {/* Route Details */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Time
                  </div>
                  <div className="font-medium mt-1">
                    {Math.floor(route.estimatedTime / 60)}m {route.estimatedTime % 60}s
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Gas
                  </div>
                  <div className="font-medium mt-1">
                    ${route.totalGasUSD.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Fees
                  </div>
                  <div className="font-medium mt-1">
                    ${route.totalFeeUSD.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div>
                <div className="text-xs text-muted-foreground mb-2">Route Steps:</div>
                <div className="flex flex-wrap gap-2">
                  {route.steps.map((step, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {step.description}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Price Impact */}
              {route.priceImpact !== undefined && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Price Impact: </span>
                  <span className={route.priceImpact > 2 ? 'text-red-600' : 'text-green-600'}>
                    {route.priceImpact.toFixed(2)}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

