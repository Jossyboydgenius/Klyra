-- Liquidity Pool Database Schema Extension

-- Pool wallets table
CREATE TABLE IF NOT EXISTS pool_wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chain_id INTEGER NOT NULL UNIQUE,
  chain_name VARCHAR(50) NOT NULL,
  wallet_address TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pool balances table (real-time tracking)
CREATE TABLE IF NOT EXISTS pool_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID REFERENCES pool_wallets(id) ON DELETE CASCADE,
  token_address TEXT NOT NULL,
  token_symbol VARCHAR(20) NOT NULL,
  balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
  threshold_warning DECIMAL(20, 8) NOT NULL DEFAULT 1000,
  threshold_critical DECIMAL(20, 8) NOT NULL DEFAULT 500,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(wallet_id, token_address)
);

-- Liquidity orders table
CREATE TABLE IF NOT EXISTS liquidity_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_type VARCHAR(20) NOT NULL, -- onramp or offramp
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  
  -- User information
  user_email VARCHAR(255),
  user_wallet_address TEXT NOT NULL,
  
  -- Request details
  requested_token_address TEXT NOT NULL,
  requested_token_symbol VARCHAR(20) NOT NULL,
  requested_chain_id INTEGER NOT NULL,
  requested_amount DECIMAL(20, 8) NOT NULL,
  
  -- Fiat information
  fiat_amount DECIMAL(20, 2) NOT NULL,
  fiat_currency VARCHAR(10) NOT NULL,
  
  -- Pricing
  swap_rate DECIMAL(20, 8),
  your_rate DECIMAL(20, 8),
  markup_or_discount DECIMAL(20, 8),
  external_rate DECIMAL(20, 8),
  
  -- Execution
  route_id TEXT,
  swap_tx_hash TEXT,
  transfer_tx_hash TEXT,
  executed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Tracking
  paystack_reference VARCHAR(255),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Replenishment jobs table
CREATE TABLE IF NOT EXISTS replenishments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID REFERENCES pool_wallets(id),
  token_address TEXT NOT NULL,
  current_balance DECIMAL(20, 8) NOT NULL,
  target_balance DECIMAL(20, 8) NOT NULL,
  amount_needed DECIMAL(20, 8) NOT NULL,
  method VARCHAR(50) NOT NULL, -- swap, external, manual
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  tx_hash TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Execution logs table
CREATE TABLE IF NOT EXISTS execution_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES liquidity_orders(id),
  step_name TEXT NOT NULL,
  step_type TEXT NOT NULL, -- balance_check, route_found, swap, transfer, confirmed
  status TEXT NOT NULL, -- in_progress, completed, failed
  data JSONB,
  error_message TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing history table (for analytics)
CREATE TABLE IF NOT EXISTS pricing_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_symbol VARCHAR(20) NOT NULL,
  chain_id INTEGER NOT NULL,
  external_rate DECIMAL(20, 8) NOT NULL,
  your_rate DECIMAL(20, 8) NOT NULL,
  markup_or_discount DECIMAL(20, 8) NOT NULL,
  order_id UUID REFERENCES liquidity_orders(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pool_wallets_chain_id ON pool_wallets(chain_id);
CREATE INDEX IF NOT EXISTS idx_pool_balances_wallet_token ON pool_balances(wallet_id, token_address);
CREATE INDEX IF NOT EXISTS idx_liquidity_orders_status ON liquidity_orders(status);
CREATE INDEX IF NOT EXISTS idx_liquidity_orders_user_wallet ON liquidity_orders(user_wallet_address);
CREATE INDEX IF NOT EXISTS idx_liquidity_orders_paystack_ref ON liquidity_orders(paystack_reference);
CREATE INDEX IF NOT EXISTS idx_liquidity_orders_created_at ON liquidity_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_replenishments_status ON replenishments(status);
CREATE INDEX IF NOT EXISTS idx_execution_logs_order_id ON execution_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_pricing_history_created_at ON pricing_history(created_at);

-- Updated_at triggers
CREATE TRIGGER update_pool_wallets_updated_at 
  BEFORE UPDATE ON pool_wallets 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pool_balances_updated_at 
  BEFORE UPDATE ON pool_balances 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_liquidity_orders_updated_at 
  BEFORE UPDATE ON liquidity_orders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initial pool wallet setup (insert chains)
INSERT INTO pool_wallets (chain_id, chain_name, wallet_address) VALUES
  (1, 'Ethereum', '') ON CONFLICT (chain_id) DO NOTHING,
  (8453, 'Base', '') ON CONFLICT (chain_id) DO NOTHING,
  (137, 'Polygon', '') ON CONFLICT (chain_id) DO NOTHING,
  (10, 'Optimism', '') ON CONFLICT (chain_id) DO NOTHING;

-- RLS policies
ALTER TABLE pool_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidity_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE replenishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_history ENABLE ROW LEVEL SECURITY;

-- Admin access only for pool management
CREATE POLICY "Admin access pool data" ON pool_wallets
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin access pool balances" ON pool_balances
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin access orders" ON liquidity_orders
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin access replenishments" ON replenishments
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin access execution logs" ON execution_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin access pricing history" ON pricing_history
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

