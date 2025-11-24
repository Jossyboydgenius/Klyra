import { Router, Request, Response } from 'express';
import { paystackService } from '../services/paystack.js';
import { transactionService } from '../services/database.js';
import { cdpService } from '../services/cdp.js';

const router = Router();

router.post('/initialize', async (req: Request, res: Response) => {
  try {
    if (!process.env.DEV_PAYSTACK_SECRET_KEY || !process.env.PAYSTACK_PUBLIC_KEY) {
      console.error('Missing Paystack environment variables');
      return res.status(500).json({
        success: false,
        error: 'Paystack configuration error. Please check server environment variables.',
        details: process.env.NODE_ENV === 'development' ? 'Missing PAYSTACK_SECRET_KEY or PAYSTACK_PUBLIC_KEY' : undefined
      });
    }

    const {
      country,
      crypto_asset,
      network,
      chain_id,
      token_address,
      crypto_amount,
      user_wallet_address,
      email,
      phone,
      fiat_amount,
      fiat_currency,
      provider,
      provider_channel
    } = req.body;

    console.log('Received payment request:', { email, fiat_amount, fiat_currency, crypto_asset, crypto_amount });

    if (!crypto_asset || !crypto_amount || !network || !user_wallet_address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required crypto fields'
      });
    }

    if (!email || !phone || !fiat_amount || !fiat_currency) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment fields. Please provide email, phone, fiat_amount, and fiat_currency.'
      });
    }

    const transactionType = cdpService.isSwapRequired(crypto_asset) ? 'swap' : 'direct';

    console.log('Initializing Paystack payment...');
    let paystackResult;
    try {
      paystackResult = await paystackService.initializePayment({
        email,
        amount: Math.round(fiat_amount * 100),
        phone,
        currency: fiat_currency,
        channels: ['mobile_money', 'bank_transfer', 'ussd'],
        metadata: {
          crypto_amount: crypto_amount,
          crypto_asset: crypto_asset,
          network: network,
          user_wallet: user_wallet_address,
          transaction_type: transactionType,
          chain_id: chain_id?.toString(),
          token_address: token_address,
          provider,
          provider_channel,
        }
      });
      console.log('Paystack initialization successful:', paystackResult.data.reference);
    } catch (paystackError: any) {
      console.error('Paystack API error:', paystackError);
      return res.status(500).json({
        success: false,
        error: paystackError?.message || 'Payment initialization failed',
        details: process.env.NODE_ENV === 'development' ? {
          paystackError: paystackError?.message,
          stack: paystackError?.stack
        } : undefined
      });
    }

    if (!paystackResult.status) {
      return res.status(500).json({
        success: false,
        error: paystackResult.message || 'Payment initialization failed',
        details: process.env.NODE_ENV === 'development' ? paystackResult : undefined
      });
    }

    console.log('[Paystack Initialize] Creating transaction record in database...');
    const coreTransactionData: any = {
      user_email: email,
      user_phone: phone,
      user_wallet_address: user_wallet_address,
      paystack_reference: paystackResult.data.reference,
      paystack_access_code: paystackResult.data.access_code,
      fiat_amount: fiat_amount,
      fiat_currency: fiat_currency,
      payment_status: 'pending',
      payment_method: 'mobile_money',
      crypto_asset: crypto_asset,
      crypto_amount: crypto_amount,
      network: network,
      transaction_type: transactionType,
      onramp_status: 'pending',
      transfer_status: 'pending',
      retry_count: 0,
    };

    const transactionWithOptionalFields: any = {
      ...coreTransactionData,
      ...(chain_id != null && chain_id !== '' && { chain_id: chain_id.toString() }),
      ...(token_address != null && token_address !== '' && { token_address }),
      ...(provider != null && provider !== '' && { provider }),
      ...(provider_channel != null && provider_channel !== '' && { provider_channel: provider_channel.toString() }),
    };

    let transaction;
    let transactionCreated = false;
    
    try {
      transaction = await transactionService.createTransaction(transactionWithOptionalFields);
      console.log('[Paystack Initialize] Transaction record created successfully:', transaction.id);
      transactionCreated = true;
    } catch (dbError: any) {
      console.error('[Paystack Initialize] Database error creating transaction:', dbError);
      console.error('[Paystack Initialize] Error code:', dbError?.code);
      console.error('[Paystack Initialize] Error message:', dbError?.message);
      
      if (dbError?.code === 'PGRST204') {
        console.log('[Paystack Initialize] Missing column detected (PGRST204), retrying with core fields only...');
        try {
          transaction = await transactionService.createTransaction(coreTransactionData);
          console.log('[Paystack Initialize] Transaction created with core fields only:', transaction.id);
          transactionCreated = true;
        } catch (retryError: any) {
          console.error('[Paystack Initialize] Failed to create transaction even with core fields:', retryError);
        }
      }
      
      if (!transactionCreated) {
        console.error('[Paystack Initialize] Full error details (server-side only):', {
          code: dbError?.code,
          message: dbError?.message,
          details: dbError?.details,
          hint: dbError?.hint,
        });
        
        return res.status(500).json({
          success: false,
          error: 'Unable to process your request at this time. Please try again later or contact support.',
        });
      }
    }

    return res.json({
      success: true,
      authorization_url: paystackResult.data.authorization_url,
      reference: paystackResult.data.reference,
      access_code: paystackResult.data.access_code,
      ...(transaction?.id && { transaction_id: transaction.id })
    });
  } catch (error: any) {
    console.error('Paystack initialization error:', error);
    console.error('Error stack:', error?.stack);
    const errorMessage = error?.message || error?.error?.message || 'Internal server error';
    const errorDetails = error?.error || error;
    console.error('Error details:', JSON.stringify(errorDetails, null, 2));
    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        message: error?.message,
        code: error?.code,
        details: errorDetails
      } : undefined
    });
  }
});

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({
        success: false,
        error: 'Reference is required'
      });
    }

    const paystackResult = await paystackService.verifyPayment(reference);

    const transaction = await transactionService.getTransactionByReference(reference);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found in database'
      });
    }

    const paymentStatus = paystackResult.data.status === 'success' ? 'success' : 
                         paystackResult.data.status === 'failed' ? 'failed' : 'pending';

    const updatedTransaction = await transactionService.updateTransaction(transaction.id!, {
      payment_status: paymentStatus,
      payment_method: paystackResult.data.channel || transaction.payment_method
    });

    return res.json({
      success: true,
      transaction: updatedTransaction,
      paystackData: paystackResult.data
    });
  } catch (error: any) {
    console.error('Paystack verify error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to verify payment',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

router.post('/sell', async (req: Request, res: Response) => {
  try {
    const {
      crypto_amount,
      crypto_symbol,
      token_address,
      chain_id,
      network,
      fiat_currency,
      fiat_amount,
      payment_method_id,
      payment_method_type,
      payment_method_details,
      user_wallet_address
    } = req.body;

    if (!crypto_amount || !crypto_symbol || !chain_id || !user_wallet_address || !payment_method_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    return res.status(501).json({
      success: false,
      error: 'Sell functionality coming soon. This feature requires:',
      details: {
        steps: [
          '1. User sends crypto to pool wallet',
          '2. System monitors incoming transaction',
          '3. After confirmation, Paystack transfer is initiated to user account',
          '4. User receives fiat in their mobile money/bank account'
        ]
      }
    });

  } catch (error: any) {
    console.error('Sell initialization error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process sell request. Please try again later.',
    });
  }
});

export default router;

