import { NextRequest, NextResponse } from 'next/server';
import { transactionService } from '@/lib/database/supabase-client';
import { paystackService } from '@/lib/paystack/paystack-client';
import { cdpService } from '@/lib/cdp/cdp-client';
import { poolExecutor } from '@/lib/pool/pool-executor';
import { poolWalletManager } from '@/lib/pool/pool-wallet-manager';
import { getChainById } from '@/lib/chain-data';

/**
 * API endpoint to initiate crypto send to another user
 * This is for sending crypto between Klyra users
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    // Validate required fields - address is now required
    if (!recipient_address || !crypto_symbol || !amount || !chain_id || !from_address) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields. Recipient address is required.' },
        { status: 400 }
      );
    }

    // Validate address format
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(recipient_address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid recipient address format' },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      );
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

    // For direct sends that are already confirmed client-side, just record in database
    if (sendType === 'direct' && transactionHash && transactionStatus === 'confirmed') {
      try {
        // Create transaction record in database
        // Note: For send transactions, we use minimal required fields
        const transaction = await transactionService.createTransaction({
          user_email: recipient_email || from_address, // Use recipient email or fallback to address
          user_phone: '', // Not available for sends
          user_wallet_address: from_address,
          recipient_wallet_address: recipient_address,
          paystack_reference: `send_${transactionHash.slice(0, 16)}`, // Generate a reference
          fiat_amount: 0, // No fiat involved in direct sends
          fiat_currency: 'NGN', // Default
          payment_status: 'success', // Direct sends don't use Paystack
          crypto_asset: crypto_symbol,
          crypto_amount: amountNum.toString(),
          token_address: token_address || null,
          chain_id: chain_id || null,
          network: network,
          transaction_type: 'direct', // Use 'direct' for send transactions
          onramp_status: 'completed', // Not applicable but required
          transfer_status: 'success', // Transfer completed
          transfer_tx_hash: transactionHash,
          transfer_completed_at: new Date().toISOString(),
          retry_count: 0,
        });

        return NextResponse.json({
          success: true,
          transaction_id: transaction.id,
          txHash: transactionHash,
          message: 'Transaction recorded successfully'
        });
      } catch (error: any) {
        console.error('Error recording transaction:', error);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to record transaction',
            details: error.message
          },
          { status: 500 }
        );
      }
    }

    // Handle cross-chain send
    if (sendType === 'cross-chain') {
      try {
        const destinationChainId = body.destination_chain_id;
        const destinationTokenAddress = body.destination_token_address;
        
        if (!destinationChainId || !destinationTokenAddress) {
          return NextResponse.json(
            { success: false, error: 'Destination chain and token are required for cross-chain send' },
            { status: 400 }
          );
        }

        const fromChain = getChainById(parseInt(chain_id));
        const toChain = getChainById(parseInt(destinationChainId));
        
        if (!fromChain || !toChain) {
          return NextResponse.json(
            { success: false, error: 'Invalid chain ID' },
            { status: 400 }
          );
        }

        // Create transaction record
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

        // TODO: Execute cross-chain swap using Squid or CDP
        // For now, return transaction ID for tracking
        return NextResponse.json({
          success: true,
          transaction_id: transaction.id,
          message: 'Cross-chain send initiated. Transaction will be processed shortly.',
          status: 'pending'
        });
      } catch (error: any) {
        console.error('Cross-chain send error:', error);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to initiate cross-chain send',
            details: error.message
          },
          { status: 500 }
        );
      }
    }

    // Handle fiat-to-crypto send (user pays fiat, recipient gets crypto)
    if (sendType === 'fiat-to-crypto') {
      try {
        const fiatAmount = body.fiat_amount;
        const currency = body.currency || 'GHS';
        let isDirectSend = body.is_direct_send || false;
        let poolWalletAddress: string | null = null;
        const quote = body.quote || null;
        const recipientEmail = recipient_email || body.recipient_email;
        
        if (!fiatAmount || !recipient_address || !crypto_symbol || !amountNum || !chain_id) {
          return NextResponse.json(
            { success: false, error: 'Missing required fields for fiat-to-crypto send' },
            { status: 400 }
          );
        }

        // Get chain and token info
        const chainIdNum = parseInt(chain_id);
        const chain = getChainById(chainIdNum);
        if (!chain) {
          return NextResponse.json(
            { success: false, error: 'Invalid chain ID' },
            { status: 400 }
          );
        }

        // If we plan a direct send, make sure pool wallet exists for this chain
        if (isDirectSend) {
          try {
            poolWalletAddress = await poolWalletManager.getWalletAddress(chainIdNum);
          } catch (walletError) {
            console.warn('Pool wallet unavailable for direct send, falling back to swap:', walletError);
            isDirectSend = false;
          }
        }

        // Initialize Paystack payment (user pays)
        const paystackResult = await paystackService.initializePayment({
          email: from_address, // Sender's email (we'll need to get this from user profile)
          amount: Math.round(parseFloat(fiatAmount) * 100), // Convert to kobo/cents
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
          return NextResponse.json(
            { success: false, error: 'Payment initialization failed' },
            { status: 500 }
          );
        }

        // Determine transaction type based on direct send or swap needed
        const transactionType = isDirectSend ? 'direct' : 'swap';

        // Create transaction record
        const transaction = await transactionService.createTransaction({
          user_email: recipientEmail || recipient_address,
          user_phone: '',
          user_wallet_address: recipient_address, // Recipient's wallet
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

        // Store quote and pool execution info in transaction metadata
        // This will be used by the Paystack webhook handler to execute the crypto send
        if (quote) {
          // TODO: Store quote in transaction metadata or separate table
          console.log('Quote stored for transaction:', transaction.id, quote);
        }

        return NextResponse.json({
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
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to initiate fiat-to-crypto send',
            details: error.message
          },
          { status: 500 }
        );
      }
    }

    // Handle crypto-to-fiat send (user sends crypto, recipient gets fiat)
    if (sendType === 'crypto-to-fiat') {
      try {
        const recipientPaymentMethodId = body.recipient_payment_method_id;
        const recipientPaymentMethodType = body.recipient_payment_method_type;
        const recipientPaymentMethodDetails = body.recipient_payment_method_details;
        const fiatCurrency = body.fiat_currency || 'NGN';
        const fiatAmount = body.fiat_amount; // Calculated from crypto amount
        
        if (!recipientPaymentMethodId || !fiatAmount) {
          return NextResponse.json(
            { success: false, error: 'Recipient payment method and fiat amount are required for crypto-to-fiat send' },
            { status: 400 }
          );
        }

        // Create transaction record (pending - waiting for crypto transfer)
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

        // TODO: Wait for user to send crypto to pool, then initiate Paystack transfer
        // For now, return transaction ID
        return NextResponse.json({
          success: true,
          transaction_id: transaction.id,
          message: 'Crypto-to-fiat send initiated. Send crypto to complete the transaction.',
          status: 'pending'
        });
      } catch (error: any) {
        console.error('Crypto-to-fiat send error:', error);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to initiate crypto-to-fiat send',
            details: error.message
          },
          { status: 500 }
        );
      }
    }

    // Default response for unhandled cases
    return NextResponse.json(
      { 
        success: false, 
        error: 'Send functionality not implemented for this type',
      },
      { status: 501 }
    );

  } catch (error: any) {
    console.error('Send initiation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process send request. Please try again later.',
      },
      { status: 500 }
    );
  }
}

