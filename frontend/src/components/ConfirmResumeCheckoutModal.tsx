import React from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  ShoppingBag,
  Sparkles,
  Wallet2,
  X,
} from "lucide-react";
import { Asset } from "../types";
import { PendingCheckoutContext } from "../utils/paymentFlowStorage";

interface ConfirmResumeCheckoutModalProps {
  context: PendingCheckoutContext;
  cart: Asset[];
  isProcessing: boolean;
  onConfirm: () => void;
  onLater: () => void;
}

const resolveLocale = (language: string) => {
  if (language === "en") return "en-US";
  if (language === "ja") return "ja-JP";
  return "vi-VN";
};

export const ConfirmResumeCheckoutModal: React.FC<
  ConfirmResumeCheckoutModalProps
> = ({ context, cart, isProcessing, onConfirm, onLater }) => {
  const { t, i18n } = useTranslation(["payment"]);
  const locale = resolveLocale(i18n.resolvedLanguage || i18n.language || "vi");
  const itemTitles =
    context.itemTitles?.length > 0
      ? context.itemTitles
      : cart.map((item) => item.title);
  const itemSummary =
    itemTitles.length > 1
      ? t("payment:resumeCheckout.multipleItems", {
          firstItem: itemTitles[0],
          remaining: itemTitles.length - 1,
        })
      : itemTitles[0] || t("payment:resumeCheckout.yourOrder");
  const amount = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(context.totalAmount);

  return createPortal(
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-lg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-checkout-title"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-[30px] border border-white/15 bg-white shadow-[0_38px_120px_rgba(0,0,0,0.45)] dark:border-slate-700/70 dark:bg-slate-900">
        <div className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-60 w-60 rounded-full bg-sky-400/10 blur-3xl" />

        <button
          type="button"
          onClick={onLater}
          disabled={isProcessing}
          className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 transition hover:text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:text-white"
          aria-label={t("payment:resumeCheckout.later")}
        >
          <X size={17} />
        </button>

        <div className="relative p-6 sm:p-8">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
            <Sparkles size={13} /> {t("payment:resumeCheckout.readyLabel")}
          </div>

          <div className="mt-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-[0_18px_40px_rgba(16,185,129,0.3)]">
            <CheckCircle2 size={30} />
          </div>

          <h2
            id="resume-checkout-title"
            className="mt-5 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
          >
            {t("payment:resumeCheckout.title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {t("payment:resumeCheckout.description")}
          </p>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/85 dark:border-slate-800 dark:bg-slate-950/45">
            <div className="flex items-center gap-3 border-b border-slate-200/70 px-4 py-3.5 dark:border-slate-800/70">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
                <ShoppingBag size={17} />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  {t("payment:resumeCheckout.orderLabel")}
                </p>
                <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">
                  {itemSummary}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Wallet2 size={15} className="text-emerald-500" />
                {t("payment:resumeCheckout.amountLabel")}
              </div>
              <span className="font-display text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {amount}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onLater}
              disabled={isProcessing}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {t("payment:resumeCheckout.later")}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isProcessing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(16,185,129,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(16,185,129,0.3)] disabled:translate-y-0 disabled:opacity-60"
            >
              {isProcessing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ArrowRight size={16} />
              )}
              {isProcessing
                ? t("payment:resumeCheckout.processing")
                : t("payment:resumeCheckout.payNow")}
            </button>
          </div>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-400">
            {t("payment:resumeCheckout.safeNote")}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
};
