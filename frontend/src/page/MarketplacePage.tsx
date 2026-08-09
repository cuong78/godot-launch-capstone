import React from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Info,
  Star,
  Code2,
  Boxes,
  ArrowRight,
  Sparkles,
  FolderCode,
  PackageOpen,
  ChevronRight,
  ChevronDown,
  ShoppingCart,
} from "lucide-react";
import { Button } from "../components/Button";
import { Asset, CategoryResponse } from "../types";
import { gameApi } from "../api/gameApi";

interface MarketplacePageProps {
  allAssets: Asset[];
  filteredAssets: Asset[];
  searchText: string;
  setSearchText: (text: string) => void;
  selectedCategories: string[];
  toggleCategory: (category: string) => void;
  godotVersion: string;
  setGodotVersion: (version: string) => void;
  maxPrice: number | null;
  setMaxPrice: (price: number | null) => void;
  sortOrder: "popular" | "price-low" | "price-high";
  setSortOrder: (order: "popular" | "price-low" | "price-high") => void;
  handleViewAssetDetails: (asset: Asset) => void;
  handleAddToCart: (asset: Asset) => void;
  setSelectedCategories: (categories: string[]) => void;
  ownedProductIds: Set<string>;
  creatorOwnedProductIds: Set<string>;
  catalogType: "game" | "asset";
  setCatalogType: React.Dispatch<React.SetStateAction<"game" | "asset">>;
  selectedTags: string[];
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
}

const DEFAULT_GODOT_VERSION = "All Versions";
const MAX_PRICE_CEILING = 10000000;

interface CategoryNode extends CategoryResponse {
  children: CategoryNode[];
}

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  action: "filters.categories.action",
  adventure: "filters.categories.adventure",
  strategy: "filters.categories.strategy",
  casual: "filters.categories.casual",
  platformer: "filters.categories.platformer",
  racing: "filters.categories.racing",
  simulation: "filters.categories.simulation",
  sports: "filters.categories.sports",
  puzzle: "filters.categories.puzzle",
  shooter: "filters.categories.shooter",
  fighting: "filters.categories.fighting",
  "action-adventure": "filters.categories.actionAdventure",
  rpg: "filters.categories.rpg",
  "city builder": "filters.categories.cityBuilder",
  "city-builder": "filters.categories.cityBuilder",
  "card game": "filters.categories.cardGame",
  "card-game": "filters.categories.cardGame",
  "2d assets": "filters.categories.twoDAssets",
  "2d-assets": "filters.categories.twoDAssets",
  "sprites & characters": "filters.categories.spritesCharacters",
  "2d-sprites": "filters.categories.spritesCharacters",
  "tilesets & environments": "filters.categories.tilesetsEnvironments",
  "2d-tilesets": "filters.categories.tilesetsEnvironments",
  "ui kits & icons": "filters.categories.uiKitsIcons",
  "ui-kits": "filters.categories.uiKitsIcons",
  "backgrounds & parallax": "filters.categories.backgroundsParallax",
  "2d-backgrounds": "filters.categories.backgroundsParallax",
  "3d assets": "filters.categories.threeDAssets",
  "3d-assets": "filters.categories.threeDAssets",
  "3d characters": "filters.categories.threeDCharacters",
  "3d-characters": "filters.categories.threeDCharacters",
  "3d props & objects": "filters.categories.threeDPropsObjects",
  "3d-props": "filters.categories.threeDPropsObjects",
  "3d environments & modular": "filters.categories.threeDEnvironmentsModular",
  "3d-environments": "filters.categories.threeDEnvironmentsModular",
  "3d vehicles": "filters.categories.threeDVehicles",
  "3d-vehicles": "filters.categories.threeDVehicles",
  "templates & source code": "filters.categories.templatesSourceCode",
  templates: "filters.categories.templatesSourceCode",
  "full game templates": "filters.categories.fullGameTemplates",
  "game-templates": "filters.categories.fullGameTemplates",
  "gameplay systems": "filters.categories.gameplaySystems",
  "gameplay-systems": "filters.categories.gameplaySystems",
  "multiplayer & network": "filters.categories.multiplayerNetwork",
  "multiplayer-network": "filters.categories.multiplayerNetwork",
  "plugins & add-ons": "filters.categories.pluginsAddons",
  plugins: "filters.categories.pluginsAddons",
  "editor helpers": "filters.categories.editorHelpers",
  "editor-helpers": "filters.categories.editorHelpers",
  "runtime scripts & nodes": "filters.categories.runtimeScriptsNodes",
  "runtime-scripts": "filters.categories.runtimeScriptsNodes",
  "integration tools": "filters.categories.integrationTools",
  "integration-tools": "filters.categories.integrationTools",
  "materials & shaders": "filters.categories.materialsShaders",
  "materials-shaders": "filters.categories.materialsShaders",
  "pbr materials": "filters.categories.pbrMaterials",
  "pbr-materials": "filters.categories.pbrMaterials",
  "godot shaders": "filters.categories.godotShaders",
  "godot-shaders": "filters.categories.godotShaders",
  "textures & patterns": "filters.categories.texturesPatterns",
  "textures-patterns": "filters.categories.texturesPatterns",
  "audio & music": "filters.categories.audioMusic",
  "audio-music": "filters.categories.audioMusic",
  "sound effects": "filters.categories.soundEffects",
  sfx: "filters.categories.soundEffects",
  "music tracks": "filters.categories.musicTracks",
  "music-tracks": "filters.categories.musicTracks",
  "ambient & background noise": "filters.categories.ambientBackgroundNoise",
  "ambient-noise": "filters.categories.ambientBackgroundNoise",
  "vfx & animations": "filters.categories.vfxAnimations",
  "vfx-animations": "filters.categories.vfxAnimations",
  "3d particle effects": "filters.categories.particleEffects3d",
  "3d-vfx": "filters.categories.particleEffects3d",
  "2d particle effects": "filters.categories.particleEffects2d",
  "2d-vfx": "filters.categories.particleEffects2d",
  "rigged animations": "filters.categories.riggedAnimations",
  "rigged-animations": "filters.categories.riggedAnimations",
};

