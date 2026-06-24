import { createPortal } from 'react-dom';
import { X, Github, ExternalLink, Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
  botUsername: string;
  repoInviteUrl: string;
  checking: boolean;
  error?: string | null;
  onConfirm: () => void;   // "Tôi đã mời bot" → accept + retry
  onClose: () => void;
}

export default function BotInviteModal({ botUsername, repoInviteUrl, checking, error, onConfirm, onClose }: Props) {
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
            <h2 className="text-white font-semibold text-sm">Repo private — cần cấp quyền cho hệ thống</h2>
          </div>
          {!checking && <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>}
        </div>

        <div className="p-6 space-y-4">
          <p className="text-white/70 text-sm">
            Repo của bạn đang ở chế độ <strong className="text-amber-300">private</strong> (hoặc sai link).
            Để hệ thống pull code về kiểm duyệt, hãy mời tài khoản hệ thống vào repo với quyền <strong>Read</strong>.
          </p>

          {/* Bot username */}
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <span className="text-white/40 text-xs block mb-1">Tài khoản hệ thống cần mời:</span>
            <div className="flex items-center justify-between gap-2">
              <code className="text-amber-300 font-mono text-sm">{botUsername || '(chưa cấu hình bot)'}</code>
              {botUsername && (
                <button onClick={copyBot} className="text-white/50 hover:text-white flex items-center gap-1 text-xs">
                  {copied ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Đã copy</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              )}
            </div>
          </div>

          {/* Steps */}
          <ol className="text-white/60 text-xs space-y-1.5 list-decimal list-inside">
            <li>Mở trang cấp quyền của repo (nút bên dưới)</li>
            <li>Bấm <strong>Add people</strong> → nhập <code className="text-amber-300">{botUsername || 'bot'}</code></li>
            <li>Chọn quyền <strong>Read</strong> → gửi lời mời</li>
            <li>Quay lại đây bấm <strong>"Tôi đã mời bot"</strong></li>
          </ol>

          <a
            href={repoInviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-white/5 border border-white/10 hover:border-amber-400/50 text-white text-sm py-2.5 rounded-xl transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> Mở trang cấp quyền repo trên GitHub
          </a>

          {error && (
            <div className="text-rose-400 text-xs bg-rose-400/10 rounded-lg px-3 py-2">{error}</div>
          )}

          <button
            onClick={onConfirm}
            disabled={checking}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {checking ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang kiểm tra & cấp quyền...</> : 'Tôi đã mời bot — Tiếp tục'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
