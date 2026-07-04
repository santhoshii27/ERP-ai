'use client';

import { useTheme } from '@/lib/themeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 backdrop-blur-md transition hover:bg-white dark:hover:bg-slate-800"
      aria-label="Toggle dark mode"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}