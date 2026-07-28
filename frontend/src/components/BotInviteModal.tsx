import { createPortal } from 'react-dom';
import { X, Github, ExternalLink, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  botUsername: string;
  repoInviteUrl: string;
  checking: boolean;
  error?: string | null;
  onConfirm: () => void;   // "Tôi đã mời bot" → accept + retry
  onClose: () => void;
}

export default function BotInviteModal({ botUsername, repoInviteUrl, checking, error, onConfirm, onClose }: Props) {
  const { t } = useTranslation(['shared']);
  const [copied, setCopied] = useState(false);

  const copyBot = () => {
    if (!botUsername) return;
    navigator.clipboard.writeText(botUsername);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Github className="w-5 h-5 text-amber-400" />
            <h2 className="text-white font-semibold text-sm">{t('botInvite.title')}</h2>
          </div>
          {!checking && <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>}
        </div>

        <div className="p-6 space-y-4">
          <p className="text-white/70 text-sm">
            {t('botInvite.description')}
          </p>

          {/* Bot username */}
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <span className="text-white/40 text-xs block mb-1">{t('botInvite.systemAccount')}</span>
            <div className="flex items-center justify-between gap-2">
              <code className="text-amber-300 font-mono text-sm">{botUsername || t('botInvite.notConfigured')}</code>
              {botUsername && (
                <button onClick={copyBot} className="text-white/50 hover:text-white flex items-center gap-1 text-xs">
                  {copied ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {t('botInvite.copied')}</> : <><Copy className="w-3.5 h-3.5" /> {t('botInvite.copy')}</>}
                </button>
              )}
            </div>
          </div>

          {/* Steps */}
          <ol className="text-white/60 text-xs space-y-1.5 list-decimal list-inside">
            <li>{t('botInvite.step1')}</li>
            <li>{t('botInvite.step2', { bot: botUsername || 'bot' })}</li>
            <li>{t('botInvite.step3')}</li>
            <li>{t('botInvite.step4')}</li>
          </ol>

          <a
            href={repoInviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-white/5 border border-white/10 hover:border-amber-400/50 text-white text-sm py-2.5 rounded-xl transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> {t('botInvite.openRepoPage')}
          </a>

          {error && (
            <div className="text-rose-400 text-xs bg-rose-400/10 rounded-lg px-3 py-2">{error}</div>
          )}

          <button
            onClick={onConfirm}
            disabled={checking}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {checking ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('botInvite.checking')}</> : t('botInvite.confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
