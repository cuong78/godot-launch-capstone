import React from 'react';
import { Landmark } from "lucide-react";

export default function RevenueTable() {
  return (
    <section className="glass-panel rounded-lg overflow-hidden border border-white/5">
      <div className="p-6 border-b border-white/5 bg-surface-container/50">
        <h2 className="font-headline-md text-headline-md text-secondary flex items-center gap-3">
          <Landmark className="w-6 h-6" /> Revenue Breakdown
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left font-body-md">
          <thead className="bg-surface-container-lowest font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            <tr>
              <th className="p-4 border-b border-white/5">Region/Source</th>
              <th className="p-4 border-b border-white/5 text-right">
                Gross Income
              </th>
              <th className="p-4 border-b border-white/5 text-right">
                Platform Split (15%)
              </th>
              <th className="p-4 border-b border-white/5 text-right text-primary-container">
                Developer Net (85%)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <tr className="hover:bg-surface-variant/20 transition-colors">
              <td className="p-4 font-label-sm text-on-surface">North America</td>
              <td className="p-4 text-right text-outline">$45,200.00</td>
              <td className="p-4 text-right text-error">-$6,780.00</td>
              <td className="p-4 text-right font-label-sm text-primary-container">
                $38,420.00
              </td>
            </tr>
            <tr className="hover:bg-surface-variant/20 transition-colors">
              <td className="p-4 font-label-sm text-on-surface">Europe</td>
              <td className="p-4 text-right text-outline">$28,450.00</td>
              <td className="p-4 text-right text-error">-$4,267.50</td>
              <td className="p-4 text-right font-label-sm text-primary-container">
                $24,182.50
              </td>
            </tr>
            <tr className="hover:bg-surface-variant/20 transition-colors">
              <td className="p-4 font-label-sm text-on-surface">Asia Pacific</td>
              <td className="p-4 text-right text-outline">$18,900.00</td>
              <td className="p-4 text-right text-error">-$2,835.00</td>
              <td className="p-4 text-right font-label-sm text-primary-container">
                $16,065.00
              </td>
            </tr>
          </tbody>
          <tfoot className="bg-surface-container-low font-headline-md text-sm border-t-2 border-primary-container/20">
            <tr>
              <td className="p-4 text-on-surface uppercase">
                Total Aggregated
              </td>
              <td className="p-4 text-right text-on-surface">$92,550.00</td>
              <td className="p-4 text-right text-error">-$13,882.50</td>
              <td className="p-4 text-right text-primary-fixed-dim">
                $78,667.50
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
