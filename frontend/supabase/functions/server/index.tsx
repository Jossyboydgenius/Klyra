/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createClient } from '@supabase/supabase-js';
import * as kv from './kv_store';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
);

// Mock exchange rates
const EXCHANGE_RATES = {
  'USD_GHS': 12.5,
  'BTC_USD': 43000,
  'ETH_USD': 2400,
  'BNB_USD': 320,
  'USDT_USD': 1,
  'USDC_USD': 1
};

// Mock crypto prices
const CRYPTO_PRICES = {
  'BTC': { usd: 43000, ghs: 537500 },
  'ETH': { usd: 2400, ghs: 30000 },
  'BNB': { usd: 320, ghs: 4000 },
  'USDT': { usd: 1, ghs: 12.5 },
  'USDC': { usd: 1, ghs: 12.5 }
};

// User signup
app.post('/make-server-423580bb/signup', async (c) => {
  try {
    const { email, password, name, phone } = await c.req.json();
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, phone },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log('Signup error:', error);
      return c.json({ error: `Signup error: ${error.message}` }, 400);
    }

    // Initialize user data
    await kv.set(`user:${data.user.id}:profile`, {
      id: data.user.id,
      name,
      email,
      phone,
      kyc_status: 'pending',
      created_at: new Date().toISOString()
    });

    // Initialize crypto balances
    await kv.set(`user:${data.user.id}:balances`, {
      crypto: {
        BTC: { amount: 0, networks: { mainnet: 0, base: 0 } },
        ETH: { amount: 0, networks: { mainnet: 0, base: 0 } },
        BNB: { amount: 0, networks: { bsc: 0, base: 0 } },
        USDT: { amount: 0, networks: { mainnet: 0, base: 0 } },
        USDC: { amount: 0, networks: { mainnet: 0, base: 0 } }
      }
    });

    // Initialize empty payment methods
    await kv.set(`user:${data.user.id}:payment_methods`, []);

    // Store phone to user mapping for lookup
    await kv.set(`phone:${phone}`, data.user.id);

    return c.json({ user: data.user, message: 'User created successfully' });
  } catch (error) {
    console.log('Server error during signup:', error);
    return c.json({ error: 'Internal server error during signup' }, 500);
  }
});

// Get user profile and balances
app.get('/make-server-423580bb/user/profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const profile = await kv.get(`user:${user.id}:profile`);
    const balances = await kv.get(`user:${user.id}:balances`);
    const paymentMethods = await kv.get(`user:${user.id}:payment_methods`) || [];

    return c.json({ profile, balances, paymentMethods });
  } catch (error) {
    console.log('Error fetching user profile:', error);
    return c.json({ error: 'Error fetching user profile' }, 500);
  }
});

