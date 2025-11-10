'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Web3Container, Web3Card, Web3Button } from './Web3Theme';
import { NetworkSelector } from './NetworkSelector';
import { TokenSelector } from './TokenSelector';
import type { Chain, Token } from '@/lib/chain-data';
import { useAccount } from 'wagmi';
import { CRYPTO_INFO } from '@/lib/constants';
import { ArrowUpDown, DollarSign, Coins } from 'lucide-react';
import { useTokenPrice, useFiatRates } from '@/hooks/useTokenPrice';
import { Badge } from './ui/badge';

interface Country {
  code: string;
  name: string;
  currency: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: 'NG', name: 'Nigeria', currency: 'NGN', flag: 'https://png.pngtree.com/png-vector/20240108/ourmid/pngtree-nigeria-round-flag-glossy-glass-effect-vector-transparent-background-png-image_11428986.png' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', flag: 'https://png.pngtree.com/png-vector/20240108/ourmid/pngtree-ghana-round-flag-glossy-glass-effect-vector-transparent-background-png-image_11427251.png' },
  { code: 'KE', name: 'Kenya', currency: 'KES', flag: 'https://png.pngtree.com/png-vector/20240108/ourmid/pngtree-kenya-round-flag-glossy-glass-effect-vector-transparent-background-png-image_11427461.png' }
];

const PROVIDERS: Record<string, { label: string; channel: number }[]> = {
  GHS: [
    { label: 'MTN Mobile Money', channel: 1 },
    { label: 'Vodafone Cash', channel: 6 },
    { label: 'AirtelTigo Money', channel: 7 },
  ],
};

