import React from 'react';
import { Users, RefreshCw, Clock, TrendingUp, MoveRight } from "lucide-react";

export default function TelemetryCards() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="glass-panel rounded-lg p-6 relative overflow-hidden group hover:neon-border-cyan transition-all duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
          <Users className="text-primary-container w-10 h-10" />
        </div>
        <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">
          Total Players
        </h3>
        <div className="font-headline-lg text-headline-lg text-primary-container">
          142,890
        </div>
        <div className="flex items-center gap-2 mt-2 font-label-sm text-label-sm text-outline">
          <TrendingUp className="text-primary-fixed-dim w-4 h-4" /> +12.4% vs
          last cycle
        </div>
      </div>
      <div className="glass-panel rounded-lg p-6 relative overflow-hidden group hover:neon-border-purple transition-all duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
          <RefreshCw className="text-secondary w-10 h-10" />
        </div>
        <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">
          Retention Rate
        </h3>
        <div className="font-headline-lg text-headline-lg text-secondary">
          68.2%
        </div>
        <div className="flex items-center gap-2 mt-2 font-label-sm text-label-sm text-outline">
          <TrendingUp className="text-secondary w-4 h-4" /> +2.1% vs last cycle
        </div>
      </div>
      <div className="glass-panel rounded-lg p-6 relative overflow-hidden group hover:neon-border-cyan transition-all duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
          <Clock className="text-primary-container w-10 h-10" />
        </div>
        <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">
          Average Playtime
        </h3>
        <div className="font-headline-lg text-headline-lg text-on-surface">
          4h 12m
        </div>
        <div className="flex items-center gap-2 mt-2 font-label-sm text-label-sm text-outline">
          <MoveRight className="text-on-surface-variant w-4 h-4" /> Stable
          trajectory
        </div>
      </div>
    </section>
  );
}
