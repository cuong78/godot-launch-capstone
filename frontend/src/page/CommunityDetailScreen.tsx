import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Share2, 
  Bookmark, 
  ThumbsUp, 
  Code, 
  ExternalLink, 
  ArrowLeft,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { CommunityChatResponse, ReactionType, UserSummary } from "../types";
import { communityApi } from "../api/communityApi";
import { useAuth } from "../hooks/useAuth";
import { PROFILE_AVATAR_YOU } from "../../assets/images";

interface CommunityDetailScreenProps {
  post?: CommunityChatResponse;
  postId?: string;
  onNavigateBack: () => void;
  onNavigateToProfile?: (author: UserSummary) => void;
  myReaction?: ReactionType;
  onReact: (postId: string, type: ReactionType) => Promise<void>;
  onShare: (postId: string) => Promise<void>;
  onDelete?: (postId: string) => Promise<void>;
}

const REACTION_EMOJIS: Record<ReactionType, { emoji: string; color: string; label: string }> = {
  like: { emoji: '👍', color: 'text-blue-500 hover:scale-125', label: 'Like' },
  love: { emoji: '❤️', color: 'text-rose-500 hover:scale-125', label: 'Love' },
  haha: { emoji: '😂', color: 'text-amber-500 hover:scale-125', label: 'Haha' },
  wow: { emoji: '😮', color: 'text-yellow-500 hover:scale-125', label: 'Wow' },
  sad: { emoji: '😢', color: 'text-indigo-400 hover:scale-125', label: 'Sad' },
  angry: { emoji: '😡', color: 'text-red-500 hover:scale-125', label: 'Angry' }
};

