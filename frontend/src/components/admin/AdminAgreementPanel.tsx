import { useEffect, useState } from 'react';
import { Check, Loader2, AlertTriangle, History } from 'lucide-react';
import { adminAgreementApi, AgreementVersionResponse } from '../../api/agreementApi';

export default function AdminAgreementPanel() {
  const [versions, setVersions] = useState<AgreementVersionResponse[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAgreementApi.listVersions();
      if (res.success && res.data) {
        setVersions(res.data);
        const active = res.data.find((v) => v.isActive);
        setContent(active?.content || '');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Không thể tải danh sách thỏa thuận.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!content.trim()) {
      setError('Nội dung thỏa thuận không được để trống.');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await adminAgreementApi.createVersion(content.trim());
      if (res.success) {
        setSuccess(true);
        await load();
      } else {
        setError(res.message || 'Không thể lưu thỏa thuận.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Lỗi khi lưu thỏa thuận.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>;
  }

  const activeVersion = versions.find((v) => v.isActive);

  return (
    <div className="space-y-4">
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg text-emerald-500 text-xs font-semibold flex items-center gap-1.5">
          <Check size={14} /> Đã lưu version mới và kích hoạt.
        </div>
      )}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-rose-500 text-xs font-semibold flex items-center gap-1.5">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/70 text-xs font-semibold uppercase tracking-wide">
            Nội dung thỏa thuận {activeVersion ? `(đang active: v${activeVersion.version})` : ''}
          </span>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          className="w-full bg-black/30 border border-white/10 text-white text-xs font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400/60 resize-y"
          placeholder="Nội dung thỏa thuận... dùng {{commissionRate}} và {{revenueSharePercent}} để chèn tỷ lệ hiện hành"
        />
        <p className="text-white/40 text-[11px] mt-2">
          Dùng <code className="text-amber-400">{'{{commissionRate}}'}</code> và <code className="text-amber-400">{'{{revenueSharePercent}}'}</code> trong nội dung — hệ thống tự thay bằng tỷ lệ hiện hành khi hiển thị.
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Lưu (tạo version mới)
        </button>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3 text-white/70 text-xs font-semibold uppercase tracking-wide">
          <History className="w-3.5 h-3.5" /> Lịch sử version
        </div>
        {versions.length === 0 ? (
          <p className="text-white/40 text-sm py-4 text-center">Chưa có version nào.</p>
        ) : (
          <div className="space-y-2">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs font-semibold">v{v.version}</span>
                  {v.isActive && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                      Active
                    </span>
                  )}
                </div>
                <span className="text-white/40 text-xs">{new Date(v.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
