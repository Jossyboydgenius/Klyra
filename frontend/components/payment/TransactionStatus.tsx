'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Circle, Loader2, XCircle, ExternalLink, Clock } from 'lucide-react';
import type { CrossChainTransaction } from '@/lib/payment-types';

interface TransactionStatusProps {
  transaction: CrossChainTransaction;
  onClose?: () => void;
}

export function TransactionStatus({ transaction, onClose }: TransactionStatusProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'in_progress':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Circle className="h-5 w-5 text-gray-300" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'bridging':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (startedAt: Date, completedAt?: Date) => {
    const end = completedAt || new Date();
    const duration = Math.floor((end.getTime() - startedAt.getTime()) / 1000);
    if (duration < 60) return `${duration}s`;
    return `${Math.floor(duration / 60)}m ${duration % 60}s`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Transaction Status</CardTitle>
          <Badge className={getStatusColor(transaction.status)}>
            {transaction.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {transaction.steps.filter(s => s.status === 'completed').length} / {transaction.steps.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{
                width: `${(transaction.steps.filter(s => s.status === 'completed').length / transaction.steps.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <Separator />

        {/* Steps */}
        <div className="space-y-4">
          {transaction.steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="mt-1">{getStatusIcon(step.status)}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{step.name}</h4>
                  {step.startedAt && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(step.startedAt, step.completedAt)}
                    </span>
                  )}
                </div>
                {step.chainId && (
                  <p className="text-sm text-muted-foreground">
                    Chain ID: {step.chainId}
                  </p>
                )}
                {step.transactionHash && (
                  <a
                    href={`https://etherscan.io/tx/${step.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    View on Explorer
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {step.error && (
                  <p className="text-sm text-red-600 mt-1">{step.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Transaction Info */}
        {transaction.status === 'bridging' && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Loader2 className="h-5 w-5 text-purple-600 animate-spin mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900">Cross-Chain Transfer in Progress</h4>
                <p className="text-sm text-purple-700 mt-1">
                  Your transaction is being processed across chains. This may take several minutes.
                </p>
              </div>
            </div>
          </div>
        )}

        {transaction.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900">Transaction Completed!</h4>
                <p className="text-sm text-green-700 mt-1">
                  Your payment has been successfully processed.
                </p>
              </div>
            </div>
          </div>
        )}

        {transaction.status === 'failed' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900">Transaction Failed</h4>
                <p className="text-sm text-red-700 mt-1">
                  {transaction.error || 'An error occurred during the transaction.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {onClose && (
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

