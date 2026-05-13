import React from 'react';
import ChartSection from '../components/DevPortal/Analytics/ChartSection';
import RevenueTable from '../components/DevPortal/Analytics/RevenueTable';
import TelemetryCards from '../components/DevPortal/Analytics/TelemetryCards';

export default function Analytics() {
  return (
    <main className="flex-1 w-full lg:ml-64 px-margin-mobile md:px-margin-desktop pb-8 md:pb-12 pt-28 md:pt-32 overflow-y-auto">
      <div className="max-w-container-max mx-auto space-y-8">
        <header className="flex justify-between items-end mb-12 border-b border-white/5 pb-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-surface-tint">
              Telemetry <span className="text-secondary opacity-50">&</span>{" "}
              Finance
            </h1>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-2 tracking-widest uppercase">
              System Analytics // Last 30 Days
            </p>
          </div>
          <div className="hidden md:flex gap-2">
            <span className="px-3 py-1 bg-surface-container text-primary-fixed-dim font-label-sm text-label-sm rounded border border-primary-container/30">
              Live Data
            </span>
            <span className="px-3 py-1 bg-surface-container text-on-surface-variant font-label-sm text-label-sm rounded border border-white/5">
              Global Region
            </span>
          </div>
        </header>

        <TelemetryCards />
        <ChartSection />
        <RevenueTable />
      </div>
    </main>
  );
}
