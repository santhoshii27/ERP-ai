'use client';

import { useAuth } from '@/lib/authContext';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { DashboardSummary } from '@/lib/types';
import KpiCard from '@/components/KpiCard';
import AiAlertCard from '@/components/AiAlertCard';
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
  const { user, token, loading, logout } = useAuth();
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
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Welcome, {user.name}</h1>
            <p className="text-sm text-slate-500">
              Role: <span className="font-medium text-blue-600">{user.role}</span>
            </p>
          </div>
          <button
            onClick={logout}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Log out
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        {!summary ? (
          <p className="mt-8 text-slate-500">Loading dashboard data...</p>
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
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">Revenue — Last 14 Days</h2>
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
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-900">Top Selling Products</h2>
                <ul className="mt-3 space-y-2">
                  {summary.topProducts.map((p) => (
                    <li key={p.name} className="flex justify-between text-sm">
                      <span className="text-slate-700">{p.name}</span>
                      <span className="font-medium text-slate-900">{p.qty} units</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-slate-900">Least Selling Products</h2>
                <ul className="mt-3 space-y-2">
                  {summary.leastProducts.map((p) => (
                    <li key={p.name} className="flex justify-between text-sm">
                      <span className="text-slate-700">{p.name}</span>
                      <span className="font-medium text-slate-900">{p.qty} units</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* AI Alerts */}
            <div className="mt-6">
              <h2 className="mb-3 font-semibold text-slate-900">AI Alerts — Pending Approval</h2>
              {summary.aiAlerts.length === 0 ? (
                <p className="text-sm text-slate-500">No pending alerts right now.</p>
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
          </>
        )}
      </div>
    </main>
  );
}