// Add payment method
app.post('/make-server-423580bb/payment-methods', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { type, name, details, currency } = await c.req.json();
    
    const paymentMethods = await kv.get(`user:${user.id}:payment_methods`) || [];
    
    const newPaymentMethod = {
      id: `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      name,
      details,
      currency,
      created_at: new Date().toISOString(),
      is_verified: true // Mock verification
    };

    paymentMethods.push(newPaymentMethod);
    await kv.set(`user:${user.id}:payment_methods`, paymentMethods);

    return c.json({ paymentMethod: newPaymentMethod, message: 'Payment method added successfully' });
  } catch (error) {
    console.log('Error adding payment method:', error);
    return c.json({ error: 'Error adding payment method' }, 500);
  }
});

// Delete payment method
app.delete('/make-server-423580bb/payment-methods/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const paymentMethodId = c.req.param('id');
    const paymentMethods = await kv.get(`user:${user.id}:payment_methods`) || [];
    
    const updatedPaymentMethods = paymentMethods.filter((pm: any) => pm.id !== paymentMethodId);
    await kv.set(`user:${user.id}:payment_methods`, updatedPaymentMethods);

    return c.json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    console.log('Error deleting payment method:', error);
    return c.json({ error: 'Error deleting payment method' }, 500);
  }
});

// Lookup user by phone/address/basename
app.post('/make-server-423580bb/user/lookup', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { identifier } = await c.req.json();
    
    let foundUserId = null;
    
    // Try phone lookup first
    if (identifier.match(/^\+?[\d\s-]+$/)) {
      foundUserId = await kv.get(`phone:${identifier.replace(/[\s-]/g, '')}`);
    }
    
    // Try email lookup if phone lookup failed
    if (!foundUserId && identifier.includes('@')) {
      // Search through all user profiles to find email match
      const userKeys = await kv.getByPrefix('user:');
      for (const item of userKeys) {
        if (item.key.includes(':profile') && item.value.email === identifier) {
          foundUserId = item.value.id;
          break;
        }
      }
    }
    
    // Try basename lookup (mock for now)
    if (!foundUserId && identifier.endsWith('.base.eth')) {
      // Mock basename to user mapping
      const mockBasenames: {[key: string]: string} = {
        'john.base.eth': 'mock_user_1',
        'alice.base.eth': 'mock_user_2'
      };
      foundUserId = mockBasenames[identifier];
    }

    if (!foundUserId) {
      return c.json({ error: 'User not found' }, 404);
    }

    const recipientProfile = await kv.get(`user:${foundUserId}:profile`);
    
    if (!recipientProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    return c.json({ 
      recipient: {
        id: recipientProfile.id,
        name: recipientProfile.name,
        email: recipientProfile.email
      }
    });
  } catch (error) {
    console.log('Error looking up user:', error);
    return c.json({ error: 'Error looking up user' }, 500);
  }
});

// Send crypto
app.post('/make-server-423580bb/crypto/send', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { recipient_id, crypto_symbol, amount, network, message } = await c.req.json();
    
    // Check sender balance
    const senderBalances = await kv.get(`user:${user.id}:balances`);
    if (senderBalances.crypto[crypto_symbol].amount < amount) {
      return c.json({ error: 'Insufficient balance' }, 400);
    }

    const transaction_id = `send_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create transaction record
    await kv.set(`transaction:${transaction_id}`, {
      id: transaction_id,
      type: 'send',
      sender_id: user.id,
      recipient_id,
      crypto_symbol,
      amount,
      network,
      message,
      status: 'completed',
      created_at: new Date().toISOString()
    });

    // Update sender balance
    senderBalances.crypto[crypto_symbol].amount -= amount;
    senderBalances.crypto[crypto_symbol].networks[network] -= amount;
    await kv.set(`user:${user.id}:balances`, senderBalances);

    // Update recipient balance
    const recipientBalances = await kv.get(`user:${recipient_id}:balances`);
    if (recipientBalances) {
      recipientBalances.crypto[crypto_symbol].amount += amount;
      recipientBalances.crypto[crypto_symbol].networks[network] += amount;
      await kv.set(`user:${recipient_id}:balances`, recipientBalances);
    }

    return c.json({ 
      transaction_id, 
      message: 'Crypto sent successfully',
      amount,
      crypto_symbol,
      recipient_id
    });
  } catch (error) {
    console.log('Error sending crypto:', error);
    return c.json({ error: 'Error sending crypto' }, 500);
  }
});

// Update KYC status
app.post('/make-server-423580bb/kyc/submit', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { id_number, id_type, address } = await c.req.json();
    
    const profile = await kv.get(`user:${user.id}:profile`);
    profile.kyc_status = 'verified'; // Mock verification
    profile.kyc_data = { id_number, id_type, address };
    
    await kv.set(`user:${user.id}:profile`, profile);

    return c.json({ message: 'KYC submitted successfully', status: 'verified' });
  } catch (error) {
    console.log('Error submitting KYC:', error);
    return c.json({ error: 'Error submitting KYC' }, 500);
  }
});

