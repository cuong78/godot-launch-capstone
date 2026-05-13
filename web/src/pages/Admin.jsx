import React from 'react';
import { Plus, AlertTriangle, Filter, Hash, Code, User, UserCog, Ban, Gavel, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Admin() {
  return (
    <main className="flex-grow pt-28 md:pt-32 pb-20 w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex flex-col gap-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant/20 pb-6">
        <div>
          <h1 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface drop-shadow-md">Operative Directory</h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-fixed-dim animate-pulse shadow-[0_0_8px_rgba(0,219,231,0.8)]"></span>
            84,209 ENTRIES INDEXED
          </p>
        </div>
        <div className="flex gap-4">
          <button className="bg-[#121418] text-primary-fixed-dim border border-primary-fixed-dim/50 rounded px-4 py-2 font-label-sm text-label-sm flex items-center gap-2 hover:bg-primary-fixed-dim/10 hover:shadow-[0_0_15px_rgba(0,242,255,0.2)] transition-all">
            <Plus className="w-[18px] h-[18px]" />
            PROVISION USER
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-container/30 backdrop-blur-md p-4 rounded-xl border border-outline-variant/20">
        <div className="flex flex-wrap items-center gap-2">
          <button className="font-label-sm text-label-sm px-3 py-1.5 rounded bg-primary-fixed-dim text-[#0A0C10] shadow-[0_0_10px_rgba(0,242,255,0.2)] transition-all">
            ALL OPERATIVES
          </button>
          <button className="font-label-sm text-label-sm px-3 py-1.5 rounded bg-[#121418] text-on-surface-variant border border-outline-variant/50 hover:border-secondary hover:text-secondary hover:shadow-[0_0_10px_rgba(209,188,255,0.2)] transition-all">
            DEVELOPERS
          </button>
          <button className="font-label-sm text-label-sm px-3 py-1.5 rounded bg-[#121418] text-on-surface-variant border border-outline-variant/50 hover:border-secondary hover:text-secondary hover:shadow-[0_0_10px_rgba(209,188,255,0.2)] transition-all">
            END USERS
          </button>
          <div className="w-[1px] h-6 bg-outline-variant/30 mx-2"></div>
          <button className="font-label-sm text-label-sm px-3 py-1.5 rounded bg-[#121418] text-on-surface-variant border border-outline-variant/50 hover:border-error hover:text-error hover:shadow-[0_0_10px_rgba(255,180,171,0.2)] transition-all flex items-center gap-1">
            <AlertTriangle className="w-[14px] h-[14px]" />
            SUSPENDED
          </button>
        </div>

        <div className="relative w-full md:w-auto flex-shrink-0">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-[18px] h-[18px]" />
          <input 
            className="bg-[#0A0C10] border border-outline-variant/50 text-on-surface focus:border-primary-fixed-dim focus:outline-none focus:ring-1 focus:ring-primary-fixed-dim focus:shadow-[0_0_15px_rgba(0,242,255,0.2)] rounded py-2 pl-10 pr-4 font-label-sm text-label-sm w-full md:w-80 transition-all placeholder:text-on-surface-variant/50" 
            placeholder="Filter by ID, Name, IP..." 
            type="text" 
          />
        </div>
      </div>

      <div className="bg-surface-container/40 backdrop-blur-[16px] rounded-xl border border-white/5 overflow-hidden flex flex-col relative">
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary-fixed-dim/50"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary-fixed-dim/50"></div>
        
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-[#121418]/80 border-b border-outline-variant/30">
              <tr>
                <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest whitespace-nowrap">Operator ID</th>
                <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest whitespace-nowrap">Identity</th>
                <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest whitespace-nowrap">Role</th>
                <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest whitespace-nowrap">Access Level</th>
                <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest whitespace-nowrap">Status</th>
                <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-on-surface divide-y divide-outline-variant/10">
              {/* Row 1 */}
              <tr className="hover:bg-white/[0.02] transition-colors group">
                <td className="py-4 px-6 font-label-sm text-primary-fixed-dim">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-primary-fixed-dim/50" />
                    USR-998A-4B
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-col">
                    <span className="font-semibold">Nakamura, T.</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">t.naka@indiecore.net</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-secondary/10 border border-secondary/30 text-secondary font-label-sm text-label-sm">
                    <Code className="w-[14px] h-[14px]" />
                    Dev
                  </span>
                </td>
                <td className="py-4 px-6 font-label-sm text-on-surface-variant">Lvl 4 (Publish)</td>
                <td className="py-4 px-6">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary-fixed/50 text-primary-fixed shadow-[0_0_8px_rgba(0,219,231,0.2)] font-label-sm text-label-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed"></span>
                    Active
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button className="text-on-surface-variant hover:text-primary-fixed transition-colors" title="Edit Permissions">
                      <UserCog className="w-5 h-5" />
                    </button>
                    <button className="text-on-surface-variant hover:text-error transition-colors" title="Suspend Access">
                      <Ban className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
              
              {/* Row 2 */}
              <tr className="hover:bg-white/[0.02] transition-colors group">
                <td className="py-4 px-6 font-label-sm text-on-surface-variant group-hover:text-primary-fixed-dim transition-colors">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 opacity-50" />
                    USR-112C-9X
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-col">
                    <span className="font-semibold">Vance, L.</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">l.vance@player.net</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container-high border border-outline-variant/30 text-on-surface-variant font-label-sm text-label-sm">
                    <User className="w-[14px] h-[14px]" />
                    User
                  </span>
                </td>
                <td className="py-4 px-6 font-label-sm text-on-surface-variant">Lvl 1 (Base)</td>
                <td className="py-4 px-6">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary-fixed/50 text-primary-fixed shadow-[0_0_8px_rgba(0,219,231,0.2)] font-label-sm text-label-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed"></span>
                    Active
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button className="text-on-surface-variant hover:text-primary-fixed transition-colors" title="Edit Permissions">
                      <UserCog className="w-5 h-5" />
                    </button>
                    <button className="text-on-surface-variant hover:text-error transition-colors" title="Suspend Access">
                      <Ban className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>

              {/* Row 3 (Suspended) */}
              <tr className="bg-error/5 hover:bg-error/10 transition-colors group">
                <td className="py-4 px-6 font-label-sm text-error/80">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 opacity-50" />
                    USR-404X-0F
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-col">
                    <span className="font-semibold text-on-surface/80">Unknown Entity</span>
                    <span className="font-label-sm text-label-sm text-error/70">REDACTED</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-secondary/5 border border-secondary/20 text-secondary/70 font-label-sm text-label-sm">
                    <Code className="w-[14px] h-[14px]" />
                    Dev
                  </span>
                </td>
                <td className="py-4 px-6 font-label-sm text-error/70">REVOKED</td>
                <td className="py-4 px-6">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-error/50 text-error bg-error/10 shadow-[0_0_8px_rgba(255,180,171,0.2)] font-label-sm text-label-sm">
                    <Gavel className="w-[14px] h-[14px]" />
                    Suspended
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button className="text-on-surface-variant hover:text-primary-fixed transition-colors" title="Edit Permissions">
                      <UserCog className="w-5 h-5" />
                    </button>
                    <button className="text-error hover:text-error-container transition-colors" title="Restore Access">
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>

              {/* Row 4 */}
              <tr className="hover:bg-white/[0.02] transition-colors group">
                <td className="py-4 px-6 font-label-sm text-on-surface-variant group-hover:text-primary-fixed-dim transition-colors">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 opacity-50" />
                    USR-882J-1P
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-col">
                    <span className="font-semibold">Chen, A.</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">achen@studiox.io</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-secondary/10 border border-secondary/30 text-secondary font-label-sm text-label-sm">
                    <Code className="w-[14px] h-[14px]" />
                    Dev
                  </span>
                </td>
                <td className="py-4 px-6 font-label-sm text-on-surface-variant">Lvl 3 (Beta)</td>
                <td className="py-4 px-6">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary-fixed/50 text-primary-fixed shadow-[0_0_8px_rgba(0,219,231,0.2)] font-label-sm text-label-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed"></span>
                    Active
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                    <button className="text-on-surface-variant hover:text-primary-fixed transition-colors" title="Edit Permissions">
                      <UserCog className="w-5 h-5" />
                    </button>
                    <button className="text-on-surface-variant hover:text-error transition-colors" title="Suspend Access">
                      <Ban className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="bg-[#121418]/80 border-t border-outline-variant/30 p-4 flex items-center justify-between">
          <div className="font-label-sm text-label-sm text-on-surface-variant">
            Showing 1-4 of 84,209 records
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1 rounded text-on-surface-variant hover:text-primary-fixed-dim hover:bg-white/5 transition-colors disabled:opacity-30" disabled>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-1">
              <button className="w-8 h-8 rounded bg-primary-fixed-dim text-[#0A0C10] font-label-sm text-label-sm flex items-center justify-center">1</button>
              <button className="w-8 h-8 rounded text-on-surface-variant hover:bg-white/5 hover:text-primary-fixed-dim font-label-sm text-label-sm flex items-center justify-center transition-colors">2</button>
              <button className="w-8 h-8 rounded text-on-surface-variant hover:bg-white/5 hover:text-primary-fixed-dim font-label-sm text-label-sm flex items-center justify-center transition-colors">3</button>
              <span className="w-8 h-8 flex items-center justify-center text-on-surface-variant">...</span>
            </div>
            <button className="p-1 rounded text-on-surface-variant hover:text-primary-fixed-dim hover:bg-white/5 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
