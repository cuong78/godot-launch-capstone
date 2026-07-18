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
  title: string;
  subtitle: string;
  items: AdminSidebarNavItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  footer?: React.ReactNode;
}

export const AdminSidebarNav: React.FC<AdminSidebarNavProps> = ({
  title,
  items,
  activeKey,
  onSelect,
  footer,
}) => {
  const { t } = useTranslation(['admin']);

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#0d1713] bg-[linear-gradient(180deg,#08110d_0%,#0b1510_100%)] text-slate-100 shadow-[0_22px_52px_rgba(15,23,42,0.22)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/92 dark:shadow-[0_24px_80px_rgba(2,6,23,0.45)]">
      <div className="border-b border-white/8 px-5 py-5 dark:border-slate-800/80">
        <div className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-200 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200">
          {t('nav.adminOnlySurface')}
        </div>
        <div className="mt-4">
          <h1 className="font-display text-xl font-bold text-white">{title}</h1>
        </div>
      </div>

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
                    ? 'border-emerald-500/24 bg-emerald-500/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:border-sky-400/40 dark:bg-sky-400/14 dark:shadow-[0_14px_36px_rgba(14,165,233,0.18)]'
                    : 'border-transparent bg-transparent text-slate-300 hover:border-white/6 hover:bg-white/[0.04] hover:text-white dark:hover:border-slate-800 dark:hover:bg-slate-900/90'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                    isActive
                      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100 dark:border-sky-300/35 dark:bg-sky-300/16 dark:text-sky-100'
                      : 'border-white/8 bg-white/[0.03] text-slate-400 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400'
                  }`}
                >
                  {item.icon}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-200">
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

      {footer ? (
        <div className="border-t border-white/8 px-4 py-4 dark:border-slate-800/80">
          {footer}
        </div>
      ) : null}
    </div>
  );
};
