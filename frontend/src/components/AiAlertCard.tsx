'use client';

import { AiAlert } from '@/lib/types';

interface AiAlertCardProps {
  alert: AiAlert;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

const severityStyles: Record<string, string> = {
  HIGH: 'bg-red-50 border-red-200 text-red-700',
  MEDIUM: 'bg-amber-50 border-amber-200 text-amber-700',
  LOW: 'bg-slate-50 border-slate-200 text-slate-700',
};

export default function AiAlertCard({ alert, onAccept, onDecline }: AiAlertCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${
              severityStyles[alert.severity] || severityStyles.LOW
            }`}
          >
            {alert.severity} PRIORITY
          </span>
          <h3 className="mt-2 font-semibold text-slate-900">{alert.title}</h3>
          <p className="mt-1 text-sm text-slate-500">{alert.explanation}</p>
          <p className="mt-2 text-sm font-medium text-slate-700">{alert.suggestedAction}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onAccept(alert.id)}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Accept
        </button>
        <button
          onClick={() => onDecline(alert.id)}
          className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Decline
        </button>
        <button className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
          Modify Qty
        </button>
      </div>
    </div>
  );
}