// Buy crypto
app.post('/make-server-423580bb/crypto/buy', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { amount, currency, crypto_symbol, payment_method } = await c.req.json();
    
    // Simulate purchase processing
    const transaction_id = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Calculate crypto amount
    const crypto_price = CRYPTO_PRICES[crypto_symbol as keyof typeof CRYPTO_PRICES];
    if (
      !crypto_price ||
      (currency !== 'GHS' && currency !== 'USD')
    ) {
      return c.json({ error: 'Invalid crypto symbol or currency' }, 400);
    }
    const crypto_amount = currency === 'GHS'
      ? amount / crypto_price.ghs
      : amount / crypto_price.usd;

    // Store transaction
    await kv.set(`transaction:${transaction_id}`, {
      id: transaction_id,
      user_id: user.id,
      type: 'buy',
      amount,
      currency,
      crypto_symbol,
      crypto_amount,
      payment_method,
      status: 'processing',
      created_at: new Date().toISOString()
    });

    return c.json({ 
      transaction_id, 
      message: 'Purchase initiated',
      crypto_amount,
      estimated_price: crypto_price
    });
  } catch (error) {
    console.log('Error processing crypto purchase:', error);
    return c.json({ error: 'Error processing crypto purchase' }, 500);
  }
});

// Get transaction status
app.get('/make-server-423580bb/transaction/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const transaction_id = c.req.param('id');
    const transaction = await kv.get(`transaction:${transaction_id}`);

    if (!transaction) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    return c.json({ transaction });
  } catch (error) {
    console.log('Error fetching transaction:', error);
    return c.json({ error: 'Error fetching transaction' }, 500);
  }
});

// Complete transaction (mock)
app.post('/make-server-423580bb/transaction/:id/complete', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const transaction_id = c.req.param('id');
    const transaction = await kv.get(`transaction:${transaction_id}`);

    if (!transaction) {
      return c.json({ error: 'Transaction not found' }, 404);
    }

    // Update transaction status
    transaction.status = 'completed';
    transaction.completed_at = new Date().toISOString();
    await kv.set(`transaction:${transaction_id}`, transaction);

    // Update user balances
    const balances = await kv.get(`user:${user.id}:balances`);
    const crypto_symbol = transaction.crypto_symbol;
    
    if (transaction.type === 'buy') {
      balances.crypto[crypto_symbol].amount += transaction.crypto_amount;
      balances.crypto[crypto_symbol].networks.mainnet += transaction.crypto_amount;
    }

    await kv.set(`user:${user.id}:balances`, balances);

    return c.json({ message: 'Transaction completed', transaction });
  } catch (error) {
    console.log('Error completing transaction:', error);
    return c.json({ error: 'Error completing transaction' }, 500);
  }
});

// Get crypto prices
app.get('/make-server-423580bb/crypto/prices', async (c) => {
  try {
    return c.json({ prices: CRYPTO_PRICES });
  } catch (error) {
    console.log('Error fetching crypto prices:', error);
    return c.json({ error: 'Error fetching crypto prices' }, 500);
  }
});

// Sell crypto
app.post('/make-server-423580bb/crypto/sell', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { crypto_amount, crypto_symbol, currency, withdrawal_method } = await c.req.json();
    
    // Check balance
    const balances = await kv.get(`user:${user.id}:balances`);
    if (balances.crypto[crypto_symbol].amount < crypto_amount) {
      return c.json({ error: 'Insufficient crypto balance' }, 400);
    }

    const transaction_id = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate fiat amount
    const crypto_price = CRYPTO_PRICES[crypto_symbol as keyof typeof CRYPTO_PRICES];
    const fiat_amount = currency === 'GHS' 
      ? crypto_amount * crypto_price.ghs 
      : crypto_amount * crypto_price.usd;

    await kv.set(`transaction:${transaction_id}`, {
      id: transaction_id,
      user_id: user.id,
      type: 'sell',
      crypto_amount,
      crypto_symbol,
      fiat_amount,
      currency,
      withdrawal_method,
      status: 'processing',
      created_at: new Date().toISOString()
    });

    return c.json({ 
      transaction_id, 
      message: 'Sale initiated',
      fiat_amount
    });
  } catch (error) {
    console.log('Error processing crypto sale:', error);
    return c.json({ error: 'Error processing crypto sale' }, 500);
  }
});

export default app;