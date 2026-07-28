import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { disputeApi } from '../api/disputeApi';

interface Props {
  // 1 trong 2: sản phẩm bị tố
  gameId?: string;
  marketplaceItemId?: string;
  productTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ReportDisputeModal({ gameId, marketplaceItemId, productTitle, onClose, onSuccess }: Props) {
  const { t } = useTranslation(['shared']);
  const [reason, setReason] = useState('');
  const [evidenceRepoUrl, setEvidenceRepoUrl] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError(t('reportDispute.errorReasonRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await disputeApi.create({
        gameId,
        marketplaceItemId,
        reason: reason.trim(),
        evidenceRepoUrl: evidenceRepoUrl.trim() || undefined,
        evidenceNote: evidenceNote.trim() || undefined,
      });
      if (res.success) {
        setDone(true);
        setTimeout(() => { onSuccess?.(); onClose(); }, 1800);
      } else {
        setError(res.message || t('reportDispute.errorSubmitFailed'));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || t('reportDispute.errorSubmitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <h2 className="text-white font-semibold text-sm">{t('reportDispute.title')}</h2>
          </div>
          {!submitting && (
            <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <p className="text-white font-semibold">{t('reportDispute.doneTitle')}</p>
              <p className="text-white/50 text-sm">{t('reportDispute.doneDescription')}</p>
            </div>
          ) : (
            <>
              <div className="bg-rose-400/10 border border-rose-400/20 rounded-xl px-4 py-3 text-xs text-rose-300">
                {t('reportDispute.reportingProduct')} <strong>{productTitle}</strong>. {t('reportDispute.falseReportWarning')}
              </div>

              <div>
                <label className="text-white/60 text-xs mb-1 block">{t('reportDispute.reasonLabel')}</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder={t('reportDispute.reasonPlaceholder')}
                  className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-rose-400/60 resize-none"
                />
              </div>

              <div>
                <label className="text-white/60 text-xs mb-1 block">{t('reportDispute.repoLabel')}</label>
                <input
                  type="text"
                  value={evidenceRepoUrl}
                  onChange={(e) => setEvidenceRepoUrl(e.target.value)}
                  placeholder={t('reportDispute.repoPlaceholder')}
                  className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-rose-400/60"
                />
              </div>

              <div>
                <label className="text-white/60 text-xs mb-1 block">{t('reportDispute.noteLabel')}</label>
                <textarea
                  value={evidenceNote}
                  onChange={(e) => setEvidenceNote(e.target.value)}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-rose-400/60 resize-none"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-400/10 rounded-xl px-4 py-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting || !reason.trim()}
                className="w-full bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('reportDispute.submitting')}</> : t('reportDispute.submit')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
