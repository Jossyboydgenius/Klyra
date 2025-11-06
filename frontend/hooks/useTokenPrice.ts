'use client';

import { useState, useEffect } from 'react';
import { getCryptoPrice, getFiatRates } from '@/lib/price-service';
import { CRYPTO_INFO } from '@/lib/constants';

interface TokenPrice {
  price_usd: number;
  change_24h?: number;
  isLoading: boolean;
  error: string | null;
}

interface FiatRates {
  NGN: number;
  GHS: number;
  KES: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch and cache token price
 */
export function useTokenPrice(symbol: string | null): TokenPrice {
  const [price, setPrice] = useState<TokenPrice>({
    price_usd: 0,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    if (!symbol) {
      setPrice({ price_usd: 0, isLoading: false, error: null });
      return;
    }

    let cancelled = false;

    const fetchPrice = async () => {
      setPrice(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const result = await getCryptoPrice(symbol);
        
        if (cancelled) return;

        if (result) {
          setPrice({
            price_usd: result.price_usd,
            change_24h: result.change_24h,
            isLoading: false,
            error: null,
          });
        } else {
          // Fallback to static price from CRYPTO_INFO
          const fallbackPrice = CRYPTO_INFO[symbol.toUpperCase() as keyof typeof CRYPTO_INFO]?.price_usd;
          setPrice({
            price_usd: fallbackPrice || 0,
            isLoading: false,
            error: fallbackPrice ? 'Using fallback price' : 'Price not found',
          });
        }
      } catch (error) {
        if (cancelled) return;
        // Fallback to static price from CRYPTO_INFO
        const fallbackPrice = CRYPTO_INFO[symbol.toUpperCase() as keyof typeof CRYPTO_INFO]?.price_usd;
        setPrice({
          price_usd: fallbackPrice || 0,
          isLoading: false,
          error: fallbackPrice ? 'Using fallback price (API error)' : 'Failed to fetch price',
        });
      }
    };

    fetchPrice();

    // Refresh price every 30 seconds
    const interval = setInterval(fetchPrice, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [symbol]);

  return price;
}

/**
 * Hook to fetch fiat exchange rates
 */
export function useFiatRates(): FiatRates {
  const [rates, setRates] = useState<FiatRates>({
    NGN: 1500,
    GHS: 12.5,
    KES: 130,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchRates = async () => {
      setRates(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const result = await getFiatRates();
        
        if (cancelled) return;

        if (result) {
          setRates({
            ...result,
            isLoading: false,
            error: null,
          });
        } else {
          setRates(prev => ({
            ...prev,
            isLoading: false,
            error: 'Rates not found',
          }));
        }
      } catch (error) {
        if (cancelled) return;
        setRates(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch rates',
        }));
      }
    };

    fetchRates();

    // Refresh rates every 5 minutes
    const interval = setInterval(fetchRates, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return rates;
}

