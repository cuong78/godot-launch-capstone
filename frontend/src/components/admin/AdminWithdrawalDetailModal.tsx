import React from 'react';
import { AlertTriangle, Copy, Landmark, QrCode, UserRound, Wallet2, X } from 'lucide-react';
import { Button } from '../Button';
import { WithdrawalDetailResponse, WithdrawalStatus } from '../../types';

interface AdminWithdrawalDetailModalProps {
  withdrawal: WithdrawalDetailResponse | null;
  isBusy: boolean;
  isOpen: boolean;
  error?: string | null;
  completionRemark: string;
  rejectRemark: string;
  onCompletionRemarkChange: (value: string) => void;
  onRejectRemarkChange: (value: string) => void;
  onClose: () => void;
  onApprove: () => void;
  onSyncStatus: () => void;
  onReject: () => void;
}

const formatMoney = (value?: number, currency = 'VND') => {
  if (value == null) return 'N/A';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const getStatusMeta = (status: WithdrawalStatus) => {
  switch (status) {
    case 'pending':
      return { label: 'Pending', className: 'bg-amber-100 text-amber-700 border border-amber-200' };
    case 'approved':
      return { label: 'Approved / Waiting Payout', className: 'bg-violet-100 text-violet-700 border border-violet-200' };
    case 'processing':
      return { label: 'Payout Processing', className: 'bg-sky-100 text-sky-700 border border-sky-200' };
    case 'completed':
      return { label: 'Completed', className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' };
    case 'failed':
      return { label: 'Payout Failed', className: 'bg-rose-100 text-rose-700 border border-rose-200' };
    case 'rejected':
      return { label: 'Rejected', className: 'bg-rose-100 text-rose-700 border border-rose-200' };
    case 'cancelled':
      return { label: 'Cancelled', className: 'bg-slate-100 text-slate-700 border border-slate-200' };
    default:
      return { label: status, className: 'bg-slate-100 text-slate-700 border border-slate-200' };
  }
};

const copyToClipboard = async (value?: string | null) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch (error) {
    console.error('Failed to copy text', error);
  }
};

export const AdminWithdrawalDetailModal: React.FC<AdminWithdrawalDetailModalProps> = ({
  withdrawal,
  isBusy,
  isOpen,
  error,
  completionRemark,
  rejectRemark,
  onCompletionRemarkChange,
  onRejectRemarkChange,
  onClose,
  onApprove,
  onSyncStatus,
  onReject,
}) => {
  if (!isOpen || !withdrawal) {
    return null;
  }

  const statusMeta = getStatusMeta(withdrawal.status);
  const canCreatePayout = withdrawal.status === 'pending' || (withdrawal.status === 'approved' && !withdrawal.payosPayoutId);
  const canSyncStatus = withdrawal.status === 'processing' || (withdrawal.status === 'approved' && !!withdrawal.payosPayoutId);
  const canReject = withdrawal.status === 'pending' || withdrawal.status === 'approved' || withdrawal.status === 'processing';
  const currency = withdrawal.currency || 'VND';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-5 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Withdrawal Detail</p>
            <h3 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
              {withdrawal.developerFullName || withdrawal.developerEmail}
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
                {statusMeta.label}
              </span>
              <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{withdrawal.transferReference}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 p-2 text-slate-500 transition hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-[0.92fr_0.7fr]">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <section className="rounded-3xl border border-slate-200/80 bg-slate-50/90 p-5 dark:border-slate-800/70 dark:bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-slate-900/5 p-3 text-slate-700 dark:bg-white/5 dark:text-slate-200">
                    <UserRound size={18} />
                  </div>
                  <h4 className="font-display text-lg font-bold text-slate-900 dark:text-white">Developer Information</h4>
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Full Name</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white">{withdrawal.developerFullName || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Email</dt>
                    <dd className="font-mono text-xs text-slate-700 dark:text-slate-300">{withdrawal.developerEmail || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Created</dt>
                    <dd className="font-medium text-slate-800 dark:text-slate-200">{formatTimestamp(withdrawal.createdAt)}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-3xl border border-slate-200/80 bg-slate-50/90 p-5 dark:border-slate-800/70 dark:bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-amber-400/15 p-3 text-amber-600 dark:text-amber-400">
                    <Wallet2 size={18} />
                  </div>
                  <h4 className="font-display text-lg font-bold text-slate-900 dark:text-white">Wallet Information</h4>
                </div>
                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Wallet Balance</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white">{formatMoney(withdrawal.walletBalance, currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Available Balance</dt>
                    <dd className="font-semibold text-emerald-600 dark:text-emerald-400">{formatMoney(withdrawal.availableBalance, currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Pending Withdrawal</dt>
                    <dd className="font-semibold text-sky-600 dark:text-sky-400">{formatMoney(withdrawal.pendingBalance, currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Total Revenue</dt>
                    <dd className="font-semibold text-amber-600 dark:text-amber-400">{formatMoney(withdrawal.totalRevenue, currency)}</dd>
                  </div>
                </dl>
              </section>
            </div>

            <section className="rounded-3xl border border-slate-200/80 bg-white p-5 dark:border-slate-800/70 dark:bg-slate-950/70">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-sky-500/15 p-3 text-sky-600 dark:text-sky-400">
                  <Landmark size={18} />
                </div>
                <h4 className="font-display text-lg font-bold text-slate-900 dark:text-white">Bank Information</h4>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Bank Name</p>
                  <p className="mt-2 font-semibold text-slate-900 dark:text-white">{withdrawal.bankName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Account Holder</p>
                  <p className="mt-2 font-semibold text-slate-900 dark:text-white">{withdrawal.accountHolder}</p>
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Account Number</p>
                      <p className="mt-2 font-mono text-sm text-slate-900 dark:text-white">{withdrawal.bankAccount}</p>
                    </div>
                    <Button variant="ghost" size="sm" icon={<Copy size={14} />} onClick={() => copyToClipboard(withdrawal.bankAccount)}>
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Transfer Reference</p>
                      <p className="mt-2 font-mono text-sm text-slate-900 dark:text-white">{withdrawal.transferReference || 'N/A'}</p>
                    </div>
                    <Button variant="ghost" size="sm" icon={<Copy size={14} />} onClick={() => copyToClipboard(withdrawal.transferReference)}>
                      Copy
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Withdrawal Amount</p>
                  <p className="mt-2 font-display text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {formatMoney(withdrawal.amount, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Processed By</p>
                  <p className="mt-2 font-semibold text-slate-900 dark:text-white">{withdrawal.processedByFullName || 'Chưa có'}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatTimestamp(withdrawal.processedAt)}</p>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200/80 bg-white p-5 dark:border-slate-800/70 dark:bg-slate-950/70">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-600 dark:text-emerald-400">
                  <QrCode size={18} />
                </div>
                <h4 className="font-display text-lg font-bold text-slate-900 dark:text-white">Dynamic QR</h4>
              </div>
              <div className="mt-5 rounded-3xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800/70 dark:bg-slate-900/60">
                <img
                  src={withdrawal.preferredQrImageUrl || withdrawal.standardQrImageUrl}
                  alt="Withdrawal QR"
                  className="mx-auto h-72 w-72 rounded-2xl object-contain"
                />
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                QR được dựng từ bank info, amount và transfer reference. Sau khi tạo payout order, admin cần sync PayOS status để biết tiền đã chuyển thành công hay vẫn đang xử lý.
              </p>
            </section>

            <section className="rounded-3xl border border-slate-200/80 bg-white p-5 dark:border-slate-800/70 dark:bg-slate-950/70">
              <h4 className="font-display text-lg font-bold text-slate-900 dark:text-white">Actions</h4>

              {error && (
                <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {(withdrawal.payosPayoutId || withdrawal.payosStatus) && (
                <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 text-sm dark:border-slate-800/70 dark:bg-slate-900/60">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">PayOS Payout ID</p>
                      <p className="mt-1 font-mono text-xs text-slate-800 dark:text-slate-200">{withdrawal.payosPayoutId || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">PayOS Status</p>
                      <p className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{withdrawal.payosStatus || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {canCreatePayout && (
                <div className="mt-4">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Approval Note
                  </label>
                  <textarea
                    value={completionRemark}
                    onChange={(event) => onCompletionRemarkChange(event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-amber-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="Ghi chú nội bộ cho lần xử lý chuyển khoản này..."
                  />
                </div>
              )}

              {canReject && (
                <div className="mt-4">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Reject Remark
                  </label>
                  <textarea
                    value={rejectRemark}
                    onChange={(event) => onRejectRemarkChange(event.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-rose-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    placeholder="Nhập lý do từ chối nếu thông tin ngân hàng hoặc amount có vấn đề..."
                  />
                </div>
              )}

              {(withdrawal.remark || withdrawal.status === 'rejected') && (
                <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800/70 dark:bg-slate-900/60 dark:text-slate-300">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                    <AlertTriangle size={14} className="text-amber-500" />
                    <span className="font-semibold">Stored Remark</span>
                  </div>
                  <p className="mt-2">{withdrawal.remark || 'Không có ghi chú.'}</p>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                {canCreatePayout && (
                  <Button variant="primary" size="sm" onClick={onApprove} disabled={isBusy}>
                    Create Payout Order
                  </Button>
                )}
                {canSyncStatus && (
                  <Button variant="secondary-flat" size="sm" onClick={onSyncStatus} disabled={isBusy}>
                    Sync PayOS Status
                  </Button>
                )}
                {canReject && (
                  <Button variant="ghost" size="sm" onClick={onReject} disabled={isBusy}>
                    Reject Request
                  </Button>
                )}
                {!canCreatePayout && !canSyncStatus && !canReject && (
                  <span className="text-sm text-slate-500 dark:text-slate-400">Withdrawal này đã ở trạng thái cuối và không thể chỉnh sửa thêm.</span>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
