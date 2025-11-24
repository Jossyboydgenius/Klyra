import { Router, Request, Response } from 'express';

const router = Router();

const ONEINCH_API_KEY = process.env.NEXT_PUBLIC_ONEINCH_API_KEY || '';
const ONEINCH_BASE_URL = 'https://api.1inch.com';

router.get('/swap/quote', async (req: Request, res: Response) => {
  try {
    const chainId = req.query.chainId as string;
    
    if (!chainId) {
      return res.status(400).json({
        error: 'chainId is required'
      });
    }

    const params = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'chainId' && value) {
        params.append(key, value as string);
      }
    });

    const url = `${ONEINCH_BASE_URL}/swap/v6.1/${chainId}/quote?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ONEINCH_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return res.status(response.status).json({
        error: error.description || error.error || `API Error: ${response.status}`
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Swap quote proxy error:', error);
    return res.status(500).json({
      error: 'Failed to fetch swap quote'
    });
  }
});

router.get('/swap/transaction', async (req: Request, res: Response) => {
  try {
    const chainId = req.query.chainId as string;
    
    if (!chainId) {
      return res.status(400).json({
        error: 'chainId is required'
      });
    }

    const params = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'chainId' && value) {
        params.append(key, value as string);
      }
    });

    const url = `${ONEINCH_BASE_URL}/swap/v6.1/${chainId}/swap?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ONEINCH_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return res.status(response.status).json({
        error: error.description || error.error || `API Error: ${response.status}`
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Swap transaction proxy error:', error);
    return res.status(500).json({
      error: 'Failed to fetch swap transaction'
    });
  }
});

router.get('/fusion-quote', async (req: Request, res: Response) => {
  try {
    const params = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
      if (value) {
        params.append(key, value as string);
      }
    });

    const url = `${ONEINCH_BASE_URL}/fusion-plus/quoter/v1.1/quote/receive?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ONEINCH_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return res.status(response.status).json({
        error: error.description || error.error || `API Error: ${response.status}`
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Fusion quote proxy error:', error);
    return res.status(500).json({
      error: 'Failed to fetch fusion quote'
    });
  }
});

router.get('/tokens', async (req: Request, res: Response) => {
  try {
    const chainId = req.query.chainId as string;
    
    if (!chainId) {
      return res.status(400).json({
        error: 'chainId is required'
      });
    }

    const url = `${ONEINCH_BASE_URL}/swap/v6.1/${chainId}/tokens`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ONEINCH_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return res.status(response.status).json({
        error: error.description || error.error || `API Error: ${response.status}`
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Tokens proxy error:', error);
    return res.status(500).json({
      error: 'Failed to fetch tokens'
    });
  }
});

router.get('/approve', async (req: Request, res: Response) => {
  try {
    const chainId = req.query.chainId as string;
    
    if (!chainId) {
      return res.status(400).json({
        error: 'chainId is required'
      });
    }

    const params = new URLSearchParams();
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'chainId' && value) {
        params.append(key, value as string);
      }
    });

    const url = `${ONEINCH_BASE_URL}/swap/v6.1/${chainId}/approve/transaction?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ONEINCH_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return res.status(response.status).json({
        error: error.description || error.error || `API Error: ${response.status}`
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Approve transaction proxy error:', error);
    return res.status(500).json({
      error: 'Failed to fetch approve transaction'
    });
  }
});

router.get('/liquidity-sources', async (req: Request, res: Response) => {
  try {
    const chainId = req.query.chainId as string;
    
    if (!chainId) {
      return res.status(400).json({
        error: 'chainId is required'
      });
    }

    const url = `${ONEINCH_BASE_URL}/swap/v6.1/${chainId}/liquidity-sources`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ONEINCH_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return res.status(response.status).json({
        error: error.description || error.error || `API Error: ${response.status}`
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Liquidity sources proxy error:', error);
    return res.status(500).json({
      error: 'Failed to fetch liquidity sources'
    });
  }
});

export default router;

