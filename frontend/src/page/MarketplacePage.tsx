import React from "react";
import {
  Sliders,
  Search,
  Info,
  Star,
  Code2,
  Boxes,
  ArrowRight,
  Sparkles,
  FolderCode,
  PackageOpen,
} from "lucide-react";
import { Button } from "../components/Button";
import { Asset } from "../types";

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

const SOURCE_KEYWORD_BLACKLIST = new Set([
  "godot ready",
  "godot 4",
  "godot 4.x",
  "godot",
  "2d",
  "3d",
  "marketplace",
  "published",
  "free",
  "ui & elements",
  "grid systems",
  "tileset",
]);

const formatCompactPrice = (price: number) =>
  price === 0 ? "FREE" : `$${price.toFixed(2)}`;

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
  setSelectedCategories,
}) => {
  const { sourceListings, assetListings } = React.useMemo(() => {
    return filteredAssets.reduce<{
      sourceListings: Asset[];
      assetListings: Asset[];
    }>(
      (groups, asset) => {
        if (asset.itemType === "source_code") {
          groups.sourceListings.push(asset);
        } else {
          groups.assetListings.push(asset);
        }
        return groups;
      },
      { sourceListings: [], assetListings: [] },
    );
  }, [filteredAssets]);

  const sourceKeywordChips = React.useMemo(() => {
    const keywordMap = new Map<string, string>();

    sourceListings.forEach((asset) => {
      asset.tagList.forEach((tag) => {
        const normalized = tag.trim().toLowerCase();
        if (!normalized || SOURCE_KEYWORD_BLACKLIST.has(normalized)) {
          return;
        }

        if (!keywordMap.has(normalized)) {
          keywordMap.set(normalized, tag.trim());
        }
      });
    });

    return Array.from(keywordMap.values()).slice(0, 5);
  }, [sourceListings]);

  const assetCategoryChips = React.useMemo(() => {
    return ["Shaders & VFX", "2D Assets", "3D Models", "Audio & SFX"].filter(
      (category) => assetListings.some((asset) => asset.category === category),
    );
  }, [assetListings]);

  const renderEmptyState = (title: string, description: string) => (
    <div className="rounded-2xl border border-dashed border-slate-250 bg-slate-50/50 px-5 py-8 text-center dark:border-slate-800 dark:bg-slate-950/30">
      <p className="font-display text-sm font-semibold text-slate-800 dark:text-slate-200">
        {title}
      </p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top filter banner panel */}
      <div className="bg-gradient-to-r from-sky-600/10 via-amber-400/5 to-slate-900 border border-slate-250 dark:border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-850 dark:text-white flex items-center gap-2">
            <Sliders size={20} className="text-amber-400" /> Marketplace Catalog
          </h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
            Explore community script plugins, asset textures, and templates
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchText("");
              setSelectedCategories([]);
              setGodotVersion("All Versions");
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
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Quick Text Search
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-3 text-slate-400"
              />
              <input
                type="text"
                placeholder="Input search strings..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Checklist Categories filter */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Filter Craft Categories
            </label>
            <div className="space-y-2">
              {[
                "Scripts & Plugins",
                "Shaders & VFX",
                "2D Assets",
                "3D Models",
                "Audio & SFX",
              ].map((cat) => (
                <label
                  key={cat}
                  className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                >
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
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Engine Target Version
            </label>
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
              <label className="font-bold uppercase tracking-wider text-slate-400">
                Max Budget Price
              </label>
              <span className="font-mono font-bold text-amber-500">
                ${maxPrice}
              </span>
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
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Preference Ordering
            </label>
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
              <h3 className="font-display font-medium text-slate-800 dark:text-slate-200">
                No Marketplace Item Matches Your Selected Filters
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                We couldn't find matching files. Try searching a different
                keyword or resetting filters to the default setup values.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSearchText("");
                  setSelectedCategories([]);
                  setGodotVersion("All Versions");
                  setMaxPrice(100);
                }}
              >
                Reset Marketplace Search
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              <section className="relative overflow-hidden rounded-2xl border border-slate-250 bg-gradient-to-r from-sky-600/10 via-amber-400/5 to-slate-900 p-5 shadow-sm backdrop-blur-md dark:border-slate-800">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.10),transparent_26%)]" />
                <div className="relative z-10">
                  <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-slate-850 dark:text-white flex items-center gap-2">
                        <Code2 size={22} className="text-amber-400" /> Source Code
                      </h2>
                      <p className="mt-1 text-sm text-slate-550 dark:text-slate-400">
                        Discover complete Godot projects, gameplay frameworks, and
                        reusable source-first systems.
                      </p>
                    </div>
                    <span className="inline-flex self-start rounded-full border border-amber-500/20 bg-amber-400/10 px-3 py-1 text-xs font-mono font-bold text-amber-500 backdrop-blur-sm">
                      {sourceListings.length} source listings
                    </span>
                  </div>

                  <div className="mb-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchText("")}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-studio ${
                      !searchText
                        ? "bg-amber-400 text-slate-950 shadow-[0_2px_0_0_#9a7d00]"
                        : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-amber-400 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-350 dark:hover:border-amber-500 dark:hover:text-white"
                    }`}
                  >
                    All Projects
                  </button>
                  {sourceKeywordChips.map((keyword) => (
                    <button
                      key={keyword}
                      type="button"
                      onClick={() => setSearchText(keyword)}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-studio ${
                        searchText.toLowerCase() === keyword.toLowerCase()
                          ? "bg-amber-400 text-slate-950 shadow-[0_2px_0_0_#9a7d00]"
                          : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-amber-400 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-350 dark:hover:border-amber-500 dark:hover:text-white"
                      }`}
                    >
                      {keyword}
                    </button>
                  ))}
                  </div>

                  {sourceListings.length === 0 ? (
                    renderEmptyState(
                      "No source code listing matches the active filters.",
                      "Try broadening your search keywords or clear category filters to surface source-based projects again.",
                    )
                  ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {sourceListings.map((asset) => (
                        <article
                          key={asset.id}
                          onClick={() => handleViewAssetDetails(asset)}
                          className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 transition-studio hover:-translate-y-1 hover:border-amber-400/60 hover:shadow-lg dark:border-slate-800/80 dark:bg-slate-950/55 dark:hover:border-amber-400/50"
                        >
                          <div className="relative h-48 overflow-hidden bg-slate-950/20">
                            <img
                              referrerPolicy="no-referrer"
                              src={asset.image}
                              alt={asset.title}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <span className="absolute left-3 top-3 rounded-lg border border-amber-400/20 bg-slate-950/80 px-2.5 py-1 text-[11px] font-bold text-amber-400 backdrop-blur-sm">
                              {asset.version || "v1.0"}
                            </span>
                            {asset.isBestseller && (
                              <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                                <Sparkles size={11} className="text-amber-300" />{" "}
                                Featured
                              </span>
                            )}
                          </div>

                          <div className="flex flex-1 flex-col p-5">
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <h4 className="font-display text-lg font-bold leading-tight text-slate-850 dark:text-white">
                                {asset.title}
                              </h4>
                              <span className="shrink-0 text-base font-bold text-amber-500">
                                {formatCompactPrice(asset.price)}
                              </span>
                            </div>

                            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                              <span className="rounded-full bg-sky-500/10 px-2.5 py-1 font-bold uppercase tracking-wider text-sky-500">
                                {asset.tagList[0] || "Source"}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400">
                                by {asset.author}
                              </span>
                            </div>

                            <p className="mb-5 line-clamp-3 text-sm leading-relaxed text-slate-550 dark:text-slate-400">
                              {asset.description}
                            </p>

                            <div className="mb-5 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                              <div className="flex items-center gap-1.5 text-amber-500">
                                <Star size={12} className="fill-amber-500" />
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {asset.rating.toFixed(1)} ({asset.reviewedCount}
                                  )
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <FolderCode size={12} className="text-sky-500" />
                                <span>
                                  {asset.lastUpdated || "Recently updated"}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleViewAssetDetails(asset);
                              }}
                              className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-studio group-hover:border-amber-400 group-hover:bg-amber-400 group-hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:group-hover:border-amber-400 dark:group-hover:bg-amber-400 dark:group-hover:text-slate-950"
                            >
                              View Details <ArrowRight size={14} />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="relative overflow-hidden rounded-2xl border border-slate-250 bg-gradient-to-r from-sky-600/10 via-amber-400/5 to-slate-900 p-5 shadow-sm backdrop-blur-md dark:border-slate-800">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.10),transparent_26%)]" />
                <div className="relative z-10">
                  <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-slate-850 dark:text-white flex items-center gap-2">
                        <Boxes size={22} className="text-sky-500" /> Asset Marketplace
                      </h2>
                      <p className="mt-1 text-sm text-slate-550 dark:text-slate-400">
                        Find polished art packs, shaders, audio collections, and
                        production-ready resources.
                      </p>
                    </div>
                    <span className="inline-flex self-start rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-mono font-bold text-sky-500 backdrop-blur-sm">
                      {assetListings.length} asset listings
                    </span>
                  </div>

                  <div className="mb-6 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategories([])}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-studio ${
                      selectedCategories.length === 0
                        ? "bg-sky-500 text-white shadow-[0_2px_0_0_#025272]"
                        : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-sky-500 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-350 dark:hover:border-sky-500 dark:hover:text-white"
                    }`}
                  >
                    All Assets
                  </button>
                  {assetCategoryChips.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-studio ${
                        selectedCategories.includes(category)
                          ? "bg-sky-500 text-white shadow-[0_2px_0_0_#025272]"
                          : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-sky-500 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-350 dark:hover:border-sky-500 dark:hover:text-white"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                  </div>

                  {assetListings.length === 0 ? (
                    renderEmptyState(
                      "No asset listing matches the active filters.",
                      "Keep the current search logic, then widen category or price filters to bring asset packs back into view.",
                    )
                  ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                      {assetListings.map((asset) => (
                        <article
                          key={asset.id}
                          onClick={() => handleViewAssetDetails(asset)}
                          className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 transition-studio hover:scale-[1.015] hover:border-sky-500/45 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-950/55 dark:hover:border-sky-500/45"
                        >
                          <div className="relative aspect-square overflow-hidden bg-slate-950/20">
                            <img
                              referrerPolicy="no-referrer"
                              src={asset.image}
                              alt={asset.title}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <span className="absolute bottom-3 right-3 rounded-lg border border-slate-800 bg-slate-950/85 px-2.5 py-1 text-xs font-bold text-amber-400 backdrop-blur-sm">
                              {formatCompactPrice(asset.price)}
                            </span>
                          </div>

                          <div className="flex flex-1 flex-col p-4">
                            <div className="mb-1 flex items-start justify-between gap-3">
                              <h5
                                className="truncate font-display text-sm font-bold text-slate-850 dark:text-white"
                                title={asset.title}
                              >
                                {asset.title}
                              </h5>
                            </div>

                            <div className="mb-3 flex items-center justify-between text-xs">
                              <span className="text-slate-500 dark:text-slate-400">
                                {asset.category}
                              </span>
                              <span className="inline-flex items-center gap-1 text-amber-500">
                                <Star size={11} className="fill-amber-500" />
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {asset.rating.toFixed(1)}
                                </span>
                              </span>
                            </div>

                            <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                              {asset.description}
                            </p>

                            <div className="mt-auto flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                                <PackageOpen size={12} className="text-sky-500" />
                                {asset.tagList[0] || "Resource"}
                              </span>
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
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
