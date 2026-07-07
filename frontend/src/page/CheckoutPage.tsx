import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Landmark, ReceiptText, ShieldCheck, ShoppingBag, Wallet2, AlertCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { Asset } from '../types';
import { walletApi } from '../api/walletApi';

interface CheckoutPageProps {
  cart: Asset[];
  isPlacingOrder: boolean;
  onBackToMarketplace: () => void;
  onPlaceOrder: () => void;
  onRemoveItem: (id: string) => void;
  onGoToWallet: () => void;
}

const resolveLocale = (language: string) => {
  switch (language) {
    case 'en':
      return 'en-US';
    case 'ja':
      return 'ja-JP';
    case 'vi':
    default:
      return 'vi-VN';
  }
};

const resolveCurrency = (language: string) => (language === 'vi' ? 'VND' : 'USD');

const formatMoney = (
  amount: number,
  locale = 'vi-VN',
  currency = 'VND',
  freeLabel = 'FREE'
) =>
  amount === 0
    ? freeLabel
    : new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  cart,
  isPlacingOrder,
  onBackToMarketplace,
  onPlaceOrder,
  onRemoveItem,
  onGoToWallet,
}) => {
  const { t, i18n } = useTranslation(['payment']);
  const activeLanguage = i18n.resolvedLanguage || i18n.language || 'vi';
  const locale = resolveLocale(activeLanguage);
  const currency = resolveCurrency(activeLanguage);
  const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);
  const unsupportedItems = cart.filter((item) => !item.itemType);
  const hasMultipleItems = cart.length > 1;

  const [walletBalance, setWalletBalance] = React.useState<number | null>(null);
  const [isLoadingWallet, setIsLoadingWallet] = React.useState<boolean>(false);

  React.useEffect(() => {
    const fetchWalletBalance = async () => {
      setIsLoadingWallet(true);
      try {
        const response = await walletApi.getMyWallet();
        if (response.success && response.data) {
          setWalletBalance(response.data.balance);
        }
      } catch (err) {
        console.error('Failed to load wallet balance:', err);
      } finally {
        setIsLoadingWallet(false);
      }
    };

    fetchWalletBalance();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-emerald-600/10 via-teal-400/5 to-slate-900 border border-slate-250 dark:border-slate-800 p-6 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <button
            type="button"
            onClick={onBackToMarketplace}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-all duration-300"
          >
            <ArrowLeft size={14} /> {t('payment:center.backToMarketplace')}
          </button>
          <h1 className="mt-3 font-display font-bold text-2xl text-slate-850 dark:text-white flex items-center gap-2">
            <ShoppingBag size={20} className="text-emerald-500" /> {t('payment:checkout.title')}
          </h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
            Thanh toán các sản phẩm trong giỏ hàng sử dụng số dư ví điện tử của bạn.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-mono">Tổng thanh toán</p>
          <p className="mt-1 font-display text-xl font-bold text-slate-850 dark:text-white">
            {formatMoney(totalAmount, locale, currency, t('payment:common.free'))}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-6">
        <section className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-slate-800/70">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-850 dark:text-white">Tóm tắt đơn hàng</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t('payment:checkout.itemsSelected', { count: cart.length })}
              </p>
            </div>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Wallet2 size={12} /> Thanh toán qua ví
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {cart.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-250 bg-slate-50/50 px-5 py-8 text-center dark:border-slate-800 dark:bg-slate-950/30">
                <p className="font-display text-sm font-semibold text-slate-800 dark:text-slate-200">{t('payment:checkout.emptyTitle')}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  {t('payment:checkout.emptyDescription')}
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      referrerPolicy="no-referrer"
                      src={item.image}
                      alt={item.title}
                      className="h-16 w-16 rounded-xl object-cover border border-slate-200 dark:border-slate-800"
                    />
                    <div className="min-w-0">
                      <h3 className="font-display text-sm font-bold text-slate-850 dark:text-white truncate">{item.title}</h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.author}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                          {item.category}
                        </span>
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {item.itemType === 'source_code'
                            ? "Game Source Code"
                            : item.itemType === 'asset'
                              ? "Marketplace Asset"
                              : "Không hỗ trợ"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                    <span className="font-display text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {formatMoney(item.price, locale, currency, t('payment:common.free'))}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-all duration-300"
                    >
                      {t('payment:checkout.remove')}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-500">
                <Landmark size={18} />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-slate-850 dark:text-white">Phương thức thanh toán</h2>
                <p className="text-xs text-slate-550 dark:text-slate-400">Mua trực tiếp qua số dư ví của tài khoản</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                  <Wallet2 size={16} className="text-emerald-500" />
                  Số dư ví hiện tại
                </span>
                <span className="font-mono text-sm font-bold text-slate-800 dark:text-white">
                  {isLoadingWallet ? (
                    <span className="animate-pulse text-slate-400">Đang tải...</span>
                  ) : walletBalance !== null ? (
                    formatMoney(walletBalance, locale, currency, "0")
                  ) : (
                    "0"
                  )}
                </span>
              </div>
              
              <div className="border-t border-slate-200/50 dark:border-slate-800/50 pt-2 flex items-center justify-between text-xs">
                <span className="text-slate-500">Giá trị đơn hàng:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  -{formatMoney(totalAmount, locale, currency, "0")}
                </span>
              </div>

              {walletBalance !== null && (
                <div className="border-t border-slate-200/50 dark:border-slate-800/50 pt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Số dư sau khi mua:</span>
                  <span className={`font-mono font-bold ${walletBalance - totalAmount >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                    {formatMoney(walletBalance - totalAmount, locale, currency, "0")}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-5 space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Số lượng sản phẩm</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{cart.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Hình thức thanh toán</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Trừ trực tiếp số dư ví</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200/80 pt-3 text-sm font-bold dark:border-slate-800/80">
                <span className="text-slate-800 dark:text-white">Tổng cộng</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {formatMoney(totalAmount, locale, currency, t('payment:common.free'))}
                </span>
              </div>
            </div>

            {/* Error notifications */}
            {unsupportedItems.length > 0 && (
              <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{t('payment:checkout.unsupportedItems')}</span>
              </div>
            )}

            {hasMultipleItems && (
              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-400/10 p-4 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>Bạn chỉ được mua tối đa 1 sản phẩm cho mỗi phiên thanh toán.</span>
              </div>
            )}

            {walletBalance !== null && walletBalance < totalAmount && (
              <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Số dư ví không đủ</p>
                  <p className="mt-1">Bạn cần nạp thêm {formatMoney(totalAmount - walletBalance, locale, currency, "0")} để thanh toán đơn hàng này.</p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {walletBalance !== null && walletBalance < totalAmount ? (
              <Button
                variant="primary"
                size="md"
                className="mt-5 w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-orange-500/10 transition-all duration-300"
                icon={<Wallet2 size={16} />}
                onClick={onGoToWallet}
              >
                Nạp thêm tiền vào ví
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                className="mt-5 w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/10 transition-all duration-300"
                icon={<ReceiptText size={16} />}
                onClick={onPlaceOrder}
                disabled={cart.length === 0 || unsupportedItems.length > 0 || hasMultipleItems || isPlacingOrder || isLoadingWallet || walletBalance === null}
              >
                {isPlacingOrder ? "Đang xử lý thanh toán..." : "Thanh toán bằng số dư ví"}
              </Button>
            )}
          </section>

          <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="mt-0.5 text-emerald-500" />
              <div>
                <h3 className="font-display text-sm font-bold text-slate-850 dark:text-white">Giao dịch an toàn</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Mọi giao dịch thanh toán bằng số dư ví đều được thực hiện bảo mật, mã hóa đường truyền và có thể hoàn tiền nếu sản phẩm gặp sự cố.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};
