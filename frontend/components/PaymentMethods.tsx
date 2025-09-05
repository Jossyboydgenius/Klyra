/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
'use client';
import React, { useState, useEffect } from 'react';
import { projectId } from '../lib/supabase/info';
import { PAYMENT_METHOD_TYPES } from '../lib/constants';
import { Card } from './ui/card';
import { Button } from './ui/button';
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
  onRefresh: () => void;
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

export const PaymentMethods: React.FC<PaymentMethodsProps> = ({ accessToken, onRefresh }) => {
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
        setPaymentMethods(data.paymentMethods || []);
      }
    } catch (error) {
      console.log('Error fetching payment methods:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPaymentMethod = (type: string) => {
    setSelectedType(type);
    setShowAddForm(true);
  };

  const handlePaymentMethodAdded = () => {
    setShowAddForm(false);
    setSelectedType('');
    fetchPaymentMethods();
    onRefresh();
  };

  const handleDeletePaymentMethod = async (id: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/${process.env.NEXT_PUBLIC_SUPABASE_FUNCTION_NAME}/payment-methods/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchPaymentMethods();
        onRefresh();
      }
    } catch (error) {
      console.log('Error deleting payment method:', error);
    }
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

  const getPaymentMethodTypeInfo = (type: string) => {
    return PAYMENT_METHOD_TYPES.find(pmt => pmt.type === type);
  };

  const formatPaymentMethodDetails = (method: PaymentMethod) => {
    const typeInfo = getPaymentMethodTypeInfo(method.type);
    if (!typeInfo) return method.name;

    switch (method.type) {
      case 'momo':
        return `${method.details.provider} • ${method.details.phone}`;
      case 'bank':
        return `${method.details.bank_name} • •••• ${method.details.account_number?.slice(-4)}`;
      case 'card':
        return `•••• •••• •••• ${method.details.card_number?.slice(-4)}`;
      default:
        return method.name;
    }
  };

  if (showAddForm) {
    return (
      <AddPaymentMethod
        type={selectedType}
        accessToken={accessToken}
        onSuccess={handlePaymentMethodAdded}
        onCancel={() => setShowAddForm(false)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment methods...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Payment Methods</h1>
          <p className="text-gray-600">Manage your traditional finance accounts</p>
        </div>

        {/* Payment Methods Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Add Payment Method Cards */}
          {PAYMENT_METHOD_TYPES.map((type) => {
            const IconComponent = type.icon === 'Smartphone' ? Smartphone : CreditCard;
            return (
              <Card 
                key={type.type}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow border-dashed border-2 border-gray-300 hover:border-blue-400"
                onClick={() => handleAddPaymentMethod(type.type)}
              >
                <div className="text-center space-y-3">
                  <div className={`w-12 h-12 rounded-full ${type.color} flex items-center justify-center mx-auto`}>
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{type.name}</p>
                    <p className="text-xs text-gray-600 leading-tight">{type.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Existing Payment Methods */}
        {paymentMethods.length > 0 && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Your Payment Methods</h2>
            <div className="space-y-3">
              {paymentMethods.map((method) => {
                const IconComponent = getPaymentMethodIcon(method.type);
                const typeInfo = getPaymentMethodTypeInfo(method.type);
                
                return (
                  <Card key={method.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-12 h-12 rounded-full ${typeInfo?.color || 'bg-gray-100'} flex items-center justify-center`}>
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 truncate">{method.name}</p>
                            {method.is_verified && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {formatPaymentMethodDetails(method)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Added {new Date(method.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-2"
                          onClick={() => handleDeletePaymentMethod(method.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {paymentMethods.length === 0 && (
          <Card className="p-8 text-center">
            <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Payment Methods</h3>
            <p className="text-gray-600 mb-6">
              Add your first payment method to start buying and selling crypto with ease.
            </p>
            <div className="text-sm text-gray-500">
              <p>✓ Bank accounts</p>
              <p>✓ Mobile money</p>
              <p>✓ Debit/Credit cards</p>
            </div>
          </Card>
        )}

        {/* Security Notice */}
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 mb-1">Secure & Encrypted</p>
              <p className="text-sm text-blue-700">
                All payment methods are secured with bank-level encryption and never stored in plain text.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};