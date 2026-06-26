import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock3, Landmark, ReceiptText, RefreshCw, TrendingUp, Wallet2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { walletApi } from '../api/walletApi';
import {
  CreateWithdrawalRequest,
  DeveloperWalletSummaryResponse,
  ScreenType,
  TransactionResponse,
  WithdrawalResponse,
  WithdrawalStatus,
} from '../types';

const resolveCurrency = () => 'VND';

const formatMoney = (value?: number, currency?: string | null) => {
  if (value == null) return 'N/A';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency || resolveCurrency(),
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

export const WalletPage: React.FC<{ setCurrentScreen: (screen: ScreenType) => void }> = ({ setCurrentScreen }) => {
  const [walletSummary, setWalletSummary] = useState<DeveloperWalletSummaryResponse | null>(null);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalResponse[]>([]);
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadWalletSummary = async () => {
    setIsLoadingSummary(true);
    try {
      const response = await walletApi.getDeveloperWalletSummary();
      if (response.success && response.data) {
        setWalletSummary(response.data);
      }
    } catch (error) {
      console.error('Failed to load wallet summary', error);
    } finally {
      setIsLoadingSummary(false);
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
      const response = await walletApi.getDeveloperWithdrawals();
      if (response.success && response.data) {
        setWithdrawals(response.data);
      }
    } catch (error) {
      console.error('Failed to load withdrawals', error);
    }
  };

  useEffect(() => {
    loadWalletSummary();
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

    if (walletSummary && parsedAmount > Number(walletSummary.availableBalance)) {
      setFormError('Số tiền rút đang vượt quá số dư khả dụng.');
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
      const response = await walletApi.createDeveloperWithdrawal(payload);
      if (response.success) {
        setSuccessMessage(
          response.data?.transferReference
            ? `Yêu cầu rút tiền đã được gửi. Mã chuyển khoản: ${response.data.transferReference}.`
            : 'Yêu cầu rút tiền đã được gửi. Vui lòng chờ admin xử lý.'
        );
        setAmount('');
        setBankName('');
        setBankAccount('');
        setAccountHolder('');
        await Promise.all([loadWalletSummary(), loadWithdrawals()]);
      } else {
        setFormError(response.message || 'Không thể gửi yêu cầu rút tiền.');
      }
    } catch (error: any) {
      setFormError(error.response?.data?.message || error.message || 'Không thể gửi yêu cầu rút tiền.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const summaryCurrency = walletSummary?.currency || resolveCurrency();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => setCurrentScreen('dashboard')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white"
            >
              <ArrowLeft size={14} className="mr-1 inline-block" /> Quay lại Dashboard
            </button>
            <h1 className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white">Withdrawal Center</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Quản lý số dư khả dụng, theo dõi các yêu cầu đang chờ xử lý và gửi thông tin chuyển khoản cho admin bằng một flow rút tiền riêng biệt.
            </p>
          </div>
          <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={() => {
            loadWalletSummary();
            loadWithdrawals();
            loadTransactions();
          }}>
            Refresh
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-emerald-200/70 bg-emerald-50/80 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-600 dark:text-emerald-400">
                <Wallet2 size={18} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-700/70 dark:text-emerald-300/70">Available Balance</p>
                <p className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
                  {walletSummary ? formatMoney(Number(walletSummary.availableBalance), summaryCurrency) : 'Đang tải...'}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">Số dư có thể tạo yêu cầu rút ngay lúc này.</p>
          </div>

          <div className="rounded-3xl border border-sky-200/70 bg-sky-50/80 p-5 dark:border-sky-900/50 dark:bg-sky-950/20">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-500/15 p-3 text-sky-600 dark:text-sky-400">
                <Clock3 size={18} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-700/70 dark:text-sky-300/70">Pending Withdrawal</p>
                <p className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
                  {walletSummary ? formatMoney(Number(walletSummary.pendingBalance), summaryCurrency) : 'Đang tải...'}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">Bao gồm các request đang ở trạng thái pending hoặc processing.</p>
          </div>

          <div className="rounded-3xl border border-amber-200/70 bg-amber-50/80 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-500/15 p-3 text-amber-600 dark:text-amber-400">
                <TrendingUp size={18} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-700/70 dark:text-amber-300/70">Total Revenue</p>
                <p className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
                  {walletSummary ? formatMoney(Number(walletSummary.totalRevenue), summaryCurrency) : 'Đang tải...'}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
              Tính theo tổng doanh thu đã ghi nhận trong ví, chưa bao gồm phần reserve đang chờ rút.
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          {walletSummary
            ? `Wallet ledger: ${formatMoney(Number(walletSummary.walletBalance), summaryCurrency)} · Cập nhật lúc ${formatTimestamp(walletSummary.updatedAt?.toString())}`
            : isLoadingSummary
              ? 'Đang tải dữ liệu ví...'
              : 'Chưa có dữ liệu ví.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_0.7fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/70">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Withdrawal History</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Theo dõi trạng thái, số tiền và transfer reference của từng request.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                {withdrawals.length} requests
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-950/30 dark:text-slate-400">
                  <tr>
                    <th className="p-3">Status</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Reference</th>
                    <th className="p-3">Created</th>
                    <th className="p-3">Processed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700 dark:divide-slate-800 dark:text-slate-300">
                  {withdrawals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 dark:text-slate-500">Chưa có yêu cầu rút tiền nào.</td>
                    </tr>
                  ) : (
                    withdrawals.map((withdrawal) => {
                      const statusMeta = getStatusMeta(withdrawal.status);
                      return (
                        <tr key={withdrawal.id}>
                          <td className="p-3">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.className}`}>
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-amber-600">{formatMoney(Number(withdrawal.amount), withdrawal.currency ?? summaryCurrency)}</td>
                          <td className="p-3 font-mono text-xs text-slate-500 dark:text-slate-400">{withdrawal.transferReference || '—'}</td>
                          <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{formatTimestamp(withdrawal.createdAt?.toString())}</td>
                          <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{formatTimestamp(withdrawal.processedAt?.toString())}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/70">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Revenue Transactions</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Lịch sử ghi nhận doanh thu và các giao dịch của ví.</p>
              </div>
              <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={loadTransactions}>
                Refresh
              </Button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:bg-slate-950/30 dark:text-slate-400">
                  <tr>
                    <th className="p-3">Type</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Reference</th>
                    <th className="p-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700 dark:divide-slate-800 dark:text-slate-300">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 dark:text-slate-500">Không có giao dịch nào.</td>
                    </tr>
                  ) : (
                    transactions.map((txn) => (
                      <tr key={txn.id}>
                        <td className="p-3 font-semibold capitalize">{txn.type || 'n/a'}</td>
                        <td className={`p-3 font-medium ${Number(txn.amount) < 0 ? 'text-rose-500' : 'text-amber-600'}`}>
                          {formatMoney(Number(txn.amount), summaryCurrency)}
                        </td>
                        <td className="p-3 text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{txn.status || 'N/A'}</td>
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
                  onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 disabled:opacity-40 dark:border-slate-800 dark:text-slate-300"
                >
                  Trước
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-semibold text-slate-600 disabled:opacity-40 dark:border-slate-800 dark:text-slate-300"
                >
                  Sau
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/70">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-400/15 p-3 text-amber-500">
                <Landmark size={18} />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">Withdrawal Form</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Điền thông tin tài khoản nhận tiền để gửi request cho admin.</p>
              </div>
            </div>

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

            <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800/70 dark:bg-slate-900/70 dark:text-slate-300">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
                <ReceiptText size={14} className="text-amber-500" />
                <span className="font-semibold">Current limits</span>
              </div>
              <p className="mt-2">Minimum withdrawal: 10.000 VND</p>
              <p className="mt-1">Available to withdraw: {walletSummary ? formatMoney(Number(walletSummary.availableBalance), summaryCurrency) : 'Đang tải...'}</p>
              <p className="mt-1">Pending reserve: {walletSummary ? formatMoney(Number(walletSummary.pendingBalance), summaryCurrency) : 'Đang tải...'}</p>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <Input
                label="Amount (VND)"
                placeholder="100000"
                type="number"
                min={10000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <Input
                label="Bank Name"
                placeholder="TPBank / Vietcombank / BIDV..."
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
              />
              <Input
                label="Account Number"
                placeholder="0123456789"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                required
              />
              <Input
                label="Account Holder"
                placeholder="Nguyen Van A"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                required
              />
              <Button type="submit" variant="primary" size="md" className="w-full" disabled={isSubmitting || isLoadingSummary}>
                {isSubmitting ? 'Đang gửi...' : 'Submit Withdrawal Request'}
              </Button>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800/70 dark:bg-slate-950/70">
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">Workflow</h3>
            <ul className="mt-3 space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li>1. Developer gửi request với số tiền nhỏ hơn hoặc bằng Available Balance.</li>
              <li>2. Admin mở detail, chuyển trạng thái sang Processing và quét QR động.</li>
              <li>3. Chỉ khi admin Complete Transfer thì ví mới ghi nhận transaction rút tiền âm.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};
