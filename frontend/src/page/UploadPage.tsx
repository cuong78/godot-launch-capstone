import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useFaceVerify } from "../context/FaceVerifyContext";
import BotInviteModal from "../components/BotInviteModal";
import { UploadGuideModal } from "../components/UploadGuideModal";
import { tagApi, TagResponse } from "../api/tagApi";
import {
  CheckCircle2,
  Upload,
  AlertTriangle,
  RefreshCw,
  FileText,
  Image,
  Video,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Film,
  ShoppingBag,
  Gamepad2,
  Github,
  Terminal,
  ArrowLeft,
  Check,
  Search,
  X,
  ChevronDown,
  Sparkles,
  Layers3,
  CircleDollarSign,
  Download,
  BookOpen,
} from "lucide-react";
import { Button } from "../components/Button";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input, TextArea } from "../components/Input";
import { gameApi } from "../api/gameApi";
import { useFormattedAmountInput } from "../hooks/useFormattedAmountInput";
import { useToast } from "../hooks/useToast";
import { marketplaceApi } from "../api/marketplaceApi";
import { CategoryResponse, GameResponse, MarketplaceItemResponse } from "../types";
import axios from "axios";

interface SortableScreenshotItemProps {
  url: string;
  index: number;
}

function SortableScreenshotItem({ url, index }: SortableScreenshotItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative group cursor-grab active:cursor-grabbing hover:scale-[1.03] transition-transform duration-200"
    >
      <img
        src={url}
        alt={`Extracted Shot ${index + 1}`}
        className="w-20 h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm"
      />
    </div>
  );
}

interface UploadPageProps {
  setCurrentScreen: (screen: any) => void;
}

interface UploadProgress {
  [key: string]: number; // percentage completed (0-100)
}

interface UploadStatus {
  [key: string]: "idle" | "uploading" | "completed" | "failed";
}

const MAX_SELECTED_TAGS = 10;
const TAG_RESULT_LIMIT = 12;

/** Chỉ giữ chữ số, bỏ số 0 thừa ở đầu (giữ "0" nếu rỗng hoàn toàn). */
function sanitizePriceDigits(val: string): string {
  let clean = val.replace(/\D/g, "");
  if (clean.length > 1 && clean.startsWith("0")) {
    clean = clean.replace(/^0+/, "");
  }
  return clean || "0";
}

/** Hiển thị giá đã format khoảng trắng phân cách hàng nghìn. */
function formatPriceDigits(digits: string): string {
  if (!digits || digits === "0") return digits;
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
const PLATFORM_OPTIONS = [
  { value: "Windows", labelKey: "form.platform.windows" },
  { value: "macOS", labelKey: "form.platform.macos" },
  { value: "Linux", labelKey: "form.platform.linux" },
  { value: "Web", labelKey: "form.platform.web" },
  { value: "Android", labelKey: "form.platform.android" },
  { value: "iOS", labelKey: "form.platform.ios" },
] as const;

function extractObjectKey(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return decodeURIComponent(parsedUrl.pathname.substring(1));
  } catch (e) {
    const prefix = ".amazonaws.com/";
    const idx = url.indexOf(prefix);
    if (idx !== -1) {
      const remaining = url.substring(idx + prefix.length);
      const queryIdx = remaining.indexOf("?");
      return queryIdx !== -1 ? remaining.substring(0, queryIdx) : remaining;
    }
    return url;
  }
}

// Generate unique key for file uploads (index-independent)
const getFileKey = (file: File): string => {
  return `${file.name.replace(/[^a-zA-Z0-9]/g, "")}_${file.size}`;
};

