// Custom hook for managing swap state and real-time quotes

import { useState, useEffect, useCallback, useRef } from 'react';
import { oneInchAPI, isCrossChainSwap, parseAmount, formatAmount, formatGasCost } from '@/lib/1inch-api';
import type { Token } from '@/lib/chain-data';
import type { SwapState, SwapRoute, SwapType } from '@/lib/swap-types';

const QUOTE_REFRESH_INTERVAL = 15000; // 15 seconds

export function useSwap(userAddress?: string) {
  const [state, setState] = useState<SwapState>({
    srcChainId: null,
    srcToken: null,
    srcAmount: '',
    dstChainId: null,
    dstToken: null,
    dstAmount: '',
    swapType: null,
    selectedRoute: null,
    availableRoutes: [],
    userAddress: userAddress || '',
    slippage: 0.5,
    isLoadingQuotes: false,
    isLoadingCalldata: false,
    error: null,
    calldata: null,
    approvalNeeded: false,
    approvalCalldata: null,
  });

  const quoteIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Determine swap type
  const determineSwapType = useCallback(
    (srcChainId: number | null, dstChainId: number | null, srcToken: Token | null, dstToken: Token | null): SwapType | null => {
      if (!srcChainId || !dstChainId || !srcToken || !dstToken) return null;

      if (srcChainId === dstChainId) {
        return 'same-chain';
      } else if (srcToken.symbol === dstToken.symbol) {
        return 'same-token-cross-chain';
      } else {
        return 'cross-chain';
      }
    },
    []
  );

  // Fetch quotes from 1inch
  const fetchQuotes = useCallback(async () => {
    if (!state.srcChainId || !state.dstChainId || !state.srcToken || !state.dstToken || !state.srcAmount) {
      return;
    }

    // Skip if amount is 0 or invalid
    if (parseFloat(state.srcAmount) <= 0) {
      return;
    }

    setState(prev => ({ ...prev, isLoadingQuotes: true, error: null }));

    try {
      const amount = parseAmount(state.srcAmount, state.srcToken.decimals);
      const isCrossChain = isCrossChainSwap(state.srcChainId, state.dstChainId);

      if (isCrossChain) {
        // Use Fusion+ for cross-chain
        const fusionQuote = await oneInchAPI.getFusionQuote({
          srcChain: state.srcChainId,
          dstChain: state.dstChainId,
          srcTokenAddress: state.srcToken.address,
          dstTokenAddress: state.dstToken.address,
          amount,
          walletAddress: state.userAddress || '0x0000000000000000000000000000000000000000',
          enableEstimate: true, // Set to true to get quoteId
          source: 'fusion', // Use 'fusion' as source (options: 'fusion' or 'api')
          slippage: state.slippage, // Pass user's slippage preference
          fee: 0, // No additional fees
        });

        // Get the recommended preset, fallback to 'fast' if 'custom' is returned
        const presetKey: 'fast' | 'medium' | 'slow' = 
          fusionQuote.recommendedPreset === 'custom' ? 'fast' : fusionQuote.recommendedPreset;
        const recommendedPreset = fusionQuote.presets[presetKey];

        const route: SwapRoute = {
          routerId: '1inch-fusion',
          routerName: '1inch Fusion+',
          quote: fusionQuote,
          quoteId: fusionQuote.quoteId || undefined, // Store quoteId for executing the swap
          estimatedGas: parseInt(recommendedPreset.gasCost.gasBumpEstimate.toString()),
          gasCost: formatGasCost(
            recommendedPreset.gasCost.gasBumpEstimate,
            recommendedPreset.gasCost.gasPriceEstimate
          ),
          isRecommended: true,
        };

        setState(prev => ({
          ...prev,
          availableRoutes: [route],
          selectedRoute: route,
          dstAmount: formatAmount(fusionQuote.dstTokenAmount, state.dstToken!.decimals),
          isLoadingQuotes: false,
        }));
      } else {
        // Use regular swap API for same-chain
        const quote = await oneInchAPI.getQuote({
          chainId: state.srcChainId,
          src: state.srcToken.address,
          dst: state.dstToken.address,
          amount,
        });

        const route: SwapRoute = {
          routerId: '1inch',
          routerName: '1inch Aggregator',
          quote,
          estimatedGas: quote.gas || quote.estimatedGas,
          gasCost: quote.gas ? formatGasCost(quote.gas, '0') : undefined,
          route: quote.protocols?.[0]?.map(p => p.name),
          isRecommended: true,
        };

        setState(prev => ({
          ...prev,
          availableRoutes: [route],
          selectedRoute: route,
          dstAmount: formatAmount(quote.dstAmount, state.dstToken!.decimals),
          isLoadingQuotes: false,
        }));
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to fetch quotes',
        isLoadingQuotes: false,
      }));
    }
  }, [state.srcChainId, state.dstChainId, state.srcToken, state.dstToken, state.srcAmount, state.userAddress]);

  // Generate swap calldata
  const generateCalldata = useCallback(async () => {
    if (!state.srcChainId || !state.dstChainId || !state.srcToken || !state.dstToken || !state.srcAmount || !state.userAddress) {
      setState(prev => ({ ...prev, error: 'Missing required parameters' }));
      return;
    }

    // Only generate calldata for same-chain swaps (cross-chain uses Fusion API differently)
    if (state.srcChainId !== state.dstChainId) {
      setState(prev => ({ ...prev, error: 'Cross-chain calldata generation coming soon' }));
      return;
    }

    setState(prev => ({ ...prev, isLoadingCalldata: true, error: null }));

    try {
      const amount = parseAmount(state.srcAmount, state.srcToken.decimals);

      const swapData = await oneInchAPI.getSwap({
        chainId: state.srcChainId,
        src: state.srcToken.address,
        dst: state.dstToken.address,
        amount,
        from: state.userAddress,
        origin: state.userAddress,
        slippage: state.slippage,
        disableEstimate: false,
        allowPartialFill: false,
      });

      setState(prev => ({
        ...prev,
        calldata: swapData,
        isLoadingCalldata: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to generate calldata',
        isLoadingCalldata: false,
      }));
    }
  }, [state.srcChainId, state.dstChainId, state.srcToken, state.dstToken, state.srcAmount, state.userAddress, state.slippage]);

  // Check if approval is needed
  const checkApproval = useCallback(async () => {
    // Implementation would check token allowance here
    // For now, we'll assume approval is needed for ERC20 tokens
    if (state.srcToken && state.srcToken.address !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      setState(prev => ({ ...prev, approvalNeeded: true }));
    } else {
      setState(prev => ({ ...prev, approvalNeeded: false }));
    }
  }, [state.srcToken]);

  // Generate approval calldata
  const generateApprovalCalldata = useCallback(async () => {
    if (!state.srcChainId || !state.srcToken || !state.srcAmount) {
      return;
    }

    try {
      const amount = parseAmount(state.srcAmount, state.srcToken.decimals);
      const approvalData = await oneInchAPI.getApproveCalldata({
        chainId: state.srcChainId,
        tokenAddress: state.srcToken.address,
        amount,
      });

      setState(prev => ({
        ...prev,
        approvalCalldata: approvalData,
      }));
    } catch (error: any) {
      console.error('Failed to generate approval calldata:', error);
    }
  }, [state.srcChainId, state.srcToken, state.srcAmount]);

  // Update swap type when chains or tokens change
  useEffect(() => {
    const swapType = determineSwapType(state.srcChainId, state.dstChainId, state.srcToken, state.dstToken);
    setState(prev => ({ ...prev, swapType }));
  }, [state.srcChainId, state.dstChainId, state.srcToken, state.dstToken, determineSwapType]);

  // Fetch quotes when parameters change
  useEffect(() => {
    if (state.srcChainId && state.dstChainId && state.srcToken && state.dstToken && state.srcAmount) {
      fetchQuotes();
      
      // Set up auto-refresh
      if (quoteIntervalRef.current) {
        clearInterval(quoteIntervalRef.current);
      }
      
      quoteIntervalRef.current = setInterval(() => {
        fetchQuotes();
      }, QUOTE_REFRESH_INTERVAL);
    }

    return () => {
      if (quoteIntervalRef.current) {
        clearInterval(quoteIntervalRef.current);
      }
    };
  }, [state.srcChainId, state.dstChainId, state.srcToken, state.dstToken, state.srcAmount, fetchQuotes]);

  // Check approval when source token changes
  useEffect(() => {
    checkApproval();
  }, [checkApproval]);

  // Public API
  return {
    state,
    actions: {
      setSrcChain: (chainId: number) => setState(prev => ({ ...prev, srcChainId: chainId, srcToken: null })),
      setSrcToken: (token: Token) => setState(prev => ({ ...prev, srcToken: token })),
      setSrcAmount: (amount: string) => setState(prev => ({ ...prev, srcAmount: amount })),
      setDstChain: (chainId: number) => setState(prev => ({ ...prev, dstChainId: chainId, dstToken: null })),
      setDstToken: (token: Token) => setState(prev => ({ ...prev, dstToken: token })),
      setSlippage: (slippage: number) => setState(prev => ({ ...prev, slippage })),
      setUserAddress: (address: string) => setState(prev => ({ ...prev, userAddress: address })),
      setSelectedRoute: (route: SwapRoute) => setState(prev => ({ ...prev, selectedRoute: route })),
      switchTokens: () => {
        setState(prev => ({
          ...prev,
          srcChainId: prev.dstChainId,
          srcToken: prev.dstToken,
          srcAmount: prev.dstAmount,
          dstChainId: prev.srcChainId,
          dstToken: prev.srcToken,
          dstAmount: prev.srcAmount,
        }));
      },
      refreshQuotes: fetchQuotes,
      generateCalldata,
      generateApprovalCalldata,
      clearError: () => setState(prev => ({ ...prev, error: null })),
    },
  };
}

