'use client';

import { useAuth } from '@/lib/authContext';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { DashboardSummary } from '@/lib/types';
import KpiCard from '@/components/KpiCard';
import AiAlertCard from '@/components/AiAlertCard';
import ThemeToggle from '@/components/ThemeToggle';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

function formatInr(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function DashboardPage() {
  const { user, token, access, loading, logout } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<DashboardSummary>('/dashboard/summary', { token });
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    }
  }, [token]);

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login');
    }
  }, [loading, token, router]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  async function handleAccept(id: string) {
    if (!token) return;
    await apiRequest(`/ai-alerts/${id}/accept`, { method: 'POST', token });
    loadSummary();
  }

  async function handleDecline(id: string) {
    if (!token) return;
    await apiRequest(`/ai-alerts/${id}/decline`, { method: 'POST', token });
    loadSummary();
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
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Welcome, {user.name}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Role: <span className="font-medium text-blue-600 dark:text-blue-400">{user.role}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            {access?.analytics && (
              <button
                onClick={() => router.push('/analytics')}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
              >
                Analytics
              </button>
            )}
            {access?.reports && (
              <button
                onClick={() => router.push('/reports')}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Reports
              </button>
            )}
            {access?.suppliers && (
              <button
                onClick={() => router.push('/suppliers')}
                className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                Suppliers
              </button>
            )}
            {access?.purchaseOrders && (
              <button
                onClick={() => router.push('/purchase-orders')}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Purchase Orders
              </button>
            )}
            {access?.inventory && (
              <button
                onClick={() => router.push('/inventory')}
                className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
              >
                Inventory
              </button>
            )}
            {access?.billing && (
              <button
                onClick={() => router.push('/billing')}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Billing / POS
              </button>
            )}
            {access?.scanner && (
              <button
                onClick={() => router.push('/scanner')}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Barcode Scanner
              </button>
            )}
            <button
              onClick={logout}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Log out
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {!summary ? (
          <p className="mt-8 text-slate-500 dark:text-slate-400">Loading dashboard data...</p>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              <KpiCard label="Today's Revenue" value={formatInr(summary.todaysRevenue)} accent="blue" />
              <KpiCard label="Today's Orders" value={String(summary.todaysOrderCount)} accent="blue" />
              <KpiCard label="Total Revenue" value={formatInr(summary.totalRevenue)} accent="green" />
              <KpiCard label="Total Profit" value={formatInr(summary.totalProfit)} accent="green" />
              <KpiCard label="Inventory Value" value={formatInr(summary.inventoryValue)} accent="blue" />
              <KpiCard label="Low Stock Items" value={String(summary.lowStockCount)} accent="amber" />
              <KpiCard label="Expiring Soon" value={String(summary.expiringCount)} accent="red" />
              <KpiCard label="Pending Purchase Orders" value={String(summary.pendingPOs)} accent="amber" />
            </div>

            {/* Revenue Trend Chart */}
            <div className="mt-6 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm">
              <h2 className="font-semibold tracking-tight text-slate-900 dark:text-white">
                Revenue — Last 14 Days
              </h2>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summary.revenueTrend}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => formatInr(value)} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2563eb"
                      fill="url(#revenueGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top / Least Selling Products */}
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm">
                <h2 className="font-semibold tracking-tight text-slate-900 dark:text-white">Top Selling Products</h2>
                <ul className="mt-3 space-y-2">
                  {summary.topProducts.map((p) => (
                    <li key={p.name} className="flex justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-300">{p.name}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{p.qty} units</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm">
                <h2 className="font-semibold tracking-tight text-slate-900 dark:text-white">Least Selling Products</h2>
                <ul className="mt-3 space-y-2">
                  {summary.leastProducts.map((p) => (
                    <li key={p.name} className="flex justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-300">{p.name}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{p.qty} units</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* AI Alerts */}
            {access?.aiAlerts && (
              <div className="mt-6">
                <h2 className="mb-3 font-semibold tracking-tight text-slate-900 dark:text-white">
                  AI Alerts — Pending Approval
                </h2>
                {summary.aiAlerts.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No pending alerts right now.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {summary.aiAlerts.map((alert) => (
                      <AiAlertCard
                        key={alert.id}
                        alert={alert}
                        onAccept={handleAccept}
                        onDecline={handleDecline}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}