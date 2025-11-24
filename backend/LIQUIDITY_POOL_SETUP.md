# Liquidity Pool Setup Guide

## Overview

The liquidity pool system enables automatic crypto disbursement when users pay with fiat. It manages pool wallets across multiple chains, tracks balances, executes swaps, and handles order processing.

## Architecture

### Components

1. **Pool Wallet Manager**: Manages multi-chain wallets and transaction execution
2. **Pool Balance Tracker**: Tracks balances and monitors thresholds
3. **Pool Executor**: Executes swaps and transfers
4. **Pricing Engine**: Calculates rates with markup/discount
5. **Order Queue**: Manages liquidity orders and processing

## Database Setup

### Required Tables

#### 1. `pool_wallets`

```sql
CREATE TABLE pool_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id INTEGER NOT NULL,
  chain_name VARCHAR(100) NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(chain_id, wallet_address)
);

CREATE INDEX idx_pool_wallets_chain ON pool_wallets(chain_id);
CREATE INDEX idx_pool_wallets_active ON pool_wallets(is_active);
```

#### 2. `pool_balances`

```sql
CREATE TABLE pool_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES pool_wallets(id) ON DELETE CASCADE,
  token_address VARCHAR(42) NOT NULL,
  token_symbol VARCHAR(20) NOT NULL,
  balance DECIMAL(30, 18) DEFAULT 0,
  threshold_warning DECIMAL(30, 18) DEFAULT 1000,
  threshold_critical DECIMAL(30, 18) DEFAULT 500,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(wallet_id, token_address)
);

CREATE INDEX idx_pool_balances_wallet ON pool_balances(wallet_id);
CREATE INDEX idx_pool_balances_token ON pool_balances(token_address);
CREATE INDEX idx_pool_balances_symbol ON pool_balances(token_symbol);
```

#### 3. `liquidity_orders`

```sql
CREATE TABLE liquidity_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('onramp', 'offramp')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  user_email VARCHAR(255),
  user_wallet_address VARCHAR(42) NOT NULL,
  requested_token_address VARCHAR(42) NOT NULL,
  requested_token_symbol VARCHAR(20) NOT NULL,
  requested_chain_id INTEGER NOT NULL,
  requested_amount DECIMAL(30, 18) NOT NULL,
  fiat_amount DECIMAL(20, 2) NOT NULL,
  fiat_currency VARCHAR(10) NOT NULL,
  swap_rate DECIMAL(30, 18),
  your_rate DECIMAL(30, 18),
  markup_or_discount DECIMAL(10, 4),
  external_rate DECIMAL(30, 18),
  swap_tx_hash VARCHAR(66),
  transfer_tx_hash VARCHAR(66),
  paystack_reference VARCHAR(100),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  executed_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_liquidity_orders_status ON liquidity_orders(status);
CREATE INDEX idx_liquidity_orders_reference ON liquidity_orders(paystack_reference);
CREATE INDEX idx_liquidity_orders_wallet ON liquidity_orders(user_wallet_address);
CREATE INDEX idx_liquidity_orders_created ON liquidity_orders(created_at);
```

#### 4. `execution_logs`

```sql
CREATE TABLE execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES liquidity_orders(id) ON DELETE CASCADE,
  step_name VARCHAR(100) NOT NULL,
  step_type VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_execution_logs_order ON execution_logs(order_id);
CREATE INDEX idx_execution_logs_status ON execution_logs(status);
```

#### 5. `replenishments`

```sql
CREATE TABLE replenishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES pool_wallets(id) ON DELETE CASCADE,
  token_address VARCHAR(42) NOT NULL,
  current_balance DECIMAL(30, 18) NOT NULL,
  target_balance DECIMAL(30, 18) NOT NULL,
  amount_needed DECIMAL(30, 18) NOT NULL,
  method VARCHAR(20) NOT NULL CHECK (method IN ('swap', 'external', 'manual')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  tx_hash VARCHAR(66),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_replenishments_status ON replenishments(status);
CREATE INDEX idx_replenishments_wallet ON replenishments(wallet_id);
```

## Environment Variables

### Pool Wallet Private Keys

```env
POOL_WALLET_ETH_PRIVATE_KEY=0x...
POOL_WALLET_BASE_PRIVATE_KEY=0x...
POOL_WALLET_POLYGON_PRIVATE_KEY=0x...
POOL_WALLET_OPTIMISM_PRIVATE_KEY=0x...
```

### Database

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON=your-anon-key
```

### External Services

```env
NEXT_PUBLIC_ONEINCH_API_KEY=your-1inch-api-key
NEXT_PUBLIC_SOCKET_API_KEY=your-socket-api-key
LIFI_API_KEY=your-lifi-api-key
NEXT_PUBLIC_SQUID_INTEGRATOR_ID=your-squid-id
NEXT_PUBLIC_ACROSS_INTEGRATOR_ID=your-across-id
```

## Setup Steps

### 1. Create Pool Wallets

For each chain you want to support:

```sql
INSERT INTO pool_wallets (chain_id, chain_name, wallet_address, is_active)
VALUES 
  (1, 'Ethereum', '0x...', true),
  (8453, 'Base', '0x...', true),
  (137, 'Polygon', '0x...', true),
  (10, 'Optimism', '0x...', true);
```

### 2. Initialize Pool Balances

For each wallet and token:

```sql
INSERT INTO pool_balances (wallet_id, token_address, token_symbol, balance, threshold_warning, threshold_critical)
VALUES 
  (
    (SELECT id FROM pool_wallets WHERE chain_id = 8453),
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    'USDC',
    0,
    1000,
    500
  );
