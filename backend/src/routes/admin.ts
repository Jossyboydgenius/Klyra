import { Router, Request, Response } from 'express';
import { adminAuthService } from '../services/auth.js';
import { transactionService } from '../services/database.js';
import { cdpService } from '../services/cdp.js';
import { requireAdminAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const result = await adminAuthService.authenticate(email, password);

    if (result.success) {
      return res.json({
        success: true,
        token: result.token
      });
    } else {
      return res.status(401).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Login API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        valid: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const result = await adminAuthService.verifyToken(token);

    if (result.valid) {
      return res.json({
        valid: true,
        email: result.email
      });
    } else {
      return res.status(401).json({
        valid: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Token verification API error:', error);
    return res.status(500).json({
      valid: false,
      error: 'Internal server error'
    });
  }
});

router.get('/transactions', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const transactions = await transactionService.getTransactions({
      limit: 40
    });

    return res.json({
      success: true,
      transactions
    });
  } catch (error) {
    console.error('Get transactions API error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

router.post('/generate-onramp', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        error: 'Transaction ID is required'
      });
    }

    const transaction = await transactionService.getTransactionByReference(transactionId);
    
    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found'
      });
    }

    if (transaction.payment_status !== 'success') {
      return res.status(400).json({
        error: 'Payment not confirmed yet'
      });
    }

    const onrampResult = await cdpService.generateOnrampURL({
      amount: transaction.fiat_amount.toString(),
      asset: transaction.crypto_asset,
      network: transaction.network,
      destinationWallet: transaction.user_wallet_address
    });

    if (!onrampResult.success) {
      return res.status(500).json({
        error: onrampResult.error
      });
    }

    await transactionService.updateTransaction(transaction.id!, {
      coinbase_onramp_url: onrampResult.url,
      coinbase_session_token: onrampResult.sessionToken,
      onramp_status: 'generated'
    });

    return res.json({
      success: true,
      onrampUrl: onrampResult.url
    });
  } catch (error) {
    console.error('Generate onramp API error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

router.post('/mark-processed', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.body;
    const adminEmail = (req as any).adminEmail;

    if (!transactionId) {
      return res.status(400).json({
        error: 'Transaction ID is required'
      });
    }

    const transaction = await transactionService.getTransactionByReference(transactionId);
    
    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found'
      });
    }

    await transactionService.markAsProcessed(transaction.id!, adminEmail);

    if (transaction.transaction_type === 'direct') {
      const transferResult = await cdpService.transferToUser({
        to: transaction.user_wallet_address,
        amount: transaction.crypto_amount,
        token: transaction.crypto_asset.toLowerCase(),
        network: transaction.network.toLowerCase()
      });

      if (transferResult.success) {
        await transactionService.updateTransferStatus(
          transaction.id!,
          'success',
          transferResult.transactionHash
        );
      } else {
        await transactionService.updateTransferStatus(
          transaction.id!,
          'failed',
          undefined,
          transferResult.error
        );
      }
    } else {
      await transactionService.updateTransaction(transaction.id!, {
        error_message: 'Swap functionality not yet implemented'
      });
    }

    return res.json({
      success: true,
      message: 'Transaction marked as processed and transfer initiated'
    });
  } catch (error) {
    console.error('Mark processed API error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;

