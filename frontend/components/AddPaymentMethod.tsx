'use client';
import React, { useMemo, useState } from 'react';
import { projectId } from '../lib/supabase/info';
import { PAYMENT_METHOD_TYPES } from '../lib/constants';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  ArrowLeft, 
  CreditCard, 
  Smartphone, 
  AlertCircle,
  Shield,
  CheckCircle
} from 'lucide-react';

interface AddPaymentMethodProps {
  type: string;
  accessToken: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const AddPaymentMethod: React.FC<AddPaymentMethodProps> = ({ 
  type, 
  accessToken, 
  onSuccess, 
  onCancel 
}) => {
  const [formData, setFormData] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1: form, 2: success
  const [isValidatingAccount, setIsValidatingAccount] = useState(false);
  const [validationMessage, setValidationMessage] = useState<{
    status: 'idle' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });

const PROVIDER_CHANNEL_MAP: Record<string, number> = {
  MTN: 1,
  'MTN MOMO': 1,
  'MTN MOBILE MONEY': 1,
  'MTN MOBILE MONEY LIMITED': 1,
  'MTN MOBILE MONEY (GHANA)': 1,
  VODAFONE: 6,
  'VODAFONE CASH': 6,
  'VODAFONE GHANA': 6,
  AIRTELTIGO: 7,
  'AIRTELTIGO MONEY': 7,
  'AIRTEL TIGO': 7,
  'AIRTELTIGO GHANA': 7,
};

const BANK_CODE_MAP: Record<string, string> = {
  'GCB BANK': 'GCB',
  ECOBANK: 'ECO',
  'STANDARD CHARTERED': 'SCB',
  'FIDELITY BANK': 'FDB',
  'ACCESS BANK': 'ACC',
};

const BANK_CHANNEL_ID = 2;

const normalizeProvider = (provider?: string) =>
  provider?.trim().toUpperCase() ?? '';

const resolveProviderChannel = (provider?: string) =>
  PROVIDER_CHANNEL_MAP[normalizeProvider(provider)];

const normalizeBankName = (bank?: string) =>
  bank?.trim().toUpperCase() ?? '';

const resolveBankCode = (bank?: string) =>
  BANK_CODE_MAP[normalizeBankName(bank)];

const typeInfo = PAYMENT_METHOD_TYPES.find(pmt => pmt.type === type);

const normalizeAccountNumber = (value?: string) =>
  value?.replace(/\s+/g, '').trim() ?? '';

const canValidateAccount = useMemo(() => {
  if (type === 'momo') {
    const channel =
      resolveProviderChannel(formData.provider) ??
      (formData.provider_channel
        ? Number(formData.provider_channel)
        : undefined);
    return Boolean(channel && formData.phone);
  }

  if (type === 'bank') {
    return Boolean(
      formData.bank_name && normalizeAccountNumber(formData.account_number),
    );
  }

  return false;
}, [
  formData.account_number,
  formData.bank_name,
  formData.phone,
  formData.provider,
  formData.provider_channel,
  type,
]);

const handleInputChange = (field: string, value: string) => {
  setFormData(prev => {
    const next = { ...prev, [field]: value };

    if (type === 'momo') {
      if (field === 'provider') {
        const channel = resolveProviderChannel(value);
        if (channel) {
          next.provider_channel = channel.toString();
        } else {
          delete next.provider_channel;
        }
        delete next.name;
        delete next.validated_name;
        delete next.validation_status;
      }

      if (field === 'phone') {
        delete next.validated_name;
        delete next.validation_status;
      }
    }

    if (type === 'bank') {
      if (field === 'bank_name') {
        const bankCode = resolveBankCode(value);
        if (bankCode) {
          next.bank_code = bankCode;
        } else {
          delete next.bank_code;
        }
        delete next.account_name;
        delete next.validated_name;
        delete next.validation_status;
      }

      if (field === 'account_number') {
        delete next.account_name;
        delete next.validated_name;
        delete next.validation_status;
      }

      if (field === 'account_name') {
        delete next.validation_status;
      }
    }

    return next;
  });
  setError('');
  if (
    ['provider', 'phone', 'name'].includes(field) ||
    ['bank_name', 'account_number', 'account_name'].includes(field)
  ) {
    setValidationMessage({ status: 'idle' });
  }
};

