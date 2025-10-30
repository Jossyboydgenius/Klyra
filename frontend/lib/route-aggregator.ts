// Unified Route Aggregator - Compares all providers and finds best routes

import { oneInchAPI, isCrossChainSwap, parseAmount } from './1inch-api';
import { socketAPI } from './aggregators/socket';
import { lifiAPI } from './aggregators/lifi';
import { SquidAPI } from './aggregators/squid';
import { AcrossAPI } from './aggregators/across';
import type { PaymentIntent, UnifiedRoute, RouteComparison, RouteStep } from './payment-types';

export class RouteAggregator {
  private squidAPI: SquidAPI;
  private acrossAPI: AcrossAPI;

  constructor(options?: { squidAPI?: SquidAPI; acrossAPI?: AcrossAPI; isTestnet?: boolean }) {
    const isTestnet = options?.isTestnet || false;
    this.squidAPI = options?.squidAPI || new SquidAPI(undefined, isTestnet);
    this.acrossAPI = options?.acrossAPI || new AcrossAPI(undefined, isTestnet);
  }

  async findBestRoutes(intent: PaymentIntent): Promise<RouteComparison> {
    const routes = await this.getAllRoutes(intent);
    
    if (routes.length === 0) {
      throw new Error('No routes found for this payment');
    }

    // Sort and categorize
    const sortedByOutput = [...routes].sort((a, b) => 
      parseFloat(b.toAmount) - parseFloat(a.toAmount)
    );
    const sortedByTime = [...routes].sort((a, b) => 
      a.estimatedTime - b.estimatedTime
    );
    const sortedByCost = [...routes].sort((a, b) => 
      (a.totalGasUSD + a.totalFeeUSD) - (b.totalGasUSD + b.totalFeeUSD)
    );

    const recommended = sortedByOutput[0];
    const fastest = sortedByTime[0];
    const cheapest = sortedByCost[0];

    // Mark routes
    recommended.isRecommended = true;
    fastest.isFastest = true;
    cheapest.isCheapest = true;

    return {
      recommended,
      fastest,
      cheapest,
      allRoutes: routes,
      summary: {
        timeDifference: fastest.estimatedTime - recommended.estimatedTime,
        costDifference: (recommended.totalGasUSD + recommended.totalFeeUSD) - (cheapest.totalGasUSD + cheapest.totalFeeUSD),
        outputDifference: (parseFloat(recommended.toAmount) - parseFloat(cheapest.toAmount)).toString(),
      },
    };
  }

