import React from 'react';
import { Sparkles, Play, Star, ChevronRight, User, Clock, ArrowRight, Layers, BookOpen, Plus } from 'lucide-react';
import { Button } from '../components/Button';
import { Asset } from '../types';
import { BANNER_HERO_IMAGE, IMAGE_SEED_MAP } from '../../assets/images';

interface HomePageProps {
  assets: Asset[];
  setCurrentScreen: (screen: any) => void;
  handleCategoryClick: (category: string) => void;
  handleViewAssetDetails: (asset: Asset) => void;
  handleAddToCart: (asset: Asset) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  assets,
  setCurrentScreen,
  handleCategoryClick,
  handleViewAssetDetails,
  handleAddToCart
}) => {
  return (
    <div className="space-y-12 animate-fade-in">
      
      {/* Grand Hero Promo Module */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-xl">
        <div className="absolute inset-0 z-0">
          <img 
            referrerPolicy="no-referrer" 
            src={BANNER_HERO_IMAGE} 
            alt="Godot launch epic promo screen" 
            className="w-full h-full object-cover opacity-85 dark:opacity-40" 
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/95 to-transparent dark:from-slate-950 dark:via-slate-950/90 dark:to-transparent"></div>
        </div>

        <div className="relative z-10 px-6 sm:px-12 py-16 sm:py-20 md:max-w-2xl space-y-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-900 shadow-sm">
            <Sparkles size={12} /> GLOBAL CREATORS DECK
          </span>
          <h1 className="font-display font-bold text-3xl sm:text-5xl text-slate-900 dark:text-white tracking-tight leading-tight">
            Launch Your Indie Sandbox Dreams
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            Discover ready-to-run Godot shader setups, procedural grid controls, cozy pixel environments, and premium vehicle frameworks built by top-tier open source contributors.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              icon={<Play size={15} className="fill-slate-900" />}
              onClick={() => setCurrentScreen('marketplace')}
            >
              Explore Assets
            </Button>
            <Button
              variant="outline"
              size="md"
              className="bg-white/50 dark:bg-slate-950/30 backdrop-blur-sm"
              onClick={() => setCurrentScreen('path')}
            >
              View Dev Acquisition
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 rounded-2xl p-4 shadow-sm">
          <div className="border-l-4 border-amber-400 pl-3">
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">Assets by Core Craft</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Fine-tuned modular building blocks</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Scripts & Plugins', count: '14 plugins', icon: <Layers size={18} />, bg: IMAGE_SEED_MAP.drift, color: 'from-amber-500/20 to-amber-700/20' },
            { name: 'Shaders & VFX', count: '9 shaders', icon: <Sparkles size={18} />, bg: IMAGE_SEED_MAP.interior, color: 'from-sky-500/20 to-sky-700/20' },
            { name: '2D Assets', count: '22 tilesets', icon: <Plus size={18} />, bg: IMAGE_SEED_MAP.forest, color: 'from-emerald-500/20 to-emerald-700/20' },
            { name: 'Audio & SFX', count: '4 soundboards', icon: <BookOpen size={18} />, bg: IMAGE_SEED_MAP.char, color: 'from-purple-500/20 to-purple-700/20' }
          ].map((cat, idx) => (
            <div
              key={idx}
              onClick={() => handleCategoryClick(cat.name)}
              className="group relative h-32 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-amber-400 dark:hover:border-amber-400 transition-studio shadow-sm active:scale-98"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent z-10"></div>
              <img 
                referrerPolicy="no-referrer" 
                src={cat.bg} 
                alt={cat.name} 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 dark:opacity-60" 
              />
              <div className="absolute inset-0 bg-gradient-to-br z-0 opacity-20"></div>

              <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-col justify-end text-white">
                <div className="text-amber-400 mb-1">{cat.icon}</div>
                <span className="font-display font-bold text-xs sm:text-sm truncate">{cat.name}</span>
                <span className="text-[10px] text-slate-300 font-mono">{cat.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Indie Gems Carousel Deck */}
      <div className="space-y-4">
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="border-l-4 border-sky-400 pl-3">
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">Trending Indie Gems</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Highest rated assets this week</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            icon={<ArrowRight size={14} />} 
            iconPosition="right" 
            onClick={() => setCurrentScreen('marketplace')}
          >
            View All
          </Button>
        </div>

        {/* Horizontal Slider Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.slice(0, 3).map(asset => (
            <div
              key={asset.id}
              onClick={() => handleViewAssetDetails(asset)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden hover:shadow-lg hover:border-amber-400/50 dark:hover:border-amber-400/50 transition-studio cursor-pointer flex flex-col"
            >
              <div className="relative h-44 overflow-hidden bg-slate-950">
                <img 
                  referrerPolicy="no-referrer" 
                  src={asset.image} 
                  alt={asset.title} 
                  className="w-full h-full object-cover hover:scale-102 transition-transform duration-300" 
                />
                {asset.isBestseller && (
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-900 uppercase">
                    BEST SELLER
                  </span>
                )}
                <span className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded bg-slate-950/80 backdrop-blur-sm text-amber-400 text-xs font-mono font-bold border border-slate-800">
                  {asset.price === 0 ? 'FREE' : `$${asset.price.toFixed(2)}`}
                </span>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-sky-500 font-bold uppercase">{asset.category}</span>
                  <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white truncate" title={asset.title}>
                    {asset.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {asset.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star size={13} className="fill-amber-500" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">{asset.rating.toFixed(1)}</span>
                    <span className="text-[10px] text-slate-400">({asset.reviewedCount})</span>
                  </div>
                  <Button
                    variant="secondary-flat"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(asset);
                    }}
                  >
                    Quick Buy
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New & Noteworthy Section row layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Noteworthy Assets Rows Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 rounded-2xl p-4 shadow-sm">
            <div className="border-l-4 border-emerald-400 pl-3">
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">New & Noteworthy</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Just synchronized with creators repository</p>
            </div>
          </div>

          <div className="space-y-3">
            {assets.slice(3, 7).map(item => (
              <div
                key={item.id}
                onClick={() => handleViewAssetDetails(item)}
                className="group bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-studio cursor-pointer flex items-center justify-between gap-4 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img 
                    referrerPolicy="no-referrer" 
                    src={item.image} 
                    alt={item.title} 
                    className="w-14 h-14 object-cover rounded-lg border border-slate-200 dark:border-slate-800" 
                  />
                  <div className="min-w-0">
                    <h4 className="font-display font-semibold text-xs sm:text-sm text-slate-800 dark:text-white truncate group-hover:text-amber-500 dark:group-hover:text-amber-400">
                      {item.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-400 mt-1">
                      <span className="font-bold text-sky-500">{item.category}</span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5"><Star size={11} className="fill-amber-500 text-amber-500" /> {item.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-md border border-slate-200/50 dark:border-slate-800/50">
                    {item.price === 0 ? 'FREE' : `$${item.price.toFixed(2)}`}
                  </span>
                  <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Developer Logs / Blog Card list inside bento row */}
        <div className="space-y-4">
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/40 dark:border-slate-800/40 rounded-2xl p-4 shadow-sm">
            <div className="border-l-4 border-purple-400 pl-3">
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">From the Dev Logs</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Tutorials and industry standards</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <img 
              referrerPolicy="no-referrer" 
              src={IMAGE_SEED_MAP.dev2} 
              alt="Procedural lighting tutorial" 
              className="w-full h-32 object-cover" 
            />
            <div className="p-4 space-y-3.5">
              <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider block">SHADERS WORKSHOP</span>
              <h4 className="font-display font-bold text-sm text-slate-800 dark:text-white hover:text-amber-400 cursor-pointer">
                Optimizing Godot 4 TileMap Shaders for High Emission Lighting
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                A deep dive into layered parallax scrolling layouts, optimizing drawing call frequencies, and mapping custom normal texture structures cleanly.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 font-mono">
                <span className="flex items-center gap-1"><User size={10} /> Mark Sterling</span>
                <span className="flex items-center gap-1"><Clock size={10} /> 8 min read</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
