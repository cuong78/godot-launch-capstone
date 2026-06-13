import React, { useState, useMemo, useEffect } from "react";
import { 
  MessageSquare, 
  Sparkles, 
  UserPlus, 
  FileText, 
  ArrowLeft,
  Check,
  Globe,
  Award,
  Loader2
} from "lucide-react";
import { UserSummary, CommunityChatResponse } from "../types";
import { PROFILE_AVATAR_YOU, IMAGE_SEED_MAP } from "../../assets/images";
import { communityApi } from "../api/communityApi";
import { useAuth } from "../hooks/useAuth";

interface ProfileScreenProps {
  author?: UserSummary;
  authorId?: string;
  allPosts?: CommunityChatResponse[];
  onNavigateBack: () => void;
  onViewPostDetails: (post: CommunityChatResponse) => void;
  onMessageCreator?: (recipient: UserSummary) => void;
}

export function ProfileScreen({
  author: initialAuthor,
  authorId,
  allPosts = [],
  onNavigateBack,
  onViewPostDetails,
  onMessageCreator
}: ProfileScreenProps) {
  const { currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [posts, setPosts] = useState<CommunityChatResponse[]>(allPosts);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [author, setAuthor] = useState<UserSummary | null>(initialAuthor || null);

  // Self-heal posts list if empty
  useEffect(() => {
    if (posts.length === 0) {
      setIsLoadingPosts(true);
      communityApi.getPosts(undefined, 0, 100)
        .then(res => {
          if (res.success && res.data) {
            setPosts(res.data.content);
          }
        })
        .catch(err => console.error("Failed to load posts for profile", err))
        .finally(() => setIsLoadingPosts(false));
    }
  }, [posts.length]);

  // Self-heal author summary if not provided
  useEffect(() => {
    if (!author && authorId) {
      const foundPost = posts.find(p => p.sender.id === authorId);
      if (foundPost) {
        setAuthor(foundPost.sender);
      } else if (!isLoadingPosts && posts.length > 0) {
        setAuthor({
          id: authorId,
          fullName: `Creator ${authorId.substring(0, 6)}`,
          avatarUrl: undefined
        });
      }
    }
  }, [authorId, author, posts, isLoadingPosts]);

  // Filter actual posts by this author
  const authorPosts = useMemo(() => {
    if (!author) return [];
    return posts.filter(p => p.sender.id === author.id);
  }, [author, posts]);

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
        <ArrowLeft size={14} /> Return to Feed
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

      {/* Creator's Community Timeline Posts */}
      <section className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/80 rounded-xl p-6 shadow-sm">
        <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-1.5 border-b border-slate-200/40 dark:border-slate-800/40 pb-3">
          <FileText size={15} className="text-emerald-500" />
          Recent Community Updates ({authorPosts.length})
        </h3>

        <div className="space-y-6">
          {authorPosts.length > 0 ? (
            authorPosts.map((p) => (
              <div 
                key={p.id} 
                onClick={() => onViewPostDetails(p)}
                className="flex gap-4 border-b border-slate-200/10 dark:border-slate-800/20 pb-5 last:border-b-0 last:pb-0 cursor-pointer hover:bg-slate-800/10 p-2 rounded-xl transition-all"
              >
                <div className="flex-grow min-w-0">
                  <span className="block text-[10px] text-slate-450 font-mono mb-1">
                    {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-light line-clamp-3 whitespace-pre-wrap">
                    {p.message}
                  </p>
                  
                  <div className="flex gap-4 text-[10px] text-slate-450 font-mono mt-3">
                    <span className="flex items-center gap-0.5">👍 {p.reactionCount}</span>
                    <span className="flex items-center gap-0.5">💬 {p.commentCount}</span>
                    <span className="flex items-center gap-0.5">Share {p.shareCount}</span>
                  </div>
                </div>

                {p.mediaFiles && p.mediaFiles.length > 0 && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-850 bg-slate-950 shrink-0">
                    <img src={p.mediaFiles[0].url} className="w-full h-full object-cover" alt="Post thumbnail" />
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-xs text-center text-slate-500 py-6 italic">No recent updates posted by this creator.</p>
          )}
        </div>
      </section>

    </div>
  );
}
