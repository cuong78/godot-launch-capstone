import React from 'react';
import { Sliders, Search, Info, Star } from 'lucide-react';
import { Button } from '../components/Button';
import { Asset } from '../types';

interface MarketplacePageProps {
  filteredAssets: Asset[];
  searchText: string;
  setSearchText: (text: string) => void;
  selectedCategories: string[];
  toggleCategory: (category: string) => void;
  godotVersion: string;
  setGodotVersion: (version: string) => void;
  maxPrice: number;
  setMaxPrice: (price: number) => void;
  sortOrder: "popular" | "price-low" | "price-high";
  setSortOrder: (order: "popular" | "price-low" | "price-high") => void;
  handleViewAssetDetails: (asset: Asset) => void;
  handleAddToCart: (asset: Asset) => void;
  setSelectedCategories: (categories: string[]) => void;
}

export const MarketplacePage: React.FC<MarketplacePageProps> = ({
  filteredAssets,
  searchText,
  setSearchText,
  selectedCategories,
  toggleCategory,
  godotVersion,
  setGodotVersion,
  maxPrice,
  setMaxPrice,
  sortOrder,
  setSortOrder,
  handleViewAssetDetails,
  handleAddToCart,
  setSelectedCategories
}) => {
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top filter banner panel */}
      <div className="bg-gradient-to-r from-sky-600/10 via-amber-400/5 to-slate-900 border border-slate-250 dark:border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-850 dark:text-white flex items-center gap-2">
            <Sliders size={20} className="text-amber-400" /> Marketplace Catalog
          </h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">Explore community script plugins, asset textures, and templates</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { 
              setSearchText(''); 
              setSelectedCategories([]); 
              setGodotVersion('All Versions'); 
              setMaxPrice(100); 
            }} 
            className="text-xs"
          >
            Reset Filters
          </Button>
          <span className="text-xs font-mono bg-amber-400/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/25">
            {filteredAssets.length} Results Match
          </span>
        </div>
      </div>

      {/* Split Screen search layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Dynamic Left sidebar selectors */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 space-y-6 flex-none max-h-fit self-start">
          
          {/* Search string field inside sidebar */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Quick Text Search</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Input search strings..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-805 rounded-lg outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Checklist Categories filter */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Filter Craft Categories</label>
            <div className="space-y-2">
              {['Scripts & Plugins', 'Shaders & VFX', '2D Assets', '3D Models', 'Audio & SFX'].map(cat => (
                <label key={cat} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                    className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-800 accent-amber-400"
                  />
                  {cat}
                </label>
              ))}
            </div>
          </div>

          {/* Godot spec target edition dropdown */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Engine Target Version</label>
            <select
              value={godotVersion}
              onChange={(e) => setGodotVersion(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-sky-500 text-slate-600 dark:text-slate-200"
            >
              <option>All Versions</option>
              <option>Godot 4.x (Latest)</option>
              <option>Godot 3.5 LTS</option>
              <option>Legacy Godot 3.x</option>
            </select>
          </div>

          {/* Sliding price filter input */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold uppercase tracking-wider text-slate-400">Max Budget Price</label>
              <span className="font-mono font-bold text-amber-500">${maxPrice}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={maxPrice}
              onChange={(e) => setMaxPrice(parseInt(e.target.value))}
              className="w-full accent-amber-400 h-1 bg-slate-100 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>$0 (Free)</span>
              <span>$50</span>
              <span>$100+</span>
            </div>
          </div>

          {/* Dynamic sorting index selector */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Preference Ordering</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-sky-500 text-slate-600 dark:text-slate-200"
            >
              <option value="popular">Popularity Index</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>

        </div>

        {/* Right Marketplace Grid results layout */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Visual promo notification banner when list filtered */}
          {filteredAssets.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center rounded-2xl flex flex-col items-center justify-center space-y-4">
              <Info size={36} className="text-sky-500" />
              <h3 className="font-display font-medium text-slate-800 dark:text-slate-200">No Asset Pack Matches Your Selected Filters</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                We couldn't find matching files. Try searching a different keyword or resetting filters to the default setup values.
              </p>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => { 
                  setSearchText(''); 
                  setSelectedCategories([]); 
                  setGodotVersion('All Versions'); 
                  setMaxPrice(100); 
                }}
              >
                Reset Marketplace Search
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {filteredAssets.map(asset => (
                <div
                  key={asset.id}
                  onClick={() => handleViewAssetDetails(asset)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden hover:shadow-md hover:border-amber-400/50 dark:hover:border-amber-400/50 transition-studio cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative h-40 bg-slate-950/20 overflow-hidden">
                    <img 
                      referrerPolicy="no-referrer" 
                      src={asset.image} 
                      alt={asset.title} 
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" 
                    />
                    <span className="absolute bottom-2.5 right-2 rounded px-2.5 py-1 text-xs font-bold bg-slate-950/80 backdrop-blur-sm text-amber-400 border border-slate-805 font-mono">
                      {asset.price === 0 ? 'FREE' : `$${asset.price.toFixed(2)}`}
                    </span>
                  </div>

                  <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <span className="text-[9px] tracking-wider text-sky-500 font-bold uppercase">{asset.category}</span>
                      <h4 className="font-display font-bold text-xs sm:text-sm text-slate-800 dark:text-white truncate" title={asset.title}>
                        {asset.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {asset.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-0.5 text-amber-500">
                        <Star size={11} className="fill-amber-500" />
                        <span className="font-bold text-slate-700 dark:text-slate-300">{asset.rating.toFixed(1)}</span>
                      </div>
                      <Button
                        variant="secondary-flat"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(asset);
                        }}
                      >
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
