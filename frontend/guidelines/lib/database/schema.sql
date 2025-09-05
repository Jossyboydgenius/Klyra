-- Supabase Database Schema for Paymaster Transactions

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- User information
  user_email VARCHAR(255) NOT NULL,
  user_phone VARCHAR(20) NOT NULL,
  user_wallet_address VARCHAR(255) NOT NULL,
  
  -- Payment information (Paystack)
  paystack_reference VARCHAR(255) UNIQUE NOT NULL,
  paystack_access_code VARCHAR(255),
  fiat_amount DECIMAL(20, 2) NOT NULL,
  fiat_currency VARCHAR(10) NOT NULL,
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, success, failed
  payment_method VARCHAR(50), -- mobile_money, bank_transfer, ussd
  
  -- Crypto information
  crypto_asset VARCHAR(20) NOT NULL,
  crypto_amount VARCHAR(50) NOT NULL,
  network VARCHAR(50) NOT NULL,
  transaction_type VARCHAR(20) NOT NULL, -- direct, swap
  
  -- Coinbase onramp information
  coinbase_onramp_url TEXT,
  coinbase_session_token TEXT,
  onramp_status VARCHAR(50) DEFAULT 'pending', -- pending, generated, executed, completed
  
  -- Transfer information
  transfer_tx_hash VARCHAR(255),
  transfer_status VARCHAR(50) DEFAULT 'pending', -- pending, success, failed
  transfer_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Swap information (for non-direct tokens)
  swap_tx_hash VARCHAR(255),
  swap_status VARCHAR(50), -- pending, success, failed
  swap_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Admin tracking
  admin_processed_by VARCHAR(255),
  admin_processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);

-- Create admin_sessions table for admin panel authentication
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  admin_email VARCHAR(255) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_paystack_reference ON transactions(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_user_email ON transactions(user_email);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_status ON transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_transactions_onramp_status ON transactions(onramp_status);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_status ON transactions(transfer_status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transactions_updated_at 
  BEFORE UPDATE ON transactions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies (Row Level Security)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- Policy for transactions (admin can see all, users can see their own)
CREATE POLICY "Admin can view all transactions" ON transactions
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (user_email = auth.jwt() ->> 'email');

-- Policy for admin sessions (only admins can access)
CREATE POLICY "Only admins can access sessions" ON admin_sessions
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
