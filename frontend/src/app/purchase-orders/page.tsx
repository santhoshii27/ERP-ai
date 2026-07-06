'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { PurchaseOrder } from '@/lib/types';

function formatInr(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

const statusStyles: Record<string, string> = {
  PENDING: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',
  APPROVED: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
  DELIVERED: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400',
  DECLINED: 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400',
};

export default function PurchaseOrdersPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login');
    }
  }, [loading, token, router]);

  const loadOrders = useCallback(async () => {
    if (!token) return;
    setIsFetching(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);

      const data = await apiRequest<{ purchaseOrders: PurchaseOrder[] }>(
        `/procurement/purchase-orders?${params.toString()}`,
        { token }
      );
      setOrders(data.purchaseOrders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load purchase orders');
    } finally {
      setIsFetching(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function handleMarkDelivered(id: string) {
    if (!token) return;
    setMessage('');
    setError('');

    try {
      const data = await apiRequest<{ message: string }>(
        `/procurement/purchase-orders/${id}/deliver`,
        { method: 'POST', token }
      );
      setMessage(data.message);
      loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order');
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Purchase Orders</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Orders created from AI-approved low-stock alerts and manual procurement.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/suppliers')}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Suppliers
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Status filter */}
        <div className="mt-6 flex flex-wrap gap-2">
          {['', 'PENDING', 'APPROVED', 'DELIVERED', 'DECLINED'].map((s) => (
            <button
              key={s || 'ALL'}
              onClick={() => setStatusFilter(s)}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                statusFilter === s
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {message && (
          <p className="mt-4 rounded-lg bg-green-50 dark:bg-green-950/50 px-4 py-3 text-sm text-green-700 dark:text-green-400">{message}</p>
        )}
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-4 space-y-3">
          {isFetching ? (
            <p className="text-slate-400 dark:text-slate-500">Loading...</p>
          ) : orders.length === 0 ? (
            <p className="text-slate-400 dark:text-slate-500">No purchase orders match this filter.</p>
          ) : (
            orders.map((po) => (
              <div key={po.id} className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold tracking-tight text-slate-900 dark:text-white">{po.supplier.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusStyles[po.status] || 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {po.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      Created {new Date(po.createdAt).toLocaleDateString('en-IN')}
                      {po.approvedAt &&
                        ` • Approved ${new Date(po.approvedAt).toLocaleDateString('en-IN')}`}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {formatInr(po.totalAmount)}
                  </p>
                </div>

                <table className="mt-3 w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500 dark:text-slate-400">
                      <th className="py-1">Item</th>
                      <th className="py-1">HSN</th>
                      <th className="py-1 text-right">Qty</th>
                      <th className="py-1 text-right">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.items.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-1.5 text-slate-900 dark:text-white">{item.product.name}</td>
                        <td className="py-1.5 text-slate-500 dark:text-slate-400">{item.product.hsnCode}</td>
                        <td className="py-1.5 text-right text-slate-900 dark:text-white">{item.quantity}</td>
                        <td className="py-1.5 text-right text-slate-900 dark:text-white">
                          {formatInr(item.unitPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {po.status === 'APPROVED' && (
                  <button
                    onClick={() => handleMarkDelivered(po.id)}
                    className="mt-3 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Mark as Delivered
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}