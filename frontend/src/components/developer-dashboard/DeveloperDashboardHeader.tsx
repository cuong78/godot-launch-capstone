import React from "react";
import { Upload } from "lucide-react";

interface DeveloperDashboardHeaderProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export const DeveloperDashboardHeader: React.FC<
  DeveloperDashboardHeaderProps
> = ({ title, description, actionLabel, onAction }) => (
  <header className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 dark:border-slate-800/80 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h1 className="font-display text-2xl font-semibold tracking-[-0.035em] text-slate-950 dark:text-slate-50 sm:text-[28px]">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
        {description}
      </p>
    </div>

    <button
      type="button"
      onClick={onAction}
      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-300/80 bg-amber-300 px-4 text-sm font-semibold text-slate-950 shadow-[0_8px_24px_rgba(245,158,11,0.12)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-amber-200 hover:bg-amber-200 hover:shadow-[0_10px_28px_rgba(245,158,11,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-px dark:border-amber-300/70 dark:bg-amber-300 dark:focus-visible:ring-offset-[#090d14]"
    >
      <Upload size={17} strokeWidth={2} aria-hidden="true" />
      {actionLabel}
    </button>
  </header>
);