```

### 3. Fund Pool Wallets

Send USDC to each pool wallet address:

- **Ethereum**: Send USDC to wallet address on Ethereum mainnet
- **Base**: Send USDC to wallet address on Base
- **Polygon**: Send USDC to wallet address on Polygon
- **Optimism**: Send USDC to wallet address on Optimism

### 4. Sync Initial Balances

Call the sync endpoint to update balances from on-chain:

```bash
POST /api/pool/balances
Authorization: Bearer <admin-token>
```

### 5. Configure Thresholds

Update threshold values based on your liquidity needs:

```sql
UPDATE pool_balances 
SET threshold_warning = 5000, threshold_critical = 2000
WHERE token_symbol = 'USDC';
```

## Operation Flow

### On-Ramp Flow (User Buys Crypto)

1. User initiates payment via Paystack
2. Payment verified → Order created in `liquidity_orders`
3. Order processed:
   - Check pool balance
   - If token available: Direct transfer
   - If token not available: Swap USDC → Token → Transfer
4. Order marked as completed
5. Balance updated

### Off-Ramp Flow (User Sells Crypto)

1. User sends crypto to pool wallet
2. Order created in `liquidity_orders`
3. Order processed:
   - Swap Token → USDC
   - Initiate Paystack transfer to user
4. Order marked as completed
5. Balance updated

## Monitoring

### Check Pool Balances

```bash
GET /api/pool/balances
Authorization: Bearer <admin-token>
```

### View Pending Orders

```bash
GET /api/pool/orders?status=pending
Authorization: Bearer <admin-token>
```

### View Execution Logs

```sql
SELECT * FROM execution_logs 
WHERE order_id = '<order-id>' 
ORDER BY created_at;
```

## Replenishment

### Automatic Monitoring

The system monitors balances and creates replenishment jobs when balances fall below critical threshold.

### Manual Replenishment

1. Check balances needing replenishment:

```sql
SELECT * FROM replenishments 
WHERE status = 'pending';
```

2. Fund pool wallet manually
3. Mark replenishment as complete:

```sql
UPDATE replenishments 
SET status = 'completed', completed_at = NOW(), tx_hash = '<tx-hash>'
WHERE id = '<replenishment-id>';
```

## Configuration

### Pricing Markup/Discount

Default values:
- On-ramp markup: 1.67%
- Off-ramp discount: 1.69%

Adjust in `pricing-engine.ts`:

```typescript
const pricingEngine = new PricingEngine({
  onRampMarkup: 0.02, // 2%
  offRampDiscount: 0.015, // 1.5%
});
```

### Balance Thresholds

Default values:
- Warning threshold: 1000 USDC
- Critical threshold: 500 USDC

Update per token:

```sql
UPDATE pool_balances 
SET threshold_warning = 10000, threshold_critical = 5000
WHERE token_symbol = 'USDC' AND wallet_id = '<wallet-id>';
```

## Security

### Private Key Management

- Store private keys in environment variables only
- Never commit private keys to version control
- Use separate wallets for testnet/mainnet
- Rotate keys periodically

### Access Control

- Admin endpoints require authentication
- Use JWT tokens for admin access
- Implement rate limiting on public endpoints

## Troubleshooting

### Insufficient Balance Errors

1. Check current balance:

```sql
SELECT * FROM pool_balances WHERE token_symbol = 'USDC';
```

2. Fund wallet if below threshold
3. Sync balance:

```bash
POST /api/pool/balances
Authorization: Bearer <admin-token>
```

### Failed Orders

1. Check execution logs:

```sql
SELECT * FROM execution_logs WHERE order_id = '<order-id>';
```

2. Review error messages
3. Retry if retry_count < 3
4. Manual intervention if needed

### Transaction Failures

1. Check gas prices
2. Verify wallet has native token for gas
3. Check token approvals
4. Verify RPC endpoints are working

## Best Practices

1. **Maintain Adequate Liquidity**: Keep balances above warning threshold
2. **Monitor Regularly**: Check balances daily
3. **Set Alerts**: Configure alerts for low balances
4. **Test First**: Test on testnet before mainnet
5. **Backup Wallets**: Keep secure backups of private keys
6. **Document Changes**: Log all configuration changes
7. **Regular Audits**: Review transactions and balances weekly

## API Endpoints

### Pool Management

- `GET /api/pool/balances` - Get all balances (Admin)
- `POST /api/pool/balances` - Sync all balances (Admin)
- `GET /api/pool/orders` - Get orders by status (Admin)
- `POST /api/pool/orders` - Create new order
- `GET /api/pool/orders/:id` - Get order details
- `POST /api/pool/orders/:id/process` - Process order (Admin)
- `POST /api/pool/execute` - Execute order (Webhook)

## Integration with Payment Flow

### Payment Verification Webhook

When Paystack payment succeeds:

1. Webhook receives `charge.success` event
2. Transaction updated to `payment_status: 'success'`
3. Order created in `liquidity_orders`
4. Order automatically processed
5. Crypto sent to user wallet

### Order Processing

Orders are processed automatically when:
- Payment is verified (on-ramp)
- Crypto is received (off-ramp)
- Admin manually triggers processing

## Maintenance

### Daily Tasks

- Check pool balances
- Review pending orders
- Monitor execution logs
- Verify wallet balances match database

### Weekly Tasks

- Review failed orders
- Check replenishment jobs
- Audit transaction history
- Update pricing if needed

### Monthly Tasks

- Review and optimize thresholds
- Analyze profit margins
- Update documentation
- Security audit

