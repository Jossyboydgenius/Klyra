import { Request, Response, NextFunction } from 'express';
import { adminAuthService } from '../services/auth.js';

export const requireAdminAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const authResult = await adminAuthService.verifyToken(token);

  if (!authResult.valid) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  (req as any).adminEmail = authResult.email;
  next();
};

