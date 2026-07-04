'use client';

import { useAuth } from '@/lib/authContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, token, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !token) {
      router.push('/login');
    }
  }, [loading, token, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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

        <p className="mt-6 text-slate-500">
          Full dashboard with charts, KPIs, and AI alerts coming in the next steps.
        </p>
      </div>
    </main>
  );
}