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
  const { showToast, showConfirm } = useToast();

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
  const formRef = useRef<HTMLFormElement>(null);
  const tagPickerRef = useRef<HTMLDivElement>(null);

  const statusStr = item?.originalItem?.status?.toLowerCase();
  const isMediaLocked = !item || 
    statusStr === "active" || 
    statusStr === "published" || 
    statusStr === "approved" || 
    statusStr === "awaiting_store_build";

  // Media
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Drag and Drop ordering for screenshots
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Upload state tracking
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadStatus, setUploadStatus] = useState<{ [key: string]: "idle" | "uploading" | "completed" | "failed" }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLiveGame = item?.type === "game" && (
    item?.originalItem?.status?.toLowerCase() === "published" ||
    item?.originalItem?.status?.toLowerCase() === "approved" ||
    item?.originalItem?.status?.toLowerCase() === "awaiting_store_build"
  );

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
    if (!isOpen || !item || !item.originalItem) return;

    const raw = item.originalItem;
    setTitle(raw.pendingTitle || raw.title || "");
    setDescription(raw.pendingDescription || raw.description || "");

    // Format price with space separator
    const initialPriceRaw = raw.priceProposed !== undefined ? String(raw.priceProposed) : raw.price !== undefined ? String(raw.price) : "0";
    const initialPriceClean = initialPriceRaw.replace(/\D/g, "");
    const initialPriceFormatted = initialPriceClean.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    setPrice(initialPriceFormatted);

    setCategoryId(raw.categoryId || "");
    setVersion(raw.version || "1.0.0");
    setGithubBranch(raw.githubBranch || "main");

    // Load media
    const displayThumbnail = raw.pendingThumbnailUrl || raw.thumbnailUrl || null;
    const displayScreenshots = raw.pendingScreenshots && raw.pendingScreenshots.length > 0
      ? raw.pendingScreenshots
      : (raw.screenshots || []);
    const displayVideo = raw.pendingVideoUrl === "DELETE_VIDEO"
      ? null
      : (raw.pendingVideoUrl || raw.videoUrl || null);

    setThumbnailUrl(displayThumbnail);
    setScreenshots(displayScreenshots);
    setVideoUrl(displayVideo);

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
          const rawData = refetchRes.data as any;
          const isGame = item.type === "game";
          const displayThumbnail = (isGame && rawData.pendingThumbnailUrl) || rawData.thumbnailUrl || null;
          const displayScreenshots = isGame && rawData.pendingScreenshots && rawData.pendingScreenshots.length > 0
            ? rawData.pendingScreenshots
            : (rawData.screenshots || []);
          const displayVideo = isGame && rawData.pendingVideoUrl === "DELETE_VIDEO"
            ? null
            : ((isGame && rawData.pendingVideoUrl) || rawData.videoUrl || null);

          setThumbnailUrl(displayThumbnail);
          setScreenshots(displayScreenshots);
          setVideoUrl(displayVideo);
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

  const handleDeleteMediaItem = (url: string, fileType: "screenshot" | "video") => {
    const mediaName = fileType === "screenshot" ? "ảnh chụp màn hình" : "video demo";
    showConfirm(
      `Bạn có chắc chắn muốn xóa ${mediaName} này không? Hành động này không thể hoàn tác.`,
      () => {
        executeDeleteMedia(url, fileType);
      }
    );
  };

  const executeDeleteMedia = async (url: string, fileType: "screenshot" | "video") => {
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
      showToast("Xóa tệp media thành công.", 'success');
    } catch (err: any) {
      console.error("Xóa media thất bại", err);
      const errMsg = err.response?.data?.message || err.message || "Xóa media thất bại.";
      showToast(errMsg, 'error');
    }
  };

  const handleDrop = async (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx || !item) return;

    const newScreenshots = [...screenshots];
    const [draggedItem] = newScreenshots.splice(draggedIdx, 1);
    newScreenshots.splice(targetIdx, 0, draggedItem);

    setScreenshots(newScreenshots);
    setDraggedIdx(null);
    setDragOverIdx(null);

    try {
      if (item.type === "game") {
        await gameApi.reorderGameScreenshots(item.id, newScreenshots);
      } else {
        await marketplaceApi.reorderScreenshots(item.id, newScreenshots);
      }
      showToast("Đã thay đổi thứ tự ảnh chụp màn hình.", 'success');
    } catch (err: any) {
      console.error("Lỗi khi sắp xếp lại ảnh chụp màn hình", err);
      const errMsg = err.response?.data?.message || err.message || "Không thể lưu thứ tự ảnh chụp màn hình.";
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
              <label className="text-xs font-semibold text-slate-555 dark:text-slate-350 flex justify-between items-center">
                <span>Giá bán (VND)</span>
                {isLiveGame && (
                  <span className="text-[10px] text-amber-500 font-normal">
                    (Không thể sửa khi đã phát hành)
                  </span>
                )}
              </label>
              <input
                type="text"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                required
                disabled={isLiveGame}
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-955 border border-slate-300 dark:border-slate-855 rounded-lg text-sm outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
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
            {/* Category (Read-only) */}
            <div className="relative flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-555 dark:text-slate-350">
                <span>Danh mục sản phẩm</span>
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={categories.find((cat) => cat.id === categoryId)?.name || item.originalItem?.categoryName || "—"}
                className="w-full px-3.5 py-2 bg-slate-100 dark:bg-slate-955 border border-slate-300 dark:border-slate-855 rounded-lg text-sm text-slate-700 dark:text-slate-400 opacity-80 cursor-not-allowed outline-none"
              />
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
          <div className="border-t border-slate-250 dark:border-slate-800 pt-6 space-y-4">
            <h4 className="font-display font-bold text-sm text-slate-800 dark:text-white">
              Thông tin Media & Tệp hình ảnh
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isMediaLocked ? (
                <span className="text-amber-600 dark:text-amber-400">
                  💡 Hình ảnh và video hiện đang KHÓA (đã được duyệt/xuất bản). Để thay đổi hình ảnh hoặc video mới, vui lòng tải lên tệp ZIP (phiên bản mới) trên Dashboard để đưa sản phẩm về trạng thái "Chờ duyệt" trước.
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400">
                  💡 Quyền cập nhật hình ảnh & video đang MỞ KHÓA. Bạn có thể thay đổi hoặc thêm ảnh bìa, video demo và ảnh chụp màn hình trực tiếp bên dưới.
                </span>
              )}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Thumbnail */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                  Ảnh bìa (Thumbnail)
                </span>
                <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-955 flex items-center justify-center group">
                  {thumbnailUrl ? (
                    <>
                      <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                      {!isMediaLocked && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <label className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer transition-colors text-xs font-semibold">
                            Thay đổi
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadMedia(file, "thumbnail");
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </>
                  ) : (
                    <label className={`text-xs text-slate-405 flex flex-col items-center gap-1 w-full h-full justify-center ${!isMediaLocked ? "cursor-pointer" : ""}`}>
                      <ImageIcon size={24} className="text-slate-500" />
                      <span>{isMediaLocked ? "Chưa có ảnh bìa" : "Chọn ảnh bìa"}</span>
                      {!isMediaLocked && (
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadMedia(file, "thumbnail");
                          }}
                        />
                      )}
                    </label>
                  )}
                </div>
              </div>

              {/* Video mp4 */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                  Video Demo (mp4)
                </span>
                <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-955 flex items-center justify-center group">
                  {videoUrl ? (
                    <>
                      <video src={videoUrl} controls className="w-full h-full object-cover" />
                      {!isMediaLocked && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMediaItem(videoUrl, "video")}
                          className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </>
                  ) : (
                    <label className={`text-xs text-slate-405 flex flex-col items-center gap-1 w-full h-full justify-center ${!isMediaLocked ? "cursor-pointer" : ""}`}>
                      <VideoIcon size={24} className="text-slate-500" />
                      <span>{isMediaLocked ? "Chưa có video demo" : "Chọn video demo (.mp4)"}</span>
                      {!isMediaLocked && (
                        <input
                          type="file"
                          accept="video/mp4"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadMedia(file, "video");
                          }}
                        />
                      )}
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Screenshots list */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Ảnh chụp màn hình (Screenshots) {!isMediaLocked && " - Kéo thả các ảnh để thay đổi thứ tự hiển thị"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {screenshots.map((url, idx) => (
                  <div
                    key={url}
                    draggable={!isMediaLocked}
                    onDragStart={() => setDraggedIdx(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={() => setDragOverIdx(idx)}
                    onDragLeave={() => setDragOverIdx(null)}
                    onDrop={() => handleDrop(idx)}
                    className={`relative aspect-video rounded-xl overflow-hidden border bg-slate-100 dark:bg-slate-955 transition-all duration-200 group ${
                      !isMediaLocked ? "cursor-grab active:cursor-grabbing" : ""
                    } ${
                      draggedIdx === idx ? "opacity-30 border-dashed border-amber-500 scale-95" : ""
                    } ${
                      dragOverIdx === idx ? "border-amber-500 scale-105 shadow-md shadow-amber-500/20" : "border-slate-205 dark:border-slate-800"
                    }`}
                  >
                    <img src={url} alt={`Screenshot ${idx}`} className="w-full h-full object-cover pointer-events-none" />
                    {!isMediaLocked && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMediaItem(url, "screenshot");
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100 z-10"
                      >
                        <Trash2 size={10} />
                      </button>
                    )}
                    
                    {/* Tiny drag indicator */}
                    {!isMediaLocked && draggedIdx !== idx && (
                      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-slate-900/60 backdrop-blur-sm rounded text-[8px] text-white font-semibold pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        Kéo thả
                      </div>
                    )}
                  </div>
                ))}
                {!isMediaLocked && (
                  <label className="flex flex-col items-center justify-center aspect-video rounded-xl border border-dashed border-slate-350 hover:border-slate-400 text-slate-400 hover:text-slate-500 cursor-pointer transition-colors text-[10px] font-semibold gap-1">
                    <Upload size={14} />
                    <span>Thêm ảnh</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadMedia(file, "screenshot");
                      }}
                    />
                  </label>
                )}
              </div>
              {screenshots.length === 0 && isMediaLocked && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-6 text-slate-400 text-xs">
                  Chưa có ảnh chụp màn hình
                </div>
              )}
            </div>

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
      </div>    </div>,
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
