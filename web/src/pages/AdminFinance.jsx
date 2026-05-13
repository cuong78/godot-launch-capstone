import React from 'react';
import { Download, Plus, TrendingUp, Clock, CheckCircle, X } from 'lucide-react';

export default function AdminFinance() {
  return (
    <main className="flex-grow max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop pt-28 md:pt-32 pb-20">
      
      {/* Page Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant/20 pb-6">
        <div>
          <p className="font-label-sm text-label-sm text-primary-fixed-dim mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-fixed-dim animate-pulse shadow-[0_0_8px_rgba(0,219,231,0.8)]"></span>
            FINANCIAL TELEMETRY
          </p>
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
            Global Ledger
          </h1>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-secondary text-secondary rounded font-label-sm text-label-sm hover:bg-secondary/10 transition-colors flex items-center gap-2 backdrop-blur-md">
            <Download className="w-4 h-4" />
            EXPORT_CSV
          </button>
          <button className="px-4 py-2 bg-primary-fixed-dim text-on-primary-fixed rounded font-label-sm text-label-sm font-bold hover:bg-primary-fixed transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(0,219,231,0.3)]">
            <Plus className="w-4 h-4" />
            NEW_CONTRACT
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Metric Card 1 */}
        <div className="bg-surface-container/40 backdrop-blur-[12px] border border-outline-variant/30 rounded-xl p-6 relative overflow-hidden group hover:border-primary-fixed-dim/50 transition-colors duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-16 h-16 text-primary-fixed-dim" />
          </div>
          <h2 className="font-label-sm text-label-sm text-on-surface-variant mb-4 uppercase">Total Revenue (YTD)</h2>
          <div className="font-display-lg text-[48px] text-on-surface mb-2 font-black tracking-tight flex items-baseline gap-2">
            <span className="text-primary-fixed-dim font-body-md text-headline-md">$</span>2.48<span className="text-headline-md text-on-surface-variant">M</span>
          </div>
          <div className="flex items-center gap-2 font-label-sm text-label-sm text-primary-fixed-dim">
            <TrendingUp className="w-4 h-4 text-primary-fixed-dim" />
            +14.2% VS LAST CYCLE
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="bg-surface-container/40 backdrop-blur-[12px] border border-outline-variant/30 rounded-xl p-6 relative overflow-hidden group hover:border-secondary/50 transition-colors duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock className="w-16 h-16 text-secondary" />
          </div>
          <h2 className="font-label-sm text-label-sm text-on-surface-variant mb-4 uppercase">Pending Payouts</h2>
          <div className="font-display-lg text-[48px] text-on-surface mb-2 font-black tracking-tight flex items-baseline gap-2">
            <span className="text-secondary font-body-md text-headline-md">$</span>142<span className="text-headline-md text-on-surface-variant">K</span>
          </div>
          <div className="flex items-center gap-2 font-label-sm text-label-sm text-secondary">
            <Clock className="w-4 h-4 text-secondary" />
            AWAITING CLEARANCE
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="bg-surface-container/40 backdrop-blur-[12px] border border-outline-variant/30 rounded-xl p-6 relative overflow-hidden group hover:border-outline/50 transition-colors duration-300">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle className="w-16 h-16 text-on-surface" />
          </div>
          <h2 className="font-label-sm text-label-sm text-on-surface-variant mb-4 uppercase">Active Contracts</h2>
          <div className="font-display-lg text-[48px] text-on-surface mb-2 font-black tracking-tight">
            843
          </div>
          <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
            <CheckCircle className="w-4 h-4 text-on-surface-variant" />
            ACROSS 12 REGIONS
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-surface-container/30 backdrop-blur-xl border border-outline-variant/20 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-low/50">
          <h3 className="font-headline-md text-headline-md text-on-surface">Contractual Agreements</h3>
          <button className="text-primary-fixed-dim hover:text-primary transition-colors font-label-sm text-label-sm flex items-center gap-1">
            VIEW_ALL_RECORDS <span className="ml-1 text-lg leading-none">→</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-container/50 border-b border-outline-variant/20">
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest font-normal">Developer ID</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest font-normal">Project Asset</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest font-normal">Royalty Split</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest font-normal text-right">Net Yield</th>
                <th className="p-4 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest font-normal text-center">Status</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-body-md text-on-surface divide-y divide-outline-variant/10">
              {/* Row 1: Active */}
              <tr className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                <td className="p-4 font-label-sm text-label-sm text-tertiary-fixed-dim">DEV_X902A</td>
                <td className="p-4 font-headline-md text-[16px] text-on-surface">Neon Drift Syndicate</td>
                <td className="p-4">
                  <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-1 overflow-hidden flex">
                    <div className="bg-primary-fixed-dim h-full w-[70%]"></div>
                    <div className="bg-surface-variant h-full w-[30%]"></div>
                  </div>
                  <div className="flex justify-between mt-1 font-label-sm text-[10px] text-on-surface-variant">
                    <span>DEV: 70%</span>
                    <span>SYS: 30%</span>
                  </div>
                </td>
                <td className="p-4 text-right font-label-sm text-label-sm text-on-surface">$12,450.00</td>
                <td className="p-4 text-center">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 text-primary-fixed-dim font-label-sm text-[10px] uppercase shadow-[0_0_8px_rgba(0,219,231,0.2)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed-dim animate-pulse"></span> Active
                  </span>
                </td>
              </tr>

              {/* Row 2: Pending */}
              <tr className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                <td className="p-4 font-label-sm text-label-sm text-tertiary-fixed-dim">DEV_M334Z</td>
                <td className="p-4 font-headline-md text-[16px] text-on-surface">Void Walker Protocol</td>
                <td className="p-4">
                  <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-1 overflow-hidden flex">
                    <div className="bg-secondary h-full w-[85%]"></div>
                    <div className="bg-surface-variant h-full w-[15%]"></div>
                  </div>
                  <div className="flex justify-between mt-1 font-label-sm text-[10px] text-on-surface-variant">
                    <span>DEV: 85%</span>
                    <span>SYS: 15%</span>
                  </div>
                </td>
                <td className="p-4 text-right font-label-sm text-label-sm text-on-surface-variant">--</td>
                <td className="p-4 text-center">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-secondary/30 bg-secondary/10 text-secondary font-label-sm text-[10px] uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Pending
                  </span>
                </td>
              </tr>

              {/* Row 3: Active */}
              <tr className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                <td className="p-4 font-label-sm text-label-sm text-tertiary-fixed-dim">DEV_L112B</td>
                <td className="p-4 font-headline-md text-[16px] text-on-surface">Crimson Sector</td>
                <td className="p-4">
                  <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-1 overflow-hidden flex">
                    <div className="bg-primary-fixed-dim h-full w-[60%]"></div>
                    <div className="bg-surface-variant h-full w-[40%]"></div>
                  </div>
                  <div className="flex justify-between mt-1 font-label-sm text-[10px] text-on-surface-variant">
                    <span>DEV: 60%</span>
                    <span>SYS: 40%</span>
                  </div>
                </td>
                <td className="p-4 text-right font-label-sm text-label-sm text-on-surface">$8,920.50</td>
                <td className="p-4 text-center">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 text-primary-fixed-dim font-label-sm text-[10px] uppercase shadow-[0_0_8px_rgba(0,219,231,0.2)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed-dim animate-pulse"></span> Active
                  </span>
                </td>
              </tr>

              {/* Row 4: Void */}
              <tr className="hover:bg-white/[0.02] transition-colors group cursor-pointer opacity-60">
                <td className="p-4 font-label-sm text-label-sm text-tertiary-fixed-dim">DEV_E999Q</td>
                <td className="p-4 font-headline-md text-[16px] text-on-surface-variant line-through decoration-error/50">Project: Echoes</td>
                <td className="p-4">
                  <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-1 overflow-hidden flex">
                    <div className="bg-error h-full w-[0%]"></div>
                    <div className="bg-surface-variant h-full w-[100%]"></div>
                  </div>
                  <div className="flex justify-between mt-1 font-label-sm text-[10px] text-on-surface-variant">
                    <span>N/A</span>
                  </div>
                </td>
                <td className="p-4 text-right font-label-sm text-label-sm text-error/70">$0.00</td>
                <td className="p-4 text-center">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-error/30 bg-error/10 text-error font-label-sm text-[10px] uppercase">
                    <X className="w-3 h-3" /> Void
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
    </main>
  );
}
