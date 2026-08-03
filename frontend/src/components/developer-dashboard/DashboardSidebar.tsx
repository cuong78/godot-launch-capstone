import React from "react";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type DashboardWorkspaceId =
  | "my-games"
  | "marketplace-items"
  | "sales"
  | "payment-center";

export interface DashboardWorkspaceItem {
  id: DashboardWorkspaceId;
  label: string;
  count: number;
  icon: LucideIcon;
}

interface DashboardSidebarProps {
  activeWorkspace: DashboardWorkspaceId;
  items: DashboardWorkspaceItem[];
  navigationLabel: string;
  mobileLabel: string;
  onChange: (workspace: DashboardWorkspaceId) => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeWorkspace,
  items,
  navigationLabel,
  mobileLabel,
  onChange,
}) => (
  <>
    <div className="border-b border-slate-200/80 p-3 dark:border-slate-800/80 md:hidden">
      <label className="sr-only" htmlFor="developer-workspace-select">
        {mobileLabel}
      </label>
      <div className="relative">
        <select
          id="developer-workspace-select"
          value={activeWorkspace}
          onChange={(event) =>
            onChange(event.target.value as DashboardWorkspaceId)
          }
          className="min-h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pr-11 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-100"
        >
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} ({item.count})
            </option>
          ))}
        </select>
        <ChevronDown
          size={17}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
          aria-hidden="true"
        />
      </div>
    </div>

    <aside className="hidden min-h-[420px] border-r border-slate-200/80 bg-slate-50/70 px-2 py-4 dark:border-slate-800/80 dark:bg-[#0c121a] md:block lg:px-3">
      <p className="hidden px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-600 lg:block">
        {navigationLabel}
      </p>
      <nav aria-label={navigationLabel}>
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeWorkspace;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onChange(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={`${item.label} (${item.count})`}
                  title={`${item.label} (${item.count})`}
                  className={`group relative flex min-h-12 w-full items-center rounded-xl px-3 text-left text-sm transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 ${
                    isActive
                      ? "bg-sky-500/10 font-semibold text-sky-700 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.12)] dark:bg-sky-400/10 dark:text-sky-300 dark:shadow-[inset_0_0_0_1px_rgba(56,189,248,0.12)]"
                      : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100"
                  }`}
                >
                  {isActive && (
                    <span className="absolute inset-y-3 left-0 w-0.5 rounded-r-full bg-sky-500 dark:bg-sky-400" />
                  )}
                  <Icon
                    size={18}
                    strokeWidth={isActive ? 2.1 : 1.8}
                    className="shrink-0 md:mx-auto lg:mx-0"
                    aria-hidden="true"
                  />
                  <span className="ml-3 hidden min-w-0 flex-1 truncate lg:block">
                    {item.label}
                  </span>
                  <span
                    className={`ml-3 hidden min-w-6 rounded-md px-1.5 py-0.5 text-center font-mono text-[11px] tabular-nums lg:inline-flex lg:justify-center ${
                      isActive
                        ? "bg-sky-500/12 text-sky-700 dark:text-sky-300"
                        : "bg-slate-200/80 text-slate-500 dark:bg-slate-800 dark:text-slate-500"
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  </>
);
