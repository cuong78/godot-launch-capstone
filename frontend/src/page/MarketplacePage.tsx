import React from "react";
import { useTranslation } from "react-i18next";
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
  ownedProductIds: Set<string>;
}

const DEFAULT_GODOT_VERSION = "All Versions";
const DEFAULT_MAX_PRICE = 200000000;

const CATEGORY_FILTER_OPTIONS = [
  {
    value: "Scripts & Plugins",
    labelKey: "filters.categories.scriptsPlugins",
  },
  { value: "Shaders & VFX", labelKey: "filters.categories.shadersVfx" },
  { value: "2D Assets", labelKey: "filters.categories.twoDAssets" },
  { value: "3D Models", labelKey: "filters.categories.threeDModels" },
  { value: "Audio & SFX", labelKey: "filters.categories.audioSfx" },
] as const;

const GODOT_VERSION_OPTIONS = [
  { value: DEFAULT_GODOT_VERSION, labelKey: "filters.versions.all" },
  { value: "Godot 4.x (Latest)", labelKey: "filters.versions.godot4Latest" },
  { value: "Godot 3.5 LTS", labelKey: "filters.versions.godot35Lts" },
  { value: "Legacy Godot 3.x", labelKey: "filters.versions.legacyGodot3x" },
] as const;

const SORT_OPTIONS = [
  { value: "popular", labelKey: "filters.sort.popular" },
  { value: "price-low", labelKey: "filters.sort.priceLow" },
  { value: "price-high", labelKey: "filters.sort.priceHigh" },
] as const;

const ASSET_CATEGORY_LABEL_KEYS: Record<Asset["category"], string> = {
  "Scripts & Plugins": "filters.categories.scriptsPlugins",
  "Shaders & VFX": "filters.categories.shadersVfx",
  "2D Assets": "filters.categories.twoDAssets",
  "3D Models": "filters.categories.threeDModels",
  "Audio & SFX": "filters.categories.audioSfx",
};

const resolveNumberLocale = (language?: string | null) => {
  const normalized = language?.toLowerCase().split("-")[0];
  if (normalized === "en") return "en-US";
  if (normalized === "ja") return "ja-JP";
  return "vi-VN";
};

const formatCurrencyAmount = (amount: number, locale: string) =>
  `${new Intl.NumberFormat(locale).format(amount)} đ`;