const normalizeCategoryValue = (value: string) => value.toLowerCase().trim();

const CategoryTreeItem: React.FC<{
  node: CategoryNode;
  depth: number;
  selectedCategories: string[];
  handleCategorySelect: (category: string) => void;
  expandedIds: string[];
  toggleExpand: (id: string, e: React.MouseEvent) => void;
  getCategoryCount: (node: CategoryNode) => number;
  getCategoryIcon: (cat: CategoryResponse) => React.ReactNode;
  getCategoryLabel: (category: Pick<CategoryResponse, "name" | "slug">) => string;
  getToggleCategoryLabel: (categoryName: string, isExpanded: boolean) => string;
}> = ({
  node,
  depth,
  selectedCategories,
  handleCategorySelect,
  expandedIds,
  toggleExpand,
  getCategoryCount,
  getCategoryIcon,
  getCategoryLabel,
  getToggleCategoryLabel,
}) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.includes(node.id);
  const isSelected = selectedCategories.includes(node.name);
  const count = getCategoryCount(node);
  const categoryLabel = getCategoryLabel(node);

  return (
    <div className="space-y-1">
      <div
        onClick={() => handleCategorySelect(node.name)}
        className={`group flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-colors text-xs ${
          isSelected 
            ? 'bg-slate-100 dark:bg-slate-800 text-sky-500 dark:text-sky-400 font-bold' 
            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-350 dark:hover:bg-slate-900/40 text-slate-700'
        }`}
        style={{ paddingLeft: `${depth * 14 + 6}px` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {/* Expand/Collapse Chevron */}
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => toggleExpand(node.id, e)}
              className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-400 hover:text-slate-655 dark:hover:text-slate-200"
              aria-label={getToggleCategoryLabel(categoryLabel, isExpanded)}
              title={getToggleCategoryLabel(categoryLabel, isExpanded)}
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : (
            <span className="w-4" /> /* spacer */
          )}

          {/* Category Icon */}
          {getCategoryIcon(node)}

          {/* Category Name */}
          <span className="truncate">{categoryLabel}</span>
        </div>

        {/* Count Badge */}
        {count > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
            {count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count}
          </span>
        )}
      </div>

      {/* Children nodes */}
      {hasChildren && isExpanded && (
        <div className="space-y-1">
          {node.children.map((child) => (
            <CategoryTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedCategories={selectedCategories}
              handleCategorySelect={handleCategorySelect}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              getCategoryCount={getCategoryCount}
              getCategoryIcon={getCategoryIcon}
              getCategoryLabel={getCategoryLabel}
              getToggleCategoryLabel={getToggleCategoryLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const resolveNumberLocale = (language?: string | null) => {
  const normalized = language?.toLowerCase().split("-")[0];
  if (normalized === "en") return "en-US";
  if (normalized === "ja") return "ja-JP";
  return "vi-VN";
};

const formatCurrencyAmount = (amount: number, locale: string) =>
  `${new Intl.NumberFormat(locale).format(amount)} đ`;

export const MarketplacePage: React.FC<MarketplacePageProps> = ({
  allAssets,
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
  creatorOwnedProductIds,
  catalogType,
  setCatalogType,
  selectedTags,
  setSelectedTags,
}) => {
  const { t, i18n } = useTranslation(["marketplace"]);
  const numberLocale = resolveNumberLocale(
    i18n.resolvedLanguage || i18n.language,
  );

  const [gameCategories, setGameCategories] = React.useState<CategoryResponse[]>([]);
  const [assetCategories, setAssetCategories] = React.useState<CategoryResponse[]>([]);
  const [expandedIds, setExpandedIds] = React.useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = React.useState<"tags" | "price" | "date" | "sort" | null>(null);
  const [minPriceInput, setMinPriceInput] = React.useState<number | "">("");
  const [maxPriceInput, setMaxPriceInput] = React.useState<number | "">("");
  const [freeOnly, setFreeOnly] = React.useState<boolean>(false);
  const [publishDateFilter, setPublishDateFilter] = React.useState<string>("all-time");
  const [localSortOrder, setLocalSortOrder] = React.useState<string>("newest");
  const [tagSearchQuery, setTagSearchQuery] = React.useState<string>("");

  const localSortOptions = React.useMemo(
    () => [
      { label: t("filters.sort.newest"), value: "newest" },
      { label: t("filters.sort.oldest"), value: "oldest" },
      { label: t("filters.sort.priceLow"), value: "price-low" },
      { label: t("filters.sort.priceHigh"), value: "price-high" },
      { label: t("filters.sort.alphabeticalAz"), value: "alphabetical-az" },
      { label: t("filters.sort.alphabeticalZa"), value: "alphabetical-za" },
    ],
    [t],
  );

  const publishDateOptions = React.useMemo(
    () => [
      { label: t("filters.publishDate.options.allTime"), value: "all-time" },
      { label: t("filters.publishDate.options.past24h"), value: "24h" },
      { label: t("filters.publishDate.options.past7days"), value: "7days" },
      { label: t("filters.publishDate.options.past30days"), value: "30days" },
    ],
    [t],
  );

  React.useEffect(() => {
    const loadCategories = async () => {
      try {
        const [gameRes, assetRes] = await Promise.all([
          gameApi.getCategories("game"),
          gameApi.getCategories("asset"),
        ]);
        if (gameRes.success && gameRes.data) setGameCategories(gameRes.data);
        if (assetRes.success && assetRes.data) setAssetCategories(assetRes.data);
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    };
    loadCategories();
  }, []);

  const activeCategories = catalogType === "game" ? gameCategories : assetCategories;
  const targetItemType = catalogType === "game" ? "source_code" : "asset";
  const assetListings = filteredAssets.filter(
    (asset) => asset.itemType === targetItemType,
  );
  const allCategories = React.useMemo(
    () => [...gameCategories, ...assetCategories],
    [gameCategories, assetCategories],
  );

  const getCategoryLabel = React.useCallback(
    (category: Pick<CategoryResponse, "name" | "slug"> | string) => {
      const rawName = typeof category === "string" ? category : category.name;
      const normalizedName = normalizeCategoryValue(rawName);
      const resolvedCategory =
        typeof category === "string"
          ? allCategories.find((item) => {
              const itemName = normalizeCategoryValue(item.name);
              const itemSlug = normalizeCategoryValue(item.slug);

              return itemName === normalizedName || itemSlug === normalizedName;
            })
          : category;
      const normalizedSlug = normalizeCategoryValue(
        resolvedCategory?.slug || rawName,
      );
      const exactLabelKey =
        CATEGORY_LABEL_KEYS[normalizedSlug] || CATEGORY_LABEL_KEYS[normalizedName];

      if (exactLabelKey) {
        return t(exactLabelKey);
      }

      if (
        normalizedSlug.includes("audio") ||
        normalizedName.includes("audio") ||
        normalizedName.includes("sound") ||
        normalizedName.includes("sfx")
      ) {
        return t("filters.categories.audioSfx");
      }

      if (
        normalizedSlug.includes("script") ||
        normalizedSlug.includes("plugin") ||
        normalizedName.includes("script") ||
        normalizedName.includes("plugin")
      ) {
        return t("filters.categories.scriptsPlugins");
      }

      if (
        normalizedSlug.includes("shader") ||
        normalizedSlug.includes("vfx") ||
        normalizedName.includes("shader") ||
        normalizedName.includes("vfx")
      ) {
        return t("filters.categories.shadersVfx");
      }

      if (
        normalizedSlug.includes("3d") ||
        normalizedName.includes("3d")
      ) {
        return t("filters.categories.threeDModels");
      }

      if (
        normalizedSlug.includes("2d") ||
        normalizedName.includes("2d")
      ) {
        return t("filters.categories.twoDAssets");
      }

      return rawName;
    },
    [allCategories, t],
  );

  const getToggleCategoryLabel = React.useCallback(
    (categoryName: string, isExpanded: boolean) =>
      isExpanded
        ? t("filters.categoryCollapse", { name: categoryName })
        : t("filters.categoryExpand", { name: categoryName }),
    [t],
  );

  // Extract all available tags dynamically from active categories/assets
  const allAvailableTags = React.useMemo(() => {
    const tagsSet = new Set<string>();
    assetListings.forEach(a => {
      if (a.tag) tagsSet.add(a.tag);
      if (a.tagList) a.tagList.forEach(t => tagsSet.add(t));
    });
    return Array.from(tagsSet).sort();
  }, [assetListings]);

  // Filter tags in dropdown dynamically based on tagSearchQuery
  const filteredTagsForDropdown = React.useMemo(() => {
    if (!tagSearchQuery) return allAvailableTags;
    return allAvailableTags.filter(tag =>
      tag.toLowerCase().includes(tagSearchQuery.toLowerCase())
    );
  }, [allAvailableTags, tagSearchQuery]);

  // Build hierarchical category tree from flat activeCategories
  const categoryTree = React.useMemo(() => {
    const nodes: { [id: string]: CategoryNode } = {};
    activeCategories.forEach((cat) => {
      nodes[cat.id] = { ...cat, children: [] };
    });

    const roots: CategoryNode[] = [];
    activeCategories.forEach((cat) => {
      const node = nodes[cat.id];
      if (cat.parentId && nodes[cat.parentId]) {
        nodes[cat.parentId].children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }, [activeCategories]);

  // Auto-expand root categories when activeCategories loads
  React.useEffect(() => {
    if (activeCategories.length > 0) {
      const rootIds = activeCategories
        .filter(cat => !cat.parentId || !activeCategories.some(p => p.id === cat.parentId))
        .map(cat => cat.id);
      setExpandedIds(rootIds);
    }
  }, [activeCategories]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const getCategoryCount = React.useCallback((node: CategoryNode): number => {
    const targetItemType = catalogType === "game" ? "source_code" : "asset";
    let count = allAssets.filter(a => a.itemType === targetItemType && a.category === node.name).length;
    if (node.children) {
      node.children.forEach(child => {
        count += getCategoryCount(child);
      });
    }
    return count;
  }, [allAssets, catalogType]);

  const getCategoryIcon = (category: CategoryResponse) => {
    const name = category.name.toLowerCase();
    const slug = category.slug.toLowerCase();
    
    if (slug.includes('3d') || name.includes('3d')) return <Boxes size={13} className="text-amber-500" />;
    if (slug.includes('2d') || name.includes('2d')) return <FolderCode size={13} className="text-sky-400" />;
    if (slug.includes('audio') || name.includes('audio') || name.includes('sound') || name.includes('sfx')) return <Sparkles size={13} className="text-emerald-400" />;
    if (slug.includes('code') || name.includes('script') || name.includes('plugin')) return <Code2 size={13} className="text-indigo-400" />;
    if (slug.includes('shader') || name.includes('vfx')) return <Sparkles size={13} className="text-purple-400" />;
    
    return <FolderCode size={13} className="text-slate-400 dark:text-slate-500" />;
  };

  // Redesigned local filter and sort logic
  const sortedAssetListings = React.useMemo(() => {
    let result = [...assetListings];

    // Local Tags filter
    if (selectedTags.length > 0) {
      result = result.filter(item => 
        selectedTags.some(t => item.tag === t || item.tagList?.includes(t))
      );
    }

    // Local Price filter (Min, Max, Free Checkbox)
    if (freeOnly) {
      result = result.filter(item => item.price === 0);
    } else {
      if (minPriceInput !== "") {
        result = result.filter(item => item.price >= Number(minPriceInput));
      }
      if (maxPriceInput !== "") {
        result = result.filter(item => item.price <= Number(maxPriceInput));
      }
    }

    // Local Publish date filter
    if (publishDateFilter !== "all-time") {
      result = result.filter(item => {
        if (!item.lastUpdated) return false;
        try {
          const updatedDate = new Date(item.lastUpdated);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - updatedDate.getTime());
          const diffDays = diffTime / (1000 * 60 * 60 * 24);

          if (publishDateFilter === "24h") return diffDays <= 1;
          if (publishDateFilter === "7days") return diffDays <= 7;
          if (publishDateFilter === "30days") return diffDays <= 30;
        } catch (e) {
          return false;
        }
        return true;
      });
    }

    // Local Diverse sorting logic
    result.sort((a, b) => {
      if (localSortOrder === "price-low") return a.price - b.price;
      if (localSortOrder === "price-high") return b.price - a.price;
      if (localSortOrder === "alphabetical-az") return a.title.localeCompare(b.title);
      if (localSortOrder === "alphabetical-za") return b.title.localeCompare(a.title);
      if (localSortOrder === "newest") {
        const da = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
        const db = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
        return db - da;
      }
      if (localSortOrder === "oldest") {
        const da = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
        const db = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
        return da - db;
      }
      return b.rating - a.rating;
    });

    return result;
  }, [assetListings, selectedTags, minPriceInput, maxPriceInput, freeOnly, publishDateFilter, localSortOrder]);

  const handleCatalogTypeChange = (type: "game" | "asset") => {
    setCatalogType(type);
    setSelectedCategories([]);
  };

  const handleCategorySelect = (categoryName: string) => {
    if (selectedCategories.includes(categoryName)) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories([categoryName]);
    }
  };

  const resetMarketplaceFilters = () => {
    setSearchText("");
    setSelectedCategories([]);
    setGodotVersion(DEFAULT_GODOT_VERSION);
    setMaxPrice(null);
    setSelectedTags([]);
    setMinPriceInput("");
    setMaxPriceInput("");
    setFreeOnly(false);
    setPublishDateFilter("all-time");
    setLocalSortOrder("newest");
    setTagSearchQuery("");
  };

  const getParentCategoryName = React.useCallback((categoryName: string): string => {
    if (!categoryName) return "";
    const currentCat = allCategories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    if (!currentCat) return categoryName;

    let parent = currentCat;
    let iterations = 0;
    while (parent.parentId && iterations < 10) {
      const nextParent = allCategories.find(c => c.id === parent.parentId);
      if (!nextParent) break;
      parent = nextParent;
      iterations++;
    }
    return getCategoryLabel(parent);
  }, [allCategories, getCategoryLabel]);

  const marketplaceHeadingTitle =
    catalogType === "game" ? t("page.catalogTitle") : t("page.assetTitle");
  const marketplaceHeadingSubtitle =
    catalogType === "game" ? t("page.catalogSubtitle") : t("page.assetSubtitle");

  const renderEmptyState = (title: string, description: string) => (
    <div className="rounded-2xl border border-dashed border-slate-250 bg-slate-50/50 px-5 py-8 text-center dark:border-slate-800 dark:bg-slate-950/30">
      <p className="font-display text-sm font-semibold text-slate-800 dark:text-slate-200">
        {title}
      </p>
      <p className="mt-2 text-xs text-slate-550 dark:text-slate-400">
        {description}
      </p>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Split Screen search layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Dynamic Left sidebar selectors */}
        <div className="launch-surface max-h-fit flex-none self-start space-y-5 rounded-lg border border-slate-200 bg-white p-4 dark:border-night-700/60 dark:bg-night-850/80">

          {/* Hierarchical Categories tree view filter */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t("filters.categoryLabel")}
            </label>
            <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1 dark:bg-night-950">
              <button
                type="button"
                onClick={() => handleCatalogTypeChange("game")}
                className={`rounded-sm py-1 px-3 text-xs font-semibold transition-studio cursor-pointer ${
                  catalogType === "game"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-night-800 dark:text-white"
                    : "text-slate-500 hover:text-slate-955 dark:hover:text-zinc-200"
                }`}
              >
                {t("filters.catalogType.game", "Game")}
              </button>
              <button
                type="button"
                onClick={() => handleCatalogTypeChange("asset")}
                className={`rounded-sm py-1 px-3 text-xs font-semibold transition-studio cursor-pointer ${
                  catalogType === "asset"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-night-800 dark:text-white"
                    : "text-slate-500 hover:text-slate-955 dark:hover:text-zinc-200"
                }`}
              >
                {t("filters.catalogType.asset", "Asset")}
              </button>
            </div>
            
            <div className="space-y-1 select-none overflow-y-auto max-h-[550px] pr-1">
              {categoryTree.map((rootNode) => (
                <CategoryTreeItem
                  key={rootNode.id}
                  node={rootNode}
                  depth={0}
                  selectedCategories={selectedCategories}
                  handleCategorySelect={handleCategorySelect}
                  expandedIds={expandedIds}
                  toggleExpand={toggleExpand}
                  getCategoryCount={getCategoryCount}
                  getCategoryIcon={getCategoryIcon}
                  getCategoryLabel={getCategoryLabel}
                  getToggleCategoryLabel={getToggleCategoryLabel}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Marketplace Grid results layout */}
        <div className="lg:col-span-3 space-y-6">
          {/* Horizontal Filters Bar (Styled like fab.com search page) */}          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-night-700/60 dark:bg-night-850/80">
              
              {/* 1. Tags Filter Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === "tags" ? null : "tags")}
                  className={`flex items-center justify-between text-xs min-w-[120px] sm:min-w-[140px] px-3 py-1.5 bg-slate-50 dark:bg-night-950/40 border border-slate-200 dark:border-night-700/60 rounded-md outline-none text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-night-950/60 transition-all ${
                    selectedTags.length > 0 ? 'border-sky-500 dark:border-sky-500/50' : ''
                  }`}
                >
                  <span className="font-semibold">{t("filters.tagsLabel")}</span>
                  {selectedTags.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-sky-500 text-white">
                      {selectedTags.length}
                    </span>
                  )}
                  <ChevronDown size={14} className={`ml-2 text-slate-400 transition-transform duration-200 ${openDropdown === "tags" ? 'rotate-180' : ''}`} />
                </button>

                {openDropdown === "tags" && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setOpenDropdown(null)} />
                    <div className="absolute left-0 z-40 mt-1.5 w-64 space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-md dark:border-night-700/70 dark:bg-[#0d0d0d]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("filters.tagsTitle")}</div>
                      
                      {/* Search tags input */}
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder={t("filters.tagsSearchPlaceholder")}
                          value={tagSearchQuery}
                          onChange={(e) => setTagSearchQuery(e.target.value)}
                          aria-label={t("filters.tagsSearchPlaceholder")}
                          className="w-full pl-7 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-night-950 border border-slate-200 dark:border-slate-800 rounded-md outline-none focus:border-sky-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                        />
                        {tagSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setTagSearchQuery("")}
                            className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 text-xs"
                            aria-label={t("filters.tagsSearchClear")}
                            title={t("filters.tagsSearchClear")}
                          >
                            &times;
                          </button>
                        )}
                      </div>

                      {/* Matching dynamic list of tags */}
                      {filteredTagsForDropdown.length === 0 ? (
                        <div className="text-[11px] text-slate-500 py-1">{t("filters.tagsNoResults")}</div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                          {filteredTagsForDropdown.map(tag => {
                            const isChecked = selectedTags.includes(tag);
                            return (
                              <label key={tag} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-350 cursor-pointer hover:text-slate-900 dark:hover:text-white select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setSelectedTags(prev =>
                                      isChecked ? prev.filter(t => t !== tag) : [...prev, tag]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-800 accent-sky-500"
                                />
                                <span className="truncate">{tag}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* Bottom Reset Button */}
                      <div className="border-t border-slate-100 dark:border-night-700/60 pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTags([]);
                            setTagSearchQuery("");
                          }}
                          className="cursor-pointer text-[11px] font-bold text-slate-500 transition-colors hover:text-sky-500 dark:text-slate-400 dark:hover:text-sky-400"
                        >
                          {t("filters.tagsReset")}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 2. Price Filter Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === "price" ? null : "price")}
                  className={`flex items-center justify-between text-xs min-w-[120px] sm:min-w-[140px] px-3 py-1.5 bg-slate-50 dark:bg-night-950/40 border border-slate-200 dark:border-night-700/60 rounded-md outline-none text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-night-950/60 transition-all ${
                    freeOnly || minPriceInput !== "" || maxPriceInput !== "" ? 'border-sky-500 dark:border-sky-500/50' : ''
                  }`}
                >
                  <span className="font-semibold">{t("filters.priceDropdownLabel")}</span>
                  <ChevronDown size={14} className={`ml-2 text-slate-400 transition-transform duration-200 ${openDropdown === "price" ? 'rotate-180' : ''}`} />
                </button>

                {openDropdown === "price" && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setOpenDropdown(null)} />
                    <div className="absolute left-0 z-40 mt-1.5 w-64 space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-md dark:border-night-700/70 dark:bg-[#0d0d0d]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("filters.priceTitle")}</div>
                      
                      <div className="flex items-center gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500">{t("filters.priceMinLabel")}</label>
                          <input
                            type="number"
                            placeholder={t("filters.priceMinPlaceholder")}
                            value={minPriceInput}
                            disabled={freeOnly}
                            onChange={(e) => setMinPriceInput(e.target.value === "" ? "" : Number(e.target.value))}
                            aria-label={t("filters.priceMinLabel")}
                            className="w-full text-xs p-1.5 bg-slate-50 dark:bg-night-950 border border-slate-200 dark:border-slate-800 rounded-md outline-none focus:border-sky-500 disabled:opacity-50 text-slate-700 dark:text-slate-200"
                          />
                        </div>
                        <span className="text-slate-400 mt-4">-</span>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500">{t("filters.priceMaxLabel")}</label>
                          <input
                            type="number"
                            placeholder={t("filters.priceMaxPlaceholder")}
                            value={maxPriceInput}
                            disabled={freeOnly}
                            onChange={(e) => setMaxPriceInput(e.target.value === "" ? "" : Number(e.target.value))}
                            aria-label={t("filters.priceMaxLabel")}
                            className="w-full text-xs p-1.5 bg-slate-50 dark:bg-night-950 border border-slate-200 dark:border-slate-800 rounded-md outline-none focus:border-sky-500 disabled:opacity-50 text-slate-700 dark:text-slate-200"
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-2 text-xs text-slate-655 dark:text-slate-350 cursor-pointer pt-1 select-none">
                        <input
                          type="checkbox"
                          checked={freeOnly}
                          onChange={(e) => setFreeOnly(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-800 accent-sky-500"
                        />
                        <span>{t("filters.freeOnly")}</span>
                      </label>
                    </div>
                  </>
                )}
              </div>

              {/* 3. Publish Date Filter Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === "date" ? null : "date")}
                  className={`flex items-center justify-between text-xs min-w-[130px] sm:min-w-[150px] px-3 py-1.5 bg-slate-50 dark:bg-night-950/40 border border-slate-200 dark:border-night-700/60 rounded-md outline-none text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-100 dark:hover:bg-night-950/60 transition-all ${
                    publishDateFilter !== "all-time" ? 'border-sky-500 dark:border-sky-500/50' : ''
                  }`}
                >
                  <span className="font-semibold">{t("filters.publishDateLabel")}</span>
                  <ChevronDown size={14} className={`ml-2 text-slate-400 transition-transform duration-200 ${openDropdown === "date" ? 'rotate-180' : ''}`} />
                </button>

                {openDropdown === "date" && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setOpenDropdown(null)} />
                    <ul className="absolute left-0 z-40 mt-1.5 w-44 space-y-0.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-md dark:border-night-700/70 dark:bg-[#0d0d0d]">
                      {publishDateOptions.map((option) => (
                        <li key={option.value}>
                          <button
                            type="button"
                            onClick={() => {
                              setPublishDateFilter(option.value);
                              setOpenDropdown(null);
                            }}
                            className={`w-full text-left text-xs px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                              publishDateFilter === option.value
                                ? 'bg-sky-500/10 text-sky-500 font-bold dark:bg-sky-500/20'
                                : 'text-slate-655 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-night-950/40'
                            }`}
                          >
                            {option.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {/* Search input in the middle taking up the available space */}
              <div className="order-first min-w-[220px] flex-[2_1_260px] relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder={t("filters.searchPlaceholder")}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  aria-label={t("filters.searchLabel")}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-xs text-slate-800 outline-none placeholder-slate-400 transition-all focus:border-slate-350 dark:border-night-700/60 dark:bg-night-950/40 dark:text-slate-100 dark:placeholder-slate-500"
                />
                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold cursor-pointer"
                    aria-label={t("filters.searchClear")}
                    title={t("filters.searchClear")}
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* 4. Sort Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(openDropdown === "sort" ? null : "sort")}
                  className="flex min-w-[160px] cursor-pointer items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 outline-none transition-colors hover:bg-slate-100 focus:border-slate-350 dark:border-night-700/60 dark:bg-night-950/40 dark:text-slate-200 dark:hover:bg-night-950/60 sm:min-w-[180px]"
                >
                  <span className="truncate">{localSortOptions.find(o => o.value === localSortOrder)?.label || t("filters.sort.newest")}</span>
                  <ChevronDown size={14} className={`ml-2 text-slate-400 transition-transform duration-200 ${openDropdown === "sort" ? 'rotate-180' : ''}`} />
                </button>

                {openDropdown === "sort" && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setOpenDropdown(null)} />
                    <ul className="absolute right-0 z-40 mt-1.5 w-48 space-y-0.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-md dark:border-night-700/70 dark:bg-[#0d0d0d]">
                      {localSortOptions.map((option) => (
                        <li key={option.value}>
                          <button
                            type="button"
                            onClick={() => {
                              setLocalSortOrder(option.value);
                              setOpenDropdown(null);
                            }}
                            className={`w-full text-left text-xs px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                              localSortOrder === option.value
                                ? 'bg-sky-500/10 text-sky-500 font-bold dark:bg-sky-500/20'
                                : 'text-slate-655 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-night-950/40'
                            }`}
                          >
                            {option.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

            </div>

            {/* Active filter pills section */}
            {(selectedTags.length > 0 || freeOnly || minPriceInput !== "" || maxPriceInput !== "" || publishDateFilter !== "all-time") && (
              <div className="flex flex-wrap items-center gap-2 p-1">
                {selectedTags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-sm animate-fade-in">
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 cursor-pointer text-xs"
                      aria-label={t("filters.active.removeTag", { name: tag })}
                      title={t("filters.active.removeTag", { name: tag })}
                    >
                      &times;
                    </button>
                  </span>
                ))}
                
                {freeOnly && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-sm animate-fade-in">
                    <span>{t("filters.active.freeOnly")}</span>
                    <button
                      type="button"
                      onClick={() => setFreeOnly(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 cursor-pointer text-xs"
                      aria-label={t("filters.active.removeFreeOnly")}
                      title={t("filters.active.removeFreeOnly")}
                    >
                      &times;
                    </button>
                  </span>
                )}
                
                {(minPriceInput !== "" || maxPriceInput !== "") && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-sm animate-fade-in">
                    <span>{t("filters.active.priceRange", {
                      min: minPriceInput !== "" ? formatCurrencyAmount(Number(minPriceInput), numberLocale) : formatCurrencyAmount(0, numberLocale),
                      max: maxPriceInput !== "" ? formatCurrencyAmount(Number(maxPriceInput), numberLocale) : t("filters.price.noLimit"),
                    })}</span>
                    <button
                      type="button"
                      onClick={() => { setMinPriceInput(""); setMaxPriceInput(""); }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 cursor-pointer text-xs"
                      aria-label={t("filters.active.removePriceRange")}
                      title={t("filters.active.removePriceRange")}
                    >
                      &times;
                    </button>
                  </span>
                )}
                
                {publishDateFilter !== "all-time" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-sm animate-fade-in">
                    <span>
                      {publishDateOptions.find((option) => option.value === publishDateFilter)?.label || t("filters.publishDate.options.allTime")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPublishDateFilter("all-time")}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 cursor-pointer text-xs"
                      aria-label={t("filters.active.removePublishDate")}
                      title={t("filters.active.removePublishDate")}
                    >
                      &times;
                    </button>
                  </span>
                )}
                
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTags([]);
                    setFreeOnly(false);
                    setMinPriceInput("");
                    setMaxPriceInput("");
                    setPublishDateFilter("all-time");
                  }}
                  className="text-[11px] font-bold text-sky-500 hover:text-sky-400 cursor-pointer ml-1.5 transition-colors select-none"
                >
                  {t("filters.active.clearAll")}
                </button>
              </div>
            )}
          </div>

          {/* Visual promo notification banner when list filtered */}
          {sortedAssetListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-slate-200 bg-white p-12 text-center dark:border-night-700/60 dark:bg-night-850/80">
              <Info size={36} className="text-sky-500" />
              <h3 className="font-display font-medium text-slate-850 dark:text-slate-200">
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
              <section className="relative w-full">
                
                {/* Header title area */}
                <div className="mb-6 flex flex-col gap-2.5 xl:flex-row xl:items-end xl:justify-between border-b border-slate-200 dark:border-night-700/60 pb-4">
                  <div>
                    <h2 className="font-display text-2xl font-bold tracking-wide text-slate-850 dark:text-white flex items-center gap-2">
                      <Boxes size={22} className="text-sky-500" />
                      {marketplaceHeadingTitle}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {marketplaceHeadingSubtitle}
                    </p>
                  </div>
                </div>

                {/* Main Card Grid */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {sortedAssetListings.map((asset) => (
                    <article
                      key={asset.id}
                      onClick={() => handleViewAssetDetails(asset)}
                      className="group cursor-pointer flex flex-col justify-between overflow-hidden rounded-lg border border-slate-200/80 dark:border-night-700/60 bg-white dark:bg-[#0d0d0d] hover:border-sky-500/50 dark:hover:border-sky-500/40 transition-colors duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                    >
                      {/* Thumbnail section */}
                      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-night-950/60 border-b border-slate-150 dark:border-night-700/40">
                        <img
                          referrerPolicy="no-referrer"
                          src={asset.image}
                          alt={asset.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        />
                        
                        {/* Parent Category Badge Overlay */}
                        {asset.category && (
                          <div className="absolute top-2 left-2 z-10">
                            <span className="rounded bg-slate-900/80 px-2 py-0.5 text-[9px] font-bold text-zinc-100 border border-white/5 backdrop-blur-sm shadow-sm tracking-wider uppercase">
                              {getParentCategoryName(asset.category)}
                            </span>
                          </div>
                        )}

                        {/* Hover Actions overlay */}
                        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                          {creatorOwnedProductIds.has(asset.id) ? (
                            <span className="rounded bg-sky-500 text-white px-2 py-0.5 text-[9px] font-bold tracking-wider shadow-sm uppercase">
                              {t("card.owner", "OWNER")}
                            </span>
                          ) : ownedProductIds.has(asset.id) ? (
                            <span className="rounded bg-emerald-500 text-white px-2 py-0.5 text-[9px] font-bold tracking-wider shadow-sm uppercase">
                              {t("card.owned", "OWNED")}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(asset);
                              }}
                              className="p-1.5 rounded bg-slate-900/90 hover:bg-sky-500 text-white hover:text-white transition-colors shadow-sm cursor-pointer border border-white/10"
                              title={t("card.addToCart", "Add to Cart")}
                            >
                              <ShoppingCart size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Content details section */}
                      <div className="flex flex-1 flex-col p-4 text-left justify-between">
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h5
                              className="font-display text-sm font-bold leading-5 text-slate-850 dark:text-zinc-100 group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors duration-200 line-clamp-1"
                              title={asset.title}
                            >
                              {asset.title}
                            </h5>
                            {asset.version && (
                              <span className="shrink-0 text-[9px] font-mono font-medium text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-night-700/60 px-1 py-0.2 rounded bg-slate-50 dark:bg-night-950/80">
                                {asset.version}
                              </span>
                            )}
                          </div>
                          
                          <div className="text-[11px] text-slate-400 dark:text-zinc-500">
                            by {asset.author}
                          </div>
                          
                          {asset.description && (
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                              {asset.description}
                            </p>
                          )}
                        </div>

                        {/* Bottom separator with price and add to cart outline button */}
                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-night-700/30 flex items-center justify-between">
                          <div className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                            {asset.price === 0 ? (
                              <span className="text-emerald-500 dark:text-emerald-400 font-extrabold uppercase tracking-wider text-[10px]">
                                {t("common.free", "FREE")}
                              </span>
                            ) : (
                              formatCurrencyAmount(asset.price, numberLocale)
                            )}
                          </div>
                          
                          <div>
                            {creatorOwnedProductIds.has(asset.id) ? (
                              <button
                                type="button"
                                disabled
                                className="cursor-not-allowed rounded border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-sky-500 opacity-80"
                              >
                                {t("card.owner", "OWNER")}
                              </button>
                            ) : ownedProductIds.has(asset.id) ? (
                              <span className="text-[9px] font-bold text-emerald-500 tracking-wider">
                                {t("card.owned", "OWNED")}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToCart(asset);
                                }}
                                className="text-[10px] font-bold px-2.5 py-1 rounded bg-sky-500/10 hover:bg-sky-500 text-sky-500 hover:text-white border border-sky-500/20 dark:border-sky-500/30 transition-all cursor-pointer"
                              >
                                {t("card.addToCart", "Add to Cart")}
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
