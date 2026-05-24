import React, { useState, useEffect } from 'react';
import DashboardStats from '../components/DevPortal/DashboardStats';
import GameCard from '../components/DevPortal/GameCard';
import CreateGameModal from '../components/DevPortal/CreateGameModal';
import { Plus, Star, Store, CloudUpload, BarChart2, Clock, Edit3, Lock, Image as ImageIcon, FileEdit, Wrench, Archive } from 'lucide-react';

export default function MyGames() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [games, setGames] = useState([]);

  const fetchGames = async () => {
    try {
      const res = await fetch('/api/v1/games', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setGames(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch games", err);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);
  return (
    <main className="flex-1 w-full lg:ml-64 px-margin-mobile md:px-margin-desktop pb-8 md:pb-12 pt-28 md:pt-32 overflow-y-auto">
      {/* Header & Primary Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-background mb-2">Project Database</h1>
          <p className="font-body-md text-on-surface-variant max-w-2xl">Manage your active titles, monitor review statuses, and deploy updates to the INDIE_CORE network.</p>
        </div>
        <button 
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-[#00f2ff] text-[#0A0C10] font-headline-md text-[18px] px-8 py-4 rounded relative overflow-hidden btn-scanline hover:bg-surface-tint transition-colors active:scale-95 shadow-[0_0_20px_rgba(0,242,255,0.4)] flex items-center space-x-3 group"
        >
          <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
          <span>Initialize New Project</span>
        </button>
      </div>

      <DashboardStats />

      {/* Games Grid */}
      {games.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-low/30 glass-panel border border-white/5 rounded-2xl space-y-6">
          <Archive className="w-16 h-16 text-on-surface-variant/30 mx-auto animate-pulse" />
          <div className="space-y-2">
            <h3 className="text-2xl font-headline-md text-on-surface uppercase tracking-wider">No Projects Found</h3>
            <p className="text-on-surface-variant max-w-md mx-auto">
              Initialize your first project on INDIE_CORE to distribute, deploy updates, and synchronize with players.
            </p>
          </div>
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="px-6 py-3 bg-[#00f2ff] text-[#0A0C10] font-headline-sm rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2 shadow-[0_0_15px_rgba(0,242,255,0.3)]"
          >
            <Plus className="w-5 h-5" /> Initialize First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-gutter">
          {games.map(game => {
            const isActive = game.status === 'published' || game.status === 'approved';
            const isUnderReview = game.status === 'pending';
            const isDraft = game.status === 'draft' || game.status === 'rejected';

            let statusText = game.status;
            if (game.status === 'draft') statusText = 'Draft';
            else if (game.status === 'pending') statusText = 'Under Review';
            else if (game.status === 'approved') statusText = 'Approved';
            else if (game.status === 'rejected') statusText = 'Rejected';
            else if (game.status === 'published') statusText = 'Active';

            let statusIcon = null;
            if (isUnderReview) statusIcon = <Clock className="w-[14px] h-[14px]" />;
            else if (isDraft) statusIcon = <FileEdit className="w-[14px] h-[14px]" />;

            let themeColor = 'cyan';
            if (isUnderReview) themeColor = 'purple';
            else if (isDraft) themeColor = 'gray';

            // Stats rendering based on status
            let primaryStats;
            if (isDraft) {
              primaryStats = (
                <div className="flex flex-col justify-center items-center h-full mb-6 border-b border-white/5 pb-4 relative">
                  <p className="font-body-md text-on-surface-variant text-center mb-4 text-sm leading-relaxed">
                    {game.status === 'rejected' 
                      ? "Project build rejected. Please check requirements and update the build package." 
                      : "Store presence incomplete. Missing primary key art and minimum viable build payload."}
                  </p>
                  <div className="w-full bg-[#121418] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-on-surface-variant h-full w-[25%]" style={{ width: game.status === 'rejected' ? '50%' : '25%' }}></div>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant mt-2">
                    Profile Complete: {game.status === 'rejected' ? '50%' : '25%'}
                  </span>
                  {!game.thumbnailUrl && <ImageIcon className="absolute -top-[160px] text-surface-variant opacity-30 w-16 h-16" />}
                </div>
              );
            } else if (isUnderReview) {
              primaryStats = (
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4 opacity-70">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Proposed Price</span>
                    <span className="font-body-md text-on-background">{game.priceProposed ? `$${game.priceProposed}` : 'Free'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Category</span>
                    <span className="font-body-md text-on-background">{game.categoryName || 'General'}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Review Phase</span>
                    <span className="font-body-md text-error font-mono text-xs">QA TIER 2</span>
                  </div>
                </div>
              );
            } else {
              primaryStats = (
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Price</span>
                    <span className="font-body-md text-on-background">{game.downloadPrice ? `$${game.downloadPrice}` : 'Free'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Category</span>
                    <span className="font-body-md text-on-background">{game.categoryName || 'General'}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Community</span>
                    <span className="font-body-md text-surface-tint flex items-center justify-end gap-1">
                      {game.communityAvailable ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <GameCard
                key={game.id}
                title={game.title}
                version="v1.0.0"
                platform="PC/Mac"
                imageSrc={game.thumbnailUrl}
                statusText={statusText}
                statusIcon={statusIcon}
                isActive={isActive}
                isDraft={game.status === 'draft'}
                isUnderReview={isUnderReview}
                themeColor={themeColor}
                primaryStats={primaryStats}
                actions={
                  <>
                    <button className="flex-1 bg-surface-variant/50 border border-white/10 hover:border-surface-tint hover:bg-surface-tint/10 text-on-background font-label-sm text-label-sm py-2 px-4 rounded transition-all flex items-center justify-center space-x-2 cursor-pointer">
                      <Store className="w-4 h-4" />
                      <span>Store Page</span>
                    </button>
                    {isActive ? (
                      <button className="flex-1 bg-surface-variant/50 border border-white/10 hover:border-surface-tint hover:bg-surface-tint/10 text-on-background font-label-sm text-label-sm py-2 px-4 rounded transition-all flex items-center justify-center space-x-2 cursor-pointer">
                        <CloudUpload className="w-4 h-4" />
                        <span>Update Build</span>
                      </button>
                    ) : (
                      <button className="flex-1 bg-surface-variant/50 border border-white/10 hover:border-surface-tint hover:bg-surface-tint/10 text-on-background font-label-sm text-label-sm py-2 px-4 rounded transition-all flex items-center justify-center space-x-2 cursor-pointer">
                        <Wrench className="w-4 h-4" />
                        <span>{game.status === 'rejected' ? 'Re-submit Build' : 'Setup Project'}</span>
                      </button>
                    )}
                  </>
                }
              />
            );
          })}
        </div>
      )}

      <CreateGameModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          fetchGames();
        }}
      />
    </main>
  );
}
