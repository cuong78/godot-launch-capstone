import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, ShieldCheck, Scale, Ban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { disputeApi, DisputeResponse, ResolveDisputePayload } from '../../api/disputeApi';

const resolveLocale = (language?: string | null) => {
  const normalized = language?.toLowerCase().split('-')[0];

  if (normalized === 'en') return 'en-US';
  if (normalized === 'ja') return 'ja-JP';
  return 'vi-VN';
};

const STATUS_COLOR: Record<string, string> = {
  open: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  investigating: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  resolved_seller_fault: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  resolved_reporter_fault: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  resolved_inconclusive: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  cancelled: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

export default function AdminDisputePanel() {
  const { t, i18n } = useTranslation(['admin']);
  const locale = resolveLocale(i18n.resolvedLanguage || i18n.language);
  const [disputes, setDisputes] = useState<DisputeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DisputeResponse | null>(null);

  const formatDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;

    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(parsed);
  };

  const getStatusText = (status: string) =>
    t(`disputePanel.status.${status}`, {
      defaultValue: t('disputePanel.status.open'),
    });

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
    return (
      <div className="flex justify-center py-12">
        <Loader2
          className="w-6 h-6 animate-spin text-amber-400"
          aria-label={t('disputePanel.loading')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {disputes.length === 0 ? (
        <p className="text-white/40 text-sm py-8 text-center">{t('disputePanel.empty')}</p>
      ) : (
        <div className="space-y-2">
          {disputes.map((d) => {
            const statusColor = STATUS_COLOR[d.status] || STATUS_COLOR.open;
            return (
              <div key={d.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${statusColor}`}>{getStatusText(d.status)}</span>
                    <span className="text-white/40 text-xs">{formatDate(d.createdAt)}</span>
                  </div>
                  <p className="text-white text-sm font-medium truncate">
                    {d.gameTitle || d.marketplaceItemTitle || t('disputePanel.deletedProduct')}
                  </p>
                  <p className="text-white/50 text-xs mt-0.5">
                    <span className="text-rose-300">{d.reporterEmail}</span> {t('disputePanel.accuses')}{' '}
                    <span className="text-amber-300">{d.reportedSellerEmail}</span>
                  </p>
                  <p className="text-white/60 text-xs mt-1 line-clamp-2">{d.reason}</p>
                </div>
                {d.status === 'open' || d.status === 'investigating' ? (
                  <button
                    onClick={() => setSelected(d)}
                    className="shrink-0 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold px-3 py-2 rounded-lg"
                  >
                    {t('disputePanel.resolveCta')}
                  </button>
                ) : (
                  <span className="shrink-0 text-emerald-400 text-xs flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> {t('disputePanel.resolvedBadge')}
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
  const { t } = useTranslation(['admin']);
  const [resolution, setResolution] = useState<ResolveDisputePayload['resolution']>('resolved_inconclusive');
  const [note, setNote] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [banUser, setBanUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolutionOptions = useMemo(
    () =>
      ([
        {
          value: 'resolved_inconclusive' as const,
          label: t('disputePanel.resolution.inconclusive'),
        },
        {
          value: 'resolved_reporter_fault' as const,
          label: t('disputePanel.resolution.reporterFault'),
        },
        {
          value: 'resolved_seller_fault' as const,
          label: t('disputePanel.resolution.sellerFault'),
        },
      ]),
    [t],
  );

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
      else setError(res.message || t('disputePanel.resolveError'));
    } catch (err: any) {
      setError(err.response?.data?.message || t('disputePanel.resolveError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
        <h3 className="text-white font-semibold flex items-center gap-2"><Scale className="w-5 h-5 text-amber-400" /> {t('disputePanel.modal.title')}</h3>

        {dispute.evidenceRepoUrl && (
          <div className="text-xs text-white/60 bg-white/5 rounded-lg px-3 py-2">
            {t('disputePanel.modal.evidenceRepoLabel')}{' '}
            <a href={dispute.evidenceRepoUrl} target="_blank" rel="noreferrer" className="text-sky-400 underline">{dispute.evidenceRepoUrl}</a>
          </div>
        )}

        <div>
          <label className="text-white/60 text-xs mb-1.5 block">{t('disputePanel.modal.resolutionLabel')}</label>
          <div className="space-y-2">
            {resolutionOptions.map((option) => (
              <label key={option.value} className="flex items-start gap-2 text-xs text-white/80 cursor-pointer">
                <input type="radio" name="res" checked={resolution === option.value} onChange={() => setResolution(option.value)} className="mt-0.5" />
                {option.label}
              </label>
            ))}
          </div>
        </div>

        {resolution === 'resolved_seller_fault' && (
          <div>
            <label className="text-white/60 text-xs mb-1 block">{t('disputePanel.modal.refundAmountLabel')}</label>
            <input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-400/60"
            />
          </div>
        )}

        <div>
          <label className="text-white/60 text-xs mb-1 block">{t('disputePanel.modal.resolutionNoteLabel')}</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
            className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-400/60 resize-none" />
        </div>

        {(resolution === 'resolved_seller_fault' || resolution === 'resolved_reporter_fault') && (
          <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
            <input type="checkbox" checked={banUser} onChange={(e) => setBanUser(e.target.checked)} />
            <Ban className="w-3.5 h-3.5 text-rose-400" />
            {t('disputePanel.modal.banUser')}
          </label>
        )}

        {error && <div className="text-rose-400 text-xs bg-rose-400/10 rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 bg-white/5 border border-white/10 text-white/60 hover:text-white text-sm py-2.5 rounded-xl">{t('common.cancel')}</button>
          <button onClick={submit} disabled={submitting}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('disputePanel.modal.submitting')}</> : t('disputePanel.modal.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
