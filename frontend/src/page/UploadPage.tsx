import React, { useState, useEffect } from 'react';
import { useFaceVerify } from '../context/FaceVerifyContext';
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
  Gamepad2
} from 'lucide-react';
import { Button } from '../components/Button';
import { Input, TextArea } from '../components/Input';
import { gameApi } from '../api/gameApi';
import { marketplaceApi } from '../api/marketplaceApi';
import { CategoryResponse } from '../types';
import axios from 'axios';

interface UploadPageProps {
  setCurrentScreen: (screen: any) => void;
}

interface UploadProgress {
  [key: string]: number; // percentage completed (0-100)
}

interface UploadStatus {
  [key: string]: 'idle' | 'uploading' | 'completed' | 'failed';
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
      const queryIdx = remaining.indexOf('?');
      return queryIdx !== -1 ? remaining.substring(0, queryIdx) : remaining;
    }
    return url;
  }
}

// Generate unique key for file uploads (index-independent)
const getFileKey = (file: File): string => {
  return `${file.name.replace(/[^a-zA-Z0-9]/g, '')}_${file.size}`;
};

export const UploadPage: React.FC<UploadPageProps> = ({ setCurrentScreen }) => {
  const { requireFaceVerify } = useFaceVerify();

  // Step State
  const [step, setStep] = useState<1 | 2>(1);
  const [gameId, setGameId] = useState<string | null>(null);

  // Publish Program Switch ('game' or 'marketplace')
  const [publishProgram, setPublishProgram] = useState<'game' | 'marketplace'>('marketplace');

  // Form State (Step 1)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [categoryId, setCategoryId] = useState('');
  const [publishingType, setPublishingType] = useState<'full_acquisition' | 'co_publishing' | 'marketplace_listing'>('marketplace_listing');
  const [itemType, setItemType] = useState<'source_code' | 'asset'>('source_code');
  const [godotVersion, setGodotVersion] = useState('');
  const [githubRepoUrl, setGithubRepoUrl] = useState('');
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // File State (Step 2)
  const [gameFile, setGameFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // Upload progress & status states
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Backend Security Scan State
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'clean' | 'infected' | 'failed'>('idle');
  const [scanMessage, setScanMessage] = useState('');

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
  }, []);

  // Sync categoryId when publishProgram or categories list changes
  useEffect(() => {
    const filtered = categories.filter(cat => {
      const isAssetCat = ['scripts-plugins', 'shaders-vfx', '2d-assets', '3d-models', 'audio-sfx'].includes(cat.slug);
      return publishProgram === 'marketplace' ? isAssetCat : !isAssetCat;
    });
    if (filtered.length > 0) {
      const isValid = filtered.some(cat => cat.id === categoryId);
      if (!isValid) {
        setCategoryId(filtered[0].id);
      }
    }
  }, [publishProgram, categories, categoryId]);

  // Polling logic for security virus scan
  useEffect(() => {
    let intervalId: any;
    if (scanStatus === 'scanning' && gameId) {
      if (publishProgram === 'marketplace') {
        let attempts = 0;
        intervalId = setInterval(async () => {
          try {
            attempts++;
            const res = await marketplaceApi.getMarketplaceItemById(gameId);
            if (res.success && res.data) {
              const status = res.data.status;
              if (status === 'removed' || status === 'rejected') {
                setScanStatus('infected');
                setScanMessage('Security Alert: Verification failed or virus detected. Upload cancelled.');
                clearInterval(intervalId);
              } else if (status === 'pending') {
                if (attempts >= 3) {
                  setScanStatus('clean');
                  setScanMessage('Security scan passed successfully! Item is now pending admin review.');
                  clearInterval(intervalId);
                }
              } else if (status === 'active') {
                setScanStatus('clean');
                setScanMessage('Security scan passed successfully! Item is active.');
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
              if (status === 'pending') {
                setScanStatus('clean');
                setScanMessage('Security scan passed successfully! Game is now pending review.');
                clearInterval(intervalId);
              } else if (status === 'rejected') {
                setScanStatus('infected');
                setScanMessage('Security Alert: Verification failed or virus detected. Upload cancelled.');
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
    if (publishProgram === 'marketplace') {
      if (itemType === 'source_code') {
        if (!godotVersion.trim()) { alert('Godot Version requirement is required for source code listings'); return; }
        if (!githubRepoUrl.trim()) { alert('GitHub Repository Link is required for source code listings'); return; }
      }
      const res = await marketplaceApi.createMarketplaceItem({
        title, description, price: priceNum, itemType,
        categoryId: categoryId || undefined,
        godotVersion: itemType === 'source_code' ? godotVersion : undefined,
        githubRepoUrl: itemType === 'source_code' ? githubRepoUrl : undefined,
      });
      if (res.success && res.data?.itemId) { setGameId(res.data.itemId); setStep(2); }
      else alert(res.message || 'Failed to create marketplace item');
    } else {
      const res = await gameApi.createGameDraft({
        title, description, priceProposed: priceNum,
        categoryId: categoryId || undefined, publishingType
      });
      if (res.success && res.data?.gameId) { setGameId(res.data.gameId); setStep(2); }
      else alert(res.message || 'Failed to create game draft');
    }
  };

  // Handle Draft Creation (Step 1 submit)
  const handleCreateDraft = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title) { alert('Title is required'); return; }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) { alert('Price must be a valid positive number'); return; }

    try {
      await submitDraft(priceNum);
    } catch (err: any) {
      if (err.response?.data?.code === 'FACE_VERIFY_REQUIRED') {
        requireFaceVerify(() => { submitDraft(priceNum); });
        return;
      }
      alert(err.response?.data?.message || err.message || 'Failed to initialize draft');
    }
  };

  // Upload single file helper directly to S3
  const uploadFileToS3 = async (
    file: File, 
    fileType: 'game' | 'thumbnail' | 'screenshot' | 'video',
    key: string // unique identifier for state e.g., 'game', 'thumbnail', getFileKey(file)
  ) => {
    if (!gameId) return;

    setUploadStatus(prev => ({ ...prev, [key]: 'uploading' }));
    setUploadProgress(prev => ({ ...prev, [key]: 0 }));
    setUploadError(null);

    try {
      if (publishProgram === 'marketplace') {
        // Marketplace: upload proxy 1 bước qua backend → StorageRouter (S3 / SeaweedFS)
        const res = await marketplaceApi.uploadItemFile(gameId, file, (percent) => {
          setUploadProgress(prev => ({ ...prev, [key]: percent }));
        });
        if (!res.success) {
          throw new Error(res.message || 'Upload failed');
        }
      } else {
        // Game: presigned S3 PUT trực tiếp (3 bước)
        const urlRes = await gameApi.getPresignedUrl(gameId, fileType, file.type);
        if (!urlRes.success || !urlRes.data?.uploadUrl) {
          throw new Error(urlRes.message || 'Failed to get upload URL');
        }
        const uploadUrl = urlRes.data.uploadUrl;

        await axios.put(uploadUrl, file, {
          headers: { 'Content-Type': file.type },
          onUploadProgress: (progressEvent) => {
            const total = progressEvent.total || file.size;
            const percent = Math.round((progressEvent.loaded * 100) / total);
            setUploadProgress(prev => ({ ...prev, [key]: percent }));
          }
        });

        const objectKey = extractObjectKey(uploadUrl);
        await gameApi.confirmUploadComplete(gameId, fileType, objectKey);
      }

      setUploadStatus(prev => ({ ...prev, [key]: 'completed' }));
      
      // If it was the main game zip file, initiate polling for security scanner
      if (fileType === 'game') {
        setScanStatus('scanning');
        setScanMessage(publishProgram === 'marketplace'
          ? 'Marketplace package uploaded. Scanning files for Malware and checking integrity...'
          : 'Game package uploaded. Scanning files for Malware and checking integrity (Zip Slip / Zip Bomb)...'
        );
      }
    } catch (err: any) {
      console.error(`Failed to upload ${fileType}:`, err);
      setUploadStatus(prev => ({ ...prev, [key]: 'failed' }));
      setUploadError(err.response?.data?.message || err.message || `Upload failed for ${fileType}`);
    }
  };

  const handleScreenshotAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && gameId) {
      const filesArr = Array.from(e.target.files);
      if (screenshots.length + filesArr.length > 5) {
        alert("Maximum 5 screenshots allowed.");
        return;
      }
      setScreenshots(prev => [...prev, ...filesArr]);

      // Automatically trigger upload of each newly selected screenshot image
      filesArr.forEach((file) => {
        const key = getFileKey(file);
        uploadFileToS3(file, 'screenshot', key);
      });
    }
  };

  const removeScreenshot = (idx: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto py-4">
      
      {/* Page Header */}
      <div className="border-l-4 border-amber-400 pl-3 flex justify-between items-center">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-800 dark:text-white">
            {step === 1 
              ? (publishProgram === 'marketplace' ? 'Publish Marketplace Item' : 'Publish Your Game Draft') 
              : (publishProgram === 'marketplace' ? 'Upload Marketplace Project File' : 'Upload Assets & Media')
            }
          </h1>
          <p className="text-xs text-slate-500">
            {step === 1 
              ? 'Provide basic listing information, categories, and settings' 
              : (publishProgram === 'marketplace' 
                  ? 'Securely upload marketplace project source package' 
                  : 'Securely upload game source package, screenshots, thumbnails, and demo clips'
                )
            }
          </p>
        </div>
        <span className="text-xs font-mono font-bold bg-slate-900 border border-slate-800 text-amber-500 px-3 py-1.5 rounded-lg">
          Step {step} of 2
        </span>
      </div>

      {step === 1 ? (
        <form onSubmit={handleCreateDraft} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 p-6 rounded-2xl space-y-6 shadow-md">
          {/* Tab Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setPublishProgram('marketplace')}
              className={`group relative flex items-center gap-4 p-5 rounded-2xl border text-left transition-all duration-300 ${
                publishProgram === 'marketplace'
                  ? 'border-amber-400 bg-gradient-to-br from-amber-500/10 to-amber-500/5 dark:from-amber-500/20 dark:to-transparent shadow-[0_0_20px_rgba(245,158,11,0.05)] dark:shadow-[0_0_30px_rgba(245,158,11,0.1)] scale-[1.01]'
                  : 'border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/40 hover:border-slate-350 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900/60'
              }`}
            >
              <div className={`p-3 rounded-xl transition-colors duration-300 ${
                publishProgram === 'marketplace'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-slate-200'
              }`}>
                <ShoppingBag size={22} className="transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div className="flex-1">
                <span className={`block font-display font-bold text-sm ${
                  publishProgram === 'marketplace' ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'
                }`}>
                  Creator Marketplace
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal leading-normal">
                  List standalone source codes or assets pack directly without contract requirements.
                </span>
              </div>
              {publishProgram === 'marketplace' && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setPublishProgram('game')}
              className={`group relative flex items-center gap-4 p-5 rounded-2xl border text-left transition-all duration-300 ${
                publishProgram === 'game'
                  ? 'border-amber-400 bg-gradient-to-br from-amber-500/10 to-amber-500/5 dark:from-amber-500/20 dark:to-transparent shadow-[0_0_20px_rgba(245,158,11,0.05)] dark:shadow-[0_0_30px_rgba(245,158,11,0.1)] scale-[1.01]'
                  : 'border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/40 hover:border-slate-350 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900/60'
              }`}
            >
              <div className={`p-3 rounded-xl transition-colors duration-300 ${
                publishProgram === 'game'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-slate-200'
              }`}>
                <Gamepad2 size={22} className="transition-transform duration-300 group-hover:scale-110" />
              </div>
              <div className="flex-1">
                <span className={`block font-display font-bold text-sm ${
                  publishProgram === 'game' ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'
                }`}>
                  Publish Game to Store
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal leading-normal">
                  Co-publishing model or acquisition on Mobile Stores. Requires contract signing.
                </span>
              </div>
              {publishProgram === 'game' && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label={publishProgram === 'marketplace' ? "Asset Title" : "Game Title"}
              placeholder={publishProgram === 'marketplace' ? "e.g. RPG Inventory System Template" : "e.g. Neon Horizon Racer 3D"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <Input
              label="Proposed Price (USD)"
              prefix="$"
              placeholder="e.g. 19.99 (Set 0 for Free)"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold font-display text-slate-800 dark:text-slate-200">
                Asset Classification Category
              </label>
              {isLoadingCategories ? (
                <div className="text-xs text-slate-500 animate-pulse py-2.5">Fetching categories...</div>
              ) : (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-350 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none transition-studio focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
                >
                  {categories
                    .filter(cat => {
                      const isAssetCat = ['scripts-plugins', 'shaders-vfx', '2d-assets', '3d-models', 'audio-sfx'].includes(cat.slug);
                      return publishProgram === 'marketplace' ? isAssetCat : !isAssetCat;
                    })
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))
                  }
                </select>
              )}
            </div>

            {publishProgram === 'game' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold font-display text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  Publishing / Acquisition Model <span title="Determines whether platform contract signing or direct listing is needed"><HelpCircle size={14} className="text-slate-400 cursor-help" /></span>
                </label>
                <select
                  value={publishingType}
                  onChange={(e) => setPublishingType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-350 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-100 outline-none transition-studio focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500"
                >
                  <option value="marketplace_listing">Marketplace Listing (Sell code directly, no contract)</option>
                  <option value="full_acquisition">Full Acquisition (Sell all rights to Platform - Contract Required)</option>
                  <option value="co_publishing">Co-Publishing (% Revenue Share with Platform - Contract Required)</option>
                </select>
              </div>
            )}

            {publishProgram === 'marketplace' && (
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-sm font-semibold font-display text-slate-800 dark:text-slate-200">
                  Marketplace Item Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => setItemType('source_code')}
                    className={`cursor-pointer p-4 rounded-xl border flex flex-col gap-1 transition-all duration-200 ${
                      itemType === 'source_code'
                        ? 'border-amber-500 bg-amber-500/5 dark:bg-amber-500/10'
                        : 'border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-350 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        itemType === 'source_code' ? 'border-amber-500' : 'border-slate-400'
                      }`}>
                        {itemType === 'source_code' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                      </div>
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">Source Code Project</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 pl-5 leading-normal">
                      Complete project templates, plugins, scripts. Requires Godot version & GitHub Repo.
                    </p>
                  </div>

                  <div
                    onClick={() => setItemType('asset')}
                    className={`cursor-pointer p-4 rounded-xl border flex flex-col gap-1 transition-all duration-200 ${
                      itemType === 'asset'
                        ? 'border-amber-500 bg-amber-500/5 dark:bg-amber-500/10'
                        : 'border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-350 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        itemType === 'asset' ? 'border-amber-500' : 'border-slate-400'
                      }`}>
                        {itemType === 'asset' && <div className="w-2 h-2 rounded-full bg-amber-500" />}
                      </div>
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">Resource Asset Pack</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 pl-5 leading-normal">
                      Standalone resource files, sprites, sounds, 3D models. No GitHub/Godot version required.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {publishProgram === 'marketplace' && itemType === 'source_code' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              <Input
                label="Godot Version Requirement"
                placeholder="e.g. 4.2.1-stable"
                value={godotVersion}
                onChange={(e) => setGodotVersion(e.target.value)}
                required
              />
              <Input
                label="GitHub Repository Link"
                placeholder="e.g. https://github.com/username/repo"
                value={githubRepoUrl}
                onChange={(e) => setGithubRepoUrl(e.target.value)}
                required
              />
            </div>
          )}

          <TextArea
            label="Description & Features"
            placeholder={publishProgram === 'marketplace' 
              ? "Outline project requirements, deploy instructions, key assets included..."
              : "Outline Godot version requirements, how to deploy, key mechanics, and feature lists..."
            }
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex justify-end pt-3">
            <Button variant="primary" size="md" type="submit" icon={<ArrowRight size={16} />}>
              {publishProgram === 'marketplace' ? "Initialize Marketplace Item" : "Initialize Game Draft"}
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

            {/* 1. Game package ZIP */}
            <div className="space-y-2.5">
              <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FileText size={16} className="text-amber-500" /> {publishProgram === 'marketplace' ? "Marketplace Item ZIP (.zip) *" : "Game Project Source ZIP (.zip) *"}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => {
                    const file = e.target.files ? e.target.files[0] : null;
                    setGameFile(file);
                    if (file) uploadFileToS3(file, 'game', 'game');
                  }}
                  className="hidden"
                  id="game-zip-input"
                />
                <label 
                  htmlFor="game-zip-input"
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 border border-slate-250 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-350 cursor-pointer flex items-center gap-1.5 transition-studio"
                >
                  <Upload size={14} /> Select ZIP File
                </label>
                <span className="text-xs text-slate-500 font-mono truncate max-w-xs">
                  {gameFile ? `${gameFile.name} (${(gameFile.size / (1024 * 1024)).toFixed(2)} MB)` : 'No file selected (Max 50MB)'}
                </span>
              </div>
              {uploadStatus['game'] === 'uploading' && (
                <div className="space-y-1.5 mt-1.5">
                  <div className="flex justify-between text-[10px] text-sky-500 font-bold font-mono">
                    <span>Uploading...</span>
                    <span>{uploadProgress['game']}%</span>
                  </div>
                  <div className="w-full bg-slate-150 dark:bg-slate-955 h-2 rounded-full overflow-hidden">
                    <div className="bg-sky-500 h-full rounded-full transition-all duration-350" style={{ width: `${uploadProgress['game']}%` }}></div>
                  </div>
                </div>
              )}
              {uploadStatus['game'] === 'completed' && (
                <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1 mt-1"><CheckCircle2 size={13} /> S3 Upload Complete</span>
              )}
              {uploadStatus['game'] === 'failed' && (
                <span className="text-xs text-rose-500 font-semibold flex items-center gap-1 mt-1"><AlertTriangle size={13} /> Upload Failed</span>
              )}
            </div>

            {/* 2. Thumbnail image */}
            {publishProgram === 'game' && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Image size={16} className="text-amber-500" /> Primary Cover Thumbnail *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files ? e.target.files[0] : null;
                      setThumbnailFile(file);
                      if (file) uploadFileToS3(file, 'thumbnail', 'thumbnail');
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
                    {thumbnailFile ? thumbnailFile.name : 'No image chosen'}
                  </span>
                </div>
                {uploadStatus['thumbnail'] === 'uploading' && (
                  <div className="space-y-1.5 mt-1.5">
                    <div className="flex justify-between text-[10px] text-sky-500 font-bold font-mono">
                      <span>Uploading...</span>
                      <span>{uploadProgress['thumbnail']}%</span>
                    </div>
                    <div className="w-full bg-slate-155 dark:bg-slate-955 h-2 rounded-full overflow-hidden">
                      <div className="bg-sky-500 h-full rounded-full transition-all duration-355" style={{ width: `${uploadProgress['thumbnail']}%` }}></div>
                    </div>
                  </div>
                )}
                {uploadStatus['thumbnail'] === 'completed' && (
                  <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1 mt-1"><CheckCircle2 size={13} /> S3 Upload Complete</span>
                )}
                {uploadStatus['thumbnail'] === 'failed' && (
                  <span className="text-xs text-rose-500 font-semibold flex items-center gap-1 mt-1"><AlertTriangle size={13} /> Upload Failed</span>
                )}
              </div>
            )}

            {/* 3. Screenshots (Multiple) */}
            {publishProgram === 'game' && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Image size={16} className="text-amber-500" /> Screenshots (Optional, Max 5)</span>
                  <span className="text-xs font-mono font-bold text-slate-500">{screenshots.length} / 5</span>
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
                        ? 'bg-slate-255 dark:bg-slate-955 opacity-50 cursor-not-allowed border-transparent text-slate-400' 
                        : 'bg-slate-100 dark:bg-slate-955 hover:bg-slate-200 border-slate-250 dark:border-slate-800 text-slate-700 dark:text-slate-350'
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
                        <div key={idx} className="flex flex-col gap-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-2.5 rounded-lg shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono text-slate-650 dark:text-slate-300 truncate max-w-sm">{file.name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {uploadStatus[key] === 'completed' && (
                                <span className="text-emerald-500 font-semibold flex items-center gap-1"><CheckCircle2 size={12} /> Uploaded</span>
                              )}
                              {uploadStatus[key] === 'uploading' && (
                                <div className="flex items-center gap-1 text-sky-500 font-bold font-mono">
                                  <RefreshCw size={11} className="animate-spin" /> {uploadProgress[key]}%
                                </div>
                              )}
                              {uploadStatus[key] === 'failed' && (
                                <span className="text-rose-500 font-semibold flex items-center gap-1"><AlertTriangle size={12} /> Failed</span>
                              )}
                              {uploadStatus[key] === 'idle' && (
                                <button 
                                  onClick={() => uploadFileToS3(file, 'screenshot', key)}
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
                          {uploadStatus[key] === 'uploading' && (
                            <div className="w-full bg-slate-100 dark:bg-slate-955 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-sky-500 h-full rounded-full transition-all duration-350" style={{ width: `${uploadProgress[key]}%` }}></div>
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
            {publishProgram === 'game' && (
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Video size={16} className="text-amber-500" /> Gameplay Video Trailer (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files ? e.target.files[0] : null;
                      setVideoFile(file);
                      if (file) uploadFileToS3(file, 'video', 'video');
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
                    {videoFile ? videoFile.name : 'No video chosen'}
                  </span>
                </div>
                {uploadStatus['video'] === 'uploading' && (
                  <div className="space-y-1.5 mt-1.5">
                    <div className="flex justify-between text-[10px] text-sky-500 font-bold font-mono">
                      <span>Uploading...</span>
                      <span>{uploadProgress['video']}%</span>
                    </div>
                    <div className="w-full bg-slate-155 dark:bg-slate-955 h-2 rounded-full overflow-hidden">
                      <div className="bg-sky-500 h-full rounded-full transition-all duration-355" style={{ width: `${uploadProgress['video']}%` }}></div>
                    </div>
                  </div>
                )}
                {uploadStatus['video'] === 'completed' && (
                  <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1 mt-1"><CheckCircle2 size={13} /> S3 Upload Complete</span>
                )}
                {uploadStatus['video'] === 'failed' && (
                  <span className="text-xs text-rose-500 font-semibold flex items-center gap-1 mt-1"><AlertTriangle size={13} /> Upload Failed</span>
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
                  setScanStatus('idle');
                }}
              >
                Back to Details
              </Button>

              <Button 
                variant="primary" 
                size="md" 
                disabled={
                  (publishProgram === 'game' && (uploadStatus['game'] !== 'completed' || uploadStatus['thumbnail'] !== 'completed')) ||
                  (publishProgram === 'marketplace' && uploadStatus['game'] !== 'completed') ||
                  scanStatus === 'scanning'
                }
                onClick={() => {
                  alert(publishProgram === 'marketplace' 
                    ? "Marketplace item submission pipeline completed! Returning to dashboard."
                    : "Game submission pipeline completed! Returning to dashboard."
                  );
                  setCurrentScreen('dashboard');
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
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-200">Security Telemetry</span>
              </div>

              {scanStatus === 'idle' && (
                <p className="text-xs text-slate-500 leading-relaxed italic">
                  {publishProgram === 'marketplace'
                    ? "Upload your Marketplace Project ZIP package to initiate static safety scanner, uncompress bomb checks, and virus diagnostics."
                    : "Upload your Game Source ZIP package to initiate automatic static plagiarism scan, uncompress bomb checks, and ClamAV sandbox virus diagnostics."
                  }
                </p>
              )}

              {scanStatus === 'scanning' && (
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

              {scanStatus === 'clean' && (
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

              {scanStatus === 'infected' && (
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
