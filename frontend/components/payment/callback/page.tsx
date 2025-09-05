'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TransactionStatus } from '@/components/TransactionStatus';

export default function PaymentCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [reference, setReference] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');

  useEffect(() => {
    const ref = searchParams.get('reference');
    const trxref = searchParams.get('trxref');
    
    // Paystack returns reference as 'trxref' in callback
    const paymentReference = ref || trxref;
    
    if (paymentReference) {
      setReference(paymentReference);
      verifyPayment(paymentReference);
    } else {
      setStatus('failed');
    }
  }, [searchParams]);

  const verifyPayment = async (ref: string) => {
    try {
      const response = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reference: ref }),
      });

      const data = await response.json();

      if (data.success && data.data.status === 'success') {
        setStatus('success');
      } else {
        setStatus('failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('failed');
    }
  };

  const handleReturnHome = () => {
    router.push('/buy-crypto');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying Payment</h2>
          <p className="text-gray-600">Please wait while we confirm your payment...</p>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Failed</h2>
          <p className="text-gray-600 mb-6">
            We couldn't verify your payment. Please try again or contact support if the issue persists.
          </p>
          <button
            onClick={handleReturnHome}
            className="w-full p-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Success case - show transaction status component
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-600">Your payment has been confirmed. We're now processing your crypto purchase.</p>
          </div>
          
          {reference && <TransactionStatus reference={reference} />}
        </div>

        <div className="text-center">
          <button
            onClick={handleReturnHome}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Make Another Purchase
          </button>
        </div>
      </div>
    </div>
  );
}
