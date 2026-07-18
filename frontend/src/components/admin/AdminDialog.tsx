import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AdminDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  size?: 'md' | 'lg';
  onClose: () => void;
  children: React.ReactNode;
}

const sizeClasses: Record<NonNullable<AdminDialogProps['size']>, string> = {
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
};

export const AdminDialog: React.FC<AdminDialogProps> = ({
  isOpen,
  title,
  description,
  size = 'md',
  onClose,
  children,
}) => {
  const { t } = useTranslation(['admin']);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`relative my-6 w-full ${sizeClasses[size]} overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-900`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-6 py-5 dark:border-slate-800/80">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
            {description && (
              <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 transition-studio hover:border-slate-300 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:text-white"
            aria-label={t('dialog.close')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(100vh-9rem)] overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
};
