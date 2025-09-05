'use client';

import { useState, useEffect } from 'react';
import { Transaction } from '@/lib/database/supabase-client';

export default function AdminDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingTx, setProcessingTx] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    loadTransactions();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      window.location.href = '/admin';
      return;
    }

    try {
      const response = await fetch('/api/admin/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        localStorage.removeItem('admin_token');
        window.location.href = '/admin';
      }
    } catch (error) {
      localStorage.removeItem('admin_token');
      window.location.href = '/admin';
    }
  };

  const loadTransactions = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
      } else {
        setError('Failed to load transactions');
      }
    } catch (error) {
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const generateOnrampUrl = async (transactionId: string) => {
    setProcessingTx(transactionId);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/generate-onramp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ transactionId })
      });

      if (response.ok) {
        await loadTransactions();
      } else {
        setError('Failed to generate onramp URL');
      }
    } catch (error) {
      setError('Failed to generate onramp URL');
    } finally {
      setProcessingTx(null);
    }
  };

  const markAsProcessed = async (transactionId: string) => {
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/mark-processed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ transactionId })
      });

      if (response.ok) {
        await loadTransactions();
      } else {
        setError('Failed to mark as processed');
      }
    } catch (error) {
      setError('Failed to mark as processed');
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    window.location.href = '/admin';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600">Manage crypto transactions</p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Total Transactions</h3>
            <p className="text-3xl font-bold text-blue-600">{transactions.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Pending Payment</h3>
            <p className="text-3xl font-bold text-yellow-600">
              {transactions.filter(t => t.payment_status === 'pending').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Ready to Process</h3>
            <p className="text-3xl font-bold text-orange-600">
              {transactions.filter(t => t.payment_status === 'success' && t.onramp_status === 'pending').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Completed</h3>
            <p className="text-3xl font-bold text-green-600">
              {transactions.filter(t => t.transfer_status === 'success').length}
            </p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Crypto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Onramp Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{transaction.user_email}</div>
                      <div className="text-sm text-gray-500">{transaction.user_phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {transaction.fiat_amount} {transaction.fiat_currency}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {transaction.crypto_amount} {transaction.crypto_asset}
                      </div>
                      <div className="text-sm text-gray-500">{transaction.network}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        transaction.payment_status === 'success' 
                          ? 'bg-green-100 text-green-800'
                          : transaction.payment_status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {transaction.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        transaction.onramp_status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : transaction.onramp_status === 'executed'
                          ? 'bg-blue-100 text-blue-800'
                          : transaction.onramp_status === 'generated'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.onramp_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {transaction.payment_status === 'success' && transaction.onramp_status === 'pending' && (
                        <button
                          onClick={() => generateOnrampUrl(transaction.id!)}
                          disabled={processingTx === transaction.id}
                          className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                        >
                          {processingTx === transaction.id ? 'Generating...' : 'Generate URL'}
                        </button>
                      )}
                      {transaction.onramp_status === 'generated' && transaction.coinbase_onramp_url && (
                        <div className="space-y-2">
                          <a
                            href={transaction.coinbase_onramp_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-blue-600 hover:text-blue-900"
                          >
                            Open Coinbase
                          </a>
                          <button
                            onClick={() => markAsProcessed(transaction.id!)}
                            className="block text-green-600 hover:text-green-900"
                          >
                            Mark Processed
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
