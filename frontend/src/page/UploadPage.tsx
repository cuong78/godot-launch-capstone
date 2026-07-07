import React, { useState, useEffect } from "react";
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
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto py-4">
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

      {/* Page Header */}
      <div className="border-l-4 border-amber-400 pl-3 flex justify-between items-center">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-800 dark:text-white">
            {step === 1
              ? publishProgram === "marketplace"
                ? "Publish Marketplace Item"
                : "Publish Your Game Draft"
              : publishProgram === "marketplace"
                ? "Upload Marketplace Project File"
                : "Upload Assets & Media"}
          </h1>
          <p className="text-xs text-slate-500">
            {step === 1
              ? "Provide basic listing information, categories, and settings"
              : publishProgram === "marketplace"
                ? "Securely upload marketplace project source package"
                : "Securely upload game source package, screenshots, thumbnails, and demo clips"}
          </p>
        </div>
        <span className="text-xs font-mono font-bold bg-slate-900 border border-slate-800 text-amber-500 px-3 py-1.5 rounded-lg">
          Step {step} of 2
        </span>
      </div>

      {step === 1 ? (
        <form
          onSubmit={handleCreateDraft}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl space-y-6 shadow-md"
        >
          {/* Tab Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setPublishProgram("marketplace")}
              className={`group relative flex items-center gap-4 p-5 rounded-2xl border text-left transition-all duration-300 ${
                publishProgram === "marketplace"
                  ? "border-amber-400 bg-gradient-to-br from-amber-500/10 to-amber-500/5 dark:from-amber-500/20 dark:to-transparent shadow-[0_0_20px_rgba(245,158,11,0.05)] dark:shadow-[0_0_30px_rgba(245,158,11,0.1)] scale-[1.01]"
                  : "border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/40 hover:border-slate-350 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900/60"
              }`}
            >
              <div
                className={`p-3 rounded-xl transition-colors duration-300 ${
                  publishProgram === "marketplace"
                    ? "bg-amber-500 text-slate-950"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-slate-200"
                }`}
              >
                <ShoppingBag
                  size={22}
                  className="transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <div className="flex-1">
                <span
                  className={`block font-display font-bold text-sm ${
                    publishProgram === "marketplace"
                      ? "text-amber-500"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Standalone Asset Pack
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal leading-normal">
                  Publish standalone assets for game development such as 2D/3D characters, audio, effects, plugins (Direct ZIP download).
                </span>
              </div>
              {publishProgram === "marketplace" && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setPublishProgram("game")}
              className={`group relative flex items-center gap-4 p-5 rounded-2xl border text-left transition-all duration-300 ${
                publishProgram === "game"
                  ? "border-amber-400 bg-gradient-to-br from-amber-500/10 to-amber-500/5 dark:from-amber-500/20 dark:to-transparent shadow-[0_0_20px_rgba(245,158,11,0.05)] dark:shadow-[0_0_30px_rgba(245,158,11,0.1)] scale-[1.01]"
                  : "border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/40 hover:border-slate-350 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900/60"
              }`}
            >
              <div
                className={`p-3 rounded-xl transition-colors duration-300 ${
                  publishProgram === "game"
                    ? "bg-amber-500 text-slate-950"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-slate-200"
                }`}
              >
                <Gamepad2
                  size={22}
                  className="transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <div className="flex-1">
                <span
                  className={`block font-display font-bold text-sm ${
                    publishProgram === "game"
                      ? "text-amber-500"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Game Project & Source Code
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal leading-normal">
                  List game project source code on the Marketplace, or submit a game for store publishing partnership (GitHub Repo link required).
                </span>
              </div>
              {publishProgram === "game" && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label={
                publishProgram === "game"
                  ? "Game Title"
                  : "Asset Title"
              }
              placeholder={
                publishProgram === "game"
                  ? "e.g. Neon Horizon Racer 3D"
                  : "e.g. Fantasy Knight Sprite Sheet"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <Input
              label="Proposed Price (VND)"
              prefix="VND"
              placeholder="e.g. 50,000 (Set 0 for Free)"
              type="text"
              value={price}
              onChange={(e) => handlePriceChange(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold font-display text-slate-800 dark:text-slate-200">
                {publishProgram === "game" ? "Game Category" : "Category"}
              </label>
              {isLoadingCategories ? (
                <div className="text-xs text-slate-500 animate-pulse py-2.5">
                  Fetching categories...
                </div>
              ) : (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-350 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none transition-studio focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
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
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ));
                    }

                    return [...mediaResources, ...technicalResources].map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ));
                  })()}
                </select>
              )}
            </div>

            {/* Tags (select multiple) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold font-display text-slate-800 dark:text-slate-200">
                Tags{" "}
                <span className="text-xs font-normal text-slate-500">
                  (select multiple — key descriptors for your game/asset)
                </span>
              </label>
              {tags.length === 0 ? (
                <div className="text-xs text-slate-500 py-2">
                  Loading tags...
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const active = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-studio cursor-pointer ${
                          active
                            ? "bg-amber-500 border-amber-500 text-black"
                            : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-400"
                        }`}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedTagIds.length > 0 && (
                <span className="text-[11px] text-slate-500 mt-0.5">
                  {selectedTagIds.length} tags selected
                </span>
              )}
            </div>

            {publishProgram === "game" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold font-display text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  Publishing / Acquisition Model{" "}
                  <span title="Determines whether platform contract signing or direct listing is needed">
                    <HelpCircle
                      size={14}
                      className="text-slate-400 cursor-help"
                    />
                  </span>
                </label>
                <select
                  value={publishingType}
                  onChange={(e) => setPublishingType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-350 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none transition-studio focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
                >
                  <option value="marketplace_listing">
                    Marketplace Listing (Sell Source Code on Marketplace - Direct Listing, No Contract)
                  </option>
                  <option value="full_acquisition">
                    Full Acquisition (Sell all rights to Platform - Contract Required)
                  </option>
                  <option value="co_publishing">
                    Co-Publishing (% Revenue Share with Platform - Contract Required)
                  </option>
                </select>
              </div>
            )}
          </div>

          <div className="border-t border-slate-150 dark:border-slate-800 pt-6 space-y-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-amber-500" /> Specifications
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Version"
                placeholder="e.g. 1.0.0"
                value={publishProgram === "game" ? "1.0.0" : version}
                onChange={(e) => publishProgram !== "game" && setVersion(e.target.value)}
                disabled={publishProgram === "game"}
                helperText={publishProgram === "game" ? "Initial game version defaults to 1.0.0" : undefined}
              />
            </div>

            {publishProgram === "marketplace" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold font-display text-slate-800 dark:text-slate-200">
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
                            ? "bg-amber-500 border-amber-500 text-black shadow-sm"
                            : "bg-white dark:bg-slate-900 border-slate-350 dark:border-slate-855 text-slate-650 dark:text-slate-300 hover:border-amber-400"
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

          <TextArea
            label="Description & Features"
            placeholder={
              publishProgram === "marketplace"
                ? "Outline project requirements, deploy instructions, key assets included..."
                : "Outline Godot version requirements, how to deploy, key mechanics, and feature lists..."
            }
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex justify-end pt-3">
            <Button
              variant="primary"
              size="md"
              type="submit"
              icon={<ArrowRight size={16} />}
            >
              {publishProgram === "marketplace"
                ? "Initialize Marketplace Item"
                : "Initialize Game Draft"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* File Selection Column */}
          <div className="lg:col-span-2 space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-855 p-6 rounded-2xl shadow-md">
            <h2 className="font-display font-bold text-lg text-slate-800 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
              Required Artifacts
            </h2>

            {uploadError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle size={16} />
                {uploadError}
              </div>
            )}

            {publishProgram === "marketplace" && (
              <div className="space-y-2.5">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText size={16} className="text-amber-500" /> Marketplace Item ZIP (.zip) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => {
                      const file = e.target.files ? e.target.files[0] : null;
                      setGameFile(file);
                      if (file) uploadFileToStorage(file, "game", "game");
                    }}
                    className="hidden"
                    id="game-zip-input"
                  />
                  <label
                    htmlFor="game-zip-input"
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-955 hover:bg-slate-200 border border-slate-250 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-350 cursor-pointer flex items-center gap-1.5 transition-studio"
                  >
                    <Upload size={14} /> Select ZIP File
                  </label>
                  <span className="text-xs text-slate-500 font-mono truncate max-w-xs">
                    {gameFile
                      ? `${gameFile.name} (${(gameFile.size / (1024 * 1024)).toFixed(2)} MB)`
                      : "No file selected (Max 50MB)"}
                  </span>
                </div>
                {uploadStatus["game"] === "uploading" && (
                  <div className="space-y-1.5 mt-1.5">
                    <div className="flex justify-between text-[10px] text-sky-500 font-bold font-mono">
                      <span>Uploading...</span>
                      <span>{uploadProgress["game"]}%</span>
                    </div>
                    <div className="w-full bg-slate-150 dark:bg-slate-955 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all duration-350"
                        style={{ width: `${uploadProgress["game"]}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                {uploadStatus["game"] === "completed" && (
                  <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1 mt-1">
                    <CheckCircle2 size={13} /> Upload Complete
                  </span>
                )}
                {uploadStatus["game"] === "failed" && (
                  <span className="text-xs text-rose-500 font-semibold flex items-center gap-1 mt-1">
                    <AlertTriangle size={13} /> Upload Failed
                  </span>
                )}
              </div>
            )}

            {/* Preview Images for Asset */}
            {publishProgram === "marketplace" && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Image size={16} className="text-amber-500" /> Preview Images{" "}
                  <span className="text-xs font-normal text-slate-500">
                    (for buyers to preview the asset)
                  </span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAssetImageAdd}
                  className="hidden"
                  id="asset-img-input"
                />
                <label
                  htmlFor="asset-img-input"
                  className="inline-flex px-4 py-2.5 bg-slate-100 dark:bg-slate-955 hover:bg-slate-200 border border-slate-250 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-355 cursor-pointer items-center gap-1.5"
                >
                  <Upload size={14} /> Add Image
                </label>
                {assetImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {assetImages.map((img, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={URL.createObjectURL(img.file)}
                          alt="preview"
                          className="w-20 h-20 object-cover rounded-lg border border-slate-300 dark:border-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => removeAssetImage(idx)}
                          className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                        {!img.objectKey && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[10px] rounded-lg">
                            ...
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. Thumbnail image */}
            {(publishProgram === "game" || publishProgram === "marketplace") && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Image size={16} className="text-amber-500" /> Primary Cover
                  Thumbnail *
                </label>
                <div className="flex items-center gap-3">
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
                    className="hidden"
                    id="thumb-input"
                  />
                  <label
                    htmlFor="thumb-input"
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-955 hover:bg-slate-200 border border-slate-250 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-350 cursor-pointer flex items-center gap-1.5 transition-studio"
                  >
                    <Upload size={14} /> Select Thumbnail
                  </label>
                  <span className="text-xs text-slate-500 font-mono truncate max-w-xs">
                    {thumbnailFile ? thumbnailFile.name : "No image chosen"}
                  </span>
                </div>
                {uploadStatus["thumbnail"] === "uploading" && (
                  <div className="space-y-1.5 mt-1.5">
                    <div className="flex justify-between text-[10px] text-sky-500 font-bold font-mono">
                      <span>Uploading...</span>
                      <span>{uploadProgress["thumbnail"]}%</span>
                    </div>
                    <div className="w-full bg-slate-155 dark:bg-slate-955 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all duration-355"
                        style={{ width: `${uploadProgress["thumbnail"]}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                {uploadStatus["thumbnail"] === "completed" && (
                  <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1 mt-1">
                    <CheckCircle2 size={13} /> Upload Complete
                  </span>
                )}
                {uploadStatus["thumbnail"] === "failed" && (
                  <span className="text-xs text-rose-500 font-semibold flex items-center gap-1 mt-1">
                    <AlertTriangle size={13} /> Upload Failed
                  </span>
                )}
              </div>
            )}

            {/* 3. Screenshots (Multiple) */}
            {publishProgram === "game" && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Image size={16} className="text-amber-500" /> Screenshots
                    (Optional, Max 5)
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {screenshots.length} / 5
                  </span>
                </label>

                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleScreenshotAdd}
                    className="hidden"
                    id="screenshot-input"
                    disabled={screenshots.length >= 5}
                  />
                  <label
                    htmlFor="screenshot-input"
                    className={`px-4 py-2.5 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-studio cursor-pointer ${
                      screenshots.length >= 5
                        ? "bg-slate-255 dark:bg-slate-955 opacity-50 cursor-not-allowed border-transparent text-slate-400"
                        : "bg-slate-100 dark:bg-slate-955 hover:bg-slate-200 border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-350"
                    }`}
                  >
                    <Upload size={14} /> Add Screenshots
                  </label>
                </div>

                {screenshots.length > 0 && (
                  <div className="space-y-2.5 mt-3 bg-slate-50 dark:bg-slate-955/20 p-3 rounded-xl border border-slate-200/50 dark:border-slate-850">
                    {screenshots.map((file, idx) => {
                      const key = getFileKey(file);
                      return (
                        <div
                          key={idx}
                          className="flex flex-col gap-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-2.5 rounded-lg shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono text-slate-650 dark:text-slate-300 truncate max-w-sm">
                              {file.name}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              {uploadStatus[key] === "completed" && (
                                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                                  <CheckCircle2 size={12} /> Uploaded
                                </span>
                              )}
                              {uploadStatus[key] === "uploading" && (
                                <div className="flex items-center gap-1 text-sky-500 font-bold font-mono">
                                  <RefreshCw
                                    size={11}
                                    className="animate-spin"
                                  />{" "}
                                  {uploadProgress[key]}%
                                </div>
                              )}
                              {uploadStatus[key] === "failed" && (
                                <span className="text-rose-500 font-semibold flex items-center gap-1">
                                  <AlertTriangle size={12} /> Failed
                                </span>
                              )}
                              {uploadStatus[key] === "idle" && (
                                <button
                                  onClick={() =>
                                    uploadFileToStorage(file, "screenshot", key)
                                  }
                                  className="px-2 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 font-bold rounded text-[10px] transition-colors"
                                >
                                  Upload
                                </button>
                              )}
                              <button
                                onClick={() => removeScreenshot(idx)}
                                className="p-1 hover:bg-rose-500/10 hover:text-rose-500 text-slate-400 rounded transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                          {uploadStatus[key] === "uploading" && (
                            <div className="w-full bg-slate-100 dark:bg-slate-955 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-sky-500 h-full rounded-full transition-all duration-350"
                                style={{ width: `${uploadProgress[key]}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4. Video upload */}
            {publishProgram === "game" && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Video size={16} className="text-amber-500" /> Gameplay Video
                  Trailer (Optional)
                </label>
                <div className="flex items-center gap-3">
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
                  <label
                    htmlFor="video-input"
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-955 hover:bg-slate-200 border border-slate-250 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-350 cursor-pointer flex items-center gap-1.5 transition-studio"
                  >
                    <Upload size={14} /> Select Video
                  </label>
                  <span className="text-xs text-slate-500 font-mono truncate max-w-xs">
                    {videoFile ? videoFile.name : "No video chosen"}
                  </span>
                </div>
                {uploadStatus["video"] === "uploading" && (
                  <div className="space-y-1.5 mt-1.5">
                    <div className="flex justify-between text-[10px] text-sky-500 font-bold font-mono">
                      <span>Uploading...</span>
                      <span>{uploadProgress["video"]}%</span>
                    </div>
                    <div className="w-full bg-slate-155 dark:bg-slate-955 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all duration-355"
                        style={{ width: `${uploadProgress["video"]}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                {uploadStatus["video"] === "completed" && (
                  <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1 mt-1">
                    <CheckCircle2 size={13} /> Upload Complete
                  </span>
                )}
                {uploadStatus["video"] === "failed" && (
                  <span className="text-xs text-rose-500 font-semibold flex items-center gap-1 mt-1">
                    <AlertTriangle size={13} /> Upload Failed
                  </span>
                )}
              </div>
            )}

            {/* 5. Web Demo ZIP (Optional) */}
            {publishProgram === "game" && gameId && publishingType === "marketplace_listing" && (
              <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Upload size={16} className="text-amber-500" /> Web Demo ZIP (Optional)
                </label>
                <p className="text-xs text-slate-500">
                  Upload an HTML5/WebAssembly build (.zip) so users can play the demo directly in their web browser.
                </p>
                <div className="flex items-center gap-3">
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
                    className="hidden"
                    id="web-demo-zip-input"
                  />
                  <label
                    htmlFor="web-demo-zip-input"
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-955 hover:bg-slate-200 border border-slate-255 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-355 cursor-pointer flex items-center gap-1.5 transition-studio"
                  >
                    <Upload size={14} /> Select Demo ZIP
                  </label>
                  <span className="text-xs text-slate-500 font-mono truncate max-w-xs">
                    {demoFile
                      ? `${demoFile.name} (${(demoFile.size / (1024 * 1024)).toFixed(2)} MB)`
                      : "No file chosen (Recommended < 50MB)"}
                  </span>
                </div>
                {demoUploadStatus === "uploading" && (
                  <div className="space-y-1.5 mt-1.5">
                    <div className="flex justify-between text-[10px] text-sky-500 font-bold font-mono">
                      <span>Uploading demo...</span>
                      <span>{demoUploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-150 dark:bg-slate-955 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-500 h-full rounded-full transition-all duration-350"
                        style={{ width: `${demoUploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                {demoUploadStatus === "completed" && (
                  <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1 mt-1">
                    <CheckCircle2 size={13} /> Web demo uploaded and verified!
                  </span>
                )}
                {demoUploadStatus === "failed" && (
                  <span className="text-xs text-rose-500 font-semibold flex items-center gap-1 mt-1">
                    <AlertTriangle size={13} /> Demo upload failed. Please verify ZIP structure.
                  </span>
                )}
              </div>
            )}

            {/* 6. GitHub Repository */}
            {publishProgram === "game" && (
              <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText size={16} className="text-amber-500" /> GitHub Repository *
                </label>
                <p className="text-xs text-slate-500">
                  The system will verify the repository belongs to your GitHub account, clone it, scan for security vulnerabilities, and take a commit snapshot.
                </p>
                
                {uploadStatus["thumbnail"] !== "completed" ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
                    <AlertTriangle size={15} />
                    Vui lòng upload Primary Cover Thumbnail trước khi cấu hình & xác thực GitHub Repository của game.
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="https://github.com/username/my-godot-game"
                      value={gameRepoUrl}
                      onChange={(e) => setGameRepoUrl(e.target.value)}
                      disabled={repoSubmitted}
                      className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
                    />
                    <input
                      type="text"
                      placeholder="Branch (optional, default: main branch)"
                      value={gameRepoBranch}
                      onChange={(e) => setGameRepoBranch(e.target.value)}
                      disabled={repoSubmitted}
                      className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-955 border border-slate-250 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-350 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60"
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
                            <RefreshCw size={14} className="animate-spin" /> Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} /> Verify & Submit Repo
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1 mt-1">
                        <CheckCircle2 size={13} /> Repo verified, cloned & scanned clean
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
                }}
              >
                Back to Details
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

          {/* Right Status / Scanning Telemetry panel */}
          <div className="space-y-4">
            <h3 className="font-display font-bold text-sm text-slate-400 dark:text-slate-500 pl-1 uppercase tracking-wider">
              Verification Status
            </h3>

            <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <ShieldCheck size={18} className="text-amber-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Security Telemetry
                </span>
              </div>

              {scanStatus === "idle" && (
                <p className="text-xs text-slate-500 leading-relaxed italic">
                  {publishProgram === "marketplace"
                    ? "Upload your Marketplace Project ZIP package to initiate static safety scanner, uncompress bomb checks, and virus diagnostics."
                    : "Upload your Game Source ZIP package to initiate automatic static plagiarism scan, uncompress bomb checks, and ClamAV sandbox virus diagnostics."}
                </p>
              )}

              {scanStatus === "scanning" && (
                <div className="space-y-3 py-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-500">
                    <RefreshCw className="animate-spin" size={14} />
                    <span>Analyzing package contents...</span>
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
                    <span>Scan Cleared & Safe</span>
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
                    <span>Security Threat Detected</span>
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