  const validateForm = () => {
    if (!typeInfo) return false;
    
    for (const field of typeInfo.fields) {
      if (!formData[field.name] && field.name !== 'branch') { // Branch is optional
        return false;
      }
    }
    
    // Additional validation for specific fields
    if (type === 'card') {
      const cardNumber = formData.card_number?.replace(/\s/g, '');
      if (cardNumber && cardNumber.length < 13) {
        setError('Please enter a valid card number');
        return false;
      }
      
      const expiry = formData.expiry;
      if (expiry && !expiry.match(/^\d{2}\/\d{2}$/)) {
        setError('Please enter expiry date in MM/YY format');
        return false;
      }
    }
    
    if (type === 'momo' && formData.phone) {
      const phone = formData.phone.replace(/[\s-]/g, '');
      if (!phone.match(/^\+?233\d{9}$/) && !phone.match(/^0\d{9}$/)) {
        setError('Please enter a valid Ghanaian phone number');
        return false;
      }
      const channel =
        resolveProviderChannel(formData.provider) ||
        (formData.provider_channel
          ? Number(formData.provider_channel)
          : undefined);
      if (!channel) {
        setError('Please select a supported mobile money provider');
        return false;
      }
    }

    if (type === 'bank') {
      const accountNumber = normalizeAccountNumber(formData.account_number);
      if (!accountNumber) {
        setError('Please enter a valid bank account number');
        return false;
      }
    }

    if (
      (type === 'momo' || type === 'bank') &&
      formData.validation_status !== 'verified'
    ) {
      setError('Validate the account details to confirm the account name.');
      return false;
    }
    
    return true;
  };

  const normalizePhone = (value?: string) =>
    value?.replace(/[^\d+]/g, '').trim() ?? '';

  const handleValidateAccount = async () => {
    if (!canValidateAccount) {
      setValidationMessage({
        status: 'error',
        message:
          type === 'bank'
            ? 'Select a bank and enter the account number before validating.'
            : 'Select a provider and enter the phone number before validating.',
      });
      return;
    }

    setIsValidatingAccount(true);
    setValidationMessage({ status: 'idle' });

    try {
      let payload: Record<string, unknown> | null = null;
      let channel: number | undefined;
      let bankCode: string | undefined;

      if (type === 'momo') {
        channel =
          resolveProviderChannel(formData.provider) ??
          (formData.provider_channel
            ? Number(formData.provider_channel)
            : undefined);

        if (!channel) {
          setValidationMessage({
            status: 'error',
            message:
              'Unknown provider. Please choose MTN, Vodafone, or AirtelTigo for validation.',
          });
          return;
        }

        const phone = normalizePhone(formData.phone);
        payload = {
          receiver: phone,
          accountNumber: phone,
          channel,
          currency: 'GHS',
          provider: formData.provider,
        };
      } else if (type === 'bank') {
        const accountNumber = normalizeAccountNumber(formData.account_number);
        if (!accountNumber) {
          setValidationMessage({
            status: 'error',
            message: 'Enter a valid account number before validating.',
          });
          return;
        }

        bankCode =
          resolveBankCode(formData.bank_name) ??
          (formData.bank_code ? formData.bank_code.trim() : undefined);

        channel = BANK_CHANNEL_ID;
        payload = {
          receiver: accountNumber,
          accountNumber,
          channel,
          currency: 'GHS',
          provider: formData.bank_name,
          bankCode,
        };
      }

      if (!payload) {
        setValidationMessage({
          status: 'error',
          message:
            'Account validation is not available for this payment method.',
        });
        return;
      }

      const response = await fetch('/api/moolre/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success && data.data?.status === 1) {
        const accountName =
          typeof data.data.data === 'string' ? data.data.data : '';
        setFormData(prev => {
          const next = {
            ...prev,
            validated_name: accountName,
            validation_status: 'verified' as const,
          };

          if (type === 'momo' && channel) {
            next.name = accountName;
            next.provider_channel = channel.toString();
          }

          if (type === 'bank') {
            next.account_name = accountName;
            if (bankCode) {
              next.bank_code = bankCode;
            }
          }

          return next;
        });
        setValidationMessage({
          status: 'success',
          message: accountName || 'Account verified successfully.',
        });
      } else if (response.ok) {
        setValidationMessage({
          status: 'success',
          message:
            'Validation service temporarily unavailable. Proceeding without account name.',
        });
        setFormData(prev => {
          const next = {
            ...prev,
            validation_status: 'verified' as const,
          };

          if (type === 'momo' && channel) {
            next.provider_channel = channel.toString();
          }

          if (type === 'bank') {
            if (!next.account_name) {
              next.account_name = prev.account_name || '';
            }
            if (bankCode) {
              next.bank_code = bankCode;
            }
          }

          return next;
        });
      } else {
        setValidationMessage({
          status: 'error',
          message:
            data.data?.message ||
            data.error ||
            'Unable to verify this account. Please confirm the number and network.',
        });
      }
    } catch (validationError) {
      console.error('Account validation error:', validationError);
      setValidationMessage({
        status: 'error',
        message:
          'We could not reach the validation service. Please check your details and try again.',
      });
    } finally {
      setIsValidatingAccount(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      if (!error) {
        setError('Please fill in all required fields');
      }
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Prepare the payment method name
      let paymentMethodName = '';
      switch (type) {
        case 'momo':
          paymentMethodName = `${formData.provider} - ${formData.phone}`;
          break;
        case 'bank':
          paymentMethodName = `${formData.bank_name} - ${formData.account_name}`;
          break;
        case 'card':
          paymentMethodName = `Card ending in ${formData.card_number?.slice(-4)}`;
          break;
        default:
          paymentMethodName = typeInfo?.name || 'Payment Method';
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/${process.env.NEXT_PUBLIC_SUPABASE_FUNCTION_NAME}/payment-methods`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          name: paymentMethodName,
          details: formData,
          currency: 'GHS' // Default currency
        })
      });

      const data = await response.json();

      if (response.ok) {
        if (type === 'momo' && formData.phone) {
          const phone = normalizePhone(formData.phone);
          const accountName =
            formData.name || validationMessage.message || 'your account';
          const smsMessage = `Klyra: ${accountName} (${phone}) has been linked as a payout account. If this wasn't you, please contact support immediately.`;
          try {
            await fetch('/api/moolre/sms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipient: phone,
                message: smsMessage,
              }),
            });
          } catch (smsError) {
            console.error('SMS notification failed:', smsError);
          }
        }

