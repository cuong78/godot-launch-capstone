import React from 'react';
import DashboardStats from '../components/DevPortal/DashboardStats';
import GameCard from '../components/DevPortal/GameCard';
import { Plus, Star, Store, CloudUpload, BarChart2, Clock, Edit3, Lock, Image as ImageIcon, FileEdit, Wrench } from 'lucide-react';

export default function MyGames() {
  return (
    <main className="flex-1 w-full lg:ml-64 px-margin-mobile md:px-margin-desktop pb-8 md:pb-12 pt-28 md:pt-32 overflow-y-auto">
      {/* Header & Primary Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-background mb-2">Project Database</h1>
          <p className="font-body-md text-on-surface-variant max-w-2xl">Manage your active titles, monitor review statuses, and deploy updates to the INDIE_CORE network.</p>
        </div>
        <button className="bg-[#00f2ff] text-[#0A0C10] font-headline-md text-[18px] px-8 py-4 rounded relative overflow-hidden btn-scanline hover:bg-surface-tint transition-colors active:scale-95 shadow-[0_0_20px_rgba(0,242,255,0.4)] flex items-center space-x-3 group">
          <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
          <span>Initialize New Project</span>
        </button>
      </div>

      <DashboardStats />

      {/* Games Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-gutter">
        {/* Card 1: Cyber Bloom */}
        <GameCard
          title="Cyber Bloom"
          version="v1.4.2"
          platform="PC/Mac"
          imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuAiyEy2kjWIDqNLHaxliJDBbKKxIFJQ9HLdKhMZ2ed5pdRMxy0d9ce7YyqTVW5Q_Zru_DaQnaLxou5UyvGjby83Y8ikmQJ5BRe5eM9aiSTdpArmemZBWJmMPY1JtBsN4PuPwF8twVTmcjob66sWSun8tHMa00Gve-RlW-u7uBzNo4g1VaOHbCJr599mMtiTPKrK2KB927IH3NzX9l2ZAyZrxI6czzLJFNuA51WuQCkXqt6Ajg3ywP7joXf-MSA5HYsBk6_C8_U719vX"
          statusText="Active"
          isActive={true}
          themeColor="cyan"
          primaryStats={
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Wishlists</span>
                <span className="font-body-md text-on-background">45,210</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Sales (30d)</span>
                <span className="font-body-md text-on-background">2,450</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Rating</span>
                <span className="font-body-md text-surface-tint flex items-center justify-end">
                  <Star className="w-4 h-4 mr-1 fill-current" /> 92%
                </span>
              </div>
            </div>
          }
          actions={
            <>
              <button className="flex-1 bg-surface-variant/50 border border-white/10 hover:border-surface-tint hover:bg-surface-tint/10 text-on-background font-label-sm text-label-sm py-2 px-4 rounded transition-all flex items-center justify-center space-x-2">
                <Store className="w-4 h-4" />
                <span>Store Page</span>
              </button>
              <button className="flex-1 bg-surface-variant/50 border border-white/10 hover:border-surface-tint hover:bg-surface-tint/10 text-on-background font-label-sm text-label-sm py-2 px-4 rounded transition-all flex items-center justify-center space-x-2">
                <CloudUpload className="w-4 h-4" />
                <span>Update Build</span>
              </button>
              <button className="flex-none bg-surface-variant/50 border border-white/10 hover:border-surface-tint hover:bg-surface-tint/10 text-on-background p-2 rounded transition-all flex items-center justify-center">
                <BarChart2 className="w-5 h-5" />
              </button>
            </>
          }
        />

        {/* Card 2: Neon Drifter */}
        <GameCard
          title="Neon Drifter"
          version="v1.0.0-RC1"
          platform="Console"
          imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuAkKNRyqWkDZhFus1zs8crE7PoVFC3dlQlOv3ZFqt3U04D4OIHSo1KzYdT7MofXspJAiAOelH2UMxG6ysMOr0deuxjHYQVctLp_8gLZNMSyxW-I4TC9UCBEwP2LFqp_XmOY9m1MDJQ5J6oRcE_jJ21qCgFt3QwrZHwZywicdshRlnsSb4DDknupvK5VSlYXRmmQDCA9M3TdajwOo7P_ncvtl9HLGoyq7yzpljpJrv4J6EnLg5-FwRFzZQxTy0OQ23_sHlGDP89GXozz"
          statusText="Under Review"
          statusIcon={<Clock className="w-[14px] h-[14px]" />}
          isUnderReview={true}
          themeColor="purple"
          primaryStats={
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4 opacity-70">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Wishlists</span>
                <span className="font-body-md text-on-background">12,840</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Est. Launch</span>
                <span className="font-body-md text-on-background">Oct 24</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Review Phase</span>
                <span className="font-body-md text-error">QA Tier 2</span>
              </div>
            </div>
          }
          actions={
            <>
              <button className="flex-1 bg-surface-variant/50 border border-white/10 hover:border-secondary hover:bg-secondary/10 text-on-background font-label-sm text-label-sm py-2 px-4 rounded transition-all flex items-center justify-center space-x-2">
                <Edit3 className="w-4 h-4" />
                <span>Edit Store Page</span>
              </button>
              <button className="flex-1 bg-surface-variant/50 border border-white/10 hover:border-secondary hover:bg-secondary/10 text-on-background font-label-sm text-label-sm py-2 px-4 rounded transition-all flex items-center justify-center space-x-2 opacity-60 cursor-not-allowed">
                <Lock className="w-4 h-4" />
                <span className="text-on-surface-variant">Build Locked</span>
              </button>
            </>
          }
        />

        {/* Card 3: void Protocol */}
        <GameCard
          title="void Protocol"
          version="Pre-Alpha"
          platform=""
          statusText="Draft"
          statusIcon={<FileEdit className="w-[14px] h-[14px]" />}
          isDraft={true}
          themeColor="gray"
          primaryStats={
            <div className="flex flex-col justify-center items-center h-full mb-6 border-b border-white/5 pb-4 relative">
              <p className="font-body-md text-on-surface-variant text-center mb-4">Store presence incomplete. Missing primary key art and minimum viable build payload.</p>
              <div className="w-full bg-[#121418] h-1.5 rounded-full overflow-hidden">
                <div className="bg-on-surface-variant h-full w-[25%]"></div>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-2">Profile Complete: 25%</span>
              {/* Absolute positioned placeholder icon because this card has no image */}
              <ImageIcon className="absolute -top-[160px] text-surface-variant opacity-30 w-16 h-16" />
            </div>
          }
          actions={
            <button className="flex-1 bg-surface-variant/50 border border-white/10 hover:border-white/50 hover:bg-white/5 text-on-background font-label-sm text-label-sm py-2 px-4 rounded transition-all flex items-center justify-center space-x-2">
              <Wrench className="w-4 h-4" />
              <span>Continue Setup</span>
            </button>
          }
        />
      </div>
    </main>
  );
}
