import express from 'express';
import cors from 'cors';
import paymentRoutes from './routes/payment.js';
import paystackRoutes from './routes/paystack.js';
import adminRoutes from './routes/admin.js';
import sendRoutes from './routes/send.js';
import transactionRoutes from './routes/transaction.js';
import webhookRoutes from './routes/webhook.js';
import poolRoutes from './routes/pool.js';
import oneinchRoutes from './routes/1inch.js';
import moolreRoutes from './routes/moolre.js';
import notifyRoutes from './routes/notify.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.text({ type: 'text/plain' }));

app.use('/api/payment', paymentRoutes);
app.use('/api/paystack', paystackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/send', sendRoutes);
app.use('/api/transaction', transactionRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/pool', poolRoutes);
app.use('/api/1inch', oneinchRoutes);
app.use('/api/moolre', moolreRoutes);
app.use('/api/notify', notifyRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

