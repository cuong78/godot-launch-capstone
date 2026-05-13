import React from 'react';

export default function Hero() {
  return (
    <section className="relative w-full rounded-xl overflow-hidden glass-panel border border-white/10 shadow-[0_0_30px_rgba(112,0,255,0.2)] aspect-[16/9] md:aspect-[21/9] flex items-end">
      {/* Background Image */}
      <img alt="Featured Game" className="absolute inset-0 w-full h-full object-cover z-0" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC_XjYQg-9zJrGRyB-kOfcBFsHgykYpXlgCSBeykisnHw2sU1M1iUoxyAMLsNtJife6656pATKniS_lcz_I3bfNlX3gjfsyBBJ4w_4BpEcnkoEGg2FwoAQxR68E_JQ_C7zogbQlJpFVb5c_m7A9LHhwN_TtGmJon-iLEQ1-3ECRpRn7UzRAJdiT1wz-mU6Y2jiM2X5ik3QJAV7tBilOATStPhf5iuwsb1oOUlwc2KxYBWiDTqYhprQHaF3GUplB6OhavGnJzzjeqsF_"/>
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/50 to-transparent z-10"></div>
      {/* Content */}
      <div className="relative z-20 p-8 md:p-12 w-full md:w-2/3">
        <div className="flex gap-2 mb-4">
          <span className="font-label-sm text-label-sm text-surface-container-lowest bg-surface-tint px-2 py-1 rounded shadow-[0_0_10px_rgba(0,242,255,0.3)]">FEATURED</span>
          <span className="font-label-sm text-label-sm text-secondary bg-surface-container-highest px-2 py-1 rounded border border-white/10">GODOT ENGINE</span>
        </div>
        <h1 className="font-display-lg text-headline-lg-mobile md:text-display-lg text-white mb-2 shadow-black drop-shadow-lg">Neon Drifter</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mb-6 max-w-2xl drop-shadow-md">Experience high-speed atmospheric racing through the cyberpunk ruins of Neo-Kobe. Physics-defying drifts and synthwave beats await in this critically acclaimed Godot masterpiece.</p>
        <div className="flex flex-wrap gap-4">
          <button className="bg-surface-tint text-surface-container-lowest font-label-sm text-label-sm px-6 py-3 rounded-lg hover:shadow-[0_0_20px_rgba(0,242,255,0.5)] transition-all duration-300 active:scale-95 flex items-center gap-2 relative overflow-hidden group">
            <div className="absolute inset-0 scanline-overlay opacity-50"></div>
            <span className="material-symbols-outlined relative z-10" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
            <span className="relative z-10">PLAY NOW - $14.99</span>
          </button>
          <button className="bg-surface-container-highest/50 backdrop-blur border border-secondary text-secondary font-label-sm text-label-sm px-6 py-3 rounded-lg hover:bg-secondary/10 hover:shadow-[0_0_15px_rgba(209,188,255,0.3)] transition-all duration-300 active:scale-95 flex items-center gap-2">
            <span className="material-symbols-outlined">favorite</span>
            SUPPORT DEVELOPER
          </button>
        </div>
      </div>
      {/* Carousel Indicators */}
      <div className="absolute bottom-8 right-8 z-20 flex gap-2">
        <div className="w-8 h-1 bg-surface-tint rounded shadow-[0_0_10px_rgba(0,242,255,0.5)]"></div>
        <div className="w-4 h-1 bg-white/20 rounded hover:bg-white/50 transition-colors cursor-pointer"></div>
        <div className="w-4 h-1 bg-white/20 rounded hover:bg-white/50 transition-colors cursor-pointer"></div>
      </div>
    </section>
  );
}
