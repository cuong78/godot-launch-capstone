import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  X,
  Upload,
  Image as ImageIcon,
  Video as VideoIcon,
  Trash2,
  Search,
  ChevronDown,
  Check,
  Loader2,
  RefreshCw,
  Github,
} from "lucide-react";
import { gameApi } from "../api/gameApi";
import { marketplaceApi } from "../api/marketplaceApi";
import { tagApi, TagResponse } from "../api/tagApi";
import { CategoryResponse } from "../types";
import { useToast } from "../hooks/useToast";

interface EditGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  // Item can be either a GameResponse or a MarketplaceItemResponse mapped to our combined dashboard item
  item: {
    id: string;
    title: string;
    type: "game" | "asset";
    originalItem: any; // Raw GameResponse or MarketplaceItemResponse
  } | null;
}

export const EditGameModal: React.FC<EditGameModalProps> = ({
  isOpen,
  onClose,
  onSaveSuccess,
  item,
}) => {
  const { t } = useTranslation(["dashboard", "upload"]);
  const { showToast } = useToast();

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [version, setVersion] = useState("");
  const [githubBranch, setGithubBranch] = useState("");

  // Categories & Tags
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryPickerRef = useRef<HTMLDivElement>(null);

  const [tagQuery, setTagQuery] = useState("");
  const [tagOptions, setTagOptions] = useState<TagResponse[]>([]);
  const [selectedTags, setSelectedTags] = useState<TagResponse[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const tagPickerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Media
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Upload state tracking
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadStatus, setUploadStatus] = useState<{ [key: string]: "idle" | "uploading" | "completed" | "failed" }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_SELECTED_TAGS = 10;

  // Sync click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryPickerRef.current && !categoryPickerRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (tagPickerRef.current && !tagPickerRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Categories
  const fetchCategories = async (currentCategoryName?: string, currentCategoryId?: string) => {
    if (!item) return;
    setIsLoadingCategories(true);
    try {
      const typeParam = item.type === "game" ? "game" : "asset";
      const res = await gameApi.getCategories(typeParam);
      if (res.success && res.data) {
        setCategories(res.data);
        if (currentCategoryId) {
          setCategoryId(currentCategoryId);
        } else if (currentCategoryName) {
          const found = res.data.find(
            (c: any) => c.name.toLowerCase() === currentCategoryName.toLowerCase()
          );
          if (found) {
            setCategoryId(found.id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load categories", err);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const fetchTagsAndMap = async (rawTags: string[]) => {
    try {
      const res = await tagApi.getAllTags();
      if (res.success && res.data) {
        const mapped = rawTags.map(tagName => {
          return res.data.find(
            t => t.name.toLowerCase() === tagName.toLowerCase() || t.slug.toLowerCase() === tagName.toLowerCase()
          );
        }).filter((t): t is TagResponse => !!t);
        setSelectedTags(mapped);
      }
    } catch (err) {
      console.error("Failed to load and map tags", err);
    }
  };

  // Search Tags
  useEffect(() => {
    if (!tagQuery.trim()) {
      setTagOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoadingTags(true);
      try {
        const res = await tagApi.searchTags(tagQuery.trim());
        if (res.success && res.data) {
          setTagOptions(res.data);
        }
      } catch (err) {
        console.error("Failed to search tags", err);
      } finally {
        setIsLoadingTags(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [tagQuery]);

  // Load Initial Item Data
  useEffect(() => {
    if (!isOpen || !item) return;

    const raw = item.originalItem;
    setTitle(raw.title || "");
    setDescription(raw.description || "");

    // Format price with space separator
    const initialPriceRaw = raw.priceProposed !== undefined ? String(raw.priceProposed) : raw.price !== undefined ? String(raw.price) : "0";
    const initialPriceClean = initialPriceRaw.replace(/\D/g, "");
    const initialPriceFormatted = initialPriceClean.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    setPrice(initialPriceFormatted);

    setCategoryId(raw.categoryId || "");
    setVersion(raw.version || "1.0.0");
    setGithubBranch(raw.githubBranch || "main");

    // Load media
    setThumbnailUrl(raw.thumbnailUrl || null);
    setScreenshots(raw.screenshots || []);
    setVideoUrl(raw.videoUrl || null);

    // Load tags
    if (raw.tags && raw.tags.length > 0) {
      fetchTagsAndMap(raw.tags);
    } else {
      setSelectedTags([]);
    }

    // Fetch relevant categories
    fetchCategories(raw.categoryName, raw.categoryId);

    // Reset progress
    setUploadProgress({});
    setUploadStatus({});
    setError(null);
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handlePriceChange = (val: string) => {
    let clean = val.replace(/\D/g, "");
    if (clean.length > 1 && clean.startsWith("0")) {
      clean = clean.replace(/^0+/, "");
    }
    if (!clean) {
      setPrice("0");
      return;
    }
    const formatted = clean.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    setPrice(formatted);
  };

  const toggleTag = (tag: TagResponse) => {
    setSelectedTags((current) => {
      if (current.some((selected) => selected.id === tag.id)) {
        return current.filter((selected) => selected.id !== tag.id);
      }
      if (current.length >= MAX_SELECTED_TAGS) return current;
      return [...current, tag];
    });
    setTagQuery("");
    setIsTagDropdownOpen(false);
  };

  // Media upload handlers
  const handleUploadMedia = async (file: File, fileType: "thumbnail" | "screenshot" | "video") => {
    const key = `${fileType}-${file.name}-${Math.random().toString(36).substring(2, 5)}`;
    setUploadStatus((prev) => ({ ...prev, [key]: "uploading" }));
    setUploadProgress((prev) => ({ ...prev, [key]: 0 }));

    try {
      let res;
      if (item.type === "game") {
        res = await gameApi.uploadMedia(item.id, fileType as any, file, (p) => {
          setUploadProgress((prev) => ({ ...prev, [key]: p }));
        });
      } else {
        res = await marketplaceApi.uploadItemMedia(item.id, fileType as any, file, (p) => {
          setUploadProgress((prev) => ({ ...prev, [key]: p }));
        });
      }

      if (res.success && res.data?.objectKey) {
        setUploadStatus((prev) => ({ ...prev, [key]: "completed" }));

        // Refetch to get updated URLs
        const refetchRes = item.type === "game" 
          ? await gameApi.getGameById(item.id) 
          : await marketplaceApi.getMarketplaceItemById(item.id);
          
        if (refetchRes.success && refetchRes.data) {
          setThumbnailUrl(refetchRes.data.thumbnailUrl || null);
          setScreenshots(refetchRes.data.screenshots || []);
          setVideoUrl(refetchRes.data.videoUrl || null);
        }
      } else {
        throw new Error(res.message || "Upload thất bại.");
      }
    } catch (err: any) {
      setUploadStatus((prev) => ({ ...prev, [key]: "failed" }));
      const errMsg = err.response?.data?.message || err.message || "Lỗi khi upload tệp.";
      showToast(errMsg, 'error');
    }
  };

  const handleDeleteMediaItem = async (url: string, fileType: "screenshot" | "video") => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tệp này?")) return;
    try {
      if (item.type === "game") {
        await gameApi.deleteMediaItem(item.id, url);
      } else {
        await marketplaceApi.deleteAssetMedia(item.id, url);
      }
      
      // Update local state
      if (fileType === "screenshot") {
        setScreenshots((prev) => prev.filter((s) => s !== url));
      } else {
        setVideoUrl(null);
      }
    } catch (err: any) {
      console.error("Xóa media thất bại", err);
      const errMsg = err.response?.data?.message || err.message || "Xóa media thất bại.";
      showToast(errMsg, 'error');
    }
  };

  // Submit Text/Metadata Changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const cleanPrice = price.replace(/\s/g, "");
    const priceNum = parseFloat(cleanPrice || "0");
    const tagIds = selectedTags.map((tag) => tag.id);

    try {
      if (item.type === "game") {
        const res = await gameApi.updateGame(item.id, {
          title,
          description,
          priceProposed: priceNum,
          categoryId: categoryId || undefined,
          publishingType: item.originalItem.publishingType,
        });
        if (!res.success) throw new Error(res.message || "Cập nhật thất bại.");
      } else {
        const res = await marketplaceApi.updateMarketplaceItem(item.id, {
          title,
          description,
          price: priceNum,
          categoryId: categoryId || undefined,
          tagIds: tagIds.length > 0 ? tagIds : undefined,
        });
        if (!res.success) throw new Error(res.message || "Cập nhật thất bại.");
      }

      onSaveSuccess();
      onClose();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Có lỗi xảy ra khi lưu.";
      setError(errMsg);
      showToast(errMsg, 'error');
      if (formRef.current) {
        formRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <header className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-display font-bold text-lg text-slate-850 dark:text-white">
            Chỉnh sửa thông tin & Media
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </header>

        {/* Scrollable Form Area */}
        <form ref={formRef} onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-555 dark:text-slate-350">
                Tiêu đề sản phẩm
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-855 rounded-lg text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 dark:text-white"
              />
            </div>

            {/* Price proposed */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-555 dark:text-slate-350">
                Giá bán (VND)
              </label>
              <input
                type="text"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-955 border border-slate-300 dark:border-slate-855 rounded-lg text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 dark:text-white"
              />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-555 dark:text-slate-350">
              Mô tả chi tiết
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-white dark:bg-slate-955 border border-slate-300 dark:border-slate-855 rounded-lg text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 dark:text-white resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Dropdown */}
            <div ref={categoryPickerRef} className="relative flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-555 dark:text-slate-350">
                Danh mục sản phẩm
              </label>
              {isLoadingCategories ? (
                <div className="text-xs text-slate-400 animate-pulse py-2">
                  Đang tải danh mục...
                </div>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className="w-full flex justify-between items-center px-3.5 py-2 bg-white dark:bg-slate-955 border border-slate-300 dark:border-slate-855 rounded-lg text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 text-left dark:text-white"
                  >
                    <span>
                      {categories.find((cat) => cat.id === categoryId)?.name || "Chọn danh mục..."}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-400 transition-transform duration-200 ${
                        isCategoryDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isCategoryDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-205 bg-white dark:bg-slate-905 p-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                      {categories.map((cat) => {
                        const active = cat.id === categoryId;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setCategoryId(cat.id);
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs transition-colors ${
                              active
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-350 font-semibold"
                                : "text-slate-700 hover:bg-slate-100 dark:text-slate-350 dark:hover:bg-slate-800"
                            }`}
                          >
                            <span>{cat.name}</span>
                            {active && <Check size={12} className="text-amber-500" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tags Picker */}
            <div ref={tagPickerRef} className="relative flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-555 dark:text-slate-350 flex justify-between">
                <span>Tags</span>
                <span className="text-[10px] text-slate-400">
                  {selectedTags.length}/{MAX_SELECTED_TAGS}
                </span>
              </label>

              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={tagQuery}
                  onChange={(e) => {
                    setTagQuery(e.target.value);
                    setIsTagDropdownOpen(true);
                  }}
                  onFocus={() => setIsTagDropdownOpen(true)}
                  placeholder="Tìm tag theo tên..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-855 bg-white dark:bg-slate-955 py-2 pl-8.5 pr-8 text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 dark:text-white"
                />
                {isLoadingTags && (
                  <RefreshCw
                    size={12}
                    className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                  />
                )}
              </div>

              {/* Tag dropdown autocomplete */}
              {isTagDropdownOpen && tagOptions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-205 bg-white dark:bg-slate-905 p-1.5 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                  {tagOptions.map((tag) => {
                    const active = selectedTags.some((t) => t.id === tag.id);
                    const disabled = !active && selectedTags.length >= MAX_SELECTED_TAGS;
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        disabled={disabled}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs transition-colors ${
                          active
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-350"
                            : disabled
                              ? "opacity-50 cursor-not-allowed text-slate-400"
                              : "text-slate-700 hover:bg-slate-100 dark:text-slate-350 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span>{tag.name}</span>
                        {active && <Check size={12} className="text-amber-500" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Display chosen tags */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400"
                    >
                      {tag.name}
                      <button
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className="hover:bg-amber-500/20 rounded-full p-0.5"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Media Section */}
          <div className="border-t border-slate-250 dark:border-slate-800 pt-6 space-y-6">
            <h4 className="font-display font-bold text-sm text-slate-800 dark:text-white">
              Quản lý Media & Tệp hình ảnh
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Thumbnail */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                  Ảnh bìa (Thumbnail)
                </span>
                <div className="relative group aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
                  {thumbnailUrl ? (
                    <>
                      <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 text-slate-855 rounded-lg text-xs font-bold shadow-md cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95">
                          <Upload size={12} />
                          Thay đổi
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => e.target.files?.[0] && handleUploadMedia(e.target.files[0], "thumbnail")}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <label className="flex flex-col items-center gap-1.5 text-slate-500 cursor-pointer">
                      <Upload size={24} />
                      <span className="text-[10px]">Tải ảnh bìa lên</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleUploadMedia(e.target.files[0], "thumbnail")}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Video mp4 */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                  Video Demo (mp4)
                </span>
                <div className="relative group aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
                  {videoUrl ? (
                    <div className="relative w-full h-full">
                      <video src={videoUrl} controls className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleDeleteMediaItem(videoUrl, "video")}
                        className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-550 text-white rounded-lg transition-transform active:scale-90"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-1.5 text-slate-500 cursor-pointer">
                      <Upload size={24} />
                      <span className="text-[10px]">Tải video demo lên</span>
                      <input
                        type="file"
                        accept="video/mp4"
                        onChange={(e) => e.target.files?.[0] && handleUploadMedia(e.target.files[0], "video")}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Screenshots list */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Ảnh chụp màn hình (Screenshots) - Tối đa 5 ảnh
                </span>
                {screenshots.length < 5 && (
                  <label className="flex items-center gap-1 text-[10px] font-bold text-sky-500 hover:text-sky-400 cursor-pointer">
                    <PlusIcon size={12} />
                    Thêm ảnh
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          const files = Array.from(e.target.files);
                          files.forEach((file) => handleUploadMedia(file, "screenshot"));
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {screenshots.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {screenshots.map((url, idx) => (
                    <div key={idx} className="relative group aspect-video rounded-xl overflow-hidden border border-slate-205 dark:border-slate-800 bg-slate-100 dark:bg-slate-955">
                      <img src={url} alt={`Screenshot ${idx}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleDeleteMediaItem(url, "screenshot")}
                        className="absolute top-1.5 right-1.5 p-1 bg-rose-600 hover:bg-rose-550 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-6 text-slate-400 text-xs">
                  <ImageIcon size={20} className="mb-1 text-slate-300" />
                  Chưa có ảnh chụp màn hình nào
                </div>
              )}
            </div>

            {/* Upload progresses */}
            {Object.keys(uploadStatus).some((key) => uploadStatus[key] === "uploading") && (
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Tiến trình tải lên:
                </span>
                {Object.keys(uploadStatus).map((key) => {
                  if (uploadStatus[key] !== "uploading") return null;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-550">
                        <span className="truncate max-w-[200px]">{key.split("-")[1] || key}</span>
                        <span>{uploadProgress[key] || 0}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 transition-all duration-300"
                          style={{ width: `${uploadProgress[key] || 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-750 text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            onClick={handleSave}
            disabled={isSaving || Object.keys(uploadStatus).some((key) => uploadStatus[key] === "uploading")}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-450 text-slate-950 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Đang lưu...
              </>
            ) : (
              "Lưu thay đổi"
            )}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

const PlusIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
