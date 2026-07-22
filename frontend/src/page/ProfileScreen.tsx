import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  ArrowLeft,
  Loader2
} from "lucide-react";
import { UserSummary } from "../types";
import { PROFILE_AVATAR_YOU } from "../../assets/images";
import { useAuth } from "../hooks/useAuth";

interface ProfileScreenProps {
  author?: UserSummary;
  authorId?: string;
  onNavigateBack: () => void;
  onMessageCreator?: (recipient: UserSummary) => void;
}

export function ProfileScreen({
  author: initialAuthor,
  authorId,
  onNavigateBack,
  onMessageCreator
}: ProfileScreenProps) {
  const { currentUser } = useAuth();
  const [author, setAuthor] = useState<UserSummary | null>(initialAuthor || null);

  useEffect(() => {
    if (!author && authorId) {
      setAuthor({
        id: authorId,
        fullName: `Creator ${authorId.substring(0, 6)}`,
        avatarUrl: undefined
      });
    }
  }, [authorId, author]);

  if (!author) {
    return (
      <div className="max-w-4xl mx-auto py-12 flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-white/5 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/60 shadow-xl">
        <Loader2 className="animate-spin text-amber-500 mb-4 animate-spin-slow" size={32} />
        <p className="text-slate-500 dark:text-slate-400 font-mono text-xs uppercase tracking-widest">Loading creator profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 text-slate-700 dark:text-slate-200">
      
      {/* Back button */}
      <button 
        onClick={onNavigateBack}
        className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500 hover:text-amber-400 transition-colors uppercase tracking-wider mb-6 bg-slate-800/20 px-3.5 py-2 rounded-xl border border-slate-700/20"
      >
        <ArrowLeft size={14} /> Back
      </button>

      {/* Profile Header Stats Card */}
      <div className="bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col items-center text-center mb-8 relative overflow-hidden group">
        {/* Aesthetic background glow */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-amber-400/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-400/20 transition-all duration-500" />
        
        {/* Avatar */}
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-amber-400/80 shadow-xl">
            <img 
              referrerPolicy="no-referrer"
              src={author.avatarUrl || PROFILE_AVATAR_YOU} 
              alt={author.fullName} 
              className="w-full h-full object-cover" 
            />
          </div>
        </div>

        <h2 className="text-2xl md:text-3xl font-display font-extrabold text-slate-800 dark:text-white mt-5">
          {author.fullName}
        </h2>
        <span className="text-xs text-amber-500 font-mono tracking-wide mt-1">
          @{author.fullName.toLowerCase().replace(/\s+/g, '')}
        </span>
        {currentUser && currentUser.id !== author.id && (
          <button
            onClick={() => onMessageCreator?.(author)}
            className="mt-4 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-4 py-2 rounded-xl text-xs transition-colors shadow-lg active:scale-95 cursor-pointer"
          >
            <MessageSquare size={14} /> Send Message
          </button>
        )}
      </div>

    </div>
  );
}
