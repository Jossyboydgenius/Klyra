'use client';

import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RecipientInput } from '@/components/payment/RecipientInput';
import { 
  Send, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight 
} from 'lucide-react';
import { parseUnits, Address, erc20Abi, formatUnits } from 'viem';
import { NetworkSelector } from '@/components/NetworkSelector';
import { TokenSelector } from '@/components/TokenSelector';
import { useWalletBalances } from '@/hooks/useWalletBalances';
import type { Chain, Token } from '@/lib/chain-data';

interface DirectSendProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export function DirectSend({ onComplete, onCancel }: DirectSendProps) {
  const { address, isConnected } = useAccount();
  const { balances } = useWalletBalances(address);

  // Form state
  const [chain, setChain] = useState<number | null>(null);
  const [token, setToken] = useState<Token | null>(null);
  const [recipient, setRecipient] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');

  // Transaction state
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [error, setError] = useState<string | null>(null);

  // Get available balance for selected token
  const availableBalance = React.useMemo(() => {
    if (!token || !chain || !balances) return null;
    
    const balanceItem = balances.find(
      b => b.token.address.toLowerCase() === token.address.toLowerCase() && 
           b.chain.id === chain
    );
    
    return balanceItem ? balanceItem.balanceFormatted : '0';
  }, [token, chain, balances]);

  // Validate amount
  const isValidAmount = React.useMemo(() => {
    if (!amount || !token) return false;
    const numAmount = parseFloat(amount);
    if (numAmount <= 0) return false;
    if (!availableBalance) return false;
    return numAmount <= parseFloat(availableBalance);
  }, [amount, token, availableBalance]);

  const canSend = isConnected && chain && token && recipient && isValidAmount && !isPending && !isConfirming;

  const handleSend = async () => {
    if (!canSend || !address || !token) return;

    setError(null);

    try {
      // Parse amount with token decimals
      const amountWei = parseUnits(amount, token.decimals);

      // Native token transfer
      if (token.address === '0x0000000000000000000000000000000000000000') {
        writeContract({
          to: recipient as Address,
          value: amountWei,
          chainId: chain,
        });
      } else {
        // ERC20 transfer
        writeContract({
          address: token.address as Address,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [recipient as Address, amountWei],
          chainId: chain,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
      console.error('Send error:', err);
    }
  };

  const handleMax = () => {
    if (availableBalance) {
      setAmount(availableBalance);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Transfer Successful!</h3>
            <p className="text-muted-foreground mb-6">
              Your {token?.symbol} has been sent successfully.
            </p>
            {hash && (
              <div className="bg-muted p-4 rounded-lg mb-6 w-full">
                <p className="text-sm text-muted-foreground mb-2">Transaction Hash:</p>
                <p className="text-sm font-mono break-all">{hash}</p>
              </div>
            )}
            <div className="flex gap-3">
              {onComplete && (
                <Button onClick={onComplete}>
                  Done
                </Button>
              )}
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Send More
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Please connect your wallet to send tokens
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Tokens
          </CardTitle>
          <CardDescription>
            Send tokens on the same chain to another address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Network Selection */}
          <div>
            <Label>Network</Label>
            <NetworkSelector
              value={chain}
              onChange={(chainId, chainData) => {
                setChain(chainId);
                setToken(null);
                setError(null);
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
          </div>

          {/* Amount */}
          {token && (
            <div>
              <Label>Amount</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError(null);
                  }}
                  placeholder="0.00"
                  step="0.000001"
                  disabled={!token}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {availableBalance && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleMax}
                      className="text-xs"
                    >
                      MAX
                    </Button>
                  )}
                  <span className="text-muted-foreground text-sm font-medium">
                    {token.symbol}
                  </span>
                </div>
              </div>
              {availableBalance && (
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    Available: {availableBalance} {token.symbol}
                  </p>
                  {amount && isValidAmount && (
                    <p className="text-xs text-green-600">
                      ✓ Valid amount
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Message (Optional) */}
          <div>
            <Label>Message (Optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message with your transfer..."
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {message.length}/200 characters
            </p>
          </div>

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
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSend}
              disabled={!canSend}
              className="flex-1"
            >
              {isPending || isConfirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isPending ? 'Preparing...' : 'Confirming...'}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {token && amount && isValidAmount && recipient && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Transfer Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">{amount} {token.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">From:</span>
              <span className="font-mono text-xs truncate max-w-[200px]">{address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">To:</span>
              <span className="font-mono text-xs truncate max-w-[200px]">{recipient}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network:</span>
              <span className="font-medium">
                {balances?.find(b => b.chain.id === chain)?.chain.name || 'Unknown'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

