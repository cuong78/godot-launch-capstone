import React from 'react';
import { LineChart } from "lucide-react";

export default function ChartSection() {
  return (
    <section className="glass-panel rounded-lg p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-headline-md text-headline-md text-surface-tint flex items-center gap-3">
          <LineChart className="w-6 h-6" /> Daily Transmissions
        </h2>
        <div className="flex gap-4 font-label-sm text-label-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary-container shadow-[0_0_8px_#00f2ff]"></div>{" "}
            Downloads
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-secondary shadow-[0_0_8px_#d1bcff]"></div>{" "}
            Revenue
          </div>
        </div>
      </div>
      <div className="w-full h-72 relative bg-surface-container-lowest/50 rounded border border-white/5 flex items-end justify-between p-4 px-8 overflow-hidden">
        {/* Abstract Chart Representation */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>
        <svg
          className="absolute inset-0 w-full h-full drop-shadow-[0_0_10px_rgba(0,242,255,0.4)]"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <path
            d="M0,80 L10,75 L20,60 L30,65 L40,40 L50,45 L60,20 L70,30 L80,10 L90,20 L100,5"
            fill="none"
            stroke="#00f2ff"
            strokeWidth="0.5"
          ></path>
        </svg>
        <svg
          className="absolute inset-0 w-full h-full drop-shadow-[0_0_10px_rgba(112,0,255,0.4)]"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <path
            d="M0,90 L10,88 L20,80 L30,85 L40,70 L50,75 L60,50 L70,60 L80,40 L90,50 L100,30"
            fill="none"
            stroke="#d1bcff"
            strokeWidth="0.5"
          ></path>
        </svg>
        {/* X-axis labels */}
        <div className="absolute bottom-1 left-0 w-full flex justify-between px-8 text-on-surface-variant opacity-50 font-label-sm text-[10px]">
          <span>Day 1</span>
          <span>Day 10</span>
          <span>Day 20</span>
          <span>Day 30</span>
        </div>
      </div>
    </section>
  );
}
