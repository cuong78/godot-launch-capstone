import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Share2, 
  Heart, 
  Plus, 
  Search, 
  Sparkles, 
  TrendingUp, 
  Calendar, 
  Check, 
  UserPlus, 
  Image as ImageIcon, 
  Video, 
  Code, 
  Smile, 
  Bookmark, 
  Settings, 
  Compass, 
  Gamepad2, 
  Home, 
  Send, 
  X,
  PlusCircle,
  FileCode,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle
} from 'lucide-react';
import { DEV_AVATARS, PROFILE_AVATAR_YOU, IMAGE_SEED_MAP } from '../../assets/images';
import OIPImage from '../../assets/OIP.webp';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../context/WebSocketContext';
import { communityApi } from '../api/communityApi';
import { ReactionsModal } from './ReactionsModal';
import { CommunityChatResponse, ReactionType, ChatMediaResponse, UserSummary } from '../types';

interface CommunityHubProps {
  darkMode: boolean;
  onNavigateToSeller?: () => void;
  onNavigateToMarketplace?: () => void;
  onViewPostDetails?: (post: CommunityChatResponse) => void;
  onViewAuthorProfile?: (author: UserSummary) => void;
}

const REACTION_EMOJIS: Record<ReactionType, { emoji: string; color: string; label: string }> = {
  like: { emoji: '👍', color: 'text-blue-500 hover:scale-125', label: 'Like' },
  love: { emoji: '❤️', color: 'text-rose-500 hover:scale-125', label: 'Love' },
  haha: { emoji: '😂', color: 'text-amber-500 hover:scale-125', label: 'Haha' },
  wow: { emoji: '😮', color: 'text-yellow-500 hover:scale-125', label: 'Wow' },
  sad: { emoji: '😢', color: 'text-indigo-400 hover:scale-125', label: 'Sad' },
  angry: { emoji: '😡', color: 'text-red-500 hover:scale-125', label: 'Angry' }
};