export const UploadPage: React.FC<UploadPageProps> = ({ setCurrentScreen }) => {
  const { requireFaceVerify } = useFaceVerify();
  const { t, i18n } = useTranslation(["upload"]);
  const { showToast } = useToast();

  // Step State
  const [step, setStep] = useState<1 | 2>(1);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  
  // Game Web Demo upload states
  const [demoFile, setDemoFile] = useState<File | null>(null);
  const [demoUploadStatus, setDemoUploadStatus] = useState<"idle" | "uploading" | "completed" | "failed">("idle");
  const [demoUploadProgress, setDemoUploadProgress] = useState<number>(0);

  // Publish Program Switch ('game' or 'marketplace')
  const [publishProgram, setPublishProgram] = useState<"game" | "marketplace">(
    "marketplace",
  );

  // Form State (Step 1)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const priceInput = useFormattedAmountInput(sanitizePriceDigits, formatPriceDigits, "0");
  const [categoryId, setCategoryId] = useState("");
  const [publishingType, setPublishingType] = useState<
    "full_acquisition" | "co_publishing" | "marketplace_listing"
  >("full_acquisition");
  const [revenueSplitProposed, setRevenueSplitProposed] = useState("70");

  // Custom dropdown state & ref for Publishing / Acquisition Model
  const [isPublishDropdownOpen, setIsPublishDropdownOpen] = useState(false);
  const publishDropdownRef = useRef<HTMLDivElement>(null);
  // Marketplace giờ chỉ còn asset thuần (source_code chuyển sang Game market).
  // Giữ biến để các nhánh UI cũ tự ẩn; luôn = "asset".
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryPickerRef = useRef<HTMLDivElement>(null);
  const [tagOptions, setTagOptions] = useState<TagResponse[]>([]);
  const [selectedTags, setSelectedTags] = useState<TagResponse[]>([]);
  const [tagQuery, setTagQuery] = useState("");
  const [isLoadingTags, setIsLoadingTags] = useState(false);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [tagSearchError, setTagSearchError] = useState("");
  const tagPickerRef = useRef<HTMLDivElement>(null);
  const selectedTagIds = selectedTags.map((tag) => tag.id);

  // New Marketplace Fields

  const [version, setVersion] = useState("1.0.0");

  // File State (Step 2)
  const [gameFile, setGameFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  // Map fileKey → objectKey trên storage (để xóa screenshot lẻ trên server)
  const [screenshotKeys, setScreenshotKeys] = useState<Record<string, string>>(
    {},
  );

  // Game repo-based submit (thay cho upload game.zip)
  const [gameRepoUrl, setGameRepoUrl] = useState("");
  const [gameRepoBranch, setGameRepoBranch] = useState("");
  const [repoSubmitting, setRepoSubmitting] = useState(false);
  const [repoSubmitted, setRepoSubmitted] = useState(false);
  // Mời bot vào repo private
  const [showBotInvite, setShowBotInvite] = useState(false);
  const [botUsername, setBotUsername] = useState("");
  const [botChecking, setBotChecking] = useState(false);

  // Ảnh preview cho marketplace asset
  const [assetImages, setAssetImages] = useState<
    { file: File; objectKey?: string; tempId?: string }[]
  >([]);

  // Upload progress & status states
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Unified upload states
  const [unifiedFile, setUnifiedFile] = useState<File | null>(null);
  const [unifiedUploadStatus, setUnifiedUploadStatus] = useState<"idle" | "uploading" | "processing" | "success" | "failed">("idle");
  const [unifiedUploadProgress, setUnifiedUploadProgress] = useState<number>(0);
  const [unifiedExtractedMedia, setUnifiedExtractedMedia] = useState<MarketplaceItemResponse | GameResponse | null>(null);
  const [unifiedError, setUnifiedError] = useState<string | null>(null);

  // Backend Security Scan State
  const [scanStatus, setScanStatus] = useState<
    "idle" | "scanning" | "clean" | "infected" | "failed"
  >("idle");
  const [scanMessage, setScanMessage] = useState("");

  // Initial load: fetch categories
  useEffect(() => {
    const loadCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const res = await gameApi.getCategories();
        if (res.success && res.data) {
          setCategories(res.data);
          if (res.data.length > 0) {
            setCategoryId(res.data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    loadCategories();
  }, [i18n.language]);

  useEffect(() => {
    let ignoreResult = false;
    const timeoutId = window.setTimeout(async () => {
      setIsLoadingTags(true);
      setTagSearchError("");
      try {
        const res = await tagApi.searchTags(tagQuery.trim(), TAG_RESULT_LIMIT);
        if (!ignoreResult) {
          setTagOptions(res.success && res.data ? res.data : []);
          if (!res.success) {
            setTagSearchError(res.message || t("errors.unableToLoadTags"));
          }
        }
      } catch (err) {
        if (!ignoreResult) {
          setTagOptions([]);
          setTagSearchError(t("errors.unableToLoadTagsTryAgain"));
        }
        console.error("Failed to search tags:", err);
      } finally {
        if (!ignoreResult) setIsLoadingTags(false);
      }
    }, tagQuery.trim() ? 300 : 0);

    return () => {
      ignoreResult = true;
      window.clearTimeout(timeoutId);
    };
  }, [tagQuery, t, i18n.language]);

  useEffect(() => {
    setSelectedTags([]);
  }, [i18n.language]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagPickerRef.current && !tagPickerRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
      if (publishDropdownRef.current && !publishDropdownRef.current.contains(event.target as Node)) {
        setIsPublishDropdownOpen(false);
      }
      if (categoryPickerRef.current && !categoryPickerRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTag = (tag: TagResponse) => {
    setSelectedTags((current) => {
      if (current.some((selected) => selected.id === tag.id)) {
        return current.filter((selected) => selected.id !== tag.id);
      }
      if (current.length >= MAX_SELECTED_TAGS) return current;
      return [...current, tag];
    });
    setTagQuery("");
  };

  // Sync categoryId when publishProgram, itemType or categories list changes
  useEffect(() => {
    const filtered = categories.filter((cat) =>
      publishProgram === "game" ? cat.type === "game" : cat.type === "asset",
    );
    if (filtered.length > 0) {
      const isValid = filtered.some((cat) => cat.id === categoryId);
      if (!isValid) {
        setCategoryId(filtered[0].id);
      }
    }
  }, [publishProgram, categories, categoryId]);

  // Polling logic for security virus scan
  useEffect(() => {
    let intervalId: any;
    if (scanStatus === "scanning" && gameId) {
      if (publishProgram === "marketplace") {
        let attempts = 0;
        intervalId = setInterval(async () => {
          try {
            attempts++;
            const res = await marketplaceApi.getMarketplaceItemById(gameId);
            if (res.success && res.data) {
              const status = res.data.status;
              if (status === "removed" || status === "rejected") {
                setScanStatus("infected");
                setScanMessage(t("scan.securityAlert"));
                clearInterval(intervalId);
              } else if (status === "pending") {
                if (attempts >= 3) {
                  setScanStatus("clean");
                  setScanMessage(t("success.marketplacePending"));
                  clearInterval(intervalId);
                }
              } else if (status === "active") {
                setScanStatus("clean");
                setScanMessage(t("success.marketplaceActive"));
                clearInterval(intervalId);
              }
            }
          } catch (err) {
            console.error("Error polling marketplace item status:", err);
          }
        }, 3000);
      } else {
        intervalId = setInterval(async () => {
          try {
            const res = await gameApi.getGameById(gameId);
            if (res.success && res.data) {
              const status = res.data.status;
              if (status === "pending") {
                setScanStatus("clean");
                setScanMessage(t("success.gamePending"));
                clearInterval(intervalId);
              } else if (status === "rejected") {
                setScanStatus("infected");
                setScanMessage(t("scan.securityAlert"));
                clearInterval(intervalId);
              }
            }
          } catch (err) {
            console.error("Error polling game status:", err);
          }
        }, 3000);
      }
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [scanStatus, gameId, publishProgram, t]);

  // Polling logic for unified asset/game upload processing
  useEffect(() => {
    let intervalId: any;
    if (unifiedUploadStatus === "processing" && gameId) {
      intervalId = setInterval(async () => {
        try {
          const res = publishProgram === "game"
            ? await gameApi.getGameUploadStatus(gameId)
            : await marketplaceApi.getUploadStatus(gameId);
          if (res.success && res.data) {
            const status = res.data.uploadStatus;
            if (status === "SUCCESS") {
              setUnifiedUploadStatus("success");
              setUnifiedExtractedMedia(res.data);
              setUploadStatus((prev) => ({ ...prev, game: "completed" }));
              setScanStatus("clean");
              setScanMessage("Gói tài nguyên đã được giải nén, tối ưu hóa và quét sạch mối đe dọa bảo mật.");
              clearInterval(intervalId);
            } else if (status === "FAILED") {
              setUnifiedUploadStatus("failed");
              setUnifiedError(res.data.uploadError || "Giải nén hoặc phân tách tài nguyên thất bại.");
              setUploadStatus((prev) => ({ ...prev, game: "failed" }));
              setScanStatus("failed");
              setScanMessage(res.data.uploadError || "Lỗi xử lý file gộp.");
              clearInterval(intervalId);
            }
          }
        } catch (err: any) {
          console.error("Error polling unified upload status:", err);
        }
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [unifiedUploadStatus, gameId, t, publishProgram]);

  const handleUnifiedUpload = async (file: File) => {
    if (!gameId) return;
    setUnifiedFile(file);
    setUnifiedUploadStatus("uploading");
    setUnifiedUploadProgress(0);
    setUnifiedError(null);
    setScanStatus("idle");

    try {
      const res = publishProgram === "game"
        ? await gameApi.uploadUnifiedGame(gameId, file, (percent) => {
            setUnifiedUploadProgress(percent);
          })
        : await marketplaceApi.uploadUnifiedAsset(gameId, file, (percent) => {
            setUnifiedUploadProgress(percent);
          });
      if (res.success) {
        setUnifiedUploadStatus("processing");
        setScanStatus("scanning");
        setScanMessage("Đang thực hiện giải nén, kiểm tra virus và phân tích mã nguồn chạy nền...");
      } else {
        setUnifiedUploadStatus("failed");
        setUnifiedError(res.message || "Tải lên thất bại.");
      }
    } catch (err: any) {
      setUnifiedUploadStatus("failed");
      setUnifiedError(err.response?.data?.message || err.message || "Lỗi kết nối khi tải lên.");
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !unifiedExtractedMedia || !unifiedExtractedMedia.screenshots) return;

    const oldIndex = unifiedExtractedMedia.screenshots.indexOf(active.id as string);
    const newIndex = unifiedExtractedMedia.screenshots.indexOf(over.id as string);

    const newOrderedList = arrayMove(unifiedExtractedMedia.screenshots, oldIndex, newIndex);

    // 1. Cập nhật UI ngay lập tức
    setUnifiedExtractedMedia((prev) => {
      if (!prev) return prev;
      return { ...prev, screenshots: newOrderedList };
    });

    // 2. Gọi API cập nhật thứ tự xuống DB
    if (gameId) {
      try {
        if (publishProgram === "game") {
          await gameApi.reorderGameScreenshots(gameId, newOrderedList);
        } else {
          await marketplaceApi.reorderScreenshots(gameId, newOrderedList);
        }
        showToast("Đã cập nhật thứ tự ảnh chụp màn hình", "success");
      } catch (err: any) {
        console.error("Failed to save screenshots order:", err);
        showToast("Không thể lưu thứ tự screenshots: " + (err.message || err), "error");
      }
    }
  };

  // Logic API tách riêng để có thể gọi lại sau khi face verify xong
  const submitDraft = async (priceNum: number) => {
    if (publishProgram === "marketplace") {
      const res = await marketplaceApi.createMarketplaceItem({
        title,
        description,
        price: priceNum,
        categoryId: categoryId || undefined,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        version: version.trim() || undefined,
      });
      if (res.success && res.data?.itemId) {
        setGameId(res.data.itemId);
        setStep(2);
      } else showToast(res.message || t("errors.failedCreateMarketplaceItem"), 'error');
    } else {
      const res = await gameApi.createGameDraft({
        title,
        description,
        // co_publishing: giá bán không áp dụng (admin tự quyết % lúc soạn hợp
        // đồng) — gửi undefined thay vì 0 để không bị hiểu nhầm là "miễn phí"
        // (HomepageServiceImpl dùng priceProposed === 0 để lọc game Free).
        priceProposed: publishingType === "co_publishing" ? undefined : priceNum,
        revenueSplitProposed:
          publishingType === "co_publishing"
            ? Number(revenueSplitProposed)
            : undefined,
        categoryId: categoryId || undefined,
        publishingType,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      });
      if (res.success && res.data?.gameId) {
        setGameId(res.data.gameId);
        setStep(2);
      } else showToast(res.message || t("errors.failedCreateGameDraft"), 'error');
    }
  };

  // Handle Draft Creation (Step 1 submit)
  const handleCreateDraft = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title) {
      showToast(t("errors.titleRequired"), 'warning');
      return;
    }
    const priceNum = parseFloat(priceInput.rawValue || "0");
    const priceRequired =
      publishProgram === "marketplace" || publishingType !== "co_publishing";
    if (priceRequired && (isNaN(priceNum) || priceNum < 0)) {
      showToast(t("errors.invalidPrice"), 'warning');
      return;
    }
    if (publishProgram === "game" && publishingType === "co_publishing") {
      const split = Number(revenueSplitProposed);
      if (!Number.isInteger(split) || split < 0 || split > 100) {
        showToast(t("errors.invalidRevenueSplit"), "warning");
        return;
      }
    }

    try {
      await submitDraft(priceNum);
    } catch (err: any) {
      if (err.response?.data?.code === "FACE_VERIFY_REQUIRED") {
        requireFaceVerify(() => {
          submitDraft(priceNum);
        });
        return;
      }
      showToast(
        err.response?.data?.message ||
          err.message ||
          t("errors.failedInitializeDraft"),
        'error',
      );
    }
  };

  const handleUploadDemo = async (file: File) => {
    if (!gameId) return;
    setDemoUploadStatus("uploading");
    setDemoUploadProgress(0);
    try {
      const res = await gameApi.uploadWebDemo(gameId, file, (percent) => {
        setDemoUploadProgress(percent);
      });
      if (res.success) {
        setDemoUploadStatus("completed");
      } else {
        setDemoUploadStatus("failed");
      }
    } catch (err) {
      console.error("Failed to upload web demo:", err);
      setDemoUploadStatus("failed");
    }
  };

  // Upload single file helper directly to storage
  const uploadFileToStorage = async (
    file: File,
    fileType: "game" | "thumbnail" | "screenshot" | "video",
    key: string, // unique identifier for state e.g., 'game', 'thumbnail', getFileKey(file)
  ) => {
    if (!gameId) return;

    setUploadStatus((prev) => ({ ...prev, [key]: "uploading" }));
    setUploadProgress((prev) => ({ ...prev, [key]: 0 }));
    setUploadError(null);

    try {
      if (publishProgram === "marketplace" && fileType === "game") {
        // Marketplace: upload proxy 1 bước qua backend → SeaweedFsService
        const res = await marketplaceApi.uploadItemFile(
          gameId,
          file,
          (percent) => {
            setUploadProgress((prev) => ({ ...prev, [key]: percent }));
          },
        );
        if (!res.success) {
          throw new Error(res.message || t("errors.uploadFailed"));
        }
      } else if (fileType === "game") {
        // Game.zip: PUT trực tiếp (file lớn, không qua backend)
        const urlRes = await gameApi.getPresignedUrl(
          gameId,
          fileType,
          file.type,
        );
        if (!urlRes.success || !urlRes.data?.uploadUrl) {
          throw new Error(urlRes.message || t("errors.failedGetUploadUrl"));
        }
        const uploadUrl = urlRes.data.uploadUrl;

        await axios.put(uploadUrl, file, {
          headers: { "Content-Type": file.type },
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total || file.size;
            const percent = Math.round((progressEvent.loaded * 100) / total);
            setUploadProgress((prev) => ({ ...prev, [key]: percent }));
          },
        });

        const objectKey = extractObjectKey(uploadUrl);
        await gameApi.confirmUploadComplete(gameId, fileType, objectKey);
      } else {
        // Game / Marketplace media (thumbnail/screenshot/video): proxy qua backend → SeaweedFsService
        const res = publishProgram === "marketplace"
          ? await marketplaceApi.uploadMedia(
              gameId,
              fileType,
              file,
              (percent) => {
                setUploadProgress((prev) => ({ ...prev, [key]: percent }));
              },
            )
          : await gameApi.uploadMedia(
              gameId,
              fileType,
              file,
              (percent) => {
                setUploadProgress((prev) => ({ ...prev, [key]: percent }));
              },
            );
        if (!res.success) {
          throw new Error(res.message || t("errors.uploadFailed"));
        }

        // Lưu objectKey của screenshot để xóa lẻ trên server sau này
        if (fileType === "screenshot" && res.data?.objectKey) {
          setScreenshotKeys((prev) => ({
            ...prev,
            [key]: res.data!.objectKey,
          }));
        }
      }

      setUploadStatus((prev) => ({ ...prev, [key]: "completed" }));

      // If it was the main game zip file, initiate polling for security scanner
      if (fileType === "game") {
        setScanStatus("scanning");
        setScanMessage(
          publishProgram === "marketplace"
            ? t("scan.marketplacePackageUploaded")
            : t("scan.gamePackageUploaded"),
        );
      }
    } catch (err: any) {
      console.error(`Failed to upload ${fileType}:`, err);
      setUploadStatus((prev) => ({ ...prev, [key]: "failed" }));
      setUploadError(
        err.response?.data?.message ||
          err.message ||
          t("errors.uploadFailedForType", { fileType }),
      );
    }
  };

  const handleScreenshotAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && gameId) {
      const filesArr = Array.from(e.target.files);
      if (screenshots.length + filesArr.length > 5) {
        showToast(t("errors.maximumScreenshots"), 'warning');
        return;
      }
      setScreenshots((prev) => [...prev, ...filesArr]);

      // Automatically trigger upload of each newly selected screenshot image
      filesArr.forEach((file) => {
        const key = getFileKey(file);
        uploadFileToStorage(file, "screenshot", key);
      });
    }
  };

  const removeScreenshot = async (idx: number) => {
    const file = screenshots[idx];
    const key = file ? getFileKey(file) : null;
    const objectKey = key ? screenshotKeys[key] : null;

    // Xóa khỏi UI ngay
    setScreenshots((prev) => prev.filter((_, i) => i !== idx));

    // Nếu đã upload lên server → xóa cả trên server
    if (gameId && objectKey) {
      try {
        await gameApi.deleteMediaItem(gameId, objectKey);
        setScreenshotKeys((prev) => {
          const next = { ...prev };
          if (key) delete next[key];
          return next;
        });
      } catch (err) {
        console.error("Failed to delete screenshot on server:", err);
      }
    }
  };

  // Submit repo GitHub (verify owner → clone → scan → snapshot) — dùng cho game & marketplace source_code
  const handleSubmitRepo = async () => {
    if (!gameId) return;
    if (!gameRepoUrl.trim()) {
      setUploadError(t("errors.enterRepositoryLink"));
      return;
    }
    setRepoSubmitting(true);
    setUploadError(null);
    setScanStatus("scanning");
    setScanMessage(t("scan.repoVerifying"));
    try {
      const res = await gameApi.submitGameRepo(
        gameId,
        gameRepoUrl.trim(),
        gameRepoBranch.trim() || undefined,
      );
      if (res.success) {
        setRepoSubmitted(true);
        setUploadStatus((prev) => ({ ...prev, game: "completed" }));
        setScanStatus("clean");
        setScanMessage(t("success.repoAwaitingApproval"));
      } else {
        setScanStatus("failed");
        setUploadError(res.message || t("errors.failedSubmitRepository"));
      }
    } catch (err: any) {
      // Repo private mà bot chưa có quyền → hiện hướng dẫn mời bot
      if (err.response?.data?.code === "REPO_NEEDS_BOT") {
        setScanStatus("idle");
        try {
          const botRes = await gameApi.getGithubBot();
          if (botRes.success) setBotUsername(botRes.data.botUsername);
        } catch {
          /* ignore */
        }
        setShowBotInvite(true);
      } else {
        setScanStatus("failed");
        setUploadError(
          err.response?.data?.message ||
            err.message ||
            t("errors.failedSubmitRepository"),
        );
      }
    } finally {
      setRepoSubmitting(false);
    }
  };

  // Sau khi developer mời bot → accept invitation rồi submit lại
  const handleAcceptBotAndRetry = async () => {
    if (!gameRepoUrl.trim()) return;
    setBotChecking(true);
    setUploadError(null);
    try {
      const res = await gameApi.acceptBot(gameRepoUrl.trim());
      if (res.success && res.data.granted) {
        setShowBotInvite(false);
        await handleSubmitRepo(); // bot has permission -> retry submit
      } else {
        setUploadError(
          res.message ||
            t("errors.invitationNotFound"),
        );
      }
    } catch (err: any) {
      setUploadError(
        err.response?.data?.message || t("errors.couldNotConnect"),
      );
    } finally {
      setBotChecking(false);
    }
  };

  // Upload ảnh preview cho asset (screenshot)
  const handleAssetImageAdd = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files || !gameId) return;
    const files = Array.from(e.target.files);
    for (const file of files) {
      const tempId = Math.random().toString(36).substring(2, 9);
      setAssetImages((prev) => [...prev, { file, tempId }]);
      try {
        const res = await marketplaceApi.uploadItemMedia(
          gameId,
          "screenshot",
          file,
        );
        if (res.success && res.data?.objectKey) {
          setAssetImages((prev) =>
            prev.map((it) =>
              it.tempId === tempId ? { ...it, objectKey: res.data!.objectKey } : it,
            ),
          );
        }
      } catch (err: any) {
        setUploadError(err.response?.data?.message || t("errors.failedUploadImage"));
        setAssetImages((prev) => prev.filter((it) => it.tempId !== tempId));
      }
    }
  };

  const removeAssetImage = async (idx: number) => {
    const img = assetImages[idx];
    setAssetImages((prev) => prev.filter((_, i) => i !== idx));
    if (gameId && img?.objectKey) {
      try {
        await marketplaceApi.deleteAssetMedia(gameId, img.objectKey);
      } catch {
        /* ignore */
      }
    }
  };

  // Upload thumbnail/screenshot/video cho marketplace item (như game)
  const handleMarketplaceMedia = async (
    mediaType: "thumbnail" | "screenshot" | "video",
    file: File,
    statusKey: string,
  ) => {
    if (!gameId) return;
    setUploadStatus((prev) => ({ ...prev, [statusKey]: "uploading" }));
    setUploadProgress((prev) => ({ ...prev, [statusKey]: 0 }));
    try {
      const res = await marketplaceApi.uploadItemMedia(
        gameId,
        mediaType,
        file,
        (p) => setUploadProgress((prev) => ({ ...prev, [statusKey]: p })),
      );
      if (res.success) {
        setUploadStatus((prev) => ({ ...prev, [statusKey]: "completed" }));
      } else {
        setUploadStatus((prev) => ({ ...prev, [statusKey]: "failed" }));
        setUploadError(res.message || t("errors.uploadFailed"));
      }
    } catch (err: any) {
      setUploadStatus((prev) => ({ ...prev, [statusKey]: "failed" }));
      setUploadError(err.response?.data?.message || t("errors.uploadFailed"));
    }
  };

  // Deep link tới trang invite collaborator của repo
  const repoInviteUrl = (() => {
    try {
      const u = new URL(gameRepoUrl.trim());
      const parts = u.pathname
        .replace(/^\//, "")
        .replace(/\.git$/, "")
        .split("/");
      if (parts.length >= 2)
        return `https://github.com/${parts[0]}/${parts[1]}/settings/access`;
    } catch {
      /* ignore */
    }
    return "https://github.com";
  })();

  return (
    <div className="relative mx-auto max-w-6xl animate-fade-in space-y-6 py-4">
      {showBotInvite && (
        <BotInviteModal
          botUsername={botUsername}
          repoInviteUrl={repoInviteUrl}
          checking={botChecking}
          error={uploadError}
          onConfirm={handleAcceptBotAndRetry}
          onClose={() => setShowBotInvite(false)}
        />
      )}

      <UploadGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        programType={publishProgram}
      />

      {/* Page Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-amber-400/15 blur-3xl dark:bg-amber-400/10" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-44 w-44 rounded-full bg-sky-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20">
              {publishProgram === "marketplace" ? (
                <ShoppingBag size={23} strokeWidth={2.2} />
              ) : (
                <Gamepad2 size={24} strokeWidth={2.2} />
              )}
            </div>
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
                <Sparkles size={13} />
                {publishProgram === "marketplace"
                  ? t("program.marketplace.title")
                  : t("program.game.title")}
              </div>
              <h1 className="font-display text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                {step === 1
                  ? publishProgram === "marketplace"
                    ? t("page.title.marketplace.step1")
                    : t("page.title.game.step1")
                  : publishProgram === "marketplace"
                    ? t("page.title.marketplace.step2")
                    : t("page.title.game.step2")}
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {step === 1
                  ? t("page.description.step1")
                  : publishProgram === "marketplace"
                    ? t("page.description.marketplace.step2")
                    : t("page.description.game.step2")}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
            <button
              type="button"
              onClick={() => setIsGuideModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-3.5 py-2 font-display text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <BookOpen size={15} className="text-amber-500" />
              <span>Hướng dẫn xuất Web & Đóng gói</span>
            </button>
            <span className="rounded-full border border-amber-300/70 bg-amber-50 px-3.5 py-2 font-mono text-xs font-bold text-amber-700 shadow-sm dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300">
              {t("page.stepCounter", { step })}
            </span>
            <div className="flex flex-1 items-center gap-1.5 sm:w-32" aria-hidden="true">
              <span className="h-1.5 flex-1 rounded-full bg-amber-400" />
              <span
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  step === 2 ? "bg-amber-400" : "bg-slate-200 dark:bg-slate-800"
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {step === 1 ? (
        <form
          onSubmit={handleCreateDraft}
          className="rounded-3xl border border-slate-200/80 bg-white/95 shadow-[0_24px_70px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90"
        >
          {/* Tab Selector */}
          <div className="grid grid-cols-1 gap-4 border-b border-slate-200/80 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/45 sm:p-7 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setPublishProgram("marketplace")}
              className={`group relative flex min-h-32 items-center gap-4 overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 ${
                publishProgram === "marketplace"
                  ? "border-amber-400 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-[0_14px_35px_-20px_rgba(245,158,11,0.65)] ring-1 ring-amber-400/20 dark:from-amber-500/15 dark:via-slate-900 dark:to-orange-500/10"
                  : "border-slate-200 bg-white/80 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700 dark:hover:bg-slate-900"
              }`}
            >
              {publishProgram === "marketplace" && (
                <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-amber-400/15 blur-2xl" />
              )}
              <div
                className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${
                  publishProgram === "marketplace"
                    ? "bg-gradient-to-br from-amber-300 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20"
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:text-slate-200"
                }`}
              >
                <ShoppingBag
                  size={22}
                  className="transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <div className="relative flex-1">
                <span
                  className={`block font-display font-bold text-sm ${
                    publishProgram === "marketplace"
                      ? "text-amber-500"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {t("program.marketplace.title")}
                </span>
                <span className="mt-1.5 block text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">
                  {t("program.marketplace.description")}
                </span>
              </div>
              {publishProgram === "marketplace" && (
                <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-sm">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
            </button>

            <button
              type="button"
              onClick={() => setPublishProgram("game")}
              className={`group relative flex min-h-32 items-center gap-4 overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 ${
                publishProgram === "game"
                  ? "border-amber-400 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-[0_14px_35px_-20px_rgba(245,158,11,0.65)] ring-1 ring-amber-400/20 dark:from-amber-500/15 dark:via-slate-900 dark:to-orange-500/10"
                  : "border-slate-200 bg-white/80 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700 dark:hover:bg-slate-900"
              }`}
            >
              {publishProgram === "game" && (
                <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-amber-400/15 blur-2xl" />
              )}
              <div
                className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${
                  publishProgram === "game"
                    ? "bg-gradient-to-br from-amber-300 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20"
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:text-slate-200"
                }`}
              >
                <Gamepad2
                  size={22}
                  className="transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <div className="relative flex-1">
                <span
                  className={`block font-display font-bold text-sm ${
                    publishProgram === "game"
                      ? "text-amber-500"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {t("program.game.title")}
                </span>
                <span className="mt-1.5 block text-xs font-normal leading-5 text-slate-500 dark:text-slate-400">
                  {t("program.game.description")}
                </span>
              </div>
              {publishProgram === "game" && (
                <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-sm">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
            </button>
          </div>

          <div className="space-y-7 p-5 sm:p-7 lg:p-8">

          <section className="space-y-6 rounded-2xl border border-slate-200/80 bg-slate-50/55 p-5 dark:border-slate-800 dark:bg-slate-900/35 sm:p-6">
          <div className="flex items-center gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-800">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:bg-sky-400/10 dark:text-sky-400">
              <Layers3 size={18} />
            </span>
            <div>
              <h2 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                {publishProgram === "game" ? t("program.game.title") : t("program.marketplace.title")}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {t("page.description.step1")}
              </p>
            </div>
          </div>

          {publishProgram === "game" && (
            <div className="flex flex-col gap-2">
              <div>
                <label className="text-sm font-semibold font-display text-slate-800 dark:text-slate-200">
                  {t("form.publishingDestination")}
                </label>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {t("form.publishingDestinationHint")}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPublishingType("marketplace_listing")}
                  aria-pressed={publishingType === "marketplace_listing"}
                  className={`group relative min-h-28 rounded-xl border p-4 text-left transition-studio ${
                    publishingType === "marketplace_listing"
                      ? "border-amber-400 bg-amber-500/10 shadow-[0_0_0_1px_rgba(251,191,36,0.08)] dark:bg-amber-500/10"
                      : "border-slate-300 bg-white hover:border-amber-400/60 hover:bg-amber-500/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-400/50"
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        publishingType === "marketplace_listing"
                          ? "bg-amber-500 text-slate-950"
                          : "bg-slate-100 text-slate-500 group-hover:text-amber-500 dark:bg-slate-800"
                      }`}
                    >
                      <ShoppingBag size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {t("form.marketplaceDestination")}
                        </span>
                        {publishingType === "marketplace_listing" && (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-slate-950">
                            <Check size={13} strokeWidth={3} />
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {t("form.marketplaceDestinationDescription")}
                      </span>
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (publishingType === "marketplace_listing") {
                      setPublishingType("full_acquisition");
                    }
                  }}
                  aria-pressed={publishingType !== "marketplace_listing"}
                  className={`group relative min-h-28 rounded-xl border p-4 text-left transition-studio ${
                    publishingType !== "marketplace_listing"
                      ? "border-amber-400 bg-amber-500/10 shadow-[0_0_0_1px_rgba(251,191,36,0.08)] dark:bg-amber-500/10"
                      : "border-slate-300 bg-white hover:border-amber-400/60 hover:bg-amber-500/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-amber-400/50"
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        publishingType !== "marketplace_listing"
                          ? "bg-amber-500 text-slate-950"
                          : "bg-slate-100 text-slate-500 group-hover:text-amber-500 dark:bg-slate-800"
                      }`}
                    >
                      <Gamepad2 size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {t("form.mobileStoreDestination")}
                        </span>
                        {publishingType !== "marketplace_listing" && (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-slate-950">
                            <Check size={13} strokeWidth={3} />
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {t("form.mobileStoreDestinationDescription")}
                      </span>
                    </span>
                  </span>
                </button>
              </div>

              {publishingType !== "marketplace_listing" && (
                <div className="flex flex-col gap-1.5 mt-2">
                  <label className="text-xs font-semibold text-slate-655 dark:text-slate-400">
                    {t("form.contractModel")}
                  </label>
                  <div className="relative" ref={publishDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsPublishDropdownOpen(!isPublishDropdownOpen)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-350 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none flex items-center justify-between transition-studio focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 cursor-pointer"
                      aria-haspopup="listbox"
                      aria-expanded={isPublishDropdownOpen}
                    >
                      <span className="truncate">
                        {publishingType === "full_acquisition"
                          ? t("form.fullAcquisitionOption")
                          : t("form.coPublishingOption")}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-slate-400 transition-transform duration-205 ${
                          isPublishDropdownOpen ? "rotate-180 text-sky-500" : ""
                        }`}
                      />
                    </button>

                    {isPublishDropdownOpen && (
                      <ul
                        className="absolute left-0 right-0 z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white p-1 shadow-2xl dark:bg-slate-950"
                        role="listbox"
                      >
                        <li role="option" aria-selected={publishingType === "full_acquisition"}>
                          <button
                            type="button"
                            onClick={() => {
                              setPublishingType("full_acquisition");
                              setIsPublishDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 text-xs rounded-lg transition-colors duration-150 cursor-pointer flex items-center justify-between ${
                              publishingType === "full_acquisition"
                                ? "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-semibold"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60"
                            }`}
                          >
                            <span className="truncate">
                              {t("form.fullAcquisitionOption")}
                            </span>
                            {publishingType === "full_acquisition" && (
                              <Check size={14} className="text-sky-500 shrink-0" />
                            )}
                          </button>
                        </li>
                        <li role="option" aria-selected={publishingType === "co_publishing"}>
                          <button
                            type="button"
                            onClick={() => {
                              setPublishingType("co_publishing");
                              // Hợp đồng ăn chia % — giá bán không áp dụng ở
                              // bước này, clear để tránh gửi lẫn priceProposed cũ.
                              priceInput.setValue("");
                              setIsPublishDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2.5 text-xs rounded-lg transition-colors duration-150 cursor-pointer flex items-center justify-between ${
                              publishingType === "co_publishing"
                                ? "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-semibold"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60"
                            }`}
                          >
                            <span className="truncate">
                              {t("form.coPublishingOption")}
                            </span>
                            {publishingType === "co_publishing" && (
                              <Check size={14} className="text-sky-500 shrink-0" />
                            )}
                          </button>
                        </li>
                      </ul>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {publishingType === "full_acquisition"
                      ? t("form.fullAcquisitionHint")
                      : t("form.coPublishingHint")}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Input
              label={
                publishProgram === "game"
                  ? t("form.gameTitle")
                  : t("form.assetTitle")
              }
              placeholder={
                publishProgram === "game"
                  ? t("form.gameTitlePlaceholder")
                  : t("form.assetTitlePlaceholder")
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="[&_input]:h-12 [&_input]:rounded-xl"
              required
            />

            {publishProgram === "game" && publishingType === "co_publishing" ? (
              <Input
                label={t("form.revenueSplitProposedLabel")}
                suffix="%"
                placeholder={t("form.revenueSplitProposedPlaceholder")}
                type="number"
                min={0}
                max={100}
                value={revenueSplitProposed}
                onChange={(e) => setRevenueSplitProposed(e.target.value)}
                helperText={t("form.revenueSplitProposedHelper")}
                className="[&_input]:h-12 [&_input]:rounded-xl"
                required
              />
            ) : (
              <Input
                label={t("form.priceLabel")}
                prefix="VND"
                placeholder={t("form.pricePlaceholder")}
                type="text"
                inputMode="numeric"
                {...priceInput.inputProps}
                className="[&_input]:h-12 [&_input]:rounded-xl"
                required
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Searchable category single-select */}
            <div ref={categoryPickerRef} className="relative flex flex-col gap-1.5">
              <label className="text-sm font-semibold font-display text-slate-800 dark:text-slate-200">
                {publishProgram === "game"
                  ? t("form.gameCategory")
                  : t("form.category")}
              </label>
              {isLoadingCategories ? (
                <div className="text-xs text-slate-500 animate-pulse py-2.5">
                  {t("form.fetchingCategories")}
                </div>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-left text-sm text-slate-800 outline-none transition-studio focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <span className="truncate">
                      {categories.find((cat) => cat.id === categoryId)?.name ?? "—"}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-slate-500 transition-transform duration-200 ${
                        isCategoryDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>
              )}

              {isCategoryDropdownOpen && !isLoadingCategories && (
                <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-300 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                  {(() => {
                    const relevantCategories = categories.filter((cat) =>
                      publishProgram === "game" ? cat.type === "game" : cat.type === "asset",
                    );

                    if (relevantCategories.length === 0) {
                      return (
                        <p className="px-3 py-3 text-xs text-slate-500">
                          —
                        </p>
                      );
                    }

                    return relevantCategories.map((cat) => {
                      const active = cat.id === categoryId;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setCategoryId(cat.id);
                            setIsCategoryDropdownOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                            active
                              ? "bg-amber-500/12 text-amber-700 dark:text-amber-300 font-semibold"
                              : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                          }`}
                        >
                          <span>{cat.name}</span>
                          {active && <Check size={14} className="text-amber-500" />}
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            {/* Searchable tag multi-select */}
            <div ref={tagPickerRef} className="relative flex flex-col gap-1.5">
              <div className="flex items-end justify-between gap-3">
                <label
                  htmlFor="tag-search"
                  className="text-sm font-semibold font-display text-slate-800 dark:text-slate-200"
                >
                  {t("form.tags")}
                  <span className="ml-1 text-xs font-normal text-slate-500">
                    {t("form.tagsHint")}
                  </span>
                </label>
                <span
                  className={`text-[11px] ${
                    selectedTags.length >= MAX_SELECTED_TAGS
                      ? "font-semibold text-amber-500"
                      : "text-slate-500"
                  }`}
                >
                  {selectedTags.length}/{MAX_SELECTED_TAGS}
                </span>
              </div>

              <div
                className="relative flex min-h-12 w-full flex-wrap items-center gap-1.5 rounded-xl border border-slate-300 bg-white p-2.5 outline-none transition-studio focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-500/10 dark:border-slate-800 dark:bg-slate-900"
                onClick={() => document.getElementById("tag-search")?.focus()}
              >
                {/* Search icon */}
                <Search
                  size={16}
                  className="text-slate-500 shrink-0 ml-1.5 mr-1"
                />

                {/* Selected tag chips inside */}
                {selectedTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300 shrink-0"
                  >
                    {tag.name}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTag(tag);
                      }}
                      className="rounded-full p-0.5 transition-colors hover:bg-amber-500/20"
                      aria-label={t("form.removeTagAria", { name: tag.name })}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}

                {/* Search text input cursor right after chips */}
                <input
                  id="tag-search"
                  type="text"
                  value={tagQuery}
                  onChange={(event) => {
                    setTagQuery(event.target.value);
                    setIsTagDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && tagOptions.length > 0) {
                      e.preventDefault();
                      const firstUnselected = tagOptions.find(
                        (tag) => !selectedTags.some((selected) => selected.id === tag.id)
                      );
                      if (firstUnselected) {
                        toggleTag(firstUnselected);
                      }
                    } else if (e.key === "Backspace" && !tagQuery && selectedTags.length > 0) {
                      toggleTag(selectedTags[selectedTags.length - 1]);
                    }
                  }}
                  onFocus={() => setIsTagDropdownOpen(true)}
                  placeholder={selectedTags.length === 0 ? t("form.searchTagsPlaceholder") : ""}
                  autoComplete="off"
                  className="flex-grow min-w-[120px] bg-transparent border-none outline-none py-1.5 px-1.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-500 focus:ring-0 focus:border-none focus:outline-none"
                  aria-expanded={isTagDropdownOpen}
                  aria-controls="tag-search-results"
                />

                {/* Spinner loading */}
                {isLoadingTags && (
                  <RefreshCw
                    size={15}
                    className="animate-spin text-slate-500 mr-2 shrink-0"
                  />
                )}
              </div>

              {isTagDropdownOpen && (
                <div
                  id="tag-search-results"
                  className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-300 bg-white p-1.5 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                >
                  {tagSearchError ? (
                    <p className="px-3 py-3 text-xs text-red-500">{tagSearchError}</p>
                  ) : !isLoadingTags && tagOptions.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-slate-500">
                      {t("form.noMatchingTags")}
                    </p>
                  ) : (
                    tagOptions.map((tag) => {
                      const active = selectedTags.some((selected) => selected.id === tag.id);
                      const disabled = !active && selectedTags.length >= MAX_SELECTED_TAGS;
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          disabled={disabled}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                            active
                              ? "bg-amber-500/12 text-amber-700 dark:text-amber-300"
                              : disabled
                                ? "cursor-not-allowed text-slate-400 opacity-50"
                                : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{tag.name}</span>
                            <span className="block truncate text-[11px] text-slate-500">#{tag.slug}</span>
                          </span>
                          {active && <Check size={16} className="shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                {selectedTags.length >= MAX_SELECTED_TAGS
                  ? t("form.maxTagsReached")
                  : t("form.selectUpToTags")}
              </p>
            </div>
          </div>
          </section>

          <section className="space-y-6 rounded-2xl border border-slate-200/80 bg-slate-50/55 p-5 dark:border-slate-800 dark:bg-slate-900/35 sm:p-6">
            <div className="flex items-center gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-800">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShieldCheck size={18} />
              </span>
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
                {t("form.specifications")}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Input
                label={t("form.version")}
                placeholder={t("form.versionPlaceholder")}
                value="1.0.0"
                disabled={true}
                helperText={t("form.versionHelper")}
                className="[&_input]:h-12 [&_input]:rounded-xl"
              />
            </div>
          </section>

          <TextArea
            label={t("form.descriptionLabel")}
            placeholder={
              publishProgram === "marketplace"
                ? t("form.marketplaceDescriptionPlaceholder")
                : t("form.gameDescriptionPlaceholder")
            }
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-2xl border border-slate-200/80 bg-slate-50/55 p-5 dark:border-slate-800 dark:bg-slate-900/35 sm:p-6 [&_textarea]:min-h-36 [&_textarea]:rounded-xl [&_textarea]:resize-y"
          />

          <div className="flex flex-col gap-4 rounded-2xl border border-amber-300/50 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-500/20 dark:from-amber-500/10 dark:to-orange-500/5 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm dark:bg-slate-900 dark:text-amber-400">
                <CircleDollarSign size={20} />
              </span>
              <p className="max-w-lg text-xs leading-5 text-slate-600 dark:text-slate-400">
                {publishProgram === "marketplace"
                  ? t("program.marketplace.description")
                  : t("program.game.description")}
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              type="submit"
              icon={<ArrowRight size={16} />}
              iconPosition="right"
              className="min-h-11 shrink-0 !rounded-xl px-6"
            >
              {publishProgram === "marketplace"
                ? t("form.initializeMarketplaceItem")
                : t("form.initializeGameDraft")}
            </Button>
          </div>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-855 p-6 rounded-2xl shadow-md">
            <h2 className="font-display font-bold text-lg text-slate-800 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
              {t("artifacts.title")}
            </h2>

            {uploadError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={16} />
                {uploadError}
              </div>
            )}

            {/* Banner Hướng dẫn Xuất Web HTML5 & Đóng gói ZIP */}
            <div className="p-4.5 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-400/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/25">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Quy chuẩn đóng gói & Xuất Web Demo (Godot HTML5)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Xem hướng dẫn cấu hình Export Template và cấu trúc thư mục trước khi tải tệp ZIP lên.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all shrink-0 active:scale-95 cursor-pointer"
              >
                <BookOpen size={14} /> Xem hướng dẫn
              </button>
            </div>

            {/* Unified Upload Area for both Marketplace and Game */}
            <div className="space-y-6 animate-fade-in">
              {/* Hướng dẫn cấu trúc thư mục */}
              <div className="p-5 bg-slate-50 dark:bg-slate-900/45 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles size={16} className="text-amber-500" />
                      {publishProgram === "game"
                        ? "Hướng dẫn đóng gói hình ảnh, trailer và bản Web chơi thử (.zip)"
                        : "Hướng dẫn đóng gói thư mục tài nguyên (.zip)"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {publishProgram === "game"
                        ? "Để tự động phân tách hình ảnh, video trailer và bản chạy thử Web HTML5 của game, vui lòng chuẩn bị cấu trúc thư mục đúng sơ đồ bên dưới trước khi nén thành file ZIP."
                        : "Để tự động phân tách hình ảnh, video và tệp tin dự án, vui lòng chuẩn bị cấu trúc thư mục của bạn đúng theo sơ đồ bên dưới trước khi nén thành file ZIP."}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsGuideModalOpen(true)}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 border border-slate-700 dark:border-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm shrink-0 active:scale-95 cursor-pointer"
                    >
                      <BookOpen size={13} className="text-amber-400" /> Xem hướng dẫn
                    </button>
                    <a
                      href={
                        publishProgram === "game"
                          ? `${import.meta.env.VITE_API_URL || "http://localhost:8080"}/api/v1/games/template`
                          : `${import.meta.env.VITE_API_URL || "http://localhost:8080"}/api/v1/assets/template`
                      }
                      download={publishProgram === "game" ? "game_template.zip" : "asset_template.zip"}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm shrink-0 active:scale-95"
                    >
                      <Download size={13} /> Tải Template Mẫu
                    </a>
                  </div>
                </div>

                {/* Sơ đồ cây thư mục trực quan */}
                <div className="bg-slate-100 dark:bg-slate-955/60 p-5 rounded-2xl font-mono text-xs text-slate-700 dark:text-slate-350 border border-slate-200/50 dark:border-slate-850 leading-relaxed">
                  <div className="text-amber-500 font-bold flex items-center gap-1.5">
                    📦 {publishProgram === "game" ? "game_template.zip" : "asset_template.zip"}
                  </div>
                  <div className="pl-4 border-l border-slate-300 dark:border-slate-800 ml-1.5 space-y-1">
                    {/* thumbnail folder */}
                    <div>├── 📁 <span className="font-bold text-sky-500">thumbnail/</span></div>
                    <div className="pl-6 border-l border-slate-300 dark:border-slate-800 ml-1.5 text-slate-500 dark:text-slate-400">
                      └── 📄 <span className="text-slate-650 dark:text-slate-300 font-semibold">thumbnail.png</span> <span className="text-[10px] text-slate-400 dark:text-slate-500">(Ảnh đại diện chính, định dạng PNG/JPG/JPEG)</span>
                    </div>
                    
                    {/* screenshots folder */}
                    <div>├── 📁 <span className="font-bold text-sky-500">screenshots/</span></div>
                    <div className="pl-6 border-l border-slate-300 dark:border-slate-800 ml-1.5 text-slate-500 dark:text-slate-400 space-y-0.5">
                      ├── 📄 <span className="text-slate-650 dark:text-slate-300 font-semibold">screenshot1.png</span><br />
                      ├── 📄 <span className="text-slate-650 dark:text-slate-300 font-semibold">screenshot2.png</span><br />
                      └── 📄 <span className="text-slate-650 dark:text-slate-300 font-semibold">screenshot3.png</span> <span className="text-[10px] text-slate-400 dark:text-slate-500">(Tối đa 10 ảnh screenshot mô tả)</span>
                    </div>
                    
                    {/* video folder */}
                    <div>├── 📁 <span className="font-bold text-sky-500">video/</span></div>
                    <div className="pl-6 border-l border-slate-300 dark:border-slate-800 ml-1.5 text-slate-500 dark:text-slate-400">
                      └── 📄 <span className="text-slate-650 dark:text-slate-300 font-semibold">{publishProgram === "game" ? "trailer.mp4" : "preview.mp4"}</span> <span className="text-[10px] text-slate-400 dark:text-slate-500">(Video giới thiệu, định dạng MP4 - không bắt buộc)</span>
                    </div>
                    
                    {/* assets/web_demo folder */}
                    {publishProgram === "game" ? (
                      <>
                        <div>└── 📁 <span className="font-bold text-emerald-500">web_demo/</span></div>
                        <div className="pl-6 ml-1.5 text-slate-500 dark:text-slate-400">
                          └── 📁 <span className="text-slate-650 dark:text-slate-300 font-bold">html5_files/</span> <span className="text-[10px] text-slate-400 dark:text-slate-500">(Thư mục chứa bản xuất chạy trên web: index.html, index.js, index.wasm, index.pck...)</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>└── 📁 <span className="font-bold text-emerald-500">assets/</span></div>
                        <div className="pl-6 ml-1.5 text-slate-500 dark:text-slate-400">
                          └── 📁 <span className="text-slate-650 dark:text-slate-300 font-bold">src/</span> <span className="text-[10px] text-slate-400 dark:text-slate-500">(Thư mục chứa source code, audio, 3D model... đóng gói gửi cho khách hàng)</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Drag-n-drop Upload Area */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText size={18} className="text-amber-500" /> Tải lên File ZIP tài nguyên gộp
                </label>
                
                {unifiedUploadStatus === "idle" && (
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      accept=".zip"
                      onChange={(e) => {
                        const file = e.target.files ? e.target.files[0] : null;
                        if (file) handleUnifiedUpload(file);
                      }}
                      className="hidden"
                      id="unified-zip-input"
                    />
                    <label
                      htmlFor="unified-zip-input"
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-955 hover:bg-slate-200 border border-slate-250 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-355 cursor-pointer flex items-center gap-1.5 transition-studio"
                    >
                      <Upload size={14} /> Chọn File ZIP
                    </label>
                    <span className="text-xs text-slate-500 font-mono">
                      Chưa chọn file (.zip)
                    </span>
                  </div>
                )}

                {/* Trạng thái Uploading */}
                {unifiedUploadStatus === "uploading" && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold font-mono">
                      <span className="text-sky-500 flex items-center gap-1">
                        <RefreshCw size={12} className="animate-spin" /> Đang tải file lên máy chủ...
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">{unifiedUploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-150 dark:bg-slate-955 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all duration-350"
                        style={{ width: `${unifiedUploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Trạng thái Processing */}
                {unifiedUploadStatus === "processing" && (
                  <div className="p-4 bg-sky-500/5 dark:bg-sky-500/10 rounded-xl border border-sky-500/20 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-sky-500">
                      <RefreshCw className="animate-spin" size={14} />
                      <span>Hệ thống đang giải nén và phân tách tài nguyên chạy nền...</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed pl-6">
                      Chúng tôi đang thực hiện kiểm tra cấu trúc ZIP, quét virus, kiểm định bảo mật (Zip Slip / Zip Bomb) và tải các file con lên máy chủ lưu trữ. Bạn có thể đợi ở trang này, trạng thái sẽ tự động cập nhật.
                    </p>
                  </div>
                )}

                {/* Trạng thái Success */}
                {unifiedUploadStatus === "success" && (
                  <div className="space-y-4">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 size={16} className="shrink-0" />
                      Phân tách và tối ưu hóa tài nguyên thành công!
                    </div>

                    {/* Hiển thị Preview kết quả trích xuất */}
                    {unifiedExtractedMedia && (
                      <div className="p-4 border border-slate-150 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-955/20 space-y-4 animate-fade-in">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Xem trước tài nguyên đã trích xuất:</h4>
                        
                        {/* Thumbnail */}
                        {unifiedExtractedMedia.thumbnailUrl && (
                          <div className="space-y-1.5">
                            <span className="text-xs text-slate-500 font-semibold block">Ảnh đại diện (Thumbnail):</span>
                            <img
                              src={unifiedExtractedMedia.thumbnailUrl}
                              alt="Extracted Thumbnail"
                              className="w-24 h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm"
                            />
                          </div>
                        )}

                        {/* Screenshots */}
                        {unifiedExtractedMedia.screenshots && unifiedExtractedMedia.screenshots.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-500 font-semibold block">
                                Ảnh chụp màn hình (Screenshots) ({unifiedExtractedMedia.screenshots.length}):
                              </span>
                              <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-1">
                                💡 Kéo thả ảnh để sắp xếp thứ tự hiển thị
                              </span>
                            </div>
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleDragEnd}
                            >
                              <SortableContext
                                items={unifiedExtractedMedia.screenshots}
                                strategy={horizontalListSortingStrategy}
                              >
                                <div className="flex flex-wrap gap-2.5 p-2.5 bg-slate-100/40 dark:bg-slate-950/20 rounded-xl border border-slate-200/50 dark:border-slate-855/50">
                                  {unifiedExtractedMedia.screenshots.map((url, index) => (
                                    <SortableScreenshotItem
                                      key={url}
                                      url={url}
                                      index={index}
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          </div>
                        )}

                        {/* Video */}
                        {unifiedExtractedMedia.videoUrl && (
                          <div className="space-y-1.5">
                            <span className="text-xs text-slate-550 font-semibold block">Video preview:</span>
                            <video
                              src={unifiedExtractedMedia.videoUrl}
                              controls
                              className="max-w-xs rounded-lg border border-slate-200 dark:border-slate-800"
                            />
                          </div>
                        )}

                        {/* Game Playable Web Demo (Chỉ dành cho Game) */}
                        {publishProgram === "game" && (unifiedExtractedMedia as GameResponse).webDemoUrl && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-xs text-slate-505 font-semibold block">Bản chơi thử (Web Demo):</span>
                            <a
                              href={(unifiedExtractedMedia as GameResponse).webDemoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs inline-flex items-center gap-1.5 transition-all shadow-sm shrink-0 active:scale-95"
                            >
                              <Gamepad2 size={13} /> Chạy thử Web Demo
                            </a>
                          </div>
                        )}
                        
                        {/* Re-upload button */}
                        <button
                          type="button"
                          onClick={() => {
                            setUnifiedFile(null);
                            setUnifiedUploadStatus("idle");
                            setUnifiedExtractedMedia(null);
                            setUploadStatus((prev) => ({ ...prev, game: "idle" }));
                          }}
                          className="text-xs font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 mt-1 transition-colors"
                        >
                          <Upload size={13} /> Tải lên file zip khác
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Trạng thái Failed */}
                {unifiedUploadStatus === "failed" && (
                  <div className="space-y-3">
                    <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle size={16} className="shrink-0" />
                      <div>
                        <div className="font-bold">Lỗi xử lý file gộp:</div>
                        <div className="mt-0.5 font-normal">{unifiedError}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUnifiedUploadStatus("idle")}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-355 font-semibold rounded-lg text-xs transition-colors"
                    >
                      Thử lại
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 6. GitHub Repository */}
            {publishProgram === "game" && (
              <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText size={16} className="text-amber-500" /> {t("artifacts.githubLabel")}
                </label>
                <p className="text-xs text-slate-500">
                  {t("artifacts.githubDescription")}
                </p>
                
                {unifiedUploadStatus !== "success" ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
                    <AlertTriangle size={15} />
                    {t("artifacts.thumbnailRequiredBeforeRepo")}
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder={t("artifacts.repoUrlPlaceholder")}
                      value={gameRepoUrl}
                      onChange={(e) => setGameRepoUrl(e.target.value)}
                      disabled={repoSubmitted}
                      className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
                    />
                    <input
                      type="text"
                      placeholder={t("artifacts.repoBranchPlaceholder")}
                      value={gameRepoBranch}
                      onChange={(e) => setGameRepoBranch(e.target.value)}
                      disabled={repoSubmitted}
                      className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-955 border border-slate-250 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-355 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
                    />
                    {!repoSubmitted ? (
                      <button
                        type="button"
                        onClick={handleSubmitRepo}
                        disabled={repoSubmitting || !gameRepoUrl.trim()}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-studio"
                      >
                        {repoSubmitting ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" /> {t("artifacts.processing")}
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} /> {t("artifacts.verifySubmitRepo")}
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1 mt-1">
                        <CheckCircle2 size={13} /> {t("artifacts.repoVerified")}
                      </span>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="ghost"
                size="md"
                onClick={() => {
                  setStep(1);
                  setGameId(null);
                  setUploadStatus({});
                  setUploadProgress({});
                  setScanStatus("idle");
                  setThumbnailFile(null);
                  setGameFile(null);
                  setVideoFile(null);
                  setDemoFile(null);
                  setScreenshots([]);
                  setScreenshotKeys({});
                  setUnifiedFile(null);
                  setUnifiedUploadStatus("idle");
                  setUnifiedUploadProgress(0);
                  setUnifiedExtractedMedia(null);
                  setUnifiedError(null);
                }}
              >
                {t("status.backToDetails")}
              </Button>

              <Button
                variant="primary"
                size="md"
                disabled={
                  (publishProgram === "game" &&
                    (!repoSubmitted || unifiedUploadStatus !== "success")) ||
                  (publishProgram === "marketplace" &&
                    unifiedUploadStatus !== "success") ||
                  scanStatus === "scanning"
                }
                onClick={() => {
                  showToast(
                    publishProgram === "marketplace"
                      ? t("success.marketplaceSubmissionCompleted")
                      : t("success.gameSubmissionCompleted"),
                    'success',
                  );
                  setCurrentScreen("dashboard");
                }}
              >
                {t("status.finishSubmission")}
              </Button>
            </div>
          </div>

          {/* Right Status / Scanning Telemetry panel */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-sm text-slate-400 dark:text-slate-500 pl-1 uppercase tracking-wider">
              {t("status.verificationStatus")}
            </h3>

            <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <ShieldCheck size={18} className="text-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  {t("status.securityTelemetry")}
                </span>
              </div>

              {scanStatus === "idle" && (
                <p className="text-xs text-slate-500 leading-relaxed italic">
                  {publishProgram === "marketplace"
                    ? t("status.idleMarketplace")
                    : t("status.idleGame")}
                </p>
              )}

              {scanStatus === "scanning" && (
                <div className="space-y-3 py-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-500">
                    <RefreshCw className="animate-spin" size={14} />
                    <span>{t("status.analyzingPackage")}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal bg-slate-50 dark:bg-slate-950/40 p-3 rounded-lg border border-slate-200/50 dark:border-slate-850">
                    {scanMessage}
                  </p>
                </div>
              )}

              {scanStatus === "clean" && (
                <div className="space-y-3 py-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
                    <CheckCircle2 size={16} />
                    <span>{t("status.scanCleared")}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/20">
                    {scanMessage}
                  </p>
                </div>
              )}

              {scanStatus === "infected" && (
                <div className="space-y-3 py-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-500">
                    <AlertTriangle size={16} />
                    <span>{t("status.securityThreat")}</span>
                  </div>
                  <p className="text-[11px] text-rose-500 leading-normal bg-rose-500/5 p-3 rounded-lg border border-rose-500/20">
                    {scanMessage}
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
