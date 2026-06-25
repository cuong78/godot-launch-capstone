import React from 'react';
import { ArrowLeft, CheckCircle2, Clock3, Download, Landmark, Receipt, RefreshCw, ShieldAlert, UploadCloud, XCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { PaymentResponse, ScreenType, UploadReceiptRequest, User } from '../types';
import PAYMENT_QR_IMAGE from '../../assets/payment-qr-tpbank.jpg';

interface PaymentDetailPageProps {
  payments: PaymentResponse[];
  selectedOrderId: string | null;
  setSelectedOrderId: (orderId: string) => void;
  currentUser: User | null;
  isRefreshing: boolean;
  isUploadingReceipt: boolean;
  onBackToMarketplace: () => void;
  onRefreshPayments: () => void;
  onUploadReceipt: (paymentId: string, data: UploadReceiptRequest) => Promise<void>;
  setCurrentScreen: (screen: ScreenType) => void;
}

const MANUAL_BANK_INFO = {
  bankName: 'TPBank',
  accountName: 'NGUYEN ANH TU',
  accountNumber: '0000 0199 480',
  note: 'Scan this QR code to transfer directly to the account above, then upload your receipt for admin verification.',
};

const formatMoney = (amount: number) =>
  amount === 0
    ? 'FREE'
    : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const formatTimestamp = (value?: string | null) => {
  if (!value) {
    return 'Not available';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const getStatusMeta = (status: PaymentResponse['paymentStatus']) => {
  switch (status) {
    case 'PAID':
      return {
        label: 'Paid',
        badgeClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        icon: <CheckCircle2 size={14} />,
      };
    case 'WAITING_VERIFICATION':
      return {
        label: 'Waiting Verification',
        badgeClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        icon: <Clock3 size={14} />,
      };
    case 'REJECTED':
      return {
        label: 'Rejected',
        badgeClass: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        icon: <XCircle size={14} />,
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        badgeClass: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
        icon: <XCircle size={14} />,
      };
    case 'PENDING':
    default:
      return {
        label: 'Pending Transfer',
        badgeClass: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
        icon: <Receipt size={14} />,
      };
  }
};

export const PaymentDetailPage: React.FC<PaymentDetailPageProps> = ({
  payments,
  selectedOrderId,
  setSelectedOrderId,
  currentUser,
  isRefreshing,
  isUploadingReceipt,
  onBackToMarketplace,
  onRefreshPayments,
  onUploadReceipt,
  setCurrentScreen,
}) => {
  const activePayment = React.useMemo(() => {
    if (payments.length === 0) {
      return null;
    }

    if (selectedOrderId) {
      return payments.find((payment) => payment.orderId === selectedOrderId) || payments[0];
    }

    return payments[0];
  }, [payments, selectedOrderId]);

  const [payerName, setPayerName] = React.useState(currentUser?.fullName || currentUser?.username || '');
  const [payerBank, setPayerBank] = React.useState('');
  const [transferReference, setTransferReference] = React.useState('');
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null);

  React.useEffect(() => {
    if (!activePayment) {
      return;
    }

    setPayerName(activePayment.payerName || currentUser?.fullName || currentUser?.username || '');
    setPayerBank(activePayment.payerBank || '');
    setTransferReference(activePayment.transferReference || '');
    setReceiptFile(null);
  }, [activePayment, currentUser?.fullName, currentUser?.username]);

  const totalAmount = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const handleReceiptSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activePayment || !receiptFile) {
      return;
    }

    await onUploadReceipt(activePayment.id, {
      payerName,
      payerBank,
      transferReference,
      receiptFile,
    });
  };

  if (!activePayment) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-gradient-to-r from-sky-600/10 via-amber-400/5 to-slate-900 border border-slate-250 dark:border-slate-800 p-6 rounded-2xl">
          <h1 className="font-display font-bold text-2xl text-slate-850 dark:text-white">Payment Detail</h1>
          <p className="mt-2 text-xs text-slate-550 dark:text-slate-400">
            No payment order is being tracked yet.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={onBackToMarketplace}>
          Return to Marketplace
        </Button>
      </div>
    );
  }

  const statusMeta = getStatusMeta(activePayment.paymentStatus);
  const canUploadReceipt = activePayment.paymentStatus === 'PENDING' || activePayment.paymentStatus === 'REJECTED';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-sky-600/10 via-amber-400/5 to-slate-900 border border-slate-250 dark:border-slate-800 p-6 rounded-2xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <button
            type="button"
            onClick={onBackToMarketplace}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-studio"
          >
            <ArrowLeft size={14} /> Back to Marketplace
          </button>
          <h1 className="mt-3 font-display font-bold text-2xl text-slate-850 dark:text-white">
            Payment Detail
          </h1>
          <p className="mt-1 text-xs text-slate-550 dark:text-slate-400">
            Track manual transfer payments, upload receipts, and unlock downloads after admin approval.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 dark:border-slate-800/80 dark:bg-slate-950/40">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Tracked orders</p>
            <p className="mt-1 font-display text-xl font-bold text-slate-850 dark:text-white">{payments.length}</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-400/10 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-500 font-mono">Total transfer</p>
            <p className="mt-1 font-display text-xl font-bold text-slate-850 dark:text-white">{formatMoney(totalAmount)}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
            onClick={onRefreshPayments}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.4fr] gap-6">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
            <h2 className="font-display text-lg font-bold text-slate-850 dark:text-white">Orders in This Payment Session</h2>
            <div className="mt-4 space-y-3">
              {payments.map((payment) => {
                const meta = getStatusMeta(payment.paymentStatus);
                const isActive = payment.orderId === activePayment.orderId;

                return (
                  <button
                    key={payment.orderId}
                    type="button"
                    onClick={() => setSelectedOrderId(payment.orderId)}
                    className={`w-full rounded-2xl border p-4 text-left transition-studio ${
                      isActive
                        ? 'border-amber-400/60 bg-amber-400/10 shadow-sm'
                        : 'border-slate-200/80 bg-slate-50/70 hover:border-sky-500/30 dark:border-slate-800/80 dark:bg-slate-950/45'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-sm font-bold text-slate-850 dark:text-white truncate">
                          {payment.marketplaceItemTitle}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          Order {payment.orderId.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${meta.badgeClass}`}>
                        {meta.icon}
                        {meta.label}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">{payment.marketplaceItemType === 'source_code' ? 'Source Code' : 'Asset'}</span>
                      <span className="font-semibold text-amber-500">{formatMoney(payment.amount)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-xl font-bold text-slate-850 dark:text-white">{activePayment.marketplaceItemTitle}</h2>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${statusMeta.badgeClass}`}>
                    {statusMeta.icon}
                    {statusMeta.label}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Created {formatTimestamp(activePayment.createdAt)} by {activePayment.buyerFullName}
                </p>
              </div>

              {activePayment.downloadUrl && activePayment.paymentStatus === 'PAID' && (
                <a
                  href={activePayment.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_0_0_#0f8a5f] transition-studio hover:bg-emerald-400 hover:translate-y-[1px] active:translate-y-[3px] active:shadow-none"
                >
                  <Download size={15} /> Download Package
                </a>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Transfer Amount</p>
                <p className="mt-2 font-display text-lg font-bold text-amber-500">{formatMoney(activePayment.amount)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Reference</p>
                <p className="mt-2 font-display text-sm font-bold text-slate-850 dark:text-white">{activePayment.transferReference}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Seller</p>
                <p className="mt-2 text-sm font-semibold text-slate-850 dark:text-white">{activePayment.sellerFullName}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Order Type</p>
                <p className="mt-2 text-sm font-semibold text-slate-850 dark:text-white">
                  {activePayment.marketplaceItemType === 'source_code' ? 'Source Code' : 'Asset'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3 text-sky-500">
                  <Landmark size={18} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-850 dark:text-white">Bank Transfer Instructions</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Use the exact transfer reference so admins can match your receipt faster.</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Bank Name</p>
                  <p className="mt-2 text-sm font-semibold text-slate-850 dark:text-white">{MANUAL_BANK_INFO.bankName}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Account Name</p>
                  <p className="mt-2 text-sm font-semibold text-slate-850 dark:text-white">{MANUAL_BANK_INFO.accountName}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45 sm:col-span-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Account Number</p>
                  <p className="mt-2 font-display text-lg font-bold text-slate-850 dark:text-white">{MANUAL_BANK_INFO.accountNumber}</p>
                </div>
                <div className="rounded-2xl border border-dashed border-slate-250 bg-gradient-to-br from-slate-50 to-slate-100 p-4 dark:border-slate-800 dark:from-slate-950/55 dark:to-slate-900/40 sm:col-span-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Transfer QR Code</p>
                  <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 p-3 dark:border-slate-800/80 dark:bg-slate-950/70">
                    <img
                      src={PAYMENT_QR_IMAGE}
                      alt="TPBank transfer QR code"
                      className="mx-auto max-h-[32rem] w-full max-w-sm rounded-xl object-contain"
                    />
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{MANUAL_BANK_INFO.note}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-amber-500/20 bg-amber-400/10 p-3 text-amber-500">
                  <UploadCloud size={18} />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-850 dark:text-white">Receipt Submission</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Upload a screenshot or PDF of your bank transfer receipt.</p>
                </div>
              </div>

              {activePayment.paymentStatus === 'REJECTED' && activePayment.rejectionReason && (
                <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-400">
                  <div className="flex items-start gap-2">
                    <ShieldAlert size={15} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">Receipt was rejected</p>
                      <p className="mt-1 leading-relaxed">{activePayment.rejectionReason}</p>
                    </div>
                  </div>
                </div>
              )}

              {activePayment.receiptUrl && (
                <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Current Receipt</p>
                  <a
                    href={activePayment.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800"
                  >
                    <img
                      src={activePayment.receiptUrl}
                      alt="Payment receipt"
                      className="max-h-56 w-full object-cover bg-slate-100 dark:bg-slate-950"
                    />
                  </a>
                </div>
              )}

              <form onSubmit={handleReceiptSubmit} className="mt-5 space-y-4">
                <Input
                  label="Payer Name"
                  value={payerName}
                  onChange={(event) => setPayerName(event.target.value)}
                  placeholder="Enter the account holder name"
                  disabled={!canUploadReceipt || isUploadingReceipt}
                  required
                />
                <Input
                  label="Payer Bank"
                  value={payerBank}
                  onChange={(event) => setPayerBank(event.target.value)}
                  placeholder="Enter the sending bank"
                  disabled={!canUploadReceipt || isUploadingReceipt}
                  required
                />
                <Input
                  label="Transfer Reference"
                  value={transferReference}
                  onChange={(event) => setTransferReference(event.target.value)}
                  helperText="Keep the generated code unchanged unless your bank requires a stricter note."
                  disabled={!canUploadReceipt || isUploadingReceipt}
                  required
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold font-display text-slate-800 dark:text-slate-200">
                    Receipt File
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(event) => setReceiptFile(event.target.files?.[0] || null)}
                    disabled={!canUploadReceipt || isUploadingReceipt}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-studio file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:file:bg-slate-800"
                  />
                  {receiptFile && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">Selected file: {receiptFile.name}</span>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  icon={<UploadCloud size={16} />}
                  type="submit"
                  disabled={!canUploadReceipt || isUploadingReceipt || !receiptFile}
                >
                  {isUploadingReceipt ? 'Submitting Receipt...' : 'Submit Receipt'}
                </Button>
              </form>

              {!canUploadReceipt && (
                <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs leading-relaxed text-slate-500 dark:border-slate-800/80 dark:bg-slate-950/45 dark:text-slate-400">
                  {activePayment.paymentStatus === 'WAITING_VERIFICATION' && 'Your receipt has been submitted. Please wait for admin verification.'}
                  {activePayment.paymentStatus === 'PAID' && 'Payment approved. Download is now enabled for this order.'}
                  {activePayment.paymentStatus === 'CANCELLED' && 'This payment was cancelled and can no longer accept receipts.'}
                </div>
              )}
            </div>
          </div>

          {activePayment.downloadUrl && activePayment.paymentStatus === 'PAID' && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-850 dark:text-white">Download Unlocked</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Your order is paid. You can now download the package or continue browsing the marketplace.
                  </p>
                </div>
                <div className="flex gap-3">
                  <a
                    href={activePayment.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_0_0_#0f8a5f] transition-studio hover:bg-emerald-400 hover:translate-y-[1px] active:translate-y-[3px] active:shadow-none"
                  >
                    <Download size={15} /> Download Now
                  </a>
                  <Button variant="ghost" size="md" onClick={() => setCurrentScreen('marketplace')}>
                    Keep Browsing
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
