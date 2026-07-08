import React, { useEffect, useState } from 'react';
import {
  Smartphone, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Upload, ExternalLink,
} from 'lucide-react';
import { storePublishApi } from '../api/storePublishApi';
import { ExternalPublishResponse } from '../types';

interface Props {
  gameId: string;
  gameStatus?: string;
}

/**
 * Khu vực "Upload Build lên Google Play" cho game đã ký hợp đồng (status = awaiting_store_build).
 * Sau khi upload, mọi bước tiếp theo (submit + polling review) tự động ở backend —
 * card này chỉ hiện trạng thái ExternalPublish hiện tại.
 */
const ExternalPublishStatusCard: React.FC<Props> = ({ gameId, gameStatus }) => {
  const [publish, setPublish] = useState<ExternalPublishResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [versionNumber, setVersionNumber] = useState('');
  const [changelog, setChangelog] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [featureGraphic, setFeatureGraphic] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const SHORT_DESCRIPTION_MAX_LEN = 80;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await storePublishApi.getStatus(gameId);
      if (res.success) {
        setPublish(res.data || null);
      } else {
        setError(res.message || 'Không tải được trạng thái Google Play');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Lỗi tải trạng thái Google Play');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  const handleUpload = async () => {
    if (!file || !versionNumber.trim() || !shortDescription.trim() || !featureGraphic) {
      alert('Vui lòng chọn file build, nhập version number, short description và chọn feature graphic.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await storePublishApi.uploadBuild(
        gameId, file, versionNumber.trim(), shortDescription.trim(), featureGraphic, changelog.trim() || undefined
      );
      if (res.success) {
        setPublish(res.data || null);
        setFile(null);
        setFeatureGraphic(null);
        setVersionNumber('');
        setChangelog('');
        setShortDescription('');
      } else {
        setError(res.message || 'Upload build thất bại');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Lỗi upload build');
    } finally {
      setUploading(false);
    }
  };

  // Chỉ hiện khu vực này cho game đã/đang trong luồng push store
  if (gameStatus !== 'awaiting_store_build' && gameStatus !== 'published' && !publish) {
    return null;
  }

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] uppercase font-mono tracking-wider text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
          <Smartphone size={14} /> Push Google Play
        </h4>
        <button
          onClick={load}
          className="p-1 text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer"
          title="Tải lại"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <div className="text-xs text-rose-500 font-medium">{error}</div>}

      {publish && (
        <div className="p-3 rounded-lg bg-white/60 dark:bg-slate-950/30 border border-slate-200/60 dark:border-slate-800/60 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            {publish.status === 'live' && <CheckCircle2 size={14} className="text-emerald-500" />}
            {publish.status === 'submitted' && <RefreshCw size={14} className="text-sky-500 animate-spin" />}
            {publish.status === 'rejected' && <XCircle size={14} className="text-rose-500" />}
            {publish.status === 'pending' && <AlertTriangle size={14} className="text-amber-500" />}
            <span className="uppercase">
              {publish.status === 'live' ? 'Đã live trên Google Play'
                : publish.status === 'submitted' ? 'Đang chờ Google Play duyệt'
                : publish.status === 'rejected' ? 'Google Play từ chối'
                : publish.status}
            </span>
          </div>
          {publish.versionNumber && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Version: {publish.versionNumber}</p>
          )}
          {publish.storeUrl && (
            <a
              href={publish.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:underline"
            >
              <ExternalLink size={12} /> Xem trên Google Play
            </a>
          )}
          {publish.rejectedReason && (
            <p className="text-[11px] text-rose-500 italic">{publish.rejectedReason}</p>
          )}
        </div>
      )}

      {gameStatus === 'awaiting_store_build' && (publish?.status !== 'submitted') && (
        <div className="space-y-2 pt-1">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Export APK/AAB từ Godot Editor rồi upload tại đây để tự động submit lên Google Play.
            Icon (từ thumbnail) và screenshots được tự động lấy từ trang game — cần game đã có thumbnail
            và tối thiểu 2 screenshot trước khi upload.
          </p>
          <input
            type="text"
            placeholder="Version number (vd: 1.0.0)"
            value={versionNumber}
            onChange={(e) => setVersionNumber(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs"
          />
          <div>
            <input
              type="text"
              placeholder="Short description cho Google Play (tối đa 80 ký tự)"
              value={shortDescription}
              maxLength={SHORT_DESCRIPTION_MAX_LEN}
              onChange={(e) => setShortDescription(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs"
            />
            <span className="text-[10px] text-slate-400 font-mono">
              {shortDescription.length}/{SHORT_DESCRIPTION_MAX_LEN}
            </span>
          </div>
          <textarea
            placeholder="Changelog (tùy chọn)"
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs"
          />
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".apk,.aab"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="hidden"
              id={`store-build-input-${gameId}`}
            />
            <label
              htmlFor={`store-build-input-${gameId}`}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5"
            >
              <Upload size={13} /> Chọn file APK/AAB
            </label>
            <span className="text-xs text-slate-500 font-mono truncate max-w-[160px]">
              {file ? file.name : 'Chưa chọn file'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFeatureGraphic(e.target.files ? e.target.files[0] : null)}
              className="hidden"
              id={`store-feature-graphic-input-${gameId}`}
            />
            <label
              htmlFor={`store-feature-graphic-input-${gameId}`}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 border border-slate-300 dark:border-slate-800 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5"
            >
              <Upload size={13} /> Chọn Feature graphic (1024x500)
            </label>
            <span className="text-xs text-slate-500 font-mono truncate max-w-[160px]">
              {featureGraphic ? featureGraphic.name : 'Chưa chọn ảnh'}
            </span>
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading || !file || !versionNumber.trim() || !shortDescription.trim() || !featureGraphic}
            className="w-full py-2 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs transition-studio cursor-pointer flex items-center justify-center gap-1.5"
          >
            {uploading ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
            {uploading ? 'Đang upload...' : 'Upload & Submit lên Google Play'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ExternalPublishStatusCard;
