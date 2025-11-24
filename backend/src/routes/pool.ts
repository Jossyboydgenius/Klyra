import { Router, Request, Response } from 'express';
import { orderQueue } from '../services/pool/order-queue.js';
import { poolBalanceTracker } from '../services/pool/pool-balance-tracker.js';
import { requireAdminAuth } from '../middleware/auth.js';

const router = Router();

router.get('/balances', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const balances = await poolBalanceTracker.getAllBalances();

    return res.json({ balances });
  } catch (error: any) {
    console.error('Get balances error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to get balances'
    });
  }
});

router.post('/balances', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await poolBalanceTracker.syncAllBalances();

    return res.json({ message: 'Balances synced successfully' });
  } catch (error: any) {
    console.error('Sync balances error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to sync balances'
    });
  }
});

router.post('/execute', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const { orderId } = body;

    if (!orderId) {
      return res.status(400).json({
        error: 'Order ID is required'
      });
    }

    orderQueue.processOrder(orderId).catch((error) => {
      console.error(`Failed to process order ${orderId}:`, error);
    });

    return res.json({
      success: true,
      message: 'Order processing started',
    });
  } catch (error: any) {
    console.error('Execute order error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to execute order'
    });
  }
});

router.get('/orders', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const status = (req.query.status as string) || 'pending';
    const limit = parseInt((req.query.limit as string) || '50');

    const orders = await orderQueue.getOrdersByStatus(status, limit);

    return res.json({ orders });
  } catch (error: any) {
    console.error('Get orders error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to get orders'
    });
  }
});

router.post('/orders', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    
    const order = await orderQueue.createOrder({
      orderType: body.orderType,
      userWalletAddress: body.userWalletAddress,
      requestedToken: body.requestedToken,
      requestedAmount: body.requestedAmount,
      fiatAmount: body.fiatAmount,
      fiatCurrency: body.fiatCurrency,
      userEmail: body.userEmail,
      paystackReference: body.paystackReference,
    });

    return res.json({ order });
  } catch (error: any) {
    console.error('Create order error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create order'
    });
  }
});

router.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const order = await orderQueue.getOrder(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    return res.json({ order });
  } catch (error: any) {
    console.error('Get order error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to get order'
    });
  }
});

router.post('/orders/:id/process', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await orderQueue.processOrder(req.params.id);

    return res.json({ message: 'Order processed successfully' });
  } catch (error: any) {
    console.error('Process order error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process order'
    });
  }
});

export default router;

