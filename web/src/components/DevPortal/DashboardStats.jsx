import React from 'react';

export default function DashboardStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      <div className="bg-surface/60 backdrop-blur-lg border border-white/10 rounded-lg p-6">
        <div className="font-label-sm text-label-sm text-on-surface-variant mb-2">Total Active Users (24h)</div>
        <div className="font-headline-lg text-headline-lg-mobile text-primary-fixed-dim">12,408</div>
      </div>
      <div className="bg-surface/60 backdrop-blur-lg border border-white/10 rounded-lg p-6">
        <div className="font-label-sm text-label-sm text-on-surface-variant mb-2">Pending Revenue</div>
        <div className="font-headline-lg text-headline-lg-mobile text-secondary-fixed-dim">$4,290.50</div>
      </div>
      <div className="bg-surface/60 backdrop-blur-lg border border-white/10 rounded-lg p-6 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-2">
          <span className="font-label-sm text-label-sm text-on-surface-variant">Server Load (US-East)</span>
          <span className="font-label-sm text-label-sm text-surface-tint">Normal</span>
        </div>
        <div className="w-full bg-[#121418] h-2 rounded-full overflow-hidden">
          <div className="bg-surface-tint h-full w-[45%] shadow-[0_0_10px_rgba(0,242,255,0.5)]"></div>
        </div>
      </div>
    </div>
  );
}
