'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { SalesTrendsResponse, CategoryRow, CustomerInsights } from '@/lib/types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

function formatInr(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export default function AnalyticsPage() {
  const { user, token, access, loading } = useAuth();
  const router = useRouter();

  const [trends, setTrends] = useState<SalesTrendsResponse | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [customerInsights, setCustomerInsights] = useState<CustomerInsights | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login');
    }
  }, [loading, token, router]);

  useEffect(() => {
    if (!loading && access && !access.analytics) {
      router.push('/dashboard');
    }
  }, [loading, access, router]);

  useEffect(() => {
    if (!token) return;

    async function loadAll() {
      try {
        const [trendsData, categoryData, customerData] = await Promise.all([
          apiRequest<SalesTrendsResponse>('/analytics/sales-trends', { token }),
          apiRequest<{ rows: CategoryRow[] }>('/analytics/category-breakdown', { token }),
          apiRequest<CustomerInsights>('/analytics/customer-insights', { token }),
        ]);
        setTrends(trendsData);
        setCategories(categoryData.rows);
        setCustomerInsights(customerData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      }
    }

    loadAll();
  }, [token]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading...</p>
      </main>
    );
  }

  // Combine historical + forecast for the chart, marking where forecast begins
  const combinedTrend = trends
    ? [
        ...trends.dailyTrend.slice(-30).map((d) => ({ ...d, actual: d.revenue, predicted: null })),
        ...trends.forecast.map((d) => ({ ...d, actual: null, predicted: d.revenue })),
      ]
    : [];

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Analytics & Forecasting</h1>
            <p className="mt-1 text-sm text-slate-500">
              Sales trends, demand forecast, category performance, and customer insights.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        {/* Sales trend + 7-day forecast */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Sales Trend (Last 30 Days) + 7-Day Forecast</h2>
          <p className="mt-1 text-xs text-slate-400">
            Solid line: actual revenue. Dashed line: statistical forecast for the next 7 days.
          </p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => formatInr(value)} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual Revenue"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  name="Forecast"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category breakdown + weekly seasonality */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Revenue by Category</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="revenue"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry) => entry.category}
                  >
                    {categories.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatInr(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Weekly Revenue (Seasonality)</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends?.weeklyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => formatInr(value)} />
                  <Bar dataKey="revenue" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Customer insights */}
        {customerInsights && (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">Top Customers by Spend</h2>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="pb-2">Customer</th>
                    <th className="pb-2 text-right">Orders</th>
                    <th className="pb-2 text-right">Total Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {customerInsights.topCustomers.map((c) => (
                    <tr key={c.name} className="border-t border-slate-100">
                      <td className="py-2 text-slate-900">{c.name}</td>
                      <td className="py-2 text-right text-slate-600">{c.orderCount}</td>
                      <td className="py-2 text-right font-medium text-slate-900">
                        {formatInr(c.totalSpend)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Total Active Customers</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {customerInsights.totalActiveCustomers}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Repeat Customers</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-600">
                  {customerInsights.repeatCustomers}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">One-Time Customers</p>
                <p className="mt-1 text-2xl font-semibold text-amber-600">
                  {customerInsights.oneTimeCustomers}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}