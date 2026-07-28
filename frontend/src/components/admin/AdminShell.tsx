import React from 'react';
import { IMAGE_SEED_MAP } from '../../../assets/images';

interface AdminShellProps {
  sidebar: React.ReactNode;
  topbar: React.ReactNode;
  children: React.ReactNode;
}

export const AdminShell: React.FC<AdminShellProps> = ({
  sidebar,
  topbar,
  children,
}) => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4f6fb] dark:bg-slate-950">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,246,251,0.98)_100%)] dark:hidden"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.08),transparent_20%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.06),transparent_18%),radial-gradient(circle_at_bottom_left,rgba(148,163,184,0.08),transparent_28%)] dark:hidden"
      />
      <div
        className="pointer-events-none absolute inset-0 hidden scale-[1.03] bg-cover bg-center bg-no-repeat opacity-[0.38] blur-[2px] dark:block"
        style={{ backgroundImage: `url(${IMAGE_SEED_MAP.forest})` }}
      />
      <div className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(180deg,rgba(2,6,23,0.94)_0%,rgba(2,6,23,0.88)_16%,rgba(4,10,18,0.82)_42%,rgba(4,10,18,0.86)_100%)] dark:block" />
      <div className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(163,230,53,0.08),transparent_24%)] dark:block" />

      <div className="relative z-10 w-full px-4 py-4 sm:px-6 lg:px-8">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 rounded-[34px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(248,250,252,0.98)_100%)] shadow-[0_24px_80px_rgba(148,163,184,0.16)] backdrop-blur-md dark:hidden" />
          <div className="pointer-events-none absolute inset-0 rounded-[34px] bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.05),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.04),transparent_24%)] dark:hidden" />
          <div className="pointer-events-none absolute inset-0 hidden rounded-[34px] border border-slate-800/70 bg-[linear-gradient(180deg,rgba(7,13,24,0.78)_0%,rgba(8,14,28,0.7)_100%)] shadow-[0_24px_90px_rgba(2,6,23,0.42)] backdrop-blur-md dark:block" />
          <div className="pointer-events-none absolute inset-0 hidden rounded-[34px] bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.08),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(163,230,53,0.06),transparent_28%)] dark:block" />

          <div className="relative rounded-[34px] p-5 sm:p-6 lg:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:gap-6">
              <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:w-[288px] lg:self-start">
                {sidebar}
              </aside>

              <div className="min-w-0 flex-1 space-y-5">
                {topbar}
                <div>{children}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
