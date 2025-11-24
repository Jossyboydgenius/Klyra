import { Router, Request, Response } from 'express';
import { transactionService } from '../services/database.js';
import { paystackService } from '../services/paystack.js';
import { cdpService } from '../services/cdp.js';

const router = Router();

router.post('/initiate', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const {
      recipient_address,
      recipient_id,
      recipient_email,
      recipient_ens,
      crypto_symbol,
      token_address,
      amount,
      chain_id,
      network,
      message,
      from_address,
      send_type,
      txHash,
      status: txStatus
    } = body;

    if (!recipient_address || !crypto_symbol || !amount || !chain_id || !from_address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields. Recipient address is required.'
      });
    }

    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(recipient_address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipient address format'
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    const callbackBase =
      process.env.PAYSTACK_CALLBACK_URL || process.env.NEXT_PUBLIC_URL || '';
    const callbackUrl = callbackBase
      ? callbackBase.includes('/payment/callback')
        ? callbackBase
        : `${callbackBase.replace(/\/$/, '')}/payment/callback`
      : undefined;

    const sendType = send_type || 'direct';
    const transactionHash = txHash;
    const transactionStatus = txStatus || 'pending';

    if (sendType === 'direct' && transactionHash && transactionStatus === 'confirmed') {
      try {
        const transaction = await transactionService.createTransaction({
          user_email: recipient_email || from_address,
          user_phone: '',
          user_wallet_address: from_address,
          recipient_wallet_address: recipient_address,
          paystack_reference: `send_${transactionHash.slice(0, 16)}`,
          fiat_amount: 0,
          fiat_currency: 'NGN',
          payment_status: 'success',
          crypto_asset: crypto_symbol,
          crypto_amount: amountNum.toString(),
          token_address: token_address || null,
          chain_id: chain_id || null,
          network: network,
          transaction_type: 'direct',
          onramp_status: 'completed',
          transfer_status: 'success',
          transfer_tx_hash: transactionHash,
          transfer_completed_at: new Date().toISOString(),
          retry_count: 0,
        });

        return res.json({
          success: true,
          transaction_id: transaction.id,
          txHash: transactionHash,
          message: 'Transaction recorded successfully'
        });
      } catch (error: any) {
        console.error('Error recording transaction:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to record transaction',
          details: error.message
        });
      }
    }

    if (sendType === 'cross-chain') {
      try {
        const destinationChainId = body.destination_chain_id;
        const destinationTokenAddress = body.destination_token_address;
        
        if (!destinationChainId || !destinationTokenAddress) {
          return res.status(400).json({
            success: false,
            error: 'Destination chain and token are required for cross-chain send'
          });
        }

        const transaction = await transactionService.createTransaction({
          user_email: recipient_email || from_address,
          user_phone: '',
          user_wallet_address: from_address,
          recipient_wallet_address: recipient_address,
          paystack_reference: `cross_chain_${Date.now()}`,
          fiat_amount: 0,
          fiat_currency: 'NGN',
          payment_status: 'success',
          crypto_asset: crypto_symbol,
          crypto_amount: amountNum.toString(),
          token_address: token_address || null,
          chain_id: chain_id || null,
          network: network,
          transaction_type: 'swap',
          onramp_status: 'pending',
          transfer_status: 'pending',
          retry_count: 0,
        });

        return res.json({
          success: true,
          transaction_id: transaction.id,
          message: 'Cross-chain send initiated. Transaction will be processed shortly.',
          status: 'pending'
        });
      } catch (error: any) {
        console.error('Cross-chain send error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to initiate cross-chain send',
          details: error.message
        });
      }
    }

    if (sendType === 'fiat-to-crypto') {
      try {
        const fiatAmount = body.fiat_amount;
        const currency = body.currency || 'GHS';
        let isDirectSend = body.is_direct_send || false;
        let poolWalletAddress: string | null = null;
        const quote = body.quote || null;
        const recipientEmail = recipient_email || body.recipient_email;
        
        if (!fiatAmount || !recipient_address || !crypto_symbol || !amountNum || !chain_id) {
          return res.status(400).json({
            success: false,
            error: 'Missing required fields for fiat-to-crypto send'
          });
        }

        const paystackResult = await paystackService.initializePayment({
          email: from_address,
          amount: Math.round(parseFloat(fiatAmount) * 100),
          phone: '',
          currency: currency,
          channels: ['bank_transfer', 'ussd', 'mobile_money'],
          callback_url: callbackUrl,
          metadata: {
            send_type: 'fiat-to-crypto',
            recipient_address: recipient_address,
            recipient_email: recipientEmail || recipient_address,
            recipient_ens: recipient_ens,
            crypto_symbol: crypto_symbol,
            crypto_amount: amountNum.toString(),
            token_address: token_address,
            chain_id: chain_id,
            network: network,
            fiat_amount: fiatAmount,
            currency: currency,
            is_direct_send: isDirectSend,
            pool_wallet_address: poolWalletAddress,
            user_wallet: recipient_address,
            crypto_asset: crypto_symbol,
            transaction_type: isDirectSend ? 'direct' : 'swap',
          }
        });

        if (!paystackResult.status) {
          return res.status(500).json({
            success: false,
            error: 'Payment initialization failed'
          });
        }

        const transactionType = isDirectSend ? 'direct' : 'swap';

        const transaction = await transactionService.createTransaction({
          user_email: recipientEmail || recipient_address,
          user_phone: '',
          user_wallet_address: recipient_address,
          recipient_wallet_address: recipient_address,
          paystack_reference: paystackResult.data.reference,
          paystack_access_code: paystackResult.data.access_code,
          fiat_amount: parseFloat(fiatAmount),
          fiat_currency: currency,
          payment_status: 'pending',
          crypto_asset: crypto_symbol,
          crypto_amount: amountNum.toString(),
          token_address: token_address || null,
          chain_id: chain_id || null,
          network: network,
          transaction_type: transactionType,
          onramp_status: 'pending',
          transfer_status: 'pending',
          retry_count: 0,
        });

        if (quote) {
          console.log('Quote stored for transaction:', transaction.id, quote);
        }

        return res.json({
          success: true,
          transaction_id: transaction.id,
          paystack_reference: paystackResult.data.reference,
          authorization_url: paystackResult.data.authorization_url,
          access_code: paystackResult.data.access_code,
          message: 'Fiat payment initialized. Complete payment to send crypto to recipient.',
          status: 'pending',
          is_direct_send: isDirectSend,
          pool_wallet_address: poolWalletAddress,
        });
      } catch (error: any) {
        console.error('Fiat-to-crypto send error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to initiate fiat-to-crypto send',
          details: error.message
        });
      }
    }

    if (sendType === 'crypto-to-fiat') {
      try {
        const recipientPaymentMethodId = body.recipient_payment_method_id;
        const recipientPaymentMethodType = body.recipient_payment_method_type;
        const recipientPaymentMethodDetails = body.recipient_payment_method_details;
        const fiatCurrency = body.fiat_currency || 'NGN';
        const fiatAmount = body.fiat_amount;
        
        if (!recipientPaymentMethodId || !fiatAmount) {
          return res.status(400).json({
            success: false,
            error: 'Recipient payment method and fiat amount are required for crypto-to-fiat send'
          });
        }

        const transaction = await transactionService.createTransaction({
          user_email: recipient_email || from_address,
          user_phone: '',
          user_wallet_address: from_address,
          recipient_wallet_address: recipient_address,
          paystack_reference: `crypto_to_fiat_${Date.now()}`,
          fiat_amount: parseFloat(fiatAmount),
          fiat_currency: fiatCurrency,
          payment_status: 'pending',
          payment_method: recipientPaymentMethodType,
          crypto_asset: crypto_symbol,
          crypto_amount: amountNum.toString(),
          token_address: token_address || null,
          chain_id: chain_id || null,
          network: network,
          transaction_type: 'direct',
          onramp_status: 'pending',
          transfer_status: 'pending',
          retry_count: 0,
        });

        return res.json({
          success: true,
          transaction_id: transaction.id,
          message: 'Crypto-to-fiat send initiated. Send crypto to complete the transaction.',
          status: 'pending'
        });
      } catch (error: any) {
        console.error('Crypto-to-fiat send error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to initiate crypto-to-fiat send',
          details: error.message
        });
      }
    }

    return res.status(501).json({
      success: false,
      error: 'Send functionality not implemented for this type',
    });

  } catch (error: any) {
    console.error('Send initiation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process send request. Please try again later.',
    });
  }
});

export default router;

