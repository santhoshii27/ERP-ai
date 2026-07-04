interface KpiCardProps {
  label: string;
  value: string;
  accent?: 'blue' | 'green' | 'amber' | 'red';
}

const accentStyles = {
  blue: 'text-blue-600 dark:text-blue-400',
  green: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red: 'text-red-600 dark:text-red-400',
};

export default function KpiCard({ label, value, accent = 'blue' }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm transition hover:shadow-lg hover:-translate-y-0.5 duration-200">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${accentStyles[accent]}`}>{value}</p>
    </div>
  );
}