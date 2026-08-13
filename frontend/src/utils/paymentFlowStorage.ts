import { PaymentResponse } from "../types";

export const PENDING_CHECKOUT_STORAGE_KEY = "godotlaunch.pendingCheckoutContext";
export const PAYMENT_QR_SESSION_STORAGE_KEY = "godotlaunch.paymentQrSession";

const CHECKOUT_CONTEXT_TTL_MS = 30 * 60 * 1000;
const PAYMENT_LINK_TTL_MS = 30 * 60 * 1000;
const QR_SESSION_RETENTION_MS = 24 * 60 * 60 * 1000;
const MINIMUM_TOP_UP_AMOUNT = 10_000;

export interface PendingCheckoutContext {
  cartItemIds: string[];
  itemTitles: string[];
  totalAmount: number;
  shortfall: number;
  createdAt: string;
  triggeredTopUpPaymentId?: string;
  readyToResume?: boolean;
}

export interface PaymentQrSession {
  payment: PaymentResponse;
  expiresAt: string;
  storedAt: string;
}

const canUseSessionStorage = () => typeof window !== "undefined" && Boolean(window.sessionStorage);

const parseTimestamp = (value?: string | null) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const isPendingCheckoutContextValid = (
  context: PendingCheckoutContext | null,
) => {
  if (!context || !Array.isArray(context.cartItemIds) || context.cartItemIds.length === 0) {
    return false;
  }

  const createdAt = parseTimestamp(context.createdAt);
  return createdAt !== null && Date.now() - createdAt <= CHECKOUT_CONTEXT_TTL_MS;
};

export const readPendingCheckoutContext = (): PendingCheckoutContext | null => {
  if (!canUseSessionStorage()) return null;

  try {
    const raw = window.sessionStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
    if (!raw) return null;
    const context = JSON.parse(raw) as PendingCheckoutContext;
    if (!isPendingCheckoutContextValid(context)) {
      window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
      return null;
    }
    return context;
  } catch (error) {
    console.warn("Failed to read pending checkout context:", error);
    window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
    return null;
  }
};

export const storePendingCheckoutContext = (context: PendingCheckoutContext) => {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.setItem(PENDING_CHECKOUT_STORAGE_KEY, JSON.stringify(context));
};

export const updatePendingCheckoutContext = (
  updates: Partial<PendingCheckoutContext>,
) => {
  const current = readPendingCheckoutContext();
  if (!current) return null;
  const updated = { ...current, ...updates };
  storePendingCheckoutContext(updated);
  return updated;
};

export const clearPendingCheckoutContext = () => {
  if (!canUseSessionStorage()) return;
  window.sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
};

export const resolveSuggestedTopUpAmount = (shortfall: number) =>
  Math.max(MINIMUM_TOP_UP_AMOUNT, Math.ceil(Number(shortfall) || 0));

export const readPaymentQrSession = (paymentId?: string | null): PaymentQrSession | null => {
  if (!canUseSessionStorage()) return null;

  try {
    const raw = window.sessionStorage.getItem(PAYMENT_QR_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as PaymentQrSession;
    const storedAt = parseTimestamp(session.storedAt);
    if (
      !session.payment?.id ||
      storedAt === null ||
      Date.now() - storedAt > QR_SESSION_RETENTION_MS ||
      (paymentId && session.payment.id !== paymentId)
    ) {
      if (!paymentId || session.payment?.id === paymentId) {
        window.sessionStorage.removeItem(PAYMENT_QR_SESSION_STORAGE_KEY);
      }
      return null;
    }
    return session;
  } catch (error) {
    console.warn("Failed to read payment QR session:", error);
    window.sessionStorage.removeItem(PAYMENT_QR_SESSION_STORAGE_KEY);
    return null;
  }
};

export const storePaymentQrSession = (
  payment: PaymentResponse,
  existingExpiresAt?: string,
): PaymentQrSession | null => {
  if (!canUseSessionStorage()) return null;

  const createdAt = parseTimestamp(payment.createdAt) ?? Date.now();
  const session: PaymentQrSession = {
    payment,
    expiresAt: existingExpiresAt || new Date(createdAt + PAYMENT_LINK_TTL_MS).toISOString(),
    storedAt: new Date().toISOString(),
  };
  window.sessionStorage.setItem(PAYMENT_QR_SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
};

export const mergePaymentWithStoredQr = (payment: PaymentResponse) => {
  const stored = readPaymentQrSession(payment.id);
  if (!stored) return payment;
  return {
    ...stored.payment,
    ...payment,
    qrCode: payment.qrCode || stored.payment.qrCode,
    bin: payment.bin || stored.payment.bin,
    bankAccountNumber:
      payment.bankAccountNumber || stored.payment.bankAccountNumber,
    bankAccountName: payment.bankAccountName || stored.payment.bankAccountName,
    checkoutUrl: payment.checkoutUrl || stored.payment.checkoutUrl,
  };
};

export const clearPaymentQrSession = (paymentId?: string) => {
  if (!canUseSessionStorage()) return;
  if (!paymentId) {
    window.sessionStorage.removeItem(PAYMENT_QR_SESSION_STORAGE_KEY);
    return;
  }

  const current = readPaymentQrSession();
  if (current?.payment.id === paymentId) {
    window.sessionStorage.removeItem(PAYMENT_QR_SESSION_STORAGE_KEY);
  }
};
