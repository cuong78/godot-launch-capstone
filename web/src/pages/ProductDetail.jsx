import React from 'react';
import { Play, Terminal, ArrowRight, MessageSquare, Star, Wallet } from 'lucide-react';

export default function ProductDetail() {
  return (
    <main className="relative z-10 pt-32 pb-24 px-margin-mobile md:px-margin-desktop w-full max-w-container-max mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="relative w-full aspect-video bg-surface-container-highest rounded-lg overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] group cursor-pointer">
            <img alt="Trailer Thumbnail" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvOZFrlEJM0KYkM_N5u6MN2XnWA1KigB-8Yp72rT8ICRelTh7CUnfcVWzXFxsBg1nhApw0HtGGniIahNvXSrYWo4_dyh6KSST0RYnDmAJhKaq8jO_0dLbp5Y7c9rr7iKRUT2Z1BH5_hXFSQw_7KKuietx_qmdtHmJsCD0HBzen1b6-EHJ3lyIw7nWsdtjcnfvCHKa0JDSXyVVtW67K4T_y4u7m2-_Yk3vqd_qBBosp8vxL2j7M2sfUrzmVXMw76DpGBZnmgreqdT9O"/>
            <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/80 via-transparent to-transparent"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-surface-container-lowest/50 backdrop-blur-md border border-primary-container/50 flex items-center justify-center text-primary-container group-hover:bg-primary-container group-hover:text-surface-container-lowest transition-all duration-300 shadow-[0_0_20px_rgba(0,242,255,0.3)]">
                <Play className="w-10 h-10 ml-1" fill="currentColor" />
              </div>
            </div>
          </div>

          <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
            <div className="flex-none w-64 md:w-80 aspect-video rounded bg-surface-container overflow-hidden border border-white/10 hover:border-primary-container transition-colors snap-start cursor-pointer">
              <img alt="Gameplay Screenshot 1" className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDd9T5rxBBJ8TYCq9bebE-_cgujbYa9AxrtkvJseRP9G4q3888FK3U-JYq32bgMa-fXz5myAJHXnrqcmCtUSZ--WTvXIOhLp3Vd-2pyZ5TDo8boibt6_L_wPphqbWPmh11on5ijWfYvTtUzYlfutTKkwVqc-ERvQ1WN-C4W11MIAccTZsc1Nf1HtqdxRlGi65DakXEKJ4yfscZknZPcJqPKXEOQVLX4mHY5WnJFjEnee8gid66tBtu_dveILTSfwA04aWq19jjjkOw2"/>
            </div>
            <div className="flex-none w-64 md:w-80 aspect-video rounded bg-surface-container overflow-hidden border border-white/10 hover:border-primary-container transition-colors snap-start cursor-pointer">
              <img alt="Gameplay Screenshot 2" className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQ6SEEYRjNVe0KuwkEgAXtqyPPwHTupCzMDyphSDZWiPqSkXEqCEyA5ywsPmGBmYCYqwjf5BFo9hA-PgRaPByZxi5f23u4nQCOS6CzqbmUE0rBgrMktgDZcX297capI1Z41X9kt-ufL-oBoZuDi3GAN3pUvIJunaM2azhz-6mYZbRxyK0SDmigkm16zhCKsKTddnI_n6fsyN3ywHDvc9tYElaJSCeveeKD5DkPOtFTK-m9meEOtCi2JncQJmhnCsbsHt26HBH0iCja"/>
            </div>
            <div className="flex-none w-64 md:w-80 aspect-video rounded bg-surface-container overflow-hidden border border-white/10 hover:border-primary-container transition-colors snap-start cursor-pointer">
              <img alt="Gameplay Screenshot 3" className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBWR0UPoMkrux7vA53kEnPeKw3Lv_fhovuAq2dcv2ji2-HEz22EbHp-FJZWZEgyaodSeW6byI0ney8tBPSeKtb2oNqaviMwrVsGkRZBrahW6dSt_nBwvS9XVWR9_PT2VAmF9lya-fEoroPCyNzsM4hTTu2UEEgoANL8mfSDScN0MXp_Y46IvfJkdJ7Jc77zOf7B2yo7mTmVNEU-x_RbshAOmVyP18NA8vBy3-rRxPBRNYovNe-r1BbJ7d4YZl_uiNHaaHJIXMzVJxYC"/>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <section className="flex flex-col gap-4">
              <h2 className="font-headline-md text-headline-md text-surface-tint flex items-center gap-2">
                <Terminal className="w-6 h-6" /> Developer Logs
              </h2>
              <div className="bg-surface-container-lowest/60 backdrop-blur-xl border border-white/5 rounded-xl p-6 flex flex-col gap-4 hover:border-white/10 transition-colors">
                <div className="flex justify-between items-start border-b border-white/5 pb-4">
                  <div>
                    <h3 className="font-label-sm text-label-sm text-primary-fixed uppercase tracking-wider mb-1">Patch v1.2.4 Deployed</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant text-sm">Physics Engine Overhaul & New Tracks</p>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant opacity-60">2d ago</span>
                </div>
                <p className="font-body-md text-body-md text-on-surface opacity-80 leading-relaxed text-sm">
                  "Command center, we've successfully integrated the Godot 4.2 physics updates. Drift mechanics should feel 20% more responsive. We've also unlocked the 'Neon Sector 4' track for all beta testers. Keep pushing the limits."
                </p>
                <button className="self-start mt-2 font-label-sm text-label-sm text-primary-container hover:text-primary-fixed flex items-center gap-1 transition-colors">
                  Read Full Log <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="font-headline-md text-headline-md text-surface-tint flex items-center gap-2">
                <MessageSquare className="w-6 h-6" /> Signal Intercepts
              </h2>
              <div className="bg-surface-container-lowest/60 backdrop-blur-xl border border-white/5 rounded-xl p-6 flex flex-col gap-4 hover:border-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-surface-container border border-primary-container/30 flex items-center justify-center text-primary-container font-headline-md">
                    V
                  </div>
                  <div>
                    <div className="font-label-sm text-label-sm text-on-surface">VoidRunner_99</div>
                    <div className="flex text-primary-container text-[12px] gap-[2px] mt-1">
                      <Star className="w-3.5 h-3.5" fill="currentColor" />
                      <Star className="w-3.5 h-3.5" fill="currentColor" />
                      <Star className="w-3.5 h-3.5" fill="currentColor" />
                      <Star className="w-3.5 h-3.5" fill="currentColor" />
                      <Star className="w-3.5 h-3.5" fill="currentColor" />
                    </div>
                  </div>
                </div>
                <p className="font-body-md text-body-md text-on-surface opacity-80 leading-relaxed text-sm italic">
                  "Absolutely flawless execution of the cyberpunk aesthetic. The sense of speed is unmatched. Buying into the beta was the best decision this cycle. The dev team is highly responsive."
                </p>
              </div>
            </section>
          </div>
        </div>

        <div className="lg:col-span-4 relative">
          <div className="sticky top-32 flex flex-col gap-6">
            <div className="bg-surface-container-lowest/80 backdrop-blur-2xl border border-white/10 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)]">
              <div className="h-32 bg-surface-container relative flex items-center justify-center border-b border-white/5 overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-container via-surface-container-lowest to-surface-container-lowest pointer-events-none"></div>
                <h1 className="font-display-lg text-headline-lg-mobile md:text-[42px] text-on-surface tracking-tighter uppercase relative z-10 drop-shadow-[0_0_10px_rgba(0,242,255,0.5)]">
                  Neon <span className="text-primary-container">Drifter</span>
                </h1>
              </div>
              <div className="p-6 flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <div className="font-display-lg text-[32px] text-primary-container tracking-tight">
                    $14.99
                  </div>
                  <button className="w-full bg-primary-container text-surface-container-lowest font-label-sm text-label-sm uppercase tracking-widest py-4 rounded hover:bg-primary-fixed transition-all shadow-[0_0_15px_rgba(0,242,255,0.2)] hover:shadow-[0_0_25px_rgba(0,242,255,0.5)] active:scale-[0.98] relative overflow-hidden group">
                    <span className="relative z-10 font-bold">Acquire License</span>
                    <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
                  </button>
                  <button className="w-full bg-transparent text-secondary border border-secondary font-label-sm text-label-sm uppercase tracking-widest py-3 rounded hover:bg-secondary/10 transition-all active:scale-[0.98]">
                    Add to Wishlist
                  </button>
                </div>
                
                <hr className="border-white/5"/>
                
                <div className="flex flex-col gap-3 font-body-md text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant font-label-sm text-label-sm uppercase">Developer</span>
                    <span className="text-on-surface font-medium">Student Dev Team Alpha</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant font-label-sm text-label-sm uppercase">Engine</span>
                    <span className="text-on-surface font-medium">Godot 4.2</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant font-label-sm text-label-sm uppercase">Status</span>
                    <span className="text-primary-container font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span> Early Access
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="bg-surface-bright/50 border border-primary-container/30 text-on-surface font-label-sm text-label-sm px-3 py-1 rounded shadow-[0_0_8px_rgba(0,242,255,0.1)]">Cyberpunk</span>
                  <span className="bg-surface-bright/50 border border-primary-container/30 text-on-surface font-label-sm text-label-sm px-3 py-1 rounded shadow-[0_0_8px_rgba(0,242,255,0.1)]">Racing</span>
                  <span className="bg-surface-bright/50 border border-primary-container/30 text-on-surface font-label-sm text-label-sm px-3 py-1 rounded shadow-[0_0_8px_rgba(0,242,255,0.1)]">Sci-Fi</span>
                  <span className="bg-surface-bright/50 border border-primary-container/30 text-on-surface font-label-sm text-label-sm px-3 py-1 rounded shadow-[0_0_8px_rgba(0,242,255,0.1)]">Multiplayer</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest/60 backdrop-blur-xl border border-white/5 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-surface-tint font-label-sm text-label-sm uppercase tracking-widest">
                <Wallet className="w-5 h-5" /> Protocol Revenue Split
              </div>
              <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden flex shadow-inner">
                <div className="bg-primary-container h-full w-[85%] relative">
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(0,0,0,0.1)_25%,rgba(0,0,0,0.1)_50%,transparent_50%,transparent_75%,rgba(0,0,0,0.1)_75%,rgba(0,0,0,0.1)_100%)] bg-[length:10px_10px]"></div>
                </div>
                <div className="bg-secondary h-full w-[15%]"></div>
              </div>
              <div className="flex justify-between items-center font-label-sm text-label-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-primary-container"></span>
                  <span className="text-on-surface">85% Developer</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-on-surface-variant">15% Platform</span>
                  <span className="w-3 h-3 rounded-sm bg-secondary"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