export default function BuyCrypto() {
  const { address: connectedAddress } = useAccount();
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [inputMode, setInputMode] = useState<'crypto' | 'usd'>('usd'); // Default to USD for easier comprehension
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneValidation, setPhoneValidation] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
    accountName?: string;
  }>({ status: 'idle' });
  const [selectedProvider, setSelectedProvider] = useState('');
  const [validationStep, setValidationStep] = useState<'validate' | 'proceed'>('validate');
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-fill wallet address if connected
  useEffect(() => {
    if (connectedAddress && !walletAddress) {
      setWalletAddress(connectedAddress);
    }
  }, [connectedAddress, walletAddress]);

  const handleNetworkChange = (chainId: number, chain: Chain) => {
    setSelectedChainId(chainId);
    setSelectedChain(chain);
    // Reset token when network changes
    setSelectedToken(null);
  };

  const handleTokenChange = (token: Token) => {
    setSelectedToken(token);
  };

  const selectedCountryData = COUNTRIES.find(c => c.code === selectedCountry);
  const providerOptions = useMemo(() => {
    if (!selectedCountryData) return [];
    return PROVIDERS[selectedCountryData.currency] || [];
  }, [selectedCountryData]);

  const selectedProviderOption = useMemo(
    () => providerOptions.find(option => option.label === selectedProvider),
    [providerOptions, selectedProvider],
  );

  // Fetch real-time token price from CoinGecko
  const { price_usd: tokenPriceUSD, isLoading: isPriceLoading, error: priceError } = useTokenPrice(
    selectedToken?.symbol || null
  );

  // Fetch real-time fiat exchange rates
  const fiatRates = useFiatRates();

  // Calculate conversions
  const cryptoAmount = useMemo(() => {
    if (!amount || !tokenPriceUSD) return '';
    if (inputMode === 'crypto') return amount;
    // USD to crypto
    const usdValue = parseFloat(amount);
    if (isNaN(usdValue) || usdValue <= 0) return '';
    return (usdValue / tokenPriceUSD).toFixed(8);
  }, [amount, tokenPriceUSD, inputMode]);

  const usdAmount = useMemo(() => {
    if (!amount || !tokenPriceUSD) return '';
    if (inputMode === 'usd') return amount;
    // Crypto to USD
    const cryptoValue = parseFloat(amount);
    if (isNaN(cryptoValue) || cryptoValue <= 0) return '';
    return (cryptoValue * tokenPriceUSD).toFixed(2);
  }, [amount, tokenPriceUSD, inputMode]);

  // Get fiat amount based on selected country using real-time exchange rates
  const fiatAmount = useMemo(() => {
    if (!selectedCountryData || !usdAmount) return '';
    const usdValue = parseFloat(usdAmount);
    if (isNaN(usdValue)) return '';
    
    // Use real-time exchange rates from API
    const rate = fiatRates[selectedCountryData.currency as 'NGN' | 'GHS' | 'KES'] || 1;
    return (usdValue * rate).toFixed(2);
  }, [usdAmount, selectedCountryData, fiatRates]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };

    if (isCountryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCountryDropdownOpen]);

  const handleCountrySelect = (countryCode: string) => {
    setSelectedCountry(countryCode);
    setSelectedProvider('');
    setIsCountryDropdownOpen(false);
  };

  const handleValidatePhone = async () => {
    // Validate basic fields first
    if (!selectedCountry || !phone) {
      setError('Please select a country and enter your phone number');
      return;
    }

    if (!selectedCountryData) {
      setError('Please select a valid country');
      return;
    }

    if (providerOptions.length > 0 && !selectedProviderOption) {
      setError('Please select the mobile money provider for this phone number.');
      return;
    }

    if (providerOptions.length === 0) {
      setPhoneValidation({
        status: 'error',
        message: 'Account validation is not yet available for the selected country.',
      });
      return;
    }

    setLoading(true);
    setError('');
    setPhoneValidation({ status: 'loading' });

    try {
      const sanitizedPhone = phone.replace(/\s+/g, '');
      const validationResponse = await fetch('/api/moolre/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiver: sanitizedPhone,
          channel: selectedProviderOption?.channel,
          currency: selectedCountryData.currency,
        }),
      });

      const validationData = await validationResponse.json();
      const validationSucceeded =
        validationData.success && validationData.data?.status === 1;
      
      if (validationSucceeded) {
        const accountName = validationData.data?.data || 'Account verified';
        setPhoneValidation({
          status: 'success',
          message: `Account verified: ${accountName}`,
          accountName,
        });
        setValidationStep('proceed'); // Move to proceed step
      } else if (validationResponse.ok) {
        // HTTP 200 but Moolre returned status 0 - proceed with warning
        setPhoneValidation({
          status: 'success',
          message: 'Validation service temporarily unavailable. You can proceed to payment.',
        });
        setValidationStep('proceed');
      } else {
        setPhoneValidation({
          status: 'error',
          message:
            validationData.data?.message ||
            validationData.error ||
            'Unable to confirm mobile money account. Please check the number and try again.',
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      setPhoneValidation({
        status: 'error',
        message: 'Failed to validate account. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If validation hasn't been done, validate first
    if (validationStep === 'validate') {
      await handleValidatePhone();
      return;
    }
    
    // Proceed with payment initialization
    if (!selectedCountry || !selectedChainId || !selectedToken || !amount || !walletAddress || !email || !phone) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate country selection
    if (!selectedCountryData) {
      setError('Please select a valid country');
      return;
    }

    // Validate amounts
    const finalCryptoAmount = inputMode === 'crypto' ? amount : cryptoAmount;
    const finalUsdAmount = inputMode === 'usd' ? amount : usdAmount;
    
    if (!finalCryptoAmount || parseFloat(finalCryptoAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!finalUsdAmount || parseFloat(finalUsdAmount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const sanitizedPhone = phone.replace(/\s+/g, '');
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
          crypto_amount: finalCryptoAmount,
          user_wallet_address: walletAddress,
          email: email,
          phone: sanitizedPhone,
          fiat_amount: parseFloat(fiatAmount || finalUsdAmount),
          fiat_currency: selectedCountryData.currency,
          provider: selectedProviderOption?.label,
          provider_channel: selectedProviderOption?.channel,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to Paystack payment page
        window.location.href = data.authorization_url;
      } else {
        setError(data.error || 'Failed to initialize payment. Please try again.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      setError('Failed to process request. Please try again.');
      setLoading(false);
    }
  };

  // Reset validation when phone or provider changes
  useEffect(() => {
    if (phone || selectedProvider) {
      setValidationStep('validate');
      setPhoneValidation({ status: 'idle' });
    }
  }, [phone, selectedProvider]);

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
            <div className="relative" ref={countryDropdownRef}>
              <button
                type="button"
                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                className={`w-full p-4 bg-white/5 border-2 rounded-xl text-white backdrop-blur-sm flex items-center justify-between transition-all duration-200 ${
                  isCountryDropdownOpen
                    ? 'border-blue-500/50 bg-white/10 shadow-lg shadow-blue-500/20'
                    : 'border-white/20 hover:border-white/30 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {selectedCountryData ? (
                    <>
                      <div className="relative shrink-0">
                        <Image
                          src={selectedCountryData.flag}
                          alt={selectedCountryData.name}
                          width={32}
                          height={32}
                          unoptimized={true}
                          className="rounded-full object-cover w-8 h-8 ring-2 ring-white/20"
                        />
                      </div>
                      <div className="flex flex-col items-start min-w-0">
                        <span className="font-medium text-white truncate w-full">
                          {selectedCountryData.name}
                        </span>
                        <span className="text-xs text-indigo-300/80">
                          {selectedCountryData.currency}
                        </span>
                      </div>
                    </>
                  ) : (
                    <span className="text-indigo-200/50">Select your country</span>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 shrink-0 transition-transform duration-200 ${
                    isCountryDropdownOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isCountryDropdownOpen && (
                <div className="absolute z-50 w-full mt-2 bg-slate-900/98 backdrop-blur-xl border-2 border-white/20 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {COUNTRIES.map((country) => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => handleCountrySelect(country.code)}
                        className={`w-full p-4 flex items-center gap-3 transition-all duration-150 ${
                          selectedCountry === country.code
                            ? 'bg-linear-to-r from-blue-500/20 to-purple-500/20 border-l-2 border-blue-400'
                            : 'hover:bg-white/5 border-l-2 border-transparent'
                        }`}
                      >
                        <div className="relative shrink-0">
                          <Image
                            src={country.flag}
                            alt={country.name}
                            width={32}
                            unoptimized={true}
                            height={32}
                            className="rounded-full object-cover w-8 h-8 ring-2 ring-white/20"
                          />
                          {selectedCountry === country.code && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-start flex-1 min-w-0">
                          <span className="font-medium text-white truncate w-full">
                            {country.name}
                          </span>
                          <span className="text-xs text-indigo-300/80">
                            {country.currency}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {!selectedCountry && (
              <p className="text-xs text-red-300 mt-1">Please select a country</p>
            )}
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

        {/* Amount Input with Toggle */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-white">
              Amount
            </label>
            <button
              type="button"
              onClick={() => {
                const currentValue = amount;
                setInputMode(inputMode === 'crypto' ? 'usd' : 'crypto');
                // Swap the values when toggling
                if (inputMode === 'crypto') {
                  setAmount(usdAmount);
                } else {
                  setAmount(cryptoAmount);
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
              {inputMode === 'crypto' ? 'Switch to USD' : 'Switch to Crypto'}
            </button>
          </div>
          
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              {inputMode === 'crypto' ? (
                <Coins className="w-5 h-5 text-indigo-300" />
              ) : (
                <DollarSign className="w-5 h-5 text-indigo-300" />
              )}
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-indigo-200/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm"
                placeholder={inputMode === 'crypto' ? `Enter ${selectedToken?.symbol || 'crypto'} amount` : 'Enter USD amount'}
                min="0"
                step={inputMode === 'crypto' ? '0.00000001' : '0.01'}
                required
                disabled={!selectedToken}
              />
            </div>
            
            {/* Show equivalent */}
            {selectedToken && amount && parseFloat(amount) > 0 && (
              <div className="mt-2 p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-indigo-200/80">
                    {inputMode === 'crypto' ? 'USD Equivalent' : `${selectedToken.symbol} Amount`}
                  </span>
                  <span className="text-white font-medium">
                    {inputMode === 'crypto' 
                      ? `$${usdAmount || '0.00'}` 
                      : `${cryptoAmount || '0'} ${selectedToken.symbol}`
                    }
                  </span>
                </div>
                {selectedCountryData && fiatAmount && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-indigo-200/80">
                      {selectedCountryData.currency} Equivalent
                    </span>
                    <span className="text-white font-medium">
                      {selectedCountryData.currency === 'NGN' ? '₦' : selectedCountryData.currency === 'GHS' ? '₵' : 'KSh'}
                      {fiatAmount}
                    </span>
                  </div>
                )}
                {tokenPriceUSD > 0 && (
                  <div className="text-xs text-indigo-300/60 mt-2">
                    1 {selectedToken.symbol} = ${tokenPriceUSD.toFixed(2)}
                    {isPriceLoading && <span className="ml-2 text-yellow-400">(updating...)</span>}
                    {priceError && <span className="ml-2 text-red-400">(using cached price)</span>}
                  </div>
                )}
                {!tokenPriceUSD && selectedToken && !isPriceLoading && (
                  <div className="text-xs text-yellow-400 mt-2">
                    Price not available. Using fallback rate.
                  </div>
                )}
              </div>
            )}
          </div>
          
          <p className="text-sm text-indigo-200/70 mt-1">
            {selectedToken 
              ? `Enter the amount you want to buy in ${inputMode === 'crypto' ? selectedToken.symbol : 'USD'}` 
              : 'Select a token first'}
          </p>
        </div>

        {providerOptions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Mobile Money Provider
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {providerOptions.map(option => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => {
                    setSelectedProvider(option.label);
                    setError(prev => (prev?.toLowerCase().includes('provider') ? '' : prev));
                    setValidationStep('validate');
                    setPhoneValidation({ status: 'idle' });
                  }}
                  className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                    selectedProvider === option.label
                      ? 'border-blue-400 bg-blue-500/20 text-white'
                      : 'border-white/20 bg-white/5 text-indigo-100 hover:bg-white/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {!selectedProvider && (
              <p className="text-xs text-red-300 mt-1">
                Select the provider that owns this mobile money number.
              </p>
            )}
          </div>
        )}

        {/* Email Input */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-indigo-200/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm"
            placeholder="your@email.com"
            required
          />
          <p className="text-sm text-indigo-200/70 mt-1">
            For payment confirmation and receipt
          </p>
        </div>

        {/* Phone Input */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Phone Number
          </label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setPhoneValidation({ status: 'idle' });
                setValidationStep('validate');
              }}
              className="flex-1 p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-indigo-200/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm"
              placeholder="+1234567890"
              required
              disabled={loading}
            />
            {providerOptions.length > 0 && selectedProviderOption && phone && (
              <Web3Button
                type="button"
                onClick={handleValidatePhone}
                disabled={loading || phoneValidation.status === 'loading' || !phone || !selectedProviderOption}
                className="px-4 whitespace-nowrap"
              >
                {phoneValidation.status === 'loading' 
                  ? 'Validating...' 
                  : phoneValidation.status === 'success'
                  ? '✓ Verified'
                  : 'Validate'}
              </Web3Button>
            )}
          </div>
          <p className="text-sm text-indigo-200/70 mt-1">
            For payment notifications and account verification
          </p>
          {phoneValidation.status === 'loading' && (
            <div className="mt-2 p-2 bg-blue-500/10 border border-blue-400/30 rounded-lg">
              <p className="text-xs text-blue-300">Validating account name…</p>
            </div>
          )}
          {phoneValidation.status === 'success' && (
            <div className="mt-2 p-2 bg-green-500/10 border border-green-400/30 rounded-lg">
              <p className="text-xs text-green-300 font-medium">✓ {phoneValidation.message}</p>
              {validationStep === 'proceed' && (
                <p className="text-xs text-green-200/80 mt-1">You can now proceed to payment</p>
              )}
            </div>
          )}
          {phoneValidation.status === 'error' && (
            <div className="mt-2 p-2 bg-orange-500/10 border border-orange-400/30 rounded-lg">
              <p className="text-xs text-orange-300">{phoneValidation.message}</p>
            </div>
          )}
        </div>

        {/* Wallet Address Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-white">
              Your Wallet Address
            </label>
            {connectedAddress && (
              <button
                type="button"
                onClick={() => setWalletAddress(connectedAddress)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Use Connected
              </button>
            )}
          </div>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-indigo-200/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 backdrop-blur-sm font-mono text-sm"
            placeholder="0x..."
            required
          />
          <p className="text-sm text-indigo-200/70 mt-1">
            {connectedAddress 
              ? 'Wallet address where you want to receive your crypto (or use connected wallet)'
              : 'Enter the wallet address where you want to receive your ' + (selectedToken?.symbol || 'crypto')}
          </p>
        </div>

        {/* Submit Button */}
        <Web3Button
          type="submit"
          disabled={
            loading || 
            !selectedChainId || 
            !selectedToken || 
            !amount || 
            !walletAddress || 
            !email || 
            !phone ||
            (providerOptions.length > 0 && validationStep === 'validate' && phoneValidation.status !== 'success')
          }
          className="w-full"
        >
          {loading 
            ? (validationStep === 'validate' ? 'Validating...' : 'Processing...')
            : validationStep === 'validate' && providerOptions.length > 0 && phone
            ? 'Validate Number First'
            : validationStep === 'proceed' && phoneValidation.status === 'success'
            ? `Proceed to Payment - Buy ${selectedToken?.symbol || ''}`
            : selectedToken 
            ? `Buy ${selectedToken.symbol}` 
            : 'Select Token to Continue'}
        </Web3Button>
        {validationStep === 'validate' && providerOptions.length > 0 && phone && phoneValidation.status === 'idle' && (
          <p className="text-xs text-indigo-300/70 mt-2 text-center">
            Please validate your mobile money number before proceeding to payment
          </p>
        )}
      </form>
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
            {providerOptions.length > 0 && selectedProviderOption && (
              <div>
                <span className="text-purple-300">Provider:</span> {selectedProviderOption.label}
              </div>
            )}
          </div>
        </Web3Card>
      )}
    </Web3Container>
  );
}