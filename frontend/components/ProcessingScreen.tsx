/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/no-unescaped-entities */
'use client';
import React, { useState, useEffect } from 'react';
import { projectId } from '../lib/supabase/info';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle, Clock, CreditCard, Coins, Wallet } from 'lucide-react';

interface ProcessingScreenProps {
  transactionId: string;
  accessToken: string;
  onComplete: () => void;
}

const PROCESSING_STEPS = [
  {
    id: 'payment',
    title: 'Payment Confirmation',
    description: 'Confirming your payment',
    icon: CreditCard,
    duration: 2000
  },
  {
    id: 'purchase',
    title: 'Purchasing Crypto',
    description: 'Executing crypto purchase',
    icon: Coins,
    duration: 3000
  },
  {
    id: 'success',
    title: 'Purchase Complete',
    description: 'Crypto added to your wallet',
    icon: CheckCircle,
    duration: 1000
  }
];

export const ProcessingScreen: React.FC<ProcessingScreenProps> = ({ 
  transactionId, 
  accessToken, 
  onComplete 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [transaction, setTransaction] = useState<any>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    fetchTransaction();
    startProcessing();
  }, []);

  const fetchTransaction = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/${process.env.NEXT_PUBLIC_SUPABASE_FUNCTION_NAME}/transaction/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTransaction(data.transaction);
      }
    } catch (error) {
      console.log('Error fetching transaction:', error);
    }
  };

  const startProcessing = () => {
    // Simulate the three-step process
    PROCESSING_STEPS.forEach((step, index) => {
      setTimeout(() => {
        setCurrentStep(index + 1);
        
        // Complete the transaction on the final step
        if (index === PROCESSING_STEPS.length - 1) {
          setTimeout(async () => {
            await completeTransaction();
            setIsComplete(true);
          }, step.duration);
        }
      }, PROCESSING_STEPS.slice(0, index).reduce((sum, s) => sum + s.duration, 1000));
    });
  };

  const completeTransaction = async () => {
    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/${process.env.NEXT_PUBLIC_SUPABASE_FUNCTION_NAME}/transaction/${transactionId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.log('Error completing transaction:', error);
    }
  };

  const formatAmount = (amount: number, currency: string = 'GHS') => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: currency === 'GHS' ? 'GHS' : 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatCryptoAmount = (amount: number, symbol: string) => {
    return `${amount.toFixed(6)} ${symbol}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Transaction Summary */}
        {transaction && (
          <Card className="bg-white p-6 mb-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Transaction Summary</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-medium">{formatAmount(transaction.amount, transaction.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cryptocurrency:</span>
                  <span className="font-medium">{transaction.crypto_symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span>You'll receive:</span>
                  <span className="font-medium">{formatCryptoAmount(transaction.crypto_amount, transaction.crypto_symbol)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment method:</span>
                  <span className="font-medium capitalize">{transaction.payment_method}</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Processing Steps */}
        <Card className="bg-white p-6 mb-6">
          <div className="space-y-6">
            {PROCESSING_STEPS.map((step, index) => {
              const IconComponent = step.icon;
              const isActive = currentStep === index + 1;
              const isCompleted = currentStep > index + 1;
              const isPending = currentStep < index + 1;

              return (
                <div key={step.id} className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'bg-green-100 text-green-600'
                        : isActive
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : isActive ? (
                      <div className="animate-spin">
                        <Clock className="w-6 h-6" />
                      </div>
                    ) : (
                      <IconComponent className="w-6 h-6" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3
                      className={`font-medium ${
                        isCompleted || isActive ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p
                      className={`text-sm ${
                        isCompleted
                          ? 'text-green-600'
                          : isActive
                          ? 'text-blue-600'
                          : 'text-gray-400'
                      }`}
                    >
                      {isCompleted ? 'Completed' : isActive ? step.description : 'Waiting'}
                    </p>
                  </div>

                  <div className="text-right">
                    {isCompleted && (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    )}
                    {isActive && (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Success State */}
        {isComplete && (
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 p-6 text-center">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Purchase Successful!</h2>
            <p className="text-gray-600 mb-6">
              Your crypto has been added to your universal wallet and is available across all supported networks.
            </p>
            
            <Button onClick={onComplete} className="w-full mb-3">
              <Wallet className="w-4 h-4 mr-2" />
              Check Wallet
            </Button>
            
            <p className="text-xs text-gray-500">
              Transaction ID: {transactionId}
            </p>
          </Card>
        )}

        {/* Loading State */}
        {!isComplete && (
          <div className="text-center">
            <div className="animate-pulse text-gray-600">
              Processing your transaction...
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This usually takes 30-60 seconds
            </p>
          </div>
        )}
      </div>
    </div>
  );
};