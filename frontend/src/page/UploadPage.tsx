import React, { useState, useEffect, useRef } from "react";
import { useFaceVerify } from "../context/FaceVerifyContext";
import BotInviteModal from "../components/BotInviteModal";
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
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Film,
  ShoppingBag,
  Gamepad2,
  Github,
  Terminal,
  ArrowLeft,
  Check,
} from "lucide-react";
import { Button } from "../components/Button";
import { Input, TextArea } from "../components/Input";
import { gameApi } from "../api/gameApi";
import { marketplaceApi } from "../api/marketplaceApi";
import { CategoryResponse } from "../types";
import axios from "axios";

interface UploadPageProps {
  setCurrentScreen: (screen: any) => void;
}

interface UploadProgress {
  [key: string]: number; // percentage completed (0-100)
}

interface UploadStatus {
  [key: string]: "idle" | "uploading" | "completed" | "failed";
}

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

  // Step State
  const [step, setStep] = useState<1 | 2>(1);
  const [gameId, setGameId] = useState<string | null>(null);
  
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
  const [price, setPrice] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [publishingType, setPublishingType] = useState<
    "full_acquisition" | "co_publishing" | "marketplace_listing"
  >("full_acquisition");

  // Custom dropdown state & ref for Publishing / Acquisition Model
  const [isPublishDropdownOpen, setIsPublishDropdownOpen] = useState(false);
  const publishDropdownRef = useRef<HTMLDivElement>(null);
  // Marketplace giờ chỉ còn asset thuần (source_code chuyển sang Game market).
  // Giữ biến để các nhánh UI cũ tự ẩn; luôn = "asset".
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  // New Marketplace Fields

  const [version, setVersion] = useState("1.0.0");
  const [supportedPlatforms, setSupportedPlatforms] = useState<string[]>([
    "Windows",
    "macOS",
    "Linux",
    "Web",
  ]);

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
    { file: File; objectKey?: string }[]
  >([]);

  // Upload progress & status states
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

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
    const loadTags = async () => {
      try {
        const res = await tagApi.getAllTags();
        if (res.success && res.data) setTags(res.data);
      } catch (err) {
        console.error("Failed to load tags:", err);
      }
    };
    loadCategories();
    loadTags();
  }, []);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
    );
  };

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

  // Sync categoryId when publishProgram, itemType or categories list changes
  useEffect(() => {
    const filtered = categories.filter((cat) => {
      const isMediaCat = ["2d-assets", "3d-models", "audio-sfx"].includes(cat.slug);
      const isTechnicalCat = ["scripts-plugins", "shaders-vfx"].includes(cat.slug);
      
      if (publishProgram === "game") {
        return !isMediaCat && !isTechnicalCat;
      }
      
      // Marketplace asset: gồm category media (2D, 3D, Audio) + technical (scripts, shaders)
      return isMediaCat || isTechnicalCat;
    });
    if (filtered.length > 0) {
      const isValid = filtered.some((cat) => cat.id === categoryId);
      if (!isValid) {
        setCategoryId(filtered[0].id);
      }
    }
  }, [publishProgram, categories, categoryId]);

  // Close custom dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        publishDropdownRef.current &&
        !publishDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPublishDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
                setScanMessage(
                  "Security Alert: Verification failed or virus detected. Upload cancelled.",
                );
                clearInterval(intervalId);
              } else if (status === "pending") {
                if (attempts >= 3) {
                  setScanStatus("clean");
                  setScanMessage(
                    "Security scan passed successfully! Item is now pending admin review.",
                  );
                  clearInterval(intervalId);
                }
              } else if (status === "active") {
                setScanStatus("clean");
                setScanMessage(
                  "Security scan passed successfully! Item is active.",
                );
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
                setScanMessage(
                  "Security scan passed successfully! Game is now pending review.",
                );
                clearInterval(intervalId);
              } else if (status === "rejected") {
                setScanStatus("infected");
                setScanMessage(
                  "Security Alert: Verification failed or virus detected. Upload cancelled.",
                );
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
  }, [scanStatus, gameId, publishProgram]);

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

        supportedPlatforms: supportedPlatforms.length > 0 ? supportedPlatforms.join(", ") : undefined,
      });
      if (res.success && res.data?.itemId) {
        setGameId(res.data.itemId);
        setStep(2);
      } else alert(res.message || "Failed to create marketplace item");
    } else {
      const res = await gameApi.createGameDraft({
        title,
        description,
        priceProposed: priceNum,
        categoryId: categoryId || undefined,
        publishingType,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      });
      if (res.success && res.data?.gameId) {
        setGameId(res.data.gameId);
        setStep(2);
      } else alert(res.message || "Failed to create game draft");
    }
  };

  // Handle Draft Creation (Step 1 submit)
  const handleCreateDraft = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title) {
      alert("Title is required");
      return;
    }
    const cleanPriceStr = price.replace(/\s/g, "");
    const priceNum = parseFloat(cleanPriceStr || "0");
    if (isNaN(priceNum) || priceNum < 0) {
      alert("Price must be a valid positive number");
      return;
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
      alert(
        err.response?.data?.message ||
          err.message ||
          "Failed to initialize draft",
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
          throw new Error(res.message || "Upload failed");
        }
      } else if (fileType === "game") {
        // Game.zip: PUT trực tiếp (file lớn, không qua backend)
        const urlRes = await gameApi.getPresignedUrl(
          gameId,
          fileType,
          file.type,
        );
        if (!urlRes.success || !urlRes.data?.uploadUrl) {
          throw new Error(urlRes.message || "Failed to get upload URL");
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
          throw new Error(res.message || "Upload failed");
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
            ? "Marketplace package uploaded. Scanning files for Malware and checking integrity..."
            : "Game package uploaded. Scanning files for Malware and checking integrity (Zip Slip / Zip Bomb)...",
        );
      }
    } catch (err: any) {
      console.error(`Failed to upload ${fileType}:`, err);
      setUploadStatus((prev) => ({ ...prev, [key]: "failed" }));
      setUploadError(
        err.response?.data?.message ||
          err.message ||
          `Upload failed for ${fileType}`,
      );
    }
  };

  const handleScreenshotAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && gameId) {
      const filesArr = Array.from(e.target.files);
      if (screenshots.length + filesArr.length > 5) {
        alert("Maximum 5 screenshots allowed.");
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
      setUploadError("Please enter your GitHub repository link.");
      return;
    }
    setRepoSubmitting(true);
    setUploadError(null);
    setScanStatus("scanning");
    setScanMessage("Verifying repo, cloning and scanning source code security...");
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
        setScanMessage("Repo verified and clean. Awaiting approval.");
      } else {
        setScanStatus("failed");
        setUploadError(res.message || "Failed to submit repository.");
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
          err.response?.data?.message || err.message || "Failed to submit repository.",
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
            "Invitation not found. Please ensure you have invited the bot to your repository.",
        );
      }
    } catch (err: any) {
      setUploadError(
        err.response?.data?.message || "Could not connect. Please try again later.",
      );
    } finally {
      setBotChecking(false);
    }
  };

  // Upload ảnh preview cho asset (asset_image)
  const handleAssetImageAdd = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files || !gameId) return;
    const files = Array.from(e.target.files);
    for (const file of files) {
      const idx = assetImages.length;
      setAssetImages((prev) => [...prev, { file }]);
      try {
        const res = await marketplaceApi.uploadItemMedia(
          gameId,
          "asset_image",
          file,
        );
        if (res.success && res.data?.objectKey) {
          setAssetImages((prev) =>
            prev.map((it, i) =>
              i === idx ? { ...it, objectKey: res.data!.objectKey } : it,
            ),
          );
        }
      } catch (err: any) {
        setUploadError(err.response?.data?.message || "Failed to upload image.");
        setAssetImages((prev) => prev.filter((_, i) => i !== idx));
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
        setUploadError(res.message || "Upload failed.");
      }
    } catch (err: any) {
      setUploadStatus((prev) => ({ ...prev, [statusKey]: "failed" }));
      setUploadError(err.response?.data?.message || "Upload failed.");
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
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto py-6 px-4">
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

      {/* Progress Stepper & Brand Header */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="bg-amber-500/10 text-amber-500 p-3 rounded-xl border border-amber-500/20 shrink-0">
            <Gamepad2 size={24} className="text-amber-500" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-slate-800 dark:text-white leading-tight">
              {step === 1
                ? publishProgram === "marketplace"
                  ? "Publish Marketplace Asset"
                  : "Publish Game Project"
                : publishProgram === "marketplace"
                  ? "Upload Project File"
                  : "Upload Assets & Media"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {step === 1
                ? "Step 1: Provide basic listing information, categories, and settings"
                : "Step 2: Upload source files, media previews, and run diagnostics"}
            </p>
          </div>
        </div>
        
        {/* Step Stepper Indicator */}
        <div className="flex items-center gap-2 sm:gap-4 md:mr-2">
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-studio ${
              step === 1 
                ? "bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-4 ring-amber-500/10" 
                : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-500"
            }`}>
              {step === 1 ? "1" : "✓"}
            </span>
            <span className={`text-xs font-semibold font-display ${step === 1 ? "text-slate-800 dark:text-slate-200 font-bold" : "text-slate-400 dark:text-slate-500"}`}>
              Basic Details
            </span>
          </div>
          <div className={`w-8 sm:w-16 h-[2px] rounded ${step === 2 ? "bg-emerald-500/50" : "bg-slate-200 dark:bg-slate-800"}`} />
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-studio ${
              step === 2 
                ? "bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-4 ring-amber-500/10" 
                : "bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500"
            }`}>
              2
            </span>
            <span className={`text-xs font-semibold font-display ${step === 2 ? "text-slate-800 dark:text-slate-200 font-bold" : "text-slate-400 dark:text-slate-500"}`}>
              Assets & Verification
            </span>
          </div>
        </div>
      </div>

      {step === 1 ? (
        <form
          onSubmit={handleCreateDraft}
          className="bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 p-8 rounded-2xl space-y-8 shadow-md relative overflow-hidden backdrop-blur-sm"
        >
          {/* Subtle Ambient Glowing Backgrounds */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/10 dark:bg-amber-500/[0.02] rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-500/10 dark:bg-sky-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

          {/* Section: Publishing Program Switch */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold font-display text-slate-400 uppercase tracking-widest pl-1">
              Select Package Type
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <button
                type="button"
                onClick={() => setPublishProgram("marketplace")}
                className={`group relative flex items-center gap-4.5 p-5.5 rounded-2xl border text-left cursor-pointer transition-studio ${
                  publishProgram === "marketplace"
                    ? "border-amber-400/80 bg-amber-500/[0.03] dark:bg-amber-500/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_4px_20px_-2px_rgba(245,158,11,0.08)] scale-[1.01]"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-350 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850/50"
                }`}
              >
                <div
                  className={`p-3 rounded-xl transition-all duration-300 ${
                    publishProgram === "marketplace"
                      ? "bg-amber-500 text-slate-955 shadow-[0_4px_15px_rgba(245,158,11,0.4)]"
                      : "bg-slate-100 dark:bg-slate-850 text-slate-450 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                  }`}
                >
                  <ShoppingBag
                    size={22}
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className={`block font-display font-bold text-sm ${
                      publishProgram === "marketplace"
                        ? "text-amber-500 dark:text-amber-400"
                        : "text-slate-750 dark:text-slate-300"
                    }`}
                  >
                    Standalone Asset Pack
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-450 mt-1 font-normal leading-normal">
                    Publish 2D/3D art assets, SFX/audio libraries, shaders, or custom editor tools (Direct ZIP upload).
                  </span>
                </div>
                {publishProgram === "marketplace" && (
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setPublishProgram("game")}
                className={`group relative flex items-center gap-4.5 p-5.5 rounded-2xl border text-left cursor-pointer transition-studio ${
                  publishProgram === "game"
                    ? "border-amber-400/80 bg-amber-500/[0.03] dark:bg-amber-500/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.02),0_4px_20px_-2px_rgba(245,158,11,0.08)] scale-[1.01]"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-350 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850/50"
                }`}
              >
                <div
                  className={`p-3 rounded-xl transition-all duration-300 ${
                    publishProgram === "game"
                      ? "bg-amber-500 text-slate-955 shadow-[0_4px_15px_rgba(245,158,11,0.4)]"
                      : "bg-slate-100 dark:bg-slate-850 text-slate-450 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                  }`}
                >
                  <Gamepad2
                    size={22}
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className={`block font-display font-bold text-sm ${
                      publishProgram === "game"
                        ? "text-amber-500 dark:text-amber-400"
                        : "text-slate-750 dark:text-slate-300"
                    }`}
                  >
                    Game Source Code
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-450 mt-1 font-normal leading-normal">
                    Submit game project source code to list on store or apply for platform co-publishing (GitHub link required).
                  </span>
                </div>
                {publishProgram === "game" && (
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800/80" />

          {/* Section: General Information */}
          <div className="space-y-5">
            <h2 className="text-xs font-bold font-display text-slate-400 uppercase tracking-widest pl-1">
              General Listing Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label={publishProgram === "game" ? "Game Title" : "Asset Title"}
                placeholder={
                  publishProgram === "game"
                    ? "e.g. Neon Horizon Racer 3D"
                    : "e.g. Fantasy Knight Sprite Sheet"
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="bg-slate-50/30 dark:bg-slate-900/20"
              />

              <Input
                label="Proposed Price (VND)"
                prefix="VND"
                placeholder="e.g. 50,000 (Set 0 for Free)"
                type="text"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                required
                className="bg-slate-50/30 dark:bg-slate-900/20"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold font-display text-slate-750 dark:text-slate-200">
                  {publishProgram === "game" ? "Game Category" : "Category"}
                </label>
                {isLoadingCategories ? (
                  <div className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-250 dark:border-slate-800 rounded-lg text-xs text-slate-500 animate-pulse">
                    Fetching categories...
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none transition-studio focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 cursor-pointer appearance-none"
                    >
                      {(() => {
                        const gameGenres = categories.filter(cat => 
                          !["scripts-plugins", "shaders-vfx", "2d-assets", "3d-models", "audio-sfx"].includes(cat.slug)
                        );
                        const technicalResources = categories.filter(cat => 
                          ["scripts-plugins", "shaders-vfx"].includes(cat.slug)
                        );
                        const mediaResources = categories.filter(cat => 
                          ["2d-assets", "3d-models", "audio-sfx"].includes(cat.slug)
                        );

                        if (publishProgram === "game") {
                          return gameGenres.map((cat) => (
                            <option key={cat.id} value={cat.id} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
                              {cat.name}
                            </option>
                          ));
                        }

                        return [...mediaResources, ...technicalResources].map((cat) => (
                          <option key={cat.id} value={cat.id} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
                            {cat.name}
                          </option>
                        ));
                      })()}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-Select Tags */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold font-display text-slate-750 dark:text-slate-200">
                  Tags{" "}
                  <span className="text-xs font-normal text-slate-500">
                    (select descriptors for search optimization)
                  </span>
                </label>
                {tags.length === 0 ? (
                  <div className="text-xs text-slate-500 py-2">
                    Loading tags...
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2.5 mt-0.5">
                    {tags.map((tag) => {
                      const active = selectedTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleTag(tag.id)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition-studio flex items-center gap-1 ${
                            active
                              ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/10 font-bold"
                              : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-amber-500/40 hover:text-amber-500"
                          }`}
                        >
                          {active && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800/80" />

          {/* Section: Technical Specifications */}
          <div className="space-y-5">
            <h2 className="text-xs font-bold font-display text-slate-400 uppercase tracking-widest pl-1">
              Technical Specifications
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {publishProgram === "game" ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold font-display text-slate-750 dark:text-slate-200 flex items-center gap-1">
                    Publishing / Acquisition Model{" "}
                    <span title="Determines whether platform contract signing or direct listing is needed">
                      <HelpCircle
                        size={14}
                        className="text-slate-400 cursor-help"
                      />
                    </span>
                  </label>
                  <div className="relative" ref={publishDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsPublishDropdownOpen(!isPublishDropdownOpen)}
                      className="w-full px-3.5 py-2.5 bg-slate-955/70 border border-amber-500/35 hover:border-amber-500/60 rounded-lg text-sm text-white font-semibold outline-none transition-studio focus:ring-4 focus:ring-amber-500/10 flex items-center justify-between cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.05)]"
                    >
                      <span className="truncate text-left pr-2">
                        {publishingType === "marketplace_listing"
                          ? "Marketplace Listing (Sell Source Code - Direct Listing, No Contract)"
                          : publishingType === "full_acquisition"
                          ? "Full Acquisition (Sell all rights to Platform - Contract Required)"
                          : "Co-Publishing (% Revenue Share with Platform - Contract Required)"}
                      </span>
                      <svg className={`fill-current h-4 w-4 text-amber-500/80 transition-transform duration-250 shrink-0 ${isPublishDropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                      </svg>
                    </button>

                    {isPublishDropdownOpen && (
                      <div className="absolute left-0 right-0 z-50 mt-1.5 bg-slate-950/85 backdrop-blur-lg border border-slate-800 rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(245,158,11,0.05)] overflow-hidden divide-y divide-slate-850/80 animate-fade-in">
                        {[
                          {
                            value: "marketplace_listing",
                            label: "Marketplace Listing (Sell Source Code - Direct Listing, No Contract)",
                          },
                          {
                            value: "full_acquisition",
                            label: "Full Acquisition (Sell all rights to Platform - Contract Required)",
                          },
                          {
                            value: "co_publishing",
                            label: "Co-Publishing (% Revenue Share with Platform - Contract Required)",
                          },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setPublishingType(option.value as any);
                              setIsPublishDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-3.5 text-xs sm:text-sm transition-all duration-200 block text-slate-200 hover:text-white cursor-pointer hover:bg-slate-800/65 hover:border-l-2 hover:border-amber-500/80 pl-4 hover:pl-3.5 ${
                              publishingType === option.value
                                ? "bg-slate-800/40 font-bold border-l-2 border-amber-500 text-white pl-4"
                                : "bg-transparent"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <Input
                  label="Version"
                  placeholder="e.g. 1.0.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="bg-slate-50/30 dark:bg-slate-900/20"
                />
              )}

              {publishProgram === "game" ? (
                <Input
                  label="Version"
                  placeholder="e.g. 1.0.0"
                  value="1.0.0"
                  disabled
                  helperText="Initial game version defaults to 1.0.0"
                  className="bg-slate-50/10 dark:bg-slate-900/10 opacity-70"
                />
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold font-display text-slate-750 dark:text-slate-200">
                    Supported Platforms
                  </label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {["Windows", "macOS", "Linux", "Web", "Android", "iOS"].map((platform) => {
                      const active = supportedPlatforms.includes(platform);
                      return (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => {
                            setSupportedPlatforms((prev) =>
                              prev.includes(platform)
                                ? prev.filter((p) => p !== platform)
                                : [...prev, platform]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            active
                              ? "bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/10 font-bold"
                              : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/80 text-slate-650 dark:text-slate-400 hover:border-amber-500/45 hover:text-amber-500"
                          }`}
                        >
                          {platform}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800/80" />

          {/* Section: Description */}
          <div className="space-y-4">
            <TextArea
              label="Description & Key Features"
              placeholder={
                publishProgram === "marketplace"
                  ? "Outline project requirements, deployment details, asset catalog, and guidelines..."
                  : "Outline Godot version requirement, installation guidelines, key mechanics, controls, and assets..."
              }
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-slate-50/30 dark:bg-slate-900/20"
            />
          </div>

          {/* Form Actions Footer */}
          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/80">
            <Button
              variant="primary"
              size="md"
              type="submit"
              icon={<ArrowRight size={16} />}
              className="px-6"
            >
              {publishProgram === "marketplace"
                ? "Initialize Asset Listing"
                : "Initialize Game Project"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* File Selection Column (Left) */}
          <div className="lg:col-span-8 space-y-7 bg-white dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 p-8 rounded-2xl shadow-md relative overflow-hidden backdrop-blur-sm">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/5 dark:bg-amber-500/[0.01] rounded-full blur-[100px] pointer-events-none" />
            
            <h2 className="font-display font-bold text-lg text-slate-850 dark:text-white pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
              Required Artifacts & Source Files
            </h2>

            {uploadError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-fade-in">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Marketplace ZIP Upload Zone */}
            {publishProgram === "marketplace" && (
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-750 dark:text-slate-200 flex items-center gap-2">
                  <FileText size={16} className="text-amber-500" /> Marketplace Item ZIP (.zip) <span className="text-rose-500">*</span>
                </label>
                
                <div 
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-studio relative ${
                    gameFile 
                      ? "border-emerald-500/30 bg-emerald-500/[0.01] dark:bg-emerald-500/[0.02]" 
                      : "border-slate-250 dark:border-slate-800 hover:border-amber-500/60 bg-slate-50/30 dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-950/40"
                  }`}
                >
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => {
                      const file = e.target.files ? e.target.files[0] : null;
                      setGameFile(file);
                      if (file) uploadFileToStorage(file, "game", "game");
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  
                  {!gameFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-slate-100 dark:bg-slate-850 rounded-xl text-slate-450 dark:text-slate-500 transition-colors">
                        <Upload size={22} />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Drag and drop or click to select ZIP file
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                          ZIP format only, maximum size 50MB
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 text-left">
                        <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                          <FileText size={20} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-750 dark:text-slate-200 block truncate max-w-[200px] sm:max-w-[320px]">
                            {gameFile.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                            {(gameFile.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                      
                      {uploadStatus["game"] === "completed" && (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1 shrink-0 animate-fade-in">
                          <CheckCircle2 size={13} /> Uploaded
                        </span>
                      )}
                      
                      {uploadStatus["game"] === "failed" && (
                        <span className="text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full flex items-center gap-1 shrink-0 animate-fade-in">
                          <AlertTriangle size={13} /> Failed
                        </span>
                      )}
                      
                      {uploadStatus["game"] === "idle" && (
                        <span className="text-xs text-slate-500 italic shrink-0">Ready</span>
                      )}
                    </div>
                  )}
                </div>
                
                {uploadStatus["game"] === "uploading" && (
                  <div className="space-y-1.5 mt-2 bg-sky-500/[0.02] border border-sky-500/10 p-3.5 rounded-xl">
                    <div className="flex justify-between text-[10px] text-sky-500 font-bold font-mono">
                      <span>Uploading project files...</span>
                      <span>{uploadProgress["game"]}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all duration-350"
                        style={{ width: `${uploadProgress["game"]}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Marketplace Preview Images Grid */}
            {publishProgram === "marketplace" && (
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <label className="text-sm font-semibold text-slate-750 dark:text-slate-200 flex items-center gap-2">
                  <Image size={16} className="text-amber-500" /> Preview Images{" "}
                  <span className="text-xs font-normal text-slate-500">
                    (gallery to showcase asset details)
                  </span>
                </label>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mt-2">
                  {assetImages.map((img, idx) => {
                    const isUploaded = !!img.objectKey;
                    return (
                      <div key={idx} className="group relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/80 shadow-sm flex flex-col justify-end">
                        <div className="absolute inset-0 z-0">
                          <img 
                            src={URL.createObjectURL(img.file)} 
                            alt="preview" 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => removeAssetImage(idx)}
                          className="absolute top-1.5 right-1.5 z-20 w-6 h-6 rounded-full bg-slate-950/80 hover:bg-rose-600 border border-white/10 text-white flex items-center justify-center transition-colors shadow-md text-sm cursor-pointer"
                        >
                          ×
                        </button>
                        
                        <div className="relative z-10 p-2 w-full">
                          {!isUploaded ? (
                            <div className="bg-slate-955/90 backdrop-blur-sm rounded-lg p-1.5 border border-white/5 space-y-1">
                              <div className="flex justify-between text-[8px] text-sky-400 font-bold font-mono">
                                <span>Uploading...</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                                <div className="bg-sky-500 h-full w-2/3 animate-pulse" />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-400 bg-slate-955/75 border border-emerald-500/20 px-2 py-0.5 rounded-lg flex items-center justify-center gap-1 backdrop-blur-sm">
                              <CheckCircle2 size={10} /> Saved
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  <label className="group aspect-video rounded-xl border-2 border-dashed border-slate-250 dark:border-slate-800 hover:border-amber-500/60 bg-slate-50/30 dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-950/40 flex flex-col items-center justify-center gap-1 cursor-pointer transition-studio">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleAssetImageAdd}
                      className="hidden"
                      id="asset-img-input"
                    />
                    <div className="p-2 bg-slate-100 dark:bg-slate-850 rounded-lg text-slate-450 dark:text-slate-500 group-hover:text-amber-500 transition-colors">
                      <Upload size={16} />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                      Add Image
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Cover Thumbnail Upload Zone */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              <label className="text-sm font-semibold text-slate-750 dark:text-slate-200 flex items-center gap-2">
                <Image size={16} className="text-amber-500" /> Primary Cover Thumbnail <span className="text-rose-500">*</span>
              </label>
              
              <div 
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-studio relative ${
                  thumbnailFile 
                    ? "border-emerald-500/30 bg-emerald-500/[0.01] dark:bg-emerald-500/[0.02]" 
                    : "border-slate-250 dark:border-slate-800 hover:border-amber-500/60 bg-slate-50/30 dark:bg-slate-955/20 hover:bg-slate-50 dark:hover:bg-slate-955/40"
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files ? e.target.files[0] : null;
                    if (file && file.size > 10 * 1024 * 1024) {
                      alert("Thumbnail image must be smaller than 10MB.");
                      e.target.value = "";
                      return;
                    }
                    setThumbnailFile(file);
                    if (file) uploadFileToStorage(file, "thumbnail", "thumbnail");
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                
                {!thumbnailFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-slate-100 dark:bg-slate-850 rounded-xl text-slate-450 dark:text-slate-500">
                      <Upload size={22} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Drag and drop or click to select cover image
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-1">
                        PNG, JPG, or WEBP (Recommended aspect ratio 16:9, max 10MB)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-left">
                      <div className="relative w-16 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
                        <img 
                          src={URL.createObjectURL(thumbnailFile)} 
                          alt="thumbnail preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-750 dark:text-slate-200 block truncate max-w-[200px] sm:max-w-[320px]">
                          {thumbnailFile.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                          {(thumbnailFile.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                    
                    {uploadStatus["thumbnail"] === "completed" && (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1 shrink-0 animate-fade-in">
                        <CheckCircle2 size={13} /> Uploaded
                      </span>
                    )}
                    
                    {uploadStatus["thumbnail"] === "failed" && (
                      <span className="text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full flex items-center gap-1 shrink-0 animate-fade-in">
                        <AlertTriangle size={13} /> Failed
                      </span>
                    )}
                    
                    {uploadStatus["thumbnail"] === "idle" && (
                      <span className="text-xs text-slate-500 italic shrink-0">Ready</span>
                    )}
                  </div>
                )}
              </div>
              
              {uploadStatus["thumbnail"] === "uploading" && (
                <div className="space-y-1.5 mt-2 bg-sky-500/[0.02] border border-sky-500/10 p-3.5 rounded-xl">
                  <div className="flex justify-between text-[10px] text-sky-500 font-bold font-mono">
                    <span>Uploading cover thumbnail...</span>
                    <span>{uploadProgress["thumbnail"]}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-sky-500 h-full rounded-full transition-all duration-350"
                      style={{ width: `${uploadProgress["thumbnail"]}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Game Screenshots Grid (Game Only) */}
            {publishProgram === "game" && (
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <label className="text-sm font-semibold text-slate-750 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Image size={16} className="text-amber-500" /> Game Screenshots{" "}
                    <span className="text-xs font-normal text-slate-500">
                      (Optional, showcase gameplay highlights)
                    </span>
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {screenshots.length} / 5
                  </span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mt-2">
                  {screenshots.map((file, idx) => {
                    const key = getFileKey(file);
                    const isUploaded = uploadStatus[key] === "completed";
                    const isUploading = uploadStatus[key] === "uploading";
                    const isFailed = uploadStatus[key] === "failed";
                    
                    return (
                      <div key={idx} className="group relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/80 shadow-sm flex flex-col justify-end">
                        <div className="absolute inset-0 z-0">
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt="screenshot preview" 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => removeScreenshot(idx)}
                          className="absolute top-1.5 right-1.5 z-20 w-6 h-6 rounded-full bg-slate-955/80 hover:bg-rose-600 border border-white/10 text-white flex items-center justify-center transition-colors shadow-md text-sm cursor-pointer"
                        >
                          ×
                        </button>
                        
                        <div className="relative z-10 p-2 w-full">
                          {isUploading && (
                            <div className="bg-slate-955/90 backdrop-blur-sm rounded-lg p-1.5 border border-white/5 space-y-1">
                              <div className="flex justify-between text-[8px] text-sky-400 font-bold font-mono">
                                <span>Uploading...</span>
                                <span>{uploadProgress[key]}%</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                                <div 
                                  className="bg-sky-500 h-full transition-all duration-300"
                                  style={{ width: `${uploadProgress[key]}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          {isUploaded && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-slate-955/75 border border-emerald-500/20 px-2 py-0.5 rounded-lg flex items-center justify-center gap-1 backdrop-blur-sm">
                              <CheckCircle2 size={10} /> Saved
                            </span>
                          )}
                          
                          {isFailed && (
                            <span className="text-[10px] font-bold text-rose-400 bg-slate-955/75 border border-rose-500/20 px-2 py-0.5 rounded-lg flex items-center justify-center gap-1 backdrop-blur-sm">
                              <AlertTriangle size={10} /> Failed
                            </span>
                          )}
                          
                          {uploadStatus[key] === "idle" && (
                            <button
                              type="button"
                              onClick={() => uploadFileToStorage(file, "screenshot", key)}
                              className="w-full py-1 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg text-[9px] transition-colors cursor-pointer"
                            >
                              Upload
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {screenshots.length < 5 && (
                    <label className="group aspect-video rounded-xl border-2 border-dashed border-slate-250 dark:border-slate-800 hover:border-amber-500/60 bg-slate-50/30 dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-955/40 flex flex-col items-center justify-center gap-1 cursor-pointer transition-studio">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleScreenshotAdd}
                        className="hidden"
                        disabled={screenshots.length >= 5}
                      />
                      <div className="p-2 bg-slate-100 dark:bg-slate-850 rounded-lg text-slate-450 dark:text-slate-500 group-hover:text-amber-500 transition-colors">
                        <Upload size={16} />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-650 dark:text-slate-400">
                        Add Photo
                      </span>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Gameplay Trailer Upload Zone (Game Only) */}
            {publishProgram === "game" && (
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <label className="text-sm font-semibold text-slate-750 dark:text-slate-200 flex items-center gap-2">
                  <Video size={16} className="text-amber-500" /> Gameplay Video Trailer <span className="text-xs text-slate-500 font-normal">(Optional)</span>
                </label>
                
                <div 
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-studio relative ${
                    videoFile 
                      ? "border-emerald-500/30 bg-emerald-500/[0.01] dark:bg-emerald-500/[0.02]" 
                      : "border-slate-250 dark:border-slate-800 hover:border-amber-500/60 bg-slate-50/30 dark:bg-slate-955/20 hover:bg-slate-50 dark:hover:bg-slate-955/40"
                  }`}
                >
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files ? e.target.files[0] : null;
                      setVideoFile(file);
                      if (file) uploadFileToStorage(file, "video", "video");
                    }}
                    className="hidden"
                    id="video-input"
                  />
                  
                  {!videoFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files ? e.target.files[0] : null;
                          setVideoFile(file);
                          if (file) uploadFileToStorage(file, "video", "video");
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="p-3 bg-slate-100 dark:bg-slate-850 rounded-xl text-slate-450 dark:text-slate-500">
                        <Video size={22} />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Drag and drop or click to select trailer video
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-1">
                          MP4 or WEBM formats (Max size 100MB)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 text-left">
                        <div className="p-2.5 bg-sky-500/10 text-sky-500 rounded-xl">
                          <Film size={20} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-750 dark:text-slate-200 block truncate max-w-[200px] sm:max-w-[320px]">
                            {videoFile.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                            {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                      
                      {uploadStatus["video"] === "completed" && (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1 shrink-0 animate-fade-in">
                          <CheckCircle2 size={13} /> Uploaded
                        </span>
                      )}
                      
                      {uploadStatus["video"] === "failed" && (
                        <span className="text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full flex items-center gap-1 shrink-0 animate-fade-in">
                          <AlertTriangle size={13} /> Failed
                        </span>
                      )}
                      
                      {uploadStatus["video"] === "idle" && (
                        <span className="text-xs text-slate-500 italic shrink-0">Ready</span>
                      )}
                    </div>
                  )}
                </div>
                
                {uploadStatus["video"] === "uploading" && (
                  <div className="space-y-1.5 mt-2 bg-sky-500/[0.02] border border-sky-500/10 p-3.5 rounded-xl">
                    <div className="flex justify-between text-[10px] text-sky-500 font-bold font-mono">
                      <span>Uploading gameplay video...</span>
                      <span>{uploadProgress["video"]}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all duration-355"
                        style={{ width: `${uploadProgress["video"]}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Web Demo Upload Zone (Game Only) */}
            {publishProgram === "game" && gameId && publishingType === "marketplace_listing" && (
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <label className="text-sm font-semibold text-slate-750 dark:text-slate-200 flex items-center gap-2">
                  <Upload size={16} className="text-amber-500" /> Web Demo ZIP <span className="text-xs text-slate-500 font-normal">(Optional, for browser-based play tests)</span>
                </label>
                
                <div 
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-studio relative ${
                    demoFile 
                      ? "border-emerald-500/30 bg-emerald-500/[0.01] dark:bg-emerald-500/[0.02]" 
                      : "border-slate-250 dark:border-slate-800 hover:border-amber-500/60 bg-slate-50/30 dark:bg-slate-955/20 hover:bg-slate-50 dark:hover:bg-slate-955/40"
                  }`}
                >
                  <input
                    type="file"
                    accept=".zip"
                    onChange={async (e) => {
                      const file = e.target.files ? e.target.files[0] : null;
                      if (file) {
                        setDemoFile(file);
                        await handleUploadDemo(file);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  
                  {!demoFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-slate-100 dark:bg-slate-850 rounded-xl text-slate-450 dark:text-slate-500">
                        <Upload size={22} />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Drag and drop or click to select web demo ZIP
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-1">
                          HTML5/WASM export ZIP (Recommended size &lt; 50MB)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 text-left">
                        <div className="p-2.5 bg-sky-500/10 text-sky-500 rounded-xl">
                          <Upload size={20} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-750 dark:text-slate-200 block truncate max-w-[200px] sm:max-w-[320px]">
                            {demoFile.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                            {(demoFile.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                      
                      {demoUploadStatus === "completed" && (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1 shrink-0 animate-fade-in">
                          <CheckCircle2 size={13} /> Uploaded
                        </span>
                      )}
                      
                      {demoUploadStatus === "failed" && (
                        <span className="text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full flex items-center gap-1 shrink-0 animate-fade-in">
                          <AlertTriangle size={13} /> Failed
                        </span>
                      )}
                      
                      {demoUploadStatus === "idle" && (
                        <span className="text-xs text-slate-500 italic shrink-0">Uploading...</span>
                      )}
                    </div>
                  )}
                </div>
                
                {demoUploadStatus === "uploading" && (
                  <div className="space-y-1.5 mt-2 bg-sky-500/[0.02] border border-sky-500/10 p-3.5 rounded-xl">
                    <div className="flex justify-between text-[10px] text-sky-500 font-bold font-mono">
                      <span>Uploading web demo...</span>
                      <span>{demoUploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all duration-350"
                        style={{ width: `${demoUploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* GitHub Repository Upload (Game Only) */}
            {publishProgram === "game" && (
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <label className="text-sm font-semibold text-slate-750 dark:text-slate-200 flex items-center gap-2">
                  <Github size={16} className="text-amber-500" /> GitHub Repository <span className="text-rose-500">*</span>
                </label>
                <p className="text-xs text-slate-500">
                  Connect your repository to clone it, scan for security leaks/vulnerabilities, and secure a commit build snapshot.
                </p>
                
                {uploadStatus["thumbnail"] !== "completed" ? (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-fade-in leading-relaxed">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>Vui lòng tải lên Cover Thumbnail trước khi liên kết & xác thực GitHub Repository của game.</span>
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200/80 dark:border-slate-800/80 rounded-xl p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Repository URL</label>
                        <input
                          type="text"
                          placeholder="https://github.com/username/my-godot-game"
                          value={gameRepoUrl}
                          onChange={(e) => setGameRepoUrl(e.target.value)}
                          disabled={repoSubmitted}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 disabled:opacity-60 transition-studio"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Branch</label>
                        <input
                          type="text"
                          placeholder="e.g. main (optional)"
                          value={gameRepoBranch}
                          onChange={(e) => setGameRepoBranch(e.target.value)}
                          disabled={repoSubmitted}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 disabled:opacity-60 transition-studio"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      {!repoSubmitted ? (
                        <button
                          type="button"
                          onClick={handleSubmitRepo}
                          disabled={repoSubmitting || !gameRepoUrl.trim()}
                          className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-studio cursor-pointer"
                        >
                          {repoSubmitting ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" /> Verifying...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={14} /> Link & Verify Repository
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 animate-fade-in shadow-sm">
                          <CheckCircle2 size={14} /> Repository linked and scanned clean
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stepper Footer Action Buttons */}
            <div className="flex justify-between pt-6 border-t border-slate-100 dark:border-slate-800/80">
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
                }}
                className="flex items-center gap-2 hover:translate-x-[-2px]"
              >
                <ArrowLeft size={15} /> Back to Details
              </Button>

              <Button
                variant="primary"
                size="md"
                disabled={
                  (publishProgram === "game" &&
                    (!repoSubmitted ||
                      uploadStatus["thumbnail"] !== "completed")) ||
                  (publishProgram === "marketplace" &&
                    uploadStatus["game"] !== "completed") ||
                  scanStatus === "scanning"
                }
                onClick={() => {
                  alert(
                    publishProgram === "marketplace"
                      ? "Marketplace item submission pipeline completed! Returning to dashboard."
                      : "Game submission pipeline completed! Returning to dashboard.",
                  );
                  setCurrentScreen("dashboard");
                }}
              >
                Finish Submission
              </Button>
            </div>
          </div>

          {/* Telemetry/Security diagnostics panel (Right Column) */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="font-display font-bold text-xs text-slate-400 dark:text-slate-500 pl-1 uppercase tracking-widest">
              Diagnostics Status
            </h3>

            <div className="bg-slate-900 dark:bg-slate-950 text-slate-200 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg font-mono text-xs relative overflow-hidden">
              {/* Telemetry Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-amber-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Security Telemetry
                  </span>
                </div>
                {scanStatus === "scanning" && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                  </span>
                )}
                {scanStatus === "clean" && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                )}
                {scanStatus === "infected" && (
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                )}
              </div>

              {/* Status Output Console */}
              <div className="space-y-3 min-h-[160px] flex flex-col justify-between py-1 text-slate-350">
                {scanStatus === "idle" && (
                  <>
                    <div className="space-y-2">
                      <p className="text-[10px] text-slate-500 font-bold">// STANDBY MODE</p>
                      <p className="text-slate-400 leading-normal">Awaiting package file upload to initialize security diagnostics...</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed mt-2.5">
                        Godot Launch Guard system stands ready to execute: ClamAV diagnostics, zip-bomb expansion analysis, and repo static code scans.
                      </p>
                    </div>
                    <div className="text-[10px] text-slate-600 border-t border-slate-850/50 pt-2.5 flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-slate-500" /> Secure Sandbox ready
                    </div>
                  </>
                )}

                {scanStatus === "scanning" && (
                  <>
                    <div className="space-y-2">
                      <p className="text-sky-400 font-bold text-[10px] animate-pulse">// SCANNING IN PROGRESS</p>
                      <div className="space-y-1 font-mono text-[11px] text-slate-450">
                        <p className="text-slate-500">Connecting scanner daemon...</p>
                        <p className="text-emerald-500/80">✓ Payload size matches limits</p>
                        <p className="text-emerald-500/80">✓ Integrity checksum registered</p>
                        <p className="text-sky-400 animate-pulse mt-1">→ Running static threat scan...</p>
                        <p className="text-slate-350 leading-normal text-xs bg-slate-900 border border-slate-800 p-3 rounded-lg mt-2.5 font-mono select-all">
                          {scanMessage}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-sky-450 font-bold animate-pulse">
                      <RefreshCw size={12} className="animate-spin" /> Sandbox analyzing payloads...
                    </div>
                  </>
                )}

                {scanStatus === "clean" && (
                  <>
                    <div className="space-y-2">
                      <p className="text-emerald-400 font-bold text-[10px]">// SECURITY AUDIT VERIFIED</p>
                      <div className="space-y-1 font-mono text-[11px]">
                        <p className="text-emerald-500">✓ 0 malware matches found</p>
                        <p className="text-emerald-500">✓ ZIP Slip directory traversal check clean</p>
                        <p className="text-emerald-500">✓ Source package integrity cleared</p>
                        <p className="text-slate-350 leading-normal text-xs bg-slate-900 border border-slate-800 p-3 rounded-lg mt-2.5 font-mono">
                          {scanMessage}
                        </p>
                      </div>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg w-fit flex items-center gap-1.5">
                      <CheckCircle2 size={12} /> SECURE PAYLOAD
                    </div>
                  </>
                )}

                {scanStatus === "infected" && (
                  <>
                    <div className="space-y-2">
                      <p className="text-rose-500 font-bold text-[10px]">// SECURITY THREAT DETECTED</p>
                      <div className="space-y-1 font-mono text-[11px] text-rose-350">
                        <p>✗ Malicious signature match</p>
                        <p>✗ Sandbox execution failed</p>
                        <p className="text-rose-400 leading-normal text-xs bg-slate-900 border border-rose-950 p-3 rounded-lg mt-2.5 font-mono">
                          {scanMessage}
                        </p>
                      </div>
                    </div>
                    <div className="text-[10px] text-rose-400 font-bold bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-lg w-fit flex items-center gap-1.5 animate-pulse">
                      <AlertTriangle size={12} /> THREAT BLOCKED
                    </div>
                  </>
                )}

                {scanStatus === "failed" && (
                  <>
                    <div className="space-y-2">
                      <p className="text-amber-500 font-bold text-[10px]">// PIPELINE EXECUTION ERROR</p>
                      <div className="space-y-1 font-mono text-[11px] text-slate-400">
                        <p className="text-rose-450">✗ Diagnostics socket connection lost</p>
                        <p className="text-slate-400 leading-normal text-xs bg-slate-900 border border-slate-800 p-3 rounded-lg mt-2.5 font-mono">
                          {scanMessage}
                        </p>
                      </div>
                    </div>
                    <div className="text-[10px] text-amber-500 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg w-fit flex items-center gap-1.5">
                      <AlertTriangle size={12} /> ERROR OCCURRED
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