export function CommunityDetailScreen({
  post: initialPost,
  postId,
  onNavigateBack,
  onNavigateToProfile,
  myReaction,
  onReact,
  onShare,
  onDelete
}: CommunityDetailScreenProps) {
  const { currentUser } = useAuth();
  
  const [post, setPost] = useState<CommunityChatResponse | null>(initialPost || null);
  const [comments, setComments] = useState<CommunityChatResponse[]>([]);
  const [commentPage, setCommentPage] = useState(0);
  const [commentHasMore, setCommentHasMore] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [hoveredReaction, setHoveredReaction] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [localMyReaction, setLocalMyReaction] = useState<ReactionType | undefined>(myReaction);

  useEffect(() => {
    setLocalMyReaction(myReaction);
  }, [myReaction]);

  const handleReactClick = async (type: ReactionType) => {
    if (!post) return;
    if (!currentUser) {
      alert("You must log in to react to posts!");
      return;
    }
    try {
      const prevReaction = localMyReaction;
      if (prevReaction === type) {
        // Toggle Off
        const res = await communityApi.removeReaction(post.id);
        if (res.success) {
          setLocalMyReaction(undefined);
          setPost(prev => prev ? { ...prev, reactionCount: Math.max(0, prev.reactionCount - 1) } : null);
        }
      } else {
        // Add or change reaction
        const res = await communityApi.reactToPost(post.id, { reactionType: type });
        if (res.success) {
          setLocalMyReaction(type);
          setPost(prev => {
            if (!prev) return null;
            const increment = prevReaction ? 0 : 1;
            return { ...prev, reactionCount: prev.reactionCount + increment };
          });
        }
      }
      
      // Notify parent component so it can update its state if needed
      if (onReact) {
        onReact(post.id, type);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to react to post");
    } finally {
      setHoveredReaction(false);
    }
  };

  // Self-heal post if not provided
  useEffect(() => {
    if (!post && postId) {
      communityApi.getPost(postId).then(res => {
        if (res.success && res.data) {
          setPost(res.data);
        }
      }).catch(err => {
        console.error("Failed to load post by ID", err);
      });
    }
  }, [postId, post]);

  // Fetch comments on mount & when post changes
  useEffect(() => {
    if (post) {
      fetchComments(true);
    }
  }, [post?.id]);

  const fetchComments = async (isReset = false) => {
    if (!post) return;
    setIsLoadingComments(true);
    const targetPage = isReset ? 0 : commentPage + 1;
    try {
      const res = await communityApi.getComments(post.id, targetPage, 10);
      if (res.success && res.data) {
        setComments(prev => isReset ? res.data.content : [...prev, ...res.data.content]);
        setCommentPage(targetPage);
        setCommentHasMore(!res.data.last);
      }
    } catch (err) {
      console.error("Failed to load comments", err);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handlePostComment = async () => {
    if (!post) return;
    if (!currentUser) {
      alert("You must log in to submit comments!");
      return;
    }
    if (!newCommentText.trim()) return;

    setIsSubmittingComment(true);
    setCommentError(null);
    try {
      const res = await communityApi.addComment(post.id, { message: newCommentText });
      if (res.success && res.data) {
        const newComment = {
          ...res.data,
          createdAt: res.data.createdAt || new Date().toISOString()
        };
        setComments(prev => [newComment, ...prev]);
        setNewCommentText("");
      } else {
        setCommentError(res.message || "Failed to submit comment.");
      }
    } catch (err: any) {
      setCommentError(err.response?.data?.message || err.message || "Failed to submit comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto py-12 flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-white/5 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/60 shadow-xl">
        <Loader2 className="animate-spin text-amber-500 mb-4 animate-spin-slow" size={32} />
        <p className="text-slate-500 dark:text-slate-400 font-mono text-xs uppercase tracking-widest">Loading post details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 text-slate-700 dark:text-slate-200">
      
      {/* Back to feed header */}
      <button 
        onClick={onNavigateBack}
        className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500 hover:text-amber-400 transition-colors uppercase tracking-wider mb-6 bg-slate-800/20 px-3.5 py-2 rounded-xl border border-slate-700/20"
      >
        <ArrowLeft size={14} /> Back to Community Feed
      </button>

      {/* Central Post Card */}
      <article className="bg-white/75 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl mb-8">
        
        {/* Post Header */}
        <header className="p-6 flex items-center justify-between gap-4 border-b border-slate-200/40 dark:border-slate-800/40 bg-slate-800/5">
          <div className="flex items-center gap-3.5">
            <div 
              onClick={() => onNavigateToProfile?.(post.sender)}
              className="w-12 h-12 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200 shrink-0"
            >
              <img 
                referrerPolicy="no-referrer"
                src={post.sender.avatarUrl || PROFILE_AVATAR_YOU} 
                alt={post.sender.fullName} 
                className="w-full h-full object-cover" 
              />
            </div>
            <div>
              <h1 
                onClick={() => onNavigateToProfile?.(post.sender)}
                className="font-display font-bold text-base hover:text-amber-500 dark:hover:text-amber-400 cursor-pointer transition-colors leading-tight"
              >
                {post.sender.fullName}
              </h1>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                Posted {new Date(post.createdAt).toLocaleDateString()} {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {post.isEdited && <span className="text-amber-500 font-semibold ml-1.5">(edited)</span>}
              </p>
            </div>
          </div>
          <div>
            <span className="bg-amber-400/20 text-amber-500 text-[10px] uppercase font-black py-1 px-2.5 rounded-full border border-amber-500/30 font-mono shadow-sm">
              Level 42
            </span>
          </div>
        </header>

        {/* Media content */}
        {post.mediaFiles && post.mediaFiles.length > 0 && (
          <div className="border-b border-slate-200/40 dark:border-slate-800/40 bg-slate-950/20 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {post.mediaFiles.map((media, index) => {
                const isVideo = media.mediaType === 'video';
                return (
                  <div key={index} className="rounded-xl overflow-hidden border border-slate-200/50 dark:border-slate-800/60 bg-slate-950 flex justify-center max-h-96">
                    {isVideo ? (
                      <video src={media.url} controls className="w-full h-full object-contain" />
                    ) : (
                      <img src={media.url} alt="Attached Artwork" className="w-full h-full object-contain hover:scale-[1.01] transition-transform duration-300" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Post text */}
        <div className="p-6 md:p-8 space-y-6">
          <p className="text-sm sm:text-base text-slate-800 dark:text-slate-250 leading-relaxed whitespace-pre-wrap font-sans">
            {post.message}
          </p>

          {/* Render Quote Post if it is a shared post */}
          {post.originalChat && (
            <div className="pl-4 border-l-4 border-amber-400 bg-slate-500/5 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800/40 text-xs">
              <div className="flex gap-2 items-center mb-2">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 flex-shrink-0">
                  <img referrerPolicy="no-referrer" src={post.originalChat.sender.avatarUrl || PROFILE_AVATAR_YOU} alt={post.originalChat.sender.fullName} className="w-full h-full object-cover" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-white block">{post.originalChat.sender.fullName}</span>
                  <span className="text-[9px] text-slate-400 font-mono">Original update</span>
                </div>
              </div>
              <p className="text-slate-700 dark:text-slate-350 leading-normal whitespace-pre-wrap">{post.originalChat.message}</p>
              {post.originalChat.mediaFiles && post.originalChat.mediaFiles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {post.originalChat.mediaFiles.map((media, idx) => (
                    <div key={idx} className="rounded-lg overflow-hidden border border-slate-200/50 dark:border-slate-850 bg-slate-900 max-h-40">
                      {media.mediaType === 'video' ? (
                        <video src={media.url} controls className="w-full h-full object-cover" />
                      ) : (
                        <img src={media.url} alt="Shared media content" className="w-full h-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Optional GitHub Repo Link */}
          {post.message.toLowerCase().includes('github.com/') && (
            <div className="block group">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
                <div className="bg-slate-950 text-white p-2.5 rounded-lg border border-slate-800">
                  <Code className="w-5 h-5 text-amber-400 animate-pulse" />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    Godot Engine Source Link
                  </p>
                  <p className="text-[10px] text-slate-450 font-mono truncate">github.com/godotengine/godot</p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          )}
        </div>

        {/* Interaction Bar */}
        <footer className="p-6 bg-slate-800/10 border-t border-slate-200/40 dark:border-slate-800/40 flex flex-wrap items-center justify-between gap-4">
          <div 
            className="flex items-center gap-2 relative"
            onMouseEnter={() => setHoveredReaction(true)}
            onMouseLeave={() => setHoveredReaction(false)}
          >
            <button 
              onClick={() => handleReactClick('like')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-semibold transition-all active:scale-95 ${
                localMyReaction 
                  ? "bg-amber-400 text-slate-900 border-amber-400 font-bold" 
                  : "bg-slate-800/20 border-slate-700/30 hover:bg-slate-800/40 text-slate-700 dark:text-slate-350"
              }`}
            >
              <span>{localMyReaction ? REACTION_EMOJIS[localMyReaction].emoji : '👍'}</span>
              <span>{localMyReaction ? REACTION_EMOJIS[localMyReaction].label : 'Like'} ({post.reactionCount})</span>
            </button>

            {/* Hover popup emojis */}
            {hoveredReaction && (
              <div 
                className="absolute bottom-full left-0 pb-2.5 z-50"
                onMouseEnter={() => setHoveredReaction(true)}
                onMouseLeave={() => setHoveredReaction(false)}
              >
                <div className="flex items-center gap-2.5 p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-full shadow-2xl animate-bounce-short">
                  {(Object.keys(REACTION_EMOJIS) as ReactionType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        handleReactClick(type);
                      }}
                      className={`text-xl p-1 rounded-full transition-transform transform ${REACTION_EMOJIS[type].color}`}
                      title={REACTION_EMOJIS[type].label}
                    >
                      {REACTION_EMOJIS[type].emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onShare(post.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#00658d] hover:bg-[#005272] text-white text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Share2 size={13} />
              Share
            </button>
            <button 
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`p-2 rounded-full border transition-colors ${
                isBookmarked 
                  ? "bg-amber-400/20 border-amber-400/30 text-amber-400" 
                  : "bg-slate-800/20 border-slate-700/30 text-slate-400 hover:text-slate-300"
              }`}
            >
              <Bookmark size={14} className={isBookmarked ? "fill-current" : ""} />
            </button>
          </div>
        </footer>

      </article>

      {/* Comments Container Card */}
      <section className="bg-white/75 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <h3 className="text-base font-display font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 border-b border-slate-200/40 dark:border-slate-800/40 pb-3">
          <MessageSquare size={16} className="text-amber-500" />
          Discussions ({comments.length})
        </h3>

        {/* Comment input textarea */}
        <div className="flex gap-4 mb-8">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-250 dark:border-slate-800 bg-slate-200 shrink-0">
            <img 
              referrerPolicy="no-referrer"
              src={currentUser?.avatarUrl || PROFILE_AVATAR_YOU} 
              alt="Me" 
              className="w-full h-full object-cover" 
            />
          </div>
          <div className="flex-grow space-y-2">
            <textarea 
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder={currentUser ? "Add to the discussion node..." : "Log in to post a comment."}
              disabled={!currentUser || isSubmittingComment}
              rows={3}
              className="w-full rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-4 py-3 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 text-xs sm:text-sm text-slate-800 dark:text-slate-100 outline-none resize-none placeholder-slate-500 transition-all"
            />
            {commentError && (
              <p className="text-xs text-rose-500 font-semibold flex items-center gap-1.5"><AlertCircle size={12} /> {commentError}</p>
            )}
            <div className="flex justify-end">
              <button 
                onClick={handlePostComment}
                disabled={!currentUser || !newCommentText.trim() || isSubmittingComment}
                className="bg-amber-400 hover:bg-amber-350 disabled:bg-slate-800 text-slate-900 disabled:text-slate-500 font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              >
                {isSubmittingComment ? <Loader2 size={13} className="animate-spin" /> : <Send size={12} />}
                Comment
              </button>
            </div>
          </div>
        </div>

        {/* Comments Listing */}
        <div className="space-y-6">
          {isLoadingComments && comments.length === 0 ? (
            <div className="flex items-center justify-center py-8 gap-2 text-xs font-mono text-slate-400">
              <Loader2 className="animate-spin text-amber-500" size={16} /> Loading discussion sockets...
            </div>
          ) : comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="border-b border-slate-200/20 dark:border-slate-800/30 pb-5 last:border-b-0 last:pb-0">
                <div className="flex gap-3.5">
                  <div 
                    onClick={() => onNavigateToProfile?.(comment.sender)}
                    className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 dark:border-slate-850 bg-slate-100 shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                  >
                    <img referrerPolicy="no-referrer" src={comment.sender.avatarUrl || PROFILE_AVATAR_YOU} alt={comment.sender.fullName} className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <span 
                        onClick={() => onNavigateToProfile?.(comment.sender)}
                        className="font-bold text-xs text-slate-850 dark:text-white flex items-center gap-1 cursor-pointer hover:text-amber-400 transition-colors"
                      >
                        {comment.sender.fullName}
                        {comment.sender.id === post.sender.id && (
                          <span className="bg-amber-400/20 text-amber-500 text-[7px] uppercase px-1 border border-amber-500/20 rounded font-black font-mono">OP</span>
                        )}
                      </span>
                      <span className="text-[9px] text-slate-450 font-mono">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {comment.message}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-center text-slate-500 py-6 italic">No active discussions. Add yours first!</p>
          )}

          {/* Comment pagination */}
          {commentHasMore && (
            <button
              onClick={() => fetchComments(false)}
              disabled={isLoadingComments}
              className="w-full mt-4 py-2.5 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:border-amber-400/60 hover:text-amber-500 transition-all flex items-center justify-center gap-1.5"
            >
              {isLoadingComments ? <Loader2 size={13} className="animate-spin text-amber-500" /> : 'Load More Comments'}
            </button>
          )}
        </div>
      </section>

    </div>
  );
}
