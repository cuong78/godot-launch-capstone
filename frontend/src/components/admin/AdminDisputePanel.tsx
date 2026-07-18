import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, ShieldCheck, Scale, Ban } from 'lucide-react';
import { disputeApi, DisputeResponse, ResolveDisputePayload } from '../../api/disputeApi';

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  open: { text: 'Mới', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  investigating: { text: 'Đang điều tra', color: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  resolved_seller_fault: { text: 'Seller vi phạm', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  resolved_reporter_fault: { text: 'Vu cáo', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  resolved_inconclusive: { text: 'Không kết luận', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  cancelled: { text: 'Đã hủy', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
};

export default function AdminDisputePanel() {
  const [disputes, setDisputes] = useState<DisputeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DisputeResponse | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await disputeApi.getAll();
      if (res.success && res.data) setDisputes(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400" /></div>;
  }

  return (
    <div className="space-y-4">
      {disputes.length === 0 ? (
        <p className="text-white/40 text-sm py-8 text-center">Chưa có khiếu nại nào.</p>
      ) : (
        <div className="space-y-2">
          {disputes.map((d) => {
            const st = STATUS_LABEL[d.status] || STATUS_LABEL.open;
            return (
              <div key={d.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${st.color}`}>{st.text}</span>
                    <span className="text-white/40 text-xs">{new Date(d.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-white text-sm font-medium truncate">
                    {d.gameTitle || d.marketplaceItemTitle || '(sản phẩm đã xóa)'}
                  </p>
                  <p className="text-white/50 text-xs mt-0.5">
                    <span className="text-rose-300">{d.reporterEmail}</span> tố{' '}
                    <span className="text-amber-300">{d.reportedSellerEmail}</span>
                  </p>
                  <p className="text-white/60 text-xs mt-1 line-clamp-2">{d.reason}</p>
                </div>
                {d.status === 'open' || d.status === 'investigating' ? (
                  <button
                    onClick={() => setSelected(d)}
                    className="shrink-0 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold px-3 py-2 rounded-lg"
                  >
                    Phán xử
                  </button>
                ) : (
                  <span className="shrink-0 text-emerald-400 text-xs flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Đã xử lý
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <ResolveModal
          dispute={selected}
          onClose={() => setSelected(null)}
          onResolved={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}

function ResolveModal({ dispute, onClose, onResolved }: {
  dispute: DisputeResponse;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [resolution, setResolution] = useState<ResolveDisputePayload['resolution']>('resolved_inconclusive');
  const [note, setNote] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [banUser, setBanUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await disputeApi.resolve(dispute.id, {
        resolution,
        resolutionNote: note.trim() || undefined,
        refundAmount: resolution === 'resolved_seller_fault' && refundAmount ? Number(refundAmount) : undefined,
        banUser,
      });
      if (res.success) onResolved();
      else setError(res.message || 'Phán xử thất bại.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Phán xử thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2"><Scale className="w-5 h-5 text-amber-400" /> Phán xử khiếu nại</h3>

        {dispute.evidenceRepoUrl && (
          <div className="text-xs text-white/60 bg-white/5 rounded-lg px-3 py-2">
            Repo bằng chứng của reporter: <a href={dispute.evidenceRepoUrl} target="_blank" className="text-sky-400 underline">{dispute.evidenceRepoUrl}</a>
          </div>
        )}

        <div>
          <label className="text-white/60 text-xs mb-1.5 block">Kết luận</label>
          <div className="space-y-2">
            {([
              ['resolved_inconclusive', 'TH1: Không đủ căn cứ → khôi phục sản phẩm, không phạt'],
              ['resolved_reporter_fault', 'TH2: Reporter vu cáo → khôi phục + trừ điểm reporter'],
              ['resolved_seller_fault', 'TH3: Seller đạo nhái → buộc hoàn tiền 5 ngày + ban'],
            ] as const).map(([val, label]) => (
              <label key={val} className="flex items-start gap-2 text-xs text-white/80 cursor-pointer">
                <input type="radio" name="res" checked={resolution === val} onChange={() => setResolution(val)} className="mt-0.5" />
                {label}
              </label>
            ))}
          </div>
        </div>

        {resolution === 'resolved_seller_fault' && (
          <div>
            <label className="text-white/60 text-xs mb-1 block">Số tiền seller phải hoàn</label>
            <input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-400/60"
            />
          </div>
        )}

        <div>
          <label className="text-white/60 text-xs mb-1 block">Ghi chú kết luận</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
            className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-400/60 resize-none" />
        </div>

        {(resolution === 'resolved_seller_fault' || resolution === 'resolved_reporter_fault') && (
          <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
            <input type="checkbox" checked={banUser} onChange={(e) => setBanUser(e.target.checked)} />
            <Ban className="w-3.5 h-3.5 text-rose-400" />
            Ban tài khoản (lưu FaceID + CCCD vào blacklist, chặn đăng ký lại)
          </label>
        )}

        {error && <div className="text-rose-400 text-xs bg-rose-400/10 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 bg-white/5 border border-white/10 text-white/60 hover:text-white text-sm py-2.5 rounded-xl">Hủy</button>
          <button onClick={submit} disabled={submitting}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</> : 'Xác nhận phán xử'}
          </button>
        </div>
      </div>
    </div>
  );
}
