'use client';

import { useState } from 'react';
import { Web3Container, Web3Card, Web3Button } from './Web3Theme';

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
    } catch {
      setError('Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const availableNetworks = selectedAsset ? 
    NETWORKS.filter(n => CRYPTO_ASSETS.find(a => a.symbol === selectedAsset)?.networks.includes(n.id)) : 
    [];

  return (
    <Web3Container>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Buy Cryptocurrency</h1>
        <p className="text-indigo-200/80">
          Purchase crypto using mobile money and bank transfers. Powered by Paystack and Coinbase.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-400/30 rounded-lg">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      <Web3Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Country Selection */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Country
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-indigo-200/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm"
              required
            >
              <option value="" className="bg-slate-800 text-white">Select your country</option>
              {COUNTRIES.map((country) => (
                <option key={country.code} value={country.code} className="bg-slate-800 text-white">
                  {country.flag} {country.name} ({country.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Crypto Asset Selection */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Cryptocurrency
            </label>
            <select
              value={selectedAsset}
              onChange={(e) => {
                setSelectedAsset(e.target.value);
                setSelectedNetwork(''); // Reset network when asset changes
              }}
              className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-indigo-200/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm"
              required
            >
              <option value="" className="bg-slate-800 text-white">Select cryptocurrency</option>
              {CRYPTO_ASSETS.map((asset) => (
              <option key={asset.symbol} value={asset.symbol} className="bg-slate-800 text-white">
                {asset.symbol} - {asset.name}
              </option>
            ))}
          </select>
        </div>

        {/* Network Selection */}
        {selectedAsset && (
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Network
            </label>
            <select
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value)}
              className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-indigo-200/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm"
              required
            >
              <option value="" className="bg-slate-800 text-white">Select network</option>
              {availableNetworks.map((network) => (
                <option key={network.id} value={network.id} className="bg-slate-800 text-white">
                  {network.name} - {network.description}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Amount ({selectedAsset || 'Crypto'})
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-indigo-200/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm"
            placeholder="Enter amount"
            min="0.01"
            step="0.01"
            required
          />
        </div>

        {/* Wallet Address Input */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Your Wallet Address
          </label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-indigo-200/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm"
            placeholder="0x..."
            required
          />
          <p className="text-sm text-indigo-200/70 mt-1">
            Enter the wallet address where you want to receive your {selectedAsset || 'crypto'}
          </p>
        </div>

        {/* Submit Button */}
        <Web3Button
          type="submit"
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Processing...' : `Buy ${selectedAsset || 'Crypto'}`}
        </Web3Button>
      </form>
      </Web3Card>

      {/* Info Section */}
      <Web3Card className="mt-8 bg-blue-500/20 border-blue-400/30">
        <h3 className="font-semibold text-blue-300 mb-2">How it works:</h3>
        <ol className="text-sm text-blue-200 space-y-1">
          <li>1. Select your country, cryptocurrency, and network</li>
          <li>2. Enter the amount and your wallet address</li>
          <li>3. Complete payment using mobile money or bank transfer</li>
          <li>4. Receive crypto directly in your wallet</li>
        </ol>
      </Web3Card>
    </Web3Container>
  );
}