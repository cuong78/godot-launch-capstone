import React, { useEffect, useState } from 'react';
import { Button } from '../Button';
import { Eye, RefreshCw } from 'lucide-react';
import { walletApi } from '../../api/walletApi';
import { WithdrawalDetailResponse, WithdrawalResponse, WithdrawalStatus } from '../../types';
import { AdminWithdrawalDetailModal } from './AdminWithdrawalDetailModal';

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
      return { label: 'Approved', className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' };
    case 'processing':
      return { label: 'Processing', className: 'bg-sky-100 text-sky-700 border border-sky-200' };
    case 'completed':
      return { label: 'Completed', className: 'bg-emerald-100 text-emerald-700 border border-emerald-200' };
    case 'rejected':
      return { label: 'Rejected', className: 'bg-rose-100 text-rose-700 border border-rose-200' };
    case 'cancelled':
      return { label: 'Cancelled', className: 'bg-slate-100 text-slate-700 border border-slate-200' };
    default:
      return { label: status, className: 'bg-slate-100 text-slate-700 border border-slate-200' };
  }
};

export const AdminWithdrawalPanel: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalResponse[]>([]);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalDetailResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [completionRemark, setCompletionRemark] = useState('');
  const [rejectRemark, setRejectRemark] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | WithdrawalStatus>('all');

  const loadWithdrawals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await walletApi.getAdminWithdrawals();
      if (response.success && response.data) {
        setWithdrawals(response.data);
      } else {
        setError(response.message || 'Không thể tải danh sách rút tiền.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Không thể tải danh sách rút tiền.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWithdrawals();
  }, []);

  const filteredWithdrawals = withdrawals.filter((withdrawal) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch = !normalizedSearch
      || withdrawal.developerFullName?.toLowerCase().includes(normalizedSearch)
      || withdrawal.developerEmail?.toLowerCase().includes(normalizedSearch)
      || withdrawal.transferReference?.toLowerCase().includes(normalizedSearch)
      || withdrawal.bankName?.toLowerCase().includes(normalizedSearch);

    const matchesStatus = statusFilter === 'all' || withdrawal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openDetail = async (requestId: string) => {
    setIsBusy(true);
    setDetailError(null);
    setCompletionRemark('');
    setRejectRemark('');
    try {
      const response = await walletApi.getAdminWithdrawalDetail(requestId);
      if (response.success && response.data) {
        setSelectedWithdrawal(response.data);
        setCompletionRemark('');
        setIsModalOpen(true);
      } else {
        setDetailError(response.message || 'Không thể tải chi tiết yêu cầu rút tiền.');
      }
    } catch (err: any) {
      setDetailError(err.response?.data?.message || err.message || 'Không thể tải chi tiết yêu cầu rút tiền.');
    } finally {
      setIsBusy(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedWithdrawal(null);
    setDetailError(null);
    setCompletionRemark('');
    setRejectRemark('');
  };

  const syncAfterAction = async (detail?: WithdrawalDetailResponse | null, successText?: string) => {
    if (detail) {
      setSelectedWithdrawal(detail);
    }
    if (successText) {
      setSuccessMessage(successText);
    }
    await loadWithdrawals();
  };

  const handleApprove = async () => {
    if (!selectedWithdrawal) return;
    setIsBusy(true);
    setDetailError(null);
    try {
      const response = await walletApi.approveWithdrawal(selectedWithdrawal.id, {
        remark: completionRemark.trim() || undefined,
      });
      if (response.success) {
        await syncAfterAction(response.data, 'Withdrawal đã được approve thành công.');
      } else {
        setDetailError(response.message || 'Không thể approve withdrawal.');
      }
    } catch (err: any) {
      setDetailError(err.response?.data?.message || err.message || 'Không thể approve withdrawal.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal) return;
    if (!rejectRemark.trim()) {
      setDetailError('Vui lòng nhập lý do từ chối trước khi reject.');
      return;
    }

    setIsBusy(true);
    setDetailError(null);
    try {
      const response = await walletApi.rejectWithdrawal(selectedWithdrawal.id, {
        remark: rejectRemark.trim(),
      });
      if (response.success) {
        await syncAfterAction(response.data, 'Withdrawal đã được reject.');
      } else {
        setDetailError(response.message || 'Không thể reject withdrawal.');
      }
    } catch (err: any) {
      setDetailError(err.response?.data?.message || err.message || 'Không thể reject withdrawal.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white">Withdrawal Queue</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Xử lý hàng đợi rút tiền theo flow phase 1: pending, approve hoặc reject.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              {filteredWithdrawals.length} requests
            </span>
            <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={loadWithdrawals}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by developer, email, bank, or reference..."
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-studio focus:border-sky-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | WithdrawalStatus)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-studio focus:border-sky-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-950/30 dark:text-slate-400">
              <tr>
                <th className="p-4">Developer</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created Date</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700 dark:divide-slate-800 dark:text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-500 dark:text-slate-400">Đang tải withdrawal queue...</td>
                </tr>
              ) : filteredWithdrawals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-slate-400 dark:text-slate-500">Không có yêu cầu rút tiền nào khớp bộ lọc hiện tại.</td>
                </tr>
              ) : (
                filteredWithdrawals.map((withdrawal) => {
                  const statusMeta = getStatusMeta(withdrawal.status);
                  return (
                    <tr key={withdrawal.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/30">
                      <td className="p-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{withdrawal.developerFullName || 'Developer'}</div>
                        <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{withdrawal.developerEmail}</div>
                      </td>
                      <td className="p-4 font-semibold text-amber-600">{formatMoney(Number(withdrawal.amount), withdrawal.currency || 'VND')}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-500 dark:text-slate-400">{formatTimestamp(withdrawal.createdAt?.toString())}</td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Eye size={14} />}
                          onClick={() => openDetail(withdrawal.id)}
                          disabled={isBusy}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminWithdrawalDetailModal
        withdrawal={selectedWithdrawal}
        isBusy={isBusy}
        isOpen={isModalOpen}
        error={detailError}
        completionRemark={completionRemark}
        rejectRemark={rejectRemark}
        onCompletionRemarkChange={setCompletionRemark}
        onRejectRemarkChange={setRejectRemark}
        onClose={closeModal}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
};
