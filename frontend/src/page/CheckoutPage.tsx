import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Landmark, ReceiptText, ShieldCheck, ShoppingBag } from 'lucide-react';
import { Button } from '../components/Button';
import { Asset } from '../types';

interface CheckoutPageProps {
  cart: Asset[];
  isPlacingOrder: boolean;
  onBackToMarketplace: () => void;
  onPlaceOrder: () => void;
  onRemoveItem: (id: string) => void;
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
    : new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  cart,
  isPlacingOrder,
  onBackToMarketplace,
  onPlaceOrder,
  onRemoveItem,
}) => {
  const { t, i18n } = useTranslation(['payment']);
  const activeLanguage = i18n.resolvedLanguage || i18n.language || 'vi';
  const locale = resolveLocale(activeLanguage);
  const currency = resolveCurrency(activeLanguage);
  const totalAmount = cart.reduce((sum, item) => sum + item.price, 0);
  const unsupportedItems = cart.filter((item) => !item.itemType);
  const hasMultipleItems = cart.length > 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gradient-to-r from-sky-600/10 via-amber-400/5 to-slate-900 border border-slate-250 dark:border-slate-800 p-6 rounded-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <button
            type="button"
            onClick={onBackToMarketplace}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-studio"
          >
            <ArrowLeft size={14} /> {t('payment:center.backToMarketplace')}
          </button>
          <h1 className="mt-3 font-display font-bold text-2xl text-slate-850 dark:text-white flex items-center gap-2">
            <ShoppingBag size={20} className="text-amber-400" /> {t('payment:checkout.title')}
          </h1>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1">
            {t('payment:checkout.subtitle')}
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-400/10 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-500 font-mono">{t('payment:checkout.totalPayment')}</p>
          <p className="mt-1 font-display text-xl font-bold text-slate-850 dark:text-white">{formatMoney(totalAmount, locale, currency, t('payment:common.free'))}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.9fr] gap-6">
        <section className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/70">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-slate-800/70">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-850 dark:text-white">{t('payment:checkout.orderSummary')}</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t('payment:checkout.itemsSelected', { count: cart.length })}
              </p>
            </div>
            <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
              {t('payment:checkout.payosCheckout')}
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
                        <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                          {item.itemType === 'source_code'
                            ? t('payment:checkout.itemType.sourceCode')
                            : item.itemType === 'asset'
                              ? t('payment:checkout.itemType.asset')
                              : t('payment:checkout.itemType.unsupported')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                    <span className="font-display text-lg font-bold text-amber-500">{formatMoney(item.price, locale, currency, t('payment:common.free'))}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-studio"
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
                <div className="rounded-2xl border border-amber-500/20 bg-amber-400/10 p-3 text-amber-500">
                  <Landmark size={18} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-850 dark:text-white">{t('payment:checkout.paymentMethodTitle')}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('payment:checkout.paymentMethodSubtitle')}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4">
                <label className="flex items-start gap-3">
                  <input type="radio" checked readOnly className="mt-0.5 accent-sky-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-850 dark:text-white">PayOS</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {t('payment:checkout.paymentMethodDescription')}
                    </p>
                  </div>
                </label>
              </div>

            <div className="mt-5 space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/45">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{t('payment:checkout.products')}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{cart.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{t('payment:checkout.paymentMethod')}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">PayOS</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200/80 pt-3 text-sm font-bold dark:border-slate-800/80">
                <span className="text-slate-800 dark:text-white">{t('payment:checkout.totalAmount')}</span>
                <span className="text-amber-500">{formatMoney(totalAmount, locale, currency, t('payment:common.free'))}</span>
              </div>
            </div>

            {unsupportedItems.length > 0 && (
              <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-600 dark:text-rose-400">
                {t('payment:checkout.unsupportedItems')}
              </div>
            )}

            {hasMultipleItems && (
              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-400/10 p-4 text-xs text-amber-600 dark:text-amber-400">
                {t('payment:checkout.singleItemWarning')}
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              className="mt-5 w-full"
              icon={<ReceiptText size={16} />}
              onClick={onPlaceOrder}
              disabled={cart.length === 0 || unsupportedItems.length > 0 || hasMultipleItems || isPlacingOrder}
            >
              {isPlacingOrder ? t('payment:checkout.creatingSession') : t('payment:checkout.payWithPayos')}
            </Button>
          </section>

          <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="mt-0.5 text-emerald-500" />
              <div>
                <h3 className="font-display text-sm font-bold text-slate-850 dark:text-white">{t('payment:checkout.webhookTitle')}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {t('payment:checkout.webhookDescription')}
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};
