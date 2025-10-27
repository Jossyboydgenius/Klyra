'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, TrendingDown, TrendingUp, Zap, AlertCircle } from 'lucide-react';
import type { SwapRoute } from '@/lib/swap-types';
import { cn } from '@/lib/utils';

interface RouterSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routes: SwapRoute[];
  selectedRoute: SwapRoute | null;
  onSelectRoute: (route: SwapRoute) => void;
  srcToken?: string;
  dstToken?: string;
}

export function RouterSelectionModal({
  open,
  onOpenChange,
  routes,
  selectedRoute,
  onSelectRoute,
  srcToken = '',
  dstToken = '',
}: RouterSelectionModalProps) {
  const handleSelect = (route: SwapRoute) => {
    onSelectRoute(route);
    onOpenChange(false);
  };

  if (routes.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No Routes Available</DialogTitle>
            <DialogDescription>
              No swap routes are currently available for this token pair.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  // Find best rates
  const cheapestRoute = routes.reduce((prev, curr) =>
    (curr.gasCost && prev.gasCost && parseFloat(curr.gasCost) < parseFloat(prev.gasCost)) ? curr : prev
  );

  const fastestRoute = routes.find(r => r.isFastest) || routes[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Router</DialogTitle>
          <DialogDescription>
            Compare rates across different routers and select the best one for your swap
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {routes.map((route, index) => {
            const isSelected = selectedRoute?.routerId === route.routerId;
            const isCheapest = route.routerId === cheapestRoute.routerId;
            const isFastest = route.routerId === fastestRoute.routerId;
            const dstAmount = 'dstAmount' in route.quote ? route.quote.dstAmount : route.quote.dstTokenAmount;

            return (
              <button
                key={`${route.routerId}-${index}`}
                onClick={() => handleSelect(route)}
                className={cn(
                  'w-full p-4 rounded-lg border-2 transition-all text-left',
                  'hover:border-blue-500 hover:shadow-md',
                  isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-800'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Router Info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{route.routerName}</span>
                      {isSelected && (
                        <Check className="h-5 w-5 text-blue-500" />
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {route.isRecommended && (
                        <Badge variant="default" className="text-xs">
                          <Zap className="h-3 w-3 mr-1" />
                          Recommended
                        </Badge>
                      )}
                      {isCheapest && (
                        <Badge variant="secondary" className="text-xs">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Lowest Gas
                        </Badge>
                      )}
                      {isFastest && (
                        <Badge variant="outline" className="text-xs">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Fastest
                        </Badge>
                      )}
                    </div>

                    {/* Route Details */}
                    {route.route && route.route.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Route:</span> {route.route.join(' → ')}
                      </div>
                    )}

                    {/* Output Amount */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">
                        {parseFloat(dstAmount).toFixed(6)}
                      </span>
                      <span className="text-sm text-muted-foreground">{dstToken}</span>
                    </div>

                    {/* Gas Cost */}
                    {route.gasCost && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Gas Cost:</span>{' '}
                        <span className="font-medium">~{route.gasCost} ETH</span>
                      </div>
                    )}

                    {/* Price Impact */}
                    {route.priceImpact !== undefined && (
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-muted-foreground">Price Impact:</span>
                        <span
                          className={cn(
                            'font-medium',
                            route.priceImpact > 5 ? 'text-red-500' : route.priceImpact > 1 ? 'text-orange-500' : 'text-green-500'
                          )}
                        >
                          {route.priceImpact > 0 ? '+' : ''}{route.priceImpact.toFixed(2)}%
                        </span>
                        {route.priceImpact > 5 && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Select Button */}
                  <div className="flex flex-col items-end gap-2">
                    <Button
                      size="sm"
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={() => handleSelect(route)}
                    >
                      {isSelected ? 'Selected' : 'Select'}
                    </Button>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Info Footer */}
        <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">Router Selection Tips:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Recommended routes offer the best balance of speed and cost</li>
                <li>Lowest gas routes minimize transaction fees</li>
                <li>Consider price impact for large trades</li>
                <li>Quotes refresh every 15 seconds</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

