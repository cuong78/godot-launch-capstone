import React from 'react';
import { useTranslation } from 'react-i18next';

export interface AdminSidebarNavItem {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
}

interface AdminSidebarNavProps {
  items: AdminSidebarNavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}

export const AdminSidebarNav: React.FC<AdminSidebarNavProps> = ({
  items,
  activeKey,
  onSelect,
}) => {
  const { t } = useTranslation(['admin']);

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 text-slate-900 shadow-[0_22px_52px_rgba(148,163,184,0.16)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/92 dark:text-slate-100 dark:shadow-[0_24px_80px_rgba(2,6,23,0.45)]">
      <nav className="px-3 py-4">
        <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500/90 dark:text-slate-500">
          {t('nav.navigation')}
        </div>
        <div className="space-y-1.5">
          {items.map((item) => {
            const isActive = item.key === activeKey;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelect(item.key)}
                className={`flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ${
                  isActive
                    ? 'border-emerald-500/24 bg-emerald-500/12 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:border-sky-400/40 dark:bg-sky-400/14 dark:text-white dark:shadow-[0_14px_36px_rgba(14,165,233,0.18)]'
                    : 'border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:border-slate-800 dark:hover:bg-slate-900/90 dark:hover:text-white'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    isActive
                      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-700 dark:border-sky-300/35 dark:bg-sky-300/16 dark:text-sky-100'
                      : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400'
                  }`}
                >
                  {item.icon}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-200">
                        {item.badge}
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
