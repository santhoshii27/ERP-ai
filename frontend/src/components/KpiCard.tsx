interface KpiCardProps {
  label: string;
  value: string;
  accent?: 'blue' | 'green' | 'amber' | 'red';
}

const accentStyles = {
  blue: 'text-blue-600',
  green: 'text-emerald-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
};

export default function KpiCard({ label, value, accent = 'blue' }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accentStyles[accent]}`}>{value}</p>
    </div>
  );
}