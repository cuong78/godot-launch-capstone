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
import { communityApi } from '../api/communityApi';
import { CommunityChatResponse, ReactionType, ChatMediaResponse } from '../types';

interface CommunityHubProps {
  darkMode: boolean;
  onNavigateToSeller?: () => void;
  onNavigateToMarketplace?: () => void;
}

const REACTION_EMOJIS: Record<ReactionType, { emoji: string; color: string; label: string }> = {
  like: { emoji: '👍', color: 'text-blue-500 hover:scale-125', label: 'Like' },
  love: { emoji: '❤️', color: 'text-rose-500 hover:scale-125', label: 'Love' },
  haha: { emoji: '😂', color: 'text-amber-500 hover:scale-125', label: 'Haha' },
  wow: { emoji: '😮', color: 'text-yellow-500 hover:scale-125', label: 'Wow' },
  sad: { emoji: '😢', color: 'text-indigo-400 hover:scale-125', label: 'Sad' },
  angry: { emoji: '😡', color: 'text-red-500 hover:scale-125', label: 'Angry' }
};

export function CommunityHub({ darkMode, onNavigateToSeller, onNavigateToMarketplace }: CommunityHubProps) {
  const { currentUser } = useAuth();
  
  // Navigation active state inside Side Panel
  const [activeSideNav, setActiveSideNav] = useState<'home' | 'discover' | 'library' | 'community' | 'settings'>('community');
  
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

  // Suggested Developers to follow (mock UI representation)
  const [suggestedDevs, setSuggestedDevs] = useState([
    {
      id: 'gdsage',
      name: 'GDSage',
      specialty: 'Shader Expert',
      avatar: DEV_AVATARS.gdsage,
      isFollowing: false,
      followersCount: 1420
    },
    {
      id: 'vectorvixen',
      name: 'VectorVixen',
      specialty: 'UI/UX Guru',
      avatar: DEV_AVATARS.vectorvixen,
      isFollowing: false,
      followersCount: 980
    }
  ]);

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
        setPosts(prev => isReset ? res.data.content : [...prev, ...res.data.content]);
        setPage(targetPage + 1);
        setHasMore(!res.data.last);
      }
    } catch (err) {
      console.error("Failed to load feed", err);
    } finally {
      setIsLoading(false);
    }
  };

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
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p));
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
          setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactionCount: Math.max(0, p.reactionCount - 1) } : p));
        }
      } else {
        // Add or change reaction
        const res = await communityApi.reactToPost(postId, { reactionType: type });
        if (res.success) {
          setMyReactions(prev => ({ ...prev, [postId]: type }));
          setPosts(prev => prev.map(p => {
            if (p.id === postId) {
              const increment = prevReaction ? 0 : 1;
              return { ...p, reactionCount: p.reactionCount + increment };
            }
            return p;
          }));
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

  const handleFollowDev = (devId: string) => {
    setSuggestedDevs(prev => prev.map(dev => {
      if (dev.id === devId) {
        return {
          ...dev,
          isFollowing: !dev.isFollowing,
          followersCount: dev.isFollowing ? dev.followersCount - 1 : dev.followersCount + 1
        };
      }
      return dev;
    }));
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
      
      {/* SideNavBar - Column Left */}
      <aside id="community-left-sidebar" className="hidden lg:flex flex-col w-64 h-fit sticky top-28 p-5 rounded-2xl bg-white/70 dark:bg-slate-900/45 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/60 shadow-sm space-y-6">
        <div>
          <h2 className="font-display font-bold text-base text-slate-800 dark:text-amber-400">Game Hub</h2>
          <p className="text-[10px] text-slate-450 uppercase font-mono tracking-wider">Community Dashboard</p>
        </div>

        <nav className="flex flex-col gap-1.5">
          {[
            { id: 'home', label: 'All Community Feed', icon: <Home size={15} />, action: () => setGameIdFilter(undefined) },
            { id: 'discover', label: 'Discover Hub', icon: <Compass size={15} /> },
            { id: 'library', label: 'My Library', icon: <Gamepad2 size={15} /> },
            { id: 'community', label: 'Community Sockets', icon: <MessageSquare size={15} /> },
            { id: 'settings', label: 'Account Settings', icon: <Settings size={15} /> }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSideNav(item.id as any);
                if (item.action) item.action();
              }}
              className={`flex items-center gap-3 w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl text-left transition-all ${activeSideNav === item.id && !gameIdFilter ? 'bg-amber-400 text-slate-900 shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Reaction Picker Visual Helper Widget */}
        <div className="flex items-center gap-2 mb-3 bg-slate-100/50 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800/40">
          <img src={OIPImage} alt="Reaction emojis decoration backdrop sticker" className="w-12 h-12 object-contain" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-amber-500 font-mono">Custom Emojis</span>
            <span className="text-[9px] text-slate-400 leading-tight">Hover/click Like to choose 6 custom reaction styles!</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/50">
          <button 
            onClick={() => {
              if (onNavigateToSeller) onNavigateToSeller();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-amber-400 hover:bg-amber-350 text-slate-900 rounded-xl text-xs font-bold font-display shadow-xs transition-studio"
          >
            <PlusCircle size={14} />
            Publish Asset Pack
          </button>
        </div>
      </aside>

      {/* Center Feed Column */}
      <section id="community-feed-deck" className="flex-1 max-w-4xl space-y-6">
        
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
                      placeholder="Paste media S3 URL (ends in .png, .jpg, .mp4, etc.)..."
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
                    
                    {/* Mock quick add image options to showcase visual look */}
                    <button
                      type="button"
                      onClick={() => setMediaUrls(prev => [...prev, IMAGE_SEED_MAP.forest])}
                      className="p-2 text-slate-500 hover:text-amber-500 hover:bg-amber-400/10 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold"
                      title="Attach Voxel Forest Scene Mock"
                    >
                      +Forest Mock
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaUrls(prev => [...prev, IMAGE_SEED_MAP.sky])}
                      className="p-2 text-slate-500 hover:text-sky-500 hover:bg-sky-500/10 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold"
                      title="Attach Sky Background Mock"
                    >
                      +Sky Mock
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
                      <div className="w-11 h-11 rounded-full bg-slate-100 overflow-hidden border border-slate-200 dark:border-slate-850 flex-shrink-0">
                        <img referrerPolicy="no-referrer" src={post.sender.avatarUrl || PROFILE_AVATAR_YOU} alt={post.sender.fullName} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
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
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-350 leading-relaxed whitespace-pre-wrap">
                      {post.message}
                    </p>
                  )}

                  {/* Post Images/Videos media display */}
                  {post.mediaFiles && post.mediaFiles.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {post.mediaFiles.map((media, idx) => {
                        const isVideo = media.mediaType === 'video';
                        return (
                          <div key={idx} className="rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-850 bg-slate-950 max-h-96">
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

                  {/* Interactive Action counts bar */}
                  <div className="flex flex-wrap items-center gap-6 pt-3.5 border-t border-slate-150 dark:border-slate-850 text-xs text-slate-500 relative">
                    
                    {/* Custom Reaction Selector Trigger (Hover-Triggered slideup box) */}
                    <div 
                      className="relative"
                      onMouseEnter={() => handleMouseEnterReaction(post.id)}
                      onMouseLeave={() => handleMouseLeaveReaction(post.id)}
                    >
                      <button 
                        onClick={() => handleReact(post.id, 'like')}
                        className={`flex items-center gap-1.5 font-semibold transition-all hover:text-amber-500`}
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
                          className="absolute bottom-full left-0 mb-2 flex items-center gap-2 p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-full shadow-lg z-50 animate-bounce-short"
                        >
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
                      )}
                    </div>

                    <button 
                      onClick={() => toggleCommentsExpansion(post.id)}
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

                  {/* THREADED COMMENTS DRAWER SECTION */}
                  {expandedPostComments[post.id] && (
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-850/60 animate-fade-in">
                      
                      {/* Submit Comment mini textbox */}
                      {currentUser ? (
                        <div className="flex gap-3 items-center">
                          <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-800">
                            <img 
                              referrerPolicy="no-referrer" 
                              src={currentUser.avatarUrl || PROFILE_AVATAR_YOU} 
                              alt="Your Avatar" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 relative flex items-center bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2">
                            <input
                              type="text"
                              placeholder="Type an insightful feedback comment..."
                              value={activeCommentTexts[post.id] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setActiveCommentTexts(prev => ({ ...prev, [post.id]: val }));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddComment(post.id);
                              }}
                              className="w-full bg-transparent border-0 ring-0 focus:ring-0 outline-none text-xs text-slate-850 dark:text-slate-150"
                            />
                            <button 
                              onClick={() => handleAddComment(post.id)}
                              className="text-amber-500 hover:text-amber-400 p-1 rounded transition-colors"
                            >
                              <Send size={13} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-450 italic">Log in to comment.</p>
                      )}

                      {/* Display Comments Feed List */}
                      {comments[post.id] && comments[post.id].length > 0 ? (
                        <div className="space-y-4 pt-2">
                          {comments[post.id].map((comment) => (
                            <div key={comment.id} className="space-y-3">
                              <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-850 bg-slate-100">
                                  <img referrerPolicy="no-referrer" src={comment.sender.avatarUrl || PROFILE_AVATAR_YOU} alt={comment.sender.fullName} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 p-3 rounded-xl relative">
                                  <div className="flex justify-between items-baseline mb-1">
                                    <span className="font-display font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1">
                                      {comment.sender.fullName}
                                      {comment.sender.id === post.sender.id && (
                                        <span className="bg-amber-400/20 text-amber-500 text-[7px] uppercase px-1 border border-amber-500/20 rounded font-black font-mono">OP</span>
                                      )}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-mono">
                                      {new Date(comment.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-655 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{comment.message}</p>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Comments pagination */}
                          {commentHasMore[post.id] && (
                            <div className="text-center">
                              <button
                                onClick={() => loadComments(post.id, false)}
                                className="text-[10px] font-bold text-amber-500 hover:text-amber-400 hover:underline"
                              >
                                Load more comments...
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-center text-slate-450 py-2">No active discussions. Add yours first!</p>
                      )}

                    </div>
                  )}

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

      {/* Right Column - Sideways widgets */}
      <aside id="community-right-sidebar" className="w-full lg:w-80 space-y-6">
        
        {/* Trending Tags list cards */}
        <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-amber-500" />
            <h2 className="font-display font-bold text-sm text-slate-800 dark:text-white">Trending Keywords</h2>
          </div>

          <div className="space-y-2">
            {[
              { tag: 'Godot4', count: '2.4k' },
              { tag: 'GDScript', count: '1.8k' },
              { tag: 'Shader', count: '950' },
              { tag: 'Pixel', count: '842' },
              { tag: 'Water', count: '450' }
            ].map((trend) => (
              <button
                key={trend.tag}
                onClick={() => setSelectedTag(selectedTag === trend.tag ? null : trend.tag)}
                className={`flex justify-between items-center w-full p-2 rounded-xl text-left transition-all ${selectedTag === trend.tag ? 'bg-amber-400 text-slate-950 font-bold' : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-300'}`}
              >
                <span className="text-xs font-medium">#{trend.tag}</span>
                <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${selectedTag === trend.tag ? 'bg-slate-950/20 text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{trend.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Game Jam alerts */}
        <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800/60 overflow-hidden shadow-xs relative">
          <div className="h-1 bg-amber-400 w-full" />
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-amber-500" />
              <h2 className="font-display font-bold text-sm text-slate-800 dark:text-white">Active Jams</h2>
            </div>

            <div className="space-y-4">
              <div className="relative pl-3 border-l-2 border-amber-400 space-y-1">
                <p className="font-display font-bold text-xs text-slate-850 dark:text-white">Daylight Jam #42</p>
                <p className="text-[10px] text-slate-400 font-mono">Ends in: 2d 14h</p>
                
                {/* Avatars overlay group */}
                <div className="flex -space-x-1.5 pt-1">
                  <img className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-sm" src={DEV_AVATARS.jammer1} alt="Jammer avatar" />
                  <img className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-sm" src={DEV_AVATARS.jammer2} alt="Jammer avatar" />
                  <img className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-sm" src={DEV_AVATARS.jammer3} alt="Jammer avatar" />
                  <div className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 text-[8px] font-bold flex items-center justify-center text-slate-500 font-mono">+12</div>
                </div>
              </div>

              <div className="relative pl-3 border-l-2 border-sky-400 space-y-1">
                <p className="font-display font-bold text-xs text-slate-850 dark:text-white">Mini-Boss Challenge</p>
                <p className="text-[10px] text-slate-400 font-mono font-semibold text-rose-500">Ends in: 4h 20m</p>
                <button 
                  onClick={() => alert('Launching mini challenge entry board! Create a unique voxel boss sprite to acquire rewards.')}
                  className="text-[10px] text-sky-500 hover:underline font-bold transition-all pt-0.5"
                >
                  View current submissions &rarr;
                </button>
              </div>
            </div>

            <button 
              onClick={() => onNavigateToMarketplace && onNavigateToMarketplace()}
              className="w-full block py-2 rounded-xl text-center border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800/40 font-display transition-colors"
            >
              Explore Sandbox Assets
            </button>
          </div>
        </div>

        {/* Suggested creators follow card */}
        <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 shadow-xs">
          <h2 className="font-display font-bold text-xs text-slate-400 uppercase tracking-wider mb-4">Suggested creators</h2>
          
          <div className="space-y-4">
            {suggestedDevs.map((dev) => (
              <div key={dev.id} className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 flex-shrink-0">
                    <img referrerPolicy="no-referrer" src={dev.avatar} alt={dev.name} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-xs text-slate-850 dark:text-white">{dev.name}</h3>
                    <p className="text-[9px] text-slate-450 font-mono">{dev.specialty} • {dev.followersCount} dev</p>
                  </div>
                </div>

                <button
                  onClick={() => handleFollowDev(dev.id)}
                  className={`p-1.5 rounded-lg border transition-all ${dev.isFollowing ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'hover:bg-amber-400 hover:text-slate-900 text-slate-500 border-slate-200 dark:border-slate-800'}`}
                >
                  {dev.isFollowing ? <Check size={13} /> : <UserPlus size={13} />}
                </button>
              </div>
            ))}
          </div>
        </div>

      </aside>

    </div>
  );
}
