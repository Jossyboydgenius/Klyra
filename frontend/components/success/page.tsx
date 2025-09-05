'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Extract order details from URL parameters
    const orderId = searchParams.get('orderId');
    const transactionHash = searchParams.get('transactionHash');
    const cryptoAmount = searchParams.get('cryptoAmount');
    const network = searchParams.get('network');
    const address = searchParams.get('address');
    const status = searchParams.get('status');

    if (orderId || transactionHash || cryptoAmount) {
      setOrderDetails({
        orderId,
        transactionHash,
        cryptoAmount,
        network,
        address,
        status
      });
    }
    
    setLoading(false);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Purchase Successful!
          </h1>
          <p className="text-gray-600 mb-6">
            Your cryptocurrency purchase has been completed successfully.
          </p>

          {/* Order Details */}
          {orderDetails && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-medium text-gray-900 mb-3">Order Details</h3>
              <div className="space-y-2 text-sm">
                {orderDetails.orderId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order ID:</span>
                    <span className="font-mono text-gray-900">{orderDetails.orderId}</span>
                  </div>
                )}
                {orderDetails.cryptoAmount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold text-green-600">{orderDetails.cryptoAmount}</span>
                  </div>
                )}
                {orderDetails.network && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Network:</span>
                    <span className="text-gray-900">{orderDetails.network}</span>
                  </div>
                )}
                {orderDetails.address && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Wallet:</span>
                    <span className="font-mono text-gray-900 text-xs">
                      {orderDetails.address.slice(0, 6)}...{orderDetails.address.slice(-4)}
                    </span>
                  </div>
                )}
                {orderDetails.transactionHash && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction:</span>
                    <span className="font-mono text-gray-900 text-xs">
                      {orderDetails.transactionHash.slice(0, 6)}...{orderDetails.transactionHash.slice(-4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Message */}
          {orderDetails?.status === 'success' ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 text-sm">
                ✅ Your cryptocurrency has been sent to your wallet. The transaction may take a few minutes to appear on the blockchain.
              </p>
            </div>
          ) : orderDetails?.status === 'fail' ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">
                ❌ The transaction failed. Please contact support if you believe this is an error.
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                ℹ️ Your order is being processed. You will receive a notification once the transaction is complete.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="block w-full p-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard
            </Link>
            
            <Link
              href="/buy-crypto"
              className="block w-full p-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Buy More Crypto
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-xs text-gray-500">
            <p>You will receive an email confirmation shortly.</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
