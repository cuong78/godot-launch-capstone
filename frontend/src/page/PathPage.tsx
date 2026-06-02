import React from 'react';
import { TrendingUp, Sparkles, Check } from 'lucide-react';
import { Button } from '../components/Button';

interface PathPageProps {
  setCurrentScreen: (screen: any) => void;
}

export const PathPage: React.FC<PathPageProps> = ({ setCurrentScreen }) => {
  return (
    <div className="space-y-8 animate-fade-in py-4">
      
      <div className="text-center max-w-xl mx-auto space-y-3">
        <span className="bg-sky-500/15 text-sky-500 text-xs uppercase font-bold py-1 px-3 rounded-full border border-sky-500/20 font-mono">
          CHOOSE DEV PROGRAM
        </span>
        <h1 className="font-display font-bold text-3xl text-slate-900 dark:text-white">Shape Game Pipelines</h1>
        <p className="text-sm text-slate-500 leading-relaxed">
          Whether listing customized templates to generate revenue or applying for our exclusive developer grants sandbox, we help fund your creative horizons.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        
        {/* Path Option A: Sell on Marketplace */}
        <div className="relative group bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-400 rounded-3xl overflow-hidden transition-all duration-300 p-6 flex flex-col justify-between space-y-8 shadow-sm">
          
          <div className="space-y-4">
            <div className="w-12 h-12 bg-amber-400/10 text-amber-500 border border-amber-500/20 rounded-2xl flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest font-mono">RECURRING COMMERCE</span>
              <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white pt-1">
                Sell on Creator Marketplace
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-350 leading-relaxed">
              Retain 95% of revenues on commercial sales! Build passive software earnings with script nodes, game template structures, custom shaders and environment assets.
            </p>

            <ul className="space-y-2.5 pt-2 text-xs text-slate-500 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center flex-none">
                  <Check size={10} />
                </div>
                User-friendly global delivery pipeline
              </li>
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center flex-none">
                  <Check size={10} />
                </div>
                Full ownership of source files
              </li>
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-505/10 text-emerald-500 rounded-full flex items-center justify-center flex-none">
                  <Check size={10} />
                </div>
                Integrated user reviews and bug ticket tools
              </li>
            </ul>
          </div>

          <Button
            variant="primary"
            className="w-full"
            size="md"
            onClick={() => setCurrentScreen('upload')}
          >
            Start Listing Packages
          </Button>
        </div>

        {/* Path Option B: Acquisition Grant Program */}
        <div className="relative group bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 hover:border-sky-500 dark:hover:border-sky-505 rounded-3xl overflow-hidden transition-all duration-300 p-6 flex flex-col justify-between space-y-8 shadow-sm">
          
          <div className="space-y-4">
            <div className="w-12 h-12 bg-sky-500/10 text-sky-500 border border-sky-500/20 rounded-2xl flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-sky-500 uppercase tracking-widest font-mono">FINANCIAL SPONSORSHIP</span>
              <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white pt-1">
                Acquisition Grant Program
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-355 leading-relaxed">
              Have an excellent, fully polished open source asset? Apply for our direct developer buyout grant and receive immediate payouts ranging between $500 - $5,000!
            </p>

            <ul className="space-y-2.5 pt-2 text-xs text-slate-500 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center flex-none">
                  <Check size={10} />
                </div>
                Transparent evaluation with fast response
              </li>
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center flex-none">
                  <Check size={10} />
                </div>
                Immediate flat bank transfer payouts
              </li>
              <li className="flex items-center gap-2">
                <div className="w-4 h-4 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center flex-none">
                  <Check size={10} />
                </div>
                Keep author credits & promo highlights
              </li>
            </ul>
          </div>

          <button
            onClick={() => alert('Grant Application Program simulated! We have registered your temporary developer identity. An expert from our funding group will review past projects.')}
            className="w-full py-3 px-4 bg-transparent border border-sky-500 hover:bg-sky-500 text-sky-500 hover:text-white font-display text-xs font-bold rounded-lg transition-studio text-center cursor-pointer"
          >
            Submit Current Active Profile
          </button>
        </div>

      </div>
    </div>
  );
};
