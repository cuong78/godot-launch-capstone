import React, { useState, useEffect } from 'react';
import {
  Search,
  Trash2,
  Copy,
  Check,
  FileText,
  Image,
  Video,
  Archive,
  User,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
  HardDrive,
  FolderOpen,
  Server,
  Gamepad2,
  Package,
  ArrowLeft
} from 'lucide-react';
import {
  storageApi,
  UploadedFileResponse,
  GameFileSummaryResponse,
  GameFileDetailResponse,
  AssetFileSummaryResponse,
  AssetFileDetailResponse
} from '../../api/storageApi';

interface CategoryOption {
  value: string;
  label: string;
  icon: React.ReactNode;
}

// 2 category đặc biệt: gom theo thực thể (Game/Asset), drill-down xem file con.
// Các category còn lại vẫn là danh sách file phẳng (Avatar/Hợp đồng/KYC/Media...).
const ENTITY_CATEGORIES = ['game', 'asset'] as const;
type EntityCategory = typeof ENTITY_CATEGORIES[number];

const PUBLISHING_TYPE_LABEL: Record<string, { label: string; className: string }> = {
  marketplace_listing: { label: 'Marketplace', className: 'bg-sky-400/10 text-sky-400 border-sky-400/20' },
  full_acquisition: { label: 'Store (Mua đứt)', className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  co_publishing: { label: 'Store (Hợp tác)', className: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
};

export const AdminFileManagementPanel: React.FC = () => {
  const [category, setCategory] = useState<string>('game');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(0);
  const [size, setSize] = useState<number>(20);
  const [files, setFiles] = useState<UploadedFileResponse[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Entity mode (Game/Asset) — danh sách gộp + drill-down
  const [gameList, setGameList] = useState<GameFileSummaryResponse[]>([]);
  const [assetList, setAssetList] = useState<AssetFileSummaryResponse[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameFileDetailResponse | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetFileDetailResponse | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);

  const isEntityMode = ENTITY_CATEGORIES.includes(category as EntityCategory);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<UploadedFileResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const categories: CategoryOption[] = [
    { value: 'game', label: 'Game (Source & Media)', icon: <Gamepad2 size={14} /> },
    { value: 'asset', label: 'Asset (Marketplace)', icon: <Package size={14} /> },
    { value: 'contract_pdf', label: 'Hợp đồng (PDF)', icon: <FileText size={14} /> },
    { value: 'cccd_image', label: 'Ảnh xác thực CCCD/Passport (KYC)', icon: <User size={14} /> },
  ];

  const fetchFiles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (category === 'game') {
        const res = await storageApi.listGames(search, page, size);
        if (res.success && res.data) {
          setGameList(res.data.content);
          setTotalPages(res.data.totalPages);
          setTotalElements(res.data.totalElements);
        } else {
          setError(res.message || 'Lỗi tải danh sách Game.');
        }
      } else if (category === 'asset') {
        const res = await storageApi.listAssets(search, page, size);
        if (res.success && res.data) {
          setAssetList(res.data.content);
          setTotalPages(res.data.totalPages);
          setTotalElements(res.data.totalElements);
        } else {
          setError(res.message || 'Lỗi tải danh sách Asset.');
        }
      } else {
        const res = await storageApi.listUploadedFiles(category, search, page, size);
        if (res.success && res.data) {
          setFiles(res.data.content);
          setTotalPages(res.data.totalPages);
          setTotalElements(res.data.totalElements);
        } else {
          setError(res.message || 'Lỗi tải danh sách tập tin.');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setSelectedGame(null);
    setSelectedAsset(null);
    fetchFiles();
  }, [category, page, size]);

  const openGameDetail = async (gameId: string) => {
    setIsDetailLoading(true);
    try {
      const res = await storageApi.getGameFileDetail(gameId);
      if (res.success && res.data) {
        setSelectedGame(res.data);
      } else {
        alert(res.message || 'Không tải được chi tiết Game.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Lỗi khi tải chi tiết Game.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const openAssetDetail = async (assetId: string) => {
    setIsDetailLoading(true);
    try {
      const res = await storageApi.getAssetFileDetail(assetId);
      if (res.success && res.data) {
        setSelectedAsset(res.data);
      } else {
        alert(res.message || 'Không tải được chi tiết Asset.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Lỗi khi tải chi tiết Asset.');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchFiles();
  };

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (file: UploadedFileResponse, inline: boolean = false) => {
    setDownloadingId(file.id + (inline ? '-view' : '-download'));
    try {
      const blob = await storageApi.downloadFile(file.fileUrl, file.fileType);
      const url = window.URL.createObjectURL(blob);
      
      if (inline) {
        const newTab = window.open();
        if (newTab) {
          newTab.location.href = url;
        } else {
          alert('Vui lòng cho phép mở popup trên trình duyệt để xem file.');
        }
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', file.fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      
      setTimeout(() => window.URL.revokeObjectURL(url), 15000);
    } catch (err: any) {
      alert('Tải file thất bại.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteClick = (file: UploadedFileResponse) => {
    setDeleteTarget(file);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await storageApi.deleteUploadedFile(
        deleteTarget.fileUrl,
        deleteTarget.fileType,
        deleteTarget.ownerType,
        deleteTarget.ownerId
      );
      if (res.success) {
        setDeleteTarget(null);
        fetchFiles();
      } else {
        alert(res.message || 'Xóa file thất bại.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Lỗi khi xóa file.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper render file preview icon/thumbnail
  const renderPreview = (file: UploadedFileResponse) => {
    const isImage = file.fileUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) ||
                    ['avatar', 'cccd_image'].includes(category) ||
                    file.fileType === 'game_media' || file.fileType === 'asset_media';
    const isVid = file.fileUrl.match(/\.(mp4|webm|ogg|mov)/i);

    if (isImage) {
      return (
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-900 border border-slate-700/50 flex items-center justify-center shrink-0">
          <img src={file.fileUrl} alt={file.fileName} className="object-cover w-full h-full" />
        </div>
      );
    }
    if (isVid) {
      return (
        <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-700/50 flex items-center justify-center shrink-0 text-amber-500">
          <Video size={20} />
        </div>
      );
    }
    if (category === 'contract_pdf') {
      return (
        <div className="w-12 h-12 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 text-rose-500">
          <FileText size={20} />
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 text-sky-400">
        <Archive size={20} />
      </div>
    );
  };

  const renderPagination = () =>
    totalPages > 1 && (
      <div className="flex justify-between items-center bg-white dark:bg-slate-900/10 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm">
        <span className="text-xs text-slate-500 font-mono">
          Trang {page + 1} của {totalPages} ({totalElements} mục)
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            disabled={page === 0 || isLoading}
            className="p-1.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
            disabled={page >= totalPages - 1 || isLoading}
            className="p-1.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );

  const renderFileChip = (file: UploadedFileResponse) => (
    <div
      key={file.id}
      className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-xl"
    >
      {renderPreview(file)}
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate text-slate-800 dark:text-slate-100 text-xs" title={file.fileName}>
          {file.fileName}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] font-bold font-mono rounded uppercase tracking-wider">
            {file.fileType}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">{new Date(file.createdAt).toLocaleString()}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => handleCopyUrl(file.fileUrl, file.id)}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-all cursor-pointer"
          title="Sao chép URL"
        >
          {copiedId === file.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
        </button>
        <button
          onClick={() => handleDownload(file, true)}
          disabled={downloadingId !== null}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-all cursor-pointer disabled:opacity-50"
          title="Xem trực tiếp"
        >
          {downloadingId === file.id + '-view' ? <RefreshCw size={14} className="animate-spin" /> : <Eye size={14} />}
        </button>
        <button
          onClick={() => handleDownload(file, false)}
          disabled={downloadingId !== null}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-all cursor-pointer disabled:opacity-50"
          title="Tải về máy"
        >
          {downloadingId === file.id + '-download' ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
        </button>
        <button
          onClick={() => handleDeleteClick(file)}
          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 rounded-lg transition-all cursor-pointer"
          title="Xóa tập tin"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );

  const renderGameList = () =>
    gameList.length === 0 ? (
      <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
        Không tìm thấy Game nào.
      </div>
    ) : (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {gameList.map((g) => {
            const pubType = g.publishingType ? PUBLISHING_TYPE_LABEL[g.publishingType] : null;
            return (
              <button
                key={g.id}
                onClick={() => openGameDetail(g.id)}
                className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-xl hover:border-amber-400/60 dark:hover:border-amber-400/40 transition-all text-left cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-900 border border-slate-700/50 flex items-center justify-center shrink-0">
                  {g.thumbnailUrl ? (
                    <img src={g.thumbnailUrl} alt={g.title} className="object-cover w-full h-full" />
                  ) : (
                    <Gamepad2 size={20} className="text-slate-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate text-slate-800 dark:text-slate-100 text-xs group-hover:text-amber-500 transition-colors">
                    {g.title}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">bởi {g.creatorName}</div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {pubType && (
                      <span className={`inline-block px-1.5 py-0.5 border text-[9px] font-bold rounded ${pubType.className}`}>
                        {pubType.label}
                      </span>
                    )}
                    <span className="inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] font-bold font-mono rounded uppercase">
                      {g.status}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                      <Archive size={9} /> {g.fileCount} file
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {renderPagination()}
      </div>
    );

  const renderGameDetail = () =>
    selectedGame && (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl">
          <button
            onClick={() => setSelectedGame(null)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl transition-all cursor-pointer"
            title="Quay lại danh sách Game"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{selectedGame.title}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              bởi {selectedGame.creatorName} · {selectedGame.status}
              {selectedGame.publishingType && PUBLISHING_TYPE_LABEL[selectedGame.publishingType]
                ? ` · ${PUBLISHING_TYPE_LABEL[selectedGame.publishingType].label}`
                : ''}
            </div>
          </div>
        </div>

        {selectedGame.files.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
            Game này chưa có file nào trên storage.
          </div>
        ) : (
          <div className="space-y-2">
            {selectedGame.files.map((f) => renderFileChip(f))}
          </div>
        )}
      </div>
    );

  const renderAssetList = () =>
    assetList.length === 0 ? (
      <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
        Không tìm thấy Asset nào.
      </div>
    ) : (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {assetList.map((a) => (
            <button
              key={a.id}
              onClick={() => openAssetDetail(a.id)}
              className="flex items-center gap-3 p-3 bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-xl hover:border-amber-400/60 dark:hover:border-amber-400/40 transition-all text-left cursor-pointer group"
            >
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-900 border border-slate-700/50 flex items-center justify-center shrink-0">
                {a.thumbnailUrl ? (
                  <img src={a.thumbnailUrl} alt={a.title} className="object-cover w-full h-full" />
                ) : (
                  <Package size={20} className="text-slate-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate text-slate-800 dark:text-slate-100 text-xs group-hover:text-amber-500 transition-colors">
                  {a.title}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">bởi {a.sellerName}</div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="inline-block px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] font-bold font-mono rounded uppercase">
                    {a.status}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                    <Archive size={9} /> {a.fileCount} file
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
        {renderPagination()}
      </div>
    );

  const renderAssetDetail = () =>
    selectedAsset && (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl">
          <button
            onClick={() => setSelectedAsset(null)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl transition-all cursor-pointer"
            title="Quay lại danh sách Asset"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{selectedAsset.title}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">bởi {selectedAsset.sellerName} · {selectedAsset.status}</div>
          </div>
        </div>

        {selectedAsset.files.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
            Asset này chưa có file nào trên storage.
          </div>
        ) : (
          <div className="space-y-2">
            {selectedAsset.files.map((f) => renderFileChip(f))}
          </div>
        )}
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={fetchFiles}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: Category Menu */}
        <div className="lg:col-span-1 bg-white/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 space-y-4">
          <h4 className="text-xs uppercase font-mono tracking-wider text-slate-500 font-bold flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800/60 pb-2">
            <FolderOpen size={14} className="text-amber-500" /> Danh mục Tập tin
          </h4>
          
          <div className="space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => {
                  setCategory(cat.value);
                  setPage(0);
                }}
                className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  category === cat.value
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-slate-800/40'
                }`}
              >
                {cat.icon}
                <span className="truncate">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Search form, Statistics and Table */}
        <div className="lg:col-span-3 space-y-6">
          {/* KPI Counters banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl flex items-center gap-3">
              <div className="p-2.5 bg-amber-400/10 text-amber-500 rounded-xl">
                <Archive size={18} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Tổng tập tin phân loại</p>
                <p className="text-lg font-bold font-display dark:text-white mt-0.5">{isLoading ? '...' : totalElements}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                <Server size={18} />
              </div>
              <div>
                <p className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">Hệ thống lưu trữ</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-semibold">SeaweedFS (Hoạt động · Tối ưu dung lượng)</p>
              </div>
            </div>
          </div>

          {/* Search and Sub-filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md flex-1">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên file, chủ sở hữu..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60 rounded-xl text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 text-slate-850 dark:text-slate-200 transition-all placeholder-slate-400"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-amber-400/10 hover:shadow-amber-400/20 transition-all active:scale-95 cursor-pointer shrink-0"
              >
                Tìm kiếm
              </button>
            </form>

          </div>

          {/* Entity mode: Game/Asset detail (drill-down) hoặc list */}
          {isEntityMode ? (
            isDetailLoading ? (
              <div className="flex items-center justify-center py-20 gap-2 text-slate-500 text-sm">
                <RefreshCw className="animate-spin" size={18} /> Đang tải chi tiết...
              </div>
            ) : category === 'game' && selectedGame ? (
              renderGameDetail()
            ) : category === 'asset' && selectedAsset ? (
              renderAssetDetail()
            ) : isLoading ? (
              <div className="flex items-center justify-center py-20 gap-2 text-slate-500 text-sm">
                <RefreshCw className="animate-spin" size={18} /> Đang tải danh sách...
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
                Có lỗi xảy ra: {error}
              </div>
            ) : category === 'game' ? (
              renderGameList()
            ) : (
              renderAssetList()
            )
          ) : isLoading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-slate-500 text-sm">
              <RefreshCw className="animate-spin" size={18} /> Đang tải danh sách tập tin...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs font-semibold">
              Có lỗi xảy ra: {error}
            </div>
          ) : files.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
              Không tìm thấy tập tin nào trong danh mục này.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20 text-slate-500 dark:text-slate-400 text-[10px] font-semibold uppercase font-mono">
                      <th className="p-3 w-16">Xem trước</th>
                      <th className="p-3">Tên tập tin</th>
                      <th className="p-3">Phân loại</th>
                      <th className="p-3">Lưu trữ</th>
                      <th className="p-3">Đối tượng sở hữu</th>
                      <th className="p-3">Ngày tải lên</th>
                      <th className="p-3 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs text-slate-700 dark:text-slate-300">
                    {files.map((file) => (
                      <tr key={file.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/5 transition-colors">
                        <td className="p-3">{renderPreview(file)}</td>
                        <td className="p-3 max-w-xs">
                          <div className="font-semibold truncate text-slate-800 dark:text-slate-100" title={file.fileName}>
                            {file.fileName}
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate select-all max-w-[200px]" title={file.fileUrl}>
                            {file.fileUrl}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold font-mono rounded uppercase tracking-wider">
                            {file.fileType}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-400/10 border border-blue-400/20 text-blue-400 text-[10px] font-bold font-mono rounded">
                            <Server size={10} /> SeaweedFS
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{file.ownerName}</div>
                          <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                            {file.ownerType} ID: {file.ownerId.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="p-3 text-[10px] text-slate-500 font-mono">
                          {new Date(file.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleCopyUrl(file.fileUrl, file.id)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-all relative cursor-pointer"
                              title="Sao chép URL"
                            >
                              {copiedId === file.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            </button>
                            <button
                              onClick={() => handleDownload(file, true)}
                              disabled={downloadingId !== null}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
                              title="Xem trực tiếp"
                            >
                              {downloadingId === file.id + '-view' ? <RefreshCw size={14} className="animate-spin" /> : <Eye size={14} />}
                            </button>
                            <button
                              onClick={() => handleDownload(file, false)}
                              disabled={downloadingId !== null}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
                              title="Tải về máy"
                            >
                              {downloadingId === file.id + '-download' ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                            </button>
                            <button
                              onClick={() => handleDeleteClick(file)}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 rounded-lg transition-all cursor-pointer"
                              title="Xóa tập tin"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {renderPagination()}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2 bg-rose-500/10 rounded-2xl">
                <AlertTriangle size={24} />
              </div>
              <h4 className="font-display font-bold text-slate-900 dark:text-white text-base">Xác nhận xóa tập tin</h4>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2 leading-relaxed">
              <p>Bạn có chắc chắn muốn xóa file này? Hành động này sẽ thực hiện:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Xóa vật lý file gốc trên nhà lưu trữ <span className="font-bold uppercase text-amber-500">SeaweedFS</span>.</li>
                <li>Hủy liên kết và gán giá trị <span className="font-mono bg-slate-100 dark:bg-slate-950 px-1 rounded border border-slate-200 dark:border-slate-800">NULL</span> (hoặc xóa dòng tương ứng) trong DB cho:</li>
              </ul>
              <div className="p-3 bg-slate-50 dark:bg-slate-950/30 rounded-2xl border border-slate-200 dark:border-slate-800/50 mt-2 font-mono text-[10px] space-y-1">
                <div><span className="text-slate-500">Đối tượng:</span> {deleteTarget.ownerType} ({deleteTarget.ownerName})</div>
                <div className="truncate"><span className="text-slate-500">Tên file:</span> {deleteTarget.fileName}</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-600 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-500/10 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