export function CommunityHub({ 
  darkMode, 
  onNavigateToSeller, 
  onNavigateToMarketplace,
  onViewPostDetails,
  onViewAuthorProfile
}: CommunityHubProps) {
  const { currentUser } = useAuth();
  const { notifications } = useWebSocket();
  
  
  // Feed filtering & pagination states
  const [posts, setPosts] = useState<CommunityChatResponse[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gameIdFilter, setGameIdFilter] = useState<string | undefined>(undefined);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // New Post Submission Inputs
  const [postText, setPostText] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Comments sectors state
  const [comments, setComments] = useState<{ [postId: string]: CommunityChatResponse[] }>({});
  const [commentPages, setCommentPages] = useState<{ [postId: string]: number }>({});
  const [commentHasMore, setCommentHasMore] = useState<{ [postId: string]: boolean }>({});
  const [expandedPostComments, setExpandedPostComments] = useState<{ [postId: string]: boolean }>({});
  const [activeCommentTexts, setActiveCommentTexts] = useState<{ [postId: string]: string }>({});

  // Inline Edits
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Active Reaction per Post for current user
  const [myReactions, setMyReactions] = useState<{ [postId: string]: ReactionType }>({});
  const [hoveredPostReactionId, setHoveredPostReactionId] = useState<string | null>(null);

  // Reactions Modal State
  const [activeReactionsPostId, setActiveReactionsPostId] = useState<string | null>(null);

  const handleOpenReactionsModal = (postId: string) => {
    setActiveReactionsPostId(postId);
  };

  // Reaction hover timeout manager
  const reactionTimeouts = React.useRef<{ [postId: string]: any }>({});

  const handleMouseEnterReaction = (postId: string) => {
    if (reactionTimeouts.current[postId]) {
      clearTimeout(reactionTimeouts.current[postId]);
      reactionTimeouts.current[postId] = null;
    }
    setHoveredPostReactionId(postId);
  };

  const handleMouseLeaveReaction = (postId: string) => {
    reactionTimeouts.current[postId] = setTimeout(() => {
      setHoveredPostReactionId(null);
    }, 800);
  };

  useEffect(() => {
    return () => {
      Object.values(reactionTimeouts.current).forEach(t => {
        if (t) clearTimeout(t);
      });
    };
  }, []);

  // File Upload reference
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Size check (max 5MB to prevent large Base64 transfers)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }
    
    if (mediaUrls.length >= 10) {
      alert("Maximum 10 media files allowed per post.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const base64Url = event.target.result as string;
        setMediaUrls(prev => [...prev, base64Url]);
      }
    };
    reader.readAsDataURL(file);
    
    e.target.value = '';
  };


  // Initial Load Feed
  useEffect(() => {
    loadFeed(true);
  }, [gameIdFilter]);

  const loadFeed = async (isReset = false) => {
    setIsLoading(true);
    const targetPage = isReset ? 0 : page;
    try {
      const res = await communityApi.getPosts(gameIdFilter, targetPage, 10);
      if (res.success && res.data) {
        const newPosts = res.data.content;
        console.log("[Debug Feed] newPosts from API:", newPosts);
        setPosts(prev => isReset ? newPosts : [...prev, ...newPosts]);
        setPage(targetPage + 1);
        setHasMore(!res.data.last);

        // Sync myReactions state from the API response
        const reactionsUpdate: { [postId: string]: ReactionType } = {};
        newPosts.forEach((post: CommunityChatResponse) => {
          if (post.currentUserReaction) {
            reactionsUpdate[post.id] = post.currentUserReaction;
          }
        });
        console.log("[Debug Feed] reactionsUpdate:", reactionsUpdate);
        setMyReactions(prev => isReset ? reactionsUpdate : { ...prev, ...reactionsUpdate });
      }
    } catch (err) {
      console.error("Failed to load feed", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time update reaction/comment/share count from WebSocket public topic updates
  useEffect(() => {
    const handlePostUpdate = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data.type === 'NEW_POST') {
        const newPost = data.post;
        // If we are filtering by a specific game and the new post doesn't match it, ignore it
        if (gameIdFilter && newPost.gameId !== gameIdFilter) {
          return;
        }
        setPosts(prev => {
          if (prev.some(p => p.id === newPost.id)) {
            return prev;
          }
          return [newPost, ...prev];
        });
      } else if (data.type === 'DELETE_POST') {
        const { postId } = data;
        setPosts(prev => prev.filter(p => p.id !== postId));
      } else if (data.type === 'POST_COUNT_UPDATE') {
        const { postId, reactionCount, commentCount, shareCount } = data;
        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              reactionCount,
              commentCount,
              shareCount
            };
          }
          return p;
        }));
      }
    };

    window.addEventListener('community-post-update', handlePostUpdate);
    return () => {
      window.removeEventListener('community-post-update', handlePostUpdate);
    };
  }, [gameIdFilter]);

  const loadComments = async (postId: string, isReset = false) => {
    const targetPage = isReset ? 0 : (commentPages[postId] || 0) + 1;
    try {
      const res = await communityApi.getComments(postId, targetPage, 10);
      if (res.success && res.data) {
        setComments(prev => ({
          ...prev,
          [postId]: isReset ? res.data.content : [...(prev[postId] || []), ...res.data.content]
        }));
        setCommentPages(prev => ({ ...prev, [postId]: targetPage }));
        setCommentHasMore(prev => ({ ...prev, [postId]: !res.data.last }));
      }
    } catch (err) {
      console.error("Failed to load comments", err);
    }
  };

  // Create Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert("You must log in to post updates!");
      return;
    }
    if (!postText.trim()) return;

    setIsSubmittingPost(true);
    try {
      const res = await communityApi.createPost({
        message: postText,
        gameId: gameIdFilter,
        mediaUrls: mediaUrls
      });

      if (res.success && res.data) {
        const newPost = {
          ...res.data,
          createdAt: res.data.createdAt || new Date().toISOString()
        };
        setPosts(prev => [newPost, ...prev]);
        setPostText('');
        setMediaUrls([]);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to submit post");
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Add Comment
  const handleAddComment = async (postId: string) => {
    if (!currentUser) {
      alert("You must log in to comment!");
      return;
    }
    const text = activeCommentTexts[postId];
    if (!text || !text.trim()) return;

    try {
      const res = await communityApi.addComment(postId, { message: text });
      if (res.success && res.data) {
        const newComment = {
          ...res.data,
          createdAt: res.data.createdAt || new Date().toISOString()
        };
        setComments(prev => ({
          ...prev,
          [postId]: [newComment, ...(prev[postId] || [])]
        }));
        setActiveCommentTexts(prev => ({ ...prev, [postId]: '' }));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to comment");
    }
  };

  // Reactions
  const handleReact = async (postId: string, type: ReactionType) => {
    if (!currentUser) {
      alert("You must log in to react to posts!");
      return;
    }
    try {
      const prevReaction = myReactions[postId];
      if (prevReaction === type) {
        // Toggle Off
        const res = await communityApi.removeReaction(postId);
        if (res.success) {
          setMyReactions(prev => {
            const next = { ...prev };
            delete next[postId];
            return next;
          });
        }
      } else {
        // Add or change reaction
        const res = await communityApi.reactToPost(postId, { reactionType: type });
        if (res.success) {
          setMyReactions(prev => ({ ...prev, [postId]: type }));
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to add reaction");
    } finally {
      setHoveredPostReactionId(null);
    }
  };

  // Share Post
  const handleSharePost = async (postId: string) => {
    if (!currentUser) {
      alert("You must log in to share posts!");
      return;
    }
    const shareMessage = window.prompt("Introduce this shared post (optional):");
    if (shareMessage === null) return;

    try {
      const res = await communityApi.sharePost(postId, { message: shareMessage });
      if (res.success && res.data) {
        setPosts(prev => [res.data, ...prev]);
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, shareCount: p.shareCount + 1 } : p));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to share post");
    }
  };

  // Soft Delete
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    try {
      const res = await communityApi.deletePost(postId);
      if (res.success) {
        setPosts(prev => prev.filter(p => p.id !== postId));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete post");
    }
  };

  // Update Post text inline
  const handleStartEdit = (postId: string, initialMessage: string) => {
    setEditingPostId(postId);
    setEditingText(initialMessage);
  };

  const handleSaveEdit = async (postId: string) => {
    if (!editingText.trim()) return;

    try {
      const res = await communityApi.updatePost(postId, { message: editingText });
      if (res.success && res.data) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, message: res.data.message, isEdited: true } : p));
        setEditingPostId(null);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update post");
    }
  };

  const handleAddMediaUrl = () => {
    if (!newMediaUrl.trim()) return;
    if (mediaUrls.length >= 10) {
      alert("Maximum 10 media files allowed per post.");
      return;
    }
    setMediaUrls(prev => [...prev, newMediaUrl.trim()]);
    setNewMediaUrl('');
  };

  const handleRemoveMediaUrl = (index: number) => {
    setMediaUrls(prev => prev.filter((_, idx) => idx !== index));
  };


  const toggleCommentsExpansion = (postId: string) => {
    const isExpanded = !expandedPostComments[postId];
    setExpandedPostComments(prev => ({ ...prev, [postId]: isExpanded }));
    if (isExpanded && !comments[postId]) {
      loadComments(postId, true);
    }
  };

  // Client-side filter using tags
  const filteredPosts = selectedTag 
    ? posts.filter(p => p.message.toLowerCase().includes(selectedTag.toLowerCase()))
    : posts;

  return (
    <div id="community-hub-container" className="flex flex-col lg:flex-row gap-6 animate-fade-in relative z-10 w-full text-slate-700 dark:text-slate-200">
      
      {/* Center Feed Column */}
      <section id="community-feed-deck" className="flex-1 max-w-4xl mx-auto space-y-6">
        
        {/* Filter tags feedback */}
        {(selectedTag || gameIdFilter) && (
          <div className="flex items-center justify-between p-3.5 bg-amber-400/10 border border-amber-400/20 rounded-xl text-xs">
            <span className="text-amber-500 dark:text-amber-400 font-medium">
              Filtering feed: {selectedTag && <>contains keyword <strong className="font-mono">"{selectedTag}"</strong></>} {gameIdFilter && <>{selectedTag && ' & '} game context <strong className="font-mono">"{gameIdFilter}"</strong></>}
            </span>
            <button 
              onClick={() => {
                setSelectedTag(null);
                setGameIdFilter(undefined);
              }}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1 font-semibold"
            >
              <X size={13} /> Clear filters
            </button>
          </div>
        )}

        {/* Share Update Post Card (Real creation interface) */}
        {currentUser ? (
          <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-xs">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200 dark:border-slate-800">
                <img 
                  referrerPolicy="no-referrer" 
                  src={currentUser.avatarUrl || PROFILE_AVATAR_YOU} 
                  alt="Your Avatar" 
                  className="w-full h-full object-cover"
                />
              </div>
              
              <form onSubmit={handleCreatePost} className="flex-1 space-y-4">
                <div className="space-y-1">
                  <textarea
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder="Share your latest level design, shader math or asset pack updates with the Godot community..."
                    maxLength={2000}
                    className="w-full bg-transparent border-0 focus:ring-0 text-slate-800 dark:text-slate-100 text-sm placeholder-slate-400 dark:placeholder-slate-500 resize-none min-h-[90px] outline-none"
                  />
                  <div className="text-right text-[10px] text-slate-400 font-mono">
                    {postText.length} / 2000
                  </div>
                </div>

                {/* Media URL attachments input and listing */}
                <div className="space-y-3 bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-150 dark:border-slate-850/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider block">Media Attachments (Max 10)</span>
                  
                  {/* Attachments listing */}
                  {mediaUrls.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {mediaUrls.map((url, index) => {
                        const isVideo = url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.mov') || url.toLowerCase().endsWith('.webm');
                        return (
                          <div key={index} className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 h-16 group bg-slate-950">
                            {isVideo ? (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-900 text-[9px] font-bold">
                                📹 Video Attachment
                              </div>
                            ) : (
                              <img src={url} alt="Uploaded S3 Thumbnail Attachment" className="w-full h-full object-cover opacity-80" />
                            )}
                            <button 
                              type="button"
                              onClick={() => handleRemoveMediaUrl(index)}
                              className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 hover:bg-red-500 text-white shadow-md transition-all opacity-0 group-hover:opacity-100"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add URL Row */}
                  <div className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      placeholder="Paste image"
                      value={newMediaUrl}
                      onChange={(e) => setNewMediaUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddMediaUrl();
                        }
                      }}
                      className="flex-1 bg-transparent border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs outline-none focus:ring-1 focus:ring-amber-400 text-slate-800 dark:text-slate-200"
                    />
                    <button 
                      type="button"
                      onClick={handleAddMediaUrl}
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-amber-400 dark:hover:bg-amber-400 hover:text-slate-900 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all"
                    >
                      Attach
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*,video/*" 
                      className="hidden" 
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-amber-500 hover:bg-amber-400/10 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold border border-amber-400/20"
                      title="Attach File from Computer"
                    >
                      <ImageIcon size={14} /> Select File
                    </button>
                    
                  </div>

                  <button
                    type="submit"
                    disabled={!postText.trim() || isSubmittingPost}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-350 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-slate-900 rounded-full font-bold text-xs shadow-xs transition-studio flex items-center gap-2"
                  >
                    {isSubmittingPost && <span className="animate-spin text-xs">⏳</span>}
                    Post Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-100 dark:bg-slate-950/40 rounded-2xl text-center text-xs text-slate-400 border border-slate-200 dark:border-slate-850">
            Authentication required to publish updates. Please sign in to participate in discussion threads.
          </div>
        )}

        {/* FEED POSTS SYSTEM LIST */}
        <div className="space-y-6">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <article 
                key={post.id} 
                className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs hover:shadow-sm hover:translate-y-[-1px] transition-all duration-300"
              >
                <div className="p-5 space-y-4">
                  
                  {/* Post Author Info header row */}
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div 
                        onClick={() => onViewAuthorProfile?.(post.sender)}
                        className="w-11 h-11 rounded-full bg-slate-100 overflow-hidden border border-slate-200 dark:border-slate-850 flex-shrink-0 cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                      >
                        <img referrerPolicy="no-referrer" src={post.sender.avatarUrl || PROFILE_AVATAR_YOU} alt={post.sender.fullName} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h3 
                          onClick={() => onViewAuthorProfile?.(post.sender)}
                          className="font-display font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 cursor-pointer hover:text-amber-500 dark:hover:text-amber-400 hover:underline transition-colors"
                        >
                          {post.sender.fullName}
                          {post.sender.id === currentUser?.id && (
                            <span className="bg-amber-400/20 text-amber-500 text-[8px] uppercase tracking-wider px-1.5 py-0.5 border border-amber-500/30 rounded font-black font-mono">You</span>
                          )}
                        </h3>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                          {new Date(post.createdAt).toLocaleDateString()} {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {post.isEdited && <span className="text-amber-500 font-semibold ml-1.5 font-sans">(edited)</span>}
                        </p>
                      </div>
                    </div>
                    
                    {/* Ownership Action Context Dropdown (Edit/Delete) */}
                    {(post.sender.id === currentUser?.id || currentUser?.role === 'admin') && (
                      <div className="flex items-center gap-1 text-slate-450">
                        <button 
                          onClick={() => handleStartEdit(post.id, post.message)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors hover:text-amber-500"
                          title="Edit message"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors hover:text-rose-500"
                          title="Delete Post"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Post content body */}
                  {editingPostId === post.id ? (
                    <div className="space-y-2">
                      <textarea 
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm text-slate-850 dark:text-slate-150 outline-none"
                        rows={3}
                      />
                      <div className="flex gap-2 justify-end">
                        <button 
                          onClick={() => setEditingPostId(null)}
                          className="px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-655 dark:text-slate-350 rounded-lg text-xs font-bold"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleSaveEdit(post.id)}
                          className="px-3 py-1 bg-amber-400 text-slate-900 rounded-lg text-xs font-bold"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p 
                      onClick={() => onViewPostDetails?.(post)}
                      className="text-xs sm:text-sm text-slate-700 dark:text-slate-350 leading-relaxed whitespace-pre-wrap cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors"
                    >
                      {post.message}
                    </p>
                  )}

                  {/* Post Images/Videos media display */}
                  {post.mediaFiles && post.mediaFiles.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {post.mediaFiles.map((media, idx) => {
                        const isVideo = media.mediaType === 'video';
                        return (
                          <div 
                            key={idx} 
                            onClick={() => onViewPostDetails?.(post)}
                            className="rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-855 bg-slate-950 max-h-96 cursor-pointer hover:opacity-95 transition-opacity"
                          >
                            {isVideo ? (
                              <video src={media.url} controls className="w-full h-full object-cover" />
                            ) : (
                              <img src={media.url} alt="Community Attachment content" className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-500" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Render Shared Post (Recursive quote card) */}
                  {post.originalChat && (
                    <div className="pl-4 border-l-4 border-amber-400 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-xl border border-slate-200/50 dark:border-slate-850 text-xs">
                      <div className="flex gap-2 items-center mb-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 flex-shrink-0">
                          <img referrerPolicy="no-referrer" src={post.originalChat.sender.avatarUrl || PROFILE_AVATAR_YOU} alt={post.originalChat.sender.fullName} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 dark:text-white block">{post.originalChat.sender.fullName}</span>
                          <span className="text-[9px] text-slate-400 font-mono">Original update</span>
                        </div>
                      </div>
                      <p className="text-slate-655 dark:text-slate-350 leading-normal whitespace-pre-wrap">{post.originalChat.message}</p>
                      {post.originalChat.mediaFiles && post.originalChat.mediaFiles.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                          {post.originalChat.mediaFiles.map((media, idx) => (
                            <div key={idx} className="rounded-lg overflow-hidden border border-slate-200/50 dark:border-slate-850 bg-slate-900 max-h-40">
                              {media.mediaType === 'video' ? (
                                <video src={media.url} controls className="w-full h-full object-cover" />
                              ) : (
                                <img src={media.url} alt="Original share media" className="w-full h-full object-cover" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reaction Summary (Click to view who reacted) */}
                  {post.reactionCount > 0 && (
                    <button 
                      onClick={() => handleOpenReactionsModal(post.id)}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-500 dark:hover:text-amber-400 transition-colors mb-2 ml-1"
                    >
                      <div className="flex -space-x-1">
                        <span className="inline-block text-[11px]">👍</span>
                        {post.reactionCount > 1 && <span className="inline-block text-[11px]">❤️</span>}
                      </div>
                      <span className="hover:underline font-semibold">
                        {post.reactionCount} {post.reactionCount === 1 ? 'người thích' : 'lượt tương tác'}
                      </span>
                    </button>
                  )}

                  {/* Interactive Action counts bar */}
                  <div className="flex flex-wrap items-center gap-6 pt-3.5 border-t border-slate-150 dark:border-slate-850 text-xs text-slate-500 relative">
                    
                    {/* Custom Reaction Selector Trigger (Hover-Triggered slideup box) */}
                    <div 
                      className="relative"
                      onMouseEnter={() => handleMouseEnterReaction(post.id)}
                      onMouseLeave={() => handleMouseLeaveReaction(post.id)}
                    >
                      <button 
                        onClick={() => handleReact(post.id, myReactions[post.id] || 'like')}
                        className={`flex items-center gap-1.5 font-semibold transition-all hover:text-amber-500 ${
                          myReactions[post.id] 
                            ? 'text-amber-500 dark:text-amber-400 font-bold scale-105' 
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <span className="text-sm">
                          {myReactions[post.id] ? REACTION_EMOJIS[myReactions[post.id]].emoji : '👍'}
                        </span>
                        <span>{myReactions[post.id] ? REACTION_EMOJIS[myReactions[post.id]].label : 'Like'} ({post.reactionCount})</span>
                      </button>

                      {/* Emojis hover popup panel */}
                      {hoveredPostReactionId === post.id && (
                        <div 
                          onMouseEnter={() => handleMouseEnterReaction(post.id)}
                          onMouseLeave={() => handleMouseLeaveReaction(post.id)}
                          className="absolute bottom-full left-0 pb-2 z-50"
                        >
                          <div className="flex items-center gap-2 p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-full shadow-lg animate-bounce-short">
                            {(Object.keys(REACTION_EMOJIS) as ReactionType[]).map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => handleReact(post.id, type)}
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

                    <button 
                      onClick={() => onViewPostDetails?.(post)}
                      className="flex items-center gap-1.5 font-semibold hover:text-sky-500 transition-colors"
                    >
                      <MessageSquare size={14} />
                      <span>{post.commentCount} Discussion</span>
                    </button>

                    <button 
                      onClick={() => handleSharePost(post.id)}
                      className="flex items-center gap-1.5 font-semibold hover:text-amber-500 transition-colors"
                    >
                      <Share2 size={14} />
                      <span>{post.shareCount} Shares</span>
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="p-8 text-center bg-white/70 dark:bg-slate-900/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/60">
              {isLoading ? (
                <div className="space-y-4">
                  <span className="animate-spin text-lg block">⏳</span>
                  <span className="text-xs text-slate-400 block font-mono">Loading sockets feed...</span>
                </div>
              ) : (
                <p className="text-xs text-slate-450">No updates found in community feed. Start a new update!</p>
              )}
            </div>
          )}
        </div>

        {/* Load More Feed Button */}
        {hasMore && (
          <div className="text-center pt-2">
            <button
              onClick={() => loadFeed(false)}
              className="py-2.5 px-6 border border-slate-200 dark:border-slate-800 hover:bg-amber-400 hover:text-slate-950 font-bold text-xs rounded-xl transition-all"
            >
              Load More Posts...
            </button>
          </div>
        )}

      </section>

      <ReactionsModal 
        isOpen={activeReactionsPostId !== null}
        onClose={() => setActiveReactionsPostId(null)}
        postId={activeReactionsPostId || ''}
        onViewAuthorProfile={onViewAuthorProfile}
      />
    </div>
  );
}
