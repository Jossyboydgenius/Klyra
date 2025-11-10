import { NextRequest, NextResponse } from 'next/server';
import { paystackService } from '@/lib/paystack/paystack-client';
import { transactionService } from '@/lib/database/supabase-client';
import { CDPService } from '@/lib/cdp/cdp-client';

function mapChainIdToNetwork(chainId?: string, network?: string): string {
  if (!chainId && !network) {
    return 'base';
  }

  if (network) {
    return network.toLowerCase();
  }

  const chainIdNum = parseInt(chainId || '0', 10);
  const chainIdMap: Record<number, string> = {
    1: 'ethereum',
    5: 'goerli',
    11155111: 'sepolia',
    8453: 'base',
    84532: 'base-sepolia',
    137: 'polygon',
    80001: 'polygon-mumbai',
    42161: 'arbitrum',
    421614: 'arbitrum-sepolia',
    10: 'optimism',
    11155420: 'optimism-sepolia',
  };

  return chainIdMap[chainIdNum] || network?.toLowerCase() || 'base';
}

function mapCryptoAssetToToken(cryptoAsset: string): string {
  return cryptoAsset.toLowerCase().trim();
}

export async function POST(request: NextRequest) {
  try {
    const { reference } = await request.json();

    if (!reference) {
      return NextResponse.json(
        { success: false, error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    console.log('[Payment Verify] Verifying payment for reference:', reference);

    const verificationResult = await paystackService.verifyPayment(reference);

    if (!verificationResult.status) {
      console.error('[Payment Verify] Paystack verification failed:', verificationResult);
      return NextResponse.json(
        { success: false, error: 'Payment verification failed' },
        { status: 400 }
      );
    }

    console.log('[Payment Verify] Paystack verification result:', {
      status: verificationResult.data.status,
      amount: verificationResult.data.amount,
      currency: verificationResult.data.currency,
    });

    // Get transaction from database
    const transaction = await transactionService.getTransactionByReference(reference);

    if (!transaction) {
      console.error('[Payment Verify] Transaction not found in database for reference:', reference);
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    console.log('[Payment Verify] Found transaction:', {
      id: transaction.id,
      crypto_asset: transaction.crypto_asset,
      crypto_amount: transaction.crypto_amount,
      network: transaction.network,
      chain_id: transaction.chain_id,
      transaction_type: transaction.transaction_type,
    });

    // Update transaction status based on Paystack response
    const paymentStatus = verificationResult.data.status === 'success' ? 'success' : 'failed';
    
    await transactionService.updateTransaction(transaction.id!, {
      payment_status: paymentStatus,
      payment_method: verificationResult.data.channel,
    });

    // If payment is successful, automatically disburse crypto from liquidity pool
    if (paymentStatus === 'success' && transaction.transfer_status === 'pending') {
      console.log('[Payment Verify] Payment successful, initiating crypto disbursement...');
      
      try {
        const cdpService = new CDPService();
        const network = mapChainIdToNetwork(transaction.chain_id, transaction.network);
        const token = mapCryptoAssetToToken(transaction.crypto_asset);

        console.log('[Payment Verify] Disbursing crypto:', {
          to: transaction.user_wallet_address,
          amount: transaction.crypto_amount,
          token,
          network,
          transaction_type: transaction.transaction_type,
        });

        if (transaction.transaction_type === 'direct') {
          // Direct transfer for supported tokens (USDC, USDT, ETH, etc.)
          const transferResult = await cdpService.transferToUser({
            to: transaction.user_wallet_address,
            amount: transaction.crypto_amount,
            token,
            network,
          });

          if (transferResult.success && transferResult.transactionHash) {
            console.log('[Payment Verify] Transfer successful:', transferResult.transactionHash);
            await transactionService.updateTransferStatus(
              transaction.id!,
              'success',
              transferResult.transactionHash
            );
          } else {
            console.error('[Payment Verify] Transfer failed:', transferResult.error);
            await transactionService.updateTransferStatus(
              transaction.id!,
              'failed',
              undefined,
              transferResult.error || 'Transfer failed'
            );
          }
        } else if (transaction.transaction_type === 'swap') {
          // Swap required for tokens not directly available
          // Get the base asset (usually USDC) to swap from
          const baseAsset = 'usdc'; // Default base asset for swaps
          
          console.log('[Payment Verify] Executing swap:', {
            fromAsset: baseAsset,
            toAsset: token,
            amount: transaction.crypto_amount,
            network,
          });

          const swapResult = await cdpService.executeSwap(
            baseAsset,
            token,
            transaction.crypto_amount,
            network
          );

          if (swapResult.success && swapResult.txHash) {
            console.log('[Payment Verify] Swap successful:', swapResult.txHash);
            await transactionService.updateTransaction(transaction.id!, {
              swap_status: 'success',
              swap_tx_hash: swapResult.txHash,
              swap_completed_at: new Date().toISOString(),
              transfer_status: 'success',
              transfer_completed_at: new Date().toISOString(),
            });
          } else {
            console.error('[Payment Verify] Swap failed:', swapResult.error);
            await transactionService.updateTransaction(transaction.id!, {
              swap_status: 'failed',
              transfer_status: 'failed',
              error_message: swapResult.error || 'Swap failed',
            });
          }
        }
      } catch (disbursementError) {
        console.error('[Payment Verify] Error during crypto disbursement:', disbursementError);
        // Update transaction with error but don't fail the verification
        await transactionService.updateTransaction(transaction.id!, {
          transfer_status: 'failed',
          error_message: disbursementError instanceof Error ? disbursementError.message : 'Disbursement failed',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        status: paymentStatus,
        amount: verificationResult.data.amount / 100, // Convert from kobo/cents
        currency: verificationResult.data.currency,
        paid_at: verificationResult.data.paid_at,
        channel: verificationResult.data.channel,
        transfer_status: transaction.transfer_status,
        transaction_id: transaction.id,
      }
    });
  } catch (error) {
    console.error('[Payment Verify] Payment verification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
  }
}
