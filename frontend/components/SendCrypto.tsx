/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
'use client';
import React, { useState, useEffect } from 'react';
import { projectId } from '../lib/supabase/info';
import { CRYPTO_INFO, CONVERSION_CURRENCIES } from '../lib/constants';
import { formatCryptoAmount, calculateAssetValue, getConversionRate } from '../lib/helpers';
import { pricingEngine } from '@/lib/pool/pricing-engine';
import { SquidAPI } from '@/lib/aggregators/squid';
import { Web3Container, Web3Card, Web3Button } from './Web3Theme';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { 
  Send, 
  User, 
  Wallet, 
  AlertCircle,
  CheckCircle,
  Search,
  ArrowRight,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { useAccount, useWriteContract, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { useWalletBalances, TokenBalance } from '@/hooks/useWalletBalances';
import { getChainLogo } from '@/lib/chain-logos';
import { NetworkSelector } from '@/components/NetworkSelector';
import { TokenSelector } from '@/components/TokenSelector';
import { useTokenBalances } from '@/hooks/useTokenBalances';
import { getChainById, type Token } from '@/lib/chain-data';
import { parseUnits, formatUnits, Address, erc20Abi } from 'viem';
import { 
  sanitizeInput, 
  isValidAddress, 
  isValidENSName, 
  resolveENS, 
  lookupENS, 
  getENSAvatar,
  parseAddressInput,
  getAddressAvatar
} from '@/lib/ens-resolution';
import Image from 'next/image';

const POOL_BASE_CHAIN_ID = 8453; // Base mainnet
const POOL_USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base USDC
const USDC_DECIMALS = 6;

interface SendCryptoProps {
  accessToken: string;
  balances: any;
  paymentMethods: any[];
  onSuccess: () => void;
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

interface Recipient {
  id?: string;
  name?: string;
  email?: string;
  address: string; // Always required - wallet address
  ensName?: string; // ENS name if available
  avatar?: string; // Avatar URL if available
}

export const SendCrypto: React.FC<SendCryptoProps> = ({ 
  accessToken, 
  balances, 
  paymentMethods,
  onSuccess, 
  onBack,
  onNavigate 
}) => {
  const { address, isConnected, chainId } = useAccount();
  // Use walletBalances with progressive loading - balances appear as they're found, no blocking
  const { balances: walletBalances } = useWalletBalances(address, undefined, true, {
    autoRefresh: false, // Don't auto-refresh in SendCrypto to prevent disruptions
    onlyNonZero: true,
  });
  
  // Wagmi hooks for direct send
  const { writeContract, data: contractHash, isPending: isContractPending } = useWriteContract();
  const { sendTransaction, data: sendHash, isPending: isSendPending } = useSendTransaction();
  const { switchChain } = useSwitchChain();
  const txHash = contractHash || sendHash;
  const isTxPending = isContractPending || isSendPending;
  const { isLoading: isConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  
  const [step, setStep] = useState(1); // 1: recipient, 2: send type, 3: amount/asset, 4: confirm, 5: success
  const [sendType, setSendType] = useState<'direct' | 'cross-chain' | 'fiat-to-crypto' | 'crypto-to-fiat' | null>(null);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [recipientInput, setRecipientInput] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvedENS, setResolvedENS] = useState<string | null>(null);
  const [recipientAvatar, setRecipientAvatar] = useState<string | null>(null);
  const [selectedBalance, setSelectedBalance] = useState<TokenBalance | null>(null);
  const [selectedChainId, setSelectedChainId] = useState<number | null>(null);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [destinationChainId, setDestinationChainId] = useState<number | null>(null);
  const [destinationToken, setDestinationToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState('');
  const [fiatAmount, setFiatAmount] = useState('');
  const [currency, setCurrency] = useState('GHS'); // Default currency, now changeable
  const [amountInputMode, setAmountInputMode] = useState<'crypto' | 'fiat'>('crypto'); // Track which input user is using
  const [isCalculatingQuote, setIsCalculatingQuote] = useState(false);
  const [quote, setQuote] = useState<any | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [recipientValidation, setRecipientValidation] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    name?: string;
    message?: string;
  }>({ status: 'idle' });

  // Fetch balance for selected token on-demand
  // Only fetch when we have a token selected and it's not already in walletBalances
  const shouldFetchBalance = selectedToken && selectedChainId && address && 
    !walletBalances?.some(
      b => b.token.address.toLowerCase() === selectedToken.address.toLowerCase() &&
           b.chain.id === selectedChainId
    );
  
  const tokensForBalanceCheck = shouldFetchBalance ? [selectedToken] : [];
  const { balances: tokenBalances, isLoading: isLoadingTokenBalance, getBalance } = useTokenBalances(
    address,
    selectedChainId,
    tokensForBalanceCheck
  );

  // Track previous values to prevent infinite loops
  const prevTokenAddressRef = React.useRef<string | undefined>(undefined);
  const prevChainIdRef = React.useRef<number | undefined>(undefined);
  const prevBalanceKeyRef = React.useRef<string | undefined>(undefined);

  // Update selectedBalance when token balance is fetched
  useEffect(() => {
    const tokenAddress = selectedToken?.address?.toLowerCase();
    const chainId = selectedChainId ?? undefined;
    const currentBalanceKey = `${tokenAddress}-${chainId}`;
    
    // If token/chain hasn't changed, don't re-run
    if (prevTokenAddressRef.current === tokenAddress && 
        prevChainIdRef.current === chainId &&
        prevBalanceKeyRef.current === currentBalanceKey) {
      return;
    }

    // Update refs
    prevTokenAddressRef.current = tokenAddress;
    prevChainIdRef.current = chainId;
    prevBalanceKeyRef.current = currentBalanceKey;

    if (!selectedToken || !selectedChainId || !address) {
      setSelectedBalance(null);
      return;
    }

    // First check walletBalances (already loaded) - use a stable search
    const existingBalance = walletBalances?.find(
      b => b.token.address.toLowerCase() === tokenAddress &&
           b.chain.id === selectedChainId
    );
    
    if (existingBalance) {
      setSelectedBalance(prev => {
        // Only update if it's actually different
        if (!prev || 
            prev.token.address.toLowerCase() !== existingBalance.token.address.toLowerCase() ||
            prev.chain.id !== existingBalance.chain.id) {
          return existingBalance;
        }
        return prev;
      });
      return;
    }
    
    // If not in walletBalances, try to get from tokenBalances (on-demand fetch)
    // Only check when loading is complete to prevent loops
    if (!isLoadingTokenBalance && tokenBalances) {
      try {
        const balanceStr = getBalance(selectedToken.address);
        const chain = getChainById(selectedChainId);
        
        if (chain) {
          const newBalance = {
            chain,
            token: selectedToken,
            balance: balanceStr,
            balanceFormatted: balanceStr,
          };
          
          setSelectedBalance(prev => {
            // Only update if different
            if (!prev || 
                prev.token.address.toLowerCase() !== newBalance.token.address.toLowerCase() ||
                prev.chain.id !== newBalance.chain.id ||
                prev.balanceFormatted !== newBalance.balanceFormatted) {
              return newBalance;
            }
            return prev;
          });
        }
      } catch (error) {
        // Silently fail - don't update balance
        console.error('Error getting balance:', error);
      }
    } else if (!isLoadingTokenBalance && !tokenBalances) {
      // If loading is done but no balance found, only set to null if we had a balance before
      setSelectedBalance(prev => {
        if (prev && 
            prev.token.address.toLowerCase() === tokenAddress &&
            prev.chain.id === selectedChainId) {
          return null;
        }
        return prev;
      });
    }
  }, [
    selectedToken?.address, // Only depend on address, not whole object
    selectedToken?.symbol,
    selectedChainId ?? undefined,
    isLoadingTokenBalance,
    address,
    // Use stable references - only check if walletBalances array reference changed
    // We track changes via refs inside the effect, so this is just for initial trigger
    walletBalances?.length ?? 0,
    // Check tokenBalances availability
    tokenBalances ? 'ready' : 'loading',
  ]);
  
  // Memoize the balance key to prevent unnecessary re-renders
  const walletBalanceKey = React.useMemo(() => {
    if (!selectedToken || !selectedChainId || !walletBalances) return 'none';
    const tokenAddress = selectedToken.address.toLowerCase();
    const existingBalance = walletBalances.find(
      b => b.token.address.toLowerCase() === tokenAddress &&
           b.chain.id === selectedChainId
    );
    return existingBalance?.balanceFormatted ?? 'none';
  }, [selectedToken?.address, selectedChainId, walletBalances?.length, walletBalances]);
  
  // Separate effect to watch for walletBalances updates for the selected token/chain
  // Use a ref to track the last balance we found to prevent unnecessary updates
  const lastWalletBalanceRef = React.useRef<string | null>(null);
  
  useEffect(() => {
    if (!selectedToken || !selectedChainId || !address || !walletBalances) {
      lastWalletBalanceRef.current = null;
      return;
    }
    
    const tokenAddress = selectedToken.address.toLowerCase();
    const existingBalance = walletBalances.find(
      b => b.token.address.toLowerCase() === tokenAddress &&
           b.chain.id === selectedChainId
    );
    
    const balanceKey = existingBalance 
      ? `${existingBalance.token.address}-${existingBalance.chain.id}-${existingBalance.balanceFormatted}`
      : null;
    
    // Only update if the balance actually changed
    if (balanceKey && balanceKey !== lastWalletBalanceRef.current) {
      lastWalletBalanceRef.current = balanceKey;
      
      if (existingBalance) {
        setSelectedBalance(prev => {
          // Double-check if it's actually different
          if (!prev || 
              prev.token.address.toLowerCase() !== existingBalance.token.address.toLowerCase() ||
              prev.chain.id !== existingBalance.chain.id ||
              prev.balanceFormatted !== existingBalance.balanceFormatted) {
            return existingBalance;
          }
          return prev;
        });
      }
    } else if (!balanceKey && lastWalletBalanceRef.current) {
      // Balance was removed, clear the ref
      lastWalletBalanceRef.current = null;
    }
  }, [
    selectedToken?.address, 
    selectedChainId, 
    address, 
    // Use the memoized balance key instead of doing find() in dependency array
    walletBalanceKey
  ]);

  const getMaxAmount = () => {
    if (!selectedBalance) {
      // Try to get from tokenBalances
      if (selectedToken && selectedChainId) {
        const balanceStr = getBalance(selectedToken.address);
        return parseFloat(balanceStr) || 0;
      }
      return 0;
    }
    return parseFloat(selectedBalance.balanceFormatted);
  };

  // Get quote for fiat-to-crypto with platform markup
  const fetchQuote = async (cryptoAmount: string, fiatAmount: string) => {
    if (!selectedToken || !selectedChainId || sendType !== 'fiat-to-crypto') {
      return null;
    }

    if (!cryptoAmount || parseFloat(cryptoAmount) <= 0) {
      return null;
    }

    setIsCalculatingQuote(true);
    try {
      // Check if we need to swap (not USDC on Base)
      const isDirectSend = await checkIfDirectSend(selectedChainId, selectedToken);
      
      if (isDirectSend) {
        // Direct send - use pricing engine
        const token: Token = {
          address: selectedToken.address,
          symbol: selectedToken.symbol,
          name: selectedToken.name,
          decimals: selectedToken.decimals,
          chainId: selectedChainId,
          logoURI: selectedToken.logoURI,
        };

        const priceQuote = await pricingEngine.getOnRampPrice(
          token,
          cryptoAmount,
          currency
        );

        const directQuote = {
          ...priceQuote,
          provider: 'pool-direct',
          requiresSwap: false,
        };

        setQuote(directQuote);
        return directQuote;
      } else {
        // Need swap - use pricing engine for markup and SquidRouter for route estimation
        const token: Token = {
          address: selectedToken.address,
          symbol: selectedToken.symbol,
          name: selectedToken.name,
          decimals: selectedToken.decimals,
          chainId: selectedChainId,
          logoURI: selectedToken.logoURI,
        };

        const priceQuote = await pricingEngine.getOnRampPrice(
          token,
          cryptoAmount,
          currency
        );

        try {
          const chainInfo = getChainById(selectedChainId);
          const isTestnet = chainInfo?.testnet ?? false;
          const squidApi = new SquidAPI(process.env.NEXT_PUBLIC_SQUID_INTEGRATOR_ID, isTestnet);

          // Estimate required USDC (pool asset) amount using the price quote (includes markup)
          const fiatValue = parseFloat(priceQuote.fiatAmount); // In selected currency
          const usdcRate = getConversionRate('USDC', currency, CRYPTO_INFO.USDC);
          const estimatedUsdc = fiatValue / usdcRate;
          const estimatedUsdcWei = parseUnits(estimatedUsdc.toFixed(6), USDC_DECIMALS).toString();

          const recipientAddress = recipient?.address || resolvedAddress || address;
          if (!recipientAddress) {
            throw new Error('Recipient address required for swap quote');
          }

          const { route } = await squidApi.getRoute({
            fromChain: POOL_BASE_CHAIN_ID,
            toChain: selectedChainId,
            fromToken: POOL_USDC_ADDRESS,
            toToken: selectedToken.address,
            fromAmount: estimatedUsdcWei,
            fromAddress: recipientAddress,
            toAddress: recipient?.address || recipientAddress,
            quoteOnly: true,
          });

          // Squid returns actual amounts - adjust final quote accordingly
          const actualToAmount = parseFloat(formatUnits(BigInt(route.estimate.toAmount), selectedToken.decimals));
          const actualSendAmountUsdc = parseFloat(formatUnits(BigInt(route.estimate.sendAmount), USDC_DECIMALS));
          const desiredAmount = parseFloat(cryptoAmount);
          const amountRatio = desiredAmount > 0 ? actualToAmount / desiredAmount : 1;
          const adjustedFiat = (parseFloat(priceQuote.fiatAmount) * amountRatio).toFixed(2);

          const squidQuote = {
            ...priceQuote,
            fiatAmount: adjustedFiat,
            cryptoAmount: actualToAmount.toFixed(6),
            provider: 'squid',
            requiresSwap: true,
            squidRoute: route,
            poolFromAmount: actualSendAmountUsdc.toFixed(6),
          };

          setQuote(squidQuote);
          return squidQuote;
        } catch (routeError) {
          console.error('Squid route quote error, falling back to pricing engine quote:', routeError);
          const fallbackQuote = {
            ...priceQuote,
            provider: 'pricing-engine',
            requiresSwap: true,
          };
          setQuote(fallbackQuote);
          return fallbackQuote;
        }
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
      setError('Failed to calculate quote. Please try again.');
      return null;
    } finally {
      setIsCalculatingQuote(false);
    }
  };

  // Check if we can do direct send (chain/token matches pool)
  const checkIfDirectSend = async (chainId: number, token: Token): Promise<boolean> => {
    // Pool-supported chains: Base (8453), Ethereum (1), Polygon (137), Optimism (10)
    const poolChains = [8453, 1, 137, 10];
    
    if (!poolChains.includes(chainId)) {
      return false;
    }

    // Check if token is USDC (main pool asset)
    const usdcAddresses: Record<number, string> = {
      1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
      8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base (main pool)
      137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Polygon
      10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Optimism
    };

    const usdcAddress = usdcAddresses[chainId];
    if (usdcAddress && token.address.toLowerCase() === usdcAddress.toLowerCase()) {
      return true;
    }

    // Also check if it's native token on pool chain
    if (token.address === '0x0000000000000000000000000000000000000000') {
      return true;
    }

    return false;
  };

  // Calculate crypto amount from fiat amount
  const calculateCryptoFromFiat = async (fiatValue: string) => {
    if (!selectedToken || !selectedChainId || !fiatValue || parseFloat(fiatValue) <= 0) {
      setAmount('');
      return;
    }

    try {
      // Get quote with platform markup
      const cryptoInfo = CRYPTO_INFO[selectedToken.symbol as keyof typeof CRYPTO_INFO];
      if (!cryptoInfo) {
        setError('Token information not found');
        return;
      }

      // Get base rate
      const conversionRate = getConversionRate(selectedToken.symbol, currency, cryptoInfo);
      const baseFiatAmount = parseFloat(fiatValue);
      
      // Calculate crypto amount from fiat (before markup)
      // We'll apply markup in the quote
      const baseCryptoAmount = baseFiatAmount / conversionRate;
      
      // Fetch quote to get actual amounts with markup
      const quote = await fetchQuote(baseCryptoAmount.toString(), fiatValue);
      
      if (quote) {
        // Quote includes markup, so use the crypto amount from quote
        if (quote.cryptoAmount) {
          setAmount(quote.cryptoAmount);
        }
        // Update fiat amount to include markup
        setFiatAmount(quote.fiatAmount);
      } else {
        // Fallback to simple calculation
        setAmount(baseCryptoAmount.toFixed(6));
      }
    } catch (error) {
      console.error('Error calculating crypto from fiat:', error);
      setError('Failed to calculate conversion. Please try again.');
    }
  };

  // Calculate fiat amount from crypto amount
  const calculateFiatFromCrypto = async (cryptoValue: string) => {
    if (!selectedToken || !selectedChainId || !cryptoValue || parseFloat(cryptoValue) <= 0) {
      setFiatAmount('');
      return;
    }

    try {
      // Get quote with platform markup
      const quote = await fetchQuote(cryptoValue, '0');
      
      if (quote) {
        setFiatAmount(quote.fiatAmount);
        if (quote.cryptoAmount && quote.cryptoAmount !== cryptoValue) {
          setAmount(quote.cryptoAmount);
        }
      } else {
        // Fallback to simple calculation
        const cryptoInfo = CRYPTO_INFO[selectedToken.symbol as keyof typeof CRYPTO_INFO];
        if (cryptoInfo) {
          const conversionRate = getConversionRate(selectedToken.symbol, currency, cryptoInfo);
          const baseFiatAmount = parseFloat(cryptoValue) * conversionRate;
          // Apply markup (1.67% default)
          const markup = 0.0167;
          const finalFiatAmount = baseFiatAmount * (1 + markup);
          setFiatAmount(finalFiatAmount.toFixed(2));
        }
      }
    } catch (error) {
      console.error('Error calculating fiat from crypto:', error);
      setError('Failed to calculate conversion. Please try again.');
    }
  };

  const validateAmount = () => {
    if (!selectedToken || !selectedChainId) {
      setError('Please select a token and network');
      return false;
    }
    
    const numAmount = parseFloat(amount);
    if (numAmount <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    
    // For direct send, check balance if available
    if (sendType === 'direct' && selectedBalance) {
      const maxAmount = getMaxAmount();
      if (numAmount > maxAmount) {
        setError('Insufficient balance on selected network');
        return false;
      }
    }

    // For cross-chain, validate destination
    if (sendType === 'cross-chain') {
      if (!destinationChainId || !destinationToken) {
        setError('Please select destination chain and token');
        return false;
      }
    }

    // For fiat-to-crypto, validate fiat amount
    if (sendType === 'fiat-to-crypto') {
      if (!fiatAmount || parseFloat(fiatAmount) <= 0) {
        setError('Please enter a valid fiat amount');
        return false;
      }
    }

    // For crypto-to-fiat, validate payment method and fiat amount
    if (sendType === 'crypto-to-fiat') {
      if (!selectedPaymentMethod) {
        setError('Please select recipient payment method');
        return false;
      }
      if (!fiatAmount || parseFloat(fiatAmount) <= 0) {
        setError('Please enter a valid fiat amount');
        return false;
      }
    }
    
    return true;
  };

  const handleRecipientLookup = async () => {
    const sanitized = sanitizeInput(recipientInput);
    
    if (!sanitized) {
      setError('Please enter an ENS name or wallet address');
      return;
    }

    setIsResolving(true);
    setError('');
    setResolvedAddress(null);
    setResolvedENS(null);
    setRecipientAvatar(null);
    setRecipient(null);

    try {
      const parsed = parseAddressInput(sanitized);
      
      if (parsed.type === 'invalid') {
        setError('Please enter a valid ENS name (e.g., alice.eth) or wallet address (0x...)');
        setIsResolving(false);
        return;
      }

      let address: string | null = null;
      let ensName: string | null = null;
      let avatar: string | null = null;

      // If input is an address, lookup ENS name
      if (parsed.type === 'address') {
        address = parsed.value;
        const ensResult = await lookupENS(address);
        ensName = ensResult.name || null;
        
        if (ensName) {
          avatar = await getENSAvatar(ensName);
        }
      }
      
      // If input is an ENS name, resolve to address
      if (parsed.type === 'ens') {
        ensName = parsed.value;
        const addressResult = await resolveENS(ensName);
        address = addressResult.address;
        
        if (addressResult.error) {
          setError(addressResult.error);
          setIsResolving(false);
          return;
        }
        
        if (address) {
          avatar = await getENSAvatar(ensName);
        }
      }

      if (!address) {
        setError('Could not resolve address. Please check the ENS name or address.');
        setIsResolving(false);
        return;
      }

      // Try to find user in database (optional)
      try {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/${process.env.NEXT_PUBLIC_SUPABASE_FUNCTION_NAME}/user/lookup`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            identifier: address
          })
        });

        if (response.ok) {
          const data = await response.json();
          // User found in database
          setRecipient({
            id: data.recipient?.id,
            name: data.recipient?.name,
            email: data.recipient?.email,
            address: address,
            ensName: ensName || undefined,
            avatar: avatar || undefined,
          });
        } else {
          // User not found in database, but we have address - proceed anyway
          setRecipient({
            address: address,
            ensName: ensName || undefined,
            avatar: avatar || undefined,
          });
        }
      } catch (dbError) {
        // Database lookup failed, but we have address - proceed anyway
        console.log('Database lookup failed, proceeding with address:', dbError);
        setRecipient({
          address: address,
          ensName: ensName || undefined,
          avatar: avatar || undefined,
        });
      }

      setResolvedAddress(address);
      setResolvedENS(ensName);
      setRecipientAvatar(avatar);
    } catch (error) {
      console.log('Error resolving recipient:', error);
      setError('Failed to resolve address. Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleProceedToNextStep = () => {
    if (recipient && recipient.address) {
      setStep(2); // Go to send type selection
    } else if (resolvedAddress) {
      // Use resolved address even if recipient object not set
      setRecipient({
        address: resolvedAddress,
        ensName: resolvedENS || undefined,
        avatar: recipientAvatar || undefined,
      });
      setStep(2); // Go to send type selection
    } else {
      setError('Please resolve an address first');
    }
  };

  const handleSendTypeSelect = (type: 'direct' | 'cross-chain' | 'fiat-to-crypto' | 'crypto-to-fiat') => {
    setSendType(type);
    setStep(3); // Go to amount/asset selection
    setError('');
    setRecipientValidation({ status: 'idle' });
  };

const normalizePhoneNumber = (value?: string) =>
  value?.replace(/[^\d+]/g, '').trim() ?? '';

const PROVIDER_CHANNEL_MAP: Record<string, number> = {
  'MTN': 1,
  'MTN MOMO': 1,
  'MTN MOBILE MONEY': 1,
  'VODAFONE': 6,
  'VODAFONE CASH': 6,
  'AIRTELTIGO': 7,
  'AIRTELTIGO MONEY': 7,
  'AIRTEL TIGO': 7,
};

const resolveProviderChannel = (provider?: string) =>
  provider ? PROVIDER_CHANNEL_MAP[provider.trim().toUpperCase()] : undefined;

  const validateRecipientPaymentAccount = async (method: any) => {
    if (!method || method.type !== 'momo') {
      setRecipientValidation({ status: 'idle' });
      return;
    }

    if (method.details?.validated_name) {
      setRecipientValidation({
        status: 'success',
        name: method.details.validated_name,
      });
      return;
    }

    const phone =
      method.details?.phone ||
      method.details?.phone_number ||
      method.account_number;
    if (!phone) {
      setRecipientValidation({
        status: 'error',
        message: 'Payment method is missing a mobile number for validation.',
      });
      return;
    }

    const channel =
      method.details?.provider_channel
        ? Number(method.details.provider_channel)
        : resolveProviderChannel(
            method.details?.provider ||
              method.name ||
              method.account_provider,
          );

    if (!channel) {
      setRecipientValidation({
        status: 'error',
        message:
          'Unable to determine the mobile money network for this payment method.',
      });
      return;
    }

    setRecipientValidation({ status: 'loading' });

    try {
      const response = await fetch('/api/moolre/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver: normalizePhoneNumber(phone),
          channel,
          currency: currency || 'GHS',
        }),
      });

      const data = await response.json();
      if (data.success && data.data?.status === 1) {
        const accountName =
          typeof data.data.data === 'string' ? data.data.data : '';
        setRecipientValidation({
          status: 'success',
          name: accountName,
          message: data.data?.message,
        });
        setSelectedPaymentMethod((prev: any) =>
          prev
            ? {
                ...prev,
                details: {
                  ...prev.details,
                  validated_name: accountName,
                  validation_status: 'verified',
                  provider_channel: channel.toString(),
                },
              }
            : prev,
        );
      } else if (response.ok) {
        setRecipientValidation({
          status: 'success',
          name: undefined,
          message: 'Validation service temporarily unavailable. Proceeding without account name.',
        });
        setSelectedPaymentMethod((prev: any) =>
          prev
            ? {
                ...prev,
                details: {
                  ...prev.details,
                  provider_channel: channel.toString(),
                },
              }
            : prev,
        );
      } else {
        setRecipientValidation({
          status: 'error',
          message:
            data.data?.message ||
            data.error ||
            'Unable to confirm account ownership. Please double-check the number.',
        });
      }
    } catch (validationError) {
      console.error('Recipient validation error:', validationError);
      setRecipientValidation({
        status: 'error',
        message:
          'We could not verify this account right now. Please try again before proceeding.',
      });
    }
  };

  const handleSendCrypto = async () => {
    if (!selectedToken || !selectedChainId || !recipient) {
      setError('Please complete all required fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Handle direct send client-side using wagmi
      if (sendType === 'direct') {
        // Switch chain if needed
        if (chainId !== selectedChainId) {
          try {
            await switchChain({ chainId: selectedChainId });
            // Wait a bit for chain switch
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (switchError: any) {
            setError(`Failed to switch chain: ${switchError.message}`);
            setIsLoading(false);
            return;
          }
        }

        // Parse amount with token decimals
        const amountWei = parseUnits(amount, selectedToken.decimals);

        // Native token transfer
        if (selectedToken.address === '0x0000000000000000000000000000000000000000') {
          sendTransaction({
            to: recipient.address as Address,
            value: amountWei,
            chainId: selectedChainId,
          });
        } else {
          // ERC20 transfer
          writeContract({
            address: selectedToken.address as Address,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [recipient.address as Address, amountWei],
            chainId: selectedChainId,
          });
        }

        // Transaction will be handled by wagmi hooks
        // We'll record it in the database once confirmed
        return;
      }

      // For other send types, use API
      const chain = getChainById(selectedChainId);
      const tokenSymbol = selectedToken.symbol;
      const tokenAddress = selectedToken.address;

      const payload: any = {
        send_type: sendType,
        recipient_address: recipient.address,
        recipient_id: recipient.id,
        recipient_email: recipient.email,
        recipient_ens: recipient.ensName,
        crypto_symbol: tokenSymbol,
        token_address: tokenAddress,
        amount: parseFloat(amount),
        chain_id: selectedChainId.toString(),
        network: chain?.name || 'Unknown',
        message: sanitizeInput(message),
        from_address: address
      };

      // Add send type specific fields
      if (sendType === 'cross-chain') {
        if (!destinationChainId || !destinationToken) {
          setError('Please select destination chain and token for cross-chain send');
          setIsLoading(false);
          return;
        }
        payload.destination_chain_id = destinationChainId.toString();
        payload.destination_token_address = destinationToken.address;
      }

      if (sendType === 'fiat-to-crypto') {
        if (!fiatAmount) {
          setError('Please enter fiat amount');
          setIsLoading(false);
          return;
        }
        const isDirect = await checkIfDirectSend(selectedChainId, selectedToken);
        payload.fiat_amount = quote?.fiatAmount || fiatAmount; // Use quote amount if available
        payload.currency = currency; // Use selected currency
        payload.quote = quote; // Include quote for backend processing
        payload.is_direct_send = isDirect; // Indicate if direct send or needs swap
      }

      if (sendType === 'crypto-to-fiat') {
        if (!selectedPaymentMethod) {
          setError('Please select recipient payment method');
          setIsLoading(false);
          return;
        }
        if (!fiatAmount) {
          setError('Fiat amount calculation failed');
          setIsLoading(false);
          return;
        }
        payload.recipient_payment_method_id = selectedPaymentMethod.id;
        payload.recipient_payment_method_type = selectedPaymentMethod.type;
        payload.recipient_payment_method_details = selectedPaymentMethod;
        payload.fiat_amount = fiatAmount;
        payload.fiat_currency = 'NGN'; // TODO: Make currency selectable
      }

      const response = await fetch(`/api/send/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        setTransactionId(data.transaction_id || data.txHash || 'pending');
        
        // For fiat-to-crypto, redirect to Paystack payment
        if (sendType === 'fiat-to-crypto' && data.authorization_url) {
          window.location.href = data.authorization_url;
          return;
        }
        
        setStep(5);
        // Don't auto-redirect - let user manually navigate back using header
        // Transaction status stays visible so user can see confirmation
      } else {
        setError(data.error || 'Failed to send crypto');
      }
    } catch (error: any) {
      console.log('Error sending crypto:', error);
      setError(error.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle transaction success for direct sends
  React.useEffect(() => {
    if (isTxSuccess && txHash && sendType === 'direct') {
      // Record transaction in database
      const recordTransaction = async () => {
        try {
          const chain = getChainById(selectedChainId || 0);
          await fetch(`/api/send/initiate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              send_type: 'direct',
              recipient_address: recipient?.address,
              recipient_id: recipient?.id,
              recipient_email: recipient?.email,
              recipient_ens: recipient?.ensName,
              crypto_symbol: selectedToken?.symbol,
              token_address: selectedToken?.address,
              amount: parseFloat(amount),
              chain_id: selectedChainId?.toString(),
              network: chain?.name || 'Unknown',
              message: sanitizeInput(message),
              from_address: address,
              txHash: txHash,
              status: 'confirmed'
            })
          });
          
          setTransactionId(txHash);
          setStep(5);
          // Don't auto-redirect - let user manually navigate back using header
          // Transaction status stays visible so user can see confirmation
        } catch (error) {
          console.error('Error recording transaction:', error);
          // Still show success since tx went through
          setTransactionId(txHash);
          setStep(5);
        }
      };
      
      recordTransaction();
    }
  }, [isTxSuccess, txHash, sendType, selectedChainId, selectedToken, amount, recipient, message, address, onSuccess]);


  const renderRecipientStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="bg-blue-600/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 border border-blue-400/50">
          <Search className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Find Recipient</h2>
        <p className="text-indigo-200/80">Enter ENS name or wallet address</p>
      </div>

      <Web3Card className="p-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="recipient" className="text-white">Recipient Address or ENS</Label>
            <Input
              id="recipient"
              type="text"
              placeholder="alice.eth or 0x742d35Cc6634C0532925a3b8..."
              value={recipientInput}
              onChange={(e) => {
                setRecipientInput(e.target.value);
                setError('');
                setRecipient(null);
                setResolvedAddress(null);
                setResolvedENS(null);
              }}
              className="mt-1 bg-white/10 border-indigo-400/30 text-white placeholder:text-indigo-200/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isResolving && recipientInput.trim()) {
                  handleRecipientLookup();
                }
              }}
            />
            <p className="text-xs text-indigo-200/60 mt-1">
              Enter an ENS name (e.g., alice.eth) or wallet address (0x...)
            </p>
          </div>

          {error && (
            <Web3Card className="p-3 bg-red-600/20 border-red-400/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                <span className="text-sm text-red-200">{error}</span>
              </div>
            </Web3Card>
          )}

          {/* Resolved Recipient Card */}
          {(recipient || resolvedAddress) && (
            <Web3Card 
              className="p-4 bg-blue-600/20 border-blue-400/30 cursor-pointer hover:bg-blue-600/30 transition-colors"
              onClick={handleProceedToNextStep}
            >
              <div className="flex items-center gap-3">
                {(() => {
                  const address = recipient?.address || resolvedAddress;
                  const avatar = recipient?.avatar || recipientAvatar;
                  
                  if (avatar) {
                    return (
                      <Image 
                        src={avatar} 
                        alt="Avatar"
                        className="w-12 h-12 rounded-full object-cover"
                        width={48}
                        height={48}
                        unoptimized={true}
                        onError={(e) => {
                          // Fallback to address-based avatar
                          if (address) {
                            e.currentTarget.src = getAddressAvatar(address);
                          }
                        }}
                      />
                    );
                  }
                  
                  if (address) {
                    return (
                      <Image 
                        src={getAddressAvatar(address)} 
                        alt="Avatar"
                        className="w-12 h-12 rounded-full object-cover"
                        width={48}
                        height={48}
                        unoptimized={true}
                      />
                    );
                  }
                  
                  return (
                    <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  );
                })()}
                <div className="flex-1 min-w-0">
                  {(recipient?.ensName || resolvedENS) && (
                    <p className="font-medium text-white truncate">
                      {recipient?.ensName || resolvedENS}
                    </p>
                  )}
                  <p className="text-sm text-indigo-200/80 font-mono truncate">
                    {recipient?.address || resolvedAddress}
                  </p>
                  {recipient?.name && (
                    <p className="text-xs text-indigo-300/70 truncate">
                      {recipient.name}
                    </p>
                  )}
                </div>
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              </div>
            </Web3Card>
          )}

          <div className="flex gap-3">
            <Web3Button 
              onClick={handleRecipientLookup} 
              disabled={isResolving || !recipientInput.trim()}
              className="flex-1"
            >
              {isResolving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : (
                'Resolve Address'
              )}
            </Web3Button>
            {(recipient || resolvedAddress) && (
              <Web3Button 
                onClick={handleProceedToNextStep}
                className="flex-1"
              >
                Next
              </Web3Button>
            )}
          </div>
        </div>
      </Web3Card>

      <div className="text-center text-sm text-indigo-200/70">
        <p className="font-medium mb-1">Supported formats:</p>
        <p>• ENS Name: alice.eth, bob.base.eth</p>
        <p>• Wallet Address: 0x742d35Cc6634C0532925a3b8...</p>
      </div>
    </div>
  );

  const renderSendTypeStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="bg-purple-600/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 border border-purple-400/50">
          <Send className="w-8 h-8 text-purple-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Choose Send Type</h2>
        <p className="text-indigo-200/80">Select how you want to send</p>
      </div>

      {/* Recipient Card */}
      <Web3Card className="p-4 bg-blue-600/20 border-blue-400/30">
        <div className="flex items-center gap-3">
          {(() => {
            const avatar = recipient?.avatar;
            const address = recipient!.address;
            
            if (avatar) {
              return (
                <Image 
                  src={avatar} 
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover"
                  unoptimized={true}
                  width={40}
                  height={40}
                  onError={(e) => {
                    e.currentTarget.src = getAddressAvatar(address);
                  }}
                />
              );
            }
            
            return (
              <Image 
                src={getAddressAvatar(address)} 
                alt="Avatar"
                className="w-10 h-10 rounded-full object-cover"
                width={40}
                height={40}
                unoptimized={true}
              />
            );
          })()}
          <div className="flex-1 min-w-0">
            {recipient?.ensName && (
              <p className="font-medium text-white truncate text-sm">{recipient.ensName}</p>
            )}
            <p className="text-xs text-indigo-200/80 font-mono truncate">
              {recipient!.address}
            </p>
          </div>
        </div>
      </Web3Card>

      <div className="grid grid-cols-1 gap-4">
        {/* Direct Send */}
        <Web3Card 
          className="p-5 cursor-pointer hover:bg-white/10 transition-colors border-2 border-indigo-400/30 hover:border-indigo-400/50"
          onClick={() => handleSendTypeSelect('direct')}
        >
          <div className="flex items-start gap-4">
            <div className="bg-blue-600/30 rounded-lg p-3">
              <ArrowRight className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">Direct Send</h3>
              <p className="text-sm text-indigo-200/80">
                Send tokens directly on the same chain. Simple and fast transfer.
              </p>
            </div>
          </div>
        </Web3Card>

        {/* Cross-Chain Send */}
        <Web3Card 
          className="p-5 cursor-pointer hover:bg-white/10 transition-colors border-2 border-indigo-400/30 hover:border-indigo-400/50"
          onClick={() => handleSendTypeSelect('cross-chain')}
        >
          <div className="flex items-start gap-4">
            <div className="bg-purple-600/30 rounded-lg p-3">
              <Send className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">Cross-Chain Send</h3>
              <p className="text-sm text-indigo-200/80">
                Send tokens across different chains. Swap and bridge automatically.
              </p>
            </div>
          </div>
        </Web3Card>

        {/* Fiat-to-Crypto Send */}
        <Web3Card 
          className="p-5 cursor-pointer hover:bg-white/10 transition-colors border-2 border-indigo-400/30 hover:border-indigo-400/50"
          onClick={() => handleSendTypeSelect('fiat-to-crypto')}
        >
          <div className="flex items-start gap-4">
            <div className="bg-green-600/30 rounded-lg p-3">
              <Wallet className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">Fiat-to-Crypto Send</h3>
              <p className="text-sm text-indigo-200/80">
                Pay with fiat money, recipient receives crypto. You pay, they get tokens.
              </p>
            </div>
          </div>
        </Web3Card>

        {/* Crypto-to-Fiat Send */}
        <Web3Card 
          className="p-5 cursor-pointer hover:bg-white/10 transition-colors border-2 border-indigo-400/30 hover:border-indigo-400/50"
          onClick={() => handleSendTypeSelect('crypto-to-fiat')}
        >
          <div className="flex items-start gap-4">
            <div className="bg-orange-600/30 rounded-lg p-3">
              <Wallet className="w-6 h-6 text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">Crypto-to-Fiat Send</h3>
              <p className="text-sm text-indigo-200/80">
                Send crypto, recipient receives fiat money. Transfer to bank/MoMo account.
              </p>
            </div>
          </div>
        </Web3Card>
      </div>

      <div className="flex gap-3">
        <Web3Button variant="secondary" onClick={() => setStep(1)} className="flex-1">
          Back
        </Web3Button>
      </div>
    </div>
  );

  const renderAmountStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="bg-green-600/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 border border-green-400/50">
          <Wallet className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Send Amount</h2>
        <p className="text-indigo-200/80">Choose crypto and amount to send</p>
      </div>

      {/* Recipient Card */}
      <Web3Card className="p-4 bg-blue-600/20 border-blue-400/30">
        <div className="flex items-center gap-3">
          {(() => {
            const avatar = recipient?.avatar;
            const address = recipient!.address;
            
            if (avatar) {
              return (
                <Image 
                  src={avatar} 
                  alt="Avatar"
                  className="w-12 h-12 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = getAddressAvatar(address);
                  }}
                  width={48}
                  height={48}
                  unoptimized={true}
                />
              );
            }
            
            return (
              <Image 
                src={getAddressAvatar(address)} 
                alt="Avatar"
                className="w-12 h-12 rounded-full object-cover"
                width={48}
                height={48}
                unoptimized={true}
              />
            );
          })()}
          <div className="flex-1 min-w-0">
            {recipient?.ensName && (
              <p className="font-medium text-white truncate">{recipient.ensName}</p>
            )}
            <p className="text-sm text-indigo-200/80 font-mono truncate">
              {recipient!.address}
            </p>
            {recipient?.name && (
              <p className="text-xs text-indigo-300/70 truncate">{recipient.name}</p>
            )}
          </div>
        </div>
      </Web3Card>

      <Web3Card className="p-6">
        <div className="space-y-4">
          {/* Send Type Indicator */}
          {sendType && (
            <div className="mb-4">
              <Badge className={`${
                sendType === 'direct' ? 'bg-blue-400/20 text-blue-400' :
                sendType === 'cross-chain' ? 'bg-purple-400/20 text-purple-400' :
                sendType === 'fiat-to-crypto' ? 'bg-green-400/20 text-green-400' :
                'bg-orange-400/20 text-orange-400'
              } border-current`}>
                {sendType === 'direct' ? 'Direct Send' :
                 sendType === 'cross-chain' ? 'Cross-Chain Send' :
                 sendType === 'fiat-to-crypto' ? 'Fiat-to-Crypto' :
                 'Crypto-to-Fiat'}
              </Badge>
            </div>
          )}

          {/* Network Selection */}
          <div>
            <Label className="text-white">Select Network</Label>
            <div className="mt-2">
              <NetworkSelector
                value={selectedChainId}
                onChange={(chainId) => {
                  setSelectedChainId(chainId);
                  setSelectedToken(null);
                  setSelectedBalance(null);
                  setError('');
                }}
                includeTestnets={true}
                className="bg-white/10 border-indigo-400/30 text-white"
              />
            </div>
          </div>

          {/* Token Selection */}
          {selectedChainId && (
            <div>
              <Label className="text-white">Select Token</Label>
              <div className="mt-2">
                <TokenSelector
                  chainId={selectedChainId}
                  value={selectedToken?.address}
                  onChange={(token: Token) => {
                    setSelectedToken(token);
                    // Try to find balance for this token
                    const balance = walletBalances?.find(
                      b => b.token.address.toLowerCase() === token.address.toLowerCase() &&
                           b.chain.id === selectedChainId
                    );
                    if (balance) {
                      setSelectedBalance(balance);
                    } else {
                      setSelectedBalance(null);
                    }
                    setError('');
                  }}
                  className="bg-white/10 border-indigo-400/30 text-white"
                />
                {/* Show balance if available */}
                {selectedToken && selectedChainId && (
                  <div className="mt-2">
                    {isLoadingTokenBalance ? (
                      <p className="text-xs text-indigo-200/50 mt-1 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Loading balance...
                      </p>
                    ) : (() => {
                      const balanceStr = getBalance(selectedToken.address);
                      const balanceNum = parseFloat(balanceStr);
                      if (balanceNum > 0) {
                        return (
                          <p className="text-xs text-indigo-200/70 mt-1">
                            Balance: {balanceNum.toFixed(6)} {selectedToken.symbol}
                          </p>
                        );
                      }
                      // Fallback to walletBalances
                      const balance = walletBalances?.find(
                        b => b.token.address.toLowerCase() === selectedToken.address.toLowerCase() &&
                             b.chain.id === selectedChainId
                      );
                      return balance ? (
                        <p className="text-xs text-indigo-200/70 mt-1">
                          Balance: {parseFloat(balance.balanceFormatted).toFixed(6)} {selectedToken.symbol}
                        </p>
                      ) : (
                        <p className="text-xs text-indigo-200/50 mt-1">
                          Balance: 0 {selectedToken.symbol}
                        </p>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Select from Wallet Balances */}
          {sendType === 'direct' && walletBalances && walletBalances.length > 0 && (
            <div>
              <Label className="text-white text-sm">Or select from your wallet</Label>
              <button
                onClick={() => setShowAssetSelector(!showAssetSelector)}
                className="mt-2 w-full text-left px-4 py-2 bg-white/5 rounded-lg border border-indigo-400/20 hover:bg-white/10 transition-colors text-sm text-indigo-200/80"
              >
                {showAssetSelector ? 'Hide' : 'Show'} wallet balances ({walletBalances.length})
              </button>
              {showAssetSelector && (
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {walletBalances.map((balance, index) => (
                    <button
                      key={`${balance.chain.id}-${balance.token.address}-${index}`}
                      onClick={() => {
                        setSelectedBalance(balance);
                        setSelectedChainId(balance.chain.id);
                        setSelectedToken(balance.token);
                        setShowAssetSelector(false);
                        setError('');
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 bg-white/5 rounded-lg border border-indigo-400/20 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {(() => {
                          const logoUrl = getChainLogo(balance.chain.id, balance.chain.testnet);
                          return logoUrl ? (
                            <div className="relative">
                              <Image 
                                src={logoUrl} 
                                alt={balance.chain.name} 
                                className="w-8 h-8 rounded-full"
                                width={32}
                                height={32}
                                unoptimized={true}
                              />
                              {balance.chain.testnet && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border border-slate-900" />
                              )}
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">{balance.token.symbol.slice(0, 2)}</span>
                            </div>
                          );
                        })()}
                        <div className="text-left">
                          <p className="text-white font-medium">{balance.token.symbol}</p>
                          <p className="text-xs text-indigo-200/70">{balance.chain.name}</p>
                        </div>
                      </div>
                      <p className="text-white font-semibold">
                        {parseFloat(balance.balanceFormatted).toFixed(6)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Destination Chain/Token Selection for Cross-Chain */}
          {sendType === 'cross-chain' && selectedChainId && selectedToken && (
            <div className="space-y-4 pt-4 border-t border-indigo-400/20">
              <div>
                <Label className="text-white">Destination Network</Label>
                <div className="mt-2">
                  <NetworkSelector
                    value={destinationChainId}
                    onChange={(chainId) => {
                      setDestinationChainId(chainId);
                      setDestinationToken(null);
                      setError('');
                    }}
                    includeTestnets={true}
                    className="bg-white/10 border-indigo-400/30 text-white"
                  />
                </div>
              </div>

              {destinationChainId && (
                <div>
                  <Label className="text-white">Destination Token</Label>
                  <div className="mt-2">
                    <TokenSelector
                      chainId={destinationChainId}
                      value={destinationToken?.address}
                      onChange={(token: Token) => {
                        setDestinationToken(token);
                        setError('');
                      }}
                      className="bg-white/10 border-indigo-400/30 text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Method Selection for Crypto-to-Fiat */}
          {sendType === 'crypto-to-fiat' && paymentMethods && paymentMethods.length > 0 && (
            <div className="pt-4 border-t border-indigo-400/20">
              <Label className="text-white">Recipient Payment Method</Label>
              <div className="mt-2 space-y-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => {
                      setSelectedPaymentMethod(method);
                      setError('');
                      validateRecipientPaymentAccount(method);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
                      selectedPaymentMethod?.id === method.id
                        ? 'bg-indigo-600/30 border-indigo-400/50'
                        : 'bg-white/5 border-indigo-400/20 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        {method.type === 'momo' ? (
                          <Wallet className="w-5 h-5 text-blue-400" />
                        ) : (
                          <Wallet className="w-5 h-5 text-blue-400" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-white font-medium">{method.name}</p>
                        <p className="text-xs text-indigo-200/70">
                          {method.details?.validated_name ||
                            method.details?.name ||
                            method.account_name ||
                            method.account_number}
                        </p>
                        {method.details?.phone && (
                          <p className="text-xs text-indigo-300/60">
                            {method.details.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    {(method.is_verified ||
                      method.details?.validation_status === 'verified' ||
                      (selectedPaymentMethod?.id === method.id &&
                        recipientValidation.status === 'success')) && (
                      <Badge className="bg-green-400/20 text-green-400 border-green-400/30 text-xs">
                        Verified
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
              {selectedPaymentMethod && recipientValidation.status !== 'idle' && (
                <div className="mt-3 rounded-lg border border-indigo-400/30 bg-white/5 px-4 py-3 text-sm">
                  {recipientValidation.status === 'loading' && (
                    <div className="flex items-center gap-2 text-indigo-200/80">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying recipient account name…
                    </div>
                  )}
                  {recipientValidation.status === 'success' && (
                    <div className="text-green-300">
                      Recipient account name confirmed:{' '}
                      <span className="font-semibold">
                        {recipientValidation.name}
                      </span>
                    </div>
                  )}
                  {recipientValidation.status === 'error' && (
                    <div className="text-orange-300">
                      {recipientValidation.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Currency Selector for Fiat-to-Crypto */}
          {sendType === 'fiat-to-crypto' && (
            <div>
              <Label htmlFor="currency" className="text-white">Currency</Label>
              <div className="mt-2">
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value);
                    // Recalculate amounts when currency changes
                    if (amountInputMode === 'fiat' && fiatAmount) {
                      calculateCryptoFromFiat(fiatAmount);
                    } else if (amountInputMode === 'crypto' && amount) {
                      calculateFiatFromCrypto(amount);
                    }
                  }}
                  className="w-full px-4 py-2 bg-white/10 border border-indigo-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CONVERSION_CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code} className="bg-slate-900">
                      {curr.symbol} {curr.name} ({curr.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Amount Input - Interchangeable for Fiat-to-Crypto */}
          {(selectedBalance || (selectedToken && selectedChainId)) && (
            <div>
              {sendType === 'fiat-to-crypto' ? (
                <>
                  {/* Crypto Amount Input */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="amount" className="text-white">
                        Crypto Amount (Recipient Receives)
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setAmountInputMode('crypto');
                          if (amount && selectedToken) {
                            calculateFiatFromCrypto(amount);
                          }
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        {amountInputMode === 'fiat' ? 'Switch to Crypto' : 'Editing Crypto'}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.000000"
                        value={amount}
                        onChange={async (e) => {
                          const value = sanitizeInput(e.target.value);
                          setAmount(value);
                          setAmountInputMode('crypto');
                          setError('');
                          // Calculate fiat amount when crypto amount changes
                          if (value && parseFloat(value) > 0 && selectedToken && selectedChainId) {
                            await calculateFiatFromCrypto(value);
                          } else {
                            setFiatAmount('');
                          }
                        }}
                        className="pr-24 bg-white/10 border-indigo-400/30 text-white placeholder:text-indigo-200/50"
                        step="0.000001"
                        disabled={isCalculatingQuote}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-200/80 font-medium">
                        {selectedBalance?.token.symbol || selectedToken?.symbol}
                      </div>
                    </div>
                  </div>

                  {/* Fiat Amount Input */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="fiatAmount" className="text-white">
                        Fiat Amount (You Pay)
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setAmountInputMode('fiat');
                          if (fiatAmount) {
                            calculateCryptoFromFiat(fiatAmount);
                          }
                        }}
                        className="text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        {amountInputMode === 'crypto' ? 'Switch to Fiat' : 'Editing Fiat'}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="fiatAmount"
                        type="number"
                        placeholder="0.00"
                        value={fiatAmount}
                        onChange={async (e) => {
                          const value = sanitizeInput(e.target.value);
                          setFiatAmount(value);
                          setAmountInputMode('fiat');
                          setError('');
                          // Calculate crypto amount when fiat amount changes
                          if (value && parseFloat(value) > 0 && selectedToken && selectedChainId) {
                            await calculateCryptoFromFiat(value);
                          } else {
                            setAmount('');
                          }
                        }}
                        className="pr-20 bg-white/10 border-indigo-400/30 text-white placeholder:text-indigo-200/50"
                        step="0.01"
                        disabled={isCalculatingQuote}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-200/80 font-medium">
                        {CONVERSION_CURRENCIES.find(c => c.code === currency)?.symbol || currency}
                      </div>
                    </div>
                    {isCalculatingQuote && (
                      <p className="text-xs text-indigo-400/80 mt-1 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Calculating quote...
                      </p>
                    )}
                    {quote && (
                      <p className="text-xs text-indigo-200/70 mt-1">
                        Platform fee: {quote.markupOrDiscount > 0 ? '+' : ''}{quote.markupOrDiscount.toFixed(2)}%
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Label htmlFor="amount" className="text-white">Amount</Label>
                  <div className="relative mt-2">
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.000000"
                      value={amount}
                      onChange={(e) => {
                        setAmount(sanitizeInput(e.target.value));
                        setError('');
                      }}
                      className="pr-24 bg-white/10 border-indigo-400/30 text-white placeholder:text-indigo-200/50"
                      step="0.000001"
                      max={getMaxAmount()}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-200/80 font-medium">
                      {selectedBalance?.token.symbol || selectedToken?.symbol}
                    </div>
                  </div>
                  {selectedBalance && sendType === 'direct' && (
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-sm text-indigo-200/80">
                        Max: {getMaxAmount().toFixed(6)} {selectedBalance.token.symbol}
                      </p>
                      <Web3Button
                        variant="ghost"
                        onClick={() => setAmount(getMaxAmount().toString())}
                        className="text-xs h-auto py-1 px-2"
                      >
                        Use Max
                      </Web3Button>
                    </div>
                  )}
                  {/* Fiat Amount for Crypto-to-Fiat */}
                  {sendType === 'crypto-to-fiat' && amount && selectedToken && (
                    <div className="mt-4">
                      <Label htmlFor="fiatAmount" className="text-white">
                        Fiat Amount (Recipient Receives)
                      </Label>
                      <div className="relative mt-2">
                        <Input
                          id="fiatAmount"
                          type="number"
                          placeholder="0.00"
                          value={fiatAmount}
                          onChange={(e) => {
                            setFiatAmount(sanitizeInput(e.target.value));
                            setError('');
                          }}
                          className="pr-16 bg-white/10 border-indigo-400/30 text-white placeholder:text-indigo-200/50"
                          step="0.01"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-200/80 font-medium">
                          {currency}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Message (Optional) */}
          <div>
            <Label htmlFor="message" className="text-white mb-4">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a message with your transaction....."
              value={message}
              onChange={(e) => {
                const value = e.target.value;
                // Sanitize input but prevent infinite loops by only updating if different
                const sanitized = sanitizeInput(value);
                if (sanitized !== message) {
                  setMessage(sanitized);
                }
              }}
              rows={3}
              maxLength={200}
              className="bg-white/10 border-indigo-400/30 text-white placeholder:text-indigo-200/50"
            />
            <p className="text-xs text-indigo-200/70 mt-1">{message.length}/200 characters</p>
          </div>

          {error && (
            <Web3Card className="p-3 bg-red-600/20 border-red-400/30">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                <span className="text-sm text-red-200">{error}</span>
              </div>
            </Web3Card>
          )}

          <div className="flex gap-3">
            <Web3Button variant="secondary" onClick={() => setStep(2)} className="flex-1">
              Back
            </Web3Button>
            <Web3Button 
              onClick={() => {
                if (validateAmount()) {
                  setStep(4);
                }
              }}
              disabled={
                !selectedToken || 
                !selectedChainId || 
                !amount ||
                (sendType === 'cross-chain' && (!destinationChainId || !destinationToken)) ||
                (sendType === 'fiat-to-crypto' && !fiatAmount) ||
                (sendType === 'crypto-to-fiat' && (!selectedPaymentMethod || !fiatAmount))
              }
              className="flex-1"
            >
              Continue
            </Web3Button>
          </div>
        </div>
      </Web3Card>
    </div>
  );

  const renderConfirmStep = () => {
    const tokenSymbol = selectedBalance?.token.symbol || selectedToken?.symbol || '';
    const chainName = selectedBalance?.chain.name || getChainById(selectedChainId || 0)?.name || 'Unknown';
    const cryptoInfo = CRYPTO_INFO[tokenSymbol as keyof typeof CRYPTO_INFO];
    const amountValue = calculateAssetValue(parseFloat(amount), tokenSymbol, 'GHS', cryptoInfo);

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="bg-orange-600/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 border border-orange-400/50">
            <Send className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Confirm Transaction</h2>
          <p className="text-indigo-200/80">Review details before sending</p>
        </div>

        <Web3Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-indigo-200/80">To:</span>
              <div className="text-right">
                {recipient?.ensName && (
                  <p className="font-medium text-white">{recipient.ensName}</p>
                )}
                <p className="text-sm text-indigo-200/70 font-mono">
                  {recipient!.address.slice(0, 6)}...{recipient!.address.slice(-4)}
                </p>
                {recipient?.name && (
                  <p className="text-xs text-indigo-300/70">{recipient.name}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-indigo-200/80">Send Type:</span>
              <Badge className={`${
                sendType === 'direct' ? 'bg-blue-400/20 text-blue-400' :
                sendType === 'cross-chain' ? 'bg-purple-400/20 text-purple-400' :
                sendType === 'fiat-to-crypto' ? 'bg-green-400/20 text-green-400' :
                'bg-orange-400/20 text-orange-400'
              } border-current`}>
                {sendType === 'direct' ? 'Direct Send' :
                 sendType === 'cross-chain' ? 'Cross-Chain Send' :
                 sendType === 'fiat-to-crypto' ? 'Fiat-to-Crypto' :
                 'Crypto-to-Fiat'}
              </Badge>
            </div>

            {/* Show destination info for cross-chain */}
            {sendType === 'cross-chain' && destinationChainId && destinationToken && (
              <div className="flex items-center justify-between">
                <span className="text-indigo-200/80">Destination:</span>
                <div className="text-right">
                  <p className="font-medium text-white">{destinationToken.symbol}</p>
                  <p className="text-sm text-indigo-200/70">{getChainById(destinationChainId)?.name || 'Unknown'}</p>
                </div>
              </div>
            )}

            {/* Show payment method for crypto-to-fiat */}
            {sendType === 'crypto-to-fiat' && selectedPaymentMethod && (
              <div className="flex items-center justify-between">
                <span className="text-indigo-200/80">Payment Method:</span>
                <div className="text-right">
                  <p className="font-medium text-white">{selectedPaymentMethod.name}</p>
                  {(selectedPaymentMethod.details?.validated_name ||
                    recipientValidation.name) && (
                    <p className="text-sm text-indigo-200/70">
                      {selectedPaymentMethod.details?.validated_name ||
                        recipientValidation.name}
                    </p>
                  )}
                  {(selectedPaymentMethod.details?.phone ||
                    selectedPaymentMethod.account_number) && (
                    <p className="text-xs text-indigo-200/60">
                      {selectedPaymentMethod.details?.phone ||
                        selectedPaymentMethod.account_number}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Show fiat amount for fiat-to-crypto and crypto-to-fiat */}
            {(sendType === 'fiat-to-crypto' || sendType === 'crypto-to-fiat') && fiatAmount && (
              <div className="flex items-center justify-between">
                <span className="text-indigo-200/80">
                  {sendType === 'fiat-to-crypto' ? 'You Pay:' : 'Recipient Receives:'}
                </span>
                <span className="font-semibold text-white">
                  {CONVERSION_CURRENCIES.find(c => c.code === currency)?.symbol || currency} {parseFloat(fiatAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {quote && quote.markupOrDiscount > 0 && (
                  <p className="text-xs text-indigo-200/60 mt-1">
                    Includes {quote.markupOrDiscount.toFixed(2)}% platform fee
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-indigo-200/80">Amount:</span>
              <div className="text-right">
                <p className="font-semibold text-white">
                  {parseFloat(amount).toFixed(6)} {tokenSymbol}
                </p>
                {cryptoInfo && sendType !== 'fiat-to-crypto' && (
                  <p className="text-sm text-indigo-200/70">≈ GHS {amountValue.toFixed(2)}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-indigo-200/80">Network:</span>
              <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/30">
                {chainName}
              </Badge>
            </div>

            {message && (
              <div className="border-t border-indigo-400/30 pt-4">
                <span className="text-indigo-200/80 text-sm">Message:</span>
                <p className="text-white mt-1 bg-white/10 p-3 rounded-lg text-sm">
                  {message}
                </p>
              </div>
            )}

            <div className="border-t border-indigo-400/30 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-indigo-200/80">Network Fee:</span>
                <span className="text-green-400">Estimated</span>
              </div>
              <div className="flex items-center justify-between font-semibold">
                <span className="text-white">Total:</span>
                <span className="text-white">
                  {parseFloat(amount).toFixed(6)} {tokenSymbol}
                </span>
              </div>
            </div>

            {error && (
              <Web3Card className="p-3 bg-red-600/20 border-red-400/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-red-200">{error}</span>
                </div>
              </Web3Card>
            )}

            <div className="flex gap-3">
              <Web3Button variant="secondary" onClick={() => setStep(3)} className="flex-1">
                Back
              </Web3Button>
              <Web3Button 
                onClick={handleSendCrypto}
                disabled={isLoading || isTxPending || isConfirming}
                className="flex-1"
              >
                {isLoading || isTxPending || isConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isConfirming ? 'Confirming...' : 'Sending...'}
                  </>
                ) : (
                  'Send Crypto'
                )}
              </Web3Button>
            </div>
          </div>
        </Web3Card>
      </div>
    );
  };

  const renderSuccessStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="bg-green-600/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 border border-green-400/50">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Transaction Sent!</h2>
        <p className="text-indigo-200/80">Your crypto has been successfully sent</p>
      </div>

      <Web3Card className="p-6">
        <div className="space-y-3 text-center">
          <div className="bg-green-600/20 border border-green-400/30 rounded-lg p-4">
            <p className="font-semibold text-white mb-2">
              {parseFloat(amount).toFixed(6)} {selectedBalance?.token.symbol || selectedToken?.symbol}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-green-400">
              <span>To: {recipient?.ensName || recipient!.address.slice(0, 6)}...{recipient!.address.slice(-4)}</span>
              <ArrowRight className="w-4 h-4" />
              <span>Completed</span>
            </div>
          </div>

          <div className="text-sm text-indigo-200/80 space-y-1">
            <p>Transaction ID: {transactionId}</p>
            <p>Network: {selectedBalance?.chain.name || getChainById(selectedChainId || 0)?.name || 'Unknown'}</p>
            <p className="text-green-400">Status: Completed</p>
          </div>

          {message && (
            <div className="bg-white/10 p-3 rounded-lg border border-indigo-400/30">
              <p className="text-sm text-indigo-200/80 font-medium">Message sent:</p>
              <p className="text-sm text-white mt-1">"{message}"</p>
            </div>
          )}
        </div>
      </Web3Card>

      <div className="flex gap-3">
        <Web3Button 
          variant="secondary" 
          onClick={onBack}
          className="flex-1"
        >
          Go Back
        </Web3Button>
        <Web3Button 
          onClick={() => onNavigate('wallet')}
          className="flex-1"
        >
          View Wallet
        </Web3Button>
      </div>
    </div>
  );

  // Only block if wallet is not connected - balances load progressively and don't block sending
  if (!isConnected) {
    return (
      <Web3Container>
        <div className="max-w-md mx-auto px-4 py-6">
          <Web3Card className="p-8 text-center">
            <Loader2 className="w-16 h-16 text-indigo-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold text-white mb-2">Wallet Not Connected</h3>
            <p className="text-indigo-200/80 mb-6">
              Please connect your wallet to send crypto
            </p>
            <Web3Button onClick={onBack}>
              Go Back
            </Web3Button>
          </Web3Card>
        </div>
      </Web3Container>
    );
  }

  // Don't block sending if no balances - users can still send via fiat-to-crypto, cross-chain, etc.
  // Balances load progressively in the background and appear as they're found

  return (
    <Web3Container>
      <div className="max-w-md mx-auto space-y-6 px-4 py-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-white mb-2">Send Cryptocurrency</h1>
          <p className="text-indigo-200/80">Send crypto to other Klyra users</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4, 5].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNumber
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white/20 text-indigo-200'
                  }`}
                >
                  {step > stepNumber ? <CheckCircle className="w-4 h-4" /> : stepNumber}
                </div>
                {stepNumber < 5 && (
                  <div
                    className={`w-8 h-0.5 ${
                      step > stepNumber ? 'bg-indigo-600' : 'bg-white/20'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        {step === 1 && renderRecipientStep()}
        {step === 2 && renderSendTypeStep()}
        {step === 3 && renderAmountStep()}
        {step === 4 && renderConfirmStep()}
        {step === 5 && renderSuccessStep()}
      </div>
    </Web3Container>
  );
};