import React from 'react';
import { 
  Circle, Activity, TrendingUp, CloudUpload, Gamepad2, 
  BarChart2, PenTool, Image as ImageIcon, Edit,
  Wrench, Landmark, FileText, Shield, Code
} from "lucide-react";

export default function Dashboard() {
  return (
    <main className="flex-1 w-full lg:ml-64 px-margin-mobile md:px-margin-desktop pb-8 md:pb-12 pt-28 md:pt-32 overflow-y-auto">
      {/* Dashboard Header */}
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="font-display-lg text-display-lg text-surface-tint mb-2">Command Center</h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Monitor active telemetry, manage build deployments, and analyze player engagement metrics across your published portfolio.
          </p>
        </div>
        <div className="hidden md:flex space-x-4">
          <span className="bg-[#121418] border border-surface-tint/30 text-surface-tint font-label-sm text-label-sm px-3 py-1 rounded-full flex items-center shadow-[0_0_10px_rgba(0,219,231,0.1)]">
            <Circle className="w-[14px] h-[14px] mr-1" fill="currentColor" /> SYSTEM ONLINE
          </span>
        </div>
      </header>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        
        {/* TOP SECTION: Metrics & Upload */}
        {/* Revenue & Downloads Chart Panel (Spans 8 cols) */}
        <div className="md:col-span-8 glass-panel rounded-xl p-6 flex flex-col relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-surface-tint opacity-5 blur-[100px] group-hover:opacity-10 transition-opacity"></div>
          
          <div className="flex justify-between items-start mb-6 z-10">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface flex items-center space-x-2">
                <Activity className="text-secondary w-6 h-6" />
                <span>Global Telemetry</span>
              </h2>
              <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Last 30 Days Activity</p>
            </div>
            <div className="flex space-x-2">
              <button className="bg-[#121418] border border-outline-variant text-on-surface font-label-sm text-label-sm px-3 py-1 rounded hover:border-surface-tint transition-colors">1W</button>
              <button className="bg-[#121418] border border-surface-tint text-surface-tint font-label-sm text-label-sm px-3 py-1 rounded neon-border-cyan">1M</button>
              <button className="bg-[#121418] border border-outline-variant text-on-surface font-label-sm text-label-sm px-3 py-1 rounded hover:border-surface-tint transition-colors">YTD</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8 z-10">
            <div className="bg-[#0A0C10] border border-outline-variant rounded-lg p-4">
              <span className="font-label-sm text-label-sm text-surface-tint block mb-1">Gross Revenue</span>
              <span className="font-headline-lg text-headline-lg-mobile text-on-surface">$14,285.00</span>
              <div className="text-xs text-green-400 mt-2 flex items-center">
                <TrendingUp className="w-[14px] h-[14px] mr-1" /> +12.4%
              </div>
            </div>
            <div className="bg-[#0A0C10] border border-outline-variant rounded-lg p-4">
              <span className="font-label-sm text-label-sm text-secondary block mb-1">Total Downloads</span>
              <span className="font-headline-lg text-headline-lg-mobile text-on-surface">8,402</span>
              <div className="text-xs text-green-400 mt-2 flex items-center">
                <TrendingUp className="w-[14px] h-[14px] mr-1" /> +5.2%
              </div>
            </div>
          </div>

          {/* Faux Chart Area */}
          <div className="flex-1 min-h-[200px] border-b border-l border-outline-variant/30 relative mt-auto z-10">
            {/* Y-axis labels */}
            <div className="absolute -left-8 top-0 bottom-0 flex flex-col justify-between text-[10px] font-label-sm text-on-surface-variant py-2">
              <span>15k</span>
              <span>10k</span>
              <span>5k</span>
              <span>0</span>
            </div>
            {/* X-axis labels */}
            <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-[10px] font-label-sm text-on-surface-variant px-2">
              <span>Oct 1</span>
              <span>Oct 15</span>
              <span>Oct 30</span>
            </div>
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between">
              <div className="w-full h-px bg-outline-variant/10"></div>
              <div className="w-full h-px bg-outline-variant/10"></div>
              <div className="w-full h-px bg-outline-variant/10"></div>
              <div className="w-full h-px bg-outline-variant/10"></div>
            </div>
            
            {/* Faux Line 1 (Cyan/Revenue) */}
            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path d="M0,80 Q20,70 40,50 T80,30 T100,20" fill="none" stroke="#00dbe7" strokeWidth="2" vectorEffect="non-scaling-stroke"></path>
              <path d="M0,80 Q20,70 40,50 T80,30 T100,20 L100,100 L0,100 Z" fill="url(#cyan-grad)" opacity="0.2"></path>
              <defs>
                <linearGradient id="cyan-grad" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#00dbe7"></stop>
                  <stop offset="100%" stopColor="transparent"></stop>
                </linearGradient>
              </defs>
            </svg>
            
            {/* Faux Line 2 (Purple/Downloads) */}
            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path d="M0,90 Q30,80 50,60 T90,40 T100,45" fill="none" stroke="#d1bcff" strokeWidth="2" vectorEffect="non-scaling-stroke"></path>
            </svg>
          </div>
        </div>

        {/* Upload Build Zone (Spans 4 cols) */}
        <div className="md:col-span-4 bg-[#121418] border border-outline-variant rounded-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-surface-tint transition-colors">
          <div className="absolute inset-0 scanline-overlay opacity-10 pointer-events-none"></div>
          
          <div className="w-20 h-20 rounded-full bg-[#0A0C10] border border-outline-variant flex items-center justify-center mb-6 group-hover:neon-border-cyan transition-all">
            <CloudUpload className="w-10 h-10 text-on-surface-variant group-hover:text-surface-tint transition-colors" />
          </div>
          
          <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Upload New Build</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-6 text-sm">
            Drag &amp; drop your .zip archive here, or browse files. Max size: 2GB.
          </p>
          
          <button className="bg-[#0A0C10] border border-surface-tint text-surface-tint font-label-sm text-label-sm px-6 py-3 rounded-lg hover:bg-surface-tint hover:text-[#0A0C10] transition-colors w-full uppercase tracking-wider">
            Select Archive
          </button>
        </div>

        {/* MIDDLE SECTION: My Games Portfolio */}
        <div className="md:col-span-12 mt-8 mb-4">
          <h2 className="font-headline-md text-headline-md text-on-surface flex items-center space-x-2 border-b border-white/10 pb-2">
            <Gamepad2 className="text-surface-tint w-6 h-6" />
            <span>Active Projects</span>
          </h2>
        </div>

        {/* Game Card 1 (Published) */}
        <div className="md:col-span-4 glass-card rounded-xl overflow-hidden flex flex-col relative group">
          <div className="h-32 bg-surface-variant relative overflow-hidden">
            <img 
              alt="Cyberpunk cityscape" 
              className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBF82gfcAH4C-c2w-hHJxoRDq4_vt6-k46E96W5_uYNdntiAwWVjJHOGMS9AeslNYJXRRZFj6wVp7ZqP5G4incCIdxcjGWeKauNK2YzKIam-maQNVXWqqLH-ZG-kNiPlKWNy6_SwuBumXbHaezUC-BKfOPGWpib5GmsxkrO-Dl3MG8h_CLgev9OZLr_OQ1wu20cRblQd2lrC0a-1PX7I-ojO4IQUBX-UT43k3FhM-iwaaoaT2Fbn1UGkxl9Zz-JBf5SGyS55z9l69T-" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#121418] to-transparent"></div>
            <div className="absolute top-3 right-3 bg-[#0A0C10] border border-green-500/50 text-green-400 font-label-sm text-[10px] px-2 py-1 rounded shadow-[0_0_5px_rgba(74,222,128,0.2)]">
              PUBLISHED
            </div>
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <h3 className="font-headline-md text-[18px] font-bold text-on-surface mb-1">Cyber Bloom</h3>
            <div className="flex space-x-2 mb-4">
              <span className="bg-[#0A0C10] border border-outline-variant text-on-surface-variant font-label-sm text-[10px] px-2 py-1 rounded">PC/MAC</span>
              <span className="bg-[#0A0C10] border border-outline-variant text-on-surface-variant font-label-sm text-[10px] px-2 py-1 rounded">V 1.4.2</span>
            </div>
            <div className="mt-auto grid grid-cols-2 gap-2">
              <button className="bg-[#121418] border border-outline-variant text-on-surface font-label-sm text-label-sm py-2 rounded hover:border-surface-tint hover:text-surface-tint transition-colors flex justify-center items-center space-x-1">
                <BarChart2 className="w-4 h-4" /> <span>Analytics</span>
              </button>
              <button className="bg-[#121418] border border-outline-variant text-on-surface font-label-sm text-label-sm py-2 rounded hover:border-secondary hover:text-secondary transition-colors flex justify-center items-center space-x-1">
                <PenTool className="w-4 h-4" /> <span>Manage</span>
              </button>
            </div>
          </div>
        </div>

        {/* Game Card 2 (Published) */}
        <div className="md:col-span-4 glass-card rounded-xl overflow-hidden flex flex-col relative group">
          <div className="h-32 bg-surface-variant relative overflow-hidden">
            <img 
              alt="Retro synthwave landscape" 
              className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAelpPfJlxfPjl4mQSFGrhQ9P3_u2wzzujByXTmnfJOJj2ZgirSrj7jTwLkCvJ7-SfXdHlTTCgfAUnUED_uBdslnTX8aoXcIGQGToecEbhk99EQbRA54SXVMGdUmkjohqylAUDrzLg2GnNNAvXH2nJ5UISqxYIyqxEAgy387rTcjk-gRQT5Jvr0zX8XHEy9J5m1FVTjYa-UmYogwBxV6_gyZ-jgNIPIeeI0uFeRtEXGr9pgW82H5x6_I6a0EOdJ4Z06ISTyl-pqhfDK" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#121418] to-transparent"></div>
            <div className="absolute top-3 right-3 bg-[#0A0C10] border border-green-500/50 text-green-400 font-label-sm text-[10px] px-2 py-1 rounded shadow-[0_0_5px_rgba(74,222,128,0.2)]">
              PUBLISHED
            </div>
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <h3 className="font-headline-md text-[18px] font-bold text-on-surface mb-1">Neon Drifter</h3>
            <div className="flex space-x-2 mb-4">
              <span className="bg-[#0A0C10] border border-outline-variant text-on-surface-variant font-label-sm text-[10px] px-2 py-1 rounded">PC</span>
              <span className="bg-[#0A0C10] border border-outline-variant text-on-surface-variant font-label-sm text-[10px] px-2 py-1 rounded">V 2.0.0</span>
            </div>
            <div className="mt-auto grid grid-cols-2 gap-2">
              <button className="bg-[#121418] border border-outline-variant text-on-surface font-label-sm text-label-sm py-2 rounded hover:border-surface-tint hover:text-surface-tint transition-colors flex justify-center items-center space-x-1">
                <BarChart2 className="w-4 h-4" /> <span>Analytics</span>
              </button>
              <button className="bg-[#121418] border border-outline-variant text-on-surface font-label-sm text-label-sm py-2 rounded hover:border-secondary hover:text-secondary transition-colors flex justify-center items-center space-x-1">
                <PenTool className="w-4 h-4" /> <span>Manage</span>
              </button>
            </div>
          </div>
        </div>

        {/* Game Card 3 (Draft) */}
        <div className="md:col-span-4 glass-card rounded-xl overflow-hidden flex flex-col relative group border-dashed border-outline-variant/50 hover:border-solid hover:border-surface-tint/50">
          <div className="h-32 bg-[#0A0C10] relative flex items-center justify-center overflow-hidden">
            <ImageIcon className="w-12 h-12 text-outline-variant/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#121418] to-transparent"></div>
            <div className="absolute top-3 right-3 bg-[#0A0C10] border border-yellow-500/50 text-yellow-500 font-label-sm text-[10px] px-2 py-1 rounded">
              DRAFT
            </div>
          </div>
          <div className="p-5 flex-1 flex flex-col">
            <h3 className="font-headline-md text-[18px] font-bold text-on-surface-variant mb-1">Student Quest</h3>
            <div className="flex space-x-2 mb-4">
              <span className="bg-[#0A0C10] border border-outline-variant text-on-surface-variant font-label-sm text-[10px] px-2 py-1 rounded">TBD</span>
              <span className="bg-[#0A0C10] border border-outline-variant text-on-surface-variant font-label-sm text-[10px] px-2 py-1 rounded">Pre-Alpha</span>
            </div>
            <div className="mt-auto">
              <button className="w-full bg-[#121418] border border-outline-variant text-on-surface font-label-sm text-label-sm py-2 rounded hover:border-surface-tint hover:text-surface-tint transition-colors flex justify-center items-center space-x-1">
                <Edit className="w-4 h-4" /> <span>Continue Setup</span>
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Quick Tools */}
        <div className="md:col-span-12 mt-8 mb-4">
          <h2 className="font-headline-md text-headline-md text-on-surface flex items-center space-x-2 border-b border-white/10 pb-2">
            <Wrench className="text-secondary w-6 h-6" />
            <span>Developer Tools</span>
          </h2>
        </div>

        {/* Tool Cards Row */}
        <div className="md:col-span-3 bg-[#121418] border border-outline-variant rounded-xl p-5 hover:bg-surface-variant/30 transition-colors cursor-pointer group">
          <div className="w-10 h-10 rounded bg-[#0A0C10] border border-outline-variant flex items-center justify-center mb-4 group-hover:border-surface-tint transition-colors">
            <Landmark className="text-surface-tint w-5 h-5" />
          </div>
          <h4 className="font-headline-md text-base font-bold text-on-surface mb-2">Revenue Hub</h4>
          <p className="font-body-md text-[12px] text-on-surface-variant line-clamp-2">Manage payouts, tax forms, and banking details.</p>
        </div>

        <div className="md:col-span-3 bg-[#121418] border border-outline-variant rounded-xl p-5 hover:bg-surface-variant/30 transition-colors cursor-pointer group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-secondary/20"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded bg-[#0A0C10] border border-outline-variant flex items-center justify-center group-hover:border-secondary transition-colors">
              <FileText className="text-secondary w-5 h-5" />
            </div>
            <span className="bg-secondary/10 text-secondary font-label-sm text-[9px] px-2 py-0.5 rounded border border-secondary/30">ELECTRONIC</span>
          </div>
          <h4 className="font-headline-md text-base font-bold text-on-surface mb-2">Contracts</h4>
          <p className="font-body-md text-[12px] text-on-surface-variant line-clamp-2">Review publishing agreements and NDAs.</p>
        </div>

        <div className="md:col-span-3 bg-[#121418] border border-outline-variant rounded-xl p-5 hover:bg-surface-variant/30 transition-colors cursor-pointer group">
          <div className="w-10 h-10 rounded bg-[#0A0C10] border border-outline-variant flex items-center justify-center mb-4 group-hover:border-surface-tint transition-colors">
            <Shield className="text-surface-tint w-5 h-5" />
          </div>
          <h4 className="font-headline-md text-base font-bold text-on-surface mb-2">Moderation</h4>
          <p className="font-body-md text-[12px] text-on-surface-variant line-clamp-2">Review user reports and manage community access.</p>
        </div>

        <div className="md:col-span-3 bg-[#121418] border border-outline-variant rounded-xl p-5 hover:bg-surface-variant/30 transition-colors cursor-pointer group">
          <div className="w-10 h-10 rounded bg-[#0A0C10] border border-outline-variant flex items-center justify-center mb-4 group-hover:border-secondary transition-colors">
            <Code className="text-secondary w-5 h-5" />
          </div>
          <h4 className="font-headline-md text-base font-bold text-on-surface mb-2">SDKs &amp; Docs</h4>
          <p className="font-body-md text-[12px] text-on-surface-variant line-clamp-2">Access INDIE_CORE integration libraries.</p>
        </div>

      </div>
    </main>
  );
}
