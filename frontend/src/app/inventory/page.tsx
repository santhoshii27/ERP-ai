'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { InventoryRow } from '@/lib/types';

function formatInr(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

type FilterType = 'all' | 'low_stock' | 'overstock' | 'expiring' | 'expired' | 'dead_stock';

const filterLabels: Record<FilterType, string> = {
  all: 'All Products',
  low_stock: 'Low Stock',
  overstock: 'Overstock',
  expiring: 'Expiring Soon',
  expired: 'Expired',
  dead_stock: 'Dead Stock',
};

export default function InventoryPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login');
    }
  }, [loading, token, router]);

  const loadInventory = useCallback(async () => {
    if (!token) return;
    setIsFetching(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('filter', filter);
      if (search) params.set('search', search);

      const data = await apiRequest<{ products: InventoryRow[]; count: number }>(
        `/inventory?${params.toString()}`,
        { token }
      );
      setRows(data.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setIsFetching(false);
    }
  }, [token, filter, search]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

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
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Inventory Management</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              All products across warehouses, with stock health filters.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-wrap gap-2">
          {(Object.keys(filterLabels) as FilterType[]).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {filterLabels[key]}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mt-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name..."
            className="w-full max-w-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
          />
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <tr className="text-left text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Total Stock</th>
                <th className="px-4 py-3 text-right">Stock Value</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {isFetching ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    No products match this filter.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <React.Fragment key={row.id}>
                    <tr
                      className="cursor-pointer border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 dark:text-white">{row.name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{row.barcode}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.category}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                        {row.totalQty} units
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900 dark:text-white">
                        {formatInr(row.stockValue)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {row.isLowStock && (
                            <span className="rounded-full bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                              Low Stock
                            </span>
                          )}
                          {row.isOverstock && (
                            <span className="rounded-full bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                              Overstock
                            </span>
                          )}
                          {row.hasExpiringSoon && (
                            <span className="rounded-full bg-orange-50 dark:bg-orange-950/50 px-2 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-400">
                              Expiring Soon
                            </span>
                          )}
                          {row.hasExpired && (
                            <span className="rounded-full bg-red-50 dark:bg-red-950/50 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                              Expired
                            </span>
                          )}
                          {!row.isLowStock && !row.isOverstock && !row.hasExpiringSoon && !row.hasExpired && (
                            <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              Healthy
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400 dark:text-slate-500">
                        {expandedId === row.id ? '▲' : '▼'}
                      </td>
                    </tr>
                    {expandedId === row.id && (
                      <tr className="bg-slate-50/50 dark:bg-slate-800/30">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid grid-cols-2 gap-4 text-xs md:grid-cols-4">
                            <div>
                              <span className="text-slate-500 dark:text-slate-400">Supplier:</span>{' '}
                              <span className="font-medium text-slate-900 dark:text-white">{row.supplier}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 dark:text-slate-400">HSN:</span>{' '}
                              <span className="font-medium text-slate-900 dark:text-white">{row.hsnCode}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 dark:text-slate-400">Purchase Price:</span>{' '}
                              <span className="font-medium text-slate-900 dark:text-white">
                                {formatInr(row.purchasePrice)}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 dark:text-slate-400">Reorder Level:</span>{' '}
                              <span className="font-medium text-slate-900 dark:text-white">{row.reorderLevel}</span>
                            </div>
                          </div>

                          <table className="mt-3 w-full text-xs">
                            <thead>
                              <tr className="text-left text-slate-500 dark:text-slate-400">
                                <th className="py-1">Warehouse</th>
                                <th className="py-1 text-right">Qty</th>
                                <th className="py-1">Batch</th>
                                <th className="py-1">Rack</th>
                                <th className="py-1">Expiry</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.warehouseBreakdown.map((w) => (
                                <tr key={w.warehouseId} className="border-t border-slate-100 dark:border-slate-800">
                                  <td className="py-1.5 text-slate-900 dark:text-white">{w.warehouseName}</td>
                                  <td className="py-1.5 text-right text-slate-900 dark:text-white">{w.quantity}</td>
                                  <td className="py-1.5 text-slate-600 dark:text-slate-400">{w.batchNumber || '—'}</td>
                                  <td className="py-1.5 text-slate-600 dark:text-slate-400">{w.rackNumber || '—'}</td>
                                  <td className="py-1.5 text-slate-600 dark:text-slate-400">
                                    {w.expiryDate
                                      ? new Date(w.expiryDate).toLocaleDateString('en-IN')
                                      : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}