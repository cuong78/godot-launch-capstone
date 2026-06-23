import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { PROFILE_AVATAR_YOU } from '../../assets/images';
import { communityApi } from '../api/communityApi';
import { ChatReactionResponse, UserSummary } from '../types';

interface ReactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  onViewAuthorProfile?: (author: UserSummary) => void;
}

const REACTION_EMOJIS: Record<string, { emoji: string; label: string }> = {
  like: { emoji: '👍', label: 'Like' },
  love: { emoji: '❤️', label: 'Love' },
  haha: { emoji: '😂', label: 'Haha' },
  wow: { emoji: '😮', label: 'Wow' },
  sad: { emoji: '😢', label: 'Sad' },
  angry: { emoji: '😡', label: 'Angry' }
};

export function ReactionsModal({ isOpen, onClose, postId, onViewAuthorProfile }: ReactionsModalProps) {
  const [reactions, setReactions] = useState<ChatReactionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && postId) {
      setIsLoading(true);
      communityApi.getReactions(postId)
        .then(res => {
          if (res.success && res.data) {
            setReactions(res.data);
          }
        })
        .catch(err => console.error("Failed to load reactions", err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, postId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/60 shadow-2xl overflow-hidden flex flex-col max-h-[70vh] transform scale-100 transition-transform">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/50 dark:border-slate-800/60">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>👍</span> Mọi người tương tác
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
              <Loader2 className="animate-spin text-amber-500 mb-2" size={24} />
              <p className="text-xs font-mono tracking-widest uppercase">Đang tải...</p>
            </div>
          ) : reactions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <p className="text-sm">Chưa có ai tương tác với bài đăng này.</p>
            </div>
          ) : (
            reactions.map((react) => (
              <div key={react.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-3">
                  {/* User Profile Avatar Link */}
                  <button 
                    onClick={() => {
                      if (onViewAuthorProfile) {
                        onViewAuthorProfile(react.user);
                      }
                      onClose();
                    }}
                    className="w-10 h-10 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-800/50 hover:opacity-85 transition-opacity"
                  >
                    <img 
                      referrerPolicy="no-referrer"
                      src={react.user.avatarUrl || PROFILE_AVATAR_YOU} 
                      alt={react.user.fullName} 
                      className="w-full h-full object-cover" 
                    />
                  </button>
                  <div className="text-left">
                    <button 
                      onClick={() => {
                        if (onViewAuthorProfile) {
                          onViewAuthorProfile(react.user);
                        }
                        onClose();
                      }}
                      className="font-semibold text-sm text-slate-900 dark:text-white hover:text-amber-500 dark:hover:text-amber-400 text-left block"
                    >
                      {react.user.fullName}
                    </button>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-mono">Reacted</span>
                  </div>
                </div>

                {/* Reaction Emoji indicator */}
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-base shadow-sm border border-slate-200/10">
                  {REACTION_EMOJIS[react.reactionType]?.emoji || '👍'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
