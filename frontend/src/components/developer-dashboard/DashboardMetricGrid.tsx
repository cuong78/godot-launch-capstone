import React from "react";
import type { LucideIcon } from "lucide-react";

export interface DashboardMetric {
  id: string;
  label: string;
  value: React.ReactNode;
  hint: string;
  icon: LucideIcon;
  primary?: boolean;
  loading?: boolean;
}

interface DashboardMetricGridProps {
  metrics: DashboardMetric[];
}

export const DashboardMetricGrid: React.FC<DashboardMetricGridProps> = ({
  metrics,
}) => (
  <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-200/80 shadow-[0_12px_35px_rgba(15,23,42,0.05)] dark:border-slate-800/80 dark:bg-slate-800/80 dark:shadow-[0_18px_48px_rgba(0,0,0,0.18)] sm:grid-cols-2 xl:grid-cols-[1.25fr_repeat(3,minmax(0,1fr))]">
    {metrics.map((metric) => {
      const Icon = metric.icon;
      return (
        <div
          key={metric.id}
          className={`min-w-0 bg-white px-5 py-5 dark:bg-[#101720] ${
            metric.primary ? "xl:px-6" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {metric.label}
            </dt>
            <Icon
              size={17}
              strokeWidth={1.8}
              className="shrink-0 text-slate-400 dark:text-slate-600"
              aria-hidden="true"
            />
          </div>

          {metric.loading ? (
            <div className="mt-4 h-8 w-28 animate-pulse rounded-md bg-slate-200 dark:bg-slate-800" />
          ) : (
            <dd
              className={`mt-3 truncate font-display font-semibold tracking-[-0.035em] text-slate-950 dark:text-white ${
                metric.primary ? "text-[30px]" : "text-[28px]"
              }`}
            >
              {metric.value}
            </dd>
          )}

          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-500">
            {metric.hint}
          </p>
        </div>
      );
    })}
  </dl>
);
