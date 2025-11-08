/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';
import React, { useState, useEffect } from 'react';
import { projectId } from '../lib/supabase/info';
import { PAYMENT_METHOD_TYPES } from '../lib/constants';
import { Web3Container, Web3Card, Web3Button } from './Web3Theme';
import { Badge } from './ui/badge';
import { 
  Plus, 
  CreditCard, 
  Smartphone, 
  MoreVertical,
  Shield,
  Trash2,
  Edit
} from 'lucide-react';
import { AddPaymentMethod } from './AddPaymentMethod';

interface PaymentMethodsProps {
  accessToken: string;
  onRefreshAction: () => void;
}

interface PaymentMethod {
  id: string;
  type: string;
  name: string;
  details: any;
  currency: string;
  is_verified: boolean;
  created_at: string;
}

export const PaymentMethods: React.FC<PaymentMethodsProps> = ({ accessToken, onRefreshAction }) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/${process.env.NEXT_PUBLIC_SUPABASE_FUNCTION_NAME}/user/profile`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.payment_methods || []);
      }
    } catch {
      console.error('Error fetching payment methods');
    } finally {
      setIsLoading(false);
    }
  };

  const deletePaymentMethod = async (methodId: string) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return;

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/${process.env.NEXT_PUBLIC_SUPABASE_FUNCTION_NAME}/payment-methods/${methodId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchPaymentMethods();
        onRefreshAction();
      }
    } catch {
      console.error('Error deleting payment method');
    }
  };

  const handleAddSuccess = () => {
    setShowAddForm(false);
    setSelectedType('');
    fetchPaymentMethods();
    onRefreshAction();
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'momo':
        return Smartphone;
      case 'bank':
      case 'card':
        return CreditCard;
      default:
        return CreditCard;
    }
  };

  const formatPaymentMethodDetails = (method: PaymentMethod) => {
    switch (method.type) {
      case 'momo':
        return [
          method.details?.provider,
          method.details?.phone || method.details?.phone_number,
          method.details?.validated_name || method.details?.name,
        ]
          .filter(Boolean)
          .join(' • ');
      case 'bank':
        return [
          method.details?.bank_name,
          method.details?.account_number?.slice(-4)
            ? `•••• ${method.details.account_number.slice(-4)}`
            : undefined,
          method.details?.account_name,
        ]
          .filter(Boolean)
          .join(' • ');
      case 'card':
        return `Card ending ${method.details.card_number?.slice(-4)}`;
      default:
        return method.name;
    }
  };

  if (showAddForm) {
    return (
      <AddPaymentMethod
        accessToken={accessToken}
        type={selectedType}
        onSuccess={handleAddSuccess}
        onCancel={() => {
          setShowAddForm(false);
          setSelectedType('');
        }}
      />
    );
  }

  return (
    <Web3Container>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Payment Methods</h1>
          <p className="text-indigo-200/80">
            Manage your payment methods for buying and selling cryptocurrency
          </p>
        </div>

        {isLoading ? (
          <Web3Card>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
              <p className="text-indigo-200/70 mt-4">Loading payment methods...</p>
            </div>
          </Web3Card>
        ) : (
          <>
            {/* Add New Payment Method */}
            <Web3Card className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Add New Payment Method</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PAYMENT_METHOD_TYPES.map((paymentType) => {
                  const IconComponent = getPaymentMethodIcon(paymentType.type);
                  return (
                    <Web3Button
                      key={paymentType.type}
                      onClick={() => {
                        setSelectedType(paymentType.type);
                        setShowAddForm(true);
                      }}
                      className="flex flex-col items-center gap-3 p-6 h-auto"
                      variant="secondary"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{paymentType.name}</p>
                        <p className="text-sm opacity-70">{paymentType.description}</p>
                      </div>
                    </Web3Button>
                  );
                })}
              </div>
            </Web3Card>

            {/* Existing Payment Methods */}
            {paymentMethods.length > 0 ? (
              <Web3Card>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-white">Your Payment Methods</h2>
                  <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/30">
                    {paymentMethods.length} method{paymentMethods.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="space-y-4">
                  {paymentMethods.map((method) => {
                    const IconComponent = getPaymentMethodIcon(method.type);
                    
                    return (
                      <div 
                        key={method.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <IconComponent className="w-6 h-6 text-blue-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-white">{method.name}</p>
                              {(method.is_verified || method.details?.validation_status === 'verified') && (
                                <Badge className="bg-green-400/20 text-green-400 border-green-400/30">
                                  <Shield className="w-3 h-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-indigo-200/70">
                              {formatPaymentMethodDetails(method)}
                            </p>
                            <p className="text-xs text-indigo-200/50">
                              Added {new Date(method.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Web3Button
                            variant="ghost"
                            className="p-2"
                            icon
                          >
                            <Edit className="w-4 h-4" />
                          </Web3Button>
                          <Web3Button
                            variant="ghost"
                            onClick={() => deletePaymentMethod(method.id)}
                            className="p-2 text-red-400 hover:bg-red-500/20"
                            icon
                          >
                            <Trash2 className="w-4 h-4" />
                          </Web3Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Web3Card>
            ) : (
              <Web3Card className="text-center py-12">
                <CreditCard className="w-16 h-16 text-indigo-200/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Payment Methods</h3>
                <p className="text-indigo-200/70 mb-6">
                  Add a payment method to start buying and selling cryptocurrency
                </p>
                <Web3Button onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Payment Method
                </Web3Button>
              </Web3Card>
            )}

            {/* Info Section */}
            <Web3Card className="mt-6 bg-blue-500/20 border-blue-400/30">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-300 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-300 mb-2">Security & Privacy</h3>
                  <ul className="text-sm text-blue-200 space-y-1">
                    <li>• All payment information is encrypted and secure</li>
                    <li>• We partner with trusted payment providers</li>
                    <li>• Your financial data is never shared with third parties</li>
                    <li>• Verified methods have enhanced security features</li>
                  </ul>
                </div>
              </div>
            </Web3Card>
          </>
        )}
      </div>
    </Web3Container>
  );
};