const formatCompactPrice = (
  price: number,
  locale: string,
  freeLabel: string,
) => (price === 0 ? freeLabel : formatCurrencyAmount(price, locale));

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
  ownedProductIds,
}) => {
  const { t, i18n } = useTranslation(["marketplace"]);
  // Marketplace giờ chỉ còn asset thuần (source_code chuyển sang Game market)
  const assetListings = filteredAssets;
  const numberLocale = resolveNumberLocale(
    i18n.resolvedLanguage || i18n.language,
  );

  const resetMarketplaceFilters = () => {
    setSearchText("");
    setSelectedCategories([]);
    setGodotVersion(DEFAULT_GODOT_VERSION);
    setMaxPrice(DEFAULT_MAX_PRICE);
  };

  const getCategoryLabel = (category: Asset["category"]) =>
    t(ASSET_CATEGORY_LABEL_KEYS[category]);

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
    <div className="space-y-5 animate-fade-in">
      {/* Top filter banner panel */}
      <div className="bg-gradient-to-r from-sky-600/10 via-amber-400/5 to-slate-900 border border-slate-250 dark:border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3.5">
        <div>
          <h1 className="font-display font-bold text-[1.85rem] text-slate-850 dark:text-white flex items-center gap-2">
            <Sliders size={20} className="text-amber-400" />{" "}
            {t("page.catalogTitle")}
          </h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5">
            {t("page.catalogSubtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetMarketplaceFilters}
            className="text-xs"
          >
            {t("page.resetFilters")}
          </Button>
          <span className="text-xs font-mono bg-amber-400/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/25">
            {t("page.resultsMatch", { count: filteredAssets.length })}
          </span>
        </div>
      </div>

      {/* Split Screen search layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Dynamic Left sidebar selectors */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 space-y-5 flex-none max-h-fit self-start">
          {/* Search string field inside sidebar */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("filters.searchLabel")}
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-3 text-slate-400"
              />
              <input
                type="text"
                placeholder={t("filters.searchPlaceholder")}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Checklist Categories filter */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              {t("filters.categoryLabel")}
            </label>
            <div className="space-y-2">
              {CATEGORY_FILTER_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(option.value)}
                    onChange={() => toggleCategory(option.value)}
                    className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-800 accent-amber-400"
                  />
                  {t(option.labelKey)}
                </label>
              ))}
            </div>
          </div>

          {/* Godot spec target edition dropdown */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              {t("filters.versionLabel")}
            </label>
            <select
              value={godotVersion}
              onChange={(e) => setGodotVersion(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-sky-500 text-slate-600 dark:text-slate-200"
            >
              {GODOT_VERSION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>

          {/* Sliding price filter input */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-bold uppercase tracking-wider text-slate-400">
                {t("filters.priceLabel")}
              </label>
              <span className="font-mono font-bold text-amber-500">
                {formatCurrencyAmount(maxPrice, numberLocale)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={DEFAULT_MAX_PRICE}
              step="1000000"
              value={maxPrice}
              onChange={(e) => setMaxPrice(parseInt(e.target.value))}
              className="w-full accent-amber-400 h-1 bg-slate-100 dark:bg-slate-950 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[9px] font-mono text-slate-500">
              <span>
                {t("filters.price.minFree", {
                  amount: formatCurrencyAmount(0, numberLocale),
                  free: t("common.free"),
                })}
              </span>
              <span>
                {t("filters.price.mid", {
                  amount: formatCurrencyAmount(100000000, numberLocale),
                })}
              </span>
              <span>
                {t("filters.price.max", {
                  amount: formatCurrencyAmount(DEFAULT_MAX_PRICE, numberLocale),
                })}
              </span>
            </div>
          </div>

          {/* Dynamic sorting index selector */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              {t("filters.sortLabel")}
            </label>
            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value as MarketplacePageProps["sortOrder"])
              }
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-sky-500 text-slate-600 dark:text-slate-200"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Marketplace Grid results layout */}
        <div className="lg:col-span-3 space-y-5">
          {/* Visual promo notification banner when list filtered */}
          {filteredAssets.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center rounded-2xl flex flex-col items-center justify-center space-y-4">
              <Info size={36} className="text-sky-500" />
              <h3 className="font-display font-medium text-slate-800 dark:text-slate-200">
                {t("empty.noMatchTitle")}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                {t("empty.noMatchDescription")}
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={resetMarketplaceFilters}
              >
                {t("empty.resetSearch")}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <section className="relative overflow-hidden rounded-2xl border border-slate-250 bg-gradient-to-r from-sky-600/10 via-amber-400/5 to-slate-900 p-4 shadow-sm backdrop-blur-md dark:border-slate-800 sm:p-5">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.10),transparent_26%)]" />
                <div className="relative z-10">
                  <div className="mb-4 flex flex-col gap-2.5 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <h2 className="font-display text-[1.9rem] font-bold text-slate-850 dark:text-white flex items-center gap-2">
                        <Boxes size={22} className="text-sky-500" />{" "}
                        {t("page.assetTitle")}
                      </h2>
                      <p className="mt-0.5 text-sm text-slate-550 dark:text-slate-400">
                        {t("page.assetSubtitle")}
                      </p>
                    </div>
                    <span className="inline-flex self-start rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-mono font-bold text-sky-500 backdrop-blur-sm">
                      {t("page.assetListings", { count: assetListings.length })}
                    </span>
                  </div>

                  {assetListings.length === 0 ? (
                    renderEmptyState(
                      t("empty.noAssetTitle"),
                      t("empty.noAssetDescription"),
                    )
                  ) : (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {assetListings.map((asset) => (
                        <article
                          key={asset.id}
                          onClick={() => handleViewAssetDetails(asset)}
                          className="group flex min-h-[21.65rem] cursor-pointer flex-col overflow-hidden rounded-[22px] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.98))] transition-studio hover:scale-[1.012] hover:border-sky-500/45 hover:shadow-[0_22px_40px_rgba(15,23,42,0.14)] dark:border-sky-900/45 dark:bg-[linear-gradient(180deg,rgba(8,14,28,0.96),rgba(10,15,27,0.98))] dark:hover:border-sky-500/45"
                        >
                          <div className="relative aspect-[1.5/1] overflow-hidden bg-slate-950/20">
                            <img
                              referrerPolicy="no-referrer"
                              src={asset.image}
                              alt={asset.title}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/72 via-slate-950/12 to-transparent" />
                            <span className="absolute bottom-3 right-3 rounded-lg border border-slate-800 bg-slate-950/85 px-2.5 py-1 text-xs font-bold text-amber-400 backdrop-blur-sm">
                              {formatCompactPrice(
                                asset.price,
                                numberLocale,
                                t("common.free"),
                              )}
                            </span>
                          </div>

                          <div className="flex flex-1 flex-col p-3.5">
                            <div className="flex items-start justify-between gap-3">
                              <h5
                                className="line-clamp-2 min-h-[2.45rem] font-display text-[0.98rem] font-bold leading-5 text-slate-850 dark:text-white"
                                title={asset.title}
                              >
                                {asset.title}
                              </h5>
                              <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-amber-500">
                                <Star size={13} className="fill-amber-500" />
                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                  {asset.rating.toFixed(1)}
                                </span>
                              </span>
                            </div>

                            <div className="mb-2 flex items-center justify-between text-sm">
                              <span className="font-medium text-slate-500 dark:text-slate-400">
                                {getCategoryLabel(asset.category)}
                              </span>
                            </div>

                            <p className="mb-2.5 line-clamp-2 min-h-[2.2rem] text-[0.92rem] leading-5 text-slate-500 dark:text-slate-400">
                              {asset.description}
                            </p>

                            <div className="mt-auto flex items-center justify-between gap-3">
                              <div className="flex max-w-[48%] flex-col items-start gap-1.5">
                                <PackageOpen size={12} className="shrink-0 text-sky-500" />
                                {asset.tagList && asset.tagList.length > 0 ? (
                                  <div className="flex flex-col items-start gap-1">
                                    {asset.tagList.slice(0, 2).map((tag, idx) => (
                                      <span
                                        key={idx}
                                        className="max-w-[92px] truncate rounded-md bg-sky-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-sky-500"
                                        title={tag}
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                    {t("card.resource")}
                                  </span>
                                )}
                              </div>
                              {ownedProductIds.has(asset.id) ? (
                                <span className="inline-flex min-h-[2.55rem] min-w-[6.35rem] items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-500">
                                  {t("card.owned")}
                                </span>
                              ) : (
                                <Button
                                  variant="secondary-flat"
                                  size="sm"
                                  className="min-h-[2.55rem] min-w-[6.35rem] whitespace-nowrap rounded-xl !border-[#d88400] !bg-[#FE9A00] px-3 text-[13px] font-bold !text-slate-950 hover:!bg-[#ffac21] dark:!border-[#d88400] dark:!bg-[#FE9A00] dark:!text-slate-950 dark:hover:!bg-[#ffac21]"
                                  style={{ backgroundColor: '#FE9A00', borderColor: '#d88400', color: '#020617' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToCart(asset);
                                  }}
                                >
                                  {t("card.addToCart")}
                                </Button>
                              )}
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
