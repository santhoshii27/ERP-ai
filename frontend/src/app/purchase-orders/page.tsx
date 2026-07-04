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
  PENDING: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-blue-50 text-blue-700',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  DECLINED: 'bg-red-50 text-red-700',
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
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Purchase Orders</h1>
            <p className="mt-1 text-sm text-slate-500">
              Orders created from AI-approved low-stock alerts and manual procurement.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/suppliers')}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Suppliers
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
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
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {message && (
          <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p>
        )}
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-4 space-y-3">
          {isFetching ? (
            <p className="text-slate-400">Loading...</p>
          ) : orders.length === 0 ? (
            <p className="text-slate-400">No purchase orders match this filter.</p>
          ) : (
            orders.map((po) => (
              <div key={po.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{po.supplier.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusStyles[po.status] || 'bg-slate-50 text-slate-700'
                        }`}
                      >
                        {po.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Created {new Date(po.createdAt).toLocaleDateString('en-IN')}
                      {po.approvedAt &&
                        ` • Approved ${new Date(po.approvedAt).toLocaleDateString('en-IN')}`}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-blue-600">
                    {formatInr(po.totalAmount)}
                  </p>
                </div>

                <table className="mt-3 w-full text-xs">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-1">Item</th>
                      <th className="py-1">HSN</th>
                      <th className="py-1 text-right">Qty</th>
                      <th className="py-1 text-right">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.items.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="py-1.5 text-slate-900">{item.product.name}</td>
                        <td className="py-1.5 text-slate-500">{item.product.hsnCode}</td>
                        <td className="py-1.5 text-right text-slate-900">{item.quantity}</td>
                        <td className="py-1.5 text-right text-slate-900">
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