import { Router, Request, Response } from 'express';
import { paystackService } from '../services/paystack.js';
import { transactionService } from '../services/database.js';
import { cdpService } from '../services/cdp.js';

const router = Router();

router.post('/initialize', async (req: Request, res: Response) => {
  try {
    const {
      email,
      phone,
      amount,
      currency,
      cryptoAsset,
      cryptoAmount,
      network,
      userWallet,
      paymentMethod
    } = req.body;

    if (!email || !phone || !amount || !currency || !cryptoAsset || !cryptoAmount || !network || !userWallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const callbackBase =
      process.env.PAYSTACK_CALLBACK_URL || process.env.NEXT_PUBLIC_URL || '';
    const callbackUrl = callbackBase
      ? callbackBase.includes('/payment/callback')
        ? callbackBase
        : `${callbackBase.replace(/\/$/, '')}/payment/callback`
      : undefined;

    const transactionType = cdpService.isSwapRequired(cryptoAsset) ? 'swap' : 'direct';

    const paymentChannels = paymentMethod === 'mobile_money' 
      ? ['mobile_money', 'ussd'] 
      : ['bank_transfer', 'ussd'];

    const paystackResult = await paystackService.initializePayment({
      email,
      amount: Math.round(amount * 100),
      phone,
      currency,
      channels: paymentChannels,
      callback_url: callbackUrl,
      metadata: {
        crypto_amount: cryptoAmount,
        crypto_asset: cryptoAsset,
        network,
        user_wallet: userWallet,
        transaction_type: transactionType
      }
    });

    if (!paystackResult.status) {
      return res.status(500).json({
        success: false,
        error: 'Payment initialization failed'
      });
    }

    const transaction = await transactionService.createTransaction({
      user_email: email,
      user_phone: phone,
      user_wallet_address: userWallet,
      paystack_reference: paystackResult.data.reference,
      paystack_access_code: paystackResult.data.access_code,
      fiat_amount: amount,
      fiat_currency: currency,
      payment_status: 'pending',
      payment_method: paymentMethod,
      crypto_asset: cryptoAsset,
      crypto_amount: cryptoAmount,
      network,
      transaction_type: transactionType,
      onramp_status: 'pending',
      transfer_status: 'pending',
      retry_count: 0
    });

    return res.json({
      success: true,
      data: {
        reference: paystackResult.data.reference,
        access_code: paystackResult.data.access_code,
        authorization_url: paystackResult.data.authorization_url,
        transaction_id: transaction.id,
        public_key: paystackService.getPublicKey()
      }
    });
  } catch (error) {
    console.error('Payment initialization error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

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

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({
        success: false,
        error: 'Payment reference is required'
      });
    }

    console.log('[Payment Verify] Verifying payment for reference:', reference);

    const verificationResult = await paystackService.verifyPayment(reference);

    if (!verificationResult.status) {
      console.error('[Payment Verify] Paystack verification failed:', verificationResult);
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed'
      });
    }

    console.log('[Payment Verify] Paystack verification result:', {
      status: verificationResult.data.status,
      amount: verificationResult.data.amount,
      currency: verificationResult.data.currency,
    });

    const transaction = await transactionService.getTransactionByReference(reference);

    if (!transaction) {
      console.error('[Payment Verify] Transaction not found in database for reference:', reference);
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    console.log('[Payment Verify] Found transaction:', {
      id: transaction.id,
      crypto_asset: transaction.crypto_asset,
      crypto_amount: transaction.crypto_amount,
      network: transaction.network,
      chain_id: transaction.chain_id,
      transaction_type: transaction.transaction_type,
    });

    const paymentStatus = verificationResult.data.status === 'success' ? 'success' : 'failed';
    
    await transactionService.updateTransaction(transaction.id!, {
      payment_status: paymentStatus,
      payment_method: verificationResult.data.channel,
    });

    if (paymentStatus === 'success' && transaction.transfer_status === 'pending') {
      console.log('[Payment Verify] Payment successful, initiating crypto disbursement...');
      
      try {
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
          const baseAsset = 'usdc';
          
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
        await transactionService.updateTransaction(transaction.id!, {
          transfer_status: 'failed',
          error_message: disbursementError instanceof Error ? disbursementError.message : 'Disbursement failed',
        });
      }
    }

    return res.json({
      success: true,
      data: {
        status: paymentStatus,
        amount: verificationResult.data.amount / 100,
        currency: verificationResult.data.currency,
        paid_at: verificationResult.data.paid_at,
        channel: verificationResult.data.channel,
        transfer_status: transaction.transfer_status,
        transaction_id: transaction.id,
      }
    });
  } catch (error) {
    console.error('[Payment Verify] Payment verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    });
  }
});

export default router;

