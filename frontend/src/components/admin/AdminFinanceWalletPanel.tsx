import React, { useCallback, useEffect, useState } from "react";
import {
  Landmark,
  ReceiptText,
  ShieldCheck,
  Wallet2,
} from "lucide-react";
import { walletApi } from "../../api/walletApi";
import {
  PayoutBalanceResponse,
  TransactionResponse,
  WalletResponse,
} from "../../types";

const resolveLocale = () => {
  if (typeof navigator === "undefined" || !navigator.language) {
    return "vi-VN";
  }

  return navigator.language;
};

const formatMoney = (
  value?: number | null,
  currency?: string | null,
  locale = "vi-VN",
) => {
  if (value == null) {
    return "N/A";
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatTimestamp = (value?: string | null, locale = "vi-VN") => {
  if (!value) {
    return "N/A";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

const formatTransactionType = (value?: string | null) => {
  if (!value) {
    return "N/A";
  }

  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

const maskAccountNumber = (value?: string | null) => {
  if (!value) {
    return "Not connected";
  }

  const normalized = value.trim();
  if (normalized.length <= 4) {
    return normalized;
  }

  return `•••• ${normalized.slice(-4)}`;
};

const getPayoutStatusMeta = (status?: string | null) => {
  const normalized = status?.toLowerCase();

  if (normalized === "active" || normalized === "enabled") {
    return {
      badgeClass:
        "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
      label: status,
    };
  }

  if (normalized === "pending" || normalized === "processing") {
    return {
      badgeClass:
        "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
      label: status,
    };
  }

  return {
    badgeClass:
      "border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300",
    label: status || "Unknown",
  };
};

interface AdminFinanceWalletPanelProps {
  payoutBalance: PayoutBalanceResponse | null;
  payoutBalanceError: string | null;
  isLoadingPayoutBalance: boolean;
  onRefreshPayoutBalance: () => Promise<void> | void;
  onRefreshStateChange?: (state: {
    refresh: () => Promise<void>;
    isRefreshing: boolean;
    isLoadingPrimary: boolean;
    isLoadingSecondary?: boolean;
  }) => void;
}

export const AdminFinanceWalletPanel: React.FC<
  AdminFinanceWalletPanelProps
> = ({
  payoutBalance,
  payoutBalanceError,
  isLoadingPayoutBalance,
  onRefreshPayoutBalance,
  onRefreshStateChange,
}) => {
  const locale = resolveLocale();
  const [walletInfo, setWalletInfo] = useState<WalletResponse | null>(null);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [transactionsError, setTransactionsError] = useState<string | null>(
    null,
  );
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadWalletInfo = useCallback(async () => {
    setIsLoadingWallet(true);
    setWalletError(null);
    try {
      const response = await walletApi.getMyWallet();
      if (!response.success || !response.data) {
        throw new Error(response.message || "Failed to load platform wallet.");
      }

      setWalletInfo(response.data);
    } catch (err: any) {
      setWalletError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load platform wallet.",
      );
    } finally {
      setIsLoadingWallet(false);
    }
  }, []);

  const loadTransactions = useCallback(async (targetPage = page) => {
    setIsLoadingTransactions(true);
    setTransactionsError(null);
    try {
      const response = await walletApi.getMyTransactions(targetPage, 10);
      if (!response.success || !response.data) {
        throw new Error(
          response.message || "Failed to load wallet transactions.",
        );
      }

      setTransactions(response.data.content);
      setTotalPages(response.data.totalPages || 1);
    } catch (err: any) {
      setTransactionsError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load wallet transactions.",
      );
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [page]);

  useEffect(() => {
    void loadWalletInfo();
  }, [loadWalletInfo]);

  useEffect(() => {
    void loadTransactions(page);
  }, [loadTransactions, page]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        loadWalletInfo(),
        loadTransactions(page),
        Promise.resolve(onRefreshPayoutBalance()),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadTransactions, loadWalletInfo, onRefreshPayoutBalance, page]);

  useEffect(() => {
    onRefreshStateChange?.({
      refresh: handleRefresh,
      isRefreshing,
      isLoadingPrimary: isLoadingWallet || isLoadingTransactions,
      isLoadingSecondary: isLoadingPayoutBalance,
    });
  }, [
    handleRefresh,
    isRefreshing,
    isLoadingWallet,
    isLoadingTransactions,
    isLoadingPayoutBalance,
    onRefreshStateChange,
  ]);

  const payoutStatusMeta = getPayoutStatusMeta(payoutBalance?.status);
  const platformWalletBalance = walletInfo
    ? formatMoney(walletInfo.balance, walletInfo.currency, locale)
    : isLoadingWallet
      ? "Loading..."
      : "N/A";
  const payoutBalanceDisplay = isLoadingPayoutBalance
    ? "Loading..."
    : payoutBalance
      ? formatMoney(payoutBalance.balance, payoutBalance.currency, locale)
      : "N/A";

  return (
    <div className="space-y-5">
      {(walletError || payoutBalanceError || transactionsError) && (
        <div className="space-y-3">
          {walletError && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-300">
              {walletError}
            </div>
          )}
          {payoutBalanceError && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-300">
              {payoutBalanceError}
            </div>
          )}
          {transactionsError && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-300">
              {transactionsError}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/80 p-5 shadow-[0_14px_30px_rgba(16,185,129,0.08)] dark:border-emerald-500/20 dark:bg-emerald-500/8 dark:shadow-none">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-500/12 p-3 text-emerald-600 dark:text-emerald-400">
              <Wallet2 size={18} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-700/70 dark:text-emerald-300/70">
                Platform Ledger
              </p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white">
                {platformWalletBalance}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
            Internal wallet used for marketplace commission and finance ops
            visibility.
          </p>
        </div>

        <div className="rounded-[24px] border border-sky-200 bg-sky-50/80 p-5 shadow-[0_14px_30px_rgba(14,165,233,0.08)] dark:border-sky-500/20 dark:bg-sky-500/8 dark:shadow-none">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-sky-500/12 p-3 text-sky-600 dark:text-sky-400">
              <Landmark size={18} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-700/70 dark:text-sky-300/70">
                PayOS Payout Balance
              </p>
              <p className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white">
                {payoutBalanceDisplay}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
            Synced from the payout account used for operational withdrawals.
          </p>
        </div>

        <div className="rounded-[24px] border border-amber-200 bg-amber-50/80 p-5 shadow-[0_14px_30px_rgba(245,158,11,0.08)] dark:border-amber-500/20 dark:bg-amber-500/8 dark:shadow-none">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-amber-500/12 p-3 text-amber-600 dark:text-amber-400">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-700/70 dark:text-amber-300/70">
                  Payout Account
                </p>
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${payoutStatusMeta.badgeClass}`}
                >
                  {payoutStatusMeta.label}
                </span>
              </div>
              <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">
                {payoutBalance?.accountName || "Not connected"}
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {maskAccountNumber(payoutBalance?.accountNumber)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
            Banking identity used when admin processes store payout operations.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-200/90 bg-white/95 shadow-[0_18px_44px_rgba(148,163,184,0.14)] backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70 dark:shadow-none">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between dark:border-slate-800">
          <div>
            <h4 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Platform Transaction Ledger
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Review admin wallet movements and trace references before opening
              payment or withdrawal operations.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
            <ReceiptText size={12} />
            Page {page + 1} / {Math.max(totalPages, 1)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-950/60">
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 font-semibold">Reference</th>
                <th className="p-4 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingTransactions ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    Loading wallet transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    No admin wallet transactions are available right now.
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    className="border-t border-slate-200/80 dark:border-slate-800/80"
                  >
                    <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                      {formatTransactionType(transaction.type)}
                    </td>
                    <td
                      className={`p-4 font-semibold ${
                        Number(transaction.amount) < 0
                          ? "text-rose-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {formatMoney(
                        Number(transaction.amount),
                        walletInfo?.currency,
                        locale,
                      )}
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {transaction.referenceId || "—"}
                    </td>
                    <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                      {formatTimestamp(transaction.createdAt, locale)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
          <span>Keep this view finance-only for admin operational review.</span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 0}
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-[0_8px_18px_rgba(148,163,184,0.08)] transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:shadow-none dark:hover:border-slate-500"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() =>
                setPage((prev) => Math.min(Math.max(totalPages - 1, 0), prev + 1))
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-[0_8px_18px_rgba(148,163,184,0.08)] transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:shadow-none dark:hover:border-slate-500"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
