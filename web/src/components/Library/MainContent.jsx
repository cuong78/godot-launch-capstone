import React from 'react';
import {
  Award,
  Cloud,
  Download,
  Gauge,
  Image as ImageIcon,
  Lock,
  Medal,
  Play,
  Trophy,
} from "lucide-react";

export default function MainContent() {
  return (
    <div className="flex-grow flex flex-col overflow-y-auto relative scroll-smooth h-full">
      {/* Hero Header Section */}
      <div className="relative w-full h-[320px] flex-shrink-0 overflow-hidden">
        {/* Background Image & Gradient Overlays */}
        <img
          alt="Neon Drifter Hero Background"
          className="absolute inset-0 w-full h-full object-cover object-center"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHHufLmpVcqm4Q79obeusAV-dlQ33im7L3aBnip3ZBvz8VrfTFWQK8hIBBKHS6_lbrGaJ9_ci0TzXZvsIW5wiPvyMiQNBbAjIW22Bl7K5HMR5N_bFgHVaEcVajVXvKzfQbwJlEeRZNGPOK5MPXX44TMC529B2USyaRKhjcLQhLwmANkaamd13wkyaz5ckSypxL8bkotYBX5a-W1n1V31idfKKFeFVVOgjS3oHzVKTdxH-j6S8ryPPT4dq3dGbD3SwgjlrqYOorL3Wo"
        />
        {/* Vignette and fade to background color */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0C10] via-[#0A0C10]/60 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0C10] via-transparent to-transparent opacity-80"></div>
        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 w-full p-8 flex flex-col md:flex-row gap-6 items-end justify-between">
          <div className="flex flex-col gap-4">
            {/* Technical Badges */}
            <div className="flex gap-2">
              <span className="bg-[#121418] border border-outline-variant/50 text-on-surface-variant font-label-sm text-[10px] px-2 py-1 rounded tracking-wider uppercase">
                Action / Racing
              </span>
              <span className="bg-[#121418] border border-outline-variant/50 text-on-surface-variant font-label-sm text-[10px] px-2 py-1 rounded tracking-wider uppercase flex items-center gap-1">
                <Cloud className="w-3 h-3" /> Cloud Synced
              </span>
            </div>
            <h1 className="font-display-lg text-display-lg text-white font-extrabold drop-shadow-[0_0_10px_rgba(0,242,255,0.5)]">
              NEON DRIFTER
            </h1>
          </div>
          {/* Action Buttons */}
          <div className="flex gap-4 items-center">
            <button className="bg-transparent border border-primary-container text-primary-container font-label-sm text-label-sm px-6 py-3 rounded uppercase tracking-widest hover:bg-primary-container/10 transition-colors shadow-[0_0_15px_rgba(0,242,255,0.1)] flex items-center gap-2">
              <Download className="w-4 h-4" />
              Update (1.2GB)
            </button>
            <button className="bg-primary-container text-[#0A0C10] font-headline-md text-[20px] font-bold px-10 py-3 rounded uppercase tracking-widest hover:bg-primary-fixed hover:shadow-[0_0_20px_rgba(0,242,255,0.4)] transition-all btn-scanline flex items-center gap-2">
              <Play className="w-6 h-6 fill-current" />
              Play
            </button>
          </div>
        </div>
      </div>
      {/* Stats Bar (Monospaced Technical Readout) */}
      <div className="bg-surface-container-low/80 border-y border-outline-variant/20 px-8 py-3 flex gap-8 items-center z-10 backdrop-blur-md">
        <div className="flex flex-col">
          <span className="font-label-sm text-[10px] text-outline tracking-wider uppercase mb-1">
            Total Playtime
          </span>
          <span className="font-label-sm text-sm text-primary-container">
            14h 22m
          </span>
        </div>
        <div className="w-px h-6 bg-outline-variant/30"></div>
        <div className="flex flex-col">
          <span className="font-label-sm text-[10px] text-outline tracking-wider uppercase mb-1">
            Last Played
          </span>
          <span className="font-label-sm text-sm text-on-surface">
            Yesterday
          </span>
        </div>
        <div className="w-px h-6 bg-outline-variant/30"></div>
        <div className="flex flex-col">
          <span className="font-label-sm text-[10px] text-outline tracking-wider uppercase mb-1">
            Version
          </span>
          <span className="font-label-sm text-sm text-on-surface">
            v2.1.4_stable
          </span>
        </div>
        <div className="ml-auto">
          {/* Progress Bar for update, visually styled but dormant */}
          <div className="w-48 h-1.5 bg-surface-container-highest rounded-full overflow-hidden border border-outline-variant/20">
            <div className="h-full bg-primary-container w-[0%]"></div>
          </div>
        </div>
      </div>
      {/* Content Area (Tabs & Grid Layout) */}
      <div className="p-8 max-w-[1200px] w-full mx-auto">
        {/* Contextual Tabs */}
        <div className="flex gap-8 border-b border-outline-variant/20 mb-8 pb-px">
          <button className="font-label-sm text-label-sm text-primary-container border-b-2 border-primary-container pb-3 px-2 uppercase tracking-widest shadow-[0_4px_10px_-4px_rgba(0,242,255,0.3)]">
            Overview
          </button>
          <button className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface pb-3 px-2 uppercase tracking-widest transition-colors">
            Updates
          </button>
          <button className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface pb-3 px-2 uppercase tracking-widest transition-colors">
            Activity
          </button>
          <button className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface pb-3 px-2 uppercase tracking-widest transition-colors flex items-center gap-2">
            Achievements
            <span className="bg-surface-container-highest text-on-surface text-[10px] px-1.5 py-0.5 rounded">
              24
            </span>
          </button>
        </div>
        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left/Main Column (spans 2) */}
          <div className="xl:col-span-2 space-y-6">
            {/* About This Game Glass Card */}
            <div className="glass-panel p-6 rounded-xl flex flex-col gap-4 relative overflow-hidden group">
              {/* Decorative corner accent */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary-container/10 to-transparent pointer-events-none"></div>
              <h2 className="font-headline-md text-[18px] text-white font-bold flex items-center gap-2">
                <span className="w-1 h-4 bg-primary-container rounded-sm shadow-[0_0_8px_rgba(0,242,255,0.5)]"></span>
                ABOUT THIS ARCHIVE
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                Dive into the hyper-kinetic world of Neon Drifter. Master the
                art of gravity-defying maneuvers across procedurally generated
                synthwave landscapes. Uncover the secrets of the Void Grid while
                outrunning rogue security protocols. The latest update
                introduces the 'Cyber Bloom' expansion, adding 5 new sectors and
                experimental propulsion mechanics.
              </p>
              <div className="flex gap-2 mt-2">
                <span className="bg-surface-container-high text-on-surface font-label-sm text-[11px] px-3 py-1 rounded border border-outline-variant/30">
                  Singleplayer
                </span>
                <span className="bg-surface-container-high text-on-surface font-label-sm text-[11px] px-3 py-1 rounded border border-outline-variant/30">
                  Controller Support
                </span>
                <span className="bg-surface-container-high text-on-surface font-label-sm text-[11px] px-3 py-1 rounded border border-outline-variant/30">
                  Workshop
                </span>
              </div>
            </div>
            {/* Recent Activity Feed */}
            <div>
              <h3 className="font-label-sm text-[12px] text-outline uppercase tracking-widest mb-4 mt-8 px-1">
                Recent Activity
              </h3>
              <div className="space-y-3">
                {/* Activity Item 1 */}
                <div className="bg-surface-container-low/50 border border-outline-variant/20 p-4 rounded-lg flex gap-4 hover:border-outline-variant/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center flex-shrink-0">
                    <Trophy className="text-secondary w-5 h-5" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="flex items-baseline gap-2">
                      <span className="font-body-md text-sm text-on-surface font-medium">
                        Achievement Unlocked:{" "}
                        <span className="text-secondary font-bold">
                          Grid Walker
                        </span>
                      </span>
                    </div>
                    <span className="font-label-sm text-[10px] text-on-surface-variant mt-1">
                      Yesterday at 22:45 UTC
                    </span>
                  </div>
                </div>
                {/* Activity Item 2 */}
                <div className="bg-surface-container-low/50 border border-outline-variant/20 p-4 rounded-lg flex gap-4 hover:border-outline-variant/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="text-on-surface-variant w-5 h-5" />
                  </div>
                  <div className="flex flex-col justify-center w-full">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="font-body-md text-sm text-on-surface font-medium">
                        You captured 3 new screenshots
                      </span>
                    </div>
                    <div className="flex gap-2 h-16 w-full">
                      <div className="h-full w-24 bg-surface-container-high rounded border border-outline-variant/30 overflow-hidden">
                        <img
                          alt="Screenshot 1"
                          className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA7McsSMcgBUfsaLeUQZucfDp9nzbpWbN52uOG47UUNPDjBGVKTUDQIBhAOm3Tu9KnFfHmqR1VXht8HHHF4OIPG_wVAr_djlNjnG1tjlz45HyUB1rl9Il0JXaxK1MKkxIFy63cViXtCmCpJfzAbpl4B4FfS8yXgYg6st1KRDslNDTq71CvtDl90Gh-55cO-t_T12z-q1pzPkiU2Dbspm0-jZeKY1tAgaWg5OPnDs5Sj_QcSSIMcn5_c0qUFfcCuTmUOhYJssGIkjS9b"
                        />
                      </div>
                      <div className="h-full w-24 bg-surface-container-high rounded border border-outline-variant/30 overflow-hidden">
                        <img
                          alt="Screenshot 2"
                          className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuA46db4OopH-Hv5oHAzcGHSrBn-tpdi45cIFCWV-Ut-28EG63TJTWPMYW14pl6acdxhmn2Nj1BOVp_soiXvYl-w1HJIgJkrrQ2KJ6Qgl12pzO0IoGc89x1yuez965BDetam0XR1HqV4sZQVoU0KWKqS3kZufczAKYDMiWDc8XpGzamdS1-fK3TbwUKAL6hVoJI8J12fKq5ezDF04qyKkjuQOdzLn1RLn93CrSJLGUczXKRG_qO_9Xe7eRitDrpUme1qagMsFfLtApd4"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Right Column (Stats & Metadata) */}
          <div className="space-y-6">
            {/* Achievements Widget */}
            <div className="glass-panel p-5 rounded-xl border-t-2 border-t-secondary relative overflow-hidden">
              {/* Subtle purple glow in background */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex justify-between items-end mb-4 relative z-10">
                <h3 className="font-headline-md text-[16px] text-white font-bold">
                  Achievements
                </h3>
                <span className="font-label-sm text-[12px] text-secondary tracking-widest">
                  24/40
                </span>
              </div>
              {/* Progress Bar */}
              <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden border border-outline-variant/20 mb-4 relative z-10">
                <div className="h-full bg-secondary w-[60%] shadow-[0_0_10px_rgba(209,188,255,0.5)]"></div>
              </div>
              <div className="grid grid-cols-4 gap-2 relative z-10">
                <div className="aspect-square bg-surface-container-highest rounded border border-secondary/30 flex items-center justify-center relative group">
                  <Award className="text-secondary w-6 h-6" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-secondary rounded-full"></div>
                </div>
                <div className="aspect-square bg-surface-container-highest rounded border border-secondary/30 flex items-center justify-center">
                  <Medal className="text-secondary w-6 h-6" />
                </div>
                <div className="aspect-square bg-surface-container-highest rounded border border-secondary/30 flex items-center justify-center">
                  <Gauge className="text-secondary w-6 h-6" />
                </div>
                <div className="aspect-square bg-surface-container-lowest/50 rounded border border-outline-variant/20 flex items-center justify-center opacity-50">
                  <Lock className="text-outline-variant w-6 h-6" />
                </div>
              </div>
            </div>
            {/* Developer Info Panel */}
            <div className="bg-surface-container-low/40 border border-outline-variant/20 p-5 rounded-xl space-y-4">
              <h3 className="font-label-sm text-[12px] text-outline uppercase tracking-widest border-b border-outline-variant/20 pb-2">
                Archive Metadata
              </h3>
              <div className="flex justify-between items-center">
                <span className="font-body-md text-sm text-on-surface-variant">
                  Developer
                </span>
                <span className="font-label-sm text-[11px] text-primary hover:text-primary-container cursor-pointer transition-colors">
                  Synapse Studios
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body-md text-sm text-on-surface-variant">
                  Publisher
                </span>
                <span className="font-label-sm text-[11px] text-primary hover:text-primary-container cursor-pointer transition-colors">
                  INDIE_CORE Originals
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body-md text-sm text-on-surface-variant">
                  Release Date
                </span>
                <span className="font-label-sm text-[11px] text-on-surface">
                  Oct 24, 2042
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body-md text-sm text-on-surface-variant">
                  Disk Usage
                </span>
                <span className="font-label-sm text-[11px] text-on-surface">
                  14.2 GB
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Bottom padding to prevent footer overlap */}
        <div className="h-16"></div>
      </div>
    </div>
  );
}
