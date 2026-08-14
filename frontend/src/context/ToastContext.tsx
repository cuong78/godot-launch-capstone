import React, { createContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { CheckCircle, AlertTriangle, ShieldAlert, Info, X } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  showConfirm: (message: string, onConfirm: () => void, onCancel?: () => void) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastState {
  message: string;
  type: ToastType;
}

const TOAST_DURATION_MS = 5000;

/**
 * Toast global — thay thế alert()/window.confirm() mặc định của trình duyệt
 * trên toàn app. Trước đây showToast chỉ tồn tại như state cục bộ trong
 * App.tsx, truyền xuống từng trang qua props (prop drilling) — component con
 * sâu (vd admin panel) không gọi được nên phải dùng alert() tạm. Nâng lên
 * Context để BẤT KỲ component nào cũng gọi useToast() trực tiếp, không cần
 * truyền props qua nhiều tầng.
 */
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  }, []);

  const showConfirm = useCallback((message: string, onConfirm: () => void, onCancel?: () => void) => {
    setConfirmConfig({ message, onConfirm, onCancel });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ showToast, showConfirm }}>
      {children}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-[9999] flex max-w-md animate-toast-in items-center gap-3 rounded-xl border bg-white/85 p-4 shadow-2xl backdrop-blur-md transition-all duration-300 dark:bg-slate-900/85"
          style={{
            borderColor:
              toast.type === 'success'
                ? 'rgba(16, 185, 129, 0.3)'
                : toast.type === 'warning'
                  ? 'rgba(245, 158, 11, 0.3)'
                  : toast.type === 'error'
                    ? 'rgba(239, 68, 68, 0.3)'
                    : 'rgba(56, 189, 248, 0.3)',
          }}
        >
          <div className="flex-shrink-0">
            {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
            {toast.type === 'warning' && <AlertTriangle className="h-5 w-5 animate-pulse text-amber-500" />}
            {toast.type === 'error' && <ShieldAlert className="h-5 w-5 text-rose-500" />}
            {toast.type === 'info' && <Info className="h-5 w-5 text-sky-500" />}
          </div>
          <div className="flex-grow pr-2 text-xs font-semibold tracking-wide sm:text-sm">
            <span className="text-slate-800 dark:text-slate-200">{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="flex-shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100/10 hover:text-slate-650 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {confirmConfig && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-500/20 bg-white dark:bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <h3 className="text-base font-bold text-slate-850 dark:text-white">
                Xác nhận hành động
              </h3>
            </div>
            
            <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed mb-6">
              {confirmConfig.message}
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (confirmConfig.onCancel) confirmConfig.onCancel();
                  setConfirmConfig(null);
                }}
                className="px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-750 text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmConfig.onConfirm();
                  setConfirmConfig(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-450 text-slate-950 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};
