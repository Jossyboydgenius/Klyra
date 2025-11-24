import { Router, Request, Response } from 'express';
import { transactionService } from '../services/database.js';

const router = Router();

router.get('/status', async (req: Request, res: Response) => {
  try {
    const reference = req.query.reference as string;

    if (!reference) {
      return res.status(400).json({
        success: false,
        error: 'Reference is required'
      });
    }

    const transaction = await transactionService.getTransactionByReference(reference);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    return res.json({
      success: true,
      transaction
    });
  } catch (error) {
    console.error('Get transaction status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.query.wallet as string;
    const email = req.query.email as string;
    const limit = req.query.limit as string;

    if (!walletAddress && !email) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address or email is required'
      });
    }

    let transactions;
    if (walletAddress) {
      transactions = await transactionService.getTransactionsByWallet(
        walletAddress,
        limit ? parseInt(limit) : undefined
      );
    } else if (email) {
      transactions = await transactionService.getTransactionsByEmail(
        email,
        limit ? parseInt(limit) : undefined
      );
    }

    return res.json({
      success: true,
      transactions: transactions || []
    });
  } catch (error: any) {
    console.error('Get transactions error:', error);
    
    const isDatabaseError = error?.code === '42P01' || error?.message?.includes('relation') || error?.message?.includes('does not exist');
    
    return res.status(500).json({
      success: false,
      error: isDatabaseError 
        ? 'Transactions service is temporarily unavailable. Please try again later.'
        : 'Unable to retrieve transactions at this time. Please try again later.',
    });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const transaction = await transactionService.getTransaction(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    return res.json({
      success: true,
      transaction
    });
  } catch (error: any) {
    console.error('Get transaction error:', error);
    
    const isDatabaseError = error?.code === '42P01' || error?.message?.includes('relation') || error?.message?.includes('does not exist');
    
    return res.status(500).json({
      success: false,
      error: isDatabaseError 
        ? 'Transaction service is temporarily unavailable. Please try again later.'
        : 'Unable to retrieve transaction details at this time. Please try again later.',
    });
  }
});

export default router;

