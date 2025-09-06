/**
 * Admin authentication utilities
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// import { supabase } from '@/lib/database/supabase-client';

export interface AdminSession {
  id: string;
  admin_email: string;
  expires_at: string;
  token_hash: string;
}

export class AdminAuthService {
  private jwtSecret: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET!;
  }

  /**
   * Authenticate admin with email and password
   */
  async authenticate(email: string, password: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      // Check if credentials match environment variables
      const adminEmail = process.env.ADMIN_EMAIL!;
      const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH!;

      if (email !== adminEmail) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, adminPasswordHash);
      if (!isValidPassword) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          email: adminEmail,
          role: 'admin',
          iat: Math.floor(Date.now() / 1000)
        },
        this.jwtSecret,
        { expiresIn: '24h' }
      );

      // Store session in database
      const tokenHash = await bcrypt.hash(token, 10);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await supabase
        .from('admin_sessions')
        .insert([{
          token_hash: tokenHash,
          admin_email: adminEmail,
          expires_at: expiresAt.toISOString()
        }]);

      return { success: true, token };
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<{ valid: boolean; email?: string; error?: string }> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      // Check if session exists in database
      const tokenHash = await bcrypt.hash(token, 10);
      const { data: session } = await supabase
        .from('admin_sessions')
        .select('*')
        .eq('admin_email', decoded.email)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (!session) {
        return { valid: false, error: 'Session expired or invalid' };
      }

      return { valid: true, email: decoded.email };
    } catch (error) {
      console.error('Token verification error:', error);
      return { valid: false, error: 'Invalid token' };
    }
  }

  /**
   * Logout admin (invalidate session)
   */
  async logout(token: string): Promise<{ success: boolean }> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      // Remove session from database
      await supabase
        .from('admin_sessions')
        .delete()
        .eq('admin_email', decoded.email);

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false };
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      await supabase
        .from('admin_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  }

  /**
   * Generate password hash (utility for setup)
   */
  static async generatePasswordHash(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
}

export const adminAuthService = new AdminAuthService();
