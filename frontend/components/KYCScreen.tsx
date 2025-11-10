'use client';

import { useState } from 'react';
import { Web3Container, Web3Card, Web3Button } from './Web3Theme';
import { projectId } from '@/lib/supabase/info';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface KYCScreenProps {
  accessToken: string;
  onComplete: () => void;
}

const ID_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'voters_id', label: "Voter's ID" },
];

export const KYCScreen: React.FC<KYCScreenProps> = ({ accessToken, onComplete }) => {
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate form
    if (!idType || !idNumber || !address) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (idNumber.trim().length < 5) {
      setError('Please enter a valid ID number');
      setLoading(false);
      return;
    }

    if (address.trim().length < 10) {
      setError('Please enter a complete address');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/${process.env.NEXT_PUBLIC_SUPABASE_FUNCTION_NAME}/kyc/submit`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id_type: idType,
            id_number: idNumber.trim(),
            address: address.trim(),
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.status === 'verified') {
        setSuccess(true);
        // Wait a moment to show success message, then call onComplete
        setTimeout(() => {
          onComplete();
        }, 1500);
      } else {
        setError(data.error || 'Failed to submit verification. Please try again.');
      }
    } catch (err) {
      console.error('KYC submission error:', err);
      setError('Failed to submit verification. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Web3Container>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Web3Card className="max-w-md w-full text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Verification Submitted!</h2>
            <p className="text-indigo-200/80 mb-6">
              Your identity verification has been submitted successfully. Redirecting to dashboard...
            </p>
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          </Web3Card>
        </div>
      </Web3Container>
    );
  }

  return (
    <Web3Container>
      <div className="max-w-2xl mx-auto">
        <Web3Card className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Identity Verification</h1>
            <p className="text-indigo-200/80">
              Please complete your identity verification to continue. This information is required for security and compliance purposes.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-400/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ID Type */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                ID Type <span className="text-red-400">*</span>
              </label>
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
                className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-indigo-200/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm"
                required
                disabled={loading}
              >
                <option value="">Select ID Type</option>
                {ID_TYPES.map((type) => (
                  <option key={type.value} value={type.value} className="bg-slate-800">
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-indigo-200/70 mt-1">
                Select the type of identification document you'll be using
              </p>
            </div>

            {/* ID Number */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                ID Number <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-indigo-200/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm"
                placeholder="Enter your ID number"
                required
                disabled={loading}
                minLength={5}
              />
              <p className="text-xs text-indigo-200/70 mt-1">
                Enter the number from your identification document
              </p>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Address <span className="text-red-400">*</span>
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-indigo-200/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm resize-none"
                placeholder="Enter your full residential address"
                rows={4}
                required
                disabled={loading}
                minLength={10}
              />
              <p className="text-xs text-indigo-200/70 mt-1">
                Enter your complete residential address including street, city, and country
              </p>
            </div>

            {/* Submit Button */}
            <Web3Button
              type="submit"
              disabled={loading || !idType || !idNumber || !address}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Verification'
              )}
            </Web3Button>

            {/* Info Note */}
            <div className="p-4 bg-blue-500/10 border border-blue-400/30 rounded-lg">
              <p className="text-xs text-blue-200">
                <strong>Note:</strong> Your information is secure and encrypted. This verification is required to comply with regulatory requirements and ensure the safety of all users.
              </p>
            </div>
          </form>
        </Web3Card>
      </div>
    </Web3Container>
  );
};

export default KYCScreen;

