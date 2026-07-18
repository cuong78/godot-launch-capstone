import React, { useEffect, useState } from 'react';
import {
  Bot, ShieldAlert, CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  Code2, ImageIcon, FileText, Eye, DollarSign, Percent, Tags,
} from 'lucide-react';
import { aiReviewApi } from '../../api/aiReviewApi';
import { AiReviewReport, AiRecommendation } from '../../types';

interface Props {
  gameId?: string;
  itemId?: string;
}

/**
 * Card hiển thị AI review report (ĐỀ XUẤT). Admin xem điểm + flags + bằng chứng,
 * rồi tự quyết định duyệt/từ chối — AI KHÔNG phán quyết.
 */
const AiReviewReportCard: React.FC<Props> = ({ gameId, itemId }) => {
  const [report, setReport] = useState<AiReviewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerSuccessMsg, setTriggerSuccessMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = gameId
        ? await aiReviewApi.getLatestForGame(gameId)
        : itemId
          ? await aiReviewApi.getLatestForItem(itemId)
          : null;
      if (res && res.success) {
        setReport(res.data);
      } else {
        setError(res?.message || 'Không tải được báo cáo AI');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Lỗi tải báo cáo AI');
    } finally {
      setLoading(false);
    }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    setTriggerSuccessMsg(null);
    try {
      const res = gameId
        ? await aiReviewApi.triggerGameReview(gameId)
        : itemId
          ? await aiReviewApi.triggerItemReview(itemId)
          : null;
      if (res && res.success) {
        setTriggerSuccessMsg('Đang chạy AI Review trong nền. Hãy đợi khoảng 15 giây rồi bấm nút Tải lại ở trên.');
        setTimeout(() => {
          load();
        }, 15000);
      } else {
        setError(res?.message || 'Không thể kích hoạt AI Review');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Lỗi kích hoạt AI Review');
    } finally {
      setTriggering(false);
    }
  };

  useEffect(() => {
    if (gameId || itemId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, itemId]);

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-950/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] uppercase font-mono tracking-wider text-indigo-500 font-bold flex items-center gap-1.5">
          <Bot size={14} /> AI Review — đề xuất (admin quyết định cuối)
        </h4>
        <div className="flex items-center gap-2">
          {report && (
            <button
              onClick={handleTrigger}
              disabled={triggering}
              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50 cursor-pointer flex items-center gap-1"
              title="Chạy lại phân tích AI"
            >
              {triggering ? <RefreshCw className="animate-spin" size={10} /> : <Bot size={10} />} Re-run AI
            </button>
          )}
          <button
            onClick={load}
            className="p-1 text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
            title="Tải lại"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 text-xs py-3">
          <RefreshCw className="animate-spin" size={14} /> Đang tải báo cáo AI...
        </div>
      ) : error ? (
        <div className="text-xs text-rose-500 font-medium py-2">{error}</div>
      ) : !report ? (
        <div className="text-xs text-slate-500 dark:text-slate-400 py-2 space-y-3">
          <p>
            Chưa có báo cáo AI cho mục này (AI review chạy nền sau khi submit).
          </p>
          {triggerSuccessMsg ? (
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs border border-emerald-500/20 font-medium">
              {triggerSuccessMsg}
            </div>
          ) : (
            <button
              onClick={handleTrigger}
              disabled={triggering}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 dark:disabled:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer transition-all duration-200 active:scale-95 flex items-center gap-1.5 shadow-sm shadow-indigo-600/20"
            >
              {triggering ? (
                <>
                  <RefreshCw className="animate-spin" size={12} /> Đang yêu cầu...
                </>
              ) : (
                <>
                  <Bot size={14} /> Chạy AI Review Ngay
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <>
          {triggerSuccessMsg && (
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs border border-emerald-500/20 font-medium">
              {triggerSuccessMsg}
            </div>
          )}
          <RecommendationBadge value={report.overallRecommendation} nsfw={report.nsfwFlag} />

          {/* Điểm từng tiêu chí */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <ScoreChip label="Chất lượng code" icon={<Code2 size={12} />} value={report.codeQualityScore} />
            <ScoreChip label="Media khớp" icon={<ImageIcon size={12} />} value={report.mediaMatchScore} />
            <ScoreChip label="Mô tả đúng" icon={<FileText size={12} />} value={report.descriptionMatchScore} />
            <ScoreChip label="Tags phù hợp" icon={<Tags size={12} />} value={report.tagsMatchScore} />
            <NsfwChip flag={report.nsfwFlag} />
          </div>

          {/* Khuyến nghị giá (nếu AI có gợi ý) */}
          {(report.suggestedPrice != null || report.suggestedRevenueSplit != null) && (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-2.5 space-y-1.5">
              <span className="text-[10px] uppercase font-mono tracking-wider text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                <DollarSign size={12} /> Khuyến nghị giá (AI đề xuất)
              </span>
              <div className="flex flex-wrap items-center gap-3">
                {report.suggestedPrice != null && (
                  <span className="inline-flex items-center gap-1 text-sm font-display font-bold text-amber-600 dark:text-amber-400">
                    <DollarSign size={14} />
                    {report.suggestedPrice === 0 ? 'Miễn phí' : `$${report.suggestedPrice}`}
                  </span>
                )}
                {report.suggestedRevenueSplit != null && (
                  <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-600 dark:text-slate-300">
                    <Percent size={12} /> Chia DT cho dev: {report.suggestedRevenueSplit}%
                  </span>
                )}
              </div>
              {report.pricingRationale && (
                <p className="text-[11px] text-slate-600 dark:text-slate-300 italic break-words">
                  {report.pricingRationale}
                </p>
              )}
            </div>
          )}

          {/* Flags + bằng chứng */}
          {report.flags && report.flags.length > 0 ? (
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 font-bold">
                Cảnh báo ({report.flags.length})
              </span>
              {report.flags.map((f, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 p-2 rounded-lg text-[11px] border ${severityClass(f.severity)}`}
                >
                  <span className="shrink-0 mt-0.5">{severityIcon(f.severity)}</span>
                  <div className="min-w-0">
                    <span className="font-bold font-mono">{f.type}</span>
                    {typeof f.evidenceIndex === 'number' && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-[9px] font-mono opacity-80">
                        <Eye size={9} /> ảnh #{f.evidenceIndex}
                      </span>
                    )}
                    <p className="opacity-90 break-words">{f.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 size={13} /> Không có cảnh báo nào
            </div>
          )}

          {/* Tóm tắt DeepSeek nếu có */}
          {(() => {
            const summary = (report.rawOutput as any)?.code?.deepseek?.summary;
            if (summary) {
              return (
                <div className="text-[11px] text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-950/30 p-2 rounded border border-slate-200/60 dark:border-slate-800/60">
                  <span className="font-bold">Tóm tắt AI: </span>{summary}
                </div>
              );
            }
            return null;
          })()}

          <p className="text-[9px] text-slate-400 dark:text-slate-500 italic">
            * AI chỉ đưa đề xuất — quyết định duyệt/từ chối thuộc về admin.
          </p>
        </>
      )}
    </div>
  );
};

// ── sub components ──────────────────────────────────────────────

const RecommendationBadge: React.FC<{ value: AiRecommendation; nsfw: boolean }> = ({ value }) => {
  const map: Record<AiRecommendation, { label: string; cls: string; icon: React.ReactNode }> = {
    approve: {
      label: 'ĐỀ XUẤT: DUYỆT', icon: <CheckCircle2 size={14} />,
      cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    },
    review: {
      label: 'ĐỀ XUẤT: CẦN XEM KỸ', icon: <AlertTriangle size={14} />,
      cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
    },
    reject: {
      label: 'ĐỀ XUẤT: TỪ CHỐI', icon: <XCircle size={14} />,
      cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
    },
  };
  const m = map[value] || map.review;
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold ${m.cls}`}>
      {m.icon} {m.label}
    </div>
  );
};

const ScoreChip: React.FC<{ label: string; icon: React.ReactNode; value?: number | null }> = ({ label, icon, value }) => {
  const has = typeof value === 'number';
  const color = !has ? 'text-slate-400' : value! >= 70 ? 'text-emerald-500' : value! >= 40 ? 'text-amber-500' : 'text-rose-500';
  return (
    <div className="p-2 rounded-lg bg-white/60 dark:bg-slate-950/30 border border-slate-200/60 dark:border-slate-800/60">
      <div className="flex items-center gap-1 text-[9px] uppercase font-mono text-slate-500 font-bold">{icon} {label}</div>
      <div className={`text-lg font-display font-bold ${color}`}>
        {has ? value : '—'}{has && <span className="text-[10px] opacity-60">/100</span>}
      </div>
    </div>
  );
};

const NsfwChip: React.FC<{ flag: boolean }> = ({ flag }) => (
  <div className={`p-2 rounded-lg border ${flag ? 'bg-rose-500/10 border-rose-500/30' : 'bg-white/60 dark:bg-slate-950/30 border-slate-200/60 dark:border-slate-800/60'}`}>
    <div className="flex items-center gap-1 text-[9px] uppercase font-mono text-slate-500 font-bold">
      <ShieldAlert size={12} /> NSFW
    </div>
    <div className={`text-sm font-display font-bold ${flag ? 'text-rose-500' : 'text-emerald-500'}`}>
      {flag ? 'Phát hiện' : 'An toàn'}
    </div>
  </div>
);

function severityClass(sev: string): string {
  if (sev === 'high') return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25';
  if (sev === 'medium') return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25';
  return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
}

function severityIcon(sev: string): React.ReactNode {
  if (sev === 'high') return <XCircle size={13} />;
  if (sev === 'medium') return <AlertTriangle size={13} />;
  return <AlertTriangle size={13} />;
}

export default AiReviewReportCard;
