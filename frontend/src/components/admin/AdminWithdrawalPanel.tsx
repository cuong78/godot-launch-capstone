import React, { useEffect, useState } from 'react';
import { Button } from '../Button';
import { RefreshCw, Check, X } from 'lucide-react';
import { walletApi } from '../../api/walletApi';
import { WithdrawalRequestResponse } from '../../types';

const formatMoney = (value?: number) => {
  if (value == null) return 'N/A';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
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

const getStatusBadge = (status: WithdrawalRequestResponse['status']) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-700 border border-amber-200';
    case 'approved':
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    case 'rejected':
      return 'bg-rose-100 text-rose-700 border border-rose-200';
    case 'completed':
      return 'bg-slate-100 text-slate-700 border border-slate-200';
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
};

export const AdminWithdrawalPanel: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequestResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadWithdrawals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await walletApi.getAllWithdrawals();
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

  const handleReview = async (requestId: string, approve: boolean) => {
    if (isProcessing) return;

    let rejectReason = '';
    if (!approve) {
      rejectReason = window.prompt('Vui lòng nhập lý do từ chối:')?.trim() || '';
      if (!rejectReason) {
        window.alert('Lý do từ chối là bắt buộc khi từ chối yêu cầu.');
        return;
      }
    }

    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await walletApi.reviewWithdrawal(requestId, { approve, rejectReason });
      if (response.success) {
        setSuccessMessage(`Yêu cầu đã được ${approve ? 'duyệt' : 'từ chối'} thành công.`);
        loadWithdrawals();
      } else {
        setError(response.message || 'Không thể xử lý yêu cầu.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Không thể xử lý yêu cầu.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display font-semibold text-slate-800 dark:text-slate-200 text-sm">Yêu cầu rút tiền</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Duyệt, từ chối và phản hồi các yêu cầu rút tiền của người dùng.
          </p>
        </div>
        <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={loadWithdrawals}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="overflow-x-auto rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800/70 dark:bg-slate-950/70">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-950/30 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-[0.16em] font-semibold font-display">
            <tr>
              <th className="p-3">Tài khoản</th>
              <th className="p-3">Số tiền</th>
              <th className="p-3">Ngân hàng</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Tạo</th>
              <th className="p-3">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500 dark:text-slate-400">Đang tải yêu cầu rút tiền...</td>
              </tr>
            ) : withdrawals.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400 dark:text-slate-500">Không có yêu cầu rút tiền.</td>
              </tr>
            ) : (
              withdrawals.map((request) => (
                <tr key={request.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="p-3">
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{request.userFullName || 'User'}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{request.userEmail}</div>
                  </td>
                  <td className="p-3 font-medium text-amber-700">{formatMoney(Number(request.amount))}</td>
                  <td className="p-3">
                    <div className="font-semibold">{request.bankName}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{request.bankAccount}</div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{formatTimestamp(request.createdAt?.toString())}</td>
                  <td className="p-3 space-x-2">
                    {request.status === 'pending' ? (
                      <>
                        <Button
                          variant="secondary-flat"
                          size="sm"
                          icon={<Check size={14} />}
                          onClick={() => handleReview(request.id, true)}
                          disabled={isProcessing}
                        >
                          Duyệt
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<X size={14} />}
                          onClick={() => handleReview(request.id, false)}
                          disabled={isProcessing}
                        >
                          Từ chối
                        </Button>
                      </>
                    ) : (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Đã xử lý</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