  private async getAllRoutes(intent: PaymentIntent): Promise<UnifiedRoute[]> {
    const routes: UnifiedRoute[] = [];
    const amount = parseAmount(intent.sender.amount, intent.sender.token.decimals);

    // Parallel fetch from all providers
    const results = await Promise.allSettled([
      this.get1inchRoute(intent, amount),
      this.getSocketRoutes(intent, amount),
      this.getLiFiRoutes(intent, amount),
      this.getSquidRoute(intent, amount),
      this.getAcrossRoute(intent, amount),
    ]);

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        if (Array.isArray(result.value)) {
          routes.push(...result.value);
        } else {
          routes.push(result.value);
        }
      }
    });

    return routes;
  }

  private async get1inchRoute(intent: PaymentIntent, amount: string): Promise<UnifiedRoute | null> {
    try {
      const isCrossChain = intent.sender.chain !== intent.recipient.chain;

      if (isCrossChain) {
        // Use Fusion+ for cross-chain
        const quote = await oneInchAPI.getFusionQuote({
          srcChain: intent.sender.chain,
          dstChain: intent.recipient.chain,
          srcTokenAddress: intent.sender.token.address,
          dstTokenAddress: intent.recipient.token.address,
          amount,
          walletAddress: intent.sender.address,
          enableEstimate: true,
          source: 'fusion',
          slippage: 0.5,
        });

        const preset = quote.presets[quote.recommendedPreset === 'custom' ? 'fast' : quote.recommendedPreset];

        return {
          id: `1inch-${Date.now()}`,
          provider: '1inch-fusion',
          providerName: '1inch Fusion+',
          fromChain: intent.sender.chain,
          fromToken: intent.sender.token.address,
          fromAmount: amount,
          toChain: intent.recipient.chain,
          toToken: intent.recipient.token.address,
          toAmount: quote.dstTokenAmount,
          toAmountMin: quote.dstTokenAmount, // Could calculate with slippage
          steps: this.parse1inchSteps(intent, preset),
          totalGasUSD: 0, // Not provided in estimate
          totalFeeUSD: parseFloat(quote.prices.usd.srcToken) * parseFloat(amount) / 1e18 * 0.001, // Estimate 0.1%
          estimatedTime: preset.auctionDuration,
          priceImpact: quote.priceImpactPercent,
          transactions: [], // Will be generated during execution
          requiresApproval: true,
          rawData: quote,
        };
      } else {
        // Use regular swap for same-chain
        const quote = await oneInchAPI.getQuote({
          chainId: intent.sender.chain,
          src: intent.sender.token.address,
          dst: intent.recipient.token.address,
          amount,
        });

        return {
          id: `1inch-swap-${Date.now()}`,
          provider: '1inch-fusion',
          providerName: '1inch Swap',
          fromChain: intent.sender.chain,
          fromToken: intent.sender.token.address,
          fromAmount: amount,
          toChain: intent.recipient.chain,
          toToken: intent.recipient.token.address,
          toAmount: quote.dstAmount,
          toAmountMin: quote.dstAmount,
          steps: [
            {
              type: 'swap',
              chain: intent.sender.chain,
              protocol: '1inch',
              description: `Swap ${intent.sender.token.symbol} to ${intent.recipient.token.symbol}`,
            },
          ],
          totalGasUSD: quote.gas ? quote.gas * parseInt(quote.srcToken.address) / 1e18 : 0,
          totalFeeUSD: 0,
          estimatedTime: 30,
          transactions: [],
          requiresApproval: true,
          rawData: quote,
        };
      }
    } catch (error) {
      console.error('1inch route error:', error);
      return null;
    }
  }

  private async getSocketRoutes(intent: PaymentIntent, amount: string): Promise<UnifiedRoute[]> {
    try {
      const result = await socketAPI.getQuote({
        fromChainId: intent.sender.chain,
        fromTokenAddress: intent.sender.token.address,
        toChainId: intent.recipient.chain,
        toTokenAddress: intent.recipient.token.address,
        fromAmount: amount,
        userAddress: intent.sender.address,
        recipient: intent.recipient.address,
        uniqueRoutesPerBridge: true,
        sort: 'output',
      });

      return result.result.routes.slice(0, 3).map((route, idx) => ({
        id: `socket-${idx}-${Date.now()}`,
        provider: 'socket',
        providerName: 'Socket',
        fromChain: route.fromChainId,
        fromToken: route.fromAsset.address,
        fromAmount: route.fromAmount,
        toChain: route.toChainId,
        toToken: route.toAsset.address,
        toAmount: route.toAmount,
        toAmountMin: route.toAmount,
        steps: route.userTxs.map(tx => ({
          type: tx.userTxType === 'fund-movr' ? 'bridge' : 'swap',
          chain: tx.chainId,
          protocol: tx.txType,
          description: `${tx.userTxType} via ${tx.txType}`,
        })),
        totalGasUSD: route.totalGasFeesInUsd,
        totalFeeUSD: parseFloat(route.integratorFee.amount),
        estimatedTime: route.serviceTime,
        transactions: route.userTxs.map(tx => ({
          chainId: tx.chainId,
          to: tx.txTarget,
          data: tx.txData,
          value: tx.value,
        })),
        requiresApproval: route.userTxs.some(tx => tx.approvalData),
        approvalData: route.userTxs.find(tx => tx.approvalData)?.approvalData,
        rawData: route,
      }));
    } catch (error) {
      console.error('Socket route error:', error);
      return [];
    }
  }

  private async getLiFiRoutes(intent: PaymentIntent, amount: string): Promise<UnifiedRoute[]> {
    try {
      const result = await lifiAPI.getQuote({
        fromChain: intent.sender.chain,
        toChain: intent.recipient.chain,
        fromToken: intent.sender.token.address,
        toToken: intent.recipient.token.address,
        fromAmount: amount,
        fromAddress: intent.sender.address,
        toAddress: intent.recipient.address,
        slippage: 0.005,
      });

      return result.routes.slice(0, 3).map((route, idx) => ({
        id: `lifi-${idx}-${Date.now()}`,
        provider: 'lifi',
        providerName: 'LI.FI',
        fromChain: route.fromChainId,
        fromToken: route.fromToken.address,
        fromAmount: route.fromAmount,
        toChain: route.toChainId,
        toToken: route.toToken.address,
        toAmount: route.toAmount,
        toAmountMin: route.toAmountMin,
        steps: route.steps.map(step => ({
          type: step.type === 'cross' ? 'bridge' : 'swap',
          chain: route.fromChainId,
          protocol: step.tool,
          description: `${step.type} via ${step.tool}`,
          estimatedTime: step.estimate.executionDuration,
        })),
        totalGasUSD: route.steps.reduce((sum, step) => 
          sum + step.estimate.gasCosts.reduce((s, g) => s + parseFloat(g.amountUSD || '0'), 0), 0
        ),
        totalFeeUSD: parseFloat(route.fromAmountUSD) - parseFloat(route.toAmountUSD),
        estimatedTime: route.steps.reduce((sum, step) => sum + (step.estimate.executionDuration || 0), 0),
        transactions: [], // LI.FI requires separate transaction building
        requiresApproval: true,
        rawData: route,
      }));
    } catch (error) {
      console.error('LiFi route error:', error);
      return [];
    }
  }

  private async getSquidRoute(intent: PaymentIntent, amount: string): Promise<UnifiedRoute | null> {
    try {
      const result = await this.squidAPI.getRoute({
        fromChain: intent.sender.chain,
        toChain: intent.recipient.chain,
        fromToken: intent.sender.token.address,
        toToken: intent.recipient.token.address,
        fromAmount: amount,
        fromAddress: intent.sender.address,
        toAddress: intent.recipient.address,
        slippage: 1,
        enableBoost: false,
        quoteOnly: false,
      });

      const route = result.route;
      const requestId = result.requestId;

      // Build steps from actions
      const steps: RouteStep[] = route.estimate.actions?.map((action: any) => ({
        type: (action.type === 'swap' ? 'swap' : 'bridge') as 'swap' | 'bridge',
        chain: intent.sender.chain,
        protocol: 'squid',
        description: `${action.type} via Squid`,
      })) || [
        {
          type: 'bridge' as const,
          chain: intent.sender.chain,
          protocol: 'squid',
          description: 'Cross-chain route via Squid',
          estimatedTime: route.estimate.estimatedRouteDuration,
        },
      ];

      return {
        id: `squid-${Date.now()}`,
        provider: 'squid',
        providerName: 'Squid Router',
        fromChain: intent.sender.chain,
        fromToken: intent.sender.token.address,
        fromAmount: route.estimate.fromAmount,
        toChain: intent.recipient.chain,
        toToken: intent.recipient.token.address,
        toAmount: route.estimate.toAmount,
        toAmountMin: route.estimate.toAmountMin,
        steps,
        totalGasUSD: route.estimate.gasCosts.reduce((sum: number, g: any) => sum + parseFloat(g.amountUsd || '0'), 0),
        totalFeeUSD: route.estimate.feeCosts.reduce((sum: number, f: any) => sum + parseFloat(f.amountUsd || '0'), 0),
        estimatedTime: route.estimate.estimatedRouteDuration,
        priceImpact: parseFloat(route.estimate.aggregatePriceImpact),
        transactions: [
          {
            chainId: intent.sender.chain,
            to: route.transactionRequest.target,
            data: route.transactionRequest.data,
            value: route.transactionRequest.value,
            gasLimit: route.transactionRequest.gasLimit,
            gasPrice: route.transactionRequest.gasPrice,
            maxFeePerGas: route.transactionRequest.maxFeePerGas,
            maxPriorityFeePerGas: route.transactionRequest.maxPriorityFeePerGas,
          },
        ],
        requiresApproval: true,
        rawData: { ...route, requestId },
      };
    } catch (error) {
      console.error('Squid route error:', error);
      return null;
    }
  }

  private async getAcrossRoute(intent: PaymentIntent, amount: string): Promise<UnifiedRoute | null> {
    try {
      const quote = await this.acrossAPI.getSwapQuote({
        tradeType: 'exactInput',
        amount,
        inputToken: intent.sender.token.address,
        outputToken: intent.recipient.token.address,
        originChainId: intent.sender.chain,
        destinationChainId: intent.recipient.chain,
        depositor: intent.sender.address,
        recipient: intent.recipient.address,
        slippage: 0.005, // 0.5%
      });

      // Build steps based on swap type
      const steps: RouteStep[] = [];

      // Check if origin swap is needed
      if (quote.crossSwapType === 'ANY_TO_BRIDGEABLE' || quote.crossSwapType === 'ANY_TO_ANY') {
        steps.push({
          type: 'swap',
          chain: intent.sender.chain,
          protocol: 'Across',
          description: `Swap ${intent.sender.token.symbol} to bridgeable token`,
        });
      }

      // Bridge step
      steps.push({
        type: 'bridge',
        chain: intent.sender.chain,
        protocol: 'Across',
        description: `Bridge from chain ${intent.sender.chain} to ${intent.recipient.chain}`,
        estimatedTime: quote.expectedFillTime,
      });

      // Check if destination swap is needed
      if (quote.steps.destinationSwap) {
        steps.push({
          type: 'swap',
          chain: intent.recipient.chain,
          protocol: quote.steps.destinationSwap.swapProvider.name,
          description: `Swap to ${intent.recipient.token.symbol}`,
        });
      }

      return {
        id: quote.id,
        provider: 'across',
        providerName: 'Across Protocol',
        fromChain: quote.inputToken.chainId,
        fromToken: quote.inputToken.address,
        fromAmount: quote.inputAmount,
        toChain: quote.outputToken.chainId,
        toToken: quote.outputToken.address,
        toAmount: quote.expectedOutputAmount,
        toAmountMin: quote.minOutputAmount,
        steps,
        totalGasUSD: parseFloat(quote.fees.originGas.amountUsd) + parseFloat(quote.fees.destinationGas.amountUsd),
        totalFeeUSD: parseFloat(quote.fees.relayerTotal.amountUsd) + parseFloat(quote.fees.lpFee.amountUsd),
        estimatedTime: quote.expectedFillTime,
        priceImpact: 0, // Not provided in Across quote
        transactions: quote.approvalTxns ? [
          ...quote.approvalTxns.map((tx: any) => ({
            chainId: tx.chainId,
            to: tx.to,
            data: tx.data,
            value: tx.value || '0',
            gasLimit: tx.gasLimit || '0',
          })),
          {
            chainId: quote.swapTx.chainId,
            to: quote.swapTx.to,
            data: quote.swapTx.data,
            value: quote.swapTx.value || '0',
            gasLimit: quote.swapTx.gas || '0',
            gasPrice: quote.swapTx.maxFeePerGas || '0',
            maxFeePerGas: quote.swapTx.maxFeePerGas || '0',
            maxPriorityFeePerGas: quote.swapTx.maxPriorityFeePerGas || '0',
          },
        ] : [
          {
            chainId: quote.swapTx.chainId,
            to: quote.swapTx.to,
            data: quote.swapTx.data,
            value: quote.swapTx.value || '0',
            gasLimit: quote.swapTx.gas || '0',
            gasPrice: quote.swapTx.maxFeePerGas || '0',
            maxFeePerGas: quote.swapTx.maxFeePerGas || '0',
            maxPriorityFeePerGas: quote.swapTx.maxPriorityFeePerGas || '0',
          },
        ],
        requiresApproval: quote.checks.allowance.actual !== quote.checks.allowance.expected,
        approvalData: quote.approvalTxns?.[0],
        rawData: quote,
      };
    } catch (error) {
      console.error('Across route error:', error);
      return null;
    }
  }

  private parse1inchSteps(intent: PaymentIntent, preset: any): RouteStep[] {
    const steps: RouteStep[] = [];

    if (intent.sender.token.address !== intent.recipient.token.address) {
      steps.push({
        type: 'swap',
        chain: intent.sender.chain,
        protocol: '1inch',
        description: `Swap to bridge token`,
      });
    }

    steps.push({
      type: 'bridge',
      chain: intent.sender.chain,
      protocol: '1inch Fusion+',
      description: `Bridge to ${intent.recipient.chain}`,
      estimatedTime: preset.auctionDuration,
    });

    return steps;
  }
}

export const routeAggregator = new RouteAggregator();

