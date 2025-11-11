'use client';

import { useState, useEffect } from 'react';

interface Country {
  code: string;
  name: string;
  currency: string;
  flag: string;
}

interface CryptoAsset {
  symbol: string;
  name: string;
  networks: string[];
  directSupport: boolean; // Whether it's directly available on Coinbase
}

interface Network {
  id: string;
  name: string;
  description: string;
}

const COUNTRIES: Country[] = [
  { code: 'NG', name: 'Nigeria', currency: 'NGN', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', currency: 'KES', flag: '🇰🇪' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', flag: '🇬🇭' },
  { code: 'UG', name: 'Uganda', currency: 'UGX', flag: '🇺🇬' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS', flag: '🇹🇿' },
];

const CRYPTO_ASSETS: CryptoAsset[] = [
  { symbol: 'USDC', name: 'USD Coin', networks: ['base', 'ethereum', 'polygon'], directSupport: true },
  { symbol: 'USDT', name: 'Tether', networks: ['base', 'ethereum', 'polygon'], directSupport: true },
  { symbol: 'ETH', name: 'Ethereum', networks: ['ethereum', 'base'], directSupport: true },
  { symbol: 'BTC', name: 'Bitcoin', networks: ['bitcoin'], directSupport: true },
  { symbol: 'PEPE', name: 'Pepe', networks: ['ethereum', 'base'], directSupport: false },
  { symbol: 'SHIB', name: 'Shiba Inu', networks: ['ethereum'], directSupport: false },
  { symbol: 'DOGE', name: 'Dogecoin', networks: ['dogecoin'], directSupport: false },
];

const NETWORKS: Network[] = [
  { id: 'base', name: 'Base', description: 'Low fees, fast transactions' },
  { id: 'ethereum', name: 'Ethereum', description: 'Most secure, higher fees' },
  { id: 'polygon', name: 'Polygon', description: 'Very low fees' },
  { id: 'bitcoin', name: 'Bitcoin', description: 'Original blockchain' },
  { id: 'dogecoin', name: 'Dogecoin', description: 'Meme coin network' },
];

export default function PaystackBuyCrypto() {
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<CryptoAsset | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null);
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');

  // Calculate crypto amount when fiat amount changes
  useEffect(() => {
    if (amount && selectedAsset) {
      // Mock exchange rate calculation - in production, fetch from API
      const mockRate = selectedAsset.symbol === 'USDC' ? 1 :
        selectedAsset.symbol === 'USDT' ? 1 :
          selectedAsset.symbol === 'ETH' ? 0.0003 : 1;

      const crypto = (parseFloat(amount) * mockRate).toFixed(6);
      setCryptoAmount(crypto);
      setExchangeRate(mockRate);
    }
  }, [amount, selectedAsset]);

  const initializePayment = async () => {
    if (!selectedCountry || !selectedAsset || !selectedNetwork || !amount || !email || !phone || !walletAddress) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          phone,
          amount: parseFloat(amount),
          currency: selectedCountry.currency,
          cryptoAsset: selectedAsset.symbol,
          cryptoAmount,
          network: selectedNetwork.id,
          userWallet: walletAddress,
          paymentMethod
        }),
      });

      const data = await response.json();


      if (data.success) {
        setPaymentReference(data.data.reference);
        setCurrentStep(2);

        // Initialize Paystack payment
        const redirectUrl =
          data.data.authorization_url ||
          `https://checkout.paystack.com/v1/checkout.js?key=${data.data.public_key}&email=${encodeURIComponent(email)}&amount=${Math.round(parseFloat(amount) * 100)}&ref=${data.data.reference}&currency=${selectedCountry.currency}&channels=${paymentMethod === 'mobile_money' ? 'mobile_money,ussd' : 'bank_transfer,ussd'}&callback_url=${encodeURIComponent(window.location.origin + '/payment/callback')}&metadata=${encodeURIComponent(JSON.stringify({
            phone,
            crypto_asset: selectedAsset.symbol,
            crypto_amount: cryptoAmount,
            network: selectedNetwork.id
          }))}`;

        // Redirect to Paystack hosted checkout (defaults to authorization_url when provided)
        window.location.href = redirectUrl;
      } else {
        setError(data.error || 'Payment initialization failed');
      }
    } catch (error) {
      setError('Payment initialization failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (reference: any) => {
    setPaymentStatus('processing');
    setCurrentStep(3);

    try {
      // Verify payment
      const response = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference: reference.reference
        }),
      });

      const data = await response.json();

      if (data.success && data.data.status === 'success') {
        setPaymentStatus('success');
        setCurrentStep(4);
      } else {
        setPaymentStatus('failed');
        setError('Payment verification failed');
      }
    } catch (error) {
      setPaymentStatus('failed');
      setError('Payment verification failed');
    }
  };

  const handlePaymentClose = () => {
    setError('Payment was cancelled');
    setCurrentStep(1);
  };

  const resetForm = () => {
    setCurrentStep(1);
    setPaymentStatus('pending');
    setPaymentReference('');
    setError('');
    setAmount('');
    setCryptoAmount('');
  };

  const availableNetworks = selectedAsset ?
    NETWORKS.filter(network => selectedAsset.networks.includes(network.id)) : [];

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= step
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
                }`}>
                {step}
              </div>
              {step < 4 && (
                <div className={`w-16 h-1 mx-2 ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>Details</span>
          <span>Payment</span>
          <span>Processing</span>
          <span>Complete</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Step 1: Form */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Buy Cryptocurrency</h2>
            <p className="text-gray-600">Purchase crypto using mobile money or bank transfer</p>
          </div>

          {/* Country Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
            <select
              value={selectedCountry?.code || ''}
              onChange={(e) => {
                const country = COUNTRIES.find(c => c.code === e.target.value);
                setSelectedCountry(country || null);
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select your country</option>
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.flag} {country.name} ({country.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Crypto Asset Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cryptocurrency</label>
            <select
              value={selectedAsset?.symbol || ''}
              onChange={(e) => {
                const asset = CRYPTO_ASSETS.find(a => a.symbol === e.target.value);
                setSelectedAsset(asset || null);
                setSelectedNetwork(null);
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select cryptocurrency</option>
              {CRYPTO_ASSETS.map((asset) => (
                <option key={asset.symbol} value={asset.symbol}>
                  {asset.name} ({asset.symbol}) {!asset.directSupport && '⚡ Swap Required'}
                </option>
              ))}
            </select>
            {selectedAsset && !selectedAsset.directSupport && (
              <p className="mt-1 text-sm text-orange-600">
                This token requires swapping and may take longer to process
              </p>
            )}
          </div>

          {/* Network Selection */}
          {selectedAsset && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Network</label>
              <select
                value={selectedNetwork?.id || ''}
                onChange={(e) => {
                  const network = availableNetworks.find(n => n.id === e.target.value);
                  setSelectedNetwork(network || null);
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select network</option>
                {availableNetworks.map((network) => (
                  <option key={network.id} value={network.id}>
                    {network.name} - {network.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount ({selectedCountry?.currency || 'Local Currency'})
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter amount"
              min="100"
              step="0.01"
            />
            {cryptoAmount && selectedAsset && (
              <p className="mt-1 text-sm text-gray-600">
                You will receive: <span className="font-semibold text-blue-600">{cryptoAmount} {selectedAsset.symbol}</span>
              </p>
            )}
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="your@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="+234..."
                required
              />
            </div>
          </div>

          {/* Wallet Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Wallet Address</label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0x..."
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter the wallet address where you want to receive your crypto
            </p>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('mobile_money')}
                className={`p-4 border rounded-lg text-center ${paymentMethod === 'mobile_money'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                  }`}
              >
                <div className="text-2xl mb-2">📱</div>
                <div className="font-medium">Mobile Money</div>
                <div className="text-sm text-gray-500">M-Pesa, Airtel Money</div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`p-4 border rounded-lg text-center ${paymentMethod === 'bank_transfer'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                  }`}
              >
                <div className="text-2xl mb-2">🏦</div>
                <div className="font-medium">Bank Transfer</div>
                <div className="text-sm text-gray-500">Direct bank payment</div>
              </button>
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={initializePayment}
            disabled={!selectedCountry || !selectedAsset || !selectedNetwork || !amount || !email || !phone || !walletAddress || loading}
            className="w-full p-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Initializing Payment...' : 'Continue to Payment'}
          </button>
        </div>
      )}

      {/* Step 2: Payment Processing */}
      {currentStep === 2 && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Processing Payment</h3>
          <p className="text-gray-600">Please complete the payment using your mobile money or bank transfer</p>
          <p className="text-sm text-gray-500 mt-2">Reference: {paymentReference}</p>
        </div>
      )}

      {/* Step 3: Transaction Processing */}
      {currentStep === 3 && (
        <div className="text-center py-8">
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Confirmed!</h3>
          <p className="text-gray-600 mb-4">Your payment has been received. We're now processing your crypto purchase.</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              Your crypto will be sent to your wallet within 5-10 minutes. You'll receive an email confirmation once completed.
            </p>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {currentStep === 4 && paymentStatus === 'success' && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Transaction Successful!</h3>
          <p className="text-gray-600 mb-4">
            Your {cryptoAmount} {selectedAsset?.symbol} is being processed and will be sent to your wallet shortly.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="text-sm text-green-800 space-y-1">
              <p><strong>Amount:</strong> {cryptoAmount} {selectedAsset?.symbol}</p>
              <p><strong>Network:</strong> {selectedNetwork?.name}</p>
              <p><strong>Wallet:</strong> {walletAddress}</p>
              <p><strong>Reference:</strong> {paymentReference}</p>
            </div>
          </div>
          <button
            onClick={resetForm}
            className="w-full p-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Make Another Purchase
          </button>
        </div>
      )}
    </div>
  );
}
