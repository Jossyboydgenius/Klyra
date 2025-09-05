'use client';

import { useState, useEffect } from 'react';

interface TransactionStatusProps {
  reference: string;
  onComplete?: () => void;
}

interface TransactionData {
  id: string;
  payment_status: string;
  onramp_status: string;
  transfer_status: string;
  crypto_asset: string;
  crypto_amount: string;
  network: string;
  user_wallet_address: string;
  transfer_tx_hash?: string;
  error_message?: string;
}

export default function TransactionStatus({ reference, onComplete }: TransactionStatusProps) {
  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const pollTransaction = async () => {
      try {
        const response = await fetch(`/api/transaction/status?reference=${reference}`);
        const data = await response.json();

        if (data.success) {
          setTransaction(data.transaction);
          
          // If transfer is complete, stop polling
          if (data.transaction.transfer_status === 'success') {
            setLoading(false);
            onComplete?.();
          } else if (data.transaction.transfer_status === 'failed') {
            setLoading(false);
            setError(data.transaction.error_message || 'Transfer failed');
          }
        } else {
          setError(data.error || 'Failed to get transaction status');
          setLoading(false);
        }
      } catch (error) {
        setError('Failed to check transaction status');
        setLoading(false);
      }
    };

    // Poll every 10 seconds
    const interval = setInterval(pollTransaction, 10000);
    pollTransaction(); // Initial call

    return () => clearInterval(interval);
  }, [reference, onComplete]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'processing':
      case 'generated':
      case 'executed':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'success':
        return 'Success';
      case 'failed':
        return 'Failed';
      case 'generated':
        return 'URL Generated';
      case 'executed':
        return 'Admin Processed';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Transaction Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Transaction Status</h2>
          <p className="text-gray-600">Reference: {reference}</p>
        </div>

        {transaction && (
          <div className="space-y-6">
            {/* Transaction Details */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Transaction Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Asset:</span>
                  <span className="ml-2 font-medium">{transaction.crypto_amount} {transaction.crypto_asset}</span>
                </div>
                <div>
                  <span className="text-gray-600">Network:</span>
                  <span className="ml-2 font-medium">{transaction.network}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Wallet:</span>
                  <span className="ml-2 font-medium break-all">{transaction.user_wallet_address}</span>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Progress</h3>
              
              {/* Payment Status */}
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  transaction.payment_status === 'success' ? 'bg-green-500' : 
                  transaction.payment_status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                }`}></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Payment</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.payment_status)}`}>
                      {getStatusText(transaction.payment_status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Onramp Status */}
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  transaction.onramp_status === 'completed' ? 'bg-green-500' : 
                  transaction.onramp_status === 'executed' ? 'bg-blue-500' :
                  transaction.onramp_status === 'generated' ? 'bg-yellow-500' : 'bg-gray-300'
                }`}></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Admin Processing</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.onramp_status)}`}>
                      {getStatusText(transaction.onramp_status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transfer Status */}
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  transaction.transfer_status === 'success' ? 'bg-green-500' : 
                  transaction.transfer_status === 'failed' ? 'bg-red-500' : 'bg-gray-300'
                }`}></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Crypto Transfer</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.transfer_status)}`}>
                      {getStatusText(transaction.transfer_status)}
                    </span>
                  </div>
                  {transaction.transfer_tx_hash && (
                    <p className="text-xs text-gray-500 mt-1">
                      TX: {transaction.transfer_tx_hash.substring(0, 20)}...
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Current Status Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              {transaction.payment_status === 'pending' && (
                <p className="text-blue-800">
                  <strong>Waiting for payment confirmation.</strong> Please complete your mobile money or bank transfer.
                </p>
              )}
              {transaction.payment_status === 'success' && transaction.onramp_status === 'pending' && (
                <p className="text-blue-800">
                  <strong>Payment confirmed!</strong> Our team is processing your crypto purchase.
                </p>
              )}
              {transaction.onramp_status === 'generated' && (
                <p className="text-blue-800">
                  <strong>Processing crypto purchase.</strong> Our admin team is executing your transaction.
                </p>
              )}
              {transaction.onramp_status === 'executed' && transaction.transfer_status === 'pending' && (
                <p className="text-blue-800">
                  <strong>Crypto purchased!</strong> Transferring to your wallet now.
                </p>
              )}
              {transaction.transfer_status === 'success' && (
                <p className="text-green-800">
                  <strong>Complete!</strong> Your crypto has been sent to your wallet.
                </p>
              )}
            </div>

            {/* Loading indicator for pending transfers */}
            {loading && transaction.transfer_status === 'pending' && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Checking for updates...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
