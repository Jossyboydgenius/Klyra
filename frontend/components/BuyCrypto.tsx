'use client';

import { useState } from 'react';
import { Web3Container, Web3Card, Web3Button } from './Web3Theme';
import { NetworkSelector } from './NetworkSelector';
import { TokenSelector } from './TokenSelector';
import type { Chain, Token } from '@/lib/chain-data';

interface Country {
  code: string;
  name: string;
  currency: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: 'NG', name: 'Nigeria', currency: 'NGN', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', flag: '🇬🇭' },
  { code: 'KE', name: 'Kenya', currency: 'KES', flag: '🇰🇪' }
];

export default function BuyCrypto() {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNetworkChange = (chainId: number, chain: Chain) => {
    setSelectedChainId(chainId);
    setSelectedChain(chain);
    // Reset token when network changes
    setSelectedToken(null);
  };

  const handleTokenChange = (token: Token) => {
    setSelectedToken(token);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCountry || !selectedChainId || !selectedToken || !amount || !walletAddress) {
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
          crypto_asset: selectedToken.symbol,
          network: selectedChain?.name || `Chain ${selectedChainId}`,
          chain_id: selectedChainId,
          token_address: selectedToken.address,
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

          {/* Network Selection */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Network / Blockchain
            </label>
            <NetworkSelector
              value={selectedChainId}
              onChange={handleNetworkChange}
              includeTestnets={true}
              placeholder="Select blockchain network"
              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            />
            <p className="text-xs text-indigo-200/70 mt-1">
              Choose the blockchain network you want to use
            </p>
          </div>

          {/* Token Selection */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Token / Cryptocurrency
            </label>
            <TokenSelector
              chainId={selectedChainId}
              value={selectedToken?.address}
              onChange={handleTokenChange}
              placeholder="Select token"
              className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            />
            <p className="text-xs text-indigo-200/70 mt-1">
              {selectedChainId ? 'Choose the token to buy' : 'Select a network first'}
            </p>
          </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Amount {selectedToken && `(${selectedToken.symbol})`}
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
            disabled={!selectedToken}
          />
          <p className="text-sm text-indigo-200/70 mt-1">
            {selectedToken 
              ? `How much ${selectedToken.symbol} do you want to buy?` 
              : 'Select a token first'}
          </p>
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
            Enter the wallet address where you want to receive your {selectedToken?.symbol || 'crypto'}
          </p>
        </div>

        {/* Submit Button */}
        <Web3Button
          type="submit"
          disabled={loading || !selectedChainId || !selectedToken}
          className="w-full"
        >
          {loading 
            ? 'Processing...' 
            : selectedToken 
            ? `Buy ${selectedToken.symbol}` 
            : 'Select Token to Continue'}
        </Web3Button>
      </form>
      </Web3Card>

      {/* Info Section */}
      <Web3Card className="mt-8 bg-blue-500/20 border-blue-400/30">
        <h3 className="font-semibold text-blue-300 mb-2">How it works:</h3>
        <ol className="text-sm text-blue-200 space-y-1">
          <li>1. Select your country and payment method</li>
          <li>2. Choose blockchain network and token</li>
          <li>3. Enter the amount and your wallet address</li>
          <li>4. Complete payment using mobile money or bank transfer</li>
          <li>5. Receive crypto directly in your wallet</li>
        </ol>
      </Web3Card>

      {/* Selected Summary */}
      {(selectedChain || selectedToken) && (
        <Web3Card className="mt-4 bg-purple-500/10 border-purple-400/20">
          <h3 className="font-semibold text-purple-300 mb-2">Selection Summary:</h3>
          <div className="text-sm text-purple-200 space-y-1">
            {selectedChain && (
              <div>
                <span className="text-purple-300">Network:</span> {selectedChain.name} 
                {selectedChain.testnet && <span className="text-xs ml-2 text-orange-300">(Testnet)</span>}
              </div>
            )}
            {selectedToken && (
              <>
                <div>
                  <span className="text-purple-300">Token:</span> {selectedToken.name} ({selectedToken.symbol})
                </div>
                <div className="text-xs font-mono text-purple-300/70">
                  {selectedToken.address !== '0x0000000000000000000000000000000000000000' && 
                    `Contract: ${selectedToken.address.slice(0, 10)}...${selectedToken.address.slice(-8)}`
                  }
                </div>
              </>
            )}
          </div>
        </Web3Card>
      )}
    </Web3Container>
  );
}