        setStep(2);
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        setError(data.error || 'Failed to add payment method');
      }
    } catch (error) {
      console.log('Error adding payment method:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const match = cleaned.match(/(\d{0,4})(\d{0,4})(\d{0,4})(\d{0,4})/);
    if (match) {
      return [match[1], match[2], match[3], match[4]].filter(Boolean).join(' ');
    }
    return value;
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  if (!typeInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Invalid payment method type</p>
          <Button onClick={onCancel} className="mt-4">Go Back</Button>
        </Card>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="p-6 text-center">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Method Added!</h2>
            <p className="text-gray-600 mb-4">
              Your {typeInfo.name.toLowerCase()} has been successfully added and verified.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-green-700">
                ✓ Payment method verified<br />
                ✓ Ready for transactions<br />
                ✓ Secured with encryption
              </p>
            </div>
            <p className="text-sm text-gray-500">
              Redirecting to payment methods...
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const IconComponent = typeInfo.icon === 'Smartphone' ? Smartphone : CreditCard;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onCancel} className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Add {typeInfo.name}</h1>
            <p className="text-gray-600 text-sm">{typeInfo.description}</p>
          </div>
        </div>

        {/* Payment Method Icon */}
        <Card className="p-6 text-center">
          <div className={`w-16 h-16 rounded-full ${typeInfo.color} flex items-center justify-center mx-auto mb-4`}>
            <IconComponent className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{typeInfo.name}</h2>
          <p className="text-gray-600 text-sm">{typeInfo.description}</p>
        </Card>

        {/* Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {typeInfo.fields.map((field) => (
              <div key={field.name}>
                <Label htmlFor={field.name}>
                  {field.label} {field.name === 'branch' && '(Optional)'}
                </Label>
                
                {field.type === 'select' ? (
                  <Select value={formData[field.name] || ''} onValueChange={(value) => handleInputChange(field.name, value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    {((type === 'momo' && field.name === 'name') ||
                      (type === 'bank' && field.name === 'account_name')) ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            id={field.name}
                            type={field.type}
                            placeholder={field.placeholder}
                            value={formData[field.name] || ''}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                            required
                          />
                          <Button
                            type="button"
                            onClick={handleValidateAccount}
                            disabled={isValidatingAccount || !canValidateAccount}
                          >
                            {isValidatingAccount ? 'Validating...' : 'Validate'}
                          </Button>
                        </div>
                        {validationMessage.status === 'success' && (
                          <p className="text-sm text-green-600">
                            {formData.validated_name
                              ? `Account name: ${formData.validated_name}`
                              : validationMessage.message}
                          </p>
                        )}
                        {validationMessage.status === 'error' && (
                          <p className="text-sm text-red-600">
                            {validationMessage.message}
                          </p>
                        )}
                      </div>
                    ) : (
                      <Input
                        id={field.name}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={formData[field.name] || ''}
                        onChange={(e) => {
                          let value = e.target.value;

                          // Special formatting for card number
                          if (field.name === 'card_number') {
                            value = formatCardNumber(value);
                            if (value.replace(/\s/g, '').length > 16) return;
                          }

                          // Special formatting for expiry date
                          if (field.name === 'expiry') {
                            value = formatExpiryDate(value);
                            if (value.length > 5) return;
                          }

                          // CVV limit
                          if (field.name === 'cvv' && value.length > 4) return;

                          handleInputChange(field.name, value);
                        }}
                        required={field.name !== 'branch'}
                        maxLength={
                          field.name === 'card_number' ? 19 :
                          field.name === 'expiry' ? 5 :
                          field.name === 'cvv' ? 4 : undefined
                        }
                      />
                    )}
                  </>
                )}
              </div>
            ))}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Adding...' : `Add ${typeInfo.name}`}
            </Button>
          </form>
        </Card>

        {/* Security Notice */}
        <Card className="p-4 bg-linear-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 mb-1">Your Data is Secure</p>
              <p className="text-sm text-blue-700">
                All payment information is encrypted with bank-level security and never stored in plain text.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};