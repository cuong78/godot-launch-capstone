import React from 'react';

interface AdminTopBarProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const AdminTopBar: React.FC<AdminTopBarProps> = ({
  eyebrow,
  title,
  action,
}) => {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 px-5 py-5 text-slate-900 shadow-[0_20px_70px_rgba(148,163,184,0.16)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/90 dark:text-slate-100 dark:shadow-[0_20px_70px_rgba(2,6,23,0.4)] sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-600 dark:text-sky-200/80">
            {eyebrow}
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold text-slate-950 dark:text-white sm:text-[30px]">
            {title}
          </h2>
        </div>

        {action ? (
          <div className="shrink-0">
            {action}
          </div>
        ) : null}
      </div>
    </div>
  );
};
