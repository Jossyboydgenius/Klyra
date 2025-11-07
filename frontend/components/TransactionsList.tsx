'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ArrowRight, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Transaction } from '@/lib/database/supabase-client';

interface TransactionsListProps {
  onSelectTransaction?: (transaction: Transaction) => void;
}

export function TransactionsList({ onSelectTransaction }: TransactionsListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { address } = useAccount();

  useEffect(() => {
    if (address) {
      loadTransactions();
    }
  }, [address]);

  const loadTransactions = async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/api/transactions?wallet=${address.toLowerCase()}&limit=50`);
      const data = await response.json();

      if (data.success) {
        setTransactions(data.transactions);
      } else {
        setError(data.error || 'Failed to load transactions');
      }
    } catch (err: any) {
      setError('Failed to load transactions');
      console.error('Error loading transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'generated':
      case 'executed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Loader2 className="w-4 h-4 animate-spin" />;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatAmount = (amount: string | number, currency: string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(num) + ' ' + currency;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">{error}</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No transactions found</p>
        <p className="text-gray-400 text-sm mt-2">Your transaction history will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          onClick={() => onSelectTransaction?.(transaction)}
          className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(transaction.payment_status)}`}>
                  {getStatusIcon(transaction.payment_status)}
                  {transaction.payment_status}
                </div>
                <span className="text-xs text-gray-500">{formatDate(transaction.created_at)}</span>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Amount</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatAmount(transaction.fiat_amount, transaction.fiat_currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Crypto</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {transaction.crypto_amount} {transaction.crypto_asset}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Network</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {transaction.network}
                  </span>
                </div>
                {transaction.paystack_reference && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Reference</span>
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                      {transaction.paystack_reference.slice(0, 8)}...
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {onSelectTransaction && (
              <div className="ml-4">
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

