'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { Supplier } from '@/lib/types';

export default function SuppliersPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login');
    }
  }, [loading, token, router]);

  const loadSuppliers = useCallback(async () => {
    if (!token) return;
    setIsFetching(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const data = await apiRequest<{ suppliers: Supplier[] }>(
        `/procurement/suppliers?${params.toString()}`,
        { token }
      );
      setSuppliers(data.suppliers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suppliers');
    } finally {
      setIsFetching(false);
    }
  }, [token, search]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Suppliers</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {suppliers.length} suppliers in your network.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/purchase-orders')}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Purchase Orders
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="mt-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search suppliers by name..."
            className="w-full max-w-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
          />
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isFetching ? (
            <p className="text-slate-400 dark:text-slate-500">Loading...</p>
          ) : suppliers.length === 0 ? (
            <p className="text-slate-400 dark:text-slate-500">No suppliers found.</p>
          ) : (
            suppliers.map((s) => (
              <div key={s.id} className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold tracking-tight text-slate-900 dark:text-white">{s.name}</h3>
                  <span className="rounded-full bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    ★ {s.rating.toFixed(1)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{s.contactName}</p>
                <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <p>📞 {s.phone}</p>
                  {s.email && <p>✉️ {s.email}</p>}
                  <p>📍 {s.city}</p>
                  <p className="text-slate-400 dark:text-slate-500">GST: {s.gstNumber}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}