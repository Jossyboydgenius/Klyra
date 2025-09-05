'use client';

import { useState } from 'react';

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
}

interface Network {
  id: string;
  name: string;
  description: string;
}

const COUNTRIES: Country[] = [
  { code: 'NG', name: 'Nigeria', currency: 'NGN', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', flag: '🇬🇭' },
  { code: 'KE', name: 'Kenya', currency: 'KES', flag: '🇰🇪' }
];

const CRYPTO_ASSETS: CryptoAsset[] = [
  { symbol: 'USDC', name: 'USD Coin', networks: ['ethereum', 'base', 'polygon'] },
  { symbol: 'USDT', name: 'Tether', networks: ['ethereum', 'polygon'] },
  { symbol: 'ETH', name: 'Ethereum', networks: ['ethereum', 'base'] }
];

const NETWORKS: Network[] = [
  { id: 'ethereum', name: 'Ethereum', description: 'Ethereum Mainnet' },
  { id: 'base', name: 'Base', description: 'Base Network' },
  { id: 'polygon', name: 'Polygon', description: 'Polygon Network' }
];

export default function BuyCrypto() {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCountry || !selectedAsset || !selectedNetwork || !amount || !walletAddress) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country: selectedCountry,
          crypto_asset: selectedAsset,
          network: selectedNetwork,
          crypto_amount: amount,
          user_wallet_address: walletAddress,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to Paystack payment page
        window.location.href = data.authorization_url;
      } else {
        setError(data.error || 'Failed to initialize payment');
      }
    } catch (err) {
      setError('Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const selectedCountryData = COUNTRIES.find(c => c.code === selectedCountry);
  const availableNetworks = selectedAsset ? 
    NETWORKS.filter(n => CRYPTO_ASSETS.find(a => a.symbol === selectedAsset)?.networks.includes(n.id)) : 
    [];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Buy Cryptocurrency</h1>
        <p className="text-gray-600">
          Purchase crypto using mobile money and bank transfers. Powered by Paystack and Coinbase.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Country Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Country
          </label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cryptocurrency
          </label>
          <select
            value={selectedAsset}
            onChange={(e) => {
              setSelectedAsset(e.target.value);
              setSelectedNetwork(''); // Reset network when asset changes
            }}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Select cryptocurrency</option>
            {CRYPTO_ASSETS.map((asset) => (
              <option key={asset.symbol} value={asset.symbol}>
                {asset.name} ({asset.symbol})
              </option>
            ))}
          </select>
        </div>

        {/* Network Selection */}
        {selectedAsset && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Network
            </label>
            <select
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
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
            Amount ({selectedAsset || 'Crypto'})
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter amount"
            min="0.01"
            step="0.01"
            required
          />
        </div>

        {/* Wallet Address Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Wallet Address
          </label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0x..."
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Enter the wallet address where you want to receive your {selectedAsset || 'crypto'}
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Processing...' : `Buy ${selectedAsset || 'Crypto'}`}
        </button>
      </form>

      {/* Info Section */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. Select your country, cryptocurrency, and network</li>
          <li>2. Enter the amount and your wallet address</li>
          <li>3. Complete payment using mobile money or bank transfer</li>
          <li>4. Receive crypto directly in your wallet</li>
        </ol>
      </div>
    </div>
  );
}