'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { apiRequest, downloadReport } from '@/lib/api';

function formatInr(value: number) {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

type ReportType = 'sales' | 'gst' | 'inventory';

export default function ReportsPage() {
  const { user, token, access, loading } = useAuth();
  const router = useRouter();

  const [reportType, setReportType] = useState<ReportType>('sales');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login');
    }
  }, [loading, token, router]);

  useEffect(() => {
    if (!loading && access && !access.reports) {
      router.push('/dashboard');
    }
  }, [loading, access, router]);

  const loadReport = useCallback(async () => {
    if (!token) return;
    setIsFetching(true);
    setError('');

    try {
      const data = await apiRequest<{ rows: Record<string, unknown>[]; summary?: Record<string, unknown> }>(
        `/reports/${reportType}`,
        { token }
      );
      setRows(data.rows);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setIsFetching(false);
    }
  }, [token, reportType]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  async function handleExport(format: 'csv' | 'excel' | 'pdf') {
    if (!token) return;
    try {
      await downloadReport(reportType, format, token);
    } catch {
      setError('Export failed');
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </main>
    );
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">Reports</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Sales, GST, and inventory reports — exportable to PDF, Excel, or CSV.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Report type tabs */}
        <div className="mt-6 flex gap-2">
          {(['sales', 'gst', 'inventory'] as ReportType[]).map((t) => (
            <button
              key={t}
              onClick={() => setReportType(t)}
              className={`rounded-xl px-4 py-2 text-sm font-medium capitalize ${
                reportType === t
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t} Report
            </button>
          ))}
        </div>

        {/* Export buttons */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Export Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Export PDF
          </button>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
            {Object.entries(summary).map(([key, value]) => (
              <div key={key} className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-4 shadow-sm">
                <p className="text-xs font-medium capitalize text-slate-500 dark:text-slate-400">
                  {key.replace(/([A-Z])/g, ' $1')}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
                  {typeof value === 'number' && (key.toLowerCase().includes('revenue') || key.toLowerCase().includes('gst') || key.toLowerCase().includes('value'))
                    ? formatInr(value)
                    : String(value)}
                </p>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {/* Data table */}
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <tr className="text-left text-slate-500 dark:text-slate-400">
                {columns.map((col) => (
                  <th key={col} className="whitespace-nowrap px-4 py-3 capitalize">
                    {col.replace(/([A-Z])/g, ' $1')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isFetching ? (
                <tr>
                  <td colSpan={columns.length || 1} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length || 1} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    No data available.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    {columns.map((col) => (
                      <td key={col} className="whitespace-nowrap px-4 py-2.5 text-slate-900 dark:text-white">
                        {String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}