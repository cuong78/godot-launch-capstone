import React from 'react';
import { Plus, Calendar, Check } from 'lucide-react';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { Asset, Project } from '../types';

interface DashboardPageProps {
  financeStats: {
    totalRevenue: number;
    activePlayers: number;
    listedCount: number;
  };
  assets: Asset[];
  projectRepositories: Project[];
  setCurrentScreen: (screen: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  financeStats,
  assets,
  projectRepositories,
  setCurrentScreen
}) => {
  return (
    <div className="space-y-6 animate-fade-in py-2">
      
      {/* Top overview row with developer metrics */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 gap-4 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl"></div>
        <div>
          <span className="text-[10px] font-mono tracking-widest text-amber-400 uppercase">OFFICIAL DEVROOM CONTROL PANEL</span>
          <h1 className="font-display font-bold text-2xl text-white pt-0.5">Welcome Back, Indie Creator</h1>
          <p className="text-xs text-slate-400 mt-1">Check recent downloads, live dashboard trends, and community logs</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setCurrentScreen('upload')}>
            Deploy Asset
          </Button>
          <button
            onClick={() => alert('Dev profile synchronizer complete!')}
            className="p-2 bg-slate-800 border border-slate-750 text-slate-350 hover:text-white transition-studio rounded-lg text-xs font-semibold cursor-pointer"
          >
            Sync Repository
          </button>
        </div>
      </div>

      {/* Quick counters grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Gross Sales Revenue</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold dark:text-white">${financeStats.totalRevenue.toFixed(2)}</span>
            <span className="text-[10px] text-emerald-500 font-bold font-mono">+12%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-950 h-1.5 rounded-full overflow-hidden">
            <div className="bg-sky-500 h-full rounded-full" style={{ width: '68%' }}></div>
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">Updates whenever you successfully checkout additional assets</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Active Players Sandbox</span>
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-2xl font-display font-bold dark:text-white">{financeStats.activePlayers} users</span>
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">Synchronized live with Godot Multiplayer sockets</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Cloud Storage Allocated</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold dark:text-white">74.2%</span>
            <span className="text-[10px] text-slate-400">of 10GB</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-950 h-1.5 rounded-full overflow-hidden">
            <div className="bg-amber-400 h-full rounded-full" style={{ width: '74.2%' }}></div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Listed Asset Packages</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold dark:text-white">{assets.length} items</span>
            <span className="text-[10px] text-slate-400 font-bold">active status</span>
          </div>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight">Includes native community bundles</p>
        </div>

      </div>

      {/* Split row: Reusable DataTable and Sidebar developer logs list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Reusable Projects data list table */}
        <div className="lg:col-span-2 space-y-4">
          <DataTable 
            data={projectRepositories} 
            onSelectRow={(row) => alert(`Opening advanced configuration options for project: ${row.projectName}. Running on engine ${row.engine}.`)} 
          />
        </div>

        {/* Right Column: Upcoming release tasks and support widgets */}
        <div className="space-y-6">
          
          {/* Release Schedule logging checklist */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl space-y-4 shadow-xs">
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 pb-1">
              <Calendar size={15} className="text-amber-500" /> Release Schedule Tracker
            </h3>

            <div className="space-y-2.5">
              {[
                { text: 'Deploy Void Knight rigging updates', done: true },
                { text: 'Configure multi-sampling on Ocean Shader', done: false },
                { text: 'Compress retro WAV anthology tracks', done: false },
                { text: 'Test custom tile coordinates mapping grids', done: false }
              ].map((task, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-350 font-medium">
                  <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center flex-none ${task.done ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500 font-bold' : 'border-slate-300 dark:border-slate-800'}`}>
                    {task.done && <Check size={11} />}
                  </div>
                  <span className={task.done ? 'line-through text-slate-400 dark:text-slate-500' : ''}>{task.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Simulated Discord CTA server link */}
          <div className="bg-sky-500/5 dark:bg-sky-950/10 border border-sky-450 dark:border-sky-800 p-5 rounded-2xl space-y-3.5">
            <h4 className="font-display font-bold text-sm text-sky-600 dark:text-sky-400">Join Discord Creator Sockets</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Chat direct dev issues with 14,000+ top Godot enthusiasts. Exchange tiles sets coordinates, lighting math formulas, and shader loops with ease.
            </p>
            <button
              onClick={() => alert('Simulated Discord redirect! In production, this launches server invitation flow.')}
              className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-400 hover:shadow-md text-white font-display text-xs font-bold rounded-lg transition-studio text-center cursor-pointer"
            >
              Join Creator Group Chat
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
