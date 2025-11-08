'use client';

import { Suspense } from 'react';
import PaymentCallback from '@/components/payment/callback/page';

function CallbackFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-indigo-200/80">Loading payment status...</p>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <PaymentCallback />
    </Suspense>
  );
}

