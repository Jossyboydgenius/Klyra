'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Clock, XCircle, Loader2, RefreshCw, ExternalLink, Copy, Check } from 'lucide-react';
import { Transaction } from '@/lib/database/supabase-client';

interface TransactionDetailsProps {
  transactionId: string;
  onBack: () => void;
}

export function TransactionDetails({ transactionId, onBack }: TransactionDetailsProps) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadTransaction();
  }, [transactionId]);

  const loadTransaction = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/transactions/${transactionId}`);
      const data = await response.json();

      if (data.success) {
        setTransaction(data.transaction);
      } else {
        setError(data.error || 'Failed to load transaction');
      }
    } catch (err: any) {
      setError('Failed to load transaction');
      console.error('Error loading transaction:', err);
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async () => {
    if (!transaction?.paystack_reference) return;

    try {
      setVerifying(true);
      setError('');
      
      const response = await fetch('/api/paystack/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: transaction.paystack_reference })
      });

      const data = await response.json();

      if (data.success) {
        setTransaction(data.transaction);
      } else {
        setError(data.error || 'Failed to verify payment');
      }
    } catch (err: any) {
      setError('Failed to verify payment');
      console.error('Error verifying payment:', err);
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'generated':
      case 'executed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return <CheckCircle className="w-5 h-5" />;
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'failed':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Loader2 className="w-5 h-5 animate-spin" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  const formatAmount = (amount: string | number, currency: string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(num) + ' ' + currency;
  };

  const getExplorerUrl = (txHash: string, chainId?: string) => {
    if (!chainId) return null;
    
    const explorers: { [key: string]: string } = {
      '1': `https://etherscan.io/tx/${txHash}`,
      '8453': `https://basescan.org/tx/${txHash}`,
      '42161': `https://arbiscan.io/tx/${txHash}`,
      '10': `https://optimistic.etherscan.io/tx/${txHash}`,
      '137': `https://polygonscan.com/tx/${txHash}`,
      '43114': `https://snowtrace.io/tx/${txHash}`,
      '56': `https://bscscan.com/tx/${txHash}`,
    };
    
    return explorers[chainId] || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error && !transaction) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">{error}</p>
        <button
          onClick={onBack}
          className="mt-4 text-sm text-red-600 hover:text-red-800"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Transaction not found</p>
        <button
          onClick={onBack}
          className="mt-4 text-sm text-indigo-600 hover:text-indigo-800"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Transactions</span>
        </button>
        {transaction.paystack_reference && (
          <button
            onClick={verifyPayment}
            disabled={verifying}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Verify Payment
              </>
            )}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Transaction Overview */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Transaction Details</h2>
          <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 border ${getStatusColor(transaction.payment_status)}`}>
            {getStatusIcon(transaction.payment_status)}
            {transaction.payment_status}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payment Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Payment Information</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Fiat Amount</label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatAmount(transaction.fiat_amount, transaction.fiat_currency)}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Payment Method</label>
                <p className="text-gray-900 dark:text-white">
                  {transaction.payment_method || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Payment Status</label>
                <div className="flex items-center gap-2">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(transaction.payment_status)}`}>
                    {transaction.payment_status}
                  </div>
                </div>
              </div>
              {transaction.paystack_reference && (
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Reference</label>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {transaction.paystack_reference}
                    </code>
                    <button
                      onClick={() => copyToClipboard(transaction.paystack_reference!, 'reference')}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      {copied === 'reference' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Crypto Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Crypto Information</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Crypto Amount</label>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {transaction.crypto_amount} {transaction.crypto_asset}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Network</label>
                <p className="text-gray-900 dark:text-white">{transaction.network}</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Transaction Type</label>
                <p className="text-gray-900 dark:text-white capitalize">{transaction.transaction_type}</p>
              </div>
              {transaction.user_wallet_address && (
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Wallet Address</label>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {transaction.user_wallet_address.slice(0, 6)}...{transaction.user_wallet_address.slice(-4)}
                    </code>
                    <button
                      onClick={() => copyToClipboard(transaction.user_wallet_address, 'wallet')}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      {copied === 'wallet' ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Status Timeline */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Transaction Status</h3>
        <div className="space-y-4">
          {/* Payment Status */}
          <div className="flex items-start gap-4">
            <div className={`mt-1 p-2 rounded-full ${getStatusColor(transaction.payment_status)}`}>
              {getStatusIcon(transaction.payment_status)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-white">Payment</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(transaction.payment_status)}`}>
                  {transaction.payment_status}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {transaction.created_at && `Created: ${formatDate(transaction.created_at)}`}
              </p>
            </div>
          </div>

          {/* Transfer Status */}
          <div className="flex items-start gap-4">
            <div className={`mt-1 p-2 rounded-full ${getStatusColor(transaction.transfer_status)}`}>
              {getStatusIcon(transaction.transfer_status)}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 dark:text-white">Crypto Transfer</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(transaction.transfer_status)}`}>
                  {transaction.transfer_status}
                </span>
              </div>
              {transaction.transfer_tx_hash && (
                <div className="mt-2 flex items-center gap-2">
                  <code className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {transaction.transfer_tx_hash.slice(0, 10)}...{transaction.transfer_tx_hash.slice(-8)}
                  </code>
                  {getExplorerUrl(transaction.transfer_tx_hash, transaction.chain_id) && (
                    <a
                      href={getExplorerUrl(transaction.transfer_tx_hash, transaction.chain_id)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => copyToClipboard(transaction.transfer_tx_hash!, 'txhash')}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    {copied === 'txhash' ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-600" />
                    )}
                  </button>
                </div>
              )}
              {transaction.transfer_completed_at && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Completed: {formatDate(transaction.transfer_completed_at)}
                </p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {transaction.error_message && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>Error:</strong> {transaction.error_message}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* User Information */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">User Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">Email</label>
            <p className="text-gray-900 dark:text-white">{transaction.user_email}</p>
          </div>
          <div>
            <label className="text-sm text-gray-600 dark:text-gray-400">Phone</label>
            <p className="text-gray-900 dark:text-white">{transaction.user_phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

