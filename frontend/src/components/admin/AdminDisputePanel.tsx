import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2, ShieldCheck, Scale, Ban, BadgeDollarSign, HelpCircle, Sparkles, Bot } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredDisputes = useMemo(() => {
    if (statusFilter === 'all') return disputes;
    return disputes.filter((d) => d.status === statusFilter);
  }, [disputes, statusFilter]);
  const [selected, setSelected] = useState<DisputeResponse | null>(null);
  const [confirmingRefundId, setConfirmingRefundId] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);

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

  const handleConfirmRefund = async (disputeId: string) => {
    setConfirmingRefundId(disputeId);
    setRefundError(null);
    try {
      const res = await disputeApi.confirmRefund(disputeId);
      if (res.success) {
        await load();
      } else {
        setRefundError(res.message || t('disputePanel.confirmRefundError'));
      }
    } catch (err: any) {
      setRefundError(err.response?.data?.message || t('disputePanel.confirmRefundError'));
    } finally {
      setConfirmingRefundId(null);
    }
  };

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
      {refundError && (
        <div className="rounded-lg bg-rose-400/10 px-3 py-2 text-xs text-rose-400">{refundError}</div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        {[
          { key: 'all', label: t('disputePanel.filter.all', { defaultValue: 'Tất cả' }) },
          { key: 'open', label: t('disputePanel.filter.open', { defaultValue: 'Chờ xử lý' }) },
          { key: 'resolved_seller_fault', label: t('disputePanel.filter.sellerFault', { defaultValue: 'Lỗi thuộc về Seller' }) },
          { key: 'resolved_reporter_fault', label: t('disputePanel.filter.reporterFault', { defaultValue: 'Lỗi thuộc về Reporter' }) },
          { key: 'resolved_inconclusive', label: t('disputePanel.filter.inconclusive', { defaultValue: 'Không đủ căn cứ' }) },
        ].map((tab) => {
          const isActive = statusFilter === tab.key;
          const count = tab.key === 'all' ? disputes.length : disputes.filter(d => d.status === tab.key).length;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all cursor-pointer border ${
                isActive
                  ? 'bg-amber-500 text-black border-amber-500 shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600 dark:bg-white/5 dark:hover:bg-white/10 dark:border-slate-800 dark:text-[#a0aec0]'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${isActive ? 'bg-black/10 text-black' : 'bg-slate-250 dark:bg-white/10 text-slate-500 dark:text-slate-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filteredDisputes.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500 dark:text-white/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-white/[0.02]">{t('disputePanel.emptyFiltered', { defaultValue: 'Không có khiếu nại nào thuộc trạng thái này.' })}</p>
      ) : (
        <div className="space-y-2">
          {filteredDisputes.map((d) => {
            const statusColor = STATUS_COLOR[d.status] || STATUS_COLOR.open;
            const awaitingRefund = d.status === 'resolved_seller_fault' && !d.refundConfirmedAt;
            return (
              <div key={d.id} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/5 dark:shadow-none">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${statusColor}`}>{getStatusText(d.status)}</span>
                    {awaitingRefund && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-orange-500/15 text-orange-400 border-orange-500/30">
                        {t('disputePanel.refundPendingBadge')}
                      </span>
                    )}
                    {d.status === 'resolved_seller_fault' && d.refundConfirmedAt && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                        {t('disputePanel.refundConfirmedBadge')}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 dark:text-white/40">{formatDate(d.createdAt)}</span>
                  </div>
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {d.gameTitle || d.marketplaceItemTitle || t('disputePanel.deletedProduct')}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-white/50">
                    <span className="text-rose-300">{d.reporterEmail}</span> {t('disputePanel.accuses')}{' '}
                    <span className="text-amber-300">{d.reportedSellerEmail}</span>
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-white/60">{d.reason}</p>
                </div>
                {d.status === 'open' || d.status === 'investigating' ? (
                  <button
                    onClick={() => setSelected(d)}
                    className="shrink-0 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold px-3 py-2 rounded-lg"
                  >
                    {t('disputePanel.resolveCta')}
                  </button>
                ) : awaitingRefund ? (
                  <button
                    onClick={() => handleConfirmRefund(d.id)}
                    disabled={confirmingRefundId === d.id}
                    className="shrink-0 flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50"
                  >
                    {confirmingRefundId === d.id ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('disputePanel.confirmRefundConfirming')}</>
                    ) : (
                      <><BadgeDollarSign className="w-3.5 h-3.5" /> {t('disputePanel.confirmRefundCta')}</>
                    )}
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
  const [banUser, setBanUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const parseBoldText = (lineText: string) => {
    const parts = lineText.split('**');
    return parts.map((part, index) => {
      const cleanPart = part.replace(/\*/g, '');
      if (index % 2 === 1) {
        return <strong key={index} className="font-extrabold text-slate-900 dark:text-white">{cleanPart}</strong>;
      }
      return cleanPart;
    });
  };

  const stripBulletsAndSeparators = (lineText: string) => {
    return lineText.replace(/^[•\s\-\*]+/, '');
  };

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      const withoutBullets = trimmed.replace(/^[•\s\-\*]+/, '');

      // Check for section dividers (-- or --- or bullet leading --)
      if (trimmed === '--' || trimmed === '---' || trimmed.startsWith('---') || withoutBullets === '--' || withoutBullets === '---') {
        return <hr key={idx} className="my-3.5 border-slate-200 dark:border-slate-800/60" />;
      }

      if (trimmed.startsWith('###')) {
        return <h5 key={idx} className="text-xs font-bold text-slate-900 dark:text-white mt-3 mb-1">{parseBoldText(stripBulletsAndSeparators(trimmed.replace(/^###\s*/, '')))}</h5>;
      }
      if (trimmed.startsWith('##')) {
        return <h4 key={idx} className="text-sm font-bold text-slate-900 dark:text-white mt-4 mb-1.5 border-b border-slate-100 dark:border-slate-800 pb-1">{parseBoldText(stripBulletsAndSeparators(trimmed.replace(/^##\s*/, '')))}</h4>;
      }
      if (trimmed.startsWith('#')) {
        return <h3 key={idx} className="text-base font-bold text-slate-900 dark:text-white mt-4 mb-2">{parseBoldText(stripBulletsAndSeparators(trimmed.replace(/^#\s*/, '')))}</h3>;
      }

      // Check for list items (starts with -, *, or •)
      if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
        const content = stripBulletsAndSeparators(trimmed);
        if (!content) return null;
        return (
          <div key={idx} className="flex items-start gap-1.5 ml-2 my-1 text-xs text-slate-600 dark:text-slate-300">
            <span className="text-amber-500 mt-1.5 text-[8px]">•</span>
            <span>{parseBoldText(content)}</span>
          </div>
        );
      }

      // Default paragraph (clean up remaining raw asterisks)
      return <p key={idx} className="text-xs text-slate-600 dark:text-slate-300 my-1 leading-relaxed whitespace-pre-wrap">{parseBoldText(line)}</p>;
    });
  };

  const runAiAnalysis = async () => {
    setLoadingAi(true);
    setError(null);
    try {
      const res = await disputeApi.getAiAnalysis(dispute.id);
      if (res.success && res.data) {
        setAiReport(res.data);
      } else {
        setError(res.message || 'Lỗi khi chạy trợ lý AI.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Lỗi kết nối AI.');
    } finally {
      setLoadingAi(false);
    }
  };
  
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

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className={`dark-depth-card w-full transition-all duration-300 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#0c121e] ${aiReport ? 'max-w-4xl' : 'max-w-lg'}`}>
        
        <div className={aiReport ? 'grid grid-cols-1 md:grid-cols-2 gap-6 items-start' : 'space-y-5'}>
          {/* AI Report Section (Left Panel) */}
          {aiReport && (
            <div className="space-y-4 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800/80 pb-4 md:pb-0 md:pr-6 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-2 text-indigo-500 border-b border-slate-100 dark:border-slate-800 pb-2">
                <Bot className="w-5 h-5" />
                <span className="font-bold text-sm">🤖 Trợ lý AI Phán xử </span>
              </div>
              <div className="bg-slate-50/50 dark:bg-[#080d16] border border-slate-100 dark:border-slate-800/60 rounded-xl p-4 space-y-2">
                {renderMarkdown(aiReport)}
              </div>
            </div>
          )}

          {/* Form Section (Right Panel or Main Panel) */}
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="rounded-lg bg-amber-500/10 p-2 text-amber-500 dark:bg-amber-500/15">
                  <Scale className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-display font-bold text-slate-900 dark:text-[#f4f7fb]">
                    {t('disputePanel.modal.title')}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    ID: {dispute.id}
                  </p>
                </div>
              </div>
              {!aiReport && (
                <button
                  type="button"
                  onClick={runAiAnalysis}
                  disabled={loadingAi}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-[11px] font-bold px-3 py-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-md shadow-indigo-500/10 hover:shadow-indigo-400/20"
                >
                  {loadingAi ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('disputePanel.modal.aiLoading', { defaultValue: 'AI đang phân tích...' })}</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> {t('disputePanel.modal.aiBtn', { defaultValue: 'Trợ lý AI' })}</>
                  )}
                </button>
              )}
            </div>

            {/* Evidence Link */}
            {dispute.evidenceRepoUrl && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs text-slate-600 dark:border-slate-800/60 dark:bg-slate-900/40 dark:text-slate-300">
                <span className="font-semibold block text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-1">
                  {t('disputePanel.modal.evidenceRepoLabel')}
                </span>
                <a 
                  href={dispute.evidenceRepoUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-sky-500 hover:text-sky-400 font-medium break-all hover:underline"
                >
                  {dispute.evidenceRepoUrl}
                </a>
              </div>
            )}

            {/* Resolution Radio Cards */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase font-mono tracking-wider text-slate-500">
                {t('disputePanel.modal.resolutionLabel')}
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {resolutionOptions.map((option) => {
                  const isActive = resolution === option.value;
                  let icon = <HelpCircle className="w-4 h-4" />;
                  let activeClass = 'border-slate-500 bg-slate-50 dark:bg-slate-900/40 text-slate-900 dark:text-white';
                  let hoverClass = 'hover:border-slate-350 dark:hover:border-slate-700';
                  
                  if (option.value === 'resolved_seller_fault') {
                    icon = <BadgeDollarSign className="w-4 h-4" />;
                    activeClass = 'border-rose-500/80 bg-rose-500/[0.03] dark:bg-rose-950/10 text-rose-600 dark:text-rose-400';
                    hoverClass = 'hover:border-rose-300 dark:hover:border-rose-900/60';
                  } else if (option.value === 'resolved_reporter_fault') {
                    icon = <Ban className="w-4 h-4" />;
                    activeClass = 'border-purple-500/80 bg-purple-500/[0.03] dark:bg-purple-950/10 text-purple-600 dark:text-purple-400';
                    hoverClass = 'hover:border-purple-300 dark:hover:border-purple-900/60';
                  }
                  
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setResolution(option.value)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                        isActive
                          ? `border-2 ${activeClass} shadow-sm font-semibold`
                          : 'border-slate-200 dark:border-slate-800 bg-transparent text-slate-700 dark:text-[#a0aec0] ' + hoverClass
                      }`}
                    >
                      <span className={`rounded-lg p-1.5 ${isActive ? 'bg-current/10' : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500'}`}>
                        {icon}
                      </span>
                      <span className="text-xs font-semibold">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>



            {/* Note Field */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase font-mono tracking-wider text-slate-500">
                {t('disputePanel.modal.resolutionNoteLabel')}
              </label>
              <textarea 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                rows={3}
                placeholder="..."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/10 resize-none dark:border-slate-800 dark:bg-[#0e1525] dark:text-[#f4f7fb]" 
              />
            </div>

            {/* Ban Action checkbox */}
            {(resolution === 'resolved_seller_fault' || resolution === 'resolved_reporter_fault') && (
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200/60 p-3 text-xs text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800/80 dark:text-[#a0aec0] dark:hover:bg-slate-900/30">
                <input 
                  type="checkbox" 
                  checked={banUser} 
                  onChange={(e) => setBanUser(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500/20"
                />
                <Ban className="w-4 h-4 text-rose-500" />
                <span className="font-semibold text-rose-500 dark:text-rose-400">
                  {t('disputePanel.modal.banUser')}
                </span>
              </label>
            )}

            {/* Error alert */}
            {error && (
              <div className="text-rose-500 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2.5 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={onClose} 
                className="flex-1 rounded-xl border border-slate-200 bg-slate-100/50 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/50 hover:text-slate-950 dark:border-slate-800 dark:bg-[#0e1525] dark:text-slate-400 dark:hover:text-white cursor-pointer transition-all"
              >
                {t('common.cancel')}
              </button>
              <button 
                type="button"
                onClick={submit} 
                disabled={submitting}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/10 hover:shadow-amber-400/20 transition-all"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t('disputePanel.modal.submitting')}</>
                ) : (
                  t('disputePanel.modal.submit')
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
