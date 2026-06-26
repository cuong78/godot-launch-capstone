import React, { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { walletApi } from '../api/walletApi';
import {
  ScreenType,
  TransactionResponse,
  WalletResponse,
  WithdrawalRequestResponse,
  CreateWithdrawalRequest,
} from '../types';

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

export const WalletPage: React.FC<{ setCurrentScreen: (screen: ScreenType) => void }> = ({ setCurrentScreen }) => {
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequestResponse[]>([]);
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadWallet = async () => {
    setIsLoading(true);
    try {
      const response = await walletApi.getMyWallet();
      if (response.success && response.data) {
        setWallet(response.data);
      }
    } catch (error) {
      console.error('Failed to load wallet', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await walletApi.getMyTransactions(page, 10);
      if (response.success && response.data) {
        setTransactions(response.data.content);
        setTotalPages(response.data.totalPages);
      }
    } catch (error) {
      console.error('Failed to load transactions', error);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const response = await walletApi.getMyWithdrawals();
      if (response.success && response.data) {
        setWithdrawals(response.data);
      }
    } catch (error) {
      console.error('Failed to load withdrawals', error);
    }
  };

  useEffect(() => {
    loadWallet();
    loadWithdrawals();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [page]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Vui lòng nhập số tiền rút hợp lệ.');
      return;
    }

    const payload: CreateWithdrawalRequest = {
      amount: parsedAmount,
      bankName: bankName.trim(),
      bankAccount: bankAccount.trim(),
      accountHolder: accountHolder.trim(),
    };

    if (!payload.bankName || !payload.bankAccount || !payload.accountHolder) {
      setFormError('Vui lòng điền đầy đủ thông tin ngân hàng.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await walletApi.createWithdrawal(payload);
      if (response.success) {
        setSuccessMessage('Yêu cầu rút tiền đã được gửi. Vui lòng chờ admin duyệt.');
        setAmount('');
        setBankName('');
        setBankAccount('');
        setAccountHolder('');
        loadWithdrawals();
        loadWallet();
      } else {
        setFormError(response.message || 'Không thể gửi yêu cầu rút tiền.');
      }
    } catch (error: any) {
      setFormError(error.response?.data?.message || error.message || 'Không thể gửi yêu cầu rút tiền.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <button
            type="button"
            onClick={() => setCurrentScreen('dashboard')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft size={14} className="inline-block mr-1" /> Quay lại Dashboard
          </button>
          <h1 className="mt-2 text-3xl font-display font-bold text-slate-900 dark:text-white">Ví của tôi</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Quản lý số dư, lịch sử giao dịch và gửi yêu cầu rút tiền.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/70">
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400 font-semibold">Số dư hiện tại</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
              {wallet ? formatMoney(Number(wallet.balance)) : 'Đang tải...'}
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Cập nhật lúc {wallet ? formatTimestamp(wallet.updatedAt?.toString()) : '...'}</p>
          </div>
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/70">
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400 font-semibold">Số lượng yêu cầu</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{withdrawals.length}</p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Bao gồm chờ duyệt, đã duyệt và từ chối</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_0.7fr] gap-6">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/70">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Lịch sử giao dịch</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Các giao dịch mới nhất từ ví của bạn.</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={<RefreshCw size={14} />}
                onClick={loadTransactions}
              >
                Refresh
              </Button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-950/30 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-[0.16em] font-semibold font-display">
                  <tr>
                    <th className="p-3">Loại giao dịch</th>
                    <th className="p-3">Số tiền</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3">Tham chiếu</th>
                    <th className="p-3">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 dark:text-slate-500">Không có giao dịch nào.</td>
                    </tr>
                  ) : (
                    transactions.map((txn) => (
                      <tr key={txn.id}>
                        <td className="p-3 font-semibold capitalize">{txn.type || 'n/a'}</td>
                        <td className="p-3 font-medium text-amber-600">{formatMoney(Number(txn.amount))}</td>
                        <td className="p-3 uppercase text-xs tracking-[0.12em] text-slate-500 dark:text-slate-400">{txn.status || 'N/A'}</td>
                        <td className="p-3 font-mono text-xs text-slate-500 dark:text-slate-400">{txn.referenceId || '—'}</td>
                        <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{formatTimestamp(txn.createdAt?.toString())}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Trang {page + 1} / {totalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage(prev => Math.max(0, prev - 1))}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40"
                >
                  Trước
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/70">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Yêu cầu rút tiền</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Theo dõi trạng thái yêu cầu và xem chi tiết.</p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-950/30 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-[0.16em] font-semibold font-display">
                  <tr>
                    <th className="p-3">Số tiền</th>
                    <th className="p-3">Ngân hàng</th>
                    <th className="p-3">Tài khoản</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3">Ngày tạo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300">
                  {withdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 dark:text-slate-500">Chưa có yêu cầu rút tiền nào.</td>
                    </tr>
                  ) : (
                    withdrawals.map((request) => (
                      <tr key={request.id}>
                        <td className="p-3 font-medium text-amber-600">{formatMoney(Number(request.amount))}</td>
                        <td className="p-3">{request.bankName}</td>
                        <td className="p-3 font-mono text-xs">{request.bankAccount}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{formatTimestamp(request.createdAt?.toString())}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/70">
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Gửi yêu cầu rút tiền</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Số tiền tối thiểu là 10.000 VND.</p>

            {formError && (
              <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
                {formError}
              </div>
            )}
            {successMessage && (
              <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            )}

            <form className="space-y-4 mt-6" onSubmit={handleSubmit}>
              <Input
                label="Số tiền (VND)"
                placeholder="10000"
                type="number"
                min={10000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <Input
                label="Ngân hàng"
                placeholder="Vietcombank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
              />
              <Input
                label="Số tài khoản"
                placeholder="0123456789"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                required
              />
              <Input
                label="Chủ tài khoản"
                placeholder="Nguyễn Văn A"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                required
              />
              <Button type="submit" variant="primary" size="md" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu rút tiền'}
              </Button>
            </form>

            <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800/70 dark:bg-slate-900/70 dark:text-slate-300">
              <p className="font-semibold">Lưu ý</p>
              <ul className="mt-2 space-y-2 list-disc list-inside">
                <li>Số tiền rút sẽ được xử lý sau khi admin duyệt.</li>
                <li>Yêu cầu bị từ chối sẽ được hoàn lại vào ví.</li>
                <li>Vui lòng kiểm tra thông tin tài khoản ngân hàng trước khi gửi.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/70">
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">Hướng dẫn</h3>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Các yêu cầu rút tiền sẽ xuất hiện trong trang Admin để duyệt và xử lý.</p>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Vui lòng chỉ gửi thông tin ngân hàng chính xác.</p>
          </div>
        </aside>
      </div>
    </div>
  );
};
